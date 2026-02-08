# Composable GPU Effects System (Holistic Design + Feedback Core)

## TL;DR

> **Quick Summary**: Build a parity-first (web+mobile) composable effects pipeline in Godot with a linear pass model, then implement persistent feedback (ping-pong) as the first execution milestone.
>
> **Deliverables**:
> - Unified `EffectPipeline` spec (sprite + screen passes)
> - Godot runtime executor with lifecycle controls (`start/pause/resume/stop`)
> - Feedback core (persistent multi-frame evolution via ping-pong textures)
> - Performance budget/degradation manager for web+mobile
> - Legacy API adapters + AI-facing effect templates/library
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Contract/validator -> Executor -> Feedback core -> Budget/degradation -> Adapters

---

## Context

### Original Request
Design a complete composable GPU effects architecture for an AI game maker: arbitrary shader code/inputs, ordered composable effects (sprite + fullscreen), multi-frame evolution, start/stop/resume, snapshots, and easy engine-side manipulation.

### Interview Summary
**Key Decisions**:
- Holistic system design first; implementation after design is validated.
- Execution priority after design: feedback core first.
- V1 must target **web + mobile parity**.
- Test strategy: **tests-after** plus detailed agent-executed QA scenarios.

**Recent Debug Context**:
- Paint prototype previously reverted when stopping shader due to non-persistent effect model.
- Also fixed effect targeting bug where hidden `Polygon2D` was selected before visible `Sprite2D`.

### Metis/Oracle Review Incorporated
**Metis gaps addressed**:
- Explicit shader input contract required.
- Start/stop/resume semantics must be deterministic.
- Snapshot format and GPU budget policy must be first-class.
- Scope creep locked (no full DAG/compositor fusion in V1).

**Oracle architecture recommendation adopted**:
- V1 = **linear ordered pipeline** (not general graph): `spritePasses[]` + `screenPasses[]`.
- Feedback core = per-pass optional ping-pong persistent RT.
- Legacy APIs remain as compatibility adapters.

---

## Work Objectives

### Core Objective
Establish a reusable, AI-composable, parity-safe GPU effects platform in Slopcade that supports deterministic multi-frame evolution and layered post/sprite effects without breaking existing APIs.

### Concrete Deliverables
- `EffectPassSpec` / `EffectPipelineSpec` types and validator in shared types.
- Godot-side linear pass executor for sprite and screen chains.
- Feedback core with ping-pong RT and lifecycle reset modes.
- Budget/degradation policy engine (pass caps, resolution scaling, cadence throttling).
- Snapshot capture/restore APIs.
- Legacy bridge adapter layer mapping current calls to pipeline specs.
- Starter composable library presets (bloom/pixelate/tilt-shift/blur combos).

### Definition of Done
- [x] Pipeline specs validate deterministically (invalid shaders/uniform contracts fail fast).
- [x] Persistent feedback effect continues evolving and **does not revert** on stop unless explicit reset mode is requested.
- [x] Existing APIs (`applyDynamicShader`, `setPostEffect`, etc.) work via adapter with no regression.
- [x] Web+mobile parity scenarios pass within configured pass budgets.

### Must Have
- Deterministic lifecycle semantics (`start`, `pause`, `resume`, `stop`, `reset`).
- Explicit pass contract (declared samplers/uniforms only).
- Agent-verifiable performance degradation under budget pressure.

### Must NOT Have (Guardrails)
- No general DAG/branching graph execution in V1.
- No compute-shader dependency for V1 core path.
- No per-frame mandatory CPU readback.
- No breaking changes to existing public effect bridge methods.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> All verification in this plan is agent-executed via Playwright, curl, tmux, or inspector tooling.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: Existing repo test/build setup + targeted tests for new modules

### Agent-Executed QA Scenarios (applies to every task)
- Each task includes at least one happy path and one negative/failure path.
- Evidence saved under `.sisyphus/evidence/`.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundational contracts, can start immediately)
- Task 1: Pipeline/pass contract + validator
- Task 2: Performance budget policy contract

Wave 2 (Runtime core)
- Task 3: Linear executor (sprite + screen passes)
- Task 4: Feedback core (ping-pong persistence + lifecycle semantics)

Wave 3 (Compatibility + state)
- Task 5: Legacy API adapter layer
- Task 6: Snapshot capture/restore subsystem

Wave 4 (AI-composable surface + hardening)
- Task 7: Composable preset library + metadata registry extension
- Task 8: End-to-end parity/perf test harness and rollout gates

