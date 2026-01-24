# Input Control Testing Plan

## Overview

Using Breakout Bouncer as a testbed to verify all input methods work correctly across Web and Native platforms.

## Paddle Physics Setup

The paddle has been changed from `kinematic` to `dynamic` to support proper damping:

```typescript
physics: {
  bodyType: "dynamic",
  linearDamping: 15,      // Stops quickly on input release
  fixedRotation: true,    // Won't spin when ball hits
  density: 1,
  friction: 0,
  restitution: 1,
}
```

## Input Methods to Test

### 1. Keyboard Controls (Web only)

**File:** `app/lib/test-games/games/breakoutBouncer.ts` (lines 291-307)

**Rules:**
- `paddle_left`: Button "left" held → move left at speed 15
- `paddle_right`: Button "right" held → move right at speed 15

**Keys mapped:**
- A / Left Arrow → left
- D / Right Arrow → right

**Test checklist:**
- [ ] Paddle moves left when holding A or Left Arrow
- [ ] Paddle moves right when holding D or Right Arrow
- [ ] Paddle stops quickly when key released (damping)
- [ ] Holding both keys simultaneously doesn't break anything

---

### 2. Virtual Tap Controls (Web + Native)

**File:** `app/lib/test-games/games/breakoutBouncer.ts` (lines 309-322)

**Rules:**
- `tap_left`: Tap where `worldX < 5` → move left at speed 10
- `tap_right`: Tap where `worldX >= 5` → move right at speed 10

**Test checklist:**
- [ ] Web: Click left half of screen → paddle moves left
- [ ] Web: Click right half of screen → paddle moves right
- [ ] Native: Tap left half → paddle moves left
- [ ] Native: Tap right half → paddle moves right
- [ ] Rapid tapping works smoothly

---

### 3. Mouse Follow (Web only)

**File:** `app/lib/test-games/games/breakoutBouncer.ts` (lines 324-336)

**Rule:**
- `paddle_follow_mouse`: Every frame, move toward `$mouse` entity on X axis at speed 8

**Test checklist:**
- [ ] Paddle smoothly follows mouse X position
- [ ] Paddle stays within bounds (walls stop it)
- [ ] Movement feels responsive (speed 8 might need tuning)
- [ ] Paddle stops when mouse stops moving

---

### 4. Drag Controls (Not yet tested)

**File:** `app/lib/test-games/games/breakoutBouncer.ts` (lines 279-289)

**Rule:**
- `paddle_move`: On drag move, move toward touch X at speed 20

**Test checklist:**
- [ ] Web: Click and drag moves paddle toward cursor X
- [ ] Native: Touch and drag moves paddle toward finger X
- [ ] Releasing drag stops paddle (with damping)

---

## How to Switch Between Input Methods

In `breakoutBouncer.ts`, only ONE input method should be active at a time for testing. Use `/* */` comments to toggle:

```typescript
// To test KEYBOARD: Uncomment lines 291-307, comment others
// To test TAP: Uncomment lines 309-322, comment others  
// To test MOUSE FOLLOW: Uncomment lines 324-336, comment others
// To test DRAG: Uncomment lines 279-289, comment others
```

## Current State

| Input Method | Status | Currently Active |
|--------------|--------|------------------|
| Keyboard | Implemented | ❌ Commented out |
| Virtual Tap | Implemented | ❌ Commented out |
| Mouse Follow | Implemented | ✅ Active |
| Drag | Implemented | ❌ Commented out |

## Known Issues / TODO

- [ ] Verify `linearDamping: 15` feels right (might need adjustment)
- [ ] Test on actual iOS device
- [ ] Test on actual Android device
- [ ] Consider adding visual feedback when input is detected
- [ ] Tilt controls not yet implemented for this game

## Related Files

- **Game definition:** `app/lib/test-games/games/breakoutBouncer.ts`
- **Input trigger evaluation:** `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts`
- **Physics actions:** `app/lib/game-engine/rules/actions/PhysicsActionExecutor.ts`
- **Game runtime (input handling):** `app/lib/game-engine/GameRuntime.godot.tsx`
- **Input event flow docs:** `INPUT_EVENT_FLOW.md`
