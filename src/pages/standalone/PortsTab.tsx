/**
 * Ports Tab - Standalone Scene
 *
 * This module provides the Ports tab functionality for the Standalone scene.
 * Shows all network ports (Ethernet and Fibre Channel) in a single table.
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

// ============================================================================
// DYNAMIC PORTS SCENE - Shows all ports in a single table for all selected servers
// ============================================================================

interface DynamicPortsSceneState extends SceneObjectState {
  body: any;
}

/**
 * DynamicPortsScene - Custom scene that reads the ServerName variable
 * and shows all ports in a single table.
 */
class DynamicPortsScene extends SceneObjectBase<DynamicPortsSceneState> {
  public static Component = DynamicPortsSceneRenderer;
  private _dataSubscription?: () => void;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ServerName', 'RegisteredDevices'],
    onReferencedVariableValueChanged: () => {
      // Only rebuild if the scene is still active
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicPortsSceneState>) {
    super({
      body: new SceneFlexLayout({ children: [] }),
      ...state,
    });
  }

  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();

    return () => {
      // Unsubscribe from data changes
      if (this._dataSubscription) {
        this._dataSubscription();
        this._dataSubscription = undefined;
      }
      deactivate();
    };
  }

  private rebuildBody() {
    // Skip if scene is not active (prevents race conditions during deactivation)
    if (!this.isActive) {
      return;
    }

    // Unsubscribe from previous data subscription
    if (this._dataSubscription) {
      this._dataSubscription();
      this._dataSubscription = undefined;
    }

    // Get the ServerName variable from the scene's variable set
    const variable = this.getVariable('ServerName');

    if (!variable || variable.state.type !== 'query') {
      return;
    }

    // Get the current value(s) from the variable
    const value = variable.state.value;
    let serverNames: string[] = [];

    if (Array.isArray(value)) {
      serverNames = value.map(v => String(v));
    } else if (value && value !== '$__all') {
      serverNames = [String(value)];
    }

    // If no servers selected, show a message
    if (serverNames.length === 0) {
      const emptyBody = new SceneFlexLayout({
        direction: 'column',
        children: [
          new SceneFlexItem({
            height: 200,
            body: PanelBuilders.text()
              .setTitle('')
              .setOption('content', '### No Servers Selected\n\nPlease select one or more servers from the Server filter above.')
              .setOption('mode', 'markdown' as any)
              .setDisplayMode('transparent')
              .build(),
          }),
        ],
      });

      this.setState({ body: emptyBody });
      return;
    }

    // APPROACH B: Extract Moid values from RegisteredDevices variable
    // Access the variable's query results directly, not the selected value
    const registeredDevicesVariable = sceneGraph.lookupVariable('RegisteredDevices', this);
    let moidFilter: string | undefined = undefined;

    if (registeredDevicesVariable && 'state' in registeredDevicesVariable) {
      let moids: string[] = [];

      // Access the variable's options (all query results)
      const varState = registeredDevicesVariable.state as any;
      if (varState.options && Array.isArray(varState.options)) {
        // Extract all option values (these are the Moids from the query)
        moids = varState.options
          .map((opt: any) => opt.value)
          .filter((v: any) => v && v !== '$__all')
          .map((v: any) => String(v));
      }

      // Build filter string: 'moid1','moid2','moid3'
      if (moids.length > 0) {
        moidFilter = moids.map(m => `'${m}'`).join(',');
      }
    }

    // Determine if only one server is selected
    const isSingleServer = serverNames.length === 1;

    // Create the ports table with moidFilter and single server flag
    const newBody = createPortsBody(moidFilter, isSingleServer);

    this.setState({ body: newBody });
  }

  private getVariable(name: string): any {
    // Use sceneGraph to lookup variable in parent scope
    return sceneGraph.lookupVariable(name, this);
  }
}

/**
 * Renderer component for DynamicPortsScene
 */
