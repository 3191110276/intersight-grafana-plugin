/**
 * Environmental Tab - IMM Domain Scene
 *
 * This module provides the Environmental tab functionality for the IMM Domain scene.
 * Shows environmental metrics for FI including temperature.
 */

import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';

export function getEnvironmentalTab() {
  // Row 0: Power Supply Status (single panel)
  const powerSupplyStatusRow = new SceneGridRow({
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
        body: getPowerSupplyStatusPanel(),
      }),
    ],
  });

  // Row 1: Domain Power Consumption (with nested tabs)
  const domainPowerConsumptionRow = new SceneGridRow({
    title: 'Domain Power Consumption',
    isCollapsible: true,
    isCollapsed: false,
    y: 8,
    children: [
      new SceneGridItem({
        x: 0,
        y: 8,
        width: 24,
        height: 10,
        body: new TabbedScene({
          tabs: [
            {
              id: 'power-per-domain',
              label: 'Per Domain',
              getBody: () => new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getDomainPowerConsumptionPanel(),
                  }),
                ],
              }),
            },
            {
              id: 'power-per-fi',
              label: 'Per FI',
              getBody: () => new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getFIPowerConsumptionPanel(),
                  }),
                ],
              }),
            },
            {
              id: 'power-per-fi-pair',
              label: 'Per FI Pair',
              getBody: () => new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getFIPairPowerConsumptionPanel(),
                  }),
                ],
              }),
            },
            {
              id: 'power-per-chassis',
              label: 'Per Chassis',
              getBody: () => new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getChassisPowerConsumptionPanel(),
                  }),
                ],
              }),
            },
          ],
          activeTab: 'power-per-domain',
          body: new SceneFlexLayout({
            direction: 'column',
            children: [
              new SceneFlexItem({
                minHeight: 400,
                body: getDomainPowerConsumptionPanel(),
              }),
            ],
          }),
        }),
      }),
    ],
  });

  // Row 2: Host Power Consumption (single panel)
  const hostPowerConsumptionRow = new SceneGridRow({
    title: 'Host Power Consumption',
    isCollapsible: true,
    isCollapsed: false,
    y: 18,
    children: [
      new SceneGridItem({
        x: 0,
        y: 18,
        width: 24,
        height: 8,
        body: getHostPowerConsumptionPanel(),
      }),
    ],
  });

  // Row 3: Fabric Interconnect Fan Speed (single panel)
  const fiFantSpeedRow = new SceneGridRow({
    title: 'Fabric Interconnect Fan Speed',
    isCollapsible: true,
    isCollapsed: false,
    y: 26,
    children: [
      new SceneGridItem({
        x: 0,
        y: 26,
        width: 24,
        height: 8,
        body: getFIFanSpeedPanel(),
      }),
    ],
  });

  // Row 4: Chassis Fan Speed (single panel)
  const chassisFantSpeedRow = new SceneGridRow({
    title: 'Chassis Fan Speed',
    isCollapsible: true,
    isCollapsed: false,
    y: 34,
    children: [
      new SceneGridItem({
        x: 0,
        y: 34,
        width: 24,
        height: 8,
        body: getChassisFanSpeedPanel(),
      }),
    ],
  });

  // Row 5: Fabric Interconnect Temperature (with nested tabs, 2-panel layout)
  const fiTemperatureRow = new SceneGridRow({
    title: 'Fabric Interconnect Temperature',
    isCollapsible: true,
    isCollapsed: false,
    y: 42,
    children: [
      new SceneGridItem({
        x: 0,
        y: 42,
        width: 24,
        height: 12,
        body: new TabbedScene({
          tabs: [
            {
              id: 'fi-temp-intake-exhaust',
              label: 'Intake + Exhaust',
              getBody: () => new SceneFlexLayout({
                direction: 'row',
                children: [
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getFIIntakeTemperaturePanel(),
                  }),
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getFIExhaustTemperaturePanel(),
                  }),
                ],
              }),
            },
            {
              id: 'fi-temp-cpu-asic',
              label: 'CPU + ASIC',
              getBody: () => new SceneFlexLayout({
                direction: 'row',
                children: [
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getFICPUTemperaturePanel(),
                  }),
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getFIASICTemperaturePanel(),
                  }),
                ],
              }),
            },
          ],
          activeTab: 'fi-temp-intake-exhaust',
          body: new SceneFlexLayout({
            direction: 'row',
            children: [
              new SceneFlexItem({
                minHeight: 400,
                body: getFIIntakeTemperaturePanel(),
              }),
              new SceneFlexItem({
                minHeight: 400,
                body: getFIExhaustTemperaturePanel(),
              }),
            ],
          }),
        }),
      }),
    ],
  });

  // Row 6: Chassis Temperature (2-panel layout)
  const chassisTemperatureRow = new SceneGridRow({
    title: 'Chassis Temperature',
    isCollapsible: true,
    isCollapsed: false,
    y: 54,
    children: [
      new SceneGridItem({
        x: 0,
        y: 54,
        width: 24,
        height: 10,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              body: getChassisIntakeTemperaturePanel(),
            }),
            new SceneFlexItem({
              body: getChassisExhaustTemperaturePanel(),
            }),
          ],
        }),
      }),
    ],
  });

  // Row 7: Host Temperature (with nested tabs)
  const hostTemperatureRow = new SceneGridRow({
    title: 'Host Temperature',
    isCollapsible: true,
    isCollapsed: false,
    y: 64,
    children: [
      new SceneGridItem({
        x: 0,
        y: 64,
        width: 24,
        height: 12,
        body: new TabbedScene({
          tabs: [
            {
              id: 'host-temp-temperature',
              label: 'Temperature',
              getBody: () => new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getHostTemperaturePanel(),
                  }),
                ],
              }),
            },
            {
              id: 'host-temp-cooling-budget',
              label: 'Cooling Budget',
              getBody: () => new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexItem({
                    minHeight: 400,
                    body: getCoolingBudgetPanel(),
                  }),
                ],
              }),
            },
          ],
          activeTab: 'host-temp-temperature',
          body: new SceneFlexLayout({
            direction: 'column',
            children: [
              new SceneFlexItem({
                minHeight: 400,
                body: getHostTemperaturePanel(),
              }),
            ],
          }),
        }),
      }),
    ],
  });

  // Main layout - completely flattened without any nested TabbedScene to avoid scene graph issues
  // All panels are shown in a single vertical stack
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Power Supply Status
      new SceneFlexItem({
        minHeight: 300,
        body: getPowerSupplyStatusPanel(),
      }),
      // Domain Power Consumption - Per Domain
      new SceneFlexItem({
        minHeight: 300,
        body: getDomainPowerConsumptionPanel(),
      }),
      // Domain Power Consumption - Per FI
      new SceneFlexItem({
        minHeight: 300,
        body: getFIPowerConsumptionPanel(),
      }),
      // Domain Power Consumption - Per FI Pair
      new SceneFlexItem({
        minHeight: 300,
        body: getFIPairPowerConsumptionPanel(),
      }),
      // Domain Power Consumption - Per Chassis
      new SceneFlexItem({
        minHeight: 300,
        body: getChassisPowerConsumptionPanel(),
      }),
      // Host Power Consumption
      new SceneFlexItem({
        minHeight: 300,
        body: getHostPowerConsumptionPanel(),
      }),
      // FI Fan Speed
      new SceneFlexItem({
        minHeight: 300,
        body: getFIFanSpeedPanel(),
      }),
      // Chassis Fan Speed
      new SceneFlexItem({
        minHeight: 300,
        body: getChassisFanSpeedPanel(),
      }),
      // FI Temperature - Intake
      new SceneFlexItem({
        minHeight: 300,
        body: getFIIntakeTemperaturePanel(),
      }),
      // FI Temperature - Exhaust
      new SceneFlexItem({
        minHeight: 300,
        body: getFIExhaustTemperaturePanel(),
      }),
      // FI Temperature - CPU
      new SceneFlexItem({
        minHeight: 300,
        body: getFICPUTemperaturePanel(),
      }),
      // FI Temperature - ASIC
      new SceneFlexItem({
        minHeight: 300,
        body: getFIASICTemperaturePanel(),
      }),
      // Chassis Temperature - Intake
      new SceneFlexItem({
        minHeight: 300,
        body: getChassisIntakeTemperaturePanel(),
      }),
      // Chassis Temperature - Exhaust
      new SceneFlexItem({
        minHeight: 300,
        body: getChassisExhaustTemperaturePanel(),
      }),
      // Host Temperature
      new SceneFlexItem({
        minHeight: 300,
        body: getHostTemperaturePanel(),
      }),
      // Host Cooling Budget
      new SceneFlexItem({
        minHeight: 300,
        body: getCoolingBudgetPanel(),
      }),
    ],
  });
}

