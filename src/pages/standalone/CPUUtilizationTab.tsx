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

// ============================================================================
// QUERY DEFINITIONS - Reused across single and multi-server views
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
          "type": "in",
          "dimension": "host.name",
          "values": [\${ServerName:doublequote}]
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
          "type": "in",
          "dimension": "host.name",
          "values": [\${ServerName:doublequote}]
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
          "type": "in",
          "dimension": "host.name",
          "values": [\${ServerName:doublequote}]
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
 * Creates a drilldown query by replacing variable interpolation with a hardcoded server name
 */
function createDrilldownQuery(baseQuery: any, serverName: string): any {
  // Deep clone the base query (use structured clone to avoid reference issues)
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));

  // Replace the ServerName variable reference with the hardcoded server name
  // The variable is referenced as: [\${ServerName:doublequote}]
  // We need to replace it with: ["serverName"]
  const escapedServerName = JSON.stringify(serverName); // Properly escape the server name
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /\[\$\{ServerName:doublequote\}\]/g,
    `[${escapedServerName}]`
  );

  return drilldownQuery;
}

// ============================================================================
// DRILLDOWN HEADER COMPONENT (Header + Back Button)
// ============================================================================

interface DrilldownHeaderControlState extends SceneObjectState {
  serverName: string;
  onBack: () => void;
}

class DrilldownHeaderControl extends SceneObjectBase<DrilldownHeaderControlState> {
  public static Component = DrilldownHeaderRenderer;
}

function DrilldownHeaderRenderer({ model }: SceneComponentProps<DrilldownHeaderControl>) {
  const { serverName, onBack } = model.useState();

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
        Drilldown: {serverName}
      </div>
    </div>
  );
}

// ============================================================================
// CLICKABLE TABLE WRAPPER COMPONENT
// ============================================================================

interface ClickableTableWrapperState extends SceneObjectState {
  tablePanel: any;
  onRowClick: (serverName: string) => void;
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

    // Extract server name from the first gridcell (aria-colindex="1")
    const firstCell = row.querySelector('[role="gridcell"][aria-colindex="1"]');

