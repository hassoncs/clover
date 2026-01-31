# Movement + Animation Support Plan (Slopcade Game Engine)

## TL;DR

Replace the ambiguous, state-dependent `move` behavior with **three explicit movement behaviors**:

- **`translate`**: transform-based position delta (containers/UI/scrolling; no physics required)
- **`set_velocity`**: continuous physics velocity (requires physics)
- **`apply_impulse`**: one-shot physics impulse (requires physics)

Add **strict validation** (hard errors when physics behaviors are used on non-physics entities; warnings/opt-in for translate on dynamic bodies), introduce a **TypeScript-driven tween system** (position/rotation/scale/opacity with easing + lifecycle), and add an **opacity control path** through the bridge so tweens can drive visual alpha.

**Deliverables**
- Container movement works via **`translate`** (parent moves; children follow).
- `set_velocity` and `apply_impulse` work for physics entities with strong validation.
- Backwards compatibility for existing games using `move`.
- New tween system runnable from behaviors.
- Opacity tweening end-to-end (TS → bridge → Godot renderer).
- Tests (TDD) for movement, hierarchy propagation, and tween lifecycle.

**Estimated Effort**: Large
**Parallel Execution**: YES (2–3 waves)
**Critical Path**: translate + validation + move migration → bridge opacity API → tween system core → tween behavior integration

---

## Context / Problem Statement

Flappy Bird defines a parent container entity (`pipeGroup`) that has children (`pipeTop`, `pipeBottom`, `scoreZone`). `pipeGroup` needs to scroll left; children should follow.

Today, `move` in `app/lib/game-engine/behaviors/MovementBehaviors.ts` returns early if `ctx.entity.bodyId` is missing, preventing container movement. Adding physics to `pipeGroup` without a collider caused Godot-side errors ("Unknown physics shape: undefined"), so `pipeGroup` must remain non-physics.

Godot’s `set_position()` works for *any* node type, and the Godot scene hierarchy will move children automatically when parents move. Therefore, the engine needs a transform-based movement path that does not depend on physics bodies.

---

## Architecture Decisions (Confirmed) + Rationale

### 1) Explicit movement behaviors (no hidden branching)

**Decision**
- Introduce three behavior types:
  - `translate` (transform delta)
  - `set_velocity` (physics velocity)
  - `apply_impulse` (physics impulse)

**Rationale**
- LLM clarity: behavior name indicates mechanism; no implicit branching on entity state.
- Human clarity: matches Unity/Godot mental models.
- Debugging: logs/errors identify misuse immediately.
- Validation: can hard error on impossible combinations (physics behavior on entity without physics).

### 2) Movement speeds are in world units (meters)/second
**Decision**
- `MoveBehavior.speed` is interpreted as meters/sec.

**Rationale**
- Matches physics mental model.
- Removes ambiguity and repeated px↔m conversions.
- Makes tuning consistent across physics and non-physics movement.

### 3) Tweening is TypeScript-driven and deterministic
**Decision**
- Tweens advance in the main TS tick (same loop that runs behaviors).
- Tweens call bridge setters (position/rotation/scale/opacity) as needed.

**Rationale**
- Determinism and debuggability (especially for inspect/debug stepping).
- Avoids engine/platform differences (native/web) in Godot’s tween execution.

### 4) Opacity is part of initial tweening deliverable
**Decision**
- Add an explicit “set opacity” control path from TS to Godot.

**Rationale**
- Needed for “juice” and transitions.
- Godot rendering already reads opacity from visual data on creation; we add runtime updates.

### 5) Transform authority: parent-only sync to Godot
**Decision**
- When parent moves in TS, call `bridge.setPosition(parentId, x, y)` only.
- Do not spam descendant setPosition calls; Godot hierarchy handles it.

**Rationale**
- Avoids per-frame N-children RPC overhead.
- Preserves intended hierarchy semantics.

### 6) TDD
**Decision**
- Tests written first for each milestone.

**Rationale**
- Prevent regressions (especially around hierarchy + physics sync).

---

## Technical Design

### A) Transform updates in TS: consistency rules

