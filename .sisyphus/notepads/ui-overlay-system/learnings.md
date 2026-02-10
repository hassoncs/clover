# UI Overlay System - Learnings

## Phase 1 Task 1: Type System Foundation

- `GameDefinition.ts` uses `import type` from local files (8 existing imports at top) — followed same pattern for `OverlayConfig`
- `GameDefinition` interface: `overlay` field added after `dialogs` (line ~489)
- Section divider comments (`// ====...`) are an established pattern in this file and `overlay.ts` follows it
- Barrel export in `index.ts` uses `export * from './module'` pattern; container is the exception with named type exports
- `expr-eval` installed as dependency, `@types/expr-eval` as devDependency
- tsc compiles cleanly with zero errors after all changes
