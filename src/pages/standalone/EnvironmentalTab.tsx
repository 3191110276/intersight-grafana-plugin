import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';

export function getEnvironmentalTab() {
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
        ySizing: 'content',
        body: powerSupplyPanel,
      }),
      // Row 2: Host Power Consumption (2 panels side by side)
      new SceneFlexItem({
        height: 300,
        ySizing: 'content',
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
        ySizing: 'content',
        body: fanSpeedPanel,
      }),
      // Row 4: Host Temperature (nested tabs)
      new SceneFlexItem({
        ySizing: 'fill',
        body: hostTemperatureTabs,
      }),
    ],
  });
}

// Helper function for Temperature tab (panel-9)
export function getTemperatureTab() {
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
      builder.matchFieldsWithNameByRegex('/Temperature|Processor/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: temperaturePanel,
      }),
    ],
  });
}

// Helper function for Cooling Budget tab (panel-21)
export function getCoolingBudgetTab() {
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
      builder.matchFieldsWithNameByRegex('/Temperature|Processor/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: coolingBudgetPanel,
      }),
    ],
  });
}

