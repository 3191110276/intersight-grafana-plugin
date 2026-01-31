import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
  SceneObjectBase,
  behaviors,
} from '@grafana/scenes';
import { DashboardCursorSync } from '@grafana/data';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { DrilldownHeaderControl } from '../../components/DrilldownHeaderControl';
import { ClickableTableWrapper } from '../../components/ClickableTableWrapper';
import { SharedDrilldownState } from '../../utils/drilldownState';
import { getChassisCount, createDrilldownQuery } from '../../utils/drilldownHelpers';
import { DrilldownDetailsContainer, DrilldownDetailsContainerState, DrilldownDetailsContainerRenderer } from '../../utils/DrilldownDetailsContainer';
import { createInfinityPostQuery, createTimeseriesQuery } from '../../utils/infinityQueryHelpers';
import { API_ENDPOINTS, COLUMN_WIDTHS } from './constants';

// ============================================================================
// TRAFFIC BALANCE DETAILS CONTAINER
// ============================================================================

interface TrafficBalanceDetailsContainerState extends DrilldownDetailsContainerState {}

/**
 * Container scene that manages conditional rendering and drilldown for traffic balance details
 * Extends DrilldownDetailsContainer to eliminate boilerplate code
 */
class TrafficBalanceDetailsContainer extends DrilldownDetailsContainer<TrafficBalanceDetailsContainerState> {
  public static Component = DrilldownDetailsContainerRenderer;

  public constructor() {
    super(
      {
        body: new SceneFlexLayout({ children: [] }),
      },
      {
        multiViewThreshold: 15, // Show line charts for ≤15 chassis, tables for >15
        emptyStateTitle: 'Traffic Balance Details',
        emptyStateMessage: '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.',
      }
    );
  }

  // ============================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================================

  protected createDrilldownView(target: string): any {
    return createDrilldownView(target, this);
  }

  protected createSingleView(count: number): any {
    return createLineChartView(this);
  }

  protected createMultiView(count: number): any {
    return createTableView(this);
  }

  protected createEmptyState(): any {
    const emptyStatePanel = PanelBuilders.text()
      .setTitle('Traffic Balance Details')
      .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.')
      .setOption('mode', 'markdown' as any)
      .setDisplayMode('transparent')
      .build();

    return new SceneFlexLayout({
      children: [
        new SceneFlexItem({ ySizing: 'fill', body: emptyStatePanel })
      ]
    });
  }
}

// ============================================================================
// VIEW CREATION FUNCTIONS
// ============================================================================

/**
 * Create line chart view for ≤15 chassis
 * Shows 4 timeseries panels (2x2 grid) with shared cursor sync
 */
function createLineChartView(scene: SceneObjectBase) {
  const panel189 = createPanel189_LineChart(false);
  const panel190 = createPanel190_LineChart(false);
  const panel191 = createPanel191_LineChart(false);
  const panel192 = createPanel192_LineChart(false);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Row 1: Transmit panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: panel189 }),
            new SceneFlexItem({ ySizing: 'fill', body: panel190 }),
          ],
        }),
      }),
      // Row 2: Receive panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: panel191 }),
            new SceneFlexItem({ ySizing: 'fill', body: panel192 }),
          ],
        }),
      }),
    ],
    $behaviors: [
      new behaviors.CursorSync({ key: 'traffic-balance-details', sync: DashboardCursorSync.Tooltip }),
    ],
  });
}

/**
 * Create table view for >15 chassis
 * Shows 4 table panels with drilldown capability
 */
function createTableView(parent: TrafficBalanceDetailsContainer) {
  const table189 = createPanel189_Table(parent);
  const table190 = createPanel190_Table(parent);
  const table191 = createPanel191_Table(parent);
  const table192 = createPanel192_Table(parent);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Row 1: Transmit panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: table189 }),
            new SceneFlexItem({ ySizing: 'fill', body: table190 }),
          ],
        }),
      }),
      // Row 2: Receive panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: table191 }),
            new SceneFlexItem({ ySizing: 'fill', body: table192 }),
          ],
        }),
      }),
    ],
  });
}

