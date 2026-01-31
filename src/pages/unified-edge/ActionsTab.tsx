/**
 * Actions Tab - Unified Edge Scene
 *
 * This module provides the Actions tab functionality for the Unified Edge scene.
 * Shows all actions in a single table with conditional chassis column visibility.
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
  SceneDataProvider,
  SceneDataState,
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { PaginatedDataProvider } from '../../utils/PaginatedDataProvider';
import { DataFrame, LoadingState, PanelData, getDefaultTimeRange } from '@grafana/data';
import { Observable } from 'rxjs';
import { EmptyStateScene } from '../../components/EmptyStateScene';
import { getEmptyStateScenario, getSelectedValues } from '../../utils/emptyStateHelpers';
import { API_ENDPOINTS, WORKFLOW_STATUSES, FIELD_NAMES } from './constants';

// ============================================================================
// CUSTOM DATA PROVIDER - Filters columns based on data presence
// ============================================================================

interface FilterColumnsDataProviderState extends SceneDataState {
  $data?: SceneDataProvider;
}

/**
 * Custom data provider that wraps another data provider and filters columns
 * based on data presence. Specifically hides the Chassis column when no data
 * is returned (empty result set).
 */
// @ts-ignore
class FilterColumnsDataProvider extends SceneObjectBase<FilterColumnsDataProviderState> implements SceneDataProvider {
  public constructor(source: SceneDataProvider) {
    super({
      $data: source,
      data: {
        state: LoadingState.NotStarted,
        series: [],
        timeRange: source.state.data?.timeRange ?? getDefaultTimeRange(),
      },
    });

    this.addActivationHandler(() => {
      const sub = this.subscribeToSource();
      return () => sub.unsubscribe();
    });
  }

  private subscribeToSource() {
    const source = this.state.$data!;

    return source.subscribeToState((newState) => {
      if (newState.data) {
        const filteredData = this.filterColumns(newState.data);
        this.setState({ data: filteredData });
      }
    });
  }

  /**
   * Filters columns by hiding Chassis column when the table is empty (no data).
   * When there's actual workflow data, show all columns (respects organize transformation).
   */
  private filterColumns(data: PanelData): PanelData {
    // Don't filter if data is still loading or there's no data series
    if (!data.series || data.series.length === 0 || data.state !== LoadingState.Done) {
      return data;
    }

    const filteredSeries = data.series.map((frame: DataFrame) => {
      // If table has data (rows), show all columns (respects organize transformation)
      if (frame.length > 0) {
        return frame;
      }

      // If table is empty (no data rows), HIDE Chassis column
      const filteredFields = frame.fields.filter(field => {
        return field.name !== 'Chassis';
      });

      return {
        ...frame,
        fields: filteredFields,
      };
    });

    return {
      ...data,
      series: filteredSeries,
    };
  }

  public getResultsStream(): Observable<any> {
    const source = this.state.$data!;
    return source.getResultsStream();
  }
}

// ============================================================================
// DYNAMIC ACTIONS SCENE - Shows all actions in a single table for all selected chassis
// ============================================================================

interface DynamicActionsSceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicActionsScene - Custom scene that reads the ChassisName variable
 * and shows all actions in a single table with conditional chassis column visibility.
 */
class DynamicActionsScene extends SceneObjectBase<DynamicActionsSceneState> {
  public static Component = DynamicActionsSceneRenderer;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicActionsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  // @ts-ignore
  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();

    return () => {
      deactivate();
    };
  }

  private rebuildBody() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Get the ChassisName variable from the scene's variable set
    const variable = this.getVariable('ChassisName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('ChassisName variable not found or not a query variable');
      return;
    }

    // Check for empty state scenarios
    const emptyStateScenario = getEmptyStateScenario(variable);
    if (emptyStateScenario) {
      this.setState({ body: new EmptyStateScene({ scenario: emptyStateScenario, entityType: 'chassis' }) });
      return;
    }

    // Get selected chassis names
    const chassisNames = getSelectedValues(variable);

    // For multiple chassis, show the Chassis column
    const shouldShowChassisColumn = chassisNames.length > 1;

    // Create the actions table with all chassis
    const { body: newBody } = getAllChassisActionsPanel(chassisNames, shouldShowChassisColumn);

    this.setState({ body: newBody });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    // @ts-ignore
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Renderer component for DynamicActionsScene
 */
