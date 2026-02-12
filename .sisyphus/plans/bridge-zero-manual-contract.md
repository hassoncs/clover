# Zero-Manual RN-Godot Bridge Contract

## TL;DR

> **Quick Summary**: Replace the remaining hand-wired React Native <-> Godot bridge seams with generated transport layers from `app/lib/godot/types.ts`, while preserving middleware behavior via explicit hook layers and enforcing parity through CI contract gates.
>
> **Deliverables**:
> - Generated web/native transport adapters from one schema (`types.ts`).
> - Generated Godot method registration/dispatch maps aligned to the same schema.
> - Unified deterministic naming/routing contract (no structural aliases).
> - CI gates that fail on drift, missing implementations, and runtime parity regressions.
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: 1 -> 3 -> 5 -> 8 -> 11 -> 12

---

## Context

### Original Request
Create a complete plan to make bridge communication fully automatic, type-safe, generated on both sides, tested, and CI-guaranteed, with no manual per-method wiring.

### Interview Summary
**Key Discussions**:
- User explicitly confirmed full end-to-end scope (not partial TS-only/Godot-only).
- User goal is a guaranteed standard interface bridge for all communication paths.

**Research Findings**:
- Existing generation is partial: registry/validator/test-client/mock are generated, but runtime adapters/dispatch are still heavily manual.
- Biggest manual seams are `GodotBridge.web.ts`, `GameBridge.gd` override map, effects dual routing, and structural alias handling in tests.

### Metis Review
**Identified Gaps** (addressed in this plan):
- Middleware behavior is embedded in hand-written adapters and must be preserved via explicit hooks.
- Readiness/race guarantees (`call_deferred` exposure) must be preserved exactly.
- Naming edge cases (`3d`/`2d`) and alias drift need deterministic schema-level enforcement.
- Migration requires staged rollout + rollback, not big-bang replacement.

---

## Work Objectives

### Core Objective
Establish a single canonical bridge schema and generated transport/dispatch layers such that modifying `app/lib/godot/types.ts` and running generation is sufficient to keep React Native + Godot bridge contract consistent, typed, and CI-enforced.

### Concrete Deliverables
- Generator extensions for web/native transport code and Godot dispatch registration manifests.
- Middleware hook layer with explicit pre/post transforms for non-trivial methods.
- Removal of structural alias fallback in contract tests.
- CI pipeline that blocks merges on generation/type/parity/runtime contract failures.

### Definition of Done
- [ ] No hand-maintained per-method dispatch maps remain in runtime bridge code paths.
- [ ] `types.ts` is the single canonical source for bridge method surface + mapping metadata.
- [ ] Generated artifacts compile and runtime parity tests pass on web and Godot contract suite.
- [ ] CI rejects any bridge drift or runtime parity regression deterministically.

### Must Have
- Preserve current readiness invariant (`window.GodotBridge` exposure as the single readiness signal).
- Preserve behavioral semantics for middleware-heavy methods (serialization/normalization/error shape).
- Preserve performance-sensitive paths (event polling/transform sync hot paths).

### Must NOT Have (Guardrails)
- No QuerySystem redesign beyond bridge routing unification.
- No gameplay feature refactors.
- No manual edits in generated files.
- No silent fallback paths that bypass contract enforcement.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every acceptance criterion below is command/tool-verifiable. No manual clicking or visual verification.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (with required regression additions)
- **Framework**: pnpm test stack + Godot contract tests + CI workflow assertions

### Agent-Executed QA Scenarios (Global)

Scenario: Generation drift prevention
  Tool: Bash
  Preconditions: Repo dependencies installed
  Steps:
    1. Run `pnpm generate:bridge`
    2. Run `git status --porcelain`
    3. Assert no unexpected unstaged drift after committed generated artifacts
  Expected Result: Generator output deterministic and reproducible
  Failure Indicators: Generated artifacts differ unexpectedly
  Evidence: `.sisyphus/evidence/bridge-automation/generation-drift.txt`

Scenario: Type-level contract integrity
  Tool: Bash
  Preconditions: Generation complete
  Steps:
    1. Run `pnpm tsc --noEmit`
    2. Assert exit code 0
  Expected Result: Transport/contract layers compile cleanly
  Failure Indicators: type errors in bridge runtime/generated files
  Evidence: `.sisyphus/evidence/bridge-automation/tsc.txt`

