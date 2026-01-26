// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRootProps } from '@grafana/data';
import {
  EmbeddedScene,
  SceneTimeRange,
  SceneTimePicker,
  SceneRefreshPicker,
  DataSourceVariable,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { TabbedScene } from './TabbedScene';
import { getHomeSceneBody } from '../pages/home';
import { getDomainSceneBody } from '../pages/domain';
import { getStandaloneSceneBody } from '../pages/standalone';
import { getUnifiedEdgeSceneBody } from '../pages/unified-edge';
import { debugScene, debugVariable } from '../utils/debug';

const tabs = [
  { id: 'home', label: 'Home', getBody: getHomeSceneBody },
  { id: 'domain', label: 'Domain', getBody: getDomainSceneBody },
  { id: 'standalone', label: 'Standalone', getBody: getStandaloneSceneBody },
  { id: 'unified-edge', label: 'Unified Edge', getBody: getUnifiedEdgeSceneBody },
];

export function App(props: AppRootProps) {
  const scene = useMemo(() => {
    debugScene('Creating EmbeddedScene', { timeRange: { from: 'now-6h', to: 'now' } });

    const timeRange = new SceneTimeRange({
      from: 'now-6h',
      to: 'now',
    });

    const accountVariable = new DataSourceVariable({
      name: 'Account',
      label: 'Account',
      pluginId: 'yesoreyeram-infinity-datasource',
    });

    debugVariable('Initialized global variable: Account', {
      type: 'DataSourceVariable',
      pluginId: 'yesoreyeram-infinity-datasource',
    });

    const variables = new SceneVariableSet({
      variables: [accountVariable],
    });

    debugScene('Creating top-level TabbedScene', {
      tabCount: tabs.length,
      tabs: tabs.map((t) => ({ id: t.id, label: t.label })),
      activeTab: 'home',
      urlSync: true,
    });

    const tabbedScene = new TabbedScene({
      tabs: tabs,
      activeTab: 'home',
      body: getHomeSceneBody(),
      urlSync: true,
      isTopLevel: true,
      controls: [
        new VariableValueSelectors({}),
        new SceneTimePicker({}),
        new SceneRefreshPicker({}),
      ],
    });

    return new EmbeddedScene({
      $timeRange: timeRange,
      $variables: variables,
      controls: [],
      body: tabbedScene,
    });
  }, []);

  return (
    <BrowserRouter
      basename="/a/intersight-app"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <scene.Component model={scene} />
      </div>
    </BrowserRouter>
  );
}
