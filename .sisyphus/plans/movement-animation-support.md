# Movement + Animation Support (Engine)

## TL;DR

**Goal:** Make parent-container movement + child-follow work reliably (e.g. Flappy `pipeGroup`), and add a deterministic, TypeScript-driven tween system (incl. opacity), with explicit movement behavior APIs and strong validation.

**Key change:** Replace ambiguous `move` with explicit behaviors:
- `translate` (transform-based)
- `set_velocity` (physics velocity)
- `apply_impulse` (physics impulse)

**Also:** Add bridge-level `setOpacity` (TS → Godot), and a TS `TweenSystem` + `tween` behavior.

**Critical Path:** movement behaviors + validation + `move`→`translate` migration → opacity bridge → tween system core → tween behavior integration → Flappy regression.

---

## Context

### Original Problem
- Flappy Bird defines a parent container entity (`pipeGroup`) that has children (`pipeTop`, `pipeBottom`, `scoreZone`).
- `pipeGroup` needs to scroll left and children must follow.
- Current `move` behavior implementation requires `ctx.entity.bodyId` (physics), so a non-physics parent cannot move.
- Adding physics to the parent without defining a collider/shape caused runtime failure: `Unknown physics shape: undefined`.

### Current Relevant Code (references)
- Movement behavior today (physics-only):
  - `app/lib/game-engine/behaviors/MovementBehaviors.ts` (existing `move` handler)
- Transform hierarchy exists in TS:
  - `app/lib/game-engine/EntityManager.ts` (`spawnChildEntities`, `updateWorldTransforms`, parent/child bookkeeping)
- Runtime context can set positions via bridge:
  - `app/lib/game-engine/GameRuntime.godot.tsx` (context `setEntityPosition` → `bridge.setPosition`)
- Godot can set position for any node type:
  - `godot_project/scripts/GameBridge.gd` (`set_position` / `_js_set_position`)

---

## Decisions (Confirmed)

1) **Explicit movement behaviors (no hidden branching)**
- `translate` (transform), `set_velocity` (physics), `apply_impulse` (physics)
- Keep existing `move` as a deprecated alias to `translate` (migration)

2) **Units**
- Movement speeds are in **world units (meters)/second**.

3) **Tweening**
- Tween system is **TypeScript-driven** and **deterministic** (given the same input dt sequence).

4) **Opacity**
- Opacity support is in v1; opacity range is **0..1**.

5) **Hierarchy sync to Godot**
- **Parent-only bridge sync** (when parent moves, only send bridge updates for the parent; Godot scene hierarchy propagates).

6) **Testing strategy**
- **TDD** (RED → GREEN → REFACTOR) with existing Vitest patterns.

---

## Metis Guardrails (Applied)

- Define **conflict rules** between transform movement, physics movement, and tweening (fail fast).
- Lock **coordinate-space semantics** for translate/tweens (local vs world).
- Lock **update order** (physics sync vs behaviors vs tweens vs transform propagation).
- Prevent scope creep: v1 tween = position/rotation/scale/opacity only.

---

## Defaults Applied (Override if you disagree)

These are plan defaults (chosen to avoid blocking). If you want different semantics, we can update the plan before execution:

1) **Tick model / determinism:**
- Tweens advance using the engine’s existing `dt` per tick.
- Clamp `dt` for tweens to a max (e.g. 50ms) to avoid giant jumps after tab-unfocus.
- Determinism definition: *given the same dt sequence + same initial state, outputs match*.

2) **Coordinate spaces:**
- `translate` operates in **local space** for parented entities (updates `localTransform`), and in world space for root entities.
- `tween.property = 'position'` targets the same: local for parented, world for root.

3) **Conflict rules (fail fast by default):**
- `set_velocity` / `apply_impulse` require physics (`bodyId`) → throw Error if missing.
- `translate` on **dynamic** physics bodies → warn by default, require explicit opt-in `allowDynamic: true`.
- Tweening `position` on a physics-controlled entity → error unless explicit opt-in (e.g. `allowPhysicsOverride: true`).

---

## Work Objectives

### Core Objective
Enable transform-driven parent motion + child-follow, explicit physics motion APIs, and a tween system that can drive transforms + opacity end-to-end.

### Definition of Done
- Flappy `pipeGroup` scrolls and children follow; no physics shape errors.
- `translate`, `set_velocity`, `apply_impulse` behaviors exist, validated, and tested.
- `move` continues to work as deprecated alias with one-time warning.
- Opacity can be set at runtime from TS and applied in Godot.
- TweenSystem exists, deterministic, with lifecycle + easing; `tween` behavior integrates it.
- Tests pass: unit/integration tests for movement + hierarchy + tween lifecycle.

---

## Verification Strategy (TDD)

### Test framework
- Use existing project test setup (Vitest patterns exist under `app/lib/game-engine/__tests__`).

### Mandatory verification commands
- `pnpm test`
- `pnpm tsc --noEmit`

### Manual verification (still required)
- Run Flappy test-game and confirm:
  - at least one pipe group is visible and moves
  - children remain aligned
  - no runtime “unknown physics shape” errors
- Verify opacity tween visually fades an entity (screenshot evidence recommended).

---

## Execution Strategy (Parallel Waves)

Wave 1 (movement + validation + migration + opacity bridge)
- Movement behaviors: `translate`, `set_velocity`, `apply_impulse`
- Validation rules + non-spam warnings
- `move` → `translate` alias + one-time warning
- Add bridge `setOpacity` (TS types + native/web + Godot)

