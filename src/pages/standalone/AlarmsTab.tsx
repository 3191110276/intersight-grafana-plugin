import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
} from '@grafana/scenes';

export function getAlarmsTab() {
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
        ySizing: 'fill',
        body: alarmsPanel,
      }),
    ],
  });
}
