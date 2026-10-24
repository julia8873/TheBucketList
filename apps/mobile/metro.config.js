const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// En builds nativos (Gradle en Windows), unstable_serverRoot hace que Metro busque
// el entryFile (index.js) en la raíz del monorepo en lugar de apps/mobile.
if (config.server) {
  delete config.server.unstable_serverRoot;
}

// Las apps de desarrollo compiladas con la raíz del monorepo (p. ej. con EAS) piden el bundle
// como `/apps/mobile/index.bundle`. Como arriba quitamos esa raíz, Metro buscaba
// `apps/mobile/apps/mobile/index` y devolvía "Unable to resolve module ./apps/mobile/index" / 404.
// Aquí se reescribe la ruta para aceptar ambas formas (`/index.bundle` y `/apps/mobile/index.bundle`).
const previousEnhance = config.server && config.server.enhanceMiddleware;
config.server = {
  ...(config.server || {}),
  enhanceMiddleware: (middleware, metroServer) => {
    const base = previousEnhance ? previousEnhance(middleware, metroServer) : middleware;
    return (req, res, next) => {
      if (req.url && req.url.startsWith('/apps/mobile/')) {
        req.url = req.url.replace('/apps/mobile/', '/');
      }
      return base(req, res, next);
    };
  },
};

module.exports = config;
