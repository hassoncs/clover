# Angry Burns: Angry Birds-style MVP + Difficulty/Seed Level Builder

## TL;DR

Build an end-of-day MVP of an **Angry Birds-style** projectile physics game (“Angry Burns”) with a **pull-back cannon / slingshot aiming mechanic** (drag to pull back; release to fire), plus a **deterministic, seed-based tower generator** whose only input is **difficulty ∈ [0,1]**. The generator produces a **LevelDefinition overlay** that plugs into the existing **LevelPack/LevelLoader** system, supports **endless regeneration** (“Next Level”), and supports **saving favorites** to local storage as a **user pack**.

**Estimated effort**: Medium (one-day MVP)

---

## Context (repo reality)

### Existing “Angry Birds-ish” baseline
- `app/lib/test-games/games/sportsProjectile/game.ts` — launcher + projectile + stacked blocks, good starting point.
- `api/src/__fixtures__/games/valid-projectile-game.json` — JSON example for drag trigger + spawn + win/lose.

### Existing “levels subsystem”
- `shared/src/types/LevelDefinition.ts` + `shared/src/types/LevelPack.ts` — generic overlay + pack schemas.
- `shared/src/loader/LevelLoader.ts` — merges pack game config into a base `GameDefinition`.
  - Note: it currently applies **Slopeggle-specific overrides only**; we’ll extend it for Angry Burns.
- Deterministic RNG patterns:
  - `shared/src/generator/SeededRandom.ts` — named substreams.
  - Reference implementation: `shared/src/generator/slopeggle/SlopeggleLevelGenerator.ts` + validators in `shared/src/validation/slopeggleValidators.*`.

### Storage primitives already exist
- `app/lib/utils/storage.ts` — cross-platform localStorage/AsyncStorage helpers.
- `app/lib/game-engine/progress/GameProgressManager.ts` — pattern for versioned persisted state (optional).

### Test infrastructure
- `shared/vitest.config.ts` — shared package tests (`src/**/*.test.ts`).

---

## Work Objectives

### Core objective
Ship a playable Angry Birds-style game loop plus a procedural level builder that:
1) generates stable-ish towers from `(seed, difficulty)` deterministically,
2) supports endless “Next Level” regeneration,
3) allows saving favorites into a LevelPack persisted locally.

### Deliverables
1. A reusable **pull-back launcher mechanic** ("slingshot") implemented as a generic pattern usable by other games.
2. New game: **Angry Burns** base `GameDefinition` (launcher + projectile + blocks + targets + win/lose).
2. New generator: `generateAngryBurnsLevel({ seed, packId, levelId, difficulty01 }) → LevelDefinition`.
3. New validators: **minimal geometry checks only** (bounds/overlap/support). No physics simulation validation.
4. LevelLoader support for `overrides.angryBurns` so `LevelDefinition` can inject per-level entities/settings.
5. Minimal UX:
   - “Next Level” (increment index)
   - “Favorite” (save snapshot)
   - “Play Favorites Pack” (load from local pack)
6. Tests (shared): determinism + validator coverage.

### Must NOT Have (guardrails)
- No special bird powers, no complex destruction materials simulation beyond existing physics.
- No ML/GAN/solver. No evolutionary search. (Heuristics + bounded retries only.)
- No large editor buildout. (Only minimal buttons for regenerate/favorite.)
- No cloud sync/sharing for favorites in v1.
- No heavy validation of “solvability” or “looks good”. If a level is weird, user regenerates.
- No physics simulation used as a generator gate.

---

## Assumptions / Defaults (user asked us to decide)

### Difficulty mapping (difficulty01 ∈ [0,1])
We’ll map difficulty to a small set of knobs (kept intentionally simple for v1):
- **Tower height (rows)**: 3 → 9
- **Footprint width (columns)**: 2 → 5
- **Target count**: 1 → 4
- **Birds / shots (initialLives)**: 5 → 3 (harder = fewer shots)
- **Material mix**: harder = more “stone-like” mass + more shielding; easier = more wood/glass-like breakable

### Level identity / endless mode
- Use a **base seed string** (e.g. `"angry-burns"`) + `levelIndex` → derived seed `"${baseSeed}:${levelIndex}"`.
- Favorites store the exact LevelDefinition snapshot (including generated entities) so generator changes don’t invalidate saved levels.