Critical Path: 1 -> 3 -> 4 -> 5 -> 8

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3,4,5,7 | 2 |
| 2 | None | 8 | 1 |
| 3 | 1 | 4,5,6 | none |
| 4 | 1,3 | 5,6,8 | none |
| 5 | 1,3,4 | 8 | 6 |
| 6 | 3,4 | 8 | 5 |
| 7 | 1 | 8 | 6 |
| 8 | 2,4,5,6,7 | None | none |

---

## TODOs

- [x] 1. Define `EffectPassSpec` and `EffectPipelineSpec` + validator

  **What to do**:
  - Add shared types for ordered sprite/screen pass chains, declared uniforms/samplers, persistence mode, quality tier.
  - Add validator that rejects undeclared inputs, illegal ordering, and unsupported pass settings for parity targets.

  **Must NOT do**:
  - Do not introduce DAG branching in V1 schema.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring`, `writing-plans`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 3,4,5,7
  - **Blocked By**: None

  **References**:
  - `shared/src/types/effects.ts` - existing effect metadata conventions to extend.
  - `shared/src/systems/slots/types.ts` - contract/implementation pattern.
  - `api/src/ai/pipeline/executor.ts` - linear stage execution pattern.

  **Acceptance Criteria**:
  - [x] Invalid spec with undeclared sampler fails validation.
  - [x] Valid linear spec serializes/deserializes with stable ordering.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Reject undeclared sampler
    Tool: Bash (test command)
    Steps:
      1. Run validator test with pass referencing sampler "historyTex" not declared in spec
      2. Assert test exits 0 and expects validation error code `E_UNDECLARED_SAMPLER`
    Expected Result: Validation failure is deterministic and explicit
    Evidence: .sisyphus/evidence/task-1-undeclared-sampler.txt

  Scenario: Accept canonical linear spec
    Tool: Bash (test command)
    Steps:
      1. Run test fixture for `spritePasses=[tint,blur]`, `screenPasses=[bloom]`
      2. Assert validator returns success and preserves order
    Expected Result: Contract accepted with stable order
    Evidence: .sisyphus/evidence/task-1-valid-linear-spec.txt
  ```

- [x] 2. Define budget/degradation policy contract

  **What to do**:
  - Create policy tiers for web/mobile parity (pass caps, resolution scaling, cadence).
  - Define deterministic degradation order (`optional` pass drop rules).

  **Must NOT do**:
  - No heuristic-only hidden behavior; policy must be declarative and inspectable.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `writing-plans`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 8
  - **Blocked By**: None

  **References**:
  - `godot_project/scripts/effects/EffectsManager.gd` - current layered post model and pass cost implications.
  - Oracle recommendation (session `ses_3c5785edfffePD8D4492K3ziE3`) - parity-first pass cap guidance.

  **Acceptance Criteria**:
  - [x] Policy outputs deterministic sequence for overload (scale -> cadence -> drop optional).
  - [x] Required passes are never dropped.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Over-budget policy chooses deterministic ladder
    Tool: Bash (test command)
    Steps:
      1. Load fixture with 9 optional passes on `mobile-low` tier
      2. Execute policy resolver
      3. Assert actions ordered: scale resolution -> reduce cadence -> drop optional by priority
    Expected Result: Identical output plan on repeated runs
    Evidence: .sisyphus/evidence/task-2-policy-determinism.txt

  Scenario: Required pass is protected
    Tool: Bash (test command)
    Steps:
      1. Load fixture where required pass exceeds budget pressure
      2. Execute resolver
      3. Assert required pass retained and optional pass removed first
    Expected Result: Required pass survives
    Evidence: .sisyphus/evidence/task-2-required-protection.txt
  ```

- [x] 3. Implement linear pipeline executor (sprite + screen)

  **What to do**:
  - Add Godot executor that runs ordered pass chains and binds declared inputs only.
  - Maintain separate sprite and fullscreen pipelines with explicit order.

  **Must NOT do**:
  - No graph scheduler in V1.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 4,5,6
  - **Blocked By**: 1

  **References**:
  - `godot_project/scripts/effects/EffectsManager.gd` - current sprite/post execution behavior.
  - `godot_project/scripts/effects/GameBridgeEffects.gd` - bridge callback registration and effect dispatch.

  **Acceptance Criteria**:
  - [x] Ordered chain execution produces different output when order changes.
  - [x] Invalid pass binding fails with structured error.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Pass ordering affects output deterministically
    Tool: Playwright
    Steps:
      1. Apply chain A: bloom -> blur to test scene
      2. Capture screenshot A
      3. Apply chain B: blur -> bloom
      4. Capture screenshot B
      5. Assert A and B are visually different beyond epsilon
    Expected Result: Order semantics are respected
    Evidence: .sisyphus/evidence/task-3-order-diff.png

  Scenario: Invalid sampler binding fails fast
    Tool: Bash (test command)
    Steps:
      1. Execute executor with missing bound sampler required by pass
      2. Assert structured error code is returned
    Expected Result: No silent fallback
    Evidence: .sisyphus/evidence/task-3-invalid-binding.txt
  ```

