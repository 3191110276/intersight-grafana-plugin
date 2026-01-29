import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
  behaviors,
  SceneVariableSet,
  CustomVariable,
  VariableValueSelectors,
} from '@grafana/scenes';
import { DashboardCursorSync } from '@grafana/data';
import { TabbedScene } from '../../components/TabbedScene';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { NetworkUtilPivotProvider } from '../../utils/NetworkUtilPivotProvider';
import { NetworkUtilDownlinksPivotProvider } from '../../utils/NetworkUtilDownlinksPivotProvider';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get aggregation value and convert to lowercase for query usage
 */
function getAggregationValue(scene: SceneObjectBase): string {
  const variable = sceneGraph.lookupVariable('Aggregation', scene);
  if (!variable || !('state' in variable)) {
    return 'avg'; // default
  }

  const value = (variable.state as any).value;
  const stringValue = String(value);

  // Convert display values to query values
  switch (stringValue) {
    case 'Minimum':
      return 'min';
    case 'Average':
      return 'avg';
    case 'Maximum':
      return 'max';
    default:
      return 'avg';
  }
}

/**
 * Get chassis count from ChassisName variable
 */
function getChassisCount(scene: SceneObjectBase): number {
  const variable = sceneGraph.lookupVariable('ChassisName', scene);
  if (!variable || !('state' in variable)) {
    return 0;
  }

  const value = (variable.state as any).value;

  if (Array.isArray(value)) {
    return value.filter(v => v && v !== '$__all').length;
  } else if (value && value !== '$__all') {
    return 1;
  }

  return 0;
}

/**
 * Create drilldown query by replacing ChassisName variable with hardcoded value
 */
function createDrilldownQuery(baseQuery: any, chassisName: string): any {
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));
  const escapedChassisName = JSON.stringify(chassisName);

  // Replace [${ChassisName:doublequote}] with ["chassisName"]
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /\[\$\{ChassisName:doublequote\}\]/g,
    `[${escapedChassisName}]`
  );

  return drilldownQuery;
}

// ============================================================================
// DRILLDOWN HEADER COMPONENT
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
        <span>Back to Overview</span>
      </button>
      <div style={{
        fontSize: '18px',
        fontWeight: 500,
      }}>
        Drilldown: Chassis {chassisName}
      </div>
    </div>
  );
}

// ============================================================================
// CLICKABLE TABLE WRAPPER COMPONENT
// ============================================================================

interface ClickableTableWrapperState extends SceneObjectState {
  tablePanel: any;
  onRowClick: (name: string) => void;
}

class ClickableTableWrapper extends SceneObjectBase<ClickableTableWrapperState> {
  public static Component = ClickableTableWrapperRenderer;
}

function ClickableTableWrapperRenderer({ model }: SceneComponentProps<ClickableTableWrapper>) {
  const { tablePanel, onRowClick } = model.useState();

  const handleClick = (event: React.MouseEvent) => {
    // Find the row element
    let row = (event.target as HTMLElement).closest('[role="row"]');

    // Fallback: try standard table selectors
    if (!row) {
      row = (event.target as HTMLElement).closest('tr');
    }

    if (!row) {
      return;
    }

    // Grafana's virtualized table uses <div role="cell"> without aria-colindex
    // Try multiple selector strategies for first cell
    let firstCell = row.querySelector('[role="gridcell"][aria-colindex="1"]'); // Old Grafana tables

    if (!firstCell) {
      // Grafana 12+ virtualized tables use role="cell"
      firstCell = row.querySelector('[role="cell"]');
    }

    if (!firstCell) {
      // Fallback: try first td (non-virtualized tables)
      firstCell = row.querySelector('td:first-child');
    }

    if (firstCell) {
      const name = firstCell.textContent?.trim();
      if (name) {
        onRowClick(name);
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
// SHARED DRILLDOWN STATE
// ============================================================================

interface SharedDrilldownStateState extends SceneObjectState {
  mode: 'overview' | 'drilldown';
  chassisName?: string;
  lastChassisValue?: any;  // Track previous ChassisName value to detect changes
}

/**
 * Shared drilldown state manager that synchronizes drilldown across all Network Utilization containers
 */
class SharedDrilldownState extends SceneObjectBase<SharedDrilldownStateState> {
  public static Component = () => null; // Non-visual component
  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      const currentChassisValue = this.getChassisVariableValue();
      const lastChassisValue = this.state.lastChassisValue;

      // Only exit drilldown if ChassisName actually changed
      if (this.hasChassisVariableChanged(lastChassisValue, currentChassisValue)) {
        if (this.state.mode !== 'overview') {
          this.exitDrilldown();
        }
      }

      // Update tracked value
      this.setState({ lastChassisValue: currentChassisValue });
    },
  });

  public drillToChassis(chassisName: string) {
    this.setState({
      mode: 'drilldown',
      chassisName,
    });
  }

  public exitDrilldown() {
    this.setState({
      mode: 'overview',
      chassisName: undefined,
    });
  }

  private getChassisVariableValue(): any {
    const variable = sceneGraph.lookupVariable('ChassisName', this);
    if (!variable || !('state' in variable)) {
      return undefined;
    }
    return (variable.state as any).value;
  }

  private hasChassisVariableChanged(oldValue: any, newValue: any): boolean {
    // Handle arrays (multi-select)
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) return true;
      // Sort and compare
      const sorted1 = [...oldValue].sort();
      const sorted2 = [...newValue].sort();
      return !sorted1.every((val, idx) => val === sorted2[idx]);
    }

    // Handle simple values
    return oldValue !== newValue;
  }
}

// ============================================================================
// NETWORK UTILIZATION DETAILS CONTAINER
// ============================================================================

interface NetworkUtilizationDetailsContainerState extends SceneObjectState {
  portRole: string;  // 'eth_uplink' or 'eth_uplink_pc' or 'host_port'
  tabType: string;   // 'percentage' or 'absolute'
  body: any;
}

/**
 * Container scene that manages conditional rendering and drilldown for network utilization details
 */
