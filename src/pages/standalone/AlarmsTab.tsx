/**
 * Alarms Tab - Standalone Scene
 *
 * This module provides the Alarms tab functionality for the Standalone scene.
 * Shows all alarms with 6 stat widgets (Critical, Warning, Info, Cleared, Suppressed, Acknowledged)
 * and a comprehensive alarms table below.
 */

import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
  SceneDataProvider,
  SceneDataState,
} from '@grafana/scenes';
import { DataFrame, LoadingState, PanelData } from '@grafana/data';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// ============================================================================
// CUSTOM DATA PROVIDER - Filters columns based on values
// ============================================================================

interface FilterColumnsDataProviderState extends SceneDataState {
  $data?: SceneDataProvider;
}

/**
 * Custom data provider that wraps another data provider and filters columns
 * based on their values. Specifically hides Flapping and Acknowledged columns
 * when all values show "No".
 */
class FilterColumnsDataProvider extends SceneObjectBase<FilterColumnsDataProviderState> implements SceneDataProvider {
  public constructor(source: SceneDataProvider) {
    super({
      $data: source,
      data: {
        state: LoadingState.NotStarted,
        series: [],
        timeRange: source.state.data?.timeRange!,
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
        const filteredData = this.filterColumns(newState.data);
        this.setState({ data: filteredData });
      }
    });
  }

  /**
   * Filters columns by hiding Flapping and Acknowledged when the table is empty (no data).
   * When there's actual alarm data, always show all columns.
   */
  private filterColumns(data: PanelData): PanelData {
    // Don't filter if data is still loading or there's no data series
    if (!data.series || data.series.length === 0 || data.state !== LoadingState.Done) {
      return data;
    }

    const filteredSeries = data.series.map((frame: DataFrame) => {
      // If table has data (alarm rows), show all columns
      if (frame.length > 0) {
        console.log('[FilterColumns] Table has data, showing all columns');
        return frame;
      }

      // If table is empty (no alarm rows), HIDE Flapping and Acknowledged columns
      console.log('[FilterColumns] Table is empty, hiding Flapping and Acknowledged columns');
      const filteredFields = frame.fields.filter(field => {
        return field.name !== 'Flapping' && field.name !== 'Acknowledged';
      });

      return {
        ...frame,
        fields: filteredFields,
      };
    });

    return {
      ...data,
      series: filteredSeries,
    };
  }
}

// ============================================================================
// DYNAMIC STANDALONE ALARMS SCENE - Shows all alarms with stat widgets
// ============================================================================

interface DynamicStandaloneAlarmsSceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicStandaloneAlarmsScene - Custom scene that reads the ServerName variable
 * and shows alarm stats + table for selected servers.
 */
class DynamicStandaloneAlarmsScene extends SceneObjectBase<DynamicStandaloneAlarmsSceneState> {
  public static Component = DynamicStandaloneAlarmsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ServerName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicStandaloneAlarmsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildBody();
  }

  private rebuildBody() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Get the ServerName variable from the scene's variable set
    const variable = this.getVariable('ServerName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('ServerName variable not found or not a query variable');
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let serverNames: string[] = [];

    if (Array.isArray(value)) {
      serverNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      serverNames = [String(value)];
    }

    // If no servers selected, show a message
    if (serverNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setOption('content', '### No Servers Selected\n\nPlease select one or more servers from the Server filter above.')
              .build(),
          }),
        ],
      });

      this.setState({
        body: emptyBody,
      });
      return;
    }

    // Create the alarms panel with stats and table
    const newBody = getAllServersAlarmsPanel(serverNames);

    // Update state
    this.setState({
      body: newBody,
    });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Renderer component for DynamicStandaloneAlarmsScene
 */
