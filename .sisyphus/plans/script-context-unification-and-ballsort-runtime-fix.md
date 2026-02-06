# Script Context Unification and BallSort Runtime Fix

## TL;DR

> **Quick Summary**: Unify scripting runtime around one canonical `ScriptContext` contract that exposes a synchronous script-facing facade and a single asynchronous `world` operations layer, then verify BallSort dynamic spawn/start behavior via TDD and runtime QA.
>
> **Deliverables**:
> - Canonical script context contract aligned across shared + app runtime types
> - Sync facade methods available in both context builders (`ScriptSandboxRuntimeSystem` and `RunScriptActionExecutor`)
> - Minimal TDD coverage proving `ctx.spawnEntity` + `ctx.setVariable` work in start flow
> - Runtime verification in BallSort: no script errors, balls render/spawn correctly
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 4 -> Task 5

---

## Context

### Original Request
User reported BallSort runtime failures when dynamic scripts execute:
- `ctx.spawnEntity is not a function`
- `ctx.setVariable is not a function`

User requested a clean forward architecture:
- One synchronous script-facing interface
- One asynchronous world-ops interface
- No deprecation limbo; clean migration path
- TDD with minimal meaningful tests

### Interview Summary
**Key Discussions**:
- Scripts in `r2/games/*` expect flat sync methods (e.g., `spawnEntity`, `setVariable`).
- Runtime context builders currently emphasize `ctx.world` and miss required flat sync methods in at least one execution path.
- Hooks remain synchronous by design.

**Research Findings**:
- `r2/games/ballSort/src/script.ts:24` calls `ctx.spawnEntity(...)`.
- `r2/games/ballSort/src/script.ts:35` and `r2/games/ballSort/src/script.ts:41` call `ctx.setVariable(...)`.
- `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts:58` builds runtime context for `run_script` actions and currently does not provide flat sync write facade on returned context.
- `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:232` builds runtime context for lifecycle hooks and should expose the same facade.
- `app/lib/game-engine/WorldOpsImpl.ts:69` and `app/lib/game-engine/WorldOpsImpl.ts:70` show variable writes are synchronous-under-the-hood with async signature.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Deterministic sync wrapper semantics for spawn IDs.
- Backward compatibility guardrail for existing `ctx.world.*` usage.
- Explicitly bounded scope (no sandbox engine migration).
- Need for focused acceptance criteria tied to BallSort failure mode.

---

## Work Objectives

### Core Objective
Establish one canonical script runtime model with:
1) a synchronous author-facing facade on `ScriptContext`, and
2) the existing asynchronous `world` operations layer,
then prove BallSort dynamic level generation works without runtime script API errors.

### Concrete Deliverables
- Unified `ScriptContext` contract in shared/app type definitions.
- Runtime context builders exposing identical sync facade methods.
- One focused regression test for start-time dynamic spawn + variable writes.
- Verified BallSort runtime with spawned balls and zero script API errors.

### Definition of Done
- [ ] BallSort startup no longer throws missing method errors for `spawnEntity` / `setVariable`.
- [ ] At least one new automated test fails before change and passes after change.
- [ ] Typecheck and targeted tests pass.
- [ ] Game inspector evidence confirms ball entities are present after initial level generation.

### Must Have
- Hook execution remains synchronous (no async hook return allowed).
- `ctx.world.*` remains available and functional.
- Flat sync facade methods are available where scripts execute today.

### Must NOT Have (Guardrails)
- No QuickJS migration work.
- No Godot bridge redesign.
- No unrelated gameplay logic changes.
- No acceptance criteria requiring manual human actions.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is agent-executed (test runner + game inspector). No manual clicks required.

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **Automated tests**: TDD (RED -> GREEN)
- **Framework**: Vitest via `pnpm test`

### TDD Protocol
For the new regression test:
1. **RED**: Add test that executes script path expecting `ctx.spawnEntity` + `ctx.setVariable` to be callable.
2. **GREEN**: Implement sync facade methods in both context builders.
3. **REFACTOR**: Align type contracts and remove interface drift.

