# Learnings: Script-First Big-Bang Migration

## Task 3: Remove rules/behaviors from workspace and scaffold

### What was removed
- `rules.json` scaffold entry from `WorkspaceScaffoldService.SCAFFOLD_FILES`
- `"rules"` from `WorkspaceTag` union type (`shared/src/workspace/types.ts`)
- `rulesPath` from `SceneManifest` interface (`shared/src/workspace/types.ts`)
- `"rules"` from `ALL_TAGS` and 2 rules-specific `TAG_RULES` entries in `tag-inference.ts`
- Rules parsing block from `PackageCompiler.parseWorkspace()` (the `rulesContent` / `WORKSPACE_CONVENTIONS.rules` block)
- Rules payload from `PackageCompiler.buildTagPayloads()`
- `GameRule` type alias from `PackageCompiler.ts`
- `rules` field from `ParsedWorkspace` interface in PackageCompiler

### Parallel task overlap observed
- `GamePackage.ts` was already updated by a parallel task (rules removed from both `GamePackage` interface and `WORKSPACE_CONVENTIONS`)
- `PackageRuntime.ts` was already updated — `"rules"` removed from `TagGroup`, `TagPayloads`, and `TAG_GROUPS`
- `TagPayloads["scripts"]` was changed from `{ script: string }` to `{ modules: Record<string, string>; entrypoint?: string }` — causes a type error in `PackageCompiler.buildTagPayloads()` at line ~273. NOT this task's responsibility.

### Key patterns
- `behaviors` had NO references in workspace/scaffold contracts — already absent
- `rules.json` files in existing workspaces will still be copied by `WorkspaceCopyService` (it copies all R2 objects, not just known files), but won't be scaffolded for new games
- After removal, `inferTagHints("rules.json")` falls through to `ALL_TAGS` (returns all 6 tags) — it's now just an unknown file pattern

### Test counts changed
- WorkspaceCopyService: 7 files → 6 files in copy test
- PackageCompiler: 6 artifacts → 5, 6 tag groups → 5
- module-graph: `slopcade.json` infers 6 tags (was 7), removed `rules.json` and `scenes/main/rules.json` from test cases

## Task 2: Template→Prefab Migration in Bundler

### Changes Made
- Renamed `BUNDLE_SUBDIRS = ["templates", "entities"]` → `["prefabs", "entities"]`
- Renamed functions:
  - `validateEntityTemplateRefs` → `validateEntityPrefabRefs`
  - `extractTemplates` → `extractPrefabs`
- Renamed variables throughout:
  - `templateIds` → `prefabIds`
  - `templateRef` → `prefabRef`
  - `templateMap` → `prefabMap`
  - `templateRecord` → `prefabRecord`
  - `template` → `prefab` (loop variables)
- Updated error codes: `UNKNOWN_TEMPLATE` → `UNKNOWN_PREFAB`
- Updated types:
  - `RawBundleData.templates` → `RawBundleData.prefabs`
  - `checkDuplicateIds` category: `"templates" | "entities"` → `"prefabs" | "entities"`
  - `validateAssetRefs` category: `"templates" | "entities"` → `"prefabs" | "entities"`
- Updated all test files:
  - File paths: `templates/` → `prefabs/`
  - Test names: "validates template references" → "validates prefab references"
  - Entity fields: `template: "player"` → `prefab: "player"`
  - Comments: "Templates in subdirectories" → "Prefabs in subdirectories"

### Files Modified
- `packages/game-bundler/src/compiler.ts`
- `packages/game-bundler/src/types.ts`
- `packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts`
- `packages/game-bundler/src/__tests__/unified-loader.test.ts`
- `packages/game-bundler/src/__tests__/sectioned-bridge-regression.test.ts`
- `packages/game-bundler/src/__tests__/ballsort-migration.test.ts`
- `packages/game-bundler/src/__tests__/asset-resolution.test.ts`

### Verification
- `rg -i "\btemplate\b" src/ --type ts | grep -v "playerTemplate" | grep -v "// " | wc -l` → 0 results
- `npx tsc --noEmit 2>&1 | grep -i template` → no template-related errors
- All remaining type errors are about `script` and `rules` properties (unrelated to this task)

