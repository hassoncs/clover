# Game Engine Crisis Recovery Plan (Slopcade)

## TL;DR

> **Quick Summary**: **First stabilize the runner architecture (1–2 days)** by introducing a per-frame buffer contract (`UpdateContext.frame`) owned by the runner (reset every frame), then restore missing data flows (collisions, velocity, input events) and remove frame-spam logging, and only then build a **TDD regression net** around the runner + canary games (**match3**, **slopeggle**, **breakoutScripted**).
>
> **Deliverables**:
> - Passing runner-level tests that prevent the regressions that currently break gameplay (collisions/input/velocity wiring)
> - Canary game verification protocol + deterministic-ish smoke tests (where possible)
> - Reduced debug noise and improved “why is nothing happening?” diagnostics
>
> **Estimated Effort**: **Large (1–2 weeks)**
> **Parallel Execution**: **YES – 3 waves**
> **Critical Path**: Phase 0 (frame buffers + phase contracts) → Runner wiring tests → Fix runner wiring → Canary game smoke tests (match3/slopeggle/breakoutScripted)

---

## Context

### Original Request
Recover a buggy, hard-to-debug Slopcade game engine after a major refactor (Jan 31, 2026). Decide fix vs rebuild; user chose fix-forward with strict TDD and 1–2 week stabilization.

### Constraints (confirmed)
- Timeline: **1–2 weeks**
- Canary games that MUST work: **match3**, **slopeggle**, **breakoutScripted**
- Rollback policy: **NO revert** (fix forward only; keep new system runner architecture)
- Test strategy: **TDD strict**

### Critical Findings (already observed in code)
- `BehaviorExecutorRuntimeSystem` currently hardcodes:
  - `collisions: []` (empty every frame)
  - `vx: 0`, `vy: 0` inside `createEvalContextForEntity`
  - heavy `console.log` spam per frame
- `RulesRuntimeSystem` currently passes:
  - `[]` collisions
  - `{}` inputEvents
  - and comments “wired later” (but we need it now for canary games)
- `GameRuntime.godot.tsx` already collects:
  - collisions into `collisionsRef` via `physics.onCollision(...)`
  - some input events via `bridge.onInputEvent(...)` into `inputRef.current` (not `InputEvents`)

---

## Work Objectives

### Core Objective
Restore correctness and debuggability of the **system runner path** so the canary games behave consistently and regressions are caught by tests.

### Concrete Deliverables
- Runner integration tests covering:
  - Collisions flow (physics → runtime wrappers → rules/behaviors)
  - Velocity exposure in eval contexts
  - Input events flow (bridge/input snapshot → rules triggers)
  - No frame-level console spam in normal mode
- A canary verification suite:
  - Automated tests where feasible, plus a manual checklist for match3/slopeggle/breakoutScripted

### Must NOT Have (guardrails)
- Do **not** revert to the legacy game loop code.
- Do **not** “paper over” with more logging; logging must be gated and testable.
- Do **not** introduce type suppressions (`as any`, `@ts-ignore`, `@ts-expect-error`) as a shortcut.

---

## Verification Strategy (TDD strict)

### Test Decision
- **Infrastructure exists**: YES (Vitest used in repo; runner already has vitest tests)
- **User wants tests**: **TDD**

### Primary verification commands (executor runs these)
> NOTE: The repo uses Turbo (`pnpm test` → `turbo run test`). **`app/` currently has no `test` script**, even though it contains vitest tests under `app/lib/**`. This plan includes a task to make runner tests actually execute in CI.

- `pnpm test` (final gate)
- `pnpm tsc --noEmit` (final gate)

---

## Execution Strategy

### Parallel Execution Waves

Wave 0 (Architecture stabilization)
- Phase 0 tasks (P0-1 to P0-4)

Wave 1 (Stabilization spine – runner wiring tests + fixes)
- Task 0–6

Wave 2 (Canary game integration tests + targeted fixes)
- Task 7–11

Wave 3 (Hardening + debuggability upgrades)
- Task 12–15

Critical Path: P0-1 → P0-2 → P0-3 → P0-4 → Task 0 → Task 1 → Task 2 → Task 3 → Task 7 → Task 11

---

## TODOs

