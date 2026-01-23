/**
 * Domain Scene - Main Entry Point
 *
 * This module provides the main scene body for the Domain tab,
 * which includes multiple sub-tabs for different aspects of domain management.
 */

import {
  QueryVariable,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';
import { debugScene, debugVariable } from '../../utils/debug';
import { getOverviewTab } from './OverviewTab';
import { getInventoryTab } from './InventoryTab';
import { getAlarmsTab } from './AlarmsTab';
import { getActionsTab } from './ActionsTab';
import { getPortsTab } from './PortsTab';
import { getNetworkUtilizationTab } from './NetworkUtilizationTab';
import { getTrafficBalanceTab } from './TrafficBalanceTab';
import { getCongestionTab } from './CongestionTab';
import { getNetworkErrorsTab } from './NetworkErrorsTab';
import { getSFPTab } from './SFPTab';
import { getEnvironmentalTab } from './EnvironmentalTab';
import { getCPUUtilizationTab } from './CPUUtilizationTab';
import { getStorageTab } from './StorageTab';

/**
 * Main export function for the Domain scene body.
 * Creates the tab structure with domain selection variable.
 */
export function getDomainSceneBody() {
  debugScene('Creating Domain section scene');

  // Create DomainName variable - scoped to Domain tab
  // Queries ElementSummaries with ManagementMode filter
  // Uses regex to extract domain name (removes " FI-A" suffix)
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
        url: '/api/v1/network/ElementSummaries?$filter=ManagementMode eq \'Intersight\'',
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
    regex: '(?<text>.*) FI-A', // Extract domain name without " FI-A" suffix
  });

  debugVariable('Initialized section variable: DomainName', {
    section: 'domain',
    isMulti: true,
    maxVisibleValues: 2,
    regex: '(?<text>.*) FI-A',
    queryUrl: '/api/v1/network/ElementSummaries?$filter=...',
  });

  // Create RegisteredDevices variable - hidden, depends on DomainName
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
        url: '/api/v1/asset/DeviceRegistrations?$top=1000&$filter=DeviceHostname in (${DomainName:singlequote})',
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
    isMulti: true,
    includeAll: false,
    hide: 2, // Hide this variable from the UI
  });

  debugVariable('Initialized hidden variable: RegisteredDevices', {
    section: 'domain',
    hide: 2,
    dependsOn: 'DomainName',
  });

  // Create variable set with both variables
  const variables = new SceneVariableSet({
    variables: [domainNameVariable, registeredDevicesVariable],
  });

  // Define all tabs
  const immDomainTabs = [
    { id: 'overview', label: 'Overview', getBody: getOverviewTab },
    { id: 'inventory', label: 'Inventory', getBody: getInventoryTab },
    { id: 'alarms', label: 'Alarms', getBody: getAlarmsTab },
    { id: 'actions', label: 'Actions', getBody: getActionsTab },
    { id: 'ports', label: 'Ports', getBody: getPortsTab },
    { id: 'network-utilization', label: 'Network Utilization', getBody: getNetworkUtilizationTab },
    { id: 'traffic-balance', label: 'Traffic Balance', getBody: getTrafficBalanceTab },
    { id: 'congestion', label: 'Congestion', getBody: getCongestionTab },
    { id: 'network-errors', label: 'Network Errors', getBody: getNetworkErrorsTab },
    { id: 'sfp', label: 'SFP', getBody: getSFPTab },
    { id: 'environmental', label: 'Environmental', getBody: getEnvironmentalTab },
    { id: 'cpu-utilization', label: 'CPU Utilization', getBody: getCPUUtilizationTab },
    { id: 'storage', label: 'Storage', getBody: getStorageTab },
  ];

  // Create the tabbed scene with variables
  return new TabbedScene({
    $variables: variables,
    tabs: immDomainTabs,
    activeTab: 'overview',
    body: getOverviewTab(),
    urlSync: true,
    isTopLevel: false,
    controls: [new VariableValueSelectors({})],
  });
}
