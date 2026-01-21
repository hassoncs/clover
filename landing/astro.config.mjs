import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    resolve: {
      alias: {
        'react-native': 'react-native-web',
      },
    },
    define: {
      global: 'window', // Polyfill global for some RN libs
    },
  },
});
