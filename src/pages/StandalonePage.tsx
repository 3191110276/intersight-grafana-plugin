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
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Alarms')
          .setOption('content', 'Alarms tab - nested tabs by ServerName - to be implemented')
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getActionsTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Actions')
          .setOption('content', 'Actions tab - nested tabs by ServerName - to be implemented')
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getPortsTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Ports')
          .setOption('content', 'Ports tab - to be implemented')
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getNetworkUtilizationTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Network Utilization')
          .setOption('content', 'Network Utilization tab - nested tabs (Percentage/Absolute) - to be implemented')
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getNetworkErrorsTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Network Errors')
          .setOption('content', 'Network Errors tab - to be implemented')
          .setOption('mode', 'markdown' as any)
          .build(),
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

function getStorageTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Storage')
          .setOption('content', 'Storage tab - nested tabs (Controllers, SSD, HDD, Virtual Drives) - to be implemented')
          .setOption('mode', 'markdown' as any)
          .build(),
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
