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
  SceneQueryRunner,
  SceneDataTransformer,
  SceneDataProvider,
  SceneDataState,
} from '@grafana/scenes';
import { DataFrame, FieldType, LoadingState, MutableDataFrame, PanelData } from '@grafana/data';
import { Observable } from 'rxjs';
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

    // Try both role="cell" and role="gridcell" for compatibility
    const firstCell = row.querySelector('[role="cell"]:first-child') || row.querySelector('[role="gridcell"][aria-colindex="1"]');

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
// CUSTOM PORTS DATA PROVIDER - Transforms nested NetworkElements into flat table
// ============================================================================

interface PortsDataProviderState extends SceneDataState {
  $data?: SceneDataProvider;
}

/**
 * Custom data provider that wraps the SceneQueryRunner and transforms
 * the nested NetworkElements JSON into a flat table structure.
 *
 * Input: ChassisName, NetworkElements (nested JSON)
 * Output: Chassis, eCMC-A 1, eCMC-A 2, eCMC-B 1, eCMC-B 2, Slot 1-5
 */
// @ts-ignore
class PortsDataProvider extends SceneObjectBase<PortsDataProviderState> implements SceneDataProvider {
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
        const transformedData = this.transformData(newState.data);
        this.setState({ data: transformedData });
      }
    });
  }

  /**
   * Transform nested NetworkElements data into flat port status table
   */
  private transformData(data: PanelData): PanelData {
    // Don't transform if data is still loading or there's no data series
    if (!data.series || data.series.length === 0 || data.state !== LoadingState.Done) {
      return data;
    }

    const series = data.series[0];
    const chassisNameField = series.fields.find(f => f.name === 'ChassisName');
    const networkElementsField = series.fields.find(f => f.name === 'NetworkElements');

    if (!chassisNameField || !networkElementsField) {
      return data;
    }

    // Process each chassis row
    const flattenedRows: Record<string, string>[] = [];

    for (let i = 0; i < series.length; i++) {
      const chassisName = chassisNameField.values[i];
      const networkElementsRaw = networkElementsField.values[i];

      // Parse NetworkElements JSON if it's a string
      let networkElements: any[];
      try {
        networkElements = typeof networkElementsRaw === 'string'
          ? JSON.parse(networkElementsRaw)
          : networkElementsRaw;

        if (Array.isArray(networkElements)) {
          const row = flattenChassisPortData(chassisName, networkElements);
          flattenedRows.push(row);
        }
      } catch (e) {
        // Create empty row for this chassis
        const emptyRow: Record<string, string> = { Chassis: chassisName };
        ['eCMC-A 1', 'eCMC-A 2', 'eCMC-B 1', 'eCMC-B 2'].forEach(col => emptyRow[col] = '');
        ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5'].forEach(col => emptyRow[col] = '');
        flattenedRows.push(emptyRow);
      }
    }

    // Create new DataFrame with flattened data
    if (flattenedRows.length === 0) {
      return data;
    }

    const newFrame = new MutableDataFrame({
      fields: [
        { name: 'Chassis', type: FieldType.string, values: flattenedRows.map(r => r.Chassis) },
        { name: 'eCMC-A 1', type: FieldType.string, values: flattenedRows.map(r => r['eCMC-A 1']) },
        { name: 'eCMC-A 2', type: FieldType.string, values: flattenedRows.map(r => r['eCMC-A 2']) },
        { name: 'eCMC-B 1', type: FieldType.string, values: flattenedRows.map(r => r['eCMC-B 1']) },
        { name: 'eCMC-B 2', type: FieldType.string, values: flattenedRows.map(r => r['eCMC-B 2']) },
        { name: 'Slot 1', type: FieldType.string, values: flattenedRows.map(r => r['Slot 1']) },
        { name: 'Slot 2', type: FieldType.string, values: flattenedRows.map(r => r['Slot 2']) },
        { name: 'Slot 3', type: FieldType.string, values: flattenedRows.map(r => r['Slot 3']) },
        { name: 'Slot 4', type: FieldType.string, values: flattenedRows.map(r => r['Slot 4']) },
        { name: 'Slot 5', type: FieldType.string, values: flattenedRows.map(r => r['Slot 5']) },
      ],
    });

    return {
      ...data,
      series: [newFrame],
    };
  }

  public getResultsStream(): Observable<any> {
    const source = this.state.$data!;
    return source.getResultsStream();
  }
}

// ============================================================================
// QUERY DEFINITIONS
// ============================================================================

/**
 * eCMC External Ports Query - 4 ports per chassis
 */
