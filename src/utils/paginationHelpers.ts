/**
 * Pagination Helper Utilities
 *
 * Utilities for handling OData pagination in Intersight API queries.
 * The Intersight API returns a maximum of 1000 results per request.
 * These helpers enable fetching and merging additional pages.
 */

import { DataFrame, FieldType } from '@grafana/data';

/**
 * Default page size for Intersight API (OData standard limit)
 */
export const DEFAULT_PAGE_SIZE = 1000;

/**
 * Maximum number of pages to fetch (safety limit to prevent runaway fetching)
 */
export const DEFAULT_MAX_PAGES = 10;

/**
 * Adds or updates $top and $skip OData pagination parameters in a URL.
 *
 * @param url - The original URL (can be full URL or path only)
 * @param skip - Number of records to skip
 * @param top - Number of records to return (page size)
 * @returns URL with pagination parameters added/updated
 *
 * @example
 * addPaginationParams('/api/v1/compute/RackUnits', 1000, 1000)
 * // Returns: '/api/v1/compute/RackUnits?$top=1000&$skip=1000'
 *
 * addPaginationParams('/api/v1/compute/RackUnits?$filter=Name eq "foo"', 2000, 1000)
 * // Returns: '/api/v1/compute/RackUnits?$filter=Name eq "foo"&$top=1000&$skip=2000'
 */
export function addPaginationParams(url: string, skip: number, top: number): string {
  // Remove existing $top and $skip parameters if present
  let cleanUrl = url
    .replace(/([&?])\$top=\d+/gi, '$1')
    .replace(/([&?])\$skip=\d+/gi, '$1')
    // Clean up any doubled separators or trailing separators
    .replace(/[&?]+$/, '')
    .replace(/[?&]{2,}/g, (match) => match[0]);

  // Determine separator based on whether URL already has query params
  const separator = cleanUrl.includes('?') ? '&' : '?';

  return `${cleanUrl}${separator}$top=${top}&$skip=${skip}`;
}

/**
 * Checks if more pages should be fetched based on the current data.
 * Returns true if the DataFrame has exactly `pageSize` rows, indicating
 * there may be more data available.
 *
 * @param dataFrame - The DataFrame to check
 * @param pageSize - The expected page size (default: 1000)
 * @returns true if more pages should be fetched
 */
export function shouldFetchMorePages(dataFrame: DataFrame | undefined, pageSize: number = DEFAULT_PAGE_SIZE): boolean {
  if (!dataFrame) {
    return false;
  }
  return dataFrame.length === pageSize;
}

/**
 * Merges multiple DataFrames into a single DataFrame by concatenating field values.
 * Assumes all DataFrames have the same field structure.
 *
 * @param frames - Array of DataFrames to merge
 * @returns A single merged DataFrame, or an empty frame if input is empty
 *
 * @example
 * const page1 = { fields: [{ name: 'id', values: [1, 2] }], length: 2 };
 * const page2 = { fields: [{ name: 'id', values: [3, 4] }], length: 2 };
 * const merged = mergeDataFrames([page1, page2]);
 * // merged.fields[0].values = [1, 2, 3, 4], merged.length = 4
 */
export function mergeDataFrames(frames: DataFrame[]): DataFrame {
  // Handle empty input
  if (!frames || frames.length === 0) {
    return createEmptyFrame();
  }

  // Single frame, no merging needed
  if (frames.length === 1) {
    return frames[0];
  }

  // Use the first frame as the template
  const template = frames[0];

  // Concatenate field values from all frames
  const mergedFields = template.fields.map((field, fieldIdx) => {
    // Collect all values for this field across all frames
    const allValues: any[] = [];
    for (const frame of frames) {
      const frameField = frame.fields[fieldIdx];
      if (frameField && frameField.values) {
        // Handle both array-like (Vector) and plain arrays
        const values = frameField.values as any;
        if (typeof values.toArray === 'function') {
          allValues.push(...values.toArray());
        } else if (Array.isArray(values)) {
          allValues.push(...values);
        } else {
          // Iterate if it's array-like (legacy Vector interface)
          for (let i = 0; i < frame.length; i++) {
            allValues.push(typeof values.get === 'function' ? values.get(i) : values[i]);
          }
        }
      }
    }

    return {
      ...field,
      values: allValues,
    };
  });

  // Calculate total length
  const totalLength = frames.reduce((sum, f) => sum + f.length, 0);

  return {
    ...template,
    fields: mergedFields,
    length: totalLength,
  };
}

/**
 * Creates an empty DataFrame with no fields.
 */
export function createEmptyFrame(): DataFrame {
  return {
    name: 'empty',
    fields: [],
    length: 0,
  };
}

/**
 * Extracts the URL from an Infinity datasource query object.
 *
 * @param query - The query object from SceneQueryRunner
 * @returns The URL string, or undefined if not found
 */
export function extractUrlFromQuery(query: any): string | undefined {
  // Infinity query format stores URL directly on the query object
  if (query && typeof query.url === 'string') {
    return query.url;
  }

  // Also check nested infinityQuery structure (used in variables)
  if (query && query.infinityQuery && typeof query.infinityQuery.url === 'string') {
    return query.infinityQuery.url;
  }

  return undefined;
}

/**
 * Parses JSON API response and extracts results array.
 * Handles Intersight API response format with Results array.
 *
 * @param response - Raw API response data
 * @param rootSelector - JSONPath-like selector for results (e.g., '$.Results')
 * @returns Array of result objects
 */
export function extractResultsFromResponse(response: any, rootSelector?: string): any[] {
  if (!response) {
    return [];
  }

  // Handle common Intersight API format
  if (rootSelector === '$.Results' || !rootSelector) {
    if (Array.isArray(response.Results)) {
      return response.Results;
    }
  }

  // Try to extract based on selector pattern
  if (rootSelector) {
    // Remove leading $. if present
    const path = rootSelector.replace(/^\$\.?/, '');
    if (path) {
      const parts = path.split('.');
      let current = response;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return [];
        }
      }
      if (Array.isArray(current)) {
        return current;
      }
    }
  }

  // If response is already an array, return it
  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

/**
 * Converts an array of result objects to a DataFrame.
 * Uses column definitions from the original query to structure the data.
 *
 * @param results - Array of result objects from API
 * @param columns - Column definitions from query
 * @returns DataFrame with the results
 */
export function resultsToDataFrame(results: any[], columns: any[]): DataFrame {
  if (!results || results.length === 0 || !columns || columns.length === 0) {
    return createEmptyFrame();
  }

  // Build fields based on column definitions
  const fields = columns.map((col) => {
    const values: any[] = [];

    for (const row of results) {
      // Extract value using selector (supports nested paths like 'AlarmSummary.Critical')
      const value = getNestedValue(row, col.selector);
      values.push(value);
    }

    // Determine field type
    let fieldType: FieldType = FieldType.string;
    if (col.type === 'number') {
      fieldType = FieldType.number;
    } else if (col.type === 'time') {
      fieldType = FieldType.time;
    } else if (col.type === 'boolean') {
      fieldType = FieldType.boolean;
    }

    return {
      name: col.text || col.selector,
      type: fieldType,
      values: values,
      config: {},
    };
  });

  return {
    name: 'paginated-results',
    fields,
    length: results.length,
    refId: 'A',
  };
}

/**
 * Gets a nested value from an object using dot notation path.
 *
 * @param obj - The object to extract from
 * @param path - Dot-notation path (e.g., 'AlarmSummary.Critical')
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) {
    return undefined;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}
