import { SceneObjectBase, SceneObjectState, sceneGraph, VariableDependencyConfig } from '@grafana/scenes';

/**
 * Generic drilldown state interface
 *
 * @template TTarget - The type of the drilldown target (e.g., string for chassis name)
 */
export interface DrilldownStateState<TTarget = string> extends SceneObjectState {
  /** Current drilldown mode */
  mode: 'overview' | 'drilldown';

  /** The current drilldown target (e.g., chassisName, serverName) */
  target?: TTarget;

  /** Track previous variable value to detect changes */
  lastVariableValue?: any;
}

/**
 * Configuration options for SharedDrilldownState
 */
export interface DrilldownStateConfig {
  /** Name of the variable to watch for changes (e.g., 'ChassisName', 'ServerName') */
  variableName: string;

  /** Initial drilldown mode (default: 'overview') */
  initialMode?: 'overview' | 'drilldown';

  /** Initial drilldown target */
  initialTarget?: string;
}

/**
 * Shared drilldown state manager that synchronizes drilldown across multiple containers
 *
 * ## Purpose
 * This class provides a centralized state management solution for drill-down functionality
 * in Grafana Scenes. It synchronizes the drilldown state across multiple child components
 * and automatically resets drilldown mode when the watched variable changes.
 *
 * ## State Machine Transitions
 *
 * ```
 * ┌──────────┐                           ┌────────────┐
 * │          │  drillToTarget(target)    │            │
 * │ Overview │ ────────────────────────> │ Drilldown  │
 * │          │                           │ (target)   │
 * │          │ <──────────────────────── │            │
 * └──────────┘  exitDrilldown()          └────────────┘
 *      ^                                       |
 *      |                                       |
 *      └───────────────────────────────────────┘
 *           Variable change detected
 *           (auto-exit drilldown)
 * ```
 *
 * ### State Transitions:
 * 1. **Overview → Drilldown**: When user clicks on a row/item to drill into details
 *    - Triggered by: `drillToTarget(targetName)`
 *    - Sets: `mode = 'drilldown'`, `target = targetName`
 *
 * 2. **Drilldown → Overview**: When user exits drilldown or variable changes
 *    - Triggered by: `exitDrilldown()` or variable change
 *    - Sets: `mode = 'overview'`, `target = undefined`
 *
 * 3. **Auto-reset on Variable Change**: When the watched variable changes
 *    - Example: User changes ChassisName filter while in drilldown
 *    - Automatically exits drilldown to prevent showing stale data
 *
 * ## Usage Example
 *
 * ### 1. Create the shared state in your tab
 * ```typescript
 * const sharedDrilldownState = new SharedDrilldownState({
 *   variableName: 'ChassisName',
 *   initialMode: 'overview',
 * });
 * ```
 *
 * ### 2. Add to scene graph (as a child of your main scene)
 * ```typescript
 * return new SceneFlexLayout({
 *   children: [
 *     new SceneFlexItem({ body: sharedDrilldownState }), // Non-visual, manages state
 *     new SceneFlexItem({ body: myContainer }),
 *   ],
 * });
 * ```
 *
 * ### 3. Access from child containers
 * ```typescript
 * class MyContainer extends SceneObjectBase<MyContainerState> {
 *   private getSharedDrilldownState(): SharedDrilldownState | null {
 *     return sceneGraph.findObject(this, (obj) => obj instanceof SharedDrilldownState);
 *   }
 *
 *   public drillToTarget(targetName: string) {
 *     const sharedState = this.getSharedDrilldownState();
 *     sharedState?.drillToTarget(targetName);
 *   }
 *
 *   public exitDrilldown() {
 *     const sharedState = this.getSharedDrilldownState();
 *     sharedState?.exitDrilldown();
 *   }
 * }
 * ```
 *
 * ### 4. Subscribe to state changes in child containers
 * ```typescript
 * activate() {
 *   const sharedState = this.getSharedDrilldownState();
 *   if (sharedState) {
 *     this._subs.add(
 *       sharedState.subscribeToState(() => {
 *         this.rebuildBody(); // Rebuild UI when drilldown state changes
 *       })
 *     );
 *   }
 * }
 * ```
 *
 * ## Type Parameters
 * @template TTarget - The type of the drilldown target (default: string)
 *                     Use string for simple names (chassis, server, host)
 *                     Use custom types for complex drilldown targets
 *
 * @example
 * // Simple string target
 * const state = new SharedDrilldownState({ variableName: 'ChassisName' });
 *
 * @example
 * // Custom target type
 * interface ServerTarget { name: string; id: number; }
 * const state = new SharedDrilldownState<ServerTarget>({ variableName: 'ServerName' });
 */
