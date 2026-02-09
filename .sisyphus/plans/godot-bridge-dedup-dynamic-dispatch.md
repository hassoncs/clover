# Godot Bridge Dedup + Dynamic Dispatch (CISFIS)

## TL;DR

> **Quick Summary**: Replace manual Godot bridge mapping with convention-based auto-registration and unified dispatch generation, while preserving current TypeScript API compatibility and adding explicit safety guardrails.
>
> **Deliverables**:
> - Isolated git worktree + dedicated branch for this effort
> - Auto-registration in `GameBridge.gd` for bridge-exposed module methods
> - Single source of truth for native + web dispatch registration
> - 3D method migration onto module-discovered bridge handlers (no duplicate inline maps)
> - Structured error handling + bridge registry observability
> - Regression verification scenarios for native/web call paths
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 0 -> Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 6

---

## Context

### Original Request
User wants a complete `.sisyphus` plan to avoid repetitive Godot bridge boilerplate, especially when adding 3D functionality.

### Interview Summary
**Key Discussions**:
- Current bridge requires repetitive updates in multiple places (`_method_map`, `_setup_js_bridge`, TS bridge layers).
- Desired direction is "magic glue" with reflection/dynamic behavior to reduce time spent on mapping.
- User wants a practical path with low friction and strong compatibility.

**Research Findings**:
- Native already routes through `native_dispatch(method_name, args_json)` in `godot_project/scripts/GameBridge.gd`.
- Web callbacks in `_setup_js_bridge()` duplicate much of `_build_method_map()`.
- 3D methods are duplicated in both native map and web extra callback map in `godot_project/scripts/GameBridge.gd`.
- TS native contains many string-dispatch call sites (`callGameBridge('...')`) including 3D operations in `app/lib/godot/GodotBridge.native.ts`.

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Missing migration strategy (fixed: incremental migration + compatibility).
- Missing naming strategy (fixed: canonical snake_case + web aliasing for camelCase).
- Missing exposure guardrails (fixed: explicit allowlist/prefix + conflict detection).
- Missing edge-case handling (fixed: collisions, arity/type mismatch, serialization limits, async boundaries).

---

## Work Objectives

### Core Objective
Refactor Godot bridge registration into a deduplicated, convention-driven system that keeps existing TS behavior stable while making new 3D and non-3D methods near-zero boilerplate on the Godot side.

### Concrete Deliverables
- `godot_project/scripts/GameBridge.gd` uses auto-discovery for bridge-exposed methods and generates both native and web registration from one registry.
- Bridge-exposed module methods follow one explicit convention (e.g., `_js_*`).
- Existing manual duplicate entries in `_method_map` / `_setup_js_bridge` are removed or converted to explicit overrides only.
- Structured error returns/logging for unknown methods and invalid args.
- Bridge registry diagnostics output available in dev mode.

### Definition of Done
- [ ] New bridge method added in one module (following convention) becomes callable via native and web without editing dual registration blocks.
- [ ] Existing key methods (`spawn_entity`, `set_position`, `apply_impulse`, 3D methods) continue working.
- [ ] No duplicated 3D callback entries remain in `GameBridge.gd` registration paths.
- [ ] Verification scenarios in this plan pass with agent-executed evidence.

### Must Have
- Preserve backward compatibility for current JS/TS callers.
- Keep explicit safety controls over exposed methods.
- Keep web/native API parity for core gameplay + 3D methods.

### Must NOT Have (Guardrails)
- No unrestricted reflection that exposes all module methods blindly.
- No silent `null` failures without structured warning/error context.
- No big-bang rewrite of TS bridge call sites in this phase.
- No scope expansion into full external RPC stack or dependency-heavy schema framework in Phase 1.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every acceptance criterion is agent-executable by command/tool. No manual user testing steps are allowed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (tests-after)
- **Framework**: Existing project test infrastructure + targeted runtime verification

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

