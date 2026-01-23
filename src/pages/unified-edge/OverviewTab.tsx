import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { TabbedScene } from '../../components/TabbedScene';

// ============================================================================
// OVERVIEW TAB - Unified Edge Dashboard
// ============================================================================

export function getOverviewTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Alarms row - repeated by DomainName variable
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Alarms',
              isCollapsed: false,
              y: 0,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 0,
                  width: 6,
                  height: 5,
                  body: getAlarmsPanel(),
                  $behaviors: [
                    {
                      _isSceneBehavior: true,
                      repeatDirection: 'h',
                      variableName: 'DomainName',
                      maxPerRow: 4,
                    } as any,
                  ],
                }),
              ],
            }),
          ],
        }),
      }),

      // Actions row - repeated by DomainName variable
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Actions',
              isCollapsed: false,
              y: 5,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 5,
                  width: 6,
                  height: 5,
                  body: getActionsPanel(),
                  $behaviors: [
                    {
                      _isSceneBehavior: true,
                      repeatDirection: 'h',
                      variableName: 'DomainName',
                      maxPerRow: 4,
                    } as any,
                  ],
                }),
              ],
            }),
          ],
        }),
      }),

      // Network Utilization with nested tabs
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Network Utilization',
              isCollapsed: false,
              y: 10,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 10,
                  width: 24,
                  height: 12,
                  body: getNetworkUtilizationTabs(),
                }),
              ],
            }),
          ],
        }),
      }),

      // Congestion row
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Congestion',
              isCollapsed: false,
              y: 22,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 22,
                  width: 12,
                  height: 12,
                  body: getTransmitPausePanel(),
                }),
                new SceneGridItem({
                  x: 12,
                  y: 22,
                  width: 12,
                  height: 12,
                  body: getReceivePausePanel(),
                }),
              ],
            }),
          ],
        }),
      }),

      // Network Errors row
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Network Errors',
              isCollapsed: false,
              y: 34,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 34,
                  width: 24,
                  height: 12,
                  body: getNetworkErrorsPanel(),
                }),
              ],
            }),
          ],
        }),
      }),

      // CPU Utilization row
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'CPU Utilization',
              isCollapsed: false,
              y: 46,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 46,
                  width: 12,
                  height: 12,
                  body: getCPUUtilizationPerDomainPanel(),
                }),
                new SceneGridItem({
                  x: 12,
                  y: 46,
                  width: 12,
                  height: 12,
                  body: getTopServersByCPUPanel(),
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// PANEL DEFINITIONS
// ============================================================================

// Panel 173 - Alarms (repeated by DomainName)
function getAlarmsPanel() {
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
        url: "/api/v1/cond/Alarms?$filter=((startswith(AffectedMoDisplayName, '${DomainName:text}')) and Severity ne 'Cleared')&$apply=groupby((Severity),%20aggregate($count%20as%20count))",
        root_selector: '$.Results',
        columns: [],
        filters: [],
        url_options: {
          data: '',
          method: 'GET',
        },
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'rowsToFields',
        options: {
          mappings: [
            {
              fieldName: 'Severity',
              handlerKey: 'field.name',
            },
            {
              fieldName: 'count',
              handlerKey: 'field.value',
            },
          ],
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            Critical: 0,
            Warning: 1,
          },
          renameByName: {},
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('${DomainName}')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Critical')
        .overrideColor({
          fixedColor: 'dark-red',
          mode: 'fixed',
        });

      builder
        .matchFieldsWithName('Warning')
        .overrideColor({
          fixedColor: 'dark-orange',
          mode: 'fixed',
        });

      builder
        .matchFieldsWithName('Info')
        .overrideColor({
          fixedColor: 'dark-blue',
          mode: 'fixed',
        });
    })
    .build();
}

// Panel 176 - Actions (repeated by DomainName)
function getActionsPanel() {
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
        url: "/api/v1/workflow/WorkflowInfos?$skip=0&$top=1000&$filter=((startswith(WorkflowCtx.TargetCtxList.TargetName, '${DomainName:text}')))&$apply=groupby((WorkflowStatus),%20aggregate($count%20as%20count))",
        root_selector: '$.Results',
        columns: [],
        filters: [],
        url_options: {
          data: '',
          method: 'GET',
        },
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'rowsToFields',
        options: {
          mappings: [
            {
              fieldName: 'count',
              handlerKey: 'field.value',
            },
            {
              fieldName: 'WorkflowStatus',
              handlerKey: 'field.name',
            },
          ],
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            Completed: 0,
            Failed: 1,
          },
          renameByName: {
            Completed: 'Success',
            Failed: 'Fail',
            Terminated: 'Terminated',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('${DomainName}')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Success')
        .overrideColor({
          fixedColor: 'dark-green',
          mode: 'fixed',
        });

      builder
        .matchFieldsWithName('Fail')
        .overrideColor({
          fixedColor: 'dark-red',
          mode: 'fixed',
        });

      builder
        .matchFieldsWithName('Terminated')
        .overrideColor({
          fixedColor: '#565656',
          mode: 'fixed',
        });
    })
    .build();
}