class NetworkUtilizationDetailsContainer extends SceneObjectBase<NetworkUtilizationDetailsContainerState> {
  public static Component = NetworkUtilizationDetailsContainerRenderer;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['Aggregation'],
    onReferencedVariableValueChanged: () => {
      // Rebuild body when Aggregation changes (but NOT ChassisName - that's handled by SharedDrilldownState)
      this.rebuildBody();
    },
  });

  public constructor(state: NetworkUtilizationDetailsContainerState) {
    super(state);
  }

  // @ts-ignore
  public activate() {
    const result = super.activate();

    // Find and subscribe to shared drilldown state changes
    const sharedDrilldownState = this.getSharedDrilldownState();
    if (sharedDrilldownState) {
      const subscription = sharedDrilldownState.subscribeToState(() => {
        this.rebuildBody();
      });

      // Store subscription for cleanup
      this._subs.add(subscription);
    }

    // Build panels when scene becomes active (when it has access to variables)
    this.rebuildBody();
    return result;
  }

  public drillToChassis(chassisName: string) {
    const sharedState = this.getSharedDrilldownState();
    if (sharedState) {
      sharedState.drillToChassis(chassisName);
    }
  }

  public exitDrilldown() {
    const sharedState = this.getSharedDrilldownState();
    if (sharedState) {
      sharedState.exitDrilldown();
    }
  }

  private getSharedDrilldownState(): SharedDrilldownState | null {
    try {
      return sceneGraph.findObject(this, (obj) => obj instanceof SharedDrilldownState) as SharedDrilldownState;
    } catch {
      return null;
    }
  }

  private rebuildBody() {
    // Only rebuild if scene is active (has access to variables)
    if (!this.isActive) {
      return;
    }

    const { portRole, tabType } = this.state;

    // Get drilldown state from scene graph
    const sharedDrilldownState = this.getSharedDrilldownState();
    const mode = sharedDrilldownState?.state.mode || 'overview';
    const chassisName = sharedDrilldownState?.state.chassisName;

    // Priority 1: Drilldown mode
    if (mode === 'drilldown' && chassisName) {
      this.setState({ body: createDrilldownView(chassisName, portRole, tabType, this) });
      return;
    }

    // Priority 2: Get chassis count
    const count = getChassisCount(this);

    // Priority 3: Single chassis (1) - show 4-panel line chart view
    if (count === 1) {
      this.setState({ body: createLineChartView(portRole, tabType, this) });
      return;
    }

    // Priority 4: Multi-chassis (2+) - show table with drilldown
    if (count > 1) {
      // Use downlinks table view for host_port, uplinks table view for others
      if (portRole === 'host_port') {
        this.setState({ body: createTableView_Downlinks(portRole, tabType, this) });
      } else {
        this.setState({ body: createTableView(portRole, tabType, this) });
      }
      return;
    }

    // Priority 5: No chassis selected - show empty state
    const emptyStatePanel = PanelBuilders.text()
      .setTitle('Network Utilization')
      .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.')
      .setOption('mode', 'markdown' as any)
      .setDisplayMode('transparent')
      .build();

    this.setState({
      body: new SceneFlexLayout({
        children: [
          new SceneFlexItem({ ySizing: 'fill', body: emptyStatePanel })
        ]
      })
    });
  }
}

function NetworkUtilizationDetailsContainerRenderer({ model }: SceneComponentProps<NetworkUtilizationDetailsContainer>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// VIEW CREATION FUNCTIONS
// ============================================================================

/**
 * Create line chart view for ≤15 chassis
 * Shows 4 timeseries panels (2x2 grid) with shared cursor sync
 */
function createLineChartView(portRole: string, tabType: string, parent: NetworkUtilizationDetailsContainer) {
  const aggregation = getAggregationValue(parent);
  const panelA_TX = createPanel_eCMC_A_TX(portRole, tabType, false, undefined, aggregation);
  const panelA_RX = createPanel_eCMC_A_RX(portRole, tabType, false, undefined, aggregation);
  const panelB_TX = createPanel_eCMC_B_TX(portRole, tabType, false, undefined, aggregation);
  const panelB_RX = createPanel_eCMC_B_RX(portRole, tabType, false, undefined, aggregation);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Row 1: eCMC-A panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: panelA_TX }),
            new SceneFlexItem({ ySizing: 'fill', body: panelA_RX }),
          ],
        }),
      }),
      // Row 2: eCMC-B panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: panelB_TX }),
            new SceneFlexItem({ ySizing: 'fill', body: panelB_RX }),
          ],
        }),
      }),
    ],
    $behaviors: [
      new behaviors.CursorSync({ key: 'network-util-sync', sync: DashboardCursorSync.Tooltip }),
    ],
  });
}

/**
 * Create unified table query that fetches all eCMC data in a single API call.
 * Returns flat table rows with: Time, Chassis, HostName, PortRole, TX, RX
 */
