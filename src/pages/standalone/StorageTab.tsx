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
import React from 'react';
import { TabbedScene } from '../../components/TabbedScene';

// DynamicStorageScene class to handle variable dependencies
interface DynamicStorageSceneState extends SceneObjectState {
  body: TabbedScene;
}

class DynamicStorageScene extends SceneObjectBase<DynamicStorageSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ServerName', 'RegisteredDevices'],
    onReferencedVariableValueChanged: () => {
      this.rebuildBody();
    },
  });

  public static Component = ({ model }: SceneComponentProps<DynamicStorageScene>) => {
    const { body } = model.useState();
    return <body.Component model={body} />;
  };

  public activate() {
    super.activate();
    // Trigger initial rebuild once the scene is connected to the parent
    this.rebuildBody();
  }

  private rebuildBody() {
    // Access ServerName variable using `this` instead of getRoot()
    const serverNameVariable = sceneGraph.lookupVariable('ServerName', this);
    if (!serverNameVariable) {
      // Variable not found, use default (no hiding)
      this.buildBodyWithDefaults();
      return;
    }

    // Check if single server is selected
    const serverNameValue = serverNameVariable.getValue();
    const isSingleServer = Array.isArray(serverNameValue) && serverNameValue.length === 1;
    const shouldHideServerColumn = isSingleServer;
    const serverName = isSingleServer ? String(serverNameValue[0]) : '';

    // APPROACH B: Extract Moid values from RegisteredDevices variable
    // Access the variable's query results directly, not the selected value
    const registeredDevicesVariable = sceneGraph.lookupVariable('RegisteredDevices', this);
    let moidFilter: string | undefined = undefined;

    if (registeredDevicesVariable && 'state' in registeredDevicesVariable) {
      let moids: string[] = [];

      // Access the variable's options (all query results)
      const varState = registeredDevicesVariable.state as any;

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

    // Rebuild panels with updated flags and moidFilter
    const storageControllerTab = getStorageControllersPanel(shouldHideServerColumn, serverName, moidFilter);
    const ssdDisksTab = getSSDDisksPanel(shouldHideServerColumn, serverName, moidFilter);
    const virtualDrivesTab = getVirtualDrivesPanel(shouldHideServerColumn, serverName, moidFilter);

    // Create new TabbedScene with updated panels
    const newBody = new TabbedScene({
      tabs: [
        { id: 'storage-controllers', label: 'Storage Controllers', getBody: () => storageControllerTab },
        { id: 'ssd-disks', label: 'SSD Disks', getBody: () => ssdDisksTab },
        { id: 'virtual-drives', label: 'Virtual Drives', getBody: () => virtualDrivesTab },
      ],
      activeTab: this.state.body.state.activeTab || 'storage-controllers',
      body: storageControllerTab,
    });

    this.setState({ body: newBody });
  }

  private buildBodyWithDefaults() {
    // Build with default settings (no column hiding)
    const storageControllerTab = getStorageControllersPanel(false, '');
    const ssdDisksTab = getSSDDisksPanel(false, '');
    const virtualDrivesTab = getVirtualDrivesPanel(false, '');

    const newBody = new TabbedScene({
      tabs: [
        { id: 'storage-controllers', label: 'Storage Controllers', getBody: () => storageControllerTab },
        { id: 'ssd-disks', label: 'SSD Disks', getBody: () => ssdDisksTab },
        { id: 'virtual-drives', label: 'Virtual Drives', getBody: () => virtualDrivesTab },
      ],
      activeTab: this.state.body.state.activeTab || 'storage-controllers',
      body: storageControllerTab,
    });

    this.setState({ body: newBody });
  }
}

