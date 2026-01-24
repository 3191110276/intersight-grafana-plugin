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
  url: '/api/v1/telemetry/TimeSeries',
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
  url: '/api/v1/telemetry/TimeSeries',
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
  url: '/api/v1/telemetry/TimeSeries',
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
 * Creates a drilldown query by replacing variable interpolation with a hardcoded chassis name
 */
function createDrilldownQuery(baseQuery: any, chassisName: string): any {
  // Deep clone the base query (use structured clone to avoid reference issues)
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));

  // Replace the ChassisName variable reference with the hardcoded chassis name
  // The variable is referenced as: "pattern": "^${ChassisName:regex}"
  // We need to replace it with: "pattern": "^chassisName"
  // Escape special regex characters in the chassis name
  const escapedChassisName = chassisName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /\^\\?\$\{ChassisName:regex\}/g,
    `^${escapedChassisName}`
  );

  return drilldownQuery;
}

// ============================================================================
// DRILLDOWN HEADER COMPONENT (Header + Back Button)
// ============================================================================

interface DrilldownHeaderControlState extends SceneObjectState {
  chassisName: string;
  onBack: () => void;
}

class DrilldownHeaderControl extends SceneObjectBase<DrilldownHeaderControlState> {
  public static Component = DrilldownHeaderRenderer;
}

function DrilldownHeaderRenderer({ model }: SceneComponentProps<DrilldownHeaderControl>) {
  const { chassisName, onBack } = model.useState();

  return (
    <div style={{
      padding: '12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
    }}>
      <button
        onClick={onBack}
        style={{
          padding: '6px 12px',
          cursor: 'pointer',
          background: 'transparent',
          border: '1px solid rgba(204, 204, 220, 0.25)',
          borderRadius: '2px',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
        }}
      >
        <span>&larr;</span>
        <span>Back to Table</span>
      </button>
      <div style={{
        fontSize: '18px',
        fontWeight: 500,
      }}>
        Drilldown: {chassisName}
      </div>
    </div>
  );
}

// ============================================================================
// CLICKABLE TABLE WRAPPER COMPONENT
// ============================================================================

interface ClickableTableWrapperState extends SceneObjectState {
  tablePanel: any;
  onRowClick: (chassisName: string) => void;
}

class ClickableTableWrapper extends SceneObjectBase<ClickableTableWrapperState> {
  public static Component = ClickableTableWrapperRenderer;
}

function ClickableTableWrapperRenderer({ model }: SceneComponentProps<ClickableTableWrapper>) {
  const { tablePanel, onRowClick } = model.useState();

  const handleClick = (event: React.MouseEvent) => {
    // Find the closest grid row (React Data Grid uses role="row")
    const row = (event.target as HTMLElement).closest('[role="row"]');

    if (!row) {
      return;
    }

    // Extract chassis name from the first gridcell (aria-colindex="1")
    const firstCell = row.querySelector('[role="gridcell"][aria-colindex="1"]');

    if (firstCell) {
      const chassisName = firstCell.textContent?.trim();

      if (chassisName) {
        onRowClick(chassisName);
      }
    }
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
      <tablePanel.Component model={tablePanel} />
    </div>
  );
}

// ============================================================================
// DYNAMIC CPU UTILIZATION SCENE - Conditional rendering based on ChassisName
// ============================================================================

interface DynamicCPUUtilizationSceneState extends SceneObjectState {
  body: any;
  drilldownChassis?: string;  // Chassis name when in drilldown mode
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

  public activate() {
    super.activate();
    this.rebuildBody();
  }

  /**
   * Drills down to a specific chassis's detailed view
   */
  public drillToChassis(chassisName: string) {
    this.setState({
      drilldownChassis: chassisName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  /**
   * Exits drilldown mode and returns to table view
   */
  public exitDrilldown() {
    this.setState({
      drilldownChassis: undefined,
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
    if (this.state.isDrilldown && this.state.drilldownChassis) {
      const drilldownBody = createDrilldownView(this.state.drilldownChassis, this);
      this.setState({ body: drilldownBody });
      return;
    }

    // Get the ChassisName variable from the scene's variable set
    const variable = this.getVariable('ChassisName');

    if (!variable) {
      console.warn('ChassisName variable not found');
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let chassisNames: string[] = [];

    if (Array.isArray(value)) {
      chassisNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      chassisNames = [String(value)];
    }

    // If no chassis selected, show a message
    if (chassisNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({ body: emptyBody });
      return;
    }

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
        .matchFieldsByType('number')
        .overrideDisplayName('${__field.labels["Host Name"]}')
        .overrideColor({ fixedColor: 'semi-dark-blue', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
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
      mode: 'absolute',
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
      mode: 'multi',
      sort: 'desc',
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
// DRILLDOWN VIEW - Detailed graphs for a single chassis (from table click)
// ============================================================================

function createDrilldownView(chassisName: string, scene: DynamicCPUUtilizationScene) {
  // Create combined header with back button
  const drilldownHeader = new DrilldownHeaderControl({
    chassisName: chassisName,
    onBack: () => scene.exitDrilldown(),
  });

  // Create queries with hardcoded chassis filter (bypass variable)
  const drilldownQueryA = createDrilldownQuery(queryA, chassisName);
  const drilldownQueryB = createDrilldownQuery(queryB, chassisName);
  const drilldownQueryC = createDrilldownQuery(queryC, chassisName);

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
        .matchFieldsByType('number')
        .overrideDisplayName('${__field.labels["Host Name"]}')
        .overrideColor({ fixedColor: 'semi-dark-blue', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Combined CPU Temperature panel - matching dual graphs view
  const cpuTemperaturePanel = PanelBuilders.timeseries()
    .setTitle('CPU Temperature')
    .setData(cpuTempQueryRunner)
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute',
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
      mode: 'multi',
      sort: 'desc',
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
      // Join all queries by Host Name field (using inner join)
      {
        id: 'joinByField',
        options: {
          byField: 'Host Name',
          mode: 'inner',
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
    .setOption('cellHeight', 'lg')
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
      builder.matchFieldsByType('string').overrideCustomFieldConfig('width', 240);

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
    onRowClick: (chassisName: string) => {
      scene.drillToChassis(chassisName);
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
