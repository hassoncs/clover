# Game Bundle Systematic Plan (Sisyphus)

## TL;DR

Do a **big-bang migration for Launch Games** to the new **AI-first bundle format** (many small JSON files + compile step), **without backwards compatibility**. Move all other historical test games to an archive folder (do not delete), track their migration status, and migrate them later as needed.

Scripting: keep expressions for simple cases, but **QuickJS must run on all platforms (web + native + CI)** as the long-term target.

**Primary references**:
- `docs/game-engine-architecture/GAME-BUNDLE-FORMAT.md`
- `docs/game-engine-architecture/GAME-BUNDLE-MIGRATION-PLAN.md`

**Key code references (existing infrastructure)**:
- Levels: `shared/src/types/LevelDefinition.ts`, `shared/src/types/LevelPack.ts`
- Pack loading: `shared/src/loader/LevelLoader.ts`, `shared/src/loader/PackSource.ts`
- Validation: `shared/src/validation/gameDefinitionValidator.ts`, `shared/src/validation/playable.ts`, `shared/src/expressions/validator.ts`, `shared/src/types/schemas.ts`
- Test games: `app/lib/test-games/games/*/game.ts`

**Effort**: Large
**Parallel execution**: YES (3 waves)
**Critical path**: Bundle compiler skeleton → 1 reference game running from bundle → staged rollout to more games → QuickJS integration for script-needed games

---

## Context

### Original Request
Create a “normal Sisyphus” systematic plan and place it in `.sisyphus/plans/`, using the existing architecture docs as references.

### Current State
- Games are currently stored as TypeScript files exporting `GameDefinition`, often using helpers/constants/computed arrays.
- A validation system already exists (Zod schemas + custom validators).
- A level system already exists: `LevelDefinition` (overlay) + `LevelPack` container; plus loaders/sources.

### Target State
- Games are stored as **bundle directories** with many small JSON files.
- Compiler merges + validates → outputs engine-ready `GameDefinition` (and separate editor metadata).
- **Constants** are author-time parameters; **variables** are runtime state.
- Editor metadata (tuning ranges/presets/labels) stays outside runtime game JSON.
- Scripting is staged: keep AST expressions for most cases; add QuickJS sandbox for complex runtime logic and (optionally) generators.
- Levels/UGC/persistence enabled via schema-as-contract declared by bundle.

---

## Work Objectives

### Core Objective
Deliver a migration path that is safe, incremental, testable, and aligned with the North Star bundle architecture.

### Deliverables
- Bundle compiler + loader + validator (initial skeleton + first working path)
- Updated data model supporting `{ const: "NAME" }` references and `constants` on `GameDefinition`
- At least one reference game (e.g., `flappyBird`) running from a `.bundle/` directory
- Documented staged scripting strategy (expressions first, QuickJS later) with explicit security/determinism constraints
- Bundle-level schema integration for levels + persistence (declared in manifest, validated against JSON Schema)
- Clear acceptance criteria + rollback strategy

### Must NOT Have (Guardrails)
- Do not build a full UGC distribution platform (signing/moderation/hosting) as part of migration.
- Do not add networking/fs access to runtime scripts.
- Do not refactor unrelated engine systems during early phases.
- Do not keep the old TS test-game format working during/after migration; remove/disable legacy entrypoints as needed.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Zod schemas + validators). There may or may not be a formal unit-test runner in this plan; plan includes both automated and manual verification.

### Required Evidence (per task)
- Explicit command(s) run (e.g., app load, bundle compile) and observed outcome.
- For visual gameplay, capture a screenshot in `.sisyphus/evidence/` (or a short checklist of in-app verification steps).

---

## Execution Strategy

### Parallel Waves

Wave 1 (Foundations: can start immediately)
- Task 1: Identify Launch Games + define archive strategy (no back-compat)
- Task 2: Define bundle “v1” contracts + compile outputs
- Task 3: Define staging strategy for scripting + determinism + trust model

