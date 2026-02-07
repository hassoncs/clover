# Ball Sort + Tween Debug Handoff

Date: 2026-02-06

## Current user-visible issue

- Ball Sort now allows picking up a ball, but legal drops are still inconsistent/failing.
- In debug logs, we are seeing duplicate tap processing in a single frame, e.g.:
  - `convertFrameInputEvents called with 2 events: ['tap', 'tap']`
  - `Rule "tap_tube_holding" FIRED, executing 1 actions: ['ball_sort_drop']`

## Key observed runtime behavior

- During a single user tap, rules can process both pickup and drop paths in the same frame when two tap events exist in frame input.
- We also saw state churn consistent with immediate pickup->drop/cancel interactions:
  - `heldBallId`, `sourceTubeIndex`, `heldBallColor` get set, then cleared almost immediately.
- The noisy lifecycle log (`Evaluating rule "generate_level" ...`) was a debug-placement issue, not definitive proof that `game_loaded` kept firing.

## Changes made so far

### 1) Removed confusing lifecycle debug spam

- File: `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts`
- Change: removed per-frame debug line that logged lifecycle rule evaluation attempts (`game_loaded` / `game_started`) before trigger result.

### 2) Ball Sort level generation guard

- File: `r2/games/ballSort/src/game.ts`
- `generate_level` rule now includes condition:
  - `entityCount('tube') == 0`
- Intent: prevent accidental re-generation when tubes already exist.

### 3) Ball Sort action executor hardening

- File: `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
- Added fallbacks to derive counts from entities when variables are stale/zero:
  - pickup count fallback (`tubeN_count` -> `getBallsInTube().length`)
  - drop target count fallback
  - win-check active tube count fallback (`activeTubeCount` -> tube entity count)
  - cancelPickup count fallback
- Extended tube target resolution from tap input:
  - direct `tube-N` id
  - ball tag `in-container-tube-N`
  - world-position nearest-tube fallback
- Added short guard against immediate same-frame drop after pickup:
  - writes `_lastPickupElapsed` on pickup
  - drop early-return if elapsed delta `< 0.05`

## Mr. Potato Head / Tween test game changes

### Mr. Potato Head

- File: `r2/games/mrPotatoHead/src/game.ts`
- Reset script changed from animating to random positions (and awaiting last only) to:
  - animate all pieces back to `INITIAL_POSITIONS`
  - `await Promise.all(animations)`
- Removed temporary script debug logs.

### Tween Toggle Cube test game

- Added new game: `r2/games/tweenToggleCube/src/game.ts`
- Uses `run_script` + `startSequence` + `world.animate` toggle behavior.
- Debug logs removed after validation pass.

## What is likely still wrong in Ball Sort

- The core unresolved problem appears to be duplicated tap events per frame, causing rule ordering/race behavior:
  1. tap idle rule picks up
  2. same frame (second tap event) holding rule also runs and attempts drop
- The `_lastPickupElapsed` guard reduced immediate drop, but user still reports legal drop failures.
- Most likely next target is input event dedup or per-frame tap consumption semantics in rules/input conversion pipeline.

## Relevant files for fresh debugging

- `app/lib/game-engine/rules/actions/BallSortActionExecutor.ts`
- `r2/games/ballSort/src/game.ts`
- `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts`
- `app/lib/game-engine/GameRuntime.godot.tsx`

## Verification already run

- `pnpm --filter @slopcade/api build:games -- --skip-seed`
- `pnpm tsc --noEmit`
- `lsp_diagnostics` clean on edited files during prior passes.

## Suggested immediate next debugging step (fresh context)

1. Instrument and confirm source of duplicate taps (`convertFrameInputEvents` receives 2 taps) for one physical click.
2. Enforce single tap consumption for Ball Sort tap rules per frame (or per input id) before action execution.
3. Re-verify pickup -> legal drop in normal play and inspector.

## 2026-02-06 follow-up (current pass)

### Root cause confirmed

- Duplicate tap events were being produced in the touch path inside `GameRuntime.godot.tsx`:
  - `handleTouchEnd` enqueued a `tap` directly into `eventQueueRef`
  - then immediately called `bridge.sendInput("tap", ...)`
  - `bridge.onInputEvent("tap", ...)` also enqueued a `tap`
- This matched the observed runtime symptom: `convertFrameInputEvents called with 2 events: ['tap', 'tap']` and same-frame pickup/drop churn.

### Fix applied

- File: `app/lib/game-engine/GameRuntime.godot.tsx`
- In `handleTouchEnd`, removed the direct `eventQueueRef.current.push({ type: 'tap', ... })` enqueue.
- Touch taps now have a single source of truth via `bridge.sendInput("tap", ...)` -> `bridge.onInputEvent("tap", ...)` enqueue.

### Verification evidence

- `lsp_diagnostics` on `app/lib/game-engine/GameRuntime.godot.tsx` is clean.
- `pnpm tsc --noEmit` completed successfully.
- Game inspector run after fix:
  - No matches for `convertFrameInputEvents called with 2 events`.
  - Saw single-event processing: `convertFrameInputEvents called with 1 events: [tap]`.

### Notes

- Inspector-driven input still has some coordinate/targeting quirks for deterministic drop scripting, but the duplicate-touch-event producer in the runtime was removed.
