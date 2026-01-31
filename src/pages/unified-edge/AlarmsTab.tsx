/**
 * Alarms Tab - Unified Edge Scene
 *
 * This module provides the Alarms tab functionality for the Unified Edge scene.
 * Shows all alarms with 6 stat widgets (Critical, Warning, Info, Cleared, Suppressed, Acknowledged)
 * and a comprehensive alarms table below.
 */

import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
  SceneDataProvider,
  SceneDataState,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { PaginatedDataProvider } from '../../utils/PaginatedDataProvider';
import { DataFrame, LoadingState, PanelData, getDefaultTimeRange } from '@grafana/data';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EmptyStateScene } from '../../components/EmptyStateScene';
import { getEmptyStateScenario } from '../../utils/emptyStateHelpers';
import { createAlarmStatPanel, ALARM_TYPES } from '../../utils/createAlarmStatPanel';
import { API_ENDPOINTS, ALARM_SEVERITIES, FIELD_NAMES } from './constants';

// ============================================================================
// CUSTOM DATA PROVIDER - Filters columns based on values
// ============================================================================

interface FilterColumnsDataProviderState extends SceneDataState {
  $data?: SceneDataProvider;
}

/**
 * Custom data provider that wraps another data provider and:
 * 1. Sorts data by SeverityOrder (ascending: Critical first) then TimestampSort (descending: newest first)
 * 2. Filters columns - hides Flapping and Acknowledged columns when table is empty
 */
// @ts-ignore
class FilterColumnsDataProvider extends SceneObjectBase<FilterColumnsDataProviderState> implements SceneDataProvider {
  public constructor(source: SceneDataProvider) {
    super({
      $data: source,
      data: {
        state: LoadingState.NotStarted,
        series: [],
        timeRange: source.state.data?.timeRange ?? getDefaultTimeRange(),
      },
    });

    this.addActivationHandler(() => {
      const sub = this.subscribeToSource();
      return () => sub.unsubscribe();
    });
  }

  private subscribeToSource() {
    const source = this.state.$data!;

    return source.subscribeToState((newState) => {
      if (newState.data) {
        const processedData = this.processData(newState.data);
        this.setState({ data: processedData });
      }
    });
  }

  /**
   * Process data: sort by severity then time, and filter columns if empty.
   */
  private processData(data: PanelData): PanelData {
    // Don't process if data is still loading or there's no data series
    if (!data.series || data.series.length === 0 || data.state !== LoadingState.Done) {
      return data;
    }

    const processedSeries = data.series.map((frame: DataFrame) => {
      // If table is empty (no alarm rows), just filter columns
      if (frame.length === 0) {
        const filteredFields = frame.fields.filter(field => {
          return field.name !== 'Flapping' && field.name !== 'Acknowledged';
        });
        return {
          ...frame,
          fields: filteredFields,
        };
      }

      // Sort the data by SeverityOrder (asc) then TimestampSort (desc)
      return this.sortFrame(frame);
    });

    return {
      ...data,
      series: processedSeries,
    };
  }

  /**
   * Sort a DataFrame by SeverityOrder (ascending) then TimestampSort (descending).
   * SeverityOrder: Critical=1, Warning=2, Info=3, Cleared=4
   */
  private sortFrame(frame: DataFrame): DataFrame {
    const severityField = frame.fields.find(f => f.name === 'SeverityOrder');
    const timestampField = frame.fields.find(f => f.name === 'TimestampSort');

    if (!severityField || !timestampField) {
      console.warn('[FilterColumnsDataProvider] SeverityOrder or TimestampSort field not found');
      return frame;
    }

    // Create an array of indices and sort them
    const indices = Array.from({ length: frame.length }, (_, i) => i);

    indices.sort((a, b) => {
      // First sort by SeverityOrder ascending (Critical=1 first)
      const sevA = severityField.values[a] as number;
      const sevB = severityField.values[b] as number;
      if (sevA !== sevB) {
        return sevA - sevB;
      }

      // Then sort by TimestampSort descending (newest first)
      const timeA = timestampField.values[a] as number;
      const timeB = timestampField.values[b] as number;
      return timeB - timeA;
    });

    // Reorder all fields according to sorted indices
    const sortedFields = frame.fields.map(field => {
      const sortedValues = indices.map(i => field.values[i]);
      return {
        ...field,
        values: sortedValues,
      };
    });

    return {
      ...frame,
      fields: sortedFields,
    };
  }

