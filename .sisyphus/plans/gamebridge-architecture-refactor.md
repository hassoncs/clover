# GameBridge Architecture Refactor (No Fallbacks, Big-Bang in Chunks)

## Context

### User request summary
Refactor the Godot-side `GameBridge` into a clean architecture with:
- **One entity creation path** via an `EntityFactory`.
- **Three explicit archetypes** (`body`, `sensor`, `hitbox`) (+ optional `visual` only).
- **Single source of truth** for entity tracking (`EntityRecord` / consolidated registry).
- **One hit test implementation** (`_hit_test`) used by all input/query entry points.
- **Collision layer convention** separating physics bodies vs sensors vs hitboxes.
- **No fallback/legacy paths**: migrate chunk-by-chunk, but each chunk ends with deleting legacy.

### Constraints (non-negotiable)
- NO fallback paths.
- “Big bang in chunks”: fully switch each subsystem to the new architecture, then remove legacy paths immediately.
- No `isSensor` flag: use explicit `sensor` or `hitbox`.
- Single source of truth for entity tracking.

### In-scope files (from user)
Godot:
- `godot_project/scripts/GameBridge.gd` (shrink)
- `godot_project/scripts/entity/EntityFactory.gd` (single creation path)
- `godot_project/scripts/physics/PhysicsQueries.gd` (hit test + layer usage)

New Godot:
- `godot_project/scripts/entity/EntityRecord.gd`
- `godot_project/scripts/input/InputRouter.gd`
- (Optional) `godot_project/scripts/bridge/JSBridgeSetup.gd`

TypeScript:
- `app/lib/game-engine/hooks/useGameInput.ts` (remove geometric fallback)
- `app/lib/test-games/games/ballSort/game.ts` (use `hitbox`)
- Shared types / schema to encode `body`/`sensor`/`hitbox`

### Assumptions / items to confirm during execution (no fallback allowed)

**Decisions needed (executor must confirm early, before Phase 1 cleanup):**
1. **Hit-test eligibility**: should `_hit_test` consider `hitbox` + `body` only, or `sensor` too?
2. **Topmost policy** when multiple shapes overlap: choose highest `z_index`, last-created, or scene-tree order?
3. **Kinematic representation** in Godot: use `StaticBody2D` with velocity-style motion, or a dedicated kinematic node type (depending on engine patterns in this repo).
4. **Body-id semantics**: do we keep a `body_id` for non-body archetypes (likely no), and how do JS-facing APIs behave for sensors/hitboxes?

**Assumptions (to verify, then enforce with deletions):**
- Primary verification is manual gameplay + existing `pnpm` scripts (see “Verification”).
- Input/hit testing must preserve existing semantics (entity id returned, “topmost” choice rules).

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 0. Baseline & safety snapshot | None | Establish current behavior and a “golden” reference before deleting code paths.
| 1. Phase 1: Extract `_hit_test` | Task 0 | Must know current hit behavior to preserve it.
| 2. Phase 1 cleanup: delete duplicate hit-test paths | Task 1 | No fallbacks: after `_hit_test` exists and is wired, remove duplicates.
| 3. Phase 2: Introduce collision layer convention | Task 1 | `_hit_test` will typically need layer filtering; do it after centralizing.
| 4. Phase 2 cleanup: remove any old mask/layer conventions | Task 3 | Enforce “clean only”.
| 5. Phase 3: Define clean schema (body/sensor/hitbox) + normalize | Task 3 | Layers + hit test inform archetype semantics.
| 6. Phase 3: `EntityRecord` registry consolidation | Task 5 | Registry fields depend on final archetype + IDs.
| 7. Phase 3: Implement `EntityFactory.create(config)` and migrate all creation callers | Tasks 5,6 | Factory needs schema + registry contract.
| 8. Phase 3 cleanup: delete legacy creation methods/paths | Task 7 | Big-bang for creation: once migrated, delete old creators.
| 9. Phase 4: Shrink `GameBridge` (extract `InputRouter`, optional `JSBridgeSetup`) | Task 8 | Only after architecture is unified; otherwise extraction churn.
| 10. TS-side migration (remove geometric fallback, update games/types) | Tasks 1,5 | TS relies on hit-test path + new schema.
| 11. Final verification + regression sweep | Tasks 2,4,8,9,10 | Must be after each legacy path removed and structure stabilized.

---

## Parallel Execution Graph

Wave 1 (Start immediately):
├── Task 0: Baseline & safety snapshot

Wave 2 (After Wave 1):
├── Task 1: Extract `_hit_test`
└── Task 10: TS-side migration (can begin in parallel after Task 1 lands; schema work will gate final removal)

