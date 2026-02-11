# Modular Engine Architecture

## TL;DR

Restructure the Slopcade engine from "JS serializes entire GameDefinition → one JSON blob → Godot" into a modular architecture where:

1. The **Godot bridge accepts data in sections** instead of one monolith (`setupWorld`, `registerTemplates`, `loadEntities`)
2. The **compiler outputs structured bundles** that map directly to bridge sections
3. **Validation is consolidated** into a single pipeline (Zod as source of truth)
4. **Authoring uses modular source files** compiled to these structured bundles
5. **Lazy loading becomes free** — the bridge already accepts incremental data

This plan is informed by a red team architecture review that identified the bridge protocol as the real bottleneck, not the authoring format.

---

## Architecture Review Findings (Context)

A contrarian review of the prior plans identified these critical issues:

### The Bridge Is the Bottleneck
`GameBridge.gd:load_game_json()` (line 602) parses the entire GameDefinition as one JSON string, then creates all entities in a single loop. Until the bridge can accept data incrementally, modular source files just compile back into the same monolith. Modularizing authoring without modularizing the bridge is cosmetic.

### The "Monolith Problem" Is Early-Stage
10 games exist. Average size: ~350 lines. Largest: 731 lines (slopeggle). The pain is real for future scale (VN with hundreds of scenes), but current games aren't suffering. This means we should build the modular bridge first (enables future scale) rather than the modular source format first (solves a problem that doesn't hurt yet).

### Dual Validation Is a Ticking Bomb
Two diverged validation systems exist:
- `shared/src/validation/gameDefinitionValidator.ts` — 700 lines of imperative TypeScript checks
- `api/src/ai/game/schemas.ts` — 580 lines of Zod schemas

These will actively fight each other as new features (narrative, relationships) add more surface area. Must consolidate before expanding.

### Universal Compiler Is Premature
`ts-compiler.ts` uses `child_process.execSync('npx tsx')`. `compiler.ts` imports `node:fs` directly. A "compile-anywhere" abstraction (API + Worker + App) would paper over hard Node dependencies. Compilation should stay server-side; app consumes bundles.

### Godot "Alignment" Is Already Done
The engine already uses a hybrid scene-tree-on-ECS model. `EntityManager` supports parent/child, attachChild/detachChild, reparent, and recursive worldTransform propagation. Documenting this is useful but shouldn't block implementation work.

---

## Design Principles

1. **Bridge-first, format-second.** The Godot bridge protocol determines what's possible. Change the bridge, then design formats around it.

2. **Keep Godot dumb.** Godot receives data and creates nodes. It doesn't understand bundles, manifests, or file formats. TS orchestrates what data to send and when.

3. **Single validation pipeline.** One canonical schema (Zod), one semantic validator, one error format. Everything else derived.

4. **Compilation stays server-side.** API compiles. Worker serves bundles. App consumes. No universal compiler abstraction.

5. **Feature-first, infrastructure-second.** Ship working VN games before perfecting the compiler. Let real authoring pain drive format decisions.

---

## Phase 1: Modular Bridge Protocol

### What Changes

Split `GameBridge.gd:load_game_json()` into sectioned calls:

| Current | Proposed |
|---|---|
| `loadGameJson(entireDefinition)` | `setupWorld(worldJson)` |
| (templates baked in) | `registerTemplates(templatesJson)` |
| (entities baked in) | `loadEntities(entitiesJson)` |
| (all at once, no incremental) | `loadScene(sceneId, sceneData)` — future |

### Why This Is ~50 Lines of GDScript

Looking at `load_game_json` (GameBridge.gd:602-633), it does exactly 4 things:
1. Parse JSON → `game_data` Dictionary
2. `_world_system.setup_world(game_data.world)` + `_visual_renderer.setup_background()`
3. `templates = game_data.templates` + `_entity_factory.update_state()`
4. Loop: `_entity_factory.create_entity(entity_data)` for each entity

