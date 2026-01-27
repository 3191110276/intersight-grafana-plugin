/**
 * Unified Edge Annotations Module
 *
 * Provides annotation data layers for Alarms and Actions that display as markers
 * on time-series panels. Annotations are only enabled when a single chassis is selected.
 *
 * - Alarms: Point markers showing Critical (red) and Warning (orange) alarms
 * - Actions: Region markers (blue) showing workflow start-to-end time
 */

import React from 'react';
import {
  SceneDataLayerBase,
  SceneDataLayerProviderState,
  SceneDataLayerSet,
  SceneObjectBase,
  SceneObjectState,
  SceneComponentProps,
  sceneGraph,
} from '@grafana/scenes';
import {
  LoadingState,
  PanelData,
  AnnotationEvent,
  FieldType,
  createDataFrame,
  DataTopic,
} from '@grafana/data';
import { InlineSwitch, InlineFieldRow, InlineField } from '@grafana/ui';
import { Unsubscribable } from 'rxjs';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

export const ANNOTATION_COLORS = {
  ALARM_CRITICAL: '#F2495C',
  ALARM_WARNING: '#FF9830',
  ACTION: '#5794F2',
};

// ============================================================================
// CUSTOM INFINITY ANNOTATION LAYER
// ============================================================================

interface InfinityAnnotationLayerState extends SceneDataLayerProviderState {
  chassisName: string;
  annotationType: 'alarms' | 'actions';
  $queryRunner?: LoggingQueryRunner;
}

/**
 * Custom annotation layer that uses Infinity datasource queries and transforms
 * the results into Grafana annotation events.
 *
 * This is necessary because the standard AnnotationsDataLayer expects native
 * Grafana annotation datasources, not custom Infinity queries.
 */
export class InfinityAnnotationLayer extends SceneDataLayerBase<InfinityAnnotationLayerState> {
  private _querySub: Unsubscribable | null = null;
  private _timeRangeSub: Unsubscribable | null = null;

  public constructor(state: InfinityAnnotationLayerState) {
    super({
      ...state,
      name: state.name || (state.annotationType === 'alarms' ? 'Alarms' : 'Actions'),
      isEnabled: state.isEnabled !== undefined ? state.isEnabled : true,
      isHidden: state.isHidden !== undefined ? state.isHidden : false,
    });
  }

  /**
   * Override setState to react to isEnabled changes.
   * The base class SceneDataLayerBase doesn't automatically call onEnable/onDisable
   * when isEnabled is changed via setState() after activation.
   */
  public setState(update: Partial<InfinityAnnotationLayerState>) {
    const prevIsEnabled = this.state.isEnabled;
    super.setState(update);

    // Only react to isEnabled changes when the layer is already active
    // The base class handles the initial enable during activation
    if ('isEnabled' in update && this.isActive && update.isEnabled !== prevIsEnabled) {
      if (update.isEnabled) {
        this.onEnable();
      } else {
        this.onDisable();
      }
    }
  }

  public onEnable(): void {
    this.runLayer();
  }

  public onDisable(): void {
    this.cancelQuery();
  }

  protected runLayer(): void {
    // Get the time range from the scene graph
    const timeRange = sceneGraph.getTimeRange(this);

    // Subscribe to time range changes to re-run queries
    if (this._timeRangeSub) {
      this._timeRangeSub.unsubscribe();
    }

    this._timeRangeSub = timeRange.subscribeToState(() => {
      this.executeQuery();
    });

    // Execute the initial query
    this.executeQuery();
  }

  private executeQuery(): void {
    const { chassisName, annotationType } = this.state;

    // Cancel any existing query subscription
    if (this._querySub) {
      this._querySub.unsubscribe();
      this._querySub = null;
    }

    // Create the appropriate query based on annotation type
    const query = annotationType === 'alarms'
      ? this.createAlarmsQuery(chassisName)
      : this.createActionsQuery(chassisName);

    // Create a new query runner and set it in state so it becomes part of the scene graph
    // This is important for variable interpolation (${Account} needs to be resolved)
    const queryRunner = new LoggingQueryRunner({
      datasource: { uid: '${Account}' },
      queries: [query],
    });

    // Set the query runner in state - using $queryRunner makes it a child scene object
    // which allows it to access variables from the parent scene graph
    this.setState({ $queryRunner: queryRunner });

    // Subscribe to query results BEFORE activating
    this._querySub = queryRunner.subscribeToState((state) => {
      if (state.data) {
        const annotations = this.transformToAnnotations(state.data);
        this.publishResults(annotations);
      }
    });

    // Explicitly activate the query runner to start executing the query
    queryRunner.activate();
  }

