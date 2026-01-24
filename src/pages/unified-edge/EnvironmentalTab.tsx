import React from 'react';
import {
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract parent chassis name from host/blade name
 * Unified Edge pattern: "Beta04-WZP29229Y9A-1" → "Beta04-WZP29229Y9A"
 */
function extractChassisFromHost(hostName: string): string | null {
  const lastDashIndex = hostName.lastIndexOf('-');

  if (lastDashIndex === -1) {
    return null; // No dash found
  }

  const afterDash = hostName.substring(lastDashIndex + 1);

  // Check if what follows the last dash is a number (blade number)
  if (/^\d+$/.test(afterDash)) {
    return hostName.substring(0, lastDashIndex);
  }

  return null; // Not a blade naming pattern
}

/**
 * Create drilldown query by replacing ChassisName variable with hardcoded value
 * Pattern from standalone/EnvironmentalTab.tsx:24-38
 */
function createDrilldownQuery(baseQuery: any, chassisName: string): any {
  const drilldownQuery = JSON.parse(JSON.stringify(baseQuery));
  const escapedChassisName = JSON.stringify(chassisName);

  // Replace [${ChassisName:doublequote}] with ["chassisName"]
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /\[\$\{ChassisName:doublequote\}\]/g,
    `[${escapedChassisName}]`
  );

  // Replace ^${ChassisName:regex} with ^chassisName (for host queries)
  drilldownQuery.url_options.data = drilldownQuery.url_options.data.replace(
    /\^\$\{ChassisName:regex\}/g,
    `^${chassisName}`
  );

  return drilldownQuery;
}

/**
 * Get chassis count from ChassisName variable
 * Used to determine line graph vs table threshold
 */
function getChassisCount(scene: SceneObjectBase): number {
  const variable = sceneGraph.lookupVariable('ChassisName', scene);
  if (!variable || !('state' in variable)) {
    return 0;
  }

  const value = (variable.state as any).value;

  if (Array.isArray(value)) {
    return value.filter(v => v && v !== '$__all').length;
  } else if (value && value !== '$__all') {
    return 1;
  }

  return 0;
}

/**
 * Get selected chassis names as array
 */
function getSelectedChassis(scene: SceneObjectBase): string[] {
  const variable = sceneGraph.lookupVariable('ChassisName', scene);
  if (!variable || !('state' in variable)) {
    return [];
  }

  const value = (variable.state as any).value;

  if (Array.isArray(value)) {
    return value.filter(v => v && v !== '$__all').map(v => String(v));
  } else if (value && value !== '$__all') {
    return [String(value)];
  }

  return [];
}

// ============================================================================
// DRILLDOWN HEADER COMPONENT (Header + Back Button)
// ============================================================================

interface DrilldownHeaderControlState extends SceneObjectState {
  chassisName?: string;
  hostName?: string;
  onBack: () => void;
}

class DrilldownHeaderControl extends SceneObjectBase<DrilldownHeaderControlState> {
  public static Component = DrilldownHeaderRenderer;
}

function DrilldownHeaderRenderer({ model }: SceneComponentProps<DrilldownHeaderControl>) {
  const { chassisName, hostName, onBack } = model.useState();

  const displayText = hostName
    ? `Host: ${hostName}`
    : `Chassis: ${chassisName}`;

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
        Drilldown: {displayText}
      </div>
    </div>
  );
}

// ============================================================================
// CLICKABLE TABLE WRAPPER COMPONENT
// ============================================================================

interface ClickableTableWrapperState extends SceneObjectState {
  tablePanel: any;
  onRowClick: (name: string) => void;
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

    const firstCell = row.querySelector('[role="gridcell"][aria-colindex="1"]');

