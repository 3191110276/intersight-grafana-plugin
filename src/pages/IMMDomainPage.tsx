import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  QueryVariable,
  SceneVariableSet,
  VariableValueSelectors,
  SceneQueryRunner,
  SceneDataTransformer,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
  EmbeddedScene,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
} from '@grafana/scenes';
import { TableCellDisplayMode } from '@grafana/schema';
import { TabbedScene } from '../components/TabbedScene';
import React from 'react';
import { TabsBar, Tab } from '@grafana/ui';

// ============================================================================
// TAB PLACEHOLDER FUNCTIONS
// These will be implemented in subsequent phases
// ============================================================================

function getOverviewTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Alarms row - repeated by DomainName variable
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Alarms',
              isCollapsed: false,
              y: 0,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 0,
                  width: 6,
                  height: 5,
                  body: getAlarmsPanel(),
                  $behaviors: [
                    {
                      _isSceneBehavior: true,
                      repeatDirection: 'h',
                      variableName: 'DomainName',
                      maxPerRow: 4,
                    } as any,
                  ],
                }),
              ],
            }),
          ],
        }),
      }),

      // Actions row - repeated by DomainName variable
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Actions',
              isCollapsed: false,
              y: 5,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 5,
                  width: 6,
                  height: 5,
                  body: getActionsPanel(),
                  $behaviors: [
                    {
                      _isSceneBehavior: true,
                      repeatDirection: 'h',
                      variableName: 'DomainName',
                      maxPerRow: 4,
                    } as any,
                  ],
                }),
              ],
            }),
          ],
        }),
      }),

      // Network Utilization with nested tabs
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Network Utilization',
              isCollapsed: false,
              y: 10,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 10,
                  width: 24,
                  height: 12,
                  body: getNetworkUtilizationTabs(),
                }),
              ],
            }),
          ],
        }),
      }),

      // Congestion row
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Congestion',
              isCollapsed: false,
              y: 22,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 22,
                  width: 12,
                  height: 12,
                  body: getTransmitPausePanel(),
                }),
                new SceneGridItem({
                  x: 12,
                  y: 22,
                  width: 12,
                  height: 12,
                  body: getReceivePausePanel(),
                }),
              ],
            }),
          ],
        }),
      }),

      // Network Errors row
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'Network Errors',
              isCollapsed: false,
              y: 34,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 34,
                  width: 24,
                  height: 12,
                  body: getNetworkErrorsPanel(),
                }),
              ],
            }),
          ],
        }),
      }),

      // CPU Utilization row
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            new SceneGridRow({
              title: 'CPU Utilization',
              isCollapsed: false,
              y: 46,
              children: [
                new SceneGridItem({
                  x: 0,
                  y: 46,
                  width: 12,
                  height: 12,
                  body: getCPUUtilizationPerDomainPanel(),
                }),
                new SceneGridItem({
                  x: 12,
                  y: 46,
                  width: 12,
                  height: 12,
                  body: getTopServersByCPUPanel(),
                }),
              ],
            }),
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// OVERVIEW TAB HELPER FUNCTIONS - Alarms, Actions, Network Utilization, etc.
// ============================================================================

// Placeholder helper functions for the Overview tab panels
// Note: These are simplified versions for now - they can be enhanced with full implementations

function getAlarmsPanel() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: "/api/v1/cond/Alarms?$filter=((startswith(AffectedMoDisplayName, '${DomainName:text}')) and Severity ne 'Cleared')&$apply=groupby((Severity),%20aggregate($count%20as%20count))",
        root_selector: '$.Results',
        columns: [],
        filters: [],
        url_options: { data: '', method: 'GET' },
      } as any,
    ],
  });

  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'rowsToFields',
        options: {
          mappings: [
            { fieldName: 'Severity', handlerKey: 'field.name' },
            { fieldName: 'count', handlerKey: 'field.value' },
          ],
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: { Critical: 0, Warning: 1 },
          renameByName: {},
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('${DomainName}')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      builder.matchFieldsWithName('Critical').overrideColor({ fixedColor: 'dark-red', mode: 'fixed' });
      builder.matchFieldsWithName('Warning').overrideColor({ fixedColor: 'dark-orange', mode: 'fixed' });
      builder.matchFieldsWithName('Info').overrideColor({ fixedColor: 'dark-blue', mode: 'fixed' });
    })
    .build();
}

function getActionsPanel() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: "/api/v1/workflow/WorkflowInfos?$skip=0&$top=1000&$filter=((startswith(WorkflowCtx.TargetCtxList.TargetName, '${DomainName:text}')))&$apply=groupby((WorkflowStatus),%20aggregate($count%20as%20count))",
        root_selector: '$.Results',
        columns: [],
        filters: [],
        url_options: { data: '', method: 'GET' },
      } as any,
    ],
  });

  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'rowsToFields',
        options: {
          mappings: [
            { fieldName: 'count', handlerKey: 'field.value' },
            { fieldName: 'WorkflowStatus', handlerKey: 'field.name' },
          ],
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: { Completed: 0, Failed: 1 },
          renameByName: { Completed: 'Success', Failed: 'Fail', Terminated: 'Terminated' },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('${DomainName}')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      builder.matchFieldsWithName('Success').overrideColor({ fixedColor: 'dark-green', mode: 'fixed' });
      builder.matchFieldsWithName('Fail').overrideColor({ fixedColor: 'dark-red', mode: 'fixed' });
      builder.matchFieldsWithName('Terminated').overrideColor({ fixedColor: '#565656', mode: 'fixed' });
    })
    .build();
}

function getNetworkUtilizationTabs() {
  return new TabbedScene({
    tabs: [
      { id: 'percent', label: 'Percentage (%)', getBody: () => getNetworkUtilizationPercentageContent() },
      { id: 'absolute', label: 'Absolute (bps)', getBody: () => getNetworkUtilizationAbsoluteContent() },
    ],
    activeTab: 'percent',
    body: getNetworkUtilizationPercentageContent(),
  });
}

function getNetworkUtilizationPercentageContent() {
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({ width: '50%', body: getTransmitUtilizationPercentPanel() }),
      new SceneFlexItem({ width: '50%', body: getReceiveUtilizationPercentPanel() }),
    ],
  });
}

function getNetworkUtilizationAbsoluteContent() {
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({ width: '50%', body: getTransmitUtilizationBpsPanel() }),
      new SceneFlexItem({ width: '50%', body: getReceiveUtilizationBpsPanel() }),
    ],
  });
}

function getTransmitUtilizationPercentPanel() {
  return PanelBuilders.text()
    .setTitle('Transmit Utilization (%)')
    .setOption('content', 'Transmit utilization per port (percentage)')
    .setOption('mode', 'markdown' as any)
    .build();
}

function getReceiveUtilizationPercentPanel() {
  return PanelBuilders.text()
    .setTitle('Receive Utilization (%)')
    .setOption('content', 'Receive utilization per port (percentage)')
    .setOption('mode', 'markdown' as any)
    .build();
}

function getTransmitUtilizationBpsPanel() {
  return PanelBuilders.text()
    .setTitle('Transmit Utilization (bps)')
    .setOption('content', 'Transmit utilization per port (bits per second)')
    .setOption('mode', 'markdown' as any)
    .build();
}

function getReceiveUtilizationBpsPanel() {
  return PanelBuilders.text()
    .setTitle('Receive Utilization (bps)')
    .setOption('content', 'Receive utilization per port (bits per second)')
    .setOption('mode', 'markdown' as any)
    .build();
}

function getTransmitPausePanel() {
  return PanelBuilders.text()
    .setTitle('Transmit Pause')
    .setOption('content', 'Transmit pause frames')
    .setOption('mode', 'markdown' as any)
    .build();
}

function getReceivePausePanel() {
  return PanelBuilders.text()
    .setTitle('Receive Pause')
    .setOption('content', 'Receive pause frames')
    .setOption('mode', 'markdown' as any)
    .build();
}

function getNetworkErrorsPanel() {
  return PanelBuilders.text()
    .setTitle('Network Errors')
    .setOption('content', 'Network errors by port')
    .setOption('mode', 'markdown' as any)
    .build();
}

function getCPUUtilizationPerDomainPanel() {
  return PanelBuilders.text()
    .setTitle('CPU Utilization per Domain')
    .setOption('content', 'CPU utilization statistics per domain')
    .setOption('mode', 'markdown' as any)
    .build();
}

function getTopServersByCPUPanel() {
  return PanelBuilders.text()
    .setTitle('Top Servers by CPU')
    .setOption('content', 'Servers ranked by CPU utilization')
    .setOption('mode', 'markdown' as any)
    .build();
}

// ============================================================================
// INVENTORY TAB - Fabric Interconnect, Chassis, Server panels
// ============================================================================

// Domain-specific helper functions for creating panels filtered to a specific domain
function getFabricInterconnectAPanel(domainName?: string) {
  // Query for FI-A (panel-171 from original dashboard)
  // If domainName is provided, hardcode it in the query; otherwise use the variable
  const filterClause = domainName
    ? `Name eq '${domainName} FI-A'`
    : `Name eq '\${DomainName} FI-A'`;

  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/network/ElementSummaries?$filter=${filterClause}&$top=1000`,
        root_selector: '$.Results',
        columns: [
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'BundleVersion', text: 'Firmware', type: 'string' },
          { selector: 'AdminEvacState', text: 'AdminEvacState', type: 'string' },
          { selector: 'OperEvacState', text: 'OperEvacState', type: 'string' },
          { selector: 'EthernetSwitchingMode', text: 'EthernetSwitchingMode', type: 'string' },
          { selector: 'FcSwitchingMode', text: 'FcSwitchingMode', type: 'string' },
          { selector: 'InterClusterLinkState', text: 'ISL State', type: 'string' },
          { selector: 'Thermal', text: 'Thermal', type: 'string' },
          { selector: 'InbandIpAddress', text: 'Inband IP', type: 'string' },
          { selector: 'InbandVlan', text: 'Inband VLAN', type: 'string' },
          { selector: 'OutOfBandIpAddress', text: 'OOB IP', type: 'string' },
          { selector: 'NumEtherPorts', text: 'Eth Ports', type: 'number' },
          { selector: 'NumEtherPortsLinkUp', text: 'Eth Up', type: 'number' },
          { selector: 'NumEtherPortsConfigured', text: 'Eth Configured', type: 'number' },
          { selector: 'NumFcPorts', text: 'FC Ports', type: 'number' },
          { selector: 'NumFcPortsLinkUp', text: 'FC Up', type: 'number' },
          { selector: 'NumFcPortsConfigured', text: 'FC Configured', type: 'number' },
        ],
        computed_columns: [
          { selector: "EthernetSwitchingMode + '/' + FcSwitchingMode", text: 'Switching Mode', type: 'string' },
          { selector: "AdminEvacState + '/' + OperEvacState", text: 'Evacuation', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            AdminEvacState: true,
            OperEvacState: true,
            EthernetSwitchingMode: true,
            FcSwitchingMode: true,
            Moid: true,
          },
          indexByName: {
            Name: 0,
            Serial: 1,
            Model: 2,
            Firmware: 3,
            Critical: 4,
            Warning: 5,
            'ISL State': 6,
            Thermal: 7,
            'Inband IP': 8,
            'Inband VLAN': 9,
            'OOB IP': 10,
            'Switching Mode': 11,
            Evacuation: 12,
            'Eth Ports': 13,
            'Eth Up': 14,
            'Eth Configured': 15,
            'FC Ports': 16,
            'FC Up': 17,
            'FC Configured': 18,
          },
          renameByName: {},
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('FI-A')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // ISL State column
      builder.matchFieldsWithName('ISL State')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { Up: { color: 'transparent', index: 0, text: 'Up' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Down' } } },
        ]);

      // Thermal column
      builder.matchFieldsWithName('Thermal')
        .overrideCustomFieldConfig('width', 70)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { ok: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Evacuation column
      builder.matchFieldsWithName('Evacuation')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'disabled/disabled': { color: 'transparent', index: 0, text: 'Disabled' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-yellow', index: 1, text: 'Active' } } },
        ]);
    })
    .build();
}

function getFabricInterconnectBPanel(domainName?: string) {
  // Query for FI-B (panel-172 from original dashboard)
  // If domainName is provided, hardcode it in the query; otherwise use the variable
  const filterClause = domainName
    ? `Name eq '${domainName} FI-B'`
    : `Name eq '\${DomainName} FI-B'`;

  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/network/ElementSummaries?$filter=${filterClause}&$top=1000`,
        root_selector: '$.Results',
        columns: [
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'BundleVersion', text: 'Firmware', type: 'string' },
          { selector: 'AdminEvacState', text: 'AdminEvacState', type: 'string' },
          { selector: 'OperEvacState', text: 'OperEvacState', type: 'string' },
          { selector: 'EthernetSwitchingMode', text: 'EthernetSwitchingMode', type: 'string' },
          { selector: 'FcSwitchingMode', text: 'FcSwitchingMode', type: 'string' },
          { selector: 'InterClusterLinkState', text: 'ISL State', type: 'string' },
          { selector: 'Thermal', text: 'Thermal', type: 'string' },
          { selector: 'InbandIpAddress', text: 'Inband IP', type: 'string' },
          { selector: 'InbandVlan', text: 'Inband VLAN', type: 'string' },
          { selector: 'OutOfBandIpAddress', text: 'OOB IP', type: 'string' },
          { selector: 'NumEtherPorts', text: 'Eth Ports', type: 'number' },
          { selector: 'NumEtherPortsLinkUp', text: 'Eth Up', type: 'number' },
          { selector: 'NumEtherPortsConfigured', text: 'Eth Configured', type: 'number' },
          { selector: 'NumFcPorts', text: 'FC Ports', type: 'number' },
          { selector: 'NumFcPortsLinkUp', text: 'FC Up', type: 'number' },
          { selector: 'NumFcPortsConfigured', text: 'FC Configured', type: 'number' },
        ],
        computed_columns: [
          { selector: "EthernetSwitchingMode + '/' + FcSwitchingMode", text: 'Switching Mode', type: 'string' },
          { selector: "AdminEvacState + '/' + OperEvacState", text: 'Evacuation', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            AdminEvacState: true,
            OperEvacState: true,
            EthernetSwitchingMode: true,
            FcSwitchingMode: true,
            Moid: true,
          },
          indexByName: {
            Name: 0,
            Serial: 1,
            Model: 2,
            Firmware: 3,
            Critical: 4,
            Warning: 5,
            'ISL State': 6,
            Thermal: 7,
            'Inband IP': 8,
            'Inband VLAN': 9,
            'OOB IP': 10,
            'Switching Mode': 11,
            Evacuation: 12,
            'Eth Ports': 13,
            'Eth Up': 14,
            'Eth Configured': 15,
            'FC Ports': 16,
            'FC Up': 17,
            'FC Configured': 18,
          },
          renameByName: {},
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('FI-B')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // ISL State column
      builder.matchFieldsWithName('ISL State')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { Up: { color: 'transparent', index: 0, text: 'Up' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Down' } } },
        ]);

      // Thermal column
      builder.matchFieldsWithName('Thermal')
        .overrideCustomFieldConfig('width', 70)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { ok: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Evacuation column
      builder.matchFieldsWithName('Evacuation')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'disabled/disabled': { color: 'transparent', index: 0, text: 'Disabled' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-yellow', index: 1, text: 'Active' } } },
        ]);
    })
    .build();
}

