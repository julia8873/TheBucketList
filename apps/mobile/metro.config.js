const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// En builds nativos (Gradle en Windows), unstable_serverRoot hace que Metro busque
// el entryFile (index.js) en la raíz del monorepo en lugar de apps/mobile.
if (config.server) {
  delete config.server.unstable_serverRoot;
}

module.exports = config;
