const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// En builds nativos (Gradle en Windows), unstable_serverRoot hace que Metro busque
// el entryFile (index.js) en la raíz del monorepo en lugar de apps/mobile.
if (config.server) {
  delete config.server.unstable_serverRoot;
}

function rewriteAppsMobilePath(url) {
  if (!url || typeof url !== 'string') return url;
  return url
    .replace(/\/apps\/mobile\//g, '/')
    .replace(/\\apps\\mobile\\/g, '\\')
    .replace(/^apps[/\\]mobile[/\\]/g, '');
}

// Las apps de desarrollo compiladas con la raíz del monorepo (p. ej. con EAS) piden el bundle
// como `/apps/mobile/index.bundle`. Como arriba quitamos esa raíz, Metro buscaba
// `apps/mobile/apps/mobile/index` y devolvía "Unable to resolve module ./apps/mobile/index" / 404.
// Metro procesa URLs mediante rewriteRequestUrl tanto en HTTP como en WebSockets (HMR),
// y enhanceMiddleware para el servidor HTTP.
const previousEnhance = config.server && config.server.enhanceMiddleware;
const previousRewrite = config.server && config.server.rewriteRequestUrl;

config.server = {
  ...(config.server || {}),
  rewriteRequestUrl: (url) => {
    const rewritten = rewriteAppsMobilePath(url);
    return previousRewrite ? previousRewrite(rewritten) : rewritten;
  },
  enhanceMiddleware: (middleware, metroServer) => {
    const base = previousEnhance ? previousEnhance(middleware, metroServer) : middleware;
    return (req, res, next) => {
      if (req.url) {
        req.url = rewriteAppsMobilePath(req.url);
      }
      return base(req, res, next);
    };
  },
};

const path = require('path');

// Fallback en el resolver por si la entrada o algún módulo intenta resolver `./apps/mobile/...`
// y forzar una única instancia de React / React-DOM desde apps/mobile en todo el monorepo.
const previousResolveRequest = config.resolver && config.resolver.resolveRequest;
config.resolver = {
  ...(config.resolver || {}),
  resolveRequest: (context, moduleName, platform) => {
    // 1. Normalizar barras invertidas de Windows (\ -> /)
    let normalized = (moduleName || '').replace(/\\/g, '/');

    // 2. Si viene como './apps/mobile/...' o 'apps/mobile/...', limpiar a './...'
    normalized = normalized.replace(/^(?:\.?\/)*apps\/mobile\//, './');

    // 3. Forzar única instancia de React / React-DOM desde apps/mobile
    if (
      normalized === 'react' ||
      normalized.startsWith('react/') ||
      normalized === 'react-dom' ||
      normalized.startsWith('react-dom/')
    ) {
      return context.resolveRequest(
        { ...context, originModulePath: path.resolve(__dirname, 'package.json') },
        normalized,
        platform
      );
    }

    // 4. Si es la entrada del proyecto (ej: '.\index', './index', 'index', 'index.js')
    if (
      normalized === './index' ||
      normalized === './index.js' ||
      normalized === 'index' ||
      normalized === 'index.js'
    ) {
      return context.resolveRequest(
        { ...context, originModulePath: path.resolve(__dirname, 'package.json') },
        './index',
        platform
      );
    }

    try {
      if (previousResolveRequest) {
        return previousResolveRequest(context, normalized, platform);
      }
      return context.resolveRequest(context, normalized, platform);
    } catch (err) {
      if (normalized !== moduleName) {
        try {
          if (previousResolveRequest) {
            return previousResolveRequest(context, moduleName, platform);
          }
          return context.resolveRequest(context, moduleName, platform);
        } catch (_) {}
      }
      throw err;
    }
  },
};

module.exports = config;
