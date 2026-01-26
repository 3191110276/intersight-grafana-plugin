/**
 * Storage Tab - IMM Domain Scene
 *
 * This module provides the Storage tab functionality for the IMM Domain scene.
 * Shows storage metrics for FI including memory utilization.
 */

import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { TabbedScene } from '../../components/TabbedScene';

export function getStorageControllersPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/storage/Controllers?$top=1000&$filter=Owners in (${RegisteredDevices:singlequote})&$expand=BackupBatteryUnit,ComputeBlade,ComputeRackUnit,ComputeBoard($expand=ComputeBlade,ComputeRackUnit)',
        root_selector: '$.Results',
        columns: [
          { selector: 'BackupBatteryUnit.IsBatteryPresent', text: 'BackupBatteryUnitPresence', type: 'string' },
          { selector: 'ComputeBlade.Name', text: 'ComputeBlade', type: 'string' },
          { selector: 'ComputeBoard', text: '', type: 'string' },
          { selector: 'ComputeRackUnit.Name', text: 'ComputeRackUnit', type: 'string' },
          { selector: 'ConnectedSasExpander', text: '', type: 'string' },
          { selector: 'ControllerFlags', text: '', type: 'string' },
          { selector: 'ControllerId', text: '', type: 'string' },
          { selector: 'ControllerStatus', text: '', type: 'string' },
          { selector: 'DefaultDriveMode', text: '', type: 'string' },
          { selector: 'DiskGroup', text: '', type: 'string' },
          { selector: 'DiskSlot', text: '', type: 'string' },
          { selector: 'EccBucketLeakRate', text: '', type: 'string' },
          { selector: 'HwRevision', text: '', type: 'string' },
          { selector: 'InterfaceType', text: '', type: 'string' },
          { selector: 'MaxVolumesSupported', text: '', type: 'string' },
          { selector: 'MemoryCorrectableErrors', text: '', type: 'string' },
          { selector: 'Model', text: '', type: 'string' },
          { selector: 'OobInterfaceSupported', text: '', type: 'string' },
          { selector: 'OperReason', text: '', type: 'string' },
          { selector: 'OperState', text: '', type: 'string' },
          { selector: 'PciSlot', text: '', type: 'string' },
          { selector: 'PhysicalDisks', text: '', type: 'string' },
          { selector: 'Presence', text: '', type: 'string' },
          { selector: 'PreviousFru', text: '', type: 'string' },
          { selector: 'RaidSupport', text: '', type: 'string' },
          { selector: 'RebuildRate', text: '', type: 'string' },
          { selector: 'RebuildRatePercent', text: '', type: 'string' },
          { selector: 'RunningFirmware', text: '', type: 'string' },
          { selector: 'SelfEncryptEnabled', text: '', type: 'string' },
          { selector: 'Serial', text: '', type: 'string' },
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'VirtualDrives', text: '', type: 'string' },
          { selector: 'ComputeBoard.ComputeBlade.Name', text: 'ComputeBoardBlade', type: 'string' },
          { selector: 'ComputeBoard.ComputeRackUnit.Name', text: 'ComputeBoardRackUnit', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ComputeBlade + ComputeRackUnit + ComputeBoardBlade + ComputeBoardRackUnit', text: 'Server', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            ComputeBlade: true,
            ComputeBoard: true,
            ComputeBoardBlade: true,
            ComputeBoardRackUnit: true,
            ComputeRackUnit: true,
            ConnectedSasExpander: true,
            ControllerFlags: true,
            ControllerId: true,
            ControllerStatus: true,
            DefaultDriveMode: true,
            DiskGroup: true,
            DiskSlot: true,
            EccBucketLeakRate: true,
            HwRevision: true,
            MaxVolumesSupported: true,
            OobInterfaceSupported: true,
            OperReason: true,
            PhysicalDisks: true,
            PreviousFru: true,
            RaidSupport: true,
            RebuildRate: true,
            RebuildRatePercent: true,
            RunningFirmware: true,
            Type: true,
            VirtualDrives: true,
          },
          includeByName: {},
          indexByName: {
            BackupBatteryUnitPresence: 10,
            ComputeBlade: 11,
            ComputeBoard: 12,
            ComputeBoardBlade: 13,
            ComputeBoardRackUnit: 14,
            ComputeRackUnit: 15,
            ConnectedSasExpander: 16,
            ControllerFlags: 17,
            ControllerId: 18,
            ControllerStatus: 4,
            DefaultDriveMode: 19,
            DiskGroup: 20,
            DiskSlot: 21,
            EccBucketLeakRate: 22,
            HwRevision: 23,
            InterfaceType: 7,
            MaxVolumesSupported: 24,
            MemoryCorrectableErrors: 25,
            Model: 1,
            OobInterfaceSupported: 26,
            OperReason: 6,
            OperState: 3,
            PciSlot: 8,
            PhysicalDisks: 27,
            Presence: 2,
            PreviousFru: 28,
            RaidSupport: 29,
            RebuildRate: 30,
            RebuildRatePercent: 31,
            RunningFirmware: 32,
            SelfEncryptEnabled: 9,
            Serial: 5,
            Server: 0,
            Type: 33,
            VirtualDrives: 34,
          },
          renameByName: {
            BackupBatteryUnitPresence: 'Battery',
            MemoryCorrectableErrors: '',
            OperState: 'State',
            PciSlot: 'PCI Slot',
            RebuildRatePercent: 'Rebuild Rate',
            SelfEncryptEnabled: 'Self Encryption',
            asdf: '',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm' as any)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Presence')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      builder
        .matchFieldsWithName('State')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              '': { color: 'dark-yellow', index: 4, text: 'Unknown' },
              ',': { color: 'orange', index: 3, text: 'NA' },
              'Enabled,Critical': { color: 'dark-red', index: 2, text: 'Critical' },
              'Enabled,OK': { color: 'green', index: 1, text: 'OK' },
              'OK': { color: 'green', index: 0, text: 'OK' },
            },
          },
          {
            type: 'regex' as any,
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 5, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      builder
        .matchFieldsWithName('Self Encryption')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              no: { color: '#646464', index: 0, text: 'No' },
              yes: { color: 'blue', index: 1, text: 'Yes' },
              false: { color: '#646464', index: 2, text: 'No' },
              true: { color: 'blue', index: 3, text: 'Yes' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      builder
        .matchFieldsWithName('Battery')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              true: { color: 'blue', index: 0, text: 'Present' },
            },
          },
          {
            type: 'special' as any as any,
            options: {
              match: 'null' as any as any,
              result: { color: '#646464', index: 1, text: 'Not Present' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      builder
        .matchFieldsWithName('InterfaceType')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              Nvme: { index: 2, text: 'NVMe' },
              Sas: { index: 0, text: 'SAS' },
              Sata: { index: 1, text: 'SATA' },
            },
          },
        ]);

      builder
        .matchFieldsWithName('MemoryCorrectableErrors')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'text' },
            { value: 1, color: 'dark-orange' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      return builder.build();
    })
    .build();

  return panel;
}

