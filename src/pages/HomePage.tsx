import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
} from '@grafana/scenes';

export function getHomeSceneBody() {
  return new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          height: 300,
          body: PanelBuilders.text()
            .setTitle('Welcome to Scenes App')
            .setOption('content', `
# Welcome to your Scenes App Plugin

This is a Grafana Scenes-based app plugin. You can now:

1. **Add Dashboard Scenes**: Convert your existing dashboards to Scenes
2. **Create Custom Visualizations**: Use PanelBuilders to create panels
3. **Build Interactive Apps**: Leverage Scenes for dynamic interactions

## Getting Started

Edit \`src/pages/HomePage.tsx\` to customize this scene.
            `)
            .setOption('mode', 'markdown')
            .build(),
        }),
      ],
    });
}