// ============================================================================
// Panel Builder Functions
// ============================================================================

/**
 * Power Supply Status Panel
 * Shows active PSUs per device as stacked bars
 */
function getPowerSupplyStatusPanel() {
  return PanelBuilders.timeseries()
    .setTitle('Active PSUs per device')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.power_supply.instrument eq true) and (fi_name eq \'${fi_name}\')&agg=longMin:hw.status_min:agg=longSum',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.status_min', text: 'hw.status_min', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'groupingToMatrix',
          processorOptions: {
            matrixColumns: 'Hostname',
            matrixRows: 'Time',
            matrixValue: 'hw.status_min',
          },
        },
      })
    )
    .setCustomFieldConfig('drawStyle', 'bars')
    .setCustomFieldConfig('fillOpacity', 100)
    .setCustomFieldConfig('stacking', { mode: 'normal' })
    .setCustomFieldConfig('barAlignment', 0)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'semi-dark-red' },
        { value: 100, color: 'transparent' },
      ],
    })
    .setDecimals(0)
    .build();
}

/**
 * Domain Power Consumption Panel
 * Shows power consumption per domain (max)
 */
function getDomainPowerConsumptionPanel() {
  return PanelBuilders.timeseries()
    .setTitle('Power consumption per Domain (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.power_supply.instrument eq true) and (fi_name eq \'${fi_name}\') and ((host_type eq \'equipment.Chassis\') or (host_type eq \'network.Element\') or (host_type eq \'compute.RackUnit\'))&agg=doubleMax:hw.power_max:agg=doubleSum:domain_name',
            root_selector: '$.Results',
            columns: [
              { selector: 'domain_name', text: 'domain_name', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.power_max', text: 'hw.power_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Power (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('watt')
    .build();
}

/**
 * FI Power Consumption Panel
 * Shows power consumption per FI (max)
 */
function getFIPowerConsumptionPanel() {
  return PanelBuilders.timeseries()
    .setTitle('Power consumption per FI (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.host.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'network.Element\')&agg=doubleMax:hw.host.power_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.host.power_max', text: 'hw.host.power_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Host Power (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('watt')
    .build();
}

/**
 * FI Pair Power Consumption Panel
 * Shows power consumption per domain (max) - FI pairs aggregated
 */
function getFIPairPowerConsumptionPanel() {
  return PanelBuilders.timeseries()
    .setTitle('Power consumption per Domain (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (host_type eq \'network.Element\') and (fi_name eq \'${fi_name}\')&nested=hw.host&agg=doubleMax:hw.host.power_max:agg=doubleSum:domain_name',
            root_selector: '$.Results',
            columns: [
              { selector: 'domain_name', text: 'domain_name', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.host.power_max', text: 'hw.host.power_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
      })
    )
    .setUnit('watt')
    .build();
}

/**
 * Chassis Power Consumption Panel
 * Shows power consumption per chassis (max)
 */
function getChassisPowerConsumptionPanel() {
  return PanelBuilders.timeseries()
    .setTitle('Power consumption per Chassis (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.power_supply.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'equipment.Chassis\')&agg=doubleMax:hw.power_max:agg=doubleSum',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.power_max', text: 'hw.power_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
      })
    )
    .setUnit('watt')
    .build();
}

/**
 * Host Power Consumption Panel
 * Shows power consumption for compute blades in table format
 */
function getHostPowerConsumptionPanel() {
  return PanelBuilders.table()
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.host.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'compute.Blade\')&agg=doubleMax:hw.host.power_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.host.power_max', text: 'hw.host.power_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'timeSeriesTable',
          processorOptions: {},
        },
      })
    )
    .setUnit('watt')
    .setOverrides((builder) => {
      builder.matchFieldsWithName('Trend #A').overrideDisplayName('Power').overrideColor({ mode: 'fixed', fixedColor: 'semi-dark-blue' });
    })
    .build();
}