// Helper function for SSD Disks sub-tab (panel-205)
export function getSSDDisksPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/storage/PhysicalDisks?$top=1000&$filter=Type eq \'SSD\' and Owners in (${RegisteredDevices:singlequote})&$expand=Parent($expand=Parent($expand=ComputeBlade,ComputeRackUnit))',
        root_selector: '$.Results',
        columns: [
          { selector: 'Bootable', text: '', type: 'string' },
          { selector: 'Description', text: '', type: 'string' },
          { selector: 'DisabledForRemoval', text: '', type: 'string' },
          { selector: 'DiskId', text: '', type: 'string' },
          { selector: 'DiskState', text: '', type: 'string' },
          { selector: 'DriveState', text: '', type: 'string' },
          { selector: 'EncryptionStatus', text: '', type: 'string' },
          { selector: 'FailurePredicted', text: '', type: 'string' },
          { selector: 'FdeCapable', text: '', type: 'string' },
          { selector: 'HotSpareType', text: '', type: 'string' },
          { selector: 'IsPlatformSupported', text: '', type: 'string' },
          { selector: 'LinkSpeed', text: '', type: 'string' },
          { selector: 'MaximumOperatingTemperature', text: '', type: 'string' },
          { selector: 'MediaErrorCount', text: '', type: 'string' },
          { selector: 'Model', text: '', type: 'string' },
          { selector: 'Name', text: '', type: 'string' },
          { selector: 'NonCoercedSizeBytes', text: '', type: 'string' },
          { selector: 'NumBlocks', text: '', type: 'string' },
          { selector: 'OperPowerState', text: '', type: 'string' },
          { selector: 'OperatingTemperature', text: '', type: 'string' },
          { selector: 'PartNumber', text: '', type: 'string' },
          { selector: 'PercentLifeLeft', text: '', type: 'string' },
          { selector: 'PercentReservedCapacityConsumed', text: '', type: 'string' },
          { selector: 'PerformancePercent', text: '', type: 'string' },
          { selector: 'PowerCycleCount', text: '', type: 'string' },
          { selector: 'PowerOnHours', text: '', type: 'string' },
          { selector: 'PowerOnHoursPercentage', text: '', type: 'string' },
          { selector: 'PredictedMediaLifeLeftPercent', text: '', type: 'string' },
          { selector: 'PredictiveFailureCount', text: '', type: 'string' },
          { selector: 'Presence', text: '', type: 'string' },
          { selector: 'PreviousFru', text: '', type: 'string' },
          { selector: 'Protocol', text: '', type: 'string' },
          { selector: 'ReadErrorCountThreshold', text: '', type: 'string' },
          { selector: 'ReadIoErrorCount', text: '', type: 'string' },
          { selector: 'RunningFirmware', text: '', type: 'string' },
          { selector: 'Serial', text: '', type: 'string' },
          { selector: 'Size', text: '', type: 'string' },
          { selector: 'ThresholdOperatingTemperature', text: '', type: 'string' },
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'WearStatusInDays', text: '', type: 'string' },
          { selector: 'WriteErrorCountThreshold', text: '', type: 'string' },
          { selector: 'WriteIoErrorCount', text: '', type: 'string' },
          { selector: 'Parent.Parent.ComputeBlade.Name', text: 'ParentBlade', type: 'string' },
          { selector: 'Parent.Parent.ComputeRackUnit.Name', text: 'ParentRackUnit', type: 'string' },
          { selector: 'Parent.StorageController.Name', text: 'StorageControllerName', type: 'string' },
          { selector: 'Parent.StorageController.Model', text: 'StorageControllerModel', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ParentBlade + ParentRackUnit', text: 'Server', type: 'string' },
          { selector: 'StorageControllerName + \' \' + StorageControllerModel', text: 'Controller', type: 'string' },
          { selector: '(((NonCoercedSizeBytes / 1024) / 1024) / 1024) / 1024', text: 'Capacity (TB)', type: 'number' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Bootable: true,
            Description: true,
            DisabledForRemoval: true,
            FdeCapable: true,
            IsPlatformSupported: true,
            LinkSpeed: true,
            MaximumOperatingTemperature: true,
            NonCoercedSizeBytes: true,
            NumBlocks: true,
            OperPowerState: true,
            PartNumber: true,
            ParentBlade: true,
            ParentRackUnit: true,
            PowerCycleCount: true,
            PowerOnHours: true,
            PreviousFru: true,
            Protocol: true,
            ReadErrorCountThreshold: true,
            RunningFirmware: true,
            StorageControllerModel: true,
            StorageControllerName: true,
            ThresholdOperatingTemperature: true,
            Type: true,
            WriteErrorCountThreshold: true,
          },
          includeByName: {},
          indexByName: {
            'Capacity (TB)': 6,
            Controller: 2,
            DiskId: 3,
            DiskState: 5,
            DriveState: 15,
            EncryptionStatus: 16,
            FailurePredicted: 17,
            HotSpareType: 18,
            MediaErrorCount: 19,
            Model: 7,
            Name: 4,
            OperatingTemperature: 9,
            PercentLifeLeft: 10,
            PercentReservedCapacityConsumed: 11,
            PerformancePercent: 20,
            PowerOnHoursPercentage: 21,
            PredictedMediaLifeLeftPercent: 12,
            PredictiveFailureCount: 22,
            Presence: 23,
            ReadIoErrorCount: 24,
            Serial: 8,
            Server: 1,
            Size: 25,
            WearStatusInDays: 13,
            WriteIoErrorCount: 26,
          },
          renameByName: {
            DiskState: 'State',
            Name: 'Disk',
            PercentLifeLeft: 'Life Left',
            PercentReservedCapacityConsumed: 'Reserved Cap Used',
            PredictedMediaLifeLeftPercent: 'Predicted Life',
            WearStatusInDays: 'Wear (days)',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'lg' as any)
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              good: { color: 'green', index: 0, text: 'Good' },
              online: { color: 'green', index: 1, text: 'Online' },
            },
          },
          {
            type: 'regex' as any,
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 2, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // Life Left field
      builder
        .matchFieldsWithName('Life Left')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any });

      // Predicted Life field
      builder
        .matchFieldsWithName('Predicted Life')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any });

      // Reserved Cap Used field
      builder
        .matchFieldsWithName('Reserved Cap Used')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'green' },
            { value: 25, color: 'dark-yellow' },
            { value: 50, color: 'dark-orange' },
            { value: 75, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any });

      // Wear (days) field
      builder
        .matchFieldsWithName('Wear (days)')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 50, color: 'dark-orange' },
            { value: 100, color: 'dark-yellow' },
            { value: 200, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any });

      // Temperature field
      builder
        .matchFieldsWithName('OperatingTemperature')
        .overrideUnit('celsius')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'text' },
            { value: 60, color: 'dark-yellow' },
            { value: 70, color: 'dark-orange' },
            { value: 80, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // Capacity field
      builder
        .matchFieldsWithName('Capacity (TB)')
        .overrideDecimals(2);

      // Serial field
      builder
        .matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', 150);

      // Controller field
      builder
        .matchFieldsWithName('Controller')
        .overrideCustomFieldConfig('width', 200);

      // Server field
      builder
        .matchFieldsWithName('Server')
        .overrideCustomFieldConfig('width', 150);

      // Disk field
      builder
        .matchFieldsWithName('Disk')
        .overrideCustomFieldConfig('width', 100);

      // DiskId field
      builder
        .matchFieldsWithName('DiskId')
        .overrideCustomFieldConfig('width', 80);

      // Model field
      builder
        .matchFieldsWithName('Model')
        .overrideCustomFieldConfig('width', 200);

      // EncryptionStatus field
      builder
        .matchFieldsWithName('EncryptionStatus')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              'Not Capable': { color: '#646464', index: 0, text: 'Not Capable' },
              'Capable': { color: 'text', index: 1, text: 'Capable' },
              'Enabled': { color: 'blue', index: 2, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      return builder.build();
    })
    .build();

  return panel;
}

