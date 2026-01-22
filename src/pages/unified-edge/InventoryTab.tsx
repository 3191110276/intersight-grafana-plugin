import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
} from '@grafana/scenes';
import React from 'react';
import { TabsBar, Tab } from '@grafana/ui';

// ============================================================================
// PANEL HELPER FUNCTIONS
// ============================================================================

/**
 * Creates the Chassis panel for a specific chassis (panel-170 from original dashboard)
 */
function getChassisPanel(chassisName?: string) {
  const filterClause = chassisName
    ? `Name eq '${chassisName}'`
    : `Name eq '\${ChassisName}'`;

  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/equipment/Chasses?$filter=(${filterClause})&$top=1000&$expand=ExpanderModules,FanControl($select=Mode),LocatorLed($select=OperState),PowerControlState,PsuControl`,
        root_selector: '$.Results',
        columns: [
          { selector: 'ChassisId', text: 'ChassisId', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'OperReason', text: 'OperReason', type: 'string' },
          { selector: 'AlarmSummary.Health', text: 'Health', type: 'string' },
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'AlarmSummary.Info', text: 'Info', type: 'number' },
          { selector: 'ConnectionPath', text: 'ConnectionPath', type: 'string' },
          { selector: 'ConnectionStatus', text: 'ConnectionStatus', type: 'string' },
          { selector: 'LocatorLed.OperState', text: 'LocatorLed', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'PsuControl.OperState', text: 'PsuOperState', type: 'string' },
          { selector: 'PsuControl.InputPowerState', text: 'InputPowerState', type: 'string' },
          { selector: 'PsuControl.OutputPowerState', text: 'OutputPowerState', type: 'string' },
          { selector: 'PsuControl.Redundancy', text: 'Redundancy', type: 'string' },
          { selector: 'PowerControlState.AllocatedPower', text: 'AllocatedPower', type: 'number' },
          { selector: 'PowerControlState.ExtendedPowerCapacity', text: 'ExtendedPowerCapacity', type: 'string' },
          { selector: 'PowerControlState.PowerRebalancing', text: 'PowerRebalancing', type: 'string' },
          { selector: 'PowerControlState.PowerSaveMode', text: 'PowerSaveMode', type: 'string' },
          { selector: 'FanControl.Mode', text: 'FanControlMode', type: 'string' },
        ],
        computed_columns: [],
        filters: [],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
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
          includeByName: {},
          indexByName: {
            AllocatedPower: 18,
            ChassisId: 0,
            ConnectionPath: 10,
            ConnectionStatus: 11,
            Critical: 7,
            ExtendedPowerCapacity: 19,
            FanControlMode: 22,
            Health: 6,
            Info: 9,
            InputPowerState: 15,
            LocatorLed: 12,
            Model: 3,
            Moid: 13,
            Name: 1,
            OperReason: 5,
            OperState: 4,
            OutputPowerState: 16,
            PowerRebalancing: 20,
            PowerSaveMode: 21,
            PsuOperState: 14,
            Redundancy: 17,
            Serial: 2,
            Warning: 8,
          },
          renameByName: {
            AllocatedPower: 'Allocated Power',
            ChassisId: 'ID',
            ConnectionStatus: 'Connection',
            ExtendedPowerCapacity: 'Extended Power Capacity',
            FanControlMode: 'Fan Mode',
            InputPowerState: 'Input Power State',
            LocatorLed: 'Locator LED',
            Name: '',
            OperState: 'State',
            OutputPowerState: 'Output Power State',
            PowerRebalancing: 'Power Rebalancing',
            PowerSaveMode: 'Power Save Mode',
            PsuOperState: 'PSU State',
            Redundancy: '',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // ID column
      builder.matchFieldsWithName('ID')
        .overrideCustomFieldConfig('width', 20)
        .overrideCustomFieldConfig('align', 'center');

      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', 55)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { OK: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Connection column
      builder.matchFieldsWithName('Connection')
        .overrideCustomFieldConfig('width', 95)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'A,B': { color: 'transparent', index: 0, text: 'A + B' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Locator LED column
      builder.matchFieldsWithName('Locator LED')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { off: { color: 'transparent', index: 0, text: 'Off' } } },
          { type: 'value', options: { on: { color: 'blue', index: 1, text: 'On' } } },
        ]);

      // PSU State column
      builder.matchFieldsWithName('PSU State')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { OK: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);
    })
    .build();
}

/**
 * Creates the Server panel for a specific chassis (panel-169 from original dashboard)
 */
function getServerPanel(chassisName?: string) {
  const filterClause = chassisName
    ? `startswith(Name, '${chassisName}')`
    : `startswith(Name, '\${ChassisName}')`;

  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'C',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/compute/PhysicalSummaries?$filter=(${filterClause})&$top=1000&$expand=`,
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
          { selector: "NumCpus + 'x ' + NumCpuCores + 'C'", text: 'CPU', type: 'string' },
          { selector: "NumEthHostInterfaces + ' Eth +' + NumFcHostinterfaces + ' FC'", text: 'Interfaces', type: 'string' },
          { selector: "OperPowerState + '#' + BiosPostComplete", text: 'Power', type: 'string' },
          { selector: "ChassisId + '/' + SlotId + '#' + ServerId", text: 'ID', type: 'string' },
          { selector: "Presence + '#' + Lifecycle", text: 'State', type: 'string' },
        ],
        filters: [],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
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
          includeByName: {},
          indexByName: {
            AdminPowerState: 20,
            Ancestors: 23,
            AssetTag: 5,
            AvailableMemory: 47,
            BiosPostComplete: 12,
            CPU: 41,
            ChassisId: 1,
            ConnectionStatus: 24,
            CoolingMode: 25,
            CpuCapacity: 44,
            Critical: 17,
            EquipmentChassis: 26,
            Firmware: 21,
            FrontPanelLockStatus: 27,
            HardwareUuid: 35,
            Health: 16,
            ID: 0,
            Info: 19,
            Interfaces: 40,
            InventoryParent: 28,
            Ipv4Address: 29,
            KvmIpAddresses: 30,
            KvmServerStateEnabled: 31,
            Lifecycle: 15,
            MgmtIpAddress: 32,
            Model: 8,
            Moid: 33,
            Name: 4,
            NumAdaptors: 37,
            NumCpuCores: 43,
            NumCpuCoresEnabled: 45,
            NumCpus: 42,
            NumEthHostInterfaces: 38,
            NumFcHostinterfaces: 39,
            OperPowerState: 11,
            PackageVersion: 22,
            PlatformType: 9,
            Power: 10,
            Presence: 14,
            Serial: 7,
            ServerId: 3,
            SlotId: 2,
            State: 13,
            TotalMemory: 46,
            TuneledKvm: 34,
            UserLabel: 6,
            Uuid: 36,
            Warning: 18,
          },
          renameByName: {
            AvailableMemory: 'Memory',
            ChassisId: 'Chassis ID',
            Health: '',
            MgmtIpAddress: 'Mgmt IP',
            NumCpus: '',
            NumEthHostInterfaces: 'Eth Interfaces',
            NumFcHostinterfaces: 'FC Interfaces',
            OperPowerState: '',
            PlatformType: 'Platform',
            ServerId: 'Server ID',
            SlotId: 'Slot ID',
            UserLabel: 'User Label',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('cellOptions', {
          mode: 'basic',
          type: 'color-background',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        })
        .overrideCustomFieldConfig('align', 'center');

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('cellOptions', {
          mode: 'basic',
          type: 'color-background',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        })
        .overrideCustomFieldConfig('align', 'center');

      // ID column
      builder.matchFieldsWithName('ID')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '.*0#(.*)', result: { index: 0, text: '$1' } } },
          { type: 'regex', options: { pattern: '(.*)#0', result: { index: 1, text: '$1' } } },
        ]);

      // Power column
      builder.matchFieldsWithName('Power')
        .overrideCustomFieldConfig('width', 60)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'on#true': { color: 'transparent', index: 0, text: 'On' } } },
          { type: 'value', options: { 'on#false': { color: 'semi-dark-yellow', index: 1, text: 'On (BIOS Post incomplete)' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 2, text: 'Off' } } },
        ]);

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'Enabled#Active': { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'value', options: { 'equipped#Active': { color: 'transparent', index: 1, text: 'Ok' } } },
          { type: 'value', options: { 'equipped#DiscoveryFailed': { color: 'semi-dark-red', index: 2, text: 'Discovery Failed' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 3, text: 'Presence or Lifecycle not ok' } } },
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
        .overrideCustomFieldConfig('width', 105);

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
          { type: 'value', options: { IMCBlade: { index: 0, text: 'Blade' } } },
          { type: 'value', options: { IMCRack: { index: 1, text: 'Rack' } } },
        ]);
    })
    .build();
}

