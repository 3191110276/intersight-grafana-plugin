/**
 * SFP Tab - IMM Domain Scene
 *
 * Displays SFP transceiver metrics with table view and drilldown functionality.
 * Shows 5 metrics (Current, Voltage, RX Power, TX Power, Temperature) joined by Identifier.
 */

import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
  behaviors,
} from '@grafana/scenes';
import { DashboardCursorSync } from '@grafana/data';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { EmptyStateScene } from '../../components/EmptyStateScene';
import { getEmptyStateScenario } from '../../utils/emptyStateHelpers';

// ============================================================================
// QUERY DEFINITIONS
// ============================================================================

/**
 * Query A: Current (includes all dimension columns for the table)
 */
const currentQuery = {
  refId: 'A',
  queryType: 'infinity',
  type: 'json',
  source: 'url',
  parser: 'backend',
  format: 'timeseries',
  url: '/api/v1/telemetry/TimeSeries',
  root_selector: '',
  columns: [
    { selector: 'timestamp', text: 'Time', type: 'timestamp' },
    { selector: 'event.domain_name', text: 'Domain', type: 'string' },
    { selector: 'event.host_name', text: 'Hostname', type: 'string' },
    { selector: 'event.port_name', text: 'Port', type: 'string' },
    { selector: 'event.Identifier', text: 'Identifier', type: 'string' },
    { selector: 'event.current', text: 'Current', type: 'number' },
    { selector: 'event.model', text: 'Model', type: 'string' },
    { selector: 'event.serial_number', text: 'Serial Number', type: 'string' },
  ],
  url_options: {
    method: 'POST',
    body_type: 'raw',
    body_content_type: 'application/json',
    data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "Identifier",
      "domain_name",
      "host_name",
      "port_name",
      "model",
      "serial_number"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "parent.name",
      "outputName": "port_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + host_name + port_name)",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "in",
          "dimension": "instrument.name",
          "values": ["hw.current"]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "current",
        "fieldName": "hw.current_max"
      }
    ]
  }`,
  },
} as any;

/**
 * Query B: Voltage
 */
const voltageQuery = {
  refId: 'B',
  queryType: 'infinity',
  type: 'json',
  source: 'url',
  parser: 'backend',
  format: 'timeseries',
  url: '/api/v1/telemetry/TimeSeries',
  root_selector: '',
  columns: [
    { selector: 'timestamp', text: 'Time', type: 'timestamp' },
    { selector: 'event.Identifier', text: 'Identifier', type: 'string' },
    { selector: 'event.voltage', text: 'Voltage', type: 'number' },
  ],
  url_options: {
    method: 'POST',
    body_type: 'raw',
    body_content_type: 'application/json',
    data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "Identifier"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "parent.name",
      "outputName": "port_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + host_name + port_name)",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.voltage"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "voltage",
        "fieldName": "hw.voltage_max"
      }
    ]
  }`,
  },
} as any;

/**
 * Query C: RX Power (with post-aggregation * 10000)
 */
const rxPowerQuery = {
  refId: 'C',
  queryType: 'infinity',
  type: 'json',
  source: 'url',
  parser: 'backend',
  format: 'timeseries',
  url: '/api/v1/telemetry/TimeSeries',
  root_selector: '',
  columns: [
    { selector: 'timestamp', text: 'Time', type: 'timestamp' },
    { selector: 'event.Identifier', text: 'Identifier', type: 'string' },
    { selector: 'event.rx_power', text: 'RX Power', type: 'number' },
  ],
  url_options: {
    method: 'POST',
    body_type: 'raw',
    body_content_type: 'application/json',
    data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "Identifier"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "parent.name",
      "outputName": "port_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + host_name + port_name)",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.signal_power"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "rx_power_base",
        "fieldName": "hw.signal_power_receive_max"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "rx_power",
        "expression": "(\\"rx_power_base\\" * 10000)"
      }
    ]
  }`,
  },
} as any;

/**
 * Query D: TX Power (with post-aggregation * 10000)
 */
const txPowerQuery = {
  refId: 'D',
  queryType: 'infinity',
  type: 'json',
  source: 'url',
  parser: 'backend',
  format: 'timeseries',
  url: '/api/v1/telemetry/TimeSeries',
  root_selector: '',
  columns: [
    { selector: 'timestamp', text: 'Time', type: 'timestamp' },
    { selector: 'event.Identifier', text: 'Identifier', type: 'string' },
    { selector: 'event.tx_power', text: 'TX Power', type: 'number' },
  ],
  url_options: {
    method: 'POST',
    body_type: 'raw',
    body_content_type: 'application/json',
    data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "Identifier"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "parent.name",
      "outputName": "port_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + host_name + port_name)",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.signal_power"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "tx_power_base",
        "fieldName": "hw.signal_power_transmit_max"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "tx_power",
        "expression": "(\\"tx_power_base\\" * 10000)"
      }
    ]
  }`,
  },
} as any;