// Network Utilization Tabs Container
function getNetworkUtilizationTabs() {
  return new TabbedScene({
    tabs: [
      {
        label: 'Percentage (%)',
        content: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: getTransmitUtilizationPercentPanel(),
            }),
            new SceneFlexItem({
              width: '50%',
              body: getReceiveUtilizationPercentPanel(),
            }),
          ],
        }),
      },
      {
        label: 'Absolute (bps)',
        content: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: getTransmitUtilizationBpsPanel(),
            }),
            new SceneFlexItem({
              width: '50%',
              body: getReceiveUtilizationBpsPanel(),
            }),
          ],
        }),
      },
    ],
  });
}

// Panel 181 - Transmit utilization in % per port
function getTransmitUtilizationPercentPanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"NetworkInterfaces\",\n    \"granularity\": \"all\",\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\n      \"domain_name\",\n      \"host_name\",\n      \"chassis_number\",\n      \"port_role\",\n      \"name\",\n      \"port_spec\"\n    ],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"host.name\",\n      \"outputName\": \"host_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.chassis.number\",\n      \"outputName\": \"chassis_number\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.network.port.role\",\n      \"outputName\": \"port_role\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"expression\",\n      \"name\": \"port_spec\",\n      \"expression\": \"concat(port_role + ' # ' + name)\",\n      \"outputType\": \"STRING\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        { \"type\": \"not\", \"field\": \n        {\n          \"type\": \"in\",\n          \"dimension\": \"hw.network.port.role\",\n          \"values\": [\n            \"unconfigured\",\n            \"server_pc\",\n            \"fabric_pc\",\n            \"host_pc\",\n            \"vethernet\",\n            \"vfc\",\n            \"vnic\",\n            \"vhba\",\n            \"eth_uplink_pc\"\n          ]\n        }\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.network\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"doubleMax\",\n        \"name\": \"base_max_utilization\",\n        \"fieldName\": \"hw.network.bandwidth.utilization_transmit_max\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"count\",\n        \"fieldName\": \"hw.network.bandwidth.utilization_transmit_count\"\n      },\n      {\n        \"type\": \"doubleSum\",\n        \"name\": \"hw.network.bandwidth.utilization_transmit-Sum\",\n        \"fieldName\": \"hw.network.bandwidth.utilization_transmit\"\n      }\n    ],\n    \"postAggregations\": [\n      {\n        \"type\": \"expression\",\n        \"name\": \"avg_utilization\",\n        \"expression\": \"(\\\"hw.network.bandwidth.utilization_transmit-Sum\\\" / \\\"count\\\")*100\"\n      },\n      {\n        \"type\": \"expression\",\n        \"name\": \"max_utilization\",\n        \"expression\": \"\\\"base_max_utilization\\\"*100\"\n      }\n    ],\n    \"limitSpec\": {\n      \"type\": \"default\",\n      \"limit\": 250,\n      \"columns\": [{\n        \"dimension\" : \"avg_utilization\",\n        \"direction\" : \"descending\",\n        \"dimensionOrder\" : \"numeric\"\n        }]\n    }\n  }`,
          method: 'POST',
        },
        columns: [
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Fabric', type: 'string' },
          { selector: 'event.chassis_number', text: 'G', type: 'string' },
          { selector: 'event.port_role', text: 'I', type: 'string' },
          { selector: 'event.avg_utilization', text: 'J', type: 'number' },
          { selector: 'event.max_utilization', text: 'K', type: 'number' },
          { selector: 'event.link_speed', text: 'Link Speed', type: 'number' },
          { selector: 'event.port_spec', text: 'H', type: 'string' },
        ],
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'J',
            },
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'K',
            },
          ],
          match: 'any',
          type: 'exclude',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'Link Speed': true,
          },
          includeByName: {},
          indexByName: {},
          renameByName: {
            G: 'Chassis',
            H: 'Port',
            I: 'Role',
            J: 'Avg Utilization',
            K: 'Max Utilization',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Transmit utilization in % per port')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setCustomFieldConfig('filterable', true)
    .setDecimals(1)
    .setUnit('percent')
    .setMin(0)
    .setMax(100)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'green' },
        { value: 70, color: 'dark-yellow' },
        { value: 90, color: 'dark-red' },
      ],
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Avg Utilization')
        .overrideCustomFieldConfig('cellOptions', {
          mode: 'gradient',
          type: 'gauge',
          valueDisplayMode: 'text',
        });

      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 105)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$', result: { index: 0, text: 'Slot 1 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$', result: { index: 1, text: 'Slot 2 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$', result: { index: 2, text: 'Slot 3 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$', result: { index: 3, text: 'Slot 4 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$', result: { index: 4, text: 'Slot 5 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$', result: { index: 5, text: 'Slot 6 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$', result: { index: 6, text: 'Slot 7 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$', result: { index: 7, text: 'Slot 8 ($1)' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 8, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+).*$', result: { index: 9, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 10, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*port-channel([0-9]*).*$', result: { index: 11, text: 'PC$1' } } },
        ]);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();
}