For each implementation task, include:
- Happy-path validation through native and web bridge calls
- Negative-path validation for unknown method / invalid arg payload
- Evidence capture under `.sisyphus/evidence/`

Scenario template to use in all tasks:

```text
Scenario: <name>
  Tool: <Playwright | interactive_bash | Bash>
  Preconditions: <exact environment>
  Steps:
    1. <exact command or selector interaction>
    2. <assertion action>
    3. <capture evidence>
  Expected Result: <concrete outcome>
  Failure Indicators: <specific failure>
  Evidence: .sisyphus/evidence/task-<n>-<slug>.<ext>
```

---

## Execution Strategy

### Parallel Execution Waves

```text
Wave 1 (Start Immediately)
├── Task 0: Create isolated worktree + branch
├── Task 1: Bridge API inventory and compatibility baseline
└── Task 5: Verification harness updates for bridge regression checks

Wave 2 (After Wave 1)
├── Task 2: Auto-registration engine in GameBridge
├── Task 3: Unified native/web registration generation
└── Task 7: Observability + registry diagnostics

Wave 3 (After Wave 2)
├── Task 4: 3D migration onto convention-based handlers
├── Task 6: Structured dispatch error model + guardrails
├── Task 8: Final regression pass + cleanup and docs
└── Task 9: Research & propose automated Godot WASM↔TS bridge E2E tests (no Playwright)

Critical Path: 0 -> 1 -> 2 -> 3 -> 4 -> 8
Parallel Speedup: ~35-45% over sequential execution
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 0 | None | 1, 2, 3, 4, 5, 6, 7, 8 | None |
| 1 | 0 | 2, 3, 4, 8 | 5 |
| 2 | 1 | 3, 4, 6 | 5, 7 |
| 3 | 1, 2 | 4, 8 | 7 |
| 4 | 1, 2, 3 | 8 | 6 |
| 5 | 0 | 8 | 1, 2 |
| 6 | 2 | 8 | 4 |
| 7 | 2 | 8 | 3 |
| 8 | 3, 4, 5, 6, 7 | None | None |
| 9 | 3, 4, 5, 6, 7 | None | 8 (if documentation updates are independent) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 0, 1, 5 | `task(category="unspecified-low", load_skills=["git-worktree","game-authoring","verification-before-completion"], run_in_background=false)` |
| 2 | 2, 3, 7 | `task(category="deep", load_skills=["game-authoring","systematic-debugging"], run_in_background=false)` |
| 3 | 4, 6, 8 | `task(category="deep", load_skills=["game-authoring","verification-before-completion"], run_in_background=false)` |

---

## TODOs

- [x] 0. Create Isolated Worktree + Dedicated Branch (Step Zero)

  **What to do**:
  - Create a new worktree for this effort using the project worktree manager script.
  - Create/use a dedicated branch in that worktree (e.g., `refactor/godot-bridge-dedup-dispatch`).
  - Confirm `.env` files are present in the new worktree and all commands execute there.
  - Record chosen worktree path + branch name in execution notes.

  **Must NOT do**:
  - Do not implement any refactor work on the current primary worktree.
  - Do not reuse an unrelated active feature branch.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: operational repo setup, not architectural coding.
  - **Skills**: `git-worktree`, `git-master`
    - `git-worktree`: enforced path for managed worktree creation and env setup.
    - `git-master`: branch hygiene and safe git workflow.
  - **Skills Evaluated but Omitted**:
    - `game-authoring`: not needed for repository setup step.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential gate before all other tasks
  - **Blocks**: 1, 2, 3, 4, 5, 6, 7, 8
  - **Blocked By**: None

  **References**:
  - `~/.claude/skills/git-worktree` - required worktree-manager workflow.
  - `AGENTS.md` - project constraints and service expectations.

  **Acceptance Criteria**:
  - [ ] New worktree exists under `.worktrees/` (or configured manager path).
  - [ ] Dedicated branch exists and is checked out in that worktree.
  - [ ] All subsequent implementation tasks are executed in this isolated worktree.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Managed worktree creation
    Tool: Bash
    Preconditions: Main repo clean enough for branch/worktree creation
    Steps:
      1. Run manager create command for branch/worktree name
      2. Assert manager output reports created/switchable worktree
      3. Run manager list command and verify new worktree entry present
      4. Save output to .sisyphus/evidence/task-0-worktree-create.log
    Expected Result: Worktree is created and listed with target branch
    Failure Indicators: manager error or missing worktree in listing
    Evidence: .sisyphus/evidence/task-0-worktree-create.log

  Scenario: Branch isolation verification
    Tool: Bash
    Preconditions: Worktree created
    Steps:
      1. In worktree, run git branch --show-current
      2. In primary repo, run git branch --show-current
      3. Assert branch names differ as expected for isolation
      4. Save output to .sisyphus/evidence/task-0-branch-isolation.log
    Expected Result: Isolated feature branch active in worktree only
    Failure Indicators: same branch/worktree context indicates setup mistake
    Evidence: .sisyphus/evidence/task-0-branch-isolation.log
  ```

  **Commit**: NO

