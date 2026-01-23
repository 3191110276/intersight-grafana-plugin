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
// DYNAMIC ALARMS SCENE - Creates tabs dynamically based on ChassisName variable
// ============================================================================

interface DynamicAlarmsSceneState extends SceneObjectState {
  chassisTabs: Array<{ id: string; label: string; getBody: () => any }>;
  activeTab: string;
  body: any;
}

/**
 * DynamicAlarmsScene - Custom scene that reads the ChassisName variable
 * and creates a tab for each selected chassis with chassis-specific alarm panels.
 */
class DynamicAlarmsScene extends SceneObjectBase<DynamicAlarmsSceneState> {
  public static Component = DynamicAlarmsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildTabs();
      }
    },
  });

  constructor(state?: Partial<DynamicAlarmsSceneState>) {
    super({
      chassisTabs: [],
      activeTab: '',
      body: createEmptyBody(),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildTabs();
  }

  private rebuildTabs() {
    const variable = this.getVariable('ChassisName');
    if (!variable) {
      console.warn('ChassisName variable not found');
      this.setState({ chassisTabs: [], activeTab: '', body: createEmptyBody() });
      return;
    }

    const selectedValues = variable.getValueText ? variable.getValueText() : '';

    // Handle "All" or no selection
    if (!selectedValues || selectedValues === 'All' || selectedValues.length === 0) {
      this.setState({ chassisTabs: [], activeTab: '', body: createEmptyBody() });
      return;
    }

    // Parse selected values (could be comma-separated)
    const chassisNames = typeof selectedValues === 'string'
      ? selectedValues.split(',').map((d: string) => d.trim()).filter((d: string) => d && d !== 'All')
      : [];

    if (chassisNames.length === 0) {
      this.setState({ chassisTabs: [], activeTab: '', body: createEmptyBody() });
      return;
    }

    // Create tabs for each selected chassis
    const newTabs = chassisNames.map((chassisName: string) => ({
      id: chassisName,
      label: chassisName,
      getBody: () => createChassisAlarmsBody(chassisName),
    }));

    // Determine active tab (keep current if still valid, otherwise use first tab)
    const currentActiveTab = this.state.activeTab;
    const newActiveTab = newTabs.some((t: any) => t.id === currentActiveTab)
      ? currentActiveTab
      : newTabs[0].id;

    const activeTabObj = newTabs.find((t: any) => t.id === newActiveTab);
    const newBody = activeTabObj ? activeTabObj.getBody() : createEmptyBody();

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
 * Creates the alarms layout for a specific chassis
 */
function createChassisAlarmsBody(chassisName: string) {
  return getAlarmsPanelForChassis(chassisName);
}

/**
 * Creates an empty body to show when no chassis is selected
 */
function createEmptyBody() {
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        height: 300,
        body: PanelBuilders.text()
          .setTitle('')
          .setOption('content', '### No Chassis Selected\n\nPlease select one or more chassis from the ChassisName variable dropdown above.')
          .setOption('mode', 'markdown' as any)
          .build(),
      }),
    ],
  });
}

/**
 * Renderer component for DynamicAlarmsScene
 */
