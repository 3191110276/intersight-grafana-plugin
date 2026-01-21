import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  QueryVariable,
  SceneVariableSet,
  VariableValueSelectors,
  SceneQueryRunner,
  SceneDataTransformer,
} from '@grafana/scenes';
import { TabbedScene } from '../components/TabbedScene';

// ============================================================================
// TAB PLACEHOLDER FUNCTIONS
// These will be implemented in subsequent phases
// ============================================================================

function getOverviewTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Overview')
          .setOption('content', `
# Overview Tab

This tab provides a high-level overview of all IMM Domains including:
- Alarms summary (repeated by DomainName)
- Actions summary (repeated by DomainName)
- Network Utilization preview
- Congestion preview
- Network Errors preview
- CPU Utilization preview

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

// ============================================================================
// INVENTORY TAB - Fabric Interconnect, Chassis, Server panels
// ============================================================================

function getFabricInterconnectAPanel() {
  // Query for FI-A (panel-171 from original dashboard)
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
        url: "/api/v1/network/ElementSummaries?$filter=Name eq '${DomainName} FI-A'&$top=1000",
        root_selector: '$.Results',
        columns: [
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'BundleVersion', text: 'Firmware', type: 'string' },
          { selector: 'AdminEvacState', text: 'AdminEvacState', type: 'string' },
          { selector: 'OperEvacState', text: 'OperEvacState', type: 'string' },
          { selector: 'EthernetSwitchingMode', text: 'EthernetSwitchingMode', type: 'string' },
          { selector: 'FcSwitchingMode', text: 'FcSwitchingMode', type: 'string' },
          { selector: 'InterClusterLinkState', text: 'ISL State', type: 'string' },
          { selector: 'Thermal', text: 'Thermal', type: 'string' },
          { selector: 'InbandIpAddress', text: 'Inband IP', type: 'string' },
          { selector: 'InbandVlan', text: 'Inband VLAN', type: 'string' },
          { selector: 'OutOfBandIpAddress', text: 'OOB IP', type: 'string' },
          { selector: 'NumEtherPorts', text: 'Eth Ports', type: 'number' },
          { selector: 'NumEtherPortsLinkUp', text: 'Eth Up', type: 'number' },
          { selector: 'NumEtherPortsConfigured', text: 'Eth Configured', type: 'number' },
          { selector: 'NumFcPorts', text: 'FC Ports', type: 'number' },
          { selector: 'NumFcPortsLinkUp', text: 'FC Up', type: 'number' },
          { selector: 'NumFcPortsConfigured', text: 'FC Configured', type: 'number' },
        ],
        computed_columns: [
          { selector: "EthernetSwitchingMode + '/' + FcSwitchingMode", text: 'Switching Mode', type: 'string' },
          { selector: "AdminEvacState + '/' + OperEvacState", text: 'Evacuation', type: 'string' },
        ],
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
            AdminEvacState: true,
            OperEvacState: true,
            EthernetSwitchingMode: true,
            FcSwitchingMode: true,
            Moid: true,
          },
          indexByName: {
            Name: 0,
            Serial: 1,
            Model: 2,
            Firmware: 3,
            Critical: 4,
            Warning: 5,
            'ISL State': 6,
            Thermal: 7,
            'Inband IP': 8,
            'Inband VLAN': 9,
            'OOB IP': 10,
            'Switching Mode': 11,
            Evacuation: 12,
            'Eth Ports': 13,
            'Eth Up': 14,
            'Eth Configured': 15,
            'FC Ports': 16,
            'FC Up': 17,
            'FC Configured': 18,
          },
          renameByName: {},
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('FI-A')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // ISL State column
      builder.matchFieldsWithName('ISL State')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { Up: { color: 'transparent', index: 0, text: 'Up' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Down' } } },
        ]);

      // Thermal column
      builder.matchFieldsWithName('Thermal')
        .overrideCustomFieldConfig('width', 70)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { ok: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Evacuation column
      builder.matchFieldsWithName('Evacuation')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'disabled/disabled': { color: 'transparent', index: 0, text: 'Disabled' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-yellow', index: 1, text: 'Active' } } },
        ]);
    })
    .build();
}

function getFabricInterconnectBPanel() {
  // Query for FI-B (panel-172 from original dashboard)
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
        url: "/api/v1/network/ElementSummaries?$filter=Name eq '${DomainName} FI-B'&$top=1000",
        root_selector: '$.Results',
        columns: [
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'BundleVersion', text: 'Firmware', type: 'string' },
          { selector: 'AdminEvacState', text: 'AdminEvacState', type: 'string' },
          { selector: 'OperEvacState', text: 'OperEvacState', type: 'string' },
          { selector: 'EthernetSwitchingMode', text: 'EthernetSwitchingMode', type: 'string' },
          { selector: 'FcSwitchingMode', text: 'FcSwitchingMode', type: 'string' },
          { selector: 'InterClusterLinkState', text: 'ISL State', type: 'string' },
          { selector: 'Thermal', text: 'Thermal', type: 'string' },
          { selector: 'InbandIpAddress', text: 'Inband IP', type: 'string' },
          { selector: 'InbandVlan', text: 'Inband VLAN', type: 'string' },
          { selector: 'OutOfBandIpAddress', text: 'OOB IP', type: 'string' },
          { selector: 'NumEtherPorts', text: 'Eth Ports', type: 'number' },
          { selector: 'NumEtherPortsLinkUp', text: 'Eth Up', type: 'number' },
          { selector: 'NumEtherPortsConfigured', text: 'Eth Configured', type: 'number' },
          { selector: 'NumFcPorts', text: 'FC Ports', type: 'number' },
          { selector: 'NumFcPortsLinkUp', text: 'FC Up', type: 'number' },
          { selector: 'NumFcPortsConfigured', text: 'FC Configured', type: 'number' },
        ],
        computed_columns: [
          { selector: "EthernetSwitchingMode + '/' + FcSwitchingMode", text: 'Switching Mode', type: 'string' },
          { selector: "AdminEvacState + '/' + OperEvacState", text: 'Evacuation', type: 'string' },
        ],
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
            AdminEvacState: true,
            OperEvacState: true,
            EthernetSwitchingMode: true,
            FcSwitchingMode: true,
            Moid: true,
          },
          indexByName: {
            Name: 0,
            Serial: 1,
            Model: 2,
            Firmware: 3,
            Critical: 4,
            Warning: 5,
            'ISL State': 6,
            Thermal: 7,
            'Inband IP': 8,
            'Inband VLAN': 9,
            'OOB IP': 10,
            'Switching Mode': 11,
            Evacuation: 12,
            'Eth Ports': 13,
            'Eth Up': 14,
            'Eth Configured': 15,
            'FC Ports': 16,
            'FC Up': 17,
            'FC Configured': 18,
          },
          renameByName: {},
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('FI-B')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // ISL State column
      builder.matchFieldsWithName('ISL State')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { Up: { color: 'transparent', index: 0, text: 'Up' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Down' } } },
        ]);

      // Thermal column
      builder.matchFieldsWithName('Thermal')
        .overrideCustomFieldConfig('width', 70)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { ok: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Evacuation column
      builder.matchFieldsWithName('Evacuation')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'disabled/disabled': { color: 'transparent', index: 0, text: 'Disabled' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-yellow', index: 1, text: 'Active' } } },
        ]);
    })
    .build();
}

function getChassisInventoryPanel() {
  // Query for Chassis (panel-170 from original dashboard)
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
        url: "/api/v1/equipment/Chasses?$filter=(startswith(Name, '${DomainName}'))&$top=1000&$expand=ExpanderModules,FanControl($select=Mode),LocatorLed($select=OperState),PowerControlState,PsuControl",
        root_selector: '$.Results',
        columns: [
          { selector: 'ChassisId', text: 'ChassisId', type: 'string' },
          { selector: 'ConnectionPath', text: 'ConnectionPath', type: 'string' },
          { selector: 'ConnectionStatus', text: 'ConnectionStatus', type: 'string' },
          { selector: 'FanControl.Mode', text: 'FanControlMode', type: 'string' },
          { selector: 'LocatorLed.OperState', text: 'LocatorLed', type: 'string' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'OperReason', text: 'OperReason', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'PowerControlState.AllocatedPower', text: 'AllocatedPower', type: 'number' },
          { selector: 'PowerControlState.ExtendedPowerCapacity', text: 'ExtendedPowerCapacity', type: 'string' },
          { selector: 'PowerControlState.PowerRebalancing', text: 'PowerRebalancing', type: 'string' },
          { selector: 'PowerControlState.PowerSaveMode', text: 'PowerSaveMode', type: 'string' },
          { selector: 'PsuControl.InputPowerState', text: 'InputPowerState', type: 'string' },
          { selector: 'PsuControl.OperState', text: 'PsuOperState', type: 'string' },
          { selector: 'PsuControl.OutputPowerState', text: 'OutputPowerState', type: 'string' },
          { selector: 'PsuControl.Redundancy', text: 'Redundancy', type: 'string' },
          { selector: 'AlarmSummary.Health', text: 'Health', type: 'string' },
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'AlarmSummary.Info', text: 'Info', type: 'number' },
        ],
        computed_columns: [],
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
            ConnectionPath: true,
            Health: true,
            Info: true,
            InputPowerState: true,
            OperReason: true,
            OutputPowerState: true,
            Moid: true,
          },
          indexByName: {
            ChassisId: 0,
            Name: 1,
            Serial: 2,
            Model: 3,
            OperState: 4,
            Critical: 7,
            Warning: 8,
            ConnectionStatus: 11,
            LocatorLed: 12,
            PsuOperState: 14,
            Redundancy: 17,
            AllocatedPower: 18,
            ExtendedPowerCapacity: 19,
            PowerRebalancing: 20,
            PowerSaveMode: 21,
            FanControlMode: 22,
          },
          renameByName: {
            AllocatedPower: 'Allocated Power',
            ChassisId: 'ID',
            ConnectionStatus: 'Connection',
            ExtendedPowerCapacity: 'Extended Power Capacity',
            FanControlMode: 'Fan Mode',
            LocatorLed: 'Locator LED',
            OperState: 'State',
            PowerRebalancing: 'Power Rebalancing',
            PowerSaveMode: 'Power Save Mode',
            PsuOperState: 'PSU State',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Chassis')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // ID column
      builder.matchFieldsWithName('ID')
        .overrideCustomFieldConfig('width', 30)
        .overrideCustomFieldConfig('align', 'center');

      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

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
          { type: 'value', options: { off: { color: 'transparent', index: 0, text: 'Off' }, on: { color: 'blue', index: 1, text: 'On' } } },
        ]);

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', 55)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { OK: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Error' } } },
        ]);

      // PSU State column
      builder.matchFieldsWithName('PSU State')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { OK: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Error' } } },
        ]);

      // Redundancy column
      builder.matchFieldsWithName('Redundancy')
        .overrideCustomFieldConfig('width', 110);

      // Allocated Power column
      builder.matchFieldsWithName('Allocated Power')
        .overrideCustomFieldConfig('width', 128);

      // Fan Mode column
      builder.matchFieldsWithName('Fan Mode')
        .overrideCustomFieldConfig('width', 120);
    })
    .build();
}

function getServerInventoryPanel() {
  // Query for Servers (panel-169 from original dashboard)
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
        url: "/api/v1/compute/PhysicalSummaries?$filter=(startswith(Name, '${DomainName}'))&$top=1000&$expand=",
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
            Moid: true,
          },
          indexByName: {
            ID: 0,
            Name: 4,
            UserLabel: 6,
            Serial: 7,
            Model: 8,
            PlatformType: 9,
            Power: 10,
            State: 13,
            Critical: 17,
            Warning: 18,
            Firmware: 21,
            MgmtIpAddress: 32,
            CPU: 41,
            Interfaces: 40,
            AvailableMemory: 47,
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

  return PanelBuilders.table()
    .setTitle('Server')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('sortBy', [{ displayName: 'ID', desc: false }])
    .setOverrides((builder) => {
      // ID column
      builder.matchFieldsWithName('ID')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '.*0#(.*)', result: { index: 0, text: '$1' } } },
          { type: 'regex', options: { pattern: '(.*)#0', result: { index: 1, text: '$1' } } },
        ]);

      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // Power column
      builder.matchFieldsWithName('Power')
        .overrideCustomFieldConfig('width', 60)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'on#true': { color: 'transparent', index: 0, text: 'On' }, 'on#false': { color: 'semi-dark-yellow', index: 1, text: 'On (BIOS Post incomplete)' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 2, text: 'Off' } } },
        ]);

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'Enabled#Active': { color: 'transparent', index: 0, text: 'Ok' }, 'equipped#Active': { color: 'transparent', index: 1, text: 'Ok' }, 'equipped#DiscoveryFailed': { color: 'semi-dark-red', index: 2, text: 'Discovery Failed' } } },
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
          { type: 'value', options: { IMCBlade: { index: 0, text: 'Blade' }, IMCRack: { index: 1, text: 'Rack' } } },
        ]);
    })
    .build();
}

function getInventoryTab() {
  // Create the three sections: Fabric Interconnect (FI-A and FI-B side by side), Chassis, Server
  const fiAPanel = getFabricInterconnectAPanel();
  const fiBPanel = getFabricInterconnectBPanel();
  const chassisPanel = getChassisInventoryPanel();
  const serverPanel = getServerInventoryPanel();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Fabric Interconnect section header
      new SceneFlexItem({
        height: 30,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### Fabric Interconnect')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
      // FI-A and FI-B side by side
      new SceneFlexItem({
        height: 150,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: fiAPanel }),
            new SceneFlexItem({ width: '50%', body: fiBPanel }),
          ],
        }),
      }),
      // Chassis section
      new SceneFlexItem({
        height: 30,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### Chassis')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
      new SceneFlexItem({
        height: 250,
        body: chassisPanel,
      }),
      // Server section
      new SceneFlexItem({
        height: 30,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### Server')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
      new SceneFlexItem({
        minHeight: 300,
        body: serverPanel,
      }),
    ],
  });
}

function getAlarmsTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Alarms')
          .setOption('content', `
# Alarms Tab

This tab displays domain-specific alarms with:
- DomainName repeat
- Severity color coding
- Time-based filtering

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getActionsTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Actions')
          .setOption('content', `
# Actions Tab

This tab shows domain-specific actions with:
- Workflow status color coding
- Progress gauges
- User and target type mappings

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getPortsTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Ports')
          .setOption('content', `
# Ports Tab

This tab displays port information including:
- A/B switch port analytics
- Uplink port status
- Downlink port status
- Port utilization metrics

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getNetworkUtilizationTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Network Utilization')
          .setOption('content', `
# Network Utilization Tab

This tab has nested sub-tabs:
- **Percentage (%)**: TX/RX utilization per uplink port for FI-A and FI-B
- **Absolute (bps)**: TX/RX throughput per uplink port for FI-A and FI-B

Includes sub-categories:
- Fabric Interconnect Storage Uplinks (Ports & Port Channels)
- Fabric Interconnect Ethernet Uplinks (Ports & Port Channels)
- Fabric Interconnect Downlinks
- IFM Uplinks
- IFM Downlinks

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getTrafficBalanceTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Traffic Balance')
          .setOption('content', `
# Traffic Balance Tab

This tab has nested sub-tabs:
- **Ethernet Overview**: Traffic distribution visualization
- **Ethernet Transmit Details**: Per-domain traffic analysis
- **Ethernet Receive Details**: Per-domain traffic analysis
- **Fibre Channel Overview**: Traffic distribution visualization
- **Fibre Channel Transmit Details**: Per-domain traffic analysis
- **Fibre Channel Receive Details**: Per-domain traffic analysis

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getCongestionTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Congestion')
          .setOption('content', `
# Congestion Tab

This tab monitors pause frames with nested sub-tabs:
- **Sending**: TX pause frames (FI-A and FI-B)
- **Receiving**: RX pause frames (FI-A and FI-B)

Includes sub-categories:
- Fabric Interconnect Ethernet Uplinks (Ports & Port Channels)
- Fabric Interconnect Downlinks
- IFM Downlinks

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getNetworkErrorsTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Network Errors')
          .setOption('content', `
# Network Errors Tab

This tab displays network error information:
- Fabric Interconnect Ethernet Uplinks (Ports & Port Channels)
- Fabric Interconnect Downlinks
- IFM Uplinks
- IFM Downlinks
- Error Descriptions reference

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getSFPTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('SFP')
          .setOption('content', `
# SFP Tab

This tab monitors SFP transceivers:
- Transceiver status table
- SFP health information
- Optical power levels (if applicable)

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getEnvironmentalTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Environmental')
          .setOption('content', `
# Environmental Tab

This tab monitors environmental metrics:
- **Power Supply Status**: Active PSUs per device
- **Domain Power Consumption**: Per Domain, Per FI, Per FI Pair, Per Chassis
- **Host Power Consumption**: Server power metrics
- **Fabric Interconnect Fan Speed**: Fan monitoring
- **Chassis Fan Speed**: Chassis fan monitoring
- **Fabric Interconnect Temperature**: Intake/Exhaust, CPU/ASIC temps
- **Chassis Temperature**: Chassis temperature monitoring
- **Host Temperature**: Temperature and Cooling Budget

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getCPUUtilizationTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('CPU Utilization')
          .setOption('content', `
# CPU Utilization Tab

This tab displays CPU utilization metrics:
- Utilization per Domain
- Top Servers by CPU Utilization

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getStorageTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Storage')
          .setOption('content', `
# Storage Tab

This tab has nested sub-tabs for storage information:
- **Storage Controllers**: Controller inventory and status
- **SSD Disks**: SSD disk information and health
- **HDD Disks**: HDD disk information and health
- **Virtual Drives**: RAID and virtual drive configuration

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

const immDomainTabs = [
  { id: 'overview', label: 'Overview', getBody: getOverviewTab },
  { id: 'inventory', label: 'Inventory', getBody: getInventoryTab },
  { id: 'alarms', label: 'Alarms', getBody: getAlarmsTab },
  { id: 'actions', label: 'Actions', getBody: getActionsTab },
  { id: 'ports', label: 'Ports', getBody: getPortsTab },
  { id: 'network-utilization', label: 'Network Utilization', getBody: getNetworkUtilizationTab },
  { id: 'traffic-balance', label: 'Traffic Balance', getBody: getTrafficBalanceTab },
  { id: 'congestion', label: 'Congestion', getBody: getCongestionTab },
  { id: 'network-errors', label: 'Network Errors', getBody: getNetworkErrorsTab },
  { id: 'sfp', label: 'SFP', getBody: getSFPTab },
  { id: 'environmental', label: 'Environmental', getBody: getEnvironmentalTab },
  { id: 'cpu-utilization', label: 'CPU Utilization', getBody: getCPUUtilizationTab },
  { id: 'storage', label: 'Storage', getBody: getStorageTab },
];

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function getIMMDomainSceneBody() {
  // Create DomainName variable - scoped to IMM Domain tab
  // Queries ElementSummaries with ManagementMode filter
  // Uses regex to extract domain name (removes " FI-A" suffix)
  const domainNameVariable = new QueryVariable({
    name: 'DomainName',
    label: 'Domain',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/network/ElementSummaries?$filter=ManagementMode eq \'Intersight\'',
        root_selector: '$.Results',
        columns: [
          { selector: 'Name', text: 'Name', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
        filters: [],
      },
    },
    isMulti: true,
    includeAll: false,
    maxVisibleValues: 2,
    regex: '(?<text>.*) FI-A', // Extract domain name without " FI-A" suffix
  });

  // Create RegisteredDevices variable - hidden, depends on DomainName
  // Used for filtering in downstream panels
  const registeredDevicesVariable = new QueryVariable({
    name: 'RegisteredDevices',
    label: 'RegisteredDevices',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/asset/DeviceRegistrations?$filter=DeviceHostname in (${DomainName:singlequote})',
        root_selector: '$.Results',
        columns: [
          { selector: 'Moid', text: 'Moid', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
        filters: [],
      },
    },
    isMulti: false,
    includeAll: true,
    hide: 2, // hideVariable = 2 in Scenes
  });

  // Create variable set for IMM Domain tab
  const variables = new SceneVariableSet({
    variables: [domainNameVariable, registeredDevicesVariable],
  });

  // Create the tabbed scene with controls on same line as tabs
  return new TabbedScene({
    $variables: variables,
    tabs: immDomainTabs,
    activeTab: 'overview',
    body: getOverviewTab(),
    controls: [new VariableValueSelectors({})],
  });
}