- [x] 1. Establish Bridge Contract Baseline (Freeze Current Behavior)

  **What to do**:
  - Enumerate currently exposed bridge methods across native and web paths.
  - Produce a compatibility manifest (method names, arg count expectations, return behavior).
  - Lock the baseline list to prevent accidental API shrink during refactor.

  **Must NOT do**:
  - Do not alter runtime behavior in this task.
  - Do not remove existing methods yet.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Contract inventory and baseline generation are bounded analysis tasks.
  - **Skills**: `game-authoring`, `verification-before-completion`
    - `game-authoring`: understand existing bridge API shape and conventions.
    - `verification-before-completion`: ensure baseline is complete and verifiable.
  - **Skills Evaluated but Omitted**:
    - `test-driven-development`: not implementation-first in this baseline task.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 5)
  - **Blocks**: 2, 3, 4, 8
  - **Blocked By**: 0

  **References**:
  - `godot_project/scripts/GameBridge.gd` - current native/web registration sources.
  - `app/lib/godot/GodotBridge.native.ts` - native string dispatch call surface.
  - `app/lib/godot/GodotBridge.web.ts` - web method exposure and query flow.
  - `app/lib/godot/types.ts` - TS bridge interface contract.

  **Acceptance Criteria**:
  - [ ] Compatibility manifest exists and lists all currently exposed bridge methods.
  - [ ] Manifest includes at least: lifecycle, entity, transform, physics, input, query, camera, UI, 3D groups.
  - [ ] Baseline doc clearly marks canonical internal method names and web aliases.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Baseline manifest completeness
    Tool: Bash
    Preconditions: Repo checked out with current bridge files
    Steps:
      1. Extract method keys from GameBridge registration blocks via scripted parse
      2. Extract TS-native call names from GodotBridge.native.ts
      3. Compare sets and generate diff report
      4. Save report to .sisyphus/evidence/task-1-bridge-contract-diff.txt
    Expected Result: Diff report generated with explicit matches/mismatches
    Failure Indicators: Missing major method category or empty extraction output
    Evidence: .sisyphus/evidence/task-1-bridge-contract-diff.txt

  Scenario: 3D API presence in baseline
    Tool: Bash
    Preconditions: Compatibility manifest generated
    Steps:
      1. Verify manifest contains show_3d_model, rotate_3d_model, set_3d_camera_distance
      2. Save verification output to .sisyphus/evidence/task-1-3d-baseline-check.txt
    Expected Result: Required 3D APIs present
    Failure Indicators: Any required 3D method missing
    Evidence: .sisyphus/evidence/task-1-3d-baseline-check.txt
  ```

  **Commit**: NO

- [x] 2. Implement Convention-Based Auto-Registration in `GameBridge.gd`

  **What to do**:
  - Add auto-discovery for bridge-exposed methods (default convention: `_js_` prefix).
  - Build dispatch table from discovered methods.
  - Add explicit conflict detection for duplicate bridge method names across modules.
  - Keep support for explicit manual overrides where required.

  **Must NOT do**:
  - Do not expose methods without convention/allowlist match.
  - Do not remove manual fallback path until parity is verified.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: touches central dispatch mechanics and compatibility-sensitive bridge core.
  - **Skills**: `game-authoring`, `systematic-debugging`
    - `game-authoring`: align with engine/module architecture.
    - `systematic-debugging`: safe rollout with fast root-cause if method routing fails.
  - **Skills Evaluated but Omitted**:
    - `brainstorming`: design is already chosen; implementation planning phase now.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 7)
  - **Blocks**: 3, 4, 6
  - **Blocked By**: 1

  **References**:
  - `godot_project/scripts/GameBridge.gd` - current `_build_method_map` and `native_dispatch`.
  - `godot_project/scripts/bridge/QuerySystem.gd` - query handler registration pattern.
  - `godot_project/scripts/bridge/VisualRenderer.gd` - representative `_js_`-style methods.
  - `godot_project/scripts/physics/PhysicsController.gd` - high-frequency bridge methods.

  **Acceptance Criteria**:
  - [ ] Dispatch table built via convention discovery for module methods.
  - [ ] Duplicate discovered names emit deterministic startup error and do not silently override.
  - [ ] Explicit override map can replace discovered handler for specified methods.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Auto-registered method callable via native dispatch
    Tool: Bash
    Preconditions: Refactor branch built/exported and runtime booted
    Steps:
      1. Invoke native dispatch for a convention-discovered method (e.g., set_position)
      2. Assert response/side effect matches baseline
      3. Capture runtime logs to .sisyphus/evidence/task-2-native-auto-registration.log
    Expected Result: Method executes through discovered registry without manual map entry
    Failure Indicators: Unknown method warning for discovered method
    Evidence: .sisyphus/evidence/task-2-native-auto-registration.log

  Scenario: Duplicate method collision detection
    Tool: Bash
    Preconditions: Controlled test fixture with deliberate duplicate method name
    Steps:
      1. Start runtime with duplicate fixture enabled
      2. Assert startup logs include collision error with method + module names
      3. Save output to .sisyphus/evidence/task-2-collision-check.log
    Expected Result: Collision is detected and clearly reported
    Failure Indicators: Silent override or nondeterministic method owner
    Evidence: .sisyphus/evidence/task-2-collision-check.log
  ```

  **Commit**: YES
  - Message: `refactor(godot-bridge): auto-register bridge methods by convention`
  - Files: `godot_project/scripts/GameBridge.gd`, related module files
  - Pre-commit: bridge smoke verification command set

