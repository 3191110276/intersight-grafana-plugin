/**
 * Network Errors Tab - Unified Edge Scene
 *
 * This module provides the Network Errors tab functionality for the Unified Edge scene.
 * Includes eCMC Uplinks (Ports + Port Channels), eCMC Downlinks, and Error Descriptions.
 */

import React from 'react';
import {
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
  behaviors,
} from '@grafana/scenes';
import { DashboardCursorSync } from '@grafana/data';
import { TabbedScene } from '../../components/TabbedScene';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get chassis count from ChassisName variable
 * Used to determine single vs multiple chassis view
 */
function getChassisCount(scene: SceneObjectBase): number {
  const variable = sceneGraph.lookupVariable('ChassisName', scene);
  if (!variable || !('state' in variable)) {
    return 0;
  }

  const value = (variable.state as any).value;

  if (Array.isArray(value)) {
    return value.filter((v) => v && v !== '$__all').length;
  } else if (value && value !== '$__all') {
    return 1;
  }

  return 0;
}

/**
 * Create drilldown query by replacing ChassisName variable with hardcoded value
 */
function createDrilldownQuery(baseQuery: any, chassisName: string): any {
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));
  const escapedChassisName = JSON.stringify(chassisName);

  // Replace [${ChassisName:doublequote}] with ["chassisName"]
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /\[\$\{ChassisName:doublequote\}\]/g,
    `[${escapedChassisName}]`
  );

  return drilldownQuery;
}

// ============================================================================
// DRILLDOWN HEADER COMPONENT
// ============================================================================

interface DrilldownHeaderControlState extends SceneObjectState {
  chassisName: string;
  onBack: () => void;
}

class DrilldownHeaderControl extends SceneObjectBase<DrilldownHeaderControlState> {
  public static Component = DrilldownHeaderRenderer;
}

function DrilldownHeaderRenderer({ model }: SceneComponentProps<DrilldownHeaderControl>) {
  const { chassisName, onBack } = model.useState();

  return (
    <div
      style={{
        padding: '12px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: '6px 12px',
          cursor: 'pointer',
          background: 'transparent',
          border: '1px solid rgba(204, 204, 220, 0.25)',
          borderRadius: '2px',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
        }}
      >
        <span>&larr;</span>
        <span>Back to Overview</span>
      </button>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 500,
        }}
      >
        Drilldown: Chassis: {chassisName}
      </div>
    </div>
  );
}

// ============================================================================
// CLICKABLE TABLE WRAPPER COMPONENT
// ============================================================================

interface ClickableTableWrapperState extends SceneObjectState {
  tablePanel: any;
  onRowClick: (name: string) => void;
}

class ClickableTableWrapper extends SceneObjectBase<ClickableTableWrapperState> {
  public static Component = ClickableTableWrapperRenderer;
}

function ClickableTableWrapperRenderer({ model }: SceneComponentProps<ClickableTableWrapper>) {
  const { tablePanel, onRowClick } = model.useState();

  const handleClick = (event: React.MouseEvent) => {
    // Find the row element
    let row = (event.target as HTMLElement).closest('[role="row"]');

    // Fallback: try standard table selectors
    if (!row) {
      row = (event.target as HTMLElement).closest('tr');
    }

    if (!row) {
      return;
    }

    // Grafana's virtualized table uses <div role="cell"> without aria-colindex
    // Try multiple selector strategies for first cell
    let firstCell = row.querySelector('[role="gridcell"][aria-colindex="1"]'); // Old Grafana tables

    if (!firstCell) {
      // Grafana 12+ virtualized tables use role="cell"
      firstCell = row.querySelector('[role="cell"]');
    }

    if (!firstCell) {
      // Fallback: try first td (non-virtualized tables)
      firstCell = row.querySelector('td:first-child');
    }

    if (firstCell) {
      const name = firstCell.textContent?.trim();
      if (name) {
        onRowClick(name);
      }
    }
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
      <tablePanel.Component model={tablePanel} />
    </div>
  );
}

// ============================================================================
// BASE QUERIES - eCMC DOWNLINKS
// ============================================================================

/**
 * Base query for downlink port network errors
 * Filters: backplane_port + host_port
 */
function createDownlinkPortsQuery() {
  return {
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
      { selector: 'event.name', text: 'PortName', type: 'string' },
      { selector: 'event.host_name', text: 'Hostname', type: 'string' },
      // Individual RX error columns
      { selector: 'event.too_short', text: 'too_short', type: 'number' },
      { selector: 'event.crc', text: 'crc', type: 'number' },
      { selector: 'event.too_long', text: 'too_long', type: 'number' },
      // Individual TX error columns
      { selector: 'event.jabber', text: 'jabber', type: 'number' },
      { selector: 'event.late_collisions', text: 'late_collisions', type: 'number' },
      // Aggregate sums (for summary table)
      { selector: 'event.tx_sum', text: 'TX', type: 'number' },
      { selector: 'event.rx_sum', text: 'RX', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `{
  "queryType": "groupBy",
  "dataSource": "NetworkInterfaces",
  "granularity": {
    "type": "duration",
    "duration": $__interval_ms,
    "timeZone": "$__timezone"
  },
  "intervals": ["\${__from:date}/\${__to:date}"],
  "dimensions": [
    "name",
    "host_name"
  ],
  "virtualColumns": [
    {
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }
  ],
  "filter": {
    "type": "and",
    "fields": [
      {
        "type": "in",
        "dimension": "intersight.domain.name",
        "values": [\${ChassisName:doublequote}]
      },
      {
        "type": "selector",
        "dimension": "hw.network.port.type",
        "value": "backplane_port"
      },
      {
        "type": "selector",
        "dimension": "hw.network.port.role",
        "value": "host_port"
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
      "type": "longSum",
      "name": "too_long",
      "fieldName": "hw.errors_network_receive_too_long"
    },
    {
      "type": "longSum",
      "name": "crc",
      "fieldName": "hw.errors_network_receive_crc"
    },
    {
      "type": "longSum",
      "name": "too_short",
      "fieldName": "hw.errors_network_receive_too_short"
    },
    {
      "type": "longSum",
      "name": "late_collisions",
      "fieldName": "hw.errors_network_late_collisions"
    },
    {
      "type": "longSum",
      "name": "jabber",
      "fieldName": "hw.errors_network_transmit_jabber"
    }
  ],
  "postAggregations": [
    {
      "type": "expression",
      "name": "rx_sum",
      "expression": "\\"too_short\\" + \\"crc\\" + \\"too_long\\""
    },
    {
      "type": "expression",
      "name": "tx_sum",
      "expression": "\\"jabber\\" + \\"late_collisions\\""
    },
    {
      "type": "expression",
      "name": "total",
      "expression": "\\"tx_sum\\" + \\"rx_sum\\""
    }
  ]
}`,
    },
  } as any;
}

/**
 * Table-specific query for downlink port network errors
 * Uses "all" granularity for aggregate table view
 */