### Agent-Executed QA Scenarios (MANDATORY)

Scenario: BallSort loads level and spawns balls without script API errors
  Tool: game-inspector + console logs
  Preconditions: Dev runtime available; BallSort test game route is openable
  Steps:
    1. Open BallSort via game inspector `open` tool.
    2. Retrieve console logs filtered by `ScriptSandboxRuntimeSystem` and `RunScriptActionExecutor`.
    3. Assert absence of messages containing `ctx.spawnEntity is not a function` and `ctx.setVariable is not a function`.
    4. Query entities by ball-identifying tag/template (e.g., tag `ball` or templates `ball0..ballN`).
    5. Assert entity count > 0 after startup.
    6. Capture screenshot to `.sisyphus/evidence/task-5-ballsort-loaded.png`.
  Expected Result: No missing-method runtime errors and visible spawned balls.
  Failure Indicators: Any missing-method error; zero spawned ball entities.
  Evidence: `.sisyphus/evidence/task-5-ballsort-loaded.png`, captured logs.

Scenario: run_script action path supports sync facade
  Tool: test runner
  Preconditions: New regression test present for run-script execution path
  Steps:
    1. Run targeted test command for script action executor tests.
    2. Assert new test passes and proves facade methods callable in script.
  Expected Result: Regression test passes.
  Failure Indicators: TypeError for missing `spawnEntity`/`setVariable` in test output.
  Evidence: Terminal test output.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: RED test for missing sync facade behavior
- Task 2: Canonical contract alignment design (types)

Wave 2 (After Wave 1):
- Task 3: Implement sync facade in `RunScriptActionExecutor` context builder
- Task 4: Implement sync facade in `ScriptSandboxRuntimeSystem` context builder
- Task 5: Runtime verification with game inspector + logs

Critical Path: Task 1 -> Task 3 -> Task 5
Parallel Speedup: ~30-40% vs strict sequential.

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3, 4 | 2 |
| 2 | None | 3, 4 | 1 |
| 3 | 1,2 | 5 | 4 |
| 4 | 1,2 | 5 | 3 |
| 5 | 3,4 | None | None |

---

## TODOs

- [ ] 1. RED: Add focused regression test for start-script dynamic spawn/write

  **What to do**:
  - Add one minimal failing test covering script execution path that calls `ctx.spawnEntity(...)` and `ctx.setVariable(...)`.
  - Ensure test currently fails with missing-method behavior before implementation.

  **Must NOT do**:
  - Do not add broad test suite expansion.
  - Do not test unrelated gameplay mechanics.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused single-area test addition.
  - **Skills**: `test-driven-development`
    - `test-driven-development`: Enforces RED->GREEN discipline.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: None

  **References**:
  - `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts:58` - context construction under `run_script`.
  - `r2/games/ballSort/src/script.ts:24` - script expects `spawnEntity`.
  - `r2/games/ballSort/src/script.ts:35` - script expects `setVariable`.

  **Acceptance Criteria**:
  - [ ] New regression test exists and fails before fix.
  - [ ] Failure output explicitly indicates missing method behavior.

- [ ] 2. Define canonical contract: sync facade + async world ops

  **What to do**:
  - Align shared and app script context types to one canonical contract.
  - Explicitly include sync facade methods on script context and keep `world` async operations.
  - Ensure type names/imports no longer drift between runtime and authoring usage.

  **Must NOT do**:
  - No temporary deprecation-only bridge layers.
  - No incompatible API rename without complete migration in same plan.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-package contract coherence.
  - **Skills**: `writing-plans`
    - `writing-plans`: Keeps contract and boundaries explicit.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: None

  **References**:
  - `app/lib/scripting/types.ts:30` - current canonical runtime script context.
  - `shared/src/scripting/script-authoring-types.ts:52` - author-facing context currently used by games.
  - `shared/src/types/world-ops.ts` - async capability layer contract.

  **Acceptance Criteria**:
  - [ ] Canonical contract clearly defines sync facade methods and async `world`.
  - [ ] No conflicting duplicate method signatures across shared/app contracts.

