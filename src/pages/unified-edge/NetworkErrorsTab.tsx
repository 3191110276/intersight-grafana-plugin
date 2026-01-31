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
import { DrilldownHeaderControl } from '../../components/DrilldownHeaderControl';
import { ClickableTableWrapper } from '../../components/ClickableTableWrapper';
import { SharedDrilldownState, findSharedDrilldownState } from '../../utils/drilldownState';
import { getChassisCount, createDrilldownQuery } from '../../utils/drilldownHelpers';
import { DrilldownDetailsContainer, DrilldownDetailsContainerState, DrilldownDetailsContainerRenderer } from '../../utils/DrilldownDetailsContainer';
import { createTimeseriesQuery } from '../../utils/infinityQueryHelpers';
import { createDomainNameVirtualColumn, createHostNameVirtualColumn } from '../../utils/virtualColumnHelpers';
import { NETWORK_ERROR_LABELS } from '../../utils/constants';
import { API_ENDPOINTS, COLUMN_WIDTHS } from './constants';

// ============================================================================
// SHARED DRILLDOWN STATE
// ============================================================================

// Using shared drilldown state from utils/drilldownState.ts

// ============================================================================
// NETWORK ERROR QUERY CONFIGURATION
// ============================================================================

/**
 * Configuration for network error aggregations
 */
interface NetworkErrorAggregation {
  name: string;
  fieldName: string;
}

/**
 * Column definition for network error queries
 */
interface NetworkErrorColumn {
  selector: string;
  text: string;
  type: 'string' | 'number' | 'timestamp';
}

/**
 * Configuration for a network error port type (downlinks, uplinks, port channels)
 */
interface NetworkErrorConfig {
  portType: string;
  portRole: string;
  aggregations: NetworkErrorAggregation[];
  rxSumExpression: string;
  txSumExpression: string;
  timeseriesDetailColumns: NetworkErrorColumn[];
  tableDetailColumns: NetworkErrorColumn[];
}

// Downlink ports configuration (backplane_port + host_port)
const DOWNLINK_CONFIG: NetworkErrorConfig = {
  portType: 'backplane_port',
  portRole: 'host_port',
  aggregations: [
    { name: 'too_long', fieldName: 'hw.errors_network_receive_too_long' },
    { name: 'crc', fieldName: 'hw.errors_network_receive_crc' },
    { name: 'too_short', fieldName: 'hw.errors_network_receive_too_short' },
    { name: 'late_collisions', fieldName: 'hw.errors_network_late_collisions' },
    { name: 'jabber', fieldName: 'hw.errors_network_transmit_jabber' },
  ],
  rxSumExpression: '"too_short" + "crc" + "too_long"',
  txSumExpression: '"jabber" + "late_collisions"',
  timeseriesDetailColumns: [
    { selector: 'event.too_short', text: 'too_short', type: 'number' },
    { selector: 'event.crc', text: 'crc', type: 'number' },
    { selector: 'event.too_long', text: 'too_long', type: 'number' },
    { selector: 'event.jabber', text: 'jabber', type: 'number' },
    { selector: 'event.late_collisions', text: 'late_collisions', type: 'number' },
  ],
  tableDetailColumns: [
    { selector: 'event.too_long', text: 'Too Long', type: 'number' },
    { selector: 'event.crc', text: 'CRC', type: 'number' },
    { selector: 'event.too_short', text: 'Too Short', type: 'number' },
    { selector: 'event.late_collisions', text: 'Late Collisions', type: 'number' },
    { selector: 'event.jabber', text: 'Jabber', type: 'number' },
  ],
};

