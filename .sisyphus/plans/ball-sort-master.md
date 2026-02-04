# Ball Sort Master Plan

**Consolidated:** 2026-02-03
**Source Plans:** 8 documents merged

This document consolidates all Ball Sort improvement plans into a single reference.

---

## Overview

Ball Sort is one of the 5 Launch Games. It has several active improvement tracks:

1. **Level System** - Progression, persistence, UI dialogs
2. **Animation System** - Smooth pickup/drop via tweening
3. **Entity Cleanup** - Simplify tube structure
4. **Bug Fixes** - Positioning, placement, interaction issues
5. **Visual Polish** - Hover highlights, held ball effects

---

## Status Summary

| Track | Status | Priority |
|-------|--------|----------|
| Level System | **COMPLETE** | High |
| Animation (Tween) | **COMPLETE** | Medium |
| Tube Cleanup | **COMPLETE** | Medium |
| Pickup/Drop Bugs | **COMPLETE** | High |
| Hover Highlight | **COMPLETE** | Low |
| Debug/Layout | **COMPLETE** | Low |

> **Validated 2026-02-03**: All 5 tracks fully implemented. See evidence below.

---

## Track 1: Level System Enhancement

### Goal
Implement complete level progression with persistence, dialogs, and tube images.

### Deliverables
- `GameProgressManager` class + `useGameProgress` hook
- `GameDialog` component (reusable)
- Updated puzzle generator (easier level 1, smart extra tubes)
- Generated tube/bottle images
- Level complete screen with stats
- Pause menu level navigation
- Persistent progress across sessions

### Key Decisions
- Tube style: Colorful bottles (cartoon aesthetic)
- Level 1: 2 colors, ~3-5 moves
- Extra tubes: 1 for levels 1-3, 2 for levels 4+
- Stats: Time + Moves + Best Time/Moves

### Files to Create/Modify
- `app/lib/game-engine/progress/GameProgressManager.ts`
- `app/lib/game-engine/progress/useGameProgress.ts`
- `app/components/game/GameDialog.tsx`
- `app/lib/test-games/games/ballSort/game.ts`
- `app/lib/test-games/games/ballSort/puzzleGenerator.ts`
- `app/app/test-games/[id].tsx`
- `app/lib/game-engine/GameRuntime.godot.tsx`

### References
- `shared/src/types/progress.ts` - PersistenceConfig, LoadProgressResult
- `app/lib/utils/storage.ts` - Storage utility
- `docs/game-progress-persistence-system.md` - Detailed spec

---

## Track 2: Animation System (Pickup Tween)

### Goal
Replace instant teleport with smooth animated movement using target-driven tweening.

### Architecture
```
USER TAPS TUBE
  → Game logic sets target position (immediate)
  → State machine transitions (immediate)
  → Animation system interpolates toward target (visual)
  → If retargeted mid-animation → smooth redirect
```

### Implementation Status
- [x] `MovementTarget` interface in `types.ts`
- [x] `movementTarget` field on `RuntimeEntity`
- [x] `setEntityTargetPosition` in RuleContext
- [x] `TargetPositionRuntimeSystem` created
- [x] Register system in GameSystemRunner (GameRuntime.godot.tsx:764)
- [x] Update BallSortActionExecutor to use target positions (lines 126-127, 180-181, 323-324)