- [x] 3. Unify Web + Native Registration from One Registry

  **What to do**:
  - Generate web callbacks from the same canonical registry used by native dispatch.
  - Introduce deterministic name policy:
    - canonical internal key: snake_case
    - web alias exposure: snake_case + camelCase compatibility aliases where needed
  - Remove duplicate hardcoded 3D extra callback blocks by folding into registry-based generation.

  **Must NOT do**:
  - Do not break existing web caller method names.
  - Do not introduce divergent web-only behavior for canonical gameplay methods.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: parity across platform bridges is high-risk integration work.
  - **Skills**: `game-authoring`, `systematic-debugging`
  - **Skills Evaluated but Omitted**:
    - `vercel-react-best-practices`: not relevant to GDScript bridge internals.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 7)
  - **Blocks**: 4, 8
  - **Blocked By**: 1, 2

  **References**:
  - `godot_project/scripts/GameBridge.gd` - `_setup_js_bridge` and dispatch generation.
  - `app/lib/godot/GodotBridge.web.ts` - expected web method names/casing.
  - `app/lib/godot/GodotBridge.native.ts` - native string key expectations.

  **Acceptance Criteria**:
  - [ ] Web callback registration generated from canonical dispatch registry.
  - [ ] Existing web call names still resolve (via canonical or alias mapping).
  - [ ] 3D methods are no longer defined in a duplicate "extra callbacks" block.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Web method parity through unified registry
    Tool: Playwright (playwright skill)
    Preconditions: Web app running at localhost:8085 with Godot ready
    Steps:
      1. Open app and wait for bridge ready signal
      2. Execute window.GodotBridge.show_3d_model_from_url(...) in page context
      3. Assert no missing-method error and model load pathway invoked
      4. Capture screenshot .sisyphus/evidence/task-3-web-3d-call.png
    Expected Result: 3D method callable via unified registration
    Failure Indicators: undefined method on window.GodotBridge
    Evidence: .sisyphus/evidence/task-3-web-3d-call.png

  Scenario: Alias compatibility for camelCase/snake_case
    Tool: Playwright (playwright skill)
    Preconditions: Bridge registered with alias policy
    Steps:
      1. Invoke both set_3d_camera_distance and set3DCameraDistance (if supported alias)
      2. Assert both execute equivalent behavior
      3. Save console capture to .sisyphus/evidence/task-3-alias-compat.log
    Expected Result: Legacy naming remains functional
    Failure Indicators: One alias path fails while canonical works
    Evidence: .sisyphus/evidence/task-3-alias-compat.log
  ```

  **Commit**: YES
  - Message: `refactor(godot-bridge): unify web and native method registration`

- [x] 4. Migrate 3D Bridge Methods to Module-Owned Convention Handlers

  **What to do**:
  - Move/align current 3D bridge methods to dedicated module handlers that satisfy convention.
  - Ensure `Viewport3D` operations are routed through canonical registry (not ad hoc inline callbacks).
  - Keep all existing 3D method names working.

  **Must NOT do**:
  - Do not alter 3D behavior semantics while migrating registration shape.
  - Do not add new 3D features beyond existing API surface in this phase.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `game-authoring`, `systematic-debugging`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: not applicable to core bridge routing.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: 8
  - **Blocked By**: 1, 2, 3

  **References**:
  - `godot_project/scripts/GameBridge.gd` - current 3D method entries.
  - `godot_project/scripts/3d/Viewport3D.gd` - 3D operational API.
  - `docs/godot/3d-rendering.md` - expected usage and behavior references.

  **Acceptance Criteria**:
  - [ ] All current 3D methods resolve through convention-based module registration.
  - [ ] No duplicate 3D registration sections remain in GameBridge setup.
  - [ ] Existing 3D commands still produce expected side effects.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: 3D model load and rotate after migration
    Tool: Playwright (playwright skill)
    Preconditions: Web runtime loaded with bridge ready
    Steps:
      1. Call show_3d_model_from_url with valid GLB test URL
      2. Wait for 3D viewport render readiness signal
      3. Call rotate_3d_model(0,45,0)
      4. Capture screenshot .sisyphus/evidence/task-4-3d-rotate.png
    Expected Result: Model appears and rotation call succeeds
    Failure Indicators: Method-not-found or no render update
    Evidence: .sisyphus/evidence/task-4-3d-rotate.png

  Scenario: Invalid 3D payload handling
    Tool: Playwright (playwright skill)
    Preconditions: Bridge online
    Steps:
      1. Invoke rotate_3d_model with non-numeric args
      2. Assert structured error/warning emitted (not silent crash)
      3. Save logs to .sisyphus/evidence/task-4-3d-invalid-args.log
    Expected Result: Graceful validation failure path
    Failure Indicators: runtime crash or silent no-op without diagnostics
    Evidence: .sisyphus/evidence/task-4-3d-invalid-args.log
  ```

  **Commit**: YES
  - Message: `refactor(godot-3d): route 3d bridge calls through module registry`

