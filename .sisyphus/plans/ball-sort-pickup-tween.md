# Ball Sort: Reactive pickup animation via TweenSystem (target-driven)

## TL;DR

Replace Ball Sort’s pickup teleport with a **reactive target-driven animation**:

- Game logic sets a **target position** immediately on pickup/drop/cancel (state machine transitions remain immediate).
- A VISUAL-phase system makes entities **catch up smoothly** toward their target, updating **both**:
  1) `entityManager` transforms (authoritative “current position”)
  2) `bridge` position (render)
- If the target changes mid-flight, the system **retargets** without cancellation.

Deliverable is a minimal, general-purpose “move-to-target” layer (first real TweenSystem validation) applied to Ball Sort pickup.

---

## Context / Evidence

### Current pickup behavior (teleport)
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`:
  - `executePickup()` sets held vars + tags, decrements tube vars, then teleports:
    - `context.bridge.setPosition(ballId, pickupX, pickupY)`
    - `ball.transform.x/y = pickupX/Y` and `context.entityManager.updateWorldTransforms(ballId)`
  - Fires `context.mutator.triggerEvent('ball_picked')` immediately.

### State machine uses `ball_picked`
- `app/lib/test-games/games/ballSort/game.ts`:
  - `idle -> holding` triggered by event `ball_picked`.

### Tween system is VISUAL-only bridge adapter today
- `app/lib/game-engine/animation/TweenSystem.ts`:
  - Interpolates via adapter `setEntityPosition(entityId, x, y)`.
  - Supports `onComplete`, and cancellation by entity.
- `app/lib/game-engine/systems/runner/wrappers/TweenRuntimeSystem.ts`:
  - Runs `SystemPhase.VISUAL` and adapter calls `ctx.bridge.setPosition`.
  - Currently does **not** update `entityManager` transforms.

### RulesContext does not expose runtime systems
- `app/lib/game-engine/rules/types.ts`: `RuleContext` has `entityManager`, `mutator`, `bridge`, etc.
- Rules execution is inside `RulesEvaluator.update()` (GAME_LOGIC).

### Entity transforms & physics sync
- `app/lib/game-engine/EntityManager.ts`:
  - `syncTransformsFromPhysics()` overwrites `entity.transform` from physics each frame for entities with `entity.physics`.

---

## Goals / Non-goals

### Goals
- Smooth pickup animation (no teleport).
- Reactive retargeting model:
  - game logic sets new target instantly;
  - animation catches up; retarget mid-flight.
- State transitions immediate (`ball_picked` fired immediately on tap).
- Runtime transforms reflect **current animated position** every frame.
- Minimal invasive changes; validate TweenSystem approach.

### Non-goals (for this plan)
- Fancy multi-stage arcs (e.g., x then y), follow-finger, spring physics.
- Full general animation framework for all entities.
- Overhauling behavior declarative TweenBehavior (not suited for runtime targets).

---

## Recommended Architecture (why)

### Core idea: separate “target” from “current” position

To satisfy “logic is deterministic, animation is catch-up”, **targets must be stored separately** from current transforms.

- **Target position** = where the entity *should be* according to game logic now.
- **Current position** = where the entity is visually right now (interpolating).

If we store target directly in `entity.transform`, we lose the true current position and can’t both:
1) be deterministic, and
2) animate without blocking.

### Where target lives

Use a **runtime-side component/state** stored on the entity (or a side map keyed by entityId) called something like:

- `movementTarget: { x: number; y: number }` (plus optional metadata: speed/duration, ease).

This target is set by rules/actions immediately.

### How animation applies

Add a VISUAL-phase runtime system (or enhance TweenRuntimeSystem) that:

- On each frame:
  - reads `movementTarget` for entities
  - moves current position toward target using TweenSystem-like easing
  - writes the **current** position into:
    - `entity.localTransform`/`entity.transform` (and updates world transforms)
    - `bridge.setPosition`

### Retargeting mid-flight

Retargeting becomes natural:
- When rules update the `movementTarget`, the next VISUAL update moves toward the new target.

Two possible implementations:

1) **Discrete tweens that restart** when target changes:
   - Each frame (or when target delta changes), cancel & recreate the tween from current -> new target.
   - Pros: reuses TweenSystem; clear easing.
   - Cons: needs target-change detection; potential churn if retarget occurs frequently.

2) **Continuous “approach” interpolation** (speed-based), no TweenSystem objects:
   - Compute step toward target using easing-like curve or damped approach.
   - Pros: very stable for frequent retargets.
   - Cons: diverges from “test tween system” goal.

**Recommendation for first validation**: implement (1) but with a guardrail:
- Only restart tween when target changed beyond epsilon.
- Duration computed from distance clamped to min/max to maintain feel.

---

## Concrete Integration Plan

### 1) Introduce a small “MovementTarget” concept

Decide where to store per-entity target.

Preferred options (in order):
1) Extend `RuntimeEntity` with an optional field (e.g., `movementTarget?: { x: number; y: number }` and maybe `movementMode?: 'tween_to_target'`).
2) If modifying shared RuntimeEntity is too invasive, keep a `Map<string, TargetState>` inside a runtime system and provide a setter API to rules via `RuleContext`.

Given you need rules/actions to set target easily, (1) is simplest, but it touches a core type.

Guardrail: keep it minimal and optional; don’t affect serialization unless required.

### 2) Provide a “set target position” API to rule actions

Rules/actions should not depend on runtime system instances directly.

Add a small function to `RuleContext`, e.g.:
- `setEntityTargetPosition(entityId, x, y, options?)`

Where it writes `movementTarget` for the entity. This keeps BallSortActionExecutor from touching TweenSystem.

Wiring:
- `RulesEvaluator.update()` constructs `RuleContext` today; extend it to include this function.
- The function implementation uses `entityManager.getEntity(entityId)` and sets target.

### 3) Add/extend a VISUAL system to enact target-following and sync transforms

Create a new runtime system wrapper (or evolve `TweenRuntimeSystem`) that:

**Responsibilities**
- Detect entities with `movementTarget`.
- Ensure there is at most one active tween per entity for this property.
- Apply tween updates to both:
  - bridge position
  - entityManager transforms (current position)

**Key implementation detail**: updating entity transforms
- In EntityManager, `transform` is a reference to `worldTransform` for hierarchies, and direct object for roots.
- For a root entity, set `entity.transform.x/y`, then also set `entity.localTransform`/`worldTransform` consistently (or provide a helper method).

Plan calls for adding an EntityManager helper:
- `setWorldPosition(entityId, x, y)` or similar, which:
  - updates the correct transform(s)
  - calls `updateWorldTransforms(entityId)`

This avoids duplicating transform bookkeeping in the tween system.

**Retarget algorithm (restart tween)**
- Track per-entity last target and current tween id.
- Each VISUAL tick:
  - if no target → skip
  - if target changed from lastTarget (epsilon) OR no tween active:
    - cancel existing tween for entity
    - create a new tween from currentPosition -> target
      - duration = clamp(distance / speed, min, max)
      - ease = `easeOutQuad` or `easeInOutQuad` for pickup feel
    - store tweenId + lastTarget

**Apply current tween output**
- Requires TweenSystem to call into an adapter that can set both bridge and entityManager.

Implementation approaches:
- A) Expand TweenRuntimeSystem adapter to also update entityManager (preferred).
  - Adapter `setEntityPosition` does:
    - `ctx.bridge.setPosition(...)`
    - `ctx.entityManager` position update helper
- B) Keep TweenRuntimeSystem unchanged and write a new system that wraps TweenSystem itself with a different adapter.
  - Avoids changing existing TweenRuntimeSystem semantics.

Recommended for minimal risk:
- Option B (new wrapper, e.g. `TargetTweenRuntimeSystem`) so existing TweenRuntimeSystem remains a pure render tween system for other games.

### 4) Update BallSortActionExecutor to set targets, not current positions

Replace teleport in:
- `executePickup` (and strongly consider aligning `executeDrop` and `cancelPickup` to the same model for consistency).

In the reactive model:
- Compute target `(x,y)` exactly as today.
- Set `movementTarget` via `context.setEntityTargetPosition(...)`.
- Do **not** set `ball.transform` directly.
- Still fire `ball_picked` immediately.

Reasoning:
- game logic becomes deterministic and immediate.
- animation becomes responsible for bringing the current transform to target.

### 5) Physics interaction guardrail

Risk: `EntityManager.syncTransformsFromPhysics()` will overwrite tween-driven transforms for entities that have physics bodies.

You need a policy for Ball Sort balls:

- If balls have physics bodies (likely), then during “target-driven animation” you must either:
  - temporarily disable physics sync for those entities, or
  - set the physics body transform as well each frame, or
  - mark them as non-physics entities in this game.

Recommended minimal policy:
- When an entity is in target-tween mode, treat it as “manual transform authority” and skip `syncTransformsFromPhysics()` for it.
  - This implies a flag on the entity (e.g., `movementAuthority: 'manual' | 'physics'`) or reuse tags (e.g., tag `held` already exists).

Since held balls already get tag `held`, a minimal first pass is:
- Skip physics sync for entities tagged `held`.

But: drop/cancel retargeting implies balls in tubes may also animate; then the skip would need to apply to all animating balls, not only held.

So the plan should implement a generic “isCurrentlyAnimated” check (based on `movementTarget` presence and distance-to-target > epsilon).

---

## Easing / Feel

Pickup lift should read as “snappy up”. Recommended easing:
- `easeOutQuad` (fast start, gentle settle)
Duration should be distance-normalized for consistency across layouts:
- `duration = clamp(distance / pickupSpeed, 0.10, 0.25)` seconds.

Avoid `easeOutBounce` for pickup (too playful / can imply collision).

---

## Edge Cases / Expected Behavior

### Tap again during pickup
- No blocking.
- If tap triggers drop/cancel, rules set new target instantly.
- Visual system detects target change and retweens from current -> new.

### Multiple rapid retargets
- System restarts tween when target changes by epsilon.
- Guardrail against churn: only restart if target differs meaningfully (e.g., 1–2% of ball radius).

### Entity destroyed mid-tween
- System should cancel tweens for missing entities.

### Hierarchy / parenting
- If balls are ever parented, position setter must operate in world space safely.

---

## Verification Strategy

Because this is a core animation/loop behavior, prioritize integration verification:

1) Manual in Ball Sort test game:
   - pickup: ball lifts smoothly
   - immediate state transition still occurs
   - tap again quickly: ball retargets smoothly back/down
   - repeated taps do not jitter or explode tween count

2) Debug counters:
   - tween system state should show small bounded active tween count.

3) Determinism check (best-effort):
   - the target should always reflect rules decisions.
   - animation should be purely derived from (current, target, dt).

---

## TODOs (implementation-ready breakdown)

> Note: “Implementation + test/verification” are bundled per task.

### Wave 1 — Core plumbing (can start immediately)

- [ ] 1. Add a target-position data model (minimal)

  **What to do**:
  - Choose storage: `RuntimeEntity` optional field vs system-held Map.
  - Implement `movementTarget` (x,y) and (optionally) `movementConfig` (ease/speed).

  **References**:
  - `app/lib/game-engine/types.ts:RuntimeEntity` (entity shape)

  **Acceptance criteria**:
  - Typecheck passes (`pnpm tsc --noEmit`).

- [ ] 2. Extend RuleContext with a “set target position” helper

  **What to do**:
  - Add `setEntityTargetPosition(entityId, x, y, opts?)` on `RuleContext`.
  - Wire it in `RulesEvaluator.update()` when constructing `context`.
  - Ensure it safely no-ops if entity missing.

  **References**:
  - `app/lib/game-engine/rules/types.ts:RuleContext`
  - `app/lib/game-engine/RulesEvaluator.ts` context construction (~lines 417+)

  **Acceptance criteria**:
  - Can call helper from an action executor without importing runtime systems.

- [ ] 3. Add EntityManager helper for setting world position deterministically

  **What to do**:
  - Add a method (e.g. `setWorldPosition(entityId, x, y)`) that updates the correct transform fields and calls `updateWorldTransforms`.
  - This becomes the single canonical way runtime systems mutate entity position outside physics.

  **References**:
  - `app/lib/game-engine/EntityManager.ts:updateWorldTransforms`
  - Existing direct patterns in `BallSortActionExecutor` setting `ball.transform` + `updateWorldTransforms`.

  **Acceptance criteria**:
  - Setting world position updates `entity.transform` and `entity.worldTransform` consistently.

### Wave 2 — Runtime system for target-following (depends on Wave 1)

- [ ] 4. Implement a VISUAL runtime system that enforces target-following via TweenSystem

  **What to do**:
  - Create a new runtime system wrapper that owns a `TweenSystem` instance.
  - Adapter `setEntityPosition` must update both:
    - `ctx.bridge.setPosition`
    - `ctx.entityManager.setWorldPosition` (new helper)
  - Maintain per-entity bookkeeping:
    - lastTarget
    - activeTweenId
  - On target change (epsilon), restart tween from current -> target.
  - Compute duration from distance with clamp; pick `easeOutQuad` by default.

  **References**:
  - `app/lib/game-engine/animation/TweenSystem.ts`
  - `app/lib/game-engine/systems/runner/wrappers/TweenRuntimeSystem.ts` (pattern for system wrapper)
  - `app/lib/game-engine/systems/runner/GameSystemRunner.ts` (VISUAL phase)

  **Acceptance criteria**:
  - For a single entity with a target, position changes smoothly over multiple frames.
  - Retargeting mid-flight results in a smooth redirect, not a jump.
  - Active tween count remains bounded (no leak).

- [ ] 5. Add physics-sync guardrail for target-driven entities

  **What to do**:
  - Ensure `EntityManager.syncTransformsFromPhysics()` does not overwrite manually animated entities.
  - Define “manually animated” in a robust way (e.g., entity has `movementTarget` and is not at target).

  **References**:
  - `app/lib/game-engine/EntityManager.ts:syncTransformsFromPhysics`

  **Acceptance criteria**:
  - Animated entities do not snap back due to physics sync.

### Wave 3 — Ball Sort integration (depends on Wave 1–2)

- [ ] 6. Update Ball Sort pickup to set target and rely on the animation system

  **What to do**:
  - In `BallSortActionExecutor.executePickup`, replace the teleport with `context.setEntityTargetPosition(ballId, pickupX, pickupY, …)`.
  - Keep `ball_picked` event immediate.
  - Remove direct writes to `ball.transform` and `bridge.setPosition` for pickup.

  **References**:
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:executePickup`

  **Acceptance criteria**:
  - Pickup still transitions to `holding` immediately.
  - Ball lifts smoothly.