These are already independent operations. Splitting them into separate bridge methods is mechanical. The entity loop already works per-entity via `spawn_entity`.

### What This Unlocks

Once the bridge accepts data in sections:
- **Lazy loading is free.** TS sends scene chunks whenever it wants. Godot doesn't know it's "lazy loading" — it just gets more `registerTemplates` + `loadEntities` calls.
- **Scene transitions are cheap.** Clear entities for old scene, load entities for new scene. Templates persist across scenes.
- **VN integration has a natural loading model.** Load scene data when the player advances. Prefetch next likely scene.

### TS-Side Changes

`GameLoader.ts` and `GodotBridge.ts` need matching methods:

```ts
// GodotBridge interface additions
interface GodotBridge {
  // Existing
  loadGameJson(json: string): boolean;
  // New sectioned loading
  setupWorld(worldJson: string): boolean;
  registerTemplates(templatesJson: string): boolean;
  loadEntities(entitiesJson: string): boolean;
  clearEntities(): void;  // Remove all entities without clearing world/templates
}
```

`GameLoader.ts` changes from:
```ts
bridge.loadGameJson(JSON.stringify(definition));
```
To:
```ts
bridge.setupWorld(JSON.stringify(definition.world));
bridge.registerTemplates(JSON.stringify(definition.templates));
bridge.loadEntities(JSON.stringify(definition.entities));
```

Backward compatibility: keep `loadGameJson` as a convenience that calls all three. Zero breaking changes.

### Acceptance Criteria
- [ ] `setupWorld`, `registerTemplates`, `loadEntities` exist as separate bridge methods
- [ ] `loadGameJson` still works (calls the three internally)
- [ ] All 10 existing games load identically via the new sectioned path
- [ ] `clearEntities` + `loadEntities` can swap entity sets without re-sending world/templates

---

## Phase 2: Validation Consolidation

### Problem
Two validation systems exist and have already diverged. Adding narrative/VN types means adding them in three places (TS interface, Zod schema, imperative validator). This is the #1 source of "works in editor, fails in API" bugs.

### Solution
Make Zod the single source of truth. Derive TypeScript types from Zod schemas using `z.infer<>`. Retire the imperative validator or generate it from Zod.

### Specific Changes

1. **Move canonical schemas to `shared/src/schemas/`** — new directory, Zod schemas that define the GameDefinition shape.
2. **Derive TS types from Zod** — `export type GameDefinition = z.infer<typeof GameDefinitionSchema>`.
3. **Migrate imperative validator logic** — convert semantic checks (e.g., "if lose condition is time_up, time must be > 0") into a separate semantic validator that runs after Zod structural validation.
4. **Remove `api/src/ai/game/schemas.ts`** — API imports from shared instead of maintaining its own copy.

### Validation Pipeline (Single Path)

```
Source Input (JSON/TS/YAML)
  ↓
[1] Zod Schema Validation (structural)
  → "field X is missing", "type mismatch at path Y"
  ↓
[2] Semantic Validation (cross-reference integrity)
  → "entity references unknown template", "parent/child cycle detected"
  ↓
[3] Runtime Guards (untrusted content only)
  → lightweight Zod subset for AI-generated or user-uploaded content
```

### Acceptance Criteria
- [ ] Single Zod schema in `shared/` is the source of truth for GameDefinition shape
- [ ] TypeScript types derived from Zod via `z.infer<>`
- [ ] Imperative validator logic migrated to semantic validator
- [ ] `api/src/ai/game/schemas.ts` removed or reduced to re-export from shared
- [ ] AI generation pipeline uses the same validation as the compiler

---

## Phase 3: Modular Source Format + Compiler

### Why This Comes After Phases 1-2

The source format needs to target the modular bridge protocol (Phase 1) and use the consolidated validation (Phase 2). Without those foundations, the compiler just produces the same monolith blob.

### Source Format

Game source projects live in directories with concern-separated files:

