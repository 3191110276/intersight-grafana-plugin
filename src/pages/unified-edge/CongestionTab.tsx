import {
  SceneFlexLayout,
  SceneFlexItem,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
  PanelBuilders,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';

// ============================================================================
// CONGESTION TAB (Traffic Balance)
// Panels 185-192 from the original Unified Edge dashboard
// ============================================================================

export function getCongestionTab() {
  // Row 1: Ethernet Overview (4 panels - aggregate traffic)
  const ethernetOverviewRow = new SceneGridRow({
    title: 'Ethernet Overview',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({ x: 0, y: 0, width: 6, height: 8, body: getPanel185_EthTransmitTrafficA() }),
      new SceneGridItem({ x: 6, y: 0, width: 6, height: 8, body: getPanel186_EthTransmitTrafficB() }),
      new SceneGridItem({ x: 12, y: 0, width: 6, height: 8, body: getPanel187_EthReceiveTrafficA() }),
      new SceneGridItem({ x: 18, y: 0, width: 6, height: 8, body: getPanel188_EthReceiveTrafficB() }),
    ],
  });

  // Row 2: Ethernet Transmit Details (2 panels - per chassis)
  const ethernetTransmitDetailsRow = new SceneGridRow({
    title: 'Ethernet Transmit Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 8,
    children: [
      new SceneGridItem({ x: 0, y: 8, width: 12, height: 12, body: getPanel189_EthTransmitUtilPerChassisA() }),
      new SceneGridItem({ x: 12, y: 8, width: 12, height: 12, body: getPanel190_EthTransmitUtilPerChassisB() }),
    ],
  });

  // Row 3: Ethernet Receive Details (2 panels - per chassis)
  const ethernetReceiveDetailsRow = new SceneGridRow({
    title: 'Ethernet Receive Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 20,
    children: [
      new SceneGridItem({ x: 0, y: 20, width: 12, height: 12, body: getPanel191_EthReceiveUtilPerChassisA() }),
      new SceneGridItem({ x: 12, y: 20, width: 12, height: 12, body: getPanel192_EthReceiveUtilPerChassisB() }),
    ],
  });

  // Main layout with all collapsible rows
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            ethernetOverviewRow,
            ethernetTransmitDetailsRow,
            ethernetReceiveDetailsRow,
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// PANEL BUILDERS - Ethernet Overview (Stat Panels)
// ============================================================================

// Panel 185: A: Eth transmit traffic (Sum)
function getPanel185_EthTransmitTrafficA() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
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
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
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
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Domain Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
    ],
  });

  return PanelBuilders.stat()
    .setTitle('A: Eth transmit traffic (Sum)')
    .setDescription('Sum over all domains in the selected time period')
    .setData(transformedData)
    .setUnit('decbytes')
    .setOption('graphMode', 'area')
    .setOption('colorMode', 'none')
    .setOption('textMode', 'auto')
    .setOption('reduceOptions', {
      calcs: ['sum'],
      fields: '',
      values: false,
    })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: -Infinity, color: 'purple' },
      ],
    })
    .build();
}

// Panel 186: B: Eth transmit traffic (Sum)
function getPanel186_EthTransmitTrafficB() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
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
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
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
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Domain Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
    ],
  });

  return PanelBuilders.stat()
    .setTitle('B: Eth transmit traffic (Sum)')
    .setDescription('Sum over all domains in the selected time period')
    .setData(transformedData)
    .setUnit('decbytes')
    .setOption('graphMode', 'area')
    .setOption('colorMode', 'none')
    .setOption('textMode', 'auto')
    .setOption('reduceOptions', {
      calcs: ['sum'],
      fields: '',
      values: false,
    })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: -Infinity, color: 'purple' },
      ],
    })
    .build();
}

// Panel 187: A: Eth receive traffic (Sum)
function getPanel187_EthReceiveTrafficA() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
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
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
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
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Domain Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
    ],
  });

  return PanelBuilders.stat()
    .setTitle('A: Eth receive traffic (Sum)')
    .setDescription('Sum over all domains in the selected time period')
    .setData(transformedData)
    .setUnit('decbytes')
    .setMin(0)
    .setOption('graphMode', 'area')
    .setOption('colorMode', 'none')
    .setOption('textMode', 'value')
    .setOption('reduceOptions', {
      calcs: ['sum'],
      fields: '',
      values: false,
    })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: -Infinity, color: 'blue' },
      ],
    })
    .build();
}

// Panel 188: B: Eth receive traffic (Sum)
function getPanel188_EthReceiveTrafficB() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
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
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
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
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Domain Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
    ],
  });

  return PanelBuilders.stat()
    .setTitle('B: Eth receive traffic (Sum)')
    .setDescription('Sum over all domains in the selected time period')
    .setData(transformedData)
    .setUnit('decbytes')
    .setOption('graphMode', 'area')
    .setOption('colorMode', 'none')
    .setOption('textMode', 'auto')
    .setOption('reduceOptions', {
      calcs: ['sum'],
      fields: '',
      values: false,
    })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: -Infinity, color: 'blue' },
      ],
    })
    .build();
}

// ============================================================================
// PANEL BUILDERS - Ethernet Transmit Details (Time Series Panels)
// ============================================================================

// Panel 189: A: Eth uplink transmit utilization per chassis (Sum)
function getPanel189_EthTransmitUtilPerChassisA() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
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
      "domain_name"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
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
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Domain Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Eth uplink transmit utilization per chassis (Sum)')
    .setData(transformedData)
    .setUnit('decbytes')
    .setOption('legend', {
      calcs: [],
      displayMode: 'list',
      placement: 'bottom',
      showLegend: true,
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: -Infinity, color: 'green' },
      ],
    })
    .build();
}

// Panel 190: B: Eth uplink transmit utilization per chassis (Sum)
function getPanel190_EthTransmitUtilPerChassisB() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
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
      "domain_name"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
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
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Domain Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Eth uplink transmit utilization per chassis (Sum)')
    .setData(transformedData)
    .setUnit('decbytes')
    .setOption('legend', {
      calcs: [],
      displayMode: 'list',
      placement: 'bottom',
      showLegend: true,
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: -Infinity, color: 'green' },
      ],
    })
    .build();
}

// ============================================================================
// PANEL BUILDERS - Ethernet Receive Details (Time Series Panels)
// ============================================================================

// Panel 191: A: Eth uplink receive utilization per chassis (Sum)
function getPanel191_EthReceiveUtilPerChassisA() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
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
      "domain_name"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
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
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Domain Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Eth uplink receive utilization per chassis (Sum)')
    .setData(transformedData)
    .setUnit('decbytes')
    .setOption('legend', {
      calcs: [],
      displayMode: 'list',
      placement: 'bottom',
      showLegend: true,
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: -Infinity, color: 'blue' },
      ],
    })
    .build();
}

// Panel 192: B: Eth uplink receive utilization per chassis (Sum)
function getPanel192_EthReceiveUtilPerChassisB() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
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
      "domain_name"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " eCMC-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
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
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Domain Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Eth uplink receive utilization per chassis (Sum)')
    .setData(transformedData)
    .setUnit('decbytes')
    .setOption('legend', {
      calcs: [],
      displayMode: 'list',
      placement: 'bottom',
      showLegend: true,
    })
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: -Infinity, color: 'green' },
      ],
    })
    .build();
}
