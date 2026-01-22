/**
 * Congestion Tab - IMM Domain Scene
 *
 * This module provides the Congestion tab functionality for the IMM Domain scene.
 * Shows congestion metrics for FI uplinks and IFM uplinks/downlinks with nested tabs.
 */

import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';

export function getCongestionTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 'auto',
        body: getCongestionTransmitPanel(),
      }),
      new SceneFlexItem({
        height: 'auto',
        body: getCongestionReceivePanel(),
      }),
    ],
  });
}

// Panel 179: Transmit pause frames per port (Sum)
function getCongestionTransmitPanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "domain_name",
      "host_name",
      "chassis_number",
      "port_role",
      "name",
      "port_spec"
    ],
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
    },{
      "type": "nested-field",
      "columnName": "hw.chassis.number",
      "outputName": "chassis_number",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "port_spec",
      "expression": "concat(port_role + ' # ' + name)",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        { "type": "not", "field":
          {
            "type": "in",
            "dimension": "hw.network.port.role",
            "values": [
              "eth_uplink_pc",
              "host_pc",
              "server_pc",
              "fabric_pc",
              "fc_uplink",
              "fc_storage",
              "iom_uplink",
              "vnic",
              "vhba",
              "vethernet",
              "vfc",
              "unconfigured"
            ]
          }
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
        "name": "eth_pause",
        "fieldName": "hw.errors_network_transmit_pause"
      },
      {
        "type": "longSum",
        "name": "fc_pause",
        "fieldName": "hw.network.packets_transmit_ppp"
      }
    ]
  }`,
        },
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.port_role', text: 'Role', type: 'string' },
          { selector: 'event.eth_pause', text: 'Ethernet', type: 'number' },
          { selector: 'event.fc_pause', text: 'FC', type: 'number' },
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Fabric', type: 'string' },
          { selector: 'event.chassis_number', text: 'Chassis', type: 'string' },
          { selector: 'event.port_spec', text: 'Port', type: 'string' },
        ],
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          binary: {
            left: {
              matcher: {
                id: 'byName',
                options: 'Ethernet',
              },
            },
            right: {
              matcher: {
                id: 'byName',
                options: 'FC',
              },
            },
          },
          mode: 'binary',
          reduce: {
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Time: true,
          },
          includeByName: {},
          indexByName: {
            Chassis: 2,
            Domain: 0,
            Ethernet: 7,
            FC: 8,
            Fabric: 1,
            Port: 3,
            Role: 4,
            Time: 5,
            Total: 6,
          },
          renameByName: {
            Ethernet: 'Ethernet Congestion',
            FC: 'FC Congestion',
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
              fieldName: 'Total',
            },
            {
              config: {
                id: 'lowerOrEqual',
                options: {
                  value: 0,
                },
              },
              fieldName: 'Total',
            },
          ],
          match: 'any',
          type: 'exclude',
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('Transmit pause frames per port (Sum)')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setOverrides((builder) => {
      // Number fields - gauge visualization
      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'gauge',
          mode: 'gradient',
          valueDisplayMode: 'text',
        })
        .overrideCustomFieldConfig('align', 'left');

      // Fabric field
      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 75)
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '.*(A|B)',
              result: {
                index: 0,
                text: '$1',
              },
            },
          },
        ]);

      // Chassis field
      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      // Role field - with color mappings
      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'value',
            options: {
              appliance: { color: '#00ffff', index: 5, text: 'Appliance' },
              eth_monitor: { color: '#a020f0', index: 8, text: 'Ethernet SPAN' },
              eth_uplink: { color: '#1e90ff', index: 4, text: 'Ethernet Uplink' },
              fc_monitor: { color: '#ff1493', index: 9, text: 'FC SPAN' },
              fcoe_storage: { color: '#00ff00', index: 7, text: 'FCoE Storage' },
              fcoe_uplink: { color: '#006400', index: 6, text: 'FCoE Uplink' },
              host_port: { color: '#a0522d', index: 3, text: 'Host Port' },
              iom_uplink: { color: '#ff8c00', index: 2, text: 'IOM Uplink' },
              server: { color: '#ffd700', index: 1, text: 'Server' },
              unconfigured: { color: '#787878', index: 0, text: 'Unconfigured' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Port field - with complex regex mappings
      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 102)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$',
              result: { index: 0, text: 'Slot 1 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$',
              result: { index: 1, text: 'Slot 2 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$',
              result: { index: 2, text: 'Slot 3 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$',
              result: { index: 3, text: 'Slot 4 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$',
              result: { index: 4, text: 'Slot 5 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$',
              result: { index: 5, text: 'Slot 6 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$',
              result: { index: 6, text: 'Slot 7 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$',
              result: { index: 7, text: 'Slot 8 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$',
              result: { index: 8, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+).*$',
              result: { index: 9, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$',
              result: { index: 10, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*port-channel([0-9]*).*$',
              result: { index: 11, text: 'PC$1' },
            },
          },
        ]);

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [new SceneFlexItem({ body: panel })],
  });
}

// Panel 180: Receive pause frames per port (Sum)
function getCongestionReceivePanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "domain_name",
      "host_name",
      "chassis_number",
      "port_role",
      "name",
      "port_spec"
    ],
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
    },{
      "type": "nested-field",
      "columnName": "hw.chassis.number",
      "outputName": "chassis_number",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "port_spec",
      "expression": "concat(port_role + ' # ' + name)",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        { "type": "not", "field":
          {
            "type": "in",
            "dimension": "hw.network.port.role",
            "values": [
              "eth_uplink_pc",
              "host_pc",
              "server_pc",
              "fabric_pc",
              "fc_uplink",
              "fc_storage",
              "iom_uplink",
              "vnic",
              "vhba",
              "vethernet",
              "vfc",
              "unconfigured"
            ]
          }
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
        "name": "eth_pause",
        "fieldName": "hw.errors_network_receive_pause"
      },
      {
        "type": "longSum",
        "name": "fc_pause",
        "fieldName": "hw.network.packets_receive_ppp"
      }
    ]
  }`,
        },
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'string' },
          { selector: 'event.port_role', text: 'Role', type: 'string' },
          { selector: 'event.eth_pause', text: 'Ethernet', type: 'number' },
          { selector: 'event.fc_pause', text: 'FC', type: 'number' },
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Fabric', type: 'string' },
          { selector: 'event.chassis_number', text: 'Chassis', type: 'string' },
          { selector: 'event.port_spec', text: 'Port', type: 'string' },
        ],
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          binary: {
            left: {
              matcher: {
                id: 'byName',
                options: 'Ethernet',
              },
            },
            right: {
              matcher: {
                id: 'byName',
                options: 'FC',
              },
            },
          },
          mode: 'binary',
          reduce: {
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Time: true,
          },
          includeByName: {},
          indexByName: {
            Chassis: 2,
            Domain: 0,
            Ethernet: 7,
            FC: 8,
            Fabric: 1,
            Port: 3,
            Role: 4,
            Time: 5,
            Total: 6,
          },
          renameByName: {
            Ethernet: 'Ethernet Congestion',
            FC: 'FC Congestion',
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
              fieldName: 'Total',
            },
            {
              config: {
                id: 'lowerOrEqual',
                options: {
                  value: 0,
                },
              },
              fieldName: 'Total',
            },
          ],
          match: 'any',
          type: 'exclude',
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('Receive pause frames per port (Sum)')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setOverrides((builder) => {
      // Number fields - gauge visualization
      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'gauge',
          mode: 'gradient',
          valueDisplayMode: 'text',
        })
        .overrideCustomFieldConfig('align', 'left');

      // Fabric field
      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 75)
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '.*(A|B)',
              result: {
                index: 0,
                text: '$1',
              },
            },
          },
        ]);

      // Chassis field
      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      // Role field - with color mappings
      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'value',
            options: {
              appliance: { color: '#00ffff', index: 5, text: 'Appliance' },
              eth_monitor: { color: '#a020f0', index: 8, text: 'Ethernet SPAN' },
              eth_uplink: { color: '#1e90ff', index: 4, text: 'Ethernet Uplink' },
              fc_monitor: { color: '#ff1493', index: 9, text: 'FC SPAN' },
              fcoe_storage: { color: '#00ff00', index: 7, text: 'FCoE Storage' },
              fcoe_uplink: { color: '#006400', index: 6, text: 'FCoE Uplink' },
              host_port: { color: '#a0522d', index: 3, text: 'Host Port' },
              iom_uplink: { color: '#ff8c00', index: 2, text: 'IOM Uplink' },
              server: { color: '#ffd700', index: 1, text: 'Server' },
              unconfigured: { color: '#787878', index: 0, text: 'Unconfigured' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Port field - with complex regex mappings
      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 102)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$',
              result: { index: 0, text: 'Slot 1 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$',
              result: { index: 1, text: 'Slot 2 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$',
              result: { index: 2, text: 'Slot 3 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$',
              result: { index: 3, text: 'Slot 4 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$',
              result: { index: 4, text: 'Slot 5 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$',
              result: { index: 5, text: 'Slot 6 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$',
              result: { index: 6, text: 'Slot 7 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$',
              result: { index: 7, text: 'Slot 8 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$',
              result: { index: 8, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+).*$',
              result: { index: 9, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$',
              result: { index: 10, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*port-channel([0-9]*).*$',
              result: { index: 11, text: 'PC$1' },
            },
          },
        ]);

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [new SceneFlexItem({ body: panel })],
  });
}


// ============================================================================
// NETWORK ERRORS TAB HELPER FUNCTIONS
// ============================================================================

// Helper function for Error Descriptions panel (panel-24)
function getErrorDescriptionsPanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
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

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('filterable', false)
        .overrideCustomFieldConfig('wrapText', true);

      builder.matchFieldsWithName('Error')
        .overrideCustomFieldConfig('width', 140);

      builder.matchFieldsWithName('CLI value')
        .overrideCustomFieldConfig('width', 200);

      builder.matchFieldsWithName('Direction')
        .overrideCustomFieldConfig('width', 90);
    })
    .build();
}

// Network Errors Tab Helper Functions - Panel implementations for all error monitoring

// Creates base query runner for network errors with configurable role
function createNetworkErrorsQueryRunner(role: string, filterType: 'role' | 'type' = 'role') {
  const filterConfig = filterType === 'role'
    ? {
        type: "selector",
        dimension: "hw.network.port.role",
        value: role
      }
    : {
        type: "or",
        fields: [
          { type: "selector", dimension: "hw.network.port.type", value: "vnic" },
          { type: "selector", dimension: "hw.network.port.type", value: "vhba" }
        ]
      };

  return new SceneQueryRunner({
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
          { selector: 'event.Identifier', text: 'Port', type: 'string' },
          { selector: 'event.total', text: 'Total', type: 'number' },
          { selector: 'event.tx_sum', text: 'Total TX', type: 'number' },
          { selector: 'event.deferred', text: 'Deferred', type: 'number' },
          { selector: 'event.late_collisions', text: 'Late Collision', type: 'number' },
          { selector: 'event.carrier_sense', text: 'Carrier Sense', type: 'number' },
          { selector: 'event.tx_discard', text: 'TX Discard', type: 'number' },
          { selector: 'event.jabber', text: 'Jabber', type: 'number' },
          { selector: 'event.rx_sum', text: 'Total RX', type: 'number' },
          { selector: 'event.runt', text: 'Runt', type: 'number' },
          { selector: 'event.too_long', text: 'Too Long', type: 'number' },
          { selector: 'event.crc', text: 'CRC', type: 'number' },
          { selector: 'event.no_buffer', text: 'No Buffer', type: 'number' },
          { selector: 'event.too_short', text: 'Too Short', type: 'number' },
          { selector: 'event.rx_discard', text: 'RX Discard', type: 'number' },
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_content_type: 'application/json',
          body_type: 'raw',
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
      "Identifier"${filterType === 'role' ? ',\n      "host_name"' : ''}
    ],
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
    },{
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + ' (' + host_name + ' ' + name + ')')",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        ${filterType === 'role' ? `{
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },` : ''}
        ${JSON.stringify(filterConfig)},
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
}

// Panel 95/100: FI Ethernet Uplink TX Errors
function getFIEthernetUplinkTXErrorsPanel(fiFilter: string) {
  const queryRunner = createNetworkErrorsQueryRunner('eth_uplink');

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [{
            config: { id: 'substring', options: { value: fiFilter } },
            fieldName: 'Hostname',
          }],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'groupingToMatrix',
        options: { columnField: 'Port', rowField: 'Time', valueField: 'Total TX' },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(`${fiFilter === 'FI-A' ? 'A' : 'B'}: Transmit errors per uplink port (Sum)`)
    .setData(transformer)
    .build();
}

// Panel 101/102: FI Ethernet Uplink RX Errors
function getFIEthernetUplinkRXErrorsPanel(fiFilter: string) {
  const queryRunner = createNetworkErrorsQueryRunner('eth_uplink');

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [{
            config: { id: 'substring', options: { value: fiFilter } },
            fieldName: 'Hostname',
          }],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'groupingToMatrix',
        options: { columnField: 'Port', rowField: 'Time', valueField: 'Total RX' },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(`${fiFilter === 'FI-A' ? 'A' : 'B'}: Receive errors per uplink port (Sum)`)
    .setData(transformer)
    .build();
}

// Panel 25: FI Ethernet Uplink Detail Table
function getFIEthernetUplinkDetailTable() {
  return PanelBuilders.table()
    .setTitle('')
    .setData(createNetworkErrorsQueryRunner('eth_uplink'))
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .build();
}

// Panel 47/51: FI Ethernet Uplink Port Channel TX Errors
function getFIEthernetUplinkPortChannelTXErrorsPanel(fiFilter: string) {
  const queryRunner = createNetworkErrorsQueryRunner('eth_uplink_port_channel');

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [{
            config: { id: 'substring', options: { value: fiFilter } },
            fieldName: 'Hostname',
          }],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'groupingToMatrix',
        options: { columnField: 'Port', rowField: 'Time', valueField: 'Total TX' },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(`${fiFilter === 'FI-A' ? 'A' : 'B'}: Transmit errors per uplink port channel (Sum)`)
    .setData(transformer)
    .build();
}

// Panel 48/52: FI Ethernet Uplink Port Channel RX Errors
function getFIEthernetUplinkPortChannelRXErrorsPanel(fiFilter: string) {
  const queryRunner = createNetworkErrorsQueryRunner('eth_uplink_port_channel');

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [{
            config: { id: 'substring', options: { value: fiFilter } },
            fieldName: 'Hostname',
          }],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'groupingToMatrix',
        options: { columnField: 'Port', rowField: 'Time', valueField: 'Total RX' },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(`${fiFilter === 'FI-A' ? 'A' : 'B'}: Receive errors per uplink port channel (Sum)`)
    .setData(transformer)
    .build();
}

// Panel 45: FI Ethernet Uplink Port Channel Detail Table
function getFIEthernetUplinkPortChannelDetailTable() {
  return PanelBuilders.table()
    .setTitle('')
    .setData(createNetworkErrorsQueryRunner('eth_uplink_port_channel'))
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .build();
}

// ============================================================================
// Network Errors Tab - Base Query and Panel Implementations
// ============================================================================

// Base query runner for Network Errors - shared by multiple panels (panel-25 equivalent)
// This query fetches all network error metrics from the NetworkInterfaces dataSource
function createNetworkErrorsBaseQueryRunner() {
  return new SceneQueryRunner({
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
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.name', text: 'Port', type: 'string' },
          { selector: 'event.runt', text: 'Runt', type: 'number' },
          { selector: 'event.too_long', text: 'Too Long', type: 'number' },
          { selector: 'event.crc', text: 'CRC', type: 'number' },
          { selector: 'event.no_buffer', text: 'No Buffer', type: 'number' },
          { selector: 'event.too_short', text: 'Too Short', type: 'number' },
          { selector: 'event.rx_discard', text: 'RX Discard', type: 'number' },
          { selector: 'event.deferred', text: 'Deferred', type: 'number' },
          { selector: 'event.late_collisions', text: 'Late Collisions', type: 'number' },
          { selector: 'event.carrier_sense', text: 'Carrier Sense', type: 'number' },
          { selector: 'event.tx_discard', text: 'TX Discard', type: 'number' },
          { selector: 'event.jabber', text: 'Jabber', type: 'number' },
          { selector: 'event.port_type', text: 'Port Type', type: 'string' },
          { selector: 'event.port_role', text: 'Port Role', type: 'string' },
          { selector: 'event.chassis_number', text: 'Chassis', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "domain_name",
      "host_name",
      "name",
      "port_type",
      "port_role",
      "chassis_number"
    ],
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
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.type",
      "outputName": "port_type",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.chassis.number",
      "outputName": "chassis_number",
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
}

// Panel 26: FI Downlinks Panel (Fabric Interconnect Downlinks - server ports)
// Filters for Port Type='ethernet' AND Port Role='server'
function getFIDownlinksPanel() {
  const queryRunner = createNetworkErrorsBaseQueryRunner();

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'equal', options: { value: 'ethernet' } },
              fieldName: 'Port Type',
            },
            {
              config: { id: 'equal', options: { value: 'server' } },
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
            'Chassis': true,
            'Chassis Number': true,
            'Port Role': true,
            'Port Type': true,
          },
          indexByName: {
            'CRC': 7,
            'Carrier Sense': 14,
            'Deferred': 12,
            'Domain': 0,
            'Hostname': 1,
            'Jabber': 16,
            'Late Collisions': 13,
            'No Buffer': 8,
            'Port': 2,
            'Port Role': 17,
            'Port Type': 18,
            'RX Discard': 10,
            'RX Total': 4,
            'Runt': 5,
            'TX Discard': 15,
            'TX Total': 11,
            'Too Long': 6,
            'Too Short': 9,
            'Total': 3,
          },
          renameByName: {
            'Hostname': 'FI',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Total',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'transparent', value: 0 },
        { color: '#EAB839', value: 10 },
        { color: 'dark-red', value: 80 },
      ],
    })
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setCustomFieldConfig('wrapText', false)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('FI')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+).*$',
              result: { index: 0, text: '$1' },
            },
          },
        ]);

      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', { applyToRow: false, mode: 'basic', type: 'color-background' })
        .overrideCustomFieldConfig('wrapText', false)
        .overrideCustomFieldConfig('width', 120);
    })
    .build();
}

// Panel 27: IFM Uplinks Panel
// Filters for Port Type='ethernet' AND Port Role='iom_uplink'
function getIFMUplinksPanel() {
  const queryRunner = createNetworkErrorsBaseQueryRunner();

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'equal', options: { value: 'ethernet' } },
              fieldName: 'Port Type',
            },
            {
              config: { id: 'equal', options: { value: 'iom_uplink' } },
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
            'Carrier Sense': true,
            'Chassis': true,
            'Chassis Number': true,
            'Deferred': true,
            'Jabber': true,
            'Late Collisions': true,
            'No Buffer': true,
            'Port Role': true,
            'Port Type': true,
            'RX Discard': true,
            'Runt': true,
            'TX Discard': true,
          },
          indexByName: {
            'CRC': 7,
            'Carrier Sense': 14,
            'Deferred': 12,
            'Domain': 0,
            'Hostname': 1,
            'Jabber': 16,
            'Late Collisions': 13,
            'No Buffer': 8,
            'Port': 2,
            'Port Role': 17,
            'Port Type': 18,
            'RX Discard': 10,
            'RX Total': 4,
            'Runt': 5,
            'TX Discard': 15,
            'TX Total': 11,
            'Too Long': 6,
            'Too Short': 9,
            'Total': 3,
          },
          renameByName: {
            'Hostname': 'FI',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Total',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'transparent', value: 0 },
        { color: '#EAB839', value: 10 },
        { color: 'dark-red', value: 80 },
      ],
    })
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setCustomFieldConfig('wrapText', false)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('FI')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+).*$',
              result: { index: 0, text: '$1' },
            },
          },
        ]);

      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', { applyToRow: false, mode: 'basic', type: 'color-background' })
        .overrideCustomFieldConfig('wrapText', false)
        .overrideCustomFieldConfig('width', 120);
    })
    .build();
}

// Panel 28: IFM Downlinks Panel (backplane_port + host_port)
// Filters for Port Type='backplane_port' AND Port Role='host_port'
function getIFMDownlinksPanel() {
  const queryRunner = createNetworkErrorsBaseQueryRunner();

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'equal', options: { value: 'backplane_port' } },
              fieldName: 'Port Type',
            },
            {
              config: { id: 'equal', options: { value: 'host_port' } },
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
            'Hostname': 'FI',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Runt',
            },
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Deferred',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'transparent', value: 0 },
        { color: '#EAB839', value: 10 },
        { color: 'dark-red', value: 80 },
      ],
    })
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setCustomFieldConfig('wrapText', false)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('FI')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
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

      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', { applyToRow: false, mode: 'basic', type: 'color-background' })
        .overrideCustomFieldConfig('wrapText', false)
        .overrideCustomFieldConfig('width', 120);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();
}

// Panel 29: vNIC/vHBA Panel
// Filters for Port Role='vnic' OR Port Role='vhba'
function getVNICVHBAPanel() {
  const queryRunner = createNetworkErrorsBaseQueryRunner();

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'equal', options: { value: 'vnic' } },
              fieldName: 'Port Role',
            },
            {
              config: { id: 'equal', options: { value: 'vhba' } },
              fieldName: 'Port Role',
            },
          ],
          match: 'any',
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
            'Carrier Sense': true,
            'Chassis': false,
            'Chassis Number': true,
            'Deferred': true,
            'Jabber': true,
            'Late Collisions': true,
            'Port Role': true,
            'Port Type': true,
            'RX Discard': true,
            'Runt': true,
            'TX Discard': true,
            'Too Long': true,
            'Too Short': true,
          },
          indexByName: {
            'CRC': 8,
            'Carrier Sense': 15,
            'Chassis': 1,
            'Deferred': 13,
            'Domain': 0,
            'Hostname': 2,
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
            'Port': 'vNIC/vHBA',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Total',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'transparent', value: 0 },
        { color: '#EAB839', value: 10 },
        { color: 'dark-red', value: 80 },
      ],
    })
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setCustomFieldConfig('wrapText', false)
    .setOverrides((builder) => {
      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', { applyToRow: false, mode: 'basic', type: 'color-background' })
        .overrideCustomFieldConfig('wrapText', false)
        .overrideCustomFieldConfig('width', 120);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Server')
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('vNIC/vHBA')
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();
}

