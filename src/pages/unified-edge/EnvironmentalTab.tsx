import {
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';

export function getEnvironmentalTab() {
  // Row 1: Power Supply Status
  const powerSupplyQueryRunner = new LoggingQueryRunner({
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
              "values": [\${ChassisName:doublequote}]
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
    "dimensions": ["domain_name", "host_name"],
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

  const powerSupplyDataTransformer = new LoggingDataTransformer({
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

  const powerSupplyRow = new SceneGridRow({
    title: 'Power Supply Status',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 8,
        body: powerSupplyPanel,
      }),
    ],
  });

  // Row 2: Chassis Power Consumption
  const chassisPowerRow = new SceneGridRow({
    title: 'Chassis Power Consumption',
    isCollapsible: true,
    isCollapsed: false,
    y: 8,
    children: [
      new SceneGridItem({
        x: 0,
        y: 8,
        width: 24,
        height: 8,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO\n\nThis row is under development.')
          .setOption('mode', 'markdown')
          .build(),
      }),
    ],
  });

  // Row 3: Host Power Consumption
  const hostPowerRow = new SceneGridRow({
    title: 'Host Power Consumption',
    isCollapsible: true,
    isCollapsed: false,
    y: 16,
    children: [
      new SceneGridItem({
        x: 0,
        y: 16,
        width: 24,
        height: 8,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO\n\nThis row is under development.')
          .setOption('mode', 'markdown')
          .build(),
      }),
    ],
  });

  // Row 4: Chassis Fan Speed
  const chassisFanSpeedRow = new SceneGridRow({
    title: 'Chassis Fan Speed',
    isCollapsible: true,
    isCollapsed: false,
    y: 24,
    children: [
      new SceneGridItem({
        x: 0,
        y: 24,
        width: 24,
        height: 8,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO\n\nThis row is under development.')
          .setOption('mode', 'markdown')
          .build(),
      }),
    ],
  });

  // Row 5: Chassis Temperature
  const chassisTemperatureRow = new SceneGridRow({
    title: 'Chassis Temperature',
    isCollapsible: true,
    isCollapsed: false,
    y: 32,
    children: [
      new SceneGridItem({
        x: 0,
        y: 32,
        width: 24,
        height: 8,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO\n\nThis row is under development.')
          .setOption('mode', 'markdown')
          .build(),
      }),
    ],
  });

  // Row 6: Host Temperature
  const hostTemperatureRow = new SceneGridRow({
    title: 'Host Temperature',
    isCollapsible: true,
    isCollapsed: false,
    y: 40,
    children: [
      new SceneGridItem({
        x: 0,
        y: 40,
        width: 24,
        height: 8,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO\n\nThis row is under development.')
          .setOption('mode', 'markdown')
          .build(),
      }),
    ],
  });

  // Return grid layout wrapped in flex layout
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 1600,
        body: new SceneGridLayout({
          children: [
            powerSupplyRow,
            chassisPowerRow,
            hostPowerRow,
            chassisFanSpeedRow,
            chassisTemperatureRow,
            hostTemperatureRow,
          ],
        }),
      }),
    ],
  });
}
