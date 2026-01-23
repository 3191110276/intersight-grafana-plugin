import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';

export function getCPUUtilizationTab() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 200,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO\n\nThis tab is under development.')
          .setOption('mode', 'markdown')
          .setDisplayMode('transparent')
          .build(),
      }),
    ],
  });
}
