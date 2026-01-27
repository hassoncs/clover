# Ball Sort Debug & Layout Fix

## Context

### Original Request
Debug and fix the Ball Sort game's touch interaction and layout issues:
1. Fix column spacing so all 6 tubes fit horizontally on vertical phone screen
2. Enable input/hit area debugging overlays
3. Add console logging to tube touch events
4. Implement glow + scale animation for selected/held ball
5. Verify tube→tube ball movement game flow via manual QA

### Interview Summary
**Key Discussions**:
- Layout margins: User chose tight fit (~0.5 unit margins each side)
- Selection animation: User chose glow effect + scale pulse combined
- Console logging: User chose minimal (key events only)
- Test strategy: User chose manual QA only (no unit tests)

**Research Findings**:
- Current layout math broken: `0.2 + 5 × 2.8 = 14.2` exceeds WORLD_WIDTH (12)
- InputDebugOverlay exists, just needs `debugInputs: true` in game config
- `scale_oscillate` and `sprite_effect` behaviors exist (used in gemCrush)
- conditionalBehaviors pattern: `{ when: { hasTag: "..." }, behaviors: [...] }`

---

## Work Objectives

### Core Objective
Fix the Ball Sort game so all 6 tubes are visible and interactive, with visual debug tools and selection feedback animation.

### Concrete Deliverables
- Updated layout constants in `game.ts` with correct tube spacing
- Debug overlay enabled via `input: { debugInputs: true }`
- Console logs in `BallSortActionExecutor.ts` for tap events
- conditionalBehaviors on ball templates for held state animation
- Manual QA verification of full game flow

### Definition of Done
- [ ] All 6 tubes visible on screen with ~0.5 unit margins
- [ ] Debug overlay shows cyan dashed borders around tube sensors
- [ ] Console shows tube index on tap
- [ ] Held ball pulses with glow + scale effect
- [ ] Pick→drop cycle works correctly

### Must Have
- Correct tube spacing calculation
- Debug overlay visible when game runs
- Console logs for tube tap, pickup, drop events
- Visual feedback when ball is held

### Must NOT Have (Guardrails)
- Do NOT change tube height, ball size, or other non-spacing constants
- Do NOT add unit tests (manual QA only per user decision)
- Do NOT refactor BallSortActionExecutor beyond adding logs
- Do NOT modify other games or shared code

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (bun test available)
- **User wants tests**: NO (manual QA only)
- **Framework**: N/A

### Manual QA Protocol

