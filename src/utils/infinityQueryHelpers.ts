/**
 * Infinity Query Helpers
 *
 * Utility functions for building Infinity datasource queries with common boilerplate.
 * Reduces code duplication and ensures consistency across all Infinity queries.
 */

/**
 * Options for creating an Infinity GET query
 */
export interface InfinityGetQueryOptions {
  /**
   * Query reference ID (default: 'A')
   * Use 'B', 'C', etc. for multiple queries in the same panel
   */
  refId?: string;

  /**
   * API endpoint URL
   * Can include query parameters and variable interpolation (e.g., ${ChassisName})
   */
  url: string;

  /**
   * Column definitions mapping JSON selectors to table columns
   */
  columns: Array<{
    selector: string;
    text: string;
    type: 'string' | 'number' | 'timestamp';
  }>;

  /**
   * Output format (default: 'table')
   * - 'table': Tabular data for table panels
   * - 'timeseries': Time-series data for graph panels
   */
  format?: 'table' | 'timeseries';

  /**
   * JSONPath selector for extracting results from response (default: '$.Results')
   * Most Intersight API responses use '$.Results', but this can be customized
   */
  rootSelector?: string;

  /**
   * Computed columns for adding derived data to query results
   * Used to inject static values (e.g., chassis name) into multi-query results
   */
  computedColumns?: Array<{
    selector: string;
    text: string;
    type: 'string' | 'number' | 'timestamp';
  }>;
}

/**
 * Creates an Infinity datasource GET query with standard boilerplate.
 *
 * This helper eliminates repetitive query structure code by providing a clean interface
 * for building Infinity queries. All Infinity GET queries share the same base structure:
 * - queryType: 'infinity'
 * - type: 'json'
 * - source: 'url'
 * - parser: 'backend'
 * - url_options: { method: 'GET', data: '' }
 *
 * @example
 * ```typescript
 * const query = createInfinityGetQuery({
 *   url: '/api/v1/cond/Alarms?$filter=Severity eq "Critical"',
 *   columns: [
 *     { selector: 'Severity', text: 'Severity', type: 'string' },
 *     { selector: 'Description', text: 'Description', type: 'string' },
 *     { selector: 'LastTransitionTime', text: 'Time', type: 'timestamp' },
 *   ],
 * });
 * ```
 *
 * @param options - Query configuration options
 * @returns Infinity query object ready to use in SceneQueryRunner
 */
export function createInfinityGetQuery(options: InfinityGetQueryOptions): any {
  const query: any = {
    refId: options.refId || 'A',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: options.format || 'table',
    url: options.url,
    root_selector: options.rootSelector || '$.Results',
    columns: options.columns,
    url_options: {
      method: 'GET',
      data: '',
    },
  };

  // Add computed columns if provided
  if (options.computedColumns && options.computedColumns.length > 0) {
    query.computed_columns = options.computedColumns;
  }

  return query;
}

/**
 * Options for creating an Infinity POST query
 */
export interface InfinityPostQueryOptions {
  /**
   * Query reference ID (default: 'A')
   */
  refId?: string;

  /**
   * API endpoint URL
   */
  url: string;

  /**
   * Column definitions mapping JSON selectors to table columns
   */
  columns: Array<{
    selector: string;
    text: string;
    type: 'string' | 'number' | 'timestamp';
  }>;

  /**
   * Request body (will be converted to string if object)
   */
  body: string | object;

  /**
   * Output format (default: 'table')
   */
  format?: 'table' | 'timeseries';

  /**
   * JSONPath selector for extracting results from response (default: '')
   */
  rootSelector?: string;

  /**
   * Content type for request body (default: 'application/json')
   */
  contentType?: string;
}

/**
 * Creates an Infinity datasource POST query with standard boilerplate.
 *
 * Similar to createInfinityGetQuery but for POST requests with request bodies.
 * Common for Druid/telemetry queries that require complex filter/aggregation logic.
 *
 * @example
 * ```typescript
 * const query = createInfinityPostQuery({
 *   url: '/api/v1/telemetry/TimeSeries',
 *   body: {
 *     queryType: 'groupBy',
 *     dataSource: 'NetworkInterfaces',
 *     intervals: ['${__from:date}/${__to:date}'],
 *     dimensions: ['domain_name'],
 *     aggregations: [{ type: 'doubleMax', name: 'max_value', fieldName: 'metric' }],
 *   },
 *   columns: [
 *     { selector: 'timestamp', text: 'Time', type: 'timestamp' },
 *     { selector: 'event.domain_name', text: 'Domain', type: 'string' },
 *     { selector: 'event.max_value', text: 'Value', type: 'number' },
 *   ],
 * });
 * ```
 *
 * @param options - Query configuration options
 * @returns Infinity query object ready to use in SceneQueryRunner
 */
export function createInfinityPostQuery(options: InfinityPostQueryOptions): any {
  const bodyString = typeof options.body === 'string'
    ? options.body
    : JSON.stringify(options.body, null, 2);

  return {
    refId: options.refId || 'A',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: options.format || 'table',
    url: options.url,
    root_selector: options.rootSelector || '',
    columns: options.columns,
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: options.contentType || 'application/json',
      data: bodyString,
    },
  };
}

/**
 * Virtual column definition for Druid queries
 */
export interface DruidVirtualColumn {
  type: 'nested-field';
  columnName: string;
  outputName: string;
  expectedType: 'STRING' | 'DOUBLE' | 'LONG';
  path: string;
}

/**
 * Aggregation definition for Druid queries
 */