function getChassisInventoryPanel(domainName?: string) {
  // Query for Chassis (panel-170 from original dashboard)
  // If domainName is provided, hardcode it in the query; otherwise use the variable
  const filterClause = domainName
    ? `startswith(Name, '${domainName}')`
    : `startswith(Name, '\${DomainName}')`;

  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/equipment/Chasses?$filter=(${filterClause})&$top=1000&$expand=ExpanderModules,FanControl($select=Mode),LocatorLed($select=OperState),PowerControlState,PsuControl`,
        root_selector: '$.Results',
        columns: [
          { selector: 'ChassisId', text: 'ChassisId', type: 'string' },
          { selector: 'ConnectionPath', text: 'ConnectionPath', type: 'string' },
          { selector: 'ConnectionStatus', text: 'ConnectionStatus', type: 'string' },
          { selector: 'FanControl.Mode', text: 'FanControlMode', type: 'string' },
          { selector: 'LocatorLed.OperState', text: 'LocatorLed', type: 'string' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'OperReason', text: 'OperReason', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'PowerControlState.AllocatedPower', text: 'AllocatedPower', type: 'number' },
          { selector: 'PowerControlState.ExtendedPowerCapacity', text: 'ExtendedPowerCapacity', type: 'string' },
          { selector: 'PowerControlState.PowerRebalancing', text: 'PowerRebalancing', type: 'string' },
          { selector: 'PowerControlState.PowerSaveMode', text: 'PowerSaveMode', type: 'string' },
          { selector: 'PsuControl.InputPowerState', text: 'InputPowerState', type: 'string' },
          { selector: 'PsuControl.OperState', text: 'PsuOperState', type: 'string' },
          { selector: 'PsuControl.OutputPowerState', text: 'OutputPowerState', type: 'string' },
          { selector: 'PsuControl.Redundancy', text: 'Redundancy', type: 'string' },
          { selector: 'AlarmSummary.Health', text: 'Health', type: 'string' },
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'AlarmSummary.Info', text: 'Info', type: 'number' },
        ],
        computed_columns: [],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            ConnectionPath: true,
            Health: true,
            Info: true,
            InputPowerState: true,
            OperReason: true,
            OutputPowerState: true,
            Moid: true,
          },
          indexByName: {
            ChassisId: 0,
            Name: 1,
            Serial: 2,
            Model: 3,
            OperState: 4,
            Critical: 7,
            Warning: 8,
            ConnectionStatus: 11,
            LocatorLed: 12,
            PsuOperState: 14,
            Redundancy: 17,
            AllocatedPower: 18,
            ExtendedPowerCapacity: 19,
            PowerRebalancing: 20,
            PowerSaveMode: 21,
            FanControlMode: 22,
          },
          renameByName: {
            AllocatedPower: 'Allocated Power',
            ChassisId: 'ID',
            ConnectionStatus: 'Connection',
            ExtendedPowerCapacity: 'Extended Power Capacity',
            FanControlMode: 'Fan Mode',
            LocatorLed: 'Locator LED',
            OperState: 'State',
            PowerRebalancing: 'Power Rebalancing',
            PowerSaveMode: 'Power Save Mode',
            PsuOperState: 'PSU State',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Chassis')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // ID column
      builder.matchFieldsWithName('ID')
        .overrideCustomFieldConfig('width', 30)
        .overrideCustomFieldConfig('align', 'center');

      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // Connection column
      builder.matchFieldsWithName('Connection')
        .overrideCustomFieldConfig('width', 95)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'A,B': { color: 'transparent', index: 0, text: 'A + B' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1 } } },
        ]);

      // Locator LED column
      builder.matchFieldsWithName('Locator LED')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { off: { color: 'transparent', index: 0, text: 'Off' }, on: { color: 'blue', index: 1, text: 'On' } } },
        ]);

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', 55)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { OK: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Error' } } },
        ]);

      // PSU State column
      builder.matchFieldsWithName('PSU State')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { OK: { color: 'transparent', index: 0, text: 'Ok' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 1, text: 'Error' } } },
        ]);

      // Redundancy column
      builder.matchFieldsWithName('Redundancy')
        .overrideCustomFieldConfig('width', 110);

      // Allocated Power column
      builder.matchFieldsWithName('Allocated Power')
        .overrideCustomFieldConfig('width', 128);

      // Fan Mode column
      builder.matchFieldsWithName('Fan Mode')
        .overrideCustomFieldConfig('width', 120);
    })
    .build();
}

function getServerInventoryPanel(domainName?: string) {
  // Query for Servers (panel-169 from original dashboard)
  // If domainName is provided, hardcode it in the query; otherwise use the variable
  const filterClause = domainName
    ? `startswith(Name, '${domainName}')`
    : `startswith(Name, '\${DomainName}')`;

  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'C',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/compute/PhysicalSummaries?$filter=(${filterClause})&$top=1000&$expand=`,
        root_selector: '$.Results',
        columns: [
          { selector: 'AdminPowerState', text: 'AdminPowerState', type: 'string' },
          { selector: 'Ancestors', text: 'Ancestors', type: 'string' },
          { selector: 'AssetTag', text: 'AssetTag', type: 'string' },
          { selector: 'AvailableMemory', text: 'AvailableMemory', type: 'string' },
          { selector: 'BiosPostComplete', text: 'BiosPostComplete', type: 'string' },
          { selector: 'ChassisId', text: 'ChassisId', type: 'string' },
          { selector: 'ConnectionStatus', text: 'ConnectionStatus', type: 'string' },
          { selector: 'CoolingMode', text: 'CoolingMode', type: 'string' },
          { selector: 'CpuCapacity', text: 'CpuCapacity', type: 'string' },
          { selector: 'EquipmentChassis', text: 'EquipmentChassis', type: 'string' },
          { selector: 'Firmware', text: 'Firmware', type: 'string' },
          { selector: 'FrontPanelLockStatus', text: 'FrontPanelLockStatus', type: 'string' },
          { selector: 'HardwareUuid', text: 'HardwareUuid', type: 'string' },
          { selector: 'InventoryParent', text: 'InventoryParent', type: 'string' },
          { selector: 'Ipv4Address', text: 'Ipv4Address', type: 'string' },
          { selector: 'KvmIpAddresses', text: 'KvmIpAddresses', type: 'string' },
          { selector: 'KvmServerStateEnabled', text: 'KvmServerStateEnabled', type: 'string' },
          { selector: 'Lifecycle', text: 'Lifecycle', type: 'string' },
          { selector: 'MgmtIpAddress', text: 'MgmtIpAddress', type: 'string' },
          { selector: 'Model', text: 'Model', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'NumAdaptors', text: 'NumAdaptors', type: 'string' },
          { selector: 'NumCpuCores', text: 'NumCpuCores', type: 'string' },
          { selector: 'NumCpuCoresEnabled', text: 'NumCpuCoresEnabled', type: 'string' },
          { selector: 'NumCpus', text: 'NumCpus', type: 'string' },
          { selector: 'NumEthHostInterfaces', text: 'NumEthHostInterfaces', type: 'string' },
          { selector: 'NumFcHostInterfaces', text: 'NumFcHostinterfaces', type: 'string' },
          { selector: 'OperPowerState', text: 'OperPowerState', type: 'string' },
          { selector: 'PackageVersion', text: 'PackageVersion', type: 'string' },
          { selector: 'PlatformType', text: 'PlatformType', type: 'string' },
          { selector: 'Presence', text: 'Presence', type: 'string' },
          { selector: 'Serial', text: 'Serial', type: 'string' },
          { selector: 'ServerId', text: 'ServerId', type: 'string' },
          { selector: 'SlotId', text: 'SlotId', type: 'string' },
          { selector: 'TotalMemory', text: 'TotalMemory', type: 'string' },
          { selector: 'TunneledKvm', text: 'TuneledKvm', type: 'string' },
          { selector: 'UserLabel', text: 'UserLabel', type: 'string' },
          { selector: 'Uuid', text: 'Uuid', type: 'string' },
          { selector: 'AlarmSummary.Health', text: 'Health', type: 'string' },
          { selector: 'AlarmSummary.Critical', text: 'Critical', type: 'number' },
          { selector: 'AlarmSummary.Warning', text: 'Warning', type: 'number' },
          { selector: 'AlarmSummary.Info', text: 'Info', type: 'number' },
        ],
        computed_columns: [
          { selector: "NumCpus + 'x ' + NumCpuCores + 'C'", text: 'CPU', type: 'string' },
          { selector: "NumEthHostInterfaces + ' Eth +' + NumFcHostinterfaces + ' FC'", text: 'Interfaces', type: 'string' },
          { selector: "OperPowerState + '#' + BiosPostComplete", text: 'Power', type: 'string' },
          { selector: "ChassisId + '/' + SlotId + '#' + ServerId", text: 'ID', type: 'string' },
          { selector: "Presence + '#' + Lifecycle", text: 'State', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            AdminPowerState: true,
            Ancestors: true,
            AssetTag: true,
            BiosPostComplete: true,
            ChassisId: true,
            ConnectionStatus: true,
            CoolingMode: true,
            CpuCapacity: true,
            EquipmentChassis: true,
            FrontPanelLockStatus: true,
            HardwareUuid: true,
            Health: true,
            Info: true,
            InventoryParent: true,
            Ipv4Address: true,
            KvmIpAddresses: true,
            KvmServerStateEnabled: true,
            Lifecycle: true,
            NumAdaptors: true,
            NumCpuCores: true,
            NumCpuCoresEnabled: true,
            NumCpus: true,
            NumEthHostInterfaces: true,
            NumFcHostinterfaces: true,
            OperPowerState: true,
            PackageVersion: true,
            Presence: true,
            ServerId: true,
            SlotId: true,
            TotalMemory: true,
            TuneledKvm: true,
            Uuid: true,
            Moid: true,
          },
          indexByName: {
            ID: 0,
            Name: 4,
            UserLabel: 6,
            Serial: 7,
            Model: 8,
            PlatformType: 9,
            Power: 10,
            State: 13,
            Critical: 17,
            Warning: 18,
            Firmware: 21,
            MgmtIpAddress: 32,
            CPU: 41,
            Interfaces: 40,
            AvailableMemory: 47,
          },
          renameByName: {
            AvailableMemory: 'Memory',
            MgmtIpAddress: 'Mgmt IP',
            PlatformType: 'Platform',
            UserLabel: 'User Label',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Server')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('sortBy', [{ displayName: 'ID', desc: false }])
    .setOverrides((builder) => {
      // ID column
      builder.matchFieldsWithName('ID')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          { type: 'regex', options: { pattern: '.*0#(.*)', result: { index: 0, text: '$1' } } },
          { type: 'regex', options: { pattern: '(.*)#0', result: { index: 1, text: '$1' } } },
        ]);

      // Critical column
      builder.matchFieldsWithName('Critical')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-red' },
          ],
        });

      // Warning column
      builder.matchFieldsWithName('Warning')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: -Infinity, color: 'transparent' },
            { value: 1, color: 'semi-dark-yellow' },
          ],
        });

      // Power column
      builder.matchFieldsWithName('Power')
        .overrideCustomFieldConfig('width', 60)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'on#true': { color: 'transparent', index: 0, text: 'On' }, 'on#false': { color: 'semi-dark-yellow', index: 1, text: 'On (BIOS Post incomplete)' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 2, text: 'Off' } } },
        ]);

      // State column
      builder.matchFieldsWithName('State')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background', mode: 'basic' })
        .overrideMappings([
          { type: 'value', options: { 'Enabled#Active': { color: 'transparent', index: 0, text: 'Ok' }, 'equipped#Active': { color: 'transparent', index: 1, text: 'Ok' }, 'equipped#DiscoveryFailed': { color: 'semi-dark-red', index: 2, text: 'Discovery Failed' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'semi-dark-red', index: 3, text: 'Presence or Lifecycle not ok' } } },
        ]);

      // CPU column
      builder.matchFieldsWithName('CPU')
        .overrideCustomFieldConfig('width', 65)
        .overrideCustomFieldConfig('align', 'center');

      // Interfaces column
      builder.matchFieldsWithName('Interfaces')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center');

      // Memory column
      builder.matchFieldsWithName('Memory')
        .overrideCustomFieldConfig('width', 75)
        .overrideCustomFieldConfig('align', 'center')
        .overrideUnit('gbytes');

      // Mgmt IP column
      builder.matchFieldsWithName('Mgmt IP')
        .overrideCustomFieldConfig('width', 105);

      // Firmware column
      builder.matchFieldsWithName('Firmware')
        .overrideCustomFieldConfig('width', 110);

      // Serial column
      builder.matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('align', 'left');

      // Platform column
      builder.matchFieldsWithName('Platform')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'left')
        .overrideMappings([
          { type: 'value', options: { IMCBlade: { index: 0, text: 'Blade' }, IMCRack: { index: 1, text: 'Rack' } } },
        ]);
    })
    .build();
}

// ============================================================================
// DYNAMIC INVENTORY SCENE - Creates tabs dynamically based on DomainName variable
// ============================================================================

interface DynamicInventorySceneState extends SceneObjectState {
  domainTabs: Array<{ id: string; label: string; getBody: () => any }>;
  activeTab: string;
  body: any;
}

/**
 * DynamicInventoryScene - Custom scene that reads the DomainName variable
 * and creates a tab for each selected domain with domain-specific inventory panels.
 */
class DynamicInventoryScene extends SceneObjectBase<DynamicInventorySceneState> {
  public static Component = DynamicInventorySceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildTabs();
      }
    },
  });

  public constructor(state: Partial<DynamicInventorySceneState>) {
    super({
      domainTabs: [],
      activeTab: '',
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildTabs();
  }

  private rebuildTabs() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Get the DomainName variable from the scene's variable set
    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('DomainName variable not found or not a query variable');
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let domainNames: string[] = [];

    if (Array.isArray(value)) {
      domainNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      domainNames = [String(value)];
    }

    // If no domains selected, show a message
    if (domainNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Domains Selected\n\nPlease select one or more domains from the Domain filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({
        domainTabs: [],
        activeTab: '',
        body: emptyBody,
      });
      return;
    }

    // Create a tab for each domain
    const newTabs = domainNames.map((domainName) => ({
      id: domainName,
      label: domainName,
      getBody: () => createDomainInventoryBody(domainName),
    }));

    // Set the active tab to the first tab if not already set or if current tab is not in new tabs
    let newActiveTab = this.state.activeTab;
    if (!newActiveTab || !newTabs.find(t => t.id === newActiveTab)) {
      newActiveTab = newTabs[0]?.id || '';
    }

    // Create the new body
    const newBody = newTabs.find(t => t.id === newActiveTab)?.getBody() || new SceneFlexLayout({ children: [] });

    // Update state - React will handle component lifecycle via key prop
    this.setState({
      domainTabs: newTabs,
      activeTab: newActiveTab,
      body: newBody,
    });
  }

  public setActiveTab(tabId: string) {
    const tab = this.state.domainTabs.find((t) => t.id === tabId);
    if (tab) {
      const newBody = tab.getBody();
      if (!newBody) {
        console.warn('getBody returned null/undefined for tab:', tabId);
        return;
      }
      // Just update state - React will handle unmounting via the key prop
      this.setState({ activeTab: tabId, body: newBody });
    }
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Creates the inventory layout for a specific domain
 */
function createDomainInventoryBody(domainName: string) {
  const fiAPanel = getFabricInterconnectAPanel(domainName);
  const fiBPanel = getFabricInterconnectBPanel(domainName);
  const chassisPanel = getChassisInventoryPanel(domainName);
  const serverPanel = getServerInventoryPanel(domainName);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Fabric Interconnect section header
      new SceneFlexItem({
        height: 30,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### Fabric Interconnect')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
      // FI-A and FI-B side by side
      new SceneFlexItem({
        height: 150,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ width: '50%', body: fiAPanel }),
            new SceneFlexItem({ width: '50%', body: fiBPanel }),
          ],
        }),
      }),
      // Chassis section
      new SceneFlexItem({
        height: 30,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### Chassis')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
      new SceneFlexItem({
        height: 250,
        body: chassisPanel,
      }),
      // Server section
      new SceneFlexItem({
        height: 30,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### Server')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
      new SceneFlexItem({
        height: 400,
        body: serverPanel,
      }),
    ],
  });
}

/**
 * Renderer component for DynamicInventoryScene
 */
function DynamicInventorySceneRenderer({ model }: SceneComponentProps<DynamicInventoryScene>) {
  const { domainTabs, activeTab, body } = model.useState();

  // If no tabs, just render the body (which contains the "no selection" message)
  if (domainTabs.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        {body && body.Component && <body.Component key="empty-body" model={body} />}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
        flexShrink: 0,
        minHeight: '48px',
      }}>
        <TabsBar style={{ border: 'none' }}>
          {domainTabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onChangeTab={() => model.setActiveTab(tab.id)}
            />
          ))}
        </TabsBar>
      </div>
      <div style={{
        flexGrow: 1,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative'
      }}>
        {body && body.Component && <body.Component key={activeTab} model={body} />}
      </div>
    </div>
  );
}

function getInventoryTab() {
  // Return the dynamic inventory scene that creates tabs based on DomainName variable selection
  return new DynamicInventoryScene({});
}

// ============================================================================
// DYNAMIC PORTS SCENE - Creates tabs dynamically based on DomainName variable
// ============================================================================

interface DynamicPortsSceneState extends SceneObjectState {
  domainTabs: Array<{ id: string; label: string; getBody: () => any }>;
  activeTab: string;
  body: any;
}

/**
 * DynamicPortsScene - Custom scene that reads the DomainName variable
 * and creates a tab for each selected domain with domain-specific port panels.
 */
class DynamicPortsScene extends SceneObjectBase<DynamicPortsSceneState> {
  public static Component = DynamicPortsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildTabs();
      }
    },
  });

  public constructor(state: Partial<DynamicPortsSceneState>) {
    super({
      domainTabs: [],
      activeTab: '',
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildTabs();
  }

  private rebuildTabs() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Get the DomainName variable from the scene's variable set
    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('DomainName variable not found or not a query variable');
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let domainNames: string[] = [];

    if (Array.isArray(value)) {
      domainNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      domainNames = [String(value)];
    }

    // If no domains selected, show a message
    if (domainNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Domains Selected\n\nPlease select one or more domains from the Domain filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({
        domainTabs: [],
        activeTab: '',
        body: emptyBody,
      });
      return;
    }

    // Create a tab for each domain
    const newTabs = domainNames.map((domainName) => ({
      id: domainName,
      label: domainName,
      getBody: () => createDomainPortsBody(domainName),
    }));

    // Set the active tab to the first tab if not already set or if current tab is not in new tabs
    let newActiveTab = this.state.activeTab;
    if (!newActiveTab || !newTabs.find(t => t.id === newActiveTab)) {
      newActiveTab = newTabs[0]?.id || '';
    }

    // Create the new body
    const newBody = newTabs.find(t => t.id === newActiveTab)?.getBody() || new SceneFlexLayout({ children: [] });

    // Update state - React will handle component lifecycle via key prop
    this.setState({
      domainTabs: newTabs,
      activeTab: newActiveTab,
      body: newBody,
    });
  }

  public setActiveTab(tabId: string) {
    const tab = this.state.domainTabs.find((t) => t.id === tabId);
    if (tab) {
      const newBody = tab.getBody();
      if (!newBody) {
        console.warn('getBody returned null/undefined for tab:', tabId);
        return;
      }
      // Just update state - React will handle unmounting via the key prop
      this.setState({ activeTab: tabId, body: newBody });
    }
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Creates the ports layout for a specific domain
 */
function createDomainPortsBody(domainName: string) {
  const portsPanel = getPortsPanelForDomain(domainName);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: portsPanel,
      }),
    ],
  });
}

/**
 * Renderer component for DynamicPortsScene
 */
function DynamicPortsSceneRenderer({ model }: SceneComponentProps<DynamicPortsScene>) {
  const { domainTabs, activeTab, body } = model.useState();

  // If no tabs, just render the body (which contains the "no selection" message)
  if (domainTabs.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        {body && body.Component && <body.Component key="empty-body" model={body} />}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
        flexShrink: 0,
        minHeight: '48px',
      }}>
        <TabsBar style={{ border: 'none' }}>
          {domainTabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onChangeTab={() => model.setActiveTab(tab.id)}
            />
          ))}
        </TabsBar>
      </div>
      <div style={{
        flexGrow: 1,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative'
      }}>
        {body && body.Component && <body.Component key={activeTab} model={body} />}
      </div>
    </div>
  );
}

function getPortsTab() {
  // Return the dynamic ports scene that creates tabs based on DomainName variable selection
  return new DynamicPortsScene({});
}

// ============================================================================
// DYNAMIC ALARMS SCENE - Shows all alarms in a single table for all selected domains
// ============================================================================

interface DynamicAlarmsSceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicAlarmsScene - Custom scene that reads the DomainName variable
 * and shows all alarms in a single table with conditional domain column visibility.
 */
class DynamicAlarmsScene extends SceneObjectBase<DynamicAlarmsSceneState> {
  public static Component = DynamicAlarmsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicAlarmsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildBody();
  }

  private rebuildBody() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Get the DomainName variable from the scene's variable set
    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('DomainName variable not found or not a query variable');
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let domainNames: string[] = [];

    if (Array.isArray(value)) {
      domainNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      domainNames = [String(value)];
    }

    // If no domains selected, show a message
    if (domainNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Domains Selected\n\nPlease select one or more domains from the Domain filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({
        body: emptyBody,
      });
      return;
    }

    // Create the alarms table with all domains
    const newBody = createAllDomainsAlarmsBody(domainNames);

    // Update state
    this.setState({
      body: newBody,
    });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Creates the alarms layout showing all domains in a single table
 */
function createAllDomainsAlarmsBody(domainNames: string[]) {
  return getAllDomainsAlarmsPanel(domainNames);
}

/**
 * Renderer component for DynamicAlarmsScene
 */
function DynamicAlarmsSceneRenderer({ model }: SceneComponentProps<DynamicAlarmsScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

function getAlarmsTab() {
  // Return the dynamic alarms scene that shows all alarms in a single table
  return new DynamicAlarmsScene({});
}

// Helper function to create Alarms panel for all selected domains (panel-63)
function getAllDomainsAlarmsPanel(domainNames: string[]) {
  const showDomainColumn = domainNames.length > 1;

  // Create a query for each domain
  const queries = domainNames.map((domainName, index) => {
    const filterClause = `((startswith(AffectedMoDisplayName, '${domainName}'))) and ((Severity ne 'Cleared') or (Severity eq 'Cleared' and ((CreateTime ge \${__from:date}) and (CreateTime le \${__to:date}) or (LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))))`;

    return {
      refId: String.fromCharCode(65 + index), // A, B, C, etc.
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `/api/v1/cond/Alarms?$top=1000&$expand=RegisteredDevice($select=PlatformType,DeviceHostname,ParentConnection,Pid)&$filter=${filterClause}&$orderby=LastTransitionTime desc`,
      root_selector: '$.Results',
      columns: [
        { selector: 'Acknowledge', text: 'Acknowledge', type: 'string' },
        { selector: 'AcknowledgeBy', text: 'AcknowledgeBy', type: 'string' },
        { selector: 'AcknowledgeTime', text: 'AcknowledgeTime', type: 'string' },
        { selector: 'AffectedMo', text: 'AffectedMo', type: 'string' },
        { selector: 'AffectedMoDisplayName', text: 'AffectedMoDisplayName', type: 'string' },
        { selector: 'AffectedMoType', text: 'AffectedMoType', type: 'string' },
        { selector: 'AlarmSummaryAggregators', text: 'AlarmSummaryAggregators', type: 'string' },
        { selector: 'AncestorMoType', text: 'AncestorMoType', type: 'string' },
        { selector: 'Code', text: 'Code', type: 'string' },
        { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
        { selector: 'Definition', text: 'Definition', type: 'string' },
        { selector: 'Description', text: 'Description', type: 'string' },
        { selector: 'Flapping', text: 'Flap', type: 'string' },
        { selector: 'FlappingCount', text: 'FlappingCount', type: 'string' },
        { selector: 'MsAffectedObject', text: 'MsAffectedObject', type: 'string' },
        { selector: 'Name', text: 'Name', type: 'string' },
        { selector: 'OrigSeverity', text: 'OrigSeverity', type: 'string' },
        { selector: 'Owners', text: 'Owners', type: 'string' },
        { selector: 'RegisteredDevice', text: 'RegisteredDevice', type: 'string' },
        { selector: 'Severity', text: 'Severity', type: 'string' },
        { selector: 'Suppressed', text: 'Suppressed', type: 'string' },
        { selector: 'LastTransitionTime', text: 'LastTransitionTime', type: 'timestamp' },
      ],
      computed_columns: [
        { selector: "Acknowledge + ' (' + AcknowledgeBy + ')'", text: 'Acknowledged', type: 'string' },
        { selector: "Flap + ' (' + FlappingCount + ')'", text: 'Flapping', type: 'string' },
        { selector: `'${domainName}'`, text: 'Domain', type: 'string' },
      ],
      url_options: {
        method: 'GET',
        data: '',
      },
    };
  });

  // Create query runner for all domains
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: queries,
  });

  // Apply transformations: merge queries, organize columns and format time
  const transformedData = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      {
        id: 'merge',
        options: {},
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Acknowledge: true,
            AcknowledgeBy: true,
            AcknowledgeTime: true,
            AffectedMo: true,
            AffectedMoDisplayName: true,
            AffectedMoType: true,
            AlarmSummaryAggregators: true,
            CreateTime: true,
            Definition: true,
            Flap: true,
            FlappingCount: true,
            MsAffectedObject: true,
            Name: true,
            OrigSeverity: true,
            Owners: true,
            RegisteredDevice: true,
            Domain: !showDomainColumn, // Hide Domain column if only one domain selected
          },
          includeByName: {},
          indexByName: {
            Acknowledge: 12,
            AcknowledgeBy: 13,
            AcknowledgeTime: 14,
            Acknowledged: 11,
            AffectedMo: 15,
            AffectedMoDisplayName: 16,
            AffectedMoType: 17,
            AlarmSummaryAggregators: 18,
            AncestorMoType: 19,
            Code: 2,
            CreateTime: 20,
            Definition: 6,
            Description: 5,
            Domain: 0, // Domain column first
            Flap: 8,
            Flapping: 7,
            FlappingCount: 9,
            LastTransitionTime: 24,
            MsAffectedObject: 21,
            Name: 1,
            OrigSeverity: 4,
            Owners: 22,
            RegisteredDevice: 23,
            Severity: 3,
            Suppressed: 10,
          },
          renameByName: {
            AncestorMoType: 'Type',
            LastTransitionTime: 'Last Transition',
          },
        },
      },
      {
        id: 'convertFieldType',
        options: {
          conversions: [
            {
              destinationType: 'time',
              targetField: 'Last Transition',
            },
          ],
          fields: {},
        },
      },
      {
        id: 'formatTime',
        options: {
          timeField: 'Last Transition',
          outputFormat: 'YYYY-MM-DD HH:mm',
          useTimezone: true,
        },
      },
    ],
  });

  // Build the alarms table panel
  const alarmsPanel = PanelBuilders.table()
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setOption('sortBy', [
      { desc: true, displayName: 'Last Transition' },
      { desc: true, displayName: 'Severity' },
    ])
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Severity column - color-coded text
      builder.matchFieldsWithName('Severity')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
            options: {
              Critical: { color: 'red', index: 0 },
              Warning: { color: 'orange', index: 1 },
              Info: { color: 'super-light-yellow', index: 2 },
              Cleared: { color: 'green', index: 3 },
            },
          },
        ]);

      // Flapping column
      builder.matchFieldsWithName('Flapping')
        .overrideCustomFieldConfig('width', 110)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'NotFlapping (0)': { index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'red', index: 1, text: '$1' },
            },
          },
        ]);

      // Suppressed column
      builder.matchFieldsWithName('Suppressed')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: 'text', index: 0, text: 'No' },
              true: { color: 'blue', index: 1, text: 'Yes' },
            },
          },
        ]);

      // Acknowledged column
      builder.matchFieldsWithName('Acknowledged')
        .overrideCustomFieldConfig('width', 140)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'None ()': { color: 'text', index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: 'Acknowledge(.*)',
              result: { color: 'blue', index: 1, text: 'Yes$1' },
            },
          },
        ]);

      // Type column
      builder.matchFieldsWithName('Type')
        .overrideCustomFieldConfig('width', 100)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'compute.Blade': { index: 0, text: 'Blade' },
              'compute.RackUnit': { index: 1, text: 'Rack Server' },
              'network.Element': { index: 2, text: 'FI' },
              'equipment.Chassis': { index: 3, text: 'Chassis' },
              'asset.Target': { index: 4, text: 'Target' },
            },
          },
        ]);

      // Last Transition column
      builder.matchFieldsWithName('Last Transition')
        .overrideCustomFieldConfig('width', 165);

      // Code column
      builder.matchFieldsWithName('Code')
        .overrideCustomFieldConfig('width', 260);

      // Domain column
      if (showDomainColumn) {
        builder.matchFieldsWithName('Domain')
          .overrideCustomFieldConfig('width', 150);
      }

      return builder.build();
    })
    .build();

  // Return layout with the alarms panel
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: alarmsPanel,
      }),
    ],
  });
}