### Conventions Discovered
- Bundle directory structure uses `prefabs/` subdirectory (not `templates/`)
- Error codes follow `UNKNOWN_*` pattern for missing references
- Category parameters use union types like `"prefabs" | "entities"`
- Test variable names can use descriptive names like `playerTemplate` (refers to the prefab object, not the concept)

## Task 1: Canonical Script-First Contracts (shared types)

### Conventions Discovered
- `shared/` has no `typecheck` script — run `npx tsc --noEmit -p shared/tsconfig.json` directly
- `GameDefinition` never had a `rules` field — rules were only in `GamePackage`, `PackageRuntime`, and `PackageBridge`
- `GameDefinition.script` was a single string field; the new v2 payload uses module map in `PackageRuntime.TagPayloads.scripts`
- Zod schemas in `schemas.ts` already didn't have `behaviors` on entity/prefab schemas (misaligned with TS types before this change)
- `TagGroupBridgeMapping` was missing `effects` key — added during rules removal

### Pre-existing Broken Tests (not caused by this task)
- `gameDefinitionSchema.test.ts` — imports from `r2/games/flappyBird/src/game` which no longer exists (games migrated to workspace JSON format)
- `gameDefinitionValidator.test.ts` — `should warn when no win mechanism is present` expects `NO_WIN_MECHANISM` warning code that the validator never produces
- Both `winCondition` and `loseCondition` are used in test fixtures but don't exist on `GameDefinition` type (tests use `as GameDefinition` cast)

### Files Modified
- `shared/src/types/entity.ts` — Added `scriptRef` to `BaseEntityPrefab` and `GameEntity`, removed `behaviors` from all interfaces
- `shared/src/types/GameDefinition.ts` — Removed `script?: string` field  
- `shared/src/types/GamePackage.ts` — Removed `rules` field and `rules.json` from conventions
- `shared/src/types/PackageRuntime.ts` — Removed `rules` from TagGroup, updated scripts payload to v2 module map
- `shared/src/types/PackageManifest.ts` — Removed `rules` from TAG_GROUPS array
- `shared/src/types/PackageBridge.ts` — Removed `rules` from TagGroupBridgeMapping, added `effects`
- `shared/src/types/schemas.ts` — Added `scriptRef` to prefab/entity schemas, removed `script` from GameDefinitionSchema
- `shared/src/validation/semantic.ts` — Removed behavior/rule ref collection and validation
- `shared/src/validation/gameDefinitionValidator.ts` — Removed behavior validation, VALID_BEHAVIOR_TYPES, getStringArray
- `shared/src/expressions/property-watching/DependencyAnalyzer.ts` — Gutted behavior/rule analysis (now no-ops)

## Task 5: Script Packaging to Module-Map

### Changes Made (PackageCompiler.ts)
- `ParsedWorkspace.scripts: string` → `scriptModules: Record<string, string>` + `scriptEntrypoint?: string`
- `parseWorkspace()` builds sorted module map from `scripts/*.js` instead of concatenating with `// --- basename ---` headers
- `script.js` single-file fallback maps to `main` module key
- Entrypoint: prefer "main" if exists, else first alphabetically
- `buildTagPayloads()` produces `{ modules, entrypoint }` matching `TagPayloads["scripts"]`

### Changes Made (TagPayloadResolver.ts)
- `resolveScripts()` builds `Record<string, string>` keyed by basename, sorted alphabetically
- Returns `{ modules, entrypoint }` instead of `{ script: concatenated }`
- Also cleaned up pre-existing dead `resolveRules()` method and `"rules"` case

### Changes Made (scripts-handler.ts)
- Local `concatenateModules()` function joins module values (sorted by key) for `applyScript()`
- Handler type changed from inline `{ script: string }` to `TagPayloads["scripts"]`
- Bridge still receives concatenated string — module boundaries are a packaging concern

### Changes Made (PackageValidator.ts)
- Removed dead `validateRules()`, `collectRulePrefabRefs()`, `collectRuleEntityRefs()`, `GameRule` interface
- These were leftover from rules removal in Task 3

