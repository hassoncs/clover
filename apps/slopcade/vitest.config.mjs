import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import glsl from "vite-plugin-glsl";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	define: {
		__DEV__: true,
	},
	plugins: [react(), tsconfigPaths(), glsl()],
	resolve: {
		extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js", ".json"],
		alias: {
			"react-native": "react-native-web",
		},
	},
	test: {
		server: {
			deps: {
				inline: [
					"react-native-web",
					"@testing-library/react-native",
					/@slopcade\/.*/,
				],
			},
		},
		alias: {
			"react-native-reanimated": path.resolve(
				__dirname,
				"__mocks__/react-native-reanimated.js",
			),
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
