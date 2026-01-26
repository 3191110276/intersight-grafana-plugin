/**
 * Congestion Tab - IMM Domain Scene
 *
 * TODO: Implement Congestion functionality
 */

import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
} from '@grafana/scenes';
import { EmptyStateScene } from '../../components/EmptyStateScene';
import { getEmptyStateScenario } from '../../utils/emptyStateHelpers';

// ============================================================================
// DYNAMIC CONGESTION SCENE
// ============================================================================

interface DynamicCongestionSceneState extends SceneObjectState {
  body: any;
}

class DynamicCongestionScene extends SceneObjectBase<DynamicCongestionSceneState> {
  public static Component = DynamicCongestionSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicCongestionSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    const result = super.activate();
    this.rebuildBody();
    return result;
  }

  private rebuildBody() {
    if (!this.isActive) {
      return;
    }

    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('DomainName variable not found or not a query variable');
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({
        body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'domain' })
      });
      return;
    }

    // Create TODO placeholder content
    const newBody = createTodoPlaceholder();
    this.setState({ body: newBody });
  }

  private getVariable(name: string): any {
    return sceneGraph.lookupVariable(name, this);
  }
}

function DynamicCongestionSceneRenderer({ model }: SceneComponentProps<DynamicCongestionScene>) {
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
          .setOption('content', '### TODO: Congestion Tab\n\nThis tab is under development.')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
    ],
  });
}

export function getCongestionTab() {
  return new DynamicCongestionScene({});
}