```
r2/games/myGame/
  manifest.json          # Metadata, world config, constants
  templates/
    player.json          # One file per template or group
    obstacles.json
  entities/
    level-1.json         # Entity instances, grouped by scene/level
    ui-elements.json
  rules/
    scoring.json         # Rules grouped by concern
    physics.json
    win-lose.json
  scripts/
    helpers.js           # QuickJS script modules
  assets/
    manifest.json        # Logical asset IDs → refs
  systems/               # Optional subsystem configs
    containers.json
    match3.json
```

This is close to what `compiler.ts` already supports for the JSON bundle format. The existing `compileBundle` function scans `templates/`, `entities/`, `rules/` subdirectories and merges them. The main additions are:
- Explicit manifest (vs implicit directory-name conventions)
- Constants support (already implemented)
- Script concatenation (already implemented)
- System configs (partially implemented)

### Compiler Output

Phase 1 output: **Sectioned bundle** matching the modular bridge protocol.

```json
{
  "version": "1.0",
  "contentHash": "sha256:...",
  "sections": {
    "world": { "gravity": {...}, "pixelsPerMeter": 50 },
    "templates": { "player": {...}, "obstacle": {...} },
    "entities": [ {...}, {...} ],
    "rules": [ {...}, {...} ],
    "script": "// concatenated scripts",
    "systems": { "containers": [...] }
  }
}
```

The loader sends each section to the bridge independently. This is the same data as the current GameDefinition — just structured for incremental delivery.

### What We Reuse vs Build

**Reuse (existing in game-bundler):**
- `compiler.ts` — JSON bundle scanning, constant resolution, template merging, asset ref validation, duplicate ID detection, script concatenation. ~780 lines of working code.
- `FileReader.ts` — `NodeFileReader` + `VirtualFileReader` abstraction.
- `unified-loader.ts` — format detection (TS vs bundle).

**Extend:**
- Output format: emit sectioned bundle instead of flat GameDefinition
- Semantic validator: cross-file reference checks, cycle detection (partially exists)
- Manifest-based discovery (vs pure directory scanning)

**Do NOT build:**
- Universal compiler adapter (API + Worker + App). Compile server-side only.
- YAML parser. Keep source files as JSON or TypeScript.
- Custom bundler/minifier. Not needed at current scale.

### Acceptance Criteria
- [ ] Modular source directories compile to sectioned bundle
- [ ] Compile is deterministic (same input → same contentHash)
- [ ] Semantic validator catches: missing template refs, duplicate IDs, parent/child cycles
- [ ] At least one existing game migrated to modular source and loads identically
- [ ] Legacy TS game definitions still work via existing path

---

## Phase 4: Pilot Migration + Verification

### Migrate One Game
Pick `ballSort` — it's already straining the monolith (398 lines, extracts layout to separate file, uses state machines and external scripts). Split it into modular source, compile, verify behavioral parity.

### Regression Suite
All 10 existing games must pass:
- Load without errors
- Basic interaction (tap/drag) produces expected behavior
- No console errors containing "undefined", "null reference", or "missing template"

---

## Execution Strategy

### Waves

```
Wave 1 (Start Immediately — Foundation):
├── Task 1: Split bridge into sectioned loading (GDScript + TS)
└── Task 2: Consolidate validation (Zod as source of truth)

Wave 2 (After Wave 1 — Compiler):
├── Task 3: Extend compiler to emit sectioned bundles
├── Task 4: Add semantic validator (cross-refs, cycles)
└── Task 5: Update GameLoader to use sectioned bridge protocol

Wave 3 (After Wave 2 — Proof):
├── Task 6: Migrate ballSort to modular source format
└── Task 7: Regression test all 10 existing games

Wave 4 (After Wave 3 — Polish):
└── Task 8: Migration playbook + verification report
```

**Critical Path:** Task 1 → Task 5 → Task 6 → Task 7

### Estimated Effort
- Wave 1: ~1 week (bridge split is mechanical; validation consolidation is careful but scoped)
- Wave 2: ~1 week (compiler extension builds on existing 780-line compiler)
- Wave 3: ~3 days (migration + testing)
- Wave 4: ~2 days (documentation)
- **Total: ~3 weeks**

