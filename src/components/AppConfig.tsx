import React from 'react';
import { AppPluginMeta, PluginConfigPageProps } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta> {}

export function AppConfig(props: AppConfigProps) {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <h3>Scenes App Configuration</h3>
      <p>This app plugin uses Grafana Scenes for building interactive dashboards.</p>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    padding: theme.spacing(2),
  }),
});