function createDownlinkPortsTableQuery() {
  return {
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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      // Individual aggregations (RX errors)
      { selector: 'event.too_long', text: 'Too Long', type: 'number' },
      { selector: 'event.crc', text: 'CRC', type: 'number' },
      { selector: 'event.too_short', text: 'Too Short', type: 'number' },
      // Individual aggregations (TX errors)
      { selector: 'event.late_collisions', text: 'Late Collisions', type: 'number' },
      { selector: 'event.jabber', text: 'Jabber', type: 'number' },
      // Post-aggregations (computed sums)
      { selector: 'event.rx_sum', text: 'RX Sum', type: 'number' },
      { selector: 'event.tx_sum', text: 'TX Sum', type: 'number' },
      { selector: 'event.total', text: 'Total', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `{
  "queryType": "groupBy",
  "dataSource": "NetworkInterfaces",
  "granularity": "all",
  "intervals": ["\${__from:date}/\${__to:date}"],
  "dimensions": [
    "domain_name"
  ],
  "virtualColumns": [
    {
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },
    {
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + ' (' + name + ')')",
      "outputType": "STRING"
    },
    {
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }
  ],
  "filter": {
    "type": "and",
    "fields": [
      {
        "type": "in",
        "dimension": "intersight.domain.name",
        "values": [\${ChassisName:doublequote}]
      },
      {
        "type": "selector",
        "dimension": "hw.network.port.type",
        "value": "backplane_port"
      },
      {
        "type": "selector",
        "dimension": "hw.network.port.role",
        "value": "host_port"
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
      "type": "longSum",
      "name": "too_long",
      "fieldName": "hw.errors_network_receive_too_long"
    },
    {
      "type": "longSum",
      "name": "crc",
      "fieldName": "hw.errors_network_receive_crc"
    },
    {
      "type": "longSum",
      "name": "too_short",
      "fieldName": "hw.errors_network_receive_too_short"
    },
    {
      "type": "longSum",
      "name": "late_collisions",
      "fieldName": "hw.errors_network_late_collisions"
    },
    {
      "type": "longSum",
      "name": "jabber",
      "fieldName": "hw.errors_network_transmit_jabber"
    }
  ],
  "postAggregations": [
    {
      "type": "expression",
      "name": "rx_sum",
      "expression": "\\"too_short\\" + \\"crc\\" + \\"too_long\\""
    },
    {
      "type": "expression",
      "name": "tx_sum",
      "expression": "\\"jabber\\" + \\"late_collisions\\""
    },
    {
      "type": "expression",
      "name": "total",
      "expression": "\\"tx_sum\\" + \\"rx_sum\\""
    }
  ]
}`,
    },
  } as any;
}

// ============================================================================
// BASE QUERIES - eCMC UPLINKS (PORTS)
// ============================================================================

/**
 * Base query for uplink port network errors
 * Filters: ethernet + eth_uplink
 */
function createUplinkPortsQuery() {
  return {
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
      { selector: 'event.name', text: 'PortName', type: 'string' },
      { selector: 'event.host_name', text: 'Hostname', type: 'string' },
      // Individual RX error columns
      { selector: 'event.too_short', text: 'too_short', type: 'number' },
      { selector: 'event.crc', text: 'crc', type: 'number' },
      { selector: 'event.too_long', text: 'too_long', type: 'number' },
      // Individual TX error columns
      { selector: 'event.jabber', text: 'jabber', type: 'number' },
      { selector: 'event.late_collisions', text: 'late_collisions', type: 'number' },
      // Aggregate sums (for summary table)
      { selector: 'event.tx_sum', text: 'TX', type: 'number' },
      { selector: 'event.rx_sum', text: 'RX', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `{
  "queryType": "groupBy",
  "dataSource": "NetworkInterfaces",
  "granularity": {
    "type": "duration",
    "duration": $__interval_ms,
    "timeZone": "$__timezone"
  },
  "intervals": ["\${__from:date}/\${__to:date}"],
  "dimensions": [
    "name",
    "host_name"
  ],
  "virtualColumns": [
    {
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }
  ],
  "filter": {
    "type": "and",
    "fields": [
      {
        "type": "in",
        "dimension": "intersight.domain.name",
        "values": [\${ChassisName:doublequote}]
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
      "type": "longSum",
      "name": "runt",
      "fieldName": "hw.errors_network_receive_runt"
    },
    {
      "type": "longSum",
      "name": "too_long",
      "fieldName": "hw.errors_network_receive_too_long"
    },
    {
      "type": "longSum",
      "name": "crc",
      "fieldName": "hw.errors_network_receive_crc"
    },
    {
      "type": "longSum",
      "name": "no_buffer",
      "fieldName": "hw.errors_network_receive_no_buffer"
    },
    {
      "type": "longSum",
      "name": "too_short",
      "fieldName": "hw.errors_network_receive_too_short"
    },
    {
      "type": "longSum",
      "name": "rx_discard",
      "fieldName": "hw.errors_network_receive_discard"
    },
    {
      "type": "longSum",
      "name": "deferred",
      "fieldName": "hw.errors_network_transmit_deferred"
    },
    {
      "type": "longSum",
      "name": "late_collisions",
      "fieldName": "hw.errors_network_late_collisions"
    },
    {
      "type": "longSum",
      "name": "carrier_sense",
      "fieldName": "hw.errors_network_carrier_sense"
    },
    {
      "type": "longSum",
      "name": "tx_discard",
      "fieldName": "hw.errors_network_transmit_discard"
    },
    {
      "type": "longSum",
      "name": "jabber",
      "fieldName": "hw.errors_network_transmit_jabber"
    }
  ],
  "postAggregations": [
    {
      "type": "expression",
      "name": "rx_sum",
      "expression": "\\"too_short\\" + \\"crc\\" + \\"too_long\\""
    },
    {
      "type": "expression",
      "name": "tx_sum",
      "expression": "\\"jabber\\" + \\"late_collisions\\""
    },
    {
      "type": "expression",
      "name": "total",
      "expression": "\\"tx_sum\\" + \\"rx_sum\\""
    }
  ]
}`,
    },
  } as any;
}

/**
 * Base query for uplink port channel network errors
 * Filters: ethernet_port_channel + eth_uplink_pc
 */