/**
 * Create drilldown view for specific chassis
 * Shows header + 4 timeseries panels with shared cursor sync
 */
function createDrilldownView(chassisName: string, parent: TrafficBalanceDetailsContainer) {
  const drilldownHeader = new DrilldownHeaderControl({
    itemName: chassisName,
    itemLabel: 'Chassis',
    backButtonText: 'Back to Overview',
    onBack: () => parent.exitDrilldown(),
  });

  const panel189 = createPanel189_LineChart(true, chassisName);
  const panel190 = createPanel190_LineChart(true, chassisName);
  const panel191 = createPanel191_LineChart(true, chassisName);
  const panel192 = createPanel192_LineChart(true, chassisName);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 50, body: drilldownHeader }),
      // Row 1: Transmit panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: panel189 }),
            new SceneFlexItem({ ySizing: 'fill', body: panel190 }),
          ],
        }),
      }),
      // Row 2: Receive panels
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: panel191 }),
            new SceneFlexItem({ ySizing: 'fill', body: panel192 }),
          ],
        }),
      }),
    ],
    $behaviors: [
      new behaviors.CursorSync({ key: 'traffic-balance-details-drilldown', sync: DashboardCursorSync.Tooltip }),
    ],
  });
}

// ============================================================================
// PANEL CREATION FUNCTIONS
// ============================================================================

