# Vitest + react-native-reanimated: Full Learnings

**Date:** 2026-02-26  
**Context:** Post app-split audit — trying to get all tests passing

---

## The Problem (Precise)

`apps/slopcade` has 8 test files. 6 fail. All 6 failures share one root cause:

```
SyntaxError: Unexpected token 'typeof'
```

**The actual error source:** `react-native/index.js` contains Flow syntax:
```js
import typeof * as ReactNativePublicAPI from './index.js.flow';
```
This is **Flow** (not TypeScript). esbuild treats it as JS and chokes on `typeof`.

**The import chain:**
```
test file
  → @slopcade/editor (inlined via server.deps.inline)
    → packages/editor/src/InteractionLayer.tsx
    → react-native-reanimated
      → react-native  ← CRASH (Flow syntax)
```

Also: `packages/editor/src/preview/ImagePreview.tsx` has the same chain.

**Secondary issue:** `react-native-reanimated/src/specs/NativeReanimatedModule.ts` contains:
```ts
TurboModuleRegistry.get<Spec>('ReanimatedModule')
```
TypeScript generic syntax that esbuild can't parse when treated as JS.

---

## What Was Tried (All Failed)

### 1. `vi.mock('react-native-reanimated', ...)` in vitest.setup.ts
**Result:** ❌ Does not intercept transitive imports from inlined packages.  
`vi.mock` is hoisted per test file. When `@slopcade/editor` is inlined and transformed, its imports are resolved before `vi.mock` takes effect.

### 2. `resolve.alias` (string form) in vitest.config.mjs
```js
resolve: { alias: { "react-native-reanimated": "/path/to/mock.js" } }
```
**Result:** ❌ Does not intercept. Verified: the mock file is never loaded (added `console.log` to mock — never printed).

### 3. `resolve.alias` (array/regex form)
```js
resolve: { alias: [{ find: /^react-native-reanimated($|\/)/, replacement: "..." }] }
```
**Result:** ❌ Same — mock never loaded. Vite's plugin container resolves it correctly in isolation, but the vitest module runner uses a different resolution path for inlined packages.

### 4. `test.alias` in vitest config
```js
test: { alias: { "react-native-reanimated": "/path/to/mock.js" } }
```
**Result:** ❌ Same failure.

### 5. `server.deps.external: [/react-native-reanimated/]`
**Result:** ❌ When external, Node tries to import it natively → also crashes (native bindings missing).

### 6. `server.deps.inline: ["react-native-reanimated"]`
**Result:** ❌ Forces Vite to transform it, but esbuild still can't handle the Flow/TS syntax.

### 7. `ssr.resolve.conditions: ["import", "default"]`
**Result:** ❌ No change. The `source` field in reanimated's package.json (`src/index`) is still being followed.

### 8. `__mocks__/react-native-reanimated.js` file + `vi.mock()` in setup
**Result:** ❌ The `__mocks__` auto-resolution works for `node_modules` packages when `vi.mock()` is called without a factory. But the mock is never reached because the crash happens during module initialization of the inlined package, before `vi.mock` can intercept.

### 9. Removing `typeof import(...)` generic from test files
```ts
// Changed from:
const actual = await importOriginal<typeof import("@slopcade/editor")>();
// To:
const actual = await importOriginal();
```
**Result:** ✅ Fixed the TypeScript parse error in test files themselves. But the underlying reanimated crash still happens.

### 10. Excluding editor packages from inline
```js
inline: [/@slopcade\/(?!editor|editor-ai|ui|social|party).*/]
```
**Result:** ⚠️ Partially tried, not fully verified. When packages aren't inlined, they're loaded as external modules — but then `vi.mock` can intercept them. However, this breaks tests that need the real implementation (EditorProvider, useDesignDocument).

### 11. Clearing vitest cache
```bash
rm -rf node_modules/.vite node_modules/.cache
```
**Result:** ❌ No change.

---

## What DID Work (Committed)

These fixes are in commit `51332cbe0`:

| Fix | Status |
|-----|--------|
| `biblequizzle.test.ts` fixture fields (`category→categories`, `correct_answer→answer`) | ✅ content-pipeline: 61/61 pass |
| `GameHallCarousel` `Animated.SharedValue` → `SharedValue` import | ✅ packages/ui typecheck improved |
| Platform stub files for `AmenGrainOverlay`, `DrawingIcon`, `AmenSplashSequence` | ✅ amen/animation typecheck fixed |
| `amen/lib/party/template-types.ts` shim | ✅ |
| `@expo/vector-icons` mock in vitest.setup.ts | ✅ |
| `react-native-reanimated` mock stub file created | ✅ (file exists, just not loading) |
| `vi.mock typeof import()` generic removed from test files | ✅ |
| `ChatTextArea.test.tsx` rewritten to use prop injection | ✅ 4/6 tests pass |
| `packages/ui/src/Knobs/types.ts` — added missing types | ✅ (not yet committed) |