// Panel 182 - Receive utilization in % per port
function getReceiveUtilizationPercentPanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"NetworkInterfaces\",\n    \"granularity\": \"all\",\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\n      \"domain_name\",\n      \"host_name\",\n      \"chassis_number\",\n      \"port_role\",\n      \"name\",\n      \"port_spec\"\n    ],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"host.name\",\n      \"outputName\": \"host_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.chassis.number\",\n      \"outputName\": \"chassis_number\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.network.port.role\",\n      \"outputName\": \"port_role\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"expression\",\n      \"name\": \"port_spec\",\n      \"expression\": \"concat(port_role + ' # ' + name)\",\n      \"outputType\": \"STRING\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        { \"type\": \"not\", \"field\": \n        {\n          \"type\": \"in\",\n          \"dimension\": \"hw.network.port.role\",\n          \"values\": [\n            \"unconfigured\",\n            \"server_pc\",\n            \"fabric_pc\",\n            \"host_pc\",\n            \"vethernet\",\n            \"vfc\",\n            \"vnic\",\n            \"vhba\",\n            \"eth_uplink_pc\"\n          ]\n        }\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.network\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"doubleMax\",\n        \"name\": \"base_max_utilization\",\n        \"fieldName\": \"hw.network.bandwidth.utilization_receive_max\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"count\",\n        \"fieldName\": \"hw.network.bandwidth.utilization_receive_count\"\n      },\n      {\n        \"type\": \"doubleSum\",\n        \"name\": \"hw.network.bandwidth.utilization_receive-Sum\",\n        \"fieldName\": \"hw.network.bandwidth.utilization_receive\"\n      }\n    ],\n    \"postAggregations\": [\n      {\n        \"type\": \"expression\",\n        \"name\": \"avg_utilization\",\n        \"expression\": \"(\\\"hw.network.bandwidth.utilization_receive-Sum\\\" / \\\"count\\\")*100\"\n      },\n      {\n        \"type\": \"expression\",\n        \"name\": \"max_utilization\",\n        \"expression\": \"\\\"base_max_utilization\\\"*100\"\n      }\n    ],\n    \"limitSpec\": {\n      \"type\": \"default\",\n      \"limit\": 250,\n      \"columns\": [{\n        \"dimension\" : \"avg_utilization\",\n        \"direction\" : \"descending\",\n        \"dimensionOrder\" : \"numeric\"\n        }]\n    }\n  }`,
          method: 'POST',
        },
        columns: [
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Fabric', type: 'string' },
          { selector: 'event.chassis_number', text: 'G', type: 'string' },
          { selector: 'event.port_spec', text: 'H', type: 'string' },
          { selector: 'event.port_role', text: 'I', type: 'string' },
          { selector: 'event.avg_utilization', text: 'J', type: 'number' },
          { selector: 'event.max_utilization', text: 'K', type: 'number' },
          { selector: 'event.link_speed', text: 'Link Speed', type: 'number' },
        ],
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'J',
            },
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'K',
            },
          ],
          match: 'any',
          type: 'exclude',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            H: false,
            'Link Speed': true,
          },
          includeByName: {},
          indexByName: {},
          renameByName: {
            G: 'Chassis',
            H: 'Port',
            I: 'Role',
            J: 'Avg Utilization',
            K: 'Max Utilization',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Receive utilization in % per port')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setCustomFieldConfig('filterable', true)
    .setDecimals(1)
    .setUnit('percent')
    .setMin(0)
    .setMax(100)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'green' },
        { value: 70, color: 'dark-yellow' },
        { value: 90, color: 'dark-red' },
      ],
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Avg Utilization')
        .overrideCustomFieldConfig('cellOptions', {
          mode: 'gradient',
          type: 'gauge',
          valueDisplayMode: 'text',
        });

      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 105)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$', result: { index: 0, text: 'Slot 1 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$', result: { index: 1, text: 'Slot 2 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$', result: { index: 2, text: 'Slot 3 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$', result: { index: 3, text: 'Slot 4 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$', result: { index: 4, text: 'Slot 5 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$', result: { index: 5, text: 'Slot 6 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$', result: { index: 6, text: 'Slot 7 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$', result: { index: 7, text: 'Slot 8 ($1)' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 8, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+).*$', result: { index: 9, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 10, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*port-channel([0-9]*).*$', result: { index: 11, text: 'PC$1' } } },
        ]);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();
}

