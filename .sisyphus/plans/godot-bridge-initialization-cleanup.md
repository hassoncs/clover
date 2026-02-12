# Godot Bridge Initialization Cleanup

## TL;DR

> **Quick Summary**: Standardize bridge readiness on one deterministic signal (`window.GodotBridge` exposed only after all required handlers are registered), remove module-specific readiness polling, and preserve type-safe codegen guarantees through generator + contract-test gates.
>
> **Deliverables**:
> - Initialization flow cleaned and documented with single readiness contract.
> - JS bridge polling simplified (no `_effectsReady`-style module flag logic).
> - Type-safe codegen and contract validation kept green (`generate:bridge`, `tsc`, Godot contract tests).
> - CI gate asserts readiness behavior and prevents drift/regressions.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 -> Task 3 -> Task 5 -> Task 7

---

## Context

### Original Request
Provide a full cleanup plan for Godot bridge initialization while maintaining type-safe codegen.

### Interview/Research Summary
- Existing architecture has two autoloads: `GameBridge` then `GameBridgeEffects` in `godot_project/project.godot`.
- Historic failure mode: bridge visible to JS before all effect query handlers are registered.
- Existing workaround pattern referenced in request: module-specific readiness (`_effectsReady`) + polling loops.
- Additional validation requirement: do not weaken existing typed codegen guarantees.

### Metis Review (Applied)
Metis identified one critical planning guardrail: verify current code state first because some cleanup may already be partially present. Plan includes explicit verification-first task and prohibits speculative refactors.

---

## Work Objectives

### Core Objective
Establish a single, deterministic bridge readiness contract that removes module-specific polling hacks and keeps bridge contract/type generation fully enforceable at build time.

### Concrete Deliverables
- Readiness contract spec documented in code and tests.
- Godot initialization order and bridge exposure flow cleaned.
- JS-side effects execution no longer depends on module-specific readiness flags.
- Validation gates proving no drift in generated contract artifacts.

### Definition of Done
- [ ] Bridge readiness is governed by one signal only (`window.GodotBridge` exposure point).
- [ ] No module-specific readiness polling remains in handwritten bridge runtime code.
- [ ] `pnpm generate:bridge` + `pnpm tsc --noEmit` + `./godot_project/run_tests.sh` all pass.
- [ ] CI includes deterministic gate for bridge init + contract drift regressions.

### Must Have
- Type-safe codegen remains source of truth for bridge API surface.
- No manual duplicate contract lists.
- Explicit verification for init ordering and handler availability.

### Must NOT Have (Guardrails)
- No QuerySystem redesign.
- No opportunistic bridge API additions.
- No autoload architecture rewrite beyond readiness cleanup.
- No hand-edited generated files.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verification is agent-executed (commands/tests/log assertions). No manual clicking or visual confirmation required.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: Existing monorepo test stack + Godot test runner

### Agent-Executed QA Scenarios (Global)

Scenario: Bridge contract and generation stability
  Tool: Bash
  Preconditions: Repo dependencies installed
  Steps:
    1. Run `pnpm generate:bridge`
    2. Run `pnpm tsc --noEmit`
    3. Assert exit code is 0 for both
  Expected Result: Generated bridge artifacts and TS contract both valid
  Failure Indicators: Non-zero exit code or type errors
  Evidence: `.sisyphus/evidence/bridge-init/generate-and-tsc.txt`

Scenario: Godot query handler contract integrity
  Tool: Bash
  Preconditions: Godot runner available
  Steps:
    1. Run `./godot_project/run_tests.sh`
    2. Parse output for failed test count
    3. Assert bridge contract suite reports 0 failures
  Expected Result: Contract tests pass after cleanup
  Failure Indicators: Missing query method assertions, failing suite
  Evidence: `.sisyphus/evidence/bridge-init/godot-tests.txt`

Scenario: No legacy readiness flag dependency
  Tool: Bash
  Preconditions: Code changes complete
  Steps:
    1. Run `grep -R "_effectsReady\|waitForEffectsReady" app/lib/godot godot_project/scripts/bridge --include="*.ts" --include="*.gd"`
    2. Assert no runtime usages remain (comments allowed only if explanatory)
  Expected Result: No active module-specific readiness polling logic
  Failure Indicators: Any runtime code path still gated by module-specific flag
  Evidence: `.sisyphus/evidence/bridge-init/legacy-readiness-grep.txt`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Discovery + guardrails)