Scenario: Runtime contract parity (Godot)
  Tool: Bash
  Preconditions: Godot test runner available
  Steps:
    1. Run `./godot_project/run_tests.sh`
    2. Assert bridge contract suite reports 0 failures
  Expected Result: TS contract and Godot runtime registration are aligned
  Failure Indicators: missing/extra methods, alias fallback usage, startup race regressions
  Evidence: `.sisyphus/evidence/bridge-automation/godot-contract.txt`

Scenario: Legacy manual seam detection
  Tool: Bash
  Preconditions: Migration tasks complete
  Steps:
    1. Run `grep -R "structural_aliases\|manual overrides\|waitForEffectsReady\|_effectsReady" godot_project app/lib/godot tests --include="*.gd" --include="*.ts"`
    2. Assert no runtime/manual seam hits remain (comments allowed only in migration docs)
  Expected Result: Manual compatibility seams removed from runtime paths
  Failure Indicators: Any runtime dependency on legacy seam patterns
  Evidence: `.sisyphus/evidence/bridge-automation/manual-seams-grep.txt`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Contract hardening + architecture scaffolding)
- Task 1: Freeze canonical schema + add explicit bridge metadata annotations.
- Task 2: Extract middleware hooks from hand-written adapter into explicit pre/post transform layer.
- Task 3: Add exhaustive parity tests that currently fail when manual seams drift.

Wave 2 (Generator expansion)
- Task 4: Extend `scripts/bridge-codegen.ts` to generate web transport adapter stubs.
- Task 5: Extend generator to emit Godot dispatch registration manifest.
- Task 6: Extend generator to emit name-map validators (including 2d/3d edge handling checks).

Wave 3 (Runtime cutover)
- Task 7: Replace `GodotBridge.web.ts` manual method wiring with generated transport + middleware hooks.
- Task 8: Replace `GameBridge.gd` manual overrides dictionary with generated registration integration.
- Task 9: Unify effects routing onto single deterministic dispatch contract.

Wave 4 (Cleanup + enforcement)
- Task 10: Remove structural alias fallback and legacy seam code.
- Task 11: Add CI blocking gates for generation/parity/runtime + seam grep.
- Task 12: Produce evidence bundle and finalize rollback-safe migration toggles.

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 5, 6 | 2, 3 |
| 2 | None | 7 | 1, 3 |
| 3 | None | 9, 10 | 1, 2 |
| 4 | 1 | 7 | 5, 6 |
| 5 | 1 | 8 | 4, 6 |
| 6 | 1 | 8, 10 | 4, 5 |
| 7 | 2, 4 | 9, 10 | 8 |
| 8 | 5, 6 | 9, 10 | 7 |
| 9 | 3, 7, 8 | 10, 11 | None |
| 10 | 3, 7, 8, 9 | 11, 12 | None |
| 11 | 9, 10 | 12 | None |
| 12 | 10, 11 | None | None |

---

## TODOs

- [ ] 1. Canonical schema hardening in `types.ts`

  **What to do**:
  - Add explicit bridge metadata annotations for each method (`bridgeName`, `routingMode`, `argCodec`, `returnCodec`, `middlewareHooks`).
  - Freeze schema conventions (camelCase TS API, deterministic bridge name derivation, explicit override metadata only when necessary).
  - Add generator validation that fails on missing metadata for non-trivial methods.

  **Must NOT do**:
  - Do not change runtime behavior yet.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `writing-plans`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 4, 5, 6
  - **Blocked By**: None

  **References**:
  - `app/lib/godot/types.ts` - canonical bridge interface surface.
  - `scripts/bridge-codegen.ts` - existing metadata extraction patterns.

  **Acceptance Criteria**:
  - [ ] Schema metadata lints fail when a non-trivial method lacks mapping/codec metadata.
  - [ ] `pnpm generate:bridge` succeeds with metadata consumed.