**Rule A1**: `RuntimeEntity.transform` remains the primary “world transform” field used by behaviors.

**Rule A2**: For parented entities, `EntityManager.updateWorldTransforms(parentId)` must be invoked when the parent’s local/world transform changes in TS.

**Rule A3**: Physics sync happens before behaviors (currently `GameRuntime.godot.tsx` calls `entityManager.syncTransformsFromPhysics()` at tick start). For entities with bodies, physics is authoritative.

**Implication**
- For non-physics parents: we translate them by writing their transform/localTransform and updating world transforms; then call `ctx.setEntityPosition(parentId, ...)` to sync to Godot.

### A.1) Movement behavior contracts + validation

#### `translate`
- Mechanism: direct positional delta (meters/sec × dt) applied to transforms.
- Valid on: non-physics entities (Node2D-only), kinematic-like entities where you want authoritative transforms.
- On **dynamic physics** bodies: default behavior should be **warning**, with an opt-in escape hatch (e.g. `allowDynamic?: true`) if we truly need “teleport-like” movement.

#### `set_velocity`
- Mechanism: set linear velocity on physics body.
- Requires: `entity.bodyId` (hard error otherwise).

#### `apply_impulse`
- Mechanism: apply impulse once (optionally scaled) on physics body.
- Requires: `entity.bodyId` (hard error otherwise).

#### Direction naming consistency
- Reuse one `MoveDirection` union across all movement behaviors (`left|right|up|down|toward_target|away_from_target`) with consistent target/tag semantics.

#### Validation surface
- Validation must include:
  - Which behavior was misused
  - Entity id/template/tags
  - Fix hint (e.g. “Use `translate` for containers without physics”)
- Errors should be thrown (fail fast) for physics behavior misuse.
- Warnings should be logged once-per-entity-per-behavior to avoid spam.

### B) Tween system scope

**Supported properties (v1)**
- `position` (x,y) (meters)
- `rotation` (radians)
- `scale` (scaleX, scaleY)
- `opacity` (0..1)

**Lifecycle**
- Start immediately or at a scheduled time.
- Update each frame (`dt`).
- Completion callback (optional).
- Cancel by id (and cancel-on-destroy).
- Optional chaining (sequence) and parallel groups.

