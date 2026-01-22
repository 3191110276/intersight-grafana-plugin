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

export function getInventoryTab() {
  // Return the dynamic inventory scene that creates tabs based on DomainName variable selection
  return new DynamicInventoryScene({});
}

// ============================================================================
// HELPER PANEL FUNCTIONS
// ============================================================================

function getFabricInterconnectAPanel(domainName?: string) {
  // Query for FI-A (panel-171 from original dashboard)
  // If domainName is provided, hardcode it in the query; otherwise use the variable
  const filterClause = domainName
    ? `Name eq '${domainName} FI-A'`
    : `Name eq '\${DomainName} FI-A'`;

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
        url: `/api/v1/network/ElementSummaries?$filter=${filterClause}&$top=1000`,
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

function getFabricInterconnectBPanel(domainName?: string) {
  // Query for FI-B (panel-172 from original dashboard)
  // If domainName is provided, hardcode it in the query; otherwise use the variable
  const filterClause = domainName
    ? `Name eq '${domainName} FI-B'`
    : `Name eq '\${DomainName} FI-B'`;

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
        url: `/api/v1/network/ElementSummaries?$filter=${filterClause}&$top=1000`,
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

function getChassisInventoryPanel(domainName?: string) {
  // Query for Chassis (panel-170 from original dashboard)
  // If domainName is provided, hardcode it in the query; otherwise use the variable
  const filterClause = domainName
    ? `startswith(Name, '${domainName}')`
    : `startswith(Name, '\${DomainName}')`;

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

function getServerInventoryPanel(domainName?: string) {
  // Query for Servers (panel-169 from original dashboard)
  // If domainName is provided, hardcode it in the query; otherwise use the variable
  const filterClause = domainName
    ? `startswith(Name, '${domainName}')`
    : `startswith(Name, '\${DomainName}')`;

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

// ============================================================================
// DYNAMIC INVENTORY SCENE
// ============================================================================

interface DynamicInventorySceneState extends SceneObjectState {
  domainTabs: Array<{ id: string; label: string; getBody: () => any }>;
  activeTab: string;
  body: any;
}

/**
 * DynamicInventoryScene - Custom scene that reads the DomainName variable
 * and creates a tab for each selected domain with domain-specific inventory panels.
 */
class DynamicInventoryScene extends SceneObjectBase<DynamicInventorySceneState> {
  public static Component = DynamicInventorySceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildTabs();
      }
    },
  });

  public constructor(state: Partial<DynamicInventorySceneState>) {
    super({
      domainTabs: [],
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

    // Get the DomainName variable from the scene's variable set
    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('DomainName variable not found or not a query variable');
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let domainNames: string[] = [];

    if (Array.isArray(value)) {
      domainNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      domainNames = [String(value)];
    }

    // If no domains selected, show a message
    if (domainNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Domains Selected\n\nPlease select one or more domains from the Domain filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({
        domainTabs: [],
        activeTab: '',
        body: emptyBody,
      });
      return;
    }

    // Create a tab for each domain
    const newTabs = domainNames.map((domainName) => ({
      id: domainName,
      label: domainName,
      getBody: () => createDomainInventoryBody(domainName),
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
      domainTabs: newTabs,
      activeTab: newActiveTab,
      body: newBody,
    });
  }

  public setActiveTab(tabId: string) {
    const tab = this.state.domainTabs.find((t) => t.id === tabId);
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
 * Creates the inventory layout for a specific domain
 */
function createDomainInventoryBody(domainName: string) {
  const fiAPanel = getFabricInterconnectAPanel(domainName);
  const fiBPanel = getFabricInterconnectBPanel(domainName);
  const chassisPanel = getChassisInventoryPanel(domainName);
  const serverPanel = getServerInventoryPanel(domainName);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Fabric Interconnect section header
      new SceneFlexItem({
        height: 30,
        ySizing: 'content',
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
        ySizing: 'content',
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
      // Server section
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
  const { domainTabs, activeTab, body } = model.useState();

  // If no tabs, just render the body (which contains the "no selection" message)
  if (domainTabs.length === 0) {
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
          {domainTabs.map((tab) => (
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
