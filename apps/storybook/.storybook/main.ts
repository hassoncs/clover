import type { StorybookConfig } from "@storybook/react-webpack5";
import tailwindcssPostcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import path from "path";
import type { Configuration, RuleSetRule } from "webpack";
import webpack from "webpack";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagesPath = path.resolve(__dirname, "../../../packages");
const sharedPath = path.resolve(__dirname, "../../../shared");

const config: StorybookConfig = {
	stories: [
		"../../../packages/ui/**/*.stories.@(js|jsx|ts|tsx)",
		"../../../packages/design-canvas/**/*.stories.@(js|jsx|ts|tsx)",
	],

	addons: ["@storybook/addon-essentials", "@storybook/addon-interactions"],

	staticDirs: [
		{
			from: "../../../node_modules/.pnpm/canvaskit-wasm@0.40.0/node_modules/canvaskit-wasm/bin/full",
			to: "/",
		},
		{
			from: "../../../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts",
			to: "/fonts",
		},
		{
			from: "../static-fonts",
			to: "/fonts",
		},
	],

	framework: {
		name: "@storybook/react-webpack5",
		options: {},
	},

	typescript: {
		reactDocgen: false,
	},

	docs: {
		autodocs: true,
	},

	webpackFinal: async (config: Configuration) => {
		config.module = config.module || {};
		config.module.rules = config.module.rules || [];

		config.module.rules = config.module.rules.filter((rule) => {
			if (!rule || typeof rule !== "object") return true;
			return !rule.test?.toString().includes("css");
		});

		config.module.rules.push({
			test: /\.css$/,
			use: [
				"style-loader",
				"css-loader",
				{
					loader: "postcss-loader",
					options: {
						postcssOptions: {
							plugins: [tailwindcssPostcss, autoprefixer],
						},
					},
				},
			],
		});

		// GLSL shader files - import as raw strings
		config.module.rules.push({
			test: /\.(glsl|vert|frag|vs|fs)$/,
			type: "asset/source",
		});

		config.module.rules.push({
			test: /\.(ts|tsx)$/,
			include: [packagesPath, sharedPath, path.resolve(__dirname, "../")],
			exclude: /node_modules/,
			use: {
				loader: "babel-loader",
				options: {
					presets: [
						[
							"@babel/preset-env",
							{
								targets: { esmodules: true },
								bugfixes: true,
							},
						],
						[
							"@babel/preset-react",
							{ runtime: "automatic", importSource: "nativewind" },
						],
						"@babel/preset-typescript",
						"nativewind/babel",
					],
				},
			},
		});

		config.module.rules.push({
			test: /\.(js|jsx|ts|tsx)$/,
			include: [
				/node_modules\/@expo\/vector-icons/,
				/node_modules\/expo-haptics/,
				/node_modules\/expo-modules-core/,
				/node_modules\/react-native-vector-icons/,
				/node_modules\/react-native-css-interop/,
			],
			use: {
				loader: "babel-loader",
				options: {
					sourceType: "unambiguous",
					presets: [
						[
							"@babel/preset-env",
							{
								targets: { esmodules: true },
								bugfixes: true,
							},
						],
						["@babel/preset-react", { runtime: "automatic" }],
						"@babel/preset-typescript",
					],
					plugins: [["@babel/plugin-transform-runtime", { regenerator: true }]],
				},
			},
		});

		config.resolve = config.resolve || {};
		config.resolve.extensions = [
			".web.tsx",
			".web.ts",
			".tsx",
			".ts",
			".web.js",
			".js",
			".jsx",
			...(config.resolve.extensions || []),
		];
		// Prioritize compiled JS over react-native source fields.
		// Without this, packages with 'react-native: src/index.ts' get their
		// TypeScript source fed directly to webpack, which has no TS loader for node_modules.
		config.resolve.mainFields = ["browser", "module", "main"];

		config.resolve.alias = {
			...config.resolve.alias,
			"react-native$": "react-native-web",
			"@slopcade/ui": path.resolve(__dirname, "../../../packages/ui/src"),
			"@slopcade/design-canvas": path.resolve(
				__dirname,
				"../../../packages/design-canvas/src",
			),
			"@slopcade/theme": path.resolve(__dirname, "../../../packages/theme/src"),
			"@slopcade/physics": path.resolve(
				__dirname,
				"../../../packages/physics/src",
			),
			"@slopcade/shared": path.resolve(__dirname, "../../../shared/src"),
			"expo-haptics": path.resolve(__dirname, "../stubs/expo-haptics.js"),
			"expo-modules-core": path.resolve(
				__dirname,
				"../stubs/expo-modules-core.js",
			),
			"expo-font": path.resolve(__dirname, "../stubs/expo-font.js"),
		};

		config.plugins = config.plugins || [];

		// Replace Skia.web.js at the resolved-path level.
		// The alias approach doesn't work because the internal import
		// is `export { Skia } from "./Skia"` (relative), which webpack
		// resolves via extension priority (.web.js) without hitting aliases.
		// NormalModuleReplacementPlugin intercepts AFTER path resolution.
		config.plugins.push(
			new webpack.NormalModuleReplacementPlugin(
				/Skia\.web\.js$/,
				(resource: {
					resource?: string;
					createData?: { resource?: string };
				}) => {
					const res = resource.createData?.resource ?? resource.resource ?? "";
					if (
						res.includes("@shopify/react-native-skia") &&
						res.endsWith("Skia.web.js")
					) {
						const stub = path.resolve(__dirname, "../stubs/skia-web.js");
						if (resource.createData) {
							resource.createData.resource = stub;
						} else {
							resource.resource = stub;
						}
					}
				},
			),
		);

		config.plugins.push(
			new webpack.DefinePlugin({
				__DEV__: JSON.stringify(false),
			}),
		);

		return config;
	},
};

export default config;
