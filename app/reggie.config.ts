import { defineConfig } from '@chriscode/reggie';

export default defineConfig({
  examples: {
    sourceDir: 'app/examples',
    include: '**/*.tsx',
    exclude: ['_layout.tsx', '*.test.tsx'],
    output: 'lib/registry/generated/examples.ts',
    importAlias: '@/app/examples',
    urlPrefix: '/examples',
    typeImports: `import type { ExampleEntry, ExampleMeta, LazyComponent } from "../types";`,
    types: {
      id: 'ExampleId',
      entry: 'ExampleEntry',
      meta: 'ExampleMeta',
    },
  },
});
