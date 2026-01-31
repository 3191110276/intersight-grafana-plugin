import React from 'react';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';

/**
 * State interface for the DrilldownHeaderControl component
 */
export interface DrilldownHeaderControlState extends SceneObjectState {
  /**
   * The name of the drilled-down item (e.g., chassis name, host name)
   */
  itemName: string;

  /**
   * Optional label to prefix the item name (e.g., "Chassis", "Host")
   * If not provided, only the itemName will be displayed
   */
  itemLabel?: string;

  /**
   * Text to display on the back button
   * @default "Back to Overview"
   */
  backButtonText?: string;

  /**
   * Callback function to execute when the back button is clicked
   */
  onBack: () => void;
}

/**
 * DrilldownHeaderControl component
 *
 * Provides a consistent header UI for drilldown views, including:
 * - A back button to return to the previous view
 * - Display of the current drilldown context (e.g., "Drilldown: Chassis: chassis-01")
 *
 * @example
 * ```typescript
 * const header = new DrilldownHeaderControl({
 *   itemName: 'chassis-01',
 *   itemLabel: 'Chassis',
 *   backButtonText: 'Back to Overview',
 *   onBack: () => { scene.setState({ drilldownState: 'overview' }); }
 * });
 * ```
 */
export class DrilldownHeaderControl extends SceneObjectBase<DrilldownHeaderControlState> {
  public static Component = DrilldownHeaderRenderer;
}

function DrilldownHeaderRenderer({ model }: SceneComponentProps<DrilldownHeaderControl>) {
  const { itemName, itemLabel, backButtonText = 'Back to Overview', onBack } = model.useState();

  // Build the drilldown display text
  const displayText = itemLabel
    ? `Drilldown: ${itemLabel}: ${itemName}`
    : `Drilldown: ${itemName}`;

  return (
    <div
      style={{
        padding: '12px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
      }}
    >
      <button
        onClick={onBack}
        style={{
          padding: '6px 12px',
          cursor: 'pointer',
          background: 'transparent',
          border: '1px solid rgba(204, 204, 220, 0.25)',
          borderRadius: '2px',
          color: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
        }}
      >
        <span>&larr;</span>
        <span>{backButtonText}</span>
      </button>
      <div
        style={{
          fontSize: '18px',
          fontWeight: 500,
        }}
      >
        {displayText}
      </div>
    </div>
  );
}
