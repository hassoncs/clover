import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

export default defineConfig({
	integrations: [react(), tailwind()],
	vite: {
		resolve: {
			alias: {
				"react-native": "react-native-web",
			},
		},
		define: {
			global: "window",
		},
	},
});