function createUnifiedTableQuery(tabType: string, aggregation: string) {
  const metricSuffix = tabType === 'percentage' ? '_pct' : '';
  const txMetric = `transmit_${aggregation}${metricSuffix}`;
  const rxMetric = `receive_${aggregation}${metricSuffix}`;

  // Build aggregations and postAggregations based on mode
  let aggregationsJson;
  let postAggregationsJson;

  if (tabType === 'percentage') {
    // PERCENTAGE MODE - hw.network.bandwidth.utilization_* fields
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "receive_max",
        "fieldName": "hw.network.bandwidth.utilization_receive_max"
      },
      {
        "type": "doubleMax",
        "name": "transmit_max",
        "fieldName": "hw.network.bandwidth.utilization_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "receive_min",
        "fieldName": "hw.network.bandwidth.utilization_receive_min"
      },
      {
        "type": "doubleMin",
        "name": "transmit_min",
        "fieldName": "hw.network.bandwidth.utilization_transmit_min"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "\\"receive_max\\""
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "\\"transmit_max\\""
      },
      {
        "type": "expression",
        "name": "receive_max_pct",
        "expression": "\\"receive_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_max_pct",
        "expression": "\\"transmit_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_min_pct",
        "expression": "\\"receive_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_min_pct",
        "expression": "\\"transmit_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_avg_pct",
        "expression": "\\"receive_avg\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_avg_pct",
        "expression": "\\"transmit_avg\\" * 100"
      }
    ]`;
  } else {
    // ABSOLUTE MODE - hw.network.io_* fields
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "base_transmit_max",
        "fieldName": "hw.network.io_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "base_transmit_min",
        "fieldName": "hw.network.io_transmit_min"
      },
      {
        "type": "doubleSum",
        "name": "transmit_duration",
        "fieldName": "hw.network.io_transmit_duration"
      },
      {
        "type": "longSum",
        "name": "transmit_sum",
        "fieldName": "hw.network.io_transmit"
      },
      {
        "type": "doubleMax",
        "name": "base_receive_max",
        "fieldName": "hw.network.io_receive_max"
      },
      {
        "type": "doubleMin",
        "name": "base_receive_min",
        "fieldName": "hw.network.io_receive_min"
      },
      {
        "type": "doubleSum",
        "name": "receive_duration",
        "fieldName": "hw.network.io_receive_duration"
      },
      {
        "type": "longSum",
        "name": "receive_sum",
        "fieldName": "hw.network.io_receive"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "transmit_max",
        "expression": "(base_transmit_max * 8)"
      },
      {
        "type": "expression",
        "name": "transmit_min",
        "expression": "(base_transmit_min * 8)"
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "(\\"transmit_sum\\" / \\"transmit_duration\\") * 8"
      },
      {
        "type": "expression",
        "name": "receive_max",
        "expression": "(base_receive_max * 8)"
      },
      {
        "type": "expression",
        "name": "receive_min",
        "expression": "(base_receive_min * 8)"
      },
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "(\\"receive_sum\\" / \\"receive_duration\\") * 8"
      }
    ]`;
  }

  return {
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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      { selector: 'event.host_name', text: 'HostName', type: 'string' },
      { selector: 'event.port_role', text: 'PortRole', type: 'string' },
      { selector: `event.${txMetric}`, text: 'TX', type: 'number' },
      { selector: `event.${rxMetric}`, text: 'RX', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name", "port_role"],
    "virtualColumns": [
      {
        "type": "nested-field",
        "columnName": "intersight.domain.name",
        "outputName": "domain_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "host.name",
        "outputName": "host_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "hw.network.port.role",
        "outputName": "port_role",
        "expectedType": "STRING",
        "path": "$"
      }
    ],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": ["eth_uplink", "eth_uplink_pc"]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": ${aggregationsJson},
    "postAggregations": ${postAggregationsJson}
  }`,
    },
  } as any;
}

/**
 * Create unified table query for downlinks that fetches host_port data.
 * This query does NOT include host_name in dimensions, causing aggregation across eCMC-A and eCMC-B.
 * Returns flat table rows with: Time, Chassis, HostName (still in output but aggregated), PortRole, TX, RX
 */
function createUnifiedDownlinksTableQuery(tabType: string, aggregation: string) {
  const metricSuffix = tabType === 'percentage' ? '_pct' : '';
  const txMetric = `transmit_${aggregation}${metricSuffix}`;
  const rxMetric = `receive_${aggregation}${metricSuffix}`;

  // Build aggregations and postAggregations based on mode
  let aggregationsJson;
  let postAggregationsJson;

  if (tabType === 'percentage') {
    // PERCENTAGE MODE - hw.network.bandwidth.utilization_* fields
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "receive_max",
        "fieldName": "hw.network.bandwidth.utilization_receive_max"
      },
      {
        "type": "doubleMax",
        "name": "transmit_max",
        "fieldName": "hw.network.bandwidth.utilization_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "receive_min",
        "fieldName": "hw.network.bandwidth.utilization_receive_min"
      },
      {
        "type": "doubleMin",
        "name": "transmit_min",
        "fieldName": "hw.network.bandwidth.utilization_transmit_min"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "\\"receive_max\\""
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "\\"transmit_max\\""
      },
      {
        "type": "expression",
        "name": "receive_max_pct",
        "expression": "\\"receive_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_max_pct",
        "expression": "\\"transmit_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_min_pct",
        "expression": "\\"receive_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_min_pct",
        "expression": "\\"transmit_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_avg_pct",
        "expression": "\\"receive_avg\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_avg_pct",
        "expression": "\\"transmit_avg\\" * 100"
      }
    ]`;
  } else {
    // ABSOLUTE MODE - hw.network.io_* fields
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "base_transmit_max",
        "fieldName": "hw.network.io_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "base_transmit_min",
        "fieldName": "hw.network.io_transmit_min"
      },
      {
        "type": "doubleSum",
        "name": "transmit_duration",
        "fieldName": "hw.network.io_transmit_duration"
      },
      {
        "type": "longSum",
        "name": "transmit_sum",
        "fieldName": "hw.network.io_transmit"
      },
      {
        "type": "doubleMax",
        "name": "base_receive_max",
        "fieldName": "hw.network.io_receive_max"
      },
      {
        "type": "doubleMin",
        "name": "base_receive_min",
        "fieldName": "hw.network.io_receive_min"
      },
      {
        "type": "doubleSum",
        "name": "receive_duration",
        "fieldName": "hw.network.io_receive_duration"
      },
      {
        "type": "longSum",
        "name": "receive_sum",
        "fieldName": "hw.network.io_receive"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "transmit_max",
        "expression": "(base_transmit_max * 8)"
      },
      {
        "type": "expression",
        "name": "transmit_min",
        "expression": "(base_transmit_min * 8)"
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "(\\"transmit_sum\\" / \\"transmit_duration\\") * 8"
      },
      {
        "type": "expression",
        "name": "receive_max",
        "expression": "(base_receive_max * 8)"
      },
      {
        "type": "expression",
        "name": "receive_min",
        "expression": "(base_receive_min * 8)"
      },
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "(\\"receive_sum\\" / \\"receive_duration\\") * 8"
      }
    ]`;
  }

  return {
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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      { selector: 'event.port_name', text: 'PortName', type: 'string' },
      { selector: 'event.port_role', text: 'PortRole', type: 'string' },
      { selector: `event.${txMetric}`, text: 'TX', type: 'number' },
      { selector: `event.${rxMetric}`, text: 'RX', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "port_name", "port_role"],
    "virtualColumns": [
      {
        "type": "nested-field",
        "columnName": "intersight.domain.name",
        "outputName": "domain_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "name",
        "outputName": "port_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "hw.network.port.role",
        "outputName": "port_role",
        "expectedType": "STRING",
        "path": "$"
      }
    ],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "host_port"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": ${aggregationsJson},
    "postAggregations": ${postAggregationsJson}
  }`,
    },
  } as any;
}

/**
 * Create table view for multi-chassis (2+)
 * Uses a single unified query + NetworkUtilPivotProvider to reshape data into
 * 4 timeseries frame sets, then timeSeriesTable + joinByField for sparklines.
 */
