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
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import React from 'react';
import { TabsBar, Tab } from '@grafana/ui';

// ============================================================================
// ACTIONS TAB - Creates tabs dynamically based on ChassisName variable
// ============================================================================

interface DynamicActionsSceneState extends SceneObjectState {
  chassisTabs: Array<{ id: string; label: string; getBody: () => any }>;
  activeTab: string;
  body: any;
}

/**
 * DynamicActionsScene - Custom scene that reads the ChassisName variable
 * and creates a tab for each selected chassis with chassis-specific action panels.
 */
class DynamicActionsScene extends SceneObjectBase<DynamicActionsSceneState> {
  public static Component = DynamicActionsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildTabs();
      }
    },
  });

  public constructor(state: Partial<DynamicActionsSceneState>) {
    super({
      chassisTabs: [],
      activeTab: '',
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildTabs();
  }

  private rebuildTabs() {
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

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let chassisNames: string[] = [];

    if (Array.isArray(value)) {
      chassisNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      chassisNames = [String(value)];
    }

    // If no chassis selected, show a message
    if (chassisNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the Chassis filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({
        chassisTabs: [],
        activeTab: '',
        body: emptyBody,
      });
      return;
    }

    // Create a tab for each chassis
    const newTabs = chassisNames.map((chassisName) => ({
      id: chassisName,
      label: chassisName,
      getBody: () => createChassisActionsBody(chassisName),
    }));

    // Set the active tab to the first tab if not already set or if current tab is not in new tabs
    let newActiveTab = this.state.activeTab;
    if (!newActiveTab || !newTabs.find(t => t.id === newActiveTab)) {
      newActiveTab = newTabs[0]?.id || '';
    }

    // Create the new body
    const newBody = newTabs.find(t => t.id === newActiveTab)?.getBody() || new SceneFlexLayout({ children: [] });

    // Update state - React will handle component lifecycle via key prop
    this.setState({
      chassisTabs: newTabs,
      activeTab: newActiveTab,
      body: newBody,
    });
  }

  public setActiveTab(tabId: string) {
    const tab = this.state.chassisTabs.find((t) => t.id === tabId);
    if (tab) {
      const newBody = tab.getBody();
      if (!newBody) {
        console.warn('getBody returned null/undefined for tab:', tabId);
        return;
      }
      // Just update state - React will handle unmounting via the key prop
      this.setState({ activeTab: tabId, body: newBody });
    }
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Creates the actions layout for a specific chassis
 */
function createChassisActionsBody(chassisName: string) {
  const actionsPanel = getActionsPanelForChassis(chassisName);

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
 * Renderer component for DynamicActionsScene
 */
function DynamicActionsSceneRenderer({ model }: SceneComponentProps<DynamicActionsScene>) {
  const { chassisTabs, activeTab, body } = model.useState();

  // If no tabs, just render the body (which contains the "no selection" message)
  if (chassisTabs.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {body && body.Component && <body.Component key="empty-body" model={body} />}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
        flexShrink: 0
      }}>
        <TabsBar style={{ border: 'none' }}>
          {chassisTabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onChangeTab={() => model.setActiveTab(tab.id)}
            />
          ))}
        </TabsBar>
      </div>
      <div style={{
        flexGrow: 1,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative'
      }}>
        {body && body.Component && <body.Component key={activeTab} model={body} />}
      </div>
    </div>
  );
}

/**
 * Creates the Actions panel for a specific chassis
 * This is panel-62 from the original dashboard
 */