    if (firstCell) {
      const name = firstCell.textContent?.trim();

      if (name) {
        onRowClick(name);
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
// SYNCHRONIZED POWER CONSUMPTION CONTAINER
// ============================================================================

interface SynchronizedPowerConsumptionContainerState extends SceneObjectState {
  mode: 'overview' | 'chassis-drilldown' | 'host-drilldown';
  chassisName?: string;
  hostName?: string;
  body: any;
}

/**
 * Container scene that manages synchronized drilldown state for both
 * chassis and host power consumption panels
 */
class SynchronizedPowerConsumptionContainer extends SceneObjectBase<SynchronizedPowerConsumptionContainerState> {
  public static Component = SynchronizedPowerConsumptionContainerRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      // Reset to overview when chassis variable changes
      if (this.state.mode !== 'overview') {
        this.exitDrilldown();
      }
      this.rebuildPanels();
    },
  });

  public constructor() {
    super({
      mode: 'overview',
      body: new SceneFlexLayout({ children: [] }),
    });
  }

  public activate() {
    super.activate();
    // Build panels when scene becomes active (when it has access to variables)
    this.rebuildPanels();
  }

  public drillToChassis(chassisName: string) {
    this.setState({
      mode: 'chassis-drilldown',
      chassisName,
      hostName: undefined,
    });
    this.rebuildPanels();
  }

  public drillToHost(hostName: string, chassisName: string) {
    this.setState({
      mode: 'host-drilldown',
      hostName,
      chassisName,
    });
    this.rebuildPanels();
  }

  public exitDrilldown() {
    this.setState({
      mode: 'overview',
      chassisName: undefined,
      hostName: undefined,
    });
    this.rebuildPanels();
  }

  private rebuildPanels() {
    // Only rebuild if scene is active (has access to variables)
    if (!this.isActive) {
      return;
    }

    const { mode, chassisName, hostName } = this.state;

    // Build chassis panel
    let chassisPanel: any;
    if (mode === 'overview') {
      const chassisCount = getChassisCount(this);

      if (chassisCount === 0) {
        chassisPanel = PanelBuilders.text()
          .setTitle('Chassis Power Consumption')
          .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build();
      } else if (chassisCount <= 15) {
        chassisPanel = createChassisLineGraph(this, false);
      } else {
        chassisPanel = createChassisTable(this, this);
      }
    } else if (mode === 'chassis-drilldown') {
      chassisPanel = createChassisLineGraph(this, true, chassisName);
    } else if (mode === 'host-drilldown') {
      chassisPanel = createChassisLineGraph(this, true, chassisName);
    }

    // Build host panel
    let hostPanel: any;
    if (mode === 'overview') {
      const chassisCount = getChassisCount(this);

      if (chassisCount === 0) {
        hostPanel = PanelBuilders.text()
          .setTitle('Host Power Consumption')
          .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build();
      } else if (chassisCount <= 3) {
        hostPanel = createHostLineGraph(this, false);
      } else {
        hostPanel = createHostTable(this, this);
      }
    } else if (mode === 'host-drilldown') {
      hostPanel = createHostLineGraph(this, true, hostName);
    } else if (mode === 'chassis-drilldown') {
      hostPanel = createHostLineGraph(this, true, undefined, chassisName);
    }

    // Determine if both panels are line graphs (cursor sync is only meaningful for timeseries)
    const chassisCount = getChassisCount(this);
    const bothAreLineGraphs = mode !== 'overview'
      || (chassisCount > 0 && chassisCount <= 3);

    // Build children array
    const children: any[] = [];

    // Add drilldown header if not in overview mode
    if (mode !== 'overview') {
      const drilldownHeader = new DrilldownHeaderControl({
        chassisName: chassisName,
        hostName: hostName,
        onBack: () => this.exitDrilldown(),
      });
      children.push(new SceneFlexItem({ height: 50, body: drilldownHeader }));
    }

    // Add panels
    if (chassisPanel) {
      children.push(new SceneFlexItem({ ySizing: 'fill', body: chassisPanel }));
    }
    if (hostPanel) {
      children.push(new SceneFlexItem({ ySizing: 'fill', body: hostPanel }));
    }

    // Create layout with conditional cursor sync
    const body = new SceneFlexLayout({
      direction: 'column',
      children: children,
      ...(bothAreLineGraphs && {
        $behaviors: [
          new behaviors.CursorSync({ sync: DashboardCursorSync.Tooltip }),
        ],
      }),
    });

    this.setState({ body });
  }
}