- [ ] 7. Align drop + cancel to the same target-driven model (recommended)

  **What to do**:
  - Update `executeDrop` and `cancelPickup` to set targets rather than teleport.
  - This ensures the “tap again during animation” model behaves correctly.

  **References**:
  - `BallSortActionExecutor.ts:executeDrop`, `cancelPickup`

  **Acceptance criteria**:
  - Rapid pickup→drop taps result in smooth retargeting (no jitter).
  - Tube counts/tags remain correct.

### Wave 4 — Validation / polish (after integration)

- [ ] 8. Add minimal observability

  **What to do**:
  - Expose active tween count or per-entity tween ids in system state for debugging.
  - (Optional) add a dev log toggle.

  **Acceptance criteria**:
  - Can confirm no tween leak during repeated taps.

---

## Risks / Gotchas

1) **Physics overwriting animation**
   - Must be explicitly prevented or you’ll see snapping/jitter.

2) **Entity transform semantics (local/world)**
   - Need a single helper to set world position to avoid corrupting hierarchy.

3) **Runner/system “statelessness” vs practical state**
   - The runner API as written suggests systems should store state in `getState()`, but current wrappers keep internal references (e.g., `TweenRuntimeSystem` stores `tweenSystem`).
   - Keep any additional state small and deterministic (maps keyed by entity id), and don’t rely on wall-clock time for tween ids if determinism matters.

4) **Tween IDs use Date.now()**
   - `TweenSystem.createTween` uses `Date.now()` + random. That breaks determinism/replay.
   - For now (first validation), accept it; but note it as a future improvement if determinism is required.

---

## Estimated Complexity / Risk

- Complexity: **Medium**
  - Touches core loop (VISUAL) and entity transform/physics boundary.
- Risk: **Medium–High**
  - If physics is involved, wrong authority rules can cause subtle jitter.
  - Mitigated by explicit “manual animation authority” guardrail and small scope.