### Key Files
- `app/lib/game-engine/types.ts` - MovementTarget interface
- `app/lib/game-engine/rules/types.ts` - RuleContext method
- `app/lib/game-engine/systems/runner/wrappers/TargetPositionRuntimeSystem.ts`
- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`

---

## Track 3: Tube Entity Cleanup

### Goal
Replace 4-entity-per-tube structure with single sensor-based tube entity.

### Current Structure (per tube)
- `tube-{i}-left` (tubeWall)
- `tube-{i}-right` (tubeWall)
- `tube-{i}-bottom` (tubeBottom)
- `tube-{i}-sensor` (tubeSensor)

### Target Structure (per tube)
- `tube-{i}` only (sensor collider with `isSensor: true`)

### Changes Required
1. Remove templates: `tubeWall`, `tubeBottom`
2. Rename `tubeSensor` → `tube` with `isSensor: true`
3. Update `createTubeEntities()` to create single entity
4. Update `BallSortActionExecutor`:
   - Match `tube-(\d+)` instead of `tube-(\d+)-sensor`
   - Compute dimensions without separate bottom entity

### Benefits
- Simpler entity structure
- Cleaner game definition
- Easier to reason about

---

## Track 4: Bug Fixes (Pickup/Drop Positioning)

### Known Bugs
1. **Vertical placement** - Balls don't return to correct slot Y
2. **Horizontal placement** - Balls sometimes appear in wrong tube X
3. **Pickup position** - Ball appears between tubes instead of above source tube

### Root Cause Analysis
- Executor uses hardcoded constants (`WORLD_HEIGHT=16`, `TUBE_Y=10`)
- Game uses different world size (`WORLD_HEIGHT=25.6`)
- Coordinate space mismatch causes wrong positions

### Fix Approach
- Derive positions from runtime tube sensor entity transforms
- Use `tubeSensor.transform.y` + collider height for positioning
- Remove executor-level `cy()` conversion
- Compute slot Y from final tube state after ball insertion

### Key Formula
```typescript
// Pickup position
pickupY = tubeSensor.transform.y - (tubeHeight/2 + LIFT_HEIGHT)

// Drop slot position
slotY = tubeBottomY + BALL_RADIUS + slotIndex * BALL_SPACING
```

### Verification
- Use game-inspector for deterministic repro
- Capture coordinates before/after pickup/drop
- Validate within epsilon tolerance (±0.05 world units)

---

## Track 5: Visual Polish

### Hover Highlight
- Single reusable highlight entity (`tube-hover-highlight`)
- `BallSortHoverRuntimeSystem` checks `ctx.input.mouse` each frame
- AABB contains test against tube sensors
- Highlight: `#FFFFFF66`, no collider, high layer (above balls)

### Held Ball Animation
- conditionalBehaviors on ball templates: `when: { hasTag: "held" }`
- `scale_oscillate`: min 0.95, max 1.15, speed 4
- `sprite_effect` glow with pulse
- Add "held" tag on pickup, remove on drop/cancel

### Debug Overlays
- Enable with `input: { debugInputs: true }`
- Shows cyan dashed borders around tube sensors
- Green crosshair at tap location

---

## Implementation Order

### Phase 1: Critical Bug Fixes
1. Fix pickup positioning (coordinate space)
2. Fix drop slot calculation
3. Verify with game-inspector

### Phase 2: Entity Cleanup
4. Unify tube entities
5. Update action executor for new IDs
6. Update tests

### Phase 3: Animation
7. Register TargetPositionSystem
8. Update executor to use setEntityTargetPosition
9. Verify smooth animations

### Phase 4: Level System
10. Build GameProgressManager
11. Build useGameProgress hook
12. Build GameDialog component
13. Integrate persistence
14. Add win dialog + pause menu buttons

### Phase 5: Polish
15. Add hover highlight system
16. Add held ball animation
17. Generate tube images

---

## Test Commands

```bash
# TypeScript check
pnpm tsc --noEmit

# Run tests
pnpm -C app test

# Start dev server
pnpm dev
# Navigate to http://localhost:8085/test-games/ballSort
```

---

## Success Criteria

### Functional
- [x] All 6 tubes visible and tappable
- [x] Pickup positions ball above source tube
- [x] Drop positions ball in correct slot
- [x] Level progression works
- [x] Progress persists across refresh
- [x] Win condition triggers correctly

### Visual
- [x] Smooth pickup/drop animations
- [x] Hover highlight on tubes
- [x] Held ball pulse effect
- [ ] Tube bottle images (not black boxes) — *asset generation pending*

### Technical
- [x] Single tube entity per tube
- [x] No coordinate space mismatches
- [x] All tests pass