// Helper function to create Alarms panel for a specific domain (panel-63) - DEPRECATED, kept for reference
function getAlarmsPanelForDomain(domainName: string) {
  // Build the filter clause with the actual domain name
  const filterClause = `((startswith(AffectedMoDisplayName, '${domainName}'))) and ((Severity ne 'Cleared') or (Severity eq 'Cleared' and ((CreateTime ge \${__from:date}) and (CreateTime le \${__to:date}) or (LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))))`;

  // Create query runner for Alarms
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/cond/Alarms?$top=1000&$expand=RegisteredDevice($select=PlatformType,DeviceHostname,ParentConnection,Pid)&$filter=${filterClause}&$orderby=LastTransitionTime desc`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Acknowledge', text: 'Acknowledge', type: 'string' },
          { selector: 'AcknowledgeBy', text: 'AcknowledgeBy', type: 'string' },
          { selector: 'AcknowledgeTime', text: 'AcknowledgeTime', type: 'string' },
          { selector: 'AffectedMo', text: 'AffectedMo', type: 'string' },
          { selector: 'AffectedMoDisplayName', text: 'AffectedMoDisplayName', type: 'string' },
          { selector: 'AffectedMoType', text: 'AffectedMoType', type: 'string' },
          { selector: 'AlarmSummaryAggregators', text: 'AlarmSummaryAggregators', type: 'string' },
          { selector: 'AncestorMoType', text: 'AncestorMoType', type: 'string' },
          { selector: 'Code', text: 'Code', type: 'string' },
          { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
          { selector: 'Definition', text: 'Definition', type: 'string' },
          { selector: 'Description', text: 'Description', type: 'string' },
          { selector: 'Flapping', text: 'Flap', type: 'string' },
          { selector: 'FlappingCount', text: 'FlappingCount', type: 'string' },
          { selector: 'MsAffectedObject', text: 'MsAffectedObject', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'OrigSeverity', text: 'OrigSeverity', type: 'string' },
          { selector: 'Owners', text: 'Owners', type: 'string' },
          { selector: 'RegisteredDevice', text: 'RegisteredDevice', type: 'string' },
          { selector: 'Severity', text: 'Severity', type: 'string' },
          { selector: 'Suppressed', text: 'Suppressed', type: 'string' },
          { selector: 'LastTransitionTime', text: 'LastTransitionTime', type: 'timestamp' },
        ],
        computed_columns: [
          { selector: "Acknowledge + ' (' + AcknowledgeBy + ')'", text: 'Acknowledged', type: 'string' },
          { selector: "Flap + ' (' + FlappingCount + ')'", text: 'Flapping', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      },
    ],
  });

  // Apply transformations: organize columns and format time
  const transformedData = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Acknowledge: true,
            AcknowledgeBy: true,
            AcknowledgeTime: true,
            AffectedMo: true,
            AffectedMoDisplayName: true,
            AffectedMoType: true,
            AlarmSummaryAggregators: true,
            CreateTime: true,
            Definition: true,
            Flap: true,
            FlappingCount: true,
            MsAffectedObject: true,
            Name: true,
            OrigSeverity: true,
            Owners: true,
            RegisteredDevice: true,
          },
          includeByName: {},
          indexByName: {
            Acknowledge: 11,
            AcknowledgeBy: 12,
            AcknowledgeTime: 13,
            Acknowledged: 10,
            AffectedMo: 14,
            AffectedMoDisplayName: 15,
            AffectedMoType: 16,
            AlarmSummaryAggregators: 17,
            AncestorMoType: 18,
            Code: 1,
            CreateTime: 19,
            Definition: 5,
            Description: 4,
            Flap: 7,
            Flapping: 6,
            FlappingCount: 8,
            LastTransitionTime: 23,
            MsAffectedObject: 20,
            Name: 0,
            OrigSeverity: 3,
            Owners: 21,
            RegisteredDevice: 22,
            Severity: 2,
            Suppressed: 9,
          },
          renameByName: {
            AncestorMoType: 'Type',
            LastTransitionTime: 'Last Transition',
          },
        },
      },
      {
        id: 'convertFieldType',
        options: {
          conversions: [
            {
              destinationType: 'time',
              targetField: 'Last Transition',
            },
          ],
          fields: {},
        },
      },
      {
        id: 'formatTime',
        options: {
          timeField: 'Last Transition',
          outputFormat: 'YYYY-MM-DD HH:mm',
          useTimezone: true,
        },
      },
    ],
  });

  // Build the alarms table panel
  const alarmsPanel = PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setOption('sortBy', [
      { desc: true, displayName: 'Last Transition' },
      { desc: true, displayName: 'Severity' },
    ])
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Severity column - color-coded text
      builder.matchFieldsWithName('Severity')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
            options: {
              Critical: { color: 'red', index: 0 },
              Warning: { color: 'orange', index: 1 },
              Info: { color: 'super-light-yellow', index: 2 },
              Cleared: { color: 'green', index: 3 },
            },
          },
        ]);

      // Flapping column
      builder.matchFieldsWithName('Flapping')
        .overrideCustomFieldConfig('width', 110)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'NotFlapping (0)': { index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'red', index: 1, text: '$1' },
            },
          },
        ]);

      // Suppressed column
      builder.matchFieldsWithName('Suppressed')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: 'text', index: 0, text: 'No' },
              true: { color: 'blue', index: 1, text: 'Yes' },
            },
          },
        ]);

      // Acknowledged column
      builder.matchFieldsWithName('Acknowledged')
        .overrideCustomFieldConfig('width', 140)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'None ()': { color: 'text', index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: 'Acknowledge(.*)',
              result: { color: 'blue', index: 1, text: 'Yes$1' },
            },
          },
        ]);

      // Type column
      builder.matchFieldsWithName('Type')
        .overrideCustomFieldConfig('width', 100)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'compute.Blade': { index: 0, text: 'Blade' },
              'compute.RackUnit': { index: 1, text: 'Rack Server' },
              'network.Element': { index: 2, text: 'FI' },
              'equipment.Chassis': { index: 3, text: 'Chassis' },
              'asset.Target': { index: 4, text: 'Target' },
            },
          },
        ]);

      // Last Transition column
      builder.matchFieldsWithName('Last Transition')
        .overrideCustomFieldConfig('width', 165);

      // Code column
      builder.matchFieldsWithName('Code')
        .overrideCustomFieldConfig('width', 260);

      return builder.build();
    })
    .build();

  // Return layout with the alarms panel
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: alarmsPanel,
      }),
    ],
  });
}

// ============================================================================
// DYNAMIC ACTIONS SCENE - Creates tabs dynamically based on DomainName variable
// ============================================================================

interface DynamicActionsSceneState extends SceneObjectState {
  domainTabs: Array<{ id: string; label: string; getBody: () => any }>;
  activeTab: string;
  body: any;
}

/**
 * DynamicActionsScene - Custom scene that reads the DomainName variable
 * and creates a tab for each selected domain with domain-specific actions panels.
 */
class DynamicActionsScene extends SceneObjectBase<DynamicActionsSceneState> {
  public static Component = DynamicActionsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildTabs();
      }
    },
  });

  public constructor(state: Partial<DynamicActionsSceneState>) {
    super({
      domainTabs: [],
      activeTab: '',
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildTabs();
  }

  private rebuildTabs() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Get the DomainName variable from the scene's variable set
    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('DomainName variable not found or not a query variable');
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let domainNames: string[] = [];

    if (Array.isArray(value)) {
      domainNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      domainNames = [String(value)];
    }

    // If no domains selected, show a message
    if (domainNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Domains Selected\n\nPlease select one or more domains from the Domain filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({
        domainTabs: [],
        activeTab: '',
        body: emptyBody,
      });
      return;
    }

    // Create a tab for each domain
    const newTabs = domainNames.map((domainName) => ({
      id: domainName,
      label: domainName,
      getBody: () => getActionsPanelForDomain(domainName),
    }));

    // Set the active tab to the first tab if not already set or if current tab is not in new tabs
    let newActiveTab = this.state.activeTab;
    if (!newActiveTab || !newTabs.find(t => t.id === newActiveTab)) {
      newActiveTab = newTabs[0]?.id || '';
    }

    // Create the new body
    const newBody = newTabs.find(t => t.id === newActiveTab)?.getBody() || new SceneFlexLayout({ children: [] });

    // Update state - React will handle component lifecycle via key prop
    this.setState({
      domainTabs: newTabs,
      activeTab: newActiveTab,
      body: newBody,
    });
  }

  public setActiveTab(tabId: string) {
    const tab = this.state.domainTabs.find((t) => t.id === tabId);
    if (tab) {
      const newBody = tab.getBody();
      if (!newBody) {
        console.warn('getBody returned null/undefined for tab:', tabId);
        return;
      }
      // Just update state - React will handle unmounting via the key prop
      this.setState({ activeTab: tabId, body: newBody });
    }
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Renderer component for DynamicActionsScene
 */
function DynamicActionsSceneRenderer({ model }: SceneComponentProps<DynamicActionsScene>) {
  const { domainTabs, activeTab, body } = model.useState();

  // If no tabs, just render the body (which contains the "no selection" message)
  if (domainTabs.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        {body && body.Component && <body.Component key="empty-body" model={body} />}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
        flexShrink: 0,
        minHeight: '48px',
      }}>
        <TabsBar style={{ border: 'none' }}>
          {domainTabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onChangeTab={() => model.setActiveTab(tab.id)}
            />
          ))}
        </TabsBar>
      </div>
      <div style={{
        flexGrow: 1,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative'
      }}>
        {body && body.Component && <body.Component key={activeTab} model={body} />}
      </div>
    </div>
  );
}

function getActionsTab() {
  // Return the dynamic actions scene that creates tabs based on DomainName variable selection
  return new DynamicActionsScene({});
}

// Helper function to create Actions panel for a specific domain (panel-62)
function getActionsPanelForDomain(domainName: string) {
  // Build the filter clause with the actual domain name
  const filterClause = `((startswith(WorkflowCtx.TargetCtxList.TargetName, '${domainName}'))) and ((StartTime ge \${__from:date}) and (StartTime le \${__to:date}) or (EndTime ge \${__from:date}) and (EndTime le \${__to:date}))`;

  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/workflow/WorkflowInfos?$skip=0&$top=1000&$filter=${filterClause}&$orderby=CreateTime desc`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Action', text: 'Action', type: 'string' },
          { selector: 'AssociatedObject', text: 'AssociatedObject', type: 'string' },
          { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
          { selector: 'Email', text: 'Email', type: 'string' },
          { selector: 'EndTime', text: 'EndTime', type: 'timestamp' },
          { selector: 'Input', text: 'Input', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'PauseReason', text: 'PauseReason', type: 'string' },
          { selector: 'Progress', text: 'Progress', type: 'string' },
          { selector: 'Src', text: 'Src', type: 'string' },
          { selector: 'StartTime', text: 'StartTime', type: 'timestamp' },
          { selector: 'TaskInfos', text: 'TaskInfos', type: 'string' },
          { selector: 'TraceId', text: 'TraceId', type: 'string' },
          { selector: 'Type', text: 'Type', type: 'string' },
          { selector: 'UserActionRequired', text: 'UserActionRequired', type: 'string' },
          { selector: 'UserId', text: 'UserId', type: 'string' },
          { selector: 'WaitReason', text: 'WaitReason', type: 'string' },
          { selector: 'WorkflowCtx.InitiatorCtx.InitiatorName', text: 'Initiator Name', type: 'string' },
          { selector: 'WorkflowDefinition.Moid', text: 'WorkflowDefinition', type: 'string' },
          { selector: 'WorkflowStatus', text: 'WorkflowStatus', type: 'string' },
          { selector: 'WorkflowCtx.InitiatorCtx.InitiatorType', text: 'Initiator Type', type: 'string' },
          { selector: 'Internal', text: 'Internal', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Action: true,
            AssociatedObject: true,
            Input: true,
            PauseReason: true,
            StartTime: true,
            TaskInfos: true,
            Type: true,
            UserActionRequired: true,
            UserId: true,
            WaitReason: true,
            WorkflowDefinition: true,
          },
          includeByName: {},
          indexByName: {
            Action: 8,
            AssociatedObject: 9,
            CreateTime: 5,
            Email: 1,
            EndTime: 7,
            'Initiator Name': 17,
            'Initiator Type': 18,
            Input: 10,
            Moid: 19,
            Name: 0,
            PauseReason: 11,
            Progress: 4,
            Src: 21,
            StartTime: 6,
            TaskInfos: 12,
            TraceId: 20,
            Type: 13,
            UserActionRequired: 14,
            UserId: 2,
            WaitReason: 15,
            WorkflowDefinition: 16,
            WorkflowStatus: 3,
          },
          renameByName: {
            CreateTime: 'Start Time',
            Email: 'User',
            EndTime: 'End Time',
            'Initiator Name': 'Target Name',
            'Initiator Type': 'Target Type',
            Src: 'Service',
            StartTime: '',
            WorkflowStatus: 'Status',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Start Time' }])
    .setOverrides((builder) => {
      // User field
      builder
        .matchFieldsWithName('User')
        .overrideMappings([
          {
            type: 'value',
            options: {
              'system@intersight': { color: 'super-light-blue', index: 0 },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'super-light-purple', index: 1, text: '$1' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Status field
      builder
        .matchFieldsWithName('Status')
        .overrideMappings([
          {
            type: 'value',
            options: {
              Completed: { color: 'green', index: 0, text: 'Completed' },
              Failed: { color: 'red', index: 1, text: 'Failed' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 90);

      // Progress field
      builder
        .matchFieldsWithName('Progress')
        .overrideUnit('percent')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'gauge',
          mode: 'lcd',
          valueDisplayMode: 'text',
        })
        .overrideThresholds({
          mode: 'percentage',
          steps: [{ value: 0, color: 'blue' }],
        });

      // Moid field
      builder.matchFieldsWithName('Moid').overrideCustomFieldConfig('width', 100);

      // TraceId field
      builder.matchFieldsWithName('TraceId').overrideCustomFieldConfig('width', 96);

      // Service field
      builder.matchFieldsWithName('Service').overrideCustomFieldConfig('width', 100);

      // Internal field
      builder.matchFieldsWithName('Internal').overrideCustomFieldConfig('width', 85);

      // Target Type field
      builder
        .matchFieldsWithName('Target Type')
        .overrideMappings([
          {
            type: 'value',
            options: {
              'compute.Blade': { index: 2, text: 'Blade Server' },
              'compute.BladeIdentity': { index: 5, text: 'Blade Server Identity' },
              'compute.RackUnitIdentity': { index: 6, text: 'Rack Server Identity' },
              'compute.ServerSetting': { index: 8, text: 'Server Settings' },
              'equipment.ChassisIdentity': { index: 7, text: 'Chassis Identity' },
              'equipment.IoCard': { index: 3, text: 'IO Module' },
              'equipment.SwitchOperation': { index: 9, text: 'Switch Settings' },
              'fabric.SwitchProfile': { index: 0, text: 'Domain Profile' },
              'firmware.Upgrade': { index: 4, text: 'Firmware Upgrade' },
              'server.Profile': { index: 1, text: 'Server Profile' },
            },
          },
        ]);

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: panel,
      }),
    ],
  });
}

/**
 * Creates a ports panel for a specific domain
 * Panel-210: Port status for FI-A and FI-B
 * Query A: FI-A ports
 * Query B: FI-B ports
 * Uses joinByField transformation to merge FI-A and FI-B data by port number
 */
function getPortsPanelForDomain(domainName: string) {
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      // Query A: FI-A Ports
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '$.event',
        columns: [
          { selector: 'port', text: 'port', type: 'string' },
          { selector: 'link_status', text: 'link_status', type: 'number' },
          { selector: 'link_speed', text: 'link_speed', type: 'number' },
          { selector: 'port_role', text: 'port_role', type: 'string' },
          { selector: 'physical_address', text: 'physical_address', type: 'string' },
        ],
        computed_columns: [
          { selector: "port_role + link_status", text: 'a_link_status', type: 'string' },
          { selector: "port_role + '/'", text: 'port_role_slash', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "host_name",
      "port",
      "state"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.state",
      "outputName": "state",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "port",
      "expression": "regexp_replace(name,'Ethernet1/|fc1/','')",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "selector",
          "dimension": "intersight.domain.name",
          "value": "${domainName}"
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "or",
          "fields": [
            {
              "type": "in",
              "dimension": "hw.network.port.role",
              "values": [
                "appliance",
                "eth_uplink",
                "server",
                "fcoe_uplink",
                "fcoe_storage",
                "fc_uplink",
                "fc_storage",
                "eth_monitor",
                "fc_monitor"
              ]
            },
            {
              "type": "selector",
              "dimension": "hw.network.port.role",
              "value": "unconfigured"
            }
          ]
        },
        {
          "type": "in",
          "dimension": "hw.network.port.type",
          "values": [
            "ethernet",
            "fibre_channel"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longLast",
        "name": "link_status",
        "fieldName": "hw.network.up"
      },
      {
        "type": "longLast",
        "name": "link_speed",
        "fieldName": "hw.network.bandwidth.limit"
      },
      {
        "type" : "stringLast",
        "name" : "port_role",
        "fieldName" : "port_role"
      },
      {
        "type" : "stringLast",
        "name" : "physical_address",
        "fieldName" : "physical_address"
      }
    ]
  }`,
        },
      } as any,
      // Query B: FI-B Ports
      {
        refId: 'B',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '$.event',
        columns: [
          { selector: 'port', text: 'port', type: 'string' },
          { selector: 'link_status', text: 'link_status', type: 'number' },
          { selector: 'link_speed', text: 'link_speed', type: 'number' },
          { selector: 'port_role', text: 'port_role', type: 'string' },
          { selector: 'physical_address', text: 'physical_address', type: 'string' },
        ],
        computed_columns: [
          { selector: "port_role + link_status", text: 'b_link_status', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "host_name",
      "port",
      "state"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.state",
      "outputName": "state",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "port",
      "expression": "regexp_replace(name,'Ethernet1/|fc1/','')",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "selector",
          "dimension": "intersight.domain.name",
          "value": "${domainName}"
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "or",
          "fields": [
            {
              "type": "in",
              "dimension": "hw.network.port.role",
              "values": [
                "appliance",
                "eth_uplink",
                "server",
                "fcoe_uplink",
                "fcoe_storage",
                "fc_uplink",
                "fc_storage",
                "eth_monitor",
                "fc_monitor"
              ]
            },
            {
              "type": "selector",
              "dimension": "hw.network.port.role",
              "value": "unconfigured"
            }
          ]
        },
        {
          "type": "in",
          "dimension": "hw.network.port.type",
          "values": [
            "ethernet",
            "fibre_channel"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longLast",
        "name": "link_status",
        "fieldName": "hw.network.up"
      },
      {
        "type": "longLast",
        "name": "link_speed",
        "fieldName": "hw.network.bandwidth.limit"
      },
      {
        "type" : "stringLast",
        "name" : "port_role",
        "fieldName" : "port_role"
      },
      {
        "type" : "stringLast",
        "name" : "physical_address",
        "fieldName" : "physical_address"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  // Using transformations to merge FI-A and FI-B data instead of SQL expression (which has compatibility issues in Scenes)
  const queryRunner = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      // Transformation 1: Join Query A and Query B by port field
      {
        id: 'joinByField',
        options: {
          byField: 'port',
          mode: 'outer',
        },
      },
      // Transformation 2: Rename joined fields to have proper prefixes
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {},
          renameByName: {
            'link_speed': 'a_link_speed',
            'port_role': 'a_port_role',
            'physical_address': 'a_physical_address',
            'port_role_slash': 'a_port_role_slash',
            'link_speed 1': 'b_link_speed',
            'port_role 1': 'b_port_role',
            'physical_address 1': 'b_physical_address',
          },
        },
      },
      // Transformation 3: Calculate a_link_speed_8 (a_link_speed * 8)
      {
        id: 'calculateField',
        options: {
          mode: 'binary',
          alias: 'a_link_speed_8',
          binary: {
            left: { matcher: { id: 'byName', options: 'a_link_speed' } },
            operator: '*',
            right: { fixed: '8' },
          },
          reduce: {
            reducer: 'sum',
          },
        },
      },
      // Transformation 4: Calculate b_link_speed_8 (b_link_speed * 8)
      {
        id: 'calculateField',
        options: {
          mode: 'binary',
          alias: 'b_link_speed_8',
          binary: {
            left: { matcher: { id: 'byName', options: 'b_link_speed' } },
            operator: '*',
            right: { fixed: '8' },
          },
          reduce: {
            reducer: 'sum',
          },
        },
      },
      // Transformation 5: Create port_role sync field (concatenate a_port_role_slash + b_port_role to get "role_a/role_b")
      {
        id: 'calculateField',
        options: {
          mode: 'binary',
          alias: 'port_role',
          binary: {
            left: { matcher: { id: 'byName', options: 'a_port_role_slash' } },
            operator: '+',
            right: { field: 'b_port_role' },
          },
          reduce: {
            reducer: 'sum',
          },
          replaceFields: false,
        },
      },
      // Transformation 6: Organize and rename all columns to final display names
      {
        id: 'organize',
        options: {
          excludeByName: {
            'a_link_speed': true,
            'b_link_speed': true,
            'link_status': true,
            'link_status 1': true,
            'a_port_role_slash': true,
          },
          includeByName: {},
          indexByName: {
            'port': 0,
            'port_role': 1,
            'a_port_role': 2,
            'b_port_role': 3,
            'a_link_status': 4,
            'b_link_status': 5,
            'a_link_speed': 6,
            'a_link_speed_8': 7,
            'b_link_speed': 8,
            'b_link_speed_8': 9,
            'a_physical_address': 10,
            'b_physical_address': 11,
          },
          renameByName: {
            'a_link_speed': '',
            'a_link_speed_8': 'Link Speed - A',
            'a_link_status': 'Link Status - A',
            'a_physical_address': 'MAC - A',
            'a_port_role': 'Port Role - A',
            'b_link_speed': '',
            'b_link_speed_8': 'Link Speed - B',
            'b_link_status': 'Link Status - B',
            'b_physical_address': 'MAC - B',
            'b_port_role': 'Port Role - B',
            'port': 'Port',
            'port_role': 'Role Sync',
          },
        },
      },
    ],
  });

  // Create table panel with field overrides
  const tablePanel = PanelBuilders.table()
    .setTitle('')
    .setData(queryRunner)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('sortBy', [{ displayName: 'Port', desc: false }])
    .setColor({ mode: 'thresholds' })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'dark-red', value: 0 },
      ],
    })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Port column
      builder.matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 85);

      // Port Role columns (A and B)
      builder.matchFieldsWithNameByRegex('/Port Role.*/')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              'unconfigured': { color: '#787878', index: 0, text: 'Unconfigured' },
              'server': { color: '#ffd700', index: 1, text: 'Server' },
              'eth_uplink': { color: '#1e90ff', index: 2, text: 'Ethernet Uplink' },
              'appliance': { color: '#00ffff', index: 3, text: 'Appliance' },
              'fcoe_uplink': { color: '#006400', index: 4, text: 'FCoE Uplink' },
              'fcoe_storage': { color: '#00ff00', index: 5, text: 'FCoE Storage' },
              'fc_uplink': { color: '#ff0000', index: 6, text: 'FC Uplink' },
              'fc_storage': { color: '#bc8f8f', index: 7, text: 'FC Storage' },
              'eth_monitor': { color: '#a020f0', index: 8, text: 'Ethernet SPAN' },
              'fc_monitor': { color: '#ff1493', index: 9, text: 'FC SPAN' },
            },
          },
        ]);

      // Link Status columns
      builder.matchFieldsWithNameByRegex('/Link Status.*/')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          { type: 'value', options: { 'unconfigured0': { color: '#7c0614', index: 0, text: 'Inactive' } } },
          { type: 'regex', options: { pattern: '.*1', result: { color: 'semi-dark-green', index: 1, text: 'Active' } } },
          { type: 'regex', options: { pattern: '.*0', result: { color: 'red', index: 2, text: 'Inactive' } } },
        ]);

      // Link Speed columns
      builder.matchFieldsWithNameByRegex('/Link Speed.*/')
        .overrideUnit('bps')
        .overrideMappings([
          { type: 'value', options: { '0': { index: 0, text: '-' } } },
        ]);

      // MAC columns
      builder.matchFieldsWithNameByRegex('/MAC.*/')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          { type: 'special', options: { match: 'null', result: { color: '#787878', index: 0, text: 'Fibre Channel' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'text', index: 1 } } },
        ]);

      // Role Sync column
      builder.matchFieldsWithName('Role Sync')
        .overrideCustomFieldConfig('width', 85)
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              'unconfigured/unconfigured': { color: 'text', index: 0, text: '⚪️' },
              'server/server': { index: 1, text: '🟢' },
              'eth_uplink/eth_uplink': { index: 2, text: '🟢' },
              'appliance/appliance': { index: 3, text: '🟢' },
              'fcoe_uplink/fcoe_uplink': { index: 4, text: '🟢' },
              'fcoe_storage/fcoe_storage': { index: 5, text: '🟢' },
              'fc_uplink/fc_uplink': { index: 6, text: '🟢' },
              'fc_storage/fc_storage': { index: 7, text: '🟢' },
              'eth_monitor/eth_monitor': { index: 8, text: '🟢' },
              'fc_monitor/fc_monitor': { index: 9, text: '🟢' },
            },
          },
          { type: 'regex', options: { pattern: '(.*)', result: { index: 10, text: '🔴' } } },
        ]);
    })
    .build();

  return tablePanel;
}

function getNetworkUtilizationTab() {
  // Create nested tabs for Percentage and Absolute views
  const percentageTab = getNetworkUtilizationPercentageTab();
  const absoluteTab = getNetworkUtilizationAbsoluteTab();

  const networkUtilizationTabs = new TabbedScene({
    tabs: [
      { id: 'percentage', label: 'Percentage (%)', getBody: () => percentageTab },
      { id: 'absolute', label: 'Absolute (bps)', getBody: () => absoluteTab },
    ],
    activeTab: 'percentage',
    body: percentageTab,
  });

  // Wrap the TabbedScene in a SceneFlexLayout as per Grafana Scenes pattern
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 'calc(100vh - 180px)',
        body: networkUtilizationTabs,
      }),
    ],
  });
}

// ============================================================================
// NETWORK UTILIZATION TAB - COMPLETE IMPLEMENTATION
// All 5 rows with nested tabs for Percentage (%) and Absolute (bps)
// ============================================================================

// Helper function to create network utilization panels
interface NetworkUtilPanelConfig {
  fabric?: 'A' | 'B' | null;  // null for combined (FI Downlinks, IFM panels)
  direction: 'transmit' | 'receive';
  title: string;
  portRoles: string[];
  portType?: string;
  identifierExpression?: string;
  includeHostFilter?: boolean;
  isPercentage: boolean;  // true for %, false for bps
  isPortChannel?: boolean;  // true for port channels (converts roles to _pc suffix)
}

function createNetworkUtilizationPanel(config: NetworkUtilPanelConfig) {
  const {
    fabric,
    direction,
    title,
    portRoles,
    portType,
    identifierExpression,
    includeHostFilter = true,
    isPercentage,
    isPortChannel = false,
  } = config;

  // Determine field name based on type and direction
  const fieldName = isPercentage
    ? (direction === 'transmit'
        ? 'hw.network.bandwidth.utilization_transmit_max'
        : 'hw.network.bandwidth.utilization_receive_max')
    : (direction === 'transmit'
        ? 'hw.network.io_transmit_max'
        : 'hw.network.io_receive_max');

  const valueName = isPercentage ? 'utilization' : 'throughput';
  const columnName = isPercentage ? 'Utilization' : 'Throughput';
  const baseValueName = isPercentage ? 'utilization' : 'base_throughput';

  // Default identifier expression
  const defaultIdentifier = "concat(domain_name + ' (' + name + ')')";
  const identifier = identifierExpression || defaultIdentifier;

  // Convert port roles to port channel roles if needed
  const effectivePortRoles = isPortChannel
    ? portRoles.map(role => `${role}_pc`)
    : portRoles;

  // Build filter fields
  const filterFields: any[] = [
    {
      type: 'in',
      dimension: 'intersight.domain.name',
      values: ['${DomainName:doublequote}'],
    },
  ];

  // Add fabric filter if specified
  if (fabric && includeHostFilter) {
    filterFields.push({
      type: 'search',
      dimension: 'host.name',
      query: {
        type: 'insensitive_contains',
        value: ` FI-${fabric}`,
      },
    });
  }

  // Add port role filter
  filterFields.push({
    type: 'in',
    dimension: 'hw.network.port.role',
    values: effectivePortRoles,
  });

  // Add port type filter if specified
  if (portType) {
    filterFields.push({
      type: 'selector',
      dimension: 'hw.network.port.type',
      value: portType,
    });
  }

  // Add instrument name filter
  filterFields.push({
    type: 'selector',
    dimension: 'instrument.name',
    value: 'hw.network',
  });

  // Build query body
  const queryBody = {
    queryType: 'groupBy',
    dataSource: 'NetworkInterfaces',
    granularity: {
      type: 'duration',
      duration: '$__interval_ms',
      timeZone: '$__timezone',
    },
    intervals: ['${__from:date}/${__to:date}'],
    dimensions: ['Identifier'],
    virtualColumns: [
      {
        type: 'nested-field',
        columnName: 'intersight.domain.name',
        outputName: 'domain_name',
        expectedType: 'STRING',
        path: '$',
      },
      {
        type: 'expression',
        name: 'Identifier',
        expression: identifier,
        outputType: 'STRING',
      },
    ],
    filter: {
      type: 'and',
      fields: filterFields,
    },
    aggregations: [
      {
        type: 'doubleMax',
        name: baseValueName,
        fieldName: fieldName,
      },
    ],
    ...(isPercentage
      ? {}
      : {
          postAggregations: [
            {
              type: 'expression',
              name: valueName,
              expression: `(${baseValueName} * 8)`,
            },
          ],
        }),
  };

  const queryRunner = new SceneQueryRunner({
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
          { selector: 'event.Identifier', text: 'Name', type: 'string' },
          { selector: `event.${valueName}`, text: columnName, type: 'number' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: JSON.stringify(queryBody, null, 2)
            .replace('"$__interval_ms"', '$__interval_ms')
            .replace('"$__timezone"', '"$__timezone"')
            .replace('"${__from:date}/${__to:date}"', '"${__from:date}/${__to:date}"')
            .replace('"${DomainName:doublequote}"', '${DomainName:doublequote}'),
        },
      } as any,
    ],
  });

  const panelBuilder = PanelBuilders.timeseries()
    .setTitle(title)
    .setData(
      new SceneDataTransformer({
        $data: queryRunner,
        transformations: [
          {
            id: 'groupingToMatrix',
            options: {
              columnField: 'Name',
              rowField: 'Time',
              valueField: columnName,
            },
          },
          {
            id: 'renameByRegex',
            options: {
              regex: '(.*)Ethernet(.*)',
              renamePattern: '$1$2',
            },
          },
        ],
      })
    )
    .setDecimals(1)
    .setMin(0);

  if (isPercentage) {
    panelBuilder
      .setUnit('percentunit')
      .setMax(1)
      .setThresholds({
        mode: 'percentage',
        steps: [
          { value: 0, color: 'green' },
          { value: 70, color: '#EAB839' },
          { value: 90, color: 'red' },
        ],
      });
  } else {
    panelBuilder.setUnit('bps');
  }

  return panelBuilder.build();
}

// ============================================================================
// ROW 1: Fabric Interconnect Storage Uplinks
// ============================================================================

function getFIStorageUplinksRowContent(isPercentage: boolean) {
  // Ports Tab (4 panels)
  const portsTab = new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'transmit',
                title: 'FI-A: Transmit utilization per uplink port (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'FI-B: Transmit utilization per uplink port (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPercentage,
              }),
            }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'receive',
                title: 'FI-A: Receive utilization per uplink port (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'FI-B: Receive utilization per uplink port (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPercentage,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Port Channels Tab (4 panels)
  const portChannelsTab = new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'transmit',
                title: 'FI-A: Transmit utilization per uplink PC (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'FI-B: Transmit utilization per uplink PC (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'receive',
                title: 'FI-A: Receive utilization per uplink PC (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'FI-B: Receive utilization per uplink PC (Max)',
                portRoles: ['fc_uplink', 'fc_storage', 'fcoe_uplink', 'fcoe_storage', 'appliance'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Create nested tabs
  return new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => portsTab },
      { id: 'port-channels', label: 'Port Channels', getBody: () => portChannelsTab },
    ],
    activeTab: 'ports',
    body: portsTab,
  });
}

function getFIStorageUplinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'FI Storage Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 16,
        body: getFIStorageUplinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// ROW 2: Fabric Interconnect Ethernet Uplinks
// ============================================================================

function getFIEthernetUplinksRowContent(isPercentage: boolean) {
  // Ports Tab (4 panels)
  const portsTab = new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'transmit',
                title: 'FI-A: Transmit utilization per uplink port (Max)',
                portRoles: ['eth_uplink'],
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'FI-B: Transmit utilization per uplink port (Max)',
                portRoles: ['eth_uplink'],
                isPercentage,
              }),
            }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'receive',
                title: 'FI-A: Receive utilization per uplink port (Max)',
                portRoles: ['eth_uplink'],
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'FI-B: Receive utilization per uplink port (Max)',
                portRoles: ['eth_uplink'],
                isPercentage,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Port Channels Tab (4 panels)
  const portChannelsTab = new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'transmit',
                title: 'FI-A: Transmit utilization per uplink PC (Max)',
                portRoles: ['eth_uplink'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'transmit',
                title: 'FI-B: Transmit utilization per uplink PC (Max)',
                portRoles: ['eth_uplink'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
          ],
        }),
      }),
      new SceneFlexItem({
        height: 400,
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'A',
                direction: 'receive',
                title: 'FI-A: Receive utilization per uplink PC (Max)',
                portRoles: ['eth_uplink'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
            new SceneFlexItem({
              width: '50%',
              body: createNetworkUtilizationPanel({
                fabric: 'B',
                direction: 'receive',
                title: 'FI-B: Receive utilization per uplink PC (Max)',
                portRoles: ['eth_uplink'],
                isPortChannel: true,
                isPercentage,
              }),
            }),
          ],
        }),
      }),
    ],
  });

  // Create nested tabs
  return new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => portsTab },
      { id: 'port-channels', label: 'Port Channels', getBody: () => portChannelsTab },
    ],
    activeTab: 'ports',
    body: portsTab,
  });
}

function getFIEthernetUplinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'FI Ethernet Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 24,
    children: [
      new SceneGridItem({
        x: 0,
        y: 24,
        width: 24,
        height: 16,
        body: getFIEthernetUplinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// ROW 3: Fabric Interconnect Downlinks
// ============================================================================

function getFIDownlinksRowContent(isPercentage: boolean) {
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'transmit',
          title: 'Transmit utilization per FI downlink port',
          portRoles: ['server'],
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'receive',
          title: 'Receive utilization per FI downlink port',
          portRoles: ['server'],
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
    ],
  });
}

function getFIDownlinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'FI Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 48,
    children: [
      new SceneGridItem({
        x: 0,
        y: 48,
        width: 24,
        height: 8,
        body: getFIDownlinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// ROW 4: IFM Uplinks
// ============================================================================

function getIFMUplinksRowContent(isPercentage: boolean) {
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'transmit',
          title: 'Transmit utilization per IFM uplink port',
          portRoles: ['network'],
          portType: 'backplane_port',
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (G' + chassis_number + '/' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'receive',
          title: 'Receive utilization per IFM uplink port',
          portRoles: ['network'],
          portType: 'backplane_port',
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (G' + chassis_number + '/' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
    ],
  });
}

function getIFMUplinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'IFM Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 72,
    children: [
      new SceneGridItem({
        x: 0,
        y: 72,
        width: 24,
        height: 8,
        body: getIFMUplinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// ROW 5: IFM Downlinks
// ============================================================================

function getIFMDownlinksRowContent(isPercentage: boolean) {
  return new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'transmit',
          title: 'Transmit utilization per IFM downlink port',
          portRoles: ['host_port'],
          portType: 'backplane_port',
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (G' + chassis_number + '/' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
      new SceneFlexItem({
        width: '50%',
        body: createNetworkUtilizationPanel({
          fabric: null,
          direction: 'receive',
          title: 'Receive utilization per IFM downlink port',
          portRoles: ['host_port'],
          portType: 'backplane_port',
          identifierExpression: "concat(domain_name + ' - ' + host_name + ' (G' + chassis_number + '/' + name + ')')",
          includeHostFilter: false,
          isPercentage,
        }),
      }),
    ],
  });
}

function getIFMDownlinksRow(isPercentage: boolean) {
  return new SceneGridRow({
    title: 'IFM Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 96,
    children: [
      new SceneGridItem({
        x: 0,
        y: 96,
        width: 24,
        height: 8,
        body: getIFMDownlinksRowContent(isPercentage),
      }),
    ],
  });
}

// ============================================================================
// MAIN TAB FUNCTIONS
// ============================================================================

function getNetworkUtilizationPercentageTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            getFIStorageUplinksRow(true),
            getFIEthernetUplinksRow(true),
            getFIDownlinksRow(true),
            getIFMUplinksRow(true),
            getIFMDownlinksRow(true),
          ],
        }),
      }),
    ],
  });
}

function getNetworkUtilizationAbsoluteTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            getFIStorageUplinksRow(false),
            getFIEthernetUplinksRow(false),
            getFIDownlinksRow(false),
            getIFMUplinksRow(false),
            getIFMDownlinksRow(false),
          ],
        }),
      }),
    ],
  });
}


function getTrafficBalanceTab() {
  // Row 1: Ethernet Overview (4 panels - aggregate traffic)
  const ethernetOverviewRow = new SceneGridRow({
    title: 'Ethernet Overview',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({ x: 0, y: 0, width: 6, height: 8, body: getPanel185_EthTransmitTrafficA() }),
      new SceneGridItem({ x: 6, y: 0, width: 6, height: 8, body: getPanel186_EthTransmitTrafficB() }),
      new SceneGridItem({ x: 12, y: 0, width: 6, height: 8, body: getPanel187_EthReceiveTrafficA() }),
      new SceneGridItem({ x: 18, y: 0, width: 6, height: 8, body: getPanel188_EthReceiveTrafficB() }),
    ],
  });

  // Row 2: Ethernet Transmit Details (2 panels - per domain)
  const ethernetTransmitDetailsRow = new SceneGridRow({
    title: 'Ethernet Transmit Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 8,
    children: [
      new SceneGridItem({ x: 0, y: 8, width: 12, height: 12, body: getPanel189_EthTransmitUtilPerDomainA() }),
      new SceneGridItem({ x: 12, y: 8, width: 12, height: 12, body: getPanel190_EthTransmitUtilPerDomainB() }),
    ],
  });

  // Row 3: Ethernet Receive Details (2 panels - per domain)
  const ethernetReceiveDetailsRow = new SceneGridRow({
    title: 'Ethernet Receive Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 20,
    children: [
      new SceneGridItem({ x: 0, y: 20, width: 12, height: 12, body: getPanel191_EthReceiveUtilPerDomainA() }),
      new SceneGridItem({ x: 12, y: 20, width: 12, height: 12, body: getPanel192_EthReceiveUtilPerDomainB() }),
    ],
  });

  // Row 4: Fibre Channel Overview (4 panels - aggregate traffic)
  const fcOverviewRow = new SceneGridRow({
    title: 'Fibre Channel Overview',
    isCollapsible: true,
    isCollapsed: false,
    y: 32,
    children: [
      new SceneGridItem({ x: 0, y: 32, width: 6, height: 8, body: getPanel193_StorageTransmitTrafficA() }),
      new SceneGridItem({ x: 6, y: 32, width: 6, height: 8, body: getPanel194_StorageTransmitTrafficB() }),
      new SceneGridItem({ x: 12, y: 32, width: 6, height: 8, body: getPanel195_StorageReceiveTrafficA() }),
      new SceneGridItem({ x: 18, y: 32, width: 6, height: 8, body: getPanel196_StorageReceiveTrafficB() }),
    ],
  });

  // Row 5: Fibre Channel Transmit Details (2 panels - per domain)
  const fcTransmitDetailsRow = new SceneGridRow({
    title: 'Fibre Channel Transmit Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 40,
    children: [
      new SceneGridItem({ x: 0, y: 40, width: 12, height: 12, body: getPanel197_StorageTransmitUtilPerDomainA() }),
      new SceneGridItem({ x: 12, y: 40, width: 12, height: 12, body: getPanel198_StorageTransmitUtilPerDomainB() }),
    ],
  });

  // Row 6: Fibre Channel Receive Details (2 panels - per domain)
  const fcReceiveDetailsRow = new SceneGridRow({
    title: 'Fibre Channel Receive Details',
    isCollapsible: true,
    isCollapsed: false,
    y: 52,
    children: [
      new SceneGridItem({ x: 0, y: 52, width: 12, height: 12, body: getPanel199_StorageReceiveUtilPerDomainA() }),
      new SceneGridItem({ x: 12, y: 52, width: 12, height: 12, body: getPanel200_StorageReceiveUtilPerDomainB() }),
    ],
  });

  // Main layout with all collapsible rows
  // Wrap SceneGridLayout in SceneFlexLayout to provide proper flex container context
  // This ensures the grid layout renders correctly within the tab
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        body: new SceneGridLayout({
          children: [
            ethernetOverviewRow,
            ethernetTransmitDetailsRow,
            ethernetReceiveDetailsRow,
            fcOverviewRow,
            fcTransmitDetailsRow,
            fcReceiveDetailsRow,
          ],
        }),
      }),
    ],
  });
}

// ============================================================================
// TRAFFIC BALANCE TAB - PANEL HELPERS (Panels 185-200)
// ============================================================================

// Panel 185: A: Eth transmit traffic (Sum)
function getPanel185_EthTransmitTrafficA() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Eth transmit traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 186: B: Eth transmit traffic (Sum)
function getPanel186_EthTransmitTrafficB() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Eth transmit traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 187: A: Eth receive traffic (Sum)
function getPanel187_EthReceiveTrafficA() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Eth receive traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 188: B: Eth receive traffic (Sum)
function getPanel188_EthReceiveTrafficB() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Eth receive traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 189: A: Eth transmit utilization per domain (Sum)
function getPanel189_EthTransmitUtilPerDomainA() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name"],
    "virtualColumns": [{
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
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Eth transmit utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 190: B: Eth transmit utilization per domain (Sum)
function getPanel190_EthTransmitUtilPerDomainB() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name"],
    "virtualColumns": [{
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
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Eth transmit utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 191: A: Eth receive utilization per domain (Sum)
function getPanel191_EthReceiveUtilPerDomainA() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name"],
    "virtualColumns": [{
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
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Eth receive utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 192: B: Eth receive utilization per domain (Sum)
function getPanel192_EthReceiveUtilPerDomainB() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name"],
    "virtualColumns": [{
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
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.role",
          "value": "eth_uplink"
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Eth receive utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 193: A: Storage transmit traffic (Sum)
function getPanel193_StorageTransmitTrafficA() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Storage transmit traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 194: B: Storage transmit traffic (Sum)
function getPanel194_StorageTransmitTrafficB() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Storage transmit traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 195: A: Storage receive traffic (Sum)
function getPanel195_StorageReceiveTrafficA() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Storage receive traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 196: B: Storage receive traffic (Sum)
function getPanel196_StorageReceiveTrafficB() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "in",
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Storage receive traffic (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 197: A: Storage transmit utilization per domain (Sum)
function getPanel197_StorageTransmitUtilPerDomainA() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name"],
    "virtualColumns": [{
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
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Storage transmit utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 198: B: Storage transmit utilization per domain (Sum)
function getPanel198_StorageTransmitUtilPerDomainB() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name"],
    "virtualColumns": [{
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
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_transmit"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Storage transmit utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 199: A: Storage receive utilization per domain (Sum)
function getPanel199_StorageReceiveUtilPerDomainA() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name"],
    "virtualColumns": [{
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
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('A: Storage receive utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

// Panel 200: B: Storage receive utilization per domain (Sum)
function getPanel200_StorageReceiveUtilPerDomainB() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [{
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
        { selector: 'event.domain_name', text: 'Domain Name', type: 'string' },
        { selector: 'event.sum', text: 'Utilization', type: 'number' },
      ],
      url_options: {
        method: 'POST',
        body_type: 'raw',
        body_content_type: 'application/json',
        data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": ["domain_name"],
    "virtualColumns": [{
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
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "fibre_channel"
        },
        {
          "type": "in",
          "dimension": "hw.network.port.role",
          "values": [
            "fc_uplink",
            "fc_storage",
            "fcoe_uplink",
            "fcoe_storage",
            "appliance"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleSum",
        "name": "sum",
        "fieldName": "hw.network.io_receive"
      }
    ]
  }`,
      },
    } as any],
  });

  return PanelBuilders.timeseries()
    .setTitle('B: Storage receive utilization per domain (Sum)')
    .setData(new SceneDataTransformer({
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
    .setUnit('Bps')
    .setDecimals(1)
    .setMin(0)
    .build();
}

function getCongestionTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 'auto',
        body: getCongestionTransmitPanel(),
      }),
      new SceneFlexItem({
        height: 'auto',
        body: getCongestionReceivePanel(),
      }),
    ],
  });
}

