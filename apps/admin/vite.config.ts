import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	// Expose EXPO_PUBLIC_* vars (sourced from hush) in addition to VITE_*
	envPrefix: ["VITE_", "EXPO_PUBLIC_"],
	server: {
		port: 8787,
	},
});
