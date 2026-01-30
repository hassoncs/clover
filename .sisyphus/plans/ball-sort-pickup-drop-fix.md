# Ball Sort: robust pickup positioning + clarify drop/invalid feedback

## TL;DR

> **Quick Summary**: Fix Ball Sort’s held-ball pickup position by computing the “float above tube” world Y from the tapped tube’s runtime sensor entity (transform + collider height), eliminating the current hardcoded coordinate mismatch. Then verify both valid drops and invalid-drop feedback using game-inspector.
>
> **Deliverables**:
> - Robust pickup positioning update in `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
> - Verified behavior for: pickup → valid drop → invalid drop feedback → cancel pickup → win check
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO (sequential)
> **Critical Path**: Update pickup positioning → Verify interactions in game-inspector → (Optional) improve invalid feedback

---

## Context

### Original Request
Two user-reported Ball Sort bugs:
1. Picked-up ball appears in the wrong position (between tubes), rather than floating above the source tube.
2. After picking up a ball, clicking another tube doesn’t place it properly.

### Interview Summary
**Key decisions**:
- **Approach**: ROBUST — compute pickup position from the runtime tube sensor entity instead of hardcoded constants.
- **Bug #2 scenario**: the attempted move was **invalid** (dropping onto a different-color tube); expected behavior is a **clear invalid feedback** while remaining in “holding”.
- **Tube height source**: prefer `tubeSensor.collider?.height`; fallback to `tubeSensor.visual?.height`; last-resort fallback to executor’s `TUBE_HEIGHT` constant.
- **Lift**: use existing executor constant `LIFT_HEIGHT = 3.0`.

**Important repo observation**:
- The executor currently uses hardcoded world constants (`WORLD_HEIGHT=16`, `TUBE_Y=10`, `TUBE_HEIGHT=5`) that do not match the Ball Sort game’s configured world (`WORLD_HEIGHT=25.6`, `TUBE_Y=WORLD_HEIGHT*0.625`, scaled tube dimensions).
  - This mismatch strongly indicates the root cause of the visual “wrong position” bug.

### Metis Review
Metis consultation was intended but is **not available in this environment** (no delegate_task MCP). Guardrails and acceptance criteria below incorporate the likely Metis checks (scope locks, edge cases, explicit verification).

---

## Work Objectives

### Core Objective
Make held-ball pickup positioning correct and scale-resilient by deriving the pickup world position from the tapped tube sensor’s runtime entity (world transform + runtime dimensions).

### Concrete Deliverables
- Update pickup positioning logic in `BallSortActionExecutor.executePickup()` to:
  - compute `pickupWorldY = tubeSensor.transform.y - (tubeHeightWorld/2 + LIFT_HEIGHT)`
  - compute `tubeHeightWorld` from collider (then visual, then fallback constant)
  - stop using executor-local `cy()` for pickup placement

### Definition of Done
- [ ] In Ball Sort (web via game-inspector), picking up a ball from any tube shows the held ball floating directly above that tube (aligned to tube X, above tube top).
- [ ] While holding a ball:
  - [ ] Tapping an **empty** tube or a tube with the **same top color** drops the ball into the expected slot.
  - [ ] Tapping a tube with a **different top color** does **not** drop the ball and triggers clear invalid feedback.

### Must Have
- Pickup position derived from runtime tube sensor entity.
- Explicit fallbacks for tube height.
- Manual verification steps and evidence (screenshots).

### Must NOT Have (Guardrails)
- Do not change puzzle generation, tube count/capacity, or win condition logic.
- Do not introduce new coordinate constants that re-hardcode the Ball Sort game’s world parameters inside the engine.

---

## Verification Strategy (MANUAL via game-inspector)

### Test Decision
- **Infrastructure exists**: Unknown / not assessed here
- **User wants tests**: Manual-only for this fix (game-inspector)
- **Framework**: N/A

### Manual QA Evidence Requirements
- Screenshots captured for:
  - pickup position correctness (ball floats above correct tube)
  - valid drop success
  - invalid drop feedback

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Sequential – core logic):
1) Implement robust pickup positioning

Wave 2 (Verification):
2) Verify valid/invalid drops + feedback

Wave 3 (Only if needed):
3) Improve invalid feedback clarity (minimal, scoped)

Critical Path: 1 → 2

---

## TODOs

- [ ] 1. Implement robust held-ball pickup positioning (tube-relative)

  **What to do**:
  - In `executePickup()`:
    - Retrieve the tapped tube sensor entity: `tube-{tubeIndex}-sensor`.
    - Use **tube sensor world position** directly:
      - `tubeWorldX = tubeSensor.transform.x` (already used)
      - `tubeWorldY = tubeSensor.transform.y`
    - Derive `tubeHeightWorld`:
      1) `tubeSensor.collider?.height`
      2) else `tubeSensor.visual?.height`
      3) else fallback to executor `TUBE_HEIGHT`
    - Compute pickup world Y:
      - `pickupWorldY = tubeWorldY - (tubeHeightWorld / 2 + LIFT_HEIGHT)`
    - Set held ball position to `(tubeWorldX, pickupWorldY)`.
  - Ensure the held ball’s tags/state variables remain as-is.
  - Optional sanity: if computed height is missing/0, log or use fallback.

  **Must NOT do**:
  - Do not use executor `cy()` conversion for pickup placement.
  - Do not assume Ball Sort’s `WORLD_HEIGHT`/`TUBE_Y` inside the executor.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: small, localized logic change.
  - **Skills**: `slopcade-game-engine`
    - `slopcade-game-engine`: understands engine coordinate conventions and transform usage.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 2

  **References**:
  - Pattern/bug location:
    - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:37-98` — current pickup logic; currently computes `pickupY` using hardcoded `TUBE_Y/TUBE_HEIGHT` and `cy()`.
  - Runtime tube sensor shape source:
    - `app/lib/test-games/games/ballSort/game.ts:172-186` — tube sensor entity `tube-{i}-sensor` has world transform `y: cy(TUBE_Y)`.
    - `app/lib/test-games/games/ballSort/game.ts:353-373` — `tubeSensor` template defines `collider.height = TUBE_HEIGHT`.
  - State machine expectations:
    - `app/lib/test-games/games/ballSort/game.ts:282-307` — `ball_picked` transitions to `holding`; `ball_dropped` transitions back to `idle`.

  **Acceptance Criteria**:
  - [ ] Picking up from any tube positions held ball at same X as tube sensor.
  - [ ] Held ball Y is **above** tube top by ~`LIFT_HEIGHT` in world units.
  - [ ] No regressions to tags/variables:
    - `heldBallId`, `sourceTubeIndex`, `heldBallColor` set on pickup.

  **Manual Execution Verification**:
  - [ ] Use game-inspector (web) to pick up from tube 2 and capture screenshot of ball floating above tube 2.
  - [ ] Capture evidence screenshot to `.sisyphus/evidence/ball-sort-1-pickup.png`.

  **Commit**: NO (unless user requests)

