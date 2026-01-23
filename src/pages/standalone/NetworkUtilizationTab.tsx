import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { TabbedScene } from '../../components/TabbedScene';

export function getNetworkUtilizationTab() {
  // Create nested tabs for Percentage and Absolute views
  const percentageTab = getNetworkUtilizationPercentageTab();
  const absoluteTab = getNetworkUtilizationAbsoluteTab();

  const networkUtilizationTabs = new TabbedScene({
    tabs: [
      { id: 'percentage', label: 'Percentage (%)', getBody: () => percentageTab },
      { id: 'absolute', label: 'Absolute (bps)', getBody: () => absoluteTab },
    ],
    activeTab: 'percentage',
    body: percentageTab,
  });

  // Wrap the TabbedScene in a SceneFlexLayout as per Grafana Scenes pattern
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: networkUtilizationTabs,
      }),
    ],
  });
}

// Helper function for Percentage tab
function getNetworkUtilizationPercentageTab() {
  // Row 1 Panel 1 (panel-129): Transmit utilization in % per physical port
  const physTransmitQuery = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "selector", "dimension": "hw.network.port.role", "value": "unconfigured"},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [{"type": "doubleMax", "name": "base_max_utilization", "fieldName": "hw.network.bandwidth.utilization_transmit_max"}],
    "postAggregations": [{"type": "expression", "name": "max_utilization", "expression": "\\"base_max_utilization\\"*100"}]
  }` },
    } as any],
  });

  const physTransmitPanel = PanelBuilders.timeseries()
    .setTitle('Transmit utilization in % per physical port')
    .setData(new LoggingDataTransformer({
      $data: physTransmitQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('percent').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Row 1 Panel 2 (panel-212): Receive utilization in % per physical port
  const physReceiveQuery = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "selector", "dimension": "hw.network.port.role", "value": "unconfigured"},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [{"type": "doubleMax", "name": "base_max_utilization", "fieldName": "hw.network.bandwidth.utilization_receive_max"}],
    "postAggregations": [{"type": "expression", "name": "max_utilization", "expression": "\\"base_max_utilization\\"*100"}]
  }` },
    } as any],
  });

  const physReceivePanel = PanelBuilders.timeseries()
    .setTitle('Receive utilization in % per physical port')
    .setData(new LoggingDataTransformer({
      $data: physReceiveQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('percent').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Row 2 Panel 1 (panel-213): Transmit utilization in % per virtual port
  const virtTransmitQuery = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "in", "dimension": "hw.network.port.role", "values": ["vhba", "vnic"]},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [{"type": "doubleMax", "name": "base_max_utilization", "fieldName": "hw.network.bandwidth.utilization_transmit_max"}],
    "postAggregations": [{"type": "expression", "name": "max_utilization", "expression": "\\"base_max_utilization\\"*100"}]
  }` },
    } as any],
  });

  const virtTransmitPanel = PanelBuilders.timeseries()
    .setTitle('Transmit utilization in % per virtual port')
    .setData(new LoggingDataTransformer({
      $data: virtTransmitQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('percent').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Row 2 Panel 2 (panel-214): Receive utilization in % per virtual port
  const virtReceiveQuery = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "in", "dimension": "hw.network.port.role", "values": ["vhba", "vnic"]},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [{"type": "doubleMax", "name": "base_max_utilization", "fieldName": "hw.network.bandwidth.utilization_receive_max"}],
    "postAggregations": [{"type": "expression", "name": "max_utilization", "expression": "\\"base_max_utilization\\"*100"}]
  }` },
    } as any],
  });

  const virtReceivePanel = PanelBuilders.timeseries()
    .setTitle('Receive utilization in % per virtual port')
    .setData(new LoggingDataTransformer({
      $data: virtReceiveQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('percent').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: physTransmitPanel }),
            new SceneFlexItem({ width: '50%', body: physReceivePanel }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: virtTransmitPanel }),
            new SceneFlexItem({ width: '50%', body: virtReceivePanel }),
          ],
        }),
      }),
    ],
  });
}

