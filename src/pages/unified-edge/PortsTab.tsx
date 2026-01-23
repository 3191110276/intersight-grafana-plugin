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

/**
 * Creates a panel for eCMC External Ports (panel-212 from original dashboard)
 * This panel displays physical ethernet ports for the chassis
 */
function getEcmcExternalPortsPanel(moidFilter?: string) {
  // Build URL with programmatic filter if available
  const filterExpression = moidFilter
    ? `Ancestors.Moid in (${moidFilter})`
    : `Ancestors.Moid in (\${RegisteredDevices:singlequote})`;

  const url = `/api/v1/ether/PhysicalPorts?$filter=${filterExpression}`;

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
        url: url,
        root_selector: '$.Results',
        columns: [
          { selector: 'MacAddress', text: 'MacAddress', type: 'string' },
          { selector: 'Mode', text: 'Mode', type: 'string' },
          { selector: 'OperSpeed', text: 'OperSpeed', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'OperStateQual', text: 'OperStateQual', type: 'string' },
          { selector: 'PortChannelId', text: 'PortChannelId', type: 'string' },
          { selector: 'PortGroup', text: 'PortGroup', type: 'string' },
          { selector: 'PortId', text: 'PortId', type: 'string' },
          { selector: 'PortName', text: 'PortName', type: 'string' },
          { selector: 'Role', text: 'Role', type: 'string' },
          { selector: 'SwitchId', text: 'SwitchId', type: 'string' },
        ],
        filters: [],
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
            PortGroup: true,
            PortName: true,
          },
          includeByName: {},
          indexByName: {
            Chassis: 0,
            MacAddress: 11,
            Mode: 7,
            OperSpeed: 6,
            OperState: 4,
            OperStateQual: 5,
            PortChannelId: 9,
            PortGroup: 10,
            PortId: 2,
            PortName: 3,
            Role: 8,
            SwitchId: 1,
          },
          renameByName: {
            OperSpeed: 'Operational Speed',
            OperState: 'Operational State',
            OperStateQual: 'Operational Reason',
            PortChannelId: 'Port Channel ID',
            PortId: 'Port',
            SwitchId: 'eCMC',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('eCMC External Ports')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOverrides((builder) => {
      // Operational Reason column mapping
      builder.matchFieldsWithName('Operational Reason')
        .overrideMappings([
          {
            type: 'value',
            options: {
              none: { index: 0, text: '-' },
            },
          },
        ]);

      // Operational State column with color text
      builder.matchFieldsWithName('Operational State')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              down: { color: '#7c0614', index: 1, text: 'Down' },
              up: { color: 'green', index: 0, text: 'Up' },
            },
          },
        ]);
    })
    .build();
}

/**
 * Creates a panel for Server Ports (panel-213 from original dashboard)
 * This panel displays adapter external ethernet interfaces for servers
 */
function getServerPortsPanel(moidFilter?: string) {
  // Build URL with programmatic filter if available
  const filterExpression = moidFilter
    ? `Ancestors.Moid in (${moidFilter})`
    : `Ancestors.Moid in (\${RegisteredDevices:singlequote})`;

  const url = `/api/v1/adapter/ExtEthInterfaces?$filter=${filterExpression}&$expand=AdapterUnit($expand=ComputeBlade)`;

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
        url: url,
        root_selector: '$.Results',
        columns: [
          { selector: 'AdapterUnit.ComputeBlade.Name', text: 'Server', type: 'string' },
          { selector: 'ExtEthInterfaceId', text: 'ExtEthInterfaceId', type: 'string' },
          { selector: 'MacAddress', text: 'MacAddress', type: 'string' },
          { selector: 'OperReason.0', text: 'OperReason', type: 'string' },
          { selector: 'OperState', text: 'OperState', type: 'string' },
          { selector: 'PeerPortId', text: 'PeerPortId', type: 'string' },
          { selector: 'SwitchId', text: 'SwitchId', type: 'string' },
        ],
        filters: [],
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
            PeerPortId: true,
          },
          includeByName: {},
          indexByName: {
            ExtEthInterfaceId: 1,
            MacAddress: 6,
            OperReason: 3,
            OperState: 2,
            PeerPortId: 5,
            Server: 0,
            SwitchId: 4,
          },
          renameByName: {
            ExtEthInterfaceId: 'Interface',
            MacAddress: 'MAC Address',
            OperReason: 'Operational Cause',
            OperState: 'Operational State',
            SwitchId: 'Switch ID',
          },
        },
      },
    ],
  });

  return PanelBuilders.table()
    .setTitle('Server Ports')
    .setData(transformedData)
    .setOption('showHeader', true)
    .setOption('cellHeight', 'sm')
    .setOption('sortBy', [{ displayName: 'Server', desc: false }])
    .setOverrides((builder) => {
      // Operational Cause column - fixed red color
      builder.matchFieldsWithName('Operational Cause')
        .overrideColor({ mode: 'fixed', fixedColor: '#7c0614' });

      // Operational State column with color text
      builder.matchFieldsWithName('Operational State')
        .overrideCustomFieldConfig('cellOptions', { type: 'color-text' })
        .overrideMappings([
          {
            type: 'value',
            options: {
              down: { color: '#7c0614', index: 1, text: 'Down' },
              up: { color: 'green', index: 0, text: 'Up' },
            },
          },
        ]);
    })
    .build();
}

// ============================================================================
// DYNAMIC PORTS SCENE - Extracts Moid values programmatically
// ============================================================================

interface DynamicPortsSceneState extends SceneObjectState {
  body: SceneFlexLayout;
}

/**
 * DynamicPortsScene - Custom scene that watches ChassisName variable
 * and programmatically extracts Moid values from RegisteredDevices
 */
class DynamicPortsScene extends SceneObjectBase<DynamicPortsSceneState> {
  public static Component = DynamicPortsSceneRenderer;

  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName', 'RegisteredDevices'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        this.rebuildBody();
      }
    },
  });

  public constructor(state: Partial<DynamicPortsSceneState>) {
    super({
      body: new SceneFlexLayout({ direction: 'column', children: [] }),
      ...state,
    });
  }

  public activate() {
    const deactivate = super.activate();
    this.rebuildBody();
    return deactivate;
  }

  private rebuildBody() {
    if (!this.isActive) {
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
        console.log('[UnifiedEdge PortsTab] Extracted Moids from RegisteredDevices variable options:', moids);
        console.log('[UnifiedEdge PortsTab] Built filter string:', moidFilter);
      } else {
        console.warn('[UnifiedEdge PortsTab] No Moids found in RegisteredDevices variable options');
      }
    }

    // Rebuild panels with moidFilter
    const newBody = new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          height: 400,
          ySizing: 'content',
          body: getEcmcExternalPortsPanel(moidFilter),
        }),
        new SceneFlexItem({
          ySizing: 'fill',
          body: getServerPortsPanel(moidFilter),
        }),
      ],
    });

    this.setState({ body: newBody });
  }
}

/**
 * Renderer component for DynamicPortsScene
 */
function DynamicPortsSceneRenderer({ model }: SceneComponentProps<DynamicPortsScene>) {
  const { body } = model.useState();
  return <body.Component model={body} />;
}

/**
 * Main export function for the Ports tab.
 * Returns a DynamicPortsScene that programmatically builds queries with all Moid values.
 */
export function getPortsTab() {
  return new DynamicPortsScene({});
}