// Panel 179: Transmit pause frames per port (Sum)
function getCongestionTransmitPanel() {
  const queryRunner = new SceneQueryRunner({
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
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "domain_name",
      "host_name",
      "chassis_number",
      "port_role",
      "name",
      "port_spec"
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
      "columnName": "hw.chassis.number",
      "outputName": "chassis_number",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "port_spec",
      "expression": "concat(port_role + ' # ' + name)",
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
        { "type": "not", "field":
          {
            "type": "in",
            "dimension": "hw.network.port.role",
            "values": [
              "eth_uplink_pc",
              "host_pc",
              "server_pc",
              "fabric_pc",
              "fc_uplink",
              "fc_storage",
              "iom_uplink",
              "vnic",
              "vhba",
              "vethernet",
              "vfc",
              "unconfigured"
            ]
          }
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "eth_pause",
        "fieldName": "hw.errors_network_transmit_pause"
      },
      {
        "type": "longSum",
        "name": "fc_pause",
        "fieldName": "hw.network.packets_transmit_ppp"
      }
    ]
  }`,
        },
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'timestamp' },
          { selector: 'event.port_role', text: 'Role', type: 'string' },
          { selector: 'event.eth_pause', text: 'Ethernet', type: 'number' },
          { selector: 'event.fc_pause', text: 'FC', type: 'number' },
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Fabric', type: 'string' },
          { selector: 'event.chassis_number', text: 'Chassis', type: 'string' },
          { selector: 'event.port_spec', text: 'Port', type: 'string' },
        ],
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          binary: {
            left: {
              matcher: {
                id: 'byName',
                options: 'Ethernet',
              },
            },
            right: {
              matcher: {
                id: 'byName',
                options: 'FC',
              },
            },
          },
          mode: 'binary',
          reduce: {
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Time: true,
          },
          includeByName: {},
          indexByName: {
            Chassis: 2,
            Domain: 0,
            Ethernet: 7,
            FC: 8,
            Fabric: 1,
            Port: 3,
            Role: 4,
            Time: 5,
            Total: 6,
          },
          renameByName: {
            Ethernet: 'Ethernet Congestion',
            FC: 'FC Congestion',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'Total',
            },
            {
              config: {
                id: 'lowerOrEqual',
                options: {
                  value: 0,
                },
              },
              fieldName: 'Total',
            },
          ],
          match: 'any',
          type: 'exclude',
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('Transmit pause frames per port (Sum)')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setOverrides((builder) => {
      // Number fields - gauge visualization
      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'gauge',
          mode: 'gradient',
          valueDisplayMode: 'text',
        })
        .overrideCustomFieldConfig('align', 'left');

      // Fabric field
      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 75)
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '.*(A|B)',
              result: {
                index: 0,
                text: '$1',
              },
            },
          },
        ]);

      // Chassis field
      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      // Role field - with color mappings
      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'value',
            options: {
              appliance: { color: '#00ffff', index: 5, text: 'Appliance' },
              eth_monitor: { color: '#a020f0', index: 8, text: 'Ethernet SPAN' },
              eth_uplink: { color: '#1e90ff', index: 4, text: 'Ethernet Uplink' },
              fc_monitor: { color: '#ff1493', index: 9, text: 'FC SPAN' },
              fcoe_storage: { color: '#00ff00', index: 7, text: 'FCoE Storage' },
              fcoe_uplink: { color: '#006400', index: 6, text: 'FCoE Uplink' },
              host_port: { color: '#a0522d', index: 3, text: 'Host Port' },
              iom_uplink: { color: '#ff8c00', index: 2, text: 'IOM Uplink' },
              server: { color: '#ffd700', index: 1, text: 'Server' },
              unconfigured: { color: '#787878', index: 0, text: 'Unconfigured' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Port field - with complex regex mappings
      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 102)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$',
              result: { index: 0, text: 'Slot 1 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$',
              result: { index: 1, text: 'Slot 2 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$',
              result: { index: 2, text: 'Slot 3 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$',
              result: { index: 3, text: 'Slot 4 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$',
              result: { index: 4, text: 'Slot 5 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$',
              result: { index: 5, text: 'Slot 6 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$',
              result: { index: 6, text: 'Slot 7 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$',
              result: { index: 7, text: 'Slot 8 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$',
              result: { index: 8, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+).*$',
              result: { index: 9, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$',
              result: { index: 10, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*port-channel([0-9]*).*$',
              result: { index: 11, text: 'PC$1' },
            },
          },
        ]);

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [new SceneFlexItem({ body: panel })],
  });
}

// Panel 180: Receive pause frames per port (Sum)
function getCongestionReceivePanel() {
  const queryRunner = new SceneQueryRunner({
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
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "domain_name",
      "host_name",
      "chassis_number",
      "port_role",
      "name",
      "port_spec"
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
      "columnName": "hw.chassis.number",
      "outputName": "chassis_number",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "port_spec",
      "expression": "concat(port_role + ' # ' + name)",
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
        { "type": "not", "field":
          {
            "type": "in",
            "dimension": "hw.network.port.role",
            "values": [
              "eth_uplink_pc",
              "host_pc",
              "server_pc",
              "fabric_pc",
              "fc_uplink",
              "fc_storage",
              "iom_uplink",
              "vnic",
              "vhba",
              "vethernet",
              "vfc",
              "unconfigured"
            ]
          }
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "eth_pause",
        "fieldName": "hw.errors_network_receive_pause"
      },
      {
        "type": "longSum",
        "name": "fc_pause",
        "fieldName": "hw.network.packets_receive_ppp"
      }
    ]
  }`,
        },
        columns: [
          { selector: 'timestamp', text: 'Time', type: 'string' },
          { selector: 'event.port_role', text: 'Role', type: 'string' },
          { selector: 'event.eth_pause', text: 'Ethernet', type: 'number' },
          { selector: 'event.fc_pause', text: 'FC', type: 'number' },
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Fabric', type: 'string' },
          { selector: 'event.chassis_number', text: 'Chassis', type: 'string' },
          { selector: 'event.port_spec', text: 'Port', type: 'string' },
        ],
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          binary: {
            left: {
              matcher: {
                id: 'byName',
                options: 'Ethernet',
              },
            },
            right: {
              matcher: {
                id: 'byName',
                options: 'FC',
              },
            },
          },
          mode: 'binary',
          reduce: {
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Time: true,
          },
          includeByName: {},
          indexByName: {
            Chassis: 2,
            Domain: 0,
            Ethernet: 7,
            FC: 8,
            Fabric: 1,
            Port: 3,
            Role: 4,
            Time: 5,
            Total: 6,
          },
          renameByName: {
            Ethernet: 'Ethernet Congestion',
            FC: 'FC Congestion',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: {
                id: 'isNull',
                options: {},
              },
              fieldName: 'Total',
            },
            {
              config: {
                id: 'lowerOrEqual',
                options: {
                  value: 0,
                },
              },
              fieldName: 'Total',
            },
          ],
          match: 'any',
          type: 'exclude',
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('Receive pause frames per port (Sum)')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setOverrides((builder) => {
      // Number fields - gauge visualization
      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'gauge',
          mode: 'gradient',
          valueDisplayMode: 'text',
        })
        .overrideCustomFieldConfig('align', 'left');

      // Fabric field
      builder
        .matchFieldsWithName('Fabric')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 75)
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '.*(A|B)',
              result: {
                index: 0,
                text: '$1',
              },
            },
          },
        ]);

      // Chassis field
      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');

      // Role field - with color mappings
      builder
        .matchFieldsWithName('Role')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'value',
            options: {
              appliance: { color: '#00ffff', index: 5, text: 'Appliance' },
              eth_monitor: { color: '#a020f0', index: 8, text: 'Ethernet SPAN' },
              eth_uplink: { color: '#1e90ff', index: 4, text: 'Ethernet Uplink' },
              fc_monitor: { color: '#ff1493', index: 9, text: 'FC SPAN' },
              fcoe_storage: { color: '#00ff00', index: 7, text: 'FCoE Storage' },
              fcoe_uplink: { color: '#006400', index: 6, text: 'FCoE Uplink' },
              host_port: { color: '#a0522d', index: 3, text: 'Host Port' },
              iom_uplink: { color: '#ff8c00', index: 2, text: 'IOM Uplink' },
              server: { color: '#ffd700', index: 1, text: 'Server' },
              unconfigured: { color: '#787878', index: 0, text: 'Unconfigured' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Port field - with complex regex mappings
      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 102)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/[1-4])$',
              result: { index: 0, text: 'Slot 1 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/[5-8])$',
              result: { index: 1, text: 'Slot 2 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/([9]|1[0-2]))$',
              result: { index: 2, text: 'Slot 3 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/1[3-6])$',
              result: { index: 3, text: 'Slot 4 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/(1[7-9]|20))$',
              result: { index: 4, text: 'Slot 5 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/2[1-4])$',
              result: { index: 5, text: 'Slot 6 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/2[5-8])$',
              result: { index: 6, text: 'Slot 7 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^host_port # Ethernet([0-9]+/1/(29|3[0-2]))$',
              result: { index: 7, text: 'Slot 8 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+/[0-9]+).*$',
              result: { index: 8, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+).*$',
              result: { index: 9, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Nif([0-9]+/[0-9]+/[0-9]+).*$',
              result: { index: 10, text: '$1' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*port-channel([0-9]*).*$',
              result: { index: 11, text: 'PC$1' },
            },
          },
        ]);

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [new SceneFlexItem({ body: panel })],
  });
}


// ============================================================================
// NETWORK ERRORS TAB HELPER FUNCTIONS
// ============================================================================

// Helper function for Error Descriptions panel (panel-24)
function getErrorDescriptionsPanel() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'inline',
        parser: 'backend',
        format: 'table',
        data: `[
{"Error": "Total", "Direction": "both", "CLI value": "-", "Description": "Sum of all errors recorded in Intersight", "Resolution": "Look at detailed errors"},
{"Error": "Total RX", "Direction": "RX", "CLI value": "input error", "Description": "Sum of RX errors (CLI value does not contain all errors)", "Resolution": "Look at detailed error counts"},
{"Error": "Runt", "Direction": "RX", "CLI value": "runt", "Description": "Packets smaller than the minimum required size of 64 bytes with a bad CRC check", "Resolution": "This is likely caused by a problem with network equipment"},
{"Error": "Too Long", "Direction": "RX", "CLI value": "giant", "Description": "Packet length that is greater than the configured MTU on the interface", "Resolution": "Check and adjust the MTU settings of hosts and network devices"},
{"Error": "CRC", "Direction": "RX", "CLI value": "CRC", "Description": "Packets that have failed the CRC check, thus there has likely been data corruption during transmission", "Resolution": "Investigate the transmission equipment, as well as potential  interferences"},
{"Error": "No Buffer", "Direction": "RX", "CLI value": "no buffer", "Description": "Received packets that were dropped due to unavailability of the buffer on the interface.", "Resolution": "This is often caused by broadcast storms, as well as any other kind of high throughput situation."},
{"Error": "Too Short", "Direction": "RX", "CLI value": "short frame", "Description": "Indicates a good packet smaller than the minimum required size of 64 bytes", "Resolution": "This is likely caused by a problem with network equipment"},
{"Error": "RX Discard", "Direction": "RX", "CLI value": "input discard", "Description": "Packets dropped in the input queue due to congestion. This number includes drops due to tail drop and weighted random early detection (WRED).", "Resolution": "Figure out and address congestion issues"},
{"Error": "Total TX", "Direction": "TX", "CLI value": "output error", "Description": "Sum of TX errors (CLI value does not contain all errors)", "Resolution": "Look at detailed error counts"},
{"Error": "Deferred", "Direction": "TX", "CLI value": "deferred", "Description": "Packets that have been temporarily postponed or delayed from immediate transmission by the network interface", "Resolution": "This is usually caused by network congestion, or problems with the physical network"},
{"Error": "Late Collision", "Direction": "TX", "CLI value": "late collision", "Description": "A late collision happens when a collision occurs after transmitting the first 64 bytes", "Resolution": "This is almost always due to a problem with the physical network, usually twisted pair cables with a length of over 100 meters"},
{"Error": "Carrier Sense", "Direction": "TX", "CLI value": "lost carrier + no carrier", "Description": "Occurs when a network device fails to correctly detect the presence or absence of a carrier signal to determine whether the network medium is free for transmission / Occurs when no carrier signal can be detected", "Resolution": "This usually happens due to problems with the physical network, including excessive cable length, interference, or hardware issues / This can happen due to hardware problems or misconfiguration"},
{"Error": "TX Discard", "Direction": "TX", "CLI value": "output discard + underrun", "Description": "Packets dropped in the output queue due to congestion. This number includes drops due to tail drop and weighted random early detection (WRED). / Occurs when the buffer cannot provide data to the interface fast enough", "Resolution": "Figure out and address congestion issues / This is likely caused by a hardware limitation, you might need to upgrade or limit traffic"},
{"Error": "Jabber", "Direction": "TX", "CLI value": "jabber", "Description": "Indicates a packet length that is greater than the configured MTU on the interface", "Resolution": "Check and adjust the MTU settings of hosts and network devices"}
]`,
        root_selector: '',
        url: '',
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {},
          indexByName: {
            'CLI value': 1,
            'Description': 3,
            'Direction': 2,
            'Error': 0,
            'Resolution': 4,
          },
          renameByName: {},
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('filterable', false)
        .overrideCustomFieldConfig('wrapText', true);

      builder.matchFieldsWithName('Error')
        .overrideCustomFieldConfig('width', 140);

      builder.matchFieldsWithName('CLI value')
        .overrideCustomFieldConfig('width', 200);

      builder.matchFieldsWithName('Direction')
        .overrideCustomFieldConfig('width', 90);
    })
    .build();
}

