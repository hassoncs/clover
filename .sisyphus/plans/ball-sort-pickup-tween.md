# Ball Sort: Animated Pickup via Target-Driven Tweening

## TL;DR

Replace Ball Sort's instant pickup/drop teleport with **smooth animated movement**:

- Game logic sets a **target position** immediately (state transitions stay immediate)
- A VISUAL-phase system makes entities **smoothly interpolate** toward their target
- If target changes mid-animation, the entity **retargets smoothly** (no cancel needed)
- Ball Sort balls have **no physics** - this is purely visual animation

**Estimated effort**: Small (half day)
**Risk**: Low (no physics involvement, isolated to Ball Sort)

---

## Context / Background

### Current Behavior (Teleport)

In `BallSortActionExecutor.ts`, when user taps a tube:

```typescript
// Lines 134-138 - instant teleport
context.bridge.setPosition(ballId, pickupX, pickupY);
ball.transform.x = pickupX;
ball.transform.y = pickupY;
context.entityManager.updateWorldTransforms(ballId);
```

The ball instantly appears at the pickup position. We want it to animate there smoothly.

### Design Decisions Made

After extensive analysis of tween+physics interactions across Unity, Godot, and our engine:

1. **Ball Sort balls stay physics-free** - They're visual-only entities in a deterministic puzzle. No collisions needed.

2. **No new body types** - We keep `static | dynamic | kinematic`. Motion mode (position vs velocity) is orthogonal and inferred from behaviors.

3. **Reactive animation model** - Game logic sets targets instantly, animation catches up visually. If you tap again mid-animation, it smoothly redirects.

4. **State transitions are immediate** - `ball_picked` fires right away. Animation is purely visual.

### Why This Approach

- **Simplest possible implementation** for Ball Sort (no physics complexity)
- **Validates the TweenSystem** before tackling physics-interactive cases
- **Establishes the pattern** for target-driven animation that can be extended later

---

## Architecture

### The Mental Model

```
┌─────────────────────────────────────────────────────────────┐
│                    BALL SORT ANIMATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   USER TAPS TUBE                                             │
│         │                                                    │
│         ▼                                                    │
│   ┌─────────────────┐                                        │
│   │ Game Logic sets │  ← Immediate (same frame)              │
│   │ target position │                                        │
│   │ + fires event   │                                        │
│   └────────┬────────┘                                        │
│            │                                                 │
│            ▼                                                 │
│   ┌─────────────────┐                                        │
│   │ State machine   │  ← idle → holding (immediate)          │
│   │ transitions     │                                        │
│   └────────┬────────┘                                        │
│            │                                                 │
│            ▼                                                 │
│   ┌─────────────────┐                                        │
│   │ Animation system│  ← Each frame: interpolate toward      │
│   │ catches up      │    target, update transform + bridge   │
│   └─────────────────┘                                        │
│                                                              │
│   IF USER TAPS AGAIN → New target set → Smooth retarget      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Target Position Storage** - Per-entity optional field for animation target
2. **RuleContext API** - `setEntityTargetPosition()` for actions to use
3. **TargetPositionSystem** - VISUAL phase system that interpolates toward targets
4. **Updated BallSortActionExecutor** - Uses new API instead of direct position sets

---

## Implementation Tasks

### Task 1: Add target position data model

**File**: `app/lib/game-engine/types.ts`

**What to do**:
- Add optional `movementTarget` field to `RuntimeEntity`
- Include target position and animation config

```typescript
interface MovementTarget {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  duration: number;
  easing: string;
}

interface RuntimeEntity {
  // ... existing fields
  movementTarget?: MovementTarget;
}
```

**Acceptance criteria**:
- TypeScript compiles (`pnpm tsc --noEmit`)
- No breaking changes to existing entity usage

---

### Task 2: Add `setEntityTargetPosition` to RuleContext

**Files**: 
- `app/lib/game-engine/rules/types.ts` (interface)
- `app/lib/game-engine/RulesEvaluator.ts` (implementation)

**What to do**:
- Add method to RuleContext interface
- Implement in RulesEvaluator when constructing context
- Method sets `movementTarget` on the entity

```typescript
// In RuleContext interface
setEntityTargetPosition(
  entityId: string, 
  x: number, 
  y: number, 
  config?: { duration?: number; easing?: string }
): void;
```

**Implementation details**:
- Default duration: `clamp(distance / 10, 0.1, 0.3)` seconds (distance-based)
- Default easing: `'easeOutQuad'`
- Sets `movementTarget` with current position as start, records start time

**Acceptance criteria**:
- Can call from BallSortActionExecutor without errors
- Entity's `movementTarget` is populated correctly

---

### Task 3: Create TargetPositionRuntimeSystem

**File**: `app/lib/game-engine/systems/runner/wrappers/TargetPositionRuntimeSystem.ts`

**What to do**:
- Create new RuntimeSystem that runs in VISUAL phase
- Each frame: find entities with `movementTarget`, interpolate toward target
- Update both `entity.transform` AND call `bridge.setPosition()`
- Clear `movementTarget` when animation completes

```typescript
export class TargetPositionRuntimeSystem implements RuntimeSystem {
  readonly id = 'target-position';
  readonly phase = SystemPhase.VISUAL;
  readonly priority = 50; // Before TweenRuntimeSystem (100)
  