function createTableView(portRole: string, tabType: string, parent: NetworkUtilizationDetailsContainer) {
  const aggregation = getAggregationValue(parent);

  // Single query that fetches all eCMC data (both port roles, both eCMC-A and eCMC-B)
  const unifiedQuery = createUnifiedTableQuery(tabType, aggregation);

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [unifiedQuery],
  });

  // Pivot provider filters by portRole and reshapes into 4 timeseries frame sets
  const pivotProvider = new NetworkUtilPivotProvider({
    $data: queryRunner,
    portRole: portRole,
  });

  // Transform the pivoted timeseries into a table with sparklines
  const transformedData = new LoggingDataTransformer({
    $data: pivotProvider,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
          C: { timeField: 'Time' },
          D: { timeField: 'Time' },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'Chassis',
          mode: 'outer',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            'Chassis': 0,
            'Trend #A': 1,
            'Trend #B': 2,
            'Trend #C': 3,
            'Trend #D': 4,
          },
          renameByName: {
            'Trend #A': 'eCMC-A TX',
            'Trend #B': 'eCMC-A RX',
            'Trend #C': 'eCMC-B TX',
            'Trend #D': 'eCMC-B RX',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          mode: 'reduceRow',
          reduce: {
            reducer: 'max',
          },
          replaceFields: false,
          alias: 'MaxUtilization',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'MaxUtilization': true,
          },
          includeByName: {},
          indexByName: {
            'Chassis': 0,
            'eCMC-A TX': 1,
            'eCMC-A RX': 2,
            'eCMC-B TX': 3,
            'eCMC-B RX': 4,
            'MaxUtilization': 5,
          },
          renameByName: {},
        },
      },
    ],
  });

  // Create table panel with sparklines
  const tablePanel = PanelBuilders.table()
    .setTitle('Network Utilization - Click row to drill down')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'lg' as any)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ displayName: 'MaxUtilization', desc: true }])
    .setCustomFieldConfig('filterable', true)
    .setOverrides((builder) => {
      // String columns - set width to 240px
      builder.matchFieldsByType('string' as any).overrideCustomFieldConfig('width', 240);

      // eCMC-A TX column - sparkline with appropriate unit and color
      builder
        .matchFieldsWithName('eCMC-A TX')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'sparkline' as any,
        })
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideUnit(tabType === 'percentage' ? 'percent' : 'bps')
        .overrideDecimals(2);

      // eCMC-A RX column
      builder
        .matchFieldsWithName('eCMC-A RX')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'sparkline' as any,
        })
        .overrideColor({
          fixedColor: 'semi-dark-green',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideUnit(tabType === 'percentage' ? 'percent' : 'bps')
        .overrideDecimals(2);

      // eCMC-B TX column
      builder
        .matchFieldsWithName('eCMC-B TX')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'sparkline' as any,
        })
        .overrideColor({
          fixedColor: 'semi-dark-purple',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideUnit(tabType === 'percentage' ? 'percent' : 'bps')
        .overrideDecimals(2);

      // eCMC-B RX column
      builder
        .matchFieldsWithName('eCMC-B RX')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'sparkline' as any,
        })
        .overrideColor({
          fixedColor: 'semi-dark-orange',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideUnit(tabType === 'percentage' ? 'percent' : 'bps')
        .overrideDecimals(2);

      // Set max for percentage columns
      if (tabType === 'percentage') {
        builder.matchFieldsWithName('eCMC-A TX').overrideMax(100);
        builder.matchFieldsWithName('eCMC-A RX').overrideMax(100);
        builder.matchFieldsWithName('eCMC-B TX').overrideMax(100);
        builder.matchFieldsWithName('eCMC-B RX').overrideMax(100);
      }
    })
    .build();

  // Wrap table in clickable wrapper
  const clickableTable = new ClickableTableWrapper({
    tablePanel: tablePanel,
    onRowClick: (chassisName: string) => {
      parent.drillToChassis(chassisName);
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

/**
 * Create table view for multi-chassis downlinks (2+ chassis)
 * Uses NetworkUtilDownlinksPivotProvider to aggregate across eCMC-A and eCMC-B,
 * producing 2 columns (TX, RX) instead of 4 (eCMC-A TX/RX, eCMC-B TX/RX).
 */
function createTableView_Downlinks(portRole: string, tabType: string, parent: NetworkUtilizationDetailsContainer) {
  const aggregation = getAggregationValue(parent);

  // Create unified query for downlinks (filters by host_port)
  const unifiedQuery = createUnifiedDownlinksTableQuery(tabType, aggregation);

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [unifiedQuery],
  });

  // Pivot provider filters by portRole and reshapes into 2 timeseries frame sets (TX, RX)
  const pivotProvider = new NetworkUtilDownlinksPivotProvider({
    $data: queryRunner,
    portRole: portRole,
  });

  // Transform the pivoted timeseries into a table with sparklines
  const transformedData = new LoggingDataTransformer({
    $data: pivotProvider,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'key',
          mode: 'outer',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'key': true,
            'Chassis 2': true,
            'Server 2': true,
          },
          includeByName: {},
          indexByName: {
            'Chassis 1': 0,
            'Server 1': 1,
            'Trend #A': 2,
            'Trend #B': 3,
          },
          renameByName: {
            'Chassis 1': 'Chassis',
            'Server 1': 'Server',
            'Trend #A': 'TX',
            'Trend #B': 'RX',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          mode: 'reduceRow',
          reduce: {
            reducer: 'max',
          },
          replaceFields: false,
          alias: 'MaxUtilization',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'key': true,
            'Chassis 2': true,
            'Server 2': true,
            'MaxUtilization': true,
          },
          includeByName: {},
          indexByName: {
            'Chassis': 0,
            'Server': 1,
            'TX': 2,
            'RX': 3,
            'MaxUtilization': 4,
          },
          renameByName: {},
        },
      },
    ],
  });

  // Create table panel with sparklines
  const tablePanel = PanelBuilders.table()
    .setTitle('Network Utilization (Downlinks) - Click row to drill down')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'lg' as any)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ displayName: 'MaxUtilization', desc: true }])
    .setCustomFieldConfig('filterable', true)
    .setOverrides((builder) => {
      // Chassis column - set width
      builder.matchFieldsWithName('Chassis').overrideCustomFieldConfig('width', 200);

      // Server column - set width
      builder.matchFieldsWithName('Server').overrideCustomFieldConfig('width', 120);

      // TX column - sparkline with appropriate unit and color
      builder
        .matchFieldsWithName('TX')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'sparkline' as any,
        })
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideUnit(tabType === 'percentage' ? 'percent' : 'bps')
        .overrideDecimals(2);

      // RX column - sparkline with appropriate unit and color
      builder
        .matchFieldsWithName('RX')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'sparkline' as any,
        })
        .overrideColor({
          fixedColor: 'semi-dark-green',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideUnit(tabType === 'percentage' ? 'percent' : 'bps')
        .overrideDecimals(2);

      // Set max for percentage columns
      if (tabType === 'percentage') {
        builder.matchFieldsWithName('TX').overrideMax(100);
        builder.matchFieldsWithName('RX').overrideMax(100);
      }
    })
    .build();

  // Wrap table in clickable wrapper
  const clickableTable = new ClickableTableWrapper({
    tablePanel: tablePanel,
    onRowClick: (chassisName: string) => {
      parent.drillToChassis(chassisName);
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

/**
 * Create drilldown view for specific chassis
 * Shows header + 4 timeseries panels with shared cursor sync
 */
function createDrilldownView(chassisName: string, portRole: string, tabType: string, parent: NetworkUtilizationDetailsContainer) {
  const aggregation = getAggregationValue(parent);
  const drilldownHeader = new DrilldownHeaderControl({
    chassisName: chassisName,
    onBack: () => parent.exitDrilldown(),
  });

  const panelA_TX = createPanel_eCMC_A_TX(portRole, tabType, true, chassisName, aggregation);
  const panelA_RX = createPanel_eCMC_A_RX(portRole, tabType, true, chassisName, aggregation);
  const panelB_TX = createPanel_eCMC_B_TX(portRole, tabType, true, chassisName, aggregation);
  const panelB_RX = createPanel_eCMC_B_RX(portRole, tabType, true, chassisName, aggregation);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 50, body: drilldownHeader }),
      // Row 1: eCMC-A panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: panelA_TX }),
            new SceneFlexItem({ ySizing: 'fill', body: panelA_RX }),
          ],
        }),
      }),
      // Row 2: eCMC-B panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: panelB_TX }),
            new SceneFlexItem({ ySizing: 'fill', body: panelB_RX }),
          ],
        }),
      }),
    ],
    $behaviors: [
      new behaviors.CursorSync({ key: 'network-util-drilldown-sync', sync: DashboardCursorSync.Tooltip }),
    ],
  });
}

