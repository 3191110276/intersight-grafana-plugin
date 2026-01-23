import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { TabbedScene } from '../../components/TabbedScene';

// ============================================================================
// NETWORK UTILIZATION TAB - MAIN ENTRY POINT
// ============================================================================

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

// ============================================================================
// PERCENTAGE TAB
// ============================================================================

function getNetworkUtilizationPercentageTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      getECMCUplinksRow(true),
      getECMCDownlinksRow(true),
    ],
  });
}

// ============================================================================
// ABSOLUTE TAB
// ============================================================================

function getNetworkUtilizationAbsoluteTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      getECMCUplinksRow(false),
      getECMCDownlinksRow(false),
    ],
  });
}

// ============================================================================
// ECMC UPLINKS ROW - Ports and Port Channels subtabs
// ============================================================================

function getECMCUplinksRow(isPercentage: boolean) {
  // Ports Tab (4 panels)
  const portsTab = new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'transmit',
                title: 'A: Transmit utilization in ' + (isPercentage ? '%' : 'bps') + ' per uplink port (Max)',
                portRole: 'eth_uplink',
                portType: 'ethernet',
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'B: Transmit utilization in ' + (isPercentage ? '%' : 'bps') + ' per uplink port (Max)',
                portRole: 'eth_uplink',
                portType: 'ethernet',
                isPercentage,
              }),
            }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'receive',
                title: 'A: Receive utilization in ' + (isPercentage ? '%' : 'bps') + ' per uplink port (Max)',
                portRole: 'eth_uplink',
                portType: 'ethernet',
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'B: Receive utilization in ' + (isPercentage ? '%' : 'bps') + ' per uplink port (Max)',
                portRole: 'eth_uplink',
                portType: 'ethernet',
                isPercentage,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Port Channels Tab (4 panels)
  const portChannelsTab = new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'transmit',
                title: 'A: Transmit utilization in ' + (isPercentage ? '%' : 'bps') + ' per uplink PC (Max)',
                portRole: 'eth_uplink_pc',
                portType: 'ethernet_port_channel',
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'B: Transmit utilization in ' + (isPercentage ? '%' : 'bps') + ' per uplink PC (Max)',
                portRole: 'eth_uplink_pc',
                portType: 'ethernet_port_channel',
                isPercentage,
              }),
            }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'receive',
                title: 'A: Receive utilization in ' + (isPercentage ? '%' : 'bps') + ' per uplink PC (Max)',
                portRole: 'eth_uplink_pc',
                portType: 'ethernet_port_channel',
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'B: Receive utilization in ' + (isPercentage ? '%' : 'bps') + ' per uplink PC (Max)',
                portRole: 'eth_uplink_pc',
                portType: 'ethernet_port_channel',
                isPercentage,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Create nested tabs for Ports and Port Channels
  const uplinksTabs = new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => portsTab },
      { id: 'port-channels', label: 'Port Channels', getBody: () => portChannelsTab },
    ],
    activeTab: 'ports',
    body: portsTab,
  });

  return new SceneFlexItem({
    height: 900,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          height: 50,
          body: PanelBuilders.text()
            .setTitle('eCMC Uplinks')
            .setOption('content', '')
            .setOption('mode', 'markdown')
            .build(),
        }),
        new SceneFlexItem({
          height: 850,
          body: uplinksTabs,
        }),
      ],
    }),
  });
}

// ============================================================================
// ECMC DOWNLINKS ROW - Server ports (4 panels)
// ============================================================================

