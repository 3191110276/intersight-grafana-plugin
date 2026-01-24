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

export function getTrafficBalanceTab() {
  // Row 1: Overview
  const overviewRow = new SceneGridRow({
    title: 'Overview',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({ x: 0, y: 0, width: 6, height: 5, body: getPanel185_EthTransmitTrafficA() }),
      new SceneGridItem({ x: 6, y: 0, width: 6, height: 5, body: getPanel186_EthTransmitTrafficB() }),
      new SceneGridItem({ x: 12, y: 0, width: 6, height: 5, body: getPanel187_EthReceiveTrafficA() }),
      new SceneGridItem({ x: 18, y: 0, width: 6, height: 5, body: getPanel188_EthReceiveTrafficB() }),
    ],
  });

  // Row 2: Details
  const detailsRow = new SceneGridRow({
    title: 'Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 5,
    children: [
      new SceneGridItem({
        x: 0,
        y: 5,
        width: 24,
        height: 8,
        body: PanelBuilders.text()
          .setTitle('TODO: Details')
          .setOption('content', 'TODO: Add detail panels here')
          .setOption('mode', 'markdown')
          .build(),
      }),
    ],
  });

  // Main layout with collapsible rows
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 600,
        body: new SceneGridLayout({
          children: [overviewRow, detailsRow],
        }),
      }),
    ],
  });
}

// ============================================================================
// TRAFFIC BALANCE TAB - PANEL HELPERS (Panels 185-188)
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

  return PanelBuilders.stat()
    .setTitle('A: Eth transmit traffic (Sum)')
    .setData(new LoggingDataTransformer({
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
    }))
    .setUnit('decbytes')
    .setDecimals(1)
    .setMin(0)
    .setOption('graphMode', 'area')
    .setOption('colorMode', 'none')
    .setOption('textMode', 'auto')
    .setOption('orientation', 'auto')
    .setOption('justifyMode', 'auto')
    .setThresholds({
      mode: 'percentage',
      steps: [{ value: 0, color: 'purple' }],
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

  return PanelBuilders.stat()
    .setTitle('B: Eth transmit traffic (Sum)')
    .setData(new LoggingDataTransformer({
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
    }))
    .setUnit('decbytes')
    .setDecimals(1)
    .setMin(0)
    .setOption('graphMode', 'area')
    .setOption('colorMode', 'none')
    .setOption('textMode', 'auto')
    .setOption('orientation', 'auto')
    .setOption('justifyMode', 'auto')
    .setThresholds({
      mode: 'percentage',
      steps: [{ value: 0, color: 'purple' }],
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

  return PanelBuilders.stat()
    .setTitle('A: Eth receive traffic (Sum)')
    .setData(new LoggingDataTransformer({
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
    }))
    .setUnit('decbytes')
    .setDecimals(1)
    .setMin(0)
    .setOption('graphMode', 'area')
    .setOption('colorMode', 'none')
    .setOption('textMode', 'auto')
    .setOption('orientation', 'auto')
    .setOption('justifyMode', 'auto')
    .setThresholds({
      mode: 'percentage',
      steps: [{ value: 0, color: 'blue' }],
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

  return PanelBuilders.stat()
    .setTitle('B: Eth receive traffic (Sum)')
    .setData(new LoggingDataTransformer({
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
    }))
    .setUnit('decbytes')
    .setDecimals(1)
    .setMin(0)
    .setOption('graphMode', 'area')
    .setOption('colorMode', 'none')
    .setOption('textMode', 'auto')
    .setOption('orientation', 'auto')
    .setOption('justifyMode', 'auto')
    .setThresholds({
      mode: 'percentage',
      steps: [{ value: 0, color: 'blue' }],
    })
    .build();
}
