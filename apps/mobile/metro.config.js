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

// Fallback en el resolver por si la entrada o algún módulo intenta resolver `./apps/mobile/...`
const previousResolveRequest = config.resolver && config.resolver.resolveRequest;
config.resolver = {
  ...(config.resolver || {}),
  resolveRequest: (context, moduleName, platform) => {
    const cleaned = moduleName.replace(/^(?:\.?[\/\\])*apps[\/\\]mobile[\/\\]/, './');
    const targetModule = cleaned !== moduleName ? cleaned : moduleName;
    if (previousResolveRequest) {
      return previousResolveRequest(context, targetModule, platform);
    }
    return context.resolveRequest(context, targetModule, platform);
  },
};

module.exports = config;