---

## Current Test State

```
apps/slopcade: 6 failed | 2 passed (8 files) — 7 tests fail, 30 pass
  FAIL: components/editor/__tests__/DesignCanvasHitTest.test.ts   (reanimated)
  FAIL: components/editor/__tests__/useDesignDocument.test.ts     (reanimated)
  FAIL: components/editor/__tests__/EditorProvider.test.ts        (reanimated)
  FAIL: components/editor/panels/WireframePanel.test.tsx          (reanimated)
  FAIL: components/create-game/ChatTextArea.test.tsx              (2 tests — @slopcade/ui mock)
  FAIL: components/ui/__tests__/MicButton.test.tsx                (5 tests — @slopcade/ui mock)

shared/: 1229/1229 ✅
economy-engine: 84/84 ✅
content-pipeline: 61/61 ✅
```

---

## Root Cause (Definitive)

When `server.deps.inline` includes `/@slopcade\/.*/`, vitest transforms those packages in-process using Vite's module runner. The module runner resolves imports from the **package's own context** (its node_modules), not the app's. This means:

- `resolve.alias` in the app's vitest config does NOT apply to imports made by inlined packages
- `vi.mock()` in setupFiles does NOT intercept module initialization of inlined packages
- `test.alias` has the same limitation

This is a known vitest limitation documented in issue [vitest-dev/vitest#3265](https://github.com/vitest-dev/vitest/issues/3265).

---

## The Right Solution (Not Yet Implemented)

**Create a workspace mock package** `packages/testing/react-native-reanimated-mock/`:

```
packages/testing/react-native-reanimated-mock/
  package.json   (name: "react-native-reanimated", version: "0.0.0-mock")
  index.ts       (exports all reanimated APIs as vi.fn() stubs)
```

By making it a **workspace package with the same name** as the real package, pnpm's workspace resolution will prefer it over the real package when it's listed as a dependency. Add it as a `devDependency` in each app's `package.json`.

This works because:
1. pnpm workspace packages take precedence over npm packages of the same name
2. The mock is resolved at the **package resolution level** (before Vite even runs)
3. No alias needed — the mock IS the package from pnpm's perspective
4. Works for all inlined packages transitively — they all resolve to the mock

**APIs to mock** (from codebase scan):
```ts
// Default export
Animated (View, Text, Image, ScrollView, FlatList, createAnimatedComponent)

// Named exports
useSharedValue, useAnimatedStyle, useAnimatedReaction, useDerivedValue,
withTiming, withSpring, withDelay, withRepeat, withSequence,
runOnJS, runOnUI, interpolate,
FadeIn, FadeInDown, FadeOut, SlideInDown, ZoomIn, ZoomOut, Layout,
Easing, Extrapolation,
SharedValue (type only), AnimatableValue (type only), WithSpringConfig (type only),
getAnimatedStyle, createAnimatedComponent
```

**Alternative (simpler):** Use pnpm's `overrides` field in root `package.json` to redirect `react-native-reanimated` to the mock package in test environments. But this would affect all environments, not just tests.

**Most practical alternative:** Add `react-native-reanimated` to `pnpm.overrides` pointing to the mock package, but only activate it via an env var or separate pnpm workspace config for tests.

---

## Files Currently Modified (Uncommitted)

```
apps/slopcade/vitest.config.mjs          — various alias attempts (needs cleanup)
packages/editor/src/panels/...           — scope creep from subagents (needs review)
packages/ui/src/Knobs/types.ts           — legitimate fix (needs commit)
```

---

## Recommended Next Steps for Fresh Context

1. **Revert** `apps/slopcade/vitest.config.mjs` to the committed state (clean up alias experiments)
2. **Commit** `packages/ui/src/Knobs/types.ts` fix (legitimate, unrelated to reanimated)
3. **Create** `packages/testing/react-native-reanimated-mock/` workspace package
4. **Add** it as devDependency to `apps/slopcade/package.json` (and any other app with tests)
5. **Verify** all 8 test files pass
6. **Optionally** add to `packages/ui/package.json` and `packages/party/package.json` for their future tests

The workspace package approach is the only solution that works at the **resolution level** rather than the **transform level**, which is why all alias/mock approaches have failed.
