const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.blockList = [
  /apps\/api\/.*/,
  /apps\/admin-web\/.*/,
  /apps\/salon-mobile\/.*/,
  /\.git\/.*/,
  /infra\/.*/,
];

module.exports = config;
