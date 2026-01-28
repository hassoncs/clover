import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
    resolveNodeCompatibilityIssues: {
      enabled: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@slopcade/shared': path.resolve(__dirname, '../shared/src'),
      // Also resolve @/ for shared package imports
      '@/types': path.resolve(__dirname, '../shared/src/types'),
      '@/expressions': path.resolve(__dirname, '../shared/src/expressions'),
      '@/systems': path.resolve(__dirname, '../shared/src/systems'),
      '@/events': path.resolve(__dirname, '../shared/src/events'),
      '@/tags': path.resolve(__dirname, '../shared/src/tags'),
      '@/utils': path.resolve(__dirname, '../shared/src/utils'),
      '@/validation': path.resolve(__dirname, '../shared/src/validation'),
      '@/economy': path.resolve(__dirname, '../shared/src/economy'),
      '@/generator': path.resolve(__dirname, '../shared/src/generator'),
    },
  },
});
