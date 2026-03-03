const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { withRozenite } = require("@rozenite/metro");

const METRO_PORT = 8089;

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const baseConfig = getDefaultConfig(__dirname);

baseConfig.server = {
	...baseConfig.server,
	port: METRO_PORT,
};

baseConfig.watchFolders = [monorepoRoot];

baseConfig.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(monorepoRoot, "node_modules"),
];

const nativeWindConfig = withNativeWind(baseConfig, { input: "./global.css" });

const isDev = process.env.NODE_ENV !== "production";
const rozeniteEnabled =
	process.env.WITH_ROZENITE === "true" ||
	(isDev && process.env.WITH_ROZENITE !== "false");

module.exports = withRozenite(nativeWindConfig, {
	enabled: rozeniteEnabled,
});
