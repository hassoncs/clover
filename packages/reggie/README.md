# reggie

Auto-discover modules and generate type-safe lazy registries for React.

## Install

```bash
npm install reggie
```

## Quick Start

1. Create `reggie.config.ts`:

```typescript
import { defineConfig } from 'reggie';

export default defineConfig({
  examples: {
    sourceDir: 'app/examples',
    include: '**/*.tsx',
    exclude: ['_layout.tsx', '*.test.tsx'],
    output: 'lib/registry/generated/examples.ts',
    importAlias: '@/app/examples',
    urlPrefix: '/examples',
    typeImports: `import type { ExampleEntry, ExampleMeta, LazyComponent } from "../types";`,
  },
});
```

2. Add metadata to your source files:

```tsx
// app/examples/my_example.tsx
export const metadata = {
  title: "My Example",
  description: "Does something cool.",
};

export default function MyExample() {
  return <div>...</div>;
}
```

3. Run the generator:

```bash
npx reggie
```

## CLI

```bash
npx reggie              # Generate all registries
npx reggie --watch      # Watch mode
npx reggie --check      # Check if files are stale (for CI)
```

## Generated Output

For each registry, reggie generates:

- **Type-safe ID union**: `type ExampleId = "foo" | "bar"`
- **Static metadata array**: `EXAMPLES` with all entries
- **Lookup map**: `EXAMPLES_BY_ID` for O(1) access
- **Lazy loaders**: `getExampleComponent(id)` for React Suspense
- **Async loader**: `loadExample(id)` for programmatic use

## Configuration

| Option | Description |
|--------|-------------|
| `sourceDir` | Directory to scan (relative to project root) |
| `include` | Glob pattern for files to include |
| `exclude` | Patterns to exclude |
| `output` | Output file path |
| `importAlias` | Import alias for generated imports |
| `urlPrefix` | URL prefix for href generation |
| `typeImports` | Custom type imports for generated file |
| `types.id` | Custom ID type name (default: `${Name}Id`) |
| `types.entry` | Custom entry type name |
| `types.meta` | Custom meta type name |

## License

MIT