function SynchronizedPowerConsumptionContainerRenderer({ model }: SceneComponentProps<SynchronizedPowerConsumptionContainer>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

function createChassisLineGraph(scene: SceneObjectBase, isDrilldown: boolean, chassisName?: string) {
  const baseQuery = {
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
      { selector: 'event.host_name', text: 'Chassis Name', type: 'string' },
      { selector: 'event.power_sum', text: 'Power', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
        "virtualColumns": [{
          "type": "nested-field",
          "columnName": "host.name",
          "outputName": "host_name",
          "expectedType": "STRING",
          "path": "$"
        }],
        "filter": {
          "type": "and",
          "fields": [
          {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ChassisName:doublequote}]
          },
          {
            "type": "selector",
            "dimension": "instrument.name",
            "value": "hw.power_supply"
          }
          ]
        },
        "aggregations": [
          {
            "type": "doubleMax",
            "name": "hw-power_max-Max",
            "fieldName": "hw.power_max"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power_sum",
        "fieldName": "hw-power_max-Max"
      }
    ]
  }`,
    },
  };

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
          regex: 'Power (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const title = isDrilldown && chassisName
    ? `Power Consumption: ${chassisName}`
    : 'Chassis Power Consumption (Max)';

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit('watt')
    .setCustomFieldConfig('drawStyle', 'line')
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', { mode: 'multi' })
    .build();
}

function createChassisTable(scene: SceneObjectBase, parent: SynchronizedPowerConsumptionContainer) {
  const baseQuery = {
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
      { selector: 'event.host_name', text: 'Chassis Name', type: 'string' },
      { selector: 'event.power_sum', text: 'Power', type: 'number' },
    ],
    url_options: {
      method: 'POST',
      body_type: 'raw',
      body_content_type: 'application/json',
      data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
        "virtualColumns": [{
          "type": "nested-field",
          "columnName": "host.name",
          "outputName": "host_name",
          "expectedType": "STRING",
          "path": "$"
        }],
        "filter": {
          "type": "and",
          "fields": [
          {
            "type": "in",
            "dimension": "host.name",
            "values": [\${ChassisName:doublequote}]
          },
          {
            "type": "selector",
            "dimension": "instrument.name",
            "value": "hw.power_supply"
          }
          ]
        },
        "aggregations": [
          {
            "type": "doubleMax",
            "name": "hw-power_max-Max",
            "fieldName": "hw.power_max"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["host_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power_sum",
        "fieldName": "hw-power_max-Max"
      }
    ]
  }`,
    },
  };

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
          regex: 'Power (.*)',
          renamePattern: '$1',
        },
      },
      {
        id: 'timeSeriesTable',
        options: {
          A: {
            timeField: 'Time',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'Trend #A': 'Power',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('Chassis Power Consumption (Max) - Click row to drill down')
    .setData(transformer)
    .setUnit('watt')
    .setOption('footer', {
      enablePagination: true,
      show: false,
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Power')
        .overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });

      builder.matchFieldsWithName('Chassis Name').overrideCustomFieldConfig('width', 240);
    })
    .build();

  return new ClickableTableWrapper({
    tablePanel,
    onRowClick: (chassisName: string) => parent.drillToChassis(chassisName),
  });
}

// ============================================================================
// PANEL CREATION FUNCTIONS - HOST
// ============================================================================

function createHostLineGraph(
  scene: SceneObjectBase,
  isDrilldown: boolean,
  hostName?: string,
  chassisName?: string
) {
  const baseQuery = {
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
      { selector: 'event.hostname', text: 'Hostname', type: 'string' },
      { selector: 'event.max-power', text: 'Power', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.Blade"
        },
        {
          "type": "regex",
          "dimension": "host.name",
          "pattern": "^$\{ChassisName:regex}"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.host"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max-power",
        "fieldName": "hw.host.power_max"
      }
    ]
  }`,
    },
  };

  let query = baseQuery;
  let title = 'Host Power Consumption (Max)';

  if (isDrilldown && hostName) {
    // Drilldown to specific host
    query = JSON.parse(JSON.stringify(baseQuery));
    const escapedHostName = JSON.stringify(hostName);
    query.url_options.data = query.url_options.data.replace(
      /"pattern": "\^\$\{ChassisName:regex\}"/g,
      `"pattern": "^${hostName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`
    );
    title = `Power Consumption: ${hostName}`;
  } else if (isDrilldown && chassisName) {
    // Drilldown to hosts in specific chassis
    query = createDrilldownQuery(baseQuery, chassisName);
    title = `Host Power Consumption: ${chassisName}`;
  }

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
          regex: 'Power (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(title)
    .setData(transformer)
    .setUnit('watt')
    .setCustomFieldConfig('drawStyle', 'line')
    .setCustomFieldConfig('fillOpacity', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', { mode: 'multi' })
    .build();
}