- [x] 4. Implement feedback core (persistent ping-pong render targets)

  **What to do**:
  - Add per-pass optional persistence mode with ping-pong textures.
  - Implement lifecycle semantics: `start` (init), `pause` (freeze), `resume` (continue), `stop` (freeze/clear configurable), `reset` (clear state).

  **Must NOT do**:
  - Do not depend on CPU readback loop for evolution.

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
  - **Skills**: `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 5,6,8
  - **Blocked By**: 1,3

  **References**:
  - `godot_project/scripts/bridge/PixelBufferManager.gd` - texture update behavior and canvas source constraints.
  - `godot_project/scripts/effects/EffectsManager.gd` - dynamic shader application hooks.
  - Librarian findings (`ses_3c57ce6ecffeV3EFL9T7yPmtBu`) - ping-pong best practices and pitfalls.

  **Acceptance Criteria**:
  - [x] Persistent mode continues evolving and does not revert when stopped (freeze last frame).
  - [x] Reset mode deterministically returns to initial state.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Stop preserves evolved frame
    Tool: Playwright
    Preconditions: paint example with feedback-enabled pipeline
    Steps:
      1. Navigate to http://localhost:8085/examples/paint
      2. Draw stroke set A on canvas
      3. Click Start
      4. Wait 2000ms
      5. Capture screenshot A
      6. Click Stop
      7. Capture screenshot B
      8. Assert visual diff(A,B) <= small epsilon (freeze semantics)
    Expected Result: Stop does not snap back to original input
    Evidence: .sisyphus/evidence/task-4-stop-freeze.png

  Scenario: Reset returns to baseline
    Tool: Playwright
    Steps:
      1. Run effect for 2s
      2. Trigger reset action
      3. Assert framebuffer equals baseline snapshot
    Expected Result: Deterministic reset
    Evidence: .sisyphus/evidence/task-4-reset-baseline.png
  ```

- [x] 5. Add legacy bridge adapter layer

  **What to do**:
  - Route current APIs (`applyDynamicShader`, `setPostEffect`, etc.) through adapter that emits pipeline specs.
  - Preserve existing call signatures and default behaviors.

  **Must NOT do**:
  - Do not break existing examples.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `git-master`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: 8
  - **Blocked By**: 1,3,4

  **References**:
  - `app/lib/godot/GodotBridge.web.ts` - existing method surface and behavior.
  - `app/lib/godot/GodotBridge.native.ts` - parity behavior for native bridge calls.

  **Acceptance Criteria**:
  - [x] Existing dynamic shader example still works via adapter path.
  - [x] Existing post-effect calls map to screen pass chain without API changes.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Legacy dynamic shader API remains functional
    Tool: Playwright
    Steps:
      1. Navigate to /examples/dynamic_shader
      2. Click "Compile & Apply"
      3. Assert success status text is visible
    Expected Result: Legacy API path still works
    Evidence: .sisyphus/evidence/task-5-legacy-dynamic-shader.png

  Scenario: Legacy post effect call adapter mapping
    Tool: Bash (integration test)
    Steps:
      1. Invoke legacy post effect API in harness
      2. Assert generated internal pipeline spec contains equivalent screen pass
    Expected Result: One-to-one mapping preserved
    Evidence: .sisyphus/evidence/task-5-adapter-map.txt
  ```

- [x] 6. Implement snapshot capture/restore subsystem

  **What to do**:
  - Add explicit async capture points (pipeline output + optional pass outputs).
  - Add restore API for persistent state and parameter state.

  **Must NOT do**:
  - No implicit every-frame readback.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 8
  - **Blocked By**: 3,4

  **References**:
  - `godot_project/scripts/effects/GameBridgeEffects.gd` - bridge pattern for returning async results.
  - Metis guidance (`ses_3c5799d08ffetR5mxKJZ72PIks`) - snapshot edge cases.

  **Acceptance Criteria**:
  - [x] Capture/restore roundtrip reproduces expected visual state within tolerance.
  - [x] Concurrent capture requests are serialized or rejected deterministically.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Snapshot roundtrip parity
    Tool: Playwright
    Steps:
      1. Start feedback effect and run 2 seconds
      2. Capture snapshot S1
      3. Continue 1 second and mutate params
      4. Restore S1
      5. Capture screenshot R and compare with S1 baseline
    Expected Result: Restored frame matches baseline within tolerance
    Evidence: .sisyphus/evidence/task-6-roundtrip.png

  Scenario: Concurrent capture safety
    Tool: Bash (integration test)
    Steps:
      1. Fire 3 snapshot requests in parallel
      2. Assert queue/lock semantics enforce deterministic completion order or rejection codes
    Expected Result: No race corruption
    Evidence: .sisyphus/evidence/task-6-concurrency.txt
  ```

