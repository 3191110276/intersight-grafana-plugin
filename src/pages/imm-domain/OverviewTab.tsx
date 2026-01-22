import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';

export function getOverviewTab() {
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
// OVERVIEW TAB HELPER FUNCTIONS
// ============================================================================

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
