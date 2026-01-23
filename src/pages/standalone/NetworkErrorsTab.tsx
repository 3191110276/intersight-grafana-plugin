import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';

export function getNetworkErrorsTab() {
  // Row 1, Panel 1: Total transmit errors per physical port (panel-219)
  const txErrorsQueryRunner = new LoggingQueryRunner({
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

  const txErrorsTransformer = new LoggingDataTransformer({
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
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Row 1, Panel 2: Total receive errors per physical port (panel-221)
  const rxErrorsQueryRunner = new LoggingQueryRunner({
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

  const rxErrorsTransformer = new LoggingDataTransformer({
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
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Row 1, Panel 3: Detailed error counts table (panel-28)
  const errorDetailsQueryRunner = new LoggingQueryRunner({
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

  const errorDetailsTransformer = new LoggingDataTransformer({
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
  const errorDescriptionsQueryRunner = new LoggingQueryRunner({
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

  const errorDescriptionsTransformer = new LoggingDataTransformer({
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
      builder.matchFieldsWithNameByRegex('.*')
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
        ySizing: 'content',
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
        ySizing: 'content',
        body: errorDetailsPanel,
      }),
      // Row 2: Virtual Ports (empty - no panels)
      // Row 3: Error Descriptions (tall table)
      new SceneFlexItem({
        ySizing: 'fill',
        body: errorDescriptionsPanel,
      }),
    ],
  });
}