### Launcher control ("cannon" feel + pull-back aiming)
- Launcher is visually a **cannon** (stationary).
- Player drags/pulls back the **loaded projectile** (or a pull-handle) and releases to fire.
- Mechanic is implemented generically so other games can use it (not Angry Burns specific).

---

## Technical Design

### 0) Generic pull-back launcher (slingshot) mechanic

**Goal**: Implement a reusable "pull-back and release" launcher that can be used in multiple games.

**MVP behavior**
- On tap (or game start), spawn/load a projectile at the launcher.
- While dragging:
  - aim vector is derived from drag (pull-back direction)
  - show a simple aim indicator (optional for MVP)
- On drag end:
  - apply impulse to the projectile using drag vector
  - decrement lives / shots
  - optionally prevent additional shots until projectile despawns or sleeps

**Preferred implementation path (min engine churn)**
- Use existing rule triggers/actions (`drag`, `spawn`, `apply_impulse`, `lives`) plus existing behaviors (`draggable` with `mode: 'kinematic'` if needed) to avoid inventing a new input system.

**References for feasibility**
- `shared/src/types/rules.ts` includes `DragTrigger` + `SpawnAction` + `ApplyImpulseAction`.
- `shared/src/types/behavior.ts` includes `draggable` with `mode?: 'force' | 'kinematic'`.

### 1) Level output format
Use existing `LevelDefinition` and add a game-specific namespace:
- `level.overrides.angryBurns` contains the per-level “overlay” data.

**Proposed override shape (MVP):**
- `entities`: array of entities to **replace** (or insert) in `game.entities` for this level
- `initialLives` (optional; but we can also set via `level.difficulty.initialLives`)
- `worldBounds` (optional)
- `difficulty01` (metadata)

Why: `shared/src/loader/LevelLoader.ts` already has an entity merge mechanism (`mergeConfig`) and a precedent for game-specific overrides (Slopeggle).

### 2) Generator algorithm (one-day MVP)

**Approach**: grammar-ish, snapped-to-grid, rectangle blocks only.

**Archetypes (picked by seed substream; weighted by difficulty):**
1. Single tower (wide base, narrower top)
2. Twin towers with a gap
3. Platform + “protected bay” (targets under a roof)

**Placement model**
- Use a fixed “build region” on the right side of the world (launcher on left, tower on right).
- Place blocks in **rows**, each row composed of 1–N blocks.
- Snap coordinates to a small grid to reduce physics explosions.

**Determinism**
- Use `SeededRandom` substreams:
  - `layout` (archetype + row plan)
  - `materials` (template/material selection)
  - `targets` (target placement)
  - `ids` (stable entity IDs)
  - `attempt:${i}` (retry derivations)

### 3) Validator pipeline (cheap first; bounded retries)
Return `{ ok, errors[], warnings[], metrics }`.

Order (MVP):
1. Bounds check (all AABBs in world)
2. Overlap check (AABB overlap <= epsilon)
3. Support check (each non-ground block has sufficient support under its left/right “feet”)
4. Required entities (launcher, ground, >=1 target)

Retry loop:
- Keep attempts low (e.g., `maxAttempts = 3`) to stay fast.
- If still failing, return a simple known-good tower.

### 4) Minimal play loop defaults
- Win: `destroy_all` targets
- Lose: `lives_zero` (shots)
- Projectile cap: optional entity_count guard (pattern exists)

---

## Verification Strategy

### Automated tests (shared; vitest)
Add unit tests for:
- Determinism: same `(seed, difficulty01)` → deep-equal LevelDefinition output
- Validator: intentionally bad towers fail with actionable errors
- Difficulty monotonicity smoke: average block count / height generally increases with difficulty

### Manual QA (must do for MVP)
In-app:
1. Generate 20 levels across difficulties `{0, 0.25, 0.5, 0.75, 1}`.
2. Ensure:
   - no immediate spawn explosions
   - targets exist and can be hit
   - “Next Level” changes layout
   - “Favorite” persists after reload
3. Play 1–3 shots on several levels; verify win/lose triggers.

---

## Execution Strategy (parallelizable waves)

### Wave 1 (foundation): game + schema glue
Independent tasks that can run in parallel.

### Wave 2 (procgen): generator + validators + tests

### Wave 3 (UX/persistence): endless + favorites pack + load/play

---

## TODOs

> Each task includes **References** (what to open) and **Acceptance Criteria**.