function createUplinkPortChannelsQuery() {
  return {
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
      { selector: 'event.name', text: 'PortName', type: 'string' },
      { selector: 'event.host_name', text: 'Hostname', type: 'string' },
      // Individual RX error columns (port channels have more RX errors than ports)
      { selector: 'event.runt', text: 'runt', type: 'number' },
      { selector: 'event.too_long', text: 'too_long', type: 'number' },
      { selector: 'event.crc', text: 'crc', type: 'number' },
      { selector: 'event.no_buffer', text: 'no_buffer', type: 'number' },
      { selector: 'event.too_short', text: 'too_short', type: 'number' },
      { selector: 'event.rx_discard', text: 'rx_discard', type: 'number' },
      // Individual TX error columns (port channels have more TX errors than ports)
      { selector: 'event.deferred', text: 'deferred', type: 'number' },
      { selector: 'event.late_collisions', text: 'late_collisions', type: 'number' },
      { selector: 'event.carrier_sense', text: 'carrier_sense', type: 'number' },
      { selector: 'event.tx_discard', text: 'tx_discard', type: 'number' },
      { selector: 'event.jabber', text: 'jabber', type: 'number' },
      // Aggregate sums (for summary table)
      { selector: 'event.tx_sum', text: 'TX', type: 'number' },
      { selector: 'event.rx_sum', text: 'RX', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `{
  "queryType": "groupBy",
  "dataSource": "NetworkInterfaces",
  "granularity": {
    "type": "duration",
    "duration": $__interval_ms,
    "timeZone": "$__timezone"
  },
  "intervals": ["\${__from:date}/\${__to:date}"],
  "dimensions": [
    "name",
    "host_name"
  ],
  "virtualColumns": [
    {
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }
  ],
  "filter": {
    "type": "and",
    "fields": [
      {
        "type": "in",
        "dimension": "intersight.domain.name",
        "values": [\${ChassisName:doublequote}]
      },
      {
        "type": "selector",
        "dimension": "hw.network.port.type",
        "value": "ethernet_port_channel"
      },
      {
        "type": "selector",
        "dimension": "hw.network.port.role",
        "value": "eth_uplink_pc"
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
      "type": "longSum",
      "name": "runt",
      "fieldName": "hw.errors_network_receive_runt"
    },
    {
      "type": "longSum",
      "name": "too_long",
      "fieldName": "hw.errors_network_receive_too_long"
    },
    {
      "type": "longSum",
      "name": "crc",
      "fieldName": "hw.errors_network_receive_crc"
    },
    {
      "type": "longSum",
      "name": "no_buffer",
      "fieldName": "hw.errors_network_receive_no_buffer"
    },
    {
      "type": "longSum",
      "name": "too_short",
      "fieldName": "hw.errors_network_receive_too_short"
    },
    {
      "type": "longSum",
      "name": "rx_discard",
      "fieldName": "hw.errors_network_receive_discard"
    },
    {
      "type": "longSum",
      "name": "deferred",
      "fieldName": "hw.errors_network_transmit_deferred"
    },
    {
      "type": "longSum",
      "name": "late_collisions",
      "fieldName": "hw.errors_network_late_collisions"
    },
    {
      "type": "longSum",
      "name": "carrier_sense",
      "fieldName": "hw.errors_network_carrier_sense"
    },
    {
      "type": "longSum",
      "name": "tx_discard",
      "fieldName": "hw.errors_network_transmit_discard"
    },
    {
      "type": "longSum",
      "name": "jabber",
      "fieldName": "hw.errors_network_transmit_jabber"
    }
  ],
  "postAggregations": [
    {
      "type": "expression",
      "name": "rx_sum",
      "expression": "\\"rx_discard\\" + \\"too_short\\" + \\"no_buffer\\" + \\"crc\\" + \\"too_long\\" + \\"runt\\""
    },
    {
      "type": "expression",
      "name": "tx_sum",
      "expression": "\\"jabber\\" + \\"tx_discard\\" + \\"carrier_sense\\" + \\"late_collisions\\" + \\"deferred\\""
    },
    {
      "type": "expression",
      "name": "total",
      "expression": "\\"tx_sum\\" + \\"rx_sum\\""
    }
  ]
}`,
    },
  } as any;
}

/**
 * Table-specific query for uplink port network errors
 * Uses "all" granularity for aggregate table view
 */
function createUplinkPortsTableQuery() {
  return {
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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      // Individual aggregations (RX errors)
      { selector: 'event.too_long', text: 'Too Long', type: 'number' },
      { selector: 'event.crc', text: 'CRC', type: 'number' },
      { selector: 'event.too_short', text: 'Too Short', type: 'number' },
      // Individual aggregations (TX errors)
      { selector: 'event.late_collisions', text: 'Late Collisions', type: 'number' },
      { selector: 'event.jabber', text: 'Jabber', type: 'number' },
      // Post-aggregations (computed sums)
      { selector: 'event.rx_sum', text: 'RX Sum', type: 'number' },
      { selector: 'event.tx_sum', text: 'TX Sum', type: 'number' },
      { selector: 'event.total', text: 'Total', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `{
  "queryType": "groupBy",
  "dataSource": "NetworkInterfaces",
  "granularity": "all",
  "intervals": ["\${__from:date}/\${__to:date}"],
  "dimensions": [
    "domain_name"
  ],
  "virtualColumns": [
    {
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },
    {
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + ' (' + name + ')')",
      "outputType": "STRING"
    },
    {
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }
  ],
  "filter": {
    "type": "and",
    "fields": [
      {
        "type": "in",
        "dimension": "intersight.domain.name",
        "values": [\${ChassisName:doublequote}]
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
      "type": "longSum",
      "name": "runt",
      "fieldName": "hw.errors_network_receive_runt"
    },
    {
      "type": "longSum",
      "name": "too_long",
      "fieldName": "hw.errors_network_receive_too_long"
    },
    {
      "type": "longSum",
      "name": "crc",
      "fieldName": "hw.errors_network_receive_crc"
    },
    {
      "type": "longSum",
      "name": "no_buffer",
      "fieldName": "hw.errors_network_receive_no_buffer"
    },
    {
      "type": "longSum",
      "name": "too_short",
      "fieldName": "hw.errors_network_receive_too_short"
    },
    {
      "type": "longSum",
      "name": "rx_discard",
      "fieldName": "hw.errors_network_receive_discard"
    },
    {
      "type": "longSum",
      "name": "deferred",
      "fieldName": "hw.errors_network_transmit_deferred"
    },
    {
      "type": "longSum",
      "name": "late_collisions",
      "fieldName": "hw.errors_network_late_collisions"
    },
    {
      "type": "longSum",
      "name": "carrier_sense",
      "fieldName": "hw.errors_network_carrier_sense"
    },
    {
      "type": "longSum",
      "name": "tx_discard",
      "fieldName": "hw.errors_network_transmit_discard"
    },
    {
      "type": "longSum",
      "name": "jabber",
      "fieldName": "hw.errors_network_transmit_jabber"
    }
  ],
  "postAggregations": [
    {
      "type": "expression",
      "name": "rx_sum",
      "expression": "\\"too_short\\" + \\"crc\\" + \\"too_long\\""
    },
    {
      "type": "expression",
      "name": "tx_sum",
      "expression": "\\"jabber\\" + \\"late_collisions\\""
    },
    {
      "type": "expression",
      "name": "total",
      "expression": "\\"tx_sum\\" + \\"rx_sum\\""
    }
  ]
}`,
    },
  } as any;
}

/**
 * Table-specific query for uplink port channel network errors
 * Uses "all" granularity for aggregate table view
 */
