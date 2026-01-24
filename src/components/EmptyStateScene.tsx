/**
 * EmptyStateScene Component
 *
 * A reusable Scene component for displaying empty state messages.
 * Handles two scenarios:
 * 1. 'no-data' - No data available in Intersight (query returned empty)
 * 2. 'nothing-selected' - Data exists but user hasn't selected anything from filter
 *
 * Usage:
 *   new EmptyStateScene({ scenario: 'nothing-selected', entityType: 'server' })
 *   new EmptyStateScene({ scenario: 'no-data', entityType: 'chassis', customMessage: '...' })
 */

import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
} from '@grafana/scenes';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EmptyStateScenario = 'no-data' | 'nothing-selected';
export type EntityType = 'server' | 'chassis' | 'domain';

export interface EmptyStateSceneState extends SceneObjectState {
  scenario: EmptyStateScenario;
  entityType: EntityType;
  customMessage?: string;
}

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

/**
 * Get the appropriate empty state message based on scenario and entity type
 */
function getEmptyStateMessage(scenario: EmptyStateScenario, entityType: EntityType): string {
  const entityPlural = entityType === 'chassis' ? 'chassis' : `${entityType}s`;
  const entityCapitalized = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  const entityPluralCapitalized = entityType === 'chassis' ? 'Chassis' : `${entityCapitalized}s`;

  if (scenario === 'no-data') {
    return `### No ${entityPluralCapitalized} Available

No ${entityPlural} found in Intersight.

Please ensure ${entityPlural} are registered and try again.`;
  } else {
    // 'nothing-selected'
    return `### No ${entityPluralCapitalized} Selected

Please select one or more ${entityPlural} from the ${entityCapitalized} filter above.`;
  }
}

// ============================================================================
// EMPTY STATE SCENE COMPONENT
// ============================================================================

/**
 * EmptyStateScene - Scene object that displays an empty state message
 */
export class EmptyStateScene extends SceneObjectBase<EmptyStateSceneState> {
  public static Component = EmptyStateSceneRenderer;

  public constructor(state: EmptyStateSceneState) {
    super(state);
  }

  public activate() {
    const deactivate = super.activate();
    return () => {
      deactivate();
    };
  }
}

/**
 * EmptyStateSceneRenderer - React component that renders the empty state
 */
function EmptyStateSceneRenderer({ model }: SceneComponentProps<EmptyStateScene>) {
  const { scenario, entityType, customMessage } = model.useState();

  // Use custom message if provided, otherwise generate from scenario/entityType
  const message = customMessage || getEmptyStateMessage(scenario, entityType);

  // Create the empty state layout with a text panel
  const emptyStateLayout = new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 200,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', message)
          .setOption('mode', 'markdown' as any)
          .setDisplayMode('transparent')
          .build(),
      }),
    ],
  });

  return <emptyStateLayout.Component model={emptyStateLayout} />;
}
