import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';

export function getOverviewTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('Overview')
          .setOption('content', 'Overview tab - to be implemented')
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}
