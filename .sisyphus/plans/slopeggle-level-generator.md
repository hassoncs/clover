# Slopeggle Automatic Level Generator (Deterministic, JSON Levels)

## TL;DR

Build a **deterministic runtime level generator** for Slopeggle that outputs a **generic `LevelDefinition` JSON overlay** (not a full GameDefinition), with **fast heuristic validation** and **Peggle-like cosmetic peg motion** (slow, looped, eased, group-phased) that **never changes collision fairness**.

**Deliverables**:
- A reusable `@slopcade/shared` **level schema + generator interface** for “games with levels”.
- A `slopeggle` generator implementation that produces pegs/lives + difficulty knobs.
- A loader that merges `LevelDefinition` overlays with the base `slopeggle` `GameDefinition`.
- A minimal “packs” mechanism: load levels from **bundled repo JSON** and **remote packs**.

**Estimated Effort**: Medium

---

## Context

### Original Request
Plan an automatic Peggle-style level generator with “friendly/fair” motion semantics:
- slow drifting loops; easing; group motion with phase offsets
- **no teleporting / no fast unpredictable motion / no abrupt collision changes**
- “physics lies, visuals dance”: render can move but physics must remain fair

### Confirmed Requirements
- Target runtime: **Slopcade Slopeggle (Godot + TypeScript bridge)**
- Generation: **runtime generator**
- Storage: **JSON** used generically for “all games with levels”
- JSON shape: **LevelDefinition overlay** applied onto a base `GameDefinition`
- SVG: **internal intermediate only** (not stored, not hand-authored)
- Validation: **heuristics only** (fast), no solver/simulation gating
- Difficulty knobs: **orange peg count**, **lives**, **orange accessibility**
- Motion: **cosmetic only** (should not meaningfully affect difficulty)
- Determinism: **hard requirement** (same seed => same level)
- Testing: **manual QA** (no automated tests)

### Codebase Reference Points (to follow patterns)
> Executor should open these to match conventions.

- `app/lib/test-games/games/slopeggle/game.ts` — existing Slopeggle `GameDefinition` + peg layout generator and tags/rules.
- `shared/src/types/behavior.ts` — existing behavior types (`oscillate`, `scale_oscillate`, phase support).
- `app/lib/game-engine/behaviors/MovementBehaviors.ts` — oscillation math patterns.
- `app/lib/game-engine/behaviors/VisualBehaviors.ts` — visual-only oscillation/pulse patterns.
- `shared/src/systems/path/*` — `PathDefinition` sampling (linear/bezier/catmull-rom), usable instead of full SVG parsing.
- `shared/src/expressions/evaluator.ts` — `createSeededRandom` PRNG.
- `app/lib/test-games/games/ballSort/puzzleGenerator.ts` — seed hygiene patterns and generator structuring.
- `shared/src/systems/layout/helpers.ts` — spatial distribution helpers (row/grid/circular).

---

## Work Objectives

### Core Objective
Provide a reusable “levels” subsystem (schema + generation + loading) that can power Slopeggle now and other games later, while keeping Peggle-like motion and fairness constraints.

### Definition of Done (global)
- A level pack can be loaded from **local JSON** and **remote JSON**, merged onto the base `slopeggle` game, and played.
- For a fixed seed/config, generator returns the **same level JSON** (stable ordering) across runs.
- Generated levels pass heuristic validators and look/play reasonable under manual playtesting.
- Cosmetic peg motion is looped/eased/group-phased and does **not** alter collision geometry.

### Critical Unknowns (to resolve during execution)

> These require verifying current Slopeggle/base-engine behavior.

- **Playfield envelope & forbidden zones**: exact bounds + no-peg regions (launcher lane, bucket path, UI occlusion margins).
- **Orange accessibility metric**: pick a concrete numeric heuristic + thresholds.
- **Pack identity & versioning**: how to avoid collisions between bundled levels and remote packs (IDs, namespaces, schema upgrades).
- **Render-only motion mechanism**: confirm the best place to apply visual offsets (sprite/visual node) while keeping collider static.

### Must NOT Have (Guardrails)
- No physics simulation stepping to validate solvability.
- No authoring tooling (editors), no persistent SVG templates.
- No moving colliders for pegs in v1 (visual-only movement only).
- No dependency on `Math.random()` in generation.

---

## Verification Strategy (Manual QA)

Because automated tests are out of scope, each task includes manual verification steps. The executor should also capture evidence (screenshots and/or console outputs) in `.sisyphus/evidence/` when relevant.

**Recommended manual QA loop** (repeat for several seeds and difficulties):
1. Generate level (seed + difficulty knobs)
2. Validate (fast heuristics) → errors must be actionable
3. Load into Slopeggle base definition
4. Play 1–3 shots to sanity-check orange accessibility + fairness
5. Verify motion is subtle and “reads” as cosmetic

