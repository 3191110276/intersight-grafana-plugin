import {
  QueryVariable,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';

// Import all tab functions
import { getOverviewTab } from './OverviewTab';
import { getInventoryTab } from './InventoryTab';
import { getAlarmsTab } from './AlarmsTab';
import { getActionsTab } from './ActionsTab';
import { getPortsTab } from './PortsTab';
import { getNetworkUtilizationTab } from './NetworkUtilizationTab';
import { getNetworkErrorsTab } from './NetworkErrorsTab';
import { getEnvironmentalTab } from './EnvironmentalTab';
import { getCPUUtilizationTab } from './CPUUtilizationTab';
import { getStorageTab } from './StorageTab';

const standaloneTabs = [
  { id: 'overview', label: 'Overview', getBody: getOverviewTab },
  { id: 'inventory', label: 'Inventory', getBody: getInventoryTab },
  { id: 'alarms', label: 'Alarms', getBody: getAlarmsTab },
  { id: 'actions', label: 'Actions', getBody: getActionsTab },
  { id: 'ports', label: 'Ports', getBody: getPortsTab },
  { id: 'network-utilization', label: 'Network Utilization', getBody: getNetworkUtilizationTab },
  { id: 'network-errors', label: 'Network Errors', getBody: getNetworkErrorsTab },
  { id: 'environmental', label: 'Environmental', getBody: getEnvironmentalTab },
  { id: 'cpu-utilization', label: 'CPU Utilization', getBody: getCPUUtilizationTab },
  { id: 'storage', label: 'Storage', getBody: getStorageTab },
];

export function getStandaloneSceneBody() {
  // Create ServerName variable - scoped to Standalone tab
  const serverNameVariable = new QueryVariable({
    name: 'ServerName',
    label: 'Server',
    datasource: { uid: '${Account}' },
    query: {
      refId: 'variable',
      queryType: 'infinity',
      infinityQuery: {
        type: 'json',
        source: 'url',
        parser: 'backend',
        format: 'table',
        url: '/api/v1/compute/RackUnits?$filter=ManagementMode eq \'IntersightStandalone\' and not(startswith(Model,\'HX\')) and Vendor eq \'Cisco Systems Inc\'',
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

  // Create RegisteredDevices variable - hidden, depends on ServerName
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
        url: '/api/v1/asset/DeviceRegistrations?$filter=DeviceHostname in (${ServerName:singlequote})',
        root_selector: '$.Results',
        columns: [
          { selector: 'Moid', text: 'Moid', type: 'string' },
        ],
        url_options: {
          method: 'GET',
          data: '',
        },
        filters: [],
      },
    },
    isMulti: false,
    includeAll: true,
    hide: 2, // hideVariable = 2 in Scenes
  });

  // Create variable set for Standalone tab
  const variables = new SceneVariableSet({
    variables: [serverNameVariable, registeredDevicesVariable],
  });

  // Create the tabbed scene with controls on same line as tabs
  return new TabbedScene({
    $variables: variables,
    tabs: standaloneTabs,
    activeTab: 'overview',
    body: getOverviewTab(),
    urlSync: true,
    isTopLevel: false,
    controls: [new VariableValueSelectors({})],
  });
}