- [ ] 2. Extract middleware hook layer

  **What to do**:
  - Move serialization/normalization/special handling out of hand-written transport methods into explicit reusable hook functions.
  - Define pre-call and post-call hook signatures consumed by generated transport.
  - Add tests for each migrated hook behavior.

  **Must NOT do**:
  - Do not remove behavior; only relocate into explicit hook layer.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`, `test-driven-development`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7
  - **Blocked By**: None

  **References**:
  - `app/lib/godot/GodotBridge.web.ts` - current manual middleware behavior.
  - `app/lib/godot/GodotBridgeBase.ts` - normalization helpers already present.

  **Acceptance Criteria**:
  - [ ] Middleware tests prove behavior parity before/after extraction.
  - [ ] No direct middleware logic remains inside generated-target sections.

- [ ] 3. Add parity-first failing tests (pre-cutover)

  **What to do**:
  - Add/expand tests that assert full method parity by route type (direct dispatch vs query route).
  - Add tests for naming edge cases (`2d`/`3d`) and alias elimination readiness.
  - Add failure-mode tests for missing runtime method registration.

  **Must NOT do**:
  - Do not relax existing contract tests.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 9, 10
  - **Blocked By**: None

  **References**:
  - `godot_project/tests/test_BridgeContract.gd` - baseline contract suite.
  - `app/lib/godot/__tests__/` - bridge test patterns.

  **Acceptance Criteria**:
  - [ ] Tests fail on known seam regressions (aliases/manual mapping drift).
  - [ ] New tests are green only when generated parity is correct.

- [ ] 4. Generate web transport adapter

  **What to do**:
  - Extend generator to emit a web transport implementation from schema metadata.
  - Generate method bodies that call standardized runtime dispatch APIs.
  - Preserve readiness bootstrap contract and callback wiring integration points.

  **Must NOT do**:
  - Do not inline middleware logic into generated code.

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 7
  - **Blocked By**: 1

  **References**:
  - `scripts/bridge-codegen.ts` - generation framework.
  - `app/lib/godot/GodotBridge.web.ts` - behavior to match.

  **Acceptance Criteria**:
  - [ ] Generated web transport compiles and passes parity tests.
  - [ ] `pnpm generate:bridge` regenerates deterministic adapter output.

- [ ] 5. Generate Godot dispatch registration manifest

  **What to do**:
  - Generate machine-readable manifest mapping bridge names to callable registrations.
  - Replace manual override list assembly in `GameBridge.gd` with manifest-driven loading.
  - Keep fallback assertions for missing callable targets.

  **Must NOT do**:
  - Do not rewrite gameplay modules.

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: `game-authoring/scripting-api-reference`, `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 8
  - **Blocked By**: 1

  **References**:
  - `godot_project/scripts/GameBridge.gd` - current manual registration map.
  - `godot_project/scripts/bridge/generated/BridgeValidation.gd` - generated validation pattern.

  **Acceptance Criteria**:
  - [ ] Manual overrides dictionary no longer controls runtime registration.
  - [ ] Missing callable targets fail fast with deterministic error output.

- [ ] 6. Deterministic naming and mapping validation generation

  **What to do**:
  - Encode naming rules in generator (including `2d`/`3d` handling).
  - Add generated checks to fail when bridge names require undocumented structural aliases.
  - Emit mapping diff report artifact during generation.

  **Must NOT do**:
  - Do not keep silent alias fallbacks.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 8, 10
  - **Blocked By**: 1

  **References**:
  - `scripts/bridge-codegen.ts` - current `camelToSnake` logic.
  - `godot_project/scripts/GameBridge.gd` - `_to_camel_case` runtime logic.

  **Acceptance Criteria**:
  - [ ] Generator fails if non-derivable names are not explicitly declared.
  - [ ] Mapping report produced under `.sisyphus/evidence/bridge-automation/name-map.txt`.

- [ ] 7. Cut over web runtime to generated transport

  **What to do**:
  - Replace manual per-method implementations in `GodotBridge.web.ts` with generated transport entrypoints.
  - Wire extracted middleware hooks into generated transport pipeline.
  - Preserve initialize/dispose lifecycle and callback plumbing.

  **Must NOT do**:
  - Do not change externally visible `GodotBridge` API.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 9, 10
  - **Blocked By**: 2, 4

  **References**:
  - `app/lib/godot/GodotBridge.web.ts` - lifecycle/callback behavior.
  - Generated transport output path from Task 4.

  **Acceptance Criteria**:
  - [ ] Runtime smoke tests pass for lifecycle, direct calls, and query calls.
  - [ ] No hand-written per-method method bodies remain in web adapter runtime path.

