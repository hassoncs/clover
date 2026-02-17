import { tailwindPreset } from "@slopcade/theme/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	presets: [tailwindPreset],
	theme: {
		extend: {
			colors: {
				amen: {
					primary: "#1B3A6B",
					secondary: "#C9A84C",
					accent: "#6B3FA0",
					background: "#FDF8F0",
					surface: "#FFFFFF",
					text: "#2D2D2D",
					textSecondary: "#6B7280",
					error: "#B84233",
					success: "#5B7F3B",
				},
			},
			fontFamily: {
				heading: ["Lora", "serif"],
				body: ["Inter", "sans-serif"],
			},
		},
	},
	plugins: [],
};