// Panel 183 - Transmit utilization in bps per port
function getTransmitUtilizationBpsPanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"NetworkInterfaces\",\n    \"granularity\": \"all\",\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\n      \"domain_name\",\n      \"host_name\",\n      \"chassis_number\",\n      \"port_role\",\n      \"name\",\n      \"port_spec\"\n    ],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"host.name\",\n      \"outputName\": \"host_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.chassis.number\",\n      \"outputName\": \"chassis_number\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.network.port.role\",\n      \"outputName\": \"port_role\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"expression\",\n      \"name\": \"port_spec\",\n      \"expression\": \"concat(port_role + ' # ' + name)\",\n      \"outputType\": \"STRING\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        { \"type\": \"not\", \"field\": \n        {\n          \"type\": \"in\",\n          \"dimension\": \"hw.network.port.role\",\n          \"values\": [\n            \"unconfigured\",\n            \"server_pc\",\n            \"fabric_pc\",\n            \"host_pc\",\n            \"vethernet\",\n            \"vfc\",\n            \"vnic\",\n            \"vhba\",\n            \"eth_uplink_pc\"\n          ]\n        }\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.network\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"doubleMax\",\n        \"name\": \"base_utilization_max\",\n        \"fieldName\": \"hw.network.io_transmit_max\"\n      },\n      {\n        \"type\": \"doubleSum\",\n        \"name\": \"duration\",\n        \"fieldName\": \"hw.network.io_transmit_duration\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"sum\",\n        \"fieldName\": \"hw.network.io_transmit\"\n      },\n      {\n        \"type\": \"longLast\",\n        \"name\": \"base_link_speed\",\n        \"fieldName\": \"hw.network.bandwidth.limit\"\n      }\n    ],\n    \"postAggregations\": [\n      {\n        \"type\": \"expression\",\n        \"name\": \"max_utilization\",\n        \"expression\": \"(base_utilization_max*8)\"\n      },\n      {\n        \"type\": \"expression\",\n        \"name\": \"avg_utilization\",\n        \"expression\": \"(\\\"sum\\\" / \\\"duration\\\")*8\"\n      },\n      {\n        \"type\": \"expression\",\n        \"name\": \"link_speed\",\n        \"expression\": \"base_link_speed*8\"\n      }\n    ],\n    \"limitSpec\": {\n      \"type\": \"default\",\n      \"limit\": 250,\n      \"columns\": [{\n        \"dimension\" : \"avg_utilization\",\n        \"direction\" : \"descending\",\n        \"dimensionOrder\" : \"numeric\"\n        }]\n    }\n  }`,
          method: 'POST',
        },
        columns: [
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Fabric', type: 'string' },
          { selector: 'event.chassis_number', text: 'G', type: 'string' },
          { selector: 'event.port_spec', text: 'H', type: 'string' },
          { selector: 'event.port_role', text: 'I', type: 'string' },
          { selector: 'event.avg_utilization', text: 'J', type: 'number' },
          { selector: 'event.max_utilization', text: 'K', type: 'number' },
          { selector: 'event.link_speed', text: 'Link Speed', type: 'number' },
        ],
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'J',
            },
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'K',
            },
          ],
          match: 'any',
          type: 'exclude',
        },
      },
      {
        id: 'configFromData',
        options: {
          configRefId: 'A',
          mappings: [
            {
              fieldName: 'Link Speed',
              handlerKey: 'max',
            },
          ],
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'Link Speed': true,
          },
          includeByName: {},
          indexByName: {},
          renameByName: {
            G: 'Chassis',
            H: 'Port',
            I: 'Role',
            J: 'Avg Utilization',
            K: 'Max Utilization',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Transmit utilization in bps per port')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setCustomFieldConfig('filterable', true)
    .setUnit('bps')
    .setMin(0)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'green' },
        { value: 70, color: 'dark-yellow' },
        { value: 90, color: 'dark-red' },
      ],
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Avg Utilization')
        .overrideCustomFieldConfig('cellOptions', {
          mode: 'gradient',
          type: 'gauge',
          valueDisplayMode: 'text',
        })
        .overrideUnit('bps');

      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 105)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$', result: { index: 0, text: 'Slot 1 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$', result: { index: 1, text: 'Slot 2 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$', result: { index: 2, text: 'Slot 3 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$', result: { index: 3, text: 'Slot 4 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$', result: { index: 4, text: 'Slot 5 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$', result: { index: 5, text: 'Slot 6 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$', result: { index: 6, text: 'Slot 7 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$', result: { index: 7, text: 'Slot 8 ($1)' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 8, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+).*$', result: { index: 9, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 10, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*port-channel([0-9]*).*$', result: { index: 11, text: 'PC$1' } } },
        ]);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();
}

