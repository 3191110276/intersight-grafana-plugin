/**
 * Alarms Tab - IMM Domain Scene
 *
 * This module provides the Alarms tab functionality for the IMM Domain scene.
 * Shows all alarms in a single table with conditional domain column visibility.
 */

import React from 'react';
import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneDataTransformer,
  SceneObjectBase,
  SceneComponentProps,
  SceneObjectState,
  VariableDependencyConfig,
  sceneGraph,
} from '@grafana/scenes';

// ============================================================================
// DYNAMIC ALARMS SCENE - Shows all alarms in a single table for all selected domains
// ============================================================================

interface DynamicAlarmsSceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicAlarmsScene - Custom scene that reads the DomainName variable
 * and shows all alarms in a single table with conditional domain column visibility.
 */
class DynamicAlarmsScene extends SceneObjectBase<DynamicAlarmsSceneState> {
  public static Component = DynamicAlarmsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicAlarmsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    super.activate();
    this.rebuildBody();
  }

  private rebuildBody() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Get the DomainName variable from the scene's variable set
    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
      console.warn('DomainName variable not found or not a query variable');
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let domainNames: string[] = [];

    if (Array.isArray(value)) {
      domainNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      domainNames = [String(value)];
    }

    // If no domains selected, show a message
    if (domainNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setOption('content', '### No Domains Selected\n\nPlease select one or more domains from the Domain filter above.')
              .build(),
          }),
        ],
      });

      this.setState({
        body: emptyBody,
      });
      return;
    }

    // Create the alarms table with all domains
    const newBody = createAllDomainsAlarmsBody(domainNames);

    // Update state
    this.setState({
      body: newBody,
    });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Creates the alarms layout showing all domains in a single table
 */
function createAllDomainsAlarmsBody(domainNames: string[]) {
  return getAllDomainsAlarmsPanel(domainNames);
}

/**
 * Renderer component for DynamicAlarmsScene
 */