Wave 2 (Bundle compiler + launch game migration)
- Task 4: Bundle compiler skeleton + cross-ref validator
- Task 5: Bundle loader (bundle-only path for launch games)
- Task 6: Big-bang migrate Launch Games (bundle directories) + update registry/export/sync

Wave 3 (Archive & future-proofing)
- Task 7: Move archived test games to archive folder + create migration status inventory
- Task 8: QuickJS sandbox integration across all platforms (web + native + CI)
- Task 9: Level/persistence schema declarations + validation integration (bundle-compatible)

---

## TODOs

> Each task includes: what to do, references, acceptance criteria, and recommended agent profile.

### 1) Identify Launch Games + define archive strategy (no back-compat)

**What to do**:
- Identify the exact set of **Launch Games** to big-bang migrate.
- Define the archive move:
  - Which directory is the archive destination
  - What stays referenced by registry/UI vs what becomes unreferenced
  - How we track per-game migration status
- Confirm bundle authority model:
  - Bundle as source of truth
  - Editor/runtime deltas (if any) stored separately (out of scope for initial migration unless required)

**References**:
- `docs/LAUNCH_ROADMAP.md` (core template list)
- Status field type: `app/lib/registry/types.ts` (`GameStatus`)
- Current test game locations: `app/lib/test-games/games/*/game.ts`

**Acceptance Criteria**:
- Launch game IDs are explicitly listed in this plan.
- Archive destination path is defined.
- Migration status inventory location is defined.

**Recommended Agent Profile**:
- Category: `ultrabrain` (architecture decision)
- Skills: (none required)

---

### 2) Define Bundle v1 contract and compile outputs

**What to do**:
- Lock bundle v1 expectations:
  - Required files: `manifest.json`, `constants.json`, `assets.json`, etc.
  - Optional directories: `templates/`, `entities/`, `rules/`, `scripts/`, `generators/`, `schemas/`, `levels/`.
- Define compile output objects:
  - `GameDefinition` (engine)
  - `EditorMetadata` (editor)
- Specify merge rules and duplicate ID behavior.

**References**:
- `docs/game-engine-architecture/GAME-BUNDLE-FORMAT.md` (bundle structure + compile step)
- `shared/src/types/schemas.ts` (Zod validation patterns)

**Acceptance Criteria**:
- Bundle v1 contract is documented in this plan as a bullet list with unambiguous “required vs optional”.

**Recommended Agent Profile**:
- Category: `ultrabrain`

---

### 3) Staged scripting policy (expressions → QuickJS) + determinism/trust model

**What to do**:
- Write down non-negotiables:
  - Untrusted by default for external packs/UGC
  - No I/O, no network, no host object leakage
  - Deterministic RNG policy (seeded only)
- Decide where scripts run:
  - Runtime scripts (per tick/event)
  - Generators (author/load time)
  - **QuickJS platforms: web + native + CI**
- Define budget enforcement requirements (time, memory, instruction count, engine-call count).

**References**:
- `docs/game-engine-architecture/GAME-BUNDLE-FORMAT.md` → “Scripting Architecture”
- Existing expression system: `shared/src/expressions/*` and `shared/src/expressions/validator.ts`

**Acceptance Criteria**:
- Plan includes a “Policy Table” defining:
  - trust model (bundled vs external)
  - determinism constraints
  - forbidden capabilities
  - minimum budgets to enforce

**Recommended Agent Profile**:
- Category: `ultrabrain`

---

### 4) Phase 0 groundwork: constants + constant refs + validation hooks (additive)

**What to do**:
- Add `constants` field to `GameDefinition`.
- Add `{ const: string }` reference type and widen schemas where relevant.
- Ensure compile-time cross-ref validator can validate constant references.

**References**:
- `docs/game-engine-architecture/GAME-BUNDLE-MIGRATION-PLAN.md` → Phase 0.1/0.2
- `shared/src/types/GameDefinition.ts` (add constants)
- `shared/src/types/schemas.ts` (add union types)

