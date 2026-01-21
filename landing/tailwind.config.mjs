import { tailwindPreset } from '@clover/theme/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  presets: [tailwindPreset],
  theme: {
    extend: {},
  },
  plugins: [],
};