    if (firstCell) {
      const serverName = firstCell.textContent?.trim();

      if (serverName) {
        onRowClick(serverName);
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
// DYNAMIC CPU UTILIZATION SCENE - Conditional rendering based on ServerName
// ============================================================================

interface DynamicCPUUtilizationSceneState extends SceneObjectState {
  body: any;
  drilldownServer?: string;  // Server name when in drilldown mode
  isDrilldown?: boolean;      // True when viewing drilldown (from table click)
}

/**
 * DynamicCPUUtilizationScene - Custom scene that monitors the ServerName variable
 * and conditionally renders:
 * - Single server: 2 timeseries graphs (CPU Utilization + Combined CPU Temperature)
 * - Multiple servers: Table with sparklines (matching IMM Domain style)
 */
class DynamicCPUUtilizationScene extends SceneObjectBase<DynamicCPUUtilizationSceneState> {
  public static Component = DynamicCPUUtilizationSceneRenderer;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ServerName'],
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
   * Drills down to a specific server's detailed view
   */
  public drillToServer(serverName: string) {
    this.setState({
      drilldownServer: serverName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  /**
   * Exits drilldown mode and returns to table view
   */
  public exitDrilldown() {
    this.setState({
      drilldownServer: undefined,
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
    if (this.state.isDrilldown && this.state.drilldownServer) {
      const drilldownBody = createDrilldownView(this.state.drilldownServer, this);
      this.setState({ body: drilldownBody });
      return;
    }

    // Get the ServerName variable from the scene's variable set
    const variable = this.getVariable('ServerName');

    if (!variable) {
      console.warn('ServerName variable not found');
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({ body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'server' }) });
      return;
    }

    // Get selected server names
    const serverNames = getSelectedValues(variable);

    // If single server, show 2 graphs (CPU Utilization + Combined Temperature)
    if (serverNames.length === 1) {
      const singleServerBody = createSingleServerGraphsBody();
      this.setState({ body: singleServerBody });
      return;
    }

    // If multiple servers, show table with sparklines
    const multiServerBody = createMultiServerTableBody(this);
    this.setState({ body: multiServerBody });
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
// SINGLE SERVER VIEW - CPU Utilization + Combined CPU Temperature graphs
// ============================================================================

function createSingleServerGraphsBody() {
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
      builder
        .matchFieldsByType('number' as any)
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
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOverrides((builder) => {
      // CPU 1 series - Orange
      builder
        .matchFieldsWithNameByRegex('/^B Temperature/')
        .overrideDisplayName('CPU 1')
        .overrideColor({ fixedColor: 'semi-dark-orange', mode: 'fixed' });

      // CPU 2 series - Red (to distinguish)
      builder
        .matchFieldsWithNameByRegex('/^C Temperature/')
        .overrideDisplayName('CPU 2')
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
// DRILLDOWN VIEW - Detailed graphs for a single server (from table click)
// ============================================================================

function createDrilldownView(serverName: string, scene: DynamicCPUUtilizationScene) {
  // Create combined header with back button
  const drilldownHeader = new DrilldownHeaderControl({
    serverName: serverName,
    onBack: () => scene.exitDrilldown(),
  });

  // Create queries with hardcoded server filter (bypass variable)
  const drilldownQueryA = createDrilldownQuery(queryA, serverName);
  const drilldownQueryB = createDrilldownQuery(queryB, serverName);
  const drilldownQueryC = createDrilldownQuery(queryC, serverName);

  // Create query runners with drilldown queries
  const cpuUtilQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQueryA],
  });

  // Combined Temperature Query Runner (CPU 1 + CPU 2) - matching single server view
  const cpuTempQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQueryB, drilldownQueryC],
  });

  // Create panels (matching single-server view)
  const cpuUtilizationPanel = PanelBuilders.timeseries()
    .setTitle('CPU Utilization')
    .setData(cpuUtilQueryRunner)
    .setUnit('percentunit')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setCustomFieldConfig('axisSoftMax', 1)
    .setOverrides((builder) => {
      builder
        .matchFieldsByType('number' as any)
        .overrideColor({ fixedColor: 'semi-dark-blue', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi' as any,
      sort: 'desc' as any,
    })
    .build();

  // Combined CPU Temperature panel - matching single server view
  const cpuTemperaturePanel = PanelBuilders.timeseries()
    .setTitle('CPU Temperature')
    .setData(cpuTempQueryRunner)
    .setUnit('celsius')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOverrides((builder) => {
      // CPU 1 series - Orange
      builder
        .matchFieldsWithNameByRegex('/^B Temperature/')
        .overrideDisplayName('CPU 1')
        .overrideColor({ fixedColor: 'semi-dark-orange', mode: 'fixed' });

      // CPU 2 series - Red (to distinguish)
      builder
        .matchFieldsWithNameByRegex('/^C Temperature/')
        .overrideDisplayName('CPU 2')
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
// MULTI-SERVER VIEW - Table with sparklines
// ============================================================================

function createMultiServerTableBody(scene: DynamicCPUUtilizationScene) {
  // Create query runner with all 3 timeseries queries
  const baseQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queryA, queryB, queryC],
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
          C: { timeField: 'Time' },
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
            'Trend #C': 3,
          },
          renameByName: {
            'Trend #A': 'Utilization',
            'Trend #B': 'CPU 1 Temperature',
            'Trend #C': 'CPU 2 Temperature',
          },
        },
      },
    ],
  });

  // Create table panel with sparklines and field overrides
  const tablePanel = PanelBuilders.table()
    .setTitle('CPU details for all Servers - Click row to drill down')
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

      // Temperature columns - celsius unit
      builder
        .matchFieldsWithNameByRegex('/CPU.*Temperature/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  // Wrap table in clickable wrapper
  const clickableTable = new ClickableTableWrapper({
    tablePanel: tablePanel,
    onRowClick: (serverName: string) => {
      scene.drillToServer(serverName);
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
