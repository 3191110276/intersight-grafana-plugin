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

// Placeholder functions for each tab - will be implemented in phases
function getOverviewTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Overview')
          .setOption('content', 'Overview tab - to be implemented')
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getInventoryTab() {
  // Create query runner for Physical Summaries
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/compute/PhysicalSummaries?$filter=Name in (${ServerName:singlequote})',
        root_selector: '$.Results',
        columns: [
          // Helper columns for computed columns (will be hidden)
          { selector: 'ChassisId', text: 'ChassisId', type: 'string' },
          { selector: 'SlotId', text: 'SlotId', type: 'string' },
          { selector: 'ServerId', text: 'ServerId', type: 'string' },
          { selector: 'OperPowerState', text: 'OperPowerState', type: 'string' },
          { selector: 'BiosPostComplete', text: 'BiosPostComplete', type: 'string' },
          { selector: 'Presence', text: 'Presence', type: 'string' },
          { selector: 'Lifecycle', text: 'Lifecycle', type: 'string' },
          { selector: 'NumCpus', text: 'NumCpus', type: 'string' },
          { selector: 'NumCpuCores', text: 'NumCpuCores', type: 'string' },
          { selector: 'NumEthHostInterfaces', text: 'NumEthHostInterfaces', type: 'string' },
          { selector: 'NumFcHostInterfaces', text: 'NumFcHostInterfaces', type: 'string' },
          // Visible columns in display order
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'UserLabel', text: 'User Label', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'PlatformType', text: 'Platform', type: 'string' },
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'Firmware', text: 'Firmware', type: 'string' },
          { selector: 'MgmtIpAddress', text: 'Mgmt IP', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'AvailableMemory', text: 'Memory', type: 'number' },
        ],
        computed_columns: [
          // Computed columns - these will be appended after regular columns
          {
            selector: "ChassisId + '/' + SlotId + '#' + ServerId",
            text: 'ID',
            type: 'string',
          },
          {
            selector: "OperPowerState + '#' + BiosPostComplete",
            text: 'Power',
            type: 'string',
          },
          {
            selector: "Presence + '#' + Lifecycle",
            text: 'State',
            type: 'string',
          },
          {
            selector: "NumCpus + 'x ' + NumCpuCores + 'C'",
            text: 'CPU',
            type: 'string',
          },
          {
            selector: "NumEthHostInterfaces + ' Eth + ' + NumFcHostInterfaces + ' FC'",
            text: 'Interfaces',
            type: 'string',
          },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  // Wrap with transformer to organize columns in correct order
  const queryRunner = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            'ID': true,
          },
          indexByName: {
            'Name': 0,
            'User Label': 1,
            'Serial': 2,
            'Model': 3,
            'Platform': 4,
            'Power': 5,
            'State': 6,
            'Critical': 7,
            'Warning': 8,
            'Firmware': 9,
            'Mgmt IP': 10,
            'Interfaces': 11,
            'CPU': 12,
            'Memory': 13,
            'Moid': 14,
          },
          renameByName: {},
        },
      },
    ],
  });

  // Create table panel with field overrides
  const tablePanel = PanelBuilders.table()
    .setTitle('')
    .setData(queryRunner)
    .setOption('showHeader', true)
    .setOverrides((builder) => {
      // Critical column - red background when > 0
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'color-background',
          mode: 'basic',
        })
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'red' },
          ],
        });

      // Warning column - yellow background when > 0
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'color-background',
          mode: 'basic',
        })
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'yellow' },
          ],
        });

      // Power column - colored background based on state
      builder.matchFieldsWithName('Power')
        .overrideCustomFieldConfig('width', 60)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'color-background',
          mode: 'basic',
        })
        .overrideMappings([
          {
            type: 'value',
            options: {
              'on#true': { text: 'On', color: 'transparent' },
              'on#false': { text: 'On (BIOS Post incomplete)', color: 'yellow' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '.*',
              result: { text: 'Off', color: 'red' },
            },
          },
        ]);

      // Platform column - value mapping
      builder.matchFieldsWithName('Platform')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'left')
        .overrideMappings([
          {
            type: 'value',
            options: {
              'IMCBlade': { text: 'Blade' },
              'IMCRack': { text: 'Rack' },
            },
          },
        ]);

      // State column - value mapping with color background
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'color-background',
          mode: 'basic',
        })
        .overrideMappings([
          {
            type: 'value',
            options: {
              'Enabled#Active': { text: 'Ok', color: 'transparent' },
              'equipped#Active': { text: 'Ok', color: 'transparent' },
              'equipped#DiscoveryFailed': { text: 'Discovery Failed', color: 'red' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '.*',
              result: { text: 'Presence or Lifecycle not ok', color: 'red' },
            },
          },
        ]);

      // CPU column
      builder.matchFieldsWithName('CPU')
        .overrideCustomFieldConfig('width', 65)
        .overrideCustomFieldConfig('align', 'center');

      // Interfaces column
      builder.matchFieldsWithName('Interfaces')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center');

      // Memory column - with unit
      builder.matchFieldsWithName('Memory')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideUnit('decgbytes');

      // Mgmt IP column
      builder.matchFieldsWithName('Mgmt IP')
        .overrideCustomFieldConfig('width', 105);

      // Serial column
      builder.matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('align', 'left');

      // Firmware column
      builder.matchFieldsWithName('Firmware')
        .overrideCustomFieldConfig('width', 110);

      // Hide helper columns used for computed columns
      builder.matchFieldsWithName('ChassisId').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('SlotId').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('ServerId').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('OperPowerState').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('BiosPostComplete').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('Presence').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('Lifecycle').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('NumCpus').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('NumCpuCores').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('NumEthHostInterfaces').overrideCustomFieldConfig('hidden', true);
      builder.matchFieldsWithName('NumFcHostInterfaces').overrideCustomFieldConfig('hidden', true);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: tablePanel,
      }),
    ],
  });
}