export function getStorageControllersPanel(hideServerColumn: boolean = false, serverName: string = '', moidFilter?: string) {
  // Build URL with programmatic filter if available
  const filterExpression = moidFilter
    ? `Owners in (${moidFilter})`
    : `Owners in (\${RegisteredDevices:singlequote})`;

  const url = `/api/v1/storage/Controllers?$top=1000&$filter=${filterExpression} and ControllerId ne 'NVMe-direct-U.2-drives'&$expand=BackupBatteryUnit,ComputeBlade,ComputeRackUnit,ComputeBoard($expand=ComputeBlade,ComputeRackUnit)`;

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
        url: url,
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
            Server: hideServerColumn,
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

  const panelTitle = serverName
    ? `Storage Controllers in ${serverName}`
    : 'Storage Controllers in all selected servers';

  const panel = PanelBuilders.table()
    .setTitle(panelTitle)
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Presence')
        .overrideColor({
          mode: 'thresholds',
        })
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

      builder
        .matchFieldsWithName('State')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideMappings([
          {
            type: 'value',
            options: {
              '': { color: 'dark-yellow', index: 4, text: 'Unknown' },
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
              result: { color: 'dark-red', index: 5, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      builder
        .matchFieldsWithName('Self Encryption')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideMappings([
          {
            type: 'value',
            options: {
              no: { color: '#646464', index: 0, text: 'No' },
              yes: { color: 'blue', index: 1, text: 'Yes' },
              false: { color: '#646464', index: 2, text: 'No' },
              true: { color: 'blue', index: 3, text: 'Yes' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      builder
        .matchFieldsWithName('Battery')
        .overrideColor({
          mode: 'thresholds',
        })
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

      builder
        .matchFieldsWithName('InterfaceType')
        .overrideColor({
          mode: 'thresholds',
        })
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

      builder
        .matchFieldsWithName('MemoryCorrectableErrors')
        .overrideColor({
          mode: 'thresholds',
        })
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

  return panel;
}

// Helper function for SSD Disks sub-tab (panel-205)
export function getSSDDisksPanel(hideServerColumn: boolean = false, serverName: string = '', moidFilter?: string) {
  // Build URL with programmatic filter if available
  const filterExpression = moidFilter
    ? `Owners in (${moidFilter})`
    : `Owners in (\${RegisteredDevices:singlequote})`;

  const url = `/api/v1/storage/PhysicalDisks?$top=1000&$filter=Type eq 'SSD' and ${filterExpression}&$expand=Parent($expand=Parent($expand=ComputeBlade,ComputeRackUnit))`;

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
        url: url,
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
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'WearStatusInDays', text: '', type: 'string' },
          { selector: 'WriteErrorCountThreshold', text: '', type: 'string' },
          { selector: 'WriteIoErrorCount', text: '', type: 'string' },
          { selector: 'Parent.Parent.ComputeBlade.Name', text: 'Parent1', type: 'string' },
          { selector: 'Parent.Parent.Name', text: 'Parent2', type: 'string' },
          { selector: 'Parent.Parent.ComputeRackUnit.Name', text: 'Parent3', type: 'string' },
          { selector: 'Parent.Model', text: 'ParentModel', type: 'string' },
        ],
        computed_columns: [
          { selector: 'Parent1 + Parent2 + Parent3', text: 'Parent', type: 'string' },
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

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Parent: hideServerColumn,
            Bootable: true,
            Description: true,
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
            Parent1: true,
            Parent2: true,
            Parent3: true,
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
            Temp: true,
            Type: true,
            WearStatusInDays: true,
            WriteErrorCountThreshold: true,
          },
          includeByName: {},
          indexByName: {
            Parent: 0,
            DiskId: 1,
            Model: 2,
            Serial: 3,
            Size: 4,
            Protocol: 5,
            Presence: 6,
            State: 7,
            FailurePredicted: 8,
            PercentLifeLeft: 9,
            ParentModel: 10,
            DisabledForRemoval: 11,
            MediaErrorCount: 12,
            ReadIoErrorCount: 13,
            WriteIoErrorCount: 14,
          },
          renameByName: {
            Parent: 'Server',
            DiskId: 'Slot',
            FailurePredicted: 'Failure',
            PercentLifeLeft: 'Percent Life Left',
            ParentModel: 'Storage Controller',
            DisabledForRemoval: 'Removal',
            MediaErrorCount: 'Media Errors',
            ReadIoErrorCount: 'Read IO Errors',
            WriteIoErrorCount: 'Write IO Errors',
          },
        },
      },
    ],
  });

  const panelTitle = serverName
    ? `SSD Disks in ${serverName}`
    : 'SSD Disks in all selected servers';

  const panel = PanelBuilders.table()
    .setTitle(panelTitle)
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
              'Good/Online': { color: 'green', index: 0, text: 'OK' },
              'OK/Online': { color: 'green', index: 1, text: 'OK' },
              'OK/Jbod': { color: 'green', index: 2, text: 'OK' },
              'OK/Enabled': { color: 'green', index: 3, text: 'OK' },
              '/Enabled': { color: 'blue', index: 4, text: 'Enabled' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 5, text: '$1' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 90);

      // Failure field (FailurePredicted)
      builder
        .matchFieldsWithName('Failure')
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: 'green', index: 0, text: 'Not Predicted' },
              true: { color: 'dark-red', index: 1, text: 'Predicted' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-orange', index: 2, text: '$1' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 110);

      // Percent Life Left field
      builder
        .matchFieldsWithName('Percent Life Left')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'percentage',
          steps: [
            { value: 0, color: 'red' },
            { value: 20, color: 'orange' },
            { value: 40, color: '#EAB839' },
            { value: 60, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'gauge', mode: 'gradient', valueDisplayMode: 'color' });

      // Size field
      builder
        .matchFieldsWithName('Size')
        .overrideUnit('mbytes')
        .overrideCustomFieldConfig('width', 75);

      // Slot field
      builder
        .matchFieldsWithName('Slot')
        .overrideCustomFieldConfig('width', 60);

      // Protocol field
      builder
        .matchFieldsWithName('Protocol')
        .overrideCustomFieldConfig('width', 85);

      // Removal field
      builder
        .matchFieldsWithName('Removal')
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: 'text', index: 0, text: 'No' },
              true: { color: 'blue', index: 1, text: 'Yes (Disabled)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'blue', index: 2, text: '$1' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 100);

      // Media Errors field
      builder
        .matchFieldsWithName('Media Errors')
        .overrideMappings([
          {
            type: 'value',
            options: {
              '0': { color: 'text', index: 0, text: '0' },
            },
          },
          {
            type: 'range',
            options: {
              from: 1,
              result: { color: 'dark-red', index: 1 },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 140);

      // Read IO Errors field
      builder
        .matchFieldsWithName('Read IO Errors')
        .overrideMappings([
          {
            type: 'value',
            options: {
              '0': { color: 'text', index: 0, text: '0' },
            },
          },
          {
            type: 'range',
            options: {
              from: 1,
              result: { color: 'dark-red', index: 1 },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 140);

      // Write IO Errors field
      builder
        .matchFieldsWithName('Write IO Errors')
        .overrideMappings([
          {
            type: 'value',
            options: {
              '0': { color: 'text', index: 0, text: '0' },
            },
          },
          {
            type: 'range',
            options: {
              from: 1,
              result: { color: 'dark-red', index: 1 },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 140);

      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value',
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 1, text: '$1' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 100);

      return builder.build();
    })
    .build();

  return panel;
}

// Helper function for Virtual Drives sub-tab (panel-206)
export function getVirtualDrivesPanel(hideServerColumn: boolean = false, serverName: string = '', moidFilter?: string) {
  // Build URL with programmatic filter if available
  const filterExpression = moidFilter
    ? `Owners in (${moidFilter})`
    : `Owners in (\${RegisteredDevices:singlequote})`;

  const url = `/api/v1/storage/VirtualDrives?$top=1000&$filter=${filterExpression}&$expand=StorageController,Parent($expand=Parent($expand=ComputeBlade,ComputeRackUnit))`;

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
        url: url,
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
          { selector: 'Parent.Parent.Name', text: 'ParentName', type: 'string' },
          { selector: 'Parent.Parent.ComputeRackUnit.Name', text: 'ParentRackUnit', type: 'string' },
          { selector: 'Parent.StorageController.Name', text: 'PhysicalDiskControllerName', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ParentBlade + ParentName + ParentRackUnit', text: 'Server', type: 'string' },
          { selector: 'StorageControllerName + \' \' + StorageControllerModel', text: 'StorageController', type: 'string' },
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
            Server: hideServerColumn,
            Description: true,
            DriveCache: true,
            DriveSecurity: true,
            Id: true,
            IoPolicy: true,
            OperState: true,
            ParentBlade: true,
            ParentName: true,
            ParentRackUnit: true,
            PhysicalDiskControllerName: true,
            Presence: true,
            ReadPolicy: true,
            StripSize: true,
            StorageControllerModel: true,
            StorageControllerName: true,
            VirtualDriveId: true,
            WritePolicy: true,
          },
          includeByName: {},
          indexByName: {
            Server: 0,
            Name: 1,
            DriveState: 2,
            ConfigState: 3,
            Size: 4,
            Type: 5,
            Bootable: 6,
            StorageController: 7,
            AccessPolicy: 8,
          },
          renameByName: {
            Name: 'Virtual Drive',
            DriveState: 'Drive State',
            ConfigState: 'Config State',
          },
        },
      },
    ],
  });

  const panelTitle = serverName
    ? `Virtual Drives in ${serverName}`
    : 'Virtual Drives in all selected servers';

  const panel = PanelBuilders.table()
    .setTitle(panelTitle)
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Drive State field (DriveState)
      builder
        .matchFieldsWithName('Drive State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              optimal: { color: 'green', index: 0, text: 'Optimal' },
              Optimal: { color: 'green', index: 1, text: 'Optimal' },
              NA: { color: 'orange', index: 2, text: 'NA' },
              '': { color: 'dark-yellow', index: 3, text: 'Unknown' },
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

      // Config State field (ConfigState)
      builder
        .matchFieldsWithName('Config State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              optimal: { color: 'green', index: 0, text: 'Optimal' },
              Optimal: { color: 'green', index: 1, text: 'Optimal' },
              NA: { color: 'orange', index: 2, text: 'NA' },
              '': { color: 'dark-yellow', index: 3, text: 'Unknown' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 4, text: '$1' },
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

      return builder.build();
    })
    .build();

  return panel;
}

export function getStorageTab() {
  // Initialize with default panels (no column hiding, no server name)
  const storageControllerTab = getStorageControllersPanel(false, '');
  const ssdDisksTab = getSSDDisksPanel(false, '');
  const virtualDrivesTab = getVirtualDrivesPanel(false, '');

  const initialBody = new TabbedScene({
    tabs: [
      { id: 'storage-controllers', label: 'Storage Controllers', getBody: () => storageControllerTab },
      { id: 'ssd-disks', label: 'SSD Disks', getBody: () => ssdDisksTab },
      { id: 'virtual-drives', label: 'Virtual Drives', getBody: () => virtualDrivesTab },
    ],
    activeTab: 'storage-controllers',
    body: storageControllerTab,
  });

  return new DynamicStorageScene({
    body: initialBody,
  });
}
