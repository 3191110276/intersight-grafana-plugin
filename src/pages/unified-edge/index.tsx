import React from 'react';
import {
  QueryVariable,
  SceneVariableSet,
  VariableValueSelectors,
  SceneObjectBase,
  SceneObjectState,
  SceneComponentProps,
  VariableDependencyConfig,
  sceneGraph,
  SceneDataLayerSet,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';
import { debugScene, debugVariable } from '../../utils/debug';
import { getSingleSelectedValue } from '../../utils/emptyStateHelpers';
import { createUnifiedEdgeAnnotations, AnnotationToggleControl } from './annotations';

// Import all 10 tab functions
import { getInventoryTab } from './InventoryTab';
import { getAlarmsTab } from './AlarmsTab';
import { getActionsTab } from './ActionsTab';
import { getPortsTab } from './PortsTab';
import { getNetworkUtilizationTab } from './NetworkUtilizationTab';
import { getTrafficBalanceTab } from './TrafficBalanceTab';
import { getNetworkErrorsTab } from './NetworkErrorsTab';
import { getEnvironmentalTab } from './EnvironmentalTab';
import { getCPUUtilizationTab } from './CPUUtilizationTab';
import { getStorageTab } from './StorageTab';

// ============================================================================
// ANNOTATION-AWARE SCENE WRAPPER
// ============================================================================

interface UnifiedEdgeSceneWithAnnotationsState extends SceneObjectState {
  body: TabbedScene;
  $data?: SceneDataLayerSet;
}

/**
 * Wrapper scene that manages annotations reactively based on ChassisName selection.
 * Annotations are only enabled when exactly one chassis is selected.
 */
class UnifiedEdgeSceneWithAnnotations extends SceneObjectBase<UnifiedEdgeSceneWithAnnotationsState> {
  public static Component = UnifiedEdgeSceneWithAnnotationsRenderer;

  // Store controls as instance properties (not state) to avoid parent conflicts
  // These controls belong to TabbedScene, not to this wrapper
  private _annotationToggle: AnnotationToggleControl;
  private _variableSelectors: VariableValueSelectors;

  // @ts-ignore
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: ['ChassisName'],
    onReferencedVariableValueChanged: () => {
      if (this.isActive) {
        this.updateAnnotations();
      }
    },
  });

  public constructor(
    state: UnifiedEdgeSceneWithAnnotationsState,
    annotationToggle: AnnotationToggleControl,
    variableSelectors: VariableValueSelectors
  ) {
    super(state);
    this._annotationToggle = annotationToggle;
    this._variableSelectors = variableSelectors;
  }

  // @ts-ignore - Override return type doesn't match base class exactly
  public activate() {
    super.activate();
    // Initial annotation setup
    this.updateAnnotations();
    // Return empty cleanup function to satisfy type requirements
    return () => {};
  }

  private updateAnnotations() {
    // @ts-ignore - sceneGraph.lookupVariable returns a compatible type
    const variable = sceneGraph.lookupVariable('ChassisName', this as any);
    const chassisName = getSingleSelectedValue(variable);

    if (chassisName) {
      // Single chassis selected: enable annotations
      debugScene('Enabling annotations for single chassis', { chassisName });
      const dataLayerSet = createUnifiedEdgeAnnotations(chassisName);

      // Wire up the toggle control with the data layer set
      this._annotationToggle.setDataLayerSet(dataLayerSet);

      // Apply current toggle state to the new layers
      const isEnabled = this._annotationToggle.state.enabled;
      dataLayerSet.state.layers.forEach((layer) => {
        layer.setState({ isEnabled });
      });

      // Update TabbedScene controls to include annotation toggle (left of variable selectors)
      this.state.body.setState({
        controls: [this._annotationToggle, this._variableSelectors],
      });

      this.setState({ $data: dataLayerSet });
    } else {
      // Multiple or no chassis selected: disable annotations
      debugScene('Disabling annotations (multiple/no chassis selected)');

      // Update TabbedScene controls to only have variable selectors
      this.state.body.setState({
        controls: [this._variableSelectors],
      });

      this.setState({ $data: undefined });
    }
  }
}

/**
 * Renderer component for UnifiedEdgeSceneWithAnnotations
 */