function getAlarmsTab() {
  // Create query runner for Alarms
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: "/api/v1/cond/Alarms?$top=1000&$expand=RegisteredDevice($select=PlatformType,DeviceHostname,ParentConnection,Pid)&$filter=((startswith(AffectedMoDisplayName, '${ServerName:text}')) and ((Severity ne 'Cleared') or (Severity eq 'Cleared' and ((CreateTime ge ${__from:date}) and (CreateTime le ${__to:date}) or (LastTransitionTime ge ${__from:date}) and (LastTransitionTime le ${__to:date})))))&$orderby=LastTransitionTime desc",
        root_selector: '$.Results',
        columns: [
          { selector: 'Acknowledge', text: 'Acknowledge', type: 'string' },
          { selector: 'AcknowledgeBy', text: 'AcknowledgeBy', type: 'string' },
          { selector: 'AcknowledgeTime', text: 'AcknowledgeTime', type: 'string' },
          { selector: 'AffectedMo', text: 'AffectedMo', type: 'string' },
          { selector: 'AffectedMoDisplayName', text: 'AffectedMoDisplayName', type: 'string' },
          { selector: 'AffectedMoType', text: 'AffectedMoType', type: 'string' },
          { selector: 'AlarmSummaryAggregators', text: 'AlarmSummaryAggregators', type: 'string' },
          { selector: 'AncestorMoType', text: 'AncestorMoType', type: 'string' },
          { selector: 'Code', text: 'Code', type: 'string' },
          { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
          { selector: 'Definition', text: 'Definition', type: 'string' },
          { selector: 'Description', text: 'Description', type: 'string' },
          { selector: 'Flapping', text: 'Flap', type: 'string' },
          { selector: 'FlappingCount', text: 'FlappingCount', type: 'string' },
          { selector: 'MsAffectedObject', text: 'MsAffectedObject', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'OrigSeverity', text: 'OrigSeverity', type: 'string' },
          { selector: 'Owners', text: 'Owners', type: 'string' },
          { selector: 'RegisteredDevice', text: 'RegisteredDevice', type: 'string' },
          { selector: 'Severity', text: 'Severity', type: 'string' },
          { selector: 'Suppressed', text: 'Suppressed', type: 'string' },
          { selector: 'LastTransitionTime', text: 'LastTransitionTime', type: 'timestamp' },
        ],
        computed_columns: [
          { selector: "Acknowledge + ' (' + AcknowledgeBy + ')'", text: 'Acknowledged', type: 'string' },
          { selector: "Flap + ' (' + FlappingCount + ')'", text: 'Flapping', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      },
    ],
  });

  // Apply transformations: organize columns and format time
  const transformedData = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Acknowledge: true,
            AcknowledgeBy: true,
            AcknowledgeTime: true,
            AffectedMo: true,
            AffectedMoDisplayName: true,
            AffectedMoType: true,
            AlarmSummaryAggregators: true,
            CreateTime: true,
            Definition: true,
            Flap: true,
            FlappingCount: true,
            MsAffectedObject: true,
            Name: true,
            OrigSeverity: true,
            Owners: true,
            RegisteredDevice: true,
          },
          includeByName: {},
          indexByName: {
            Acknowledge: 11,
            AcknowledgeBy: 12,
            AcknowledgeTime: 13,
            Acknowledged: 10,
            AffectedMo: 14,
            AffectedMoDisplayName: 15,
            AffectedMoType: 16,
            AlarmSummaryAggregators: 17,
            AncestorMoType: 18,
            Code: 1,
            CreateTime: 19,
            Definition: 5,
            Description: 4,
            Flap: 7,
            Flapping: 6,
            FlappingCount: 8,
            LastTransitionTime: 23,
            MsAffectedObject: 20,
            Name: 0,
            OrigSeverity: 3,
            Owners: 21,
            RegisteredDevice: 22,
            Severity: 2,
            Suppressed: 9,
          },
          renameByName: {
            AncestorMoType: 'Type',
            LastTransitionTime: 'Last Transition',
          },
        },
      },
      {
        id: 'convertFieldType',
        options: {
          conversions: [
            {
              destinationType: 'time',
              targetField: 'Last Transition',
            },
          ],
          fields: {},
        },
      },
      {
        id: 'formatTime',
        options: {
          timeField: 'Last Transition',
          outputFormat: 'YYYY-MM-DD HH:mm',
          useTimezone: true,
        },
      },
    ],
  });

  // Build the alarms table panel
  const alarmsPanel = PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setOption('sortBy', [
      { desc: true, displayName: 'Last Transition' },
      { desc: true, displayName: 'Severity' },
    ])
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Severity column - color-coded text
      builder.matchFieldsWithName('Severity')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
            options: {
              Critical: { color: 'red', index: 0 },
              Warning: { color: 'orange', index: 1 },
              Info: { color: 'super-light-yellow', index: 2 },
              Cleared: { color: 'green', index: 3 },
            },
          },
        ]);

      // Flapping column
      builder.matchFieldsWithName('Flapping')
        .overrideCustomFieldConfig('width', 110)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'NotFlapping (0)': { index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'red', index: 1, text: '$1' },
            },
          },
        ]);

      // Suppressed column
      builder.matchFieldsWithName('Suppressed')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: 'text', index: 0, text: 'No' },
              true: { color: 'blue', index: 1, text: 'Yes' },
            },
          },
        ]);

      // Acknowledged column
      builder.matchFieldsWithName('Acknowledged')
        .overrideCustomFieldConfig('width', 140)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'None ()': { color: 'text', index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: 'Acknowledge(.*)',
              result: { color: 'blue', index: 1, text: 'Yes$1' },
            },
          },
        ]);

      // Type column
      builder.matchFieldsWithName('Type')
        .overrideCustomFieldConfig('width', 100)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'compute.Blade': { index: 0, text: 'Blade' },
              'compute.RackUnit': { index: 1, text: 'Rack Server' },
              'network.Element': { index: 2, text: 'FI' },
              'equipment.Chassis': { index: 3, text: 'Chassis' },
              'asset.Target': { index: 4, text: 'Target' },
            },
          },
        ]);

      // Last Transition column
      builder.matchFieldsWithName('Last Transition')
        .overrideCustomFieldConfig('width', 165);

      // Code column
      builder.matchFieldsWithName('Code')
        .overrideCustomFieldConfig('width', 260);
    })
    .build();

  // Return layout with the alarms panel
  // Note: In the original dashboard, tabs repeat by ServerName variable
  // In Grafana Scenes, the panel query already filters by ${ServerName:text}
  // which handles the multi-server filtering dynamically
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 'calc(100vh - 180px)',
        body: alarmsPanel,
      }),
    ],
  });
}