- Task 1: Verify current implementation delta vs intended cleanup
- Task 2: Lock readiness contract and scope boundaries

Wave 2 (Implementation)
- Task 3: Clean Godot-side bridge exposure timing
- Task 4: Remove JS-side module polling and simplify effects dispatch
- Task 5: Remove/retire stale readiness plumbing in effects bridge (if still present)

Wave 3 (Validation + enforcement)
- Task 6: Preserve and validate typed codegen pipeline
- Task 7: Add/adjust regression tests for initialization contract
- Task 8: Add CI gate and produce evidence bundle

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3,4,5 | 2 |
| 2 | None | 8 | 1 |
| 3 | 1 | 7 | 4,5 |
| 4 | 1 | 7 | 3,5 |
| 5 | 1 | 7 | 3,4 |
| 6 | 3,4 | 8 | 7 |
| 7 | 3,4,5 | 8 | 6 |
| 8 | 2,6,7 | None | None |

---

## TODOs

- [ ] 1. Verify baseline and lock exact delta

  **What to do**:
  - Capture current behavior of `GameBridge._ready`, `_finalize_js_bridge`, and bridge exposure timing.
  - Confirm whether `_effectsReady` / `waitForEffectsReady` still exist in runtime paths.
  - Produce a short before-state report used by all downstream tasks.

  **Must NOT do**:
  - Do not modify code in this task.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 3, 4, 5
  - **Blocked By**: None

  **References**:
  - `godot_project/scripts/GameBridge.gd` - authoritative bridge bootstrap flow.
  - `godot_project/scripts/bridge/GameBridgeEffects.gd` - effects-side registration lifecycle.
  - `app/lib/godot/GodotBridge.web.ts` - JS init + effects dispatch flow.

  **Acceptance Criteria**:
  - [ ] Baseline report created under `.sisyphus/evidence/bridge-init/baseline.md`.
  - [ ] Report explicitly lists what still needs change vs already-clean state.

- [ ] 2. Codify single readiness contract

  **What to do**:
  - Document readiness invariant: JS may call bridge methods only after `window.GodotBridge` is exposed.
  - Record required autoload ordering assumptions and prohibited future patterns.
  - Add inline comments near readiness-critical code paths.

  **Must NOT do**:
  - Do not introduce new readiness flags.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `writing-plans`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 8
  - **Blocked By**: None

  **References**:
  - `godot_project/project.godot` - autoload order contract source.
  - `godot_project/scripts/GameBridge.gd` - final readiness signal location.

  **Acceptance Criteria**:
  - [ ] Readiness contract documented in repo docs or code comments with explicit invariant.

