/**
 * Storage Tab - IMM Domain Scene
 *
 * TODO: Implement Storage functionality
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
// DYNAMIC STORAGE SCENE
// ============================================================================

class DynamicStorageScene extends DynamicVariableScene {
  public static Component = DynamicStorageSceneRenderer;

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

function DynamicStorageSceneRenderer({ model }: SceneComponentProps<DynamicStorageScene>) {
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
          .setOption('content', '### TODO: Storage Tab\n\nThis tab is under development.')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
    ],
  });
}

export function getStorageTab() {
  return new DynamicStorageScene();
}