- [x] 5. Build Regression Verification Harness for Bridge API

  **What to do**:
  - Add/extend automated bridge smoke checks for a representative API set.
  - Include verification for both happy and failure paths.
  - Ensure checks can run repeatedly during migration waves.

  **Must NOT do**:
  - Do not require manual tapping/clicking by human.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `verification-before-completion`, `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 8
  - **Blocked By**: 0

  **References**:
  - `app/lib/godot/debug/GodotDebugBridge.ts` - query and bridge debug patterns.
  - `docs/godot/WEB_INPUT_HANDLING.md` - existing validation pathways.

  **Acceptance Criteria**:
  - [ ] Harness validates at least one call from each major bridge category.
  - [ ] Harness includes unknown-method and invalid-args negative checks.
  - [ ] Harness outputs machine-readable pass/fail summary.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Smoke matrix execution
    Tool: Bash
    Preconditions: Runtime available
    Steps:
      1. Run bridge smoke suite command
      2. Assert all required categories report PASS
      3. Save output to .sisyphus/evidence/task-5-smoke-matrix.txt
    Expected Result: PASS for baseline method set
    Failure Indicators: Missing category or category-level failure
    Evidence: .sisyphus/evidence/task-5-smoke-matrix.txt

  Scenario: Unknown method contract
    Tool: Bash
    Preconditions: Runtime available
    Steps:
      1. Call dispatch with intentionally unknown method key
      2. Assert structured error payload/log shape
      3. Save to .sisyphus/evidence/task-5-unknown-method.log
    Expected Result: deterministic error contract returned
    Failure Indicators: crash or unstructured null return
    Evidence: .sisyphus/evidence/task-5-unknown-method.log
  ```

  **Commit**: YES
  - Message: `test(godot-bridge): add regression smoke harness for bridge api`