// Network Errors Tab Helper Functions - Panel implementations for all error monitoring

// Creates base query runner for network errors with configurable role
function createNetworkErrorsQueryRunner(role: string, filterType: 'role' | 'type' = 'role') {
  const filterConfig = filterType === 'role'
    ? {
        type: "selector",
        dimension: "hw.network.port.role",
        value: role
      }
    : {
        type: "or",
        fields: [
          { type: "selector", dimension: "hw.network.port.type", value: "vnic" },
          { type: "selector", dimension: "hw.network.port.type", value: "vhba" }
        ]
      };

  return new SceneQueryRunner({
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
          { selector: 'event.Identifier', text: 'Port', type: 'string' },
          { selector: 'event.total', text: 'Total', type: 'number' },
          { selector: 'event.tx_sum', text: 'Total TX', type: 'number' },
          { selector: 'event.deferred', text: 'Deferred', type: 'number' },
          { selector: 'event.late_collisions', text: 'Late Collision', type: 'number' },
          { selector: 'event.carrier_sense', text: 'Carrier Sense', type: 'number' },
          { selector: 'event.tx_discard', text: 'TX Discard', type: 'number' },
          { selector: 'event.jabber', text: 'Jabber', type: 'number' },
          { selector: 'event.rx_sum', text: 'Total RX', type: 'number' },
          { selector: 'event.runt', text: 'Runt', type: 'number' },
          { selector: 'event.too_long', text: 'Too Long', type: 'number' },
          { selector: 'event.crc', text: 'CRC', type: 'number' },
          { selector: 'event.no_buffer', text: 'No Buffer', type: 'number' },
          { selector: 'event.too_short', text: 'Too Short', type: 'number' },
          { selector: 'event.rx_discard', text: 'RX Discard', type: 'number' },
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": {
       "type": "duration",
       "duration": $__interval_ms,
       "timeZone": "$__timezone"
    },
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "Identifier"${filterType === 'role' ? ',\n      "host_name"' : ''}
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
      "type": "expression",
      "name": "Identifier",
      "expression": "concat(domain_name + ' (' + host_name + ' ' + name + ')')",
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
        ${filterType === 'role' ? `{
          "type": "selector",
          "dimension": "hw.network.port.type",
          "value": "ethernet"
        },` : ''}
        ${JSON.stringify(filterConfig)},
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "runt",
        "fieldName": "hw.errors_network_receive_runt"
      },
      {
        "type": "longSum",
        "name": "too_long",
        "fieldName": "hw.errors_network_receive_too_long"
      },
      {
        "type": "longSum",
        "name": "crc",
        "fieldName": "hw.errors_network_receive_crc"
      },
      {
        "type": "longSum",
        "name": "no_buffer",
        "fieldName": "hw.errors_network_receive_no_buffer"
      },
      {
        "type": "longSum",
        "name": "too_short",
        "fieldName": "hw.errors_network_receive_too_short"
      },
      {
        "type": "longSum",
        "name": "rx_discard",
        "fieldName": "hw.errors_network_receive_discard"
      },
      {
        "type": "longSum",
        "name": "deferred",
        "fieldName": "hw.errors_network_transmit_deferred"
      },
      {
        "type": "longSum",
        "name": "late_collisions",
        "fieldName": "hw.errors_network_late_collisions"
      },
      {
        "type": "longSum",
        "name": "carrier_sense",
        "fieldName": "hw.errors_network_carrier_sense"
      },
      {
        "type": "longSum",
        "name": "tx_discard",
        "fieldName": "hw.errors_network_transmit_discard"
      },
      {
        "type": "longSum",
        "name": "jabber",
        "fieldName": "hw.errors_network_transmit_jabber"
      }
    ],
    "postAggregations": [
      {
        "type": "expression",
        "name": "rx_sum",
        "expression": "\\"rx_discard\\" + \\"too_short\\" + \\"no_buffer\\" + \\"crc\\" + \\"too_long\\" + \\"runt\\""
      },
      {
        "type": "expression",
        "name": "tx_sum",
        "expression": "\\"jabber\\" + \\"tx_discard\\" + \\"carrier_sense\\" + \\"late_collisions\\" + \\"deferred\\""
      },
      {
        "type": "expression",
        "name": "total",
        "expression": "\\"tx_sum\\" + \\"rx_sum\\""
      }
    ]
  }`,
        },
      } as any,
    ],
  });
}

// Panel 95/100: FI Ethernet Uplink TX Errors
function getFIEthernetUplinkTXErrorsPanel(fiFilter: string) {
  const queryRunner = createNetworkErrorsQueryRunner('eth_uplink');

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [{
            config: { id: 'substring', options: { value: fiFilter } },
            fieldName: 'Hostname',
          }],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'groupingToMatrix',
        options: { columnField: 'Port', rowField: 'Time', valueField: 'Total TX' },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(`${fiFilter === 'FI-A' ? 'A' : 'B'}: Transmit errors per uplink port (Sum)`)
    .setData(transformer)
    .build();
}

// Panel 101/102: FI Ethernet Uplink RX Errors
function getFIEthernetUplinkRXErrorsPanel(fiFilter: string) {
  const queryRunner = createNetworkErrorsQueryRunner('eth_uplink');

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [{
            config: { id: 'substring', options: { value: fiFilter } },
            fieldName: 'Hostname',
          }],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'groupingToMatrix',
        options: { columnField: 'Port', rowField: 'Time', valueField: 'Total RX' },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(`${fiFilter === 'FI-A' ? 'A' : 'B'}: Receive errors per uplink port (Sum)`)
    .setData(transformer)
    .build();
}

// Panel 25: FI Ethernet Uplink Detail Table
function getFIEthernetUplinkDetailTable() {
  return PanelBuilders.table()
    .setTitle('')
    .setData(createNetworkErrorsQueryRunner('eth_uplink'))
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .build();
}

// Panel 47/51: FI Ethernet Uplink Port Channel TX Errors
function getFIEthernetUplinkPortChannelTXErrorsPanel(fiFilter: string) {
  const queryRunner = createNetworkErrorsQueryRunner('eth_uplink_port_channel');

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [{
            config: { id: 'substring', options: { value: fiFilter } },
            fieldName: 'Hostname',
          }],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'groupingToMatrix',
        options: { columnField: 'Port', rowField: 'Time', valueField: 'Total TX' },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(`${fiFilter === 'FI-A' ? 'A' : 'B'}: Transmit errors per uplink port channel (Sum)`)
    .setData(transformer)
    .build();
}

// Panel 48/52: FI Ethernet Uplink Port Channel RX Errors
function getFIEthernetUplinkPortChannelRXErrorsPanel(fiFilter: string) {
  const queryRunner = createNetworkErrorsQueryRunner('eth_uplink_port_channel');

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [{
            config: { id: 'substring', options: { value: fiFilter } },
            fieldName: 'Hostname',
          }],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'groupingToMatrix',
        options: { columnField: 'Port', rowField: 'Time', valueField: 'Total RX' },
      },
    ],
  });

  return PanelBuilders.timeseries()
    .setTitle(`${fiFilter === 'FI-A' ? 'A' : 'B'}: Receive errors per uplink port channel (Sum)`)
    .setData(transformer)
    .build();
}

// Panel 45: FI Ethernet Uplink Port Channel Detail Table
function getFIEthernetUplinkPortChannelDetailTable() {
  return PanelBuilders.table()
    .setTitle('')
    .setData(createNetworkErrorsQueryRunner('eth_uplink_port_channel'))
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .build();
}

// ============================================================================
// Network Errors Tab - Base Query and Panel Implementations
// ============================================================================

// Base query runner for Network Errors - shared by multiple panels (panel-25 equivalent)
// This query fetches all network error metrics from the NetworkInterfaces dataSource
function createNetworkErrorsBaseQueryRunner() {
  return new SceneQueryRunner({
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
          { selector: 'event.domain_name', text: 'Domain', type: 'string' },
          { selector: 'event.host_name', text: 'Hostname', type: 'string' },
          { selector: 'event.name', text: 'Port', type: 'string' },
          { selector: 'event.runt', text: 'Runt', type: 'number' },
          { selector: 'event.too_long', text: 'Too Long', type: 'number' },
          { selector: 'event.crc', text: 'CRC', type: 'number' },
          { selector: 'event.no_buffer', text: 'No Buffer', type: 'number' },
          { selector: 'event.too_short', text: 'Too Short', type: 'number' },
          { selector: 'event.rx_discard', text: 'RX Discard', type: 'number' },
          { selector: 'event.deferred', text: 'Deferred', type: 'number' },
          { selector: 'event.late_collisions', text: 'Late Collisions', type: 'number' },
          { selector: 'event.carrier_sense', text: 'Carrier Sense', type: 'number' },
          { selector: 'event.tx_discard', text: 'TX Discard', type: 'number' },
          { selector: 'event.jabber', text: 'Jabber', type: 'number' },
          { selector: 'event.port_type', text: 'Port Type', type: 'string' },
          { selector: 'event.port_role', text: 'Port Role', type: 'string' },
          { selector: 'event.chassis_number', text: 'Chassis', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_content_type: 'application/json',
          body_type: 'raw',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "domain_name",
      "host_name",
      "name",
      "port_type",
      "port_role",
      "chassis_number"
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
      "columnName": "hw.network.port.type",
      "outputName": "port_type",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.chassis.number",
      "outputName": "chassis_number",
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
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longSum",
        "name": "runt",
        "fieldName": "hw.errors_network_receive_runt"
      },
      {
        "type": "longSum",
        "name": "too_long",
        "fieldName": "hw.errors_network_receive_too_long"
      },
      {
        "type": "longSum",
        "name": "crc",
        "fieldName": "hw.errors_network_receive_crc"
      },
      {
        "type": "longSum",
        "name": "no_buffer",
        "fieldName": "hw.errors_network_receive_no_buffer"
      },
      {
        "type": "longSum",
        "name": "too_short",
        "fieldName": "hw.errors_network_receive_too_short"
      },
      {
        "type": "longSum",
        "name": "rx_discard",
        "fieldName": "hw.errors_network_receive_discard"
      },
      {
        "type": "longSum",
        "name": "deferred",
        "fieldName": "hw.errors_network_transmit_deferred"
      },
      {
        "type": "longSum",
        "name": "late_collisions",
        "fieldName": "hw.errors_network_late_collisions"
      },
      {
        "type": "longSum",
        "name": "carrier_sense",
        "fieldName": "hw.errors_network_carrier_sense"
      },
      {
        "type": "longSum",
        "name": "tx_discard",
        "fieldName": "hw.errors_network_transmit_discard"
      },
      {
        "type": "longSum",
        "name": "jabber",
        "fieldName": "hw.errors_network_transmit_jabber"
      }
    ]
  }`,
        },
      } as any,
    ],
  });
}

