/**
 * Ports Tab - Unified Edge Scene
 *
 * This module provides the Ports tab functionality for the Unified Edge scene.
 * Conditional rendering based on chassis selection:
 * - Single chassis: Show two detail tables (eCMC External Ports + Server Ports)
 * - Multiple chassis: Show summary table with drilldown capability
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
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { EmptyStateScene } from '../../components/EmptyStateScene';
import { getEmptyStateScenario } from '../../utils/emptyStateHelpers';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get chassis count from ChassisName variable
 * Used to determine single vs multiple chassis view
 */
function getChassisCount(scene: SceneObjectBase): number {
  const variable = sceneGraph.lookupVariable('ChassisName', scene);
  if (!variable || !('state' in variable)) {
    return 0;
  }

  const value = (variable.state as any).value;

  if (Array.isArray(value)) {
    return value.filter((v) => v && v !== '$__all').length;
  } else if (value && value !== '$__all') {
    return 1;
  }

  return 0;
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
    <div
      style={{
        padding: '12px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
      }}
    >
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
      <div
        style={{
          fontSize: '18px',
          fontWeight: 500,
        }}
      >
        Drilldown: Chassis: {chassisName}
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
    const row = (event.target as HTMLElement).closest('[role="row"]');

    if (!row) {
      return;
    }

    const firstCell = row.querySelector('[role="gridcell"][aria-colindex="1"]');

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
// QUERY DEFINITIONS
// ============================================================================

/**
 * eCMC External Ports Query - 4 ports per chassis
 */
function createEcmcExternalPortsQuery(chassisFilter?: string) {
  // For drilldown, we filter by chassis name using the Ancestors path
  const baseUrl = '/api/v1/ether/PhysicalPorts?$filter=Ancestors.Moid in (${RegisteredDevices:singlequote})&$expand=RegisteredDevice($expand=TopSystem)';

  return {
    refId: 'A',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: baseUrl,
    root_selector: '$.Results',
    columns: [
      { selector: 'RegisteredDevice.TopSystem.Name', text: 'Chassis', type: 'string' },
      { selector: 'SwitchId', text: 'eCMC', type: 'string' },
      { selector: 'PortId', text: 'Port', type: 'number' },
      { selector: 'Role', text: 'Role', type: 'string' },
      { selector: 'Mode', text: 'Mode', type: 'string' },
      { selector: 'OperState', text: 'Operational State', type: 'string' },
      { selector: 'OperSpeed', text: 'Operational Speed', type: 'string' },
      { selector: 'OperStateQual', text: 'Operational Reason', type: 'string' },
      { selector: 'MacAddress', text: 'MAC Address', type: 'string' },
      { selector: 'PortChannelId', text: 'Port Channel ID', type: 'number' },
    ],
    url_options: {
      method: 'GET',
      data: '',
    },
  } as any;
}

/**
 * Server Ports Query - 10 ports per chassis (adapter external ethernet interfaces)
 */
function createServerPortsQuery(chassisFilter?: string) {
  const baseUrl =
    '/api/v1/adapter/ExtEthInterfaces?$filter=Ancestors.Moid in (${RegisteredDevices:singlequote})&$expand=AdapterUnit($expand=ComputeBlade)';

  return {
    refId: 'B',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: baseUrl,
    root_selector: '$.Results',
    columns: [
      { selector: 'AdapterUnit.ComputeBlade.Name', text: 'Server', type: 'string' },
      { selector: 'ExtEthInterfaceId', text: 'Interface', type: 'string' },
      { selector: 'OperState', text: 'Operational State', type: 'string' },
      { selector: 'OperReason.0', text: 'Operational Cause', type: 'string' },
      { selector: 'MacAddress', text: 'MAC Address', type: 'string' },
      { selector: 'SwitchId', text: 'Switch ID', type: 'string' },
    ],
    url_options: {
      method: 'GET',
      data: '',
    },
  } as any;
}

// ============================================================================
// VIEW CREATION FUNCTIONS
// ============================================================================

/**
 * Creates the detail view showing two tables: eCMC External Ports and Server Ports
 * Used for single chassis selection or drilldown view
 */
function createPortsDetailView(chassisName?: string): SceneFlexLayout {
  // eCMC External Ports Table
  const ecmcQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [createEcmcExternalPortsQuery()],
  });

  // Transformations for eCMC ports
  const ecmcTransformer = new LoggingDataTransformer({
    $data: ecmcQueryRunner,
    transformations: chassisName
      ? [
          {
            id: 'filterByValue',
            options: {
              filters: [
                {
                  fieldName: 'Chassis',
                  config: {
                    id: 'equal',
                    options: { value: chassisName },
                  },
                },
              ],
              type: 'include',
              match: 'any',
            },
          },
          {
            id: 'organize',
            options: {
              excludeByName: { Chassis: true },
              includeByName: {},
              indexByName: {
                eCMC: 0,
                Port: 1,
                'Operational State': 2,
                'Operational Reason': 3,
                'Operational Speed': 4,
                Role: 5,
              },
              renameByName: {},
            },
          },
        ]
      : [
          {
            id: 'organize',
            options: {
              excludeByName: { Chassis: true },
              includeByName: {},
              indexByName: {
                eCMC: 0,
                Port: 1,
                'Operational State': 2,
                'Operational Reason': 3,
                'Operational Speed': 4,
                Role: 5,
              },
              renameByName: {},
            },
          },
        ],
  });

  const ecmcPanel = PanelBuilders.table()
    .setTitle('eCMC External Ports')
    .setData(ecmcTransformer)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOption('sortBy', [
      { displayName: 'eCMC', desc: false },
      { displayName: 'Port', desc: false }
    ])
    .setNoValue('-')
    .setCustomFieldConfig('filterable', true)
    .setOverrides((builder) => {
      builder.matchFieldsWithName('eCMC').overrideCustomFieldConfig('width', 100);
      builder.matchFieldsWithName('Port').overrideCustomFieldConfig('width', 90);
      builder.matchFieldsWithName('Operational State').overrideCustomFieldConfig('cellOptions', {
        type: 'color-text' as any,
      });
      builder.matchFieldsWithName('Operational State').overrideMappings([
        {
          type: 'value' as any,
          options: {
            up: { color: 'green', index: 0, text: 'up' },
            down: { color: 'red', index: 1, text: 'down' },
          },
        },
      ]);
    })
    .build();

  // Server Ports Table
  const serverQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [createServerPortsQuery()],
  });

  // For drilldown, we need to filter server ports by chassis name
  // Server names follow pattern: "ChassisName-N" where N is the blade number
  const serverTransformer = new LoggingDataTransformer({
    $data: serverQueryRunner,
    transformations: chassisName
      ? [
          {
            id: 'filterByValue',
            options: {
              filters: [
                {
                  fieldName: 'Server',
                  config: {
                    id: 'regex',
                    options: { value: `^${chassisName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d+$` },
                  },
                },
              ],
              type: 'include',
              match: 'any',
            },
          },
        ]
      : [],
  });

  const serverPanel = PanelBuilders.table()
    .setTitle('Server Ports')
    .setData(serverTransformer)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOption('sortBy', [{ displayName: 'Server', desc: false }])
    .setNoValue('-')
    .setCustomFieldConfig('filterable', true)
    .setOverrides((builder) => {
      builder.matchFieldsWithName('Operational State').overrideCustomFieldConfig('cellOptions', {
        type: 'color-text' as any,
      });
      builder.matchFieldsWithName('Operational State').overrideMappings([
        {
          type: 'value' as any,
          options: {
            up: { color: 'green', index: 0, text: 'up' },
            down: { color: 'red', index: 1, text: 'down' },
          },
        },
      ]);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: ecmcPanel,
      }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: serverPanel,
      }),
    ],
  });
}