function DynamicStandaloneAlarmsSceneRenderer({ model }: SceneComponentProps<DynamicStandaloneAlarmsScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

/**
 * Helper function to create Alarms panel with stats and table for selected servers
 */
function getAllServersAlarmsPanel(serverNames: string[]) {
  const showServerColumn = serverNames.length > 1;

  // Create one query per server per severity for the table
  // This creates consistent ordering: Critical > Warning > Info > Cleared, grouped by server
  const severities = ['Critical', 'Warning', 'Info', 'Cleared'];
  const tableQueries: any[] = [];

  // Generate queries for table - one per server per severity
  serverNames.forEach((serverName) => {
    severities.forEach((severity) => {
      let severityFilterClause;

      if (severity === 'Cleared') {
        // For Cleared, filter by time range
        severityFilterClause = `Severity eq 'Cleared' and ((CreateTime ge \${__from:date}) and (CreateTime le \${__to:date}) or (LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))`;
      } else {
        // For active alarms (Critical, Warning, Info)
        severityFilterClause = `Severity eq '${severity}'`;
      }

      const filterClause = `(startswith(AffectedMoDisplayName, '${serverName}')) and (${severityFilterClause})`;

      tableQueries.push({
        refId: `TBL_${serverName}_${severity}`, // Unique ref ID per server per severity
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/cond/Alarms?$top=1000&$expand=RegisteredDevice($select=PlatformType,DeviceHostname,ParentConnection,Pid)&$filter=${filterClause}&$orderby=LastTransitionTime desc`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Acknowledge', text: 'Acknowledge', type: 'string' },
          { selector: 'AcknowledgeBy', text: 'AcknowledgeBy', type: 'string' },
          { selector: 'AcknowledgeTime', text: 'AcknowledgeTime', type: 'string' },
          { selector: 'AffectedMo', text: 'AffectedMo', type: 'string' },
          { selector: 'AffectedMoDisplayName', text: 'AffectedMoDisplayName', type: 'string' },
          { selector: 'AffectedMoType', text: 'AffectedMoType', type: 'string' },
          { selector: 'AlarmSummaryAggregators', text: 'AlarmSummaryAggregators', type: 'string' },
          { selector: 'AncestorMoType', text: 'AncestorMoType', type: 'string' },
          { selector: 'Code', text: 'Code', type: 'string' },
          { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
          { selector: 'Definition', text: 'Definition', type: 'string' },
          { selector: 'Description', text: 'Description', type: 'string' },
          { selector: 'Flapping', text: 'Flap', type: 'string' },
          { selector: 'FlappingCount', text: 'FlappingCount', type: 'string' },
          { selector: 'MsAffectedObject', text: 'MsAffectedObject', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'OrigSeverity', text: 'OrigSeverity', type: 'string' },
          { selector: 'Owners', text: 'Owners', type: 'string' },
          { selector: 'RegisteredDevice', text: 'RegisteredDevice', type: 'string' },
          { selector: 'Severity', text: 'Severity', type: 'string' },
          { selector: 'Suppressed', text: 'Suppressed', type: 'string' },
          { selector: 'LastTransitionTime', text: 'LastTransitionTime', type: 'timestamp' },
        ],
        computed_columns: [
          { selector: "Acknowledge + ' (' + AcknowledgeBy + ')'", text: 'Acknowledged', type: 'string' },
          { selector: "Flap + ' (' + FlappingCount + ')'", text: 'Flapping', type: 'string' },
          // Inject server name as a computed column
          { selector: `'${serverName}'`, text: 'Server', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      });
    });
  });

  // Create separate queries for stats - one per severity combining all servers
  const statQueries: any[] = [];
  severities.forEach((severity, index) => {
    const serverFilters = serverNames.map(name => `startswith(AffectedMoDisplayName, '${name}')`).join(' or ');
    let severityFilterClause;

    if (severity === 'Cleared') {
      severityFilterClause = `Severity eq 'Cleared' and ((CreateTime ge \${__from:date}) and (CreateTime le \${__to:date}) or (LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))`;
    } else {
      severityFilterClause = `Severity eq '${severity}'`;
    }

    const filterClause = `(${serverFilters}) and (${severityFilterClause})`;

    statQueries.push({
      refId: String.fromCharCode(65 + index), // A, B, C, D
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/cond/Alarms?$top=0&$count=true&$filter=${filterClause}`,
      root_selector: '$.Count',
      columns: [],
      url_options: {
        method: 'GET',
        data: '',
      },
    });
  });

  // Add queries for Suppressed and Acknowledged stat counts
  const serverFilters = serverNames.map(name => `startswith(AffectedMoDisplayName, '${name}')`).join(' or ');

  // Query E: Suppressed alarms count (using $count with $top=0 - optimized)
  statQueries.push({
    refId: 'E',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: `/api/v1/cond/Alarms?$top=0&$count=true&$filter=(${serverFilters}) and (Suppressed eq 'true') and (Severity ne 'Cleared')`,
    root_selector: '$.Count',
    columns: [],
    url_options: {
      method: 'GET',
      data: '',
    },
  });

  // Query F: Acknowledged alarms count (using $count with $top=0 - optimized)
  statQueries.push({
    refId: 'F',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: `/api/v1/cond/Alarms?$top=0&$count=true&$filter=(${serverFilters}) and (Acknowledge eq 'Acknowledge') and (Severity ne 'Cleared')`,
    root_selector: '$.Count',
    columns: [],
    url_options: {
      method: 'GET',
      data: '',
    },
  });

  // Create separate query runners for each stat widget (using statQueries)
  const criticalQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[0]], // A - Critical
  });

  const warningQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[1]], // B - Warning
  });

  const infoQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[2]], // C - Info
  });

  const clearedQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[3]], // D - Cleared
  });

  const suppressedQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[4]], // E - Suppressed
  });

  const acknowledgedQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [statQueries[5]], // F - Acknowledged
  });

  // Query runner for table (uses all tableQueries - one per server per severity)
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: tableQueries,
  });

  // Apply transformations: merge queries, organize columns and format time
  const baseTransformedData = new SceneDataTransformer({
    $data: baseQueryRunner,
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
            Server: !showServerColumn, // Hide Server column if only one server selected
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
            Server: 0, // Server column first
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
  // Critical stat (Query A)
  const criticalStat = PanelBuilders.stat()
    .setTitle('Critical')
    .setMenu(undefined)
    .setData(criticalQueryRunner)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 0, color: '#181b1f' },
            { value: 1, color: '#8f0000' },
          ],
        });
      return builder.build();
    })
    .build();

  // Warning stat (Query B)
  const warningStat = PanelBuilders.stat()
    .setTitle('Warning')
    .setMenu(undefined)
    .setData(warningQueryRunner)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 0, color: '#181b1f' },
            { value: 1, color: '#d6ba02' },
          ],
        });
      return builder.build();
    })
    .build();

  // Info stat (Query C)
  const infoStat = PanelBuilders.stat()
    .setTitle('Info')
    .setMenu(undefined)
    .setData(infoQueryRunner)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 0, color: '#181b1f' },
            { value: 1, color: '#0262c2' },
          ],
        });
      return builder.build();
    })
    .build();

  // Cleared stat (Query D)
  const clearedStat = PanelBuilders.stat()
    .setTitle('Cleared')
    .setMenu(undefined)
    .setData(clearedQueryRunner)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 0, color: '#181b1f' },
            { value: 1, color: '#018524' },
          ],
        });
      return builder.build();
    })
    .build();

  // Suppressed stat (Query E) - uses aggregate count query directly
  const suppressedStat = PanelBuilders.stat()
    .setTitle('Suppressed')
    .setMenu(undefined)
    .setData(suppressedQueryRunner)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 0, color: '#181b1f' },
            { value: 1, color: '#b0b0b0' },
          ],
        });
      return builder.build();
    })
    .build();

  // Acknowledged stat (Query F) - uses aggregate count query directly
  const acknowledgedStat = PanelBuilders.stat()
    .setTitle('Acknowledged')
    .setMenu(undefined)
    .setData(acknowledgedQueryRunner)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 0, color: '#181b1f' },
            { value: 1, color: '#b0b0b0' },
          ],
        });
      return builder.build();
    })
    .build();

  // Build the alarms table panel
  const tableTitle = showServerColumn
    ? 'Alarms from selected Servers'
    : `Alarms from ${serverNames[0]}`;

  const alarmsPanel = PanelBuilders.table()
    .setTitle(tableTitle)
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setNoValue('No Alarms in the selected time period')
    // No sortBy needed - data is pre-sorted by query order: Critical > Warning > Info > Cleared, then by Last Transition within each group
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Severity column - color-coded text
      builder.matchFieldsWithName('Severity')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
            options: {
              Critical: { color: 'red', index: 0 },
              Warning: { color: 'orange', index: 1 },
              Info: { color: 'super-light-yellow', index: 2 },
              Cleared: { color: 'green', index: 3 },
            },
          },
        ]);

      // Flapping column
      builder.matchFieldsWithName('Flapping')
        .overrideCustomFieldConfig('width', 110)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'NotFlapping (0)': { index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'red', index: 1, text: '$1' },
            },
          },
        ]);

      // Suppressed column
      builder.matchFieldsWithName('Suppressed')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
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
            type: 'value',
            options: {
              'None ()': { color: 'text', index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
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
            type: 'value',
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

      // Server column
      if (showServerColumn) {
        builder.matchFieldsWithName('Server')
          .overrideCustomFieldConfig('width', 150);
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
 * Returns a DynamicStandaloneAlarmsScene that shows alarm stats and table.
 */
export function getAlarmsTab() {
  // Return the dynamic alarms scene that shows stats + table for selected servers
  return new DynamicStandaloneAlarmsScene({});
}
