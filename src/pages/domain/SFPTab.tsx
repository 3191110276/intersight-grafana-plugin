/**
 * SFP Tab - IMM Domain Scene
 *
 * This module provides the SFP tab functionality for the IMM Domain scene.
 * Shows SFP metrics for FI uplinks and downlinks including temperature, voltage, current, power, TX bias.
 */

import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { TabbedScene } from '../../components/TabbedScene';

export function getSFPTab() {
  // Panel-55: SFP Metrics Table with multiple telemetry queries
  const sfpMetricsPanel = getSFPMetricsPanel();

  // Panel-59: Information text about SFP restrictions
  const sfpInfoPanel = PanelBuilders.text()
    .setTitle('')
    .setOption('content', 'You can find more information about the specifications and allowed ranges for SFPs in the <a href="https://copi.cisco.com" target="_blank">official Cisco SFP documentation</a>.\n\nPlease note the restrictions for SFP data:\n- Direct attach cables, and other optics without DOM support will not show up here\n- Intersight Advantage licenses are required for SFP metrics collection')
    .setOption('mode', 'markdown' as any)
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 1000,
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'SFP Metrics',
              isCollapsible: true,
              isCollapsed: false,
              y: 0,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 0,
                  width: 24,
                  height: 16,
                  body: sfpMetricsPanel,
                }),
              ],
            }),
            new SceneGridRow({
              title: 'Information',
              isCollapsible: true,
              isCollapsed: false,
              y: 16,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 16,
                  width: 24,
                  height: 4,
                  body: sfpInfoPanel,
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}

function getSFPMetricsPanel() {
  // Query A: Current (hw.current)
  const queryA = {
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
      body_content_type: 'application/json',
      body_type: 'raw',
      data: '  {\n    "queryType": "groupBy",\n    "dataSource": "PhysicalEntities",\n    "granularity": {\n       "type": "duration",\n       "duration": $__interval_ms,\n       "timeZone": "$__timezone"\n    },\n    "intervals": ["${__from:date}/${__to:date}"],\n    "dimensions": [\n      "Identifier",\n      "domain_name",\n      "host_name",\n      "port_name",\n      "model",\n      "serial_number"\n    ],\n    "virtualColumns": [{\n      "type": "nested-field",\n      "columnName": "intersight.domain.name",\n      "outputName": "domain_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "host.name",\n      "outputName": "host_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "parent.name",\n      "outputName": "port_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "expression",\n      "name": "Identifier",\n      "expression": "concat(domain_name + host_name + port_name)",\n      "outputType": "STRING"\n    }],\n    "filter": {\n      "type": "and",\n      "fields": [\n        {\n          "type": "in",\n          "dimension": "intersight.domain.name",\n          "values": [${DomainName:doublequote}]\n        },\n        {\n          "type": "in",\n          "dimension": "instrument.name",\n          "values": ["hw.current"]\n        }\n      ]\n    },\n    "aggregations": [\n      {\n        "type": "doubleMax",\n        "name": "current",\n        "fieldName": "hw.current_max"\n      }\n    ]\n  }',
    },
  };

  // Query B: Voltage (hw.voltage)
  const queryB = {
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
      body_content_type: 'application/json',
      body_type: 'raw',
      data: '  {\n    "queryType": "groupBy",\n    "dataSource": "PhysicalEntities",\n    "granularity": {\n       "type": "duration",\n       "duration": $__interval_ms,\n       "timeZone": "$__timezone"\n    },\n    "intervals": ["${__from:date}/${__to:date}"],\n    "dimensions": [\n      "Identifier"\n    ],\n    "virtualColumns": [{\n      "type": "nested-field",\n      "columnName": "intersight.domain.name",\n      "outputName": "domain_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "host.name",\n      "outputName": "host_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "parent.name",\n      "outputName": "port_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "expression",\n      "name": "Identifier",\n      "expression": "concat(domain_name + host_name + port_name)",\n      "outputType": "STRING"\n    }],\n    "filter": {\n      "type": "and",\n      "fields": [\n        {\n          "type": "in",\n          "dimension": "intersight.domain.name",\n          "values": [${DomainName:doublequote}]\n        },\n        {\n          "type": "selector",\n          "dimension": "instrument.name",\n          "value": "hw.voltage"\n        }\n      ]\n    },\n    "aggregations": [\n      {\n        "type": "doubleMax",\n        "name": "voltage",\n        "fieldName": "hw.voltage_max"\n      }\n    ]\n  }',
    },
  };

  // Query C: RX Power (hw.signal_power receive)
  const queryC = {
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
      body_content_type: 'application/json',
      body_type: 'raw',
      data: '  {\n    "queryType": "groupBy",\n    "dataSource": "PhysicalEntities",\n    "granularity": {\n       "type": "duration",\n       "duration": $__interval_ms,\n       "timeZone": "$__timezone"\n    },\n    "intervals": ["${__from:date}/${__to:date}"],\n    "dimensions": [\n      "Identifier"\n    ],\n    "virtualColumns": [{\n      "type": "nested-field",\n      "columnName": "intersight.domain.name",\n      "outputName": "domain_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "host.name",\n      "outputName": "host_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "parent.name",\n      "outputName": "port_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "expression",\n      "name": "Identifier",\n      "expression": "concat(domain_name + host_name + port_name)",\n      "outputType": "STRING"\n    }],\n    "filter": {\n      "type": "and",\n      "fields": [\n        {\n          "type": "in",\n          "dimension": "intersight.domain.name",\n          "values": [${DomainName:doublequote}]\n        },\n        {\n          "type": "selector",\n          "dimension": "instrument.name",\n          "value": "hw.signal_power"\n        }\n      ]\n    },\n    "aggregations": [\n      {\n        "type": "doubleMax",\n        "name": "rx_power_base",\n        "fieldName": "hw.signal_power_receive_max"\n      }\n    ],\n    "postAggregations": [\n      {\n        "type": "expression",\n        "name": "rx_power",\n        "expression": "(\\"rx_power_base\\" * 10000)"\n      }\n    ]\n  }',
    },
  };

  // Query D: TX Power (hw.signal_power transmit)
  const queryD = {
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
      body_content_type: 'application/json',
      body_type: 'raw',
      data: '  {\n    "queryType": "groupBy",\n    "dataSource": "PhysicalEntities",\n    "granularity": {\n       "type": "duration",\n       "duration": $__interval_ms,\n       "timeZone": "$__timezone"\n    },\n    "intervals": ["${__from:date}/${__to:date}"],\n    "dimensions": [\n      "Identifier"\n    ],\n    "virtualColumns": [{\n      "type": "nested-field",\n      "columnName": "intersight.domain.name",\n      "outputName": "domain_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "host.name",\n      "outputName": "host_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "parent.name",\n      "outputName": "port_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "expression",\n      "name": "Identifier",\n      "expression": "concat(domain_name + host_name + port_name)",\n      "outputType": "STRING"\n    }],\n    "filter": {\n      "type": "and",\n      "fields": [\n        {\n          "type": "in",\n          "dimension": "intersight.domain.name",\n          "values": [${DomainName:doublequote}]\n        },\n        {\n          "type": "selector",\n          "dimension": "instrument.name",\n          "value": "hw.signal_power"\n        }\n      ]\n    },\n    "aggregations": [\n      {\n        "type": "doubleMax",\n        "name": "tx_power_base",\n        "fieldName": "hw.signal_power_transmit_max"\n      }\n    ],\n    "postAggregations": [\n      {\n        "type": "expression",\n        "name": "tx_power",\n        "expression": "(\\"tx_power_base\\" * 10000)"\n      }\n    ]\n  }',
    },
  };

  // Query E: Temperature (hw.temperature for fi_transceiver_lane_1)
  const queryE = {
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
      body_content_type: 'application/json',
      body_type: 'raw',
      data: '  {\n    "queryType": "groupBy",\n    "dataSource": "PhysicalEntities",\n    "granularity": {\n       "type": "duration",\n       "duration": $__interval_ms,\n       "timeZone": "$__timezone"\n    },\n    "intervals": ["${__from:date}/${__to:date}"],\n    "dimensions": [\n      "Identifier"\n    ],\n    "virtualColumns": [{\n      "type": "nested-field",\n      "columnName": "intersight.domain.name",\n      "outputName": "domain_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "host.name",\n      "outputName": "host_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "nested-field",\n      "columnName": "parent.name",\n      "outputName": "port_name",\n      "expectedType": "STRING",\n      "path": "$"\n    },{\n      "type": "expression",\n      "name": "Identifier",\n      "expression": "concat(domain_name + host_name + port_name)",\n      "outputType": "STRING"\n    }],\n    "filter": {\n      "type": "and",\n      "fields": [\n        {\n          "type": "in",\n          "dimension": "intersight.domain.name",\n          "values": [${DomainName:doublequote}]\n        },\n        {\n          "type": "selector",\n          "dimension": "sensor_location",\n          "value": "fi_transceiver_lane_1"\n        },\n        {\n          "type": "selector",\n          "dimension": "instrument.name",\n          "value": "hw.temperature"\n        }\n      ]\n    },\n    "aggregations": [\n      {\n        "type": "doubleMax",\n        "name": "temperature",\n        "fieldName": "hw.temperature_max"\n      }\n    ]\n  }',
    },
  };

  // Create query runner with all 5 queries
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queryA, queryB, queryC, queryD, queryE] as any[],
  });

  // Apply transformations: timeSeriesTable, joinByField, organize
  const transformedData = new LoggingDataTransformer({
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

  // Build table panel with field overrides
  return PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'lg' as any)
    .setOption('enablePagination', true)
    .setNoValue('No SFP data available. SFP require DOM capability, and Advantage licenses.')
    .setOverrides((builder) => {
      // Current column - unit: amp
      builder.matchFieldsWithName('Current')
        .overrideUnit('amp');

      // Voltage column - unit: volt
      builder.matchFieldsWithName('Voltage')
        .overrideUnit('volt');

      // RX Power and TX Power columns - no unit (custom dBm values)
      builder.matchFieldsWithNameByRegex('/.* Power/')
        .overrideUnit('');

      // Temperature column - unit: celsius
      builder.matchFieldsWithName('Temperature')
        .overrideUnit('celsius');
    })
    .build();
}