- [ ] 3. Normalize Godot-side bridge exposure timing

  **What to do**:
  - Ensure `_setup_js_bridge()` is only called through deferred finalization path.
  - Ensure core query handlers are registered before deferred exposure.
  - Ensure initialization logs clearly indicate deferred completion.

  **Must NOT do**:
  - Do not alter bridge method semantics.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring/scripting-api-reference`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 7
  - **Blocked By**: 1

  **References**:
  - `godot_project/scripts/GameBridge.gd` - `_ready`, `_finalize_js_bridge`, `_setup_js_bridge`.

  **Acceptance Criteria**:
  - [ ] No direct early bridge exposure path remains in `_ready`.
  - [ ] Deferred path is single source of bridge exposure.

- [ ] 4. Remove JS module-specific readiness polling

  **What to do**:
  - Remove `waitForEffectsReady` style helper if present.
  - Simplify effects execution path to rely on unified readiness contract.
  - Keep existing timeout/error handling for initial bridge acquisition.

  **Must NOT do**:
  - Do not remove initialize timeout protection.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `systematic-debugging`, `vercel-react-best-practices`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 7
  - **Blocked By**: 1

  **References**:
  - `app/lib/godot/GodotBridge.web.ts` - initialize/effects dispatch pipeline.

  **Acceptance Criteria**:
  - [ ] No runtime polling helper remains for per-module readiness.
  - [ ] Effects methods execute through same readiness contract as other bridge calls.

- [ ] 5. Remove stale effects readiness plumbing

  **What to do**:
  - Remove `_effectsReady` assignments/evals that are no longer needed.
  - Keep callback registration and method map integration untouched.
  - Preserve effects query handler registration behavior.

  **Must NOT do**:
  - Do not refactor effects graph execution internals.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 7
  - **Blocked By**: 1

  **References**:
  - `godot_project/scripts/bridge/GameBridgeEffects.gd` - readiness flag and JS bridge setup section.

  **Acceptance Criteria**:
  - [ ] Legacy readiness flag writes removed from runtime code paths.

- [ ] 6. Preserve type-safe codegen invariants

  **What to do**:
  - Run bridge generator and validate generated artifacts are consistent.
  - Validate typecheck with generated bridge artifacts in place.
  - Confirm bridge registry and typed client remain source-of-truth aligned.

  **Must NOT do**:
  - Do not hand-edit generated files.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 8
  - **Blocked By**: 3, 4

  **References**:
  - `scripts/bridge-codegen.ts` - generator implementation.
  - `app/lib/godot/generated/bridge-registry.json` - generated contract metadata.
  - `tests/e2e/bridge/generated/TypedBridgeClient.ts` - typed bridge surface.

  **Acceptance Criteria**:
  - [ ] `pnpm generate:bridge` passes.
  - [ ] `pnpm tsc --noEmit` passes.

- [ ] 7. Add regression tests for initialization contract

  **What to do**:
  - Add/adjust tests to assert no unknown-method race at startup.
  - Add negative assertion proving calls before readiness are impossible/guarded.
  - Ensure effects query handlers are available at first legal invocation.

  **Must NOT do**:
  - Do not weaken existing bridge contract assertions.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 8
  - **Blocked By**: 3, 4, 5

  **References**:
  - `godot_project/tests/test_BridgeContract.gd` - contract test style/pattern.
  - `app/lib/godot/__tests__/` - JS bridge test harness patterns.

  **Acceptance Criteria**:
  - [ ] Regression test fails against old race pattern and passes on cleaned flow.
  - [ ] `./godot_project/run_tests.sh` passes.

- [ ] 8. Enforce and evidence in CI

  **What to do**:
  - Add/update CI job to run generation, typecheck, and Godot contract tests.
  - Add grep/assertion step that rejects legacy readiness polling reintroduction.
  - Capture evidence bundle for review.

  **Must NOT do**:
  - Do not broaden CI scope with unrelated jobs.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `git-master`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 final
  - **Blocks**: None
  - **Blocked By**: 2, 6, 7

  **References**:
  - `.github/workflows/bridge-contract.yml` - current contract gate baseline.

  **Acceptance Criteria**:
  - [ ] CI job enforces init-cleanup + type/codegen gates.
  - [ ] Evidence written to `.sisyphus/evidence/bridge-init/`.

---

## Commit Strategy

| After Task | Message | Verification |
|------------|---------|--------------|
| 3-5 | `refactor(bridge): unify readiness signal and remove module polling` | `pnpm tsc --noEmit` |
| 6-7 | `test(bridge): add startup readiness regression coverage` | `./godot_project/run_tests.sh` |
| 8 | `ci(bridge): enforce init cleanup and contract gates` | workflow dry validation + local commands |

---

## Success Criteria

### Verification Commands
```bash
pnpm generate:bridge
pnpm tsc --noEmit
./godot_project/run_tests.sh
grep -R "_effectsReady\|waitForEffectsReady" app/lib/godot godot_project/scripts/bridge --include="*.ts" --include="*.gd"
```

### Final Checklist
- [ ] Single readiness contract implemented and documented.
- [ ] No module-specific readiness polling logic in runtime code.
- [ ] Typed codegen artifacts and typecheck remain green.
- [ ] Godot bridge contract tests pass with no startup race regressions.
- [ ] CI blocks regressions deterministically.
