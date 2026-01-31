/**
 * Application Constants
 * Shared constants for use across all dashboard implementations
 * (Domain, Standalone, Unified Edge, etc.)
 *
 * Naming convention:
 * - General constants: Use descriptive names (e.g., NETWORK_ERROR_LABELS)
 * - Implementation-specific: Use prefixes (e.g., UNIFIED_EDGE_*, DOMAIN_*, STANDALONE_*)
 */

// ============================================================================
// Network Constants (shared across all implementations)
// ============================================================================

/**
 * Network Error Type Labels
 * Human-readable display labels for network error types.
 * Used for transforming error type field names in network error panels.
 *
 * Usage:
 * - NetworkErrorsTab (all implementations): Transform error type names in charts/tables
 */
export const NETWORK_ERROR_LABELS: Record<string, string> = {
  // RX (Receive) errors
  'too_short': 'Too Short',
  'crc': 'CRC',
  'too_long': 'Too Long',
  'runt': 'Runt',
  'no_buffer': 'No Buffer',
  'rx_discard': 'RX Discard',
  // TX (Transmit) errors
  'jabber': 'Jabber',
  'late_collisions': 'Late Collisions',
  'deferred': 'Deferred',
  'carrier_sense': 'Carrier Sense',
  'tx_discard': 'TX Discard',
} as const;

// ============================================================================
// Unified Edge Specific Constants
// ============================================================================

// Add Unified Edge-specific constants here with UNIFIED_EDGE_ prefix
// Example: export const UNIFIED_EDGE_ECMC_HOSTS = { ... };

// ============================================================================
// Domain Specific Constants
// ============================================================================

// Add Domain-specific constants here with DOMAIN_ prefix

// ============================================================================
// Standalone Specific Constants
// ============================================================================

// Add Standalone-specific constants here with STANDALONE_ prefix