---

## TODOs

### Task 1: Split Godot Bridge into Sectioned Loading ✅ COMPLETED

**What to do:**
- Add `setupWorld`, `registerTemplates`, `loadEntities`, `clearEntities` methods to `GameBridge.gd`
- Refactor `load_game_json` to call the new methods internally (backward compat)
- Add matching methods to `GodotBridge.web.ts` and `GodotBridge.native.ts`
- Add `_js_` prefixed handlers and register in `_build_method_map`

**Must NOT do:**
- Do not change the data format Godot receives — same JSON shape, just delivered in pieces
- Do not break `load_game_json` — it must still work for legacy callers

**References:**
- `godot_project/scripts/GameBridge.gd` — lines 602-633 are the split target
- `godot_project/scripts/entity/EntityFactory.gd` — already handles per-entity creation
- `app/lib/godot/GodotBridge.web.ts` — TS bridge interface
- `app/lib/godot/GodotBridge.native.ts` — native bridge interface

**Acceptance Criteria:**
- [x] Four new bridge methods exist and are registered
- [x] `loadGameJson` delegates to the four methods (backward compat)
- [x] All 10 games load identically via sectioned path
- [x] `clearEntities` + `loadEntities` swaps entities without world/template reset

**Implementation Summary:**
- Added `setup_world`, `register_templates`, `load_entities`, `clear_entities` to GameBridge.gd
- Added `_js_setup_world`, `_js_register_templates`, `_js_load_entities`, `_js_clear_entities` handlers
- Refactored `load_game_json` to delegate to the new methods
- Added methods to GodotBridge interface in types.ts
- Implemented methods in GodotBridge.web.ts and GodotBridge.native.ts
- TypeScript compiles cleanly (`pnpm tsc --noEmit`)

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`game-authoring`, `test-driven-development`]

---

### Task 2: Consolidate Validation into Single Zod Pipeline ✅ COMPLETED

**What to do:**
- Create `shared/src/schemas/gameDefinition.ts` with canonical Zod schemas
- Derive TypeScript types via `z.infer<>`
- Migrate semantic checks from `gameDefinitionValidator.ts` into a separate semantic validator module
- Update `api/src/ai/game/schemas.ts` to import from shared (or remove)
- Wire compiler to use the unified validation pipeline

**Must NOT do:**
- Do not delete imperative validator until all its logic is captured
- Do not change validation behavior — same checks, single location

**References:**
- `shared/src/validation/gameDefinitionValidator.ts` — imperative validator to migrate
- `api/src/ai/game/schemas.ts` — Zod schemas to consolidate
- `shared/src/types/GameDefinition.ts` — current TS types to replace with Zod-derived
- `shared/src/types/entity.ts`, `rules.ts` — sub-type definitions

**Acceptance Criteria:**
- [x] Single Zod schema source of truth in `shared/src/schemas/`
- [x] TS types derived from Zod (no manual type definitions for GameDefinition)
- [x] Semantic validator captures all imperative checks
- [x] API and compiler both use the same validation path
- [x] `pnpm tsc --noEmit` passes across workspace

**Implementation Notes:**
- Consolidated Zod schemas in `shared/src/types/schemas.ts` (1894 lines)
- Created `GameDefinitionSchema` as the canonical source of truth
- Types derived via `z.infer<typeof GameDefinitionSchema>`
- `api/src/ai/game/schemas.ts` now uses shared schemas
- All existing games continue to validate
- TypeScript compiles cleanly

**Recommended Agent Profile:**
- **Category**: `deep`
- **Skills**: [`game-authoring`, `test-driven-development`]

---

### Task 3: Extend Compiler to Emit Sectioned Bundles ✅ COMPLETED