// Panel 26: FI Downlinks Panel (Fabric Interconnect Downlinks - server ports)
// Filters for Port Type='ethernet' AND Port Role='server'
function getFIDownlinksPanel() {
  const queryRunner = createNetworkErrorsBaseQueryRunner();

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'equal', options: { value: 'ethernet' } },
              fieldName: 'Port Type',
            },
            {
              config: { id: 'equal', options: { value: 'server' } },
              fieldName: 'Port Role',
            },
          ],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'RX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Runt', 'Too Long', 'CRC', 'No Buffer', 'Too Short', 'RX Discard'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'TX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Carrier Sense', 'Deferred', 'Late Collisions', 'TX Discard', 'Jabber'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          mode: 'reduceRow',
          reduce: {
            include: ['RX Total', 'TX Total'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'Chassis': true,
            'Chassis Number': true,
            'Port Role': true,
            'Port Type': true,
          },
          indexByName: {
            'CRC': 7,
            'Carrier Sense': 14,
            'Deferred': 12,
            'Domain': 0,
            'Hostname': 1,
            'Jabber': 16,
            'Late Collisions': 13,
            'No Buffer': 8,
            'Port': 2,
            'Port Role': 17,
            'Port Type': 18,
            'RX Discard': 10,
            'RX Total': 4,
            'Runt': 5,
            'TX Discard': 15,
            'TX Total': 11,
            'Too Long': 6,
            'Too Short': 9,
            'Total': 3,
          },
          renameByName: {
            'Hostname': 'FI',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Total',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'transparent', value: 0 },
        { color: '#EAB839', value: 10 },
        { color: 'dark-red', value: 80 },
      ],
    })
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setCustomFieldConfig('wrapText', false)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('FI')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+).*$',
              result: { index: 0, text: '$1' },
            },
          },
        ]);

      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', { applyToRow: false, mode: 'basic', type: 'color-background' })
        .overrideCustomFieldConfig('wrapText', false)
        .overrideCustomFieldConfig('width', 120);
    })
    .build();
}

// Panel 27: IFM Uplinks Panel
// Filters for Port Type='ethernet' AND Port Role='iom_uplink'
function getIFMUplinksPanel() {
  const queryRunner = createNetworkErrorsBaseQueryRunner();

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'equal', options: { value: 'ethernet' } },
              fieldName: 'Port Type',
            },
            {
              config: { id: 'equal', options: { value: 'iom_uplink' } },
              fieldName: 'Port Role',
            },
          ],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'RX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Runt', 'Too Long', 'CRC', 'No Buffer', 'Too Short', 'RX Discard'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'TX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Carrier Sense', 'Deferred', 'Late Collisions', 'TX Discard', 'Jabber'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          mode: 'reduceRow',
          reduce: {
            include: ['RX Total', 'TX Total'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'Carrier Sense': true,
            'Chassis': true,
            'Chassis Number': true,
            'Deferred': true,
            'Jabber': true,
            'Late Collisions': true,
            'No Buffer': true,
            'Port Role': true,
            'Port Type': true,
            'RX Discard': true,
            'Runt': true,
            'TX Discard': true,
          },
          indexByName: {
            'CRC': 7,
            'Carrier Sense': 14,
            'Deferred': 12,
            'Domain': 0,
            'Hostname': 1,
            'Jabber': 16,
            'Late Collisions': 13,
            'No Buffer': 8,
            'Port': 2,
            'Port Role': 17,
            'Port Type': 18,
            'RX Discard': 10,
            'RX Total': 4,
            'Runt': 5,
            'TX Discard': 15,
            'TX Total': 11,
            'Too Long': 6,
            'Too Short': 9,
            'Total': 3,
          },
          renameByName: {
            'Hostname': 'FI',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Total',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'transparent', value: 0 },
        { color: '#EAB839', value: 10 },
        { color: 'dark-red', value: 80 },
      ],
    })
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setCustomFieldConfig('wrapText', false)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('FI')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 80)
        .overrideCustomFieldConfig('align', 'center')
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/[0-9]+).*$',
              result: { index: 0, text: '$1' },
            },
          },
        ]);

      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', { applyToRow: false, mode: 'basic', type: 'color-background' })
        .overrideCustomFieldConfig('wrapText', false)
        .overrideCustomFieldConfig('width', 120);
    })
    .build();
}

// Panel 28: IFM Downlinks Panel (backplane_port + host_port)
// Filters for Port Type='backplane_port' AND Port Role='host_port'
function getIFMDownlinksPanel() {
  const queryRunner = createNetworkErrorsBaseQueryRunner();

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'equal', options: { value: 'backplane_port' } },
              fieldName: 'Port Type',
            },
            {
              config: { id: 'equal', options: { value: 'host_port' } },
              fieldName: 'Port Role',
            },
          ],
          match: 'all',
          type: 'include',
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'RX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Runt', 'Too Long', 'CRC', 'No Buffer', 'Too Short', 'RX Discard'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'TX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Carrier Sense', 'Deferred', 'Late Collisions', 'TX Discard', 'Jabber'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          mode: 'reduceRow',
          reduce: {
            include: ['RX Total', 'TX Total'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'Port Role': true,
            'Port Type': true,
          },
          indexByName: {
            'CRC': 8,
            'Carrier Sense': 15,
            'Chassis': 2,
            'Deferred': 13,
            'Domain': 0,
            'Hostname': 1,
            'Jabber': 17,
            'Late Collisions': 14,
            'No Buffer': 9,
            'Port': 3,
            'Port Role': 18,
            'Port Type': 19,
            'RX Discard': 11,
            'RX Total': 5,
            'Runt': 6,
            'TX Discard': 16,
            'TX Total': 12,
            'Too Long': 7,
            'Too Short': 10,
            'Total': 4,
          },
          renameByName: {
            'Hostname': 'FI',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Runt',
            },
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Deferred',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'transparent', value: 0 },
        { color: '#EAB839', value: 10 },
        { color: 'dark-red', value: 80 },
      ],
    })
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setCustomFieldConfig('wrapText', false)
    .setOverrides((builder) => {
      builder
        .matchFieldsWithName('FI')
        .overrideCustomFieldConfig('width', 50)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Port')
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('width', 105)
        .overrideMappings([
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/[1-4])$',
              result: { index: 0, text: 'Slot 1 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/[5-8])$',
              result: { index: 1, text: 'Slot 2 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/([9]|1[0-2]))$',
              result: { index: 2, text: 'Slot 3 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/1[3-6])$',
              result: { index: 3, text: 'Slot 4 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/(1[7-9]|20))$',
              result: { index: 4, text: 'Slot 5 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/2[1-4])$',
              result: { index: 5, text: 'Slot 6 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/2[5-8])$',
              result: { index: 6, text: 'Slot 7 ($1)' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '^.*Ethernet([0-9]+/1/(29|3[0-2]))$',
              result: { index: 7, text: 'Slot 8 ($1)' },
            },
          },
        ]);

      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', { applyToRow: false, mode: 'basic', type: 'color-background' })
        .overrideCustomFieldConfig('wrapText', false)
        .overrideCustomFieldConfig('width', 120);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();
}

// Panel 29: vNIC/vHBA Panel
// Filters for Port Role='vnic' OR Port Role='vhba'
function getVNICVHBAPanel() {
  const queryRunner = createNetworkErrorsBaseQueryRunner();

  const transformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'equal', options: { value: 'vnic' } },
              fieldName: 'Port Role',
            },
            {
              config: { id: 'equal', options: { value: 'vhba' } },
              fieldName: 'Port Role',
            },
          ],
          match: 'any',
          type: 'include',
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'RX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Runt', 'Too Long', 'CRC', 'No Buffer', 'Too Short', 'RX Discard'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'TX Total',
          mode: 'reduceRow',
          reduce: {
            include: ['Carrier Sense', 'Deferred', 'Late Collisions', 'TX Discard', 'Jabber'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'calculateField',
        options: {
          alias: 'Total',
          mode: 'reduceRow',
          reduce: {
            include: ['RX Total', 'TX Total'],
            reducer: 'sum',
          },
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            'Carrier Sense': true,
            'Chassis': false,
            'Chassis Number': true,
            'Deferred': true,
            'Jabber': true,
            'Late Collisions': true,
            'Port Role': true,
            'Port Type': true,
            'RX Discard': true,
            'Runt': true,
            'TX Discard': true,
            'Too Long': true,
            'Too Short': true,
          },
          indexByName: {
            'CRC': 8,
            'Carrier Sense': 15,
            'Chassis': 1,
            'Deferred': 13,
            'Domain': 0,
            'Hostname': 2,
            'Jabber': 17,
            'Late Collisions': 14,
            'No Buffer': 9,
            'Port': 3,
            'Port Role': 18,
            'Port Type': 19,
            'RX Discard': 11,
            'RX Total': 5,
            'Runt': 6,
            'TX Discard': 16,
            'TX Total': 12,
            'Too Long': 7,
            'Too Short': 10,
            'Total': 4,
          },
          renameByName: {
            'Hostname': 'Server',
            'Port': 'vNIC/vHBA',
          },
        },
      },
      {
        id: 'filterByValue',
        options: {
          filters: [
            {
              config: { id: 'isNull', options: {} },
              fieldName: 'Total',
            },
          ],
          match: 'all',
          type: 'exclude',
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformer)
    .setOption('cellHeight', 'sm')
    .setOption('showHeader', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Total' }])
    .setMin(0)
    .setUnit('none')
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'transparent', value: 0 },
        { color: '#EAB839', value: 10 },
        { color: 'dark-red', value: 80 },
      ],
    })
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setCustomFieldConfig('wrapText', false)
    .setOverrides((builder) => {
      builder
        .matchFieldsByType('number')
        .overrideCustomFieldConfig('cellOptions', { applyToRow: false, mode: 'basic', type: 'color-background' })
        .overrideCustomFieldConfig('wrapText', false)
        .overrideCustomFieldConfig('width', 120);

      builder
        .matchFieldsWithName('Chassis')
        .overrideCustomFieldConfig('width', 100)
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('Server')
        .overrideCustomFieldConfig('align', 'center');

      builder
        .matchFieldsWithName('vNIC/vHBA')
        .overrideCustomFieldConfig('align', 'center');
    })
    .build();
}

