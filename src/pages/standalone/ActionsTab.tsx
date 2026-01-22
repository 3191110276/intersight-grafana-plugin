import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
} from '@grafana/scenes';

export function getActionsTab() {
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
        ySizing: 'fill',
        body: actionsPanel,
      }),
    ],
  });
}