// Uplink ports configuration (ethernet + eth_uplink)
const UPLINK_PORTS_CONFIG: NetworkErrorConfig = {
  portType: 'ethernet',
  portRole: 'eth_uplink',
  aggregations: [
    { name: 'runt', fieldName: 'hw.errors_network_receive_runt' },
    { name: 'too_long', fieldName: 'hw.errors_network_receive_too_long' },
    { name: 'crc', fieldName: 'hw.errors_network_receive_crc' },
    { name: 'no_buffer', fieldName: 'hw.errors_network_receive_no_buffer' },
    { name: 'too_short', fieldName: 'hw.errors_network_receive_too_short' },
    { name: 'rx_discard', fieldName: 'hw.errors_network_receive_discard' },
    { name: 'deferred', fieldName: 'hw.errors_network_transmit_deferred' },
    { name: 'late_collisions', fieldName: 'hw.errors_network_late_collisions' },
    { name: 'carrier_sense', fieldName: 'hw.errors_network_carrier_sense' },
    { name: 'tx_discard', fieldName: 'hw.errors_network_transmit_discard' },
    { name: 'jabber', fieldName: 'hw.errors_network_transmit_jabber' },
  ],
  rxSumExpression: '"too_short" + "crc" + "too_long"',
  txSumExpression: '"jabber" + "late_collisions"',
  timeseriesDetailColumns: [
    { selector: 'event.too_short', text: 'too_short', type: 'number' },
    { selector: 'event.crc', text: 'crc', type: 'number' },
    { selector: 'event.too_long', text: 'too_long', type: 'number' },
    { selector: 'event.jabber', text: 'jabber', type: 'number' },
    { selector: 'event.late_collisions', text: 'late_collisions', type: 'number' },
  ],
  tableDetailColumns: [
    { selector: 'event.too_long', text: 'Too Long', type: 'number' },
    { selector: 'event.crc', text: 'CRC', type: 'number' },
    { selector: 'event.too_short', text: 'Too Short', type: 'number' },
    { selector: 'event.late_collisions', text: 'Late Collisions', type: 'number' },
    { selector: 'event.jabber', text: 'Jabber', type: 'number' },
  ],
};

// Uplink port channels configuration (ethernet_port_channel + eth_uplink_pc)
const UPLINK_PORT_CHANNELS_CONFIG: NetworkErrorConfig = {
  portType: 'ethernet_port_channel',
  portRole: 'eth_uplink_pc',
  aggregations: [
    { name: 'runt', fieldName: 'hw.errors_network_receive_runt' },
    { name: 'too_long', fieldName: 'hw.errors_network_receive_too_long' },
    { name: 'crc', fieldName: 'hw.errors_network_receive_crc' },
    { name: 'no_buffer', fieldName: 'hw.errors_network_receive_no_buffer' },
    { name: 'too_short', fieldName: 'hw.errors_network_receive_too_short' },
    { name: 'rx_discard', fieldName: 'hw.errors_network_receive_discard' },
    { name: 'deferred', fieldName: 'hw.errors_network_transmit_deferred' },
    { name: 'late_collisions', fieldName: 'hw.errors_network_late_collisions' },
    { name: 'carrier_sense', fieldName: 'hw.errors_network_carrier_sense' },
    { name: 'tx_discard', fieldName: 'hw.errors_network_transmit_discard' },
    { name: 'jabber', fieldName: 'hw.errors_network_transmit_jabber' },
  ],
  rxSumExpression: '"rx_discard" + "too_short" + "no_buffer" + "crc" + "too_long" + "runt"',
  txSumExpression: '"jabber" + "tx_discard" + "carrier_sense" + "late_collisions" + "deferred"',
  timeseriesDetailColumns: [
    { selector: 'event.runt', text: 'runt', type: 'number' },
    { selector: 'event.too_long', text: 'too_long', type: 'number' },
    { selector: 'event.crc', text: 'crc', type: 'number' },
    { selector: 'event.no_buffer', text: 'no_buffer', type: 'number' },
    { selector: 'event.too_short', text: 'too_short', type: 'number' },
    { selector: 'event.rx_discard', text: 'rx_discard', type: 'number' },
    { selector: 'event.deferred', text: 'deferred', type: 'number' },
    { selector: 'event.late_collisions', text: 'late_collisions', type: 'number' },
    { selector: 'event.carrier_sense', text: 'carrier_sense', type: 'number' },
    { selector: 'event.tx_discard', text: 'tx_discard', type: 'number' },
    { selector: 'event.jabber', text: 'jabber', type: 'number' },
  ],
  tableDetailColumns: [
    { selector: 'event.too_long', text: 'Too Long', type: 'number' },
    { selector: 'event.crc', text: 'CRC', type: 'number' },
    { selector: 'event.too_short', text: 'Too Short', type: 'number' },
    { selector: 'event.late_collisions', text: 'Late Collisions', type: 'number' },
    { selector: 'event.jabber', text: 'Jabber', type: 'number' },
  ],
};

