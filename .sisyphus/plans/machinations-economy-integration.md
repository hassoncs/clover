# Machinations-Like Economy Integration for Slopcade

## TL;DR

> **Quick Summary**: Add a first-class, deterministic economy graph system to Slopcade that integrates directly into AI game generation, shared schema validation, and runtime execution. Ship headless simulator + validator first, then add analysis jobs and optional editor-facing tooling.
>
> **Deliverables**:
> - new shared workspace package: `packages/economy-engine` (`@slopcade/economy-engine`)
> - `economy` graph DSL exported from package and consumed by API + app
> - deterministic economy simulator + validator in package
> - runtime `EconomyRuntimeSystem` integrated with game loop and rules bridge
> - API validation + generation integration + simulation jobs (Monte Carlo/sensitivity)
> - tests, fixtures, and evidence-driven QA scenarios
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 5 -> Task 7 -> Task 9

---

## Context

### Original Request
Build a Machinations-like economy design system architecture and execution plan for Slopcade, including how it fits the current AI generation pipeline, runtime, and practical near-term integration strategy.

### Interview Summary
**Key Discussions**:
- Goal is platform integration (not isolated tooling): economy modeling must fit Slopcade's existing game builder and AI generation workflows.
- Must support graph dynamics (nodes + edges + formulas + feedback) with deterministic simulation behavior.
- Plan should be executable now in the current monorepo architecture and aligned with existing patterns.

**Research Findings**:
- AI generation path anchored by `api/src/ai/game/generator.ts`, `api/src/ai/game/schemas.ts`, and `api/src/trpc/routes/games.ts`.
- Runtime extension point is `app/lib/game-engine/systems/runner/GameSystemRunner.ts` + wrapper systems under `app/lib/game-engine/systems/runner/wrappers`.
- Strong graph precedent exists in effects subsystem (`shared/src/effects/types.ts`, `shared/src/effects/validator.ts`).
- Async job orchestration precedent exists in `api/src/trpc/routes/asset-system/generation-jobs.ts`.
- Test infrastructure exists (Vitest in root/api/app).

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Missing explicit tick semantics resolved: economy uses fixed-step deterministic ticks independent from variable frame dt.
- Missing scope guardrails resolved: MVP excludes full visual editor and custom user-defined node scripting.
- Missing acceptance criteria resolved: every task includes executable checks + agent-run QA scenarios.
- Missing edge-case handling resolved: deadlocks, cycles, overflow, and determinism checks are explicit validator targets.

---

## Work Objectives

### Core Objective
Introduce a deterministic, graph-based economy layer as a first-class optional capability in Slopcade, implemented as its own workspace package so AI generation (API) and runtime (app) share one engine and one contract.

### Package Strategy
- Create `packages/economy-engine` and publish internally as `@slopcade/economy-engine`.
- Package owns: types, zod schema, simulator, validator, analysis helpers, test fixtures.
- API (`@slopcade/api`) imports package for generation-time validation and simulation jobs.
- App (`slopcade`) imports package for runtime system integration.
- `shared` remains the canonical game definition surface, but economy-specific logic is delegated to package exports.
- Keep package framework-agnostic (no React/Expo/Cloudflare bindings), enabling reuse in tests, jobs, and future tooling.

### Library Strategy (Write vs Buy)
- **Default approach**: hybrid. Build domain logic ourselves, use small focused libraries for commodity pieces.
- **Use libraries for**:
  - expression parsing/evaluation (e.g., `expr-eval` already present in app deps)
  - graph algorithms (cycle/SCC/topological helpers via lightweight utility or existing internal patterns)
  - schema/runtime validation (`zod`, already in stack)
- **Build ourselves for**:
  - economy node semantics (source/drain/pool/gate/converter behavior)
  - synchronous tick scheduling and transfer resolution
  - Slopcade-specific rules/runtime bridge and analysis metrics
- **Why**: npm packages reduce boilerplate for parsing/graph utilities, but core economy semantics are product-defining and must be deterministic, testable, and tightly integrated.

### Machinations Scope Coverage (MVP vs Later)
- **MVP implemented now**:
  - Core nodes: source, drain, pool, gate, converter
  - Resource and state connections needed for deterministic simulation
  - Synchronous ticks, seeded stochastic routing, validation, Monte Carlo basics