function getActionsTab() {
  // Create query runner for WorkflowInfos (Actions)
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: "/api/v1/workflow/WorkflowInfos?$skip=0&$top=1000&$filter=((startswith(WorkflowCtx.TargetCtxList.TargetName, '${ServerName:text}'))) and ((StartTime ge ${__from:date}) and (StartTime le ${__to:date}) or (EndTime ge ${__from:date}) and (EndTime le ${__to:date}))&$orderby=CreateTime desc",
        root_selector: '$.Results',
        columns: [
          { selector: 'Action', text: 'Action', type: 'string' },
          { selector: 'AssociatedObject', text: 'AssociatedObject', type: 'string' },
          { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
          { selector: 'Email', text: 'Email', type: 'string' },
          { selector: 'EndTime', text: 'EndTime', type: 'timestamp' },
          { selector: 'Input', text: 'Input', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'PauseReason', text: 'PauseReason', type: 'string' },
          { selector: 'Progress', text: 'Progress', type: 'string' },
          { selector: 'Src', text: 'Src', type: 'string' },
          { selector: 'StartTime', text: 'StartTime', type: 'timestamp' },
          { selector: 'TaskInfos', text: 'TaskInfos', type: 'string' },
          { selector: 'TraceId', text: 'TraceId', type: 'string' },
          { selector: 'Type', text: 'Type', type: 'string' },
          { selector: 'UserActionRequired', text: 'UserActionRequired', type: 'string' },
          { selector: 'UserId', text: 'UserId', type: 'string' },
          { selector: 'WaitReason', text: 'WaitReason', type: 'string' },
          { selector: 'WorkflowCtx.InitiatorCtx.InitiatorName', text: 'Initiator Name', type: 'string' },
          { selector: 'WorkflowDefinition.Moid', text: 'WorkflowDefinition', type: 'string' },
          { selector: 'WorkflowStatus', text: 'WorkflowStatus', type: 'string' },
          { selector: 'WorkflowCtx.InitiatorCtx.InitiatorType', text: 'Initiator Type', type: 'string' },
          { selector: 'Internal', text: 'Internal', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      },
    ],
  });

  // Apply transformations: organize columns
  const transformedData = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Action: true,
            AssociatedObject: true,
            Input: true,
            PauseReason: true,
            StartTime: true,
            TaskInfos: true,
            Type: true,
            UserActionRequired: true,
            UserId: true,
            WaitReason: true,
            WorkflowDefinition: true,
          },
          includeByName: {},
          indexByName: {
            Action: 8,
            AssociatedObject: 9,
            CreateTime: 5,
            Email: 1,
            EndTime: 7,
            'Initiator Name': 17,
            'Initiator Type': 18,
            Input: 10,
            Moid: 19,
            Name: 0,
            PauseReason: 11,
            Progress: 4,
            Src: 21,
            StartTime: 6,
            TaskInfos: 12,
            TraceId: 20,
            Type: 13,
            UserActionRequired: 14,
            UserId: 2,
            WaitReason: 15,
            WorkflowDefinition: 16,
            WorkflowStatus: 3,
          },
          renameByName: {
            CreateTime: 'Start Time',
            Email: 'User',
            EndTime: 'End Time',
            'Initiator Name': 'Target Name',
            'Initiator Type': 'Target Type',
            Src: 'Service',
            StartTime: '',
            WorkflowStatus: 'Status',
          },
        },
      },
    ],
  });

  // Build the actions table panel
  const actionsPanel = PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Start Time' }])
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // User column - color-coded text
      builder.matchFieldsWithName('User')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              'system@intersight': { color: 'super-light-blue', index: 0 },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'super-light-purple', index: 1, text: '$1' },
            },
          },
        ]);

      // Status column
      builder.matchFieldsWithName('Status')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 90)
        .overrideMappings([
          {
            type: 'value',
            options: {
              Completed: { color: 'green', index: 0, text: 'Completed' },
              Failed: { color: 'red', index: 1, text: 'Failed' },
            },
          },
        ]);

      // Progress column - gauge visualization
      builder.matchFieldsWithName('Progress')
        .overrideUnit('percent')
        .overrideCustomFieldConfig('cellOptions', {
          mode: 'lcd',
          type: 'gauge',
          valueDisplayMode: 'text',
        })
        .overrideThresholds({
          mode: 'percentage',
          steps: [{ color: 'blue', value: 0 }],
        });

      // Moid column
      builder.matchFieldsWithName('Moid')
        .overrideCustomFieldConfig('width', 100);

      // TraceId column
      builder.matchFieldsWithName('TraceId')
        .overrideCustomFieldConfig('width', 96);

      // Service column
      builder.matchFieldsWithName('Service')
        .overrideCustomFieldConfig('width', 100);

      // Internal column
      builder.matchFieldsWithName('Internal')
        .overrideCustomFieldConfig('width', 85);

      // Target Type column
      builder.matchFieldsWithName('Target Type')
        .overrideMappings([
          {
            type: 'value',
            options: {
              'compute.Blade': { index: 2, text: 'Blade Server' },
              'compute.BladeIdentity': { index: 5, text: 'Blade Server Identity' },
              'compute.RackUnitIdentity': { index: 6, text: 'Rack Server Identity' },
              'compute.ServerSetting': { index: 8, text: 'Server Settings' },
              'equipment.ChassisIdentity': { index: 7, text: 'Chassis Identity' },
              'equipment.IoCard': { index: 3, text: 'IO Module' },
              'equipment.SwitchOperation': { index: 9, text: 'Switch Settings' },
              'fabric.SwitchProfile': { index: 0, text: 'Domain Profile' },
              'firmware.Upgrade': { index: 4, text: 'Firmware Upgrade' },
              'server.Profile': { index: 1, text: 'Server Profile' },
            },
          },
        ]);
    })
    .build();

  // Return layout with the actions panel
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 'calc(100vh - 180px)',
        body: actionsPanel,
      }),
    ],
  });
}

function getPortsTab() {
  // Create query runner with both Ethernet and Fibre Channel queries
  // Using transformations to merge instead of SQL expression (which has compatibility issues in Scenes)
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      // Query A: HostEthInterfaces (Ethernet)
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/adapter/HostEthInterfaces?$filter=DeviceMoId in (${RegisteredDevices:singlequote})&$expand=Parent($expand=Parent)',
        root_selector: '$.Results',
        columns: [
          { selector: 'AcknowledgedPeerInterface', text: 'AcknowledgedPeerInterface', type: 'string' },
          { selector: 'ActiveOperState', text: 'ActiveOperState', type: 'string' },
          { selector: 'AdapterUnit', text: 'AdapterUnit', type: 'string' },
          { selector: 'AdminState', text: 'AdminState', type: 'string' },
          { selector: 'Ancestors', text: 'Ancestors', type: 'string' },
          { selector: 'HostEthInterfaceId', text: 'HostEthInterfaceId', type: 'string' },
          { selector: 'InterfaceType', text: 'InterfaceType', type: 'string' },
          { selector: 'MacAddress', text: 'MacAddress', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'OperReason', text: 'OperReason', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'Operability', text: 'Operability', type: 'string' },
          { selector: 'OriginalMacAddress', text: 'OriginalMacAddress', type: 'string' },
          { selector: 'Parent', text: 'Parent', type: 'string' },
          { selector: 'PciAddr', text: 'PciAddr', type: 'string' },
          { selector: 'QinqEnabled', text: 'QinqEnabled', type: 'string' },
          { selector: 'QinqVlan', text: 'QinqVlan', type: 'string' },
          { selector: 'Parent.Parent.Name', text: 'Hostname', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
      // Query B: HostFcInterfaces (Fibre Channel)
      {
        refId: 'B',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/adapter/HostFcInterfaces?$filter=DeviceMoId in (${RegisteredDevices:singlequote})&$expand=Parent($expand=Parent)',
        root_selector: '$.Results',
        columns: [
          { selector: 'AcknowledgedPeerInterface', text: 'AcknowledgedPeerInterface', type: 'string' },
          { selector: 'ActiveOperState', text: 'ActiveOperState', type: 'string' },
          { selector: 'AdapterUnit', text: 'AdapterUnit', type: 'string' },
          { selector: 'AdminState', text: 'AdminState', type: 'string' },
          { selector: 'Ancestors', text: 'Ancestors', type: 'string' },
          { selector: 'HostEthInterfaceId', text: 'HostEthInterfaceId', type: 'string' },
          { selector: 'InterfaceType', text: 'InterfaceType', type: 'string' },
          { selector: 'MacAddress', text: 'MacAddress', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'OperReason', text: 'OperReason', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'Operability', text: 'Operability', type: 'string' },
          { selector: 'OriginalMacAddress', text: 'OriginalMacAddress', type: 'string' },
          { selector: 'Parent', text: 'Parent', type: 'string' },
          { selector: 'PciAddr', text: 'PciAddr', type: 'string' },
          { selector: 'QinqEnabled', text: 'QinqEnabled', type: 'string' },
          { selector: 'QinqVlan', text: 'QinqVlan', type: 'string' },
          { selector: 'Parent.Parent.Name', text: 'Hostname', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  // Wrap with transformer to merge both queries and organize columns
  const queryRunner = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      // First, merge/concatenate both query results
      {
        id: 'merge',
        options: {},
      },
      // Then organize columns as in original
      {
        id: 'organize',
        options: {
          excludeByName: {
            'AcknowledgedPeerInterface': true,
            'ActiveOperState': true,
            'AdapterUnit': true,
            'AdminState': true,
            'Ancestors': true,
            'OperReason': true,
            'OperState': true,
            'Operability': true,
            'OriginalMacAddress': true,
            'Parent': true,
            'PciAddr': true,
          },
          includeByName: {},
          indexByName: {
            'AcknowledgedPeerInterface': 5,
            'ActiveOperState': 6,
            'AdapterUnit': 7,
            'AdminState': 8,
            'Ancestors': 9,
            'HostEthInterfaceId': 2,
            'Hostname': 0,
            'InterfaceType': 4,
            'MacAddress': 3,
            'Name': 1,
            'OperReason': 10,
            'OperState': 11,
            'Operability': 12,
            'OriginalMacAddress': 13,
            'Parent': 14,
            'PciAddr': 15,
            'QinqEnabled': 16,
            'QinqVlan': 17,
          },
          renameByName: {
            'HostEthInterfaceId': '',
            'InterfaceType': 'Interface Type',
            'MacAddress': 'MAC Address',
            'Name': 'Port',
            'QinqEnabled': 'QinQ Enabled?',
            'QinqVlan': 'QinQ VLAN',
          },
        },
      },
    ],
  });

  // Create table panel
  const tablePanel = PanelBuilders.table()
    .setTitle('')
    .setData(queryRunner)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('sortBy', [{ displayName: 'Hostname', desc: false }])
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: tablePanel,
      }),
    ],
  });
}

