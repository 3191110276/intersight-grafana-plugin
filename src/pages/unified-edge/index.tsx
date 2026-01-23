import {
  QueryVariable,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';
import { debugScene, debugVariable } from '../../utils/debug';

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

const unifiedEdgeTabs = [
  { id: 'inventory', label: 'Inventory**', getBody: getInventoryTab },
  { id: 'alarms', label: 'Alarms**', getBody: getAlarmsTab },
  { id: 'actions', label: 'Actions**', getBody: getActionsTab },
  { id: 'ports', label: 'Ports**', getBody: getPortsTab },
  { id: 'network-utilization', label: 'Network Utilization**', getBody: getNetworkUtilizationTab },
  { id: 'traffic-balance', label: 'Traffic Balance**', getBody: getTrafficBalanceTab },
  { id: 'network-errors', label: 'Network Errors**', getBody: getNetworkErrorsTab },
  { id: 'environmental', label: 'Environmental**', getBody: getEnvironmentalTab },
  { id: 'cpu-utilization', label: 'CPU Utilization**', getBody: getCPUUtilizationTab },
  { id: 'storage', label: 'Storage**', getBody: getStorageTab },
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
          { selector: 'Moid', text: 'Moid', type: 'string' },
        ],
        url_options: { method: 'GET', data: '' },
        filters: [],
      },
    },
    isMulti: true,
    includeAll: false,
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

  return new TabbedScene({
    $variables: variables,
    tabs: unifiedEdgeTabs,
    activeTab: 'inventory',
    body: getInventoryTab(),
    urlSync: true,
    isTopLevel: false,
    controls: [new VariableValueSelectors({})],
  });
}