function createUplinkPortChannelsTableQuery() {
  return {
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
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      // Individual aggregations (RX errors)
      { selector: 'event.too_long', text: 'Too Long', type: 'number' },
      { selector: 'event.crc', text: 'CRC', type: 'number' },
      { selector: 'event.too_short', text: 'Too Short', type: 'number' },
      // Individual aggregations (TX errors)
      { selector: 'event.late_collisions', text: 'Late Collisions', type: 'number' },
      { selector: 'event.jabber', text: 'Jabber', type: 'number' },
      // Post-aggregations (computed sums)
      { selector: 'event.rx_sum', text: 'RX Sum', type: 'number' },
      { selector: 'event.tx_sum', text: 'TX Sum', type: 'number' },
      { selector: 'event.total', text: 'Total', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `{
  "queryType": "groupBy",
  "dataSource": "NetworkInterfaces",
  "granularity": "all",
  "intervals": ["\${__from:date}/\${__to:date}"],
  "dimensions": [
    "domain_name"
  ],
  "virtualColumns": [
    {
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },
    {
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + ' (' + name + ')')",
      "outputType": "STRING"
    },
    {
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    }
  ],
  "filter": {
    "type": "and",
    "fields": [
      {
        "type": "in",
        "dimension": "intersight.domain.name",
        "values": [\${ChassisName:doublequote}]
      },
      {
        "type": "selector",
        "dimension": "hw.network.port.type",
        "value": "ethernet_port_channel"
      },
      {
        "type": "selector",
        "dimension": "hw.network.port.role",
        "value": "eth_uplink_pc"
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
      "type": "longSum",
      "name": "runt",
      "fieldName": "hw.errors_network_receive_runt"
    },
    {
      "type": "longSum",
      "name": "too_long",
      "fieldName": "hw.errors_network_receive_too_long"
    },
    {
      "type": "longSum",
      "name": "crc",
      "fieldName": "hw.errors_network_receive_crc"
    },
    {
      "type": "longSum",
      "name": "no_buffer",
      "fieldName": "hw.errors_network_receive_no_buffer"
    },
    {
      "type": "longSum",
      "name": "too_short",
      "fieldName": "hw.errors_network_receive_too_short"
    },
    {
      "type": "longSum",
      "name": "rx_discard",
      "fieldName": "hw.errors_network_receive_discard"
    },
    {
      "type": "longSum",
      "name": "deferred",
      "fieldName": "hw.errors_network_transmit_deferred"
    },
    {
      "type": "longSum",
      "name": "late_collisions",
      "fieldName": "hw.errors_network_late_collisions"
    },
    {
      "type": "longSum",
      "name": "carrier_sense",
      "fieldName": "hw.errors_network_carrier_sense"
    },
    {
      "type": "longSum",
      "name": "tx_discard",
      "fieldName": "hw.errors_network_transmit_discard"
    },
    {
      "type": "longSum",
      "name": "jabber",
      "fieldName": "hw.errors_network_transmit_jabber"
    }
  ],
  "postAggregations": [
    {
      "type": "expression",
      "name": "rx_sum",
      "expression": "\\"rx_discard\\" + \\"too_short\\" + \\"no_buffer\\" + \\"crc\\" + \\"too_long\\" + \\"runt\\""
    },
    {
      "type": "expression",
      "name": "tx_sum",
      "expression": "\\"jabber\\" + \\"tx_discard\\" + \\"carrier_sense\\" + \\"late_collisions\\" + \\"deferred\\""
    },
    {
      "type": "expression",
      "name": "total",
      "expression": "\\"tx_sum\\" + \\"rx_sum\\""
    }
  ]
}`,
    },
  } as any;
}

// ============================================================================
// DYNAMIC UPLINKS PORTS SCENE
// ============================================================================

interface DynamicUplinksPortsSceneState extends SceneObjectState {
  body: any;
  drilldownChassis?: string;
  isDrilldown?: boolean;
}

