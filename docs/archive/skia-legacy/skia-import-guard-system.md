# Skia Import Guard System

> **Status:** Planned  
> **Priority:** High  
> **Estimated Effort:** 4-8 hours  
> **Last Updated:** 2026-01-22

## Problem Statement

React Native Skia on web requires CanvasKit WASM to be initialized **before** any component that imports from `@shopify/react-native-skia` is loaded. When this invariant is violated, the web app crashes with an obscure error.

### The Bug Pattern

```tsx
// UNSAFE: Top-level import executes before WASM is ready
import { Canvas } from "@shopify/react-native-skia"; // CRASH on web

// SAFE: Dynamic import inside WithSkiaWeb
<WithSkiaWeb 
  getComponent={() => import("./MySkiaComponent")} 
  fallback={<Loading />} 
/>
```

The bug manifests when:
1. A file imports from `@shopify/react-native-skia` at module level
2. That file is transitively imported by a route/page
3. Without going through a dynamic `import()` wrapped in `WithSkiaWeb`

### Why This Is Dangerous

- **Silent until runtime**: No TypeScript or build errors
- **Transitive**: Can be several imports deep in the dependency chain
- **Barrel export amplification**: Importing one thing from a barrel can pull in everything, including Skia components
- **AI-prone**: AI coding agents frequently introduce this bug without understanding the constraint
- **Hard to trace**: Error messages don't clearly identify the problematic import

### Real Example (2026-01-22)

The editor barrel export (`@/components/editor/index.ts`) exported `SelectionOverlay` which imported Skia. When the editor page imported from the barrel, it pulled in the Skia import before WASM initialization.

```
app/app/editor/[id].tsx
  └── import { EditorProvider, ... } from "@/components/editor"
        └── @/components/editor/index.ts (barrel)
              └── export { SelectionOverlay } from "./SelectionOverlay"
                    └── import { Group, Rect } from "@shopify/react-native-skia"  // CRASH
```

---

## Proposed Solution: Defense in Depth

### Layer 1: ESLint Rules (HIGH IMPACT)

Block Skia imports except in quarantined files:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@shopify/react-native-skia', '@shopify/react-native-skia/*'],
          message: 'SKIA IMPORT VIOLATION: This package can only be imported in *.skia.tsx files. Use WithSkia wrapper for lazy loading.',
        }]
      }]
    }
  },
  // Allow in quarantined files
  {
    files: ['**/*.skia.tsx', '**/*.skia.ts'],
    rules: {
      'no-restricted-imports': 'off'
    }
  }
];
```

**Impact**: Catches ~90% of AI-generated violations immediately in the editor.

### Layer 2: File Naming Convention

Files that import from Skia **MUST** be named `*.skia.tsx` or `*.skia.ts`.

Examples:
- `SelectionOverlay.tsx` → `SelectionOverlay.skia.tsx`
- `EffectRegistry.ts` → `EffectRegistry.skia.ts`
- `ParticleRenderer.tsx` → `ParticleRenderer.skia.tsx`

**Impact**: Makes the constraint visible. AI sees the pattern and follows it.

### Layer 3: Barrel Export Ban for Skia Files

**Rule**: Files with `.skia.tsx` extension must NEVER be exported from barrel files (`index.ts`).

```typescript
// FORBIDDEN in any index.ts
export { SelectionOverlay } from "./SelectionOverlay.skia";

// ALLOWED: Direct import via WithSkia
<WithSkia getComponent={() => import("./SelectionOverlay.skia")} />
```

### Layer 4: Runtime Error Enhancement

Add a dev-only error boundary that catches CanvasKit init errors and shows a clear message:

```tsx
// In root error boundary
if (error?.message?.includes('CanvasKit') || error?.message?.includes('Skia')) {
  console.error(`
    SKIA IMPORT ERROR DETECTED
    
    A file is importing from @shopify/react-native-skia before WithSkiaWeb initialized.
    
    To debug:
    1. Search for: from "@shopify/react-native-skia"
    2. Check barrel exports (index.ts files)
    3. Ensure all Skia components use *.skia.tsx naming
    4. All Skia components must be lazy-loaded via WithSkia
  `);
}
```

### Layer 5: Build-Time Import Graph Check (Future)

A CI script that:
1. Identifies all "Skia-root files" (files that import from `@shopify/react-native-skia`)
2. Builds a reverse dependency graph
3. Fails if any route/page can reach a Skia file without a dynamic import boundary

### Layer 6: Web Smoke Test (Future)

Playwright test that loads key routes and fails on Skia initialization errors:

```typescript
test('web app loads without Skia init errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('/');
  await page.goto('/editor/test');
  
  const skiaErrors = errors.filter(e => 
    e.includes('CanvasKit') || e.includes('Skia')
  );
  expect(skiaErrors).toHaveLength(0);
});
```

---

## Implementation Plan

| Phase | Task | Effort | Impact |
|-------|------|--------|--------|
| 1 | Add ESLint config with Skia import restrictions | 30 min | High |
| 2 | Rename all Skia-importing files to `*.skia.tsx` | 2-3 hours | High |
| 3 | Update all imports to use new filenames | (included above) | - |
| 4 | Add runtime error enhancement | 30 min | Medium |
| 5 | Build-time import graph checker | 2-4 hours | High |
| 6 | Playwright smoke test | 1-2 hours | Medium |

### Files to Rename (Current State)

These 36 files currently import from `@shopify/react-native-skia`:

**lib/effects/**
- `EffectApplier.tsx` → `EffectApplier.skia.tsx`
- `ShaderEffect.tsx` → `ShaderEffect.skia.tsx`
- `EffectRegistry.ts` → `EffectRegistry.skia.ts`

**lib/game-engine/**
- `GameRuntime.native.tsx` → `GameRuntime.skia.tsx`

**lib/game-engine/renderers/**
- `ParallaxBackground.tsx` → `ParallaxBackground.skia.tsx`
- `RectRenderer.tsx` → `RectRenderer.skia.tsx`
- `CircleRenderer.tsx` → `CircleRenderer.skia.tsx`
- `PolygonRenderer.tsx` → `PolygonRenderer.skia.tsx`
- `ImageRenderer.tsx` → `ImageRenderer.skia.tsx`

**lib/particles/**
- `ParticleRenderer.tsx` → `ParticleRenderer.skia.tsx`

**components/editor/**
- `SelectionOverlay.tsx` → `SelectionOverlay.skia.tsx`

**components/examples/** (19 files)
- All example components → `*.skia.tsx`

**components/gallery/previews/** (5 files)
- All preview components → `*.skia.tsx`

**components/**
- `iridescence.tsx` → `iridescence.skia.tsx`

---

## Success Criteria

1. ESLint error appears immediately when AI/human adds Skia import to non-`.skia.tsx` file
2. All existing Skia files follow naming convention
3. No barrel exports contain Skia components
4. Web app doesn't crash on load
5. When violations occur, error message clearly identifies the problem

---

## References

- [Skia Web Deployment Guide](../guides/skia-web-deployment.md)
- [React Native Skia Web Docs](https://shopify.github.io/react-native-skia/docs/getting-started/web/)
- [Using Code-Splitting with WithSkiaWeb](https://shopify.github.io/react-native-skia/docs/getting-started/web/#using-code-splitting)