function createHostTable(scene: SceneObjectBase, parent: SynchronizedPowerConsumptionContainer) {
  const baseQuery = {
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
      { selector: 'event.hostname', text: 'Hostname', type: 'string' },
      { selector: 'event.max-power', text: 'Power', type: 'number' },
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
    "dimensions": ["hostname"],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "hostname",
      "expectedType": "STRING",
      "path": "$"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.Blade"
        },
        {
          "type": "regex",
          "dimension": "host.name",
          "pattern": "^$\{ChassisName:regex}"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.host"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max-power",
        "fieldName": "hw.host.power_max"
      }
    ]
  }`,
    },
  };

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [baseQuery as any],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: {
            timeField: 'Time',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'Trend #A': 'Power',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('Host Power Consumption (Max) - Click row to drill down')
    .setData(transformer)
    .setUnit('watt')
    .setOption('footer', {
      enablePagination: true,
      show: false,
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Power')
        .overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });

      builder.matchFieldsWithName('Hostname').overrideCustomFieldConfig('width', 240);
    })
    .build();

  return new ClickableTableWrapper({
    tablePanel,
    onRowClick: (hostName: string) => {
      const chassisName = extractChassisFromHost(hostName);
      if (chassisName) {
        parent.drillToHost(hostName, chassisName);
      }
    },
  });
}

// ============================================================================
// CHASSIS FAN SPEED QUERY
// ============================================================================

const chassisFanSpeedQuery = {
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
    { selector: 'event.host_name', text: 'Chassis Name', type: 'string' },
    { selector: 'event.fan_speed', text: 'Fan Speed', type: 'number' },
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
    "dimensions": ["domain_name", "host_name"],
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
        }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "host.name",
          "values": [\${ChassisName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "equipment.Chassis"
        },
        {
          "type": "selector",
          "dimension": "parent.type",
          "value": "equipment.Chassis"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.fan"
        }
      ]
    },
        "aggregations": [
          {
            "type": "longSum",
            "name": "count",
            "fieldName": "hw.fan.speed_count"
          },
          {
            "type": "longSum",
            "name": "hw.fan.speed-Sum",
            "fieldName": "hw.fan.speed"
          }
        ],
        "postAggregations": [
          {
            "type": "expression",
            "name": "fan_speed",
            "expression": "(\\"hw.fan.speed-Sum\\" / \\"count\\")"
          }
        ]
  }`,
  },
} as any;

// ============================================================================
// DYNAMIC CHASSIS FAN SPEED SCENE - Conditional rendering based on chassis count
// ============================================================================

interface DynamicChassisFanSpeedSceneState extends SceneObjectState {
  body: any;
  drilldownChassis?: string;
  isDrilldown?: boolean;
}

