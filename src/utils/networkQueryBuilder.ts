/**
 * Shared utility for building network interface queries across multiple tabs.
 * Reduces duplication in NetworkUtilizationTab, NetworkErrorsTab, and TrafficBalanceTab.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type GranularityType = 'duration' | 'all';

export interface VirtualColumn {
  type: string;
  columnName: string;
  outputName: string;
  expectedType: string;
  path: string;
}

export interface FilterField {
  type: 'selector' | 'in' | 'search' | 'and' | 'or';
  dimension?: string;
  value?: string;
  values?: string[];
  query?: {
    type: string;
    value: string;
  };
  fields?: FilterField[];
}

export interface Aggregation {
  type: string;
  name: string;
  fieldName?: string;
}

export interface PostAggregation {
  type: string;
  name: string;
  expression?: string;
  fieldName?: string;
}

export interface OutputColumn {
  selector: string;
  text: string;
  type: 'timestamp' | 'string' | 'number';
}

// ============================================================================
// BUILDER CONFIGURATION INTERFACE
// ============================================================================

export interface NetworkQueryConfig {
  /** Output columns for the query result */
  columns: OutputColumn[];

  /** Granularity type - 'duration' for time-series, 'all' for aggregated tables */
  granularity: GranularityType;

  /** Dimensions to group by (e.g., ['domain_name', 'host_name', 'port_role']) */
  dimensions: string[];

  /** Aggregations to apply */
  aggregations: Aggregation[];

  /** Optional post-aggregations (computed fields) */
  postAggregations?: PostAggregation[];

  /** Optional port type filter (e.g., 'ethernet', 'backplane_port', 'ethernet_port_channel') */
  portType?: string;

  /** Optional port role filter (e.g., 'eth_uplink', 'host_port', 'eth_uplink_pc') */
  portRole?: string;

  /** Optional port role values for 'in' filter (e.g., ['eth_uplink', 'eth_uplink_pc']) */
  portRoles?: string[];

  /** Optional host name search filter (e.g., ' eCMC-A', ' eCMC-B') */
  hostNameSearch?: string;

  /** Additional custom filters to include */
  additionalFilters?: FilterField[];

  /** Format: 'table' or 'timeseries' */
  format?: 'table' | 'timeseries';

  /** RefId for the query (default: 'A') */
  refId?: string;
}

// ============================================================================
// COMMON VIRTUAL COLUMNS
// ============================================================================

/**
 * Standard virtual columns used across network queries
 */