// ============================================================================
// ENVIRONMENTAL TAB - Power Supply and Consumption Monitoring
// ============================================================================

/**
 * Panel 6: Active PSUs per device
 * Displays the count of active power supplies - one color per device
 */
function getPowerSupplyStatusPanel() {
  const queryRunner = new LoggingQueryRunner({
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
          "domain_name",
          "host_name",
          "name"
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
              "dimension": "intersight.domain.name",
              "values": [\${DomainName:doublequote}]
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
    "dimensions": ["domain_name","host_name"],
    "aggregations": [
      {
        "type": "longSum",
        "name": "status_sum",
        "fieldName": "hw-status_min-Min"
      }
    ]
  }`,
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Active PSUs per device')
    .setDescription('Displays the count of active power supplies- one color per device. Maximum count of power supplies is used as threshold. Adding or removing devices can skew the threshold.')
    .setData(queryRunner)
    .setCustomFieldConfig('drawStyle', 'bars' as any)
    .setCustomFieldConfig('fillOpacity', 100)
    .setCustomFieldConfig('barAlignment', 0)
    .setCustomFieldConfig('barWidthFactor', 1)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setCustomFieldConfig('stacking', { mode: 'normal' as any, group: 'A' })
    .setCustomFieldConfig('thresholdsStyle', { mode: 'dashed+area' as any })
    .setDecimals(0)
    .setColor({ mode: 'palette-classic' })
    .setThresholds({
      mode: 'percentage' as any as any,
      steps: [
        { value: 0, color: 'semi-dark-red' },
        { value: 100, color: 'transparent' },
      ],
    })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 203: Power consumption per Domain (Max)
 * Displays power consumption aggregated at domain level
 */
function getDomainPowerConsumptionPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
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
          "domain_name",
          "host_name",
          "name"
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
        }],
        "filter": {
          "type": "and",
          "fields": [
          {
            "type": "in",
            "dimension": "host.type",
            "values": [
              "equipment.Chassis",
              "network.Element",
              "compute.RackUnit"
            ]
          },
          {
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
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
    "dimensions": ["domain_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power_sum",
        "fieldName": "hw-power_max-Max"
      }
    ]
  }`,
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Power consumption per Domain (Max)')
    .setData(queryRunner)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setUnit('watt')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 8: Power consumption per FI (Max)
 * Displays power consumption per Fabric Interconnect
 */
function getFIPowerConsumptionPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
          { selector: 'event.hw-host-power_max-Max', text: 'Host Power', type: 'number' },
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
          "value": "network.Element"
        },
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
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
        "name": "hw-host-power_max-Max",
        "fieldName": "hw.host.power_max"
      }
    ]
  }`,
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Power consumption per FI (Max)')
    .setData(queryRunner)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setUnit('watt')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 13: Power consumption per FI Pair (Max) - shows FI power aggregated by domain
 * This is the FI pair power consumption (both FIs combined)
 */
function getFIPairPowerConsumptionPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
          { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
          { selector: 'event.power', text: 'Host Power', type: 'number' },
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
        "dimensions": ["domain_name", "hostname"],
        "virtualColumns": [{
          "type": "nested-field",
          "columnName": "host.name",
          "outputName": "hostname",
          "expectedType": "STRING",
          "path": "$"
        },{
          "type": "nested-field",
          "columnName": "intersight.domain.name",
          "outputName": "domain_name",
          "expectedType": "STRING",
          "path": "$"
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
              "dimension": "host.type",
              "value": "network.Element"
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
            "name": "hw-host-power_max-Max",
            "fieldName": "hw.host.power_max"
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
    "dimensions": ["domain_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power",
        "fieldName": "hw-host-power_max-Max"
      }
    ]
  }`,
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Power consumption per Domain (Max)')
    .setData(queryRunner)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setUnit('watt')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 202: Power consumption per Chassis (Max)
 * Displays power consumption per chassis
 */
function getChassisPowerConsumptionPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
          { selector: 'event.host_name', text: 'Name', type: 'string' },
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
          "domain_name",
          "host_name",
          "name"
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
        }],
        "filter": {
          "type": "and",
          "fields": [
          {
            "type": "selector",
            "dimension": "host.type",
            "value": "equipment.Chassis"
          },
          {
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
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
    "dimensions": ["domain_name","host_name"],
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "power_sum",
        "fieldName": "hw-power_max-Max"
      }
    ]
  }`,
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Power consumption per Chassis (Max)')
    .setData(queryRunner)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setUnit('watt')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 15: Host Power Consumption (Table)
 * Displays power consumption per host (compute blades) in a table format
 */
function getHostPowerConsumptionPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
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
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(queryRunner)
    .setUnit('watt')
    .setOption('cellHeight', 'lg' as any)
    .setOption('enablePagination', true)
    .setOption('showHeader', true)
    .setOption('sortBy', [{ displayName: 'Power', desc: true }])
    .setOverrides((builder) => {
      // Power column
      builder.matchFieldsWithName('Power')
        .overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });

      // Hostname column
      builder.matchFieldsWithName('Hostname')
        .overrideCustomFieldConfig('width', 240);
    })
    .build();
}

/**
 * Panel 16: Fabric Interconnect Fan Speed per FI (Avg)
 * Shows average fan speed for each Fabric Interconnect
 */
function getFIFanSpeedPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
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
    "dimensions": ["host_name"],
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
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "network.Element"
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
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
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

  return PanelBuilders.timeseries()
    .setTitle('Fan Speed per FI (Avg)')
    .setData(transformer)
    .setUnit('rotrpm')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 17: Chassis Fan Speed per Chassis (Avg)
 * Shows average fan speed for each Chassis
 */
function getChassisFanSpeedPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
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
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
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
    "dimensions": ["domain_name","host_name"],
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
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
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
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
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

  return PanelBuilders.timeseries()
    .setTitle('Fan speed per Chassis (Avg)')
    .setData(transformer)
    .setUnit('rotrpm')
    .setCustomFieldConfig('axisSoftMin', 0)
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 18: FI Intake Temperature (Avg)
 * Shows average intake temperature for Fabric Interconnects
 */
function getFIIntakeTemperaturePanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.hw-temperature-Avg', text: 'Temperature', type: 'number' },
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
    "dimensions": ["host_name"],
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
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "network.Element"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "fi_back"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "count",
        "fieldName": "hw.temperature_count"
      },
      {
        "type": "doubleSum",
        "name": "hw.temperature-Sum",
        "fieldName": "hw.temperature"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "hw-temperature-Avg",
        "expression": "(\\"hw.temperature-Sum\\" / \\"count\\")"
      }
    ]
  }`,
        },
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Temperature (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Intake Temperature (Avg)')
    .setData(transformer)
    .setUnit('celsius')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 19: FI Exhaust Temperature (Avg)
 * Shows average exhaust temperature for Fabric Interconnects
 */
function getFIExhaustTemperaturePanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.hw-temperature-Avg', text: 'Temperature', type: 'number' },
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
    "dimensions": ["host_name"],
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
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "network.Element"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "fi_front"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "count",
        "fieldName": "hw.temperature_count"
      },
      {
        "type": "doubleSum",
        "name": "hw.temperature-Sum",
        "fieldName": "hw.temperature"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "hw-temperature-Avg",
        "expression": "(\\"hw.temperature-Sum\\" / \\"count\\")"
      }
    ]
  }`,
        },
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Temperature (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Exhaust Temperature (Avg)')
    .setData(transformer)
    .setUnit('celsius')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 22: FI CPU Temperature (Avg)
 * Shows average CPU temperature for Fabric Interconnects
 */
function getFICPUTemperaturePanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.hw-temperature-Avg', text: 'Temperature', type: 'number' },
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
    "dimensions": ["host_name"],
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
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "network.Element"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "fi_cpu"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "count",
        "fieldName": "hw.temperature_count"
      },
      {
        "type": "doubleSum",
        "name": "hw.temperature-Sum",
        "fieldName": "hw.temperature"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "hw-temperature-Avg",
        "expression": "(\\"hw.temperature-Sum\\" / \\"count\\")"
      }
    ]
  }`,
        },
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Temperature (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('CPU Temperature (Avg)')
    .setData(transformer)
    .setUnit('celsius')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 23: FI ASIC Temperature (Avg)
 * Shows average ASIC temperature for Fabric Interconnects
 */
function getFIASICTemperaturePanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.hw-temperature-Avg', text: 'Temperature', type: 'number' },
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
    "dimensions": ["host_name"],
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
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "network.Element"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "fi_asic"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "count",
        "fieldName": "hw.temperature_count"
      },
      {
        "type": "doubleSum",
        "name": "hw.temperature-Sum",
        "fieldName": "hw.temperature"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "hw-temperature-Avg",
        "expression": "(\\"hw.temperature-Sum\\" / \\"count\\")"
      }
    ]
  }`,
        },
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Temperature (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('ASIC Temperature (Avg)')
    .setData(transformer)
    .setUnit('celsius')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 11: Chassis Intake Temperature (Avg)
 * Shows average intake temperature for Chassis
 */
function getChassisIntakeTemperaturePanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.chassis_name', text: 'Chassis Name', type: 'string' },
          { selector: 'event.hw-temperature-Avg', text: 'Temperature', type: 'number' },
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
    "dimensions": ["domain_name","chassis_name"],
    "virtualColumns": [{
          "type": "nested-field",
          "columnName": "intersight.domain.name",
          "outputName": "domain_name",
          "expectedType": "STRING",
          "path": "$"
        },{
          "type": "expression",
          "name": "chassis_name",
          "expression": "substring(\\"host.name\\",0,strlen(\\"host.name\\")-2)",
          "expectedType": "STRING"
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
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.Blade"
        },
        {
          "type": "selector",
          "dimension": "name",
          "value": "TEMP_FRONT"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "count",
        "fieldName": "hw.temperature_count"
      },
      {
        "type": "doubleSum",
        "name": "hw.temperature-Sum",
        "fieldName": "hw.temperature"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "hw-temperature-Avg",
        "expression": "(\\"hw.temperature-Sum\\" / \\"count\\")"
      }
    ]
  }`,
        },
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Temperature (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Intake Temperature (Avg)')
    .setData(transformer)
    .setUnit('celsius')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 12: Chassis Exhaust Temperature (Avg)
 * Shows average exhaust temperature for Chassis
 */
function getChassisExhaustTemperaturePanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.chassis_name', text: 'Chassis Name', type: 'string' },
          { selector: 'event.hw-temperature-Avg', text: 'Temperature', type: 'number' },
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
    "dimensions": ["domain_name","chassis_name"],
    "virtualColumns": [{
          "type": "nested-field",
          "columnName": "intersight.domain.name",
          "outputName": "domain_name",
          "expectedType": "STRING",
          "path": "$"
        },{
          "type": "expression",
          "name": "chassis_name",
          "expression": "substring(\\"host.name\\",0,strlen(\\"host.name\\")-2)",
          "expectedType": "STRING"
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
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.Blade"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "TEMP_REAR_BOT",
            "TEMP_REAR_MID",
            "TEMP_REAR_TOP"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "count",
        "fieldName": "hw.temperature_count"
      },
      {
        "type": "doubleSum",
        "name": "hw.temperature-Sum",
        "fieldName": "hw.temperature"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "hw-temperature-Avg",
        "expression": "(\\"hw.temperature-Sum\\" / \\"count\\")"
      }
    ]
  }`,
        },
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'renameByRegex',
        options: {
          regex: 'Temperature (.*)',
          renamePattern: '$1',
        },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle('Exhaust Temperature (Avg)')
    .setData(transformer)
    .setUnit('celsius')
    .setColor({ mode: 'palette-classic' })
    .setOption('legend', { displayMode: 'list' as any as any, placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 9: Host Temperature
 * Complex multi-query table showing temperature data for compute blades
 */
function getHostTemperaturePanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "host.type",
          "values": [
            "compute.Blade"
          ]
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "server_front"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      },
      {
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "host.type",
          "values": [
            "compute.Blade"
          ]
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P1_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      },
      {
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "host.type",
          "values": [
            "compute.Blade"
          ]
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P2_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      },
      {
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.max_temp', text: 'Temperature', type: 'number' },
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "in",
          "dimension": "host.type",
          "values": [
            "compute.Blade"
          ]
        },
        {
          "type": "selector",
          "dimension": "sensor_location",
          "value": "server_back"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      }
    ]
  }`,
        },
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
          C: { timeField: 'Time' },
          D: { timeField: 'Time' },
          'joinByField-A-B': { timeField: 'Time' },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'Hostname',
          mode: 'outer',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            Hostname: '',
            'Trend #A': 'Intake Temperature',
            'Trend #B': 'CPU 1 Temperature',
            'Trend #C': 'CPU 2 Temperature',
            'Trend #D': 'Exhaust Temperature',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setUnit('celsius')
    .setOption('cellHeight', 'md' as any)
    .setOption('showHeader', true)
    .setOption('enablePagination', true)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Hostname')
        .overrideCustomFieldConfig('filterable', true);
    })
    .build();
}