/**
 * Query E: Temperature (sensor_location = fi_transceiver_lane_1)
 */
const temperatureQuery = {
  refId: 'E',
  queryType: 'infinity',
  type: 'json',
  source: 'url',
  parser: 'backend',
  format: 'timeseries',
  url: '/api/v1/telemetry/TimeSeries',
  root_selector: '',
  columns: [
    { selector: 'timestamp', text: 'Time', type: 'timestamp' },
    { selector: 'event.Identifier', text: 'Identifier', type: 'string' },
    { selector: 'event.temperature', text: 'Temperature', type: 'number' },
  ],
  url_options: {
    method: 'POST',
    body_type: 'raw',
    body_content_type: 'application/json',
    data: `  {
    "queryType": "groupBy",
    "dataSource": "PhysicalEntities",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "Identifier"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "intersight.domain.name",
      "outputName": "domain_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "parent.name",
      "outputName": "port_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + host_name + port_name)",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "fi_transceiver_lane_1"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "temperature",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
  },
} as any;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create drilldown query by replacing DomainName variable with specific values
 * and adding host.name and parent.name filters
 *
 * Note: We use string manipulation instead of JSON.parse because the query
 * contains template variables like $__interval_ms which aren't valid JSON.
 */
function createDrilldownQuery(
  baseQuery: any,
  domainName: string,
  hostName: string,
  portName: string
): any {
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));
  const escapedDomainName = JSON.stringify(domainName);
  const escapedHostName = JSON.stringify(hostName);
  const escapedPortName = JSON.stringify(portName);

  // Replace [${DomainName:doublequote}] with specific domain
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /\[\$\{DomainName:doublequote\}\]/g,
    `[${escapedDomainName}]`
  );

  // Build the additional filter objects as JSON strings
  const hostFilter = `{
          "type": "selector",
          "dimension": "host.name",
          "value": ${escapedHostName}
        }`;

  const portFilter = `{
          "type": "selector",
          "dimension": "parent.name",
          "value": ${escapedPortName}
        }`;

  // Find the closing of the "fields" array (the last "]" before "aggregations")
  // and insert the new filters before it
  // Pattern: find the last filter object's closing "}" followed by newlines/spaces and "]"
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /(\}\s*)\n(\s*\]\s*\n\s*\},\s*\n\s*"aggregations")/,
    `$1,\n        ${hostFilter},\n        ${portFilter}\n$2`
  );

  return drilldownQuery;
}

// ============================================================================
// DRILLDOWN HEADER COMPONENT
// ============================================================================

interface DrilldownHeaderControlState extends SceneObjectState {
  hostName: string;
  portName: string;
  onBack: () => void;
}

class DrilldownHeaderControl extends SceneObjectBase<DrilldownHeaderControlState> {
  public static Component = DrilldownHeaderRenderer;
}

function DrilldownHeaderRenderer({ model }: SceneComponentProps<DrilldownHeaderControl>) {
  const { hostName, portName, onBack } = model.useState();

  return (
    <div style={{
      padding: '12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
    }}>
      <button
        onClick={onBack}
        style={{
          padding: '6px 12px',
          cursor: 'pointer',
          background: 'transparent',
          border: '1px solid rgba(204, 204, 220, 0.25)',
          borderRadius: '2px',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
        }}
      >
        <span>&larr;</span>
        <span>Back to Overview</span>
      </button>
      <div style={{
        fontSize: '18px',
        fontWeight: 500,
      }}>
        SFP: {hostName} / {portName}
      </div>
    </div>
  );
}

// ============================================================================
// CLICKABLE TABLE WRAPPER COMPONENT (extracts 3 columns)
// ============================================================================

interface ClickableTableWrapperState extends SceneObjectState {
  tablePanel: any;
  onRowClick: (domain: string, hostname: string, port: string) => void;
}

class ClickableTableWrapper extends SceneObjectBase<ClickableTableWrapperState> {
  public static Component = ClickableTableWrapperRenderer;
}

function ClickableTableWrapperRenderer({ model }: SceneComponentProps<ClickableTableWrapper>) {
  const { tablePanel, onRowClick } = model.useState();

  const handleClick = (event: React.MouseEvent) => {
    const row = (event.target as HTMLElement).closest('[role="row"]');

    if (!row) {
      return;
    }

    // Extract Domain (column 1), Hostname (column 2), and Port (column 3)
    const domainCell = row.querySelector('[role="gridcell"][aria-colindex="1"]');
    const hostnameCell = row.querySelector('[role="gridcell"][aria-colindex="2"]');
    const portCell = row.querySelector('[role="gridcell"][aria-colindex="3"]');

    if (domainCell && hostnameCell && portCell) {
      const domain = domainCell.textContent?.trim();
      const hostname = hostnameCell.textContent?.trim();
      const port = portCell.textContent?.trim();

      if (domain && hostname && port) {
        onRowClick(domain, hostname, port);
      }
    }
  };

  return (
    <div onClick={handleClick} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
      <tablePanel.Component model={tablePanel} />
    </div>
  );
}

// ============================================================================
// INFO PANEL
// ============================================================================

function createInfoPanel() {
  return PanelBuilders.text()
    .setTitle('')
    .setOption('content', `You can find more information about the specifications and allowed ranges for SFPs in the <a href="https://copi.cisco.com" target="_blank">official Cisco SFP documentation</a>.

Please note the restrictions for SFP data:
- Direct attach cables, and other optics without DOM support will not show up here
- Intersight Advantage licenses are required for SFP metrics collection`)
    .setOption('mode', 'markdown' as any)
    .setDisplayMode('transparent')
    .build();
}

// ============================================================================
// TABLE VIEW
// ============================================================================

function createSFPTable(scene: DynamicSFPScene) {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [currentQuery, voltageQuery, rxPowerQuery, txPowerQuery, temperatureQuery],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: {
            stat: 'lastNotNull',
            timeField: 'Time',
          },
          B: {
            timeField: 'Time',
          },
          C: {
            timeField: 'Time',
          },
          D: {
            timeField: 'Time',
          },
          E: {
            timeField: 'Time',
          },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'Identifier',
          mode: 'outer',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Identifier: true,
          },
          includeByName: {},
          indexByName: {
            Domain: 1,
            Hostname: 2,
            Identifier: 0,
            Model: 4,
            Port: 3,
            'Serial Number': 5,
            'Trend #A': 6,
            'Trend #B': 7,
            'Trend #C': 8,
            'Trend #D': 9,
            'Trend #E': 10,
          },
          renameByName: {
            'Trend #A': 'Current',
            'Trend #B': 'Voltage',
            'Trend #C': 'RX Power',
            'Trend #D': 'TX Power',
            'Trend #E': 'Temperature',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('SFP Transceivers - Click row to drill down')
    .setData(dataTransformer)
    .setNoValue('No SFP data available. SFP require DOM capability, and Advantage licenses.')
    .setOption('cellHeight', 'lg' as any)
    .setOption('footer' as any, {
      enablePagination: true,
      show: false,
    })
    .setOverrides((builder) => {
      // Set sparkline color
      builder
        .matchFieldsByType('number' as any)
        .overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });

      // Current unit
      builder.matchFieldsWithName('Current').overrideUnit('amp');

      // Voltage unit
      builder.matchFieldsWithName('Voltage').overrideUnit('volt');

      // Temperature unit
      builder.matchFieldsWithName('Temperature').overrideUnit('celsius');
    })
    .build();

  return new ClickableTableWrapper({
    tablePanel,
    onRowClick: (domain: string, hostname: string, port: string) => {
      scene.drillToSFP(domain, hostname, port);
    },
  });
}

// ============================================================================
// DRILLDOWN VIEW - TIME SERIES PANELS
// ============================================================================

function createSFPTimeSeriesPanel(
  title: string,
  query: any,
  unit: string,
  domainName: string,
  hostName: string,
  portName: string
) {
  const drilldownQuery = createDrilldownQuery(query, domainName, hostName, portName);

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQuery],
  });

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(queryRunner)
    .setUnit(unit)
    .setCustomFieldConfig('drawStyle', 'line' as any)
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', { mode: 'multi' as any })
    .build();
}

function createDrilldownView(
  domainName: string,
  hostName: string,
  portName: string,
  scene: DynamicSFPScene
) {
  const drilldownHeader = new DrilldownHeaderControl({
    hostName,
    portName,
    onBack: () => scene.exitDrilldown(),
  });

  // Create the 5 time-series panels
  const currentPanel = createSFPTimeSeriesPanel(
    'Current',
    currentQuery,
    'amp',
    domainName,
    hostName,
    portName
  );

  const voltagePanel = createSFPTimeSeriesPanel(
    'Voltage',
    voltageQuery,
    'volt',
    domainName,
    hostName,
    portName
  );

  const rxPowerPanel = createSFPTimeSeriesPanel(
    'RX Power',
    rxPowerQuery,
    '',
    domainName,
    hostName,
    portName
  );

  const txPowerPanel = createSFPTimeSeriesPanel(
    'TX Power',
    txPowerQuery,
    '',
    domainName,
    hostName,
    portName
  );

  const temperaturePanel = createSFPTimeSeriesPanel(
    'Temperature',
    temperatureQuery,
    'celsius',
    domainName,
    hostName,
    portName
  );

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 50, body: drilldownHeader }),
      // Row 1: Current, Voltage, RX Power
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: currentPanel }),
            new SceneFlexItem({ ySizing: 'fill', body: voltagePanel }),
            new SceneFlexItem({ ySizing: 'fill', body: rxPowerPanel }),
          ],
        }),
      }),
      // Row 2: TX Power, Temperature
      new SceneFlexItem({
        ySizing: 'fill',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ ySizing: 'fill', body: txPowerPanel }),
            new SceneFlexItem({ ySizing: 'fill', body: temperaturePanel }),
            // Empty spacer to balance the layout
            new SceneFlexItem({ ySizing: 'fill', body: PanelBuilders.text().setTitle('').setOption('content', '').setDisplayMode('transparent').build() }),
          ],
        }),
      }),
    ],
    $behaviors: [
      new behaviors.CursorSync({ key: 'sfp-drilldown', sync: DashboardCursorSync.Tooltip }),
    ],
  });
}

// ============================================================================
// TABLE VIEW WITH INFO PANEL
// ============================================================================

function createTableView(scene: DynamicSFPScene) {
  const infoPanel = createInfoPanel();
  const sfpTable = createSFPTable(scene);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 80,
        body: infoPanel,
      }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: sfpTable,
      }),
    ],
  });
}

// ============================================================================
// DYNAMIC SFP SCENE
// ============================================================================

interface DynamicSFPSceneState extends SceneObjectState {
  body: any;
  mode: 'table' | 'drilldown';
  drilldownDomain?: string;
  drilldownHost?: string;
  drilldownPort?: string;
}

class DynamicSFPScene extends SceneObjectBase<DynamicSFPSceneState> {
  public static Component = DynamicSFPSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        // Reset drilldown when variable changes
        if (this.state.mode === 'drilldown') {
          this.exitDrilldown();
        } else {
          this.rebuildBody();
        }
      }
    },
  });

  public constructor(state: Partial<DynamicSFPSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      mode: 'table',
      ...state,
    });
  }

  public activate() {
    const result = super.activate();
    this.rebuildBody();
    return result;
  }

  public drillToSFP(domain: string, hostname: string, port: string) {
    this.setState({
      mode: 'drilldown',
      drilldownDomain: domain,
      drilldownHost: hostname,
      drilldownPort: port,
    });
    this.rebuildBody();
  }

  public exitDrilldown() {
    this.setState({
      mode: 'table',
      drilldownDomain: undefined,
      drilldownHost: undefined,
      drilldownPort: undefined,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('DomainName variable not found or not a query variable');
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({
        body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'domain' }),
      });
      return;
    }

    // Check mode and render appropriate view
    const { mode, drilldownDomain, drilldownHost, drilldownPort } = this.state;

    if (mode === 'drilldown' && drilldownDomain && drilldownHost && drilldownPort) {
      const drilldownView = createDrilldownView(
        drilldownDomain,
        drilldownHost,
        drilldownPort,
        this
      );
      this.setState({ body: drilldownView });
    } else {
      const tableView = createTableView(this);
      this.setState({ body: tableView });
    }
  }

  private getVariable(name: string): any {
    return sceneGraph.lookupVariable(name, this);
  }
}

function DynamicSFPSceneRenderer({ model }: SceneComponentProps<DynamicSFPScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export function getSFPTab() {
  return new DynamicSFPScene({});
}