### Key Pattern
- Module map keys are basenames without `.js` extension (e.g., `scripts/a-main.js` → `"a-main"`)
- Deterministic ordering: `Object.keys().sort()` then rebuild object
- The bridge/runtime still receives concatenated string via `scripts-handler.concatenateModules()`
- Module-map is a packaging/transport concern; execution still uses single-string concatenation

## Task 6: Runtime Loader and Dispatch

### Architecture Decisions
- Single sandbox VM maintained — modules loaded as separate IIFEs within one sandbox
- `buildScriptCode()` wraps each module in its own IIFE with local `exports` variable
- Module exports stored at `globalThis.__moduleExports[key]`
- Entrypoint module's hooks promoted to `globalThis.__exports` for backward compat with `sandbox.hasHook()`
- Helper functions (`__checkModuleHook_*`, `__callModuleHook`) emitted as exports for the system to call

### Dispatch Model
- `hasModules()` check determines legacy vs module dispatch path
- Legacy path: unchanged behavior (single script, global hooks)
- Module path: per-module `onStart`/`onUpdate` in deterministic sorted order
- Collision hooks: resolved per-entity via `prefab.scriptRef`, deduplicated per module
- Input/network/phase hooks: broadcast to all modules that have them

### Entity → Module Resolution
- `resolveEntityScriptRef(entityId)` → looks up entity.prefab → prefab.scriptRef
- Missing module key → `ScriptRefError` logged, entity skipped (non-affected entities continue)
- Entity-level `scriptRef` override not yet wired (compile-time resolution per plan)

### Files Modified
- `ScriptSandboxRuntimeSystem.ts` — Added module map config, `buildScriptCode()`, `detectModuleHooks()`, `updateWithModuleDispatch()`, `processCollisionEnterExitModular()`, `resolveEntityScriptRef()`, `callModuleHook()`, `reportScriptRefError()`
- `scripts-handler.ts` — Added `applyPayload()` that prefers `applyModules` over concatenated `applyScript`
- `tag-handlers/types.ts` — Added optional `applyModules` to `HotReloadContext.runtime`
- `LivePreviewController.ts` — Added `applyModules` to default runtime
- `wrappers/index.ts` — Exported `ModuleHookState`, `ScriptRefError`

### Key Pattern: Sandbox Code Generation
- The sandbox wraps all code in `(function() { const exports = {}; ... globalThis.__exports = exports; })()`
- Module IIFEs shadow the outer `exports` with their own `var exports = {}`
- Check functions and `__callModuleHook` are added to the outer `exports` (accessible via `callFunction`)
- `callFunction` calls `globalThis.__exports.fnName(ctx, args)` — args is a single object

### Pre-existing Errors (31 total, 0 from this task)
- All errors are from Tasks 1-5 migration: `behaviors`, `script`, `rules` removed from types

## Task 7: Workspace Copy/Snapshot/Hot-Reload Test Migration

### Files Modified
- `api/src/trpc/routes/__tests__/workspace-snapshot.test.ts` — Removed `rules.json` from SCAFFOLD_FILES, 7→6 file count
- `app/lib/game-engine/live/__tests__/hot-reload.test.ts` — Removed rules.json from fixture store
- `api/src/chat/__tests__/lifecycle-integration.test.ts` — Removed rules from game definition, prompt, and assertions; replaced rules.json check with scripts directory check
- `app/lib/game-engine/__tests__/PackageRuntimeOrchestrator.test.ts` — Removed all rules artifact entries, rules TagPayloads, rules test case; updated scripts to module-map format
- `app/lib/game-engine/__tests__/PackageRuntimeAdapter.test.ts` — Removed rules artifacts, rules TagPayloads, definition.script assertions; updated scripts to module-map format
- `app/lib/game-engine/__tests__/ArtifactResolver.test.ts` — Removed rules artifact entry
- `app/lib/game-engine/PackageRuntimeOrchestrator.ts` — Removed dead `case "rules":` from switch
- `app/lib/game-engine/PackageRuntimeAdapter.ts` — Removed rulesPayload and `script` field from artifactsToGameDefinition

