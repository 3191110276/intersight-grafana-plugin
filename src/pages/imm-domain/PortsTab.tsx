/**
 * Ports Tab - IMM Domain Scene
 *
 * This module provides the Ports tab functionality for the IMM Domain scene.
 * Creates tabs dynamically based on DomainName variable selection, showing
 * port information for each fabric interconnect.
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
} from '@grafana/scenes';
import { LoggingQueryRunner } from '../../utils/LoggingQueryRunner';
import { LoggingDataTransformer } from '../../utils/LoggingDataTransformer';
import { TabsBar, Tab } from '@grafana/ui';

// ============================================================================
// DYNAMIC PORTS SCENE - Creates tabs dynamically based on DomainName variable
// ============================================================================

interface DynamicPortsSceneState extends SceneObjectState {
  domainTabs: Array<{ id: string; label: string; getBody: () => any }>;
  activeTab: string;
  body: any;
}

/**
 * DynamicPortsScene - Custom scene that reads the DomainName variable
 * and creates a tab for each selected domain with domain-specific port panels.
 */
class DynamicPortsScene extends SceneObjectBase<DynamicPortsSceneState> {
  public static Component = DynamicPortsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['DomainName'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildTabs();
      }
    },
  });

  public constructor(state: Partial<DynamicPortsSceneState>) {
    super({
      domainTabs: [],
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

    // Get the DomainName variable from the scene's variable set
    const variable = this.getVariable('DomainName');

    if (!variable || variable.state.type !== 'query') {
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
              .setTitle('')
              .setOption('content', '### No Domains Selected\n\nPlease select one or more domains from the Domain filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({
        domainTabs: [],
        activeTab: '',
        body: emptyBody,
      });
      return;
    }

    // If only 1 domain, show table directly without tabs
    if (domainNames.length === 1) {
      const singleDomainBody = createDomainPortsBody(domainNames[0]);

      this.setState({
        domainTabs: [],
        activeTab: '',
        body: singleDomainBody,
      });
      return;
    }

    // Create a tab for each domain
    const newTabs = domainNames.map((domainName) => ({
      id: domainName,
      label: domainName,
      getBody: () => createDomainPortsBody(domainName),
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
      domainTabs: newTabs,
      activeTab: newActiveTab,
      body: newBody,
    });
  }

  public setActiveTab(tabId: string) {
    const tab = this.state.domainTabs.find((t) => t.id === tabId);
    if (tab) {
      const newBody = tab.getBody();
      if (!newBody) {
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
 * Creates the ports layout for a specific domain
 */
function createDomainPortsBody(domainName: string) {
  const portsPanel = getPortsPanelForDomain(domainName);

  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        ySizing: 'fill',
        body: portsPanel,
      }),
    ],
  });
}

/**
 * Renderer component for DynamicPortsScene
 */