class DynamicChassisFanSpeedScene extends SceneObjectBase<DynamicChassisFanSpeedSceneState> {
  public static Component = DynamicChassisFanSpeedSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        // Reset drilldown if variable changes
        if (this.state.isDrilldown) {
          this.exitDrilldown();
        }
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicChassisFanSpeedSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildBody();
  }

  public drillToChassis(chassisName: string) {
    this.setState({
      drilldownChassis: chassisName,
      isDrilldown: true,
    });
    this.rebuildBody();
  }

  public exitDrilldown() {
    this.setState({
      drilldownChassis: undefined,
      isDrilldown: false,
    });
    this.rebuildBody();
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    // Check for drilldown mode first
    if (this.state.isDrilldown && this.state.drilldownChassis) {
      const drilldownBody = createChassisFanSpeedDrilldownView(this.state.drilldownChassis, this);
      this.setState({ body: drilldownBody });
      return;
    }

    // Get chassis count
    const chassisCount = getChassisCount(this);

    // No chassis selected
    if (chassisCount === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });
      this.setState({ body: emptyBody });
      return;
    }

    // If <= 15 chassis, show line chart
    if (chassisCount <= 15) {
      const lineChartBody = createChassisFanSpeedLineChartView();
      this.setState({ body: lineChartBody });
      return;
    }

    // If > 15 chassis, show table with drilldown
    const tableBody = createChassisFanSpeedTableView(this);
    this.setState({ body: tableBody });
  }
}

function DynamicChassisFanSpeedSceneRenderer({ model }: SceneComponentProps<DynamicChassisFanSpeedScene>) {
  const { body } = model.useState();
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

// ============================================================================
// CHASSIS FAN SPEED VIEW FUNCTIONS
// ============================================================================

// Line chart view for <= 15 chassis
function createChassisFanSpeedLineChartView() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [chassisFanSpeedQuery],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Fan Speed (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const panel = PanelBuilders.timeseries()
    .setTitle('Fan speed per Chassis (Avg)')
    .setData(dataTransformer)
    .setUnit('rotrpm')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

// Table view for > 15 chassis
function createChassisFanSpeedTableView(scene: DynamicChassisFanSpeedScene) {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [chassisFanSpeedQuery],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Fan Speed (.*)',
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
          indexByName: {},
          renameByName: {
            'Trend #A': 'Fan Speed',
          },
        },
      },
    ],
  });

  const tablePanel = PanelBuilders.table()
    .setTitle('Fan speed per Chassis (Avg) - Click row to drill down')
    .setData(dataTransformer)
    .setUnit('rotrpm')
    .setOption('footer', {
      enablePagination: true,
      show: false,
    })
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Fan Speed')
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        });
      builder
        .matchFieldsByType('string')
        .overrideCustomFieldConfig('width', 240);
    })
    .build();

  const clickableTable = new ClickableTableWrapper({
    tablePanel: tablePanel,
    onRowClick: (chassisName: string) => {
      scene.drillToChassis(chassisName);
    },
  });

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

// Drilldown view with back button
function createChassisFanSpeedDrilldownView(chassisName: string, scene: DynamicChassisFanSpeedScene) {
  const drilldownHeader = new DrilldownHeaderControl({
    chassisName: chassisName,
    onBack: () => scene.exitDrilldown(),
  });

  const drilldownQuery = createDrilldownQuery(chassisFanSpeedQuery, chassisName);

  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [drilldownQuery],
  });

  const dataTransformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Fan Speed (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  const panel = PanelBuilders.timeseries()
    .setTitle(`Fan speed for ${chassisName} (Avg)`)
    .setData(dataTransformer)
    .setUnit('rotrpm')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setOption('tooltip', {
      mode: 'multi',
      sort: 'desc',
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({ height: 50, body: drilldownHeader }),
      new SceneFlexItem({
        ySizing: 'fill',
        body: panel,
      }),
    ],
  });
}

// ============================================================================
// MAIN ENVIRONMENTAL TAB FUNCTION
// ============================================================================