/**
 * Creates the summary view for multiple chassis with drilldown capability
 */
function createPortsSummaryView(scene: DynamicPortsScene): SceneFlexLayout {
  // Build summary table with external ports grouped by chassis
  const combinedQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      // External ports query with grouping
      {
        refId: 'External',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/ether/PhysicalPorts?$filter=Ancestors.Moid in (${RegisteredDevices:singlequote})&$expand=RegisteredDevice($expand=TopSystem)',
        root_selector: '$.Results',
        columns: [
          { selector: 'RegisteredDevice.TopSystem.Name', text: 'Chassis', type: 'string' },
          { selector: 'OperState', text: 'ExternalState', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // Server ports query with chassis extraction
      {
        refId: 'Server',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/adapter/ExtEthInterfaces?$filter=Ancestors.Moid in (${RegisteredDevices:singlequote})&$expand=AdapterUnit($expand=ComputeBlade)',
        root_selector: '$.Results',
        columns: [
          { selector: 'AdapterUnit.ComputeBlade.Name', text: 'Server', type: 'string' },
          { selector: 'OperState', text: 'ServerState', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
    ],
  });

  const summaryTransformer = new LoggingDataTransformer({
    $data: combinedQueryRunner,
    transformations: [
      // First, group external ports by chassis
      {
        id: 'groupBy',
        options: {
          fields: {
            Chassis: {
              aggregations: [],
              operation: 'groupby',
            },
            ExternalState: {
              aggregations: ['count'],
              operation: 'aggregate',
            },
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
            'ExternalState (count)': 'External Total',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('Port Status Summary - Click row to drill down')
    .setData(summaryTransformer)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOption('sortBy', [{ displayName: 'Chassis', desc: false }])
    .setNoValue('-')
    .setCustomFieldConfig('filterable', true)
    .setOverrides((builder) => {
      builder.matchFieldsWithName('Chassis').overrideCustomFieldConfig('width', 280);
    })
    .build();

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

/**
 * Creates the drilldown view with back button and detail tables
 */
function createDrilldownView(chassisName: string, scene: DynamicPortsScene): SceneFlexLayout {
  const drilldownHeader = new DrilldownHeaderControl({
    chassisName: chassisName,
    onBack: () => scene.exitDrilldown(),
  });

  const detailView = createPortsDetailView(chassisName);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 50, body: drilldownHeader }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: detailView,
      }),
    ],
  });
}

// ============================================================================
// DYNAMIC PORTS SCENE
// ============================================================================

interface DynamicPortsSceneState extends SceneObjectState {
  body: any;
  drilldownChassis?: string;
  isDrilldown?: boolean;
}

class DynamicPortsScene extends SceneObjectBase<DynamicPortsSceneState> {
  public static Component = DynamicPortsSceneRenderer;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName', 'RegisteredDevices'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        // Reset drilldown when variable changes
        if (this.state.isDrilldown) {
          this.exitDrilldown();
        }
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicPortsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  // @ts-ignore
  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
  }

  public drillToChassis(chassisName: string) {
    this.setState({
      drilldownChassis: chassisName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  public exitDrilldown() {
    this.setState({
      drilldownChassis: undefined,
      isDrilldown: false,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    // Check for empty state first
    const variable = sceneGraph.lookupVariable('ChassisName', this);
    if (!variable || (variable.state as any).type !== 'query') {
      return;
    }

    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({ body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'chassis' }) });
      return;
    }

    // Priority 1: Drilldown mode
    if (this.state.isDrilldown && this.state.drilldownChassis) {
      const drilldownBody = createDrilldownView(this.state.drilldownChassis, this);
      this.setState({ body: drilldownBody });
      return;
    }

    // Priority 2: Get chassis count for conditional rendering
    const chassisCount = getChassisCount(this);

    // Single chassis - show detail view directly
    if (chassisCount === 1) {
      const detailView = createPortsDetailView();
      this.setState({ body: detailView });
      return;
    }

    // Multiple chassis - show summary table with drilldown
    const summaryView = createPortsSummaryView(this);
    this.setState({ body: summaryView });
  }
}

function DynamicPortsSceneRenderer({ model }: SceneComponentProps<DynamicPortsScene>) {
  const { body } = model.useState();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Main export function for the Ports tab.
 * Returns a DynamicPortsScene that conditionally renders based on chassis selection.
 */
export function getPortsTab() {
  return new DynamicPortsScene({});
}