function DynamicPortsSceneRenderer({ model }: SceneComponentProps<DynamicPortsScene>) {
  const { domainTabs, activeTab, body } = model.useState();

  // If no tabs, just render the body (which contains the "no selection" message)
  if (domainTabs.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {body && body.Component && <body.Component model={body} />}
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
          {domainTabs.map((tab) => (
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
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {body && body.Component && <body.Component model={body} />}
      </div>
    </div>
  );
}

/**
 * Helper function to create Ports panel for a specific domain
 */
function getPortsPanelForDomain(domainName: string) {
  const baseQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      // Query A: FI-A Ports
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '$.event',
        columns: [
          { selector: 'port', text: 'port', type: 'string' },
          { selector: 'link_status', text: 'a_link_status', type: 'number' },
          { selector: 'link_speed', text: 'a_link_speed', type: 'number' },
          { selector: 'port_role', text: 'a_port_role', type: 'string' },
          { selector: 'physical_address', text: 'a_physical_address', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "host_name",
      "port",
      "state"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.state",
      "outputName": "state",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "port",
      "expression": "regexp_replace(name,'Ethernet1/|fc1/','')",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "selector",
          "dimension": "intersight.domain.name",
          "value": "${domainName}"
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-A"
          }
        },
        {
          "type": "or",
          "fields": [
            {
              "type": "in",
              "dimension": "hw.network.port.role",
              "values": [
                "appliance",
                "eth_uplink",
                "server",
                "fcoe_uplink",
                "fcoe_storage",
                "fc_uplink",
                "fc_storage",
                "eth_monitor",
                "fc_monitor"
              ]
            },
            {
              "type": "selector",
              "dimension": "hw.network.port.role",
              "value": "unconfigured"
            }
          ]
        },
        {
          "type": "in",
          "dimension": "hw.network.port.type",
          "values": [
            "ethernet",
            "fibre_channel"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longLast",
        "name": "link_status",
        "fieldName": "hw.network.up"
      },
      {
        "type": "longLast",
        "name": "link_speed",
        "fieldName": "hw.network.bandwidth.limit"
      },
      {
        "type" : "stringLast",
        "name" : "port_role",
        "fieldName" : "port_role"
      },
      {
        "type" : "stringLast",
        "name" : "physical_address",
        "fieldName" : "physical_address"
      }
    ]
  }`,
        },
      } as any,
      // Query B: FI-B Ports
      {
        refId: 'B',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/telemetry/TimeSeries',
        root_selector: '$.event',
        columns: [
          { selector: 'port', text: 'port', type: 'string' },
          { selector: 'link_status', text: 'b_link_status', type: 'number' },
          { selector: 'link_speed', text: 'b_link_speed', type: 'number' },
          { selector: 'port_role', text: 'b_port_role', type: 'string' },
          { selector: 'physical_address', text: 'b_physical_address', type: 'string' },
        ],
        url_options: {
          method: 'POST',
          body_type: 'raw',
          body_content_type: 'application/json',
          data: `  {
    "queryType": "groupBy",
    "dataSource": "NetworkInterfaces",
    "granularity": "all",
    "intervals": ["\${__from:date}/\${__to:date}"],
    "dimensions": [
      "host_name",
      "port",
      "state"
    ],
    "virtualColumns": [{
      "type": "nested-field",
      "columnName": "host.name",
      "outputName": "host_name",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.port.role",
      "outputName": "port_role",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "nested-field",
      "columnName": "hw.network.state",
      "outputName": "state",
      "expectedType": "STRING",
      "path": "$"
    },{
      "type": "expression",
      "name": "port",
      "expression": "regexp_replace(name,'Ethernet1/|fc1/','')",
      "outputType": "STRING"
    }],
    "filter": {
      "type": "and",
      "fields": [
        {
          "type": "selector",
          "dimension": "intersight.domain.name",
          "value": "${domainName}"
        },
        {
          "type": "search",
          "dimension": "host.name",
          "query": {
            "type": "insensitive_contains",
            "value": " FI-B"
          }
        },
        {
          "type": "or",
          "fields": [
            {
              "type": "in",
              "dimension": "hw.network.port.role",
              "values": [
                "appliance",
                "eth_uplink",
                "server",
                "fcoe_uplink",
                "fcoe_storage",
                "fc_uplink",
                "fc_storage",
                "eth_monitor",
                "fc_monitor"
              ]
            },
            {
              "type": "selector",
              "dimension": "hw.network.port.role",
              "value": "unconfigured"
            }
          ]
        },
        {
          "type": "in",
          "dimension": "hw.network.port.type",
          "values": [
            "ethernet",
            "fibre_channel"
          ]
        },
        {
          "type": "selector",
          "dimension": "instrument.name",
          "value": "hw.network"
        }
      ]
    },
    "aggregations": [
      {
        "type": "longLast",
        "name": "link_status",
        "fieldName": "hw.network.up"
      },
      {
        "type": "longLast",
        "name": "link_speed",
        "fieldName": "hw.network.bandwidth.limit"
      },
      {
        "type" : "stringLast",
        "name" : "port_role",
        "fieldName" : "port_role"
      },
      {
        "type" : "stringLast",
        "name" : "physical_address",
        "fieldName" : "physical_address"
      }
    ]
  }`,
        },
      } as any,
    ],
  });

  // Using transformations to merge FI-A and FI-B data and create computed columns
  const queryRunner = new LoggingDataTransformer({
    $data: baseQueryRunner,
    transformations: [
      // Transformation 1: Join Query A and Query B by port field
      {
        id: 'joinByField',
        options: {
          byField: 'port',
          mode: 'outer',
        },
      },
      // Transformation 2: Calculate a_link_speed_8 (a_link_speed * 8)
      {
        id: 'calculateField',
        options: {
          mode: 'binary',
          alias: 'a_link_speed_8',
          binary: {
            left: { matcher: { id: 'byName', options: 'a_link_speed' } },
            operator: '*',
            right: { fixed: '8' },
          },
          reduce: {
            reducer: 'sum',
          },
        },
      },
      // Transformation 3: Calculate b_link_speed_8 (b_link_speed * 8)
      {
        id: 'calculateField',
        options: {
          mode: 'binary',
          alias: 'b_link_speed_8',
          binary: {
            left: { matcher: { id: 'byName', options: 'b_link_speed' } },
            operator: '*',
            right: { fixed: '8' },
          },
          reduce: {
            reducer: 'sum',
          },
        },
      },
      // Transformation 4: Create role_sync field by concatenating a_port_role and b_port_role
      {
        id: 'calculateField',
        options: {
          mode: 'binary',
          alias: 'role_sync',
          binary: {
            left: { matcher: { id: 'byName', options: 'a_port_role' } },
            operator: '+',
            right: { field: 'b_port_role' },
          },
          reduce: {
            reducer: 'sum',
          },
          replaceFields: false,
        },
      },
      // Transformation 5: Create link_status fields with port_role prefix for proper status display
      {
        id: 'calculateField',
        options: {
          mode: 'binary',
          alias: 'a_link_status_combined',
          binary: {
            left: { matcher: { id: 'byName', options: 'a_port_role' } },
            operator: '+',
            right: { field: 'a_link_status' },
          },
          reduce: {
            reducer: 'sum',
          },
          replaceFields: false,
        },
      },
      // Transformation 6: Create b_link_status combined field
      {
        id: 'calculateField',
        options: {
          mode: 'binary',
          alias: 'b_link_status_combined',
          binary: {
            left: { matcher: { id: 'byName', options: 'b_port_role' } },
            operator: '+',
            right: { field: 'b_link_status' },
          },
          reduce: {
            reducer: 'sum',
          },
          replaceFields: false,
        },
      },
      // Transformation 7: Final organization and renaming
      {
        id: 'organize',
        options: {
          excludeByName: {
            'a_link_speed': true,
            'b_link_speed': true,
            'a_link_status': true,
            'b_link_status': true,
          },
          includeByName: {},
          indexByName: {
            'port': 0,
            'role_sync': 1,
            'a_port_role': 2,
            'b_port_role': 3,
            'a_link_status_combined': 4,
            'b_link_status_combined': 5,
            'a_link_speed_8': 6,
            'b_link_speed_8': 7,
            'a_physical_address': 8,
            'b_physical_address': 9,
          },
          renameByName: {
            'a_link_speed_8': 'Link Speed - A',
            'a_link_status_combined': 'Link Status - A',
            'a_physical_address': 'MAC - A',
            'a_port_role': 'Port Role - A',
            'b_link_speed_8': 'Link Speed - B',
            'b_link_status_combined': 'Link Status - B',
            'b_physical_address': 'MAC - B',
            'b_port_role': 'Port Role - B',
            'port': 'Port',
            'role_sync': 'Role Sync',
          },
        },
      },
    ],
  });

  // Create table panel with field overrides
  const tablePanel = PanelBuilders.table()
    .setTitle(`Fabric Interconnect ports of ${domainName}`)
    .setData(queryRunner)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('sortBy', [{ displayName: 'Port', desc: false }])
    .setColor({ mode: 'thresholds' })
    .setThresholds({
      mode: 'percentage',
      steps: [
        { color: 'dark-red', value: 0 },
      ],
    })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Port column
      builder.matchFieldsWithName('Port')
        .overrideCustomFieldConfig('width', 85);

      // Port Role columns (A and B)
      builder.matchFieldsWithNameByRegex('/Port Role.*/')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              'unconfigured': { color: '#787878', index: 0, text: 'Unconfigured' },
              'server': { color: '#ffd700', index: 1, text: 'Server' },
              'eth_uplink': { color: '#1e90ff', index: 2, text: 'Ethernet Uplink' },
              'appliance': { color: '#00ffff', index: 3, text: 'Appliance' },
              'fcoe_uplink': { color: '#006400', index: 4, text: 'FCoE Uplink' },
              'fcoe_storage': { color: '#00ff00', index: 5, text: 'FCoE Storage' },
              'fc_uplink': { color: '#ff0000', index: 6, text: 'FC Uplink' },
              'fc_storage': { color: '#bc8f8f', index: 7, text: 'FC Storage' },
              'eth_monitor': { color: '#a020f0', index: 8, text: 'Ethernet SPAN' },
              'fc_monitor': { color: '#ff1493', index: 9, text: 'FC SPAN' },
            },
          },
        ]);

      // Link Status columns
      builder.matchFieldsWithNameByRegex('/Link Status.*/')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          { type: 'value', options: { 'unconfigured0': { color: '#7c0614', index: 0, text: 'Inactive' } } },
          { type: 'regex', options: { pattern: '.*1', result: { color: 'semi-dark-green', index: 1, text: 'Active' } } },
          { type: 'regex', options: { pattern: '.*0', result: { color: 'red', index: 2, text: 'Inactive' } } },
        ]);

      // Link Speed columns
      builder.matchFieldsWithNameByRegex('/Link Speed.*/')
        .overrideUnit('bps')
        .overrideMappings([
          { type: 'value', options: { '0': { index: 0, text: '-' } } },
        ]);

      // MAC columns
      builder.matchFieldsWithNameByRegex('/MAC.*/')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          { type: 'special', options: { match: 'null', result: { color: '#787878', index: 0, text: 'Fibre Channel' } } },
          { type: 'regex', options: { pattern: '.*', result: { color: 'text', index: 1 } } },
        ]);

      // Role Sync column
      builder.matchFieldsWithName('Role Sync')
        .overrideCustomFieldConfig('width', 105)
        .overrideCustomFieldConfig('align', 'center')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              'unconfigured/unconfigured': { color: 'text', index: 0, text: '⚪️' },
              'server/server': { index: 1, text: '🟢' },
              'eth_uplink/eth_uplink': { index: 2, text: '🟢' },
              'appliance/appliance': { index: 3, text: '🟢' },
              'fcoe_uplink/fcoe_uplink': { index: 4, text: '🟢' },
              'fcoe_storage/fcoe_storage': { index: 5, text: '🟢' },
              'fc_uplink/fc_uplink': { index: 6, text: '🟢' },
              'fc_storage/fc_storage': { index: 7, text: '🟢' },
              'eth_monitor/eth_monitor': { index: 8, text: '🟢' },
              'fc_monitor/fc_monitor': { index: 9, text: '🟢' },
            },
          },
          { type: 'regex', options: { pattern: '(.*)', result: { index: 10, text: '🔴' } } },
        ]);
    })
    .build();

  return tablePanel;
}

/**
 * Main export function for the Ports tab.
 * Returns a DynamicPortsScene that creates tabs based on DomainName variable selection.
 */
export function getPortsTab() {
  // Return the dynamic ports scene that creates tabs based on DomainName variable selection
  return new DynamicPortsScene({});
}
