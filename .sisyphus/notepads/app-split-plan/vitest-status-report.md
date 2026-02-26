# Vitest + React Native: Complete Status Report

**Date:** 2026-02-26
**Author:** Sisyphus audit session

---

## Overall Health

| Area | Status | Details |
|------|--------|---------|
| **apps/amen** typecheck | ✅ 0 errors | Clean |
| **apps/slopbox** typecheck | ✅ 0 errors | Clean |
| **apps/shader-editor** typecheck | ⚠️ 3 errors | All from `packages/editor/src/panels/DesignCanvasPanel.tsx` (scope creep from subagent) |
| **apps/slopcade** typecheck | ⚠️ 5 errors | 2 from test files (TS2698 spread), 3 from `DesignCanvasPanel.tsx` |
| **api/** typecheck | ✅ 0 errors | Clean |
| **packages/editor** typecheck | ✅ 0 errors | Clean (standalone) |
| **shared/** tests | ✅ 1,238/1,238 | All pass |
| **economy-engine** tests | ✅ 84/84 | All pass |
| **content-pipeline** tests | ✅ 61/61 | All pass (fixed this session) |
| **apps/slopcade** tests | 🔴 6 files fail, 2 pass | See below |

---

## What Was Fixed (Committed)

1. **`biblequizzle.test.ts`** — fixture used wrong field names (`category` → `categories`, `correct_answer` → `answer`). Now 61/61 pass.
2. **`GameHallCarousel.tsx`** — `Animated.SharedValue` → `SharedValue` import from `react-native-reanimated`.
3. **Platform stub files** — Created `AmenGrainOverlay.tsx`, `DrawingIcon.tsx`, `AmenSplashSequence.tsx` as base files that re-export from `.web.tsx` variants. Fixes TypeScript resolution for platform-specific files.
4. **`amen/lib/party/template-types.ts`** — Added shim re-exporting from `@slopcade/party`.
5. **`EditorProvider.test.ts` / `WireframePanel.test.tsx`** — Removed `typeof import(...)` generic from `importOriginal` calls.
6. **`ChatTextArea.test.tsx`** — Rewrote to use prop injection for `useSpeechToText` instead of module mock.
7. **`Knobs/types.ts`** — Added missing `GradientStop`, `KnobGradientProps`, `KnobSelectProps`, `KnobVec2Props`, `KnobVec3Props` exports.

---

## The 6 Failing Test Files

### Root Cause A: `@expo/vector-icons` can't be resolved (4 editor tests)

```
Error: Failed to resolve import "@expo/vector-icons" from "../../packages/editor/src/ActivityBar.tsx"
```

**Affected files:**
- `components/editor/__tests__/DesignCanvasHitTest.test.ts`
- `components/editor/__tests__/useDesignDocument.test.ts`
- `components/editor/__tests__/EditorProvider.test.ts`
- `components/editor/panels/WireframePanel.test.tsx`

**Chain:** Test → `@slopcade/editor` (inlined) → `ActivityBar.tsx` → `@expo/vector-icons` → resolution fails

**What's happening:** When `@slopcade/editor` is inlined via `server.deps.inline: [/@slopcade\/.*/]`, vitest transforms it using Vite's module runner (VMR). The VMR resolves imports from the package's own context. The current vitest config has a plugin with `resolveId` hook that redirects `@expo/vector-icons` to a mock file, but **the `resolveId` hook is not being called for imports from inlined packages**.

### Root Cause B: `@slopcade/ui` mock missing for ChatTextArea (2 tests)

```
Unable to find an element by: [data-testid="mic-button"]
```

**Affected files:**
- `components/create-game/ChatTextArea.test.tsx` (2 of 6 tests fail)

**What's happening:** `ChatTextArea` renders `MicButton` from `@slopcade/ui`. The `@slopcade/ui` global mock was removed from `vitest.setup.ts` (because it broke `MicButton.test.tsx` which needs the real component). Now `ChatTextArea.test.tsx` needs its own local mock but the one it has doesn't work because `@slopcade/ui` is inlined and `vi.mock` doesn't intercept inlined package imports.

### Root Cause C: MicButton test needs real component but can't load it

**Affected files:**
- `components/ui/__tests__/MicButton.test.tsx` (all tests fail)

**What's happening:** `MicButton` imports from `@slopcade/ui` (shim) → real `MicButton` in `packages/ui`. The real `MicButton` uses `Animated.Value` from React Native (NOT reanimated). The `@slopcade/ui` package is inlined, but loading it triggers loading `@expo/vector-icons` → resolution fails.

---

## The Fundamental Problem

### vitest's module runner (VMR) does NOT respect `resolve.alias` or `resolveId` hooks for inlined packages

When `server.deps.inline: [/@slopcade\/.*/]` is set:

1. vitest transforms `@slopcade/editor` in-process using Vite's SSR transform pipeline
2. During transform, `@slopcade/editor` imports `@expo/vector-icons`, `react-native`, `react-native-reanimated`
3. These imports are resolved from the **package's own node_modules context** (root `node_modules/`)
4. `resolve.alias` in the vitest config is **NOT applied** to these transitive imports
5. `resolveId` hooks in Vite plugins are **NOT called** for these transitive imports
6. `vi.mock()` in setupFiles **NOT intercepted** for module initialization

### What DOES work for inlined packages

| Mechanism | Works? | Notes |
|-----------|--------|-------|
| `resolve.alias` | ❌ | Only applies to the app's own imports, not inlined package imports |
| `resolve.alias` (array form) | ❌ | Same limitation |
| `test.alias` | ❌ | Same limitation |
| `resolveId` plugin hook | ❌ | Not called for inlined package imports |
| `vi.mock()` in setupFiles | ❌ | Causes real module to load during mock setup, crashes |
| `vi.mock()` without factory | ❌ | Same — module must be found to register mock |
| `server.deps.external` | ❌ | Node loads the real module → crashes on Flow syntax |
| `server.deps.inline: ["react-native"]` | ❌ | Vite tries to transform Flow syntax → esbuild crash |
| `__mocks__/` directory | ❌ | Same limitation as `vi.mock()` |
| `transform` plugin hook | ✅ | Can strip Flow syntax from `react-native/index.js` |
| `load` plugin hook (virtual modules) | ✅ | Can provide mock content for virtual module IDs |
| pnpm workspace mock package | ⚠️ | Works for `react-native-reanimated` when added to `pnpm.overrides`, but NOT for `react-native` (breaks native builds) |
| `ssr.resolve.conditions` | ❌ | Doesn't help |

### The `transform` hook breakthrough

The `transform` hook IS called for files being transformed by the VMR. This was used successfully to strip Flow's `import typeof` syntax:

```js
transform(code, id) {
  if (id.includes("react-native") && code.includes("import typeof")) {
    return { code: code.replace(/import typeof[^\n]+\n/g, ""), map: null };
  }
}
```

This fixed the `SyntaxError: Unexpected token 'typeof'` error. But the `@expo/vector-icons` resolution failure happens **before** the transform hook runs (at the import analysis stage).

---

## Current Vitest Config State (Uncommitted)

The config has been heavily modified during debugging. Current state has:
- A custom `rnTestPlugin` with `resolveId` + `load` (virtual modules) + `transform` (Flow strip)
- `resolve.alias` for `react-native` → `react-native-web` and `@expo/vector-icons` → mock
- `vitest.setup.ts` stripped down to only `@react-native-async-storage/async-storage` mock
- `pnpm.overrides` does NOT include `react-native-reanimated` (the workspace mock exists but isn't wired up)

---

## Approaches NOT Yet Tried

### 1. Exclude `@slopcade/editor` from inlining entirely

Instead of inlining `@slopcade/editor`, exclude it from `server.deps.inline` and rely on `vi.mock("@slopcade/editor", ...)` in each test file. This would avoid the transitive import resolution problem entirely.

**Trade-off:** Tests that need the real `EditorProvider`, `useEditor`, `hitTestDesignCanvas` would need to import them differently — perhaps directly from source files instead of the package index.

### 2. Build `@slopcade/editor` to compiled JS dist

Add a `tsup` or `tsc` build step to `packages/editor/` that compiles to `dist/`. Change `"main"` from `"./src/index.ts"` to `"./dist/index.js"`. The compiled dist wouldn't have `import typeof` or unresolvable imports.

**Trade-off:** Adds a build step. Need to keep dist up to date. But this is the "correct" package architecture anyway.

### 3. Split `@slopcade/editor` index into test-safe and full exports

Create `packages/editor/src/index.test.ts` that only exports the pure utility functions (like `hitTestDesignCanvas`, `screenToWorld`) without pulling in React Native dependencies. Use this in test imports.

### 4. Use `esbuild` plugins to handle Flow syntax

esbuild supports plugins. Configure vitest's esbuild to use `@aspect-build/rules_js` or a custom esbuild plugin that strips Flow syntax before parsing.

### 5. Pre-bundle problematic packages with `optimizeDeps`

Use vitest's `optimizeDeps.include` to pre-bundle `react-native` and `@expo/vector-icons` before the test run, transforming them into esbuild-compatible code.

### 6. Use `pnpm.overrides` for ALL problematic packages

Add workspace mock packages for `react-native`, `@expo/vector-icons`, `react-native-reanimated` to `pnpm.overrides`. This replaces them at the resolution level. **But** this breaks Metro/native builds since Metro resolves from `node_modules` too.

### 7. Use pnpm catalogs or per-package overrides

pnpm 9.x supports `pnpm.overrides` with package selectors. Could potentially override only for `apps/slopcade`:
```json
"pnpm": {
  "overrides": {
    "@slopcade/slopcade-app>react-native-reanimated": "workspace:*"
  }
}
```

---

## Uncommitted Files

| File | Status | Keep? |
|------|--------|-------|
| `apps/slopcade/vitest.config.mjs` | Heavily modified with plugin experiments | ⚠️ Has useful pieces (flow-strip transform, virtual module pattern) but needs cleanup |
| `apps/slopcade/vitest.setup.ts` | Stripped to only async-storage mock | ✅ This is correct — remove broken mocks |
| `apps/slopcade/__mocks__/react-native-gesture-handler.js` | New mock file | ✅ Keep |
| `apps/slopcade/__mocks__/slider.js` | New mock file | ✅ Keep |
| `apps/slopcade/__mocks__/@expo/vector-icons.js` | New mock file (from earlier commit) | ✅ Keep |
| `packages/react-native-reanimated-mock/` | Workspace mock package | ✅ Keep — works at Node resolution level |
| `packages/editor/src/panels/DesignCanvasPanel.tsx` | Scope creep from subagent (causes 3 type errors) | 🔴 REVERT — not our work |
| `packages/editor/src/panels/DesignCanvasRenderer.tsx` | Scope creep from subagent | 🔴 REVERT |
| `packages/editor/src/panels/DesignCanvasPanel.native.tsx` | Scope creep from subagent | 🔴 REVERT |
| `packages/editor/src/panels/useDesignInteractions.ts` | Scope creep from subagent | 🔴 REVERT |
| `pnpm-lock.yaml` | Changed from earlier `pnpm install` with overrides | ⚠️ May need refresh |

---

## Recommended Next Steps

1. **Revert scope creep** in `packages/editor/src/panels/` (4 files) — these cause the 3 DesignCanvasPanel type errors
2. **Wire up the workspace mock** — add `react-native-reanimated: workspace:*` to `pnpm.overrides` in root `package.json`
3. **Try approach #1** (exclude `@slopcade/editor` from inline) — simplest to test, avoids the fundamental VMR limitation
4. **Try approach #2** (build editor to dist) — proper long-term fix
5. **Fix `MicButton.test.tsx`** — the test expects `recording-indicator` testID that the real component doesn't render
6. **Fix `ChatTextArea.test.tsx`** — needs a working `@slopcade/ui` mock that provides `MicButton`

The core technical debt here is: **vitest + React Native monorepo with workspace packages is not well-supported**. The VMR's module resolution doesn't respect Vite's alias/plugin system for inlined package imports. This is a vitest architecture limitation, not a config issue.
