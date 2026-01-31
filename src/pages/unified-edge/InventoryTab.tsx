/**
 * Inventory Tab - Unified Edge Scene
 *
 * This module provides the Inventory tab functionality for the Unified Edge scene.
 * Shows chassis and host inventory tables with detailed equipment information.
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
import { PaginatedDataProvider } from '../../utils/PaginatedDataProvider';
import { EmptyStateScene } from '../../components/EmptyStateScene';
import { getEmptyStateScenario, getSelectedValues } from '../../utils/emptyStateHelpers';
import { API_ENDPOINTS, COLUMN_WIDTHS } from './constants';

// ============================================================================
// DYNAMIC INVENTORY SCENE - Shows chassis and host inventory tables
// ============================================================================

interface DynamicInventorySceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicInventoryScene - Custom scene that reads the ChassisName variable
 * and shows chassis and host inventory in tables.
 */
class DynamicInventoryScene extends SceneObjectBase<DynamicInventorySceneState> {
  public static Component = DynamicInventorySceneRenderer;

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

  public constructor(state: Partial<DynamicInventorySceneState>) {
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

    // Get selected chassis names
    const chassisNames = getSelectedValues(variable);

    // Create the inventory tables with chassis names for dynamic filtering
    const newBody = createInventoryBody(chassisNames, chassisNames.length > 1);

    this.setState({ body: newBody });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    // @ts-ignore
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Renderer component for DynamicInventoryScene
 */
function DynamicInventorySceneRenderer({ model }: SceneComponentProps<DynamicInventoryScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

/**
 * Creates the inventory tables layout with chassis and host tables
 */
function createInventoryBody(chassisNames: string[], showChassisColumn: boolean): SceneFlexLayout {
  // Build dynamic OR-joined filter for host query (since hosts use startswith pattern matching)
  const hostFilters = chassisNames.map(name => {
    const escapedName = name.replace(/'/g, "''"); // OData escaping: single quote -> double single quote
    return `startswith(Name, '${escapedName}')`;
  }).join(' or ');
  // Result: "startswith(Name, 'chassis1') or startswith(Name, 'chassis2')"

  // ========================================================================
  // CHASSIS INVENTORY TABLE
  // ========================================================================

  const chassisQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `${API_ENDPOINTS.EQUIPMENT_CHASSES}?$filter=Name in (\${ChassisName:singlequote})&$top=1000&$expand=ExpanderModules,FanControl($select=Mode),LocatorLed($select=OperState),PowerControlState,PsuControl`, // '/api/v1/equipment/Chasses'
        root_selector: '$.Results',
        columns: [
          { selector: 'ChassisId', text: 'ChassisId', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'ConnectionStatus', text: 'ConnectionStatus', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'FanControl.Mode', text: 'FanControlMode', type: 'string' },
          { selector: 'LocatorLed.OperState', text: 'LocatorLed', type: 'string' },
          { selector: 'PowerControlState.AllocatedPower', text: 'AllocatedPower', type: 'number' },
          { selector: 'PsuControl.OperState', text: 'PsuOperState', type: 'string' },
          { selector: 'PsuControl.Redundancy', text: 'Redundancy', type: 'string' },
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  // Wrap with pagination support for >1000 results
  const chassisPaginatedData = new PaginatedDataProvider({
    $data: chassisQueryRunner,
  });

  const chassisTransformedData = new LoggingDataTransformer({
    $data: chassisPaginatedData,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            AllocatedPower: true,
            ConnectionPath: true,
            ExtendedPowerCapacity: true,
            FanControlMode: true,
            Health: true,
            Info: true,
            InputPowerState: true,
            OperReason: true,
            OutputPowerState: true,
            PowerRebalancing: true,
            PowerSaveMode: true,
          },
          indexByName: {
            ChassisId: 0,
            Name: 1,
            Serial: 2,
            Model: 3,
            OperState: 4,
            Critical: 5,
            Warning: 6,
            ConnectionStatus: 7,
            LocatorLed: 8,
            PsuOperState: 9,
            Redundancy: 10,
            Moid: 11,
          },
          renameByName: {
            ChassisId: 'ID',
            OperState: 'State',
            ConnectionStatus: 'Connection',
            LocatorLed: 'Locator LED',
            PsuOperState: 'PSU State',
          },
        },
      },
    ],
  });

  const chassisPanel = PanelBuilders.table()
    .setTitle('Chassis Inventory')
    .setData(chassisTransformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ displayName: 'ID', desc: false }])
    .setOverrides((builder) => {
      // Name column - fixed width to prevent horizontal scrollbar issue
      builder.matchFieldsWithName('Name')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XLARGE); // 200

      // ID column
      builder.matchFieldsWithName('ID')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.TINY) // 20
        .overrideCustomFieldConfig('align', 'center');

      // Serial column
      builder.matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.MEDIUM_3) // 115
        .overrideCustomFieldConfig('align', 'left');

      // Model column
      builder.matchFieldsWithName('Model')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.MEDIUM_3) // 115
        .overrideCustomFieldConfig('align', 'left');

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XXSMALL_1) // 55
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideMappings([
          { type: 'value' as any, options: { 'OK': { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex' as any, options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Error' } } },
        ]);

      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XSMALL_1) // 75
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XSMALL_1) // 75
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // Connection column
      builder.matchFieldsWithName('Connection')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.SMALL_2) // 95
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideMappings([
          { type: 'value' as any, options: { 'A,B': { color: 'transparent', index: 0, text: 'A + B' } } },
          { type: 'regex' as any, options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Locator LED column
      builder.matchFieldsWithName('Locator LED')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.SMALL_4) // 100
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideMappings([
          { type: 'value' as any, options: { 'off': { color: 'transparent', index: 0, text: 'Off' }, 'on': { color: 'blue', index: 1, text: 'On' } } },
        ]);

      // PSU State column
      builder.matchFieldsWithName('PSU State')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.SMALL_1) // 90
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideMappings([
          { type: 'value' as any, options: { 'OK': { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex' as any, options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Redundancy column
      builder.matchFieldsWithName('Redundancy')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.MEDIUM_1) // 105
        .overrideCustomFieldConfig('align', 'center');

      // Moid column
      builder.matchFieldsWithName('Moid')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XXLARGE_1) // 230
        .overrideCustomFieldConfig('align', 'left');
    })
    .build();

  // ========================================================================
  // HOST INVENTORY TABLE
  // ========================================================================

  const hostQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'B',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `${API_ENDPOINTS.COMPUTE_PHYSICAL_SUMMARIES}?$filter=(${hostFilters})&$top=1000&$expand=`, // '/api/v1/compute/PhysicalSummaries'
        root_selector: '$.Results',
        columns: [
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'UserLabel', text: 'UserLabel', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'PlatformType', text: 'PlatformType', type: 'string' },
          { selector: 'ChassisId', text: 'ChassisId', type: 'string' },
          { selector: 'SlotId', text: 'SlotId', type: 'string' },
          { selector: 'ServerId', text: 'ServerId', type: 'string' },
          { selector: 'Presence', text: 'Presence', type: 'string' },
          { selector: 'Lifecycle', text: 'Lifecycle', type: 'string' },
          { selector: 'OperPowerState', text: 'OperPowerState', type: 'string' },
          { selector: 'BiosPostComplete', text: 'BiosPostComplete', type: 'string' },
          { selector: 'NumCpus', text: 'NumCpus', type: 'string' },
          { selector: 'NumCpuCores', text: 'NumCpuCores', type: 'string' },
          { selector: 'NumEthHostInterfaces', text: 'NumEthHostInterfaces', type: 'string' },
          { selector: 'NumFcHostInterfaces', text: 'NumFcHostinterfaces', type: 'string' },
          { selector: 'TotalMemory', text: 'TotalMemory', type: 'string' },
          { selector: 'MgmtIpAddress', text: 'MgmtIpAddress', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
        ],
        computed_columns: [
          { selector: "ChassisId + '/' + SlotId + '#' + ServerId", text: 'ID', type: 'string' },
          { selector: "NumCpus + 'x ' + NumCpuCores + 'C'", text: 'CPU', type: 'string' },
          { selector: "NumEthHostInterfaces + ' Eth +' + NumFcHostinterfaces + ' FC'", text: 'Interfaces', type: 'string' },
          { selector: "OperPowerState + '#' + BiosPostComplete", text: 'Power', type: 'string' },
          { selector: "Presence + '#' + Lifecycle", text: 'State', type: 'string' },
          { selector: "Name", text: 'ChassisName', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  // Wrap with pagination support for >1000 results
  const hostPaginatedData = new PaginatedDataProvider({
    $data: hostQueryRunner,
  });

  const hostTransformedData = new LoggingDataTransformer({
    $data: hostPaginatedData,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            BiosPostComplete: true,
            ChassisId: true,
            ChassisName: !showChassisColumn,
            Lifecycle: true,
            NumCpuCores: true,
            NumCpus: true,
            NumEthHostInterfaces: true,
            NumFcHostinterfaces: true,
            OperPowerState: true,
            Presence: true,
            PlatformType: true,
            ServerId: true,
            SlotId: true,
            TotalMemory: true,
          },
          indexByName: showChassisColumn ? {
            ChassisName: 0,
            ID: 1,
            Name: 2,
            UserLabel: 3,
            Serial: 4,
            Model: 5,
            State: 6,
            Power: 7,
            Critical: 8,
            Warning: 9,
            CPU: 10,
            Interfaces: 11,
            MgmtIpAddress: 12,
            Moid: 13,
          } : {
            ID: 0,
            Name: 1,
            UserLabel: 2,
            Serial: 3,
            Model: 4,
            State: 5,
            Power: 6,
            Critical: 7,
            Warning: 8,
            CPU: 9,
            Interfaces: 10,
            MgmtIpAddress: 11,
            Moid: 12,
          },
          renameByName: showChassisColumn ? {
            ChassisName: 'Chassis',
            UserLabel: 'User Label',
            MgmtIpAddress: 'Mgmt IP',
          } : {
            UserLabel: 'User Label',
            MgmtIpAddress: 'Mgmt IP',
          },
        },
      },
    ],
  });

  const hostPanel = PanelBuilders.table()
    .setTitle('Host Inventory')
    .setData(hostTransformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('enablePagination', true)
    .setOption('sortBy', showChassisColumn ?
      [{ displayName: 'Chassis', desc: false }, { displayName: 'ID', desc: false }] :
      [{ displayName: 'ID', desc: false }]
    )
    .setOverrides((builder) => {
      // Chassis column styling (only applies if column exists)
      if (showChassisColumn) {
        builder.matchFieldsWithName('Chassis')
          .overrideCustomFieldConfig('width', COLUMN_WIDTHS.LARGE_2) // 150
          .overrideCustomFieldConfig('align', 'left')
          .overrideMappings([
            { type: 'regex' as any, options: { pattern: '^(.+)-\\d+$', result: { index: 0, text: '$1' } } },
          ]);
      }

      // ID column - clean up "0#X" -> "X" and "X#0" -> "X"
      builder.matchFieldsWithName('ID')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XXXSMALL) // 50
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex' as any, options: { pattern: '^0#(.+)$', result: { index: 0, text: '$1' } } },
          { type: 'regex' as any, options: { pattern: '^(.+)#0$', result: { index: 1, text: '$1' } } },
        ]);

      // Serial column
      builder.matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.MEDIUM_3) // 115
        .overrideCustomFieldConfig('align', 'left');

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.MEDIUM_3) // 115
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideMappings([
          { type: 'value' as any, options: { 'Enabled#Active': { color: 'transparent', index: 0, text: 'Ok' }, 'equipped#Active': { color: 'transparent', index: 1, text: 'Ok' }, 'equipped#DiscoveryFailed': { color: 'semi-dark-red', index: 2, text: 'Discovery Failed' } } },
          { type: 'regex' as any, options: { pattern: '.*', result: { color: 'semi-dark-red', index: 3, text: 'Presence or Lifecycle not ok' } } },
        ]);

      // Power column
      builder.matchFieldsWithName('Power')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XXSMALL_2) // 60
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideMappings([
          { type: 'value' as any, options: { 'on#true': { color: 'transparent', index: 0, text: 'On' }, 'on#false': { color: 'semi-dark-yellow', index: 1, text: 'On (BIOS Post incomplete)' } } },
          { type: 'regex' as any, options: { pattern: '.*', result: { color: 'semi-dark-red', index: 2, text: 'Off' } } },
        ]);

      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XSMALL_1) // 75
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XSMALL_1) // 75
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // CPU column
      builder.matchFieldsWithName('CPU')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.XXSMALL_3) // 65
        .overrideCustomFieldConfig('align', 'center');

      // Interfaces column
      builder.matchFieldsWithName('Interfaces')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.SMALL_4) // 100
        .overrideCustomFieldConfig('align', 'center');

      // Mgmt IP column
      builder.matchFieldsWithName('Mgmt IP')
        .overrideCustomFieldConfig('width', COLUMN_WIDTHS.MEDIUM_1); // 105
    })
    .build();

  // Return layout with both panels
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 350,
        body: chassisPanel,
      }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: hostPanel,
      }),
    ],
  });
}

/**
 * Main export function for the Inventory tab.
 * Returns a DynamicInventoryScene that shows chassis and host inventory tables.
 */
export function getInventoryTab() {
  // Return the dynamic inventory scene that shows chassis and host inventory tables
  return new DynamicInventoryScene({});
}
