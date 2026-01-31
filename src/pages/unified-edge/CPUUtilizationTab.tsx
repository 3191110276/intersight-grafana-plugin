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
  behaviors,
} from '@grafana/scenes';
import { DashboardCursorSync } from '@grafana/data';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { TableCellDisplayMode } from '@grafana/ui';
import { EmptyStateScene } from '../../components/EmptyStateScene';
import { getEmptyStateScenario, getSelectedValues } from '../../utils/emptyStateHelpers';
import { DrilldownHeaderControl } from '../../components/DrilldownHeaderControl';
import { ClickableTableWrapper } from '../../components/ClickableTableWrapper';
import { API_ENDPOINTS } from './constants';

// ============================================================================
// QUERY DEFINITIONS - Reused across single and multi-chassis views
// ============================================================================

// Query A: CPU Utilization
const queryA = {
  refId: 'A',
  queryType: 'infinity',
  type: 'json',
  source: 'url',
  parser: 'backend',
  format: 'timeseries',
  url: API_ENDPOINTS.TELEMETRY_TIMESERIES, // '/api/v1/telemetry/TimeSeries'
  root_selector: '',
  columns: [
    { selector: 'timestamp', text: 'Time', type: 'timestamp' },
    { selector: 'event.host_name', text: 'Host Name', type: 'string' },
    { selector: 'event.utilization', text: 'Utilization', type: 'number' },
  ],
  url_options: {
    method: 'POST',
    body_type: 'raw',
    body_content_type: 'application/json',
    data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "regex",
          "dimension": "host.name",
          "pattern": "^\${ChassisName:regex}"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.cpu"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "utilization",
        "fieldName": "hw.cpu.utilization_c0_max"
      }
    ]
  }`,
  },
} as any;

// Query B: CPU 1 Temperature
const queryB = {
  refId: 'B',
  queryType: 'infinity',
  type: 'json',
  source: 'url',
  parser: 'backend',
  format: 'timeseries',
  url: API_ENDPOINTS.TELEMETRY_TIMESERIES, // '/api/v1/telemetry/TimeSeries'
  root_selector: '',
  columns: [
    { selector: 'timestamp', text: 'Time', type: 'timestamp' },
    { selector: 'event.host_name', text: 'Host Name', type: 'string' },
    { selector: 'event.temperature', text: 'Temperature', type: 'number' },
  ],
  url_options: {
    method: 'POST',
    body_type: 'raw',
    body_content_type: 'application/json',
    data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "regex",
          "dimension": "host.name",
          "pattern": "^\${ChassisName:regex}"
        },
        {
          "type": "in",
          "dimension": "hw.temperature.sensor.name",
          "values": [
            "CPU1",
            "P1_TEMP_SENS"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "temperature",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
  },
} as any;

// Query C: CPU 2 Temperature
const queryC = {
  refId: 'C',
  queryType: 'infinity',
  type: 'json',
  source: 'url',
  parser: 'backend',
  format: 'timeseries',
  url: API_ENDPOINTS.TELEMETRY_TIMESERIES, // '/api/v1/telemetry/TimeSeries'
  root_selector: '',
  columns: [
    { selector: 'timestamp', text: 'Time', type: 'timestamp' },
    { selector: 'event.host_name', text: 'Host Name', type: 'string' },
    { selector: 'event.temperature', text: 'Temperature', type: 'number' },
  ],
  url_options: {
    method: 'POST',
    body_type: 'raw',
    body_content_type: 'application/json',
    data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "regex",
          "dimension": "host.name",
          "pattern": "^\${ChassisName:regex}"
        },
        {
          "type": "in",
          "dimension": "hw.temperature.sensor.name",
          "values": [
            "CPU2",
            "P2_TEMP_SENS"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "temperature",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
  },
} as any;

// ============================================================================
// DRILLDOWN QUERY HELPER
// ============================================================================

/**
 * Creates a drilldown query by replacing variable interpolation with a hardcoded host name
 * Pattern from Environmental tab's host drilldown
 */
function createDrilldownQuery(baseQuery: any, hostName: string): any {
  // Deep clone the base query
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));

  // Replace the ChassisName regex pattern with specific hostname pattern
  // Escape special regex characters in hostname
  const escapedHostName = hostName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /"pattern": "\^\$\{ChassisName:regex\}"/g,
    `"pattern": "^${escapedHostName}"`
  );

  return drilldownQuery;
}

// ============================================================================
// CLICKABLE TABLE WRAPPER COMPONENT
// ============================================================================


// ============================================================================
// DYNAMIC CPU UTILIZATION SCENE - Conditional rendering based on ChassisName
// ============================================================================

interface DynamicCPUUtilizationSceneState extends SceneObjectState {
  body: any;
  drilldownHost?: string;     // Host name when in drilldown mode
  isDrilldown?: boolean;      // True when viewing drilldown (from table click)
}

/**
 * DynamicCPUUtilizationScene - Custom scene that monitors the ChassisName variable
 * and conditionally renders:
 * - 0 chassis: Empty message
 * - 1-2 chassis: 2 timeseries graphs (CPU Utilization + Combined CPU Temperature)
 * - 3+ chassis: Table with sparklines (matching IMM Domain style)
 */
class DynamicCPUUtilizationScene extends SceneObjectBase<DynamicCPUUtilizationSceneState> {
  public static Component = DynamicCPUUtilizationSceneRenderer;

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

  public constructor(state: Partial<DynamicCPUUtilizationSceneState>) {
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

  /**
   * Drills down to a specific host's detailed view
   */
  public drillToHost(hostName: string) {
    this.setState({
      drilldownHost: hostName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  /**
   * Exits drilldown mode and returns to table view
   */
  public exitDrilldown() {
    this.setState({
      drilldownHost: undefined,
      isDrilldown: false,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Check for drilldown mode first
    if (this.state.isDrilldown && this.state.drilldownHost) {
      const drilldownBody = createDrilldownView(this.state.drilldownHost, this);
      this.setState({ body: drilldownBody });
      return;
    }

    // Get the ChassisName variable from the scene's variable set
    const variable = this.getVariable('ChassisName');

    if (!variable) {
      console.warn('ChassisName variable not found');
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({ body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'chassis' }) });
      return;
    }

    // Get selected chassis names
    const chassisNames = getSelectedValues(variable);

    // If 1-2 chassis, show 2 graphs (CPU Utilization + Combined Temperature)
    if (chassisNames.length <= 2) {
      const dualGraphsBody = createDualGraphsBody();
      this.setState({ body: dualGraphsBody });
      return;
    }

    // If 3+ chassis, show table with sparklines
    const multiChassisBody = createMultiChassisTableBody(this);
    this.setState({ body: multiChassisBody });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    // @ts-ignore
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Renderer component for DynamicCPUUtilizationScene
 */
function DynamicCPUUtilizationSceneRenderer({
  model,
}: SceneComponentProps<DynamicCPUUtilizationScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// DUAL GRAPHS VIEW - CPU Utilization + Combined CPU Temperature graphs
// ============================================================================

function createDualGraphsBody() {
  // Graph 1: CPU Utilization
  const cpuUtilQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queryA],
  });

  const cpuUtilizationPanel = PanelBuilders.timeseries()
    .setTitle('CPU Utilization')
    .setData(cpuUtilQueryRunner)
    .setUnit('percentunit')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setCustomFieldConfig('axisSoftMax', 1)
    .setOverrides((builder) => {
      // Remove "Utilization " prefix and show just the host name
      builder
        .matchFieldsByType('number' as any)
        .overrideDisplayName('${__field.labels["Host Name"]}')
        .overrideColor({ fixedColor: 'semi-dark-blue', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi' as any,
      sort: 'desc' as any,
    })
    .build();

  // Combined Temperature Query Runner (CPU 1 + CPU 2)
  const cpuTempQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queryB, queryC],
  });

  const cpuTemperaturePanel = PanelBuilders.timeseries()
    .setTitle('CPU Temperature')
    .setData(cpuTempQueryRunner)
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute' as any as any,
      steps: [
        { value: 0, color: 'transparent' },
        { value: 105, color: 'dark-yellow' },
      ],
    })
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOverrides((builder) => {
      // CPU 1 series - Orange
      builder
        .matchFieldsWithNameByRegex('/^B Temperature/')
        .overrideDisplayName('${__field.labels["Host Name"]}')
        .overrideColor({ fixedColor: 'semi-dark-orange', mode: 'fixed' });

      // CPU 2 series - Red
      builder
        .matchFieldsWithNameByRegex('/^C Temperature/')
        .overrideDisplayName('${__field.labels["Host Name"]}')
        .overrideColor({ fixedColor: 'semi-dark-red', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi' as any,
      sort: 'desc' as any,
    })
    .build();

  // Return vertical layout with 2 graphs (combined temperature)
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 280, body: cpuUtilizationPanel }),
      new SceneFlexItem({ height: 280, body: cpuTemperaturePanel }),
    ],
    $behaviors: [
      new behaviors.CursorSync({ sync: DashboardCursorSync.Tooltip }),
    ],
  });
}

// ============================================================================
// DRILLDOWN VIEW - Detailed graphs for a single host (from table click)
// ============================================================================

function createDrilldownView(hostName: string, scene: DynamicCPUUtilizationScene) {
  // Create combined header with back button
  const drilldownHeader = new DrilldownHeaderControl({
    itemName: hostName,
    backButtonText: 'Back to Table',
    onBack: () => scene.exitDrilldown(),
  });

  // Create queries with hardcoded host filter (bypass variable)
  const drilldownQueryA = createDrilldownQuery(queryA, hostName);
  const drilldownQueryB = createDrilldownQuery(queryB, hostName);
  const drilldownQueryC = createDrilldownQuery(queryC, hostName);

  // Create query runners with drilldown queries
  const cpuUtilQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQueryA],
  });

  // Combined Temperature Query Runner (CPU 1 + CPU 2) - matching dual graphs view
  const cpuTempQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQueryB, drilldownQueryC],
  });

  // Create panels (matching dual graphs view)
  const cpuUtilizationPanel = PanelBuilders.timeseries()
    .setTitle('CPU Utilization')
    .setData(cpuUtilQueryRunner)
    .setUnit('percentunit')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setCustomFieldConfig('axisSoftMax', 1)
    .setOverrides((builder) => {
      // Remove "Utilization " prefix and show just the host name
      builder
        .matchFieldsByType('number' as any)
        .overrideDisplayName('${__field.labels["Host Name"]}')
        .overrideColor({ fixedColor: 'semi-dark-blue', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi' as any,
      sort: 'desc' as any,
    })
    .build();

  // Combined CPU Temperature panel - matching dual graphs view
  const cpuTemperaturePanel = PanelBuilders.timeseries()
    .setTitle('CPU Temperature')
    .setData(cpuTempQueryRunner)
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute' as any as any,
      steps: [
        { value: 0, color: 'transparent' },
        { value: 105, color: 'dark-yellow' },
      ],
    })
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOverrides((builder) => {
      // CPU 1 series - Orange
      builder
        .matchFieldsWithNameByRegex('/^B Temperature/')
        .overrideDisplayName('${__field.labels["Host Name"]}')
        .overrideColor({ fixedColor: 'semi-dark-orange', mode: 'fixed' });

      // CPU 2 series - Red
      builder
        .matchFieldsWithNameByRegex('/^C Temperature/')
        .overrideDisplayName('${__field.labels["Host Name"]}')
        .overrideColor({ fixedColor: 'semi-dark-red', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi' as any,
      sort: 'desc' as any,
    })
    .build();

  // Layout with combined header/back button + graphs
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 50,
        body: drilldownHeader,
      }),
      new SceneFlexItem({
        height: 280,
        body: cpuUtilizationPanel,
      }),
      new SceneFlexItem({
        height: 280,
        body: cpuTemperaturePanel,
      }),
    ],
    $behaviors: [
      new behaviors.CursorSync({ sync: DashboardCursorSync.Tooltip }),
    ],
  });
}

// ============================================================================
// MULTI-CHASSIS VIEW - Table with sparklines
// ============================================================================

function createMultiChassisTableBody(scene: DynamicCPUUtilizationScene) {
  // Create query runner with 2 timeseries queries (A: CPU Util, B: CPU Temp)
  const baseQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queryA, queryB],
  });

  // Apply transformations to convert timeseries to table and join by Host Name
  const transformedData = new LoggingDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      // Convert timeseries to table format with explicit time fields
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
        },
      },
      // Join all queries by Host Name field (using outer join to handle servers without all sensors)
      {
        id: 'joinByField',
        options: {
          byField: 'Host Name',
          mode: 'outer',
        },
      },
      // Organize and rename columns
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            'Host Name': 0,
            'Trend #A': 1,
            'Trend #B': 2,
          },
          renameByName: {
            'Trend #A': 'Utilization',
            'Trend #B': 'CPU Temperature',
          },
        },
      },
    ],
  });

  // Create table panel with sparklines and field overrides
  const tablePanel = PanelBuilders.table()
    .setTitle('CPU details for all Chassis - Click row to drill down')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'lg' as any)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ displayName: 'Utilization', desc: true }])
    .setCustomFieldConfig('filterable', true)
    .setOverrides((builder) => {
      // Utilization column - sparkline visualization with percentunit and semi-dark-blue color
      builder
        .matchFieldsWithName('Utilization')
        .overrideCustomFieldConfig('cellOptions', {
          type: TableCellDisplayMode.Sparkline,
        })
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideMax(1)
        .overrideUnit('percentunit')
        .overrideDecimals(1);

      // String columns - set width to 240px
      builder.matchFieldsByType('string' as any).overrideCustomFieldConfig('width', 240);

      // CPU Temperature column - celsius unit with sparkline
      builder
        .matchFieldsWithName('CPU Temperature')
        .overrideCustomFieldConfig('cellOptions', {
          type: TableCellDisplayMode.Sparkline,
        })
        .overrideColor({
          fixedColor: 'semi-dark-orange',
          mode: 'fixed',
        })
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  // Wrap table in clickable wrapper
  const clickableTable = new ClickableTableWrapper({
    tablePanel: tablePanel,
    onRowClick: (hostName: string) => {
      scene.drillToHost(hostName);
    },
  });

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: clickableTable,
      }),
    ],
  });
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function getCPUUtilizationTab() {
  return new DynamicCPUUtilizationScene({});
}