function DynamicActionsSceneRenderer({ model }: SceneComponentProps<DynamicActionsScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

/**
 * Builds the actions body while reusing an existing query runner
 * Used when we need to update column visibility without recreating queries
 */
function buildActionsBodyWithQueryRunner(
  chassisNames: string[],
  showChassisColumn: boolean,
  queryRunner: LoggingQueryRunner
): SceneFlexLayout {
  const panelTitle = chassisNames.length === 1
    ? `Workflows executed in ${chassisNames[0]}`
    : 'Workflows executed in selected Chassis';

  // Build indexByName configuration - conditionally include Chassis
  const indexByName: any = showChassisColumn
    ? {
        // With Chassis column
        Chassis: 0, // Chassis column first
        Name: 1,
        Email: 2,
        UserId: 3,
        WorkflowStatus: 4,
        Progress: 5,
        CreateTime: 6,
        StartTime: 7,
        EndTime: 8,
        Action: 9,
        AssociatedObject: 10,
        Input: 11,
        PauseReason: 12,
        TaskInfos: 13,
        Type: 14,
        UserActionRequired: 15,
        WaitReason: 16,
        WorkflowDefinition: 17,
        'Initiator Name': 18,
        'Initiator Type': 19,
        Moid: 20,
        TraceId: 21,
        Src: 22,
      }
    : {
        // Without Chassis column
        Name: 0,
        Email: 1,
        UserId: 2,
        WorkflowStatus: 3,
        Progress: 4,
        CreateTime: 5,
        StartTime: 6,
        EndTime: 7,
        Action: 8,
        AssociatedObject: 9,
        Input: 10,
        PauseReason: 11,
        TaskInfos: 12,
        Type: 13,
        UserActionRequired: 14,
        WaitReason: 15,
        WorkflowDefinition: 16,
        'Initiator Name': 17,
        'Initiator Type': 18,
        Moid: 19,
        TraceId: 20,
        Src: 21,
      };

  // Apply transformations: merge queries, organize columns
  const baseTransformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'merge',
        options: {},
      },
      {
        id: 'sortBy',
        options: {
          fields: {},
          sort: [
            {
              field: 'StartTime',
              desc: true,
            },
          ],
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Action: true,
            AssociatedObject: true,
            Input: true,
            PauseReason: true,
            StartTime: true,
            TaskInfos: true,
            Type: true,
            UserActionRequired: true,
            UserId: true,
            WaitReason: true,
            WorkflowDefinition: true,
            Chassis: !showChassisColumn, // Hide Chassis column if not showing
          },
          includeByName: {},
          indexByName: indexByName,
          renameByName: {
            CreateTime: 'Start Time',
            Email: 'User',
            EndTime: 'End Time',
            'Initiator Name': 'Target Name',
            'Initiator Type': 'Target Type',
            Src: 'Service',
            StartTime: '',
            WorkflowStatus: 'Status',
          },
        },
      },
    ],
  });

  // Wrap with custom data provider to hide Chassis column when no data
  const transformedData = new FilterColumnsDataProvider(baseTransformedData);

  // Build the actions table panel
  const actionsPanel = PanelBuilders.table()
    .setTitle(panelTitle)
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm' as any)
    .setOption('enablePagination', true)
    .setOption('sortBy', [{ desc: true, displayName: 'Start Time' }])
    .setNoValue('No workflows executed in the selected time period')
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' as any })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // User field
      builder
        .matchFieldsWithName('User')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              'system@intersight': { color: 'super-light-blue', index: 0 },
            },
          },
          {
            type: 'regex' as any,
            options: {
              pattern: '(.*)',
              result: { color: 'super-light-purple', index: 1, text: '$1' },
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any });

      // Status field
      builder
        .matchFieldsWithName(FIELD_NAMES.STATUS) // 'Status'
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              [WORKFLOW_STATUSES.COMPLETED]: { color: 'green', index: 0, text: WORKFLOW_STATUSES.COMPLETED }, // 'Completed'
              [WORKFLOW_STATUSES.FAILED]: { color: 'red', index: 1, text: WORKFLOW_STATUSES.FAILED }, // 'Failed'
            },
          },
        ])
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' as any })
        .overrideCustomFieldConfig('width', 90);

      // Progress field
      builder
        .matchFieldsWithName('Progress')
        .overrideUnit('percent')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'gauge' as any,
          mode: 'lcd' as any,
          valueDisplayMode: 'text' as any,
        })
        .overrideThresholds({
          mode: 'percentage' as any as any,
          steps: [{ value: 0, color: 'blue' }],
        });

      // Moid field
      builder.matchFieldsWithName('Moid').overrideCustomFieldConfig('width', 100);

      // TraceId field
      builder.matchFieldsWithName('TraceId').overrideCustomFieldConfig('width', 96);

      // Service field
      builder.matchFieldsWithName('Service').overrideCustomFieldConfig('width', 100);

      // Internal field
      builder.matchFieldsWithName('Internal').overrideCustomFieldConfig('width', 85);

      // Target Type field
      builder
        .matchFieldsWithName('Target Type')
        .overrideMappings([
          {
            type: 'value' as any,
            options: {
              'compute.Blade': { index: 2, text: 'Blade Server' },
              'compute.BladeIdentity': { index: 5, text: 'Blade Server Identity' },
              'compute.RackUnitIdentity': { index: 6, text: 'Rack Server Identity' },
              'compute.ServerSetting': { index: 8, text: 'Server Settings' },
              'equipment.ChassisIdentity': { index: 7, text: 'Chassis Identity' },
              'equipment.IoCard': { index: 3, text: 'IO Module' },
              'equipment.SwitchOperation': { index: 9, text: 'Switch Settings' },
              'fabric.SwitchProfile': { index: 0, text: 'Domain Profile' },
              'firmware.Upgrade': { index: 4, text: 'Firmware Upgrade' },
              'server.Profile': { index: 1, text: 'Server Profile' },
            },
          },
        ]);

      // Chassis column
      if (showChassisColumn) {
        builder.matchFieldsWithName('Chassis')
          .overrideCustomFieldConfig('width', 150);
      }

      return builder.build();
    })
    .build();

  // Return layout with the actions panel
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: actionsPanel,
      }),
    ],
  });
}

