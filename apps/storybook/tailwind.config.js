const { tailwindPreset } = require('@slopcade/theme/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './.storybook/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
    '../../packages/physics/src/**/*.{js,jsx,ts,tsx}',
    '../../packages/theme/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [tailwindPreset],
  theme: {
    extend: {},
  },
  plugins: [],
};