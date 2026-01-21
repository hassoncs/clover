const { tailwindPreset } = require('@clover/theme/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    '../packages/ui/src/**/*.{js,jsx,ts,tsx}',
    '../packages/physics/**/*.{js,jsx,ts,tsx}',
    './.storybook/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [tailwindPreset],
  theme: {
    extend: {},
  },
  plugins: [],
};