function DynamicAlarmsSceneRenderer({ model }: SceneComponentProps<DynamicAlarmsScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

/**
 * Helper function to create Alarms panel for all selected domains
 */
function getAllDomainsAlarmsPanel(domainNames: string[]) {
  const showDomainColumn = domainNames.length > 1;

  // Create 4 queries (one per severity) that fetch all domains at once
  // This creates consistent ordering: Critical > Warning > Info > Cleared
  const severities = ['Critical', 'Warning', 'Info', 'Cleared'];
  const queries: any[] = [];

  severities.forEach((severity, index) => {
    // Build filter for all domains with OR logic
    const domainFilters = domainNames.map(name => `startswith(AffectedMoDisplayName, '${name}')`).join(' or ');
    let severityFilterClause;

    if (severity === 'Cleared') {
      // For Cleared, filter by time range
      severityFilterClause = `Severity eq 'Cleared' and ((CreateTime ge \${__from:date}) and (CreateTime le \${__to:date}) or (LastTransitionTime ge \${__from:date}) and (LastTransitionTime le \${__to:date}))`;
    } else {
      // For active alarms (Critical, Warning, Info)
      severityFilterClause = `Severity eq '${severity}'`;
    }

    const filterClause = `(${domainFilters}) and (${severityFilterClause})`;

    queries.push({
      refId: String.fromCharCode(65 + index), // A, B, C, D
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
        // Extract domain name from AffectedMoDisplayName
        { selector: "AffectedMoDisplayName", text: 'Domain', type: 'string' },
      ],
      url_options: {
        method: 'GET',
        data: '',
      },
    });
  });

  // Add queries E and F for Suppressed and Acknowledged stat counts
  const domainFilters = domainNames.map(name => `startswith(AffectedMoDisplayName, '${name}')`).join(' or ');

  // Query E: Suppressed alarms (excluding Cleared)
  queries.push({
    refId: 'E',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: `/api/v1/cond/Alarms?$top=1000&$filter=(${domainFilters}) and (Suppressed eq 'true') and (Severity ne 'Cleared')`,
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
    url_options: {
      method: 'GET',
      data: '',
    },
  });

  // Query F: Acknowledged alarms (excluding Cleared)
  queries.push({
    refId: 'F',
    queryType: 'infinity',
    type: 'json',
    source: 'url',
    parser: 'backend',
    format: 'table',
    url: `/api/v1/cond/Alarms?$top=1000&$filter=(${domainFilters}) and (Acknowledge eq 'Acknowledge') and (Severity ne 'Cleared')`,
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
    url_options: {
      method: 'GET',
      data: '',
    },
  });

  // Create separate query runners for each stat widget
  const criticalQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queries[0]], // A - Critical
  });

  const warningQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queries[1]], // B - Warning
  });

  const infoQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queries[2]], // C - Info
  });

  const clearedQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queries[3]], // D - Cleared
  });

  const suppressedQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queries[4]], // E - Suppressed
  });

  const acknowledgedQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [queries[5]], // F - Acknowledged
  });

  // Query runner for table (uses A-D only)
  const baseQueryRunner = new SceneQueryRunner({
    datasource: { uid: '${Account}' },
    queries: queries.slice(0, 4), // Only A-D for table
  });

  // Apply transformations: merge queries, organize columns and format time
  const transformedData = new SceneDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      {
        id: 'merge',
        options: {},
      },
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
            Domain: !showDomainColumn, // Hide Domain column if only one domain selected
          },
          includeByName: {},
          indexByName: {
            Acknowledge: 12,
            AcknowledgeBy: 13,
            AcknowledgeTime: 14,
            Acknowledged: 11,
            AffectedMo: 15,
            AffectedMoDisplayName: 16,
            AffectedMoType: 17,
            AlarmSummaryAggregators: 18,
            AncestorMoType: 19,
            Code: 2,
            CreateTime: 20,
            Definition: 6,
            Description: 5,
            Domain: 0, // Domain column first
            Flap: 8,
            Flapping: 7,
            FlappingCount: 9,
            LastTransitionTime: 24,
            MsAffectedObject: 21,
            Name: 1,
            OrigSeverity: 4,
            Owners: 22,
            RegisteredDevice: 23,
            Severity: 3,
            Suppressed: 10,
          },
          renameByName: {
            AncestorMoType: 'Type',
            LastTransitionTime: 'Last Transition',
          },
        },
      },
      {
        id: 'convertFieldType',
        options: {
          conversions: [
            {
              destinationType: 'time',
              targetField: 'Last Transition',
            },
          ],
          fields: {},
        },
      },
      {
        id: 'formatTime',
        options: {
          timeField: 'Last Transition',
          outputFormat: 'YYYY-MM-DD HH:mm',
          useTimezone: true,
        },
      },
    ],
  });

  // Build stat panels for alarm counts with transformers
  // Critical stat (Query A)
  const criticalTransformedData = new SceneDataTransformer({
    $data: criticalQueryRunner,
    transformations: [
      {
        id: 'reduce',
        options: {
          reducers: ['count'],
        },
      },
    ],
  });

  const criticalStat = PanelBuilders.stat()
    .setTitle('Critical')
    .setMenu(undefined)
    .setData(criticalTransformedData)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 1, color: '#8f0000' },
          ],
        });
      return builder.build();
    })
    .build();

  // Warning stat (Query B)
  const warningTransformedData = new SceneDataTransformer({
    $data: warningQueryRunner,
    transformations: [
      {
        id: 'reduce',
        options: {
          reducers: ['count'],
        },
      },
    ],
  });

  const warningStat = PanelBuilders.stat()
    .setTitle('Warning')
    .setMenu(undefined)
    .setData(warningTransformedData)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 1, color: '#d6ba02' },
          ],
        });
      return builder.build();
    })
    .build();

  // Info stat (Query C)
  const infoTransformedData = new SceneDataTransformer({
    $data: infoQueryRunner,
    transformations: [
      {
        id: 'reduce',
        options: {
          reducers: ['count'],
        },
      },
    ],
  });

  const infoStat = PanelBuilders.stat()
    .setTitle('Info')
    .setMenu(undefined)
    .setData(infoTransformedData)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 1, color: '#0262c2' },
          ],
        });
      return builder.build();
    })
    .build();

  // Cleared stat (Query D)
  const clearedTransformedData = new SceneDataTransformer({
    $data: clearedQueryRunner,
    transformations: [
      {
        id: 'reduce',
        options: {
          reducers: ['count'],
        },
      },
    ],
  });

  const clearedStat = PanelBuilders.stat()
    .setTitle('Cleared')
    .setMenu(undefined)
    .setData(clearedTransformedData)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 1, color: '#018524' },
          ],
        });
      return builder.build();
    })
    .build();

  // Suppressed stat (Query E)
  const suppressedTransformedData = new SceneDataTransformer({
    $data: suppressedQueryRunner,
    transformations: [
      {
        id: 'reduce',
        options: {
          reducers: ['count'],
        },
      },
    ],
  });

  const suppressedStat = PanelBuilders.stat()
    .setTitle('Suppressed')
    .setMenu(undefined)
    .setData(suppressedTransformedData)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 1, color: 'dark-gray' },
          ],
        });
      return builder.build();
    })
    .build();

  // Acknowledged stat (Query F)
  const acknowledgedTransformedData = new SceneDataTransformer({
    $data: acknowledgedQueryRunner,
    transformations: [
      {
        id: 'reduce',
        options: {
          reducers: ['count'],
        },
      },
    ],
  });

  const acknowledgedStat = PanelBuilders.stat()
    .setTitle('Acknowledged')
    .setMenu(undefined)
    .setData(acknowledgedTransformedData)
    .setOption('graphMode', 'none')
    .setOption('textMode', 'value')
    .setOption('colorMode', 'background')
    .setOption('orientation', 'vertical')
    .setOption('textSize', {
      title: 14,
      value: 32,
    })
    .setOption('showThresholdLabels', false)
    .setOption('showThresholdMarkers', false)
    .setOverrides((builder) => {
      builder.matchFieldsWithNameByRegex('.*')
        .overrideCustomFieldConfig('noValue', '0')
        .overrideColor({
          mode: 'thresholds',
        })
        .overrideThresholds({
          mode: 'absolute',
          steps: [
            { value: null as any, color: '#181b1f' },
            { value: 1, color: 'dark-gray' },
          ],
        });
      return builder.build();
    })
    .build();

  // Build the alarms table panel
  const alarmsPanel = PanelBuilders.table()
    .setTitle('Alarms from all selected Domains')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    // No sortBy needed - data is pre-sorted by query order: Critical > Warning > Info > Cleared, then by Last Transition within each group
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Severity column - color-coded text
      builder.matchFieldsWithName('Severity')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
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

      // Flapping column
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

      // Suppressed column
      builder.matchFieldsWithName('Suppressed')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideCustomFieldConfig('width', 115)
        .overrideMappings([
          {
            type: 'value',
            options: {
              false: { color: 'text', index: 0, text: 'No' },
              true: { color: 'blue', index: 1, text: 'Yes' },
            },
          },
        ]);

      // Acknowledged column
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

      // Type column
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

      // Last Transition column
      builder.matchFieldsWithName('Last Transition')
        .overrideCustomFieldConfig('width', 165);

      // Code column
      builder.matchFieldsWithName('Code')
        .overrideCustomFieldConfig('width', 260);

      // Domain column
      if (showDomainColumn) {
        builder.matchFieldsWithName('Domain')
          .overrideCustomFieldConfig('width', 150);
      }

      return builder.build();
    })
    .build();

  // Return layout with stats row + table
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      // Stats row
      new SceneFlexItem({
        height: 100,
        ySizing: 'content',
        body: new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({ body: criticalStat }),
            new SceneFlexItem({ body: warningStat }),
            new SceneFlexItem({ body: infoStat }),
            new SceneFlexItem({ body: clearedStat }),
            new SceneFlexItem({ body: suppressedStat }),
            new SceneFlexItem({ body: acknowledgedStat }),
          ],
        }),
      }),
      // Table
      new SceneFlexItem({
        minHeight: 400,
        ySizing: 'fill',
        body: alarmsPanel,
      }),
    ],
  });
}

/**
 * Main export function for the Alarms tab.
 * Returns a DynamicAlarmsScene that shows all alarms in a single table.
 */
export function getAlarmsTab() {
  // Return the dynamic alarms scene that shows all alarms in a single table
  return new DynamicAlarmsScene({});
}