// Panel 189: A: Eth uplink transmit utilization per chassis (Sum)
function createPanel189_LineChart(isDrilldown: boolean, chassisName?: string) {
  const baseQuery = createTimeseriesQuery({
    refId: 'A',
    format: 'timeseries',
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [{
      type: 'nested-field',
      columnName: 'intersight.domain.name',
      outputName: 'domain_name',
      expectedType: 'STRING',
      path: '$',
    }],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: '[\${ChassisName:doublequote}]',
        },
        {
          type: 'search',
          dimension: 'host.name',
          query: {
            type: 'insensitive_contains',
            value: ' eCMC-A',
          },
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: 'ethernet',
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: 'eth_uplink',
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: [
      {
        type: 'doubleSum',
        name: 'sum',
        fieldName: 'hw.network.io_transmit',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.sum', text: 'Utilization', type: 'number' },
    ],
  });

  const query = isDrilldown && chassisName
    ? createDrilldownQuery(baseQuery, chassisName)
    : baseQuery;

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [query as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Utilization (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const title = isDrilldown && chassisName
    ? `A: Eth transmit for ${chassisName}`
    : 'A: Eth uplink transmit utilization per chassis (Sum)';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit('decbytes')
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

// Panel 190: B: Eth uplink transmit utilization per chassis (Sum)
function createPanel190_LineChart(isDrilldown: boolean, chassisName?: string) {
  const baseQuery = createTimeseriesQuery({
    refId: 'A',
    format: 'timeseries',
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [{
      type: 'nested-field',
      columnName: 'intersight.domain.name',
      outputName: 'domain_name',
      expectedType: 'STRING',
      path: '$',
    }],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: '[\${ChassisName:doublequote}]',
        },
        {
          type: 'search',
          dimension: 'host.name',
          query: {
            type: 'insensitive_contains',
            value: ' eCMC-B',
          },
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: 'ethernet',
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: 'eth_uplink',
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: [
      {
        type: 'doubleSum',
        name: 'sum',
        fieldName: 'hw.network.io_transmit',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.sum', text: 'Utilization', type: 'number' },
    ],
  });

  const query = isDrilldown && chassisName
    ? createDrilldownQuery(baseQuery, chassisName)
    : baseQuery;

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [query as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Utilization (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const title = isDrilldown && chassisName
    ? `B: Eth transmit for ${chassisName}`
    : 'B: Eth uplink transmit utilization per chassis (Sum)';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit('decbytes')
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

// Panel 191: A: Eth uplink receive utilization per chassis (Sum)
function createPanel191_LineChart(isDrilldown: boolean, chassisName?: string) {
  const baseQuery = createTimeseriesQuery({
    refId: 'A',
    format: 'timeseries',
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [{
      type: 'nested-field',
      columnName: 'intersight.domain.name',
      outputName: 'domain_name',
      expectedType: 'STRING',
      path: '$',
    }],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: '[\${ChassisName:doublequote}]',
        },
        {
          type: 'search',
          dimension: 'host.name',
          query: {
            type: 'insensitive_contains',
            value: ' eCMC-A',
          },
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: 'ethernet',
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: 'eth_uplink',
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: [
      {
        type: 'doubleSum',
        name: 'sum',
        fieldName: 'hw.network.io_receive',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.sum', text: 'Utilization', type: 'number' },
    ],
  });

  const query = isDrilldown && chassisName
    ? createDrilldownQuery(baseQuery, chassisName)
    : baseQuery;

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [query as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Utilization (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const title = isDrilldown && chassisName
    ? `A: Eth receive for ${chassisName}`
    : 'A: Eth uplink receive utilization per chassis (Sum)';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit('decbytes')
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

// Panel 192: B: Eth uplink receive utilization per chassis (Sum)
function createPanel192_LineChart(isDrilldown: boolean, chassisName?: string) {
  const baseQuery = createTimeseriesQuery({
    refId: 'A',
    format: 'timeseries',
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [{
      type: 'nested-field',
      columnName: 'intersight.domain.name',
      outputName: 'domain_name',
      expectedType: 'STRING',
      path: '$',
    }],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: '[\${ChassisName:doublequote}]',
        },
        {
          type: 'search',
          dimension: 'host.name',
          query: {
            type: 'insensitive_contains',
            value: ' eCMC-B',
          },
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: 'ethernet',
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: 'eth_uplink',
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: [
      {
        type: 'doubleSum',
        name: 'sum',
        fieldName: 'hw.network.io_receive',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.sum', text: 'Utilization', type: 'number' },
    ],
  });

  const query = isDrilldown && chassisName
    ? createDrilldownQuery(baseQuery, chassisName)
    : baseQuery;

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [query as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Utilization (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const title = isDrilldown && chassisName
    ? `B: Eth receive for ${chassisName}`
    : 'B: Eth uplink receive utilization per chassis (Sum)';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit('decbytes')
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

// ============================================================================
// TABLE PANEL CREATION FUNCTIONS
// ============================================================================

// Panel 189: A: Eth uplink transmit utilization per chassis (Table)
function createPanel189_Table(parent: TrafficBalanceDetailsContainer) {
  const baseQuery = createTimeseriesQuery({
    refId: 'A',
    format: 'timeseries',
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [{
      type: 'nested-field',
      columnName: 'intersight.domain.name',
      outputName: 'domain_name',
      expectedType: 'STRING',
      path: '$',
    }],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: '[\${ChassisName:doublequote}]',
        },
        {
          type: 'search',
          dimension: 'host.name',
          query: {
            type: 'insensitive_contains',
            value: ' eCMC-A',
          },
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: 'ethernet',
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: 'eth_uplink',
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: [
      {
        type: 'doubleSum',
        name: 'sum',
        fieldName: 'hw.network.io_transmit',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.sum', text: 'Utilization', type: 'number' },
    ],
  });

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [baseQuery as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Utilization (.*)',
          renamePattern: '$1',
        },
      },
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            'Domain Name': 0,
            'Utilization': 1,
          },
          renameByName: {
            'Domain Name': 'Chassis Name',
            'Trend #A': 'Utilization',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('A: Eth uplink transmit utilization per chassis - Click row to drill down')
    .setData(transformer)
    .setUnit('decbytes')
    .setOption('sortBy', [{ displayName: 'Utilization', desc: true }])
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Utilization')
        .overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });

      builder.matchFieldsWithName('Chassis Name').overrideCustomFieldConfig('width', 240);
    })
    .build();

  return new ClickableTableWrapper({
    tablePanel,
    onRowClick: (chassisName: string) => parent.drillToChassis(chassisName),
  });
}

// Panel 190: B: Eth uplink transmit utilization per chassis (Table)
function createPanel190_Table(parent: TrafficBalanceDetailsContainer) {
  const baseQuery = createTimeseriesQuery({
    refId: 'A',
    format: 'timeseries',
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [{
      type: 'nested-field',
      columnName: 'intersight.domain.name',
      outputName: 'domain_name',
      expectedType: 'STRING',
      path: '$',
    }],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: '[\${ChassisName:doublequote}]',
        },
        {
          type: 'search',
          dimension: 'host.name',
          query: {
            type: 'insensitive_contains',
            value: ' eCMC-B',
          },
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: 'ethernet',
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: 'eth_uplink',
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: [
      {
        type: 'doubleSum',
        name: 'sum',
        fieldName: 'hw.network.io_transmit',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.sum', text: 'Utilization', type: 'number' },
    ],
  });

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [baseQuery as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Utilization (.*)',
          renamePattern: '$1',
        },
      },
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            'Domain Name': 0,
            'Utilization': 1,
          },
          renameByName: {
            'Domain Name': 'Chassis Name',
            'Trend #A': 'Utilization',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('B: Eth uplink transmit utilization per chassis - Click row to drill down')
    .setData(transformer)
    .setUnit('decbytes')
    .setOption('sortBy', [{ displayName: 'Utilization', desc: true }])
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Utilization')
        .overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });

      builder.matchFieldsWithName('Chassis Name').overrideCustomFieldConfig('width', 240);
    })
    .build();

  return new ClickableTableWrapper({
    tablePanel,
    onRowClick: (chassisName: string) => parent.drillToChassis(chassisName),
  });
}

// Panel 191: A: Eth uplink receive utilization per chassis (Table)
function createPanel191_Table(parent: TrafficBalanceDetailsContainer) {
  const baseQuery = createTimeseriesQuery({
    refId: 'A',
    format: 'timeseries',
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [{
      type: 'nested-field',
      columnName: 'intersight.domain.name',
      outputName: 'domain_name',
      expectedType: 'STRING',
      path: '$',
    }],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: '[\${ChassisName:doublequote}]',
        },
        {
          type: 'search',
          dimension: 'host.name',
          query: {
            type: 'insensitive_contains',
            value: ' eCMC-A',
          },
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: 'ethernet',
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: 'eth_uplink',
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: [
      {
        type: 'doubleSum',
        name: 'sum',
        fieldName: 'hw.network.io_receive',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.sum', text: 'Utilization', type: 'number' },
    ],
  });

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [baseQuery as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Utilization (.*)',
          renamePattern: '$1',
        },
      },
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            'Domain Name': 0,
            'Utilization': 1,
          },
          renameByName: {
            'Domain Name': 'Chassis Name',
            'Trend #A': 'Utilization',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('A: Eth uplink receive utilization per chassis - Click row to drill down')
    .setData(transformer)
    .setUnit('decbytes')
    .setOption('sortBy', [{ displayName: 'Utilization', desc: true }])
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Utilization')
        .overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });

      builder.matchFieldsWithName('Chassis Name').overrideCustomFieldConfig('width', 240);
    })
    .build();

  return new ClickableTableWrapper({
    tablePanel,
    onRowClick: (chassisName: string) => parent.drillToChassis(chassisName),
  });
}

// Panel 192: B: Eth uplink receive utilization per chassis (Table)
function createPanel192_Table(parent: TrafficBalanceDetailsContainer) {
  const baseQuery = createTimeseriesQuery({
    refId: 'A',
    format: 'timeseries',
    dataSource: 'NetworkInterfaces',
    dimensions: ['domain_name'],
    virtualColumns: [{
      type: 'nested-field',
      columnName: 'intersight.domain.name',
      outputName: 'domain_name',
      expectedType: 'STRING',
      path: '$',
    }],
    filter: {
      type: 'and',
      fields: [
        {
          type: 'in',
          dimension: 'intersight.domain.name',
          values: '[\${ChassisName:doublequote}]',
        },
        {
          type: 'search',
          dimension: 'host.name',
          query: {
            type: 'insensitive_contains',
            value: ' eCMC-B',
          },
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.type',
          value: 'ethernet',
        },
        {
          type: 'selector',
          dimension: 'hw.network.port.role',
          value: 'eth_uplink',
        },
        {
          type: 'selector',
          dimension: 'instrument.name',
          value: 'hw.network',
        },
      ],
    },
    aggregations: [
      {
        type: 'doubleSum',
        name: 'sum',
        fieldName: 'hw.network.io_receive',
      },
    ],
    columns: [
      { selector: 'timestamp', text: 'Time', type: 'timestamp' },
      { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
      { selector: 'event.sum', text: 'Utilization', type: 'number' },
    ],
  });

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [baseQuery as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Utilization (.*)',
          renamePattern: '$1',
        },
      },
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            'Domain Name': 0,
            'Utilization': 1,
          },
          renameByName: {
            'Domain Name': 'Chassis Name',
            'Trend #A': 'Utilization',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('B: Eth uplink receive utilization per chassis - Click row to drill down')
    .setData(transformer)
    .setUnit('decbytes')
    .setOption('sortBy', [{ displayName: 'Utilization', desc: true }])
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Utilization')
        .overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });

      builder.matchFieldsWithName('Chassis Name').overrideCustomFieldConfig('width', 240);
    })
    .build();

  return new ClickableTableWrapper({
    tablePanel,
    onRowClick: (chassisName: string) => parent.drillToChassis(chassisName),
  });
}

