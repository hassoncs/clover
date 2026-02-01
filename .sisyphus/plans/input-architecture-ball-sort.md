# Input Architecture: Make collider-only entities queryable (Ball Sort tube taps)

## TL;DR

> **Quick Summary**: Fix tap detection by ensuring **any entity with `collider` but no `physics` is created as an `Area2D`** (queryable via `intersect_point()`), rather than `Node2D + CollisionShape2D`.
>
> **Deliverables**:
> - Collider-only entities become `Area2D` hitboxes by default in `EntityFactory.gd`
> - Ball Sort tube sensors become tappable without needing `collider.isSensor=true`
> - Manual QA procedure to validate tap + regression behaviors
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO (single critical path)
> **Critical Path**: Update Godot entity creation → run manual QA in Ball Sort + spot checks

---

## Context

### Original Request
Ball Sort tubes (tube sensors) aren’t responding to taps. Root cause: collider-only entities were being created as `Node2D + CollisionShape2D`, which **does not participate in physics queries** like `direct_space_state.intersect_point()`.

### Key Findings (verified in repo)
- `godot_project/scripts/entity/EntityFactory.gd`
  - `create_entity()` merges template + entity data and chooses creation pathway.
  - Current logic already routes **any `collider_data` without `physics_data`** into `create_area2d_entity()`:
    - `elif collider_data: node = create_area2d_entity(entity_id, collider_data, transform_data)` (around lines ~108-111)
  - There is an explicit comment noting the prior “plain Node2D collider add” block is no longer needed.
  - `create_area2d_entity()`:
    - Creates `Area2D`
    - Adds `CollisionShape2D` using `create_collider_shape(collider_data)`
    - Defaults: `collision_layer = collider_data.get("categoryBits", 2)`; `collision_mask = collider_data.get("maskBits", 0)`
    - Allocates `body_id` into `body_id_map` for compatibility.

- `godot_project/scripts/physics/PhysicsQueries.gd`
  - `query_point()` and `query_point_entity()` both set:
    - `collide_with_bodies = true`
    - `collide_with_areas = true`
  - Both resolve hits when `collider.name in bridge.entities`.

- `app/lib/game-engine/hooks/useGameInput.ts`
  - `findEntityAtPoint()` first tries `physics.queryPoint({x,y})`, then falls back to geometric `isPointInCollider()` for entities without `bodyId`.
  - Decision: **keep fallback for defense-in-depth** in this change.

- `app/lib/test-games/games/ballSort/game.ts`
  - `tubeSensor` template has a `collider` but no `physics` and no `isSensor`.

### Decision (from user)
- Apply the behavior **globally**: *any* entity with `collider` but no `physics` should become queryable via `Area2D`.
- Manual QA only; test infra for input hit-testing is out of scope.

---

## Work Objectives

### Core Objective
Guarantee that “collider-only” entities are queryable by point queries, fixing Ball Sort tube taps and preventing the same class of bug in future games.

### Must Have
- Entities with `{ collider: ... }` and **no** `{ physics: ... }` are instantiated as `Area2D` with a `CollisionShape2D`.
- `PhysicsQueries.query_point_entity()` can return the entity id for collider-only hitboxes.
- Ball Sort tubes respond to taps (rules triggered: `tap_tube_idle` / `tap_tube_holding`).

### Must NOT Have (Guardrails)
- Do **not** remove or refactor the TypeScript geometric fallback in `useGameInput.ts` in this plan.
- Do **not** change Ball Sort templates to add `isSensor: true` (unnecessary after global fix).
- Do **not** manually rebuild Godot exports (watcher handles it).

---

## Verification Strategy (Manual QA)

### Baseline Commands
- Start services: `pnpm dev`
- Web run (typical): `pnpm web`
- Type check (sanity): `pnpm tsc --noEmit`

### Manual Evidence
- Capture at least one screenshot or screen recording showing:
  - tapping a tube highlights/changes state (if there is UI feedback) and the move logic proceeds
  - at minimum: observable behavior change (ball pickup/drop occurs)

---

## Execution Strategy

Single wave, sequential:
1) Confirm/adjust Godot entity creation semantics
2) Run Ball Sort QA
3) Run quick regression spot-checks

---

## TODOs

> Each task includes: what to do, what not to do, recommended agent profile, dependencies, references, acceptance criteria.

### 1) Enforce “collider-only → Area2D” creation path (global)

**What to do**:
- In `EntityFactory.gd`, ensure the creation branch for collider-only entities is:
  - `if physics_data: create_physics_body(...)`
  - `elif collider_data: create_area2d_entity(...)`
  - else: plain `Node2D`
- Ensure there is **no** remaining path that adds `CollisionShape2D` to a plain `Node2D` for collider-only entities.
- Ensure `create_area2d_entity()`:
  - adds the collider shape
  - allocates a `body_id` so TS-side `queryPoint()` can map to an entity
- (Optional but recommended) Confirm comments match behavior so future changes don’t reintroduce the bug path.

