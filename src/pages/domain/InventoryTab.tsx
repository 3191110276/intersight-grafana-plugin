/**
 * Inventory Tab - IMM Domain Scene
 *
 * TODO: Implement Inventory functionality
 */

import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneComponentProps,
} from '@grafana/scenes';
import { DynamicVariableScene } from '../../utils/DynamicVariableScene';

// ============================================================================
// DYNAMIC INVENTORY SCENE
// ============================================================================

class DynamicInventoryScene extends DynamicVariableScene {
  public static Component = DynamicInventorySceneRenderer;

  public constructor() {
    super(
      ['DomainName'],
      'domain',
      new SceneFlexLayout({ children: [] })
    );
  }

  protected buildContent() {
    // Create TODO placeholder content
    return createTodoPlaceholder();
  }
}

function DynamicInventorySceneRenderer({ model }: SceneComponentProps<DynamicInventoryScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

function createTodoPlaceholder() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 200,
        ySizing: 'content',
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### TODO: Inventory Tab\n\nThis tab is under development.')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
    ],
  });
}

export function getInventoryTab() {
  return new DynamicInventoryScene();
}
