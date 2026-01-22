import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SceneObjectBase, SceneComponentProps, SceneObjectState } from '@grafana/scenes';
import { TabsBar, Tab } from '@grafana/ui';
import { css } from '@emotion/css';

interface TabDefinition {
  id: string;
  label: string;
  getBody: () => any;
}

interface TabbedSceneState extends SceneObjectState {
  tabs: TabDefinition[];
  activeTab: string;
  body: any;
  controls?: any[];
  urlSync?: boolean; // Enable URL synchronization
  isTopLevel?: boolean; // True for main navigation, false for sub-tabs
}

export class TabbedScene extends SceneObjectBase<TabbedSceneState> {
  public static Component = TabbedSceneRenderer;

  public setActiveTab(tabId: string, updateUrl: boolean = true) {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (tab) {
      const newBody = tab.getBody();
      this.setState({ activeTab: tabId, body: newBody });
    }
  }

  public activate() {
    super.activate();
    // Return empty cleanup function to satisfy type requirements
    return () => {};
  }
}

// CSS to fix MultiSelect maxVisibleValues padding issue
// The MultiSelect component calculates min-width based on ALL selected items
// but only displays maxVisibleValues items. This override prevents the extra space.
const controlsContainerFix = css`
  /* Override the inline min-width that gets calculated for all items */
  [class*="grafana-select-value-container"] {
    min-width: auto !important;
    max-width: 400px !important;
  }
`;

function TabbedSceneRenderer({ model }: SceneComponentProps<TabbedScene>) {
  const { tabs, activeTab, body, controls, urlSync, isTopLevel } = model.useState();
  const location = useLocation();
  const navigate = useNavigate();

  // Sync URL to state on mount and location changes
  useEffect(() => {
    if (!urlSync) return;

    // BrowserRouter basename strips '/a/intersight-app', so:
    // URL '/a/intersight-app/standalone/alarms' becomes location.pathname '/standalone/alarms'
    const pathParts = location.pathname.split('/').filter(Boolean);
    // pathParts[0] = section (e.g., 'standalone', 'imm-domain')
    // pathParts[1] = sub-tab (e.g., 'alarms', 'overview')

    if (isTopLevel) {
      // Top-level navigation (Home, IMM Domain, Standalone, Unified Edge)
      const sectionFromUrl = pathParts[0]; // e.g., 'standalone', 'imm-domain'

      if (sectionFromUrl && sectionFromUrl !== activeTab) {
        const matchingTab = tabs.find(t => t.id === sectionFromUrl);
        if (matchingTab) {
          model.setActiveTab(sectionFromUrl, false);
        }
      } else if (!sectionFromUrl && activeTab !== 'home') {
        // If no section in URL, default to home
        model.setActiveTab('home', false);
      }
    } else {
      // Sub-tab navigation (Overview, Alarms, etc.)
      const subTabFromUrl = pathParts[1]; // e.g., 'alarms', 'overview'

      if (subTabFromUrl && subTabFromUrl !== activeTab) {
        const matchingTab = tabs.find(t => t.id === subTabFromUrl);
        if (matchingTab) {
          model.setActiveTab(subTabFromUrl, false);
        }
      } else if (!subTabFromUrl && activeTab !== 'overview') {
        // Default to overview if no sub-tab specified
        model.setActiveTab('overview', false);
      }
    }
  }, [location.pathname, urlSync, tabs, activeTab, model, isTopLevel]);

  const handleTabChange = (tabId: string) => {
    if (urlSync) {
      if (isTopLevel) {
        // Update URL for top-level tab
        if (tabId === 'home') {
          navigate('/');
        } else {
          navigate(`/${tabId}`);
        }
      } else {
        // Update URL for sub-tab (preserve parent section)
        const pathParts = location.pathname.split('/').filter(Boolean);
        const section = pathParts[0]; // e.g., 'standalone'
        navigate(`/${section}/${tabId}`);
      }
    }
    model.setActiveTab(tabId, false);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(204, 204, 220, 0.15)',
        flexShrink: 0,
        minHeight: '48px',
        overflow: 'visible'
      }}>
        <div style={{ border: 'none', flexShrink: 0 }}>
          <TabsBar>
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                label={tab.label}
                active={activeTab === tab.id}
                onChangeTab={() => handleTabChange(tab.id)}
              />
            ))}
          </TabsBar>
        </div>
        {controls && controls.length > 0 && (
          <div className={controlsContainerFix} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 1, flexGrow: 0, minWidth: 0 }}>
            {controls.map((control, index) => (
              <control.Component key={index} model={control} />
            ))}
          </div>
        )}
      </div>
      <div style={{
        flexGrow: 1,
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative'
      }}>
        {body && body.Component && <body.Component key={activeTab} model={body} />}
      </div>
    </div>
  );
}
