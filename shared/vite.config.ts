import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
	plugins: [glsl()],
	build: {
		lib: {
			entry: "src/index.ts",
			formats: ["es"],
			fileName: "index",
		},
		rollupOptions: {
			external: ["drizzle-orm", "drizzle-zod", "quickjs-emscripten", "zod"],
		},
	},
});
