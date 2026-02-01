
- Added `test` script to `app/package.json` with `vitest run`.
- Created `app/vitest.config.mjs` to configure Vitest for the `app` package.
- Installed `vite-tsconfig-paths` and `jsdom` as dev dependencies in the `app` package.
- Added `test` task to `turbo.json` to include the `app` package in `turbo run test`.
- Renamed `app/vitest.config.ts` to `app/vitest.config.mjs` to resolve ESM/CJS issues.
- Removed `import '@testing-library/react-native/extend-expect';` from `app/vitest.setup.ts` as it was causing resolution issues.

## Task 1: Runner Harness

- Created `app/lib/game-engine/systems/runner/__tests__/helpers/runnerHarness.ts`
- Key pattern: Use an injector system registered at highest priority in PRE_UPDATE to inject test events into the runner's frame buffers
- The runner owns and resets frame buffers at the start of each update(), so injection must happen AFTER reset but BEFORE other systems run
- `createFakeSystemContext()` provides minimal stubs for all SystemContext services
- `createStubSystem()` creates minimal RuntimeSystem implementations for testing
- `createRunnerHarness()` provides:
  - `runFrame()` for deterministic frame execution with custom dt/frameId
  - `injectInputEvents()` and `injectCollisions()` for test data injection
  - `lastUpdateContext` for inspecting what systems received
  - Automatic elapsed time tracking across frames
- BodyId is a branded type - use `createBodyId(0)` not `0 as BodyId`

## Task 5: RulesRuntimeSystem inputEvents wiring

- The `RulesRuntimeSystem` already correctly converts `ctx.frame.inputEvents` (InputEvent[]) to `InputEvents` format via `convertFrameInputEvents()` method
- This was implemented in commit 33bda990 as part of the system runner integration
- Created comprehensive regression test suite at `app/lib/game-engine/systems/runner/__tests__/RulesRuntimeSystem.inputEvents.test.ts`
- Tests cover: tap, drag_start, drag_end, button_pressed, button_released, game_started events
- Tests also verify multiple button events in same frame and negative case (no tap = no rule fire)
- The runner harness pattern works well for testing system wiring - inject events via `harness.injectInputEvents()`, run frame, verify RulesEvaluator state

## Task 6: RulesRuntimeSystem Collision Wiring (2026-01-31)

### Finding: Fix Already Applied
The `RulesRuntimeSystem.ts` already passes `ctx.frame.collisions` to `RulesEvaluator.update()` (line 97). The fix was applied in commit `33bda990`.

### Test Coverage Added
Created `RulesRuntimeSystem.collisions.test.ts` with 6 tests:
1. `triggers collision rule when collision is injected via harness` - basic collision rule firing
2. `does not trigger collision rule when no collisions are present` - negative case
3. `triggers collision rule with reversed entity order (B-A instead of A-B)` - order independence
4. `fires rule once per frame even with multiple matching collisions` - rule-level vs collision-level
5. `does not trigger rule when collision tags do not match` - tag filtering
6. `triggers multiple different collision rules in same frame` - multiple rules

### Key Pattern: Rule-Level vs Collision-Level
The rules engine fires a rule **once per frame** when its trigger is satisfied, not once per collision. This is by design - the `CollisionTriggerEvaluator` uses `.some()` to check if ANY collision matches.

For per-collision scoring, use:
- Multiple rules with different conditions
- Behaviors with `score_on_collision` type
- Custom scripts

### Test Harness Pattern
The `runnerHarness.ts` provides `injectCollisions()` which pushes collisions into `ctx.frame.collisions` during the PRE_UPDATE phase via an injector system.