// ============================================================================
// QUERY CREATION (for table sparklines)
// ============================================================================

/**
 * Create query WITH port dimension (for single chassis/drilldown views)
 */
function createQuery(portRole: string, eCMC: string, direction: string, tabType: string, refId: string, aggregation: string, useTableFormat: boolean = false) {
  const metricSuffix = tabType === 'percentage' ? '_pct' : '';
  const metricName = `${direction}_${aggregation}${metricSuffix}`;

  return {
    refId: refId,
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: useTableFormat ? 'table' : 'timeseries',
    url: '/api/v1/telemetry/TimeSeries',
    root_selector: '',
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      { selector: 'event.port_name', text: 'Port', type: 'string' },
      { selector: `event.${metricName}`, text: 'Utilization', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name", "port_name", "port_role"],
    "virtualColumns": [
      {
        "type": "nested-field",
        "columnName": "intersight.domain.name",
        "outputName": "domain_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "host.name",
        "outputName": "host_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "name",
        "outputName": "port_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "hw.network.port.role",
        "outputName": "port_role",
        "expectedType": "STRING",
        "path": "$"
      }
    ],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " ${eCMC}"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "${portRole}"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "receive_max",
        "fieldName": "hw.network.bandwidth.utilization_receive_max"
      },
      {
        "type": "doubleMax",
        "name": "transmit_max",
        "fieldName": "hw.network.bandwidth.utilization_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "receive_min",
        "fieldName": "hw.network.bandwidth.utilization_receive_min"
      },
      {
        "type": "doubleMin",
        "name": "transmit_min",
        "fieldName": "hw.network.bandwidth.utilization_transmit_min"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "\\"receive_max\\""
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "\\"transmit_max\\""
      }${tabType === 'percentage' ? `,
      {
        "type": "expression",
        "name": "receive_max_pct",
        "expression": "\\"receive_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_max_pct",
        "expression": "\\"transmit_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_min_pct",
        "expression": "\\"receive_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_min_pct",
        "expression": "\\"transmit_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_avg_pct",
        "expression": "\\"receive_avg\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_avg_pct",
        "expression": "\\"transmit_avg\\" * 100"
      }` : ''}
    ]
  }`,
    },
  } as any;
}

// ============================================================================
// INDIVIDUAL PANEL CREATION FUNCTIONS
// ============================================================================

function createPanel_eCMC_A_TX(portRole: string, tabType: string, isDrilldown: boolean, chassisName?: string, aggregation?: string) {
  // If aggregation is not provided, this function won't work correctly
  // It should always be provided when creating panels
  const agg = aggregation || 'avg';
  const metricSuffix = tabType === 'percentage' ? '_pct' : '';
  const metricName = `transmit_${agg}${metricSuffix}`;

  // Build aggregations and postAggregations based on mode
  let aggregationsJson;
  let postAggregationsJson;

  if (tabType === 'percentage') {
    // PERCENTAGE MODE - hw.network.bandwidth.utilization_* fields
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "receive_max",
        "fieldName": "hw.network.bandwidth.utilization_receive_max"
      },
      {
        "type": "doubleMax",
        "name": "transmit_max",
        "fieldName": "hw.network.bandwidth.utilization_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "receive_min",
        "fieldName": "hw.network.bandwidth.utilization_receive_min"
      },
      {
        "type": "doubleMin",
        "name": "transmit_min",
        "fieldName": "hw.network.bandwidth.utilization_transmit_min"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "\\"receive_max\\""
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "\\"transmit_max\\""
      },
      {
        "type": "expression",
        "name": "receive_max_pct",
        "expression": "\\"receive_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_max_pct",
        "expression": "\\"transmit_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_min_pct",
        "expression": "\\"receive_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_min_pct",
        "expression": "\\"transmit_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_avg_pct",
        "expression": "\\"receive_avg\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_avg_pct",
        "expression": "\\"transmit_avg\\" * 100"
      }
    ]`;
  } else {
    // ABSOLUTE MODE - hw.network.io_* fields (transmit only for TX panel)
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "base_transmit_max",
        "fieldName": "hw.network.io_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "base_transmit_min",
        "fieldName": "hw.network.io_transmit_min"
      },
      {
        "type": "doubleSum",
        "name": "transmit_duration",
        "fieldName": "hw.network.io_transmit_duration"
      },
      {
        "type": "longSum",
        "name": "transmit_sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "transmit_max",
        "expression": "(base_transmit_max * 8)"
      },
      {
        "type": "expression",
        "name": "transmit_min",
        "expression": "(base_transmit_min * 8)"
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "(\\"transmit_sum\\" / \\"transmit_duration\\") * 8"
      }
    ]`;
  }

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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      { selector: 'event.port_name', text: 'Port', type: 'string' },
      { selector: `event.${metricName}`, text: 'Utilization', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name", "port_name", "port_role"],
    "virtualColumns": [
      {
        "type": "nested-field",
        "columnName": "intersight.domain.name",
        "outputName": "domain_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "host.name",
        "outputName": "host_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "name",
        "outputName": "port_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "hw.network.port.role",
        "outputName": "port_role",
        "expectedType": "STRING",
        "path": "$"
      }
    ],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "${portRole}"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": ${aggregationsJson},
    "postAggregations": ${postAggregationsJson}
  }`,
    },
  };

  const query = isDrilldown && chassisName
    ? createDrilldownQuery(baseQuery, chassisName)
    : baseQuery;

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [query as any],
  });

  // Build transformations - add port-to-slot mapping for downlinks
  const transformations: any[] = [
    {
      id: 'renameByRegex',
      options: {
        regex: '.*Port="([^"]+)".*',
        renamePattern: '$1',
      },
    },
  ];

  // Add port name translation for downlinks (host_port)
  if (portRole === 'host_port') {
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/5',
        renamePattern: 'Slot 1',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/6',
        renamePattern: 'Slot 4',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/7',
        renamePattern: 'Slot 5',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/8',
        renamePattern: 'Slot 2',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/9',
        renamePattern: 'Slot 3',
      },
    });
  }

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: transformations,
  });

  const title = isDrilldown && chassisName
    ? `eCMC-A TX - ${chassisName}`
    : 'eCMC-A Transmit Utilization';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit(tabType === 'percentage' ? 'percent' : 'bps')
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setMax(tabType === 'percentage' ? 100 : undefined)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