export function getTrafficBalanceTab() {
  // Create shared drilldown state
  const sharedDrilldownState = new SharedDrilldownState({
    variableName: 'ChassisName',
    initialMode: 'overview',
  });

  // Row 1: Overview
  const overviewRow = new SceneGridRow({
    title: 'Overview',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({ x: 0, y: 0, width: 6, height: 5, body: getPanel185_EthTransmitTrafficA() }),
      new SceneGridItem({ x: 6, y: 0, width: 6, height: 5, body: getPanel186_EthTransmitTrafficB() }),
      new SceneGridItem({ x: 12, y: 0, width: 6, height: 5, body: getPanel187_EthReceiveTrafficA() }),
      new SceneGridItem({ x: 18, y: 0, width: 6, height: 5, body: getPanel188_EthReceiveTrafficB() }),
    ],
  });

  // Row 2: Details
  const detailsRow = new SceneGridRow({
    title: 'Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 5,
    children: [
      new SceneGridItem({
        x: 0,
        y: 5,
        width: 24,
        height: 16,
        body: new TrafficBalanceDetailsContainer(),
      }),
    ],
  });

  // Main layout with collapsible rows and shared drilldown state
  return new SceneFlexLayout({
    direction: 'column',
    $behaviors: [sharedDrilldownState],
    children: [
      new SceneFlexItem({
        minHeight: 600,
        body: new SceneGridLayout({
          children: [overviewRow, detailsRow],
        }),
      }),
    ],
  });
}

