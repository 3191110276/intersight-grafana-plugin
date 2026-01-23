import { DataFrame } from '@grafana/data';

// Debug mode state
let debugEnabled = false;

// Initialize from URL parameter on module load
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  debugEnabled = params.get('debug') === 'true';
}

// Runtime control functions (exposed on window)
if (typeof window !== 'undefined') {
  (window as any).enableDebug = () => {
    debugEnabled = true;
    console.log('%c[DEBUG] Debug mode ENABLED', 'color: #00ff00; font-weight: bold');
  };

  (window as any).disableDebug = () => {
    debugEnabled = false;
    console.log('%c[DEBUG] Debug mode DISABLED', 'color: #ff0000; font-weight: bold');
  };

  (window as any).isDebugEnabled = () => {
    console.log(`[DEBUG] Debug mode is ${debugEnabled ? 'ENABLED' : 'DISABLED'}`);
    return debugEnabled;
  };
}

/**
 * Get timestamp in HH:MM:SS.mmm format
 */
function getTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Format log message with timestamp and category
 */
function formatMessage(category: string, message: string): string {
  return `[DEBUG:${category}] ${getTimestamp()} ${message}`;
}

/**
 * Log with structured output and optional data
 */
function logWithData(category: string, color: string, message: string, data?: any): void {
  if (!debugEnabled) return;

  const formattedMessage = formatMessage(category, message);

  if (data !== undefined) {
    console.groupCollapsed(`%c${formattedMessage}`, `color: ${color}; font-weight: bold`);
    console.log(data);
    console.groupEnd();
  } else {
    console.log(`%c${formattedMessage}`, `color: ${color}; font-weight: bold`);
  }
}

/**
 * Convert DataFrame to array of row objects for easy inspection
 * Example: [{ field1: value1, field2: value2 }, ...]
 */
export function formatDataFrame(df: DataFrame): any[] {
  const rows: any[] = [];
  for (let i = 0; i < df.length; i++) {
    const row: any = {};
    df.fields.forEach((field) => {
      row[field.name] = field.values.get(i);
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Log scene lifecycle events (initialization, activation)
 */
export function debugScene(message: string, data?: any): void {
  logWithData('SCENE', '#00bfff', message, data);
}

/**
 * Log tab navigation and transitions
 */
export function debugTab(message: string, data?: any): void {
  logWithData('TAB', '#ff69b4', message, data);
}

/**
 * Log variable initialization and changes
 */
export function debugVariable(message: string, data?: any): void {
  logWithData('VARIABLE', '#ffa500', message, data);
}

/**
 * Log query execution (start, configuration)
 */
export function debugQuery(message: string, data?: any): void {
  logWithData('QUERY', '#9370db', message, data);
}

/**
 * Log transformation pipeline operations
 */
export function debugTransform(message: string, data?: any): void {
  logWithData('TRANSFORM', '#20b2aa', message, data);
}

/**
 * Log URL synchronization events
 */
export function debugUrl(message: string, data?: any): void {
  logWithData('URL', '#32cd32', message, data);
}

/**
 * Log data with full DataFrame values (query results, transformation output)
 */
export function debugData(message: string, data?: any): void {
  logWithData('DATA', '#ff6347', message, data);
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  return debugEnabled;
}