// Helper function for HDD Disks sub-tab (panel-208)
export function getHDDDisksPanel() {
  // HDD panel is nearly identical to SSD panel, just with Type eq 'HDD' filter
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/storage/PhysicalDisks?$top=1000&$filter=Type eq \'HDD\' and Owners in (${RegisteredDevices:singlequote})&$expand=Parent($expand=Parent($expand=ComputeBlade,ComputeRackUnit))',
        root_selector: '$.Results',
        columns: [
          { selector: 'Bootable', text: '', type: 'string' },
          { selector: 'Description', text: '', type: 'string' },
          { selector: 'DisabledForRemoval', text: '', type: 'string' },
          { selector: 'DiskId', text: '', type: 'string' },
          { selector: 'DiskState', text: '', type: 'string' },
          { selector: 'DriveState', text: '', type: 'string' },
          { selector: 'EncryptionStatus', text: '', type: 'string' },
          { selector: 'FailurePredicted', text: '', type: 'string' },
          { selector: 'FdeCapable', text: '', type: 'string' },
          { selector: 'HotSpareType', text: '', type: 'string' },
          { selector: 'IsPlatformSupported', text: '', type: 'string' },
          { selector: 'LinkSpeed', text: '', type: 'string' },
          { selector: 'MaximumOperatingTemperature', text: '', type: 'string' },
          { selector: 'MediaErrorCount', text: '', type: 'string' },
          { selector: 'Model', text: '', type: 'string' },
          { selector: 'Name', text: '', type: 'string' },
          { selector: 'NonCoercedSizeBytes', text: '', type: 'string' },
          { selector: 'NumBlocks', text: '', type: 'string' },
          { selector: 'OperPowerState', text: '', type: 'string' },
          { selector: 'OperatingTemperature', text: '', type: 'string' },
          { selector: 'PartNumber', text: '', type: 'string' },
          { selector: 'PercentLifeLeft', text: '', type: 'string' },
          { selector: 'PercentReservedCapacityConsumed', text: '', type: 'string' },
          { selector: 'PerformancePercent', text: '', type: 'string' },
          { selector: 'PowerCycleCount', text: '', type: 'string' },
          { selector: 'PowerOnHours', text: '', type: 'string' },
          { selector: 'PowerOnHoursPercentage', text: '', type: 'string' },
          { selector: 'PredictedMediaLifeLeftPercent', text: '', type: 'string' },
          { selector: 'PredictiveFailureCount', text: '', type: 'string' },
          { selector: 'Presence', text: '', type: 'string' },
          { selector: 'PreviousFru', text: '', type: 'string' },
          { selector: 'Protocol', text: '', type: 'string' },
          { selector: 'ReadErrorCountThreshold', text: '', type: 'string' },
          { selector: 'ReadIoErrorCount', text: '', type: 'string' },
          { selector: 'RunningFirmware', text: '', type: 'string' },
          { selector: 'Serial', text: '', type: 'string' },
          { selector: 'Size', text: '', type: 'string' },
          { selector: 'ThresholdOperatingTemperature', text: '', type: 'string' },
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'WearStatusInDays', text: '', type: 'string' },
          { selector: 'WriteErrorCountThreshold', text: '', type: 'string' },
          { selector: 'WriteIoErrorCount', text: '', type: 'string' },
          { selector: 'Parent.Parent.ComputeBlade.Name', text: 'ParentBlade', type: 'string' },
          { selector: 'Parent.Parent.ComputeRackUnit.Name', text: 'ParentRackUnit', type: 'string' },
          { selector: 'Parent.StorageController.Name', text: 'StorageControllerName', type: 'string' },
          { selector: 'Parent.StorageController.Model', text: 'StorageControllerModel', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ParentBlade + ParentRackUnit', text: 'Server', type: 'string' },
          { selector: 'StorageControllerName + \' \' + StorageControllerModel', text: 'Controller', type: 'string' },
          { selector: '(((NonCoercedSizeBytes / 1024) / 1024) / 1024) / 1024', text: 'Capacity (TB)', type: 'number' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Bootable: true,
            Description: true,
            DisabledForRemoval: true,
            FdeCapable: true,
            IsPlatformSupported: true,
            LinkSpeed: true,
            MaximumOperatingTemperature: true,
            NonCoercedSizeBytes: true,
            NumBlocks: true,
            OperPowerState: true,
            PartNumber: true,
            ParentBlade: true,
            ParentRackUnit: true,
            PowerCycleCount: true,
            PowerOnHours: true,
            PreviousFru: true,
            Protocol: true,
            ReadErrorCountThreshold: true,
            RunningFirmware: true,
            StorageControllerModel: true,
            StorageControllerName: true,
            ThresholdOperatingTemperature: true,
            Type: true,
            WriteErrorCountThreshold: true,
          },
          includeByName: {},
          indexByName: {
            'Capacity (TB)': 6,
            Controller: 2,
            DiskId: 3,
            DiskState: 5,
            DriveState: 15,
            EncryptionStatus: 16,
            FailurePredicted: 17,
            HotSpareType: 18,
            MediaErrorCount: 19,
            Model: 7,
            Name: 4,
            OperatingTemperature: 9,
            PercentLifeLeft: 10,
            PercentReservedCapacityConsumed: 11,
            PerformancePercent: 20,
            PowerOnHoursPercentage: 21,
            PredictedMediaLifeLeftPercent: 12,
            PredictiveFailureCount: 22,
            Presence: 23,
            ReadIoErrorCount: 24,
            Serial: 8,
            Server: 1,
            Size: 25,
            WearStatusInDays: 13,
            WriteIoErrorCount: 26,
          },
          renameByName: {
            DiskState: 'State',
            Name: 'Disk',
            PercentLifeLeft: 'Life Left',
            PercentReservedCapacityConsumed: 'Reserved Cap Used',
            PredictedMediaLifeLeftPercent: 'Predicted Life',
            WearStatusInDays: 'Wear (days)',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'lg' as any)
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              good: { color: 'green', index: 0, text: 'Good' },
              online: { color: 'green', index: 1, text: 'Online' },
            },
          },
          {
            type: 'regex' as any,
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 2, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // Life Left field
      builder
        .matchFieldsWithName('Life Left')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any });

      // Predicted Life field
      builder
        .matchFieldsWithName('Predicted Life')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any });

      // Reserved Cap Used field
      builder
        .matchFieldsWithName('Reserved Cap Used')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'green' },
            { value: 25, color: 'dark-yellow' },
            { value: 50, color: 'dark-orange' },
            { value: 75, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any });

      // Wear (days) field
      builder
        .matchFieldsWithName('Wear (days)')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 50, color: 'dark-orange' },
            { value: 100, color: 'dark-yellow' },
            { value: 200, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' as any as any });

      // Temperature field
      builder
        .matchFieldsWithName('OperatingTemperature')
        .overrideUnit('celsius')
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: 0, color: 'text' },
            { value: 60, color: 'dark-yellow' },
            { value: 70, color: 'dark-orange' },
            { value: 80, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // Capacity field
      builder
        .matchFieldsWithName('Capacity (TB)')
        .overrideDecimals(2);

      // Serial field
      builder
        .matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', 150);

      // Controller field
      builder
        .matchFieldsWithName('Controller')
        .overrideCustomFieldConfig('width', 200);

      // Server field
      builder
        .matchFieldsWithName('Server')
        .overrideCustomFieldConfig('width', 150);

      // Disk field
      builder
        .matchFieldsWithName('Disk')
        .overrideCustomFieldConfig('width', 100);

      // DiskId field
      builder
        .matchFieldsWithName('DiskId')
        .overrideCustomFieldConfig('width', 80);

      // Model field
      builder
        .matchFieldsWithName('Model')
        .overrideCustomFieldConfig('width', 200);

      // EncryptionStatus field
      builder
        .matchFieldsWithName('EncryptionStatus')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              'Not Capable': { color: '#646464', index: 0, text: 'Not Capable' },
              'Capable': { color: 'text', index: 1, text: 'Capable' },
              'Enabled': { color: 'blue', index: 2, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      return builder.build();
    })
    .build();

  return panel;
}

