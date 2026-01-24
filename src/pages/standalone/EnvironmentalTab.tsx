import React from 'react';
import {
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { EmptyStateScene } from '../../components/EmptyStateScene';
import { getEmptyStateScenario, getSelectedValues } from '../../utils/emptyStateHelpers';

// ============================================================================
// DRILLDOWN QUERY HELPER
// ============================================================================

/**
 * Creates a drilldown query by replacing variable interpolation with a hardcoded server name
 */
function createDrilldownQuery(baseQuery: any, serverName: string): any {
  // Deep clone the base query
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));

  // Replace the ServerName variable reference with the hardcoded server name
  // The variable is referenced as: [\${ServerName:doublequote}]
  // We need to replace it with: ["serverName"]
  const escapedServerName = JSON.stringify(serverName);
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
// DYNAMIC POWER CONSUMPTION SCENE - Conditional rendering based on ServerName
// ============================================================================

interface DynamicPowerConsumptionSceneState extends SceneObjectState {
  body: any;
  drilldownServer?: string;  // Server name when in drilldown mode
  isDrilldown?: boolean;      // True when viewing drilldown (from table click)
}

/**
 * DynamicPowerConsumptionScene - Custom scene that monitors the ServerName variable
 * and conditionally renders:
 * - Single server: Single timeseries with dynamic title
 * - Multiple servers: Timeseries + Table side-by-side with clickable rows
 * - Drilldown: Timeseries for specific server with back button
 */
class DynamicPowerConsumptionScene extends SceneObjectBase<DynamicPowerConsumptionSceneState> {
  public static Component = DynamicPowerConsumptionSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ServerName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicPowerConsumptionSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
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

    // Get selected server names (empty state already checked at top level)
    const serverNames = getSelectedValues(variable);

    // If single server, show only timeseries with dynamic title
    if (serverNames.length === 1) {
      const singleServerBody = createSingleServerPanel(serverNames[0]);
      this.setState({ body: singleServerBody });
      return;
    }