### Pre-existing Issues Found
- `workspace-snapshot.test.ts` — All 7 tests fail because `WorkspaceScaffoldService` constructor was migrated from R2Bucket to GitService, but tests still pass `testEnv.ASSETS` (R2Bucket). Not caused by this task.
- `lifecycle-integration.test.ts` — E2E test requiring running API server, not runnable in unit test environment

### Key Patterns
- Scripts module-map satisfies: `{ modules: { main: "code" }, entrypoint: "main" } satisfies TagPayloads["scripts"]`
- Hot-reload test's `runtime.applyScript` still works because mock runtime lacks `applyModules`, so scripts-handler falls back to `concatenateModules() → applyScript()`
- `logger.test.ts` uses `'rules'` as a string category — this is fine, not a typed tag

## AI Schema & Prompt Migration
- Migrated `GameDefinitionSchema` in `api/src/ai/game/schemas.ts` to script-first architecture.
- Removed `rules`, `winCondition`, `loseCondition` fields from AI generation schema.
- Added `scriptRef` to `EntityPrefabSchema` and `GameEntitySchema`.
- Cleaned up legacy `Behavior` and `Rule` schemas from `api/src/ai/game/schemas.ts`.
- Updated `CHAT_STAGE_PROMPT` in `api/src/agent/engine/prompts.ts` to remove `rules.json` and emphasize scripts.
- Updated `SYSTEM_PROMPT` and generation patterns in `api/src/ai/game/generator.ts` to use `scriptRef` and scripts for all logic.
- Genericized `api/src/ai/__tests__/validator.test.ts` and updated `api/src/ai/__tests__/generator.test.ts` to match the new architecture.
- Overwrote legacy fixture `api/src/__fixtures__/games/valid-projectile-game.json` with a script-first version.
- Verified that `tsc --noEmit` passes in the `api` directory.
## Documentation Update Learnings (Feb 2026)

- Successfully migrated all active documentation and AI skills to the **Script-First** architecture.
- Removed legacy **Rules** and **Behavior** system references from active guidance.
- Updated  skill to emphasize  and modules.
- Documented the **Publish Artifact** format (manifest + chunks) vs the **Authoring** format (loose-file).
- Updated  reference to reflect the current  state (no rules/behaviors in core contract).
- Verified that  (root and app) consistently points to the new model.


## Documentation Update Learnings (Feb 2026)

- Successfully migrated all active documentation and AI skills to the Script-First architecture.
- Removed legacy Rules and Behavior system references from active guidance.
- Updated ecs-architecture skill to emphasize scriptRef and modules.
- Documented the Publish Artifact format (manifest + chunks) vs the Authoring format (loose-file).
- Updated GameDefinition reference to reflect the current shared/src/types/ state.
- Verified that AGENTS.md (root and app) consistently points to the new model.

## Task 8: Update Bundler/Unit/Integration Tests

### Files Modified
- `packages/game-bundler/scripts/build-games.ts` — Removed `rules/gameplay.json` from BundleFiles interface and splitIntoBundleFiles output, removed `rules` from directory creation
- `packages/game-bundler/src/__tests__/ballsort-migration.test.ts` — Removed "has all 8 rules" and "has stateMachines" tests; replaced "has script content" with rawData.scripts module-map assertions; replaced sectioned `rules`/`script` checks with `modules`
- `packages/game-bundler/src/__tests__/script-scanning.test.ts` — All `gameDefinition?.script` assertions replaced with `rawData.scripts` module-map assertions; alphabetical ordering now verified via module keys instead of concatenated script string
- `packages/game-bundler/src/__tests__/virtual-bundle-integration.test.ts` — All `gameDef.rules` and `gameDef.script` assertions replaced with `rawData.scripts` module-map assertions
- `shared/src/validation/__tests__/gameDefinitionValidator.test.ts` — Rewrote entirely: removed all winCondition/loseCondition/rules tests (all removed from GameDefinition + validator); replaced with valid metadata/entity/world validation tests
- `shared/src/validation/__tests__/semantic.test.ts` — Updated validateConstantRefs tests to use prefabs fixtures instead of rules fixtures

