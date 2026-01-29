// SPDX-License-Identifier: Apache-2.0

import React, { useMemo, useEffect } from 'react';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
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
import { debugScene, debugVariable, debugUrl } from '../utils/debug';

const tabs = [
  { id: 'home', label: 'Home', getBody: getHomeSceneBody },
  { id: 'domain', label: 'Domain', getBody: getDomainSceneBody },
  { id: 'standalone', label: 'Standalone', getBody: getStandaloneSceneBody },
  { id: 'unified-edge', label: 'Unified Edge', getBody: getUnifiedEdgeSceneBody },
];

/**
 * Inner component that handles time range URL synchronization
 * Only syncs time range parameters (from, to) - not variables or other state
 */
function AppContent({ scene }: { scene: EmbeddedScene }) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const timeRange = scene.state.$timeRange;
    if (!timeRange) return;

    // Subscribe to time range changes and update URL
    const subscription = timeRange.subscribeToState((newState) => {
      debugUrl('Time range state changed, updating URL', {
        from: newState.from,
        to: newState.to,
        timeZone: newState.timeZone,
      });

      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('from', newState.from);
        newParams.set('to', newState.to);
        return newParams;
      }, { replace: true }); // Use replace to avoid cluttering browser history
    });

    // Set initial URL params if not present
    if (!searchParams.has('from') || !searchParams.has('to')) {
      const state = timeRange.state;
      debugUrl('Setting initial URL params', {
        from: state.from,
        to: state.to,
      });

      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.set('from', state.from);
        newParams.set('to', state.to);
        return newParams;
      }, { replace: true });
    }

    return () => subscription.unsubscribe();
  }, [scene, searchParams, setSearchParams]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <scene.Component model={scene} />
    </div>
  );
}

export function App(props: AppRootProps) {
  const scene = useMemo(() => {
    // Read time range from URL parameters if present
    const urlParams = new URLSearchParams(window.location.search);
    const fromParam = urlParams.get('from') || 'now-6h';
    const toParam = urlParams.get('to') || 'now';

    debugScene('Creating EmbeddedScene', {
      timeRange: { from: fromParam, to: toParam },
      urlHasParams: urlParams.has('from') || urlParams.has('to')
    });

    const timeRange = new SceneTimeRange({
      from: fromParam,
      to: toParam,
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
      basename="/a/cisco-intersight-app"
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent scene={scene} />
    </BrowserRouter>
  );
}
