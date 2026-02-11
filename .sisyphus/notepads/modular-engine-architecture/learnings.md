# Modular Engine Architecture - Learnings

## Task 3 Attempt - Failed

**Date:** 2026-02-10

**Issue:** Subagent attempt to implement `compileSectioned` function caused widespread type errors.

**Root Cause:** The Zod schemas in `shared/src/types/schemas.ts` are complex and have strict typing that conflicts with existing game definition types. When the subagent tried to:
1. Add `compileSectioned` function to compiler.ts
2. Create sectioned bundle types
3. Run tests

The result was:
- Test failures due to schema validation being stricter than old validator
- Type errors across the codebase (EditorProvider, AssetGallery, GameRuntime)
- Missing module errors for validation modules

**Key Problems:**
1. The new Zod schemas are stricter than the old imperative validator
2. Test data doesn't satisfy new schema requirements
3. Type derivation from Zod (`z.infer<>`) creates incompatible types with existing code
4. The `semantic.ts` module was created but not properly integrated

**Lessons:**
1. Schema consolidation is more complex than anticipated
2. Need to maintain backward compatibility with existing game definitions
3. Tests need to be updated to match new schema requirements
4. Type derivation needs careful handling to avoid breaking existing code

**Next Steps:**
1. Revert to simpler approach: keep existing types, add Zod schemas as separate validation layer
2. Don't derive types from Zod - keep manual types and use Zod for runtime validation only
3. Focus on `compileSectioned` without changing validation infrastructure
4. Update tests to work with stricter schemas gradually

**Decision:** Pause Task 3, reconsider approach to validation consolidation.

## Task 6 - ballSort Migration to Modular Bundle Format

**Date:** 2026-02-10

**Key Findings:**

1. **Compiler script validation is overly strict**: The `readScriptFile` function uses `/^\s*return\s/m` regex to detect "top-level return statements", but this matches `return` inside function bodies at any indentation. The full compiled script from definition.json (360KB, includes bundled Zod library) fails this validation. Bundle scripts need to be clean JS without deeply nested return statements that trigger false positives.

2. **Compiler manifest → metadata mapping**: `manifest.name` → `metadata.id`, `manifest.title` → `metadata.title`. The compiler does NOT pass through many GameDefinition fields: `variables`, `overlay`, `dialogs`, `persistence`, `hoverHighlight`, `input`, `camera`, `assetSystem`, `winCondition`, `loseCondition`, `background`. These are lost during bundle compilation.

3. **Systems config path**: `manifest.systems.stateMachines` gets resolved but `buildGameDefinition` only spreads `match3`, `containers`, `tetris` — NOT `stateMachines`. So stateMachines in manifest.systems are preserved in rawData but not in the final GameDefinition.

4. **Template format**: Templates in bundle JSON files must be arrays of objects with `id` field. The compiler converts to dictionary format via `extractTemplates()`.

5. **processedFiles tracking**: Script files (`.js`) are tracked separately from JSON files. `scanForJsonFiles` only finds `.json` files; `scanForScriptFiles` finds `.js` files in `scripts/` directory.

6. **Vitest `toContain` with `expect.stringContaining`**: Does NOT work for partial string matching in arrays. Use `.some(f => f.startsWith(...))` instead.

**Files Created:**
- `r2/games/ballSort/bundle/manifest.json` — metadata, world, systems (stateMachines)
- `r2/games/ballSort/bundle/templates/balls.json` — 8 ball templates (ball0-ball7)
- `r2/games/ballSort/bundle/templates/ui.json` — 4 UI templates (background, tube, tubeHoverHighlight, heldBallIndicator)
- `r2/games/ballSort/bundle/entities/entities.json` — 2 entities
- `r2/games/ballSort/bundle/rules/rules.json` — 8 rules
- `r2/games/ballSort/bundle/scripts/main.js` — simplified script with 4 exports
- `packages/game-bundler/src/__tests__/ballsort-migration.test.ts` — 12 tests

## Task 7 - Sectioned Bridge Regression Test

**Date:** 2026-02-10

**What was created:**
- `packages/game-bundler/src/__tests__/sectioned-bridge-regression.test.ts` — 91 tests across 10 games

**Key Findings:**

1. **All 10 games have consistent definition.json structure**: Every game has `world` (with `gravity`, `pixelsPerMeter`, `bounds`), `templates` (object with 1+ keys), and `entities` (array). All sections can be cleanly extracted for the sectioned bridge protocol.

2. **`describe.each` with dynamic discovery works well**: Using `fs.readdirSync` to discover game directories and `describe.each(gameDirs)` creates per-game test suites automatically. No hardcoded game names needed.

3. **Pre-existing tsc errors in game-bundler**: `ts-compiler.ts:84` and `build-games.ts:70` reference `.ui` property on `GameDefinition` that doesn't exist. These are pre-existing and unrelated to this task.

4. **Test count**: 10 games x 9 tests each + 1 discovery test = 91 tests total.