function createPanel_eCMC_A_RX(portRole: string, tabType: string, isDrilldown: boolean, chassisName?: string, aggregation?: string) {
  // If aggregation is not provided, this function won't work correctly
  // It should always be provided when creating panels
  const agg = aggregation || 'avg';
  const metricSuffix = tabType === 'percentage' ? '_pct' : '';
  const metricName = `receive_${agg}${metricSuffix}`;

  // Build aggregations and postAggregations based on mode
  let aggregationsJson;
  let postAggregationsJson;

  if (tabType === 'percentage') {
    // PERCENTAGE MODE - hw.network.bandwidth.utilization_* fields
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "receive_max",
        "fieldName": "hw.network.bandwidth.utilization_receive_max"
      },
      {
        "type": "doubleMax",
        "name": "transmit_max",
        "fieldName": "hw.network.bandwidth.utilization_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "receive_min",
        "fieldName": "hw.network.bandwidth.utilization_receive_min"
      },
      {
        "type": "doubleMin",
        "name": "transmit_min",
        "fieldName": "hw.network.bandwidth.utilization_transmit_min"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "\\"receive_max\\""
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "\\"transmit_max\\""
      },
      {
        "type": "expression",
        "name": "receive_max_pct",
        "expression": "\\"receive_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_max_pct",
        "expression": "\\"transmit_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_min_pct",
        "expression": "\\"receive_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_min_pct",
        "expression": "\\"transmit_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_avg_pct",
        "expression": "\\"receive_avg\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_avg_pct",
        "expression": "\\"transmit_avg\\" * 100"
      }
    ]`;
  } else {
    // ABSOLUTE MODE - hw.network.io_* fields (receive only for RX panel)
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "base_receive_max",
        "fieldName": "hw.network.io_receive_max"
      },
      {
        "type": "doubleMin",
        "name": "base_receive_min",
        "fieldName": "hw.network.io_receive_min"
      },
      {
        "type": "doubleSum",
        "name": "receive_duration",
        "fieldName": "hw.network.io_receive_duration"
      },
      {
        "type": "longSum",
        "name": "receive_sum",
        "fieldName": "hw.network.io_receive"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "receive_max",
        "expression": "(base_receive_max * 8)"
      },
      {
        "type": "expression",
        "name": "receive_min",
        "expression": "(base_receive_min * 8)"
      },
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "(\\"receive_sum\\" / \\"receive_duration\\") * 8"
      }
    ]`;
  }

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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      { selector: 'event.port_name', text: 'Port', type: 'string' },
      { selector: `event.${metricName}`, text: 'Utilization', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name", "port_name", "port_role"],
    "virtualColumns": [
      {
        "type": "nested-field",
        "columnName": "intersight.domain.name",
        "outputName": "domain_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "host.name",
        "outputName": "host_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "name",
        "outputName": "port_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "hw.network.port.role",
        "outputName": "port_role",
        "expectedType": "STRING",
        "path": "$"
      }
    ],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "${portRole}"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": ${aggregationsJson},
    "postAggregations": ${postAggregationsJson}
  }`,
    },
  };

  const query = isDrilldown && chassisName
    ? createDrilldownQuery(baseQuery, chassisName)
    : baseQuery;

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [query as any],
  });

  // Build transformations - add port-to-slot mapping for downlinks
  const transformations: any[] = [
    {
      id: 'renameByRegex',
      options: {
        regex: '.*Port="([^"]+)".*',
        renamePattern: '$1',
      },
    },
  ];

  // Add port name translation for downlinks (host_port)
  if (portRole === 'host_port') {
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/5',
        renamePattern: 'Slot 1',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/6',
        renamePattern: 'Slot 4',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/7',
        renamePattern: 'Slot 5',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/8',
        renamePattern: 'Slot 2',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/9',
        renamePattern: 'Slot 3',
      },
    });
  }

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: transformations,
  });

  const title = isDrilldown && chassisName
    ? `eCMC-A RX - ${chassisName}`
    : 'eCMC-A Receive Utilization';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit(tabType === 'percentage' ? 'percent' : 'bps')
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setMax(tabType === 'percentage' ? 100 : undefined)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

function createPanel_eCMC_B_TX(portRole: string, tabType: string, isDrilldown: boolean, chassisName?: string, aggregation?: string) {
  // If aggregation is not provided, this function won't work correctly
  // It should always be provided when creating panels
  const agg = aggregation || 'avg';
  const metricSuffix = tabType === 'percentage' ? '_pct' : '';
  const metricName = `transmit_${agg}${metricSuffix}`;

  // Build aggregations and postAggregations based on mode
  let aggregationsJson;
  let postAggregationsJson;

  if (tabType === 'percentage') {
    // PERCENTAGE MODE - hw.network.bandwidth.utilization_* fields
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "receive_max",
        "fieldName": "hw.network.bandwidth.utilization_receive_max"
      },
      {
        "type": "doubleMax",
        "name": "transmit_max",
        "fieldName": "hw.network.bandwidth.utilization_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "receive_min",
        "fieldName": "hw.network.bandwidth.utilization_receive_min"
      },
      {
        "type": "doubleMin",
        "name": "transmit_min",
        "fieldName": "hw.network.bandwidth.utilization_transmit_min"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "\\"receive_max\\""
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "\\"transmit_max\\""
      },
      {
        "type": "expression",
        "name": "receive_max_pct",
        "expression": "\\"receive_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_max_pct",
        "expression": "\\"transmit_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_min_pct",
        "expression": "\\"receive_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_min_pct",
        "expression": "\\"transmit_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_avg_pct",
        "expression": "\\"receive_avg\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_avg_pct",
        "expression": "\\"transmit_avg\\" * 100"
      }
    ]`;
  } else {
    // ABSOLUTE MODE - hw.network.io_* fields (transmit only for TX panel)
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "base_transmit_max",
        "fieldName": "hw.network.io_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "base_transmit_min",
        "fieldName": "hw.network.io_transmit_min"
      },
      {
        "type": "doubleSum",
        "name": "transmit_duration",
        "fieldName": "hw.network.io_transmit_duration"
      },
      {
        "type": "longSum",
        "name": "transmit_sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "transmit_max",
        "expression": "(base_transmit_max * 8)"
      },
      {
        "type": "expression",
        "name": "transmit_min",
        "expression": "(base_transmit_min * 8)"
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "(\\"transmit_sum\\" / \\"transmit_duration\\") * 8"
      }
    ]`;
  }

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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      { selector: 'event.port_name', text: 'Port', type: 'string' },
      { selector: `event.${metricName}`, text: 'Utilization', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name", "port_name", "port_role"],
    "virtualColumns": [
      {
        "type": "nested-field",
        "columnName": "intersight.domain.name",
        "outputName": "domain_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "host.name",
        "outputName": "host_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "name",
        "outputName": "port_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "hw.network.port.role",
        "outputName": "port_role",
        "expectedType": "STRING",
        "path": "$"
      }
    ],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "${portRole}"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": ${aggregationsJson},
    "postAggregations": ${postAggregationsJson}
  }`,
    },
  };

  const query = isDrilldown && chassisName
    ? createDrilldownQuery(baseQuery, chassisName)
    : baseQuery;

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [query as any],
  });

  // Build transformations - add port-to-slot mapping for downlinks
  const transformations: any[] = [
    {
      id: 'renameByRegex',
      options: {
        regex: '.*Port="([^"]+)".*',
        renamePattern: '$1',
      },
    },
  ];

  // Add port name translation for downlinks (host_port)
  if (portRole === 'host_port') {
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/5',
        renamePattern: 'Slot 1',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/6',
        renamePattern: 'Slot 4',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/7',
        renamePattern: 'Slot 5',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/8',
        renamePattern: 'Slot 2',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/9',
        renamePattern: 'Slot 3',
      },
    });
  }

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: transformations,
  });

  const title = isDrilldown && chassisName
    ? `eCMC-B TX - ${chassisName}`
    : 'eCMC-B Transmit Utilization';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit(tabType === 'percentage' ? 'percent' : 'bps')
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setMax(tabType === 'percentage' ? 100 : undefined)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

