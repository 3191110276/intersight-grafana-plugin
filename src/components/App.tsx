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
import { getIMMDomainSceneBody } from '../pages/imm-domain';
import { getStandaloneSceneBody } from '../pages/standalone';
import { getUnifiedEdgeSceneBody } from '../pages/unified-edge';

const tabs = [
  { id: 'home', label: 'Home', getBody: getHomeSceneBody },
  { id: 'imm-domain', label: 'IMM Domain', getBody: getIMMDomainSceneBody },
  { id: 'standalone', label: 'Standalone', getBody: getStandaloneSceneBody },
  { id: 'unified-edge', label: 'Unified Edge', getBody: getUnifiedEdgeSceneBody },
];

export function App(props: AppRootProps) {
  const scene = useMemo(() => {
    const timeRange = new SceneTimeRange({
      from: 'now-6h',
      to: 'now',
    });

    const accountVariable = new DataSourceVariable({
      name: 'Account',
      label: 'Account',
      pluginId: 'yesoreyeram-infinity-datasource',
    });

    const variables = new SceneVariableSet({
      variables: [accountVariable],
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
    <BrowserRouter basename="/a/intersight-app">
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <scene.Component model={scene} />
      </div>
    </BrowserRouter>
  );
}