// ============================================================================
// NETWORK ERROR QUERY FACTORY
// ============================================================================

/**
 * Creates a timeseries network error query based on the provided configuration
 * @param config Network error configuration (downlink, uplink ports, or uplink port channels)
 * @returns Timeseries query object
 */
function createNetworkErrorTimeseriesQuery(config: NetworkErrorConfig) {
  return createTimeseriesQuery({
    refId: 'A',
    format: 'table',
    dataSource: 'NetworkInterfaces',
    dimensions: ['name', 'host_name'],
    virtualColumns: [
      createHostNameVirtualColumn(),
    ],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: ['${ChassisName:doublequote}'],
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: config.portType,
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: config.portRole,
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: config.aggregations.map(agg => ({
      type: 'longSum',
      name: agg.name,
      fieldName: agg.fieldName,
    })),
    postAggregations: [
      {
        type: 'expression',
        name: 'rx_sum',
        expression: config.rxSumExpression,
      },
      {
        type: 'expression',
        name: 'tx_sum',
        expression: config.txSumExpression,
      },
      {
        type: 'expression',
        name: 'total',
        expression: '"tx_sum" + "rx_sum"',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.name', text: 'PortName', type: 'string' },
      { selector: 'event.host_name', text: 'Hostname', type: 'string' },
      ...config.timeseriesDetailColumns,
      { selector: 'event.tx_sum', text: 'TX', type: 'number' },
      { selector: 'event.rx_sum', text: 'RX', type: 'number' },
    ],
  });
}

/**
 * Creates a table (aggregate) network error query based on the provided configuration
 * @param config Network error configuration (downlink, uplink ports, or uplink port channels)
 * @returns Table query object with granularity set to 'all'
 */
function createNetworkErrorTableQuery(config: NetworkErrorConfig) {
  return createTimeseriesQuery({
    refId: 'A',
    format: 'table',
    granularity: { type: 'all' },
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [
      createDomainNameVirtualColumn(),
      {
        type: 'expression',
        name: 'Identifier',
        expression: "concat(domain_name + ' (' + name + ')')",
      },
      createHostNameVirtualColumn(),
    ],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: ['${ChassisName:doublequote}'],
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: config.portType,
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: config.portRole,
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: config.aggregations.map(agg => ({
      type: 'longSum',
      name: agg.name,
      fieldName: agg.fieldName,
    })),
    postAggregations: [
      {
        type: 'expression',
        name: 'rx_sum',
        expression: config.rxSumExpression,
      },
      {
        type: 'expression',
        name: 'tx_sum',
        expression: config.txSumExpression,
      },
      {
        type: 'expression',
        name: 'total',
        expression: '"tx_sum" + "rx_sum"',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
      ...config.tableDetailColumns,
      { selector: 'event.rx_sum', text: 'RX Sum', type: 'number' },
      { selector: 'event.tx_sum', text: 'TX Sum', type: 'number' },
      { selector: 'event.total', text: 'Total', type: 'number' },
    ],
  });
}

// ============================================================================
// BASE QUERIES - PUBLIC API (maintained for backward compatibility)
// ============================================================================

/**
 * Base query for downlink port network errors (backplane_port + host_port)
 */
function createDownlinkPortsQuery() {
  return createNetworkErrorTimeseriesQuery(DOWNLINK_CONFIG);
}

/**
 * Table-specific query for downlink port network errors
 */
function createDownlinkPortsTableQuery() {
  return createNetworkErrorTableQuery(DOWNLINK_CONFIG);
}

/**
 * Base query for uplink port network errors (ethernet + eth_uplink)
 */
function createUplinkPortsQuery() {
  return createNetworkErrorTimeseriesQuery(UPLINK_PORTS_CONFIG);
}

/**
 * Table-specific query for uplink port network errors
 */
function createUplinkPortsTableQuery() {
  return createNetworkErrorTableQuery(UPLINK_PORTS_CONFIG);
}

/**
 * Base query for uplink port channel network errors (ethernet_port_channel + eth_uplink_pc)
 */
function createUplinkPortChannelsQuery() {
  return createNetworkErrorTimeseriesQuery(UPLINK_PORT_CHANNELS_CONFIG);
}

/**
 * Table-specific query for uplink port channel network errors
 */
function createUplinkPortChannelsTableQuery() {
  return createNetworkErrorTableQuery(UPLINK_PORT_CHANNELS_CONFIG);
}

// ============================================================================
// PANEL CREATION HELPERS
// ============================================================================

/**
 * Creates a network error timeseries panel with standard configuration
 * Shared configuration: line chart with no fill, multi-series tooltip
 */
function createNetworkErrorTimeseriesPanel(title: string, data: any) {
  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(data)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setOption('tooltip', { mode: 'multi' as any, sort: 'desc' as any })
    .build();
}

// ============================================================================
// NETWORK ERRORS DETAILS CONTAINER
// ============================================================================

interface NetworkErrorsDetailsContainerState extends DrilldownDetailsContainerState {
  sectionType: 'ports' | 'port-channels' | 'downlinks';
}

/**
 * Container scene that manages conditional rendering and drilldown for network errors details
 */
class NetworkErrorsDetailsContainer extends DrilldownDetailsContainer<NetworkErrorsDetailsContainerState> {
  public static Component = DrilldownDetailsContainerRenderer;

  public constructor(state: NetworkErrorsDetailsContainerState) {
    super(state, {
      multiViewThreshold: 1,
      emptyStateTitle: 'Network Errors',
      emptyStateMessage: '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.',
    });
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================

  protected createDrilldownView(target: string): any {
    const { sectionType } = this.state;
    return createDrilldownView(target, this, sectionType);
  }

  protected createSingleView(count: number): any {
    const { sectionType } = this.state;
    return createLineChartView(sectionType);
  }

  protected createMultiView(count: number): any {
    const { sectionType } = this.state;
    return createSummaryView(this, count, sectionType);
  }

  protected createEmptyState(): any {
    const emptyStatePanel = PanelBuilders.text()
      .setTitle('Network Errors')
      .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.')
      .setOption('mode', 'markdown' as any)
      .setDisplayMode('transparent')
      .build();

    return new SceneFlexLayout({
      children: [
        new SceneFlexItem({ ySizing: 'fill', body: emptyStatePanel })
      ]
    });
  }
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

  // A: Transmit errors transformer
  const aTxTransformer = new LoggingDataTransformer({
    $data: queryRunner.clone(),
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
            txErrorFields.map(field => [field, NETWORK_ERROR_LABELS[field] || field])
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

  const aTxPanel = createNetworkErrorTimeseriesPanel(`${hostA}: Transmit errors per ${titlePrefix}`, aTxTransformer);

  // A: Receive errors transformer
  const aRxTransformer = new LoggingDataTransformer({
    $data: queryRunner.clone(),
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
            rxErrorFields.map(field => [field, NETWORK_ERROR_LABELS[field] || field])
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

  const aRxPanel = createNetworkErrorTimeseriesPanel(`${hostA}: Receive errors per ${titlePrefix}`, aRxTransformer);

  // B: Transmit errors transformer
  const bTxTransformer = new LoggingDataTransformer({
    $data: queryRunner.clone(),
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
            txErrorFields.map(field => [field, NETWORK_ERROR_LABELS[field] || field])
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

  const bTxPanel = createNetworkErrorTimeseriesPanel(`${hostB}: Transmit errors per ${titlePrefix}`, bTxTransformer);

  // B: Receive errors transformer
  const bRxTransformer = new LoggingDataTransformer({
    $data: queryRunner.clone(),
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
            rxErrorFields.map(field => [field, NETWORK_ERROR_LABELS[field] || field])
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

  const bRxPanel = createNetworkErrorTimeseriesPanel(`${hostB}: Receive errors per ${titlePrefix}`, bRxTransformer);

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
  scene: NetworkErrorsDetailsContainer,
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
    .setOption('sortBy', [{ displayName: 'Total', desc: true }])
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

    const txPanel = createNetworkErrorTimeseriesPanel('Total TX Errors by Chassis', txTransformer);

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

    const rxPanel = createNetworkErrorTimeseriesPanel('Total RX Errors by Chassis', rxTransformer);

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
  scene: NetworkErrorsDetailsContainer,
  tabType: 'ports' | 'port-channels' | 'downlinks'
): SceneFlexLayout {
  const drilldownHeader = new DrilldownHeaderControl({
    itemName: chassisName,
    itemLabel: 'Chassis',
    backButtonText: 'Back to Overview',
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

  // A: Transmit errors transformer
  const aTxTransformer = new LoggingDataTransformer({
    $data: queryRunner.clone(),
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
            txErrorFields.map(field => [field, NETWORK_ERROR_LABELS[field] || field])
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

  const aTxPanel = createNetworkErrorTimeseriesPanel(`${hostA}: Transmit errors - ${chassisName}`, aTxTransformer);

  // A: Receive errors transformer
  const aRxTransformer = new LoggingDataTransformer({
    $data: queryRunner.clone(),
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
            rxErrorFields.map(field => [field, NETWORK_ERROR_LABELS[field] || field])
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

  const aRxPanel = createNetworkErrorTimeseriesPanel(`${hostA}: Receive errors - ${chassisName}`, aRxTransformer);

  // B: Transmit errors transformer
  const bTxTransformer = new LoggingDataTransformer({
    $data: queryRunner.clone(),
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
            txErrorFields.map(field => [field, NETWORK_ERROR_LABELS[field] || field])
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

  const bTxPanel = createNetworkErrorTimeseriesPanel(`${hostB}: Transmit errors - ${chassisName}`, bTxTransformer);

  // B: Receive errors transformer
  const bRxTransformer = new LoggingDataTransformer({
    $data: queryRunner.clone(),
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
            rxErrorFields.map(field => [field, NETWORK_ERROR_LABELS[field] || field])
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

  const bRxPanel = createNetworkErrorTimeseriesPanel(`${hostB}: Receive errors - ${chassisName}`, bRxTransformer);

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
  // Create shared drilldown state
  const sharedDrilldownState = new SharedDrilldownState({
    variableName: 'ChassisName',
    initialMode: 'overview',
  });

  const uplinksRow = createUplinksRow();
  const downlinksRow = createDownlinksRow();
  const errorDescriptionsRow = createErrorDescriptionsRow();

  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [sharedDrilldownState],
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
  const uplinksPortsContainer = new NetworkErrorsDetailsContainer({ sectionType: 'ports', body: new SceneFlexLayout({ children: [] }) });
  const uplinksPortChannelsContainer = new NetworkErrorsDetailsContainer({ sectionType: 'port-channels', body: new SceneFlexLayout({ children: [] }) });

  const uplinksNestedTabs = new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => uplinksPortsContainer },
      { id: 'port-channels', label: 'Port Channels', getBody: () => uplinksPortChannelsContainer },
    ],
    activeTab: 'ports',
    body: uplinksPortsContainer,
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
  const downlinksContainer = new NetworkErrorsDetailsContainer({ sectionType: 'downlinks', body: new SceneFlexLayout({ children: [] }) });

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
        body: downlinksContainer,
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