function createPanel_eCMC_B_RX(portRole: string, tabType: string, isDrilldown: boolean, chassisName?: string, aggregation?: string) {
  // If aggregation is not provided, this function won't work correctly
  // It should always be provided when creating panels
  const agg = aggregation || 'avg';
  const metricSuffix = tabType === 'percentage' ? '_pct' : '';
  const metricName = `receive_${agg}${metricSuffix}`;

  // Build aggregations and postAggregations based on mode
  let aggregationsJson;
  let postAggregationsJson;

  if (tabType === 'percentage') {
    // PERCENTAGE MODE - hw.network.bandwidth.utilization_* fields
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "receive_max",
        "fieldName": "hw.network.bandwidth.utilization_receive_max"
      },
      {
        "type": "doubleMax",
        "name": "transmit_max",
        "fieldName": "hw.network.bandwidth.utilization_transmit_max"
      },
      {
        "type": "doubleMin",
        "name": "receive_min",
        "fieldName": "hw.network.bandwidth.utilization_receive_min"
      },
      {
        "type": "doubleMin",
        "name": "transmit_min",
        "fieldName": "hw.network.bandwidth.utilization_transmit_min"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "\\"receive_max\\""
      },
      {
        "type": "expression",
        "name": "transmit_avg",
        "expression": "\\"transmit_max\\""
      },
      {
        "type": "expression",
        "name": "receive_max_pct",
        "expression": "\\"receive_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_max_pct",
        "expression": "\\"transmit_max\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_min_pct",
        "expression": "\\"receive_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_min_pct",
        "expression": "\\"transmit_min\\" * 100"
      },
      {
        "type": "expression",
        "name": "receive_avg_pct",
        "expression": "\\"receive_avg\\" * 100"
      },
      {
        "type": "expression",
        "name": "transmit_avg_pct",
        "expression": "\\"transmit_avg\\" * 100"
      }
    ]`;
  } else {
    // ABSOLUTE MODE - hw.network.io_* fields (receive only for RX panel)
    aggregationsJson = `[
      {
        "type": "doubleMax",
        "name": "base_receive_max",
        "fieldName": "hw.network.io_receive_max"
      },
      {
        "type": "doubleMin",
        "name": "base_receive_min",
        "fieldName": "hw.network.io_receive_min"
      },
      {
        "type": "doubleSum",
        "name": "receive_duration",
        "fieldName": "hw.network.io_receive_duration"
      },
      {
        "type": "longSum",
        "name": "receive_sum",
        "fieldName": "hw.network.io_receive"
      }
    ]`;

    postAggregationsJson = `[
      {
        "type": "expression",
        "name": "receive_max",
        "expression": "(base_receive_max * 8)"
      },
      {
        "type": "expression",
        "name": "receive_min",
        "expression": "(base_receive_min * 8)"
      },
      {
        "type": "expression",
        "name": "receive_avg",
        "expression": "(\\"receive_sum\\" / \\"receive_duration\\") * 8"
      }
    ]`;
  }

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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      { selector: 'event.port_name', text: 'Port', type: 'string' },
      { selector: `event.${metricName}`, text: 'Utilization', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name", "port_name", "port_role"],
    "virtualColumns": [
      {
        "type": "nested-field",
        "columnName": "intersight.domain.name",
        "outputName": "domain_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "host.name",
        "outputName": "host_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "name",
        "outputName": "port_name",
        "expectedType": "STRING",
        "path": "$"
      },
      {
        "type": "nested-field",
        "columnName": "hw.network.port.role",
        "outputName": "port_role",
        "expectedType": "STRING",
        "path": "$"
      }
    ],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "${portRole}"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": ${aggregationsJson},
    "postAggregations": ${postAggregationsJson}
  }`,
    },
  };

  const query = isDrilldown && chassisName
    ? createDrilldownQuery(baseQuery, chassisName)
    : baseQuery;

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [query as any],
  });

  // Build transformations - add port-to-slot mapping for downlinks
  const transformations: any[] = [
    {
      id: 'renameByRegex',
      options: {
        regex: '.*Port="([^"]+)".*',
        renamePattern: '$1',
      },
    },
  ];

  // Add port name translation for downlinks (host_port)
  if (portRole === 'host_port') {
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/5',
        renamePattern: 'Slot 1',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/6',
        renamePattern: 'Slot 4',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/7',
        renamePattern: 'Slot 5',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/8',
        renamePattern: 'Slot 2',
      },
    });
    transformations.push({
      id: 'renameByRegex',
      options: {
        regex: 'Ethernet1/1/9',
        renamePattern: 'Slot 3',
      },
    });
  }

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: transformations,
  });

  const title = isDrilldown && chassisName
    ? `eCMC-B RX - ${chassisName}`
    : 'eCMC-B Receive Utilization';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit(tabType === 'percentage' ? 'percent' : 'bps')
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setMax(tabType === 'percentage' ? 100 : undefined)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