function getNetworkErrorsTab() {
  // Helper to create Ports tab layout
  const getPortsTabBody = () => new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkTXErrorsPanel('FI-A'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkTXErrorsPanel('FI-B'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkRXErrorsPanel('FI-A'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkRXErrorsPanel('FI-B'),
      }),
      new SceneFlexItem({
        width: '100%',
        height: 400,
        body: getFIEthernetUplinkDetailTable(),
      }),
    ],
  });

  // Helper to create Port Channels tab layout
  const getPortChannelsTabBody = () => new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkPortChannelTXErrorsPanel('FI-A'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkPortChannelTXErrorsPanel('FI-B'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkPortChannelRXErrorsPanel('FI-A'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkPortChannelRXErrorsPanel('FI-B'),
      }),
      new SceneFlexItem({
        width: '100%',
        height: 400,
        body: getFIEthernetUplinkPortChannelDetailTable(),
      }),
    ],
  });

  // Row 1: Fabric Interconnect Ethernet Uplinks (with nested tabs)
  const ethernetUplinksRow = new SceneGridRow({
    title: 'Fabric Interconnect Ethernet Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 14,
        body: new TabbedScene({
          tabs: [
            {
              id: 'ports',
              label: 'Ports',
              getBody: getPortsTabBody,
            },
            {
              id: 'port-channels',
              label: 'Port Channels',
              getBody: getPortChannelsTabBody,
            },
          ],
          activeTab: 'ports',
          body: getPortsTabBody(),
        }),
      }),
    ],
  });

  // Row 2: Fabric Interconnect Downlinks
  const downlinksRow = new SceneGridRow({
    title: 'Fabric Interconnect Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 14,
    children: [
      new SceneGridItem({
        x: 0,
        y: 14,
        width: 24,
        height: 8,
        body: getFIDownlinksPanel(),
      }),
    ],
  });

  // Row 3: IFM Uplinks
  const ifmUplinksRow = new SceneGridRow({
    title: 'IFM Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 22,
    children: [
      new SceneGridItem({
        x: 0,
        y: 22,
        width: 24,
        height: 8,
        body: getIFMUplinksPanel(),
      }),
    ],
  });

  // Row 4: IFM Downlinks
  const ifmDownlinksRow = new SceneGridRow({
    title: 'IFM Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 30,
    children: [
      new SceneGridItem({
        x: 0,
        y: 30,
        width: 24,
        height: 8,
        body: getIFMDownlinksPanel(),
      }),
    ],
  });

  // Row 5: vNIC/vHBA
  const vnicVhbaRow = new SceneGridRow({
    title: 'vNIC/vHBA',
    isCollapsible: true,
    isCollapsed: false,
    y: 38,
    children: [
      new SceneGridItem({
        x: 0,
        y: 38,
        width: 24,
        height: 8,
        body: getVNICVHBAPanel(),
      }),
    ],
  });

  // Row 6: Error Descriptions
  const errorDescriptionsRow = new SceneGridRow({
    title: 'Error Descriptions',
    isCollapsible: true,
    isCollapsed: false,
    y: 46,
    children: [
      new SceneGridItem({
        x: 0,
        y: 46,
        width: 24,
        height: 8,
        body: getErrorDescriptionsPanel(),
      }),
    ],
  });

  // Main layout with all collapsible rows
  return new SceneGridLayout({
    children: [
      ethernetUplinksRow,
      downlinksRow,
      ifmUplinksRow,
      ifmDownlinksRow,
      vnicVhbaRow,
      errorDescriptionsRow,
    ],
  });
}

