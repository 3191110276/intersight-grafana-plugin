/**
 * DynamicVariableScene - Base class for scenes that react to variable changes
 *
 * Provides common functionality for:
 * - Watching one or more variables for changes
 * - Handling empty state scenarios
 * - Rebuilding scene body when variables change
 *
 * Subclasses must implement:
 * - buildContent(): Create the actual scene content
 * - Component: Static renderer component
 */

import {
  SceneObjectBase,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
} from '@grafana/scenes';
import { EmptyStateScene } from '../components/EmptyStateScene';
import { getEmptyStateScenario } from './emptyStateHelpers';

export interface DynamicVariableSceneState extends SceneObjectState {
  body: any;
}

/**
 * Base class for dynamic scenes that respond to variable changes
 */
export abstract class DynamicVariableScene<
  TState extends DynamicVariableSceneState = DynamicVariableSceneState
> extends SceneObjectBase<TState> {
  protected readonly variableNames: string[];
  protected readonly entityType: 'chassis' | 'server' | 'domain';

  // @ts-ignore - VariableDependencyConfig type issues
  protected _variableDependency: VariableDependencyConfig<TState>;

  /**
   * Subclasses must implement this to build their content
   */
  protected abstract buildContent(): any;

  constructor(
    variableNames: string[],
    entityType: 'chassis' | 'server' | 'domain',
    initialBody: any,
    state?: Partial<TState>
  ) {
    super({
      body: initialBody,
      ...state,
    } as TState);

    this.variableNames = variableNames;
    this.entityType = entityType;

    // @ts-ignore - VariableDependencyConfig works but has type issues
    this._variableDependency = new VariableDependencyConfig(this, {
      variableNames: variableNames,
      onReferencedVariableValueChanged: () => {
        if (this.isActive) {
          this.rebuildBody();
        }
      },
    });
  }

  // @ts-ignore - activate() override works correctly
  public activate() {
    super.activate();
    this.rebuildBody();
  }

  /**
   * Rebuilds the scene body by checking for empty states and calling buildContent()
   */
  protected rebuildBody() {
    if (!this.isActive) {
      return;
    }

    // Check primary variable (first in list) for empty state
    const primaryVariable = this.getVariable(this.variableNames[0]);

    if (!primaryVariable || primaryVariable.state.type !== 'query') {
      console.warn(`${this.variableNames[0]} variable not found or not a query variable`);
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(primaryVariable);
    if (emptyStateScenario) {
      this.setState({
        body: new EmptyStateScene({
          scenario: emptyStateScenario,
          entityType: this.entityType,
        }),
      } as Partial<TState>);
      return;
    }

    // Build actual content
    const content = this.buildContent();
    this.setState({ body: content } as Partial<TState>);
  }

  /**
   * Helper to get a variable from the scene graph
   */
  protected getVariable(name: string): any {
    // @ts-ignore - sceneGraph.lookupVariable works correctly
    return sceneGraph.lookupVariable(name, this);
  }
}
