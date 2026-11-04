const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

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

const mobileNodeModules = path.resolve(__dirname, 'node_modules');
const rootNodeModules = path.resolve(__dirname, '../../node_modules');

config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: [
    mobileNodeModules,
    rootNodeModules,
  ],
  extraNodeModules: {
    ...(config.resolver && config.resolver.extraNodeModules),
    '@': path.resolve(__dirname, 'src'),
    react: path.resolve(mobileNodeModules, 'react'),
    'react-dom': path.resolve(mobileNodeModules, 'react-dom'),
  },
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
      try {
        const filePath = require.resolve(normalized, {
          paths: [mobileNodeModules],
        });
        return {
          type: 'sourceFile',
          filePath,
        };
      } catch (_) {}
    }

    // 4. Si es la entrada del proyecto (ej: '.\index', './index', 'index', 'index.js')
    // Solo aplicar cuando se pide desde la raíz o el bundler, nunca dentro de node_modules o paquetes
    const isInsidePackage =
      context.originModulePath &&
      (/[\\/]node_modules[\\/]/.test(context.originModulePath) ||
       /[\\/]packages[\\/]/.test(context.originModulePath) ||
       /[\\/]src[\\/]/.test(context.originModulePath));

    if (
      !isInsidePackage &&
      (normalized === './index' ||
       normalized === './index.js' ||
       normalized === 'index' ||
       normalized === 'index.js')
    ) {
      try {
        const filePath = path.resolve(__dirname, 'index.js');
        return {
          type: 'sourceFile',
          filePath,
        };
      } catch (_) {}
    }

    // 5. Delegar en la cadena de resolvers de Expo (tsconfig paths, etc.)
    try {
      return context.resolveRequest(context, normalized, platform);
    } catch (err) {
      // Fallback directo para alias '@/...' hacia 'apps/mobile/src/...'
      if (normalized.startsWith('@/')) {
        const subPath = normalized.slice(2);
        const resolvedPath = path.resolve(__dirname, 'src', subPath);
        return context.resolveRequest(context, resolvedPath, platform);
      }
      if (normalized !== moduleName) {
        return context.resolveRequest(context, moduleName, platform);
      }
      throw err;
    }
  },
};

module.exports = config;
