const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ─── Monorepo support ────────────────────────────────────────────────────────
// Watch all packages in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve modules from both the app and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure Metro can resolve package.json "main" fields for local packages
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
