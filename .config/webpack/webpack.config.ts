import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig from '@grafana/plugin-configs/webpack.config';

const config = async (env: any): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);
  return merge(baseConfig, {
    // Add custom webpack config here
  });
};

export default config;
