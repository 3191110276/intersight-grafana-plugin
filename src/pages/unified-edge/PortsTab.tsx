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

// ============================================================================
// VIEW CREATION FUNCTIONS
// ============================================================================

/**
 * Creates the detail view showing two tables: eCMC External Ports and Server Ports
 * Used for single chassis selection or drilldown view
 */
function createPortsDetailView(moidFilter?: string, chassisName?: string): SceneFlexLayout {
  // eCMC External Ports Table
  const ecmcQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [createEcmcExternalPortsQuery(moidFilter, chassisName)],
  });

  // LOG 2: eCMC External Ports query output
  ecmcQueryRunner.subscribeToState((state) => {
    if (state.data && state.data.series && state.data.series.length > 0) {
      console.log('=== [PortsTab] eCMC EXTERNAL PORTS QUERY OUTPUT ===');
      state.data.series.forEach((series, idx) => {
        console.log(`Series ${idx} (${series.name || series.refId}):`, {
          refId: series.refId,
          rowCount: series.length,
          fields: series.fields.map(f => f.name),
          sampleData: series.length > 0 ? series.fields.map(f => ({
            name: f.name,
            type: f.type,
            firstValue: f.values[0],
          })) : 'No data',
        });
        // Log first 5 rows as sample
        if (series.length > 0) {
          const rows = [];
          for (let i = 0; i < Math.min(5, series.length); i++) {
            const row: any = {};
            series.fields.forEach(field => {
              row[field.name] = field.values[i];
            });
            rows.push(row);
          }
          console.log(`First ${rows.length} rows:`, rows);
        }
      });
      console.log('====================================================');
    }
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
            up: { color: 'green', index: 0, text: 'up' },
            down: { color: 'red', index: 1, text: 'down' },
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

  // Server Ports Table
  const serverQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [createServerPortsQuery(moidFilter, chassisName)],
  });

  // LOG 3: Server Ports query output
  serverQueryRunner.subscribeToState((state) => {
    if (state.data && state.data.series && state.data.series.length > 0) {
      console.log('=== [PortsTab] SERVER PORTS QUERY OUTPUT ===');
      state.data.series.forEach((series, idx) => {
        console.log(`Series ${idx} (${series.name || series.refId}):`, {
          refId: series.refId,
          rowCount: series.length,
          fields: series.fields.map(f => f.name),
          sampleData: series.length > 0 ? series.fields.map(f => ({
            name: f.name,
            type: f.type,
            firstValue: f.values[0],
          })) : 'No data',
        });
        // Log first 5 rows as sample
        if (series.length > 0) {
          const rows = [];
          for (let i = 0; i < Math.min(5, series.length); i++) {
            const row: any = {};
            series.fields.forEach(field => {
              row[field.name] = field.values[i];
            });
            rows.push(row);
          }
          console.log(`First ${rows.length} rows:`, rows);
        }
      });
      console.log('============================================');
    }
  });

  // For drilldown, we need to filter server ports by chassis name
  const serverTransformer = new LoggingDataTransformer({
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
            up: { color: 'green', index: 0, text: 'up' },
            down: { color: 'red', index: 1, text: 'down' },
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
 * Creates the summary view for multiple chassis with drilldown capability
 * Shows: Chassis | eCMC A-1 | eCMC A-2 | eCMC B-1 | eCMC B-2 | Server 1 | Server 2 | Server 3 | Server 4 | Server 5
 */
function createPortsSummaryView(scene: DynamicPortsScene, moidFilter?: string): SceneFlexLayout {
  // Use manual moidFilter if provided, otherwise fall back to variable reference
  const filterExpression = moidFilter
    ? `Ancestors.Moid in (${moidFilter})`
    : `Ancestors.Moid in (\${RegisteredDevices:singlequote})`;

  console.log('[PortsTab] Creating summary view with filter:', filterExpression);

  // Build summary table with 9 separate queries:
  // - 4 for eCMC ports (A-1, A-2, B-1, B-2)
  // - 5 for Server blades (Server 1-5 with aggregated status)
  const combinedQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      // eCMC Port A-1
      {
        refId: 'ECMC_A1',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/ether/PhysicalPorts?$filter=${filterExpression} and SwitchId eq 'A' and PortId eq 1&$expand=Parent($expand=EquipmentSwitchCard($expand=NetworkElement($expand=EquipmentChassis)))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.EquipmentSwitchCard.NetworkElement.EquipmentChassis.Name', text: 'Chassis', type: 'string' },
          { selector: 'OperState', text: 'eCMC-A 1', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // eCMC Port A-2
      {
        refId: 'ECMC_A2',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/ether/PhysicalPorts?$filter=${filterExpression} and SwitchId eq 'A' and PortId eq 2&$expand=Parent($expand=EquipmentSwitchCard($expand=NetworkElement($expand=EquipmentChassis)))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.EquipmentSwitchCard.NetworkElement.EquipmentChassis.Name', text: 'Chassis', type: 'string' },
          { selector: 'OperState', text: 'eCMC-A 2', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // eCMC Port B-1
      {
        refId: 'ECMC_B1',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/ether/PhysicalPorts?$filter=${filterExpression} and SwitchId eq 'B' and PortId eq 1&$expand=Parent($expand=EquipmentSwitchCard($expand=NetworkElement($expand=EquipmentChassis)))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.EquipmentSwitchCard.NetworkElement.EquipmentChassis.Name', text: 'Chassis', type: 'string' },
          { selector: 'OperState', text: 'eCMC-B 1', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // eCMC Port B-2
      {
        refId: 'ECMC_B2',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/ether/PhysicalPorts?$filter=${filterExpression} and SwitchId eq 'B' and PortId eq 2&$expand=Parent($expand=EquipmentSwitchCard($expand=NetworkElement($expand=EquipmentChassis)))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.EquipmentSwitchCard.NetworkElement.EquipmentChassis.Name', text: 'Chassis', type: 'string' },
          { selector: 'OperState', text: 'eCMC-B 2', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // Server Blade 1 - Fetch all server data, filter by SlotId in transformation
      {
        refId: 'SERVER_1',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/adapter/ExtEthInterfaces?$filter=${filterExpression}&$expand=Parent($expand=ComputeBlade($expand=Ancestors))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.ComputeBlade.Ancestors.0.Name', text: 'Chassis', type: 'string' },
          { selector: 'Parent.ComputeBlade.SlotId', text: 'SlotId', type: 'number' },
          { selector: 'OperState', text: 'Server1State', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // Server Blade 2
      {
        refId: 'SERVER_2',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/adapter/ExtEthInterfaces?$filter=${filterExpression}&$expand=Parent($expand=ComputeBlade($expand=Ancestors))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.ComputeBlade.Ancestors.0.Name', text: 'Chassis', type: 'string' },
          { selector: 'Parent.ComputeBlade.SlotId', text: 'SlotId', type: 'number' },
          { selector: 'OperState', text: 'Server2State', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // Server Blade 3
      {
        refId: 'SERVER_3',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/adapter/ExtEthInterfaces?$filter=${filterExpression}&$expand=Parent($expand=ComputeBlade($expand=Ancestors))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.ComputeBlade.Ancestors.0.Name', text: 'Chassis', type: 'string' },
          { selector: 'Parent.ComputeBlade.SlotId', text: 'SlotId', type: 'number' },
          { selector: 'OperState', text: 'Server3State', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // Server Blade 4
      {
        refId: 'SERVER_4',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/adapter/ExtEthInterfaces?$filter=${filterExpression}&$expand=Parent($expand=ComputeBlade($expand=Ancestors))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.ComputeBlade.Ancestors.0.Name', text: 'Chassis', type: 'string' },
          { selector: 'Parent.ComputeBlade.SlotId', text: 'SlotId', type: 'number' },
          { selector: 'OperState', text: 'Server4State', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
      // Server Blade 5
      {
        refId: 'SERVER_5',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/adapter/ExtEthInterfaces?$filter=${filterExpression}&$expand=Parent($expand=ComputeBlade($expand=Ancestors))`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.ComputeBlade.Ancestors.0.Name', text: 'Chassis', type: 'string' },
          { selector: 'Parent.ComputeBlade.SlotId', text: 'SlotId', type: 'number' },
          { selector: 'OperState', text: 'Server5State', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
      } as any,
    ],
  });

  // LOG: Summary view query outputs
  combinedQueryRunner.subscribeToState((state) => {
    if (state.data && state.data.series && state.data.series.length > 0) {
      console.log('=== [PortsTab] SUMMARY VIEW QUERY OUTPUT (RAW) ===');
      console.log('Total series count:', state.data.series.length);
      state.data.series.forEach((series, idx) => {
        console.log(`\n--- Series ${idx}: ${series.name || series.refId} ---`);
        console.log('RefId:', series.refId);
        console.log('Row count:', series.length);
        console.log('Fields:', series.fields.map(f => f.name));

        // Log ALL rows for debugging
        if (series.length > 0) {
          const rows = [];
          for (let i = 0; i < series.length; i++) {
            const row: any = {};
            series.fields.forEach(field => {
              row[field.name] = field.values[i];
            });
            rows.push(row);
          }
          console.log('All rows:', rows);
        } else {
          console.log('⚠️ EMPTY SERIES - No data returned');
        }
      });
      console.log('\n============================================\n');
    }
  });

  const summaryTransformer = new LoggingDataTransformer({
    $data: combinedQueryRunner,
    logLabel: 'SUMMARY TABLE AFTER TRANSFORMATIONS',
    transformations: [
      // Step 1: Group by Chassis (for eCMC) and by Chassis+SlotId (for SERVERS)
      {
        id: 'groupBy',
        options: {
          fields: {
            Chassis: {
              aggregations: [],
              operation: 'groupby',
            },
            SlotId: {
              aggregations: [],
              operation: 'groupby',
            },
            'eCMC-A 1': {
              aggregations: ['lastNotNull'],
              operation: 'aggregate',
            },
            'eCMC-A 2': {
              aggregations: ['lastNotNull'],
              operation: 'aggregate',
            },
            'eCMC-B 1': {
              aggregations: ['lastNotNull'],
              operation: 'aggregate',
            },
            'eCMC-B 2': {
              aggregations: ['lastNotNull'],
              operation: 'aggregate',
            },
            Server1State: {
              aggregations: ['allValues'],
              operation: 'aggregate',
            },
            Server2State: {
              aggregations: ['allValues'],
              operation: 'aggregate',
            },
            Server3State: {
              aggregations: ['allValues'],
              operation: 'aggregate',
            },
            Server4State: {
              aggregations: ['allValues'],
              operation: 'aggregate',
            },
            Server5State: {
              aggregations: ['allValues'],
              operation: 'aggregate',
            },
          },
        },
      },
      // Step 2: Drop rows from SERVER series that don't match their intended SlotId
      // SERVER_1 should only keep SlotId=1, etc.
      // Unfortunately, we can't do this with standard transformations
      // So we'll have duplicate data across the 5 SERVER series
      // The workaround: use only one SERVER series and partition it
      // But for now, let's just join and see what happens
      {
        id: 'joinByField',
        options: {
          byField: 'Chassis',
          mode: 'outer',
        },
      },
      // Step 3: Organize and rename columns
      {
        id: 'organize',
        options: {
          excludeByName: {
            SlotId: true,
          },
          includeByName: {},
          indexByName: {},
          renameByName: {
            'eCMC A-1 (lastNotNull)': 'eCMC-A 1',
            'eCMC A-2 (lastNotNull)': 'eCMC-A 2',
            'eCMC B-1 (lastNotNull)': 'eCMC-B 1',
            'eCMC B-2 (lastNotNull)': 'eCMC-B 2',
            'Server1State (allValues)': 'Slot 1',
            'Server2State (allValues)': 'Slot 2',
            'Server3State (allValues)': 'Slot 3',
            'Server4State (allValues)': 'Slot 4',
            'Server5State (allValues)': 'Slot 5',
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
                'null': { color: 'light-gray', index: 2, text: 'NA' },
                '': { color: 'light-gray', index: 3, text: 'NA' },
              },
            },
            {
              type: 'special' as any,
              options: {
                match: 'null',
                result: { color: 'light-gray', index: 0, text: 'NA' },
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
                'null': { color: 'light-gray', index: 10, text: 'NA' },
                '': { color: 'light-gray', index: 11, text: 'NA' },
              },
            },
            {
              type: 'special' as any,
              options: {
                match: 'null',
                result: { color: 'light-gray', index: 0, text: 'NA' },
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

    // Extract Moid values from RegisteredDevices variable (same pattern as Standalone)
    const registeredDevicesVar = sceneGraph.lookupVariable('RegisteredDevices', this);
    const chassisNameVar = sceneGraph.lookupVariable('ChassisName', this);

    // LOG 1: RegisteredDevices BEFORE query runs
    console.log('=== [PortsTab] BEFORE QUERY ===');
    console.log('[PortsTab] RegisteredDevices variable:', {
      value: (registeredDevicesVar?.state as any)?.value,
      options: (registeredDevicesVar?.state as any)?.options,
      isMulti: (registeredDevicesVar?.state as any)?.isMulti,
      includeAll: (registeredDevicesVar?.state as any)?.includeAll,
    });

    let moidFilter: string | undefined = undefined;

    if (registeredDevicesVar && 'state' in registeredDevicesVar) {
      let moids: string[] = [];

      // Access the variable's options (all query results)
      const varState = registeredDevicesVar.state as any;
      if (varState.options && Array.isArray(varState.options)) {
        // Extract all option values (these are the Moids from the query)
        moids = varState.options
          .map((opt: any) => opt.value)
          .filter((v: any) => v && v !== '$__all')
          .map((v: any) => String(v));
      }

      // Build filter string: 'moid1','moid2','moid3'
      if (moids.length > 0) {
        moidFilter = moids.map(m => `'${m}'`).join(',');
      }
    }

    console.log('[PortsTab] Extracted Moid filter for queries:', {
      ChassisCount: Array.isArray((chassisNameVar?.state as any)?.value)
        ? (chassisNameVar?.state as any)?.value.length
        : 1,
      MoidCount: moidFilter ? moidFilter.split(',').length : 0,
      MoidFilter: moidFilter,
    });
    console.log('=================================');

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