  public getResultsStream(): Observable<any> {
    const source = this.state.$data!;
    return source.getResultsStream();
  }
}

// ============================================================================
// DYNAMIC UNIFIED EDGE ALARMS SCENE - Shows all alarms with stat widgets
// ============================================================================

interface DynamicUnifiedEdgeAlarmsSceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicUnifiedEdgeAlarmsScene - Custom scene that reads the ChassisName variable
 * and shows alarm stats + table for selected chassis.
 */
class DynamicUnifiedEdgeAlarmsScene extends SceneObjectBase<DynamicUnifiedEdgeAlarmsSceneState> {
  public static Component = DynamicUnifiedEdgeAlarmsSceneRenderer;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicUnifiedEdgeAlarmsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  // @ts-ignore
  public activate() {
    super.activate();
    this.rebuildBody();
  }

  private rebuildBody() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Get the ChassisName variable from the scene's variable set
    const variable = this.getVariable('ChassisName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('ChassisName variable not found or not a query variable');
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({ body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'chassis' }) });
      return;
    }

    // Create the alarms panel with stats and table
    // Using chassis names directly with startswith() filter - combines all into single OR clause
    const chassisNames = variable?.state?.value || [];

    const newBody = getAllChassisAlarmsPanel(chassisNames);

    // Update state
    this.setState({
      body: newBody,
    });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    // @ts-ignore
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Renderer component for DynamicUnifiedEdgeAlarmsScene
 */
