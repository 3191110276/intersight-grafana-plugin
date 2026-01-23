/**
 * Network Utilization Tab - IMM Domain Scene
 *
 * This module provides the Network Utilization tab functionality for the IMM Domain scene.
 * Shows network utilization metrics for FI uplinks, downlinks, IFM uplinks, and IFM downlinks.
 * Includes nested tabs for Percentage and Absolute views.
 */

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
// NETWORK UTILIZATION TAB - COMPLETE IMPLEMENTATION
// All 5 rows with nested tabs for Percentage (%) and Absolute (bps)
// ============================================================================

// Helper function to create network utilization panels
interface NetworkUtilPanelConfig {
  fabric?: 'A' | 'B' | null;  // null for combined (FI Downlinks, IFM panels)
  direction: 'transmit' | 'receive';
  title: string;
  portRoles: string[];
  portType?: string;
  identifierExpression?: string;
  includeHostFilter?: boolean;
  isPercentage: boolean;  // true for %, false for bps
  isPortChannel?: boolean;  // true for port channels (converts roles to _pc suffix)
}

function createNetworkUtilizationPanel(config: NetworkUtilPanelConfig) {
  const {
    fabric,
    direction,
    title,
    portRoles,
    portType,
    identifierExpression,
    includeHostFilter = true,
    isPercentage,
    isPortChannel = false,
  } = config;

  // Determine field name based on type and direction
  const fieldName = isPercentage
    ? (direction === 'transmit'
        ? 'hw.network.bandwidth.utilization_transmit_max'
        : 'hw.network.bandwidth.utilization_receive_max')
    : (direction === 'transmit'
        ? 'hw.network.io_transmit_max'
        : 'hw.network.io_receive_max');

  const valueName = isPercentage ? 'utilization' : 'throughput';
  const columnName = isPercentage ? 'Utilization' : 'Throughput';
  const baseValueName = isPercentage ? 'utilization' : 'base_throughput';

  // Default identifier expression
  const defaultIdentifier = "concat(domain_name + ' (' + name + ')')";
  const identifier = identifierExpression || defaultIdentifier;

  // Convert port roles to port channel roles if needed
  const effectivePortRoles = isPortChannel
    ? portRoles.map(role => `${role}_pc`)
    : portRoles;

  // Build filter fields
  const filterFields: any[] = [
    {
      type: 'in',
      dimension: 'intersight.domain.name',
      values: ['${DomainName:doublequote}'],
    },
  ];

  // Add fabric filter if specified
  if (fabric && includeHostFilter) {
    filterFields.push({
      type: 'search',
      dimension: 'host.name',
      query: {
        type: 'insensitive_contains',
        value: ` FI-${fabric}`,
      },
    });
  }

  // Add port role filter
  filterFields.push({
    type: 'in',
    dimension: 'hw.network.port.role',
    values: effectivePortRoles,
  });

  // Add port type filter if specified
  if (portType) {
    filterFields.push({
      type: 'selector',
      dimension: 'hw.network.port.type',
      value: portType,
    });
  }

  // Add instrument name filter
  filterFields.push({
    type: 'selector',
    dimension: 'instrument.name',
    value: 'hw.network',
  });

  // Build query body
  const queryBody = {
    queryType: 'groupBy',
    dataSource: 'NetworkInterfaces',
    granularity: {
      type: 'duration',
      duration: '$__interval_ms',
      timeZone: '$__timezone',
    },
    intervals: ['${__from:date}/${__to:date}'],
    dimensions: ['Identifier'],
    virtualColumns: [
      {
        type: 'nested-field',
        columnName: 'intersight.domain.name',
        outputName: 'domain_name',
        expectedType: 'STRING',
        path: '$',
      },
      {
        type: 'expression',
        name: 'Identifier',
        expression: identifier,
        outputType: 'STRING',
      },
    ],
    filter: {
      type: 'and',
      fields: filterFields,
    },
    aggregations: [
      {
        type: 'doubleMax',
        name: baseValueName,
        fieldName: fieldName,
      },
    ],
    ...(isPercentage
      ? {}
      : {
          postAggregations: [
            {
              type: 'expression',
              name: valueName,
              expression: `(${baseValueName} * 8)`,
            },
          ],
        }),
  };

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
          { selector: `event.${valueName}`, text: columnName, type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: JSON.stringify(queryBody, null, 2)
            .replace('"$__interval_ms"', '$__interval_ms')
            .replace('"$__timezone"', '"$__timezone"')
            .replace('"${__from:date}/${__to:date}"', '"${__from:date}/${__to:date}"')
            .replace('"${DomainName:doublequote}"', '${DomainName:doublequote}'),
        },
      } as any,
    ],
  });

  const panelBuilder = PanelBuilders.timeseries()
    .setTitle(title)
    .setData(
      new LoggingDataTransformer({
        $data: queryRunner,
        transformations: [
          {
            id: 'groupingToMatrix',
            options: {
              columnField: 'Name',
              rowField: 'Time',
              valueField: columnName,
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
      })
    )
    .setDecimals(1)
    .setMin(0);

  if (isPercentage) {
    panelBuilder
      .setUnit('percentunit')
      .setMax(1)
      .setThresholds({
        mode: 'percentage',
        steps: [
          { value: 0, color: 'green' },
          { value: 70, color: '#EAB839' },
          { value: 90, color: 'red' },
        ],
      });
  } else {
    panelBuilder.setUnit('bps');
  }

  return panelBuilder.build();
}

// ============================================================================
// ROW 1: Fabric Interconnect Storage Uplinks
// ============================================================================

function getFIStorageUplinksRowContent(isPercentage: boolean) {
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
                title: 'FI-A: Transmit utilization per uplink port (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'FI-B: Transmit utilization per uplink port (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
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
                title: 'FI-A: Receive utilization per uplink port (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'FI-B: Receive utilization per uplink port (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
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
                title: 'FI-A: Transmit utilization per uplink PC (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'FI-B: Transmit utilization per uplink PC (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPortChannel: true,
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
                title: 'FI-A: Receive utilization per uplink PC (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'FI-B: Receive utilization per uplink PC (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Create nested tabs
  return new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => portsTab },
      { id: 'port-channels', label: 'Port Channels', getBody: () => portChannelsTab },
    ],
    activeTab: 'ports',
    body: portsTab,
  });
}

function getFIStorageUplinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'FI Storage Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        body: getFIStorageUplinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// ROW 2: Fabric Interconnect Ethernet Uplinks
// ============================================================================

function getFIEthernetUplinksRowContent(isPercentage: boolean) {
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
                title: 'FI-A: Transmit utilization per uplink port (Max)',
                portRoles: ['eth_uplink'],
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'FI-B: Transmit utilization per uplink port (Max)',
                portRoles: ['eth_uplink'],
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
                title: 'FI-A: Receive utilization per uplink port (Max)',
                portRoles: ['eth_uplink'],
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'FI-B: Receive utilization per uplink port (Max)',
                portRoles: ['eth_uplink'],
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
                title: 'FI-A: Transmit utilization per uplink PC (Max)',
                portRoles: ['eth_uplink'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'FI-B: Transmit utilization per uplink PC (Max)',
                portRoles: ['eth_uplink'],
                isPortChannel: true,
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
                title: 'FI-A: Receive utilization per uplink PC (Max)',
                portRoles: ['eth_uplink'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'FI-B: Receive utilization per uplink PC (Max)',
                portRoles: ['eth_uplink'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Create nested tabs
  return new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => portsTab },
      { id: 'port-channels', label: 'Port Channels', getBody: () => portChannelsTab },
    ],
    activeTab: 'ports',
    body: portsTab,
  });
}

function getFIEthernetUplinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'FI Ethernet Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 24,
    children: [
      new SceneGridItem({
        x: 0,
        y: 24,
        width: 24,
        height: 16,
        body: getFIEthernetUplinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// ROW 3: Fabric Interconnect Downlinks
// ============================================================================

function getFIDownlinksRowContent(isPercentage: boolean) {
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'transmit',
          title: 'Transmit utilization per FI downlink port',
          portRoles: ['server'],
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'receive',
          title: 'Receive utilization per FI downlink port',
          portRoles: ['server'],
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
    ],
  });
}

function getFIDownlinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'FI Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 48,
    children: [
      new SceneGridItem({
        x: 0,
        y: 48,
        width: 24,
        height: 8,
        body: getFIDownlinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// ROW 4: IFM Uplinks
// ============================================================================

function getIFMUplinksRowContent(isPercentage: boolean) {
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'transmit',
          title: 'Transmit utilization per IFM uplink port',
          portRoles: ['network'],
          portType: 'backplane_port',
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (G' + chassis_number + '/' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'receive',
          title: 'Receive utilization per IFM uplink port',
          portRoles: ['network'],
          portType: 'backplane_port',
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (G' + chassis_number + '/' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
    ],
  });
}

function getIFMUplinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'IFM Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 72,
    children: [
      new SceneGridItem({
        x: 0,
        y: 72,
        width: 24,
        height: 8,
        body: getIFMUplinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// ROW 5: IFM Downlinks
// ============================================================================

function getIFMDownlinksRowContent(isPercentage: boolean) {
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'transmit',
          title: 'Transmit utilization per IFM downlink port',
          portRoles: ['host_port'],
          portType: 'backplane_port',
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (G' + chassis_number + '/' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'receive',
          title: 'Receive utilization per IFM downlink port',
          portRoles: ['host_port'],
          portType: 'backplane_port',
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (G' + chassis_number + '/' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
    ],
  });
}

function getIFMDownlinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'IFM Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 96,
    children: [
      new SceneGridItem({
        x: 0,
        y: 96,
        width: 24,
        height: 8,
        body: getIFMDownlinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// MAIN TAB FUNCTIONS
// ============================================================================

function getNetworkUtilizationPercentageTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 2000,
        body: new SceneGridLayout({
          children: [
            getFIStorageUplinksRow(true),
            getFIEthernetUplinksRow(true),
            getFIDownlinksRow(true),
            getIFMUplinksRow(true),
            getIFMDownlinksRow(true),
          ],
        }),
      }),
    ],
  });
}

function getNetworkUtilizationAbsoluteTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 2000,
        body: new SceneGridLayout({
          children: [
            getFIStorageUplinksRow(false),
            getFIEthernetUplinksRow(false),
            getFIDownlinksRow(false),
            getIFMUplinksRow(false),
            getIFMDownlinksRow(false),
          ],
        }),
      }),
    ],
  });
}


