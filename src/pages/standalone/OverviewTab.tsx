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
        height: 100,
        body: PanelBuilders.text()
          .setTitle('Overview')
          .setOption('content', 'TODO')
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}
