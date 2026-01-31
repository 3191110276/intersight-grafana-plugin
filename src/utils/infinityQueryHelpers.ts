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
