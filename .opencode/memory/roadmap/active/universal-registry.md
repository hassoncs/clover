# Universal Lazy Registry System

**Status**: active
**Source**: docs
**Created**: 2026-01-24
**Updated**: 2026-01-24

## Objective

Type-safe, auto-discovered module loading for examples and other registerable components

## Progress

- [x] Auto-discovery via metadata exports
- [x] Type-safe lazy loading with Suspense
- [x] Registry generation script
- [x] Watch mode for development

## Blockers

None

## Notes

Documented in docs/shared/reference/registry-system.md and app/AGENTS.md

### Adding a New Example

```typescript
// app/examples/my_example.tsx
import type { ExampleMeta } from "@/lib/registry/types";

export const metadata: ExampleMeta = {
  title: "My Example",
  description: "Does something cool.",
};

export default function MyExample() { ... }
```

Then run `pnpm generate:registry` (or it runs automatically with `pnpm dev`).

### Using the Registry

```typescript
import { EXAMPLES, getExampleComponent, type ExampleId } from "@/lib/registry";

// List all (static metadata, no lazy load)
EXAMPLES.map(e => <Item title={e.meta.title} />);

// Type-safe lazy loading
const Example = getExampleComponent("pinball"); // TS validates ID!
<Suspense fallback={<Loading />}><Example /></Suspense>
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/registry/types.ts` | Type definitions |
| `lib/registry/generated/examples.ts` | Auto-generated registry (checked in) |
| `scripts/generate-registry.mjs` | Scanner/generator script |

### Commands

```bash
pnpm generate:registry        # Regenerate module registry
pnpm generate:registry:watch  # Watch mode
```
