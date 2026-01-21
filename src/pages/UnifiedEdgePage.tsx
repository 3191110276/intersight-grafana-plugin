import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';

export function getUnifiedEdgeSceneBody() {
  return new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          height: 300,
          body: PanelBuilders.text()
            .setTitle('Unified Edge')
            .setOption('content', `
# Unified Edge Dashboards

This section will contain dashboards for Cisco Unified Edge infrastructure.

Dashboards will be migrated from /old_dashboards.
            `)
            .setOption('mode', 'markdown')
            .build(),
        }),
      ],
    });
}