function getNetworkUtilizationTab() {
  // Create nested tabs for Percentage and Absolute views
  const percentageTab = getNetworkUtilizationPercentageTab();
  const absoluteTab = getNetworkUtilizationAbsoluteTab();

  const networkUtilizationTabs = new TabbedScene({
    tabs: [
      { id: 'percentage', label: 'Percentage (%)', getBody: () => percentageTab },
      { id: 'absolute', label: 'Absolute (bps)', getBody: () => absoluteTab },
    ],
    activeTab: 'percentage',
    body: percentageTab,
  });

  // Wrap the TabbedScene in a SceneFlexLayout as per Grafana Scenes pattern
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 'calc(100vh - 180px)',
        body: networkUtilizationTabs,
      }),
    ],
  });
}

// Helper function for Percentage tab
function getNetworkUtilizationPercentageTab() {
  // Row 1 Panel 1 (panel-129): Transmit utilization in % per physical port
  const physTransmitQuery = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "selector", "dimension": "hw.network.port.role", "value": "unconfigured"},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [{"type": "doubleMax", "name": "base_max_utilization", "fieldName": "hw.network.bandwidth.utilization_transmit_max"}],
    "postAggregations": [{"type": "expression", "name": "max_utilization", "expression": "\\"base_max_utilization\\"*100"}]
  }` },
    } as any],
  });

  const physTransmitPanel = PanelBuilders.timeseries()
    .setTitle('Transmit utilization in % per physical port')
    .setData(new SceneDataTransformer({
      $data: physTransmitQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('percent').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .build();

  // Row 1 Panel 2 (panel-212): Receive utilization in % per physical port
  const physReceiveQuery = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "selector", "dimension": "hw.network.port.role", "value": "unconfigured"},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [{"type": "doubleMax", "name": "base_max_utilization", "fieldName": "hw.network.bandwidth.utilization_receive_max"}],
    "postAggregations": [{"type": "expression", "name": "max_utilization", "expression": "\\"base_max_utilization\\"*100"}]
  }` },
    } as any],
  });

  const physReceivePanel = PanelBuilders.timeseries()
    .setTitle('Receive utilization in % per physical port')
    .setData(new SceneDataTransformer({
      $data: physReceiveQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('percent').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .build();

  // Row 2 Panel 1 (panel-213): Transmit utilization in % per virtual port
  const virtTransmitQuery = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "in", "dimension": "hw.network.port.role", "values": ["vhba", "vnic"]},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [{"type": "doubleMax", "name": "base_max_utilization", "fieldName": "hw.network.bandwidth.utilization_transmit_max"}],
    "postAggregations": [{"type": "expression", "name": "max_utilization", "expression": "\\"base_max_utilization\\"*100"}]
  }` },
    } as any],
  });

  const virtTransmitPanel = PanelBuilders.timeseries()
    .setTitle('Transmit utilization in % per virtual port')
    .setData(new SceneDataTransformer({
      $data: virtTransmitQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('percent').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .build();

  // Row 2 Panel 2 (panel-214): Receive utilization in % per virtual port
  const virtReceiveQuery = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "in", "dimension": "hw.network.port.role", "values": ["vhba", "vnic"]},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [{"type": "doubleMax", "name": "base_max_utilization", "fieldName": "hw.network.bandwidth.utilization_receive_max"}],
    "postAggregations": [{"type": "expression", "name": "max_utilization", "expression": "\\"base_max_utilization\\"*100"}]
  }` },
    } as any],
  });

  const virtReceivePanel = PanelBuilders.timeseries()
    .setTitle('Receive utilization in % per virtual port')
    .setData(new SceneDataTransformer({
      $data: virtReceiveQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('percent').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: physTransmitPanel }),
            new SceneFlexItem({ width: '50%', body: physReceivePanel }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: virtTransmitPanel }),
            new SceneFlexItem({ width: '50%', body: virtReceivePanel }),
          ],
        }),
      }),
    ],
  });
}

// Helper function for Absolute (bps) tab
function getNetworkUtilizationAbsoluteTab() {
  // Row 1 Panel 1 (panel-215): Transmit utilization in bps per physical port
  const physTransmitQuery = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "selector", "dimension": "hw.network.port.role", "value": "unconfigured"},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [
      {"type": "doubleMax", "name": "base_utilization_max", "fieldName": "hw.network.io_transmit_max"},
      {"type": "longLast", "name": "base_link_speed", "fieldName": "hw.network.bandwidth.limit"}
    ],
    "postAggregations": [
      {"type": "expression", "name": "max_utilization", "expression": "(base_utilization_max*8)"},
      {"type": "expression", "name": "link_speed", "expression": "base_link_speed*8"}
    ]
  }` },
    } as any],
  });

  const physTransmitPanel = PanelBuilders.timeseries()
    .setTitle('Transmit utilization in bps per physical port')
    .setData(new SceneDataTransformer({
      $data: physTransmitQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('bps').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .build();

  // Row 1 Panel 2 (panel-216): Receive utilization in bps per physical port
  const physReceiveQuery = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "selector", "dimension": "hw.network.port.role", "value": "unconfigured"},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [
      {"type": "doubleMax", "name": "base_utilization_max", "fieldName": "hw.network.io_receive_max"},
      {"type": "longLast", "name": "base_link_speed", "fieldName": "hw.network.bandwidth.limit"}
    ],
    "postAggregations": [
      {"type": "expression", "name": "max_utilization", "expression": "(base_utilization_max*8)"},
      {"type": "expression", "name": "link_speed", "expression": "base_link_speed*8"}
    ]
  }` },
    } as any],
  });

  const physReceivePanel = PanelBuilders.timeseries()
    .setTitle('Receive utilization in bps per physical port')
    .setData(new SceneDataTransformer({
      $data: physReceiveQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('bps').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .build();

  // Row 2 Panel 1 (panel-217): Transmit utilization in bps per virtual port
  const virtTransmitQuery = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "in", "dimension": "hw.network.port.role", "values": ["vhba", "vnic"]},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [
      {"type": "doubleMax", "name": "base_utilization_max", "fieldName": "hw.network.io_transmit_max"},
      {"type": "longLast", "name": "base_link_speed", "fieldName": "hw.network.bandwidth.limit"}
    ],
    "postAggregations": [
      {"type": "expression", "name": "max_utilization", "expression": "(base_utilization_max*8)"},
      {"type": "expression", "name": "link_speed", "expression": "base_link_speed*8"}
    ]
  }` },
    } as any],
  });

  const virtTransmitPanel = PanelBuilders.timeseries()
    .setTitle('Transmit utilization in bps per physical port')
    .setData(new SceneDataTransformer({
      $data: virtTransmitQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('bps').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .build();

  // Row 2 Panel 2 (panel-218): Receive utilization in bps per virtual port
  const virtReceiveQuery = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "in", "dimension": "hw.network.port.role", "values": ["vhba", "vnic"]},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [
      {"type": "doubleMax", "name": "base_utilization_max", "fieldName": "hw.network.io_receive_max"},
      {"type": "longLast", "name": "base_link_speed", "fieldName": "hw.network.bandwidth.limit"}
    ],
    "postAggregations": [
      {"type": "expression", "name": "max_utilization", "expression": "(base_utilization_max*8)"},
      {"type": "expression", "name": "link_speed", "expression": "base_link_speed*8"}
    ]
  }` },
    } as any],
  });

  const virtReceivePanel = PanelBuilders.timeseries()
    .setTitle('Receive utilization in bps per virtual port')
    .setData(new SceneDataTransformer({
      $data: virtReceiveQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('bps').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: physTransmitPanel }),
            new SceneFlexItem({ width: '50%', body: physReceivePanel }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: virtTransmitPanel }),
            new SceneFlexItem({ width: '50%', body: virtReceivePanel }),
          ],
        }),
      }),
    ],
  });
}

