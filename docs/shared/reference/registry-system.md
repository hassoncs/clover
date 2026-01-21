# Universal Lazy Registry System

> **Type-safe, auto-discovered, Suspense-compatible module loading for React Native + Metro**

## Overview

The registry system automatically discovers modules with metadata exports, generates type-safe registries, and provides lazy loading compatible with React Suspense and Metro bundler.

```
Source Files → Build-time Scanner → Generated Registry → Type-safe Lazy Loading
```

## Quick Start

### Adding a New Example

1. Create `app/examples/my_example.tsx`:

```tsx
import type { ExampleMeta } from "@/lib/registry/types";

export const metadata: ExampleMeta = {
  title: "My Example",
  description: "Does something cool.",
};

export default function MyExample() {
  return <View>...</View>;
}
```

2. Run the generator (or it runs automatically with `pnpm dev`):

```bash
pnpm generate:registry
```

3. The example automatically appears in:
   - The demos list
   - The `ExampleId` type union
   - The lazy loading functions

### Using the Registry

```tsx
import { 
  EXAMPLES,           // Static metadata array
  EXAMPLES_BY_ID,     // Lookup by ID
  getExampleComponent, // Lazy component getter
  loadExample,        // Async loader
  type ExampleId      // Type-safe ID union
} from "@/lib/registry";

// List all examples (no lazy loading triggered)
EXAMPLES.map(e => <ListItem title={e.meta.title} href={e.href} />);

// Type-safe lazy loading with Suspense
const Example = getExampleComponent("pinball"); // TS validates the ID!
<Suspense fallback={<Loading />}>
  <Example />
</Suspense>

// Async loading (for non-component use)
const Component = await loadExample("pinball");
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Source Files (app/examples/*.tsx)                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ export const metadata: ExampleMeta = { title, description }  │   │
│  │ export default function MyExample() { ... }                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ pnpm generate:registry
┌─────────────────────────────────────────────────────────────────────┐
│  Generated Registry (lib/registry/generated/examples.ts)           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ export type ExampleId = "pinball" | "avalanche" | ...        │   │
│  │ export const EXAMPLES: ReadonlyArray<ExampleEntry> = [...]   │   │
│  │ export function getExampleComponent(id: ExampleId) {...}     │   │
│  │ export async function loadExample(id: ExampleId) {...}       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Consumer Code                                                      │
│  - Type-safe ID validation at compile time                         │
│  - Pre-created lazy components (stable React identity)             │
│  - Suspense-compatible loading                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `pnpm generate:registry` | One-time registry generation |
| `pnpm generate:registry:watch` | Watch mode (regenerates on file changes) |
| `pnpm dev` | Auto-generates registry before starting Metro |
| `pnpm dev:watch` | Watch mode + Metro in parallel |

## File Structure

```
app/
├── lib/registry/
│   ├── types.ts              # Type definitions
│   ├── index.ts              # Central export
│   └── generated/
│       └── examples.ts       # Auto-generated (checked in)
├── scripts/
│   └── generate-registry.mjs # The scanner/generator
└── app/examples/
    ├── pinball.tsx           # Each exports metadata
    ├── avalanche.tsx
    └── ...
```

## Generated Output

The generator produces:

### 1. Type-safe ID Union

```typescript
export type ExampleId = "avalanche" | "box2d" | "bridge" | "car" | ...;
```

### 2. Static Metadata Array

```typescript
export const EXAMPLES: ReadonlyArray<ExampleEntry & { id: ExampleId }> = [
  { id: "avalanche", href: "/examples/avalanche", meta: { title: "...", description: "..." } },
  ...
];
```

### 3. Pre-created Lazy Components

```typescript
const lazyComponents: Record<ExampleId, LazyComponent> = {
  "avalanche": lazy(() => import("@/app/examples/avalanche")),
  ...
};

export function getExampleComponent(id: ExampleId): LazyComponent {
  return lazyComponents[id];
}
```

### 4. Async Loader

```typescript
export async function loadExample(id: ExampleId): Promise<ComponentType> {
  const module = await import(`@/app/examples/${id}`);
  return module.default;
}
```

## Adding New Categories

To add a new category (e.g., shaders, effects):

### 1. Add Types

```typescript
// lib/registry/types.ts
export interface ShaderMeta {
  name: string;
  category: string;
}

export interface ShaderEntry extends RegistryEntryBase {
  meta: ShaderMeta;
}
```

### 2. Add Config

```javascript
// scripts/generate-registry.mjs
const REGISTRY_CONFIG = [
  // ... existing examples config
  {
    name: 'shaders',
    sourceDir: 'lib/shaders',
    outputFile: 'lib/registry/generated/shaders.ts',
    metaType: 'ShaderMeta',
    entryType: 'ShaderEntry',
    idType: 'ShaderId',
    hrefPrefix: '/shaders',
    moduleType: 'component', // or 'data' for non-React exports
    extensions: ['.ts'],
    exclude: ['_registry.ts', '*.test.ts'],
  },
];
```

### 3. Add Metadata to Source Files

```typescript
// lib/shaders/bloom.ts
import type { ShaderMeta } from "@/lib/registry/types";

export const metadata: ShaderMeta = {
  name: "Bloom",
  category: "post-processing",
};

export default bloomShader;
```

### 4. Export from Index

```typescript
// lib/registry/index.ts
export * from "./generated/shaders";
```

## Why Check In Generated Files?

Generated registry files are checked into source control because:

1. **No build step required** - Works immediately after `git clone`
2. **CI simplicity** - No extra generation step needed
3. **PR visibility** - Changes show "added 1 example" clearly
4. **Deterministic** - Same input always produces same output

## Metro Compatibility

The system is designed for Metro bundler:

- **Static imports** - All dynamic imports are literal strings (Metro-analyzable)
- **Pre-created lazy components** - Stable React identity for reconciliation
- **No runtime filesystem access** - Everything resolved at build time
- **Hot reload support** - Watch mode regenerates on file changes

## Type Safety

Invalid IDs are caught at compile time:

```typescript
// ✅ Valid - compiles
getExampleComponent("pinball");

// ❌ Invalid - TypeScript error
getExampleComponent("not_an_example");
// Error: Argument of type '"not_an_example"' is not assignable to parameter of type 'ExampleId'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| New example not appearing | Run `pnpm generate:registry` |
| Type errors after adding example | Regenerate and restart TS server |
| Watch mode not detecting changes | Check file is in `sourceDir` and has correct extension |
| Import errors in generated file | Verify `@/` path alias is configured in tsconfig |