  private createAlarmsQuery(chassisName: string): any {
    // Query for Critical and Warning alarms only
    // Filter by chassis name and time range
    return {
      refId: 'alarms-annotation',
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/cond/Alarms?$select=Severity,Description,LastTransitionTime&$filter=(startswith(AffectedMoDisplayName, '${chassisName}')) and (Severity in ('Critical','Warning')) and ((LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))&$orderby=LastTransitionTime desc&$top=100`,
      root_selector: '$.Results',
      columns: [
        { selector: 'Severity', text: 'Severity', type: 'string' },
        { selector: 'Description', text: 'Description', type: 'string' },
        { selector: 'LastTransitionTime', text: 'Time', type: 'timestamp' },
      ],
      url_options: { method: 'GET', data: '' },
    };
  }

  private createActionsQuery(chassisName: string): any {
    // Query for workflow actions/events
    // Filter by chassis name and time range for both start and end times
    return {
      refId: 'actions-annotation',
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/workflow/WorkflowInfos?$select=Name,Email,WorkflowStatus,StartTime,EndTime&$filter=(startswith(WorkflowCtx.TargetCtxList.TargetName, '${chassisName}')) and ((StartTime ge \${__from:date}) and (StartTime le \${__to:date}) or (EndTime ge \${__from:date}) and (EndTime le \${__to:date}))&$orderby=StartTime desc&$top=100`,
      root_selector: '$.Results',
      columns: [
        { selector: 'Name', text: 'Name', type: 'string' },
        { selector: 'Email', text: 'Email', type: 'string' },
        { selector: 'WorkflowStatus', text: 'Status', type: 'string' },
        { selector: 'StartTime', text: 'StartTime', type: 'timestamp' },
        { selector: 'EndTime', text: 'EndTime', type: 'timestamp' },
      ],
      url_options: { method: 'GET', data: '' },
    };
  }

  private transformToAnnotations(data: PanelData): PanelData {
    const { annotationType } = this.state;

    if (!data.series || data.series.length === 0) {
      return this.createEmptyAnnotationData(data);
    }

    const events: AnnotationEvent[] = [];
    const frame = data.series[0];

    if (!frame.fields || frame.fields.length === 0) {
      return this.createEmptyAnnotationData(data);
    }

    // Get field indices based on annotation type
    if (annotationType === 'alarms') {
      const severityField = frame.fields.find(f => f.name === 'Severity');
      const descriptionField = frame.fields.find(f => f.name === 'Description');
      const timeField = frame.fields.find(f => f.name === 'Time');

      if (severityField && descriptionField && timeField) {
        for (let i = 0; i < frame.length; i++) {
          const severity = severityField.values.get ? severityField.values.get(i) : (severityField.values as any)[i];
          const description = descriptionField.values.get ? descriptionField.values.get(i) : (descriptionField.values as any)[i];
          const timeValue = timeField.values.get ? timeField.values.get(i) : (timeField.values as any)[i];

          const time = typeof timeValue === 'string' ? new Date(timeValue).getTime() : timeValue;

          events.push({
            time,
            title: severity,
            text: description,
            color: severity === 'Critical' ? ANNOTATION_COLORS.ALARM_CRITICAL : ANNOTATION_COLORS.ALARM_WARNING,
            tags: ['alarm', severity.toLowerCase()],
          });
        }
      }
    } else {
      // Actions annotation type
      const nameField = frame.fields.find(f => f.name === 'Name');
      const emailField = frame.fields.find(f => f.name === 'Email');
      const statusField = frame.fields.find(f => f.name === 'Status');
      const startTimeField = frame.fields.find(f => f.name === 'StartTime');
      const endTimeField = frame.fields.find(f => f.name === 'EndTime');

      if (nameField && statusField && startTimeField) {
        for (let i = 0; i < frame.length; i++) {
          const name = nameField.values.get ? nameField.values.get(i) : (nameField.values as any)[i];
          const email = emailField?.values.get ? emailField.values.get(i) : (emailField?.values as any)?.[i] || '';
          const status = statusField.values.get ? statusField.values.get(i) : (statusField.values as any)[i];
          const startTimeValue = startTimeField.values.get ? startTimeField.values.get(i) : (startTimeField.values as any)[i];
          const endTimeValue = endTimeField?.values.get ? endTimeField.values.get(i) : (endTimeField?.values as any)?.[i];

          const startTime = typeof startTimeValue === 'string' ? new Date(startTimeValue).getTime() : startTimeValue;
          const endTime = endTimeValue ? (typeof endTimeValue === 'string' ? new Date(endTimeValue).getTime() : endTimeValue) : undefined;

          events.push({
            time: startTime,
            timeEnd: endTime,
            isRegion: !!endTime,
            title: name,
            text: `Status: ${status}\nUser: ${email}`,
            color: ANNOTATION_COLORS.ACTION,
            tags: ['action', 'workflow'],
          });
        }
      }
    }

    // Convert events to annotation data frame format
    return this.createAnnotationDataFrame(events, data);
  }

  private createEmptyAnnotationData(originalData: PanelData): PanelData {
    return {
      ...originalData,
      state: LoadingState.Done,
      series: [],
      annotations: [],
    };
  }

