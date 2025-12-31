// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// #1 - Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// #2 - Try resolving with project modules first, then monorepo modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// #3 - Force resolving nested modules to the folders below
config.resolver.disableHierarchicalLookup = true;

// Disable package exports to avoid compatibility issues (RN 0.79+)
// See: https://github.com/expo/expo/discussions/36551
config.resolver.unstable_enablePackageExports = false;

// #4 - When importing from the monorepo, make sure to include it for transformation
config.transformer.unstable_allowRequireContext = true;

// Use turborepo to restore the cache when possible
config.cacheStores = [
  new FileStore({
    root: path.join(projectRoot, 'node_modules', '.cache', 'metro'),
  }),
];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
