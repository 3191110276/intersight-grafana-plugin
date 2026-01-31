/**
 * Base Drilldown Details Container
 *
 * Abstract base class that provides common drilldown functionality for dashboard tabs.
 * This eliminates code duplication across multiple DetailsContainer implementations
 * (NetworkUtilizationDetailsContainer, NetworkErrorsDetailsContainer, TrafficBalanceDetailsContainer, etc.)
 *
 * ## What This Solves
 *
 * Before: Each tab had 100-200 lines of duplicate container boilerplate
 * After: Subclasses only implement view creation methods (~20-30 lines each)
 *
 * ## Usage
 *
 * ```typescript
 * interface MyDetailsContainerState extends DrilldownDetailsContainerState {
 *   customProperty?: string;
 * }
 *
 * class MyDetailsContainer extends DrilldownDetailsContainer<MyDetailsContainerState> {
 *   protected createDrilldownView(target: string): any {
 *     return new SceneFlexLayout({ ... }); // Your drilldown view
 *   }
 *
 *   protected createSingleView(): any {
 *     return new SceneFlexLayout({ ... }); // Single-chassis view
 *   }
 *
 *   protected createMultiView(count: number): any {
 *     return new SceneFlexLayout({ ... }); // Multi-chassis table view
 *   }
 *
 *   protected createEmptyState(): any {
 *     return PanelBuilders.text()... // Empty state view
 *   }
 * }
 * ```
 */

import { SceneObjectBase, SceneObjectState, sceneGraph, SceneComponentProps } from '@grafana/scenes';
import { findSharedDrilldownState } from './drilldownState';
import { getChassisCount } from './drilldownHelpers';

/**
 * Base state interface for DrilldownDetailsContainer
 * Subclasses can extend this with additional properties
 */
export interface DrilldownDetailsContainerState extends SceneObjectState {
  /** The body content to render */
  body: any;
}

/**
 * Configuration options for DrilldownDetailsContainer
 */
export interface DrilldownDetailsContainerConfig {
  /**
   * Threshold for single vs multi view (default: 1)
   * - count <= threshold: show single view (line charts)
   * - count > threshold: show multi view (table)
   */
  multiViewThreshold?: number;

  /**
   * Title for empty state panel (default: 'Details')
   */
  emptyStateTitle?: string;

  /**
   * Message for empty state panel
   */
  emptyStateMessage?: string;
}

/**
 * Abstract base class for drilldown details containers
 *
 * Provides common functionality:
 * - Subscription to SharedDrilldownState
 * - Activation lifecycle
 * - Drilldown navigation (drillToChassis, exitDrilldown)
 * - 5-priority rebuildBody logic
 *
 * Subclasses must implement view creation methods.
 *
 * @template TState - The state interface (must extend DrilldownDetailsContainerState)
 */
export abstract class DrilldownDetailsContainer<
  TState extends DrilldownDetailsContainerState
> extends SceneObjectBase<TState> {

  protected config: DrilldownDetailsContainerConfig;

  constructor(state: TState, config?: DrilldownDetailsContainerConfig) {
    super(state);
    this.config = {
      multiViewThreshold: 1,
      emptyStateTitle: 'Details',
      emptyStateMessage: '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.',
      ...config,
    };
  }

  /**
   * Activate the container and subscribe to SharedDrilldownState changes
   */
  public activate() {
    const result = super.activate();

    try {
      // Find and subscribe to shared drilldown state changes
      const sharedDrilldownState = findSharedDrilldownState(this);
      if (sharedDrilldownState) {
        const subscription = sharedDrilldownState.subscribeToState(() => {
          this.rebuildBody();
        });

        // Store subscription for cleanup
        this._subs.add(subscription);
      }
    } catch (error) {
      console.error('Error subscribing to SharedDrilldownState:', error);
    }

    // Build panels when scene becomes active (when it has access to variables)
    this.rebuildBody();
    return result;
  }

  /**
   * Navigate to drilldown view for a specific chassis
   *
   * @param chassisName - The chassis to drill into
   */
  public drillToChassis(chassisName: string) {
    const sharedState = findSharedDrilldownState(this);
    if (sharedState) {
      sharedState.drillToTarget(chassisName);
    }
  }

  /**
   * Exit drilldown and return to overview
   */
  public exitDrilldown() {
    const sharedState = findSharedDrilldownState(this);
    if (sharedState) {
      sharedState.exitDrilldown();
    }
  }

  /**
   * Rebuild the body content based on drilldown state and chassis count
   *
   * Priority logic:
   * 1. Drilldown mode - show drilldown view
   * 2. Get chassis count
   * 3. Single/Few chassis - show single view (line charts)
   * 4. Multi/Many chassis - show multi view (table)
   * 5. No chassis selected - show empty state
   */
  protected rebuildBody() {
    // Only rebuild if scene is active (has access to variables)
    if (!this.isActive) {
      return;
    }

    try {
      // Get drilldown state from scene graph
      const sharedDrilldownState = findSharedDrilldownState(this);
      const mode = sharedDrilldownState?.state.mode || 'overview';
      const target = sharedDrilldownState?.state.target;

      // Priority 1: Drilldown mode
      if (mode === 'drilldown' && target) {
        const body = this.createDrilldownView(target);
        this.setState({ body } as Partial<TState>);
        return;
      }

      // Priority 2: Get chassis count
      const count = getChassisCount(this);

      // Priority 3: Single/Few chassis - show single view (line charts)
      if (count > 0 && count <= this.config.multiViewThreshold!) {
        const body = this.createSingleView(count);
        this.setState({ body } as Partial<TState>);
        return;
      }

      // Priority 4: Multi/Many chassis - show multi view (table)
      if (count > this.config.multiViewThreshold!) {
        const body = this.createMultiView(count);
        this.setState({ body } as Partial<TState>);
        return;
      }

      // Priority 5: No chassis selected - show empty state
      const body = this.createEmptyState();
      this.setState({ body } as Partial<TState>);
    } catch (error) {
      console.error('Error rebuilding body:', error);
      // Fallback to empty state on error
      const body = this.createEmptyState();
      this.setState({ body } as Partial<TState>);
    }
  }

  // ============================================================================
  // ABSTRACT METHODS - Subclasses must implement these
  // ============================================================================

  /**
   * Create the drilldown view for a specific target (e.g., chassis)
   *
   * @param target - The drilldown target (e.g., chassis name)
   * @returns The scene object to display
   */
  protected abstract createDrilldownView(target: string): any;

  /**
   * Create the single/few chassis view (typically line charts)
   *
   * @param count - The number of selected chassis
   * @returns The scene object to display
   */
  protected abstract createSingleView(count: number): any;

  /**
   * Create the multi/many chassis view (typically table with drilldown)
   *
   * @param count - The number of selected chassis
   * @returns The scene object to display
   */
  protected abstract createMultiView(count: number): any;

  /**
   * Create the empty state view (shown when no chassis selected)
   *
   * @returns The scene object to display
   */
  protected abstract createEmptyState(): any;
}

/**
 * Default renderer for DrilldownDetailsContainer
 * Subclasses can override by setting their own Component static property
 */
export function DrilldownDetailsContainerRenderer<TState extends DrilldownDetailsContainerState>({
  model,
}: SceneComponentProps<DrilldownDetailsContainer<TState>>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}