> Each task includes: what to do, references, TDD acceptance criteria, recommended category + skills, and dependencies.

## Phase 0: Architecture Stabilization (BEFORE tests)

> Goal: lock down the “structured the way it should be” runner model so subsequent tests protect the *right* architecture.
> 
> Time box: **1–2 days**.

### P0-1) Introduce `FrameData` on `UpdateContext` (`UpdateContext.frame`)

**Effort**: Short (0.5 day)

**What to do**:
- Extend `UpdateContext` to include a `frame` field that carries per-frame buffers:
  ```ts
  interface UpdateContext {
    // existing fields...
    frame: {
      inputEvents: InputEvent[];    // Produced in PRE_UPDATE
      collisions: CollisionEvent[]; // Produced in PHYSICS
    };
  }
  ```
- Decide/standardize the concrete types:
  - `CollisionEvent`: align with existing `Physics2D` collision callback type used by `physics.onCollision(...)`.
  - `InputEvent`: define a minimal union that covers what rules + scripts need (tap/mouse_move/dragStart/dragEnd/buttonPressed/buttonReleased/gameStarted).

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `slopcade-game-engine`, `systematic-debugging`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 0)
- **Blocked By**: None
- **Blocks**: P0-2 to P0-4

**References**:
- `app/lib/game-engine/systems/runner/types.ts` — current `UpdateContext` (read-only snapshot) definition
- `app/lib/game-engine/BehaviorContext.ts:InputEvents` — rules already expect an “events-like” structure
- `app/lib/game-engine/GameRuntime.godot.tsx` — currently imports `CollisionEvent` from `app/lib/physics2d/types`

**Acceptance Criteria**:
- [x] Type changes compile (`pnpm tsc --noEmit` eventually; at least package-level typecheck during implementation)

---

### P0-2) Make `GameSystemRunner` own/reset per-frame buffers

**Effort**: Medium (0.5–1 day)

**What to do**:
- Add internal frame buffers to `GameSystemRunner` (or a small `FrameBuffer` helper):
  - `inputEvents: []` and `collisions: []`
- At the start of each `runner.update(...)` call:
  - reset/clear these arrays
  - create the per-frame `UpdateContext` object that includes `frame: { inputEvents, collisions }`
- Pass the same `UpdateContext.frame` object to all systems for that frame.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `slopcade-game-engine`, `systematic-debugging`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 0)
- **Blocked By**: P0-1
- **Blocks**: P0-3, P0-4, and all later tasks

**References**:
- `app/lib/game-engine/systems/runner/GameSystemRunner.ts` — where phase loop and update-context fan-out happens

**Acceptance Criteria**:
- [x] Frame buffers are reset once per frame (no cross-frame bleed)
- [x] Systems can (by design) append to buffers in producer phases and read in consumer phases

---

### P0-3) Define explicit phase contracts for frame buffers (producer/consumer matrix)

**Effort**: Short (0.25–0.5 day)

**What to do**:
- Write down the canonical contract and enforce it by convention (and later by tests):
  - **PRE_UPDATE produces**: `frame.inputEvents`
  - **PHYSICS produces**: `frame.collisions`
  - **GAME_LOGIC consumes**: both buffers
  - **POST_PHYSICS/VISUAL/CLEANUP**: should treat buffers as read-only (unless explicitly extended)
- Document this in the runner types module and/or a short docs note referenced by the plan.

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 0)
- **Blocked By**: P0-2
- **Blocks**: P0-4

**References**:
- `app/lib/game-engine/systems/runner/types.ts` header comments already describe phase-based runner principles
- `app/lib/game-engine/GameRuntime.godot.tsx` registration order shows intended PRE_UPDATE systems

**Acceptance Criteria**:
- [x] Phase contract is written and unambiguous

---

### P0-4) Move collision + input-event collection into runner/GameRuntime integration

**Effort**: Medium (0.5–1 day)

**What to do**:
- Move collection out of wrapper systems and into the integration boundary:
  - Input events: capture raw bridge input callbacks (and/or input snapshot transitions) and push normalized events into `UpdateContext.frame.inputEvents` during PRE_UPDATE.
  - Collisions: capture physics collision callbacks and push normalized collisions into `UpdateContext.frame.collisions` during PHYSICS.