// ============================================================================
// TRAFFIC BALANCE TAB - PANEL HELPERS (Panels 185-188)
// ============================================================================

// Panel 185: A: Eth transmit traffic (Sum)
function getPanel185_EthTransmitTrafficA() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      createTimeseriesQuery({
        refId: 'A',
        format: 'table',
        dataSource: 'NetworkInterfaces',
        dimensions: [],
        virtualColumns: [],
        filter: {
          type: 'and',
          fields: [
            {
              type: 'in',
              dimension: 'intersight.domain.name',
              values: '[\${ChassisName:doublequote}]',
            },
            {
              type: 'search',
              dimension: 'host.name',
              query: {
                type: 'insensitive_contains',
                value: ' eCMC-A',
              },
            },
            {
              type: 'selector',
              dimension: 'hw.network.port.type',
              value: 'ethernet',
            },
            {
              type: 'selector',
              dimension: 'hw.network.port.role',
              value: 'eth_uplink',
            },
            {
              type: 'selector',
              dimension: 'instrument.name',
              value: 'hw.network',
            },
          ],
        },
        aggregations: [
          {
            type: 'doubleSum',
            name: 'sum',
            fieldName: 'hw.network.io_transmit',
          },
        ],
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.sum', text: 'Utilization', type: 'number' },
        ],
      }),
    ],
  });

  return PanelBuilders.stat()
    .setTitle('A: Eth transmit traffic (Sum)')
    .setData(new LoggingDataTransformer({
      $data: queryRunner,
      transformations: [
        {
          id: 'groupingToMatrix',
          options: {
            columnField: 'Domain Name',
            rowField: 'Time',
            valueField: 'Utilization',
          },
        },
      ],
    }))
    .setUnit('decbytes')
    .setDecimals(1)
    .setMin(0)
    .setOption('graphMode', 'area' as any)
    .setOption('colorMode', 'none' as any)
    .setOption('textMode', 'auto' as any)
    .setOption('orientation', 'auto' as any)
    .setOption('justifyMode', 'auto' as any)
    .setThresholds({
      mode: 'percentage' as any as any,
      steps: [{ value: 0, color: 'purple' }],
    })
    .build();
}