// Panel 184 - Receive utilization in bps per port
function getReceiveUtilizationBpsPanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"NetworkInterfaces\",\n    \"granularity\": \"all\",\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\n      \"domain_name\",\n      \"host_name\",\n      \"chassis_number\",\n      \"port_role\",\n      \"name\",\n      \"port_spec\"\n    ],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"host.name\",\n      \"outputName\": \"host_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.chassis.number\",\n      \"outputName\": \"chassis_number\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.network.port.role\",\n      \"outputName\": \"port_role\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"expression\",\n      \"name\": \"port_spec\",\n      \"expression\": \"concat(port_role + ' # ' + name)\",\n      \"outputType\": \"STRING\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        { \"type\": \"not\", \"field\": \n        {\n          \"type\": \"in\",\n          \"dimension\": \"hw.network.port.role\",\n          \"values\": [\n            \"unconfigured\",\n            \"server_pc\",\n            \"fabric_pc\",\n            \"host_pc\",\n            \"vethernet\",\n            \"vfc\",\n            \"vnic\",\n            \"vhba\",\n            \"eth_uplink_pc\"\n          ]\n        }\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.network\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"doubleMax\",\n        \"name\": \"base_utilization_max\",\n        \"fieldName\": \"hw.network.io_receive_max\"\n      },\n      {\n        \"type\": \"doubleSum\",\n        \"name\": \"duration\",\n        \"fieldName\": \"hw.network.io_receive_duration\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"sum\",\n        \"fieldName\": \"hw.network.io_receive\"\n      },\n      {\n        \"type\": \"longLast\",\n        \"name\": \"base_link_speed\",\n        \"fieldName\": \"hw.network.bandwidth.limit\"\n      }\n    ],\n    \"postAggregations\": [\n      {\n        \"type\": \"expression\",\n        \"name\": \"max_utilization\",\n        \"expression\": \"(base_utilization_max*8)\"\n      },\n      {\n        \"type\": \"expression\",\n        \"name\": \"avg_utilization\",\n        \"expression\": \"(\\\"sum\\\" / \\\"duration\\\")*8\"\n      },\n      {\n        \"type\": \"expression\",\n        \"name\": \"link_speed\",\n        \"expression\": \"base_link_speed*8\"\n      }\n    ],\n    \"limitSpec\": {\n      \"type\": \"default\",\n      \"limit\": 250,\n      \"columns\": [{\n        \"dimension\" : \"avg_utilization\",\n        \"direction\" : \"descending\",\n        \"dimensionOrder\" : \"numeric\"\n        }]\n    }\n  }`,
          method: 'POST',
        },
        columns: [
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Fabric', type: 'string' },
          { selector: 'event.chassis_number', text: 'G', type: 'string' },
          { selector: 'event.port_spec', text: 'H', type: 'string' },
          { selector: 'event.port_role', text: 'I', type: 'string' },
          { selector: 'event.avg_utilization', text: 'J', type: 'number' },
          { selector: 'event.max_utilization', text: 'K', type: 'number' },
          { selector: 'event.link_speed', text: 'Link Speed', type: 'number' },
        ],
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'Avg Utilization',
            },
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'Max Utilization',
            },
          ],
          match: 'any',
          type: 'exclude',
        },
      },
      {
        id: 'configFromData',
        options: {
          configRefId: 'A',
          mappings: [
            {
              fieldName: 'Link Speed',
              handlerKey: 'max',
            },
          ],
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'Link Speed': true,
          },
          includeByName: {},
          indexByName: {},
          renameByName: {
            G: 'Chassis',
            H: 'Port',
            I: 'Role',
            J: 'Avg Utilization',
            K: 'Max Utilization',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Receive utilization in bps per port')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setCustomFieldConfig('filterable', true)
    .setUnit('bps')
    .setMin(0)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'green' },
        { value: 70, color: 'dark-yellow' },
        { value: 90, color: 'dark-red' },
      ],
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Avg Utilization')
        .overrideCustomFieldConfig('cellOptions', {
          mode: 'gradient',
          type: 'gauge',
          valueDisplayMode: 'text',
        })
        .overrideUnit('bps');

      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 105)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$', result: { index: 0, text: 'Slot 1 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$', result: { index: 1, text: 'Slot 2 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$', result: { index: 2, text: 'Slot 3 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$', result: { index: 3, text: 'Slot 4 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$', result: { index: 4, text: 'Slot 5 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$', result: { index: 5, text: 'Slot 6 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$', result: { index: 6, text: 'Slot 7 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$', result: { index: 7, text: 'Slot 8 ($1)' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 8, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+).*$', result: { index: 9, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 10, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*port-channel([0-9]*).*$', result: { index: 11, text: 'PC$1' } } },
        ]);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();
}

// Panel 179 - Transmit pause frames per port (Sum)
function getTransmitPausePanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"NetworkInterfaces\",\n    \"granularity\": \"all\",\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\n      \"domain_name\",\n      \"host_name\",\n      \"chassis_number\",\n      \"port_role\",\n      \"name\",\n      \"port_spec\"\n    ],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"host.name\",\n      \"outputName\": \"host_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.chassis.number\",\n      \"outputName\": \"chassis_number\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.network.port.role\",\n      \"outputName\": \"port_role\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"expression\",\n      \"name\": \"port_spec\",\n      \"expression\": \"concat(port_role + ' # ' + name)\",\n      \"outputType\": \"STRING\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        { \"type\": \"not\", \"field\": \n          {\n            \"type\": \"in\",\n            \"dimension\": \"hw.network.port.role\",\n            \"values\": [\n              \"eth_uplink_pc\",\n              \"host_pc\",\n              \"server_pc\",\n              \"fabric_pc\",\n              \"fc_uplink\",\n              \"fc_storage\",\n              \"iom_uplink\",\n              \"vnic\",\n              \"vhba\",\n              \"vethernet\",\n              \"vfc\",\n              \"unconfigured\"\n            ]\n          }\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.network\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"longSum\",\n        \"name\": \"eth_pause\",\n        \"fieldName\": \"hw.errors_network_transmit_pause\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"fc_pause\",\n        \"fieldName\": \"hw.network.packets_transmit_ppp\"\n      }\n    ]\n  }`,
          method: 'POST',
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
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
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
            'Ethernet Congestion': 7,
            'FC Congestion': 8,
            Fabric: 1,
            Port: 3,
            Role: 4,
            Time: 5,
            Total: 6,
          },
          renameByName: {
            'Eth Pause': '',
            FC: '',
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

  return PanelBuilders.table()
    .setTitle('Transmit pause frames per port (Sum)')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setCustomFieldConfig('filterable', true)
    .setThresholds({
      mode: 'percentage',
      steps: [{ value: 0, color: 'blue' }],
    })
    .setOverrides((builder) => {
      builder.matchFieldsByType('number').overrideCustomFieldConfig('cellOptions', {
        mode: 'gradient',
        type: 'gauge',
        valueDisplayMode: 'text',
      });

      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 75)
        .overrideMappings([
          { type: 'regex', options: { pattern: '.*(A|B)', result: { index: 0, text: '$1' } } },
        ]);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 105)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$', result: { index: 0, text: 'Slot 1 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$', result: { index: 1, text: 'Slot 2 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$', result: { index: 2, text: 'Slot 3 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$', result: { index: 3, text: 'Slot 4 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$', result: { index: 4, text: 'Slot 5 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$', result: { index: 5, text: 'Slot 6 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$', result: { index: 6, text: 'Slot 7 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$', result: { index: 7, text: 'Slot 8 ($1)' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 8, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+).*$', result: { index: 9, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 10, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*port-channel([0-9]*).*$', result: { index: 11, text: 'PC$1' } } },
        ]);
    })
    .build();
}