### 1) Implement reusable pull-back launcher (slingshot) mechanic

**What to do**
- Implement a generic "pull-back to aim; release to fire" launcher pattern usable in other games.
- Prefer doing this with existing `drag` triggers + `spawn` + `apply_impulse` + `lives` actions and/or `draggable(mode:'kinematic')` on the loaded projectile.
- Keep it configurable via variables:
  - max pull distance
  - force multiplier
  - min pull threshold
  - projectile template id
  - cooldown / one-shot-at-a-time behavior

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `slopcade-game-builder`

**References**
- `shared/src/types/rules.ts` — `DragTrigger`, `SpawnAction`, `ApplyImpulseAction`, `LivesAction`.
- `shared/src/types/behavior.ts` — `draggable` (`mode: 'force' | 'kinematic'`).
- `app/lib/test-games/games/sportsProjectile/game.ts` — baseline drag-to-impulse pattern to adapt.

**Acceptance Criteria**
- Player can pull back and release to fire a projectile.
- The launcher implementation can be reused by another game by swapping template IDs + params.

---

### 2) Create Angry Burns base game definition (cannon + projectile + targets)

**What to do**
- Create a new Angry Burns `GameDefinition` by adapting the patterns in projectile games.
- Keep templates minimal:
  - projectile (circle)
  - target (dynamic, destructible)
  - block templates by material (wood/stone/glass) OR a single block template with tuned physics
  - ground
- Ensure rules support slingshot-like firing using existing triggers/actions.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `slopcade-game-builder`

**References**
- `app/lib/test-games/games/sportsProjectile/game.ts` — baseline template choices.
- `api/src/__fixtures__/games/valid-projectile-game.json` — drag trigger + spawn + win/lose.
- `shared/src/types/rules.ts` — actions/triggers available (`apply_impulse`, `lives`, `game_state`).
- `shared/src/types/behavior.ts` — behaviors (`spawn_on_event`, `destroy_on_collision`, `health` if needed).

**Acceptance Criteria**
- Game loads and runs without errors.
- Projectile can be launched and interact with blocks/targets.
- Win condition triggers when all targets destroyed.
- Lose condition triggers when lives exhausted.

---

### 3) Define Angry Burns level override type in shared schema

**What to do**
- Extend `shared/src/types/LevelDefinition.ts` `GameOverrides` with `angryBurns?: AngryBurnsLevelOverrides`.
- Define `AngryBurnsLevelOverrides` (in the same file for MVP) containing:
  - `difficulty01: number`
  - `entities`: per-level entities to inject/replace
  - optional `worldWidth/worldHeight`

**Recommended Agent Profile**
- Category: `quick`
- Skills: `slopcade-documentation` (optional)

**References**
- `shared/src/types/LevelDefinition.ts` — existing override pattern (`slopeggle`, `pinball`).
- `shared/src/types/GameDefinition` / entity types used by game definitions.

**Acceptance Criteria**
- Type-check passes.
- A sample `LevelDefinition` with `overrides.angryBurns` can be constructed.

---

### 4) Extend LevelLoader to apply Angry Burns overrides

**What to do**
- In `shared/src/loader/LevelLoader.ts`, add logic similar to `applySlopeggleOverrides`:
  - read `level.overrides?.angryBurns`
  - apply world bound overrides if present
  - merge/replace entities deterministically (replace by entity.id)
  - optionally apply `initialLives` from overrides/difficulty

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `slopcade-game-builder`

**References**
- `shared/src/loader/LevelLoader.ts` — existing mergeConfig + slopeggle override handling.
- `shared/src/types/LevelDefinition.ts` — `GameOverrides` contract.

**Acceptance Criteria**
- Applying a LevelDefinition with `overrides.angryBurns.entities` results in expected `game.entities`.
- LevelLoader returns no validation errors for the merged game.

---

### 5) Implement Angry Burns tower generator (deterministic)

**What to do**
- Add `shared/src/generator/angryBurns/AngryBurnsLevelGenerator.ts` that exports:
  - `generateAngryBurnsLevel({ seed, packId, levelId, difficulty01, levelIndex? })` returning a `LevelDefinition`.
- Generator emits:
  - generator provenance fields (`generatorId`, `generatorVersion`, `seed`, `generatedAt`)
  - `difficulty.initialLives`
  - `overrides.angryBurns.entities` (tower blocks + targets + ground + launcher if needed)
