/**
 * Network Errors Tab - IMM Domain Scene
 *
 * This module provides the Network Errors tab functionality for the IMM Domain scene.
 * Shows network error metrics for FI uplinks and downlinks.
 */

import {
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneGridLayout,
  SceneGridRow,
  SceneGridItem,
} from '@grafana/scenes';
import { TabbedScene } from '../../components/TabbedScene';
import {
  getFIEthernetUplinkTXErrorsPanel,
  getFIEthernetUplinkRXErrorsPanel,
  getFIEthernetUplinkDetailTable,
  getFIEthernetUplinkPortChannelTXErrorsPanel,
  getFIEthernetUplinkPortChannelRXErrorsPanel,
  getFIEthernetUplinkPortChannelDetailTable,
  getFIDownlinksPanel,
  getIFMUplinksPanel,
  getIFMDownlinksPanel,
  getVNICVHBAPanel,
  getErrorDescriptionsPanel,
} from './CongestionTab';

export function getNetworkErrorsTab() {
  // Helper to create Ports tab layout
  const getPortsTabBody = () => new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkTXErrorsPanel('FI-A'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkTXErrorsPanel('FI-B'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkRXErrorsPanel('FI-A'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkRXErrorsPanel('FI-B'),
      }),
      new SceneFlexItem({
        width: '100%',
        height: 400,
        body: getFIEthernetUplinkDetailTable(),
      }),
    ],
  });

  // Helper to create Port Channels tab layout
  const getPortChannelsTabBody = () => new SceneFlexLayout({
    direction: 'row',
    children: [
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkPortChannelTXErrorsPanel('FI-A'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkPortChannelTXErrorsPanel('FI-B'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkPortChannelRXErrorsPanel('FI-A'),
      }),
      new SceneFlexItem({
        width: '50%',
        height: 300,
        body: getFIEthernetUplinkPortChannelRXErrorsPanel('FI-B'),
      }),
      new SceneFlexItem({
        width: '100%',
        height: 400,
        body: getFIEthernetUplinkPortChannelDetailTable(),
      }),
    ],
  });

  // Row 1: Fabric Interconnect Ethernet Uplinks (with nested tabs)
  const ethernetUplinksRow = new SceneGridRow({
    title: 'Fabric Interconnect Ethernet Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 0,
    children: [
      new SceneGridItem({
        x: 0,
        y: 0,
        width: 24,
        height: 14,
        body: new TabbedScene({
          tabs: [
            {
              id: 'ports',
              label: 'Ports',
              getBody: getPortsTabBody,
            },
            {
              id: 'port-channels',
              label: 'Port Channels',
              getBody: getPortChannelsTabBody,
            },
          ],
          activeTab: 'ports',
          body: getPortsTabBody(),
        }),
      }),
    ],
  });

  // Row 2: Fabric Interconnect Downlinks
  const downlinksRow = new SceneGridRow({
    title: 'Fabric Interconnect Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 14,
    children: [
      new SceneGridItem({
        x: 0,
        y: 14,
        width: 24,
        height: 8,
        body: getFIDownlinksPanel(),
      }),
    ],
  });

  // Row 3: IFM Uplinks
  const ifmUplinksRow = new SceneGridRow({
    title: 'IFM Uplinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 22,
    children: [
      new SceneGridItem({
        x: 0,
        y: 22,
        width: 24,
        height: 8,
        body: getIFMUplinksPanel(),
      }),
    ],
  });

  // Row 4: IFM Downlinks
  const ifmDownlinksRow = new SceneGridRow({
    title: 'IFM Downlinks',
    isCollapsible: true,
    isCollapsed: false,
    y: 30,
    children: [
      new SceneGridItem({
        x: 0,
        y: 30,
        width: 24,
        height: 8,
        body: getIFMDownlinksPanel(),
      }),
    ],
  });

  // Row 5: vNIC/vHBA
  const vnicVhbaRow = new SceneGridRow({
    title: 'vNIC/vHBA',
    isCollapsible: true,
    isCollapsed: false,
    y: 38,
    children: [
      new SceneGridItem({
        x: 0,
        y: 38,
        width: 24,
        height: 8,
        body: getVNICVHBAPanel(),
      }),
    ],
  });

  // Row 6: Error Descriptions
  const errorDescriptionsRow = new SceneGridRow({
    title: 'Error Descriptions',
    isCollapsible: true,
    isCollapsed: false,
    y: 46,
    children: [
      new SceneGridItem({
        x: 0,
        y: 46,
        width: 24,
        height: 8,
        body: getErrorDescriptionsPanel(),
      }),
    ],
  });

  // Main layout with all collapsible rows
  return new SceneFlexLayout({
    direction: 'column',
    children: [
      new SceneFlexItem({
        minHeight: 1000,
        body: new SceneGridLayout({
          children: [
            ethernetUplinksRow,
            downlinksRow,
            ifmUplinksRow,
            ifmDownlinksRow,
            vnicVhbaRow,
            errorDescriptionsRow,
          ],
        }),
      }),
    ],
  });
}