// Panel 180 - Receive pause frames per port (Sum)
function getReceivePausePanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"NetworkInterfaces\",\n    \"granularity\": \"all\",\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\n      \"domain_name\",\n      \"host_name\",\n      \"chassis_number\",\n      \"port_role\",\n      \"name\",\n      \"port_spec\"\n    ],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"host.name\",\n      \"outputName\": \"host_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.chassis.number\",\n      \"outputName\": \"chassis_number\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.network.port.role\",\n      \"outputName\": \"port_role\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"expression\",\n      \"name\": \"port_spec\",\n      \"expression\": \"concat(port_role + ' # ' + name)\",\n      \"outputType\": \"STRING\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        { \"type\": \"not\", \"field\": \n          {\n            \"type\": \"in\",\n            \"dimension\": \"hw.network.port.role\",\n            \"values\": [\n              \"eth_uplink_pc\",\n              \"host_pc\",\n              \"server_pc\",\n              \"fabric_pc\",\n              \"fc_uplink\",\n              \"fc_storage\",\n              \"iom_uplink\",\n              \"vnic\",\n              \"vhba\",\n              \"vethernet\",\n              \"vfc\",\n              \"unconfigured\"\n            ]\n          }\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.network\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"longSum\",\n        \"name\": \"eth_pause\",\n        \"fieldName\": \"hw.errors_network_receive_pause\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"fc_pause\",\n        \"fieldName\": \"hw.network.packets_receive_ppp\"\n      }\n    ]\n  }`,
          method: 'POST',
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
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
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
            'Ethernet Congestion': 7,
            'FC Congestion': 8,
            Fabric: 1,
            Port: 3,
            Role: 4,
            Time: 5,
            Total: 6,
          },
          renameByName: {
            'Eth Pause': '',
            FC: '',
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

  return PanelBuilders.table()
    .setTitle('Receive pause frames per port (Sum)')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setCustomFieldConfig('filterable', true)
    .setThresholds({
      mode: 'percentage',
      steps: [{ value: 0, color: 'blue' }],
    })
    .setOverrides((builder) => {
      builder.matchFieldsByType('number').overrideCustomFieldConfig('cellOptions', {
        mode: 'gradient',
        type: 'gauge',
        valueDisplayMode: 'text',
      });

      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 75)
        .overrideMappings([
          { type: 'regex', options: { pattern: '.*(A|B)', result: { index: 0, text: '$1' } } },
        ]);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 105)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$', result: { index: 0, text: 'Slot 1 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$', result: { index: 1, text: 'Slot 2 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$', result: { index: 2, text: 'Slot 3 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$', result: { index: 3, text: 'Slot 4 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$', result: { index: 4, text: 'Slot 5 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$', result: { index: 5, text: 'Slot 6 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$', result: { index: 6, text: 'Slot 7 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$', result: { index: 7, text: 'Slot 8 ($1)' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 8, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+).*$', result: { index: 9, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 10, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*port-channel([0-9]*).*$', result: { index: 11, text: 'PC$1' } } },
        ]);
    })
    .build();
}

