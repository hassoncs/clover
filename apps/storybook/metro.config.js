const { getDefaultConfig, mergeConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const workspacePackages = [
  path.resolve(__dirname, '../../packages/ui'),
  path.resolve(__dirname, '../../packages/physics'),
  path.resolve(__dirname, '../../packages/theme'),
];

config.watchFolders = [...config.watchFolders, ...workspacePackages];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, './node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

config.resolver.alias = {
  '@slopcade/ui': path.resolve(__dirname, '../../packages/ui/src'),
  '@slopcade/physics': path.resolve(__dirname, '../../packages/physics/src'),
  '@slopcade/theme': path.resolve(__dirname, '../../packages/theme/src'),
};

module.exports = config;