function UnifiedEdgeSceneWithAnnotationsRenderer({ model }: SceneComponentProps<UnifiedEdgeSceneWithAnnotations>) {
  const { body } = model.useState();

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {body && body.Component && <body.Component model={body} />}
    </div>
  );
}

const unifiedEdgeTabs = [
  { id: 'inventory', label: 'Inventory', getBody: getInventoryTab },
  { id: 'alarms', label: 'Alarms', getBody: getAlarmsTab },
  { id: 'actions', label: 'Actions', getBody: getActionsTab },
  { id: 'ports', label: 'Ports', getBody: getPortsTab },
  { id: 'network-utilization', label: 'Network Utilization**', getBody: getNetworkUtilizationTab },
  { id: 'traffic-balance', label: 'Traffic Balance', getBody: getTrafficBalanceTab },
  { id: 'network-errors', label: 'Network Errors**', getBody: getNetworkErrorsTab },
  { id: 'environmental', label: 'Environmental', getBody: getEnvironmentalTab },
  { id: 'cpu-utilization', label: 'CPU Utilization', getBody: getCPUUtilizationTab },
  { id: 'storage', label: 'Storage', getBody: getStorageTab },
];

export function getUnifiedEdgeSceneBody() {
  debugScene('Creating Unified Edge section scene');

  // ChassisName variable - queries UCSXE-9305 chassis
  const chassisNameVariable = new QueryVariable({
    name: 'ChassisName',
    label: 'Chassis',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: "/api/v1/equipment/Chasses?$filter=Model eq 'UCSXE-9305'",
        root_selector: '$.Results',
        columns: [
          { selector: 'Name', text: 'Name', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
        filters: [],
      },
    },
    isMulti: true,
    includeAll: false,
    maxVisibleValues: 2,
  });

  debugVariable('Initialized section variable: ChassisName', {
    section: 'unified-edge',
    isMulti: true,
    maxVisibleValues: 2,
  });

  // RegisteredDevices variable - hidden, depends on ChassisName
  // Uses Chassis.Moid directly (not DeviceRegistrations like Domain/Standalone)
  // defaultToAll: true auto-selects all Moid values (not $__all placeholder)
  const registeredDevicesVariable = new QueryVariable({
    name: 'RegisteredDevices',
    label: 'RegisteredDevices',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/equipment/Chasses?$filter=Name in (${ChassisName:singlequote})',
        root_selector: '$.Results',
        columns: [
          { selector: 'Moid', text: 'Moid', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
        filters: [],
      },
    },
    isMulti: true,
    includeAll: false,
    defaultToAll: true,
    hide: 2,
  });

  debugVariable('Initialized hidden variable: RegisteredDevices', {
    section: 'unified-edge',
    hide: 2,
    dependsOn: 'ChassisName',
  });

  // DomainName variable - hidden, used internally
  const domainNameVariable = new QueryVariable({
    name: 'DomainName',
    label: 'Domain',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: "/api/v1/equipment/Chasses?$filter=Model eq 'UCSXE-9305'",
        root_selector: '$.Results',
        columns: [
          { selector: 'Name', text: 'Name', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
        filters: [],
      },
    },
    isMulti: true,
    includeAll: false,
    hide: 2,
  });

  debugVariable('Initialized hidden variable: DomainName', {
    section: 'unified-edge',
    hide: 2,
  });

  const variables = new SceneVariableSet({
    variables: [chassisNameVariable, registeredDevicesVariable, domainNameVariable],
  });

  // Create shared controls - these belong to TabbedScene
  const variableSelectors = new VariableValueSelectors({});
  const annotationToggle = new AnnotationToggleControl({ enabled: true });

  const tabbedScene = new TabbedScene({
    tabs: unifiedEdgeTabs,
    activeTab: 'inventory',
    body: getInventoryTab(),
    urlSync: true,
    isTopLevel: false,
    controls: [variableSelectors], // Start with just variable selectors, annotation toggle added when single chassis selected
  });

  // Wrap TabbedScene with annotation-aware wrapper
  // Variables are set on the wrapper so they're available to both the tabs and annotation layers
  // Controls are passed separately (not in state) to avoid parent conflicts
  return new UnifiedEdgeSceneWithAnnotations(
    {
      $variables: variables,
      body: tabbedScene,
    },
    annotationToggle,
    variableSelectors
  );
}