- [x] 6. Add Structured Error Model + Input Guardrails for Dispatch

  **What to do**:
  - Standardize dispatch error payload/logging (unknown method, arity mismatch, parse errors).
  - Add central arg parsing utility and consistent conversion behavior.
  - Ensure errors surface similarly across native and web dispatch flows.

  **Must NOT do**:
  - Do not swallow parse/type errors silently.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`, `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 4)
  - **Blocks**: 8
  - **Blocked By**: 2

  **References**:
  - `godot_project/scripts/GameBridge.gd` - `native_dispatch` parsing and error points.
  - `app/lib/godot/GodotBridge.native.ts` - caller expectations for return/error behavior.

  **Acceptance Criteria**:
  - [ ] Invalid JSON args path returns deterministic error model.
  - [ ] Unknown method returns deterministic error model.
  - [ ] Arity/type mismatch emits method-specific diagnostic message.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Invalid JSON in native dispatch
    Tool: Bash
    Preconditions: Runtime supports dispatch invocation path
    Steps:
      1. Send malformed args_json into native_dispatch route
      2. Assert structured parse error result
      3. Capture log in .sisyphus/evidence/task-6-json-parse-error.log
    Expected Result: parse failure is explicit and non-crashing
    Failure Indicators: crash, empty response, or ambiguous null
    Evidence: .sisyphus/evidence/task-6-json-parse-error.log

  Scenario: Arity mismatch diagnostics
    Tool: Bash
    Preconditions: Runtime online
    Steps:
      1. Call known method with too few args
      2. Assert error includes method name and expected/received count
      3. Save to .sisyphus/evidence/task-6-arity-mismatch.log
    Expected Result: actionable validation diagnostics
    Failure Indicators: generic warning without method detail
    Evidence: .sisyphus/evidence/task-6-arity-mismatch.log
  ```

  **Commit**: YES
  - Message: `fix(godot-bridge): add structured dispatch errors and arg guardrails`

- [x] 7. Add Bridge Registry Observability (Dev Diagnostics)

  **What to do**:
  - Emit startup registry summary (method -> module owner, aliases).
  - Provide query/debug hook for listing registered bridge methods at runtime.
  - Include conflict and override visibility.

  **Must NOT do**:
  - Do not spam logs in production mode.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `game-authoring`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: 8
  - **Blocked By**: 2

  **References**:
  - `godot_project/scripts/GameBridge.gd` - startup lifecycle and diagnostics.
  - `godot_project/scripts/bridge/debug/DebugBridge.gd` - debug exposure patterns.

  **Acceptance Criteria**:
  - [ ] Dev startup prints registry summary with counts.
  - [ ] Runtime query returns current registered methods and owners.
  - [ ] Override/collision events are visible in diagnostics output.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Registry summary visibility
    Tool: Bash
    Preconditions: Dev runtime boot
    Steps:
      1. Start runtime in dev mode
      2. Capture startup output
      3. Assert summary includes total methods and 3D method entries
      4. Save to .sisyphus/evidence/task-7-registry-summary.log
    Expected Result: discoverable and accurate registry diagnostics
    Failure Indicators: no summary or missing method owners
    Evidence: .sisyphus/evidence/task-7-registry-summary.log
  ```

  **Commit**: YES
  - Message: `chore(godot-bridge): add registry diagnostics for method ownership`

