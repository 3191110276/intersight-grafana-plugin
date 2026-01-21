import React from 'react';
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
}

export class TabbedScene extends SceneObjectBase<TabbedSceneState> {
  public static Component = TabbedSceneRenderer;

  public setActiveTab(tabId: string) {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (tab) {
      // Deactivate old body if it exists and has deactivate method
      if (this.state.body && typeof this.state.body.deactivate === 'function' && this.state.body.isActive) {
        this.state.body.deactivate();
      }

      const newBody = tab.getBody();

      // Set the state with the new body
      this.setState({ activeTab: tabId, body: newBody });

      // Activate the new body if this scene is active
      if (this.isActive && typeof newBody.activate === 'function' && !newBody.isActive) {
        newBody.activate();
      }
    }
  }

  public activate() {
    super.activate();
    // Ensure body is activated when scene activates
    if (this.state.body && typeof this.state.body.activate === 'function' && !this.state.body.isActive) {
      this.state.body.activate();
    }
  }

  public deactivate(): void {
    super.deactivate();
    // Deactivate body when scene deactivates
    if (this.state.body && typeof this.state.body.deactivate === 'function' && this.state.body.isActive) {
      this.state.body.deactivate();
    }
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
  const { tabs, activeTab, body, controls } = model.useState();

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
        <TabsBar style={{ border: 'none', flexShrink: 0 }}>
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onChangeTab={() => model.setActiveTab(tab.id)}
            />
          ))}
        </TabsBar>
        {controls && controls.length > 0 && (
          <div className={controlsContainerFix} style={{ display: 'flex', gap: '0px', alignItems: 'center', flexShrink: 1, flexGrow: 0, minWidth: 0 }}>
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
        <body.Component model={body} />
      </div>
    </div>
  );
}