function DynamicAlarmsSceneRenderer({ model }: SceneComponentProps<DynamicAlarmsScene>) {
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
        flexShrink: 0,
        minHeight: '48px',
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

// ============================================================================
// ALARMS PANEL (panel-63) - Table showing alarms for a specific chassis
// ============================================================================

function getAlarmsPanelForChassis(chassisName: string) {
  // Build the filter clause with the actual chassis name
  // Query exactly as it appears in original dashboard panel-63
  const filterClause = `((startswith(AffectedMoDisplayName, '${chassisName}'))) and ((Severity ne 'Cleared') or (Severity eq 'Cleared' and ((CreateTime ge \${__from:date}) and (CreateTime le \${__to:date}) or (LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))))`;

  // Create query runner for Alarms
  const baseQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: `/api/v1/cond/Alarms?$top=1000&$expand=RegisteredDevice($select=PlatformType,DeviceHostname,ParentConnection,Pid)&$filter=${filterClause}&$orderby=LastTransitionTime desc`,
        root_selector: '$.Results',
        columns: [
          { selector: 'Acknowledge', text: 'Acknowledge', type: 'string' },
          { selector: 'AcknowledgeBy', text: 'AcknowledgeBy', type: 'string' },
          { selector: 'AcknowledgeTime', text: 'AcknowledgeTime', type: 'string' },
          { selector: 'AffectedMo', text: 'AffectedMo', type: 'string' },
          { selector: 'AffectedMoDisplayName', text: 'AffectedMoDisplayName', type: 'string' },
          { selector: 'AffectedMoType', text: 'AffectedMoType', type: 'string' },
          { selector: 'AlarmSummaryAggregators', text: 'AlarmSummaryAggregators', type: 'string' },
          { selector: 'AncestorMoType', text: 'AncestorMoType', type: 'string' },
          { selector: 'Code', text: 'Code', type: 'string' },
          { selector: 'CreateTime', text: 'CreateTime', type: 'timestamp' },
          { selector: 'Definition', text: 'Definition', type: 'string' },
          { selector: 'Description', text: 'Description', type: 'string' },
          { selector: 'Flapping', text: 'Flap', type: 'string' },
          { selector: 'FlappingCount', text: 'FlappingCount', type: 'string' },
          { selector: 'MsAffectedObject', text: 'MsAffectedObject', type: 'string' },
          { selector: 'Name', text: 'Name', type: 'string' },
          { selector: 'OrigSeverity', text: 'OrigSeverity', type: 'string' },
          { selector: 'Owners', text: 'Owners', type: 'string' },
          { selector: 'RegisteredDevice', text: 'RegisteredDevice', type: 'string' },
          { selector: 'Severity', text: 'Severity', type: 'string' },
          { selector: 'Suppressed', text: 'Suppressed', type: 'string' },
          { selector: 'LastTransitionTime', text: 'LastTransitionTime', type: 'timestamp' },
        ],
        computed_columns: [
          { selector: "Acknowledge + ' (' + AcknowledgeBy + ')'", text: 'Acknowledged', type: 'string' },
          { selector: "Flap + ' (' + FlappingCount + ')'", text: 'Flapping', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  // Apply transformations
  const transformedData = new LoggingDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      {
        id: 'organize',
        options: {
          excludeByName: {
            Acknowledge: true,
            AcknowledgeBy: true,
            AcknowledgeTime: true,
            AffectedMo: true,
            AffectedMoDisplayName: true,
            AffectedMoType: true,
            AlarmSummaryAggregators: true,
            CreateTime: true,
            Definition: true,
            Flap: true,
            FlappingCount: true,
            MsAffectedObject: true,
            Name: true,
            OrigSeverity: true,
            Owners: true,
            RegisteredDevice: true,
          },
          includeByName: {},
          indexByName: {
            Acknowledge: 11,
            AcknowledgeBy: 12,
            AcknowledgeTime: 13,
            Acknowledged: 10,
            AffectedMo: 14,
            AffectedMoDisplayName: 15,
            AffectedMoType: 16,
            AlarmSummaryAggregators: 17,
            AncestorMoType: 18,
            Code: 1,
            CreateTime: 19,
            Definition: 5,
            Description: 4,
            Flap: 7,
            Flapping: 6,
            FlappingCount: 8,
            LastTransitionTime: 23,
            MsAffectedObject: 20,
            Name: 0,
            OrigSeverity: 3,
            Owners: 21,
            RegisteredDevice: 22,
            Severity: 2,
            Suppressed: 9,
          },
          renameByName: {
            AncestorMoType: 'Type',
            LastTransitionTime: 'Last Transition',
          },
        },
      },
      {
        id: 'formatTime',
        options: {
          outputFormat: 'YYYY-MM-DD HH:mm',
          timeField: 'Last Transition',
          useTimezone: true,
        },
      },
    ],
  });

  // Build table panel with overrides
  return PanelBuilders.table()
    .setTitle('')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setOption('sortBy', [
      { desc: true, displayName: 'Last Transition' },
      { desc: true, displayName: 'Severity' },
    ])
    .setOverrides((builder) => {
      // Severity column - color-text with mappings
      builder.matchFieldsWithName('Severity')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              Critical: { color: 'red', index: 0 },
              Warning: { color: 'orange', index: 1 },
              Info: { color: 'super-light-yellow', index: 2 },
              Cleared: { color: 'green', index: 3 },
            },
          },
        ]);

      // Flapping column - mappings for NotFlapping and regex
      builder.matchFieldsWithName('Flapping')
        .overrideCustomFieldConfig('width', 110)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'NotFlapping (0)': { index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: '(.*)',
              result: { color: 'red', index: 1, text: '$1' },
            },
          },
        ]);

      // Suppressed column - boolean mappings with color-text
      builder.matchFieldsWithName('Suppressed')
        .overrideCustomFieldConfig('width', 115)
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: 'text', index: 0, text: 'No' },
              true: { color: 'blue', index: 1, text: 'Yes' },
            },
          },
        ]);

      // Acknowledged column - mappings for None and regex
      builder.matchFieldsWithName('Acknowledged')
        .overrideCustomFieldConfig('width', 140)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'None ()': { color: 'text', index: 0, text: 'No' },
            },
          },
          {
            type: 'regex',
            options: {
              pattern: 'Acknowledge(.*)',
              result: { color: 'blue', index: 1, text: 'Yes$1' },
            },
          },
        ]);

      // Type column - mappings for MO types
      builder.matchFieldsWithName('Type')
        .overrideCustomFieldConfig('width', 100)
        .overrideMappings([
          {
            type: 'value',
            options: {
              'compute.Blade': { index: 0, text: 'Blade' },
              'compute.RackUnit': { index: 1, text: 'Rack Server' },
              'network.Element': { index: 2, text: 'FI' },
              'equipment.Chassis': { index: 3, text: 'Chassis' },
              'asset.Target': { index: 4, text: 'Target' },
            },
          },
        ]);

      // Last Transition column - width
      builder.matchFieldsWithName('Last Transition')
        .overrideCustomFieldConfig('width', 165);

      // Code column - width
      builder.matchFieldsWithName('Code')
        .overrideCustomFieldConfig('width', 260);
    })
    .build();
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function getAlarmsTab() {
  // Return the dynamic alarms scene that creates tabs based on ChassisName variable selection
  return new DynamicAlarmsScene({});
}