    // If multiple servers, show both panels side-by-side with clickable table
    const multiServerBody = createMultiServerPanels(this);
    this.setState({ body: multiServerBody });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Renderer component for DynamicPowerConsumptionScene
 */
function DynamicPowerConsumptionSceneRenderer({
  model,
}: SceneComponentProps<DynamicPowerConsumptionScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// SINGLE SERVER VIEW - Timeseries only with dynamic title
// ============================================================================

function createSingleServerPanel(serverName: string) {
  // Query definition for single server (same as powerConsumptionTimeseriesRunner)
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.power_sum', text: 'Power', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
        "virtualColumns": [
          {
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
            "value": "hw.power_supply"
          }
          ]
        },
        "aggregations": [
          {
            "type": "doubleMax",
            "name": "hw-power_max-Max",
            "fieldName": "hw.power_max"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power_sum",
        "fieldName": "hw-power_max-Max"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Power (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const panel = PanelBuilders.timeseries()
    .setTitle(`Power consumption of ${serverName}`)
    .setData(dataTransformer)
    .setUnit('watt')
    .setCustomFieldConfig('axisSoftMin', 0)
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

// ============================================================================
// MULTI-SERVER VIEW - Timeseries + Table side-by-side
// ============================================================================

function createMultiServerPanels(scene: DynamicPowerConsumptionScene) {
  // Timeseries panel (left side)
  const timeseriesRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.power_sum', text: 'Power', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
        "virtualColumns": [
          {
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
            "value": "hw.power_supply"
          }
          ]
        },
        "aggregations": [
          {
            "type": "doubleMax",
            "name": "hw-power_max-Max",
            "fieldName": "hw.power_max"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power_sum",
        "fieldName": "hw-power_max-Max"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const timeseriesTransformer = new LoggingDataTransformer({
    $data: timeseriesRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Power (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const timeseriesPanel = PanelBuilders.timeseries()
    .setTitle('Power consumption of all Hosts (Max)')
    .setData(timeseriesTransformer)
    .setUnit('watt')
    .setCustomFieldConfig('axisSoftMin', 0)
    .build();

  // Table panel (right side)
  const tableRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max-power', text: 'Power', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.RackUnit"
        },
        {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.host"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max-power",
        "fieldName": "hw.host.power_max"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const tableTransformer = new LoggingDataTransformer({
    $data: tableRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: {
            timeField: 'Time',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'Trend #A': 'Power',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('Power consumption per Host - Click row to drill down')
    .setData(tableTransformer)
    .setUnit('watt')
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Power')
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        });
      builder
        .matchFieldsWithName('Hostname')
        .overrideCustomFieldConfig('width', 240);
    })
    .build();

  // Wrap table in clickable wrapper
  const clickableTable = new ClickableTableWrapper({
    tablePanel: tablePanel,
    onRowClick: (serverName: string) => {
      scene.drillToServer(serverName);
    },
  });

  // Return grid layout with both panels side-by-side
  return new SceneGridLayout({
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 12,
        height: 8,
        body: timeseriesPanel,
      }),
      new SceneGridItem({
        x: 12,
        y: 0,
        width: 12,
        height: 8,
        body: clickableTable,
      }),
    ],
  });
}

// ============================================================================
// DRILLDOWN VIEW - Detailed panel for a single server (from table click)
// ============================================================================

function createDrilldownView(serverName: string, scene: DynamicPowerConsumptionScene) {
  // Create header with back button
  const drilldownHeader = new DrilldownHeaderControl({
    serverName: serverName,
    onBack: () => scene.exitDrilldown(),
  });

  // Base query for timeseries (same structure as powerConsumptionTimeseriesRunner)
  const baseQuery = {
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
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.power_sum', text: 'Power', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
        "virtualColumns": [
          {
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
            "value": "hw.power_supply"
          }
          ]
        },
        "aggregations": [
          {
            "type": "doubleMax",
            "name": "hw-power_max-Max",
            "fieldName": "hw.power_max"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power_sum",
        "fieldName": "hw-power_max-Max"
      }
    ]
  }`,
    },
  };

  // Create drilldown query with hardcoded server name
  const drilldownQuery = createDrilldownQuery(baseQuery, serverName);

  // Create query runner with drilldown query
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQuery],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Power (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const panel = PanelBuilders.timeseries()
    .setTitle(`Power consumption of ${serverName}`)
    .setData(dataTransformer)
    .setUnit('watt')
    .setCustomFieldConfig('axisSoftMin', 0)
    .build();

  // Layout with header + panel
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 50,
        body: drilldownHeader,
      }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

/**
 * Creates the full Environmental tab content (all panels and rows)
 * This is called by DynamicEnvironmentalScene after checking for empty state
 */
function createEnvironmentalTabContent() {
  // Row 1: Power Supply Status Panel (panel-6)
  const powerSupplyQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '',
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.status_sum', text: 'Status', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
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
              "type": "selector",
              "dimension": "instrument.name",
              "value": "hw.power_supply"
            },
            {
              "type": "in",
              "dimension": "host.name",
              "values": [\${ServerName:doublequote}]
            }
          ]
        },
        "aggregations": [
          {
            "type": "longMin",
            "name": "hw-status_min-Min",
            "fieldName": "hw.status_min"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "aggregations": [
      {
        "type": "longSum",
        "name": "status_sum",
        "fieldName": "hw-status_min-Min"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const powerSupplyDataTransformer = new LoggingDataTransformer({
    $data: powerSupplyQueryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Hostname',
          rowField: 'Time',
          valueField: 'Status',
        },
      },
    ],
  });

  const powerSupplyPanel = PanelBuilders.timeseries()
    .setTitle('Active PSUs per device')
    .setDescription('Displays the count of active power supplies- one color per device. Maximum count of power supplies is used as threshold. Adding or removing devices can skew the threshold.')
    .setData(powerSupplyDataTransformer)
    .setCustomFieldConfig('drawStyle', 'bars')
    .setCustomFieldConfig('fillOpacity', 100)
    .setCustomFieldConfig('barAlignment', 0)
    .setCustomFieldConfig('barWidthFactor', 1)
    .setCustomFieldConfig('stacking', { mode: 'normal', group: 'A' })
    .setCustomFieldConfig('thresholdsStyle', { mode: 'dashed+area' })
    .setCustomFieldConfig('axisSoftMin', 0)
    .setDecimals(0)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'semi-dark-red' },
        { value: 100, color: 'transparent' },
      ],
    })
    .build();

  // Row 0: Power Supply Status
  const powerSupplyRow = new SceneGridRow({
    title: 'Power Supply Status',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 8,
        body: powerSupplyPanel,
      }),
    ],
  });

  // Row 1: Host Power Consumption (Dynamic - conditional rendering based on ServerName)
  const hostPowerConsumptionRow = new SceneGridRow({
    title: 'Host Power Consumption',
    isCollapsible: true,
    isCollapsed: false,
    y: 8,
    children: [
      new SceneGridItem({
        x: 0,
        y: 8,
        width: 24,
        height: 8,
        body: new DynamicPowerConsumptionScene({}),
      }),
    ],
  });

  // Row 2: Fan Speed (Dynamic - conditional rendering based on server count)
  const fanSpeedRow = new SceneGridRow({
    title: 'Fan Speed',
    isCollapsible: true,
    isCollapsed: false,
    y: 16,
    children: [
      new SceneGridItem({
        x: 0,
        y: 16,
        width: 24,
        height: 8,
        body: new DynamicFanSpeedScene({}),
      }),
    ],
  });

  // Row 3: Host Temperature (Dynamic - conditional rendering based on ServerName)
  const hostTemperatureRow = new SceneGridRow({
    title: 'Host Temperature',
    isCollapsible: true,
    isCollapsed: false,
    y: 24,
    children: [
      new SceneGridItem({
        x: 0,
        y: 24,
        width: 24,
        height: 16,
        body: new DynamicTemperatureScene({}),
      }),
    ],
  });

  // Return grid layout wrapped in flex layout (required pattern)
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 1400,
        body: new SceneGridLayout({
          children: [
            powerSupplyRow,
            hostPowerConsumptionRow,
            fanSpeedRow,
            hostTemperatureRow,
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// TOP-LEVEL DYNAMIC ENVIRONMENTAL SCENE
// ============================================================================

interface DynamicEnvironmentalSceneState extends SceneObjectState {
  body: any;
}

/**
 * Top-level scene that checks for empty state before rendering environmental tab
 */
class DynamicEnvironmentalScene extends SceneObjectBase<DynamicEnvironmentalSceneState> {
  public static Component = DynamicEnvironmentalSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ServerName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicEnvironmentalSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    const variable = sceneGraph.lookupVariable('ServerName', this);
    if (!variable || variable.state.type !== 'query') {
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({ body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'server' }) });
      return;
    }

    // Valid state - render full environmental tab content
    const fullContent = createEnvironmentalTabContent();
    this.setState({ body: fullContent });
  }
}

function DynamicEnvironmentalSceneRenderer({ model }: SceneComponentProps<DynamicEnvironmentalScene>) {
  const { body } = model.useState();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

/**
 * Main export function for Environmental tab
 */
export function getEnvironmentalTab() {
  return new DynamicEnvironmentalScene({});
}

// ============================================================================
// FAN SPEED QUERY - Reused across views
// ============================================================================

const fanSpeedQuery = {
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
    { selector: 'event.host_name', text: 'Hostname', type: 'string' },
    { selector: 'event.fan_speed', text: 'Fan Speed', type: 'number' },
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
          "value": "hw.fan"
        }
      ]
    },
        "aggregations": [
          {
            "type": "longSum",
            "name": "count",
            "fieldName": "hw.fan.speed_count"
          },
          {
            "type": "longSum",
            "name": "hw.fan.speed-Sum",
            "fieldName": "hw.fan.speed"
          }
        ],
        "postAggregations": [
          {
            "type": "expression",
            "name": "fan_speed",
            "expression": "(\\"hw.fan.speed-Sum\\" / \\"count\\")"
          }
        ]
  }`,
  },
} as any;

// ============================================================================
// DYNAMIC FAN SPEED SCENE - Conditional rendering based on server count
// ============================================================================

interface DynamicFanSpeedSceneState extends SceneObjectState {
  body: any;
  drilldownServer?: string;
  isDrilldown?: boolean;
}

class DynamicFanSpeedScene extends SceneObjectBase<DynamicFanSpeedSceneState> {
  public static Component = DynamicFanSpeedSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ServerName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicFanSpeedSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
  }

  public drillToServer(serverName: string) {
    this.setState({
      drilldownServer: serverName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  public exitDrilldown() {
    this.setState({
      drilldownServer: undefined,
      isDrilldown: false,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    // Check for drilldown mode first
    if (this.state.isDrilldown && this.state.drilldownServer) {
      const drilldownBody = createFanSpeedDrilldownView(this.state.drilldownServer, this);
      this.setState({ body: drilldownBody });
      return;
    }

    const variable = this.getVariable('ServerName');
    if (!variable) {
      console.warn('ServerName variable not found');
      return;
    }

    // Get selected server names (empty state already checked at top level)
    const serverNames = getSelectedValues(variable);

    // If <= 20 servers, show line chart
    if (serverNames.length <= 20) {
      const lineChartBody = createFanSpeedLineChartView();
      this.setState({ body: lineChartBody });
      return;
    }

    // If > 20 servers, show table with drilldown
    const tableBody = createFanSpeedTableView(this);
    this.setState({ body: tableBody });
  }

  private getVariable(name: string): any {
    return sceneGraph.lookupVariable(name, this);
  }
}

function DynamicFanSpeedSceneRenderer({ model }: SceneComponentProps<DynamicFanSpeedScene>) {
  const { body } = model.useState();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// Line chart view for <= 20 servers
function createFanSpeedLineChartView() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [fanSpeedQuery],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Fan Speed (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const panel = PanelBuilders.timeseries()
    .setTitle('Fan speed per Host (Avg)')
    .setData(dataTransformer)
    .setUnit('rotrpm')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

// Table view for > 20 servers
function createFanSpeedTableView(scene: DynamicFanSpeedScene) {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [fanSpeedQuery],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Fan Speed (.*)',
          renamePattern: '$1',
        },
      },
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'Trend #A': 'Fan Speed',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('Fan speed per Host (Avg) - Click row to drill down')
    .setData(dataTransformer)
    .setUnit('rotrpm')
    .setOption('cellHeight', 'lg')
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Fan Speed')
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        });
      builder
        .matchFieldsByType('string')
        .overrideCustomFieldConfig('width', 240);
    })
    .build();

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

// Drilldown view with back button
function createFanSpeedDrilldownView(serverName: string, scene: DynamicFanSpeedScene) {
  const drilldownHeader = new DrilldownHeaderControl({
    serverName: serverName,
    onBack: () => scene.exitDrilldown(),
  });

  const drilldownQuery = createDrilldownQuery(fanSpeedQuery, serverName);

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQuery],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Fan Speed (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const panel = PanelBuilders.timeseries()
    .setTitle(`Fan speed for ${serverName} (Avg)`)
    .setData(dataTransformer)
    .setUnit('rotrpm')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 50, body: drilldownHeader }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

// ============================================================================
// TEMPERATURE TAB QUERIES - Reused across views
// ============================================================================

const temperatureQueryA = {
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
    { selector: 'event.hostname', text: 'Hostname', type: 'string' },
    { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
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
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "server_front"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
  },
} as any;

const temperatureQueryB = {
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
    { selector: 'event.hostname', text: 'Hostname', type: 'string' },
    { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
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
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P1_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
  },
} as any;

const temperatureQueryC = {
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
    { selector: 'event.hostname', text: 'Hostname', type: 'string' },
    { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
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
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P2_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
  },
} as any;

// ============================================================================
// DYNAMIC TEMPERATURE SCENE - Conditional rendering with drilldown
// ============================================================================

interface DynamicTemperatureSceneState extends SceneObjectState {
  body: any;
  drilldownServer?: string;
  isDrilldown?: boolean;
}

class DynamicTemperatureScene extends SceneObjectBase<DynamicTemperatureSceneState> {
  public static Component = DynamicTemperatureSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ServerName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicTemperatureSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
  }

  public drillToServer(serverName: string) {
    this.setState({
      drilldownServer: serverName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  public exitDrilldown() {
    this.setState({
      drilldownServer: undefined,
      isDrilldown: false,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    // Check for drilldown mode
    if (this.state.isDrilldown && this.state.drilldownServer) {
      const drilldownBody = createTemperatureDrilldownView(this.state.drilldownServer, this);
      this.setState({ body: drilldownBody });
      return;
    }

    const variable = this.getVariable('ServerName');
    if (!variable) {
      console.warn('ServerName variable not found');
      return;
    }

    // Get selected server names (empty state already checked at top level)
    const serverNames = getSelectedValues(variable);

    // Single server: Show timeseries graphs
    if (serverNames.length === 1) {
      const singleServerBody = createTemperatureTimeseriesView();
      this.setState({ body: singleServerBody });
      return;
    }

    // Multiple servers: Show clickable table
    const multiServerBody = createTemperatureTableView(this);
    this.setState({ body: multiServerBody });
  }

  private getVariable(name: string): any {
    return sceneGraph.lookupVariable(name, this);
  }
}

function DynamicTemperatureSceneRenderer({ model }: SceneComponentProps<DynamicTemperatureScene>) {
  const { body } = model.useState();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// Single/Multi server view: Combined temperature graph
function createTemperatureTimeseriesView() {
  // Single query runner with all three queries
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [temperatureQueryA, temperatureQueryB, temperatureQueryC],
  });

  // Single panel showing all three temperature series
  const temperaturePanel = PanelBuilders.timeseries()
    .setTitle('Host Temperature')
    .setData(queryRunner)
    .setUnit('celsius')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setDecimals(1)
    .setOverrides((builder) => {
      // Intake Temperature - Blue
      builder
        .matchFieldsWithNameByRegex('/^A Temperature/')
        .overrideDisplayName('Intake Temperature')
        .overrideColor({ fixedColor: 'semi-dark-blue', mode: 'fixed' });

      // CPU 1 Temperature - Orange
      builder
        .matchFieldsWithNameByRegex('/^B Temperature/')
        .overrideDisplayName('Processor 1')
        .overrideColor({ fixedColor: 'semi-dark-orange', mode: 'fixed' });

      // CPU 2 Temperature - Red
      builder
        .matchFieldsWithNameByRegex('/^C Temperature/')
        .overrideDisplayName('Processor 2')
        .overrideColor({ fixedColor: 'semi-dark-red', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: temperaturePanel,
      }),
    ],
  });
}

// Multiple servers: Table view with clickable rows
function createTemperatureTableView(scene: DynamicTemperatureScene) {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [temperatureQueryA, temperatureQueryB, temperatureQueryC],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
          C: { timeField: 'Time' },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'Hostname',
          mode: 'outer',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'Hostname': '',
            'Trend #A': 'Intake Temperature',
            'Trend #B': 'Processor 1',
            'Trend #C': 'Processor 2',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('Host Temperature Details - Click row to drill down')
    .setData(dataTransformer)
    .setOption('cellHeight', 'lg')
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('/Temperature|Processor/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

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

// Drilldown view with back button
function createTemperatureDrilldownView(serverName: string, scene: DynamicTemperatureScene) {
  const drilldownHeader = new DrilldownHeaderControl({
    serverName: serverName,
    onBack: () => scene.exitDrilldown(),
  });

  // Create drilldown queries with hardcoded server name
  const drilldownA = createDrilldownQuery(temperatureQueryA, serverName);
  const drilldownB = createDrilldownQuery(temperatureQueryB, serverName);
  const drilldownC = createDrilldownQuery(temperatureQueryC, serverName);

  // Single query runner with all three drilldown queries
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [drilldownA, drilldownB, drilldownC],
  });

  // Single panel showing all three temperature series
  const temperaturePanel = PanelBuilders.timeseries()
    .setTitle('Host Temperature')
    .setData(queryRunner)
    .setUnit('celsius')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setDecimals(1)
    .setOverrides((builder) => {
      // Intake Temperature - Blue
      builder
        .matchFieldsWithNameByRegex('/^A Temperature/')
        .overrideDisplayName('Intake Temperature')
        .overrideColor({ fixedColor: 'semi-dark-blue', mode: 'fixed' });

      // CPU 1 Temperature - Orange
      builder
        .matchFieldsWithNameByRegex('/^B Temperature/')
        .overrideDisplayName('Processor 1')
        .overrideColor({ fixedColor: 'semi-dark-orange', mode: 'fixed' });

      // CPU 2 Temperature - Red
      builder
        .matchFieldsWithNameByRegex('/^C Temperature/')
        .overrideDisplayName('Processor 2')
        .overrideColor({ fixedColor: 'semi-dark-red', mode: 'fixed' });
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 50, body: drilldownHeader }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: temperaturePanel,
      }),
    ],
  });
}

// Updated export function to return dynamic scene
export function getTemperatureTab() {
  return new DynamicTemperatureScene({});
}