function getNetworkErrorsTab() {
  // Row 1, Panel 1: Total transmit errors per physical port (panel-219)
  const txErrorsQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'dataframe',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '',
        columns: [
          { selector: 'event.host_name', text: 'A', type: 'string' },
          { selector: 'event.name', text: 'B', type: 'string' },
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.tx_sum', text: 'TX', type: 'string' },
          { selector: 'event.rx_sum', text: 'RX', type: 'string' },
        ],
        computed_columns: [
          {
            selector: "A + ' Port ' + B",
            text: 'Port',
            type: 'string',
          },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "host_name",
      "name"
    ],
    "virtualColumns": [{
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
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.RackUnit"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "unconfigured"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "runt",
        "fieldName": "hw.errors_network_receive_runt"
      },
      {
        "type": "longSum",
        "name": "too_long",
        "fieldName": "hw.errors_network_receive_too_long"
      },
      {
        "type": "longSum",
        "name": "crc",
        "fieldName": "hw.errors_network_receive_crc"
      },
      {
        "type": "longSum",
        "name": "no_buffer",
        "fieldName": "hw.errors_network_receive_no_buffer"
      },
      {
        "type": "longSum",
        "name": "too_short",
        "fieldName": "hw.errors_network_receive_too_short"
      },
      {
        "type": "longSum",
        "name": "rx_discard",
        "fieldName": "hw.errors_network_receive_discard"
      },
      {
        "type": "longSum",
        "name": "deferred",
        "fieldName": "hw.errors_network_transmit_deferred"
      },
      {
        "type": "longSum",
        "name": "late_collisions",
        "fieldName": "hw.errors_network_late_collisions"
      },
      {
        "type": "longSum",
        "name": "carrier_sense",
        "fieldName": "hw.errors_network_carrier_sense"
      },
      {
        "type": "longSum",
        "name": "tx_discard",
        "fieldName": "hw.errors_network_transmit_discard"
      },
      {
        "type": "longSum",
        "name": "jabber",
        "fieldName": "hw.errors_network_transmit_jabber"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "rx_sum",
        "expression": "\\"rx_discard\\" + \\"too_short\\" + \\"no_buffer\\" + \\"crc\\" + \\"too_long\\" + \\"runt\\""
      },
      {
        "type": "expression",
        "name": "tx_sum",
        "expression": "\\"jabber\\" + \\"tx_discard\\" + \\"carrier_sense\\" + \\"late_collisions\\" + \\"deferred\\""
      },
      {
        "type": "expression",
        "name": "total",
        "expression": "\\"tx_sum\\" + \\"rx_sum\\""
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const txErrorsTransformer = new SceneDataTransformer({
    $data: txErrorsQueryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Port',
          rowField: 'Time',
          valueField: 'TX',
        },
      },
    ],
  });

  const txErrorsPanel = PanelBuilders.timeseries()
    .setTitle('Total transmit errors per physical port')
    .setData(txErrorsTransformer)
    .setDecimals(1)
    .setMin(0)
    .setMax(100)
    .setUnit('percent')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'green' },
        { value: 70, color: '#EAB839' },
        { value: 90, color: 'red' },
      ],
    })
    .build();

  // Row 1, Panel 2: Total receive errors per physical port (panel-221)
  const rxErrorsQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'dataframe',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '',
        columns: [
          { selector: 'event.host_name', text: 'A', type: 'string' },
          { selector: 'event.name', text: 'B', type: 'string' },
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.tx_sum', text: 'TX', type: 'string' },
          { selector: 'event.rx_sum', text: 'RX', type: 'string' },
        ],
        computed_columns: [
          {
            selector: "A + ' Port ' + B",
            text: 'Port',
            type: 'string',
          },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "host_name",
      "name"
    ],
    "virtualColumns": [{
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
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.RackUnit"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "unconfigured"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "runt",
        "fieldName": "hw.errors_network_receive_runt"
      },
      {
        "type": "longSum",
        "name": "too_long",
        "fieldName": "hw.errors_network_receive_too_long"
      },
      {
        "type": "longSum",
        "name": "crc",
        "fieldName": "hw.errors_network_receive_crc"
      },
      {
        "type": "longSum",
        "name": "no_buffer",
        "fieldName": "hw.errors_network_receive_no_buffer"
      },
      {
        "type": "longSum",
        "name": "too_short",
        "fieldName": "hw.errors_network_receive_too_short"
      },
      {
        "type": "longSum",
        "name": "rx_discard",
        "fieldName": "hw.errors_network_receive_discard"
      },
      {
        "type": "longSum",
        "name": "deferred",
        "fieldName": "hw.errors_network_transmit_deferred"
      },
      {
        "type": "longSum",
        "name": "late_collisions",
        "fieldName": "hw.errors_network_late_collisions"
      },
      {
        "type": "longSum",
        "name": "carrier_sense",
        "fieldName": "hw.errors_network_carrier_sense"
      },
      {
        "type": "longSum",
        "name": "tx_discard",
        "fieldName": "hw.errors_network_transmit_discard"
      },
      {
        "type": "longSum",
        "name": "jabber",
        "fieldName": "hw.errors_network_transmit_jabber"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "rx_sum",
        "expression": "\\"rx_discard\\" + \\"too_short\\" + \\"no_buffer\\" + \\"crc\\" + \\"too_long\\" + \\"runt\\""
      },
      {
        "type": "expression",
        "name": "tx_sum",
        "expression": "\\"jabber\\" + \\"tx_discard\\" + \\"carrier_sense\\" + \\"late_collisions\\" + \\"deferred\\""
      },
      {
        "type": "expression",
        "name": "total",
        "expression": "\\"tx_sum\\" + \\"rx_sum\\""
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const rxErrorsTransformer = new SceneDataTransformer({
    $data: rxErrorsQueryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Port',
          rowField: 'Time',
          valueField: 'RX',
        },
      },
    ],
  });

  const rxErrorsPanel = PanelBuilders.timeseries()
    .setTitle('Total receive errors per physical port')
    .setData(rxErrorsTransformer)
    .setDecimals(1)
    .setMin(0)
    .setMax(100)
    .setUnit('percent')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'green' },
        { value: 70, color: '#EAB839' },
        { value: 90, color: 'red' },
      ],
    })
    .build();

  // Row 1, Panel 3: Detailed error counts table (panel-28)
  const errorDetailsQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '',
        columns: [
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.name', text: 'Port', type: 'string' },
          { selector: 'event.runt', text: 'Runt', type: 'string' },
          { selector: 'event.too_long', text: 'Too Long', type: 'string' },
          { selector: 'event.crc', text: 'CRC', type: 'string' },
          { selector: 'event.no_buffer', text: 'No Buffer', type: 'string' },
          { selector: 'event.too_short', text: 'Too Short', type: 'string' },
          { selector: 'event.rx_discard', text: 'RX Discard', type: 'string' },
          { selector: 'event.deferred', text: 'Deferred', type: 'string' },
          { selector: 'event.late_collisions', text: 'Late Collisions', type: 'string' },
          { selector: 'event.carrier_sense', text: 'Carrier Sense', type: 'string' },
          { selector: 'event.tx_discard', text: 'TX Discard', type: 'string' },
          { selector: 'event.jabber', text: 'Jabber', type: 'string' },
          { selector: 'event.port_type', text: 'Port Type', type: 'string' },
          { selector: 'event.port_role', text: 'Port Role', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "host_name",
      "name"
    ],
    "virtualColumns": [{
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
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.RackUnit"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "unconfigured"
        },
        {
          "type": "in",
          "dimension": "host.name",
          "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "runt",
        "fieldName": "hw.errors_network_receive_runt"
      },
      {
        "type": "longSum",
        "name": "too_long",
        "fieldName": "hw.errors_network_receive_too_long"
      },
      {
        "type": "longSum",
        "name": "crc",
        "fieldName": "hw.errors_network_receive_crc"
      },
      {
        "type": "longSum",
        "name": "no_buffer",
        "fieldName": "hw.errors_network_receive_no_buffer"
      },
      {
        "type": "longSum",
        "name": "too_short",
        "fieldName": "hw.errors_network_receive_too_short"
      },
      {
        "type": "longSum",
        "name": "rx_discard",
        "fieldName": "hw.errors_network_receive_discard"
      },
      {
        "type": "longSum",
        "name": "deferred",
        "fieldName": "hw.errors_network_transmit_deferred"
      },
      {
        "type": "longSum",
        "name": "late_collisions",
        "fieldName": "hw.errors_network_late_collisions"
      },
      {
        "type": "longSum",
        "name": "carrier_sense",
        "fieldName": "hw.errors_network_carrier_sense"
      },
      {
        "type": "longSum",
        "name": "tx_discard",
        "fieldName": "hw.errors_network_transmit_discard"
      },
      {
        "type": "longSum",
        "name": "jabber",
        "fieldName": "hw.errors_network_transmit_jabber"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const errorDetailsTransformer = new SceneDataTransformer({
    $data: errorDetailsQueryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: {
                id: 'equal',
                options: {
                  value: 'backplane_port',
                },
              },
              fieldName: 'Port Type',
            },
            {
              config: {
                id: 'equal',
                options: {
                  value: 'host_port',
                },
              },
              fieldName: 'Port Role',
            },
          ],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'RX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Runt', 'Too Long', 'CRC', 'No Buffer', 'Too Short', 'RX Discard'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'TX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Carrier Sense', 'Deferred', 'Late Collisions', 'TX Discard', 'Jabber'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          mode: 'reduceRow',
          reduce: {
            include: ['RX Total', 'TX Total'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'Port Role': true,
            'Port Type': true,
          },
          indexByName: {
            'CRC': 8,
            'Carrier Sense': 15,
            'Chassis': 2,
            'Deferred': 13,
            'Domain': 0,
            'Hostname': 1,
            'Jabber': 17,
            'Late Collisions': 14,
            'No Buffer': 9,
            'Port': 3,
            'Port Role': 18,
            'Port Type': 19,
            'RX Discard': 11,
            'RX Total': 5,
            'Runt': 6,
            'TX Discard': 16,
            'TX Total': 12,
            'Too Long': 7,
            'Too Short': 10,
            'Total': 4,
          },
          renameByName: {
            'Hostname': 'Server',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'Runt',
            },
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'Deferred',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  const errorDetailsPanel = PanelBuilders.table()
    .setTitle('')
    .setData(errorDetailsTransformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ displayName: 'Total', desc: true }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'transparent' },
        { value: 10, color: '#EAB839' },
        { value: 80, color: 'dark-red' },
      ],
    })
    .setOverrides((builder) => {
      // Port column mappings
      builder.matchFieldsWithName('Port')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 105)
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/[1-4])$',
              result: { index: 0, text: 'Slot 1 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/[5-8])$',
              result: { index: 1, text: 'Slot 2 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/([9]|1[0-2]))$',
              result: { index: 2, text: 'Slot 3 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/1[3-6])$',
              result: { index: 3, text: 'Slot 4 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/(1[7-9]|20))$',
              result: { index: 4, text: 'Slot 5 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/2[1-4])$',
              result: { index: 5, text: 'Slot 6 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/2[5-8])$',
              result: { index: 6, text: 'Slot 7 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/(29|3[0-2]))$',
              result: { index: 7, text: 'Slot 8 ($1)' },
            },
          },
        ]);

      // Number columns with color background
      builder.matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', {
          applyToRow: false,
          mode: 'basic',
          type: 'color-background',
        })
        .overrideCustomFieldConfig('width', 120)
        .overrideCustomFieldConfig('wrapText', false);

      // Chassis column
      builder.matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();

  // Row 3: Error Descriptions (panel-24)
  const errorDescriptionsQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'inline',
        parser: 'backend',
        format: 'table',
        data: `[
{"Error": "Total", "Direction": "both", "CLI value": "-", "Description": "Sum of all errors recorded in Intersight", "Resolution": "Look at detailed errors"},
{"Error": "Total RX", "Direction": "RX", "CLI value": "input error", "Description": "Sum of RX errors (CLI value does not contain all errors)", "Resolution": "Look at detailed error counts"},
{"Error": "Runt", "Direction": "RX", "CLI value": "runt", "Description": "Packets smaller than the minimum required size of 64 bytes with a bad CRC check", "Resolution": "This is likely caused by a problem with network equipment"},
{"Error": "Too Long", "Direction": "RX", "CLI value": "giant", "Description": "Packet length that is greater than the configured MTU on the interface", "Resolution": "Check and adjust the MTU settings of hosts and network devices"},
{"Error": "CRC", "Direction": "RX", "CLI value": "CRC", "Description": "Packets that have failed the CRC check, thus there has likely been data corruption during transmission", "Resolution": "Investigate the transmission equipment, as well as potential  interferences"},
{"Error": "No Buffer", "Direction": "RX", "CLI value": "no buffer", "Description": "Received packets that were dropped due to unavailability of the buffer on the interface.", "Resolution": "This is often caused by broadcast storms, as well as any other kind of high throughput situation."},
{"Error": "Too Short", "Direction": "RX", "CLI value": "short frame", "Description": "Indicates a good packet smaller than the minimum required size of 64 bytes", "Resolution": "This is likely caused by a problem with network equipment"},
{"Error": "RX Discard", "Direction": "RX", "CLI value": "input discard", "Description": "Packets dropped in the input queue due to congestion. This number includes drops due to tail drop and weighted random early detection (WRED).", "Resolution": "Figure out and address congestion issues"},
{"Error": "Total TX", "Direction": "TX", "CLI value": "output error", "Description": "Sum of TX errors (CLI value does not contain all errors)", "Resolution": "Look at detailed error counts"},
{"Error": "Deferred", "Direction": "TX", "CLI value": "deferred", "Description": "Packets that have been temporarily postponed or delayed from immediate transmission by the network interface", "Resolution": "This is usually caused by network congestion, or problems with the physical network"},
{"Error": "Late Collision", "Direction": "TX", "CLI value": "late collision", "Description": "A late collision happens when a collision occurs after transmitting the first 64 bytes", "Resolution": "This is almost always due to a problem with the physical network, usually twisted pair cables with a length of over 100 meters"},
{"Error": "Carrier Sense", "Direction": "TX", "CLI value": "lost carrier + no carrier", "Description": "Occurs when a network device fails to correctly detect the presence or absence of a carrier signal to determine whether the network medium is free for transmission / Occurs when no carrier signal can be detected", "Resolution": "This usually happens due to problems with the physical network, including excessive cable length, interference, or hardware issues / This can happen due to hardware problems or misconfiguration"},
{"Error": "TX Discard", "Direction": "TX", "CLI value": "output discard + underrun", "Description": "Packets dropped in the output queue due to congestion. This number includes drops due to tail drop and weighted random early detection (WRED). / Occurs when the buffer cannot provide data to the interface fast enough", "Resolution": "Figure out and address congestion issues / This is likely caused by a hardware limitation, you might need to upgrade or limit traffic"},
{"Error": "Jabber", "Direction": "TX", "CLI value": "jabber", "Description": "Indicates a packet length that is greater than the configured MTU on the interface", "Resolution": "Check and adjust the MTU settings of hosts and network devices"}
]`,
        root_selector: '',
        url: '',
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const errorDescriptionsTransformer = new SceneDataTransformer({
    $data: errorDescriptionsQueryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {},
          indexByName: {
            'CLI value': 1,
            'Description': 3,
            'Direction': 2,
            'Error': 0,
            'Resolution': 4,
          },
          renameByName: {},
        },
      },
    ],
  });

  const errorDescriptionsPanel = PanelBuilders.table()
    .setTitle('')
    .setData(errorDescriptionsTransformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOverrides((builder) => {
      // Wrap text for all cells
      builder.matchFieldsByQuery('.*')
        .overrideCustomFieldConfig('filterable', false)
        .overrideCustomFieldConfig('wrapText', true);

      // Error column width
      builder.matchFieldsWithName('Error')
        .overrideCustomFieldConfig('width', 140);

      // Direction column width and center alignment
      builder.matchFieldsWithName('Direction')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center');

      // CLI value column width
      builder.matchFieldsWithName('CLI value')
        .overrideCustomFieldConfig('width', 200);
    })
    .build();

  // Combine all rows
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Row 1: Physical Ports (3 panels - 2 timeseries, 1 table)
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: txErrorsPanel,
            }),
            new SceneFlexItem({
              width: '50%',
              body: rxErrorsPanel,
            }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 400,
        body: errorDetailsPanel,
      }),
      // Row 2: Virtual Ports (empty - no panels)
      // Row 3: Error Descriptions (tall table)
      new SceneFlexItem({
        height: 600,
        body: errorDescriptionsPanel,
      }),
    ],
  });
}