// ============================================================================
// ROW AND TAB CREATION FUNCTIONS
// ============================================================================

function createUplinksRow(tabType: string) {
  // Create factory functions for containers
  const createPortsContainer = () => new NetworkUtilizationDetailsContainer({
    portRole: 'eth_uplink',
    tabType: tabType,
    body: new SceneFlexLayout({ children: [] }),
  });

  const createPortChannelsContainer = () => new NetworkUtilizationDetailsContainer({
    portRole: 'eth_uplink_pc',
    tabType: tabType,
    body: new SceneFlexLayout({ children: [] }),
  });

  const uplinksNestedTabs = new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: createPortsContainer },
      { id: 'port-channels', label: 'Port Channels', getBody: createPortChannelsContainer },
    ],
    activeTab: 'ports',
    body: createPortsContainer(),
  });

  return new SceneGridRow({
    title: 'eCMC Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        body: uplinksNestedTabs,
      }),
    ],
  });
}

function createDownlinksRow(tabType: string, yPosition: number) {
  const createDownlinksContainer = () => new NetworkUtilizationDetailsContainer({
    portRole: 'host_port',
    tabType: tabType,
    body: new SceneFlexLayout({ children: [] }),
  });

  return new SceneGridRow({
    title: 'eCMC Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: yPosition,
    children: [
      new SceneGridItem({
        x: 0,
        y: yPosition,
        width: 24,
        height: 16,
        body: createDownlinksContainer(),
      }),
    ],
  });
}

function createPlaceholderPanel(description: string) {
  return PanelBuilders.text()
    .setTitle('TODO')
    .setOption('content', `### TODO\n\n${description}`)
    .setOption('mode', 'markdown' as any)
    .setDisplayMode('transparent')
    .build();
}

function getPercentageTab() {
  const uplinksRow = createUplinksRow('percentage');
  const downlinksRow = createDownlinksRow('percentage', 16);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 500,
        body: new SceneGridLayout({
          children: [uplinksRow, downlinksRow],
        }),
      }),
    ],
  });
}

function getAbsoluteTab() {
  const uplinksRow = createUplinksRow('absolute');
  const downlinksRow = createDownlinksRow('absolute', 16);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 500,
        body: new SceneGridLayout({
          children: [uplinksRow, downlinksRow],
        }),
      }),
    ],
  });
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function getNetworkUtilizationTab() {
  // Create Aggregation variable
  const aggregationVariable = new CustomVariable({
    name: 'Aggregation',
    label: 'Aggregation',
    value: 'Average',
    query: 'Minimum,Average,Maximum',
  });

  const variables = new SceneVariableSet({
    variables: [aggregationVariable],
  });

  // Create shared drilldown state
  const sharedDrilldownState = new SharedDrilldownState({
    mode: 'overview',
    chassisName: undefined,
    lastChassisValue: undefined,
  });

  const networkUtilizationTabs = new TabbedScene({
    $variables: variables,
    controls: [new VariableValueSelectors({})],
    tabs: [
      { id: 'percentage', label: 'Percentage (%)', getBody: () => getPercentageTab() },
      { id: 'absolute', label: 'Absolute (bps)', getBody: () => getAbsoluteTab() },
    ],
    activeTab: 'percentage',
    body: getPercentageTab(),
  });

  // Wrap in a parent layout that includes the shared state in the scene graph via behaviors
  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [sharedDrilldownState],
    children: [
      new SceneFlexItem({
        body: networkUtilizationTabs,
      }),
    ],
  });
}
