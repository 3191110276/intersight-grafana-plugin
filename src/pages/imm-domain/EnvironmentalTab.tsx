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
                    body: getChassisPowerConsumptionPanel(),
                  }),
                ],
              }),
            },
          ],
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
                    body: getFIIntakeTemperaturePanel(),
                  }),
                  new SceneFlexItem({
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
                    body: getFICPUTemperaturePanel(),
                  }),
                  new SceneFlexItem({
                    body: getFIASICTemperaturePanel(),
                  }),
                ],
              }),
            },
          ],
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
                    body: getCoolingBudgetPanel(),
                  }),
                ],
              }),
            },
          ],
        }),
      }),
    ],
  });

  // Main layout with all collapsible rows
  return new SceneGridLayout({
    children: [
      powerSupplyStatusRow,
      domainPowerConsumptionRow,
      hostPowerConsumptionRow,
      fiFantSpeedRow,
      chassisFantSpeedRow,
      fiTemperatureRow,
      chassisTemperatureRow,
      hostTemperatureRow,
    ],
  });
}

// ============================================================================
// CPU UTILIZATION TAB - Single table with CPU metrics and temperatures
// ============================================================================

