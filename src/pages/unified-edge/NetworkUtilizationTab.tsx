import {
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';

export function getNetworkUtilizationTab() {
  const percentageTab = getPercentageTab();
  const absoluteTab = getAbsoluteTab();

  const networkUtilizationTabs = new TabbedScene({
    tabs: [
      { id: 'percentage', label: 'Percentage (%)', getBody: () => getPercentageTab() },
      { id: 'absolute', label: 'Absolute (bps)', getBody: () => getAbsoluteTab() },
    ],
    activeTab: 'percentage',
    body: percentageTab,
  });

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        body: networkUtilizationTabs,
      }),
    ],
  });
}

function getPercentageTab() {
  const uplinksRow = createUplinksRow('Percentage (%)');
  const downlinksRow = createDownlinksRow('Percentage (%)', 8);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 500,
        body: new SceneGridLayout({
          children: [uplinksRow, downlinksRow],
        }),
      }),
    ],
  });
}

function getAbsoluteTab() {
  const uplinksRow = createUplinksRow('Absolute (bps)');
  const downlinksRow = createDownlinksRow('Absolute (bps)', 8);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 500,
        body: new SceneGridLayout({
          children: [uplinksRow, downlinksRow],
        }),
      }),
    ],
  });
}

function createUplinksRow(tabType: string) {
  const uplinksPortsTab = createPlaceholderPanel(`eCMC Uplinks - Ports (${tabType})`);
  const uplinksPortChannelsTab = createPlaceholderPanel(`eCMC Uplinks - Port Channels (${tabType})`);

  const uplinksNestedTabs = new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => uplinksPortsTab },
      { id: 'port-channels', label: 'Port Channels', getBody: () => uplinksPortChannelsTab },
    ],
    activeTab: 'ports',
    body: uplinksPortsTab,
  });

  return new SceneGridRow({
    title: 'eCMC Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 8,
        body: uplinksNestedTabs,
      }),
    ],
  });
}

function createDownlinksRow(tabType: string, yPosition: number) {
  return new SceneGridRow({
    title: 'eCMC Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: yPosition,
    children: [
      new SceneGridItem({
        x: 0,
        y: yPosition,
        width: 24,
        height: 6,
        body: createPlaceholderPanel(`eCMC Downlinks (${tabType})`),
      }),
    ],
  });
}

function createPlaceholderPanel(description: string) {
  return PanelBuilders.text()
    .setTitle('TODO')
    .setOption('content', `### TODO\n\n${description}`)
    .setOption('mode', 'markdown' as any)
    .setDisplayMode('transparent')
    .build();
}