function getEnvironmentalTab() {
  // Row 1: Power Supply Status Panel (panel-6)
  const powerSupplyQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '',
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.status_sum', text: 'Status', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
        "virtualColumns": [{
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
              "type": "selector",
              "dimension": "instrument.name",
              "value": "hw.power_supply"
            },
            {
              "type": "in",
              "dimension": "host.name",
              "values": [\${ServerName:doublequote}]
            }
          ]
        },
        "aggregations": [
          {
            "type": "longMin",
            "name": "hw-status_min-Min",
            "fieldName": "hw.status_min"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "aggregations": [
      {
        "type": "longSum",
        "name": "status_sum",
        "fieldName": "hw-status_min-Min"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const powerSupplyDataTransformer = new SceneDataTransformer({
    $data: powerSupplyQueryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Hostname',
          rowField: 'Time',
          valueField: 'Status',
        },
      },
    ],
  });

  const powerSupplyPanel = PanelBuilders.timeseries()
    .setTitle('Active PSUs per device')
    .setDescription('Displays the count of active power supplies- one color per device. Maximum count of power supplies is used as threshold. Adding or removing devices can skew the threshold.')
    .setData(powerSupplyDataTransformer)
    .setCustomFieldConfig('drawStyle', 'bars')
    .setCustomFieldConfig('fillOpacity', 100)
    .setCustomFieldConfig('barAlignment', 0)
    .setCustomFieldConfig('barWidthFactor', 1)
    .setCustomFieldConfig('stacking', { mode: 'normal', group: 'A' })
    .setCustomFieldConfig('thresholdsStyle', { mode: 'dashed+area' })
    .setCustomFieldConfig('axisSoftMin', 0)
    .setDecimals(0)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'semi-dark-red' },
        { value: 100, color: 'transparent' },
      ],
    })
    .build();

  // Row 2: Host Power Consumption - Panel 1 (panel-203 - timeseries)
  const powerConsumptionTimeseriesRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
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
          { selector: 'event.power_sum', text: 'Power', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
        "virtualColumns": [
          {
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
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
          },
          {
            "type": "selector",
            "dimension": "instrument.name",
            "value": "hw.power_supply"
          }
          ]
        },
        "aggregations": [
          {
            "type": "doubleMax",
            "name": "hw-power_max-Max",
            "fieldName": "hw.power_max"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power_sum",
        "fieldName": "hw-power_max-Max"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const powerConsumptionTimeseriesTransformer = new SceneDataTransformer({
    $data: powerConsumptionTimeseriesRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Power (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const powerConsumptionTimeseriesPanel = PanelBuilders.timeseries()
    .setTitle('Power consumption of all Hosts (Max)')
    .setData(powerConsumptionTimeseriesTransformer)
    .setUnit('watt')
    .setCustomFieldConfig('axisSoftMin', 0)
    .build();

  // Row 2: Host Power Consumption - Panel 2 (panel-15 - table)
  const powerConsumptionTableRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max-power', text: 'Power', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.RackUnit"
        },
        {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.host"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max-power",
        "fieldName": "hw.host.power_max"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const powerConsumptionTableTransformer = new SceneDataTransformer({
    $data: powerConsumptionTableRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: {
            timeField: 'Time',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'Trend #A': 'Power',
          },
        },
      },
    ],
  });

  const powerConsumptionTablePanel = PanelBuilders.table()
    .setTitle('')
    .setData(powerConsumptionTableTransformer)
    .setUnit('watt')
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Power')
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        });
      builder
        .matchFieldsWithName('Hostname')
        .overrideCustomFieldConfig('width', 240);
    })
    .build();

  // Row 3: Fan Speed Panel (panel-17)
  const fanSpeedQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
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
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.fan_speed', text: 'Fan Speed', type: 'number' },
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
    "dimensions": ["host_name"],
    "virtualColumns": [{
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
          "dimension": "host.name",
          "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.fan"
        }
      ]
    },
        "aggregations": [
          {
            "type": "longSum",
            "name": "count",
            "fieldName": "hw.fan.speed_count"
          },
          {
            "type": "longSum",
            "name": "hw.fan.speed-Sum",
            "fieldName": "hw.fan.speed"
          }
        ],
        "postAggregations": [
          {
            "type": "expression",
            "name": "fan_speed",
            "expression": "(\\"hw.fan.speed-Sum\\" / \\"count\\")"
          }
        ]
  }`,
        },
      } as any,
    ],
  });

  const fanSpeedDataTransformer = new SceneDataTransformer({
    $data: fanSpeedQueryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Fan Speed (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const fanSpeedPanel = PanelBuilders.timeseries()
    .setTitle('Fan speed per Host (Avg)')
    .setData(fanSpeedDataTransformer)
    .setUnit('rotrpm')
    .setCustomFieldConfig('axisSoftMin', 0)
    .build();

  // Row 4: Host Temperature - nested tabs
  const temperatureTab = getTemperatureTab();
  const coolingBudgetTab = getCoolingBudgetTab();

  const hostTemperatureTabs = new TabbedScene({
    tabs: [
      { id: 'temperature', label: 'Temperature', getBody: () => temperatureTab },
      { id: 'cooling-budget', label: 'Cooling Budget', getBody: () => coolingBudgetTab },
    ],
    activeTab: 'temperature',
    body: temperatureTab,
  });

  // Combine all rows in a column layout
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Row 1: Power Supply Status
      new SceneFlexItem({
        height: 300,
        body: powerSupplyPanel,
      }),
      // Row 2: Host Power Consumption (2 panels side by side)
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: powerConsumptionTimeseriesPanel,
            }),
            new SceneFlexItem({
              width: '50%',
              body: powerConsumptionTablePanel,
            }),
          ],
        }),
      }),
      // Row 3: Fan Speed
      new SceneFlexItem({
        height: 300,
        body: fanSpeedPanel,
      }),
      // Row 4: Host Temperature (nested tabs)
      new SceneFlexItem({
        height: 600,
        body: hostTemperatureTabs,
      }),
    ],
  });
}

// Helper function for Temperature tab (panel-9)
function getTemperatureTab() {
  const temperatureQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      // Query A: Intake Temperature
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "server_front"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      } as any,
      // Query B: P1_TEMP_SENS
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P1_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      } as any,
      // Query C: P2_TEMP_SENS
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P2_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const temperatureDataTransformer = new SceneDataTransformer({
    $data: temperatureQueryRunner,
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
          byField: 'Hostname',
          mode: 'outer',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'Hostname': '',
            'Trend #A': 'Intake Temperature',
            'Trend #B': 'Processor 1',
            'Trend #C': 'Processor 2',
          },
        },
      },
    ],
  });

  const temperaturePanel = PanelBuilders.table()
    .setTitle('')
    .setData(temperatureDataTransformer)
    .setOption('cellHeight', 'lg')
    .setOverrides((builder) => {
      builder.matchFieldsByQuery('/Temperature|Processor/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: temperaturePanel,
      }),
    ],
  });
}

// Helper function for Cooling Budget tab (panel-21)
function getCoolingBudgetTab() {
  const coolingBudgetQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      // Query A: Intake Temperature difference
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max_temp', text: 'Max Temp (DEBUG)', type: 'number' },
          { selector: 'event.threshold', text: 'Threshold (DEBUG)', type: 'number' },
          { selector: 'event.difference', text: 'Difference', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "server_front"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      },
      {
        "type": "doubleLast",
        "name": "threshold",
        "fieldName": "hw.temperature.limit_high_critical"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "difference",
        "expression": "(\\"threshold\\" - \\"max_temp\\")"
      }
    ]
  }`,
        },
      } as any,
      // Query B: P1_TEMP_SENS difference
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.difference', text: 'Difference', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P1_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      },
      {
        "type": "doubleLast",
        "name": "threshold",
        "fieldName": "hw.temperature.limit_high_degraded"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "difference",
        "expression": "(\\"threshold\\" - \\"max_temp\\")"
      }
    ]
  }`,
        },
      } as any,
      // Query C: P2_TEMP_SENS difference
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.difference', text: 'Difference', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ServerName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P2_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      },
      {
        "type": "doubleLast",
        "name": "threshold",
        "fieldName": "hw.temperature.limit_high_degraded"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "difference",
        "expression": "(\\"threshold\\" - \\"max_temp\\")"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const coolingBudgetDataTransformer = new SceneDataTransformer({
    $data: coolingBudgetQueryRunner,
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
          byField: 'Hostname',
          mode: 'outer',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'Hostname': '',
            'Trend #A': 'Intake Temperature',
            'Trend #B': 'Processor 1',
            'Trend #C': 'Processor 2',
          },
        },
      },
    ],
  });

  const coolingBudgetPanel = PanelBuilders.table()
    .setTitle('')
    .setData(coolingBudgetDataTransformer)
    .setOption('cellHeight', 'lg')
    .setOverrides((builder) => {
      builder.matchFieldsByQuery('/Temperature|Processor/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: coolingBudgetPanel,
      }),
    ],
  });
}

function getCPUUtilizationTab() {
  // Create query runner with 3 timeseries queries
  const baseQueryRunner = new SceneQueryRunner({
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
    "dimensions": ["host_name"],
    "virtualColumns": [{
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
          "dimension": "host.name",
          "values": [\${ServerName:doublequote}]
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
    "dimensions": ["host_name"],
    "virtualColumns": [{
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
          "dimension": "host.name",
          "values": [\${ServerName:doublequote}]
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
    "dimensions": ["host_name"],
    "virtualColumns": [{
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
          "dimension": "host.name",
          "values": [\${ServerName:doublequote}]
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

  // Wrap with transformer to convert timeseries to table and join by Host Name
  const queryRunner = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      // Convert timeseries to table format with explicit time fields
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
          C: { timeField: 'Time' },
        },
      },
      // Join all queries by Host Name field (using outer join to be more forgiving)
      {
        id: 'joinByField',
        options: {
          byField: 'Host Name',
          mode: 'outer',
        },
      },
      // Organize and rename columns
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
    .setData(queryRunner)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'lg')
    .setOption('sortBy', [{ displayName: 'Utilization', desc: true }])
    .setOverrides((builder) => {
      // Utilization column - percentunit with bar gauge
      builder.matchFieldsWithName('Utilization')
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
      builder.matchFieldsByQuery('/CPU.*Temperature/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: tablePanel,
      }),
    ],
  });
}

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
            asdf: '',
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

      builder
        .matchFieldsWithName('Self Encryption')
        .overrideColor({
          mode: 'thresholds',
        })
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

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
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
        height: 600,
        body: panel,
      }),
    ],
  });
}

// Helper function for HDD Disks sub-tab (panel-208)
function getHDDDisksPanel() {
  // HDD panel is nearly identical to SSD panel, just with Type eq 'HDD' filter
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
        height: 600,
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
        height: 600,
        body: panel,
      }),
    ],
  });
}

function getStorageTab() {
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

  // Wrap the TabbedScene in a SceneFlexLayout as per Grafana Scenes pattern
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 'calc(100vh - 180px)',
        body: storageTabs,
      }),
    ],
  });
}

const standaloneTabs = [
  { id: 'overview', label: 'Overview', getBody: getOverviewTab },
  { id: 'inventory', label: 'Inventory', getBody: getInventoryTab },
  { id: 'alarms', label: 'Alarms', getBody: getAlarmsTab },
  { id: 'actions', label: 'Actions', getBody: getActionsTab },
  { id: 'ports', label: 'Ports', getBody: getPortsTab },
  { id: 'network-utilization', label: 'Network Utilization', getBody: getNetworkUtilizationTab },
  { id: 'network-errors', label: 'Network Errors', getBody: getNetworkErrorsTab },
  { id: 'environmental', label: 'Environmental', getBody: getEnvironmentalTab },
  { id: 'cpu-utilization', label: 'CPU Utilization', getBody: getCPUUtilizationTab },
  { id: 'storage', label: 'Storage', getBody: getStorageTab },
];

export function getStandaloneSceneBody() {
  // Create ServerName variable - scoped to Standalone tab
  const serverNameVariable = new QueryVariable({
    name: 'ServerName',
    label: 'Server',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/compute/RackUnits?$filter=ManagementMode eq \'IntersightStandalone\'',
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
  });

  // Create RegisteredDevices variable - hidden, depends on ServerName
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
        url: '/api/v1/asset/DeviceRegistrations?$filter=DeviceHostname in (${ServerName:singlequote})',
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

  // Create variable set for Standalone tab
  const variables = new SceneVariableSet({
    variables: [serverNameVariable, registeredDevicesVariable],
  });

  // Create the tabbed scene with controls on same line as tabs
  return new TabbedScene({
    $variables: variables,
    tabs: standaloneTabs,
    activeTab: 'overview',
    body: getOverviewTab(),
    controls: [new VariableValueSelectors({})],
  });
}