- [ ] 2. Verify drop behavior + invalid-move feedback (BUG #2 scenario)

  **What to do**:
  - Validate that the “tap tube while holding” rule triggers and routes into `executeDrop()`.
  - Test both:
    - **Valid drop**: drop into an empty tube (or same top color) → ball moves into correct slot and holding state clears.
    - **Invalid drop**: drop into a different-color tube → ball remains held and invalid feedback triggers.
  - If invalid feedback is not obvious, identify why:
    - Is `invalid` tag being applied and removed? (300ms window)
    - Are the ball’s conditional behaviors for `invalid` visible enough?

  **Must NOT do**:
  - Do not change game rules to allow invalid color stacking.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `game-inspector`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1)
  - **Blocked By**: Task 1

  **References**:
  - Drop action logic and invalid feedback:
    - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:100-182` — drop logic; rejects on full tube or color mismatch.
    - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:269-274` — `showInvalidFeedback()` uses `invalid` tag for 300ms.
  - Rule wiring:
    - `app/lib/test-games/games/ballSort/game.ts:410-423` — `tap_tube_holding` triggers `ball_sort_drop` only while `gameFlow=holding`.
  - Visual feedback definition:
    - `app/lib/test-games/games/ballSort/game.ts:61-79` (ball template behaviors) — `invalid` tag triggers flash effect.

  **Acceptance Criteria**:
  - [ ] After pickup, tapping a **valid** target tube results in:
    - ball moved to target tube slot
    - `heldBallId` cleared
    - event `ball_dropped` fired (state returns to `idle`)
  - [ ] After pickup, tapping a **different-color** tube results in:
    - ball remains held
    - invalid feedback is visible (flash/shake/glow)
    - state remains `holding`

  **Manual Execution Verification**:
  - [ ] In Ball Sort:
    1) Pick up from tube 2 → screenshot (already from Task 1).
    2) Tap tube 3 (different color) → verify invalid feedback and capture `.sisyphus/evidence/ball-sort-2-invalid-drop.png`.
    3) Tap an empty tube (or same top color) → verify drop works and capture `.sisyphus/evidence/ball-sort-2-valid-drop.png`.

  **Commit**: NO

- [ ] 3. (Conditional) Improve invalid-move feedback clarity if still confusing

  **When to do this**:
  - Only if Task 2 confirms invalid feedback is too subtle (user perception: “click doesn’t work”).

  **What to do (scoped options)**:
  - Option A (minimal): increase feedback duration or intensity (e.g., keep `invalid` tag slightly longer).
  - Option B (clarity): add a brief UI indicator or highlight on the tapped tube to signal rejection.
  - Keep changes minimal and localized.

  **Must NOT do**:
  - Do not introduce new assets or large UI rework.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `slopcade-game-engine`, `frontend-ui-ux` (only if UI indicator is needed)

  **References**:
  - `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts:269-274` — current invalid tag timing.
  - `app/lib/test-games/games/ballSort/game.ts:70-77` — invalid behavior visual params.

  **Acceptance Criteria**:
  - [ ] After invalid drop attempt, the user can clearly perceive rejection within 200ms.
  - [ ] Evidence screenshot: `.sisyphus/evidence/ball-sort-3-feedback.png`.

  **Commit**: NO

---

## Commit Strategy

No commits in this plan unless explicitly requested by the user.

---

## Success Criteria

### Final Checklist
- [ ] Held ball pickup position is tube-aligned and above tube top.
- [ ] Valid drop works consistently.
- [ ] Invalid drop clearly signals rejection.
- [ ] Win condition still functions after several moves (spot-check).