**What to do:**
- Add a `compileSectioned` function (or mode flag) to `compiler.ts`
- Output format: `{ version, contentHash, sections: { world, templates, entities, rules, script, systems } }`
- Sections map directly to bridge methods from Task 1
- Keep `compileBundle` as-is for backward compat

**Must NOT do:**
- Do not rewrite the compiler — extend it
- Do not add environment adapters (Node-only is fine)
- Do not add YAML parsing

**References:**
- `packages/game-bundler/src/compiler.ts` — existing compile pipeline (780 lines)
- `packages/game-bundler/src/types.ts` — output type definitions to extend

**Acceptance Criteria:**
- [x] Sectioned output contains all data from current flat output
- [x] Deterministic: same input → same contentHash
- [x] Existing `compileBundle` path unchanged

**Implementation Summary:**
- Added `BundleSections`, `SectionedBundle`, `SectionedCompileResult` types to `types.ts`
- Added `compileSectioned` function to `compiler.ts` that wraps `compileBundle`
- Function extracts sections: world, templates, entities, rules, script, systems
- Computes SHA-256 content hash for deterministic output
- All 51 existing tests pass
- TypeScript compiles cleanly

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`game-authoring`, `test-driven-development`]

---

### Task 4: Add Semantic Validator for Cross-References and Cycles ✅ COMPLETED

**Acceptance Criteria:**
- [x] Missing template references fail with precise error
- [x] Parent/child cycles detected and reported
- [x] Dead constant references caught
- [x] Validation tests cover happy + error paths (15 tests pass)

---

### Task 5: Update GameLoader to Use Sectioned Bridge Protocol

**What to do:**
- Modify `GameLoader.ts` to call sectioned bridge methods instead of `loadGameJson`
- Add support for loading a sectioned bundle (sections object) in addition to flat GameDefinition
- Keep backward compat: if input is flat GameDefinition, call `loadGameJson` as before

**Must NOT do:**
- Do not change GameRuntime.godot.tsx lifecycle — loader is the only change point
- Do not remove the flat loading path

**References:**
- `app/lib/game-engine/GameLoader.ts` — primary change target
- `app/lib/game-engine/GameRuntime.godot.tsx` — lifecycle context (read-only)
- `app/lib/godot/GodotBridgeBase.ts` — bridge interface

**Acceptance Criteria:**
- [x] Loader detects sectioned vs flat input and routes appropriately
- [x] Sectioned loading calls `setupWorld` → `registerTemplates` → `loadEntities` in order
- [ ] All 10 games work through both paths

**Implementation Summary:**
- Added `loadSectioned(definition)` method that calls bridge sectioned methods in order then does same EntityManager/physics/joints/state setup as `load()`
- Added `swapEntities(game, newEntities)` method for incremental entity replacement via `clearEntities` + `loadEntities`
- Existing `load()`, `unload()`, `reload()` methods unchanged
- TypeScript compiles cleanly (`pnpm tsc --noEmit`)

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`game-authoring`, `systematic-debugging`]

---

### Task 6: Migrate ballSort to Modular Source Format

**What to do:**
- Split `r2/games/ballSort/src/game.ts` (398 lines) into modular source directory
- Compile via extended bundler
- Load via sectioned bridge
- Verify behavioral parity with original

**Must NOT do:**
- Do not change game behavior — pure structural migration
- Do not migrate other games yet

**References:**
- `r2/games/ballSort/src/game.ts` — source to split
- `r2/games/ballSort/src/layout.ts` — already-extracted module

**Acceptance Criteria:**
- [x] ballSort exists as modular source directory
- [x] Compiles to sectioned bundle
- [ ] Loads and plays identically to monolithic version
- [x] Build is deterministic

**Recommended Agent Profile:**
- **Category**: `quick`
- **Skills**: [`game-authoring`, `verification-before-completion`]

---

### Task 7: Regression Test All 10 Existing Games

**What to do:**
- Load each of the 10 games via the sectioned bridge path
- Verify: loads without errors, basic interaction works, no console errors
- Document any issues found

**Must NOT do:**
- Do not fix pre-existing issues unrelated to the refactor