**Performance target (default)**:
- Generation + validation should be fast enough for runtime use. Default target: **p95 < 10ms** on desktop dev, and “feels instant” on device.

---

## Execution Strategy

### Parallelization Waves

Wave 1 (Schema + Interfaces):
- Define `LevelDefinition` JSON schema + pack format + versioning
- Define generator interface + deterministic RNG substreams

Wave 2 (Slopeggle generator + validators):
- Implement peg placement generator with difficulty knobs
- Implement heuristic validators (bounds/spacing/forbidden zones/accessibility)

Wave 3 (Loader + pack sources):
- Merge `LevelDefinition` onto base `slopeggle` `GameDefinition`
- Load from repo-bundled JSON + remote pack

Wave 4 (Cosmetic motion):
- Add motion assignment + group phase offsets using existing behavior primitives
- Ensure physics/collision invariants

---

## TODOs

> Notes:
> - Since we’re manual QA only, acceptance criteria are specific about what to run/check.
> - File paths below are references/patterns; executor should confirm exact locations when implementing.

### 1) Define generic JSON level & pack schema (shared)

**What to do**:
- In `@slopcade/shared`, define a `LevelDefinition` (overlay) type that can be applied to a base `GameDefinition`.
- Include required metadata for determinism + compatibility:
  - `schemaVersion` (number)
  - `generatorId` and `generatorVersion` (string)
  - `seed` (number|string)
  - `levelId` (string)
  - optional `difficulty` fields
- Define a `LevelPack` container format:
  - pack id/name/version
  - list/map of `LevelDefinition`s
  - optional base-game id compatibility (e.g., `baseGameId: "slopeggle"`)

- Add pack/level identity guardrails:
  - `packId` + `levelId` namespace rules (e.g., `${packId}:${levelId}`)
  - schema upgrade strategy for remote packs

**Guardrails**:
- Don’t store full `GameDefinition` per level.
- Keep schema game-agnostic; Slopeggle-specific fields live in a namespaced section like `overrides.slopeggle`.

**Recommended Agent Profile**:
- Category: `unspecified-high`
- Skills: `slopcade-documentation`

**References**:
- `shared/src/types/GameDefinition.ts` — base contract being overlaid.
- `app/lib/test-games/games/slopeggle/game.ts` — what changes per “level” (pegs, lives, etc.).
- `api/src/ai/validator.ts` / `shared/src/types/schemas.ts` — existing validation/schema patterns.

**Acceptance Criteria (Manual)**:
- Create an example `LevelDefinition` JSON and `LevelPack` JSON and validate it loads/parses in dev (no runtime crashes).
- Confirm IDs are collision-safe across bundled + remote packs.

---

### 2) Deterministic RNG contract + named substreams (shared)

**What to do**:
- Define a deterministic RNG API for generators:
  - base seed → derive named substream RNGs (`layout`, `oranges`, `motion`, `ids`, etc.)
  - ensure order-of-iteration changes don’t accidentally change unrelated randomness.
- Implement a small helper to hash `(seed, streamName)` → sub-seed.

**Guardrails**:
- Ban `Math.random()` usage inside generator paths.

**References**:
- `shared/src/expressions/evaluator.ts` — `createSeededRandom`.
- `app/lib/test-games/games/ballSort/puzzleGenerator.ts` — seeded RNG usage patterns.

**Acceptance Criteria (Manual)**:
- Generate twice with same seed → JSON output identical (after stable key ordering).
- Changing a non-layout stream call doesn’t change layout stream output.

**Recommended default**:
- Use canonical JSON serialization for comparisons (stable key ordering) to support “byte-identical” determinism checks.

---

### 3) Slopeggle LevelDefinition overlay model

**What to do**:
- Define the Slopeggle-specific overlay fields needed for generation:
  - `pegs`: positions + type (blue/orange) + optional motion params
  - `lives`
  - any required per-level metadata (e.g., target orange count)

**References**:
- `app/lib/test-games/games/slopeggle/game.ts` — current peg array shape and orange marking.

**Acceptance Criteria (Manual)**:
- A hand-written overlay with a few pegs + lives can be merged onto the base game and played.

---

### 4) Heuristic validators (fast) for Peggle-style boards

**What to do**:
Implement validators that return a list of human-readable errors:
- **Bounds & forbidden zones**: no pegs in launcher lane / bucket path / margins.
- **Spacing**: minimum peg-to-peg distance; no overlaps.
- **Orange peg count**: matches requested knob.
- **Orange accessibility metric** (heuristic): define a numeric score and enforce a threshold.

