const path = require("path");
const fs = require("fs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { withRozenite } = require("@rozenite/metro");

const METRO_PORT = 8085;

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "..");

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

baseConfig.resolver.sourceExts = [...baseConfig.resolver.sourceExts, "glsl"];

baseConfig.transformer.babelTransformerPath = require.resolve(
	"./metro-glsl-transformer",
);

function getPackageCjsPath(packageName, moduleName, root) {
	const directPath = path.resolve(root, "node_modules", packageName);
	if (moduleName === packageName) {
		const cjsPath = path.resolve(directPath, "index.js");
		if (fs.existsSync(cjsPath)) return cjsPath;
	} else if (moduleName.startsWith(packageName + "/")) {
		const subpath = moduleName.replace(packageName + "/", "");
		const cjsPath = path.resolve(directPath, `${subpath}.js`);
		if (fs.existsSync(cjsPath)) return cjsPath;
	}

	const pnpmPath = path.resolve(root, "node_modules/.pnpm");
	if (!fs.existsSync(pnpmPath)) return null;

	const packagePrefix = packageName.replace("/", "+") + "@";
	const entries = fs.readdirSync(pnpmPath, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory() || !entry.name.startsWith(packagePrefix)) continue;
		const pkgDir = path.resolve(
			pnpmPath,
			entry.name,
			"node_modules",
			packageName,
		);
		if (moduleName === packageName) {
			const cjsPath = path.resolve(pkgDir, "index.js");
			if (fs.existsSync(cjsPath)) return cjsPath;
		} else if (moduleName.startsWith(packageName + "/")) {
			const subpath = moduleName.replace(packageName + "/", "");
			const cjsPath = path.resolve(pkgDir, `${subpath}.js`);
			if (fs.existsSync(cjsPath)) return cjsPath;
		}
	}
	return null;
}

const CJS_FORCE_PACKAGES = ["jotai", "zustand"];

function getPackageUmdPath(packageName, root) {
	const packagePath = path.resolve(
		root,
		"node_modules",
		packageName,
		"dist/umd/index.js",
	);
	if (fs.existsSync(packagePath)) {
		return packagePath;
	}

	const pnpmPath = path.resolve(root, "node_modules/.pnpm");
	if (!fs.existsSync(pnpmPath)) return null;

	const packagePrefix = packageName.replace("/", "+") + "@";
	const entries = fs.readdirSync(pnpmPath, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory() || !entry.name.startsWith(packagePrefix)) {
			continue;
		}

		const umdPath = path.resolve(
			pnpmPath,
			entry.name,
			"node_modules",
			packageName,
			"dist/umd/index.js",
		);
		if (fs.existsSync(umdPath)) {
			return umdPath;
		}
	}

	return null;
}

const upstreamResolveRequest = baseConfig.resolver.resolveRequest;

// Helper to resolve promise/setimmediate/* submodules from pnpm store
function resolvePromiseSetimmediate(moduleName) {
	const match = moduleName.match(/^promise\/setimmediate\/(.+)$/);
	if (!match) return null;
	const subModule = match[1];

	// Try to find promise package in pnpm store
	const pnpmPath = path.resolve(monorepoRoot, "node_modules/.pnpm");
	if (!fs.existsSync(pnpmPath)) return null;

	const entries = fs.readdirSync(pnpmPath, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory() || !entry.name.startsWith("promise@")) continue;
		const subPath = path.resolve(
			pnpmPath,
			entry.name,
			"node_modules",
			"promise",
			"setimmediate",
			`${subModule}.js`,
		);
		if (fs.existsSync(subPath)) {
			return subPath;
		}
	}
	return null;
}

baseConfig.resolver.resolveRequest = (context, moduleName, platform) => {
	// Handle promise/setimmediate/* submodules
	if (moduleName.startsWith("promise/setimmediate/")) {
		const resolved = resolvePromiseSetimmediate(moduleName);
		if (resolved) {
			return { type: "sourceFile", filePath: resolved };
		}
	}

	if (moduleName === "@xyflow/react" || moduleName === "@xyflow/system") {
		const umdPath =
			getPackageUmdPath(moduleName, projectRoot) ||
			getPackageUmdPath(moduleName, monorepoRoot);
		if (umdPath) {
			return { type: "sourceFile", filePath: umdPath };
		}
	}

	for (const pkg of CJS_FORCE_PACKAGES) {
		if (moduleName === pkg || moduleName.startsWith(pkg + "/")) {
			const cjsPath =
				getPackageCjsPath(pkg, moduleName, projectRoot) ||
				getPackageCjsPath(pkg, moduleName, monorepoRoot);
			if (cjsPath) {
				return { type: "sourceFile", filePath: cjsPath };
			}
		}
	}

	if (upstreamResolveRequest) {
		return upstreamResolveRequest(context, moduleName, platform);
	}

	return context.resolveRequest(context, moduleName, platform);
};

const nativeWindConfig = withNativeWind(baseConfig, { input: "./global.css" });

// Auto-enable Rozenite in development, require explicit opt-in for production
const isDev = process.env.NODE_ENV !== "production";
const rozeniteEnabled =
	process.env.WITH_ROZENITE === "true" ||
	(isDev && process.env.WITH_ROZENITE !== "false");

module.exports = withRozenite(nativeWindConfig, {
	enabled: rozeniteEnabled,
});