export class SharedDrilldownState<TTarget = string> extends SceneObjectBase<DrilldownStateState<TTarget>> {
  /** Non-visual component (manages state only) */
  public static Component = () => null;

  private _config: DrilldownStateConfig;

  protected _variableDependency: VariableDependencyConfig<DrilldownStateState<TTarget>>;

  constructor(config: DrilldownStateConfig) {
    super({
      mode: config.initialMode || 'overview',
      target: config.initialTarget as TTarget | undefined,
      lastVariableValue: undefined,
    });

    this._config = config;

    // Set up variable dependency to auto-reset on variable change
    this._variableDependency = new VariableDependencyConfig(this, {
      variableNames: [config.variableName],
      onReferencedVariableValueChanged: () => {
        const currentValue = this.getVariableValue();
        const lastValue = this.state.lastVariableValue;

        // Only exit drilldown if variable actually changed
        if (this.hasVariableChanged(lastValue, currentValue)) {
          if (this.state.mode !== 'overview') {
            this.exitDrilldown();
          }
        }

        // Update tracked value
        this.setState({ lastVariableValue: currentValue });
      },
    });
  }

  /**
   * Drill down to a specific target
   *
   * @param target - The drilldown target (e.g., chassis name, server name)
   */
  public drillToTarget(target: TTarget) {
    this.setState({
      mode: 'drilldown',
      target,
    });
  }

  /**
   * Exit drilldown and return to overview
   */
  public exitDrilldown() {
    this.setState({
      mode: 'overview',
      target: undefined,
    });
  }

  /**
   * Get the current value of the watched variable
   * @private
   */
  private getVariableValue(): any {
    const variable = sceneGraph.lookupVariable(this._config.variableName, this);
    if (!variable || !('state' in variable)) {
      return undefined;
    }
    return (variable.state as any).value;
  }

  /**
   * Check if the watched variable value has changed
   * Handles both simple values and arrays (for multi-select variables)
   *
   * @param oldValue - Previous variable value
   * @param newValue - Current variable value
   * @returns True if the variable has changed
   * @private
   */
  private hasVariableChanged(oldValue: any, newValue: any): boolean {
    // Handle arrays (multi-select variables)
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) {
        return true;
      }
      // Sort and compare to handle order changes
      const sorted1 = [...oldValue].sort();
      const sorted2 = [...newValue].sort();
      return !sorted1.every((val, idx) => val === sorted2[idx]);
    }

    // Handle simple values (single-select variables)
    return oldValue !== newValue;
  }
}

/**
 * Helper function to find SharedDrilldownState in the scene graph
 *
 * @param sceneObject - The scene object to start searching from
 * @returns The SharedDrilldownState instance or null if not found
 *
 * @example
 * ```typescript
 * class MyContainer extends SceneObjectBase {
 *   private rebuildBody() {
 *     const drilldownState = findSharedDrilldownState(this);
 *     const mode = drilldownState?.state.mode || 'overview';
 *     const target = drilldownState?.state.target;
 *
 *     if (mode === 'drilldown' && target) {
 *       this.setState({ body: createDrilldownView(target) });
 *     } else {
 *       this.setState({ body: createOverviewView() });
 *     }
 *   }
 * }
 * ```
 */
export function findSharedDrilldownState<TTarget = string>(
  sceneObject: SceneObjectBase<any>
): SharedDrilldownState<TTarget> | null {
  try {
    return sceneGraph.findObject(sceneObject, (obj) => obj instanceof SharedDrilldownState) as SharedDrilldownState<TTarget> | null;
  } catch {
    return null;
  }
}