### Key Patterns
- `GameDefinition` no longer has: `script`, `rules`, `winCondition`, `loseCondition`, `stateMachines`, `variables`
- Script content is accessed via `rawData.scripts` (module map: `Record<string, string>`)
- `BundleSections` uses `modules?: ScriptModuleMap` instead of `rules` and `script`
- Alphabetical ordering of modules verified via `Object.keys(rawData.scripts!)` equality
- The validator (`gameDefinitionValidator.ts`) no longer validates win/lose conditions, rules, or behaviors — all removed

## Task 11: Final Repo-Wide Hardening & No-Debt Audit

### Typecheck Results
- `shared`: ✅ ZERO errors
- `api`: ✅ ZERO errors
- `game-bundler`: ✅ ZERO errors

### Grep Audit Results

#### `rules.json` in source files (ts/tsx)
- `api/scripts/migrate-legacy-games.ts` line 73: **Comment only** — `// 4. Create rules.json` in a TODO list. Migration script, not active runtime.

#### `.rules` property access in source files
- `game-bundler/src/__tests__/virtual-bundle-integration.test.ts` line 30: **Test helper** — creates rules files that compiler now ignores. Updated test to reflect script-first behavior.
- `game-bundler/src/__tests__/sectioned-bridge-regression.test.ts` lines 74-75: **Pre-existing test** — reads from `r2/games/` fixture directory. Tests legacy `definition.json` files, not active code.
- `game-inspector-mcp/src/tools/snapshot.ts` line 134: **Runtime inspector** — reads `rules` from live game definition for tap target detection. This is a **runtime read path** in the inspector MCP, not the engine. Games may still have rules in their definition.json on disk. Acceptable — inspector is read-only and defensive.
- `scripts/migrate-games-to-bundles.ts` line 180: **Migration script** — one-time migration tool, not active runtime.
- `app/components/editor/code-editor/native/editor-bundle.generated.ts`: **Generated bundle** — Monaco editor bundle, not game logic.

#### `.behaviors` field access
- `app/components/editor/EditorProvider.tsx` line 383: **Active editor code** — copies `template.behaviors` when spawning entity from prefab. This is the visual editor's entity creation path. Pre-existing — the editor still supports the behaviors field on prefabs for backward compatibility with existing games.
- `app/lib/game-engine/EntityManager.ts` line 190: **Active engine code** — maps `prefab.behaviors` to `RuntimeBehavior[]`. Pre-existing — the engine runtime still processes behaviors from prefabs that have them. This is the legacy runtime support path, not new code.
- `shared/src/expressions/property-watching/DependencyAnalyzer.ts` lines 193-195: **Expression analysis** — tracks behavior dependencies for property watching. Pre-existing expression system infrastructure.

#### `templates` naming in game-bundler
- `game-bundler/scripts/build-games.ts`: **Build script** — uses `templates/all.json` as output directory name when splitting GameDefinition into bundle files. This is the TS→bundle build script, not the bundle→GameDefinition compiler. The naming is for the on-disk bundle format which still uses `templates/` directory. Pre-existing.

### Test Results

#### Migration-caused failures (FIXED)
1. `unified-loader.test.ts` snapshot — stale snapshot included rules in output. **Fixed**: updated snapshot.
2. `virtual-bundle-integration.test.ts` "errors on duplicate rule IDs" — tested legacy rule validation. **Fixed**: updated test to verify rules are ignored.

#### Pre-existing failures (NOT caused by migration)
1. `shared/src/schemas/__tests__/gameDefinitionSchema.test.ts` — imports from `r2/games/flappyBird/src/game` which no longer exists.
2. `game-bundler/src/__tests__/ballsort-migration.test.ts` (5 failures) — references `r2/games/ballSort/bundle` fixture that doesn't exist.
3. `game-bundler/src/__tests__/sectioned-bridge-regression.test.ts` (3 failures) — `headsUp` game in `r2/games/` has incomplete world config.

### Summary
- All 3 package typechecks pass with ZERO errors
- No active legacy runtime pathways for `rules.json` processing
- `.behaviors` references exist in editor/engine runtime for backward compatibility (pre-existing, not introduced by migration)
- `templates/` directory naming in build script is for on-disk format (pre-existing)
- 2 migration-caused test failures fixed
- 8 pre-existing test failures documented (all related to missing `r2/games/` fixtures)