export const NETWORK_VIRTUAL_COLUMNS = {
  DOMAIN_NAME: {
    type: 'nested-field',
    columnName: 'intersight.domain.name',
    outputName: 'domain_name',
    expectedType: 'STRING',
    path: '$',
  } as VirtualColumn,

  HOST_NAME: {
    type: 'nested-field',
    columnName: 'host.name',
    outputName: 'host_name',
    expectedType: 'STRING',
    path: '$',
  } as VirtualColumn,

  PORT_ROLE: {
    type: 'nested-field',
    columnName: 'hw.network.port.role',
    outputName: 'port_role',
    expectedType: 'STRING',
    path: '$',
  } as VirtualColumn,

  PORT_NAME: {
    type: 'nested-field',
    columnName: 'name',
    outputName: 'name',
    expectedType: 'STRING',
    path: '$',
  } as VirtualColumn,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get virtual columns based on which dimensions are requested
 */
function getVirtualColumns(dimensions: string[]): VirtualColumn[] {
  const columns: VirtualColumn[] = [];

  if (dimensions.includes('domain_name')) {
    columns.push(NETWORK_VIRTUAL_COLUMNS.DOMAIN_NAME);
  }
  if (dimensions.includes('host_name')) {
    columns.push(NETWORK_VIRTUAL_COLUMNS.HOST_NAME);
  }
  if (dimensions.includes('port_role')) {
    columns.push(NETWORK_VIRTUAL_COLUMNS.PORT_ROLE);
  }
  if (dimensions.includes('name')) {
    columns.push(NETWORK_VIRTUAL_COLUMNS.PORT_NAME);
  }

  return columns;
}

/**
 * Build base filter fields that are common to all network queries
 */
function buildBaseFilters(config: NetworkQueryConfig): FilterField[] {
  const filters: FilterField[] = [
    // Always include chassis name filter
    {
      type: 'in',
      dimension: 'intersight.domain.name',
      values: [], // Will be filled by template variable: [\${ChassisName:doublequote}]
    },
    // Always filter to hw.network instrument
    {
      type: 'selector',
      dimension: 'instrument.name',
      value: 'hw.network',
    },
  ];

  // Add port type filter if specified
  if (config.portType) {
    filters.push({
      type: 'selector',
      dimension: 'hw.network.port.type',
      value: config.portType,
    });
  }

  // Add port role filter if specified (single value)
  if (config.portRole) {
    filters.push({
      type: 'selector',
      dimension: 'hw.network.port.role',
      value: config.portRole,
    });
  }

  // Add port role filter if specified (multiple values using 'in')
  if (config.portRoles && config.portRoles.length > 0) {
    filters.push({
      type: 'in',
      dimension: 'hw.network.port.role',
      values: config.portRoles,
    });
  }

  // Add host name search filter if specified
  if (config.hostNameSearch) {
    filters.push({
      type: 'search',
      dimension: 'host.name',
      query: {
        type: 'insensitive_contains',
        value: config.hostNameSearch,
      },
    });
  }

  // Add any additional custom filters
  if (config.additionalFilters) {
    filters.push(...config.additionalFilters);
  }

  return filters;
}

/**
 * Build granularity configuration
 */
function buildGranularity(type: GranularityType): any {
  if (type === 'duration') {
    return {
      type: 'duration',
      duration: '$__interval_ms',
      timeZone: '$__timezone',
    };
  } else {
    return { type: 'all' };
  }
}

// ============================================================================
// MAIN QUERY BUILDER
// ============================================================================

/**
 * Build a complete network interface query for the Infinity datasource.
 *
 * This function creates the common query structure used across NetworkUtilizationTab,
 * NetworkErrorsTab, and TrafficBalanceTab, reducing code duplication.
 *
 * @param config - Configuration object specifying query parameters
 * @param apiEndpoint - API endpoint URL (e.g., '/api/v1/telemetry/TimeSeries')
 * @returns Complete query object ready to be used in SceneQueryRunner
 *
 * @example
 * // Build a query for network utilization
 * const query = buildNetworkInterfaceQuery({
 *   columns: [
 *     { selector: 'timestamp', text: 'Time', type: 'timestamp' },
 *     { selector: 'event.domain_name', text: 'Chassis', type: 'string' },
 *     { selector: 'event.transmit_max', text: 'TX Max', type: 'number' },
 *   ],
 *   granularity: 'duration',
 *   dimensions: ['domain_name', 'host_name'],
 *   portRoles: ['eth_uplink', 'eth_uplink_pc'],
 *   aggregations: [
 *     { type: 'doubleMax', name: 'transmit_max', fieldName: 'hw.network.io_transmit_max' }
 *   ],
 *   format: 'timeseries',
 * }, '/api/v1/telemetry/TimeSeries');
 */
export function buildNetworkInterfaceQuery(
  config: NetworkQueryConfig,
  apiEndpoint: string
): any {
  const virtualColumns = getVirtualColumns(config.dimensions);
  const filterFields = buildBaseFilters(config);
  const granularity = buildGranularity(config.granularity);

  // Build the query body
  const queryBody = {
    queryType: 'groupBy',
    dataSource: 'NetworkInterfaces',
    granularity,
    intervals: ['${__from:date}/${__to:date}'],
    dimensions: config.dimensions,
    virtualColumns,
    filter: {
      type: 'and',
      fields: filterFields,
    },
    aggregations: config.aggregations,
    ...(config.postAggregations && config.postAggregations.length > 0
      ? { postAggregations: config.postAggregations }
      : {}),
  };

  // Replace chassis name placeholder with template variable
  const queryBodyString = JSON.stringify(queryBody, null, 2)
    .replace('"values": []', '"values": [\\${ChassisName:doublequote}]');

  return {
    refId: config.refId || 'A',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: config.format || 'table',
    url: apiEndpoint,
    root_selector: '',
    columns: config.columns,
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: queryBodyString,
    },
  };
}