- **Explicitly deferred (later phases)**:
  - trader node and richer exchange mechanics
  - full visual editor and collaborative graph editing
  - advanced equilibrium solvers and auto-balancing optimization loops
  - broad UX tooling around design-time graph authoring
- **Rationale**: captures most balancing value early while minimizing implementation risk and avoiding scope explosion.

### Concrete Deliverables
- `packages/economy-engine` workspace package with stable exports.
- Economy simulator with synchronous tick evaluation and reproducible seeded execution (inside package).
- Economy validator with structural, semantic, and risk warnings.
- Runtime economy system integrated into system runner and rules bridge.
- API-side generation/validation updates and simulation job endpoints.
- Monte Carlo + sensitivity analysis outputs for balancing insights.

### Definition of Done
- [ ] `pnpm --filter @slopcade/shared test` passes with new economy unit suites.
- [ ] `pnpm --filter @slopcade/api test:run` passes with economy route/integration tests.
- [ ] `pnpm --filter slopcade test` passes with runtime economy integration tests.
- [ ] End-to-end API simulation job run completes and returns analysis artifacts.

### Must Have
- Deterministic, synchronous tick semantics with seeded RNG.
- Economy implementation isolated into a reusable workspace package consumed by API + app.
- No regression to existing non-economy game generation and runtime flows.
- Economy feature optional in `GameDefinition` and backwards-compatible.

### Must NOT Have (Guardrails)
- No mandatory visual economy editor in MVP.
- No custom user-authored runtime scripts inside economy node execution.
- No new unrelated persistence systems when existing job and artifact patterns suffice.
- No human-only manual acceptance criteria.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: TDD
- **Framework**: Vitest (`pnpm test`, workspace-level test scripts)

### If TDD Enabled

Each implementation task follows RED-GREEN-REFACTOR:
1. RED: add failing test in shared/api/app workspace.
2. GREEN: implement minimal passing behavior.
3. REFACTOR: clean internals while preserving green tests.

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Each task below includes concrete scenarios with exact command/tool and expected artifacts.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1 (economy DSL + schema)
- Task 4 (sim job contract + artifact output format)

Wave 2 (After Wave 1):
- Task 2 (simulator engine)
- Task 5 (API validation integration)

Wave 3 (After Wave 2):
- Task 3 (runtime EconomyRuntimeSystem)
- Task 6 (AI generation integration)
- Task 8 (Monte Carlo + sensitivity executor)

Wave 4 (After Wave 3):
- Task 7 (rules bridge actions/triggers)
- Task 9 (end-to-end test harness + evidence capture)
- Task 10 (documentation + rollout guardrails)

Critical Path: 1 -> 2 -> 3 -> 5 -> 7 -> 9
Parallel Speedup: ~35-45% versus strict sequential execution.

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 2, 5, 6 | 4 |
| 2 | 1 | 3, 8 | 5 |
| 3 | 2 | 7, 9 | 6, 8 |
| 4 | None | 8 | 1 |
| 5 | 1 | 9 | 2 |
| 6 | 1 | 9 | 3, 8 |
| 7 | 3 | 9 | 8 |
| 8 | 2, 4 | 9 | 6, 7 |
| 9 | 3,5,6,7,8 | 10 | None |
| 10 | 9 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 4 | `task(category="unspecified-high", load_skills=["test-driven-development"], run_in_background=false)` |
| 2 | 2, 5 | `task(category="unspecified-high", load_skills=["test-driven-development"], run_in_background=false)` |
| 3 | 3, 6, 8 | `task(category="deep", load_skills=["test-driven-development"], run_in_background=false)` |
| 4 | 7, 9, 10 | `task(category="unspecified-high", load_skills=["verification-before-completion"], run_in_background=false)` |

---

## TODOs