**Suggested “orange accessibility” heuristics** (pick a v1 and document it):
- Ray fan coverage: cast a fan of sample shot lines from launcher, count oranges within distance-to-ray threshold.
- Reachability proxy: oranges must be within a convex-ish region of typical ball travel (exclude extreme corners).
- Multi-bounce allowance: allow oranges that are within N “bounce corridor” regions.

**Decision needed (executor should resolve by inspection and document)**:
- Define the launcher origin and typical shot fan for Slopeggle.
- Define the forbidden zones numerically.
- Choose one accessibility heuristic + thresholds.

**Guardrails**:
- No physics stepping.

**References**:
- `shared/src/validation/*` (e.g., `shared/src/validation/playable.ts`) — existing validation style.
- Slopeggle definition for launcher/bucket entity positions: `app/lib/test-games/games/slopeggle/game.ts`.

**Acceptance Criteria (Manual)**:
- Running validation on a few intentionally-bad levels yields clear, specific errors.
- Generated levels pass validation for common difficulties.

---

### 5) Runtime generator: peg placement algorithm (Slopeggle)

**What to do**:
- Implement a generator function that produces a Slopeggle `LevelDefinition` overlay from:
  - `seed`
  - difficulty knobs: `orangeCount`, `lives`, `orangeAccessibilityTarget`
- Use a “base placement + constraint repair” approach:
  - sample candidate peg positions (grid jitter / rings / bands)
  - enforce spacing + bounds
  - pick oranges according to accessibility target (and/or re-place until threshold)
- Keep it deterministic via the RNG contract.

**References**:
- `app/lib/test-games/games/slopeggle/game.ts` — existing row-based generation to mimic feel.
- `shared/src/systems/layout/helpers.ts` — distribution helpers.

**Acceptance Criteria (Manual)**:
- Generate 20 levels across a few difficulty configs; visually inspect distribution.
- Play-test 3–5 generated levels; ensure orange accessibility feels consistent with knob.

---

### 6) Cosmetic motion assignment system (Peggle-like)

**What to do**:
- Implement “motion = anchor + path offset” as **render-only**.
- Reuse existing behavior types where possible:
  - `oscillate` (x/y/both) for drift/bob
  - `scale_oscillate` for subtle pulse
- Add a motion assignment phase:
  - detect clusters (spatial radius)
  - assign shared motion type + staggered phase offsets (noise from position)
  - cap amplitude and speed (slow time scale)

**Defaults (safe, override if needed)**:
- Time scaling: `t += dt * 0.15` equivalent.
- Amplitude cap: render displacement <= ~10–15% of peg radius.
- Speed cap: slow enough that motion is not immediately noticeable.

**Key fairness rule**:
- Collision center stays at anchor; render position offsets only.

**References**:
- `shared/src/types/behavior.ts` — existing behavior types + phase.
- `app/lib/game-engine/behaviors/VisualBehaviors.ts` — visual oscillation patterns.
- `godot_project/scripts/GameBridge.gd` — entity node structure; where to apply visual offsets.

**Acceptance Criteria (Manual)**:
- In-game: pegs visibly drift subtly (slow), looping, with group phase offsets.
- Collisions feel unchanged compared to static pegs (no “moving target” frustration).

---

### 7) Level loader + pack sources (repo + remote)

**What to do**:
- Implement a loader that:
  - loads `LevelPack` JSON from bundled files
  - loads remote pack JSON from API/CDN
  - merges `LevelDefinition` onto base `GameDefinition` (slopeggle)
  - handles schemaVersion/generatorVersion mismatches gracefully

**Guardrails**:
- Avoid building a full “distribution/auth” system; just implement loading and selection.

**References**:
- `app/lib/test-games/games/slopeggle/game.ts` — base definition.
- Existing patterns for loading definitions/packs in app (executor should search within app for pack loading patterns).

**Acceptance Criteria (Manual)**:
- Demonstrate: play a level from bundled pack, then swap to a level from remote pack.

---

### 8) Manual QA checklist + evidence capture

**What to do**:
- Add a short dev-facing doc/checklist describing:
  - how to generate a level by seed
  - how to validate
  - how to load from pack
  - recommended motion settings
- Capture screenshots for a few seeds/difficulties.

**Acceptance Criteria (Manual)**:
- A new contributor can follow the checklist to generate + play a level.

---

## Success Criteria

- Deterministic: Same seed/config yields same LevelDefinition JSON.
- Valid: Generated levels pass bounds/spacing/orange-count/accessibility heuristics.
- Playable: Manual playtests show reasonable orange accessibility and fun layouts.
- Fair motion: Motion is subtle, looped, eased, group-phased, and collider stays fixed.