- Ensure buffers are cleared by runner at the start of each frame (P0-2), so integration only appends.
- Update consumers:
  - `RulesRuntimeSystem` should read from `ctx.frame.inputEvents` / `ctx.frame.collisions` (or a derived `InputEvents` object) rather than `{}` / `[]`.
  - `BehaviorExecutorRuntimeSystem` should read collisions from `ctx.frame.collisions` (or derived list) rather than creating its own `[]`.
  - Script collision/input delivery should be driven by the same frame buffers (or explicitly justified if separate).

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `systematic-debugging`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 0)
- **Blocked By**: P0-2, P0-3
- **Blocks**: Task 0 and all TDD work

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx`:
  - input collection: `bridge.onInputEvent(...)` currently mutates `inputRef.current.tap/mouse`
  - collision collection: `physics.onCollision(...)` currently appends to `collisionsRef.current`
  - script feeding: code that calls `scriptSystem.runInput(...)` and `scriptSystem.runCollision(...)`
- `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts` — currently passes empty inputEvents/collisions
- `app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts` — currently constructs collisions: `[]`

**Acceptance Criteria**:
- [x] A single, explicit collection path exists for input events and collisions
- [x] No cross-frame leak (runner reset)
- [x] Consumers read from the shared buffers

---

### 0) Ensure game-engine runner tests actually run in CI (app vitest wiring)

**Effort**: Short (0.5 day)

**What to do (TDD-ish)**:
- Add a `test` script to `app/package.json` so `turbo run test` includes the app package.
- Add/adjust `app/vitest.config.ts` so it includes the existing tests (e.g., `app/lib/**/*.test.ts`).
- Run `pnpm test` and confirm app runner tests are executed.

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `systematic-debugging`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 1)
- **Blocked By**: P0-4
- **Blocks**: All other test-driven tasks (must be confident tests are running)

**References**:
- `package.json` (root): `test` is `turbo run test`
- `turbo.json`: tasks config (no explicit `test` task; Turbo uses package scripts)
- `app/package.json`: currently lacks `test`
- Existing runner tests live under: `app/lib/game-engine/systems/runner/__tests__/*.test.ts`

**Acceptance Criteria**:
- [x] `pnpm test` output shows `slopcade` (app) test task running
- [x] A known runner test (e.g. `GameSystemRunner.test.ts`) executes and passes

---

### 1) Establish a “Runner Wiring Contract” test harness

**Effort**: Short (0.5–1 day)

**What to do (TDD)**:
- Add a dedicated vitest helper (“runner harness”) that can:
  - create a `GameSystemRunner`
  - inject a fake `SystemContext` (bridge/physics/entityManager/eventBus/eventQueue)
  - run one frame `runner.update(updateCtx)` deterministically
- Ensure harness can swap in stub systems / wrappers and inspect what they pass downstream.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `test-driven-development`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 1)
- **Blocked By**: P0-4, Task 0
- **Blocks**: Task 2–6

**References**:
- `app/lib/game-engine/systems/runner/GameSystemRunner.ts` — runner lifecycle + phase order
- `app/lib/game-engine/systems/runner/__tests__/GameSystemRunner.test.ts` — existing runner test patterns
- `app/lib/game-engine/systems/runner/types.ts` — SystemContext / UpdateContext contracts

**Acceptance Criteria (TDD)**:
- [x] New harness tests initially FAIL until harness exists
- [x] Harness can run one frame and assert call ordering / parameters
- [x] `pnpm test` → PASS

---

### 2) TDD: collisions must reach BehaviorContext (BehaviorExecutorRuntimeSystem)

**Effort**: Short (0.5–1 day)

**What to do (TDD)**:
- Write a failing test that proves `BehaviorExecutorRuntimeSystem` does **not** pass `collisions: []` when collisions exist.
- Define the intended wiring:
  - collisions originate from runtime-level “collision buffer” owned by the runner integration layer (likely GameRuntime)
  - wrappers read from injected dependency or from SystemContext (choose one and standardize)
- Implement the wiring so `createBehaviorContext()` uses real collisions.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `test-driven-development`, `systematic-debugging`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 1)
- **Blocked By**: P0-4, Tasks 0, 1
- **Blocks**: Task 7 (canary verification)

**References**:
- `app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts` — current hardcoded collisions
- `app/lib/game-engine/BehaviorContext.ts:CollisionInfo` — collision shape expected by behaviors/rules
- `app/lib/game-engine/GameRuntime.godot.tsx` (collisions collection)
  - collision push site: around `collisionsRef.current.push({...})`

**Acceptance Criteria (TDD)**:
- [x] New test fails against current code (collisions empty)
- [x] Fix makes test pass
- [x] `pnpm test` → PASS

---

### 3) TDD: velocity must be exposed in EvalContext entity (vx/vy)

**Effort**: Short (0.5 day)

**What to do (TDD)**:
- Write failing tests that `createEvalContextForEntity(entity)` reflects physics velocity (non-zero) when physics reports it.
- Implement: read from `SystemContext.physics.getLinearVelocity(bodyId)` when `entity.bodyId` exists.
- Decide fallback (bodyId missing): keep `0,0`.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `test-driven-development`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 1)
- **Blocked By**: P0-4, Tasks 0, 1
- **Blocks**: Task 7–11 (canary games depend on correct velocities)

**References**:
- `app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts:147-159` — current vx/vy hardcoded 0
- `app/lib/game-engine/systems/runner/__tests__/BehaviorExecutorRuntimeSystem.test.ts` — mockPhysics already defines `getLinearVelocity`
- `app/lib/godot/GodotPhysicsAdapter.ts` — collision + velocity property sync patterns (helps align expectations)

**Acceptance Criteria (TDD)**:
- [x] Test proves vx/vy are 0 under current implementation
- [x] Fix makes vx/vy match mocked physics velocity
- [x] `pnpm test` → PASS

---

### 4) Remove per-frame console spam; replace with gated debug

**Effort**: Short (0.5 day)

**What to do (TDD)**:
- Add tests that assert no `console.log` is called during a standard update.
- Introduce a debug flag (config-based) or a logger abstraction so logs are opt-in.

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `test-driven-development`, `systematic-debugging`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 1)
- **Blocked By**: P0-4, Tasks 0, 1
- **Blocks**: Task 12 (debuggability hardening builds on this)

**References**:
- `app/lib/game-engine/systems/runner/wrappers/BehaviorExecutorRuntimeSystem.ts` — multiple `console.log`
- `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` — lots of logging too (likely needs same treatment)

**Acceptance Criteria (TDD)**:
- [x] Tests fail when logs occur
- [x] Logs are gated; default path has no spam
- [x] `pnpm test` → PASS

---

### 5) Wire InputEvents into RulesRuntimeSystem (stop passing `{}`)

**Effort**: Medium (1–2 days)

**What to do (TDD)**:
- Identify minimal `InputEvents` needed by canary games (tap, dragStart/dragEnd, gameStarted, buttonPressed/released).
- Add failing tests for `InputTriggerEvaluator` behavior when InputEvents are present.
- Implement a consistent InputEvents production path:
  - Build `InputEvents` per-frame in the runner integration layer (likely GameRuntime), then pass it to RulesRuntimeSystem.
  - Ensure events are edge-triggered (pressed/released) and reset each frame.
- Update RulesRuntimeSystem to accept InputEvents via setter or via SystemContext.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `test-driven-development`, `systematic-debugging`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 1)
- **Blocked By**: P0-4, Tasks 0, 1
- **Blocks**: Task 7–11

**References**:
- `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts:93-105` — currently passes empty collisions/inputEvents
- `app/lib/game-engine/rules/triggers/InputTriggerEvaluator.ts` — consumes `context.inputEvents`
- `app/lib/game-engine/BehaviorContext.ts:InputEvents` — contract
- `app/lib/game-engine/GameRuntime.godot.tsx` — current input event collection via `bridge.onInputEvent` and `inputRef`

**Acceptance Criteria (TDD)**:
- [x] New tests demonstrate rules triggers fail without InputEvents and succeed with them
- [x] RulesRuntimeSystem passes real InputEvents into `RulesEvaluator.update`
- [x] `pnpm test` → PASS

---

### 6) Wire collisions into RulesRuntimeSystem (stop passing `[]`)

**Effort**: Medium (1 day)

**What to do (TDD)**:
- Write a failing test that a collision-based rule/action is not triggered when collisions are present but RulesRuntimeSystem passes `[]`.
- Implement collision wiring (shared collision buffer with Task 2).

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `test-driven-development`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 1)
- **Blocked By**: P0-4, Tasks 0, 1
- **Blocks**: Task 7–11

**References**:
- `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts` — currently passes `[]`
- `app/lib/game-engine/RulesEvaluator.ts` — collision-driven evaluation path
- `app/lib/game-engine/__tests__/RulesEvaluator.test.ts` — patterns for collisions and inputEvents

**Acceptance Criteria (TDD)**:
- [x] Failing test created
- [x] Fix makes collision-based rule fire
- [x] `pnpm test` → PASS

---

### 7) Canary smoke test: breakoutScripted runner path

**Effort**: Medium (1–2 days)

**What to do (TDD-ish + integration)**:
- Add an automated “smoke test” that loads breakoutScripted definition and runs N frames in a deterministic harness.
- Assert key invariants rather than pixels:
  - ball exists, paddle exists
  - after a tap/input event, the script receives input and launches ball
  - collisions are observed and onCollision hook is called at least once in a controlled scenario

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `test-driven-development`, `systematic-debugging`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 2)
- **Blocked By**: Tasks 2, 3, 5, 6
- **Blocks**: Task 11

**References**:
- `app/lib/test-games/games/breakoutScripted/game.ts` — script behaviors and expectations
- `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts` — hook invocation
- `app/lib/game-engine/GameRuntime.godot.tsx` — how script collisions are currently routed

**Acceptance Criteria**:
- [x] Test fails before runner wiring fixes
- [x] Test passes after wiring fixes
- [x] `pnpm test` → PASS

---

### 8) Canary smoke test: match3 runner path

**Effort**: Medium (1–2 days)

**What to do (TDD-ish + integration)**:
- Add a smoke test for match3 that runs the system for N frames and asserts:
  - board initializes
  - at least one legal move triggers expected state change
  - no uncaught exceptions in update loop

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `test-driven-development`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 2)
- **Blocked By**: Task 1
- **Blocks**: Task 11

**References**:
- `app/lib/game-engine/systems/runner/wrappers/Match3RuntimeSystem.ts`
- `app/lib/game-engine/systems/Match3GameSystem.ts` (or corresponding system)

**Acceptance Criteria**:
- [x] Smoke test proves match3 runs without runner regressions
- [x] `pnpm test` → PASS

---

### 9) Canary smoke test: slopeggle runner path

**Effort**: Medium (1–2 days)

**What to do (TDD-ish + integration)**:
- Add a smoke test for slopeggle that asserts:
  - pegs/ball spawn
  - a tap/launch input results in ball motion
  - at least one collision is observed and score/lives update pathways do not explode

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `test-driven-development`, `systematic-debugging`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 2)
- **Blocked By**: Tasks 2, 3, 5, 6
- **Blocks**: Task 11

**References**:
- Slopeggle game definition location (determine exact path during implementation; search in `app/lib/test-games/`)
- `app/lib/game-engine/GameRuntime.godot.tsx` collision + input wiring

**Acceptance Criteria**:
- [x] Smoke test fails before wiring fixes and passes after
- [x] `pnpm test` → PASS

---

### 10) Reduce double-handling of input for scripts vs rules

**Effort**: Medium (1 day)

**What to do (TDD)**:
- Currently, scripts receive input via a separate path (`scriptSystem.runInput` fed by `inputRef.current.tap`).
- Define and test a single source of truth:
  - Either scripts consume from the same InputEvents buffer as rules,
  - or keep separate, but prove no duplicates / ordering issues.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `test-driven-development`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 2)
- **Blocked By**: Task 5
- **Blocks**: Task 11

**References**:
- `app/lib/game-engine/GameRuntime.godot.tsx:1040-1069` — script input + collision feeding
- `app/lib/game-engine/systems/runner/wrappers/RulesRuntimeSystem.ts` — rules inputEvents
- `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:123-133` — script input handling

**Acceptance Criteria (TDD)**:
- [x] Test proves exactly-once delivery semantics for a tap
- [x] `pnpm test` → PASS

---

### 11) “Canary gate” CI-style checklist and local debug recipe

**Effort**: Short (0.5 day)

**What to do**:
- Add a markdown checklist for humans + a recommended command sequence.
- Include expected outcomes for match3/slopeggle/breakoutScripted.

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 2)
- **Blocked By**: Task 7–10 completion (so checklist reflects reality)
- **Blocks**: Phase completion

**References**:
- `app/AGENTS.md` — dev commands and DevMux workflow

**Acceptance Criteria**:
- [x] Doc exists and is accurate
- [x] A developer can follow it to verify canaries

---

### 12) Add structured “frame diagnostics” without log spam

**Effort**: Medium (1–2 days)

**What to do (TDD)**:
- Introduce a diagnostics channel that records last-frame summary (counts, key flags) into a state object instead of console.
- Expose via DevTools overlay or debug bridge, not per-frame logs.

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: `test-driven-development`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 3)
- **Blocked By**: Task 4

**References**:
- `app/lib/game-engine/systems/runner/types.ts` — stateless-between-frames principle
- `app/lib/game-engine/debug/*` (SlopcadeDebugBridge usage)

**Acceptance Criteria**:
- [x] Diagnostics accessible without console spam
- [x] `pnpm test` → PASS

---

### 13) Runner regression suite for “Phase order invariants”

**Effort**: Short (0.5–1 day)

**What to do (TDD)**:
- Add tests asserting critical ordering in PRE_UPDATE:
  - `ViewportRuntimeSystem` before `PropertySyncRuntimeSystem` before `ComputedValuesRuntimeSystem` before `EntityManagerRuntimeSystem` (or validate the current intended order)
- Ensure phase/priority changes cannot silently break invariants.

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: `test-driven-development`, `slopcade-game-engine`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 3)
- **Blocked By**: Task 1

**References**:
- `app/lib/game-engine/systems/runner/wrappers/*.ts` — phase + priority definitions
- `app/lib/game-engine/GameRuntime.godot.tsx:789-900` — registration order

**Acceptance Criteria (TDD)**:
- [x] Tests fail if ordering breaks
- [x] `pnpm test` → PASS

---

### 14) Tighten typings around UpdateContext.input to reduce `as any`

**Effort**: Medium (1–2 days)

**What to do (TDD + typing)**:
- Remove or reduce `as any` casts in runtime systems where feasible.
- Add compile-time checks by ensuring UpdateContext.input is the right shape (InputState) and input events are explicit.

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
- **Skills**: `slopcade-game-engine`, `systematic-debugging`

**Parallelization**:
- **Can Run In Parallel**: YES (Wave 3)
- **Blocked By**: Task 5 (input model clarified)

**References**:
- `app/lib/game-engine/systems/runner/types.ts` — UpdateContext typing
- `app/lib/game-engine/BehaviorContext.ts` — InputState/InputEvents definitions

**Acceptance Criteria**:
- [x] `pnpm tsc --noEmit` → PASS
- [x] No new type suppressions

---

### 15) Commit strategy (atomic, conventional)

**Effort**: Ongoing

**What to do**:
- Commit each “regression net + fix” pair as a unit:
  - `test(game-engine): ...` (failing test / harness)
  - `fix(game-engine): ...` (make test pass)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: `git-master`

**Parallelization**:
- **Can Run In Parallel**: NO (sequential with development)

**Acceptance Criteria**:
- [x] Conventional commits
- [x] Each fix is protected by a test

---

## Success Criteria (Definition of Done)

### Automated
- [x] New runner-wiring regression tests exist for:
  - collisions → behavior context
  - collisions → rules evaluator
  - inputEvents → rules evaluator
  - velocity in eval entity context
  - no default per-frame console spam
- [x] Canary smoke tests pass for: **match3**, **slopeggle**, **breakoutScripted**
- [x] `pnpm test` → PASS
- [x] `pnpm tsc --noEmit` → PASS

### Manual (canary gate)
- [x] match3: loads, board interacts, no runtime errors
- [x] slopeggle: ball launches, collisions register, scoring/lives don’t desync
- [x] breakoutScripted: input triggers launch; collisions call script hook; no obvious “dead” behaviors