- [ ] 8. Cut over Godot runtime to generated registration

  **What to do**:
  - Integrate generated manifest in `GameBridge.gd` registration path.
  - Ensure registration completes before deferred bridge exposure.
  - Add runtime assertion logging for missing generated entries.

  **Must NOT do**:
  - Do not break the `call_deferred("_finalize_js_bridge")` readiness contract.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring/scripting-api-reference`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 9, 10
  - **Blocked By**: 5, 6

  **References**:
  - `godot_project/scripts/GameBridge.gd` - deferred exposure + method map boot.
  - Generated manifest from Task 5.

  **Acceptance Criteria**:
  - [ ] Godot bridge registration path uses generated manifest only.
  - [ ] Startup contract tests pass with no race regressions.

- [ ] 9. Unify effects routing contract

  **What to do**:
  - Standardize effects method routing so one deterministic route is canonical.
  - Remove duplicate divergent behavior between `_method_map` and query handlers.
  - Keep compatibility wrappers only if explicitly time-boxed and test-covered.

  **Must NOT do**:
  - Do not alter effect graph semantics.

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: `systematic-debugging`, `test-driven-development`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 dependent
  - **Blocks**: 10, 11
  - **Blocked By**: 3, 7, 8

  **References**:
  - `godot_project/scripts/bridge/GameBridgeEffects.gd` - current dual registration path.
  - `app/lib/godot/GodotBridge.web.ts` - current effects call path.

  **Acceptance Criteria**:
  - [ ] Effects methods resolve via one canonical route.
  - [ ] Existing effects regression tests remain green.

- [ ] 10. Remove structural alias and legacy seam fallbacks

  **What to do**:
  - Remove `structural_aliases` dependency from contract tests.
  - Remove legacy fallback seam code once generated routes are proven.
  - Add explicit migration note documenting removed seams.

  **Must NOT do**:
  - Do not remove fallback before parity tests are green.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: 11, 12
  - **Blocked By**: 3, 6, 7, 8, 9

  **References**:
  - `godot_project/tests/test_BridgeContract.gd` - alias fallback currently present.

  **Acceptance Criteria**:
  - [ ] Contract tests pass without alias escape hatch.
  - [ ] Legacy seam grep shows no runtime seam patterns.

- [ ] 11. CI enforcement hardening

  **What to do**:
  - Add/update CI jobs for generation drift, typecheck, Godot contract parity, and seam grep.
  - Ensure jobs are blocking for PRs touching bridge/runtime/generator surfaces.
  - Add deterministic artifacts for failed runs (mapping diff, missing methods list).

  **Must NOT do**:
  - Do not broaden CI to unrelated domains.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `git-master`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: 12
  - **Blocked By**: 9, 10

  **References**:
  - `.github/workflows/bridge-contract.yml` - existing baseline workflow.

  **Acceptance Criteria**:
  - [ ] CI fails when generated artifacts drift.
  - [ ] CI fails when contract parity or seam checks fail.

- [ ] 12. Evidence bundle + rollback-safe completion

  **What to do**:
  - Capture all required evidence outputs for generation, typecheck, Godot tests, seam grep, and mapping reports.
  - Verify rollback switch/strategy is documented and tested (if canary toggles used).
  - Finalize runbook for adding new bridge methods via one canonical workflow.

  **Must NOT do**:
  - Do not declare done without evidence files for every gate.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `verification-before-completion`, `writing-plans`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final
  - **Blocks**: None
  - **Blocked By**: 10, 11

  **References**:
  - `.sisyphus/evidence/bridge-automation/` - evidence directory.

  **Acceptance Criteria**:
  - [ ] Evidence files exist and show passing gates.
  - [ ] Runbook documents exact “add method -> generate -> verify” workflow.

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-3 | `chore(bridge): harden canonical schema and parity tests` | types, tests, generator checks | `pnpm test` + targeted bridge suites |
| 4-6 | `feat(bridge): generate transport and dispatch manifests` | generator + generated outputs | `pnpm generate:bridge` + `pnpm tsc --noEmit` |
| 7-10 | `refactor(bridge): cut over runtime to generated contract` | web/godot runtime + tests | `pnpm tsc --noEmit` + `./godot_project/run_tests.sh` |
| 11-12 | `ci(bridge): enforce zero-manual contract gates` | workflow + evidence docs | workflow command parity locally |

---

## Success Criteria

### Verification Commands
```bash
pnpm generate:bridge
pnpm tsc --noEmit
./godot_project/run_tests.sh
grep -R "structural_aliases\|manual overrides\|waitForEffectsReady\|_effectsReady" godot_project app/lib/godot tests --include="*.gd" --include="*.ts"
```

### Final Checklist
- [ ] One canonical bridge schema drives all generated transport/dispatch artifacts.
- [ ] No runtime manual per-method bridge wiring remains.
- [ ] Middleware behaviors are preserved through explicit hook architecture.
- [ ] Contract parity passes in TS + Godot runtime tests.
- [ ] CI deterministically blocks drift/regressions.
