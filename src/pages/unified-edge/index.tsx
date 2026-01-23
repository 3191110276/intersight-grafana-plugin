import {
  SceneFlexLayout,
  QueryVariable,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';
import { debugScene, debugVariable } from '../../utils/debug';

// Import tab functions from same directory
import { getOverviewTab } from './OverviewTab';
import { getInventoryTab } from './InventoryTab';
import { getAlarmsTab } from './AlarmsTab';
import { getActionsTab } from './ActionsTab';
import { getPortsTab } from './PortsTab';
import { getNetworkUtilizationTab } from './NetworkUtilizationTab';
import { getCongestionTab } from './CongestionTab';

// ============================================================================
// TAB DEFINITIONS
// ============================================================================

const unifiedEdgeTabs = [
  { id: 'overview', label: 'Overview', getBody: getOverviewTab },
  { id: 'inventory', label: 'Inventory', getBody: getInventoryTab },
  { id: 'alarms', label: 'Alarms', getBody: getAlarmsTab },
  { id: 'actions', label: 'Actions', getBody: getActionsTab },
  { id: 'ports', label: 'Ports', getBody: getPortsTab },
  { id: 'network-utilization', label: 'Network Utilization', getBody: getNetworkUtilizationTab },
  { id: 'congestion', label: 'Traffic Balance', getBody: getCongestionTab },
];

// ============================================================================
// SCENEAPP TABS EXPORT
// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export function getUnifiedEdgeSceneBody() {
  debugScene('Creating Unified Edge section scene');

  // Create ChassisName variable - scoped to Unified Edge tab
  // Queries equipment/Chasses with Model filter for UCSXE-9305
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
        url_options: {
          method: 'GET',
          data: '',
        },
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
    queryUrl: "/api/v1/equipment/Chasses?$filter=Model eq 'UCSXE-9305'",
  });

  // Create RegisteredDevices variable - hidden, depends on ChassisName
  // Used for filtering in downstream panels
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
        url: '/api/v1/equipment/Chasses?$top=1000&$filter=Name in (${ChassisName:singlequote})',
        root_selector: '$.Results',
        columns: [
          { selector: 'RegisteredDevice.Moid', text: 'Moid', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
        filters: [],
      },
    },
    isMulti: true,
    includeAll: false,
    hide: 2, // hideVariable = 2 in Scenes
  });

  debugVariable('Initialized hidden variable: RegisteredDevices', {
    section: 'unified-edge',
    hide: 2,
    dependsOn: 'ChassisName',
  });

  // Create DomainName variable for Overview tab panels that repeat by domain
  // For Unified Edge, this is derived from chassis names
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
        url_options: {
          method: 'GET',
          data: '',
        },
        filters: [],
      },
    },
    isMulti: true,
    includeAll: false,
    hide: 2, // Hidden - used internally for Overview tab panels
  });

  debugVariable('Initialized hidden variable: DomainName', {
    section: 'unified-edge',
    hide: 2,
    usedBy: 'Overview tab panels',
  });

  // Create variable set for Unified Edge tab
  const variables = new SceneVariableSet({
    variables: [chassisNameVariable, registeredDevicesVariable, domainNameVariable],
  });

  // Create the tabbed scene with controls on same line as tabs
  return new TabbedScene({
    $variables: variables,
    tabs: unifiedEdgeTabs,
    activeTab: 'overview',
    body: getOverviewTab(),
    urlSync: true,
    isTopLevel: false,
    controls: [new VariableValueSelectors({})],
  });
}