class DynamicUplinksPortsScene extends SceneObjectBase<DynamicUplinksPortsSceneState> {
  public static Component = DynamicUplinksPortsSceneRenderer;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        // Reset drilldown when variable changes
        if (this.state.isDrilldown) {
          this.exitDrilldown();
        }
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicUplinksPortsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  // @ts-ignore
  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
  }

  public drillToChassis(chassisName: string) {
    this.setState({
      drilldownChassis: chassisName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  public exitDrilldown() {
    this.setState({
      drilldownChassis: undefined,
      isDrilldown: false,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    // Priority 1: Drilldown mode
    if (this.state.isDrilldown && this.state.drilldownChassis) {
      const drilldownBody = createDrilldownView(this.state.drilldownChassis, this, 'ports');
      this.setState({ body: drilldownBody });
      return;
    }

    // Priority 2: Get chassis count for conditional rendering
    const chassisCount = getChassisCount(this);

    // Single chassis - show line charts directly (2x2 grid)
    if (chassisCount === 1) {
      const lineChartBody = createLineChartView('ports');
      this.setState({ body: lineChartBody });
      return;
    }

    // Multiple chassis - show summary table with conditional aggregate charts
    const summaryBody = createSummaryView(this, chassisCount, 'ports');
    this.setState({ body: summaryBody });
  }
}

function DynamicUplinksPortsSceneRenderer({ model }: SceneComponentProps<DynamicUplinksPortsScene>) {
  const { body } = model.useState();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// DYNAMIC UPLINKS PORT CHANNELS SCENE
// ============================================================================

interface DynamicUplinksPortChannelsSceneState extends SceneObjectState {
  body: any;
  drilldownChassis?: string;
  isDrilldown?: boolean;
}

class DynamicUplinksPortChannelsScene extends SceneObjectBase<DynamicUplinksPortChannelsSceneState> {
  public static Component = DynamicUplinksPortChannelsSceneRenderer;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        // Reset drilldown when variable changes
        if (this.state.isDrilldown) {
          this.exitDrilldown();
        }
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicUplinksPortChannelsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  // @ts-ignore
  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
  }

  public drillToChassis(chassisName: string) {
    this.setState({
      drilldownChassis: chassisName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  public exitDrilldown() {
    this.setState({
      drilldownChassis: undefined,
      isDrilldown: false,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    // Priority 1: Drilldown mode
    if (this.state.isDrilldown && this.state.drilldownChassis) {
      const drilldownBody = createDrilldownView(this.state.drilldownChassis, this, 'port-channels');
      this.setState({ body: drilldownBody });
      return;
    }

    // Priority 2: Get chassis count for conditional rendering
    const chassisCount = getChassisCount(this);

    // Single chassis - show line charts directly (2x2 grid)
    if (chassisCount === 1) {
      const lineChartBody = createLineChartView('port-channels');
      this.setState({ body: lineChartBody });
      return;
    }

    // Multiple chassis - show summary table with conditional aggregate charts
    const summaryBody = createSummaryView(this, chassisCount, 'port-channels');
    this.setState({ body: summaryBody });
  }
}

function DynamicUplinksPortChannelsSceneRenderer({ model }: SceneComponentProps<DynamicUplinksPortChannelsScene>) {
  const { body } = model.useState();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// DYNAMIC DOWNLINKS SCENE
// ============================================================================

interface DynamicDownlinksSceneState extends SceneObjectState {
  body: any;
  drilldownChassis?: string;
  isDrilldown?: boolean;
}

class DynamicDownlinksScene extends SceneObjectBase<DynamicDownlinksSceneState> {
  public static Component = DynamicDownlinksSceneRenderer;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        // Reset drilldown when variable changes
        if (this.state.isDrilldown) {
          this.exitDrilldown();
        }
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicDownlinksSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  // @ts-ignore
  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
  }

  public drillToChassis(chassisName: string) {
    this.setState({
      drilldownChassis: chassisName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  public exitDrilldown() {
    this.setState({
      drilldownChassis: undefined,
      isDrilldown: false,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    // Priority 1: Drilldown mode
    if (this.state.isDrilldown && this.state.drilldownChassis) {
      const drilldownBody = createDrilldownView(this.state.drilldownChassis, this, 'downlinks');
      this.setState({ body: drilldownBody });
      return;
    }

    // Priority 2: Get chassis count for conditional rendering
    const chassisCount = getChassisCount(this);

    // Single chassis - show line charts directly (2x2 grid)
    if (chassisCount === 1) {
      const lineChartBody = createLineChartView('downlinks');
      this.setState({ body: lineChartBody });
      return;
    }

    // Multiple chassis - show summary table with conditional aggregate charts
    const summaryBody = createSummaryView(this, chassisCount, 'downlinks');
    this.setState({ body: summaryBody });
  }
}

function DynamicDownlinksSceneRenderer({ model }: SceneComponentProps<DynamicDownlinksScene>) {
  const { body } = model.useState();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// VIEW CREATION FUNCTIONS
// ============================================================================

/**
 * Create line chart view for single chassis (2x2 grid)
 * Shows: eCMC-A TX, eCMC-A RX, eCMC-B TX, eCMC-B RX (for Ports, Port Channels, and Downlinks)
 */
function createLineChartView(tabType: 'ports' | 'port-channels' | 'downlinks'): SceneFlexLayout {
  const baseQuery = tabType === 'ports'
    ? createUplinkPortsQuery()
    : tabType === 'port-channels'
    ? createUplinkPortChannelsQuery()
    : createDownlinkPortsQuery();

  // Hostname filter values - use eCMC for ports, port channels, and downlinks
  const hostA = 'eCMC-A';
  const hostB = 'eCMC-B';

  // Panel titles
  const titlePrefix = tabType === 'ports'
    ? 'uplink port'
    : tabType === 'port-channels'
    ? 'uplink port channel'
    : 'downlink port';

  // Single query runner for all panels
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [baseQuery],
  });

  // Determine which error fields to show based on tab type
  const rxErrorFields = tabType === 'ports'
    ? ['too_short', 'crc', 'too_long']
    : ['runt', 'too_long', 'crc', 'no_buffer', 'too_short', 'rx_discard'];

  const txErrorFields = tabType === 'ports'
    ? ['jabber', 'late_collisions']
    : ['deferred', 'late_collisions', 'carrier_sense', 'tx_discard', 'jabber'];

  // Human-readable names for error types
  const errorTypeLabels: Record<string, string> = {
    // RX errors
    'too_short': 'Too Short',
    'crc': 'CRC',
    'too_long': 'Too Long',
    'runt': 'Runt',
    'no_buffer': 'No Buffer',
    'rx_discard': 'RX Discard',
    // TX errors
    'jabber': 'Jabber',
    'late_collisions': 'Late Collisions',
    'deferred': 'Deferred',
    'carrier_sense': 'Carrier Sense',
    'tx_discard': 'TX Discard',
  };

  // A: Transmit errors transformer
  const aTxTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              fieldName: 'Hostname',
              config: {
                id: 'substring',
                options: { value: hostA },
              },
            },
          ],
          type: 'include',
          match: 'all',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Hostname: true,
            TX: true,
            RX: true,
            ...Object.fromEntries(rxErrorFields.map(f => [f, true])),
          },
          includeByName: {},
          indexByName: {},
          renameByName: Object.fromEntries(
            txErrorFields.map(field => [field, errorTypeLabels[field] || field])
          ),
        },
      },
      {
        id: 'prepareTimeSeries',
        options: {
          format: 'multi',
        },
      },
      // Reorder from "error_type PortName" to "PortName - error_type"
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.+?)\\s+(.+)$',
          renamePattern: '$2 - $1',
        },
      },
      // Replace underscores with spaces
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.*)_(.*)$',
          renamePattern: '$1 $2',
        },
      },
      // Capitalize error types - TX errors
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(jabber)$',
          renamePattern: '$1Jabber',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(late collisions)$',
          renamePattern: '$1Late Collisions',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(deferred)$',
          renamePattern: '$1Deferred',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(carrier sense)$',
          renamePattern: '$1Carrier Sense',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(tx discard)$',
          renamePattern: '$1TX Discard',
        },
      },
    ],
  });

  const aTxPanel = PanelBuilders.timeseries()
    .setTitle(`${hostA}: Transmit errors per ${titlePrefix}`)
    .setData(aTxTransformer)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();

  // A: Receive errors transformer
  const aRxTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              fieldName: 'Hostname',
              config: {
                id: 'substring',
                options: { value: hostA },
              },
            },
          ],
          type: 'include',
          match: 'all',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Hostname: true,
            TX: true,
            RX: true,
            ...Object.fromEntries(txErrorFields.map(f => [f, true])),
          },
          includeByName: {},
          indexByName: {},
          renameByName: Object.fromEntries(
            rxErrorFields.map(field => [field, errorTypeLabels[field] || field])
          ),
        },
      },
      {
        id: 'prepareTimeSeries',
        options: {
          format: 'multi',
        },
      },
      // Reorder from "error_type PortName" to "PortName - error_type"
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.+?)\\s+(.+)$',
          renamePattern: '$2 - $1',
        },
      },
      // Replace underscores with spaces
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.*)_(.*)$',
          renamePattern: '$1 $2',
        },
      },
      // Capitalize error types - RX errors
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(too short)$',
          renamePattern: '$1Too Short',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(crc)$',
          renamePattern: '$1CRC',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(too long)$',
          renamePattern: '$1Too Long',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(runt)$',
          renamePattern: '$1Runt',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(no buffer)$',
          renamePattern: '$1No Buffer',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(rx discard)$',
          renamePattern: '$1RX Discard',
        },
      },
    ],
  });

  const aRxPanel = PanelBuilders.timeseries()
    .setTitle(`${hostA}: Receive errors per ${titlePrefix}`)
    .setData(aRxTransformer)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();

  // B: Transmit errors transformer
  const bTxTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              fieldName: 'Hostname',
              config: {
                id: 'substring',
                options: { value: hostB },
              },
            },
          ],
          type: 'include',
          match: 'all',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Hostname: true,
            TX: true,
            RX: true,
            ...Object.fromEntries(rxErrorFields.map(f => [f, true])),
          },
          includeByName: {},
          indexByName: {},
          renameByName: Object.fromEntries(
            txErrorFields.map(field => [field, errorTypeLabels[field] || field])
          ),
        },
      },
      {
        id: 'prepareTimeSeries',
        options: {
          format: 'multi',
        },
      },
      // Reorder from "error_type PortName" to "PortName - error_type"
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.+?)\\s+(.+)$',
          renamePattern: '$2 - $1',
        },
      },
      // Replace underscores with spaces
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.*)_(.*)$',
          renamePattern: '$1 $2',
        },
      },
      // Capitalize error types - TX errors
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(jabber)$',
          renamePattern: '$1Jabber',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(late collisions)$',
          renamePattern: '$1Late Collisions',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(deferred)$',
          renamePattern: '$1Deferred',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(carrier sense)$',
          renamePattern: '$1Carrier Sense',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(tx discard)$',
          renamePattern: '$1TX Discard',
        },
      },
    ],
  });

  const bTxPanel = PanelBuilders.timeseries()
    .setTitle(`${hostB}: Transmit errors per ${titlePrefix}`)
    .setData(bTxTransformer)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();

  // B: Receive errors transformer
  const bRxTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              fieldName: 'Hostname',
              config: {
                id: 'substring',
                options: { value: hostB },
              },
            },
          ],
          type: 'include',
          match: 'all',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Hostname: true,
            TX: true,
            RX: true,
            ...Object.fromEntries(txErrorFields.map(f => [f, true])),
          },
          includeByName: {},
          indexByName: {},
          renameByName: Object.fromEntries(
            rxErrorFields.map(field => [field, errorTypeLabels[field] || field])
          ),
        },
      },
      {
        id: 'prepareTimeSeries',
        options: {
          format: 'multi',
        },
      },
      // Reorder from "error_type PortName" to "PortName - error_type"
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.+?)\\s+(.+)$',
          renamePattern: '$2 - $1',
        },
      },
      // Replace underscores with spaces
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.*)_(.*)$',
          renamePattern: '$1 $2',
        },
      },
      // Capitalize error types - RX errors
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(too short)$',
          renamePattern: '$1Too Short',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(crc)$',
          renamePattern: '$1CRC',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(too long)$',
          renamePattern: '$1Too Long',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(runt)$',
          renamePattern: '$1Runt',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(no buffer)$',
          renamePattern: '$1No Buffer',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(rx discard)$',
          renamePattern: '$1RX Discard',
        },
      },
    ],
  });

  const bRxPanel = PanelBuilders.timeseries()
    .setTitle(`${hostB}: Receive errors per ${titlePrefix}`)
    .setData(bRxTransformer)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();

  // 2x2 grid layout
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: aTxPanel }),
            new SceneFlexItem({ ySizing: 'fill', body: bTxPanel }),
          ],
        }),
      }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: aRxPanel }),
            new SceneFlexItem({ ySizing: 'fill', body: bRxPanel }),
          ],
        }),
      }),
    ],
    $behaviors: [
      new behaviors.CursorSync({ key: 'uplinks-errors', sync: DashboardCursorSync.Tooltip }),
    ],
  });
}