**Acceptance Criteria**:
- `tsc --noEmit` passes.
- Existing games still load and run (no behavior change).

**Recommended Agent Profile**:
- Category: `quick`
- Skills: (none)

---

### 5) Bundle compiler skeleton + cross-reference validation

**What to do**:
- Implement `compileBundle(bundlePath)` returning `{ gameDefinition, editorMetadata, errors, warnings }`.
- Implement file discovery + merge by type.
- Implement cross-ref validation:
  - `{ const: }` exists
  - `{ asset: }` exists
  - `{ template: }` exists
  - editor metadata keys match constants (as applicable)

**References**:
- `docs/game-engine-architecture/GAME-BUNDLE-FORMAT.md` → “Compile Step”
- `shared/src/validation/gameDefinitionValidator.ts`
- `shared/src/types/schemas.ts`

**Acceptance Criteria**:
- Given a minimal `.bundle/`, compile either:
  - produces a `GameDefinition` with zero errors, OR
  - produces deterministic, human/AI-actionable errors.

**Recommended Agent Profile**:
- Category: `unspecified-high`

---

### 6) Bundle loader + big-bang Launch Game migration

**What to do**:
- Add loader path that detects a `.bundle/` directory and compiles it.
- Remove/disable old TS test-game loading path(s) (bundle-only for launch games).
- Create bundle directories for launch games.
- Update registry/export/sync to use bundles.

**References**:
- `docs/game-engine-architecture/GAME-BUNDLE-MIGRATION-PLAN.md` → Phase 1.1–1.3
- `docs/game-engine-architecture/GAME-BUNDLE-FORMAT.md` examples
- TS source: `app/lib/test-games/games/flappyBird/game.ts`

**Acceptance Criteria**:
- All launch games load from bundle path in the app.
- Export scripts and sync script ingest launch games successfully from bundle format.

**Recommended Agent Profile**:
- Category: `unspecified-high`

---

### 7) Move archived test games to archive folder + create migration status inventory

**What to do**:
- Move all games currently marked `status: "archived"` to an archive folder (do not delete).
- Create/maintain a single markdown inventory that lists every archived game and its migration state.
- Ensure the registry no longer includes archived games unless explicitly desired.

**References**:
- Status field type: `app/lib/registry/types.ts` (`GameStatus`)
- Archived game source files: `app/lib/test-games/games/*/game.ts` (status: "archived")

**Acceptance Criteria**:
- Archived games no longer appear as selectable launch games in the app.
- Inventory document exists and lists all archived game IDs with migration state.

**Recommended Agent Profile**:
- Category: `unspecified-high`

---

### 8) QuickJS sandbox integration across all platforms (web + native + CI)

**What to do**:
- Implement the smallest viable runtime scripting layer:
  - Load a single script file
  - Provide `ScriptContext` with ID-based entity queries and batch APIs
  - Enforce budgets (time/memory/instruction/calls)
- Migrate one “script-only” game as proof (e.g., tic-tac-toe win check).

**References**:
- `docs/game-engine-architecture/GAME-BUNDLE-FORMAT.md` → “Tier 2: Runtime Scripts (QuickJS Sandbox)”
- Existing expression engine for baseline determinism/security

**Acceptance Criteria**:
- A script that loops forever is terminated reliably.
- A script that throws produces a structured error and game continues.
- Deterministic behavior validated with a fixed seed.

**Recommended Agent Profile**:
- Category: `ultrabrain`

---

### 9) Level/persistence schema declarations + validation integration

**What to do**:
- Add bundle support for:
  - `schemas/level.json` and `schemas/persistence.json`
  - manifest declarations for these schemas
- Ensure level packs and levels validate against declared schema.
- Ensure persistence blobs validate against declared schema.

**References**:
- `docs/game-engine-architecture/GAME-BUNDLE-FORMAT.md` → “Levels, Level Packs, and User-Generated Content”
- `shared/src/types/LevelDefinition.ts`
- `shared/src/types/LevelPack.ts`
- `shared/src/loader/LevelLoader.ts`, `shared/src/loader/PackSource.ts`