function getActionsPanelForChassis(chassisName: string) {
  // Query for workflow actions filtered by chassis name
  // Note: Using the chassisName parameter directly in the filter since we're creating
  // a panel for each chassis separately
  const queryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/workflow/WorkflowInfos?$skip=0&$top=1000&$filter=((startswith(WorkflowCtx.TargetCtxList.TargetName, '${chassisName}'))) and ((StartTime ge \${__from:date}) and (StartTime le \${__to:date}) or (EndTime ge \${__from:date}) and (EndTime le \${__to:date}))&$orderby=CreateTime desc`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Action', text: 'Action', type: 'string' },
          { selector: 'AssociatedObject', text: 'AssociatedObject', type: 'string' },
          { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
          { selector: 'Email', text: 'Email', type: 'string' },
          { selector: 'EndTime', text: 'EndTime', type: 'timestamp' },
          { selector: 'Input', text: 'Input', type: 'string' },
          { selector: 'Moid', text: 'Moid', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'PauseReason', text: 'PauseReason', type: 'string' },
          { selector: 'Progress', text: 'Progress', type: 'string' },
          { selector: 'Src', text: 'Src', type: 'string' },
          { selector: 'StartTime', text: 'StartTime', type: 'timestamp' },
          { selector: 'TaskInfos', text: 'TaskInfos', type: 'string' },
          { selector: 'TraceId', text: 'TraceId', type: 'string' },
          { selector: 'Type', text: 'Type', type: 'string' },
          { selector: 'UserActionRequired', text: 'UserActionRequired', type: 'string' },
          { selector: 'UserId', text: 'UserId', type: 'string' },
          { selector: 'WaitReason', text: 'WaitReason', type: 'string' },
          { selector: 'WorkflowCtx.InitiatorCtx.InitiatorName', text: 'Initiator Name', type: 'string' },
          { selector: 'WorkflowDefinition.Moid', text: 'WorkflowDefinition', type: 'string' },
          { selector: 'WorkflowStatus', text: 'WorkflowStatus', type: 'string' },
          { selector: 'WorkflowCtx.InitiatorCtx.InitiatorType', text: 'Initiator Type', type: 'string' },
          { selector: 'Internal', text: 'Internal', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  const transformedData = new LoggingDataTransformer({
    $data: queryRunner,
    transformations: [
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
          },
          includeByName: {},
          indexByName: {
            Action: 8,
            AssociatedObject: 9,
            CreateTime: 5,
            Email: 1,
            EndTime: 7,
            'Initiator Name': 17,
            'Initiator Type': 18,
            Input: 10,
            Moid: 19,
            Name: 0,
            PauseReason: 11,
            Progress: 4,
            Src: 21,
            StartTime: 6,
            TaskInfos: 12,
            TraceId: 20,
            Type: 13,
            UserActionRequired: 14,
            UserId: 2,
            WaitReason: 15,
            WorkflowDefinition: 16,
            WorkflowStatus: 3,
          },
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

  return PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setOption('sortBy', [
      {
        displayName: 'Start Time',
        desc: true,
      },
    ])
    .setOverrides((builder) => {
      // User column
      builder.matchFieldsWithName('User')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              'system@intersight': {
                color: 'super-light-blue',
                index: 0,
              },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: {
                color: 'super-light-purple',
                index: 1,
                text: '$1',
              },
            },
          },
        ]);

      // Status column
      builder.matchFieldsWithName('Status')
        .overrideCustomFieldConfig('width', 90)
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              Completed: {
                color: 'green',
                index: 0,
                text: 'Completed',
              },
              Failed: {
                color: 'red',
                index: 1,
                text: 'Failed',
              },
            },
          },
        ]);

      // Progress column
      builder.matchFieldsWithName('Progress')
        .overrideUnit('percent')
        .overrideCustomFieldConfig('cellOptions', {
          type: 'gauge',
          mode: 'lcd',
          valueDisplayMode: 'text',
        })
        .overrideThresholds({
          mode: 'percentage',
          steps: [
            { value: 0, color: 'blue' },
          ],
        });

      // Moid column
      builder.matchFieldsWithName('Moid')
        .overrideCustomFieldConfig('width', 100);

      // TraceId column
      builder.matchFieldsWithName('TraceId')
        .overrideCustomFieldConfig('width', 96);

      // Service column
      builder.matchFieldsWithName('Service')
        .overrideCustomFieldConfig('width', 100);

      // Internal column
      builder.matchFieldsWithName('Internal')
        .overrideCustomFieldConfig('width', 85);

      // Target Type column
      builder.matchFieldsWithName('Target Type')
        .overrideMappings([
          {
            type: 'value',
            options: {
              'compute.Blade': {
                index: 2,
                text: 'Blade Server',
              },
              'compute.BladeIdentity': {
                index: 5,
                text: 'Blade Server Identity',
              },
              'compute.RackUnitIdentity': {
                index: 6,
                text: 'Rack Server Identity',
              },
              'compute.ServerSetting': {
                index: 8,
                text: 'Server Settings',
              },
              'equipment.ChassisIdentity': {
                index: 7,
                text: 'Chassis Identity',
              },
              'equipment.IoCard': {
                index: 3,
                text: 'IO Module',
              },
              'equipment.SwitchOperation': {
                index: 9,
                text: 'Switch Settings',
              },
              'fabric.SwitchProfile': {
                index: 0,
                text: 'Domain Profile',
              },
              'firmware.Upgrade': {
                index: 4,
                text: 'Firmware Upgrade',
              },
              'server.Profile': {
                index: 1,
                text: 'Server Profile',
              },
            },
          },
        ]);
    })
    .build();
}

/**
 * Main export function that returns the Actions tab scene
 */
export function getActionsTab() {
  return new DynamicActionsScene({});
}
