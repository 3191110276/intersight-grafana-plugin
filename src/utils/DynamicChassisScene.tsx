import React from 'react';
import {
  SceneObjectBase,
  SceneObjectState,
  SceneComponentProps,
  VariableDependencyConfig,
  SceneFlexLayout,
} from '@grafana/scenes';

/**
 * Base state interface for Dynamic Chassis Scenes
 * Extend this interface to add scene-specific state properties
 */
export interface DynamicChassisSceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicChassisScene - Abstract base class for scenes that react to ChassisName variable changes
 *
 * This base class eliminates ~35-40 lines of boilerplate per scene by providing:
 * - Automatic ChassisName variable watching
 * - Standard activation/rebuild lifecycle
 * - Common renderer pattern
 *
 * Subclasses only need to:
 * 1. Define their state interface (extending DynamicChassisSceneState)
 * 2. Set the static Component property
 * 3. Implement the rebuildBody() method
 *
 * @example
 * ```typescript
 * interface MySceneState extends DynamicChassisSceneState {
 *   customProperty?: string;
 * }
 *
 * class MyScene extends DynamicChassisScene<MySceneState> {
 *   public static Component = DynamicChassisSceneRenderer;
 *
 *   protected rebuildBody() {
 *     // Your rebuild logic here
 *   }
 * }
 * ```
 */
export abstract class DynamicChassisScene<
  TState extends DynamicChassisSceneState = DynamicChassisSceneState
> extends SceneObjectBase<TState> {
  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.onChassisVariableChanged();
      }
    },
  });

  /**
   * Constructor - initializes the scene with an empty body
   * Subclasses can override to customize initialization
   */
  public constructor(state: Partial<TState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    } as TState);
  }

  /**
   * Activate lifecycle - calls rebuildBody on activation
   * Override this method if you need custom activation logic
   */
  // @ts-ignore - Override return type doesn't match base class exactly
  public activate() {
    super.activate();
    this.rebuildBody();
    // Return empty cleanup function to satisfy type requirements
    return () => {};
  }

  /**
   * Hook called when ChassisName variable changes
   * Override this to add custom behavior (e.g., reset drilldown state)
   * Default implementation just rebuilds the body
   */
  protected onChassisVariableChanged(): void {
    this.rebuildBody();
  }

  /**
   * Rebuild the scene body based on current state and variables
   * Must be implemented by subclasses
   */
  protected abstract rebuildBody(): void;
}

/**
 * Standard renderer for Dynamic Chassis Scenes
 * Renders the scene body in a full-size flex container
 */
export function DynamicChassisSceneRenderer<TState extends DynamicChassisSceneState>({
  model,
}: SceneComponentProps<DynamicChassisScene<TState>>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}
