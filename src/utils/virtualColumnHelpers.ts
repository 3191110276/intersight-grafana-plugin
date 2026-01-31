/**
 * Virtual Column Helpers
 *
 * Reusable factory functions for common virtual column definitions used in
 * telemetry queries across Unified Edge tabs. These helpers reduce code
 * duplication and ensure consistency in query construction.
 */

/**
 * Virtual column type for nested field extraction
 */
export interface NestedFieldVirtualColumn {
  type: 'nested-field';
  columnName: string;
  outputName: string;
  expectedType: 'STRING' | 'NUMBER' | 'BOOLEAN';
  path: string;
}

/**
 * Creates a virtual column that extracts the domain name from intersight metadata
 *
 * Maps: intersight.domain.name → domain_name
 *
 * @returns Virtual column configuration for domain name extraction
 */
export function createDomainNameVirtualColumn(): NestedFieldVirtualColumn {
  return {
    type: 'nested-field',
    columnName: 'intersight.domain.name',
    outputName: 'domain_name',
    expectedType: 'STRING',
    path: '$',
  };
}

/**
 * Creates a virtual column that extracts the host name
 *
 * Maps: host.name → host_name
 *
 * @returns Virtual column configuration for host name extraction
 */
export function createHostNameVirtualColumn(): NestedFieldVirtualColumn {
  return {
    type: 'nested-field',
    columnName: 'host.name',
    outputName: 'host_name',
    expectedType: 'STRING',
    path: '$',
  };
}

/**
 * Creates a virtual column that extracts the host name with custom output name
 *
 * Maps: host.name → hostname (without underscore)
 * Used in some legacy queries where the output name differs
 *
 * @returns Virtual column configuration for host name extraction
 */
export function createHostnameVirtualColumn(): NestedFieldVirtualColumn {
  return {
    type: 'nested-field',
    columnName: 'host.name',
    outputName: 'hostname',
    expectedType: 'STRING',
    path: '$',
  };
}

/**
 * Creates a virtual column that extracts the network port role
 *
 * Maps: hw.network.port.role → port_role
 *
 * @returns Virtual column configuration for port role extraction
 */
export function createPortRoleVirtualColumn(): NestedFieldVirtualColumn {
  return {
    type: 'nested-field',
    columnName: 'hw.network.port.role',
    outputName: 'port_role',
    expectedType: 'STRING',
    path: '$',
  };
}

/**
 * Creates a virtual column that extracts the port name
 *
 * Maps: name → port_name
 *
 * @returns Virtual column configuration for port name extraction
 */
export function createPortNameVirtualColumn(): NestedFieldVirtualColumn {
  return {
    type: 'nested-field',
    columnName: 'name',
    outputName: 'port_name',
    expectedType: 'STRING',
    path: '$',
  };
}