- [x] 7. Build AI-composable preset library + registry extensions

  **What to do**:
  - Extend effect metadata/registry with composable presets and constraints.
  - Include canonical preset chains (e.g., bloom+pixelate+tilt-shift+blur) with quality tiers.

  **Must NOT do**:
  - No ad hoc preset definitions outside shared registry.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `writing-plans`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 8
  - **Blocked By**: 1

  **References**:
  - `shared/src/types/effects.ts` - existing effect metadata schema.
  - AI pipeline pattern in `api/src/ai/pipeline/` - registry/contract consistency.

  **Acceptance Criteria**:
  - [x] Presets validate against pipeline contract.
  - [x] Presets specify degradation behavior for each tier.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Preset contract validation
    Tool: Bash (test command)
    Steps:
      1. Run validation across all preset definitions
      2. Assert zero invalid presets
    Expected Result: Library is contract-safe
    Evidence: .sisyphus/evidence/task-7-preset-validation.txt

  Scenario: Degradation metadata presence
    Tool: Bash (lint/test)
    Steps:
      1. Check all presets include tier/degrade settings
      2. Assert no missing policy fields
    Expected Result: Every preset parity-ready
    Evidence: .sisyphus/evidence/task-7-degrade-metadata.txt
  ```

- [x] 8. Build parity/performance test harness and rollout gates

  **What to do**:
  - Add automated scenarios for web+mobile parity, lifecycle correctness, and performance thresholds.
  - Add rollout gates to block default switch until adapter parity passes.

  **Must NOT do**:
  - No manual-only approval criteria.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `playwright`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 final
  - **Blocks**: None
  - **Blocked By**: 2,4,5,6,7

  **References**:
  - `app/app/examples/paint.tsx` - concrete lifecycle behavior regression source.
  - `app/app/examples/dynamic_shader.tsx` - dynamic compile/apply baseline.

  **Acceptance Criteria**:
  - [x] Web/mobile visual parity within defined tolerance for canonical presets.
  - [x] Over-budget scenarios trigger deterministic degradation ladder.
  - [x] Legacy API compatibility test suite passes.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Canonical preset parity matrix
    Tool: Playwright + platform test harness
    Steps:
      1. Execute canonical presets on web and mobile test scenes
      2. Capture screenshots for each platform/preset pair
      3. Compute diff metric and assert <= configured tolerance
    Expected Result: Visual parity acceptable across platforms
    Evidence: .sisyphus/evidence/task-8-parity-matrix.json

  Scenario: Budget overload regression
    Tool: Bash (integration benchmark)
    Steps:
      1. Run overload case above pass cap
      2. Assert degradation ladder events emitted in expected sequence
      3. Assert frame-time returns below budget threshold
    Expected Result: Graceful deterministic degradation
    Evidence: .sisyphus/evidence/task-8-budget-overload.txt
  ```

---

## Commit Strategy

| After Task Group | Message | Verification |
|------------------|---------|--------------|
| Wave 1 | `feat(effects): add composable pipeline contracts and budgets` | contract tests |
| Wave 2 | `feat(effects): add linear executor and feedback core` | lifecycle + persistence tests |
| Wave 3 | `feat(effects): add adapter and snapshot subsystems` | compatibility + snapshot tests |
| Wave 4 | `feat(effects): add presets and parity harness` | e2e parity/perf suite |

---

## Success Criteria

### Verification Commands
```bash
pnpm tsc --noEmit
pnpm test
pnpm --filter @slopcade/app test
```

### Final Checklist
- [x] Persistent feedback stop behavior matches freeze semantics by default.
- [x] Reset behavior is explicit and deterministic.
- [x] Composable ordering is deterministic and validated.
- [x] Budget/degradation behavior is deterministic and observable.
- [x] Legacy effect APIs remain functional through adapter layer.
- [x] Web+mobile parity baseline passes for canonical preset library.