  private createAnnotationDataFrame(events: AnnotationEvent[], originalData: PanelData): PanelData {
    if (events.length === 0) {
      return this.createEmptyAnnotationData(originalData);
    }

    // Create a data frame in the annotation format that Grafana expects
    const annotationFrame = createDataFrame({
      name: this.state.name,
      fields: [
        { name: 'time', type: FieldType.time, values: events.map(e => e.time) },
        { name: 'timeEnd', type: FieldType.time, values: events.map(e => e.timeEnd || e.time) },
        { name: 'title', type: FieldType.string, values: events.map(e => e.title || '') },
        { name: 'text', type: FieldType.string, values: events.map(e => e.text || '') },
        { name: 'tags', type: FieldType.other, values: events.map(e => e.tags || []) },
        { name: 'color', type: FieldType.string, values: events.map(e => e.color || '') },
        { name: 'isRegion', type: FieldType.boolean, values: events.map(e => e.isRegion || false) },
      ],
      meta: {
        dataTopic: DataTopic.Annotations,
      },
    });

    return {
      ...originalData,
      state: LoadingState.Done,
      series: [annotationFrame],
      annotations: [annotationFrame],
    };
  }

  public cancelQuery(): void {
    if (this._querySub) {
      this._querySub.unsubscribe();
      this._querySub = null;
    }
    if (this._timeRangeSub) {
      this._timeRangeSub.unsubscribe();
      this._timeRangeSub = null;
    }
    // Deactivate and clear the query runner from state
    if (this.state.$queryRunner) {
      this.state.$queryRunner.deactivate();
      this.setState({ $queryRunner: undefined });
    }
  }

  protected onDeactivate(): void {
    this.cancelQuery();
    super.onDeactivate();
  }
}

// ============================================================================
// ANNOTATION TOGGLE CONTROL
// ============================================================================

interface AnnotationToggleControlState extends SceneObjectState {
  enabled: boolean;
}

/**
 * Custom toggle control for enabling/disabling all annotations at once.
 * Provides a single switch that controls both Alarms and Actions annotation layers.
 */
export class AnnotationToggleControl extends SceneObjectBase<AnnotationToggleControlState> {
  public static Component = AnnotationToggleControlRenderer;

  // Store as instance property (not state) to avoid parent conflicts
  // The SceneDataLayerSet belongs to the wrapper scene, not to this control
  private _dataLayerSet?: SceneDataLayerSet;

  public constructor(state: Partial<AnnotationToggleControlState>) {
    super({
      enabled: true,
      ...state,
    });
  }

  /**
   * Toggle annotations on/off
   */
  public toggle() {
    const newEnabled = !this.state.enabled;
    this.setState({ enabled: newEnabled });

    // Update all layers in the data layer set
    if (this._dataLayerSet) {
      const layers = this._dataLayerSet.state.layers;
      layers.forEach((layer) => {
        layer.setState({ isEnabled: newEnabled });
      });
    }
  }

  /**
   * Set the data layer set to control (stored as instance property, not state)
   */
  public setDataLayerSet(dataLayerSet: SceneDataLayerSet) {
    this._dataLayerSet = dataLayerSet;
  }
}

function AnnotationToggleControlRenderer({ model }: SceneComponentProps<AnnotationToggleControl>) {
  const { enabled } = model.useState();

  return (
    <InlineFieldRow>
      <InlineField label="Annotations" transparent>
        <InlineSwitch
          value={enabled}
          onChange={() => model.toggle()}
          transparent
        />
      </InlineField>
    </InlineFieldRow>
  );
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Creates an annotation layer for Alarms (Critical and Warning only).
 * Shows point markers at the LastTransitionTime of each alarm.
 */
export function createAlarmsAnnotationLayer(chassisName: string): InfinityAnnotationLayer {
  return new InfinityAnnotationLayer({
    chassisName,
    annotationType: 'alarms',
    name: 'Alarms',
    isEnabled: true,
    isHidden: false,
  });
}

/**
 * Creates an annotation layer for Actions/Workflows.
 * Shows region markers from StartTime to EndTime for each workflow.
 */
export function createActionsAnnotationLayer(chassisName: string): InfinityAnnotationLayer {
  return new InfinityAnnotationLayer({
    chassisName,
    annotationType: 'actions',
    name: 'Actions',
    isEnabled: true,
    isHidden: false,
  });
}

/**
 * Creates a SceneDataLayerSet containing both Alarms and Actions annotation layers.
 * This should be attached to the scene's $data property when a single chassis is selected.
 */
export function createUnifiedEdgeAnnotations(chassisName: string): SceneDataLayerSet {
  return new SceneDataLayerSet({
    layers: [
      createAlarmsAnnotationLayer(chassisName),
      createActionsAnnotationLayer(chassisName),
    ],
  });
}