- [ ] 3. Implement sync facade in `RunScriptActionExecutor` context builder

  **What to do**:
  - Add sync methods used by scripts: at minimum `spawnEntity`, `setVariable`, `destroyEntity`, `addTag`, `removeTag`, `getEntityPosition`, `setEntityPosition`, `getEntityVelocity`, `setEntityVelocity`, `applyImpulse`, `getEntityTags`, `emit`, `win`, `lose`.
  - Ensure `spawnEntity` returns ID immediately and integrates with deferred spawn flow.
  - Ensure `setVariable` writes are immediately visible in same-frame script reads.

  **Must NOT do**:
  - No non-deterministic ID generation strategy changes beyond current deterministic needs.
  - No behavior changes to unrelated action executors.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core runtime behavior change.
  - **Skills**: `systematic-debugging`, `test-driven-development`
    - `systematic-debugging`: Prevents hidden runtime regressions.
    - `test-driven-development`: Drive implementation by failing test.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts:146` - minimal world ops wrapper.
  - `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts:248` - existing variable mutation path.
  - `r2/games/ballSort/src/script.ts:24` - spawn usage contract.

  **Acceptance Criteria**:
  - [ ] Regression test from Task 1 passes for run-script action path.
  - [ ] No runtime TypeError for missing sync methods in this path.

- [ ] 4. Implement identical sync facade in `ScriptSandboxRuntimeSystem` context builder

  **What to do**:
  - Mirror sync facade method availability in lifecycle hook context (`onStart`, `onUpdate`, `onInput`, `onCollision`).
  - Keep semantics consistent with Task 3 to avoid path-dependent behavior.

  **Must NOT do**:
  - No drift between hook runtime and run-script runtime APIs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Lifecycle runtime parity.
  - **Skills**: `systematic-debugging`, `test-driven-development`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `app/lib/game-engine/systems/runner/wrappers/ScriptSandboxRuntimeSystem.ts:232` - hook context creation.
  - `app/lib/scripting/UnsafeScriptSandbox.ts:216` - runtime context object passed into hooks/functions.

  **Acceptance Criteria**:
  - [ ] Hook-driven scripts can call same sync facade methods as run-script actions.
  - [ ] No missing-method runtime errors in lifecycle path.

- [ ] 5. Verify end-to-end behavior in BallSort with game inspector

  **What to do**:
  - Open BallSort with game inspector.
  - Validate no script missing-method errors.
  - Validate ball entities are spawned and visible.
  - Capture evidence artifacts.

  **Must NOT do**:
  - No manual-only verification.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused runtime verification.
  - **Skills**: `playwright`
    - `playwright`: Browser runtime interaction and evidence capture.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final)
  - **Blocks**: None
  - **Blocked By**: Tasks 3, 4

  **References**:
  - `r2/games/ballSort/src/script.ts:5` - `generateLevel` behavior to validate.
  - `r2/games/ballSort/src/script.ts:45` - `onStart` variable set behavior.

  **Acceptance Criteria**:
  - [ ] No console error containing `ctx.spawnEntity is not a function`.
  - [ ] No console error containing `ctx.setVariable is not a function`.
  - [ ] Ball entities count after load is > 0.
  - [ ] Evidence saved under `.sisyphus/evidence/`.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2-4 | `fix(scripting): unify sync script facade across runtime contexts` | scripting + runtime context builders | targeted tests + tsc |
| 5 | `test(ballsort): add regression coverage for dynamic script spawn` | tests only | targeted tests + runtime inspector evidence |

---

## Success Criteria

### Verification Commands
```bash
pnpm test -- RunScriptActionExecutor
pnpm test -- ScriptSandboxRuntimeSystem
pnpm tsc --noEmit
```

### Final Checklist
- [ ] Sync facade methods required by BallSort are present in both runtime context creation paths.
- [ ] Async `ctx.world` operations remain available and functional.
- [ ] Regression test added and passing.
- [ ] BallSort loads with spawned balls and without missing-method errors.