**For each TODO**, verification uses:
1. **Visual inspection** via the dev server (pnpm dev → http://localhost:8085)
2. **Console output** in browser DevTools
3. **Debug overlay** showing tap targets

**Evidence Required:**
- Screenshot or visual confirmation
- Console log output copy-paste

---

## Task Flow

```
Task 1 (Layout Fix) → Task 2 (Debug Enable) → Task 3 (Console Logs) → Task 4 (Animation)
                                                                              ↓
                                                                      Task 5 (Manual QA)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3 | Independent changes to different files |

| Task | Depends On | Reason |
|------|------------|--------|
| 4 | 1 | Animation needs ball templates which depend on correct layout |
| 5 | 1, 2, 3, 4 | QA verifies all previous work |

---

## TODOs

- [ ] 1. Fix Tube Layout Constants

  **What to do**:
  - Calculate new TUBE_SPACING to fit 6 tubes within WORLD_WIDTH (12) with ~0.5 unit margins
  - Formula: `usableWidth = WORLD_WIDTH - 2 × margin = 12 - 1 = 11`
  - For 6 tubes with 5 gaps: `TUBE_SPACING = 11 / 5 = 2.2`
  - Center first tube: `TUBE_START_X = margin + TUBE_WIDTH/2 = 0.5 + 0.7 = 1.2`
  - Wait, that's not quite right. Let me recalculate:
    - First tube center at X = margin = 0.5 (in game coords before cx transform)
    - Last tube center at X = 12 - margin = 11.5
    - Spread = 11.5 - 0.5 = 11
    - TUBE_SPACING = 11 / 5 = 2.2
    - TUBE_START_X = 0.5
  - Update constants in game.ts lines 24-25

  **Must NOT do**:
  - Change TUBE_WIDTH, TUBE_HEIGHT, BALL_RADIUS, or other non-spacing constants
  - Modify tube entity structure

  **Parallelizable**: NO (foundation for other tasks)

  **References**:

  **Pattern References**:
  - `app/lib/test-games/games/ballSort/game.ts:9-26` - Current layout constants (WORLD_WIDTH=12, TUBE_SPACING=2.8, TUBE_START_X=0.2)
  - `app/lib/test-games/games/ballSort/game.ts:126` - Tube X position calculation: `const tubeX = TUBE_START_X + tubeIndex * TUBE_SPACING`
  - `app/lib/test-games/games/ballSort/game.ts:154-156` - Tube entity loop using the constants

  **Why Each Reference Matters**:
  - Lines 24-25 contain the exact constants to modify
  - Line 126 shows how tubeX is calculated (must understand to verify fix)
  - Lines 154-156 show the loop that creates 6 tubes

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Start dev server: `pnpm dev`
  - [ ] Navigate to: http://localhost:8085/test-games/ballSort
  - [ ] Visual check: All 6 tubes visible on screen
  - [ ] Visual check: Leftmost and rightmost tubes have visible margins from screen edge
  - [ ] Console verification: No errors in browser console

  **Commit**: YES
  - Message: `fix(ball-sort): correct tube spacing to fit 6 tubes on screen`
  - Files: `app/lib/test-games/games/ballSort/game.ts`

---

- [ ] 2. Enable Input Debug Overlay

  **What to do**:
  - Add `input: { debugInputs: true }` to the game definition object
  - Insert after `camera: { type: "fixed", zoom: 1 },` on line 174

  **Must NOT do**:
  - Add other input configuration options
  - Modify InputDebugOverlay.tsx

  **Parallelizable**: YES (with task 3)

  **References**:

  **Pattern References**:
  - `app/lib/test-games/games/ballSort/game.ts:161-174` - Game definition object structure, camera config location
  - `app/lib/test-games/games/simplePlatformer/game.ts:33-60` - Example of input config with various options
  - `app/lib/game-engine/GameRuntime.godot.tsx:1532-1541` - Where debugInputs enables InputDebugOverlay

  **API/Type References**:
  - `shared/src/types/GameDefinition.ts:359` - `debugInputs?: boolean` type definition

  **Why Each Reference Matters**:
  - Line 174 is where to insert the new config
  - simplePlatformer shows the `input: { ... }` syntax pattern
  - GameRuntime shows the overlay only renders when `definition.input?.debugInputs` is truthy

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Start dev server: `pnpm dev`
  - [ ] Navigate to: http://localhost:8085/test-games/ballSort
  - [ ] Visual check: Cyan dashed borders visible around all 6 tube sensor areas
  - [ ] Tap any tube: Green crosshair appears at tap location
  - [ ] Tap any tube: Input log shows `[TAP] (x, y) → tube-N-sensor`

  **Commit**: YES
  - Message: `feat(ball-sort): enable input debug overlay`
  - Files: `app/lib/test-games/games/ballSort/game.ts`

---

- [ ] 3. Add Console Logging for Touch Events

  **What to do**:
  - Add console.log in `getTubeIndexFromInput()` after parsing tube index
  - Add console.log at start of `executePickup()` showing tube index and ball ID
  - Add console.log at start of `executeDrop()` showing source and target tubes
  - Keep logs minimal: only key events, not variable dumps

  **Must NOT do**:
  - Log full context objects (too verbose)
  - Add logging to helper methods
  - Refactor existing logic

  **Parallelizable**: YES (with task 2)

  **References**:

  **Pattern References**:
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:191-201` - getTubeIndexFromInput() method
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:42-90` - executePickup() method
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:92-167` - executeDrop() method

  **Why Each Reference Matters**:
  - getTubeIndexFromInput (line 196-199): Add log after successful regex match showing `targetEntityId → tubeIndex`
  - executePickup (line 43): Add log showing `Pickup from tube ${tubeIndex}, ball: ${ballId}`
  - executeDrop (line 93-96): Add log showing `Drop from tube ${sourceTubeIndex} to tube ${targetTubeIndex}`

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Start dev server: `pnpm dev`
  - [ ] Open browser DevTools Console
  - [ ] Navigate to: http://localhost:8085/test-games/ballSort
  - [ ] Tap tube 0: Console shows `[BallSort] Tap detected: tube-0-sensor → index 0`
  - [ ] Console shows `[BallSort] Pickup from tube 0, ball: ball-X`
  - [ ] Tap tube 1: Console shows `[BallSort] Drop from tube 0 to tube 1`

  **Commit**: YES
  - Message: `feat(ball-sort): add console logging for touch events`
  - Files: `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`

---

- [ ] 4. Add Held Ball Animation (Glow + Scale Pulse)

  **What to do**:
  - Define conditionalBehaviors array for ball templates
  - Add condition: `when: { hasTag: "held" }`
  - Add behaviors: scale_oscillate (min: 0.95, max: 1.15, speed: 4) + sprite_effect glow with pulse
  - Apply conditionalBehaviors to all 4 ball templates (ball0, ball1, ball2, ball3)
  - Modify executePickup() to add "held" tag to the picked ball
  - Modify executeDrop() and cancelPickup() to remove "held" tag

  **Must NOT do**:
  - Change ball physics properties
  - Modify ball colors or radius
  - Add animation to non-ball entities

  **Parallelizable**: NO (depends on layout fix for testing)

  **References**:

  **Pattern References**:
  - `app/lib/test-games/games/gemCrush/game.ts:21-42` - conditionalBehaviors pattern with scale_oscillate and sprite_effect glow
  - `app/lib/test-games/games/ballSort/game.ts:293-360` - Ball template definitions (ball0, ball1, ball2, ball3)
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:71-73` - Where heldBallId is set in executePickup
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:147-152` - Tag manipulation example in executeDrop

  **API/Type References**:
  - `shared/src/types/behavior.ts:308` - ConditionalBehavior interface
  - `shared/src/types/entity.ts:57` - Template conditionalBehaviors property

  **Why Each Reference Matters**:
  - gemCrush lines 21-42 show exact syntax for conditionalBehaviors with glow + scale
  - Ball templates (lines 293-360) need conditionalBehaviors added
  - executePickup line 71 is where to add "held" tag after setting heldBallId
  - executeDrop lines 147-152 show how to manipulate tags (use as pattern)

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Start dev server: `pnpm dev`
  - [ ] Navigate to: http://localhost:8085/test-games/ballSort
  - [ ] Tap a tube with balls: Top ball lifts up AND starts pulsing (scale 0.95→1.15) with glow
  - [ ] Tap same tube: Ball drops back, animation stops
  - [ ] Tap different tube: Ball moves to new tube, animation stops
  - [ ] Tap empty tube then non-empty tube: Verify no animation on empty tube tap

  **Commit**: YES
  - Message: `feat(ball-sort): add glow and scale pulse animation for held ball`
  - Files: `app/lib/test-games/games/ballSort/game.ts`, `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`

---

- [ ] 5. Manual QA Verification

  **What to do**:
  - Systematically test all game interactions
  - Document any issues found
  - Verify all acceptance criteria from previous tasks

  **Must NOT do**:
  - Write automated tests
  - Make code changes (this is verification only)

  **Parallelizable**: NO (depends on all previous tasks)

  **References**:

  **Test Checklist**:
  - `app/lib/test-games/games/ballSort/game.ts` - Game definition for reference
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts` - Action logic for understanding expected behavior

  **QA Test Cases**:

  | Test Case | Steps | Expected Result |
  |-----------|-------|-----------------|
  | Layout | Load game | All 6 tubes visible, ~0.5 unit margins |
  | Debug overlay | Load game | Cyan borders on all tube sensors |
  | Tap logging | Tap tube 2 | Console: `[BallSort] Tap detected: tube-2-sensor → index 2` |
  | Pickup animation | Tap non-empty tube | Ball lifts, pulses with glow |
  | Drop same tube | Pick up, tap same tube | Ball returns, no error, animation stops |
  | Valid move | Pick red ball, drop on empty tube | Ball moves, count updates |
  | Valid move (same color) | Pick red ball, drop on tube with red top | Ball stacks correctly |
  | Invalid move (full tube) | Pick ball, try drop on 4-ball tube | Ball returns to source |
  | Invalid move (wrong color) | Pick red, tap tube with blue top | Ball returns to source |
  | Win condition | Sort all balls by color | Win state triggered |

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] All 10 test cases pass
  - [ ] No console errors during gameplay
  - [ ] Game is playable from start to win

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(ball-sort): correct tube spacing to fit 6 tubes on screen` | game.ts | Visual check |
| 2 | `feat(ball-sort): enable input debug overlay` | game.ts | Visual check |
| 3 | `feat(ball-sort): add console logging for touch events` | BallSortActionExecutor.ts | Console check |
| 4 | `feat(ball-sort): add glow and scale pulse animation for held ball` | game.ts, BallSortActionExecutor.ts | Visual check |

---

## Success Criteria

### Verification Commands
```bash
pnpm dev  # Start dev server
# Navigate to http://localhost:8085/test-games/ballSort
```

### Final Checklist
- [ ] All 6 tubes visible with margins
- [ ] Debug overlay shows tap targets
- [ ] Console logs tube interactions
- [ ] Held ball has glow + scale animation
- [ ] Full pick→drop→win flow works
- [ ] All "Must NOT Have" guardrails respected
