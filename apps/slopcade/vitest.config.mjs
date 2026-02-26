import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import glsl from "vite-plugin-glsl";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MOCK_PATHS = {
	"react-native-reanimated": path.resolve(
		__dirname,
		"__mocks__/react-native-reanimated.js",
	),
	"react-native-gesture-handler": path.resolve(
		__dirname,
		"__mocks__/react-native-gesture-handler.js",
	),
	"react-native-svg": path.resolve(__dirname, "__mocks__/react-native-svg.js"),
	"@expo/vector-icons": path.resolve(
		__dirname,
		"__mocks__/@expo/vector-icons.js",
	),
	"@react-native-community/slider": path.resolve(
		__dirname,
		"__mocks__/slider.js",
	),
	"react-native": path.resolve(__dirname, "__mocks__/react-native.js"),
};

const rnTestPlugin = {
	name: "rn-test-compat",
	enforce: "pre",
	async resolveId(id) {
		if (id === "react-native" || id.startsWith("react-native/")) {
			return this.resolve("react-native-web");
		}
	},
	transform(code, id) {
		if (
			id.includes("node_modules") &&
			(id.includes("react-native") || id.includes("react-native-svg")) &&
			!id.includes("react-native-web") &&
			!id.includes("mock") &&
			code.includes("import typeof")
		) {
			return { code: code.replace(/import typeof[^\n]+\n/g, ""), map: null };
		}
		let result = code;
		let changed = false;
		for (const [pkg, mockPath] of Object.entries(MOCK_PATHS)) {
			const mockUrl = mockPath.replace(/\\/g, "/");
			if (!result.includes(pkg)) continue;
			let dq, sq;
			if (pkg === "react-native") {
				// Exact match only — must not match react-native-web, react-native-reanimated, etc.
				dq = /"react-native"(?![-\w])/g;
				sq = /'react-native'(?![-\w])/g;
			} else {
				const escaped = pkg
					.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
					.replace(/\//g, "\\/");
				dq = new RegExp(`"${escaped}(\\/[^"]*)?"`, "g");
				sq = new RegExp(`'${escaped}(\\/[^']*)?'`, "g");
			}
			result = result.replace(dq, `"${mockUrl}"`);
			result = result.replace(sq, `'${mockUrl}'`);
			changed = true;
		}
		if (changed) return { code: result, map: null };
	},
};

export default defineConfig({
	define: {
		__DEV__: true,
	},
	plugins: [rnTestPlugin, react(), tsconfigPaths(), glsl()],
	resolve: {
		extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js", ".json"],
		alias: [
			{ find: "react-native", replacement: "react-native-web" },
			{
				find: "@expo/vector-icons",
				replacement: path.resolve(__dirname, "__mocks__/@expo/vector-icons.js"),
			},
		],
	},
	test: {
		server: {
			deps: {
				inline: [
					"react-native-web",
					"react-native-svg",
					"@testing-library/react-native",
					/@slopcade\/.*/,
				],
			},
		},
		include: [
			"lib/**/*.test.ts",
			"lib/**/*.test.tsx",
			"components/**/*.test.ts",
			"components/**/*.test.tsx",
		],
		globals: true,
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
	},
});