function DynamicPortsSceneRenderer({ model }: SceneComponentProps<DynamicPortsScene>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

/**
 * Creates the ports table layout
 */
function createPortsBody(moidFilter?: string, isSingleServer: boolean = false): SceneFlexLayout {
  // Build filter expressions for queries
  const ethFilterExpression = moidFilter
    ? `DeviceMoId in (${moidFilter})`
    : `DeviceMoId in (\${RegisteredDevices:singlequote})`;

  const fcFilterExpression = moidFilter
    ? `DeviceMoId in (${moidFilter})`
    : `DeviceMoId in (\${RegisteredDevices:singlequote})`;

  const ethUrl = `/api/v1/adapter/HostEthInterfaces?$filter=${ethFilterExpression}&$expand=Parent($expand=Parent)`;
  const fcUrl = `/api/v1/adapter/HostFcInterfaces?$filter=${fcFilterExpression}&$expand=Parent($expand=Parent)`;

  // Create query runner with both Ethernet and Fibre Channel queries
  const baseQueryRunner = new LoggingQueryRunner({
    datasource: { uid: '${Account}' },
    queries: [
      // Query A: HostEthInterfaces (Ethernet)
      {
        refId: 'A',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: ethUrl,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.Parent.Name', text: 'Hostname', type: 'string' },
          { selector: 'Name', text: 'Port', type: 'string' },
          { selector: 'MacAddress', text: 'MAC Address', type: 'string' },
          { selector: 'InterfaceType', text: 'Interface Type', type: 'string' },
          { selector: '"Ethernet"', text: 'Type', type: 'string' },
          { selector: 'QinqEnabled', text: 'QinQ Enabled?', type: 'string' },
          { selector: 'QinqVlan', text: 'QinQ VLAN', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
      // Query B: HostFcInterfaces (Fibre Channel)
      {
        refId: 'B',
        queryType: 'infinity',
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: fcUrl,
        root_selector: '$.Results',
        columns: [
          { selector: 'Parent.Parent.Name', text: 'Hostname', type: 'string' },
          { selector: 'Name', text: 'Port', type: 'string' },
          { selector: 'MacAddress', text: 'MAC Address', type: 'string' },
          { selector: 'InterfaceType', text: 'Interface Type', type: 'string' },
          { selector: '"Fibre Channel"', text: 'Type', type: 'string' },
          { selector: 'QinqEnabled', text: 'QinQ Enabled?', type: 'string' },
          { selector: 'QinqVlan', text: 'QinQ VLAN', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
      } as any,
    ],
  });

  // Apply transformations: merge queries, organize columns
  const transformedData = new LoggingDataTransformer({
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
            Hostname: isSingleServer,
          },
          includeByName: {},
          indexByName: {
            Hostname: 0,
            Port: 1,
            'MAC Address': 2,
            'Interface Type': 3,
            Type: 4,
            'QinQ Enabled?': 5,
            'QinQ VLAN': 6,
          },
          renameByName: {},
        },
      },
    ],
  });

  // Build the ports table panel
  const portsPanel = PanelBuilders.table()
    .setTitle('Network Ports')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('enablePagination', true)
    .setNoValue('-')
    .setCustomFieldConfig('align', 'auto')
    .setCustomFieldConfig('cellOptions', { type: 'auto' })
    .setCustomFieldConfig('filterable', true)
    .setCustomFieldConfig('inspect', false)
    .setOverrides((builder) => {
      // Add color transformation for QinQ Enabled field
      builder
        .matchFieldsWithName('QinQ Enabled?')
        .overrideMappings([
          {
            type: 'value',
            options: {
              '': { color: '#646464', index: 0, text: '-' },
              '-': { color: '#646464', index: 1, text: '-' },
              null: { color: '#646464', index: 2, text: '-' },
              'null': { color: '#646464', index: 3, text: '-' },
              'false': { color: '#646464', index: 4, text: 'False' },
              false: { color: '#646464', index: 5, text: 'False' },
              'true': { color: 'blue', index: 6, text: 'True' },
              true: { color: 'blue', index: 7, text: 'True' },
            },
          },
        ])
        .overrideColor({
          mode: 'fixed',
          fixedColor: '#646464',
        })
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' });
    })
    .build();

  // Return layout with the ports panel
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
 * Main export function for the Ports tab.
 * Returns a DynamicPortsScene that shows all ports in a single table.
 */
export function getPortsTab() {
  // Return the dynamic ports scene that shows all ports in a single table
  return new DynamicPortsScene({});
}
