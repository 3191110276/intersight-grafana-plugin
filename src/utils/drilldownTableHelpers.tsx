import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneComponentProps,
} from '@grafana/scenes';
import { LoggingQueryRunner } from './LoggingQueryRunner';
import { LoggingDataTransformer } from './LoggingDataTransformer';
import { ClickableTableWrapper } from '../components/ClickableTableWrapper';
import { DrilldownHeaderControl } from '../components/DrilldownHeaderControl';

// ============================================================================
// TYPES
// ============================================================================

export interface DrilldownTableConfig {
  /** Query or queries to run */
  queries: any | any[];
  /** Panel title (will automatically append " - Click row to drill down" if not present) */
  title: string;
  /** Unit for value fields (e.g., 'watt', 'celsius', 'rotrpm') */
  unit?: string;
  /** Data transformations to apply */
  transformations: any[];
  /** Click handler for table rows */
  onRowClick: (name: string) => void;
  /** Additional panel builder options */
  options?: {
    /** Footer configuration (defaults to { enablePagination: true, show: false }) */
    footer?: any;
    /** Cell height (e.g., 'sm', 'md') */
    cellHeight?: string;
    /** Show header (defaults to true) */
    showHeader?: boolean;
    /** Thresholds configuration */
    thresholds?: any;
    /** Sort by configuration */
    sortBy?: any[];
  };
  /** Field overrides builder function */
  overrides?: (builder: any) => void;
  /** Max data points for query runner */
  maxDataPoints?: number;
  /** Custom datasource (defaults to '${Account}') */
  datasource?: { uid: string };
}

export interface DrilldownViewConfig {
  /** Name of the item being drilled into (e.g., chassis name, host name) */
  itemName: string;
  /** Label for the item type (e.g., 'Chassis', 'Host') */
  itemLabel: string;
  /** Text for back button (defaults to 'Back to Overview') */
  backButtonText?: string;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Body content for the drilldown view */
  body: any;
  /** Height of the header (defaults to 50) */
  headerHeight?: number;
  /** Optional behaviors for the layout */
  behaviors?: any[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a drilldown table with ClickableTableWrapper
 *
 * This helper encapsulates the common pattern of:
 * 1. Creating a LoggingQueryRunner
 * 2. Creating a LoggingDataTransformer
 * 3. Building a table panel
 * 4. Wrapping in ClickableTableWrapper
 * 5. Returning a SceneFlexLayout
 *
 * @param config - Configuration for the drilldown table
 * @returns ClickableTableWrapper with the configured table
 */
export function createDrilldownTable(config: DrilldownTableConfig): ClickableTableWrapper {
  const {
    queries,
    title,
    unit,
    transformations,
    onRowClick,
    options = {},
    overrides,
    maxDataPoints,
    datasource = { uid: '${Account}' },
  } = config;

  // Normalize queries to array
  const queriesArray = Array.isArray(queries) ? queries : [queries];

  // Create query runner
  const queryRunnerConfig: any = {
    datasource,
    queries: queriesArray,
  };
  if (maxDataPoints !== undefined) {
    queryRunnerConfig.maxDataPoints = maxDataPoints;
  }
  const queryRunner = new LoggingQueryRunner(queryRunnerConfig);

  // Create data transformer
  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations,
  });

  // Build table panel
  let panelBuilder = PanelBuilders.table()
    .setTitle(title)
    .setData(dataTransformer);

  // Apply unit if provided
  if (unit) {
    panelBuilder = panelBuilder.setUnit(unit);
  }

  // Apply footer options (with defaults)
  const footerOptions = options.footer !== undefined
    ? options.footer
    : { enablePagination: true, show: false };
  panelBuilder = panelBuilder.setOption('footer' as any, footerOptions);

  // Apply optional settings
  if (options.cellHeight) {
    panelBuilder = panelBuilder.setOption('cellHeight', options.cellHeight as any);
  }
  if (options.showHeader !== undefined) {
    panelBuilder = panelBuilder.setOption('showHeader', options.showHeader);
  }
  if (options.thresholds) {
    panelBuilder = panelBuilder.setThresholds(options.thresholds);
  }
  if (options.sortBy) {
    panelBuilder = panelBuilder.setOption('sortBy', options.sortBy);
  }

  // Apply field overrides if provided
  if (overrides) {
    panelBuilder = panelBuilder.setOverrides(overrides);
  }

  const tablePanel = panelBuilder.build();

  // Wrap in ClickableTableWrapper
  return new ClickableTableWrapper({
    tablePanel,
    onRowClick,
  });
}

/**
 * Creates a drilldown table wrapped in a SceneFlexLayout
 *
 * Same as createDrilldownTable but returns a SceneFlexLayout for direct use in scenes
 */
export function createDrilldownTableLayout(config: DrilldownTableConfig): SceneFlexLayout {
  const clickableTable = createDrilldownTable(config);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: clickableTable,
      }),
    ],
  });
}

/**
 * Creates a drilldown view with header and body
 *
 * This helper encapsulates the common pattern of:
 * 1. Creating a DrilldownHeaderControl
 * 2. Wrapping it with the body in a SceneFlexLayout
 *
 * @param config - Configuration for the drilldown view
 * @returns SceneFlexLayout with header and body
 */
export function createDrilldownView(config: DrilldownViewConfig): SceneFlexLayout {
  const {
    itemName,
    itemLabel,
    backButtonText = 'Back to Overview',
    onBack,
    body,
    headerHeight = 50,
    behaviors,
  } = config;

  const drilldownHeader = new DrilldownHeaderControl({
    itemName,
    itemLabel,
    backButtonText,
    onBack,
  });

  const layoutConfig: any = {
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: headerHeight,
        body: drilldownHeader,
      }),
      new SceneFlexItem({
        ySizing: 'fill',
        body,
      }),
    ],
  };

  if (behaviors) {
    layoutConfig.$behaviors = behaviors;
  }

  return new SceneFlexLayout(layoutConfig);
}

/**
 * Creates a drilldown view with a single panel
 *
 * Convenience helper for the common case of drilling down to a single panel
 */
export function createSinglePanelDrilldownView(
  itemName: string,
  itemLabel: string,
  onBack: () => void,
  panel: any
): SceneFlexLayout {
  return createDrilldownView({
    itemName,
    itemLabel,
    onBack,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          ySizing: 'fill',
          body: panel,
        }),
      ],
    }),
  });
}