/**
 * Helper function to create Actions panel for all selected chassis
 * Returns both the layout body and the query runner for data subscription
 */
function getAllChassisActionsPanel(chassisNames: string[], showChassisColumn: boolean): { body: SceneFlexLayout; queryRunner: SceneDataProvider } {
  // Create a query for each chassis
  const queries = chassisNames.map((chassisName, index) => {
    const refId = String.fromCharCode(65 + index); // A, B, C, etc.

    const escapedChassisName = chassisName.replace(/'/g, "''"); // OData escaping: single quote -> double single quote
    const filterClause = `((startswith(WorkflowCtx.TargetCtxList.TargetName, '${escapedChassisName}'))) and ((StartTime ge \${__from:date}) and (StartTime le \${__to:date}) or (EndTime ge \${__from:date}) and (EndTime le \${__to:date}))`;

    const query: any = {
      refId: refId,
      queryType: 'infinity',
      type: 'json',
      source: 'url',
      parser: 'backend',
      format: 'table',
      url: `${API_ENDPOINTS.WORKFLOW_WORKFLOW_INFO}s?$select=Name,Email,WorkflowStatus,Progress,CreateTime,StartTime,EndTime,Moid,TraceId,Src,Internal,WorkflowCtx/InitiatorCtx/InitiatorType&$skip=0&$top=1000&$filter=${filterClause}&$orderby=CreateTime desc`, // '/api/v1/workflow/WorkflowInfo'
      root_selector: '$.Results',
      columns: [
        { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
        { selector: 'Email', text: 'Email', type: 'string' },
        { selector: 'EndTime', text: 'EndTime', type: 'timestamp' },
        { selector: 'Internal', text: 'Internal', type: 'string' },
        { selector: 'Moid', text: 'Moid', type: 'string' },
        { selector: 'Name', text: 'Name', type: 'string' },
        { selector: 'Progress', text: 'Progress', type: 'string' },
        { selector: 'Src', text: 'Src', type: 'string' },
        { selector: 'StartTime', text: 'StartTime', type: 'timestamp' },
        { selector: 'TraceId', text: 'TraceId', type: 'string' },
        { selector: 'WorkflowCtx.InitiatorCtx.InitiatorType', text: 'Initiator Type', type: 'string' },
        { selector: 'WorkflowStatus', text: 'WorkflowStatus', type: 'string' },
      ],
      url_options: {
        method: 'GET',
        data: '',
      },
    };

    // Add computed column for Chassis using the actual chassis name from the loop
    if (showChassisColumn) {
      query.computed_columns = [
        {
          selector: `"${chassisName}"`,
          text: 'Chassis',
          type: 'string',
        },
      ];
    }

    return query;
  });

  // Create query runner for all chassis
  const baseQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: queries,
  });

  // Wrap with pagination support for >1000 results
  const paginatedQueryRunner = new PaginatedDataProvider({
    $data: baseQueryRunner,
  });

  // Build the body using the helper function
  const body = buildActionsBodyWithQueryRunner(chassisNames, showChassisColumn, paginatedQueryRunner as any);

  return { body, queryRunner: paginatedQueryRunner };
}

/**
 * Main export function for the Actions tab.
 * Returns a DynamicActionsScene that shows all actions in a single table.
 */
export function getActionsTab() {
  // Return the dynamic actions scene that shows all actions in a single table
  return new DynamicActionsScene({});
}
