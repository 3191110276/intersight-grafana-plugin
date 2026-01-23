/**
 * Traffic Balance Tab - IMM Domain Scene
 *
 * This module provides the Traffic Balance tab functionality for the IMM Domain scene.
 * Shows traffic balance metrics for FI uplinks and IFM uplinks with nested tabs for different views.
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

export function getTrafficBalanceTab() {
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

  // Row 2: Ethernet Transmit Details (2 panels - per domain)
  const ethernetTransmitDetailsRow = new SceneGridRow({
    title: 'Ethernet Transmit Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 8,
    children: [
      new SceneGridItem({ x: 0, y: 8, width: 12, height: 12, body: getPanel189_EthTransmitUtilPerDomainA() }),
      new SceneGridItem({ x: 12, y: 8, width: 12, height: 12, body: getPanel190_EthTransmitUtilPerDomainB() }),
    ],
  });

  // Row 3: Ethernet Receive Details (2 panels - per domain)
  const ethernetReceiveDetailsRow = new SceneGridRow({
    title: 'Ethernet Receive Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 20,
    children: [
      new SceneGridItem({ x: 0, y: 20, width: 12, height: 12, body: getPanel191_EthReceiveUtilPerDomainA() }),
      new SceneGridItem({ x: 12, y: 20, width: 12, height: 12, body: getPanel192_EthReceiveUtilPerDomainB() }),
    ],
  });

  // Row 4: Fibre Channel Overview (4 panels - aggregate traffic)
  const fcOverviewRow = new SceneGridRow({
    title: 'Fibre Channel Overview',
    isCollapsible: true,
    isCollapsed: false,
    y: 32,
    children: [
      new SceneGridItem({ x: 0, y: 32, width: 6, height: 8, body: getPanel193_StorageTransmitTrafficA() }),
      new SceneGridItem({ x: 6, y: 32, width: 6, height: 8, body: getPanel194_StorageTransmitTrafficB() }),
      new SceneGridItem({ x: 12, y: 32, width: 6, height: 8, body: getPanel195_StorageReceiveTrafficA() }),
      new SceneGridItem({ x: 18, y: 32, width: 6, height: 8, body: getPanel196_StorageReceiveTrafficB() }),
    ],
  });

  // Row 5: Fibre Channel Transmit Details (2 panels - per domain)
  const fcTransmitDetailsRow = new SceneGridRow({
    title: 'Fibre Channel Transmit Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 40,
    children: [
      new SceneGridItem({ x: 0, y: 40, width: 12, height: 12, body: getPanel197_StorageTransmitUtilPerDomainA() }),
      new SceneGridItem({ x: 12, y: 40, width: 12, height: 12, body: getPanel198_StorageTransmitUtilPerDomainB() }),
    ],
  });

  // Row 6: Fibre Channel Receive Details (2 panels - per domain)
  const fcReceiveDetailsRow = new SceneGridRow({
    title: 'Fibre Channel Receive Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 52,
    children: [
      new SceneGridItem({ x: 0, y: 52, width: 12, height: 12, body: getPanel199_StorageReceiveUtilPerDomainA() }),
      new SceneGridItem({ x: 12, y: 52, width: 12, height: 12, body: getPanel200_StorageReceiveUtilPerDomainB() }),
    ],
  });

  // Main layout with all collapsible rows
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 1200,
        body: new SceneGridLayout({
          children: [
            ethernetOverviewRow,
            ethernetTransmitDetailsRow,
            ethernetReceiveDetailsRow,
            fcOverviewRow,
            fcTransmitDetailsRow,
            fcReceiveDetailsRow,
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// TRAFFIC BALANCE TAB - PANEL HELPERS (Panels 185-200)
// ============================================================================

// Panel 185: A: Eth transmit traffic (Sum)
function getPanel185_EthTransmitTrafficA() {
  const queryRunner = new SceneQueryRunner({
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
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

  return PanelBuilders.timeseries()
    .setTitle('A: Eth transmit traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 186: B: Eth transmit traffic (Sum)
function getPanel186_EthTransmitTrafficB() {
  const queryRunner = new SceneQueryRunner({
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
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

  return PanelBuilders.timeseries()
    .setTitle('B: Eth transmit traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 187: A: Eth receive traffic (Sum)
function getPanel187_EthReceiveTrafficA() {
  const queryRunner = new SceneQueryRunner({
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
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

  return PanelBuilders.timeseries()
    .setTitle('A: Eth receive traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 188: B: Eth receive traffic (Sum)
function getPanel188_EthReceiveTrafficB() {
  const queryRunner = new SceneQueryRunner({
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
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

  return PanelBuilders.timeseries()
    .setTitle('B: Eth receive traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 189: A: Eth transmit utilization per domain (Sum)
function getPanel189_EthTransmitUtilPerDomainA() {
  const queryRunner = new SceneQueryRunner({
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
    "dimensions": ["domain_name"],
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
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

  return PanelBuilders.timeseries()
    .setTitle('A: Eth transmit utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 190: B: Eth transmit utilization per domain (Sum)
function getPanel190_EthTransmitUtilPerDomainB() {
  const queryRunner = new SceneQueryRunner({
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
    "dimensions": ["domain_name"],
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
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

  return PanelBuilders.timeseries()
    .setTitle('B: Eth transmit utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 191: A: Eth receive utilization per domain (Sum)
function getPanel191_EthReceiveUtilPerDomainA() {
  const queryRunner = new SceneQueryRunner({
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
    "dimensions": ["domain_name"],
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
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

  return PanelBuilders.timeseries()
    .setTitle('A: Eth receive utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 192: B: Eth receive utilization per domain (Sum)
function getPanel192_EthReceiveUtilPerDomainB() {
  const queryRunner = new SceneQueryRunner({
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
    "dimensions": ["domain_name"],
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
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

  return PanelBuilders.timeseries()
    .setTitle('B: Eth receive utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 193: A: Storage transmit traffic (Sum)
function getPanel193_StorageTransmitTrafficA() {
  const queryRunner = new SceneQueryRunner({
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
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

  return PanelBuilders.timeseries()
    .setTitle('A: Storage transmit traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 194: B: Storage transmit traffic (Sum)
function getPanel194_StorageTransmitTrafficB() {
  const queryRunner = new SceneQueryRunner({
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
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

  return PanelBuilders.timeseries()
    .setTitle('B: Storage transmit traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 195: A: Storage receive traffic (Sum)
function getPanel195_StorageReceiveTrafficA() {
  const queryRunner = new SceneQueryRunner({
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
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

  return PanelBuilders.timeseries()
    .setTitle('A: Storage receive traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 196: B: Storage receive traffic (Sum)
function getPanel196_StorageReceiveTrafficB() {
  const queryRunner = new SceneQueryRunner({
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
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

  return PanelBuilders.timeseries()
    .setTitle('B: Storage receive traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 197: A: Storage transmit utilization per domain (Sum)
function getPanel197_StorageTransmitUtilPerDomainA() {
  const queryRunner = new SceneQueryRunner({
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
    "dimensions": ["domain_name"],
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
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

  return PanelBuilders.timeseries()
    .setTitle('A: Storage transmit utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 198: B: Storage transmit utilization per domain (Sum)
function getPanel198_StorageTransmitUtilPerDomainB() {
  const queryRunner = new SceneQueryRunner({
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
    "dimensions": ["domain_name"],
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
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

  return PanelBuilders.timeseries()
    .setTitle('B: Storage transmit utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 199: A: Storage receive utilization per domain (Sum)
function getPanel199_StorageReceiveUtilPerDomainA() {
  const queryRunner = new SceneQueryRunner({
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
    "dimensions": ["domain_name"],
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
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

  return PanelBuilders.timeseries()
    .setTitle('A: Storage receive utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 200: B: Storage receive utilization per domain (Sum)
function getPanel200_StorageReceiveUtilPerDomainB() {
  const queryRunner = new SceneQueryRunner({
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
    "dimensions": ["domain_name"],
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
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
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

  return PanelBuilders.timeseries()
    .setTitle('B: Storage receive utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