Wave 2 (TweenSystem core)
- Tween data model, easing functions, update loop, cancellation, completion

Wave 3 (Tween behavior + Flappy regression)
- Add `tween` behavior type + executor integration
- Ensure Flappy uses `translate` for `pipeGroup`
- Add regression/integration tests around parent motion + child transforms

---

## TODOs

> NOTE: Each task includes acceptance criteria and recommended agent profile.

### 1. Define new behavior types + shared direction contract

**What to do**
- Modify `shared/src/types/behavior.ts`:
  - Add `translate`, `set_velocity`, `apply_impulse` behavior types
  - Define a shared direction/vector contract usable by all three
  - Enforce units: meters/sec

**Acceptance Criteria**
- `pnpm tsc --noEmit` passes
- Types compile with no casts/suppressions

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `test-driven-development`, `slopcade-game-engine`

---

### 2. Implement `translate` (transform movement) + hierarchy propagation

**What to do**
- Modify `app/lib/game-engine/behaviors/MovementBehaviors.ts`:
  - Add handler for `translate`
  - Update entity’s `localTransform` when parented, else update root transform
  - Call `EntityManager.updateWorldTransforms(parentId)` when a parent changes
  - Call `ctx.setEntityPosition(entity.id, x, y)` only for the moved entity

**Acceptance Criteria (TDD)**
- New unit tests:
  - translate moves non-physics entity by `speed * dt`
  - translating a parent updates descendants’ computed world transforms
  - bridge sync (mocked) is called for parent only

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `test-driven-development`, `slopcade-game-engine`

---

### 3. Implement `set_velocity` + `apply_impulse` (physics movement)

**What to do**
- Modify `app/lib/game-engine/behaviors/MovementBehaviors.ts`:
  - Add `set_velocity` handler (continuous velocity)
  - Add `apply_impulse` handler (one-shot)
  - Use meters/sec consistently

**Acceptance Criteria (TDD)**
- New unit tests:
  - set_velocity calls `physics.setLinearVelocity` with meter/sec values
  - apply_impulse calls `physics.applyLinearImpulse` (or equivalent adapter call)

**Recommended Agent Profile**
- Category: `unspecified-high`
- Skills: `test-driven-development`, `slopcade-game-engine`

---

### 4. Add movement validation + non-spam warnings

**What to do**
- Add fail-fast validation:
  - `set_velocity` / `apply_impulse` without `bodyId` → throw Error with fix hint
  - `translate` on dynamic physics bodies → warn once unless opt-in
  - lock coordinate-space semantics (documented above)

**Acceptance Criteria (TDD)**
- Tests:
  - physics behaviors on non-physics entity throw with descriptive message
  - translate on dynamic body warns once (not every tick)

---

### 5. Migrate existing `move` behavior (deprecated alias)

**What to do**
- Keep `move` accepted, but route it to `translate`.
- Emit one-time deprecation warning (policy: once per process).

**Acceptance Criteria (TDD)**
- Tests:
  - `move` and `translate` produce identical outcomes
  - warning emitted once

---

### 6. Add bridge/runtime support for `setOpacity`

**What to do**
- Modify TS bridge API:
  - `app/lib/godot/types.ts` add `setOpacity(entityId, opacity)`
  - implement in `app/lib/godot/GodotBridge.web.ts` + `.native.ts`
- Modify Godot bridge:
  - `godot_project/scripts/GameBridge.gd`: add `_js_set_opacity` and `set_opacity`
  - apply opacity to the entity’s renderable child via `modulate.a`

**Acceptance Criteria**
- Typecheck passes
- Manual: calling setOpacity visibly changes alpha

---

### 7. Add `setEntityOpacity` to BehaviorContext and wire it

**What to do**
- Modify `app/lib/game-engine/BehaviorContext.ts` to include `setEntityOpacity`
- Wire in `app/lib/game-engine/GameRuntime.godot.tsx` to call `bridge.setOpacity`

**Acceptance Criteria (TDD)**
- Unit test verifies context forwards to bridge

---

### 8. Implement TweenSystem (TS)

**What to do**
- Create `app/lib/game-engine/animation/TweenSystem.ts` (or similar):
  - create/update/cancel tweens
  - easing functions
  - completion callbacks
  - cancel-on-destroy
- Integrate update into main tick loop

**Acceptance Criteria (TDD)**
- Tests cover:
  - deterministic interpolation
  - cancel semantics
  - callback fires once
  - dt clamp behavior

---

### 9. Add `tween` behavior and integrate with executor

**What to do**
- Extend `shared/src/types/behavior.ts` with `tween`
- Register handler (likely in a new `TweenBehaviors.ts`)
- Handler schedules tweens in TweenSystem (start on activation)

**Acceptance Criteria (TDD)**
- tween schedules once per activation
- tween drives position/rotation/scale/opacity through context/bridge

---

### 10. Flappy Bird regression: pipes visible + moving at start

**What to do**
- Ensure Flappy `pipeGroup` uses `translate`
- Ensure at least one pipe group spawns at start (or initial scene includes one)
- Add regression test(s) where possible; otherwise include manual QA steps

**Acceptance Criteria**
- Manual: load Flappy and see at least one pipe group rendered immediately and moving.

---

## Must NOT Have (Scope Boundaries)

- No polymorphic movement behavior that changes semantics based on hidden state.
- No “animate everything” system (colors, shaders, timelines, editor tooling) in v1.
- No per-frame descendant bridge sync; parent-only sync is the invariant.
