import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
} from '@grafana/scenes';

/**
 * Creates a panel for eCMC External Ports (panel-212 from original dashboard)
 * This panel displays physical ethernet ports for the chassis
 */
function getEcmcExternalPortsPanel() {
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
        url: '/api/v1/ether/PhysicalPorts?$filter=Ancestors.Moid in (${RegisteredDevices:singlequote})',
        root_selector: '$.Results',
        columns: [
          { selector: 'MacAddress', text: 'MacAddress', type: 'string' },
          { selector: 'Mode', text: 'Mode', type: 'string' },
          { selector: 'OperSpeed', text: 'OperSpeed', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'OperStateQual', text: 'OperStateQual', type: 'string' },
          { selector: 'PortChannelId', text: 'PortChannelId', type: 'string' },
          { selector: 'PortGroup', text: 'PortGroup', type: 'string' },
          { selector: 'PortId', text: 'PortId', type: 'string' },
          { selector: 'PortName', text: 'PortName', type: 'string' },
          { selector: 'Role', text: 'Role', type: 'string' },
          { selector: 'SwitchId', text: 'SwitchId', type: 'string' },
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
            PortGroup: true,
            PortName: true,
          },
          includeByName: {},
          indexByName: {
            Chassis: 0,
            MacAddress: 11,
            Mode: 7,
            OperSpeed: 6,
            OperState: 4,
            OperStateQual: 5,
            PortChannelId: 9,
            PortGroup: 10,
            PortId: 2,
            PortName: 3,
            Role: 8,
            SwitchId: 1,
          },
          renameByName: {
            OperSpeed: 'Operational Speed',
            OperState: 'Operational State',
            OperStateQual: 'Operational Reason',
            PortChannelId: 'Port Channel ID',
            PortId: 'Port',
            SwitchId: 'eCMC',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('eCMC External Ports')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Operational Reason column mapping
      builder.matchFieldsWithName('Operational Reason')
        .overrideMappings([
          {
            type: 'value',
            options: {
              none: { index: 0, text: '-' },
            },
          },
        ]);

      // Operational State column with color text
      builder.matchFieldsWithName('Operational State')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              down: { color: '#7c0614', index: 1, text: 'Down' },
              up: { color: 'green', index: 0, text: 'Up' },
            },
          },
        ]);
    })
    .build();
}

/**
 * Creates a panel for Server Ports (panel-213 from original dashboard)
 * This panel displays adapter external ethernet interfaces for servers
 */
function getServerPortsPanel() {
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
        url: '/api/v1/adapter/ExtEthInterfaces?$filter=Ancestors.Moid in (${RegisteredDevices:singlequote})&$expand=AdapterUnit($expand=ComputeBlade)',
        root_selector: '$.Results',
        columns: [
          { selector: 'AdapterUnit.ComputeBlade.Name', text: 'Server', type: 'string' },
          { selector: 'ExtEthInterfaceId', text: 'ExtEthInterfaceId', type: 'string' },
          { selector: 'MacAddress', text: 'MacAddress', type: 'string' },
          { selector: 'OperReason.0', text: 'OperReason', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'PeerPortId', text: 'PeerPortId', type: 'string' },
          { selector: 'SwitchId', text: 'SwitchId', type: 'string' },
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
            PeerPortId: true,
          },
          includeByName: {},
          indexByName: {
            ExtEthInterfaceId: 1,
            MacAddress: 6,
            OperReason: 3,
            OperState: 2,
            PeerPortId: 5,
            Server: 0,
            SwitchId: 4,
          },
          renameByName: {
            ExtEthInterfaceId: 'Interface',
            MacAddress: 'MAC Address',
            OperReason: 'Operational Cause',
            OperState: 'Operational State',
            SwitchId: 'Switch ID',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Server Ports')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('sortBy', [{ displayName: 'Server', desc: false }])
    .setOverrides((builder) => {
      // Operational Cause column - fixed red color
      builder.matchFieldsWithName('Operational Cause')
        .overrideColor({ mode: 'fixed', fixedColor: '#7c0614' });

      // Operational State column with color text
      builder.matchFieldsWithName('Operational State')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              down: { color: '#7c0614', index: 1, text: 'Down' },
              up: { color: 'green', index: 0, text: 'Up' },
            },
          },
        ]);
    })
    .build();
}

/**
 * Creates the Ports tab layout
 *
 * Structure from original dashboard (line 20465):
 * - Ports tab contains a nested TabsLayout that repeats by ChassisName variable
 * - Each chassis tab contains:
 *   - panel-212: eCMC External Ports
 *   - panel-213: Server Ports
 *
 * Note: The original dashboard uses a "repeat" mode with ChassisName variable.
 * In this Scenes implementation, we create a simplified layout with the panels.
 * For full variable-based tab repetition, additional logic would be needed
 * to dynamically create tabs based on ChassisName variable values.
 */
export function getPortsTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 400,
        body: getEcmcExternalPortsPanel(),
      }),
      new SceneFlexItem({
        height: 400,
        body: getServerPortsPanel(),
      }),
    ],
  });
}