Wave 3 (After Wave 2):
├── Task 2: Delete duplicate hit-test paths
└── Task 3: Collision layer convention

Wave 4 (After Wave 3):
├── Task 4: Remove old layer/mask conventions
└── Task 5: Clean schema + normalize

Wave 5 (After Wave 4):
├── Task 6: EntityRecord consolidation
└── Task 7: EntityFactory + migrate creation callers

Wave 6 (After Wave 5):
├── Task 8: Delete legacy creation methods/paths
└── Task 9: Shrink GameBridge (extract modules)

Wave 7 (After Wave 6):
└── Task 11: Final verification + regression sweep

Critical Path: 0 → 1 → 3 → 5 → 7 → 8 → 11
Estimated Parallel Speedup: ~20–35% (TS migration + schema work can overlap with Godot refactor once contracts are clear).

---

## Tasks

### Task 0: Baseline & safety snapshot

**Description**: Capture current behavior and locate all legacy paths to be deleted later.

**What to do**:
- Enumerate all current entry points that perform hit tests and entity creation.
- Write down current semantics:
  - What “topmost” means today (z-index? last created? tree order?).
  - Whether sensors/hitboxes/bodies are eligible for tap selection.
  - Any filtering currently applied (collision layers, groups, etc.).
- Record a minimal “golden” manual regression checklist for:
  - Ball Sort: tap tube detects correct entity.
  - Slopeggle: tapping physics objects selects expected entity.

**Delegation Recommendation:**
- Category: `ultrabrain` — needs careful system mapping and risk control.
- Skills: [`dev-browser`, `git-master`] — verify behavior interactively; keep atomic commits.

**Skills Evaluation:**
- ✅ INCLUDED `dev-browser`: needed to run/verify web build input behavior quickly.
- ✅ INCLUDED `git-master`: supports safe incremental commits aligned to “big bang in chunks”.
- ❌ OMITTED `agent-browser`: optional; prefer local manual verification unless automation is already in place.
- ❌ OMITTED `frontend-ui-ux`: not a UI redesign.
- ❌ OMITTED `typescript-programmer`: this task is mostly inventory + docs.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: None

**Acceptance Criteria**:
- A written inventory exists listing:
  - All hit test callsites (at least the 4+ mentioned by user).
  - All entity creation functions/paths (the 4 overlapping paths).
- Manual baseline results recorded for Ball Sort + Slopeggle.

---

### Task 1 (Phase 1): Extract `_hit_test(godot_pos)` and route all hit testing through it

**Description**: Create one canonical hit test function and use it everywhere.

**What to do**:
- Implement `_hit_test(godot_pos: Vector2) -> String` in Godot, returning entity_id or empty string.
- Update all hit-test consumers to call `_hit_test`:
  - `_input()` (web mouse events)
  - `send_input()`
  - `_js_send_input()`
  - `_js_query_point_entity()`
  - Ensure `_js_query_point()` behavior is consistent (if it returns body_id, keep it but ensure it uses the same underlying query logic).
- Add one place to apply:
  - Layer filtering
  - Debug logging
  - “topmost” selection policy

**Delegation Recommendation:**
- Category: `unspecified-high` — medium complexity, high risk if semantics drift.
- Skills: [`dev-browser`, `git-master`] — verify in runtime; commit safely.

**Skills Evaluation:**
- ✅ INCLUDED `dev-browser`: validate hit behavior live.
- ✅ INCLUDED `git-master`: atomic commit.
- ❌ OMITTED `agent-browser`: only if you want repeatable click scripts; otherwise manual.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: mostly GDScript.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 0

**Acceptance Criteria**:
- There is exactly one hit test implementation (`_hit_test`) used by all input/query entry points.
- Ball Sort: tapping tube returns correct entity id.
- Slopeggle: tapping physics objects returns correct entity id.
- A quick code search shows no duplicated hit test logic outside `_hit_test`.

**Code to delete after this phase (Phase 1 cleanup list; actual deletions happen in Task 2):**
- Any duplicated point query / hit detection blocks inside:
  - `_input()`
  - `send_input()`
  - `_js_send_input()`
  - `_js_query_point_entity()`

---

### Task 2 (Phase 1 cleanup): Delete duplicate hit test logic (no fallbacks)

**Description**: Enforce “no fallback paths” by removing all old/duplicate hit test code.

**What to do**:
- Delete all non-canonical hit test logic in the 4+ callsites.
- Ensure each callsite strictly delegates to `_hit_test`.

**Delegation Recommendation:**
- Category: `quick` — should be straightforward deletions after Task 1.
- Skills: [`git-master`] — safe, small commit.

