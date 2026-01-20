const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Get base config
const baseConfig = getDefaultConfig(__dirname);

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
  if (moduleName === "box2d-wasm") {
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