// Panel 178 - Network Errors
function getNetworkErrorsPanel() {
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
        url: '/api/v1/telemetry/TimeSeries',
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"NetworkInterfaces\",\n    \"granularity\": \"all\",\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\n      \"domain_name\",\n      \"host_name\",\n      \"port_role\",\n      \"name\",\n      \"port_spec\"\n    ],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"host.name\",\n      \"outputName\": \"host_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"hw.network.port.role\",\n      \"outputName\": \"port_role\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"expression\",\n      \"name\": \"port_spec\",\n      \"expression\": \"concat(port_role + ' # ' + name)\",\n      \"outputType\": \"STRING\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        { \"type\": \"not\", \"field\": \n        {\n          \"type\": \"in\",\n          \"dimension\": \"hw.network.port.role\",\n          \"values\": [\n            \"vethernet\",\n            \"host_pc\",\n            \"fabric_pc\",\n            \"server_pc\",\n            \"unconfigured\",\n            \"eth_uplink_pc\"\n          ]\n        }\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.network\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"longSum\",\n        \"name\": \"runt\",\n        \"fieldName\": \"hw.errors_network_receive_runt\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"too_long\",\n        \"fieldName\": \"hw.errors_network_receive_too_long\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"crc\",\n        \"fieldName\": \"hw.errors_network_receive_crc\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"no_buffer\",\n        \"fieldName\": \"hw.errors_network_receive_no_buffer\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"too_short\",\n        \"fieldName\": \"hw.errors_network_receive_too_short\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"rx_discard\",\n        \"fieldName\": \"hw.errors_network_receive_discard\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"deferred\",\n        \"fieldName\": \"hw.errors_network_transmit_deferred\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"late_collisions\",\n        \"fieldName\": \"hw.errors_network_late_collisions\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"carrier_sense\",\n        \"fieldName\": \"hw.errors_network_carrier_sense\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"tx_discard\",\n        \"fieldName\": \"hw.errors_network_transmit_discard\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"jabber\",\n        \"fieldName\": \"hw.errors_network_transmit_jabber\"\n      }\n    ],\n    \"postAggregations\": [\n      {\n        \"type\": \"expression\",\n        \"name\": \"rx_sum\",\n        \"expression\": \"\\\"rx_discard\\\" + \\\"too_short\\\" + \\\"no_buffer\\\" + \\\"crc\\\" + \\\"too_long\\\" + \\\"runt\\\"\"\n      },\n      {\n        \"type\": \"expression\",\n        \"name\": \"tx_sum\",\n        \"expression\": \"\\\"jabber\\\" + \\\"tx_discard\\\" + \\\"carrier_sense\\\" + \\\"late_collisions\\\" + \\\"deferred\\\"\"\n      },\n      {\n        \"type\": \"expression\",\n        \"name\": \"total\",\n        \"expression\": \"\\\"tx_sum\\\" + \\\"rx_sum\\\"\"\n      }\n    ],\n    \"limitSpec\": {\n      \"type\": \"default\",\n      \"limit\": 250,\n      \"columns\": [{\n        \"dimension\" : \"total\",\n        \"direction\" : \"descending\",\n        \"dimensionOrder\" : \"numeric\"\n        }]\n    }\n  }`,
          method: 'POST',
        },
        columns: [
          { selector: 'event.domain_name', text: 'A1', type: 'string' },
          { selector: 'event.host_name', text: 'A2', type: 'string' },
          { selector: 'event.port_spec', text: 'A3', type: 'string' },
          { selector: 'event.total', text: 'H', type: 'number' },
          { selector: 'event.rx_sum', text: 'I', type: 'number' },
          { selector: 'event.runt', text: 'J', type: 'number' },
          { selector: 'event.crc', text: 'K', type: 'number' },
          { selector: 'event.no_buffer', text: 'L', type: 'number' },
          { selector: 'event.too_short', text: 'M', type: 'number' },
          { selector: 'event.rx_discard', text: 'N', type: 'number' },
          { selector: 'event.tx_sum', text: 'O', type: 'number' },
          { selector: 'event.deferred', text: 'P', type: 'number' },
          { selector: 'event.late_collisions', text: 'Q', type: 'number' },
          { selector: 'event.carrier_sense', text: 'R', type: 'number' },
          { selector: 'event.tx_discard', text: 'S', type: 'number' },
          { selector: 'event.jabber', text: 'T', type: 'number' },
          { selector: 'event.port_role', text: 'A4', type: 'string' },
        ],
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            A1: 'Domain',
            A2: 'Fabric',
            A3: 'Port',
            A4: 'Role',
            'CRC (RX)': '',
            H: 'Total',
            I: 'Total RX',
            J: 'Runt',
            K: 'Too Long',
            L: 'CRC',
            M: 'No Buffer',
            N: 'Too Short',
            O: 'RX Discard',
            P: 'Total TX',
            Q: 'Deferred',
            R: 'Late Collisions',
            S: 'Carrier Sense',
            T: 'TX Discard',
            U: 'Jabber',
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
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setCustomFieldConfig('filterable', true)
    .setMin(0)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'transparent' },
        { value: 10, color: '#EAB839' },
        { value: 80, color: 'dark-red' },
      ],
    })
    .setOverrides((builder) => {
      builder.matchFieldsByType('number').overrideCustomFieldConfig('cellOptions', {
        applyToRow: false,
        mode: 'basic',
        type: 'color-background',
      });

      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 105)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$', result: { index: 0, text: 'Slot 1 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$', result: { index: 1, text: 'Slot 2 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$', result: { index: 2, text: 'Slot 3 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$', result: { index: 3, text: 'Slot 4 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$', result: { index: 4, text: 'Slot 5 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$', result: { index: 5, text: 'Slot 6 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$', result: { index: 6, text: 'Slot 7 ($1)' } } },
          { type: 'regex', options: { pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$', result: { index: 7, text: 'Slot 8 ($1)' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 8, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Ethernet([0-9]+/[0-9]+).*$', result: { index: 9, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$', result: { index: 10, text: '$1' } } },
          { type: 'regex', options: { pattern: '^.*port-channel([0-9]*).*$', result: { index: 11, text: 'PC$1' } } },
        ]);

      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 78)
        .overrideMappings([
          { type: 'regex', options: { pattern: '.*([A|B])', result: { index: 1, text: '$1' } } },
        ]);

      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 108)
        .overrideMappings([
          { type: 'value', options: { appliance: { color: '#00ffff', index: 5, text: 'Appliance' } } },
          { type: 'value', options: { eth_monitor: { color: '#a020f0', index: 8, text: 'Ethernet SPAN' } } },
          { type: 'value', options: { eth_uplink: { color: '#1e90ff', index: 4, text: 'Ethernet Uplink' } } },
          { type: 'value', options: { fc_monitor: { color: '#ff1493', index: 9, text: 'FC SPAN' } } },
          { type: 'value', options: { fcoe_storage: { color: '#00ff00', index: 7, text: 'FCoE Storage' } } },
          { type: 'value', options: { fcoe_uplink: { color: '#006400', index: 6, text: 'FCoE Uplink' } } },
          { type: 'value', options: { host_port: { color: '#a0522d', index: 3, text: 'Host Port' } } },
          { type: 'value', options: { iom_uplink: { color: '#ff8c00', index: 2, text: 'IOM Uplink' } } },
          { type: 'value', options: { server: { color: '#ffd700', index: 1, text: 'Server' } } },
          { type: 'value', options: { unconfigured: { color: '#787878', index: 0, text: 'Unconfigured' } } },
        ]);
    })
    .build();
}