export function getEnvironmentalTab() {
  // Row 1: Power Supply Status
  const powerSupplyQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '',
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.status_sum', text: 'Status', type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": {
      "type": "query",
      "query": {
        "queryType": "groupBy",
        "dataSource": "PhysicalEntities",
        "granularity": {
          "type": "duration",
          "duration": $__interval_ms,
          "timeZone": "$__timezone"
        },
        "intervals": ["\${__from:date}/\${__to:date}"],
        "dimensions": [
          "host_name",
          "name"
        ],
        "virtualColumns": [{
          "type": "nested-field",
          "columnName": "host.name",
          "outputName": "host_name",
          "expectedType": "STRING",
          "path": "$"
        }],
        "filter": {
          "type": "and",
          "fields": [
            {
              "type": "selector",
              "dimension": "instrument.name",
              "value": "hw.power_supply"
            },
            {
              "type": "in",
              "dimension": "host.name",
              "values": [\${ChassisName:doublequote}]
            }
          ]
        },
        "aggregations": [
          {
            "type": "longMin",
            "name": "hw-status_min-Min",
            "fieldName": "hw.status_min"
          }
        ]
      }
    },
    "granularity": {
      "type": "duration",
      "duration": $__interval_ms,
      "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name", "host_name"],
    "aggregations": [
      {
        "type": "longSum",
        "name": "status_sum",
        "fieldName": "hw-status_min-Min"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  const powerSupplyDataTransformer = new LoggingDataTransformer({
    $data: powerSupplyQueryRunner,
    transformations: [
      {
        id: 'groupingToMatrix',
        options: {
          columnField: 'Hostname',
          rowField: 'Time',
          valueField: 'Status',
        },
      },
    ],
  });

  const powerSupplyPanel = PanelBuilders.timeseries()
    .setTitle('Active PSUs per device')
    .setDescription('Displays the count of active power supplies- one color per device. Maximum count of power supplies is used as threshold. Adding or removing devices can skew the threshold.')
    .setData(powerSupplyDataTransformer)
    .setCustomFieldConfig('drawStyle', 'bars')
    .setCustomFieldConfig('fillOpacity', 100)
    .setCustomFieldConfig('barAlignment', 0)
    .setCustomFieldConfig('barWidthFactor', 1)
    .setCustomFieldConfig('stacking', { mode: 'normal', group: 'A' })
    .setCustomFieldConfig('thresholdsStyle', { mode: 'dashed+area' })
    .setCustomFieldConfig('axisSoftMin', 0)
    .setDecimals(0)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'semi-dark-red' },
        { value: 100, color: 'transparent' },
      ],
    })
    .setOption('tooltip', { mode: 'multi' })
    .build();

  const powerSupplyRow = new SceneGridRow({
    title: 'Power Supply Status',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 8,
        body: powerSupplyPanel,
      }),
    ],
  });

  // Row 2: Synchronized Power Consumption (Chassis + Host)
  const powerConsumptionContainer = new SynchronizedPowerConsumptionContainer();

  const powerConsumptionRow = new SceneGridRow({
    title: 'Power Consumption',
    isCollapsible: true,
    isCollapsed: false,
    y: 8,
    children: [
      new SceneGridItem({
        x: 0,
        y: 8,
        width: 24,
        height: 16,
        body: powerConsumptionContainer,
      }),
    ],
  });

  // Row 3: Chassis Fan Speed
  const chassisFanSpeedRow = new SceneGridRow({
    title: 'Chassis Fan Speed',
    isCollapsible: true,
    isCollapsed: false,
    y: 24,
    children: [
      new SceneGridItem({
        x: 0,
        y: 24,
        width: 24,
        height: 8,
        body: new DynamicChassisFanSpeedScene({}),
      }),
    ],
  });

  // Row 4: Chassis Temperature
  const chassisTemperatureRow = new SceneGridRow({
    title: 'Chassis Temperature',
    isCollapsible: true,
    isCollapsed: false,
    y: 32,
    children: [
      new SceneGridItem({
        x: 0,
        y: 32,
        width: 24,
        height: 8,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO\n\nThis row is under development.')
          .setOption('mode', 'markdown')
          .build(),
      }),
    ],
  });

  // Row 5: Host Temperature
  const hostTemperatureRow = new SceneGridRow({
    title: 'Host Temperature',
    isCollapsible: true,
    isCollapsed: false,
    y: 40,
    children: [
      new SceneGridItem({
        x: 0,
        y: 40,
        width: 24,
        height: 8,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO\n\nThis row is under development.')
          .setOption('mode', 'markdown')
          .build(),
      }),
    ],
  });

  // Return grid layout wrapped in flex layout
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 1600,
        body: new SceneGridLayout({
          children: [
            powerSupplyRow,
            powerConsumptionRow,
            chassisFanSpeedRow,
            chassisTemperatureRow,
            hostTemperatureRow,
          ],
        }),
      }),
    ],
  });
}