// Helper function for Absolute (bps) tab
function getNetworkUtilizationAbsoluteTab() {
  // Row 1 Panel 1 (panel-215): Transmit utilization in bps per physical port
  const physTransmitQuery = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "selector", "dimension": "hw.network.port.role", "value": "unconfigured"},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [
      {"type": "doubleMax", "name": "base_utilization_max", "fieldName": "hw.network.io_transmit_max"},
      {"type": "longLast", "name": "base_link_speed", "fieldName": "hw.network.bandwidth.limit"}
    ],
    "postAggregations": [
      {"type": "expression", "name": "max_utilization", "expression": "(base_utilization_max*8)"},
      {"type": "expression", "name": "link_speed", "expression": "base_link_speed*8"}
    ]
  }` },
    } as any],
  });

  const physTransmitPanel = PanelBuilders.timeseries()
    .setTitle('Transmit utilization in bps per physical port')
    .setData(new LoggingDataTransformer({
      $data: physTransmitQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('bps').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Row 1 Panel 2 (panel-216): Receive utilization in bps per physical port
  const physReceiveQuery = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "selector", "dimension": "hw.network.port.role", "value": "unconfigured"},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [
      {"type": "doubleMax", "name": "base_utilization_max", "fieldName": "hw.network.io_receive_max"},
      {"type": "longLast", "name": "base_link_speed", "fieldName": "hw.network.bandwidth.limit"}
    ],
    "postAggregations": [
      {"type": "expression", "name": "max_utilization", "expression": "(base_utilization_max*8)"},
      {"type": "expression", "name": "link_speed", "expression": "base_link_speed*8"}
    ]
  }` },
    } as any],
  });

  const physReceivePanel = PanelBuilders.timeseries()
    .setTitle('Receive utilization in bps per physical port')
    .setData(new LoggingDataTransformer({
      $data: physReceiveQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('bps').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Row 2 Panel 1 (panel-217): Transmit utilization in bps per virtual port
  const virtTransmitQuery = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "in", "dimension": "hw.network.port.role", "values": ["vhba", "vnic"]},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [
      {"type": "doubleMax", "name": "base_utilization_max", "fieldName": "hw.network.io_transmit_max"},
      {"type": "longLast", "name": "base_link_speed", "fieldName": "hw.network.bandwidth.limit"}
    ],
    "postAggregations": [
      {"type": "expression", "name": "max_utilization", "expression": "(base_utilization_max*8)"},
      {"type": "expression", "name": "link_speed", "expression": "base_link_speed*8"}
    ]
  }` },
    } as any],
  });

  const virtTransmitPanel = PanelBuilders.timeseries()
    .setTitle('Transmit utilization in bps per physical port')
    .setData(new LoggingDataTransformer({
      $data: virtTransmitQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('bps').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  // Row 2 Panel 2 (panel-218): Receive utilization in bps per virtual port
  const virtReceiveQuery = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
      refId: 'A', queryType: 'infinity', type: 'json', source: 'url', parser: 'backend', format: 'dataframe',
      url: '/api/v1/telemetry/TimeSeries', root_selector: '',
      columns: [
        { selector: 'event.max_utilization', text: 'Utilization (Max)', type: 'number' },
        { selector: 'event.host_name', text: 'A', type: 'string' },
        { selector: 'event.name', text: 'B', type: 'string' },
        { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      ],
      computed_columns: [{ selector: "A + ' Port ' + B", text: 'Port', type: 'string' }],
      url_options: { method: 'POST', body_type: 'raw', body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name", "name"],
    "virtualColumns": [{"type": "nested-field", "columnName": "host.name", "outputName": "host_name", "expectedType": "STRING", "path": "$"}],
    "filter": {
      "type": "and",
      "fields": [
        {"type": "selector", "dimension": "host.type", "value": "compute.RackUnit"},
        {"type": "in", "dimension": "hw.network.port.role", "values": ["vhba", "vnic"]},
        {"type": "in", "dimension": "host.name", "values": [\${ServerName:doublequote}]},
        {"type": "selector", "dimension": "instrument.name", "value": "hw.network"}
      ]
    },
    "aggregations": [
      {"type": "doubleMax", "name": "base_utilization_max", "fieldName": "hw.network.io_receive_max"},
      {"type": "longLast", "name": "base_link_speed", "fieldName": "hw.network.bandwidth.limit"}
    ],
    "postAggregations": [
      {"type": "expression", "name": "max_utilization", "expression": "(base_utilization_max*8)"},
      {"type": "expression", "name": "link_speed", "expression": "base_link_speed*8"}
    ]
  }` },
    } as any],
  });

  const virtReceivePanel = PanelBuilders.timeseries()
    .setTitle('Receive utilization in bps per virtual port')
    .setData(new LoggingDataTransformer({
      $data: virtReceiveQuery,
      transformations: [{id: 'groupingToMatrix', options: {columnField: 'Port', rowField: 'Time', valueField: 'Utilization (Max)'}}],
    }))
    .setUnit('bps').setDecimals(1).setMin(0).setMax(100)
    .setThresholds({mode: 'percentage', steps: [{value: 0, color: 'green'}, {value: 70, color: '#EAB839'}, {value: 90, color: 'red'}]})
    .setOverrides((b) => {
      b.matchFieldsWithName('Port').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif[0-9]+/[0-9]+/([0-9]+).*$', result: {index: 0, text: '$1'}}}]);
      b.matchFieldsWithName('G').overrideDisplayName('Chassis').overrideMappings([{type: 'regex', options: {pattern: '^.*Nif([0-9]+)/[0-9]+/[0-9]+.*$', result: {index: 0, text: '$1'}}}]);
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: physTransmitPanel }),
            new SceneFlexItem({ width: '50%', body: physReceivePanel }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 300,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: virtTransmitPanel }),
            new SceneFlexItem({ width: '50%', body: virtReceivePanel }),
          ],
        }),
      }),
    ],
  });
}