export interface DruidAggregation {
  type: string; // e.g., 'doubleMax', 'doubleMin', 'doubleSum', 'longSum'
  name: string;
  fieldName: string;
}

/**
 * Post-aggregation definition for Druid queries
 */
export interface DruidPostAggregation {
  type: string; // e.g., 'expression', 'arithmetic'
  name: string;
  expression?: string; // for expression type
  fn?: string; // for arithmetic type
  fields?: Array<{ type: string; fieldName?: string; name?: string }>; // for arithmetic type
}

/**
 * Granularity definition for Druid queries
 */
export interface DruidGranularity {
  type: 'duration' | 'period' | 'all';
  duration?: string | number; // e.g., '$__interval_ms', 3600000
  timeZone?: string; // e.g., '$__timezone', 'UTC'
  period?: string; // e.g., 'PT1H' for period type
}

/**
 * Options for creating a timeseries query (specialized for Druid groupBy queries)
 */
export interface TimeseriesQueryOptions {
  /**
   * Query reference ID (default: 'A')
   */
  refId?: string;

  /**
   * Druid data source name
   * Examples: 'NetworkInterfaces', 'PhysicalEntities', 'Alarms'
   */
  dataSource: string;

  /**
   * Dimension names to group by
   * Examples: ['domain_name', 'host_name', 'port_role']
   */
  dimensions: string[];

  /**
   * Virtual column definitions for extracting nested fields
   */
  virtualColumns: DruidVirtualColumn[];

  /**
   * Filter object for the query
   * Typically contains 'type' and 'fields' for complex filters
   */
  filter: any;

  /**
   * Aggregation definitions
   */
  aggregations: DruidAggregation[];

  /**
   * Post-aggregation definitions (optional)
   * Used for calculations on aggregated values
   */
  postAggregations?: DruidPostAggregation[];

  /**
   * Granularity configuration (optional)
   * Defaults to: { type: 'duration', duration: '$__interval_ms', timeZone: '$__timezone' }
   * Override for custom granularity requirements
   */
  granularity?: DruidGranularity;

  /**
   * Output column mappings for Infinity datasource
   * Maps Druid query results to Grafana columns
   */
  columns: Array<{
    selector: string;
    text: string;
    type: 'string' | 'number' | 'timestamp';
  }>;

  /**
   * Output format (default: 'timeseries')
   * - 'timeseries': For time-series graphs
   * - 'table': For table views
   */
  format?: 'table' | 'timeseries';
}

/**
 * Creates a timeseries query using Druid groupBy.
 *
 * This is a specialized wrapper around createInfinityPostQuery that abstracts
 * the common structure of timeseries queries:
 * - Always uses '/api/v1/telemetry/TimeSeries' endpoint
 * - Always uses 'groupBy' query type
 * - Uses standard granularity with $__interval_ms by default (can be overridden)
 * - Always uses ${__from:date}/${__to:date} for intervals
 *
 * This eliminates ~50% of the boilerplate code for timeseries queries.
 *
 * @example
 * ```typescript
 * // Standard usage with default granularity
 * const query = createTimeseriesQuery({
 *   dataSource: 'NetworkInterfaces',
 *   dimensions: ['domain_name', 'host_name'],
 *   virtualColumns: [
 *     {
 *       type: 'nested-field',
 *       columnName: 'intersight.domain.name',
 *       outputName: 'domain_name',
 *       expectedType: 'STRING',
 *       path: '$',
 *     },
 *   ],
 *   filter: {
 *     type: 'selector',
 *     dimension: 'instrument.name',
 *     value: 'hw.network',
 *   },
 *   aggregations: [
 *     { type: 'doubleMax', name: 'max_value', fieldName: 'hw.network.io_transmit_max' },
 *   ],
 *   columns: [
 *     { selector: 'timestamp', text: 'Time', type: 'timestamp' },
 *     { selector: 'event.domain_name', text: 'Domain', type: 'string' },
 *     { selector: 'event.max_value', text: 'Value', type: 'number' },
 *   ],
 * });
 *
 * // Custom granularity override
 * const queryWithCustomGranularity = createTimeseriesQuery({
 *   dataSource: 'NetworkInterfaces',
 *   granularity: {
 *     type: 'period',
 *     period: 'PT1H',
 *     timeZone: 'UTC',
 *   },
 *   // ... other options
 * });
 * ```
 *
 * @param options - Timeseries query configuration
 * @returns Infinity query object ready to use in SceneQueryRunner
 */
export function createTimeseriesQuery(options: TimeseriesQueryOptions): any {
  // Build the Druid groupBy query body
  const queryBody: any = {
    queryType: 'groupBy',
    dataSource: options.dataSource,
    granularity: options.granularity || {
      type: 'duration',
      duration: '$__interval_ms', // Will be replaced by Grafana at runtime
      timeZone: '$__timezone',
    },
    intervals: ['${__from:date}/${__to:date}'], // Grafana time range variables
    dimensions: options.dimensions,
    virtualColumns: options.virtualColumns,
    filter: options.filter,
    aggregations: options.aggregations,
  };

  // Add postAggregations if provided
  if (options.postAggregations && options.postAggregations.length > 0) {
    queryBody.postAggregations = options.postAggregations;
  }

  // Use createInfinityPostQuery to build the final query
  return createInfinityPostQuery({
    refId: options.refId || 'A',
    format: options.format || 'timeseries',
    url: '/api/v1/telemetry/TimeSeries',
    columns: options.columns,
    body: JSON.stringify(queryBody, null, 2),
  });
}
