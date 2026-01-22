import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
} from '@grafana/scenes';

export function getPortsTab() {
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
        ySizing: 'fill',
        body: tablePanel,
      }),
    ],
  });
}
