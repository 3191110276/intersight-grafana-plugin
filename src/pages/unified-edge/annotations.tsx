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
  private _queryRunnerDeactivate: (() => void) | null = null;
  private _queryRunner: LoggingQueryRunner | null = null;
  private _isRunning = false;

  public constructor(state: InfinityAnnotationLayerState) {
    super({
      ...state,
      name: state.name || (state.annotationType === 'alarms' ? 'Alarms' : 'Actions'),
      isEnabled: state.isEnabled !== undefined ? state.isEnabled : true,
      isHidden: state.isHidden !== undefined ? state.isHidden : false,
    });
  }

  public onEnable(): void {
    this.runLayer();
  }

  public onDisable(): void {
    // Cancel the query runner but DON'T unsubscribe from time range
    // This allows the layer to respond to refresh and republish empty results
    if (this._queryRunnerDeactivate) {
      this._queryRunnerDeactivate();
      this._queryRunnerDeactivate = null;
    }
    if (this._queryRunner) {
      this._queryRunner = null;
    }
    this._isRunning = false;

    // Publish empty results to clear annotations from the UI
    try {
      const timeRange = sceneGraph.getTimeRange(this);
      this.publishResults({
        state: LoadingState.Done,
        series: [],
        annotations: [],
        timeRange: timeRange.state.value,
      });
    } catch {
      // If we can't get the time range, just publish minimal empty results
      this.publishResults({
        state: LoadingState.Done,
        series: [],
        annotations: [],
        timeRange: { from: new Date(), to: new Date(), raw: { from: 'now-1h', to: 'now' } } as any,
      });
    }
  }

  protected runLayer(): void {
    // Prevent duplicate runs
    if (this._isRunning) {
      return;
    }
    this._isRunning = true;

    // Get the time range from the scene graph
    let timeRange;
    try {
      timeRange = sceneGraph.getTimeRange(this);
    } catch {
      // If we can't get the time range, we can't run the layer
      this._isRunning = false;
      return;
    }

    // Subscribe to time range changes to re-run queries
    if (this._timeRangeSub) {
      this._timeRangeSub.unsubscribe();
    }

    this._timeRangeSub = timeRange.subscribeToState(() => {
      // If active but disabled, republish empty results to clear annotations
      if (this.isActive && !this.state.isEnabled) {
        try {
          this.publishResults({
            state: LoadingState.Done,
            series: [],
            annotations: [],
            timeRange: timeRange.state.value,
          });
        } catch {
          // Ignore errors
        }
      } else if (this.isActive && this.state.isEnabled) {
        // Only execute if still active and enabled
        this.executeQuery();
      }
    });

    // Execute the initial query
    this.executeQuery();
  }

  private executeQuery(): void {
    // Don't execute if not active or not enabled
    if (!this.isActive || !this.state.isEnabled) {
      return;
    }

    const { chassisName, annotationType } = this.state;

    // Cancel any existing query subscription
    if (this._querySub) {
      this._querySub.unsubscribe();
      this._querySub = null;
    }

    // Deactivate existing query runner before creating a new one
    if (this._queryRunnerDeactivate) {
      this._queryRunnerDeactivate();
      this._queryRunnerDeactivate = null;
    }

    // Interpolate time range variables
    const fromDate = sceneGraph.interpolate(this, '${__from:date}');
    const toDate = sceneGraph.interpolate(this, '${__to:date}');

    // Create the appropriate query based on annotation type
    const query = annotationType === 'alarms'
      ? this.createAlarmsQuery(chassisName, fromDate, toDate)
      : this.createActionsQuery(chassisName, fromDate, toDate);

    // Resolve the Account variable to get the actual datasource UID
    const accountUid = sceneGraph.interpolate(this, '${Account}');

    if (!accountUid || accountUid === '${Account}') {
      return;
    }

    // Create a new query runner with the resolved datasource UID
    this._queryRunner = new LoggingQueryRunner({
      datasource: { uid: accountUid },
      queries: [query],
    });

    // Subscribe to query results BEFORE activating
    this._querySub = this._queryRunner.subscribeToState((state) => {
      if (state.data) {
        const annotations = this.transformToAnnotations(state.data);
        if (annotations) {
          this.publishResults(annotations);
        }
      }
    });

    // Explicitly activate the query runner and store the deactivation function
    this._queryRunnerDeactivate = this._queryRunner.activate();
  }

  private createAlarmsQuery(chassisName: string, fromDate: string, toDate: string): any {
    // Query for Critical and Warning alarms only
    // Filter by chassis name and time range
    return {
      refId: 'alarms-annotation',
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/cond/Alarms?$select=Severity,Description,LastTransitionTime&$filter=(startswith(AffectedMoDisplayName, '${chassisName}')) and (Severity in ('Critical','Warning')) and ((LastTransitionTime ge ${fromDate}) and (LastTransitionTime le ${toDate}))&$orderby=LastTransitionTime desc&$top=100`,
      root_selector: '$.Results',
      columns: [
        { selector: 'Severity', text: 'Severity', type: 'string' },
        { selector: 'Description', text: 'Description', type: 'string' },
        { selector: 'LastTransitionTime', text: 'Time', type: 'timestamp' },
      ],
      url_options: { method: 'GET', data: '' },
    };
  }

  private createActionsQuery(chassisName: string, fromDate: string, toDate: string): any {
    // Query for workflow actions/events
    // Filter by chassis name and time range for both start and end times
    return {
      refId: 'actions-annotation',
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/workflow/WorkflowInfos?$select=Name,Email,WorkflowStatus,StartTime,EndTime&$filter=(startswith(WorkflowCtx.TargetCtxList.TargetName, '${chassisName}')) and ((StartTime ge ${fromDate}) and (StartTime le ${toDate}) or (EndTime ge ${fromDate}) and (EndTime le ${toDate}))&$orderby=StartTime desc&$top=100`,
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

          const severityIcon = severity === 'Critical' ? '🔴' : '🟠';
          events.push({
            time,
            title: `${severityIcon} ${severity}`,
            text: description,
            color: severity === 'Critical' ? ANNOTATION_COLORS.ALARM_CRITICAL : ANNOTATION_COLORS.ALARM_WARNING,
            tags: [],
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

          // Status icon: green check for Completed, red X for Failed/Terminated, blue circle for others
          let statusIcon = '🔵';
          if (status === 'Completed') {
            statusIcon = '✅';
          } else if (status === 'Failed' || status === 'Terminated') {
            statusIcon = '❌';
          }

          events.push({
            time: startTime,
            timeEnd: endTime,
            isRegion: !!endTime,
            title: `${statusIcon} ${status}`,
            text: `${name} (${email})`,
            color: ANNOTATION_COLORS.ACTION,
            tags: [],
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
    // Deactivate the query runner using the stored deactivation function
    if (this._queryRunnerDeactivate) {
      this._queryRunnerDeactivate();
      this._queryRunnerDeactivate = null;
    }
    // Clear the query runner reference
    this._queryRunner = null;
    // Reset running flag so layer can be restarted
    this._isRunning = false;
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
  private _dataLayerSet?: SceneDataLayerSet;
  private _onToggle?: (enabled: boolean, dataLayerSet?: SceneDataLayerSet) => void;

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

    // Call the toggle callback to update the parent scene's $data
    if (this._onToggle) {
      this._onToggle(newEnabled, this._dataLayerSet);
    }
  }

  /**
   * Set the data layer set to control (stored as instance property, not state)
   */
  public setDataLayerSet(dataLayerSet: SceneDataLayerSet) {
    this._dataLayerSet = dataLayerSet;
  }

  /**
   * Set the toggle callback that will be called when annotations are toggled
   */
  public setOnToggle(callback: (enabled: boolean, dataLayerSet?: SceneDataLayerSet) => void) {
    this._onToggle = callback;
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