// Panel 174 - CPU Utilization per Domain
function getCPUUtilizationPerDomainPanel() {
  const queryRunner = new LoggingQueryRunner({
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
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"PhysicalEntities\",\n    \"granularity\": \"all\",\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\"domain_name\"],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.cpu\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"doubleMax\",\n        \"name\": \"max\",\n        \"fieldName\": \"hw.cpu.utilization_c0_max\"\n      },\n      {\n        \"type\": \"doubleMin\",\n        \"name\": \"min\",\n        \"fieldName\": \"hw.cpu.utilization_c0_min\"\n      },\n      {\n        \"type\": \"longSum\",\n        \"name\": \"count\",\n        \"fieldName\": \"hw.cpu.utilization_c0_count\"\n      },\n      {\n        \"type\": \"doubleSum\",\n        \"name\": \"sum\",\n        \"fieldName\": \"hw.cpu.utilization_c0\"\n      }\n    ],\n    \"postAggregations\": [\n      {\n        \"type\": \"expression\",\n        \"name\": \"avg\",\n        \"expression\": \"(\\\"sum\\\" / \\\"count\\\")\"\n      }\n    ]\n  }`,
          method: 'POST',
        },
        columns: [
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.max', text: 'Max', type: 'number' },
          { selector: 'event.avg', text: 'Avg', type: 'number' },
          { selector: 'event.min', text: 'Min', type: 'number' },
        ],
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            Avg: 1,
            'Domain Name': 0,
            Max: 2,
            Min: 3,
          },
          renameByName: {},
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Utilization per Domain')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setCustomFieldConfig('filterable', true)
    .setDecimals(1)
    .setUnit('percentunit')
    .setThresholds({
      mode: 'percentage',
      steps: [{ value: 0, color: 'transparent' }],
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Utilization')
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideMax(1)
        .overrideCustomFieldConfig('cellOptions', { type: 'sparkline' });

      builder.matchFieldsByType('string').overrideCustomFieldConfig('width', 240);
    })
    .build();
}

// Panel 177 - Top Servers by CPU Utilization
function getTopServersByCPUPanel() {
  const queryRunner = new LoggingQueryRunner({
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
        url_options: {
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {\n    \"queryType\": \"groupBy\",\n    \"dataSource\": \"PhysicalEntities\",\n    \"granularity\": {\n      \"type\": \"duration\",\n      \"duration\": $__interval_ms,\n      \"timeZone\": \"$__timezone\"\n    },\n    \"intervals\": [\"\${__from:date}/\${__to:date}\"],\n    \"dimensions\": [\"domain_name\", \"host_name\"],\n    \"virtualColumns\": [{\n      \"type\": \"nested-field\",\n      \"columnName\": \"intersight.domain.name\",\n      \"outputName\": \"domain_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    },{\n      \"type\": \"nested-field\",\n      \"columnName\": \"host.name\",\n      \"outputName\": \"host_name\",\n      \"expectedType\": \"STRING\",\n      \"path\": \"$\"\n    }],\n    \"filter\": {\n      \"type\": \"and\",\n      \"fields\": [\n        {\n          \"type\": \"in\",\n          \"dimension\": \"intersight.domain.name\",\n          \"values\": [\${DomainName:doublequote}]\n        },\n        {\n          \"type\": \"selector\",\n          \"dimension\": \"instrument.name\",\n          \"value\": \"hw.cpu\"\n        }\n      ]\n    },\n    \"aggregations\": [\n      {\n        \"type\": \"doubleMax\",\n        \"name\": \"utilization\",\n        \"fieldName\": \"hw.cpu.utilization_c0_max\"\n      }\n    ]\n  }`,
          method: 'POST',
        },
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.host_name', text: 'Host Name', type: 'string' },
          { selector: 'event.utilization', text: 'Utilization', type: 'number' },
        ],
        filters: [],
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
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
            'Trend #A': 'Utilization',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Top Servers by CPU Utilization')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'lg')
    .setOption('enablePagination', true)
    .setCustomFieldConfig('filterable', true)
    .setDecimals(1)
    .setUnit('percentunit')
    .setThresholds({
      mode: 'percentage',
      steps: [{ value: 0, color: 'transparent' }],
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Utilization')
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideMax(1)
        .overrideCustomFieldConfig('cellOptions', { type: 'sparkline' });

      builder.matchFieldsByType('string').overrideCustomFieldConfig('width', 240);
    })
    .build();
}