- [x] 1. Define Economy DSL and shared schemas

  **What to do**:
  - Run focused dependency spike and lock library choices (expression + graph utility) with explicit "adopt vs build" rationale.
  - Create `packages/economy-engine` workspace skeleton (`package.json`, tsconfig, src, tests, exports).
  - Add economy graph primitives (`EconomyGraph`, `EconomyNode`, `EconomyEdge`, `EconomyState`) in package.
  - Add package zod schemas and fixture helpers.
  - Extend `GameDefinition` with optional `economy` section using package type/schema references.
  - Add workspace wiring so API/app can import `@slopcade/economy-engine`.

  **Must NOT do**:
  - Do not make `economy` required.
  - Do not couple schema to runtime-only classes.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-workspace schema contract with high blast radius.
  - **Skills**: `test-driven-development`, `verification-before-completion`
    - `test-driven-development`: enforce schema-first tests.
    - `verification-before-completion`: prevent false pass claims.
  - **Skills Evaluated but Omitted**:
    - `brainstorming`: exploration already complete in planning phase.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 4)
  - **Blocks**: 2, 5, 6
  - **Blocked By**: None

  **References**:
  - `packages/game-bundler` - package structure and export conventions to mirror.
  - `packages/theme` - lightweight package organization precedent.
  - `shared/src/types/GameDefinition.ts` - canonical game contract to extend safely.
  - `shared/src/types/schemas.ts` - schema composition patterns and export surface.
  - `shared/src/effects/types.ts` - graph-node-edge type modeling precedent.
  - `shared/src/effects/validator.ts` - graph validation structure precedent.

  **Acceptance Criteria**:
  - [ ] Dependency decision note exists (why chosen/omitted) and is reflected in package implementation.
  - [ ] New schema tests added and initially fail (RED).
  - [ ] `pnpm --filter @slopcade/shared test` passes with new economy schema tests.
  - [ ] Non-economy fixtures remain valid under `GameDefinition` validators.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Valid economy schema fixture passes
    Tool: Bash
    Preconditions: Shared workspace test runner available
    Steps:
      1. Run: pnpm --filter @slopcade/shared test -- economy/schema
      2. Assert output contains: "passed"
      3. Assert exit code: 0
    Expected Result: Economy schema suite passes
    Evidence: Terminal output capture

  Scenario: Invalid graph fixture fails with explicit code
    Tool: Bash
    Preconditions: Invalid fixture includes missing node edge reference
    Steps:
      1. Run targeted validator unit for invalid fixture
      2. Assert error includes code: E_MISSING_NODE_REF
    Expected Result: Validation fails with deterministic error code
    Evidence: Terminal output capture
  ```

  **Commit**: YES
  - Message: `feat(economy-engine): add package and economy graph schema contracts`
  - Files: `packages/economy-engine/*`, `shared/src/types/GameDefinition.ts`, tests
  - Pre-commit: `pnpm --filter @slopcade/shared test -- economy`

- [x] 2. Implement deterministic economy simulator engine in package

  **What to do**:
  - Create `packages/economy-engine/src/simulator.ts` with fixed-step synchronous tick semantics.
  - Implement transfer planning phase + atomic apply phase.
  - Add seeded RNG utility for probabilistic gates.
  - Support minimum MVP node types: source, drain, pool, converter, gate.

  **Must NOT do**:
  - Do not read/write UI state inside simulator.
  - Do not use non-seeded randomness paths.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core algorithmic correctness and determinism constraints.
  - **Skills**: `test-driven-development`, `systematic-debugging`
    - `test-driven-development`: deterministic behavior guarantees.
    - `systematic-debugging`: essential for tick-order edge cases.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: no UI surface in this task.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: 3, 8
  - **Blocked By**: 1

  **References**:
  - `packages/game-bundler/src` - pure TypeScript package implementation style.
  - `shared/src/effects/feedback.ts` - deterministic state progression pattern.
  - `app/lib/game-engine/rules/actions/RunScriptActionExecutor.ts` - seeded random utility precedent.
  - `shared/src/validation/slopeggleValidators.ts` - fast deterministic validation philosophy.

  **Acceptance Criteria**:
  - [ ] Same graph + seed + ticks => byte-identical output snapshots.
  - [ ] Cycle/deadlock safety tests present and passing.
  - [ ] `pnpm --filter @slopcade/shared test -- economy/simulator` passes.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Deterministic replay with fixed seed
    Tool: Bash
    Preconditions: Determinism test exists
    Steps:
      1. Run simulator test suite twice in same process
      2. Assert serialized outputs are equal
    Expected Result: Deterministic equality confirmed
    Evidence: Test output with equality assertion

  Scenario: Deadlock graph halts gracefully
    Tool: Bash
    Preconditions: Deadlock fixture in tests
    Steps:
      1. Run deadlock test case
      2. Assert simulation status = "stalled" (or equivalent)
      3. Assert no throw/crash
    Expected Result: Controlled stall detection
    Evidence: Test output capture
  ```

  **Commit**: YES
  - Message: `feat(economy-engine): add deterministic economy simulator`
  - Files: `packages/economy-engine/src/simulator.ts`, tests
  - Pre-commit: `pnpm --filter @slopcade/economy-engine test`

- [x] 3. Add runtime EconomyRuntimeSystem integration

  **What to do**:
  - Add `app/lib/game-engine/systems/runner/wrappers/EconomyRuntimeSystem.ts`.
  - Register system in runner with explicit phase/priority.
  - Wire read/write bridge to runtime variables and event bus.
  - Add runtime state serialization hooks for save/load compatibility.

  **Must NOT do**:
  - Do not alter execution order of existing systems unexpectedly.
  - Do not require economy for all games.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `systematic-debugging`
  - **Skills Evaluated but Omitted**:
    - `building-native-ui`: runtime system is logic layer.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8)
  - **Blocks**: 7, 9
  - **Blocked By**: 2

  **References**:
  - `app/lib/game-engine/systems/runner/GameSystemRunner.ts` - registration and lifecycle contract.
  - `app/lib/game-engine/systems/runner/wrappers/RulesSystem.ts` - wrapper system implementation pattern.
  - `app/lib/game-engine/runtime/types.ts` - runtime state structure constraints.

  **Acceptance Criteria**:
  - [ ] Economy system initializes only when `definition.economy` exists.
  - [ ] No-economy game tests remain green.
  - [ ] Economy tick updates observable runtime variables/events.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Runtime without economy remains unchanged
    Tool: Bash
    Preconditions: Existing runtime tests available
    Steps:
      1. Run: pnpm --filter slopcade test -- game-engine
      2. Assert legacy test suites pass
    Expected Result: No regression in non-economy runtimes
    Evidence: Test output capture

  Scenario: Economy game emits expected tick event
    Tool: Bash
    Preconditions: Integration test fixture game with economy section
    Steps:
      1. Run economy runtime integration test
      2. Assert event bus captured expected economy update event
    Expected Result: Runtime bridge functioning
    Evidence: Test output capture
  ```

  **Commit**: YES
  - Message: `feat(app): add economy runtime system integration`
  - Files: runtime system + runner registration + tests
  - Pre-commit: `pnpm --filter slopcade test -- economy`

- [x] 4. Define simulation job contracts and analysis artifact schema

  **What to do**:
  - Define API-level input/output contracts for Monte Carlo and sensitivity runs.
  - Add shared result schema (distribution stats, risk flags, sampled traces).
  - Define artifact key conventions for stored run outputs.

  **Must NOT do**:
  - Do not add heavy orchestration logic yet.
  - Do not lock into UI-specific output shape.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: this is contract design.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: 8
  - **Blocked By**: None

  **References**:
  - `api/src/trpc/routes/asset-system/generation-jobs.ts` - job/task payload and lifecycle pattern.
  - `docs/game-maker/architecture/agent-event-system.md` - event and artifact key conventions.

  **Acceptance Criteria**:
  - [ ] Contract tests for valid/invalid simulation job request payloads.
  - [ ] Result schema accepts expected statistical aggregates.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Invalid simulation request rejected
    Tool: Bash (curl)
    Preconditions: API dev server running on localhost:8789
    Steps:
      1. POST invalid payload to simulation endpoint
      2. Assert HTTP status 400
      3. Assert error body includes schema path
    Expected Result: Strict contract enforcement
    Evidence: Response body capture
  ```

  **Commit**: YES
  - Message: `feat(api): add economy simulation contract schemas`
  - Files: route contract + tests
  - Pre-commit: `pnpm --filter @slopcade/api test:run -- economy-contract`

- [x] 5. Integrate economy validation into API game flows

  **What to do**:
  - Add economy validation into `games.generate`, `games.refine`, and `games.validateDefinition` flows.
  - Ensure persisted definitions reject invalid economy graphs.
  - Add warning pass-through for risky but valid economy designs.

  **Must NOT do**:
  - Do not silently strip invalid economy sections.
  - Do not break existing validation response shape.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `verification-before-completion`
  - **Skills Evaluated but Omitted**:
    - `systematic-debugging`: not primary unless failures emerge.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: 9
  - **Blocked By**: 1

  **References**:
  - `api/src/trpc/routes/games.ts` - generate/refine/validateDefinition mutation/query flow.
  - `api/src/validation/gameValidator.ts` - current validation report pattern.

  **Acceptance Criteria**:
  - [ ] Invalid economy graph in game payload returns validation failure.
  - [ ] Valid economy graph persists with existing response contract intact.
  - [ ] API tests pass including legacy non-economy fixtures.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: ValidateDefinition rejects invalid economy graph
    Tool: Bash (curl)
    Preconditions: API running
    Steps:
      1. POST gameDefinition with invalid economy edge reference
      2. Assert response.valid = false
      3. Assert errors contain economy code E_MISSING_NODE_REF
    Expected Result: Economy validation surfaced via existing endpoint
    Evidence: Response JSON capture

  Scenario: Generate path accepts valid economy
    Tool: Bash (curl)
    Preconditions: API running and AI config present
    Steps:
      1. Trigger generate with prompt requiring economy
      2. Assert returned game includes economy section or explicit warning fallback
      3. Assert no server error
    Expected Result: Stable generation flow
    Evidence: Response JSON capture
  ```

  **Commit**: YES
  - Message: `feat(api): validate economy graphs in game routes`
  - Files: `api/src/trpc/routes/games.ts`, validator wiring, tests
  - Pre-commit: `pnpm --filter @slopcade/api test:run -- games`

- [ ] 6. Extend AI generation schemas/prompts for economy-aware output

  **What to do**:
  - Extend `api/src/ai/game/schemas.ts` with economy section.
  - Update prompt templates in `api/src/ai/game/generator.ts` for economy-aware archetypes.
  - Add constraints for deterministic-friendly output (bounded rates, valid references).

  **Must NOT do**:
  - Do not force economy generation for every game type.
  - Do not emit unconstrained free-form economy text blobs.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `test-driven-development`, `context7-auto-research`
  - **Skills Evaluated but Omitted**:
    - `every-style-editor`: not copy-style driven.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with 3, 8)
  - **Blocks**: 9
  - **Blocked By**: 1

  **References**:
  - `api/src/ai/game/generator.ts` - generation/refinement prompts.
  - `api/src/ai/game/schemas.ts` - AI output Zod constraints.
  - `api/src/ai/__tests__/generator.test.ts` - generation validation test patterns.

  **Acceptance Criteria**:
  - [ ] New prompt tests/fixtures demonstrate economy-capable outputs.
  - [ ] Schema validation catches malformed AI economy output.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Economy-focused prompt yields schema-valid output
    Tool: Bash
    Preconditions: Fixture-based generator tests available
    Steps:
      1. Run: pnpm --filter @slopcade/api test:run -- generator
      2. Assert economy-focused test case passes
    Expected Result: Prompt + schema integration works
    Evidence: Test output capture
  ```

  **Commit**: YES
  - Message: `feat(api): add economy-aware game generation constraints`
  - Files: generator + schemas + tests
  - Pre-commit: `pnpm --filter @slopcade/api test:run -- generator`

- [ ] 7. Bridge rules/actions/triggers with economy system

  **What to do**:
  - Add rule actions/triggers for economy interaction (e.g., `economy_transfer`, `economy_emit_event`, `economy_condition`).
  - Wire into action registry/evaluator paths.
  - Ensure backward compatibility of current rule behavior.

  **Must NOT do**:
  - Do not break existing action discriminator unions.
  - Do not create implicit hidden side-effects across unrelated actions.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `test-driven-development`, `systematic-debugging`
  - **Skills Evaluated but Omitted**:
    - `artistry`: conventional extension work.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with 9, 10)
  - **Blocks**: 9
  - **Blocked By**: 3

  **References**:
  - `app/lib/game-engine/rules/actions/ActionRegistry.ts` - action registration and dispatch.
  - `app/lib/game-engine/rules/types.ts` - RuleContext and rule type contracts.
  - `shared/src/types/schemas.ts` - action/condition schema unions.

  **Acceptance Criteria**:
  - [ ] New economy actions execute through ActionRegistry path.
  - [ ] Economy conditions evaluate correctly in rule engine.
  - [ ] Legacy rule tests remain passing.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Economy action updates pool via rule trigger
    Tool: Bash
    Preconditions: Integration test with rule trigger fixture
    Steps:
      1. Run economy rule integration test
      2. Assert target pool value changed as expected
      3. Assert event emitted in rule context when configured
    Expected Result: Rule-to-economy bridge works
    Evidence: Test output capture
  ```

  **Commit**: YES
  - Message: `feat(app): add rules bridge for economy actions`
  - Files: rule schemas/types/executors/tests
  - Pre-commit: `pnpm --filter slopcade test -- rules`

- [x] 8. Implement Monte Carlo and sensitivity simulation jobs

  **What to do**:
  - Add economy simulation job route(s) using job/task orchestration patterns.
  - Implement worker-side execution batching with seeded run sets.
  - Persist analysis artifacts with distributions and risk flags.

  **Must NOT do**:
  - Do not duplicate simulator logic (reuse shared simulator).
  - Do not run unbounded iteration counts without guardrails.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `test-driven-development`, `verification-before-completion`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: no new UI required for MVP jobs.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3/4 overlap (with 6/7)
  - **Blocks**: 9
  - **Blocked By**: 2, 4

  **References**:
  - `api/src/trpc/routes/asset-system/generation-jobs.ts` - job lifecycle and status querying.
  - `api/src/ai/agent/execution-engine.ts` - stage execution and artifact checkpoint conventions.

  **Acceptance Criteria**:
  - [ ] Simulation job endpoint creates a queued/running/completed lifecycle.
  - [ ] Completed job artifact includes per-run summary stats (p50/p90/min/max) and warnings.
  - [ ] Deterministic replay scenario (fixed seeds) passes.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Monte Carlo job lifecycle completes
    Tool: Bash (curl)
    Preconditions: API running
    Steps:
      1. POST simulation job request with iterations=200 and fixed seed base
      2. Poll job endpoint until status=completed
      3. Assert output artifact contains summary keys: min,max,p50,p90
    Expected Result: End-to-end job execution works
    Evidence: Response JSON + artifact capture

  Scenario: Excessive iteration request rejected
    Tool: Bash (curl)
    Preconditions: API running
    Steps:
      1. Submit iterations above configured max
      2. Assert HTTP 400 with explicit limit message
    Expected Result: Guardrail enforcement works
    Evidence: Response JSON capture
  ```

  **Commit**: YES
  - Message: `feat(api): add economy monte-carlo simulation jobs`
  - Files: economy routes/job handlers/tests
  - Pre-commit: `pnpm --filter @slopcade/api test:run -- economy-jobs`

- [ ] 9. Build full integration test harness and evidence capture pipeline

  **What to do**:
  - Add end-to-end tests covering: generation -> validation -> runtime tick -> job analysis.
  - Add deterministic golden fixtures for regression.
  - Capture evidence artifacts under `.sisyphus/evidence/` in CI/local runs.

  **Must NOT do**:
  - Do not rely on ad-hoc manual verification.
  - Do not leave nondeterministic assertions in core suites.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`, `systematic-debugging`
  - **Skills Evaluated but Omitted**:
    - `requesting-code-review`: occurs after executable verification.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 final integration
  - **Blocks**: 10
  - **Blocked By**: 3, 5, 6, 7, 8

  **References**:
  - `api/src/trpc/routes/__tests__/games.test.ts` - route-level testing style.
  - `app/lib/game-engine/systems/runner/wrappers/__tests__/RulesSystem.test.ts` - runtime integration testing style.
  - `api/src/trpc/routes/__tests__/workspace-snapshot.test.ts` - persisted state testing patterns.

  **Acceptance Criteria**:
  - [ ] One green integration suite proves full economy flow.
  - [ ] Regression fixture snapshots are stable across two consecutive runs.
  - [ ] Evidence artifacts generated and path-stamped.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Full economy integration smoke
    Tool: Bash
    Preconditions: API + app test suites configured
    Steps:
      1. Run shared economy suites
      2. Run api economy suites
      3. Run app economy runtime suites
      4. Assert all commands exit 0
    Expected Result: Cross-workspace integration verified
    Evidence: Combined terminal logs + fixture snapshots
  ```

  **Commit**: YES
  - Message: `test(economy): add end-to-end integration harness`
  - Files: cross-workspace tests + fixtures
  - Pre-commit: `pnpm test`

- [ ] 10. Final docs, rollout flags, and operational guardrails

  **What to do**:
  - Document architecture and feature flags for economy enablement.
  - Add rollout guidance for AI generation toggles and validation strictness.
  - Document troubleshooting (deadlocks, invalid graphs, perf ceilings).

  **Must NOT do**:
  - Do not leave rollout behavior implicit.
  - Do not ship without clear fallback behavior when economy validation fails.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `verification-before-completion`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: docs and ops guidance only.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential final
  - **Blocks**: None
  - **Blocked By**: 9

  **References**:
  - `docs/game-maker/architecture/agent-event-system.md` - operational event model style.
  - `docs/effects/EFFECTS_ARCHITECTURE.md` - architecture documentation style precedent.
  - `AGENTS.md` - project-level constraints and service management expectations.

  **Acceptance Criteria**:
  - [ ] Architecture and rollout docs committed.
  - [ ] Feature-flag/fallback behavior documented with concrete scenarios.
  - [ ] Documentation references all new economy modules and commands.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Documentation build references new economy sections
    Tool: Bash
    Preconditions: docs tooling available
    Steps:
      1. Run docs validation/build command used by repo
      2. Assert no broken references
    Expected Result: Docs are navigable and complete
    Evidence: Build output capture
  ```

  **Commit**: YES
  - Message: `docs(economy): add integration architecture and rollout guide`
  - Files: docs + indexes + runbook notes
  - Pre-commit: docs build/validation command

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|-------------|
| 1 | `feat(shared): add economy graph schema contracts` | shared economy types/schemas/tests | shared tests |
| 2 | `feat(shared): add deterministic economy simulator` | shared simulator/tests | shared sim tests |
| 3 | `feat(app): add economy runtime system integration` | runtime wrappers/runner/tests | app tests |
| 5 | `feat(api): validate economy graphs in game routes` | games route + validator + tests | api tests |
| 6 | `feat(api): add economy-aware game generation constraints` | AI schema/prompt/tests | api generator tests |
| 8 | `feat(api): add economy monte-carlo simulation jobs` | simulation routes/jobs/tests | api economy jobs tests |
| 9 | `test(economy): add end-to-end integration harness` | cross-workspace tests/fixtures | `pnpm test` |
| 10 | `docs(economy): add integration architecture and rollout guide` | docs | docs validation |

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter @slopcade/shared test -- economy
# Expected: all economy schema/simulator tests pass

pnpm --filter @slopcade/api test:run -- economy
# Expected: economy validation/generation/job route suites pass

pnpm --filter slopcade test -- economy
# Expected: runtime economy integration tests pass

pnpm test
# Expected: monorepo tests pass with economy feature enabled
```

### Final Checklist
- [ ] Economy graph is optional, validated, and deterministic.
- [ ] `@slopcade/economy-engine` is the single source of truth for economy logic used by API + app.
- [ ] AI pipeline can generate economy-aware definitions within schema constraints.
- [ ] Runtime executes economy ticks and bridges correctly to rules/events.
- [ ] Monte Carlo and sensitivity analysis jobs complete with usable artifacts.
- [ ] No regressions in legacy non-economy generation/runtime flows.
- [ ] Docs and rollout guidance are complete and operationally safe.

---

## Effort Estimate and Integration Fit

### Overall Duration (single focused engineer equivalent)
- **MVP (headless package + API/app integration + baseline jobs): 3-5 weeks**
- **Production-hardening (broader fixtures, perf tuning, richer analysis): +2-4 weeks**
- **Optional visual economy editor: +2-3 weeks**

### Team Throughput Estimate
- **1 engineer**: 5-9 weeks to production-ready core.
- **2 engineers (API+runtime split)**: 3-6 weeks.
- **3 engineers (package/API/app parallel)**: 2.5-5 weeks.

### Why package-first is a good idea
- Prevents API/app logic drift by centralizing simulator + validator.
- Improves testability (headless package tested once, reused everywhere).
- Keeps runtime and job behavior consistent (same deterministic core).
- Makes future editor or external tooling integration easier.