function createEcmcExternalPortsQuery(moidFilter?: string, chassisFilter?: string) {
  // Use manual moidFilter if provided, otherwise fall back to variable reference
  const filterExpression = moidFilter
    ? `Ancestors.Moid in (${moidFilter})`
    : `Ancestors.Moid in (\${RegisteredDevices:singlequote})`;

  const baseUrl = `/api/v1/ether/PhysicalPorts?$filter=${filterExpression}&$expand=Parent($expand=EquipmentSwitchCard($expand=NetworkElement($expand=EquipmentChassis)))`;

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
      { selector: 'Parent.EquipmentSwitchCard.NetworkElement.EquipmentChassis.Name', text: 'Chassis', type: 'string' },
      { selector: 'SwitchId', text: 'eCMC', type: 'string' },
      { selector: 'PortId', text: 'Port', type: 'number' },
      { selector: 'Mode', text: 'Mode', type: 'string' },
      { selector: 'OperState', text: 'Operational State', type: 'string' },
      { selector: 'OperSpeed', text: 'Operational Speed', type: 'string' },
      { selector: 'OperStateQual', text: 'Operational Reason', type: 'string' },
      { selector: 'PortChannelId', text: 'Port Channel ID', type: 'number' },
      { selector: 'MacAddress', text: 'MAC Address', type: 'string' },
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
function createServerPortsQuery(moidFilter?: string, chassisFilter?: string) {
  // Use manual moidFilter if provided, otherwise fall back to variable reference
  const filterExpression = moidFilter
    ? `Ancestors.Moid in (${moidFilter})`
    : `Ancestors.Moid in (\${RegisteredDevices:singlequote})`;

  const baseUrl = `/api/v1/adapter/ExtEthInterfaces?$filter=${filterExpression}&$expand=Parent($expand=ComputeBlade($expand=Ancestors))`;

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
      { selector: 'Parent.ComputeBlade.Name', text: 'Server', type: 'string' },
      { selector: 'Parent.ComputeBlade.Ancestors.0.Name', text: 'Chassis', type: 'string' },
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

/**
 * Multi-Chassis Ports Query - Fetches all port data in a single request
 * Uses $expand to traverse: Chassis → NetworkElements → Cards → HostPorts/PortGroups → EthernetPorts
 */
function createMultiChassisPortsQuery() {
  // Use $expand without $select at NetworkElements level
  const baseUrl = `/api/v1/equipment/Chasses?$filter=Name in (\${ChassisName:singlequote})&$expand=NetworkElements($expand=Cards($expand=HostPorts($select=PortName,OperState,SwitchId,AdminState),PortGroups($expand=EthernetPorts($select=SwitchId,PortId,OperState))))`;

  return {
    refId: 'MultiChassis',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: baseUrl,
    root_selector: '$.Results',
    columns: [
      { selector: 'Name', text: 'ChassisName', type: 'string' },
      { selector: 'NetworkElements', text: 'NetworkElements', type: 'string' },
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
function createPortsDetailView(moidFilter?: string, chassisName?: string): SceneFlexLayout {
  // eCMC External Ports Table
  const ecmcQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [createEcmcExternalPortsQuery(moidFilter, chassisName)],
  });

  const ecmcTransformer = new SceneDataTransformer({
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
                'Port Channel ID': 5,
                Mode: 6,
                'MAC Address': 7,
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
                'Port Channel ID': 5,
                Mode: 6,
                'MAC Address': 7,
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
            up: { color: 'green', index: 0, text: 'Up' },
            down: { color: 'red', index: 1, text: 'Down' },
          },
        },
      ]);
      builder.matchFieldsWithName('Port Channel ID').overrideMappings([
        {
          type: 'value' as any,
          options: {
            '0': { text: '-', index: 0 },
          },
        },
      ]);
    })
    .build();

  const serverQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [createServerPortsQuery(moidFilter, chassisName)],
  });

  const serverTransformer = new SceneDataTransformer({
    $data: serverQueryRunner,
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
              excludeByName: { 'Switch ID': true, Chassis: true },
              includeByName: {},
              indexByName: {
                Server: 0,
                Interface: 1,
                'Operational State': 2,
                'Operational Cause': 3,
                'MAC Address': 4,
              },
              renameByName: {},
            },
          },
        ]
      : [
          {
            id: 'organize',
            options: {
              excludeByName: { 'Switch ID': true, Chassis: true },
              includeByName: {},
              indexByName: {
                Server: 0,
                Interface: 1,
                'Operational State': 2,
                'Operational Cause': 3,
                'MAC Address': 4,
              },
              renameByName: {},
            },
          },
        ],
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
            up: { color: 'green', index: 0, text: 'Up' },
            down: { color: 'red', index: 1, text: 'Down' },
          },
        },
      ]);
      builder.matchFieldsWithName('Interface').overrideMappings([
        {
          type: 'value' as any,
          options: {
            '1': { text: '1 (A)', index: 0 },
            '2': { text: '2 (B)', index: 1 },
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
 * Flatten chassis port data from nested NetworkElements structure into a single row
 * Extracts:
 * - EthernetPorts → eCMC-A 1, eCMC-A 2, eCMC-B 1, eCMC-B 2 columns
 * - HostPorts → Slot 1-5 columns (aggregated from both eCMC A and B)
 *
 * Data paths:
 * - EthernetPorts: NetworkElements[n].Cards[0].PortGroups[0].EthernetPorts
 * - HostPorts: NetworkElements[n].Cards[0].HostPorts
 */
function flattenChassisPortData(chassisName: string, networkElements: any[]): Record<string, string> {
  const row: Record<string, string> = { Chassis: chassisName };

  // Initialize all columns with empty values
  ['eCMC-A 1', 'eCMC-A 2', 'eCMC-B 1', 'eCMC-B 2'].forEach(col => row[col] = '');
  ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5'].forEach(col => row[col] = '');

  // Track slot states from both eCMC A and B for aggregation
  const slotStates: Record<string, { A?: string; B?: string }> = {};

  networkElements.forEach((ne) => {
    const card = ne.Cards?.[0];
    if (!card) {
      return;
    }

    // Extract EthernetPorts (uplink ports) from Cards[0].PortGroups[0].EthernetPorts
    const ethernetPorts = card.PortGroups?.[0]?.EthernetPorts;
    ethernetPorts?.forEach((ep: any) => {
      const colName = `eCMC-${ep.SwitchId} ${ep.PortId}`;
      row[colName] = ep.OperState;
    });

    // Extract HostPorts (server-facing ports) from Cards[0].HostPorts
    const hostPorts = card.HostPorts;
    // Port name to slot mapping: twe5→1, twe6→4, twe7→5, twe8→2, twe9→3
    const portToSlotMap: Record<string, number> = {
      'twe5': 1,
      'twe6': 4,
      'twe7': 5,
      'twe8': 2,
      'twe9': 3,
    };
    hostPorts?.forEach((hp: any) => {
      const slotNum = portToSlotMap[hp.PortName];
      if (slotNum) {
        // If AdminState is Disabled, treat as NA instead of using OperState
        const state = hp.AdminState === 'Disabled' ? 'NA' : hp.OperState;
        const slotKey = `Slot ${slotNum}`;
        if (!slotStates[slotKey]) {
          slotStates[slotKey] = {};
        }
        const switchId: string = hp.SwitchId;
        if (switchId === 'A') {
          slotStates[slotKey].A = state;
        } else if (switchId === 'B') {
          slotStates[slotKey].B = state;
        }
      }
    });
  });

  // Aggregate slot states as "A-state,B-state" (e.g., "up,up", "down,up")
  Object.entries(slotStates).forEach(([slot, states]) => {
    const parts = [];
    if (states.A) parts.push(states.A);
    if (states.B) parts.push(states.B);
    row[slot] = parts.join(',');
  });

  return row;
}

/**
 * Creates the summary view for multiple chassis with drilldown capability
 * Shows: Chassis | eCMC A-1 | eCMC A-2 | eCMC B-1 | eCMC B-2 | Server 1 | Server 2 | Server 3 | Server 4 | Server 5
 */
function createPortsSummaryView(scene: DynamicPortsScene, moidFilter?: string): SceneFlexLayout {
  // Query for multi-chassis ports data
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [createMultiChassisPortsQuery()],
  });

  // Wrap with custom data provider that transforms nested NetworkElements into flat structure
  const portsDataProvider = new PortsDataProvider(queryRunner);

  const tablePanel = PanelBuilders.table()
    .setTitle('Port Status Summary - Click row to drill down')
    .setData(portsDataProvider)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOption('sortBy', [{ displayName: 'Chassis', desc: false }])
    .setNoValue('NA')
    .setCustomFieldConfig('filterable', true)
    .setOverrides((builder) => {
      // Chassis column
      builder.matchFieldsWithName('Chassis').overrideCustomFieldConfig('width', 200);

      // eCMC port columns - color coding for up/down with capitalization
      ['eCMC-A 1', 'eCMC-A 2', 'eCMC-B 1', 'eCMC-B 2'].forEach(portName => {
        builder.matchFieldsWithName(portName)
          .overrideCustomFieldConfig('width', 110)
          .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any })
          .overrideMappings([
            {
              type: 'value' as any,
              options: {
                'up': { color: 'green', index: 0, text: 'Up' },
                'down': { color: 'red', index: 1, text: 'Down' },
                'null': { color: '#525252', index: 2, text: 'NA' },
                '': { color: '#525252', index: 3, text: 'NA' },
              },
            },
            {
              type: 'special' as any,
              options: {
                match: 'null' as any,
                result: { color: '#525252', index: 0, text: 'NA' },
              },
            },
          ]);
      });

      // Slot columns - map allValues output to status
      // allValues gives us comma-separated strings like "up,up" or "down,up"
      ['Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5'].forEach(slotName => {
        builder.matchFieldsWithName(slotName)
          .overrideCustomFieldConfig('width', 100)
          .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any })
          .overrideMappings([
            {
              type: 'value' as any,
              options: {
                'up,up': { color: 'green', index: 0, text: 'Up' },
                'up, up': { color: 'green', index: 1, text: 'Up' },
                'down,down': { color: 'red', index: 2, text: 'Down' },
                'down, down': { color: 'red', index: 3, text: 'Down' },
                'up,down': { color: 'yellow', index: 4, text: 'Partial' },
                'down,up': { color: 'yellow', index: 5, text: 'Partial' },
                'up, down': { color: 'yellow', index: 6, text: 'Partial' },
                'down, up': { color: 'yellow', index: 7, text: 'Partial' },
                'up': { color: 'yellow', index: 8, text: 'Partial' },
                'down': { color: 'red', index: 9, text: 'Down' },
                'NA,NA': { color: '#525252', index: 10, text: 'NA' },
                'NA': { color: '#525252', index: 11, text: 'NA' },
                'up,NA': { color: 'yellow', index: 12, text: 'Partial' },
                'NA,up': { color: 'yellow', index: 13, text: 'Partial' },
                'down,NA': { color: 'red', index: 14, text: 'Down' },
                'NA,down': { color: 'red', index: 15, text: 'Down' },
                'null': { color: '#525252', index: 16, text: 'NA' },
                '': { color: '#525252', index: 17, text: 'NA' },
              },
            },
            {
              type: 'special' as any,
              options: {
                match: 'null' as any,
                result: { color: '#525252', index: 0, text: 'NA' },
              },
            },
            {
              type: 'regex' as any,
              options: {
                pattern: '.*',
                result: { color: 'red', index: 99, text: '$&' },
              },
            },
          ]);
      });
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
  // For drilldown, find the Moid for this specific chassis
  let chassisMoidFilter: string | undefined = undefined;
  const registeredDevicesVar = sceneGraph.lookupVariable('RegisteredDevices', scene);

  if (registeredDevicesVar && 'state' in registeredDevicesVar) {
    const varState = registeredDevicesVar.state as any;
    if (varState.options && Array.isArray(varState.options)) {
      // Find the option matching this chassis name
      // Note: The options contain Moids, but we need to match by chassis name
      // Since we can't directly match, we'll use all Moids and filter by chassis name in the query
      // This is handled by the chassisName parameter in createPortsDetailView
      const allMoids = varState.options
        .map((opt: any) => opt.value)
        .filter((v: any) => v && v !== '$__all')
        .map((v: any) => String(v));

      if (allMoids.length > 0) {
        chassisMoidFilter = allMoids.map((m: string) => `'${m}'`).join(',');
      }
    }
  }

  const drilldownHeader = new DrilldownHeaderControl({
    chassisName: chassisName,
    onBack: () => scene.exitDrilldown(),
  });

  const detailView = createPortsDetailView(chassisMoidFilter, chassisName);

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

    const registeredDevicesVar = sceneGraph.lookupVariable('RegisteredDevices', this);
    const chassisNameVar = sceneGraph.lookupVariable('ChassisName', this);

    let moidFilter: string | undefined = undefined;

    if (registeredDevicesVar && 'state' in registeredDevicesVar) {
      let moids: string[] = [];

      const varState = registeredDevicesVar.state as any;
      if (varState.options && Array.isArray(varState.options)) {
        moids = varState.options
          .map((opt: any) => opt.value)
          .filter((v: any) => v && v !== '$__all')
          .map((v: any) => String(v));
      }

      if (moids.length > 0) {
        moidFilter = moids.map(m => `'${m}'`).join(',');
      }
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
      const detailView = createPortsDetailView(moidFilter);
      this.setState({ body: detailView });
      return;
    }

    // Multiple chassis - show summary table with drilldown
    const summaryView = createPortsSummaryView(this, moidFilter);
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
