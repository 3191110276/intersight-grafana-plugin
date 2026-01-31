/**
 * Unified Edge Constants
 * Centralized constants for Unified Edge dashboard tabs
 */

// API Endpoints
export const API_ENDPOINTS = {
  // Telemetry
  TELEMETRY_TIMESERIES: '/api/v1/telemetry/TimeSeries',

  // Conditions & Alarms
  COND_ALARMS: '/api/v1/cond/Alarms',

  // Workflows
  WORKFLOW_WORKFLOW_INFO: '/api/v1/workflow/WorkflowInfo',

  // Equipment
  EQUIPMENT_CHASSES: '/api/v1/equipment/Chasses',

  // Compute
  COMPUTE_PHYSICAL_SUMMARIES: '/api/v1/compute/PhysicalSummaries',

  // Network
  ETHER_PHYSICAL_PORTS: '/api/v1/ether/PhysicalPorts',
  ADAPTER_EXT_ETH_INTERFACES: '/api/v1/adapter/ExtEthInterfaces',

  // Storage
  STORAGE_CONTROLLERS: '/api/v1/storage/Controllers',
  STORAGE_PHYSICAL_DISKS: '/api/v1/storage/PhysicalDisks',
  STORAGE_VIRTUAL_DRIVES: '/api/v1/storage/VirtualDrives',
} as const;

// Alarm Severities
export const ALARM_SEVERITIES = {
  CRITICAL: 'Critical',
  WARNING: 'Warning',
  INFO: 'Info',
  CLEARED: 'Cleared',
} as const;

export type AlarmSeverity = typeof ALARM_SEVERITIES[keyof typeof ALARM_SEVERITIES];

// Alarm Severity Display Order (for sorting)
export const ALARM_SEVERITY_ORDER = {
  [ALARM_SEVERITIES.CRITICAL]: 1,
  [ALARM_SEVERITIES.WARNING]: 2,
  [ALARM_SEVERITIES.INFO]: 3,
  [ALARM_SEVERITIES.CLEARED]: 4,
} as const;

// Workflow Statuses
export const WORKFLOW_STATUSES = {
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  RUNNING: 'Running',
  WAITING: 'Waiting',
} as const;

export type WorkflowStatus = typeof WORKFLOW_STATUSES[keyof typeof WORKFLOW_STATUSES];

// Field Names (common fields used in queries and transformations)
export const FIELD_NAMES = {
  // Alarm fields
  SEVERITY: 'Severity',
  NAME: 'Name',
  DESCRIPTION: 'Description',
  LAST_TRANSITION_TIME: 'LastTransitionTime',
  AFFECTED_MO_DISPLAY_NAME: 'AffectedMoDisplayName',
  AFFECTED_MO_TYPE: 'AffectedMoType',
  CODE: 'Code',

  // Workflow/Action fields
  STATUS: 'Status',
  START_TIME: 'StartTime',
  END_TIME: 'EndTime',
  USER_ID: 'UserId',

  // Common fields
  MOD_TIME: 'ModTime',
  CREATE_TIME: 'CreateTime',
} as const;

// Annotation Colors
export const COLORS = {
  // Alarm severity colors
  ALARM_CRITICAL: '#F2495C',
  ALARM_WARNING: '#FF9830',
  ALARM_INFO: '#5794F2',
  ALARM_CLEARED: '#73BF69',

  // Workflow status colors
  WORKFLOW_COMPLETED: '#73BF69',
  WORKFLOW_FAILED: '#F2495C',
  WORKFLOW_RUNNING: '#5794F2',
  WORKFLOW_WAITING: '#FF9830',

  // Neutral/Gray colors
  GRAY_MEDIUM: '#525252',
  GRAY_DARK: '#646464',
  GRAY_LIGHT: '#808080',

  // Threshold colors
  YELLOW_WARNING: '#EAB839',
} as const;

// Column Widths (standardized pixel widths)
export const COLUMN_WIDTHS = {
  HIDDEN: 0,      // Hide column
  TINY: 20,       // Very small columns
  XXXSMALL: 50,   // Icon/number columns
  XXSMALL_1: 55,
  XXSMALL_2: 60,
  XXSMALL_3: 65,
  XSMALL_1: 75,
  XSMALL_2: 80,
  XSMALL_3: 85,
  SMALL_1: 90,
  SMALL_2: 95,
  SMALL_3: 96,
  SMALL_4: 100,
  MEDIUM_1: 105,
  MEDIUM_2: 110,
  MEDIUM_3: 115,
  MEDIUM_4: 120,
  LARGE_1: 140,
  LARGE_2: 150,
  LARGE_3: 165,
  XLARGE: 200,
  XXLARGE_1: 230,
  XXLARGE_2: 240,
  XXLARGE_3: 260,
  XXXLARGE: 280,
  AUTO: undefined, // Let Grafana auto-size
} as const;
