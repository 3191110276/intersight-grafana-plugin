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
      // Only Grafana core packages are provided at runtime
      // @grafana/scenes must be bundled with the plugin
      'react',
      'react-dom',
      '@grafana/data',
      '@grafana/ui',
      '@grafana/runtime',
      '@emotion/css',
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    // Optimization settings for production
    optimization: {
      minimize: isProd,
      usedExports: true, // Enable tree shaking
      sideEffects: false, // Assume all modules have no side effects (enables more aggressive tree shaking)
      concatenateModules: true, // Merge modules into a single scope (scope hoisting)
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
          { from: 'LICENSE', to: '.' },
        ],
      }),
    ],
  };

  // Configure source maps
  // Use source-map with embedded source content
  // Don't package src/ directory separately - let validator get source from sourcesContent in the map
  config.devtool = 'source-map';

  return config;
};
