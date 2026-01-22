/**
 * CPU Utilization Tab - IMM Domain Scene
 *
 * This module provides the CPU Utilization tab functionality for the IMM Domain scene.
 * Shows CPU utilization metrics for FI with nested tabs for different time ranges and views.
 */

import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';

export function getCPUUtilizationTab() {
  // Panel-7 from original dashboard - combines CPU utilization and temperature data
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      // Query A: CPU Utilization
      {
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
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.host_name', text: 'Host Name', type: 'string' },
          { selector: 'event.utilization', text: 'Utilization', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.cpu"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "utilization",
        "fieldName": "hw.cpu.utilization_c0_max"
      }
    ]
  }`,
        },
      } as any,
      // Query B: CPU 1 Temperature
      {
        refId: 'B',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'timeseries',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '',
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.host_name', text: 'Host Name', type: 'string' },
          { selector: 'event.temperature', text: 'Temperature', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "in",
          "dimension": "hw.temperature.sensor.name",
          "values": [
            "CPU1",
            "P1_TEMP_SENS"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "temperature",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      } as any,
      // Query C: CPU 2 Temperature
      {
        refId: 'C',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'timeseries',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '',
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.host_name', text: 'Host Name', type: 'string' },
          { selector: 'event.temperature', text: 'Temperature', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "in",
          "dimension": "hw.temperature.sensor.name",
          "values": [
            "CPU2",
            "P2_TEMP_SENS"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "temperature",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  // Apply transformations to join data and organize columns
  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
          C: { timeField: 'Time' },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'Host Name',
          mode: 'inner',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            'Domain Name': 0,
            'Host Name': 1,
            'Trend #A': 2,
            'Trend #B': 3,
            'Trend #C': 4,
          },
          renameByName: {
            'Trend #A': 'Utilization',
            'Trend #B': 'CPU 1 Temperature',
            'Trend #C': 'CPU 2 Temperature',
          },
        },
      },
    ],
  });

  // Create table panel with field overrides
  const tablePanel = PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'lg')
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ displayName: 'Utilization', desc: true }])
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Utilization column - sparkline visualization with percentunit and semi-dark-blue color
      builder.matchFieldsWithName('Utilization')
        .overrideCustomFieldConfig('cellOptions', {
          type: TableCellDisplayMode.Sparkline,
        })
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideMax(1)
        .overrideUnit('percentunit')
        .overrideDecimals(1);

      // String columns - set width to 240px
      builder.matchFieldsByType('string')
        .overrideCustomFieldConfig('width', 240);

      // Temperature columns - celsius unit
      builder.matchFieldsWithNameByRegex('/CPU.*Temperature/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: tablePanel,
      }),
    ],
  });
}

// ============================================================================
// STORAGE TAB - Nested tabs for Storage Controllers, SSD, HDD, Virtual Drives
// ============================================================================

// Helper function for Storage Controllers sub-tab (panel-204)
function getStorageControllersPanel() {
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

  const dataTransformer = new SceneDataTransformer({
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
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value',
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              ',': { color: 'orange', index: 3, text: 'NA' },
              'Enabled,Critical': { color: 'dark-red', index: 2, text: 'Critical' },
              'Enabled,OK': { color: 'green', index: 1, text: 'OK' },
              'OK': { color: 'green', index: 0, text: 'OK' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 4, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // SelfEncryptEnabled field
      builder
        .matchFieldsWithName('Self Encryption')
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: '#646464', index: 1, text: 'Not Enabled' },
              true: { color: 'blue', index: 0, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Battery field
      builder
        .matchFieldsWithName('Battery')
        .overrideMappings([
          {
            type: 'value',
            options: {
              true: { color: 'blue', index: 0, text: 'Present' },
            },
          },
          {
            type: 'special',
            options: {
              match: 'null',
              result: { color: '#646464', index: 1, text: 'Not Present' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // InterfaceType field
      builder
        .matchFieldsWithName('InterfaceType')
        .overrideMappings([
          {
            type: 'value',
            options: {
              Nvme: { index: 2, text: 'NVMe' },
              Sas: { index: 0, text: 'SAS' },
              Sata: { index: 1, text: 'SATA' },
            },
          },
        ]);

      // MemoryCorrectableErrors field
      builder
        .matchFieldsWithName('MemoryCorrectableErrors')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'text' },
            { value: 1, color: 'dark-orange' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

// Helper function for SSD Disks sub-tab (panel-205)
function getSSDDisksPanel() {
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
          { selector: 'DiskState + \'/\' + DriveState', text: 'State', type: 'string' },
          { selector: 'OperatingTemperature + \'/\' + MaximumOperatingTemperature', text: 'Temp', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Bootable: true,
            Description: true,
            DisabledForRemoval: true,
            DiskState: true,
            DriveState: true,
            EncryptionStatus: true,
            FdeCapable: true,
            HotSpareType: true,
            IsPlatformSupported: true,
            LinkSpeed: true,
            MaximumOperatingTemperature: true,
            Name: true,
            NonCoercedSizeBytes: true,
            NumBlocks: true,
            OperPowerState: true,
            OperatingTemperature: true,
            ParentBlade: true,
            ParentRackUnit: true,
            PartNumber: true,
            PercentReservedCapacityConsumed: true,
            PerformancePercent: true,
            PowerCycleCount: true,
            PowerOnHours: true,
            PowerOnHoursPercentage: true,
            PredictedMediaLifeLeftPercent: true,
            PredictiveFailureCount: true,
            PreviousFru: true,
            ReadErrorCountThreshold: true,
            RunningFirmware: true,
            ThresholdOperatingTemperature: true,
            Type: true,
            WriteErrorCountThreshold: true,
          },
          includeByName: {},
          indexByName: {
            'Capacity (TB)': 6,
            Controller: 2,
            DiskId: 1,
            FailurePredicted: 11,
            MediaErrorCount: 21,
            Model: 2,
            PercentLifeLeft: 12,
            Presence: 7,
            Protocol: 6,
            ReadIoErrorCount: 22,
            Serial: 4,
            Server: 0,
            Size: 5,
            State: 10,
            Temp: 14,
            WriteIoErrorCount: 23,
          },
          renameByName: {
            DisabledForRemoval: 'Removal',
            DiskId: 'Slot',
            FailurePredicted: 'Failure',
            MediaErrorCount: 'Media Errors',
            OperatingTemperature: '',
            PercentLifeLeft: 'Percent Life Left',
            PowerOnHours: 'Power On Hours',
            ReadIoErrorCount: 'Read IO Errors',
            Server: 'Server',
            Temp: 'Temperature',
            WriteIoErrorCount: 'Write IO Errors',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'lg')
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              good: { color: 'green', index: 0, text: 'Good' },
              online: { color: 'green', index: 1, text: 'Online' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 2, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Life Left field
      builder
        .matchFieldsWithName('Life Left')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Predicted Life field
      builder
        .matchFieldsWithName('Predicted Life')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Reserved Cap Used field
      builder
        .matchFieldsWithName('Reserved Cap Used')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'green' },
            { value: 25, color: 'dark-yellow' },
            { value: 50, color: 'dark-orange' },
            { value: 75, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Wear (days) field
      builder
        .matchFieldsWithName('Wear (days)')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 50, color: 'dark-orange' },
            { value: 100, color: 'dark-yellow' },
            { value: 200, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Temperature field
      builder
        .matchFieldsWithName('OperatingTemperature')
        .overrideUnit('celsius')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'text' },
            { value: 60, color: 'dark-yellow' },
            { value: 70, color: 'dark-orange' },
            { value: 80, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

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
            type: 'value',
            options: {
              'Not Capable': { color: '#646464', index: 0, text: 'Not Capable' },
              'Capable': { color: 'text', index: 1, text: 'Capable' },
              'Enabled': { color: 'blue', index: 2, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value',
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

// Helper function for HDD Disks sub-tab (panel-208)
function getHDDDisksPanel() {
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
          { selector: 'DiskState + \'/\' + DriveState', text: 'State', type: 'string' },
          { selector: 'OperatingTemperature + \'/\' + MaximumOperatingTemperature', text: 'Temp', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Bootable: true,
            Description: true,
            DisabledForRemoval: true,
            DiskState: true,
            DriveState: true,
            EncryptionStatus: true,
            FdeCapable: true,
            HotSpareType: true,
            IsPlatformSupported: true,
            LinkSpeed: true,
            MaximumOperatingTemperature: true,
            Name: true,
            NonCoercedSizeBytes: true,
            NumBlocks: true,
            OperPowerState: true,
            OperatingTemperature: true,
            ParentBlade: true,
            ParentRackUnit: true,
            PartNumber: true,
            PercentReservedCapacityConsumed: true,
            PerformancePercent: true,
            PowerCycleCount: true,
            PowerOnHours: true,
            PowerOnHoursPercentage: true,
            PredictedMediaLifeLeftPercent: true,
            PredictiveFailureCount: true,
            PreviousFru: true,
            ReadErrorCountThreshold: true,
            RunningFirmware: true,
            ThresholdOperatingTemperature: true,
            Type: true,
            WriteErrorCountThreshold: true,
          },
          includeByName: {},
          indexByName: {
            'Capacity (TB)': 6,
            Controller: 2,
            DiskId: 1,
            FailurePredicted: 11,
            MediaErrorCount: 21,
            Model: 2,
            PercentLifeLeft: 12,
            Presence: 7,
            Protocol: 6,
            ReadIoErrorCount: 22,
            Serial: 4,
            Server: 0,
            Size: 5,
            State: 10,
            Temp: 14,
            WriteIoErrorCount: 23,
          },
          renameByName: {
            DisabledForRemoval: 'Removal',
            DiskId: 'Slot',
            FailurePredicted: 'Failure',
            MediaErrorCount: 'Media Errors',
            OperatingTemperature: '',
            PercentLifeLeft: 'Percent Life Left',
            PowerOnHours: 'Power On Hours',
            ReadIoErrorCount: 'Read IO Errors',
            Server: 'Server',
            Temp: 'Temperature',
            WriteIoErrorCount: 'Write IO Errors',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'lg')
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              good: { color: 'green', index: 0, text: 'Good' },
              online: { color: 'green', index: 1, text: 'Online' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 2, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Life Left field
      builder
        .matchFieldsWithName('Life Left')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Predicted Life field
      builder
        .matchFieldsWithName('Predicted Life')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Reserved Cap Used field
      builder
        .matchFieldsWithName('Reserved Cap Used')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'green' },
            { value: 25, color: 'dark-yellow' },
            { value: 50, color: 'dark-orange' },
            { value: 75, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Wear (days) field
      builder
        .matchFieldsWithName('Wear (days)')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 50, color: 'dark-orange' },
            { value: 100, color: 'dark-yellow' },
            { value: 200, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Temperature field
      builder
        .matchFieldsWithName('OperatingTemperature')
        .overrideUnit('celsius')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'text' },
            { value: 60, color: 'dark-yellow' },
            { value: 70, color: 'dark-orange' },
            { value: 80, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

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
            type: 'value',
            options: {
              'Not Capable': { color: '#646464', index: 0, text: 'Not Capable' },
              'Capable': { color: 'text', index: 1, text: 'Capable' },
              'Enabled': { color: 'blue', index: 2, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value',
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

// Helper function for Virtual Drives sub-tab (panel-206)
function getVirtualDrivesPanel() {
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

  const dataTransformer = new SceneDataTransformer({
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
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              optimal: { color: 'green', index: 0, text: 'Optimal' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 1, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // ConfigState field
      builder
        .matchFieldsWithName('ConfigState')
        .overrideMappings([
          {
            type: 'value',
            options: {
              applied: { color: 'green', index: 0, text: 'Applied' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 1, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Bootable field
      builder
        .matchFieldsWithName('Bootable')
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: '#646464', index: 1, text: 'No' },
              true: { color: 'blue', index: 0, text: 'Yes' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // DriveSecurity field
      builder
        .matchFieldsWithName('DriveSecurity')
        .overrideMappings([
          {
            type: 'value',
            options: {
              Disabled: { color: '#646464', index: 0, text: 'Disabled' },
              Enabled: { color: 'blue', index: 1, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