/**
 * FI Fan Speed Panel
 * Shows average fan speed per FI
 */
function getFIFanSpeedPanel() {
  return PanelBuilders.timeseries()
    .setTitle('Fan Speed per FI (Avg)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.fan.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'network.Element\')&agg=longSum:hw.fan.speed_count,longSum:hw.fan.speed',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.fan.speed_count', text: 'hw.fan.speed_count', type: 'number' },
              { selector: 'hw.fan.speed', text: 'hw.fan.speed', type: 'number' },
            ],
            format: 'timeseries',
          },
          {
            refId: 'B',
            queryType: 'infinity',
            type: 'expression',
            expression: '$A{hw.fan.speed} / $A{hw.fan.speed_count}',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Fan Speed (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('rotrpm')
    .build();
}

/**
 * Chassis Fan Speed Panel
 * Shows average fan speed per chassis
 */
function getChassisFanSpeedPanel() {
  return PanelBuilders.timeseries()
    .setTitle('Fan Speed per Chassis (Avg)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.fan.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'equipment.Chassis\')&agg=longSum:hw.fan.speed_count,longSum:hw.fan.speed',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.fan.speed_count', text: 'hw.fan.speed_count', type: 'number' },
              { selector: 'hw.fan.speed', text: 'hw.fan.speed', type: 'number' },
            ],
            format: 'timeseries',
          },
          {
            refId: 'B',
            queryType: 'infinity',
            type: 'expression',
            expression: '$A{hw.fan.speed} / $A{hw.fan.speed_count}',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Fan Speed (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('rotrpm')
    .build();
}

/**
 * FI Intake Temperature Panel
 * Shows FI front intake temperature (max)
 */
function getFIIntakeTemperaturePanel() {
  return PanelBuilders.timeseries()
    .setTitle('FI Intake Temperature (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'network.Element\') and (name eq \'TEMP_FRONT\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Temperature (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute',
      steps: [
        { value: 0, color: 'transparent' },
        { value: 50, color: 'dark-yellow' },
        { value: 60, color: 'dark-red' },
      ],
    })
    .build();
}

/**
 * FI Exhaust Temperature Panel
 * Shows FI rear exhaust temperature (max)
 */
function getFIExhaustTemperaturePanel() {
  return PanelBuilders.timeseries()
    .setTitle('FI Exhaust Temperature (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'network.Element\') and (name eq \'TEMP_REAR\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Temperature (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute',
      steps: [
        { value: 0, color: 'transparent' },
        { value: 50, color: 'dark-yellow' },
        { value: 60, color: 'dark-red' },
      ],
    })
    .build();
}