**Skills Evaluation:**
- ✅ INCLUDED `git-master`: best for safe refactor commits.
- ❌ OMITTED `dev-browser`: should already be validated in Task 1; still do smoke test after deletion.
- ❌ OMITTED `agent-browser`: not needed.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: not relevant.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 1

**Acceptance Criteria**:
- Searching for “point query” / “raycast query” logic shows only `_hit_test` contains selection logic.
- Ball Sort + Slopeggle manual checks still pass.

---

### Task 3 (Phase 2): Implement collision layer convention (bodies vs sensors vs hitboxes)

**Description**: Apply a consistent layer/mask policy:
- Layer 1: physics bodies
- Layer 2: sensors
- Layer 4: hitboxes

**What to do**:
- Define constants for layers/masks in one place (Godot-side).
- Ensure bodies:
  - collide with bodies
  - optionally overlap with sensors (depending on how overlap events are implemented)
- Ensure sensors:
  - detect bodies
  - do not block physics
  - do not “collide” with other sensors unless explicitly desired
- Ensure hitboxes:
  - participate in tap hit testing
  - do not affect physics simulation
- Update `_hit_test` to filter to eligible layers (likely hitboxes + bodies; sensors optional depending on design).

**Delegation Recommendation:**
- Category: `unspecified-high` — correctness-sensitive; subtle bugs if masks wrong.
- Skills: [`dev-browser`, `git-master`] — validate gameplay; keep changes atomic.

**Skills Evaluation:**
- ✅ INCLUDED `dev-browser`: verify collisions and tapping.
- ✅ INCLUDED `git-master`: atomic commit.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: mostly Godot.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 1

**Acceptance Criteria**:
- Physics objects collide with each other as before.
- Hitboxes do not affect physics simulation.
- Sensors detect body overlap (and only bodies, unless intentionally configured otherwise).
- `_hit_test` can (optionally) prefer hitbox over body when both overlap, with a documented policy.

---

### Task 4 (Phase 2 cleanup): Remove old layer/mask conventions and hard-coded one-offs

**Description**: Delete any legacy collision layer logic so only the new convention remains.

**What to do**:
- Remove any ad-hoc layer/mask manipulation scattered across creation paths.
- Ensure layers are set only in the entity creation path(s) that remain, using shared constants.

**Delegation Recommendation:**
- Category: `quick` — should be mostly deletions once Task 3 is in.
- Skills: [`git-master`, `dev-browser`] — quick smoke test after deletions.

**Skills Evaluation:**
- ✅ INCLUDED `git-master`: safe commit.
- ✅ INCLUDED `dev-browser`: smoke test collisions quickly.
- ❌ OMITTED `agent-browser`: not needed.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: not relevant.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 3

**Acceptance Criteria**:
- Only one documented layer convention exists; no competing bitmasks remain.
- Ball Sort + Slopeggle manual checks still pass.

---

### Task 5 (Phase 3): Implement clean schema (body/sensor/hitbox) + normalization

**Description**: Make entity archetype explicit and non-inferential.

**What to do**:
- Update shared TypeScript types to represent:
  - `collider` (shape)
  - exactly one of: `body | sensor | hitbox` (or none for visual-only)
- Add a normalizer that converts existing legacy game/entity specs into the new config dict expected by Godot.
- Update `ballSort/game.ts` to use `hitbox` instead of `collider` for tap targets (per user).