/**
 * Create summary view for multiple chassis
 * Shows table + optional aggregate charts (if chassisCount <= 5)
 */
function createSummaryView(
  scene: DynamicUplinksPortsScene | DynamicUplinksPortChannelsScene | DynamicDownlinksScene,
  chassisCount: number,
  tabType: 'ports' | 'port-channels' | 'downlinks'
): SceneFlexLayout {
  // Table query with "all" granularity
  const tableQuery = tabType === 'ports'
    ? createUplinkPortsTableQuery()
    : tabType === 'port-channels'
    ? createUplinkPortChannelsTableQuery()
    : createDownlinkPortsTableQuery();

  // Time-series query with duration-based granularity
  const timeSeriesQuery = tabType === 'ports'
    ? createUplinkPortsQuery()
    : tabType === 'port-channels'
    ? createUplinkPortChannelsQuery()
    : createDownlinkPortsQuery();

  // Summary table query
  const tableQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [tableQuery],
  });

  const tableTransformer = new LoggingDataTransformer({
    $data: tableQueryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Time: true,
          },
          includeByName: {},
          indexByName: {
            'Chassis': 0,
            'Total': 1,
            'RX Sum': 2,
            'Too Long': 3,
            'CRC': 4,
            'Too Short': 5,
            'TX Sum': 6,
            'Late Collisions': 7,
            'Jabber': 8,
          },
          renameByName: {
            'RX Sum': 'Total RX',
            'TX Sum': 'Total TX',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('Network Errors Summary per Chassis - Click row to drill down')
    .setData(tableTransformer)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOption('sortBy', [{ displayName: 'Total Errors', desc: true }])
    .setCustomFieldConfig('filterable', true)
    .setOverrides((builder) => {
      builder.matchFieldsWithName('Chassis').overrideCustomFieldConfig('width', 240);
    })
    .build();

  const clickableTable = new ClickableTableWrapper({
    tablePanel: tablePanel,
    onRowClick: (chassisName: string) => {
      scene.drillToChassis(chassisName);
    },
  });

  const children: any[] = [
    new SceneFlexItem({
      ySizing: 'fill',
      body: clickableTable,
    }),
  ];

  // Add aggregate line charts if chassisCount <= 5
  if (chassisCount > 0 && chassisCount <= 5) {
    // TX aggregate chart
    const txQueryRunner = new LoggingQueryRunner({
      datasource: { uid: '${Account}' },
      queries: [timeSeriesQuery],
    });

    const txTransformer = new LoggingDataTransformer({
      $data: txQueryRunner,
      transformations: [
        {
          id: 'groupingToMatrix',
          options: {
            columnField: 'Name',
            rowField: 'Time',
            valueField: 'TX',
          },
        },
        {
          id: 'reduce',
          options: {
            reducers: ['sum'],
          },
        },
        {
          id: 'renameByRegex',
          options: {
            regex: 'TX \\((.*?)\\).*',
            renamePattern: '$1',
          },
        },
      ],
    });

    const txPanel = PanelBuilders.timeseries()
      .setTitle('Total TX Errors by Chassis')
      .setData(txTransformer)
      .setCustomFieldConfig('drawStyle', 'line' as any)
      .setCustomFieldConfig('fillOpacity', 0)
      .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
      .build();

    // RX aggregate chart
    const rxQueryRunner = new LoggingQueryRunner({
      datasource: { uid: '${Account}' },
      queries: [timeSeriesQuery],
    });

    const rxTransformer = new LoggingDataTransformer({
      $data: rxQueryRunner,
      transformations: [
        {
          id: 'groupingToMatrix',
          options: {
            columnField: 'Name',
            rowField: 'Time',
            valueField: 'RX',
          },
        },
        {
          id: 'reduce',
          options: {
            reducers: ['sum'],
          },
        },
        {
          id: 'renameByRegex',
          options: {
            regex: 'RX \\((.*?)\\).*',
            renamePattern: '$1',
          },
        },
      ],
    });

    const rxPanel = PanelBuilders.timeseries()
      .setTitle('Total RX Errors by Chassis')
      .setData(rxTransformer)
      .setCustomFieldConfig('drawStyle', 'line' as any)
      .setCustomFieldConfig('fillOpacity', 0)
      .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
      .build();

    // Add aggregate charts in a row
    children.push(
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: txPanel }),
            new SceneFlexItem({ ySizing: 'fill', body: rxPanel }),
          ],
          $behaviors: [
            new behaviors.CursorSync({ key: 'uplinks-aggregate', sync: DashboardCursorSync.Tooltip }),
          ],
        }),
      })
    );
  }

  return new SceneFlexLayout({
    direction: 'column',
    children: children,
  });
}

/**
 * Create drilldown view with back button + line charts
 */
