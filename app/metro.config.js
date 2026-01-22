const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

// Resolve box2d path from package.json link (source of truth)
function getBox2dRoot() {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const box2dSpec = pkg.dependencies?.["react-native-box2d"] || "";
  
  if (box2dSpec.startsWith("link:")) {
    const linkPath = box2dSpec.replace("link:", "");
    // If absolute path, use directly; otherwise resolve relative to projectRoot
    return path.isAbsolute(linkPath) ? linkPath : path.resolve(projectRoot, linkPath);
  }
  
  // Fallback to node_modules symlink resolution
  const symlinkPath = path.join(projectRoot, "node_modules", "react-native-box2d");
  return fs.realpathSync(symlinkPath);
}

const box2dRoot = getBox2dRoot();

const baseConfig = getDefaultConfig(__dirname);

// Persistent cache configuration
baseConfig.cacheStores = [
  new (require("metro-cache").FileStore)({
    root: path.join(__dirname, ".metro-cache"),
  }),
];

// Optimize worker count for cold builds
baseConfig.maxWorkers = 4;

baseConfig.server = {
  port: 8085,
};

baseConfig.watchFolders = [monorepoRoot, box2dRoot];

baseConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(box2dRoot, "node_modules"),
];

baseConfig.resolver.extraNodeModules = {
  "react-native-box2d": box2dRoot,
};

// Force CommonJS resolution to avoid import.meta errors where possible
baseConfig.resolver.unstable_conditionNames = ["require", "import", "react-native"];
baseConfig.resolver.sourceExts = [...(baseConfig.resolver.sourceExts || []), "cjs"];
baseConfig.resolver.unstable_enablePackageExports = false;

// Apply NativeWind
const config = withNativeWind(baseConfig, { input: "./global.css" });

// Capture default resolver
const nativeWindResolver = config.resolver.resolveRequest;

// Custom resolver
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix box2d-wasm: Force UMD build to avoid "import.meta" errors in Metro
  if (moduleName === "box2d-wasm" && platform === "web") {
    const umdPath = path.resolve(__dirname, "node_modules/box2d-wasm/dist/umd/entry.js");
    return {
      type: "sourceFile",
      filePath: umdPath,
    };
  }

  // Chain to NativeWind -> Metro
  if (nativeWindResolver) {
    return nativeWindResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