- [x] 8. Final Regression, Cleanup, and Documentation Handoff

  **What to do**:
  - Execute full smoke matrix + targeted 3D scenarios after all changes.
  - Remove obsolete duplicate registration code paths once parity is verified.
  - Update docs on how to add bridge methods with new convention.

  **Must NOT do**:
  - Do not remove fallback paths before final regression passes.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential finalization
  - **Blocks**: None
  - **Blocked By**: 3, 4, 5, 6, 7

  **References**:
  - `godot_project/scripts/GameBridge.gd` - final unified registration source.
  - `docs/godot/3d-rendering.md` - user-facing 3D bridge usage.
  - `app/lib/godot/types.ts` - API contract reference.

  **Acceptance Criteria**:
  - [ ] Full smoke matrix passes with no compatibility regressions.
  - [ ] 3D baseline scenarios pass through unified registry.
  - [ ] Duplicate manual registration blocks removed or clearly marked deprecated fallback.
  - [ ] Updated docs describe adding a new bridge method in one place.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Full compatibility regression pass
    Tool: Bash
    Preconditions: All prior tasks complete
    Steps:
      1. Run complete bridge smoke suite
      2. Run focused 3D suite
      3. Aggregate results into .sisyphus/evidence/task-8-final-regression.txt
    Expected Result: all required checks PASS
    Failure Indicators: any baseline method regression
    Evidence: .sisyphus/evidence/task-8-final-regression.txt

  Scenario: Documentation-driven method add dry-run
    Tool: Bash
    Preconditions: Updated docs present
    Steps:
      1. Follow new docs to add a temporary test method in one module
      2. Assert method auto-appears in registry output
      3. Remove temp method and confirm clean state
      4. Save outputs to .sisyphus/evidence/task-8-docs-dry-run.log
    Expected Result: one-place method add workflow validated
    Failure Indicators: requires edits in multiple registration blocks
    Evidence: .sisyphus/evidence/task-8-docs-dry-run.log
  ```

  **Commit**: YES
  - Message: `docs(godot-bridge): document convention-based bridge extension workflow`

- [x] 9. Research & Propose Automated Godot WASM↔TS Bridge E2E Tests (Web-only, Node-only, No Browser/Playwright)

  **What to do**:
  - Investigate **Node-only** test harness options that exercise real Godot WASM ↔ TypeScript bridge calls **without any browser runtime** and **without Playwright**.
  - Allow lightweight DOM/window shims if required by Godot WASM glue, but **no full browser runtime**.
  - Identify at least 2 viable approaches with pros/cons, CI feasibility, and maintenance cost.
  - Propose a recommended approach and a minimal proof-of-concept plan.
  - Document how this would validate the full **web** bridge contract (WASM ↔ TS).

  **Must NOT do**:
  - Do not require Playwright or any UI browser automation framework.
  - Do not require a browser runtime at all (Node-only constraint).
  - Do not assume manual steps; the goal is fully automated.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: cross-runtime test strategy with integration complexity.
  - **Skills**: `game-authoring`, `context7-auto-research`, `systematic-debugging`
    - `game-authoring`: bridge architecture grounding
    - `context7-auto-research`: authoritative docs for Godot headless/web export & testing
    - `systematic-debugging`: rigorous validation of feasibility
  - **Skills Evaluated but Omitted**:
    - `playwright`: explicitly excluded

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (can run alongside Task 8 if docs/testing don’t conflict)
  - **Blocks**: None
  - **Blocked By**: 3, 4, 5, 6, 7

  **References**:
  - `godot_project/README.md` - web export details and runtime constraints.
  - `app/lib/godot/GodotBridge.web.ts` - web bridge call surface.
  - `app/lib/godot/GodotBridge.native.ts` - note as out-of-scope for this task.
  - `docs/godot/WEB_INPUT_HANDLING.md` - JS↔Godot event flow.

  **Acceptance Criteria**:
  - [ ] Written proposal (doc) describing 2+ automated test strategies without Playwright.
  - [ ] Includes CI feasibility, setup steps, and limitations.
  - [ ] Recommends one approach with a minimal POC outline.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Feasibility validation (web export)
    Tool: Bash
    Preconditions: Godot web export available or buildable in CI
    Steps:
      1. Run proposed test harness to load WASM headlessly
      2. Invoke at least one bridge method programmatically
      3. Assert expected response in logs or output JSON
      4. Save outputs to .sisyphus/evidence/task-9-wasm-bridge-harness.log
    Expected Result: Harness proves real WASM ↔ TS call flow without UI automation
    Failure Indicators: Requires manual browser or Playwright to function
    Evidence: .sisyphus/evidence/task-9-wasm-bridge-harness.log
  ```

  **Commit**: YES
  - Message: `docs(testing): propose automated godot wasm↔ts bridge e2e strategy`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 2 | `refactor(godot-bridge): auto-register bridge methods by convention` | `godot_project/scripts/GameBridge.gd`, module handlers | bridge smoke subset |
