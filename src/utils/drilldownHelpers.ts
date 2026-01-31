/**
 * Drilldown Helper Functions
 *
 * Shared utility functions for drilldown functionality across different dashboard tabs.
 * These functions help with chassis selection counting and query manipulation for drilldown views.
 */

import { SceneObjectBase, sceneGraph } from '@grafana/scenes';

/**
 * Get the count of selected chassis from the ChassisName variable.
 *
 * This function looks up the ChassisName variable in the scene graph and returns
 * the number of selected chassis, excluding the special "$__all" value.
 *
 * @param scene - The scene object to look up variables from
 * @returns The count of selected chassis (0 if none selected or variable not found)
 *
 * @example
 * ```typescript
 * const count = getChassisCount(this);
 * if (count === 1) {
 *   // Show single-chassis view
 * } else if (count > 1) {
 *   // Show multi-chassis table
 * }
 * ```
 */
export function getChassisCount(scene: SceneObjectBase): number {
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
 * Create a drilldown query by replacing the ChassisName variable with a hardcoded value.
 *
 * This function deep clones the base query and replaces all occurrences of the
 * `[${ChassisName:doublequote}]` pattern with a JSON-escaped hardcoded chassis name,
 * effectively filtering the query to a specific chassis.
 *
 * The function uses regex replacement to find the variable interpolation pattern
 * in the query's data payload and replaces it with the properly escaped chassis name.
 *
 * @param baseQuery - The base query object containing the variable interpolation
 * @param chassisName - The chassis name to hardcode in the query
 * @returns A new query object with the hardcoded chassis name filter
 *
 * @example
 * ```typescript
 * const baseQuery = {
 *   // ... query config with [${ChassisName:doublequote}] in the filter
 * };
 * const drilldownQuery = createDrilldownQuery(baseQuery, 'CH-A-01');
 * // Result: Query with filter using ["CH-A-01"] instead of [${ChassisName:doublequote}]
 * ```
 */
export function createDrilldownQuery(baseQuery: any, chassisName: string): any {
  // Deep clone the base query to avoid mutating the original
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));

  // Escape the chassis name for JSON
  const escapedChassisName = JSON.stringify(chassisName);

  // Replace the ChassisName variable interpolation with the hardcoded value
  // Pattern: [${ChassisName:doublequote}] -> ["chassisName"]
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /\[\$\{ChassisName:doublequote\}\]/g,
    `[${escapedChassisName}]`
  );

  return drilldownQuery;
}
