const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

const baseConfig = getDefaultConfig(__dirname);

baseConfig.watchFolders = [monorepoRoot];

baseConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

function getJotaiCjsPath(moduleName, root) {
  const pnpmPath = path.resolve(root, "node_modules/.pnpm");
  if (!fs.existsSync(pnpmPath)) return null;

  const entries = fs.readdirSync(pnpmPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith("jotai@")) {
      const jotaiDir = path.resolve(
        pnpmPath,
        entry.name,
        "node_modules/jotai"
      );
      if (moduleName === "jotai") {
        const cjsPath = path.resolve(jotaiDir, "index.js");
        if (fs.existsSync(cjsPath)) return cjsPath;
      } else if (moduleName.startsWith("jotai/")) {
        const subpath = moduleName.replace("jotai/", "");
        const cjsPath = path.resolve(jotaiDir, `${subpath}.js`);
        if (fs.existsSync(cjsPath)) return cjsPath;
      }
    }
  }
  return null;
}

const upstreamResolveRequest = baseConfig.resolver.resolveRequest;

baseConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "jotai" || moduleName.startsWith("jotai/")) {
    const cjsPath =
      getJotaiCjsPath(moduleName, projectRoot) ||
      getJotaiCjsPath(moduleName, monorepoRoot);
    if (cjsPath) {
      return { type: "sourceFile", filePath: cjsPath };
    }
  }

  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(baseConfig, { input: "./global.css" });