| 3 | `refactor(godot-bridge): unify web and native method registration` | `godot_project/scripts/GameBridge.gd` | web + native call parity checks |
| 5 | `test(godot-bridge): add regression smoke harness for bridge api` | verification harness files | smoke suite run |
| 6 | `fix(godot-bridge): add structured dispatch errors and arg guardrails` | dispatch/parsing files | negative scenarios |
| 8 | `docs(godot-bridge): document convention-based bridge extension workflow` | docs + cleanup | full regression |

---

## Success Criteria

### Verification Commands

```bash
# Bridge contract regression
<run bridge smoke suite command>   # Expected: PASS matrix

# 3D route verification
<run 3d bridge scenario command>   # Expected: PASS 3D scenarios

# Registry diagnostics
<run registry dump command>        # Expected: canonical + alias entries shown
```

### Final Checklist
- [ ] All Must Have items are present.
- [ ] All Must NOT Have items are absent.
- [ ] Existing TS callers function without mandatory call-site rewrites.
- [ ] 3D additions no longer require duplicate map edits in `GameBridge.gd`.
- [ ] Native + web registration derive from one canonical registry.
- [ ] Error handling for unknown/invalid method invocations is deterministic.

---

## Defaults Applied

- Canonical internal bridge names default to **snake_case**.
- Web compatibility defaults to exposing alias resolution for existing caller casing where needed.
- Migration defaults to **incremental** with fallback compatibility retained until final regression passes.
- Schema/codegen work is scoped as **Phase 2 follow-up**, not blocking this phase.