// Panel 186: B: Eth transmit traffic (Sum)
function getPanel186_EthTransmitTrafficB() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      createTimeseriesQuery({
        refId: 'A',
        format: 'table',
        dataSource: 'NetworkInterfaces',
        dimensions: [],
        virtualColumns: [],
        filter: {
          type: 'and',
          fields: [
            {
              type: 'in',
              dimension: 'intersight.domain.name',
              values: '[\${ChassisName:doublequote}]',
            },
            {
              type: 'search',
              dimension: 'host.name',
              query: {
                type: 'insensitive_contains',
                value: ' eCMC-B',
              },
            },
            {
              type: 'selector',
              dimension: 'hw.network.port.type',
              value: 'ethernet',
            },
            {
              type: 'selector',
              dimension: 'hw.network.port.role',
              value: 'eth_uplink',
            },
            {
              type: 'selector',
              dimension: 'instrument.name',
              value: 'hw.network',
            },
          ],
        },
        aggregations: [
          {
            type: 'doubleSum',
            name: 'sum',
            fieldName: 'hw.network.io_transmit',
          },
        ],
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.sum', text: 'Utilization', type: 'number' },
        ],
      }),
    ],
  });

  return PanelBuilders.stat()
    .setTitle('B: Eth transmit traffic (Sum)')
    .setData(new LoggingDataTransformer({
      $data: queryRunner,
      transformations: [
        {
          id: 'groupingToMatrix',
          options: {
            columnField: 'Domain Name',
            rowField: 'Time',
            valueField: 'Utilization',
          },
        },
      ],
    }))
    .setUnit('decbytes')
    .setDecimals(1)
    .setMin(0)
    .setOption('graphMode', 'area' as any)
    .setOption('colorMode', 'none' as any)
    .setOption('textMode', 'auto' as any)
    .setOption('orientation', 'auto' as any)
    .setOption('justifyMode', 'auto' as any)
    .setThresholds({
      mode: 'percentage' as any as any,
      steps: [{ value: 0, color: 'purple' }],
    })
    .build();
}