/**
 * FI CPU Temperature Panel
 * Shows FI CPU temperature (max)
 */
function getFICPUTemperaturePanel() {
  return PanelBuilders.timeseries()
    .setTitle('FI CPU Temperature (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'network.Element\') and (name like \'%CPU%\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Temperature (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute',
      steps: [
        { value: 0, color: 'transparent' },
        { value: 50, color: 'dark-yellow' },
        { value: 60, color: 'dark-red' },
      ],
    })
    .build();
}

/**
 * FI ASIC Temperature Panel
 * Shows FI ASIC temperature (max)
 */
function getFIASICTemperaturePanel() {
  return PanelBuilders.timeseries()
    .setTitle('FI ASIC Temperature (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'network.Element\') and (name like \'%ASIC%\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Temperature (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute',
      steps: [
        { value: 0, color: 'transparent' },
        { value: 50, color: 'dark-yellow' },
        { value: 60, color: 'dark-red' },
      ],
    })
    .build();
}

/**
 * Chassis Intake Temperature Panel
 * Shows chassis front intake temperature (max)
 */
function getChassisIntakeTemperaturePanel() {
  return PanelBuilders.timeseries()
    .setTitle('Chassis Intake Temperature (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'equipment.Chassis\') and (name eq \'TEMP_FRONT\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Temperature (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute',
      steps: [
        { value: 0, color: 'transparent' },
        { value: 50, color: 'dark-yellow' },
        { value: 60, color: 'dark-red' },
      ],
    })
    .build();
}

/**
 * Chassis Exhaust Temperature Panel
 * Shows chassis rear exhaust temperature (max)
 */
function getChassisExhaustTemperaturePanel() {
  return PanelBuilders.timeseries()
    .setTitle('Chassis Exhaust Temperature (Max)')
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'equipment.Chassis\') and (name eq \'TEMP_REAR\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'renameByRegex',
          processorOptions: {
            regex: 'Temperature (.*)',
            renamePattern: '$1',
          },
        },
      })
    )
    .setUnit('celsius')
    .setThresholds({
      mode: 'absolute',
      steps: [
        { value: 0, color: 'transparent' },
        { value: 50, color: 'dark-yellow' },
        { value: 60, color: 'dark-red' },
      ],
    })
    .build();
}