**Delegation Recommendation:**
- Category: `unspecified-high` — cross-boundary contract work (TS + Godot).
- Skills: [`typescript-programmer`, `git-master`] — TS contract changes require strong typing discipline.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`: core of this task.
- ✅ INCLUDED `git-master`: commit safety.
- ❌ OMITTED `dev-browser`: use once wiring is in; not needed for pure type work.
- ❌ OMITTED `agent-browser`: not needed.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 3

**Acceptance Criteria**:
- New schema exists and is enforced (cannot set both `sensor` and `body`, etc.).
- Ball Sort updated to use `hitbox`.
- TypeScript compilation passes (`tsc --noEmit` or repo equivalent).

---

### Task 6 (Phase 3): Consolidate tracking into `EntityRecord` + unified `entity_registry`

**Description**: Replace parallel dictionaries with a single registry record per entity.

**What to do**:
- Create `EntityRecord.gd` and migrate tracking fields:
  - `node`, `body_id`, `collider_ids`, `archetype`, `user_data`, `group`
- Update all callsites that currently touch:
  - `entities`, `sensors`, `sensor_velocities`, `body_id_map`, `body_id_reverse`, `collider_id_map`, `entity_shape_map`, `user_data`, `body_groups`
  to use `entity_registry[entity_id]`.

**Delegation Recommendation:**
- Category: `ultrabrain` — data model consolidation across a large file is risk-prone.
- Skills: [`git-master`, `dev-browser`] — keep commits small; verify behavior.

**Skills Evaluation:**
- ✅ INCLUDED `git-master`: essential.
- ✅ INCLUDED `dev-browser`: quick runtime smoke.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: mostly GDScript.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 5

**Acceptance Criteria**:
- There is one registry dict for entity tracking.
- At least the 9 legacy dictionaries are removed or become strictly derived/transitional (transitional not allowed long-term; see Task 8).
- Ball Sort + Slopeggle still run.

---

### Task 7 (Phase 3): Implement `EntityFactory.create(config)` and migrate *all* creation paths

**Description**: Single decision point for node creation.

**What to do**:
- Ensure all entity creation funnels through:
  - TypeScript entity def → normalize → `EntityFactory.create(config)`
- Implement archetype routing:
  - `body.dynamic` → `RigidBody2D`
  - `body.static/kinematic` → `StaticBody2D` (or explicit KinematicBody2D if your Godot version uses it; choose one and standardize)
  - `sensor` / `hitbox` → `Area2D` with layer/mask set by convention
- Ensure collider/fixture creation is unified (no separate `_js_create_body` + `_js_add_fixture` semantics).
- Update `PhysicsQueries.gd` to rely on the registry + the canonical collider IDs.

**Delegation Recommendation:**
- Category: `ultrabrain` — this is the main architectural change.
- Skills: [`git-master`, `dev-browser`] — iterative commits and deep verification.

**Skills Evaluation:**
- ✅ INCLUDED `git-master`: essential.
- ✅ INCLUDED `dev-browser`: verify multiple games.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: TS may be touched, but core complexity is Godot.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Tasks 5, 6

**Acceptance Criteria**:
- Creating an entity in any existing game routes through `EntityFactory.create`.
- No separate “sensor creation” path exists outside the factory.
- `_create_entity`, `_create_sensor_entity`, `_create_physics_body`, `_js_create_body`, `_js_add_fixture` are either deleted or reduced to thin adapters that call the factory (adapters are temporary and must be removed in Task 8).

---

### Task 8 (Phase 3 cleanup): Delete all legacy entity creation methods/paths (no fallbacks)

**Description**: After migration, remove all legacy creation APIs so the architecture is enforceable.

**What to delete (explicit list from user’s problem statement):**
- `_create_entity`
- `_js_create_body`
- `_js_add_fixture`
- `_create_sensor_entity`
- `_create_physics_body` (or, if it becomes the factory: rename/move it into `EntityFactory.gd` and delete the original method from `GameBridge.gd`)

Also delete/replace any callsites that reference the old dictionaries listed in Task 6.

**Delegation Recommendation:**
- Category: `unspecified-high` — deletions are simple but risk is high if anything still calls them.
- Skills: [`git-master`, `dev-browser`] — verify immediately after deletions.

**Skills Evaluation:**
- ✅ INCLUDED `git-master`: essential.
- ✅ INCLUDED `dev-browser`: verify runtime.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: not relevant.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 7

**Acceptance Criteria**:
- There is exactly one entity creation implementation: `EntityFactory.create`.
- Old methods removed and project still runs.
- All existing games still work (at least Ball Sort + Slopeggle).

---

### Task 9 (Phase 4): Shrink `GameBridge` by extracting `InputRouter` (+ optional `JSBridgeSetup`)

**Description**: Make `GameBridge` a thin orchestrator.

**What to do**:
- Move hit testing + drag state + input dispatch into `InputRouter.gd`.
- Optionally extract JS callback registration / message wiring into `JSBridgeSetup.gd`.
- Ensure `GameBridge.gd` delegates:
  - input → InputRouter
  - entity creation → EntityFactory
  - queries → PhysicsQueries

**Delegation Recommendation:**
- Category: `unspecified-high` — structural refactor, must preserve external JS API.
- Skills: [`git-master`, `dev-browser`] — incremental commits + runtime verification.

**Skills Evaluation:**
- ✅ INCLUDED `git-master`: essential.
- ✅ INCLUDED `dev-browser`: verify input + JS bridge.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: not the core.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 8

**Acceptance Criteria**:
- `GameBridge.gd` is meaningfully smaller and mostly orchestration.
- Input behavior unchanged in Ball Sort + Slopeggle.

---

### Task 10: TypeScript-side cleanup (remove geometric fallback, align games to new schema)

**Description**: Remove the runtime geometric fallback and align TS runtime with Godot-only hit testing.

**What to do**:
- In `app/lib/game-engine/hooks/useGameInput.ts`, remove geometric fallback entirely.
- Ensure TS always asks Godot for hit testing / query results.
- Update any game definitions that relied on legacy flags/fields to use `body/sensor/hitbox`.

**Delegation Recommendation:**
- Category: `unspecified-high` — touches input UX; must be verified.
- Skills: [`typescript-programmer`, `dev-browser`, `git-master`] — TS changes + runtime verification + commits.

**Skills Evaluation:**
- ✅ INCLUDED `typescript-programmer`: core.
- ✅ INCLUDED `dev-browser`: verify interaction in runtime.
- ✅ INCLUDED `git-master`: atomic commits.
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: not a redesign.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Task 1 (and Task 5 for schema completion)

**Acceptance Criteria**:
- No fallback geometric hit testing remains.
- Taps select entities correctly via Godot.
- `tsc --noEmit` (or repo equivalent) passes.

---

### Task 11: Final verification + regression sweep

**Description**: Confirm the new architecture is the only path and all key games still work.

**What to do**:
- Run whatever unit/integration tests exist for bridge code (if present).
- Manually verify:
  - Ball Sort: tap tubes → correct detection.
  - Slopeggle: tap physics objects → correct detection.
  - Sensors: overlap events fire correctly.
  - Hitboxes: taps register; do not interfere with physics.
- Confirm deletion goals:
  - No duplicate hit-test logic
  - No legacy creation functions
  - No parallel tracking dictionaries

**Delegation Recommendation:**
- Category: `unspecified-high` — verification must be careful.
- Skills: [`dev-browser`, `git-master`] — runtime checks + final cleanup commits.

**Skills Evaluation:**
- ✅ INCLUDED `dev-browser`: verification.
- ✅ INCLUDED `git-master`: final tidy commit(s).
- ❌ OMITTED `agent-browser`: optional.
- ❌ OMITTED `frontend-ui-ux`: not relevant.
- ❌ OMITTED `typescript-programmer`: only if TS fixes needed; otherwise omit.
- ❌ OMITTED `python-programmer`: not relevant.
- ❌ OMITTED `svelte-programmer`: not relevant.
- ❌ OMITTED `golang-tui-programmer`: not relevant.
- ❌ OMITTED `python-debugger`: not relevant.
- ❌ OMITTED `data-scientist`: not relevant.
- ❌ OMITTED `prompt-engineer`: not relevant.

**Depends On**: Tasks 2, 4, 8, 9, 10

**Acceptance Criteria**:
- Ball Sort and Slopeggle pass the manual checks.
- Search confirms legacy paths are removed (hit test + entity creation + old registries).
- No fallback paths exist.

---

## Commit Strategy

Use small, atomic commits aligned to the “big bang in chunks” phases:

1. `refactor(godot): centralize hit testing in _hit_test`
2. `refactor(godot): remove duplicate hit test code paths`
3. `refactor(godot): introduce collision layer convention`
4. `refactor(godot): remove legacy collision layer usage`
5. `refactor(types): add body/sensor/hitbox schema`
6. `refactor(godot): add EntityRecord registry`
7. `refactor(godot): unify entity creation via EntityFactory`
8. `refactor(godot): delete legacy entity creation paths`
9. `refactor(godot): extract InputRouter (and JSBridgeSetup)`
10. `refactor(ts): remove geometric input fallback`

Each commit should include a quick manual smoke verification note in the commit body (Ball Sort + Slopeggle).

---

## Success Criteria

### Architectural success
- One entity creation path (`EntityFactory.create`).
- Only three explicit archetypes (`body`, `sensor`, `hitbox`) (+ optional `visual`).
- One registry (`entity_registry` of `EntityRecord`).
- One hit-test implementation (`_hit_test`).
- Collision layers separated by convention and enforced.
- No legacy methods/dicts remain.

### Verification steps (commands + manual)

Because this repo’s exact commands may vary, executor should confirm the correct equivalents, but target checks are:

1. TypeScript typecheck:
   - `pnpm -w tsc --noEmit` (or repo’s `pnpm typecheck` / `pnpm lint`)
2. Any bridge tests (if present):
   - `pnpm test bridge`
   - `pnpm test:integration`
3. Manual game checks (required):
   - Run Ball Sort; tap tube; confirm entity detected.
   - Run Slopeggle; tap physics object; confirm detected.
   - Trigger a sensor overlap and confirm expected event.
   - Confirm hitboxes don’t influence physics.
