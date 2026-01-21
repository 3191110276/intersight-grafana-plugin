import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';

export function getIMMDomainSceneBody() {
  return new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          height: 300,
          body: PanelBuilders.text()
            .setTitle('IMM Domain')
            .setOption('content', `
# IMM Domain Dashboards

This section will contain dashboards for Cisco Intersight Managed Mode (IMM) Domains.

Dashboards will be migrated from /old_dashboards.
            `)
            .setOption('mode', 'markdown')
            .build(),
        }),
      ],
    });
}