function getECMCDownlinksRow(isPercentage: boolean) {
  return new SceneFlexItem({
    height: 900,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          height: 50,
          body: PanelBuilders.text()
            .setTitle('eCMC Downlinks')
            .setOption('content', '')
            .setOption('mode', 'markdown')
            .build(),
        }),
        new SceneFlexItem({
          height: 400,
          body: new SceneFlexLayout({
            direction: 'row',
            children: [
              new SceneFlexItem({
                width: '50%',
                body: createNetworkUtilizationPanel({
                  fabric: 'A',
                  direction: 'transmit',
                  title: 'A: Transmit utilization in ' + (isPercentage ? '%' : 'bps') + ' per server port (Max)',
                  portRole: 'host_port',
                  portType: 'backplane_port',
                  isPercentage,
                }),
              }),
              new SceneFlexItem({
                width: '50%',
                body: createNetworkUtilizationPanel({
                  fabric: 'B',
                  direction: 'transmit',
                  title: 'B: Transmit utilization in ' + (isPercentage ? '%' : 'bps') + ' per server port (Max)',
                  portRole: 'host_port',
                  portType: 'backplane_port',
                  isPercentage,
                }),
              }),
            ],
          }),
        }),
        new SceneFlexItem({
          height: 400,
          body: new SceneFlexLayout({
            direction: 'row',
            children: [
              new SceneFlexItem({
                width: '50%',
                body: createNetworkUtilizationPanel({
                  fabric: 'A',
                  direction: 'receive',
                  title: 'A: Receive utilization in ' + (isPercentage ? '%' : 'bps') + ' per server port (Max)',
                  portRole: 'host_port',
                  portType: 'backplane_port',
                  isPercentage,
                }),
              }),
              new SceneFlexItem({
                width: '50%',
                body: createNetworkUtilizationPanel({
                  fabric: 'B',
                  direction: 'receive',
                  title: 'B: Transmit utilization in ' + (isPercentage ? '%' : 'bps') + ' per server port (Max)',
                  portRole: 'host_port',
                  portType: 'backplane_port',
                  isPercentage,
                }),
              }),
            ],
          }),
        }),
      ],
    }),
  });
}

// ============================================================================
// PANEL CREATION HELPER
// ============================================================================

interface NetworkUtilPanelConfig {
  fabric: 'A' | 'B';
  direction: 'transmit' | 'receive';
  title: string;
  portRole: string;
  portType: string;
  isPercentage: boolean;
}

function createNetworkUtilizationPanel(config: NetworkUtilPanelConfig) {
  const {
    fabric,
    direction,
    title,
    portRole,
    portType,
    isPercentage,
  } = config;

  // Determine field name based on type and direction
  const fieldName = isPercentage
    ? (direction === 'transmit'
        ? 'hw.network.bandwidth.utilization_transmit_max'
        : 'hw.network.bandwidth.utilization_receive_max')
    : (direction === 'transmit'
        ? 'hw.network.io_transmit_max'
        : 'hw.network.io_receive_max');

  const aggregationName = isPercentage ? 'utilization' : 'base_utilization';

  // Build query body - KEEP EXACTLY AS IN ORIGINAL JSON
  const queryBody = isPercentage
    ? `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "Identifier"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + ' (' + name + ')')",
      "outputType": "STRING"
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
            "value": " eCMC-${fabric}"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "${portType}"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "${portRole}"
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
        "type": "doubleMax",
        "name": "${aggregationName}",
        "fieldName": "${fieldName}"
      }
    ]
  }`
    : `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "Identifier"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + ' (' + name + ')')",
      "outputType": "STRING"
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
            "value": " eCMC-${fabric}"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "${portType}"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "${portRole}"
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
        "type": "doubleMax",
        "name": "${aggregationName}",
        "fieldName": "${fieldName}"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "utilization",
        "expression": "(${aggregationName}*8)"
      }
    ]
  }`;

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
        root_selector: '',
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.Identifier', text: 'Name', type: 'string' },
          { selector: 'event.utilization', text: 'Utilization', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: queryBody,
        },
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Name',
          rowField: 'Time',
          valueField: 'Utilization',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '(.*)Ethernet(.*)',
          renamePattern: '$1$2',
        },
      },
    ],
  });

  // Build panel with appropriate configuration
  const panelBuilder = PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformedData)
    .setOption('legend', {
      calcs: [],
      displayMode: 'list',
      placement: 'bottom',
      showLegend: true,
    })
    .setOption('tooltip', {
      hideZeros: false,
      mode: 'multi',
      sort: 'desc',
    });

  // Apply percentage-specific settings
  if (isPercentage) {
    panelBuilder
      .setUnit('percentunit')
      .setDecimals(1)
      .setMax(1)
      .setMin(0)
      .setThresholds({
        mode: 'percentage',
        steps: [
          { value: 0, color: 'green' },
          { value: 70, color: '#EAB839' },
          { value: 90, color: 'red' },
        ],
      });
  } else {
    // Absolute (bps) settings
    panelBuilder.setUnit('bps');
  }

  return panelBuilder.build();
}