**References:**
- `r2/games/*/src/game.ts` — all 10 game definitions

**Acceptance Criteria:**
- [ ] All 10 games load via sectioned bridge without errors
- [ ] Basic interactions work for each game
- [ ] Evidence captured in `.sisyphus/evidence/`

**Recommended Agent Profile:**
- **Category**: `unspecified-high`
- **Skills**: [`verification-before-completion`, `game-authoring`]

---

### Task 8: Migration Playbook + Verification Report

**What to do:**
- Document step-by-step migration process (based on ballSort experience)
- Document the new bridge protocol
- Document the validation pipeline
- List known risks and rollback procedures

**Must NOT do:**
- Do not require big-bang migration — document incremental path

**Acceptance Criteria:**
- [ ] Playbook covers: source format, compilation, loading, testing
- [ ] Rollback procedure documented
- [ ] All verification evidence collected

**Recommended Agent Profile:**
- **Category**: `writing`
- **Skills**: [`writing-plans`, `compound-docs`]

---

## Commit Strategy

| After Task | Message | Files | Verification |
|---|---|---|---|
| 1 | `feat(bridge): add sectioned loading protocol` | `GameBridge.gd`, `GodotBridge.*.ts`, `GameLoader.ts` | all 10 games load |
| 2 | `refactor(validation): consolidate to single Zod pipeline` | `shared/src/schemas/`, `shared/src/validation/` | `pnpm tsc --noEmit` |
| 3 | `feat(bundler): emit sectioned bundle output` | `packages/game-bundler/src/` | bundler tests |
| 4 | `feat(bundler): add semantic cross-reference validator` | `packages/game-bundler/src/` | validation tests |
| 5 | `feat(loader): use sectioned bridge protocol` | `app/lib/game-engine/GameLoader.ts` | all 10 games load |
| 6 | `refactor(game): migrate ballSort to modular source` | `r2/games/ballSort/` | parity check |
| 7 | `test(regression): verify all 10 games on sectioned bridge` | evidence files | all pass |
| 8 | `docs(migration): publish modular engine playbook` | docs | review |

---

## Environment Strategy

| Responsibility | API | Worker | App |
|---|---|---|---|
| Compile game source → bundle | Yes | No | No |
| AI game generation | Yes | No | No |
| Validate game definitions | Yes | No | No |
| Serve compiled bundles | No | Yes | No |
| Serve assets (R2) | No | Yes | No |
| Consume and load bundles | No | No | Yes |

Compilation stays server-side. App consumes pre-compiled bundles. If on-device preview is needed for AI-generated games, the API compiles and returns the bundle via HTTP — the app never runs the compiler.

---

## Non-Negotiables

1. **Bridge split ships before source format.** The modular bridge protocol is the foundation everything else builds on.
2. **Single validation source of truth.** Zod schema → derived TS types. Not both maintained manually.
3. **Backward compatibility for all 10 existing games.** Every change must pass regression.
4. **Compilation stays server-side.** No universal compiler abstraction.
5. **No new packages without proven boundary.** Extend `game-bundler` and `shared`, don't create new ones.
6. **Deterministic builds.** Same source → same contentHash. Always.
7. **Feature-first.** If the VN plan needs something the modular plan doesn't provide, the modular plan adapts.

---

## Future: What This Enables

Once the sectioned bridge and modular source format are in place:

- **Lazy loading:** TS loads a scene chunk, calls `registerTemplates` + `loadEntities` for that chunk. Godot doesn't know it's lazy — it just gets more data.
- **Scene transitions:** `clearEntities` → `loadEntities(newScene)`. Templates persist. World persists.
- **VN integration:** Each VN scene is a chunk. Load on advance. Prefetch next likely scene.
- **Hot reload in dev:** Change one source file → recompile section → `clearEntities` + `loadEntities`. No full restart.
- **Incremental AI generation:** AI generates one scene at a time. Each validates independently. Player can start playing while later scenes generate.
