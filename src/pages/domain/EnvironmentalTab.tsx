/**
 * Environmental Tab - IMM Domain Scene
 *
 * TODO: Implement Environmental functionality
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
// DYNAMIC ENVIRONMENTAL SCENE
// ============================================================================

interface DynamicEnvironmentalSceneState extends SceneObjectState {
  body: any;
}

class DynamicEnvironmentalScene extends SceneObjectBase<DynamicEnvironmentalSceneState> {
  public static Component = DynamicEnvironmentalSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicEnvironmentalSceneState>) {
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

function DynamicEnvironmentalSceneRenderer({ model }: SceneComponentProps<DynamicEnvironmentalScene>) {
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
          .setOption('content', '### TODO: Environmental Tab\n\nThis tab is under development.')
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
    ],
  });
}

export function getEnvironmentalTab() {
  return new DynamicEnvironmentalScene({});
}