- Use `SeededRandom` substreams with stable ordering.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `slopcade-game-builder`

**References**
- `shared/src/generator/SeededRandom.ts` — substreams.
- `shared/src/generator/slopeggle/SlopeggleLevelGenerator.ts` — structure & determinism patterns.
- `app/lib/test-games/games/sportsProjectile/game.ts` — canonical entity sizes/world bounds.

**Acceptance Criteria**
- For fixed seed and difficulty, output is deterministic (deep-equal) across multiple runs.
- Generated entities are within bounds and do not overlap beyond epsilon.

---

### 6) Implement minimal Angry Burns validators (geometry only)

**What to do**
- Add `shared/src/validation/angryBurnsValidators.ts` with:
  - bounds validator
  - overlap validator
  - support validator
  - required-entity validator
- Add a small “generate with retries” wrapper:
  - `generateValidatedAngryBurnsLevel(...)` with `maxAttempts` and fallback.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `slopcade-game-builder`

**References**
- `shared/src/validation/slopeggleValidators.ts` + `.test.ts` — validator patterns + test style.
- `shared/src/generator/SeededRandom.ts` — attempt substreams.

**Acceptance Criteria**
- Validation errors are human-readable and identify which entity IDs are problematic.
- Generator uses low retry count; "regen" is the user-facing escape hatch.

---

### 7) Add shared unit tests (vitest)

**What to do**
- Add tests under `shared/src/**` matching `src/**/*.test.ts` include.
- Tests:
  - determinism (seed + difficulty)
  - validator failure cases
  - difficulty scaling smoke (avg counts non-decreasing)

**Recommended Agent Profile**
- Category: `quick`
- Skills: `slopcade-game-builder`

**References**
- `shared/vitest.config.ts`
- `shared/src/validation/slopeggleValidators.test.ts`

**Acceptance Criteria**
- `pnpm -C shared test` (or repo equivalent) passes.

---

### 8) Minimal UX: endless regenerate + favorite pack

**What to do**
- Add a minimal UI surface (in the Angry Burns screen/test-game) with:
  - Difficulty slider (0–1)
  - Seed input (string) and current `levelIndex`
  - “Next Level” → `levelIndex++` regenerate
  - “Favorite” → persist current `LevelDefinition` into local storage as part of a pack

Persistence model:
- Store a `LevelPack` JSON under a key like `angry-burns:favorites-pack`.

**Recommended Agent Profile**
- Category: `visual-engineering`
- Skills: `frontend-ui-ux`

**References**
- `app/lib/utils/storage.ts` — persistence.
- `app/lib/game-engine/progress/GameProgressManager.ts` — optional versioned schema pattern.
- `shared/src/types/LevelPack.ts` — pack shape.

**Acceptance Criteria**
- Favorites survive reload.
- User can view count of saved favorites.

---

### 9) Load and play the saved favorites pack

**What to do**
- Implement a local `PackSource` in app-land that reads the saved `LevelPack` from storage.
- Register it via `LevelLoader.registerSource(...)` and load it.
- Provide a minimal “Play Favorites” option to iterate saved levels.

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `slopcade-game-builder`

**References**
- `shared/src/loader/PackSource.ts` — PackSource interface.
- `shared/src/loader/LevelLoader.ts` — registering sources and applying levels.
- `shared/src/loader/__examples__/usage.ts` — examples.

**Acceptance Criteria**
- Selecting a saved favorite loads the exact same level (entities) as when saved.
- No runtime errors during load/apply.

---

### 10) Final integration QA

**What to do**
- Run through a deterministic QA script:
  - Generate N levels for fixed seed across difficulties
  - Favorite a few
  - Reload app and verify favorites
  - Play 3–5 levels, confirm win/lose

**Recommended Agent Profile**
- Category: `unspecified-low`
- Skills: `game-inspector`

**References**
- `packages/game-inspector-mcp` tools (optional automation)

**Acceptance Criteria**
- Working MVP: player can play endless levels and save/play favorites.

---

## Success Criteria

### Determinism
- Same `(seed, difficulty01, levelIndex, generatorVersion)` → same level output.

### Stability baseline
- No immediate overlap explosions on load.
- Generated structures pass validators; retry/fallback prevents hard failures.

### User value
- Endless “Next Level” feels fresh.
- “Favorite” creates a personal curated pack.
