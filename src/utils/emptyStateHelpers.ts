/**
 * Empty State Helper Utilities
 *
 * Provides utilities for detecting empty state scenarios and extracting variable values.
 * Used in conjunction with EmptyStateScene component to handle:
 * - 'no-data': Query returned no results (no entities in Intersight)
 * - 'nothing-selected': Data exists but user hasn't selected anything
 */

import type { EmptyStateScenario } from '../components/EmptyStateScene';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a Grafana variable with state containing options and value
 */
interface VariableState {
  options?: Array<{ value: any; text?: string }>;
  value?: any;
  type?: string;
  [key: string]: any;
}

interface Variable {
  state: VariableState;
  [key: string]: any;
}

// ============================================================================
// SCENARIO DETECTION
// ============================================================================

/**
 * Determines the empty state scenario for a given variable.
 *
 * @param variable - The Grafana variable to check
 * @returns 'no-data' if no options available,
 *          'nothing-selected' if options exist but nothing selected,
 *          null if valid state (has data and selection)
 *
 * @example
 * const scenario = getEmptyStateScenario(serverVariable);
 * if (scenario) {
 *   this.setState({ body: new EmptyStateScene({ scenario, entityType: 'server' }) });
 *   return;
 * }
 */
export function getEmptyStateScenario(variable: any): EmptyStateScenario | null {
  if (!variable || !variable.state) {
    return 'no-data';
  }

  const varState = variable.state as VariableState;

  // Check if data is available (options exist)
  const hasOptions = varState.options && Array.isArray(varState.options) && varState.options.length > 0;

  if (!hasOptions) {
    return 'no-data';
  }

  // Check if something is selected
  const value = varState.value;
  let hasSelection = false;

  if (Array.isArray(value)) {
    hasSelection = value.length > 0 && value.some((v) => v && v !== '$__all');
  } else {
    hasSelection = value && value !== '$__all';
  }

  if (!hasSelection) {
    return 'nothing-selected';
  }

  // Valid state - has data and selection
  return null;
}

// ============================================================================
// VALUE EXTRACTION
// ============================================================================

/**
 * Extracts selected values from a variable as a string array.
 * Filters out $__all placeholder and handles single/multiple selections.
 *
 * @param variable - The Grafana variable to extract values from
 * @returns Array of selected values as strings
 *
 * @example
 * const serverNames = getSelectedValues(serverVariable);
 * // ['server1', 'server2', 'server3']
 */
export function getSelectedValues(variable: any): string[] {
  if (!variable || !variable.state) {
    return [];
  }

  const value = variable.state.value;
  let selectedValues: string[] = [];

  if (Array.isArray(value)) {
    selectedValues = value.map((v) => String(v)).filter((v) => v && v !== '$__all');
  } else if (value && value !== '$__all') {
    selectedValues = [String(value)];
  }

  return selectedValues;
}

// ============================================================================
// DATA AVAILABILITY CHECKS
// ============================================================================

/**
 * Checks if a variable has no data available (no options).
 *
 * @param variable - The Grafana variable to check
 * @returns true if no options available, false otherwise
 *
 * @example
 * if (hasNoDataAvailable(serverVariable)) {
 *   // Show "No servers found in Intersight" message
 * }
 */
export function hasNoDataAvailable(variable: any): boolean {
  if (!variable || !variable.state) {
    return true;
  }

  const varState = variable.state as VariableState;
  return !varState.options || !Array.isArray(varState.options) || varState.options.length === 0;
}

/**
 * Checks if a variable has data but nothing is selected.
 *
 * @param variable - The Grafana variable to check
 * @returns true if options exist but nothing selected, false otherwise
 *
 * @example
 * if (hasNothingSelected(serverVariable)) {
 *   // Show "Please select a server" message
 * }
 */
export function hasNothingSelected(variable: any): boolean {
  if (!variable || !variable.state) {
    return true;
  }

  const varState = variable.state as VariableState;

  // First check if data is available
  const hasOptions = varState.options && Array.isArray(varState.options) && varState.options.length > 0;

  if (!hasOptions) {
    return false; // This is "no data", not "nothing selected"
  }

  // Check if nothing is selected
  const value = varState.value;
  let hasSelection = false;

  if (Array.isArray(value)) {
    hasSelection = value.length > 0 && value.some((v) => v && v !== '$__all');
  } else {
    hasSelection = value && value !== '$__all';
  }

  return !hasSelection;
}