function createDrilldownView(
  chassisName: string,
  scene: DynamicUplinksPortsScene | DynamicUplinksPortChannelsScene | DynamicDownlinksScene,
  tabType: 'ports' | 'port-channels' | 'downlinks'
): SceneFlexLayout {
  const drilldownHeader = new DrilldownHeaderControl({
    chassisName: chassisName,
    onBack: () => scene.exitDrilldown(),
  });

  const baseQuery = tabType === 'ports'
    ? createUplinkPortsQuery()
    : tabType === 'port-channels'
    ? createUplinkPortChannelsQuery()
    : createDownlinkPortsQuery();
  const drilldownQuery = createDrilldownQuery(baseQuery, chassisName);

  // Hostname filter values - use eCMC for ports, port channels, and downlinks
  const hostA = 'eCMC-A';
  const hostB = 'eCMC-B';

  // Panel titles
  const titlePrefix = tabType === 'ports'
    ? 'uplink port'
    : tabType === 'port-channels'
    ? 'uplink port channel'
    : 'downlink port';

  // Single query runner for all panels
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQuery],
  });

  // Determine which error fields to show based on tab type
  const rxErrorFields = tabType === 'ports'
    ? ['too_short', 'crc', 'too_long']
    : ['runt', 'too_long', 'crc', 'no_buffer', 'too_short', 'rx_discard'];

  const txErrorFields = tabType === 'ports'
    ? ['jabber', 'late_collisions']
    : ['deferred', 'late_collisions', 'carrier_sense', 'tx_discard', 'jabber'];

  // Human-readable names for error types
  const errorTypeLabels: Record<string, string> = {
    // RX errors
    'too_short': 'Too Short',
    'crc': 'CRC',
    'too_long': 'Too Long',
    'runt': 'Runt',
    'no_buffer': 'No Buffer',
    'rx_discard': 'RX Discard',
    // TX errors
    'jabber': 'Jabber',
    'late_collisions': 'Late Collisions',
    'deferred': 'Deferred',
    'carrier_sense': 'Carrier Sense',
    'tx_discard': 'TX Discard',
  };

  // A: Transmit errors transformer
  const aTxTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              fieldName: 'Hostname',
              config: {
                id: 'substring',
                options: { value: hostA },
              },
            },
          ],
          type: 'include',
          match: 'all',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Hostname: true,
            TX: true,
            RX: true,
            ...Object.fromEntries(rxErrorFields.map(f => [f, true])),
          },
          includeByName: {},
          indexByName: {},
          renameByName: Object.fromEntries(
            txErrorFields.map(field => [field, errorTypeLabels[field] || field])
          ),
        },
      },
      {
        id: 'prepareTimeSeries',
        options: {
          format: 'multi',
        },
      },
      // Reorder from "error_type PortName" to "PortName - error_type"
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.+?)\\s+(.+)$',
          renamePattern: '$2 - $1',
        },
      },
      // Replace underscores with spaces
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.*)_(.*)$',
          renamePattern: '$1 $2',
        },
      },
      // Capitalize error types - TX errors
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(jabber)$',
          renamePattern: '$1Jabber',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(late collisions)$',
          renamePattern: '$1Late Collisions',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(deferred)$',
          renamePattern: '$1Deferred',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(carrier sense)$',
          renamePattern: '$1Carrier Sense',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(tx discard)$',
          renamePattern: '$1TX Discard',
        },
      },
    ],
  });

  const aTxPanel = PanelBuilders.timeseries()
    .setTitle(`${hostA}: Transmit errors - ${chassisName}`)
    .setData(aTxTransformer)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();

  // A: Receive errors transformer
  const aRxTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              fieldName: 'Hostname',
              config: {
                id: 'substring',
                options: { value: hostA },
              },
            },
          ],
          type: 'include',
          match: 'all',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Hostname: true,
            TX: true,
            RX: true,
            ...Object.fromEntries(txErrorFields.map(f => [f, true])),
          },
          includeByName: {},
          indexByName: {},
          renameByName: Object.fromEntries(
            rxErrorFields.map(field => [field, errorTypeLabels[field] || field])
          ),
        },
      },
      {
        id: 'prepareTimeSeries',
        options: {
          format: 'multi',
        },
      },
      // Reorder from "error_type PortName" to "PortName - error_type"
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.+?)\\s+(.+)$',
          renamePattern: '$2 - $1',
        },
      },
      // Replace underscores with spaces
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.*)_(.*)$',
          renamePattern: '$1 $2',
        },
      },
      // Capitalize error types - RX errors
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(too short)$',
          renamePattern: '$1Too Short',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(crc)$',
          renamePattern: '$1CRC',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(too long)$',
          renamePattern: '$1Too Long',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(runt)$',
          renamePattern: '$1Runt',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(no buffer)$',
          renamePattern: '$1No Buffer',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(rx discard)$',
          renamePattern: '$1RX Discard',
        },
      },
    ],
  });

  const aRxPanel = PanelBuilders.timeseries()
    .setTitle(`${hostA}: Receive errors - ${chassisName}`)
    .setData(aRxTransformer)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();

  // B: Transmit errors transformer
  const bTxTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              fieldName: 'Hostname',
              config: {
                id: 'substring',
                options: { value: hostB },
              },
            },
          ],
          type: 'include',
          match: 'all',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Hostname: true,
            TX: true,
            RX: true,
            ...Object.fromEntries(rxErrorFields.map(f => [f, true])),
          },
          includeByName: {},
          indexByName: {},
          renameByName: Object.fromEntries(
            txErrorFields.map(field => [field, errorTypeLabels[field] || field])
          ),
        },
      },
      {
        id: 'prepareTimeSeries',
        options: {
          format: 'multi',
        },
      },
      // Reorder from "error_type PortName" to "PortName - error_type"
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.+?)\\s+(.+)$',
          renamePattern: '$2 - $1',
        },
      },
      // Replace underscores with spaces
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.*)_(.*)$',
          renamePattern: '$1 $2',
        },
      },
      // Capitalize error types - TX errors
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(jabber)$',
          renamePattern: '$1Jabber',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(late collisions)$',
          renamePattern: '$1Late Collisions',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(deferred)$',
          renamePattern: '$1Deferred',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(carrier sense)$',
          renamePattern: '$1Carrier Sense',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(tx discard)$',
          renamePattern: '$1TX Discard',
        },
      },
    ],
  });

  const bTxPanel = PanelBuilders.timeseries()
    .setTitle(`${hostB}: Transmit errors - ${chassisName}`)
    .setData(bTxTransformer)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();

  // B: Receive errors transformer
  const bRxTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              fieldName: 'Hostname',
              config: {
                id: 'substring',
                options: { value: hostB },
              },
            },
          ],
          type: 'include',
          match: 'all',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Hostname: true,
            TX: true,
            RX: true,
            ...Object.fromEntries(txErrorFields.map(f => [f, true])),
          },
          includeByName: {},
          indexByName: {},
          renameByName: Object.fromEntries(
            rxErrorFields.map(field => [field, errorTypeLabels[field] || field])
          ),
        },
      },
      {
        id: 'prepareTimeSeries',
        options: {
          format: 'multi',
        },
      },
      // Reorder from "error_type PortName" to "PortName - error_type"
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.+?)\\s+(.+)$',
          renamePattern: '$2 - $1',
        },
      },
      // Replace underscores with spaces
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.*)_(.*)$',
          renamePattern: '$1 $2',
        },
      },
      // Capitalize error types - RX errors
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(too short)$',
          renamePattern: '$1Too Short',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(crc)$',
          renamePattern: '$1CRC',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(too long)$',
          renamePattern: '$1Too Long',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(runt)$',
          renamePattern: '$1Runt',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(no buffer)$',
          renamePattern: '$1No Buffer',
        },
      },
      {
        id: 'renameByRegex',
        options: {
          regex: '^(.* - )(rx discard)$',
          renamePattern: '$1RX Discard',
        },
      },
    ],
  });

  const bRxPanel = PanelBuilders.timeseries()
    .setTitle(`${hostB}: Receive errors - ${chassisName}`)
    .setData(bRxTransformer)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 50, body: drilldownHeader }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'column',
          children: [
            new SceneFlexItem({
              ySizing: 'fill',
              body: new SceneFlexLayout({
                direction: 'row',
                children: [
                  new SceneFlexItem({ ySizing: 'fill', body: aTxPanel }),
                  new SceneFlexItem({ ySizing: 'fill', body: bTxPanel }),
                ],
              }),
            }),
            new SceneFlexItem({
              ySizing: 'fill',
              body: new SceneFlexLayout({
                direction: 'row',
                children: [
                  new SceneFlexItem({ ySizing: 'fill', body: aRxPanel }),
                  new SceneFlexItem({ ySizing: 'fill', body: bRxPanel }),
                ],
              }),
            }),
          ],
          $behaviors: [
            new behaviors.CursorSync({ key: 'uplinks-drilldown', sync: DashboardCursorSync.Tooltip }),
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// MAIN TAB EXPORT
// ============================================================================

export function getNetworkErrorsTab() {
  const uplinksRow = createUplinksRow();
  const downlinksRow = createDownlinksRow();
  const errorDescriptionsRow = createErrorDescriptionsRow();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 700,
        body: new SceneGridLayout({
          children: [uplinksRow, downlinksRow, errorDescriptionsRow],
        }),
      }),
    ],
  });
}