function DynamicUnifiedEdgeAlarmsSceneRenderer({ model }: SceneComponentProps<DynamicUnifiedEdgeAlarmsScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

/**
 * Helper function to create Alarms panel with stats and table for selected chassis
 * @param chassisNames - Array of selected chassis names (used for display purposes)
 * @param moidFilter - Pre-built Moid filter string like "'moid1','moid2'" for efficient API filtering
 */
function getAllChassisAlarmsPanel(chassisNames: string[]) {
  const showChassisColumn = chassisNames.length > 1;

  // Build device filter by combining all chassis names with OR
  // This reduces queries from (N chassis × 4 severities) to just (4 severities)
  const chassisNameFilters = chassisNames.map(name => {
    const escapedName = name.replace(/'/g, "''"); // OData escaping: single quote -> double single quote
    return `startswith(AffectedMoDisplayName, '${escapedName}')`;
  }).join(' or ');
  const deviceFilter = `(${chassisNameFilters})`;

  // Create one query per severity for the table (not per chassis)
  const severities = [
    ALARM_SEVERITIES.CRITICAL, // 'Critical'
    ALARM_SEVERITIES.WARNING,  // 'Warning'
    ALARM_SEVERITIES.INFO,     // 'Info'
    ALARM_SEVERITIES.CLEARED   // 'Cleared'
  ];
  const tableQueries: any[] = [];

  // Generate queries for table - one per severity only
  severities.forEach((severity, severityIndex) => {
    let severityFilterClause;

    if (severity === ALARM_SEVERITIES.CLEARED) { // 'Cleared'
      // For Cleared, filter by time range
      severityFilterClause = `Severity eq '${ALARM_SEVERITIES.CLEARED}' and ((CreateTime ge \${__from:date}) and (CreateTime le \${__to:date}) or (LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))`;
    } else {
      // For active alarms (Critical, Warning, Info)
      severityFilterClause = `Severity eq '${severity}'`;
    }

    const filterClause = `(${deviceFilter}) and (${severityFilterClause})`;

    // Map severity to numeric order for sorting (Critical=1, Warning=2, Info=3, Cleared=4)
    const severityOrder = severityIndex + 1;

    const tableUrl = `${API_ENDPOINTS.COND_ALARMS}?$expand=RegisteredDevice($select=DeviceHostname)&$top=1000&$filter=${filterClause}&$orderby=LastTransitionTime desc`; // '/api/v1/cond/Alarms'

    tableQueries.push({
      refId: `TBL_${severity}`, // Now just per-severity, not per-device
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: tableUrl,
      root_selector: '$.Results',
      columns: [
        { selector: 'Acknowledge', text: 'Acknowledge', type: 'string' },
        { selector: 'AcknowledgeBy', text: 'AcknowledgeBy', type: 'string' },
        { selector: 'AncestorMoType', text: 'AncestorMoType', type: 'string' },
        { selector: 'Code', text: 'Code', type: 'string' },
        { selector: 'Description', text: 'Description', type: 'string' },
        { selector: 'Flapping', text: 'Flap', type: 'string' },
        { selector: 'FlappingCount', text: 'FlappingCount', type: 'string' },
        { selector: 'Severity', text: 'Severity', type: 'string' },
        { selector: 'Suppressed', text: 'Suppressed', type: 'string' },
        { selector: 'LastTransitionTime', text: 'LastTransitionTime', type: 'timestamp' },
        // Extract Chassis name from RegisteredDevice.DeviceHostname
        { selector: 'RegisteredDevice.DeviceHostname', text: 'Chassis', type: 'string' },
      ],
      computed_columns: [
        { selector: "Acknowledge + ' (' + AcknowledgeBy + ')'", text: 'Acknowledged', type: 'string' },
        { selector: "Flap + ' (' + FlappingCount + ')'", text: 'Flapping', type: 'string' },
        // Add numeric severity order for sorting (Critical=1, Warning=2, Info=3, Cleared=4)
        { selector: `${severityOrder}`, text: 'SeverityOrder', type: 'number' },
        // Add timestamp as number for reliable sorting
        { selector: 'LastTransitionTime', text: 'TimestampSort', type: 'number' },
      ],
      url_options: {
        method: 'GET',
        data: '',
      },
    });
  });

  // Create separate queries for stats - one per severity using Moid filter
  const statQueries: any[] = [];
  severities.forEach((severity, index) => {
    let severityFilterClause;

    if (severity === ALARM_SEVERITIES.CLEARED) { // 'Cleared'
      severityFilterClause = `Severity eq '${ALARM_SEVERITIES.CLEARED}' and ((CreateTime ge \${__from:date}) and (CreateTime le \${__to:date}) or (LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))`;
    } else {
      severityFilterClause = `Severity eq '${severity}'`;
    }

    const filterClause = `(${deviceFilter}) and (${severityFilterClause})`;
    const statUrl = `${API_ENDPOINTS.COND_ALARMS}?$top=0&$count=true&$filter=${filterClause}`; // '/api/v1/cond/Alarms'

    statQueries.push({
      refId: String.fromCharCode(65 + index), // A, B, C, D
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: statUrl,
      root_selector: '$.Count',
      columns: [],
      url_options: {
        method: 'GET',
        data: '',
      },
    });
  });

  // Query E: Suppressed alarms count (using $count with $top=0 - optimized)
  const suppressedUrl = `${API_ENDPOINTS.COND_ALARMS}?$top=0&$count=true&$filter=(${deviceFilter}) and (Suppressed eq 'true') and (Severity ne '${ALARM_SEVERITIES.CLEARED}')`; // '/api/v1/cond/Alarms'
  statQueries.push({
    refId: 'E',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: suppressedUrl,
    root_selector: '$.Count',
    columns: [],
    url_options: {
      method: 'GET',
      data: '',
    },
  });

  // Query F: Acknowledged alarms count (using $count with $top=0 - optimized)
  const acknowledgedUrl = `${API_ENDPOINTS.COND_ALARMS}?$top=0&$count=true&$filter=(${deviceFilter}) and (Acknowledge eq 'Acknowledge') and (Severity ne '${ALARM_SEVERITIES.CLEARED}')`; // '/api/v1/cond/Alarms'
  statQueries.push({
    refId: 'F',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: acknowledgedUrl,
    root_selector: '$.Count',
    columns: [],
    url_options: {
      method: 'GET',
      data: '',
    },
  });

  // Create separate query runners for each stat widget (using statQueries)
  const criticalQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[0]], // A - Critical
  });

  const warningQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[1]], // B - Warning
  });

  const infoQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[2]], // C - Info
  });

  const clearedQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[3]], // D - Cleared
  });

  const suppressedQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[4]], // E - Suppressed
  });

  const acknowledgedQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[5]], // F - Acknowledged
  });

  // Query runner for table (uses all tableQueries - one per chassis per severity)
  const baseQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: tableQueries,
  });

  // Wrap with pagination support for >1000 results
  const paginatedQueryRunner = new PaginatedDataProvider({
    $data: baseQueryRunner,
  });

  // Apply transformations: merge queries, organize columns and format time
  // Note: Sorting by SeverityOrder + TimestampSort is handled by FilterColumnsDataProvider
  const baseTransformedData = new LoggingDataTransformer({
    $data: paginatedQueryRunner,
    transformations: [
      {
        id: 'merge',
        options: {},
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Acknowledge: true,
            AcknowledgeBy: true,
            AcknowledgeTime: true,
            AffectedMo: true,
            AffectedMoDisplayName: true,
            AffectedMoType: true,
            AlarmSummaryAggregators: true,
            CreateTime: true,
            Definition: true,
            Flap: true,
            FlappingCount: true,
            MsAffectedObject: true,
            Name: true,
            OrigSeverity: true,
            Owners: true,
            RegisteredDevice: true,
            Chassis: !showChassisColumn, // Hide Chassis column if only one chassis selected
            // Note: SeverityOrder and TimestampSort are kept for sorting, but hidden via field overrides
          },
          includeByName: {},
          indexByName: {
            Acknowledge: 12,
            AcknowledgeBy: 13,
            AcknowledgeTime: 14,
            Acknowledged: 11,
            AffectedMo: 15,
            AffectedMoDisplayName: 16,
            AffectedMoType: 17,
            AlarmSummaryAggregators: 18,
            AncestorMoType: 19,
            Code: 2,
            CreateTime: 20,
            Definition: 6,
            Description: 5,
            Flap: 8,
            Flapping: 7,
            FlappingCount: 9,
            LastTransitionTime: 24,
            MsAffectedObject: 21,
            Name: 1,
            OrigSeverity: 4,
            Owners: 22,
            RegisteredDevice: 23,
            Chassis: 0, // Chassis column first
            Severity: 3,
            Suppressed: 10,
          },
          renameByName: {
            AncestorMoType: 'Type',
            LastTransitionTime: 'Last Transition',
          },
        },
      },
      {
        id: 'convertFieldType',
        options: {
          conversions: [
            {
              destinationType: 'time',
              targetField: 'Last Transition',
            },
          ],
          fields: {},
        },
      },
      {
        id: 'formatTime',
        options: {
          timeField: 'Last Transition',
          outputFormat: 'YYYY-MM-DD HH:mm',
          useTimezone: true,
        },
      },
    ],
  });

  // Wrap with custom data provider to filter columns dynamically
  const transformedData = new FilterColumnsDataProvider(baseTransformedData);

  // Build stat panels for alarm counts (using aggregate count queries directly)
  // Using the shared utility function to avoid code duplication
  const criticalStat = createAlarmStatPanel({
    title: ALARM_TYPES.CRITICAL.title,
    queryRunner: criticalQueryRunner,
    thresholdColor: ALARM_TYPES.CRITICAL.color,
  });

  const warningStat = createAlarmStatPanel({
    title: ALARM_TYPES.WARNING.title,
    queryRunner: warningQueryRunner,
    thresholdColor: ALARM_TYPES.WARNING.color,
  });

  const infoStat = createAlarmStatPanel({
    title: ALARM_TYPES.INFO.title,
    queryRunner: infoQueryRunner,
    thresholdColor: ALARM_TYPES.INFO.color,
  });

  const clearedStat = createAlarmStatPanel({
    title: ALARM_TYPES.CLEARED.title,
    queryRunner: clearedQueryRunner,
    thresholdColor: ALARM_TYPES.CLEARED.color,
  });

  const suppressedStat = createAlarmStatPanel({
    title: ALARM_TYPES.SUPPRESSED.title,
    queryRunner: suppressedQueryRunner,
    thresholdColor: ALARM_TYPES.SUPPRESSED.color,
  });

  const acknowledgedStat = createAlarmStatPanel({
    title: ALARM_TYPES.ACKNOWLEDGED.title,
    queryRunner: acknowledgedQueryRunner,
    thresholdColor: ALARM_TYPES.ACKNOWLEDGED.color,
  });

  // Build the alarms table panel
  const tableTitle = showChassisColumn
    ? 'Alarms from selected Chassis'
    : `Alarms from ${chassisNames[0]}`;

  const alarmsPanel = PanelBuilders.table()
    .setTitle(tableTitle)
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('enablePagination', true)
    .setNoValue('No Alarms in the selected time period')
    // Note: Data is pre-sorted by FilterColumnsDataProvider (SeverityOrder asc, TimestampSort desc)
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' as any })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // SeverityOrder column - hidden but used for sorting
      builder.matchFieldsWithName('SeverityOrder')
        .overrideCustomFieldConfig('width', 0)  // Hide by setting width to 0
        // @ts-ignore
        .overrideCustomFieldConfig('hidden', true);

      // TimestampSort column - hidden but used for sorting
      builder.matchFieldsWithName('TimestampSort')
        .overrideCustomFieldConfig('width', 0)  // Hide by setting width to 0
        // @ts-ignore
        .overrideCustomFieldConfig('hidden', true);

      // Severity column - color-coded text
      builder.matchFieldsWithName(FIELD_NAMES.SEVERITY) // 'Severity'
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              [ALARM_SEVERITIES.CRITICAL]: { color: 'red', index: 0 },    // 'Critical'
              [ALARM_SEVERITIES.WARNING]: { color: 'orange', index: 1 },  // 'Warning'
              [ALARM_SEVERITIES.INFO]: { color: 'super-light-yellow', index: 2 }, // 'Info'
              [ALARM_SEVERITIES.CLEARED]: { color: 'green', index: 3 },   // 'Cleared'
            },
          },
        ]);

      // Flapping column
      builder.matchFieldsWithName('Flapping')
        .overrideCustomFieldConfig('width', 110)
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              'NotFlapping (0)': { index: 0, text: 'No' },
            },
          },
          {
            type: 'regex' as any,
            options: {
              pattern: '(.*)',
              result: { color: 'red', index: 1, text: '$1' },
            },
          },
        ]);

      // Suppressed column
      builder.matchFieldsWithName('Suppressed')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              false: { color: 'text', index: 0, text: 'No' },
              true: { color: 'blue', index: 1, text: 'Yes' },
            },
          },
        ]);

      // Acknowledged column
      builder.matchFieldsWithName('Acknowledged')
        .overrideCustomFieldConfig('width', 140)
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              'None ()': { color: 'text', index: 0, text: 'No' },
            },
          },
          {
            type: 'regex' as any,
            options: {
              pattern: 'Acknowledge(.*)',
              result: { color: 'blue', index: 1, text: 'Yes$1' },
            },
          },
        ]);

      // Type column
      builder.matchFieldsWithName('Type')
        .overrideCustomFieldConfig('width', 100)
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              'compute.Blade': { index: 0, text: 'Blade' },
              'compute.RackUnit': { index: 1, text: 'Rack Server' },
              'network.Element': { index: 2, text: 'FI' },
              'equipment.Chassis': { index: 3, text: 'Chassis' },
              'asset.Target': { index: 4, text: 'Target' },
            },
          },
        ]);

      // Last Transition column
      builder.matchFieldsWithName('Last Transition')
        .overrideCustomFieldConfig('width', 165);

      // Code column
      builder.matchFieldsWithName('Code')
        .overrideCustomFieldConfig('width', 260);

      // Chassis column - format array values and handle nulls
      if (showChassisColumn) {
        builder.matchFieldsWithName('Chassis')
          .overrideCustomFieldConfig('width', 150)
          .overrideMappings([
            {
              type: 'value' as any,
              options: {
                'null': { index: 0, text: '-' },
              },
            },
            {
              type: 'regex' as any,
              options: {
                pattern: '^\\["(.+)"\\]$',
                result: { index: 1, text: '$1' },
              },
            },
          ]);
      }

      return builder.build();
    })
    .build();

  // Return layout with stats row + table
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Stats row
      new SceneFlexItem({
        height: 100,
        ySizing: 'content',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ body: criticalStat }),
            new SceneFlexItem({ body: warningStat }),
            new SceneFlexItem({ body: infoStat }),
            new SceneFlexItem({ body: clearedStat }),
            new SceneFlexItem({ body: suppressedStat }),
            new SceneFlexItem({ body: acknowledgedStat }),
          ],
        }),
      }),
      // Table
      new SceneFlexItem({
        minHeight: 400,
        ySizing: 'fill',
        body: alarmsPanel,
      }),
    ],
  });
}

/**
 * Main export function for the Alarms tab.
 * Returns a DynamicUnifiedEdgeAlarmsScene that shows alarm stats and table.
 */
export function getAlarmsTab() {
  // Return the dynamic alarms scene that shows stats + table for selected chassis
  return new DynamicUnifiedEdgeAlarmsScene({});
}
