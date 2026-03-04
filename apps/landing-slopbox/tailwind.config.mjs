import { tailwindPreset } from "@slopcade/theme/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	presets: [tailwindPreset],
	theme: {
		extend: {
			colors: {
				slopbox: {
					primary: "#0E1117",
					secondary: "#22D3EE",
					accent: "#F43F5E",
					background: "#05070B",
					surface: "#111827",
					text: "#E5E7EB",
					textSecondary: "#9CA3AF",
				},
			},
			fontFamily: {
				heading: ["Inter", "sans-serif"],
				body: ["Inter", "sans-serif"],
			},
		},
	},
	plugins: [],
};