  update(ctx: UpdateContext): void {
    ctx.entityManager.getAllEntities().forEach(entity => {
      if (!entity.movementTarget) return;
      
      const target = entity.movementTarget;
      const elapsed = ctx.elapsed - target.startTime;
      const progress = Math.min(1, elapsed / target.duration);
      const easedProgress = this.applyEasing(progress, target.easing);
      
      // Interpolate
      const x = target.startX + (target.x - target.startX) * easedProgress;
      const y = target.startY + (target.y - target.startY) * easedProgress;
      
      // Update entity transform
      entity.transform.x = x;
      entity.transform.y = y;
      ctx.entityManager.updateWorldTransforms(entity.id);
      
      // Sync to bridge
      ctx.bridge.setPosition(entity.id, x, y);
      
      // Clear when done
      if (progress >= 1) {
        entity.movementTarget = undefined;
      }
    });
  }
}
```

**Acceptance criteria**:
- System runs each frame in VISUAL phase
- Entities with targets animate smoothly
- Animation completes and clears target
- Retargeting mid-animation works (setting new target restarts from current position)

---

### Task 4: Register TargetPositionRuntimeSystem

**File**: `app/lib/game-engine/systems/runner/GameSystemRunner.ts` (or wherever systems are registered)

**What to do**:
- Import and register the new system
- Ensure it runs in VISUAL phase

**Acceptance criteria**:
- System is active when games run
- No errors in console

---

### Task 5: Update BallSortActionExecutor to use target positions

**File**: `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`

**What to do**:
- Replace direct position sets with `context.setEntityTargetPosition()`
- Apply to: `executePickup`, `executeDrop`, `cancelPickup`

**Before** (in executePickup):
```typescript
if (context.bridge) {
  context.bridge.setPosition(ballId, pickupX, pickupY);
}
ball.transform.x = pickupX;
ball.transform.y = pickupY;
context.entityManager.updateWorldTransforms(ballId);
```

**After**:
```typescript
context.setEntityTargetPosition(ballId, pickupX, pickupY, {
  duration: 0.2,
  easing: 'easeOutQuad'
});
```

**Apply same pattern to**:
- `executeDrop` (line ~188)
- `cancelPickup` (line ~323)

**Acceptance criteria**:
- Pickup animates ball smoothly to lifted position
- Drop animates ball to slot position
- Cancel animates ball back to source tube
- State transitions still happen immediately
- Rapid taps result in smooth retargeting (no jitter)

---

### Task 6: Manual verification

**What to do**:
- Open Ball Sort game at `http://localhost:8085/test-games/ballSort`
- Test scenarios:
  1. Tap tube → ball lifts smoothly (not instant)
  2. State shows "holding" immediately (UI responsive)
  3. Tap destination → ball drops smoothly
  4. Rapid tap same tube → ball animates back (retarget)
  5. Tap tube A, immediately tap tube B → smooth redirect
  6. Complete a puzzle → all animations work throughout

**Acceptance criteria**:
- All animations are smooth
- No jitter or fighting
- UI remains responsive (state changes immediate)
- Game plays correctly end-to-end

---

## Files Changed Summary

| File | Change |
|------|--------|
| `app/lib/game-engine/types.ts` | Add `MovementTarget` interface, add field to `RuntimeEntity` |
| `app/lib/game-engine/rules/types.ts` | Add `setEntityTargetPosition` to `RuleContext` |
| `app/lib/game-engine/RulesEvaluator.ts` | Implement `setEntityTargetPosition` in context construction |
| `app/lib/game-engine/systems/runner/wrappers/TargetPositionRuntimeSystem.ts` | New file - the animation system |
| `app/lib/game-engine/systems/runner/GameSystemRunner.ts` | Register new system |
| `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts` | Use `setEntityTargetPosition` instead of direct sets |

---

## Future Extensions (Not in Scope)

This plan establishes the pattern. Future work could extend it:

1. **Physics-interactive animation** (Peggle rotating platform)
   - Same target-driven model
   - But entities have `kinematic` body type
   - Bridge uses `AnimatableBody2D` under the hood
   - Requires `transformAuthority` gating in `syncTransformsFromPhysics()`

2. **Grab-move-release** (picking up physics objects)
   - Set `RigidBody2D.freeze = true`
   - Animate via target position
   - On release: `freeze = false`, set velocity from tween delta

3. **Declarative tween behaviors**
   - `{ type: 'tween', property: 'position', to: {...}, duration: 0.5 }`
   - For cases where animation is defined in game config, not actions

---

## Verification Checklist

- [ ] TypeScript compiles without errors
- [ ] Ball Sort game loads without errors
- [ ] Pickup animation is smooth (not instant)
- [ ] Drop animation is smooth
- [ ] Cancel animation is smooth
- [ ] State transitions are immediate (responsive UI)
- [ ] Retargeting works (tap again mid-animation → smooth redirect)
- [ ] Game completes successfully with all animations
- [ ] No console errors or warnings

---

## Risk Assessment

**Risk**: Low

**Why**:
- Ball Sort balls have no physics - no sync conflicts possible
- Isolated change - only affects Ball Sort action executor
- Clear rollback path - revert to direct position sets if issues

**Potential issues**:
- Timing edge cases (what if entity destroyed mid-animation?) → Clear target on destroy
- Performance with many balls animating → Unlikely issue, but monitor

