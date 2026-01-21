import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  QueryVariable,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { TabbedScene } from '../components/TabbedScene';

// ============================================================================
// TAB PLACEHOLDER FUNCTIONS
// These will be implemented in subsequent phases
// ============================================================================

function getOverviewTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Overview')
          .setOption('content', `
# Overview Tab

This tab provides a high-level overview of all IMM Domains including:
- Alarms summary (repeated by DomainName)
- Actions summary (repeated by DomainName)
- Network Utilization preview
- Congestion preview
- Network Errors preview
- CPU Utilization preview

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getInventoryTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Inventory')
          .setOption('content', `
# Inventory Tab

This tab shows inventory information including:
- Fabric Interconnect inventory
- Chassis inventory
- Server inventory

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
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
          .setOption('content', `
# Alarms Tab

This tab displays domain-specific alarms with:
- DomainName repeat
- Severity color coding
- Time-based filtering

**Status**: To be implemented
          `)
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
          .setOption('content', `
# Actions Tab

This tab shows domain-specific actions with:
- Workflow status color coding
- Progress gauges
- User and target type mappings

**Status**: To be implemented
          `)
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
          .setOption('content', `
# Ports Tab

This tab displays port information including:
- A/B switch port analytics
- Uplink port status
- Downlink port status
- Port utilization metrics

**Status**: To be implemented
          `)
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
          .setOption('content', `
# Network Utilization Tab

This tab has nested sub-tabs:
- **Percentage (%)**: TX/RX utilization per uplink port for FI-A and FI-B
- **Absolute (bps)**: TX/RX throughput per uplink port for FI-A and FI-B

Includes sub-categories:
- Fabric Interconnect Storage Uplinks (Ports & Port Channels)
- Fabric Interconnect Ethernet Uplinks (Ports & Port Channels)
- Fabric Interconnect Downlinks
- IFM Uplinks
- IFM Downlinks

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getTrafficBalanceTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Traffic Balance')
          .setOption('content', `
# Traffic Balance Tab

This tab has nested sub-tabs:
- **Ethernet Overview**: Traffic distribution visualization
- **Ethernet Transmit Details**: Per-domain traffic analysis
- **Ethernet Receive Details**: Per-domain traffic analysis
- **Fibre Channel Overview**: Traffic distribution visualization
- **Fibre Channel Transmit Details**: Per-domain traffic analysis
- **Fibre Channel Receive Details**: Per-domain traffic analysis

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getCongestionTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Congestion')
          .setOption('content', `
# Congestion Tab

This tab monitors pause frames with nested sub-tabs:
- **Sending**: TX pause frames (FI-A and FI-B)
- **Receiving**: RX pause frames (FI-A and FI-B)

Includes sub-categories:
- Fabric Interconnect Ethernet Uplinks (Ports & Port Channels)
- Fabric Interconnect Downlinks
- IFM Downlinks

**Status**: To be implemented
          `)
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
          .setOption('content', `
# Network Errors Tab

This tab displays network error information:
- Fabric Interconnect Ethernet Uplinks (Ports & Port Channels)
- Fabric Interconnect Downlinks
- IFM Uplinks
- IFM Downlinks
- Error Descriptions reference

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getSFPTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('SFP')
          .setOption('content', `
# SFP Tab

This tab monitors SFP transceivers:
- Transceiver status table
- SFP health information
- Optical power levels (if applicable)

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getEnvironmentalTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Environmental')
          .setOption('content', `
# Environmental Tab

This tab monitors environmental metrics:
- **Power Supply Status**: Active PSUs per device
- **Domain Power Consumption**: Per Domain, Per FI, Per FI Pair, Per Chassis
- **Host Power Consumption**: Server power metrics
- **Fabric Interconnect Fan Speed**: Fan monitoring
- **Chassis Fan Speed**: Chassis fan monitoring
- **Fabric Interconnect Temperature**: Intake/Exhaust, CPU/ASIC temps
- **Chassis Temperature**: Chassis temperature monitoring
- **Host Temperature**: Temperature and Cooling Budget

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

function getCPUUtilizationTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('CPU Utilization')
          .setOption('content', `
# CPU Utilization Tab

This tab displays CPU utilization metrics:
- Utilization per Domain
- Top Servers by CPU Utilization

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
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
          .setOption('content', `
# Storage Tab

This tab has nested sub-tabs for storage information:
- **Storage Controllers**: Controller inventory and status
- **SSD Disks**: SSD disk information and health
- **HDD Disks**: HDD disk information and health
- **Virtual Drives**: RAID and virtual drive configuration

**Status**: To be implemented
          `)
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

const immDomainTabs = [
  { id: 'overview', label: 'Overview', getBody: getOverviewTab },
  { id: 'inventory', label: 'Inventory', getBody: getInventoryTab },
  { id: 'alarms', label: 'Alarms', getBody: getAlarmsTab },
  { id: 'actions', label: 'Actions', getBody: getActionsTab },
  { id: 'ports', label: 'Ports', getBody: getPortsTab },
  { id: 'network-utilization', label: 'Network Utilization', getBody: getNetworkUtilizationTab },
  { id: 'traffic-balance', label: 'Traffic Balance', getBody: getTrafficBalanceTab },
  { id: 'congestion', label: 'Congestion', getBody: getCongestionTab },
  { id: 'network-errors', label: 'Network Errors', getBody: getNetworkErrorsTab },
  { id: 'sfp', label: 'SFP', getBody: getSFPTab },
  { id: 'environmental', label: 'Environmental', getBody: getEnvironmentalTab },
  { id: 'cpu-utilization', label: 'CPU Utilization', getBody: getCPUUtilizationTab },
  { id: 'storage', label: 'Storage', getBody: getStorageTab },
];

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function getIMMDomainSceneBody() {
  // Create DomainName variable - scoped to IMM Domain tab
  // Queries ElementSummaries with ManagementMode filter
  // Uses regex to extract domain name (removes " FI-A" suffix)
  const domainNameVariable = new QueryVariable({
    name: 'DomainName',
    label: 'Domain',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/network/ElementSummaries?$filter=ManagementMode eq \'Intersight\'',
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
    regex: '(?<text>.*) FI-A', // Extract domain name without " FI-A" suffix
  });

  // Create RegisteredDevices variable - hidden, depends on DomainName
  // Used for filtering in downstream panels
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
        url: '/api/v1/asset/DeviceRegistrations?$filter=DeviceHostname in (${DomainName:singlequote})',
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

  // Create variable set for IMM Domain tab
  const variables = new SceneVariableSet({
    variables: [domainNameVariable, registeredDevicesVariable],
  });

  // Create the tabbed scene with controls on same line as tabs
  return new TabbedScene({
    $variables: variables,
    tabs: immDomainTabs,
    activeTab: 'overview',
    body: getOverviewTab(),
    controls: [new VariableValueSelectors({})],
  });
}