**Easing**
Implement a curated set:
- `linear`
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`
- `easeInBack`, `easeOutBack`, `easeInOutBack`
- `easeOutBounce` (and optionally `easeInBounce`, `easeInOutBounce`)

Rationale: enough for game feel; easy to extend.

### C) Behavior integration

Add a new behavior type (name suggestion): `tween`.

**Why not reuse existing `animate`?**
- `animate` currently refers to sprite frame animation (in shared types).
- Tween is a different concern (transform/opacity interpolation).

`tween` behavior should:
- Start tween(s) on `onActivate`.
- Optionally run continuously (if configured).
- Support triggers (always / on_event / on_collision / on_destroy) as a v2; for v1 keep it simple: starts on activate.

---

## Files / Components Likely To Change

### TypeScript (Engine)
- `app/lib/game-engine/behaviors/MovementBehaviors.ts`
- `shared/src/types/behavior.ts`
- `app/lib/game-engine/BehaviorExecutor.ts` (phase mapping)
- `app/lib/game-engine/BehaviorContext.ts` (new API for opacity)
- `app/lib/game-engine/GameRuntime.godot.tsx` (wire new context method)
- `app/lib/godot/types.ts` (add `setOpacity`)
- `app/lib/godot/GodotBridge.native.ts` and `app/lib/godot/GodotBridge.web.ts` (implement `setOpacity`)
- New: `app/lib/game-engine/animation/TweenSystem.ts` (or similar)
- New: `app/lib/game-engine/behaviors/TweenBehaviors.ts` (or add to `VisualBehaviors.ts`)

### Godot
- `godot_project/scripts/GameBridge.gd` (add `_js_set_opacity` + `set_opacity`)
- Potentially `godot_project/scripts/bridge/VisualRenderer.gd` (if we centralize runtime opacity updates there)

### Tests
- `app/lib/game-engine/__tests__/BehaviorExecutor.test.ts`
- New: `app/lib/game-engine/__tests__/MovementBehaviors.translate.test.ts`
- New: `app/lib/game-engine/__tests__/MovementBehaviors.setVelocity.test.ts`
- New: `app/lib/game-engine/__tests__/MovementBehaviors.applyImpulse.test.ts`
- New: `app/lib/game-engine/__tests__/TweenSystem.test.ts`
- New: `app/lib/game-engine/__tests__/TweenBehavior.test.ts`

---

## Verification Strategy (TDD)

**Framework**: Vitest (already used in `app/lib/game-engine/__tests__`).

Each task below follows RED → GREEN → REFACTOR.

Global verification commands:
- `pnpm test` (or the repo’s test command)
- `pnpm tsc --noEmit`

Manual sanity checks (still required even with tests):
- Run Flappy example and verify `pipeGroup` scrolls and children follow.
- Verify opacity tween visibly fades entity.

---

## Execution Strategy (Parallel Waves)

**Wave 1 (Core movement + API plumbing)**
- Add explicit movement behaviors (`translate`, `set_velocity`, `apply_impulse`) + validation
- Migration path for existing `move` behavior (compat mapping)
- Speed units migration (meters/sec)
- Add bridge opacity setter API (TS types + native/web + Godot)

**Wave 2 (Tween system)**
- Implement TweenSystem core + easing
- Integrate into runtime tick

**Wave 3 (Behavior layer + Flappy unblock)**
- Add `tween` behavior type + executor integration
- Update Flappy templates/behaviors if needed (only as required)
- Add targeted regression tests

---

## TODOs (Incremental, TDD)

### 1) Add explicit movement behaviors + shared direction contract

**What to do**
- Update `shared/src/types/behavior.ts`:
  - Add new behavior types: `translate`, `set_velocity`, `apply_impulse`.
  - Ensure direction naming is consistent across all movement behaviors (reuse a single `MoveDirection`).
  - Define per-behavior config (speed/target/etc.) with **meters/sec** where applicable.

- Update `app/lib/game-engine/behaviors/MovementBehaviors.ts`:
  - Implement `translate` handler (transform delta, no physics).
  - Implement `set_velocity` handler (physics-only).
  - Implement `apply_impulse` handler (physics-only).

**Must NOT do**
- Don’t add physics bodies to container entities.
- Don’t call bridge setPosition for descendants (parent-only rule).

**References**
- `app/lib/game-engine/behaviors/MovementBehaviors.ts` (current `move` handler + `oscillate` hybrid pattern)
- `app/lib/game-engine/EntityManager.ts:updateWorldTransforms()` (comment: “Call this when a parent entity moves.”)
- `app/lib/game-engine/GameRuntime.godot.tsx` (context `setEntityPosition` wiring)

**Acceptance Criteria (tests-first)**
- New tests:
  - `translate` moves an entity without `bodyId` by `speed * dt` and calls `context.setEntityPosition`.
  - Translating a parent updates descendants via `EntityManager.updateWorldTransforms`.
  - `set_velocity` calls `physics.setLinearVelocity` with meter/sec values (no px/m conversion).
  - `apply_impulse` calls the physics impulse path once.

**Manual Verification**
- In Flappy, `pipeGroup` uses `translate` and children remain attached.

---

### 2) Add validation rules + developer-facing error messages

**What to do**
- Add runtime validation in movement behavior handlers:
  - `set_velocity` / `apply_impulse` on entity without `bodyId` → **throw Error** with a fix hint.
  - `translate` on dynamic body → **warn** by default OR require `allowDynamic: true` (opt-in flag).
- Make warnings non-spammy (log once per entity+behavior).

**Acceptance Criteria (tests-first)**
- `set_velocity` without bodyId throws and error message includes:
  - behavior name
  - entity id
  - hint: “Add physics component or use translate”
- `apply_impulse` without bodyId throws similarly.
- `translate` with bodyId logs a warning unless opt-in is set (and does not throw).

---

### 3) Migration path for existing `move`

**What to do**
- Decide approach:
  - Keep `move` as a deprecated alias for `translate` (preferred for backwards compatibility).
- Implementation:
  - Continue accepting `move` in `shared/src/types/behavior.ts` but mark it deprecated in docs/comments.
  - Engine behavior registration:
    - Register `move` handler that forwards to `translate` logic (or translate handler accepts both shapes).
  - Optional: emit a one-time warning when `move` is used: “`move` is deprecated; use `translate`”.

**Acceptance Criteria (tests-first)**
- A game entity using `move` results in the same transform updates as `translate`.
- Deprecation warning is logged once (not per frame).

---

### 2) Add engine-level opacity control primitive

> NOTE: The numbering continues from the original plan; tasks 2–3 above are specifically about movement (validation + migration).
> The remaining tasks (opacity/tweens) are unchanged in intent but may be renumbered later if desired.

**What to do**
- Extend `app/lib/godot/types.ts` with `setOpacity(entityId: string, opacity: number): void`.
- Implement `setOpacity` in both:
  - `app/lib/godot/GodotBridge.native.ts` (call into GameBridge method, e.g. `set_opacity`)
  - `app/lib/godot/GodotBridge.web.ts` (invoke JS bridge method)
- Add corresponding Godot endpoints:
  - `godot_project/scripts/GameBridge.gd`: `_js_set_opacity(args)` + `set_opacity(entity_id, opacity)`.
- Decide runtime application mechanism:
  - Find visual child nodes (Sprite2D / AnimatedSprite2D / Polygon2D / Label) and set `modulate.a` appropriately.
  - Align with existing `_find_sprite_in_entity` approach used by scale.

**References**
- `godot_project/scripts/GameBridge.gd:set_scale_entity()` and `_find_sprite_in_entity()`
- `godot_project/scripts/bridge/VisualRenderer.gd` (opacity already used at creation time)
- `shared/src/types/visual.ts` (visual component includes `opacity?: number`)

**Acceptance Criteria (tests-first)**
- TS unit test: new bridge interface compiles and can be called from runtime context (typecheck).
- Add a lightweight engine test (mock bridge) verifying `setEntityOpacity` (new context method) forwards to `bridge.setOpacity`.
- Manual: spawn an entity and set opacity; confirm visible fade.

---

### 3) Extend `BehaviorContext` with `setEntityOpacity`

**What to do**
- Add `setEntityOpacity(entityId: string, opacity: number): void` to `BehaviorContext`.
- In `GameRuntime.godot.tsx`, wire it to `bridge.setOpacity`.

**Acceptance Criteria (tests-first)**
- Test that a behavior handler can call `ctx.setEntityOpacity(...)` and that the runtime context forwards it to the bridge.

---

### 4) Implement TweenSystem core (TypeScript)

**What to do**
- Create `TweenSystem` module responsible for:
  - Creating tweens (returns tween id)
  - Updating all active tweens on each tick
  - Canceling tweens
  - Handling completion callbacks
  - Auto-cancel when entity destroyed (hook point: executor will need to notify or system polls entity existence)
- Define tween target types:
  - `position`, `rotation`, `scale`, `opacity`
- Define easing functions module.

**Integration point**
- Add `tweenSystem.update(dt)` into the main tick loop **after** behavior execution (or before, pick one and document). Recommendation:
  - Run behaviors first (they schedule tweens), then run tween updates, so a tween scheduled this frame can start immediately.

**References**
- Existing ad-hoc tween in `Match3GameSystem.updateAnimations()` (easeOutQuad)
- Existing per-frame systems in runtime tick (`GameRuntime.godot.tsx`)

**Acceptance Criteria (tests-first)**
- Tween progresses deterministically: at t=0, value == start; at t=duration, value == end.
- Easing functions return values in [0,1] for t in [0,1] (where applicable) and are monotonic for non-bounce/back easings.
- Cancel stops updates and does not call completion callback.
- Completion callback fires exactly once.

---

### 5) TweenSystem applies outputs via BehaviorContext + bridge setters

**What to do**
- TweenSystem should update the entity model and the renderer:
  - For position: update `EntityManager`/entity transforms and call `ctx.setEntityPosition(entityId, ...)`.
  - For rotation: call `ctx.setEntityRotation(entityId, ...)`.
  - For scale: call `bridge.setScale` (if there is no context helper, add `setEntityScale` to context or call bridge directly via an injected dependency).
  - For opacity: call `ctx.setEntityOpacity(entityId, ...)`.

**Note**: decide a single injection style:
- Option A: add TweenSystem to runtime context and pass `BehaviorContext` methods into it.
- Option B: TweenSystem lives in EntityManager layer and depends on `bridge` directly.

Recommendation: **Option A** (TweenSystem uses a small “render adapter” interface derived from BehaviorContext), to keep it testable.

**Acceptance Criteria (tests-first)**
- Tween position updates call `setEntityPosition` with expected interpolated values.
- Parent-only sync: if tweening a parent with children, verify the TweenSystem only calls setPosition for the parent.
- Opacity tweens call `setEntityOpacity` with values clamped 0..1.

---

### 6) Add `tween` behavior type (shared types)

**What to do**
- In `shared/src/types/behavior.ts`:
  - Add `BehaviorType` union member: `tween`.
  - Define `TweenBehavior` type with:
    - `property: 'position' | 'rotation' | 'scale' | 'opacity'`
    - `from?: ...` (optional; defaults to current)
    - `to: ...`
    - `duration: number`
    - `ease?: EasingName`
    - `loop?: boolean` (optional)
    - `yoyo?: boolean` (optional)
    - `onCompleteEvent?: string` (optional)
    - `cancelOnDeactivate?: boolean` (default true)

**Acceptance Criteria (tests-first)**
- Type-level compilation checks for new behavior.
- Add a unit test in shared types if there is schema validation coverage.

---

### 7) Register tween behavior in engine executor

**What to do**
- Add phase mapping in `app/lib/game-engine/BehaviorExecutor.ts`:
  - Map `tween` to `visual` (or new phase if needed). Recommendation: `visual`.
- Register handler in new `TweenBehaviors.ts` (or inside `VisualBehaviors.ts`):
  - `onActivate`: schedule tween(s) in TweenSystem.
  - `onDeactivate`: cancel scheduled tweens if configured.
  - `execute`: optionally no-op (tweens are system-driven) or support “ensure running” behavior.

**Acceptance Criteria (tests-first)**
- BehaviorExecutor runs `onActivate` when conditional group enables tween behavior.
- Tween is scheduled exactly once per activation.

---

### 8) Flappy Bird unblock + regression proof

**What to do**
- Ensure `pipeGroup` with children and no physics can move left via `translate`.
- Validate `destroy_when_off_screen` recursive behavior still works when parent moves.

**Acceptance Criteria (tests-first where possible)**
- Add an integration-style engine test:
  - Create a parent entity with children and `move` behavior.
  - Simulate a few ticks.
  - Assert parent moved and child world transforms updated.
  - Repeat with `translate` to ensure direct support.

**Manual Verification**
- Run Flappy and confirm:
  - Pipes scroll.
  - ScoreZone remains aligned.
  - No physics shape errors.

---

## Commit Strategy

Prefer small, safe commits after each numbered TODO:
- `feat(engine): add translate/set_velocity/apply_impulse behaviors`
- `fix(engine): add movement validation + move deprecation mapping`
- `feat(bridge): add opacity setter`
- `feat(engine): add tween system`
- `feat(engine): add tween behavior`
- `test(engine): add movement/tween regression coverage`

Each commit should include passing `pnpm test` and `pnpm tsc --noEmit`.

---

## Success Criteria

- `pipeGroup` moves without physics body via `translate`; children follow in both TS transforms and Godot rendering.
- Physics entities still move correctly under `set_velocity` and `apply_impulse`.
- Tweens run deterministically and can drive position/rotation/scale/opacity.
- Tests cover:
  - translate vs physics movement behavior correctness
  - validation rules + deprecation mapping
  - hierarchy propagation on parent movement
  - tween lifecycle (start/update/complete/cancel)
  - opacity control path
