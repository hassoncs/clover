const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const box2dRoot = path.join(projectRoot, "node_modules/react-native-box2d");

const baseConfig = getSentryExpoConfig(__dirname);

baseConfig.cacheStores = [
  new (require("metro-cache").FileStore)({
    root: path.join(__dirname, ".metro-cache"),
  }),
];

baseConfig.maxWorkers = 4;

baseConfig.server = {
  port: 8085,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // COOP/COEP headers required for SharedArrayBuffer (Godot 4.5 + Rapier)
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      return middleware(req, res, next);
    };
  },
};

baseConfig.watchFolders = [monorepoRoot];

baseConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

baseConfig.resolver.unstable_enableSymlinks = true;

baseConfig.resolver.unstable_conditionNames = ["require", "import", "react-native"];
baseConfig.resolver.sourceExts = [...(baseConfig.resolver.sourceExts || []), "cjs"];
baseConfig.resolver.unstable_enablePackageExports = false;

// Configure path aliases for monorepo packages
baseConfig.resolver.extraNodeModules = {
  ...baseConfig.resolver.extraNodeModules,
  // Map @/ in packages to their src directories
  '@slopcade/theme': path.resolve(monorepoRoot, 'packages/theme/src'),
  '@slopcade/ui': path.resolve(monorepoRoot, 'packages/ui/src'),
  '@slopcade/shared': path.resolve(monorepoRoot, 'shared/src'),
  '@slopcade/game-inspector-mcp': path.resolve(monorepoRoot, 'packages/game-inspector-mcp/src'),
};

const config = withNativeWind(baseConfig, { input: "./global.css" });

// Re-apply server config after withNativeWind to ensure headers are set
config.server = {
  ...config.server,
  port: 8085,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // COOP/COEP headers required for SharedArrayBuffer (Godot 4.5 + Rapier)
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      
      // Disable caching for Godot assets (.pck, .wasm) to ensure fresh loads during development
      if (req.url && (req.url.endsWith('.pck') || req.url.endsWith('.wasm'))) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      
      return middleware(req, res, next);
    };
  },
};

const nativeWindResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "box2d-wasm" && platform === "web") {
    const umdPath = path.resolve(monorepoRoot, "node_modules/box2d-wasm/dist/umd/entry.js");
    return {
      type: "sourceFile",
      filePath: umdPath,
    };
  }

  // Handle quickjs-emscripten subpath exports (Metro doesn't support package.json exports)
  const quickjsMatch = moduleName.match(/^@jitl\/(quickjs-wasmfile-(?:debug|release)-(?:sync|asyncify))\/emscripten-module$/);
  if (quickjsMatch) {
    const variant = quickjsMatch[1];
    const quickjsPath = path.resolve(
      monorepoRoot,
      `node_modules/.pnpm/@jitl+${variant}@0.31.0/node_modules/@jitl/${variant}/dist/emscripten-module.cjs`
    );
    return {
      type: "sourceFile",
      filePath: quickjsPath,
    };
  }

  // Handle @/ imports from monorepo packages
  if (moduleName.startsWith('@/')) {
    // Check if this is being resolved from a monorepo package
    const originPath = context.originModulePath || '';
    
    if (originPath.includes('packages/theme/')) {
      const resolvedPath = path.resolve(monorepoRoot, 'packages/theme/src', moduleName.replace('@/', ''));
      if (fs.existsSync(resolvedPath + '.ts') || fs.existsSync(resolvedPath + '.tsx')) {
        return {
          type: 'sourceFile',
          filePath: resolvedPath + (fs.existsSync(resolvedPath + '.tsx') ? '.tsx' : '.ts'),
        };
      }
    }
    
    if (originPath.includes('packages/ui/')) {
      const resolvedPath = path.resolve(monorepoRoot, 'packages/ui/src', moduleName.replace('@/', ''));
      if (fs.existsSync(resolvedPath + '.ts') || fs.existsSync(resolvedPath + '.tsx')) {
        return {
          type: 'sourceFile',
          filePath: resolvedPath + (fs.existsSync(resolvedPath + '.tsx') ? '.tsx' : '.ts'),
        };
      }
    }
    
    if (originPath.includes('shared/')) {
      const resolvedPath = path.resolve(monorepoRoot, 'shared/src', moduleName.replace('@/', ''));
      if (fs.existsSync(resolvedPath + '.ts') || fs.existsSync(resolvedPath + '.tsx')) {
        return {
          type: 'sourceFile',
          filePath: resolvedPath + (fs.existsSync(resolvedPath + '.tsx') ? '.tsx' : '.ts'),
        };
      }
    }
  }

  if (nativeWindResolver) {
    return nativeWindResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Log to verify config is loaded
console.log('[metro.config.js] Server config:', config.server);

module.exports = config;
