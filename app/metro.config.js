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

const config = withNativeWind(baseConfig, { input: "./global.css" });

const nativeWindResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "box2d-wasm" && platform === "web") {
    const umdPath = path.resolve(monorepoRoot, "node_modules/box2d-wasm/dist/umd/entry.js");
    return {
      type: "sourceFile",
      filePath: umdPath,
    };
  }

  if (nativeWindResolver) {
    return nativeWindResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
