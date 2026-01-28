/**
 * Inventory Tab - Standalone Scene
 *
 * This module provides the Inventory tab functionality for the Standalone scene.
 * Shows server inventory table with detailed server information.
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
import { getEmptyStateScenario } from '../../utils/emptyStateHelpers';

// ============================================================================
// DYNAMIC INVENTORY SCENE - Shows server inventory table
// ============================================================================

interface DynamicInventorySceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicInventoryScene - Custom scene that reads the ServerName variable
 * and shows server inventory in a table.
 */
class DynamicInventoryScene extends SceneObjectBase<DynamicInventorySceneState> {
  public static Component = DynamicInventorySceneRenderer;

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

    // Get the ServerName variable from the scene's variable set
    const variable = this.getVariable('ServerName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('ServerName variable not found or not a query variable');
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({ body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'server' }) });
      return;
    }

    // Create the server inventory table
    const newBody = createInventoryBody();

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
 * Creates the inventory table layout
 */
function createInventoryBody(): SceneFlexLayout {
  // Query for Servers
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'C',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/compute/PhysicalSummaries?$filter=Name in (\${ServerName:singlequote})`,
        root_selector: '$.Results',
        columns: [
          { selector: 'AdminPowerState', text: 'AdminPowerState', type: 'string' },
          { selector: 'Ancestors', text: 'Ancestors', type: 'string' },
          { selector: 'AssetTag', text: 'AssetTag', type: 'string' },
          { selector: 'AvailableMemory', text: 'AvailableMemory', type: 'string' },
          { selector: 'BiosPostComplete', text: 'BiosPostComplete', type: 'string' },
          { selector: 'ChassisId', text: 'ChassisId', type: 'string' },
          { selector: 'ConnectionStatus', text: 'ConnectionStatus', type: 'string' },
          { selector: 'CoolingMode', text: 'CoolingMode', type: 'string' },
          { selector: 'CpuCapacity', text: 'CpuCapacity', type: 'string' },
          { selector: 'EquipmentChassis', text: 'EquipmentChassis', type: 'string' },
          { selector: 'Firmware', text: 'Firmware', type: 'string' },
          { selector: 'FrontPanelLockStatus', text: 'FrontPanelLockStatus', type: 'string' },
          { selector: 'HardwareUuid', text: 'HardwareUuid', type: 'string' },
          { selector: 'InventoryParent', text: 'InventoryParent', type: 'string' },
          { selector: 'Ipv4Address', text: 'Ipv4Address', type: 'string' },
          { selector: 'KvmIpAddresses', text: 'KvmIpAddresses', type: 'string' },
          { selector: 'KvmServerStateEnabled', text: 'KvmServerStateEnabled', type: 'string' },
          { selector: 'Lifecycle', text: 'Lifecycle', type: 'string' },
          { selector: 'MgmtIpAddress', text: 'MgmtIpAddress', type: 'string' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'NumAdaptors', text: 'NumAdaptors', type: 'string' },
          { selector: 'NumCpuCores', text: 'NumCpuCores', type: 'string' },
          { selector: 'NumCpuCoresEnabled', text: 'NumCpuCoresEnabled', type: 'string' },
          { selector: 'NumCpus', text: 'NumCpus', type: 'string' },
          { selector: 'NumEthHostInterfaces', text: 'NumEthHostInterfaces', type: 'string' },
          { selector: 'NumFcHostInterfaces', text: 'NumFcHostinterfaces', type: 'string' },
          { selector: 'OperPowerState', text: 'OperPowerState', type: 'string' },
          { selector: 'PackageVersion', text: 'PackageVersion', type: 'string' },
          { selector: 'PlatformType', text: 'PlatformType', type: 'string' },
          { selector: 'Presence', text: 'Presence', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'ServerId', text: 'ServerId', type: 'string' },
          { selector: 'SlotId', text: 'SlotId', type: 'string' },
          { selector: 'TotalMemory', text: 'TotalMemory', type: 'string' },
          { selector: 'TunneledKvm', text: 'TuneledKvm', type: 'string' },
          { selector: 'UserLabel', text: 'UserLabel', type: 'string' },
          { selector: 'Uuid', text: 'Uuid', type: 'string' },
          { selector: 'AlarmSummary.Health', text: 'Health', type: 'string' },
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'AlarmSummary.Info', text: 'Info', type: 'number' },
        ],
        computed_columns: [
          { selector: "ChassisId + '/' + SlotId + '#' + ServerId", text: 'ID', type: 'string' },
          { selector: "NumCpus + 'x ' + NumCpuCores + 'C'", text: 'CPU', type: 'string' },
          { selector: "NumEthHostInterfaces + ' Eth +' + NumFcHostinterfaces + ' FC'", text: 'Interfaces', type: 'string' },
          { selector: "OperPowerState + '#' + BiosPostComplete", text: 'Power', type: 'string' },
          { selector: "Presence + '#' + Lifecycle", text: 'State', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  // Wrap with pagination support for >1000 results
  const paginatedData = new PaginatedDataProvider({
    $data: queryRunner,
  });

  const transformedData = new LoggingDataTransformer({
    $data: paginatedData,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            AdminPowerState: true,
            Ancestors: true,
            AssetTag: true,
            BiosPostComplete: true,
            ChassisId: true,
            ConnectionStatus: true,
            CoolingMode: true,
            CpuCapacity: true,
            EquipmentChassis: true,
            FrontPanelLockStatus: true,
            HardwareUuid: true,
            Health: true,
            ID: true,
            Info: true,
            InventoryParent: true,
            Ipv4Address: true,
            KvmIpAddresses: true,
            KvmServerStateEnabled: true,
            Lifecycle: true,
            NumAdaptors: true,
            NumCpuCores: true,
            NumCpuCoresEnabled: true,
            NumCpus: true,
            NumEthHostInterfaces: true,
            NumFcHostinterfaces: true,
            OperPowerState: true,
            PackageVersion: true,
            Presence: true,
            ServerId: true,
            SlotId: true,
            TotalMemory: true,
            TuneledKvm: true,
            Uuid: true,
          },
          indexByName: {
            Name: 0,
            UserLabel: 1,
            Serial: 2,
            Model: 3,
            PlatformType: 4,
            Power: 5,
            State: 6,
            Critical: 7,
            Warning: 8,
            Firmware: 9,
            MgmtIpAddress: 10,
            Moid: 11,
            Interfaces: 12,
            CPU: 13,
            AvailableMemory: 14,
          },
          renameByName: {
            AvailableMemory: 'Memory',
            MgmtIpAddress: 'Mgmt IP',
            PlatformType: 'Platform',
            UserLabel: 'User Label',
          },
        },
      },
    ],
  });

  const inventoryPanel = PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('sortBy', [{ displayName: 'Name', desc: false }])
    .setOverrides((builder) => {
      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
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
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // Power column
      builder.matchFieldsWithName('Power')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideMappings([
          { type: 'value' as any, options: { 'on#true': { color: 'transparent', index: 0, text: 'On' }, 'on#false': { color: 'semi-dark-yellow', index: 1, text: 'On (BIOS Post incomplete)' } } },
          { type: 'regex' as any, options: { pattern: '.*', result: { color: 'semi-dark-red', index: 2, text: 'Off' } } },
        ]);

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any, mode: 'basic' as any as any })
        .overrideMappings([
          { type: 'value' as any, options: { 'Enabled#Active': { color: 'transparent', index: 0, text: 'Ok' }, 'equipped#Active': { color: 'transparent', index: 1, text: 'Ok' }, 'equipped#DiscoveryFailed': { color: 'semi-dark-red', index: 2, text: 'Discovery Failed' } } },
          { type: 'regex' as any, options: { pattern: '.*', result: { color: 'semi-dark-red', index: 3, text: 'Presence or Lifecycle not ok' } } },
        ]);

      // CPU column
      builder.matchFieldsWithName('CPU')
        .overrideCustomFieldConfig('width', 65)
        .overrideCustomFieldConfig('align', 'center');

      // Interfaces column
      builder.matchFieldsWithName('Interfaces')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center');

      // Memory column
      builder.matchFieldsWithName('Memory')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideUnit('gbytes');

      // Mgmt IP column
      builder.matchFieldsWithName('Mgmt IP')
        .overrideCustomFieldConfig('width', 110);

      // Firmware column
      builder.matchFieldsWithName('Firmware')
        .overrideCustomFieldConfig('width', 110);

      // Serial column
      builder.matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('align', 'left');

      // Platform column
      builder.matchFieldsWithName('Platform')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'left')
        .overrideMappings([
          { type: 'value' as any, options: { IMCBlade: { index: 0, text: 'Blade' }, IMCRack: { index: 1, text: 'Rack' } } },
        ]);
    })
    .build();

  // Return layout with the inventory panel
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: inventoryPanel,
      }),
    ],
  });
}

/**
 * Main export function for the Inventory tab.
 * Returns a DynamicInventoryScene that shows server inventory table.
 */
export function getInventoryTab() {
  // Return the dynamic inventory scene that shows server inventory table
  return new DynamicInventoryScene({});
}
