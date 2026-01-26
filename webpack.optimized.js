const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  const config = {
    entry: './src/module.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'module.js',
      library: {
        type: 'system',
      },
      publicPath: '',
    },
    externals: [
      // Grafana core packages provided at runtime
      'react',
      'react-dom',
      '@grafana/data',
      '@grafana/ui',
      '@grafana/runtime',
      '@emotion/css',
      // Try externalizing common dependencies that Grafana provides
      'lodash',
      'rxjs',
      /^rxjs\/.*/,
      // Note: react-router-dom cannot be externalized as Grafana provides v5 but scenes needs v6
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    optimization: {
      minimize: isProd,
      usedExports: true,
      sideEffects: false,
      concatenateModules: true,
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules\/(?!@grafana\/scenes)/,
          use: {
            loader: 'swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
                target: 'es2022',
              },
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/plugin.json', to: '.' },
          { from: 'src/img', to: 'img', noErrorOnMissing: true },
        ],
      }),
    ],
  };

  config.devtool = 'source-map';

  return config;
};