function getSFPTab() {
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
        height: 600,
        body: sfpMetricsPanel,
      }),
      new SceneFlexItem({
        height: 200,
        body: sfpInfoPanel,
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
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queryA, queryB, queryC, queryD, queryE] as any[],
  });

  // Apply transformations: timeSeriesTable, joinByField, organize
  const transformedData = new SceneDataTransformer({
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
    .setOption('cellHeight', 'lg')
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
  const queryRunner = new SceneQueryRunner({
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
    .setCustomFieldConfig('drawStyle', 'bars')
    .setCustomFieldConfig('fillOpacity', 100)
    .setCustomFieldConfig('barAlignment', 0)
    .setCustomFieldConfig('barWidthFactor', 1)
    .setCustomFieldConfig('axisSoftMin', 0)
    .setCustomFieldConfig('stacking', { mode: 'normal', group: 'A' })
    .setCustomFieldConfig('thresholdsStyle', { mode: 'dashed+area' })
    .setDecimals(0)
    .setColor({ mode: 'palette-classic' })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { value: 0, color: 'semi-dark-red' },
        { value: 100, color: 'transparent' },
      ],
    })
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 203: Power consumption per Domain (Max)
 * Displays power consumption aggregated at domain level
 */
function getDomainPowerConsumptionPanel() {
  const queryRunner = new SceneQueryRunner({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 8: Power consumption per FI (Max)
 * Displays power consumption per Fabric Interconnect
 */
function getFIPowerConsumptionPanel() {
  const queryRunner = new SceneQueryRunner({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 13: Power consumption per FI Pair (Max) - shows FI power aggregated by domain
 * This is the FI pair power consumption (both FIs combined)
 */
function getFIPairPowerConsumptionPanel() {
  const queryRunner = new SceneQueryRunner({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 202: Power consumption per Chassis (Max)
 * Displays power consumption per chassis
 */
function getChassisPowerConsumptionPanel() {
  const queryRunner = new SceneQueryRunner({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 15: Host Power Consumption (Table)
 * Displays power consumption per host (compute blades) in a table format
 */
function getHostPowerConsumptionPanel() {
  const queryRunner = new SceneQueryRunner({
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
    .setOption('cellHeight', 'lg')
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
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 17: Chassis Fan Speed per Chassis (Avg)
 * Shows average fan speed for each Chassis
 */
function getChassisFanSpeedPanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 18: FI Intake Temperature (Avg)
 * Shows average intake temperature for Fabric Interconnects
 */
function getFIIntakeTemperaturePanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 19: FI Exhaust Temperature (Avg)
 * Shows average exhaust temperature for Fabric Interconnects
 */
function getFIExhaustTemperaturePanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 22: FI CPU Temperature (Avg)
 * Shows average CPU temperature for Fabric Interconnects
 */
function getFICPUTemperaturePanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 23: FI ASIC Temperature (Avg)
 * Shows average ASIC temperature for Fabric Interconnects
 */
function getFIASICTemperaturePanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 11: Chassis Intake Temperature (Avg)
 * Shows average intake temperature for Chassis
 */
function getChassisIntakeTemperaturePanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 12: Chassis Exhaust Temperature (Avg)
 * Shows average exhaust temperature for Chassis
 */
function getChassisExhaustTemperaturePanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('legend', { displayMode: 'list', placement: 'bottom', showLegend: true })
    .build();
}

/**
 * Panel 9: Host Temperature
 * Complex multi-query table showing temperature data for compute blades
 */
function getHostTemperaturePanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('cellHeight', 'md')
    .setOption('showHeader', true)
    .setOption('enablePagination', true)
    .setOverride({
      matcher: { id: 'byName', options: 'Hostname' },
      properties: [{ id: 'custom.filterable', value: true }],
    })
    .build();
}

/**
 * Panel 21: Cooling Budget
 * Complex multi-query table showing temperature difference from threshold for compute blades
 */
function getCoolingBudgetPanel() {
  const queryRunner = new SceneQueryRunner({
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

  const transformer = new SceneDataTransformer({
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
    .setOption('cellHeight', 'md')
    .setOption('showHeader', true)
    .setOverride({
      matcher: { id: 'byName', options: 'Hostname' },
      properties: [{ id: 'custom.filterable', value: true }],
    })
    .build();
}

// ============================================================================
// ENVIRONMENTAL TAB - Complete implementation with all 8 rows
// ============================================================================

function getEnvironmentalTab() {
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

function getCPUUtilizationTab() {
  // Panel-7 from original dashboard - combines CPU utilization and temperature data
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      // Query A: CPU Utilization
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
          { selector: 'event.host_name', text: 'Host Name', type: 'string' },
          { selector: 'event.utilization', text: 'Utilization', type: 'number' },
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
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.cpu"
        }
      ]
    },
    "aggregations": [
      {
        "type": "doubleMax",
        "name": "utilization",
        "fieldName": "hw.cpu.utilization_c0_max"
      }
    ]
  }`,
        },
      } as any,
      // Query B: CPU 1 Temperature
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
          { selector: 'event.host_name', text: 'Host Name', type: 'string' },
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
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "in",
          "dimension": "hw.temperature.sensor.name",
          "values": [
            "CPU1",
            "P1_TEMP_SENS"
          ]
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
      } as any,
      // Query C: CPU 2 Temperature
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
          { selector: 'event.host_name', text: 'Host Name', type: 'string' },
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
          "dimension": "intersight.domain.name",
          "values": [\${DomainName:doublequote}]
        },
        {
          "type": "in",
          "dimension": "hw.temperature.sensor.name",
          "values": [
            "CPU2",
            "P2_TEMP_SENS"
          ]
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
      } as any,
    ],
  });

  // Apply transformations to join data and organize columns
  const transformedData = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'timeSeriesTable',
        options: {
          A: { timeField: 'Time' },
          B: { timeField: 'Time' },
          C: { timeField: 'Time' },
        },
      },
      {
        id: 'joinByField',
        options: {
          byField: 'Host Name',
          mode: 'inner',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {},
          includeByName: {},
          indexByName: {
            'Domain Name': 0,
            'Host Name': 1,
            'Trend #A': 2,
            'Trend #B': 3,
            'Trend #C': 4,
          },
          renameByName: {
            'Trend #A': 'Utilization',
            'Trend #B': 'CPU 1 Temperature',
            'Trend #C': 'CPU 2 Temperature',
          },
        },
      },
    ],
  });

  // Create table panel with field overrides
  const tablePanel = PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'lg')
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ displayName: 'Utilization', desc: true }])
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Utilization column - sparkline visualization with percentunit and semi-dark-blue color
      builder.matchFieldsWithName('Utilization')
        .overrideCustomFieldConfig('cellOptions', {
          type: TableCellDisplayMode.Sparkline,
        })
        .overrideColor({
          fixedColor: 'semi-dark-blue',
          mode: 'fixed',
        })
        .overrideMin(0)
        .overrideMax(1)
        .overrideUnit('percentunit')
        .overrideDecimals(1);

      // String columns - set width to 240px
      builder.matchFieldsByType('string')
        .overrideCustomFieldConfig('width', 240);

      // Temperature columns - celsius unit
      builder.matchFieldsWithNameByRegex('/CPU.*Temperature/')
        .overrideUnit('celsius')
        .overrideDecimals(1);
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: tablePanel,
      }),
    ],
  });
}

// ============================================================================
// STORAGE TAB - Nested tabs for Storage Controllers, SSD, HDD, Virtual Drives
// ============================================================================

// Helper function for Storage Controllers sub-tab (panel-204)
function getStorageControllersPanel() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/storage/Controllers?$top=1000&$filter=Owners in (${RegisteredDevices:singlequote})&$expand=BackupBatteryUnit,ComputeBlade,ComputeRackUnit,ComputeBoard($expand=ComputeBlade,ComputeRackUnit)',
        root_selector: '$.Results',
        columns: [
          { selector: 'BackupBatteryUnit.IsBatteryPresent', text: 'BackupBatteryUnitPresence', type: 'string' },
          { selector: 'ComputeBlade.Name', text: 'ComputeBlade', type: 'string' },
          { selector: 'ComputeBoard', text: '', type: 'string' },
          { selector: 'ComputeRackUnit.Name', text: 'ComputeRackUnit', type: 'string' },
          { selector: 'ConnectedSasExpander', text: '', type: 'string' },
          { selector: 'ControllerFlags', text: '', type: 'string' },
          { selector: 'ControllerId', text: '', type: 'string' },
          { selector: 'ControllerStatus', text: '', type: 'string' },
          { selector: 'DefaultDriveMode', text: '', type: 'string' },
          { selector: 'DiskGroup', text: '', type: 'string' },
          { selector: 'DiskSlot', text: '', type: 'string' },
          { selector: 'EccBucketLeakRate', text: '', type: 'string' },
          { selector: 'HwRevision', text: '', type: 'string' },
          { selector: 'InterfaceType', text: '', type: 'string' },
          { selector: 'MaxVolumesSupported', text: '', type: 'string' },
          { selector: 'MemoryCorrectableErrors', text: '', type: 'string' },
          { selector: 'Model', text: '', type: 'string' },
          { selector: 'OobInterfaceSupported', text: '', type: 'string' },
          { selector: 'OperReason', text: '', type: 'string' },
          { selector: 'OperState', text: '', type: 'string' },
          { selector: 'PciSlot', text: '', type: 'string' },
          { selector: 'PhysicalDisks', text: '', type: 'string' },
          { selector: 'Presence', text: '', type: 'string' },
          { selector: 'PreviousFru', text: '', type: 'string' },
          { selector: 'RaidSupport', text: '', type: 'string' },
          { selector: 'RebuildRate', text: '', type: 'string' },
          { selector: 'RebuildRatePercent', text: '', type: 'string' },
          { selector: 'RunningFirmware', text: '', type: 'string' },
          { selector: 'SelfEncryptEnabled', text: '', type: 'string' },
          { selector: 'Serial', text: '', type: 'string' },
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'VirtualDrives', text: '', type: 'string' },
          { selector: 'ComputeBoard.ComputeBlade.Name', text: 'ComputeBoardBlade', type: 'string' },
          { selector: 'ComputeBoard.ComputeRackUnit.Name', text: 'ComputeBoardRackUnit', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ComputeBlade + ComputeRackUnit + ComputeBoardBlade + ComputeBoardRackUnit', text: 'Server', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            ComputeBlade: true,
            ComputeBoard: true,
            ComputeBoardBlade: true,
            ComputeBoardRackUnit: true,
            ComputeRackUnit: true,
            ConnectedSasExpander: true,
            ControllerFlags: true,
            ControllerId: true,
            ControllerStatus: true,
            DefaultDriveMode: true,
            DiskGroup: true,
            DiskSlot: true,
            EccBucketLeakRate: true,
            HwRevision: true,
            MaxVolumesSupported: true,
            OobInterfaceSupported: true,
            OperReason: true,
            PhysicalDisks: true,
            PreviousFru: true,
            RaidSupport: true,
            RebuildRate: true,
            RebuildRatePercent: true,
            RunningFirmware: true,
            Type: true,
            VirtualDrives: true,
          },
          includeByName: {},
          indexByName: {
            BackupBatteryUnitPresence: 10,
            ComputeBlade: 11,
            ComputeBoard: 12,
            ComputeBoardBlade: 13,
            ComputeBoardRackUnit: 14,
            ComputeRackUnit: 15,
            ConnectedSasExpander: 16,
            ControllerFlags: 17,
            ControllerId: 18,
            ControllerStatus: 4,
            DefaultDriveMode: 19,
            DiskGroup: 20,
            DiskSlot: 21,
            EccBucketLeakRate: 22,
            HwRevision: 23,
            InterfaceType: 7,
            MaxVolumesSupported: 24,
            MemoryCorrectableErrors: 25,
            Model: 1,
            OobInterfaceSupported: 26,
            OperReason: 6,
            OperState: 3,
            PciSlot: 8,
            PhysicalDisks: 27,
            Presence: 2,
            PreviousFru: 28,
            RaidSupport: 29,
            RebuildRate: 30,
            RebuildRatePercent: 31,
            RunningFirmware: 32,
            SelfEncryptEnabled: 9,
            Serial: 5,
            Server: 0,
            Type: 33,
            VirtualDrives: 34,
          },
          renameByName: {
            BackupBatteryUnitPresence: 'Battery',
            MemoryCorrectableErrors: '',
            OperState: 'State',
            PciSlot: 'PCI Slot',
            RebuildRatePercent: 'Rebuild Rate',
            SelfEncryptEnabled: 'Self Encryption',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value',
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              ',': { color: 'orange', index: 3, text: 'NA' },
              'Enabled,Critical': { color: 'dark-red', index: 2, text: 'Critical' },
              'Enabled,OK': { color: 'green', index: 1, text: 'OK' },
              'OK': { color: 'green', index: 0, text: 'OK' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 4, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // SelfEncryptEnabled field
      builder
        .matchFieldsWithName('Self Encryption')
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: '#646464', index: 1, text: 'Not Enabled' },
              true: { color: 'blue', index: 0, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Battery field
      builder
        .matchFieldsWithName('Battery')
        .overrideMappings([
          {
            type: 'value',
            options: {
              true: { color: 'blue', index: 0, text: 'Present' },
            },
          },
          {
            type: 'special',
            options: {
              match: 'null',
              result: { color: '#646464', index: 1, text: 'Not Present' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // InterfaceType field
      builder
        .matchFieldsWithName('InterfaceType')
        .overrideMappings([
          {
            type: 'value',
            options: {
              Nvme: { index: 2, text: 'NVMe' },
              Sas: { index: 0, text: 'SAS' },
              Sata: { index: 1, text: 'SATA' },
            },
          },
        ]);

      // MemoryCorrectableErrors field
      builder
        .matchFieldsWithName('MemoryCorrectableErrors')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'text' },
            { value: 1, color: 'dark-orange' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: panel,
      }),
    ],
  });
}

// Helper function for SSD Disks sub-tab (panel-205)
function getSSDDisksPanel() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/storage/PhysicalDisks?$top=1000&$filter=Type eq \'SSD\' and Owners in (${RegisteredDevices:singlequote})&$expand=Parent($expand=Parent($expand=ComputeBlade,ComputeRackUnit))',
        root_selector: '$.Results',
        columns: [
          { selector: 'Bootable', text: '', type: 'string' },
          { selector: 'Description', text: '', type: 'string' },
          { selector: 'DisabledForRemoval', text: '', type: 'string' },
          { selector: 'DiskId', text: '', type: 'string' },
          { selector: 'DiskState', text: '', type: 'string' },
          { selector: 'DriveState', text: '', type: 'string' },
          { selector: 'EncryptionStatus', text: '', type: 'string' },
          { selector: 'FailurePredicted', text: '', type: 'string' },
          { selector: 'FdeCapable', text: '', type: 'string' },
          { selector: 'HotSpareType', text: '', type: 'string' },
          { selector: 'IsPlatformSupported', text: '', type: 'string' },
          { selector: 'LinkSpeed', text: '', type: 'string' },
          { selector: 'MaximumOperatingTemperature', text: '', type: 'string' },
          { selector: 'MediaErrorCount', text: '', type: 'string' },
          { selector: 'Model', text: '', type: 'string' },
          { selector: 'Name', text: '', type: 'string' },
          { selector: 'NonCoercedSizeBytes', text: '', type: 'string' },
          { selector: 'NumBlocks', text: '', type: 'string' },
          { selector: 'OperPowerState', text: '', type: 'string' },
          { selector: 'OperatingTemperature', text: '', type: 'string' },
          { selector: 'PartNumber', text: '', type: 'string' },
          { selector: 'PercentLifeLeft', text: '', type: 'string' },
          { selector: 'PercentReservedCapacityConsumed', text: '', type: 'string' },
          { selector: 'PerformancePercent', text: '', type: 'string' },
          { selector: 'PowerCycleCount', text: '', type: 'string' },
          { selector: 'PowerOnHours', text: '', type: 'string' },
          { selector: 'PowerOnHoursPercentage', text: '', type: 'string' },
          { selector: 'PredictedMediaLifeLeftPercent', text: '', type: 'string' },
          { selector: 'PredictiveFailureCount', text: '', type: 'string' },
          { selector: 'Presence', text: '', type: 'string' },
          { selector: 'PreviousFru', text: '', type: 'string' },
          { selector: 'Protocol', text: '', type: 'string' },
          { selector: 'ReadErrorCountThreshold', text: '', type: 'string' },
          { selector: 'ReadIoErrorCount', text: '', type: 'string' },
          { selector: 'RunningFirmware', text: '', type: 'string' },
          { selector: 'Serial', text: '', type: 'string' },
          { selector: 'Size', text: '', type: 'string' },
          { selector: 'ThresholdOperatingTemperature', text: '', type: 'string' },
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'WearStatusInDays', text: '', type: 'string' },
          { selector: 'WriteErrorCountThreshold', text: '', type: 'string' },
          { selector: 'WriteIoErrorCount', text: '', type: 'string' },
          { selector: 'Parent.Parent.ComputeBlade.Name', text: 'ParentBlade', type: 'string' },
          { selector: 'Parent.Parent.ComputeRackUnit.Name', text: 'ParentRackUnit', type: 'string' },
          { selector: 'Parent.StorageController.Name', text: 'StorageControllerName', type: 'string' },
          { selector: 'Parent.StorageController.Model', text: 'StorageControllerModel', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ParentBlade + ParentRackUnit', text: 'Server', type: 'string' },
          { selector: 'StorageControllerName + \' \' + StorageControllerModel', text: 'Controller', type: 'string' },
          { selector: '(((NonCoercedSizeBytes / 1024) / 1024) / 1024) / 1024', text: 'Capacity (TB)', type: 'number' },
          { selector: 'DiskState + \'/\' + DriveState', text: 'State', type: 'string' },
          { selector: 'OperatingTemperature + \'/\' + MaximumOperatingTemperature', text: 'Temp', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Bootable: true,
            Description: true,
            DisabledForRemoval: true,
            DiskState: true,
            DriveState: true,
            EncryptionStatus: true,
            FdeCapable: true,
            HotSpareType: true,
            IsPlatformSupported: true,
            LinkSpeed: true,
            MaximumOperatingTemperature: true,
            Name: true,
            NonCoercedSizeBytes: true,
            NumBlocks: true,
            OperPowerState: true,
            OperatingTemperature: true,
            ParentBlade: true,
            ParentRackUnit: true,
            PartNumber: true,
            PercentReservedCapacityConsumed: true,
            PerformancePercent: true,
            PowerCycleCount: true,
            PowerOnHours: true,
            PowerOnHoursPercentage: true,
            PredictedMediaLifeLeftPercent: true,
            PredictiveFailureCount: true,
            PreviousFru: true,
            ReadErrorCountThreshold: true,
            RunningFirmware: true,
            ThresholdOperatingTemperature: true,
            Type: true,
            WriteErrorCountThreshold: true,
          },
          includeByName: {},
          indexByName: {
            'Capacity (TB)': 6,
            Controller: 2,
            DiskId: 1,
            FailurePredicted: 11,
            MediaErrorCount: 21,
            Model: 2,
            PercentLifeLeft: 12,
            Presence: 7,
            Protocol: 6,
            ReadIoErrorCount: 22,
            Serial: 4,
            Server: 0,
            Size: 5,
            State: 10,
            Temp: 14,
            WriteIoErrorCount: 23,
          },
          renameByName: {
            DisabledForRemoval: 'Removal',
            DiskId: 'Slot',
            FailurePredicted: 'Failure',
            MediaErrorCount: 'Media Errors',
            OperatingTemperature: '',
            PercentLifeLeft: 'Percent Life Left',
            PowerOnHours: 'Power On Hours',
            ReadIoErrorCount: 'Read IO Errors',
            Server: 'Server',
            Temp: 'Temperature',
            WriteIoErrorCount: 'Write IO Errors',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'lg')
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              good: { color: 'green', index: 0, text: 'Good' },
              online: { color: 'green', index: 1, text: 'Online' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 2, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Life Left field
      builder
        .matchFieldsWithName('Life Left')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Predicted Life field
      builder
        .matchFieldsWithName('Predicted Life')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Reserved Cap Used field
      builder
        .matchFieldsWithName('Reserved Cap Used')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'green' },
            { value: 25, color: 'dark-yellow' },
            { value: 50, color: 'dark-orange' },
            { value: 75, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Wear (days) field
      builder
        .matchFieldsWithName('Wear (days)')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 50, color: 'dark-orange' },
            { value: 100, color: 'dark-yellow' },
            { value: 200, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Temperature field
      builder
        .matchFieldsWithName('OperatingTemperature')
        .overrideUnit('celsius')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'text' },
            { value: 60, color: 'dark-yellow' },
            { value: 70, color: 'dark-orange' },
            { value: 80, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Capacity field
      builder
        .matchFieldsWithName('Capacity (TB)')
        .overrideDecimals(2);

      // Serial field
      builder
        .matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', 150);

      // Controller field
      builder
        .matchFieldsWithName('Controller')
        .overrideCustomFieldConfig('width', 200);

      // Server field
      builder
        .matchFieldsWithName('Server')
        .overrideCustomFieldConfig('width', 150);

      // Disk field
      builder
        .matchFieldsWithName('Disk')
        .overrideCustomFieldConfig('width', 100);

      // DiskId field
      builder
        .matchFieldsWithName('DiskId')
        .overrideCustomFieldConfig('width', 80);

      // Model field
      builder
        .matchFieldsWithName('Model')
        .overrideCustomFieldConfig('width', 200);

      // EncryptionStatus field
      builder
        .matchFieldsWithName('EncryptionStatus')
        .overrideMappings([
          {
            type: 'value',
            options: {
              'Not Capable': { color: '#646464', index: 0, text: 'Not Capable' },
              'Capable': { color: 'text', index: 1, text: 'Capable' },
              'Enabled': { color: 'blue', index: 2, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value',
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: panel,
      }),
    ],
  });
}

// Helper function for HDD Disks sub-tab (panel-208)
function getHDDDisksPanel() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/storage/PhysicalDisks?$top=1000&$filter=Type eq \'HDD\' and Owners in (${RegisteredDevices:singlequote})&$expand=Parent($expand=Parent($expand=ComputeBlade,ComputeRackUnit))',
        root_selector: '$.Results',
        columns: [
          { selector: 'Bootable', text: '', type: 'string' },
          { selector: 'Description', text: '', type: 'string' },
          { selector: 'DisabledForRemoval', text: '', type: 'string' },
          { selector: 'DiskId', text: '', type: 'string' },
          { selector: 'DiskState', text: '', type: 'string' },
          { selector: 'DriveState', text: '', type: 'string' },
          { selector: 'EncryptionStatus', text: '', type: 'string' },
          { selector: 'FailurePredicted', text: '', type: 'string' },
          { selector: 'FdeCapable', text: '', type: 'string' },
          { selector: 'HotSpareType', text: '', type: 'string' },
          { selector: 'IsPlatformSupported', text: '', type: 'string' },
          { selector: 'LinkSpeed', text: '', type: 'string' },
          { selector: 'MaximumOperatingTemperature', text: '', type: 'string' },
          { selector: 'MediaErrorCount', text: '', type: 'string' },
          { selector: 'Model', text: '', type: 'string' },
          { selector: 'Name', text: '', type: 'string' },
          { selector: 'NonCoercedSizeBytes', text: '', type: 'string' },
          { selector: 'NumBlocks', text: '', type: 'string' },
          { selector: 'OperPowerState', text: '', type: 'string' },
          { selector: 'OperatingTemperature', text: '', type: 'string' },
          { selector: 'PartNumber', text: '', type: 'string' },
          { selector: 'PercentLifeLeft', text: '', type: 'string' },
          { selector: 'PercentReservedCapacityConsumed', text: '', type: 'string' },
          { selector: 'PerformancePercent', text: '', type: 'string' },
          { selector: 'PowerCycleCount', text: '', type: 'string' },
          { selector: 'PowerOnHours', text: '', type: 'string' },
          { selector: 'PowerOnHoursPercentage', text: '', type: 'string' },
          { selector: 'PredictedMediaLifeLeftPercent', text: '', type: 'string' },
          { selector: 'PredictiveFailureCount', text: '', type: 'string' },
          { selector: 'Presence', text: '', type: 'string' },
          { selector: 'PreviousFru', text: '', type: 'string' },
          { selector: 'Protocol', text: '', type: 'string' },
          { selector: 'ReadErrorCountThreshold', text: '', type: 'string' },
          { selector: 'ReadIoErrorCount', text: '', type: 'string' },
          { selector: 'RunningFirmware', text: '', type: 'string' },
          { selector: 'Serial', text: '', type: 'string' },
          { selector: 'Size', text: '', type: 'string' },
          { selector: 'ThresholdOperatingTemperature', text: '', type: 'string' },
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'WearStatusInDays', text: '', type: 'string' },
          { selector: 'WriteErrorCountThreshold', text: '', type: 'string' },
          { selector: 'WriteIoErrorCount', text: '', type: 'string' },
          { selector: 'Parent.Parent.ComputeBlade.Name', text: 'ParentBlade', type: 'string' },
          { selector: 'Parent.Parent.ComputeRackUnit.Name', text: 'ParentRackUnit', type: 'string' },
          { selector: 'Parent.StorageController.Name', text: 'StorageControllerName', type: 'string' },
          { selector: 'Parent.StorageController.Model', text: 'StorageControllerModel', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ParentBlade + ParentRackUnit', text: 'Server', type: 'string' },
          { selector: 'StorageControllerName + \' \' + StorageControllerModel', text: 'Controller', type: 'string' },
          { selector: '(((NonCoercedSizeBytes / 1024) / 1024) / 1024) / 1024', text: 'Capacity (TB)', type: 'number' },
          { selector: 'DiskState + \'/\' + DriveState', text: 'State', type: 'string' },
          { selector: 'OperatingTemperature + \'/\' + MaximumOperatingTemperature', text: 'Temp', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Bootable: true,
            Description: true,
            DisabledForRemoval: true,
            DiskState: true,
            DriveState: true,
            EncryptionStatus: true,
            FdeCapable: true,
            HotSpareType: true,
            IsPlatformSupported: true,
            LinkSpeed: true,
            MaximumOperatingTemperature: true,
            Name: true,
            NonCoercedSizeBytes: true,
            NumBlocks: true,
            OperPowerState: true,
            OperatingTemperature: true,
            ParentBlade: true,
            ParentRackUnit: true,
            PartNumber: true,
            PercentReservedCapacityConsumed: true,
            PerformancePercent: true,
            PowerCycleCount: true,
            PowerOnHours: true,
            PowerOnHoursPercentage: true,
            PredictedMediaLifeLeftPercent: true,
            PredictiveFailureCount: true,
            PreviousFru: true,
            ReadErrorCountThreshold: true,
            RunningFirmware: true,
            ThresholdOperatingTemperature: true,
            Type: true,
            WriteErrorCountThreshold: true,
          },
          includeByName: {},
          indexByName: {
            'Capacity (TB)': 6,
            Controller: 2,
            DiskId: 1,
            FailurePredicted: 11,
            MediaErrorCount: 21,
            Model: 2,
            PercentLifeLeft: 12,
            Presence: 7,
            Protocol: 6,
            ReadIoErrorCount: 22,
            Serial: 4,
            Server: 0,
            Size: 5,
            State: 10,
            Temp: 14,
            WriteIoErrorCount: 23,
          },
          renameByName: {
            DisabledForRemoval: 'Removal',
            DiskId: 'Slot',
            FailurePredicted: 'Failure',
            MediaErrorCount: 'Media Errors',
            OperatingTemperature: '',
            PercentLifeLeft: 'Percent Life Left',
            PowerOnHours: 'Power On Hours',
            ReadIoErrorCount: 'Read IO Errors',
            Server: 'Server',
            Temp: 'Temperature',
            WriteIoErrorCount: 'Write IO Errors',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'lg')
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              good: { color: 'green', index: 0, text: 'Good' },
              online: { color: 'green', index: 1, text: 'Online' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 2, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Life Left field
      builder
        .matchFieldsWithName('Life Left')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Predicted Life field
      builder
        .matchFieldsWithName('Predicted Life')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 25, color: 'dark-orange' },
            { value: 50, color: 'dark-yellow' },
            { value: 75, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Reserved Cap Used field
      builder
        .matchFieldsWithName('Reserved Cap Used')
        .overrideUnit('percent')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'green' },
            { value: 25, color: 'dark-yellow' },
            { value: 50, color: 'dark-orange' },
            { value: 75, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Wear (days) field
      builder
        .matchFieldsWithName('Wear (days)')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'dark-red' },
            { value: 50, color: 'dark-orange' },
            { value: 100, color: 'dark-yellow' },
            { value: 200, color: 'green' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-background' });

      // Temperature field
      builder
        .matchFieldsWithName('OperatingTemperature')
        .overrideUnit('celsius')
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: 0, color: 'text' },
            { value: 60, color: 'dark-yellow' },
            { value: 70, color: 'dark-orange' },
            { value: 80, color: 'dark-red' },
          ],
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Capacity field
      builder
        .matchFieldsWithName('Capacity (TB)')
        .overrideDecimals(2);

      // Serial field
      builder
        .matchFieldsWithName('Serial')
        .overrideCustomFieldConfig('width', 150);

      // Controller field
      builder
        .matchFieldsWithName('Controller')
        .overrideCustomFieldConfig('width', 200);

      // Server field
      builder
        .matchFieldsWithName('Server')
        .overrideCustomFieldConfig('width', 150);

      // Disk field
      builder
        .matchFieldsWithName('Disk')
        .overrideCustomFieldConfig('width', 100);

      // DiskId field
      builder
        .matchFieldsWithName('DiskId')
        .overrideCustomFieldConfig('width', 80);

      // Model field
      builder
        .matchFieldsWithName('Model')
        .overrideCustomFieldConfig('width', 200);

      // EncryptionStatus field
      builder
        .matchFieldsWithName('EncryptionStatus')
        .overrideMappings([
          {
            type: 'value',
            options: {
              'Not Capable': { color: '#646464', index: 0, text: 'Not Capable' },
              'Capable': { color: 'text', index: 1, text: 'Capable' },
              'Enabled': { color: 'blue', index: 2, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Presence field
      builder
        .matchFieldsWithName('Presence')
        .overrideMappings([
          {
            type: 'value',
            options: {
              equipped: { color: 'green', index: 0, text: 'Equipped' },
              missing: { color: 'dark-red', index: 1, text: 'Missing' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: panel,
      }),
    ],
  });
}

// Helper function for Virtual Drives sub-tab (panel-206)
function getVirtualDrivesPanel() {
  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/storage/VirtualDrives?$top=1000&$filter=Owners in (${RegisteredDevices:singlequote})&$expand=StorageController,Parent($expand=Parent($expand=ComputeBlade,ComputeRackUnit))',
        root_selector: '$.Results',
        columns: [
          { selector: 'AccessPolicy', text: '', type: 'string' },
          { selector: 'Bootable', text: '', type: 'string' },
          { selector: 'ConfigState', text: '', type: 'string' },
          { selector: 'Description', text: '', type: 'string' },
          { selector: 'DriveCache', text: '', type: 'string' },
          { selector: 'DriveState', text: '', type: 'string' },
          { selector: 'DriveSecurity', text: '', type: 'string' },
          { selector: 'Id', text: '', type: 'string' },
          { selector: 'IoPolicy', text: '', type: 'string' },
          { selector: 'Name', text: '', type: 'string' },
          { selector: 'OperState', text: '', type: 'string' },
          { selector: 'Presence', text: '', type: 'string' },
          { selector: 'ReadPolicy', text: '', type: 'string' },
          { selector: 'Size', text: '', type: 'string' },
          { selector: 'StripSize', text: '', type: 'string' },
          { selector: 'Type', text: '', type: 'string' },
          { selector: 'VirtualDriveId', text: '', type: 'string' },
          { selector: 'WritePolicy', text: '', type: 'string' },
          { selector: 'StorageController.Model', text: 'StorageControllerModel', type: 'string' },
          { selector: 'StorageController.Name', text: 'StorageControllerName', type: 'string' },
          { selector: 'Parent.Parent.ComputeBlade.Name', text: 'ParentBlade', type: 'string' },
          { selector: 'Parent.Parent.ComputeRackUnit.Name', text: 'ParentRackUnit', type: 'string' },
          { selector: 'Parent.StorageController.Name', text: 'PhysicalDiskControllerName', type: 'string' },
        ],
        computed_columns: [
          { selector: 'ParentBlade + ParentRackUnit', text: 'Server', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const dataTransformer = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Description: true,
            DriveCache: true,
            Id: true,
            ParentBlade: true,
            ParentRackUnit: true,
            PhysicalDiskControllerName: true,
            StripSize: true,
            StorageControllerModel: true,
            StorageControllerName: true,
          },
          includeByName: {},
          indexByName: {
            AccessPolicy: 8,
            Bootable: 9,
            ConfigState: 4,
            DriveState: 3,
            DriveSecurity: 10,
            IoPolicy: 11,
            Name: 2,
            OperState: 12,
            Presence: 13,
            ReadPolicy: 14,
            Server: 1,
            Size: 6,
            Type: 5,
            VirtualDriveId: 0,
            WritePolicy: 7,
          },
          renameByName: {
            DriveState: 'State',
            Type: 'RAID Type',
            VirtualDriveId: 'ID',
          },
        },
      },
    ],
  });

  const panel = PanelBuilders.table()
    .setTitle('')
    .setData(dataTransformer)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // State field
      builder
        .matchFieldsWithName('State')
        .overrideMappings([
          {
            type: 'value',
            options: {
              optimal: { color: 'green', index: 0, text: 'Optimal' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 1, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // ConfigState field
      builder
        .matchFieldsWithName('ConfigState')
        .overrideMappings([
          {
            type: 'value',
            options: {
              applied: { color: 'green', index: 0, text: 'Applied' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'dark-red', index: 1, text: 'Error ($1)' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // Bootable field
      builder
        .matchFieldsWithName('Bootable')
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: '#646464', index: 1, text: 'No' },
              true: { color: 'blue', index: 0, text: 'Yes' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      // DriveSecurity field
      builder
        .matchFieldsWithName('DriveSecurity')
        .overrideMappings([
          {
            type: 'value',
            options: {
              Disabled: { color: '#646464', index: 0, text: 'Disabled' },
              Enabled: { color: 'blue', index: 1, text: 'Enabled' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });

      return builder.build();
    })
    .build();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 600,
        body: panel,
      }),
    ],
  });
}

function getStorageTab() {
  // Create nested tabs for Storage sub-sections
  const storageControllerTab = getStorageControllersPanel();
  const ssdDisksTab = getSSDDisksPanel();
  const hddDisksTab = getHDDDisksPanel();
  const virtualDrivesTab = getVirtualDrivesPanel();

  const storageTabs = new TabbedScene({
    tabs: [
      { id: 'storage-controllers', label: 'Storage Controllers', getBody: () => storageControllerTab },
      { id: 'ssd-disks', label: 'SSD Disks', getBody: () => ssdDisksTab },
      { id: 'hdd-disks', label: 'HDD Disks', getBody: () => hddDisksTab },
      { id: 'virtual-drives', label: 'Virtual Drives', getBody: () => virtualDrivesTab },
    ],
    activeTab: 'storage-controllers',
    body: storageControllerTab,
  });

  // Wrap the TabbedScene in a SceneFlexLayout as per Grafana Scenes pattern
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 'calc(100vh - 180px)',
        body: storageTabs,
      }),
    ],
  });
}

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

const immDomainTabs = [
  { id: 'overview', label: 'Overview', getBody: getOverviewTab },
  { id: 'inventory', label: 'Inventory', getBody: getInventoryTab },
  { id: 'alarms', label: 'Alarms', getBody: getAlarmsTab },
  { id: 'actions', label: 'Actions', getBody: getActionsTab },
  { id: 'ports', label: 'Ports', getBody: getPortsTab },
  { id: 'network-utilization', label: 'Network Utilization', getBody: getNetworkUtilizationTab },
  { id: 'traffic-balance', label: 'Traffic Balance', getBody: getTrafficBalanceTab },
  { id: 'congestion', label: 'Congestion', getBody: getCongestionTab },
  { id: 'network-errors', label: 'Network Errors', getBody: getNetworkErrorsTab },
  { id: 'sfp', label: 'SFP', getBody: getSFPTab },
  { id: 'environmental', label: 'Environmental', getBody: getEnvironmentalTab },
  { id: 'cpu-utilization', label: 'CPU Utilization', getBody: getCPUUtilizationTab },
  { id: 'storage', label: 'Storage', getBody: getStorageTab },
];

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function getIMMDomainSceneBody() {
  // Create DomainName variable - scoped to IMM Domain tab
  // Queries ElementSummaries with ManagementMode filter
  // Uses regex to extract domain name (removes " FI-A" suffix)
  const domainNameVariable = new QueryVariable({
    name: 'DomainName',
    label: 'Domain',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/network/ElementSummaries?$filter=ManagementMode eq \'Intersight\'',
        root_selector: '$.Results',
        columns: [
          { selector: 'Name', text: 'Name', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
        filters: [],
      },
    },
    isMulti: true,
    includeAll: false,
    maxVisibleValues: 2,
    regex: '(?<text>.*) FI-A', // Extract domain name without " FI-A" suffix
  });

  // Create RegisteredDevices variable - hidden, depends on DomainName
  // Used for filtering in downstream panels
  const registeredDevicesVariable = new QueryVariable({
    name: 'RegisteredDevices',
    label: 'RegisteredDevices',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/asset/DeviceRegistrations?$filter=DeviceHostname in (${DomainName:singlequote})',
        root_selector: '$.Results',
        columns: [
          { selector: 'Moid', text: 'Moid', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
        filters: [],
      },
    },
    isMulti: false,
    includeAll: true,
    hide: 2, // hideVariable = 2 in Scenes
  });

  // Create variable set for IMM Domain tab
  const variables = new SceneVariableSet({
    variables: [domainNameVariable, registeredDevicesVariable],
  });

  // Create the tabbed scene with controls on same line as tabs
  return new TabbedScene({
    $variables: variables,
    tabs: immDomainTabs,
    activeTab: 'overview',
    body: getOverviewTab(),
    controls: [new VariableValueSelectors({})],
  });
}