/**
 * Panel 21: Cooling Budget
 * Complex multi-query table showing temperature difference from threshold for compute blades
 */
function getCoolingBudgetPanel() {
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    maxDataPoints: 500,
    queries: [
      {
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
          { selector: 'event.difference', text: 'Difference', type: 'number' },
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.Blade"
        },
        {
          "type": "selector",
          "dimension": "name",
          "value": "TEMP_FRONT"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      },
      {
        "type": "doubleLast",
        "name": "threshold",
        "fieldName": "hw.temperature.limit_high_critical"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "difference",
        "expression": "(\\"threshold\\" - \\"max_temp\\")"
      }
    ]
  }`,
        },
      },
      {
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.difference', text: 'Difference', type: 'number' },
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.Blade"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P1_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      },
      {
        "type": "doubleLast",
        "name": "threshold",
        "fieldName": "hw.temperature.limit_high_degraded"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "difference",
        "expression": "(\\"threshold\\" - \\"max_temp\\")"
      }
    ]
  }`,
        },
      },
      {
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.difference', text: 'Difference', type: 'number' },
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.Blade"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "P2_TEMP_SENS"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      },
      {
        "type": "doubleLast",
        "name": "threshold",
        "fieldName": "hw.temperature.limit_high_degraded"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "difference",
        "expression": "(\\"threshold\\" - \\"max_temp\\")"
      }
    ]
  }`,
        },
      },
      {
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
          { selector: 'event.hostname', text: 'Hostname', type: 'string' },
          { selector: 'event.difference', text: 'Difference', type: 'number' },
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
            "type": "in",
            "dimension": "intersight.domain.name",
            "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.temperature"
        },
        {
          "type": "selector",
          "dimension": "host.type",
          "value": "compute.Blade"
        },
        {
          "type": "in",
          "dimension": "name",
          "values": [
            "TEMP_REAR_BOT",
            "TEMP_REAR_MID",
            "TEMP_REAR_TOP"
          ]
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "max_temp",
        "fieldName": "hw.temperature_max"
      },
      {
        "type": "doubleLast",
        "name": "threshold",
        "fieldName": "hw.temperature.limit_high_critical"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "difference",
        "expression": "(\\"threshold\\" - \\"max_temp\\")"
      }
    ]
  }`,
        },
      },
    ],
  });

  const transformer = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
          C: { timeField: 'Time' },
          D: { timeField: 'Time' },
          'joinByField-A-B': { timeField: 'Time' },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'Hostname',
          mode: 'outer',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            Hostname: '',
            'Trend #A': 'Intake Temperature',
            'Trend #B': 'CPU 1 Temperature',
            'Trend #C': 'CPU 2 Temperature',
            'Trend #D': 'Exhaust Temperature',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setUnit('celsius')
    .setOption('cellHeight', 'md' as any)
    .setOption('showHeader', true)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('Hostname')
        .overrideCustomFieldConfig('filterable', true);
    })
    .build();
}

// ============================================================================
// ENVIRONMENTAL TAB - Complete implementation with all 8 rows
// ============================================================================