// Helper function for Virtual Drives sub-tab (panel-206)
export function getVirtualDrivesPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/storage/VirtualDrives?$top=1000&$filter=Owners in (${RegisteredDevices:singlequote})&$expand=StorageController,Parent($expand=Parent($expand=ComputeBlade,ComputeRackUnit))',
        root_selector: '$.Results',
        columns: [
          { selector: 'AccessPolicy', text: '', type: 'string' },
          { selector: 'Bootable', text: '', type: 'string' },
          { selector: 'ConfigState', text: '', type: 'string' },
          { selector: 'Description', text: '', type: 'string' },
          { selector: 'DriveCache', text: '', type: 'string' },
          { selector: 'DriveState', text: '', type: 'string' },
          { selector: 'DriveSecurity', text: '', type: 'string' },
          { selector: 'Id', text: '', type: 'string' },
          { selector: 'IoPolicy', text: '', type: 'string' },
          { selector: 'Name', text: '', type: 'string' },
          { selector: 'OperState', text: '', type: 'string' },
          { selector: 'Presence', text: '', type: 'string' },
          { selector: 'ReadPolicy', text: '', type: 'string' },
          { selector: 'Size', text: '', type: 'string' },
          { selector: 'StripSize', text: '', type: 'string' },
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'VirtualDriveId', text: '', type: 'string' },
          { selector: 'WritePolicy', text: '', type: 'string' },
          { selector: 'StorageController.Model', text: 'StorageControllerModel', type: 'string' },
          { selector: 'StorageController.Name', text: 'StorageControllerName', type: 'string' },
          { selector: 'Parent.Parent.ComputeBlade.Name', text: 'ParentBlade', type: 'string' },
          { selector: 'Parent.Parent.ComputeRackUnit.Name', text: 'ParentRackUnit', type: 'string' },
          { selector: 'Parent.StorageController.Name', text: 'PhysicalDiskControllerName', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ParentBlade + ParentRackUnit', text: 'Server', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Description: true,
            DriveCache: true,
            Id: true,
            ParentBlade: true,
            ParentRackUnit: true,
            PhysicalDiskControllerName: true,
            StripSize: true,
            StorageControllerModel: true,
            StorageControllerName: true,
          },
          includeByName: {},
          indexByName: {
            AccessPolicy: 8,
            Bootable: 9,
            ConfigState: 4,
            DriveState: 3,
            DriveSecurity: 10,
            IoPolicy: 11,
            Name: 2,
            OperState: 12,
            Presence: 13,
            ReadPolicy: 14,
            Server: 1,
            Size: 6,
            Type: 5,
            VirtualDriveId: 0,
            WritePolicy: 7,
          },
          renameByName: {
            DriveState: 'State',
            Type: 'RAID Type',
            VirtualDriveId: 'ID',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm' as any)
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              optimal: { color: 'green', index: 0, text: 'Optimal' },
            },
          },
          {
            type: 'regex' as any,
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 1, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // ConfigState field
      builder
        .matchFieldsWithName('ConfigState')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              applied: { color: 'green', index: 0, text: 'Applied' },
            },
          },
          {
            type: 'regex' as any,
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 1, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // Bootable field
      builder
        .matchFieldsWithName('Bootable')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              false: { color: '#646464', index: 1, text: 'No' },
              true: { color: 'blue', index: 0, text: 'Yes' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // DriveSecurity field
      builder
        .matchFieldsWithName('DriveSecurity')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              Disabled: { color: '#646464', index: 0, text: 'Disabled' },
              Enabled: { color: 'blue', index: 1, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      return builder.build();
    })
    .build();

  return panel;
}

export function getStorageTab() {
  // Create nested tabs for Storage sub-sections
  const storageControllerTab = getStorageControllersPanel();
  const ssdDisksTab = getSSDDisksPanel();
  const hddDisksTab = getHDDDisksPanel();
  const virtualDrivesTab = getVirtualDrivesPanel();

  const storageTabs = new TabbedScene({
    tabs: [
      { id: 'storage-controllers', label: 'Storage Controllers', getBody: () => storageControllerTab },
      { id: 'ssd-disks', label: 'SSD Disks', getBody: () => ssdDisksTab },
      { id: 'hdd-disks', label: 'HDD Disks', getBody: () => hddDisksTab },
      { id: 'virtual-drives', label: 'Virtual Drives', getBody: () => virtualDrivesTab },
    ],
    activeTab: 'storage-controllers',
    body: storageControllerTab,
  });

  // Return the TabbedScene directly
  return storageTabs;
}
