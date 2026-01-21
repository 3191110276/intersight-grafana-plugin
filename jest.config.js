const { grafanaJestConfig } = require('@grafana/plugin-configs/jest.config');

module.exports = {
  ...grafanaJestConfig,
  testEnvironment: 'jsdom',
};