**Must NOT do**:
- Do not change physics body creation semantics.
- Do not alter coordinate conversion or input hook logic.

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Small, localized change in one GDScript file; low complexity but high impact.
- **Skills**: `systematic-debugging`
  - Why: Validate the “bug path” is truly eliminated and confirm query behavior.
- **Skills evaluated but omitted**:
  - `test-driven-development`: excluded (manual QA explicitly chosen).

**Parallelization**:
- Can Run In Parallel: NO
- Blocks: Task 2, Task 3
- Blocked By: None

**References**:
- `godot_project/scripts/entity/EntityFactory.gd:create_entity()`
  - Verify branch selection for `physics_data` vs `collider_data`.
- `godot_project/scripts/entity/EntityFactory.gd:create_area2d_entity()`
  - Ensure `Area2D + CollisionShape2D` and body_id allocation.
- `godot_project/scripts/physics/PhysicsQueries.gd:query_point_entity()`
  - Confirms `collide_with_areas=true` and name-based entity resolution.

**Acceptance Criteria**:
- [ ] In Godot runtime, tapping on a collider-only entity can be detected by `intersect_point()` (via Task 2 validation).
- [ ] No code path exists that produces `Node2D + CollisionShape2D` for collider-only entities.

**Manual Execution Verification**:
- [ ] Start `pnpm dev` and ensure Godot watcher is running (no manual export).

---

### 2) Validate Ball Sort tube taps now hit sensors

**What to do**:
- Run Ball Sort and verify that taps hit `tube-*-sensor` entities.
- Validate both states:
  - idle: tap tube picks up top ball
  - holding: tap tube attempts drop

**Must NOT do**:
- Do not add `isSensor: true` to `tubeSensor` template.

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
  - Reason: Requires interactive app run and human-visible verification of tap interactions.
- **Skills**: `verification-before-completion`
  - Why: Ensures we gather evidence before claiming fix.

**Parallelization**:
- Can Run In Parallel: NO
- Blocked By: Task 1
- Blocks: Task 3

**References**:
- `app/lib/test-games/games/ballSort/game.ts:templates.tubeSensor` (collider-only sensor)
- `app/lib/test-games/games/ballSort/game.ts:rules` (`trigger: { type: "tap", target: "tube" }`)
- `app/lib/game-engine/hooks/useGameInput.ts:findEntityAtPoint()` (query-first input selection)

**Acceptance Criteria**:
- [ ] In Ball Sort, tapping a tube triggers the expected behavior:
  - [ ] Tap in idle state picks up a ball (state transitions / ball moves / held indicator changes)
  - [ ] Tap in holding state drops a ball (or shows invalid feedback per game logic)
- [ ] Record evidence (screenshot or short recording).

**Manual Execution Verification**:
- [ ] `pnpm dev` running
- [ ] Open Ball Sort (`test-ball-sort`) in the app/web
- [ ] Perform: tap tube → observe rule behavior

---

### 3) Regression spot-check: ensure physics bodies still query correctly + fallback remains unused

**What to do**:
- Confirm that `PhysicsQueries.query_point()` still returns body_id for physics bodies.
- Confirm collider-only entities now also produce a `body_id` entry (via EntityFactory allocation) so TS-side `queryPoint()` can find the entity.
- Confirm geometric fallback path still exists and works if needed (do not remove).

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: Short sanity checks.
- **Skills**: `systematic-debugging`

**Parallelization**:
- Can Run In Parallel: NO
- Blocked By: Task 2
- Blocks: None

**References**:
- `godot_project/scripts/physics/PhysicsQueries.gd:query_point()`
- `app/lib/game-engine/hooks/useGameInput.ts:isPointInCollider()` / `findEntityAtPoint()`
- `godot_project/scripts/GameBridge.gd:_input()` (web path uses `intersect_point` with `collide_with_areas=true`)

**Acceptance Criteria**:
- [ ] Physics-body entities remain queryable (no regression).
- [ ] Collider-only entities are queryable via the same point query mechanism.

---

## Testing Checklist (Manual)

- [ ] Start services: `pnpm dev`
- [ ] Run typecheck: `pnpm tsc --noEmit`
- [ ] Ball Sort:
  - [ ] Tap tubes in idle → pickup works
  - [ ] Tap tubes while holding → drop works
  - [ ] Tap outside tubes → no tube action
  - [ ] Tap on walls/bottom (colliders) → verify expected behavior (either ignored or treated as tube per tags)
- [ ] Quick regression game:
  - [ ] Open any game that uses physics bodies and verify taps/drags (if applicable) still target entities
- [ ] Evidence captured (screenshot/recording)

---

## Notes / Defaults Applied

- Collision layer/mask defaults for collider-only `Area2D` are currently:
  - layer: default 2
  - mask: default 0
  These are fine for **point queries** because `PhysicsPointQueryParameters2D.collision_mask` controls inclusion; current query uses `0xFFFFFFFF`. If a “non-queryable collider-only” is ever needed, set the entity collider’s `maskBits` to 0 explicitly (or keep `collision_mask=0` as you suggested).