// ============================================================================
// SPECIALIZED BUILDERS FOR COMMON PATTERNS
// ============================================================================

/**
 * Build aggregations for network utilization queries (percentage mode).
 * Used in NetworkUtilizationTab and potentially TrafficBalanceTab.
 */
export function buildUtilizationPercentageAggregations(): {
  aggregations: Aggregation[];
  postAggregations: PostAggregation[];
} {
  return {
    aggregations: [
      { type: 'doubleMax', name: 'receive_max', fieldName: 'hw.network.bandwidth.utilization_receive_max' },
      { type: 'doubleMax', name: 'transmit_max', fieldName: 'hw.network.bandwidth.utilization_transmit_max' },
      { type: 'doubleMin', name: 'receive_min', fieldName: 'hw.network.bandwidth.utilization_receive_min' },
      { type: 'doubleMin', name: 'transmit_min', fieldName: 'hw.network.bandwidth.utilization_transmit_min' },
    ],
    postAggregations: [
      { type: 'expression', name: 'receive_avg', expression: '"receive_max"' },
      { type: 'expression', name: 'transmit_avg', expression: '"transmit_max"' },
      { type: 'expression', name: 'receive_max_pct', expression: '"receive_max" * 100' },
      { type: 'expression', name: 'transmit_max_pct', expression: '"transmit_max" * 100' },
      { type: 'expression', name: 'receive_min_pct', expression: '"receive_min" * 100' },
      { type: 'expression', name: 'transmit_min_pct', expression: '"transmit_min" * 100' },
      { type: 'expression', name: 'receive_avg_pct', expression: '"receive_avg" * 100' },
      { type: 'expression', name: 'transmit_avg_pct', expression: '"transmit_avg" * 100' },
    ],
  };
}

/**
 * Build aggregations for network utilization queries (absolute mode).
 * Used in NetworkUtilizationTab and potentially TrafficBalanceTab.
 */
export function buildUtilizationAbsoluteAggregations(): {
  aggregations: Aggregation[];
  postAggregations: PostAggregation[];
} {
  return {
    aggregations: [
      { type: 'doubleMax', name: 'base_transmit_max', fieldName: 'hw.network.io_transmit_max' },
      { type: 'doubleMin', name: 'base_transmit_min', fieldName: 'hw.network.io_transmit_min' },
      { type: 'doubleSum', name: 'transmit_duration', fieldName: 'hw.network.io_transmit_duration' },
      { type: 'longSum', name: 'transmit_sum', fieldName: 'hw.network.io_transmit' },
      { type: 'doubleMax', name: 'base_receive_max', fieldName: 'hw.network.io_receive_max' },
      { type: 'doubleMin', name: 'base_receive_min', fieldName: 'hw.network.io_receive_min' },
      { type: 'doubleSum', name: 'receive_duration', fieldName: 'hw.network.io_receive_duration' },
      { type: 'longSum', name: 'receive_sum', fieldName: 'hw.network.io_receive' },
    ],
    postAggregations: [
      { type: 'expression', name: 'transmit_max', expression: '(base_transmit_max * 8)' },
      { type: 'expression', name: 'transmit_min', expression: '(base_transmit_min * 8)' },
      { type: 'expression', name: 'transmit_avg', expression: '("transmit_sum" / "transmit_duration") * 8' },
      { type: 'expression', name: 'receive_max', expression: '(base_receive_max * 8)' },
      { type: 'expression', name: 'receive_min', expression: '(base_receive_min * 8)' },
      { type: 'expression', name: 'receive_avg', expression: '("receive_sum" / "receive_duration") * 8' },
    ],
  };
}