/**
 * Host Temperature Panel
 * Shows temperature metrics for compute blades (intake, CPU1, CPU2, exhaust)
 */
function getHostTemperaturePanel() {
  return PanelBuilders.table()
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'compute.Blade\') and (name eq \'server_front\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
          {
            refId: 'B',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'compute.Blade\') and (name eq \'P1_TEMP_SENS\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
          {
            refId: 'C',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'compute.Blade\') and (name eq \'P2_TEMP_SENS\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
          {
            refId: 'D',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'compute.Blade\') and (name eq \'server_back\')&agg=longMax:hw.temperature_max',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
            ],
            format: 'timeseries',
          },
        ],
        $data: {
          processor: 'timeSeriesTable',
          processorOptions: {},
        },
      })
    )
    .setUnit('celsius')
    .setOverrides((builder) => {
      builder.matchFieldsWithName('Trend #A').overrideDisplayName('Intake Temperature');
      builder.matchFieldsWithName('Trend #B').overrideDisplayName('CPU 1 Temperature');
      builder.matchFieldsWithName('Trend #C').overrideDisplayName('CPU 2 Temperature');
      builder.matchFieldsWithName('Trend #D').overrideDisplayName('Exhaust Temperature');
    })
    .build();
}

/**
 * Cooling Budget Panel
 * Shows temperature margin before reaching critical thresholds
 */
function getCoolingBudgetPanel() {
  return PanelBuilders.table()
    .setData(
      new SceneQueryRunner({
        datasource: { uid: '${Account}' },
        queries: [
          {
            refId: 'A',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'compute.Blade\') and (name eq \'server_front\')&agg=longMax:hw.temperature_max,longMax:hw.temperature_threshold_critical',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
              { selector: 'hw.temperature_threshold_critical', text: 'hw.temperature_threshold_critical', type: 'number' },
            ],
            format: 'timeseries',
          },
          {
            refId: 'A_Expr',
            queryType: 'infinity',
            type: 'expression',
            expression: '$A{hw.temperature_threshold_critical} - $A{hw.temperature_max}',
          },
          {
            refId: 'B',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'compute.Blade\') and (name eq \'P1_TEMP_SENS\')&agg=longMax:hw.temperature_max,longMax:hw.temperature_threshold_degraded',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
              { selector: 'hw.temperature_threshold_degraded', text: 'hw.temperature_threshold_degraded', type: 'number' },
            ],
            format: 'timeseries',
          },
          {
            refId: 'B_Expr',
            queryType: 'infinity',
            type: 'expression',
            expression: '$B{hw.temperature_threshold_degraded} - $B{hw.temperature_max}',
          },
          {
            refId: 'C',
            queryType: 'infinity',
            type: 'json',
            source: 'url',
            parser: 'backend',
            url: '/api/v1/cq/PhysicalEntities?$filter=(domain_name eq \'${domain_name}\') and (hw.temperature.instrument eq true) and (fi_name eq \'${fi_name}\') and (host_type eq \'compute.Blade\') and (name eq \'P2_TEMP_SENS\')&agg=longMax:hw.temperature_max,longMax:hw.temperature_threshold_degraded',
            root_selector: '$.Results',
            columns: [
              { selector: 'Hostname', text: 'Hostname', type: 'string' },
              { selector: 'Time', text: 'Time', type: 'timestamp' },
              { selector: 'hw.temperature_max', text: 'hw.temperature_max', type: 'number' },
              { selector: 'hw.temperature_threshold_degraded', text: 'hw.temperature_threshold_degraded', type: 'number' },
            ],
            format: 'timeseries',
          },
          {
            refId: 'C_Expr',
            queryType: 'infinity',
            type: 'expression',
            expression: '$C{hw.temperature_threshold_degraded} - $C{hw.temperature_max}',
          },
        ],
        $data: {
          processor: 'timeSeriesTable',
          processorOptions: {},
        },
      })
    )
    .setUnit('celsius')
    .setOverrides((builder) => {
      builder.matchFieldsWithName('Trend #A_Expr').overrideDisplayName('Intake Temperature');
      builder.matchFieldsWithName('Trend #B_Expr').overrideDisplayName('Processor 1');
      builder.matchFieldsWithName('Trend #C_Expr').overrideDisplayName('Processor 2');
    })
    .build();
}