// Panel 187: A: Eth receive traffic (Sum)
function getPanel187_EthReceiveTrafficA() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      createTimeseriesQuery({
        refId: 'A',
        format: 'table',
        dataSource: 'NetworkInterfaces',
        dimensions: [],
        virtualColumns: [],
        filter: {
          type: 'and',
          fields: [
            {
              type: 'in',
              dimension: 'intersight.domain.name',
              values: '[\${ChassisName:doublequote}]',
            },
            {
              type: 'search',
              dimension: 'host.name',
              query: {
                type: 'insensitive_contains',
                value: ' eCMC-A',
              },
            },
            {
              type: 'selector',
              dimension: 'hw.network.port.type',
              value: 'ethernet',
            },
            {
              type: 'selector',
              dimension: 'hw.network.port.role',
              value: 'eth_uplink',
            },
            {
              type: 'selector',
              dimension: 'instrument.name',
              value: 'hw.network',
            },
          ],
        },
        aggregations: [
          {
            type: 'doubleSum',
            name: 'sum',
            fieldName: 'hw.network.io_receive',
          },
        ],
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.sum', text: 'Utilization', type: 'number' },
        ],
      }),
    ],
  });

  return PanelBuilders.stat()
    .setTitle('A: Eth receive traffic (Sum)')
    .setData(new LoggingDataTransformer({
      $data: queryRunner,
      transformations: [
        {
          id: 'groupingToMatrix',
          options: {
            columnField: 'Domain Name',
            rowField: 'Time',
            valueField: 'Utilization',
          },
        },
      ],
    }))
    .setUnit('decbytes')
    .setDecimals(1)
    .setMin(0)
    .setOption('graphMode', 'area' as any)
    .setOption('colorMode', 'none' as any)
    .setOption('textMode', 'auto' as any)
    .setOption('orientation', 'auto' as any)
    .setOption('justifyMode', 'auto' as any)
    .setThresholds({
      mode: 'percentage' as any as any,
      steps: [{ value: 0, color: 'blue' }],
    })
    .build();
}

// Panel 188: B: Eth receive traffic (Sum)
function getPanel188_EthReceiveTrafficB() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      createTimeseriesQuery({
        refId: 'A',
        format: 'table',
        dataSource: 'NetworkInterfaces',
        dimensions: [],
        virtualColumns: [],
        filter: {
          type: 'and',
          fields: [
            {
              type: 'in',
              dimension: 'intersight.domain.name',
              values: '[\${ChassisName:doublequote}]',
            },
            {
              type: 'search',
              dimension: 'host.name',
              query: {
                type: 'insensitive_contains',
                value: ' eCMC-B',
              },
            },
            {
              type: 'selector',
              dimension: 'hw.network.port.type',
              value: 'ethernet',
            },
            {
              type: 'selector',
              dimension: 'hw.network.port.role',
              value: 'eth_uplink',
            },
            {
              type: 'selector',
              dimension: 'instrument.name',
              value: 'hw.network',
            },
          ],
        },
        aggregations: [
          {
            type: 'doubleSum',
            name: 'sum',
            fieldName: 'hw.network.io_receive',
          },
        ],
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.sum', text: 'Utilization', type: 'number' },
        ],
      }),
    ],
  });

  return PanelBuilders.stat()
    .setTitle('B: Eth receive traffic (Sum)')
    .setData(new LoggingDataTransformer({
      $data: queryRunner,
      transformations: [
        {
          id: 'groupingToMatrix',
          options: {
            columnField: 'Domain Name',
            rowField: 'Time',
            valueField: 'Utilization',
          },
        },
      ],
    }))
    .setUnit('decbytes')
    .setDecimals(1)
    .setMin(0)
    .setOption('graphMode', 'area' as any)
    .setOption('colorMode', 'none' as any)
    .setOption('textMode', 'auto' as any)
    .setOption('orientation', 'auto' as any)
    .setOption('justifyMode', 'auto' as any)
    .setThresholds({
      mode: 'percentage' as any as any,
      steps: [{ value: 0, color: 'blue' }],
    })
    .build();
}