function createUplinksRow() {
  const uplinksPortsScene = new DynamicUplinksPortsScene({});
  const uplinksPortChannelsScene = new DynamicUplinksPortChannelsScene({});

  const uplinksNestedTabs = new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => uplinksPortsScene },
      { id: 'port-channels', label: 'Port Channels', getBody: () => uplinksPortChannelsScene },
    ],
    activeTab: 'ports',
    body: uplinksPortsScene,
  });

  return new SceneGridRow({
    title: 'eCMC Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        body: uplinksNestedTabs,
      }),
    ],
  });
}

function createDownlinksRow() {
  const downlinksScene = new DynamicDownlinksScene({});

  return new SceneGridRow({
    title: 'eCMC Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 16,
    children: [
      new SceneGridItem({
        x: 0,
        y: 16,
        width: 24,
        height: 16,
        body: downlinksScene,
      }),
    ],
  });
}

function createErrorDescriptionsRow() {
  // Error Descriptions table with inline static data
  const errorDescriptionsQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'inline',
        parser: 'backend',
        format: 'table',
        data: `[
{"Error": "Total", "Direction": "both", "CLI value": "-", "Description": "Sum of all errors recorded in Intersight", "Resolution": "Look at detailed errors"},
{"Error": "Total RX", "Direction": "RX", "CLI value": "input error", "Description": "Sum of RX errors (CLI value does not contain all errors)", "Resolution": "Look at detailed error counts"},
{"Error": "Runt", "Direction": "RX", "CLI value": "runt", "Description": "Packets smaller than the minimum required size of 64 bytes with a bad CRC check", "Resolution": "This is likely caused by a problem with network equipment"},
{"Error": "Too Long", "Direction": "RX", "CLI value": "giant", "Description": "Packet length that is greater than the configured MTU on the interface", "Resolution": "Check and adjust the MTU settings of hosts and network devices"},
{"Error": "CRC", "Direction": "RX", "CLI value": "CRC", "Description": "Packets that have failed the CRC check, thus there has likely been data corruption during transmission", "Resolution": "Investigate the transmission equipment, as well as potential  interferences"},
{"Error": "No Buffer", "Direction": "RX", "CLI value": "no buffer", "Description": "Received packets that were dropped due to unavailability of the buffer on the interface.", "Resolution": "This is often caused by broadcast storms, as well as any other kind of high throughput situation."},
{"Error": "Too Short", "Direction": "RX", "CLI value": "short frame", "Description": "Indicates a good packet smaller than the minimum required size of 64 bytes", "Resolution": "This is likely caused by a problem with network equipment"},
{"Error": "RX Discard", "Direction": "RX", "CLI value": "input discard", "Description": "Packets dropped in the input queue due to congestion. This number includes drops due to tail drop and weighted random early detection (WRED).", "Resolution": "Figure out and address congestion issues"},
{"Error": "Total TX", "Direction": "TX", "CLI value": "output error", "Description": "Sum of TX errors (CLI value does not contain all errors)", "Resolution": "Look at detailed error counts"},
{"Error": "Deferred", "Direction": "TX", "CLI value": "deferred", "Description": "Packets that have been temporarily postponed or delayed from immediate transmission by the network interface", "Resolution": "This is usually caused by network congestion, or problems with the physical network"},
{"Error": "Late Collision", "Direction": "TX", "CLI value": "late collision", "Description": "A late collision happens when a collision occurs after transmitting the first 64 bytes", "Resolution": "This is almost always due to a problem with the physical network, usually twisted pair cables with a length of over 100 meters"},
{"Error": "Carrier Sense", "Direction": "TX", "CLI value": "lost carrier + no carrier", "Description": "Occurs when a network device fails to correctly detect the presence or absence of a carrier signal to determine whether the network medium is free for transmission / Occurs when no carrier signal can be detected", "Resolution": "This usually happens due to problems with the physical network, including excessive cable length, interference, or hardware issues / This can happen due to hardware problems or misconfiguration"},
{"Error": "TX Discard", "Direction": "TX", "CLI value": "output discard + underrun", "Description": "Packets dropped in the output queue due to congestion. This number includes drops due to tail drop and weighted random early detection (WRED). / Occurs when the buffer cannot provide data to the interface fast enough", "Resolution": "Figure out and address congestion issues / This is likely caused by a hardware limitation, you might need to upgrade or limit traffic"},
{"Error": "Jabber", "Direction": "TX", "CLI value": "jabber", "Description": "Indicates a packet length that is greater than the configured MTU on the interface", "Resolution": "Check and adjust the MTU settings of hosts and network devices"}
]`,
        root_selector: '',
        url: '',
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const errorDescriptionsTransformer = new LoggingDataTransformer({
    $data: errorDescriptionsQueryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {},
          indexByName: {
            'CLI value': 1,
            'Description': 3,
            'Direction': 2,
            'Error': 0,
            'Resolution': 4,
          },
          renameByName: {},
        },
      },
    ],
  });

  const errorDescriptionsPanel = PanelBuilders.table()
    .setTitle('')
    .setData(errorDescriptionsTransformer)
    .setOption('cellHeight', 'sm' as any)
    .setOption('showHeader', true)
    .setOverrides((builder) => {
      // Wrap text for all cells
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('filterable', false)
        .overrideCustomFieldConfig('wrapText', true);

      // Error column width
      builder.matchFieldsWithName('Error')
        .overrideCustomFieldConfig('width', 140);

      // Direction column width and center alignment
      builder.matchFieldsWithName('Direction')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center');

      // CLI value column width
      builder.matchFieldsWithName('CLI value')
        .overrideCustomFieldConfig('width', 200);
    })
    .build();

  return new SceneGridRow({
    title: 'Error Descriptions',
    isCollapsible: true,
    isCollapsed: false,
    y: 22,
    children: [
      new SceneGridItem({
        x: 0,
        y: 22,
        width: 24,
        height: 16,
        body: errorDescriptionsPanel,
      }),
    ],
  });
}

