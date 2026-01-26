import {
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';

export function getNetworkErrorsTab() {
  const uplinksRow = createUplinksRow();
  const downlinksRow = createDownlinksRow();
  const errorDescriptionsRow = createErrorDescriptionsRow();

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 700,
        body: new SceneGridLayout({
          children: [uplinksRow, downlinksRow, errorDescriptionsRow],
        }),
      }),
    ],
  });
}

function createUplinksRow() {
  const uplinksPortsContent = createPlaceholderPanel('eCMC Uplinks - Ports');
  const uplinksPortChannelsContent = createPlaceholderPanel('eCMC Uplinks - Port Channels');

  const uplinksNestedTabs = new TabbedScene({
    tabs: [
      { id: 'ports', label: 'Ports', getBody: () => uplinksPortsContent },
      { id: 'port-channels', label: 'Port Channels', getBody: () => uplinksPortChannelsContent },
    ],
    activeTab: 'ports',
    body: uplinksPortsContent,
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

function createDownlinksRow() {
  return new SceneGridRow({
    title: 'eCMC Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 8,
    children: [
      new SceneGridItem({
        x: 0,
        y: 8,
        width: 24,
        height: 6,
        body: createPlaceholderPanel('eCMC Downlinks'),
      }),
    ],
  });
}

function createErrorDescriptionsRow() {
  return new SceneGridRow({
    title: 'Error Descriptions',
    isCollapsible: true,
    isCollapsed: false,
    y: 14,
    children: [
      new SceneGridItem({
        x: 0,
        y: 14,
        width: 24,
        height: 6,
        body: createPlaceholderPanel('Error Descriptions Table'),
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
