import { PanelBuilders, SceneQueryRunner } from '@grafana/scenes';
import { VizPanel } from '@grafana/scenes';

/**
 * Configuration for creating an alarm stat panel
 */
export interface AlarmStatPanelConfig {
  title: string;
  queryRunner: SceneQueryRunner;
  thresholdColor: string;
}

/**
 * Predefined alarm types with their standard colors
 * These colors match Grafana's standard severity color scheme
 */
export const ALARM_TYPES = {
  CRITICAL: {
    title: 'Critical',
    color: '#8f0000', // Dark red
  },
  WARNING: {
    title: 'Warning',
    color: '#d6ba02', // Yellow
  },
  INFO: {
    title: 'Info',
    color: '#0262c2', // Blue
  },
  CLEARED: {
    title: 'Cleared',
    color: '#018524', // Green
  },
  SUPPRESSED: {
    title: 'Suppressed',
    color: '#b0b0b0', // Gray
  },
  ACKNOWLEDGED: {
    title: 'Acknowledged',
    color: '#b0b0b0', // Gray
  },
} as const;

/**
 * Creates a standardized alarm stat panel for displaying alarm counts.
 *
 * This factory function generates stat panels with consistent styling across all
 * dashboard sections (IMM Domain, Standalone, Unified Edge). The visualization
 * configuration is standardized, with only the data source and colors varying.
 *
 * @param config - Configuration object containing title, query runner, and threshold color
 * @returns A configured VizPanel (stat panel) ready to be added to a scene layout
 *
 * @example
 * ```typescript
 * const criticalStat = createAlarmStatPanel({
 *   title: ALARM_TYPES.CRITICAL.title,
 *   queryRunner: criticalQueryRunner,
 *   thresholdColor: ALARM_TYPES.CRITICAL.color,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Custom alarm type
 * const customStat = createAlarmStatPanel({
 *   title: 'Custom Alert',
 *   queryRunner: myQueryRunner,
 *   thresholdColor: '#ff5500',
 * });
 * ```
 */
export function createAlarmStatPanel(config: AlarmStatPanelConfig): VizPanel {
  const { title, queryRunner, thresholdColor } = config;

  return PanelBuilders.stat()
    .setTitle(title)
    .setMenu(undefined)
    .setData(queryRunner)
    .setOption('graphMode', 'none' as any)
    .setOption('textMode', 'value' as any)
    .setOption('colorMode', 'background' as any)
    .setOption('orientation', 'vertical' as any)
    .setOption('textSize' as any, {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels' as any, false as any)
    .setOption('showThresholdMarkers' as any, false as any)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        // @ts-ignore
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute' as any as any,
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 0, color: '#181b1f' },
            { value: 1, color: thresholdColor },
          ],
        });
      return builder.build();
    })
    .build();
}