**Acceptance Criteria**:
- Bundled pack loads and validates.
- External pack loads and fails fast with clear schema errors when invalid.

**Recommended Agent Profile**:
- Category: `unspecified-high`

---

## Defaults Applied (per your latest direction)

- **Backwards compatibility**: NO (big-bang migration for launch games; archive the rest)
- **QuickJS targets**: web + native + CI
- **Determinism**: not a blocker (defer)
- **Trust model**: treat as trusted for now; sandbox should still prevent host harm

## Decisions Confirmed

### Launch Games (5 total)
| Name | Game ID | Status |
|------|---------|--------|
| Ball Sort | `ballSort` | To migrate |
| Breakout | `breakoutBouncer` | To migrate |
| Flappy Bird | `flappyBird` | To migrate |
| Gem Crush | `gemCrush` | To migrate |
| Slot Peggle | `slopeggle` | To migrate |

### Archive Strategy
- **Archive destination**: `app/lib/test-games/archive/`
- **Migration inventory**: `.sisyphus/notepads/game-bundle-systematic-plan/migration-inventory.md`
- **Status update**: Set `metadata.status: "archived"` for all non-launch games
- **Bundle location**: `app/lib/test-games/bundles/{gameId}.bundle/`

### Bundle v1 Contract

**Required Files:**
- `manifest.json` - Bundle entry point with name, version, title, description, engine version

**Recommended Files:**
- `constants.json` - All game constants (e.g., `BIRD_RADIUS`, `PIPE_SPEED`)
- `editor.json` - Editor metadata for constants (label, category, min/max/step)
- `assets.json` - Asset manifest mapping IDs to paths

**Optional Directories:**
- `templates/` - Template definitions (one or many JSON files)
- `entities/` - Entity definitions (one or many JSON files)
- `rules/` - Rule definitions (one or many JSON files)
- `scripts/` - Runtime scripts (one .js per script, QuickJS sandbox)
- `generators/` - Generator scripts (one .js per generator, runs at compile time)
- `schemas/` - Level/persistence JSON schemas (future)
- `levels/` - Bundled level packs (future)

**Merge Rules:**
- Arrays are concatenated
- Objects are merged (later files override earlier for same keys)
- **Duplicate IDs are an error** - each template/entity/rule must have unique ID

**Compile Outputs:**
- `GameDefinition` - Engine-ready game data (templates, entities, rules, variables, world config)
- `EditorMetadata` - Editor-only tuning info (not loaded by engine)

### Scripting Policy

**Tier 1: Expressions** (current, sufficient for most games)
- Pure functions evaluated by AST interpreter
- No side effects, no I/O, deterministic
- Examples: `{ expr: "score * 0.1" }`, `{ expr: "PIPE_SPEED + level" }`

**Tier 2: Runtime Scripts** (QuickJS sandbox)
- Platforms: **web + native + CI**
- Sandbox: No I/O, no network, no host object leakage
- API: `ScriptContext` with ID-based entity queries and batch ops
- Budget enforcement: time (10ms default), memory (1MB), instruction count (100k), engine calls (1000)
- Determinism: seeded RNG only, no Date/Math.random

**Tier 3: Generators** (compile-time TypeScript)
- Run at author/load time, not during gameplay
- Full TypeScript/Node.js capabilities
- Output validated before inclusion in bundle

**Trust Model:**
- Bundled content: trusted
- External packs/UGC: sandbox always enforced, treat as trusted for now (badging/featured system later)

---

## Success Criteria

- All Launch Games load and play correctly from bundle format.
- Bundle compiler errors are actionable and deterministic.
- Archived games are safely moved aside (not deleted) and tracked for later migration.
- Staged scripting path is explicit (expressions-first, QuickJS only where needed).
- Level/persistence schema-as-contract is supported without forcing a full UGC platform build.