// ============================================================================
// DYNAMIC INVENTORY SCENE - Creates tabs dynamically based on ChassisName variable
// ============================================================================

interface DynamicInventorySceneState extends SceneObjectState {
  chassisTabs: Array<{ id: string; label: string; getBody: () => any }>;
  activeTab: string;
  body: any;
}

/**
 * DynamicInventoryScene - Custom scene that reads the ChassisName variable
 * and creates a tab for each selected chassis with chassis-specific inventory panels.
 */
class DynamicInventoryScene extends SceneObjectBase<DynamicInventorySceneState> {
  public static Component = DynamicInventorySceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildTabs();
      }
    },
  });

  public constructor(state: Partial<DynamicInventorySceneState>) {
    super({
      chassisTabs: [],
      activeTab: '',
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildTabs();
  }

  private rebuildTabs() {
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

      this.setState({
        chassisTabs: [],
        activeTab: '',
        body: emptyBody,
      });
      return;
    }

    // Create a tab for each chassis
    const newTabs = chassisNames.map((chassisName) => ({
      id: chassisName,
      label: chassisName,
      getBody: () => createChassisInventoryBody(chassisName),
    }));

    // Set the active tab to the first tab if not already set or if current tab is not in new tabs
    let newActiveTab = this.state.activeTab;
    if (!newActiveTab || !newTabs.find(t => t.id === newActiveTab)) {
      newActiveTab = newTabs[0]?.id || '';
    }

    // Create the new body
    const newBody = newTabs.find(t => t.id === newActiveTab)?.getBody() || new SceneFlexLayout({ children: [] });

    // Update state - React will handle component lifecycle via key prop
    this.setState({
      chassisTabs: newTabs,
      activeTab: newActiveTab,
      body: newBody,
    });
  }

  public setActiveTab(tabId: string) {
    const tab = this.state.chassisTabs.find((t) => t.id === tabId);
    if (tab) {
      const newBody = tab.getBody();
      if (!newBody) {
        console.warn('getBody returned null/undefined for tab:', tabId);
        return;
      }
      // Just update state - React will handle unmounting via the key prop
      this.setState({ activeTab: tabId, body: newBody });
    }
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Creates the inventory layout for a specific chassis
 */
function createChassisInventoryBody(chassisName: string) {
  const chassisPanel = getChassisPanel(chassisName);
  const serverPanel = getServerPanel(chassisName);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Chassis section header
      new SceneFlexItem({
        height: 30,
        ySizing: 'content',
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### Chassis')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
      new SceneFlexItem({
        height: 250,
        ySizing: 'content',
        body: chassisPanel,
      }),
      // Server section header
      new SceneFlexItem({
        height: 30,
        ySizing: 'content',
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### Server')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: serverPanel,
      }),
    ],
  });
}

/**
 * Renderer component for DynamicInventoryScene
 */
function DynamicInventorySceneRenderer({ model }: SceneComponentProps<DynamicInventoryScene>) {
  const { chassisTabs, activeTab, body } = model.useState();

  // If no tabs, just render the body (which contains the "no selection" message)
  if (chassisTabs.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {body && body.Component && <body.Component key="empty-body" model={body} />}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
        flexShrink: 0,
        minHeight: '48px',
      }}>
        <TabsBar style={{ border: 'none' }}>
          {chassisTabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onChangeTab={() => model.setActiveTab(tab.id)}
            />
          ))}
        </TabsBar>
      </div>
      <div style={{
        flexGrow: 1,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative'
      }}>
        {body && body.Component && <body.Component key={activeTab} model={body} />}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT FUNCTION
// ============================================================================

/**
 * Returns the Inventory tab for the Unified Edge dashboard.
 * This creates a dynamic scene that shows tabs for each selected ChassisName,
 * with Chassis and Server panels for each tab.
 */
export function getInventoryTab() {
  return new DynamicInventoryScene({});
}
