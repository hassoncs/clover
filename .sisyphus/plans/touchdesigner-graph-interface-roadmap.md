# Generic Graph Editor Platform Roadmap (Web + Native)

## TL;DR

> **Quick Summary**: Build a domain-agnostic graph editor platform first (schema, commands, rendering adapters, interaction model), then implement domain adapters on top (Effects Editor first, Narrative/Branching Editor second).
>
> **Deliverables**:
> - Generic graph core (`GraphDocument`, commands, validation, layout, persistence contract)
> - Generic graph editor UI runtime (web + native parity)
> - Domain adapter API (`GraphDomainAdapter`) for pluggable graph types
> - Effects Editor built as an adapter (not baked into graph core)
> - Narrative Tree Editor built as a second adapter to prove reusability
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 6 -> Task 9 -> Task 10

---

## Context

### Original Request
Make the plan explicit that the graph editor must be generic and domain-independent. Effects are one use case on top. Narrative/dating-sim branching trees should also be supported by the same editor platform.

### Core Architecture Decision
- **Graph editor is a platform**: generic node/edge visualization + editing + pan/zoom + selection + persistence.
- **Domain logic is pluggable**: Effects, Narrative, and future graph systems integrate through adapter contracts.
- **No effect-specific assumptions in generic core**: no `EffectGraphSpec` fields in core types, reducers, renderer, or validators.

### Existing Reusable References
- `app/components/editor/InteractionLayer.tsx` - reusable gesture and screen/world transform patterns.
- `app/components/editor/code-editor/CodeEditor.web.tsx` and `app/components/editor/code-editor/CodeEditor.native.tsx` - web/native split and WebView parity pattern.
- `shared/src/effects/types.ts` - source domain model for Effects adapter mapping (adapter layer only).
- `docs/effects/deferred-phases-roadmap.md` - prior Effects roadmap to consume via adapter phase.

---

## Work Objectives

### Core Objective
Deliver a reusable graph editor platform that can host multiple domain-specific editors without changing core editor internals.

### Concrete Deliverables
- Generic graph schema and command engine in shared package.
- Generic graph editor runtime with interaction parity across web/native.
- Adapter contract for domain-specific semantics (node catalog, validation, serialization, inspectors).
- Effects adapter/editor implemented on top of generic platform.
- Narrative adapter/editor implemented on top of generic platform.

### Definition of Done
- [x] Generic core runs without importing effect or narrative domain types.
- [x] Effects editor works exclusively through adapter APIs.
- [x] Narrative branching editor works exclusively through same adapter APIs.
- [x] Same canvas engine (pan/zoom/select/connect) is reused by both adapters.
- [x] End-to-end tests and evidence verify two domain adapters on one core.

### Must Have
- Shared generic graph document and deterministic command reducer.
- Domain adapter interface with lifecycle hooks and validation boundaries.
- UI capability to switch adapters by file/graph type.
- AI ingestion path that targets adapter-selected schema/output.

### Must NOT Have (Guardrails)
- Core editor must not reference `EffectGraphSpec` directly.
- Core editor must not include effects-only port types or effect-only validation rules.
- Effects editor must not fork core interaction logic.
- Narrative editor must not reimplement canvas engine.
- No collaboration scope in this phase.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every acceptance criterion below is agent-verifiable via commands/tools only.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: Vitest (`app`, `shared`) + browser automation + native parity scenarios

### Cross-Domain Proof Requirement
The platform is only considered valid if both:
1) Effects adapter passes core editor flows, and
2) Narrative adapter passes the same core editor flows

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Platform Foundation):
- Task 1 (generic graph schema + commands)
- Task 2 (domain adapter contract)

Wave 2 (Generic Editor Runtime):
- Task 3 (web generic canvas/editor shell)
- Task 4 (native generic parity shell)
- Task 5 (tests for core runtime)

Wave 3 (Domain Adapters):
- Task 6 (Effects adapter + Effects editor)
- Task 7 (Narrative adapter + Narrative editor)

Wave 4 (Integration + AI + Hardening):
- Task 8 (AI generation routed by adapter)
- Task 9 (performance gate + migration decision)
- Task 10 (final integration lock + rollout checklist)

Critical Path: 1 -> 2 -> 3 -> 6 -> 9 -> 10

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 2, 3, 4, 5, 6, 7 | 2 |
| 2 | 1 | 6, 7, 8 | 3, 4, 5 |
| 3 | 1 | 6, 7, 9, 10 | 4, 5 |
| 4 | 1 | 6, 7, 9, 10 | 3, 5 |
| 5 | 1 | 10 | 3, 4 |
| 6 | 2, 3, 4 | 8, 9, 10 | 7 |
| 7 | 2, 3, 4 | 8, 9, 10 | 6 |
| 8 | 2, 6, 7 | 10 | 9 |
| 9 | 3, 4, 6, 7 | 10 | 8 |
| 10 | 3, 4, 5, 6, 7, 8, 9 | None | None |

---

## TODOs

- [x] 1. Build generic graph schema + deterministic command engine

  **What to do**:
  - Define generic `GraphDocument`, `GraphNode`, `GraphEdge`, `GraphPort`, `GraphViewport` in `shared/`.
  - Implement command reducer (`addNode`, `removeNode`, `connect`, `disconnect`, `moveNode`, `pan`, `zoom`, `undo`, `redo`).
  - Add generic validator independent of any domain semantics.

  **Must NOT do**:
  - No effect-specific fields in generic schema.
  - No domain-specific node families hardcoded in core.

  **References**:
  - `app/components/editor/InteractionLayer.tsx` - transform/interaction baseline.
  - `shared/src/effects/types.ts` - only as migration source, not target schema.

  **Acceptance Criteria**:
  - [x] Generic schema compiles and exports from shared package.
  - [x] Command reducer tests pass for happy and invalid paths.
  - [x] No imports from `shared/src/effects/*` in core graph package.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Generic reducer determinism
    Tool: Bash
    Steps:
      1. Run: pnpm --filter @slopcade/shared test
      2. Assert: graph-core reducer tests PASS
      3. Capture output: .sisyphus/evidence/task-1-generic-reducer.txt
    Expected Result: deterministic state evolution
    Evidence: .sisyphus/evidence/task-1-generic-reducer.txt

  Scenario: Core package isolation check
    Tool: Bash
    Steps:
      1. Run static dependency check for graph-core package
      2. Assert: no `shared/src/effects/*` imports in core
      3. Capture: .sisyphus/evidence/task-1-core-isolation.txt
    Expected Result: domain independence enforced
    Evidence: .sisyphus/evidence/task-1-core-isolation.txt
  ```

- [x] 2. Define and implement `GraphDomainAdapter` contract

  **What to do**:
  - Define adapter interface for:
    - domain graph <-> generic graph mapping
    - domain validation hooks
    - domain node catalog and inspector metadata
    - domain save/load serialization
  - Add adapter registry and runtime selection by graph/file type.

  **Must NOT do**:
  - Adapter API must not leak renderer internals.
  - Core must not branch per known adapter type.

  **References**:
  - `app/components/editor/code-editor/CodeEditor.native.tsx` - bridge message typing style.

  **Acceptance Criteria**:
  - [x] Adapter interface supports at least two concrete adapters.
  - [x] Unknown adapter type fails safely with explicit error.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Adapter registry resolves expected implementation
    Tool: Bash
    Steps:
      1. Run adapter registry unit tests
      2. Assert: effects + narrative adapters resolve
      3. Assert: unknown adapter throws typed error
      4. Save output: .sisyphus/evidence/task-2-adapter-registry.txt
    Expected Result: stable adapter discovery
    Evidence: .sisyphus/evidence/task-2-adapter-registry.txt
  ```

- [x] 3. Implement generic web graph editor shell (React Flow renderer)

  **What to do**:
  - Build web graph editor route using generic graph state + commands.
  - Keep renderer concerns in web adapter layer only.
  - Add adapter-aware inspector panel and node palette.

  **Must NOT do**:
  - No effect-specific UI in generic shell.
  - No adapter-specific validation in shared web shell.

  **References**:
  - `docs/effects/deferred-phases-roadmap.md` - prior React Flow intent (now under generic shell).

  **Acceptance Criteria**:
  - [x] Generic shell renders and edits any adapter-supplied graph.
  - [x] Pan/zoom/connect/select are core behaviors, not adapter-owned.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Generic web shell edits adapter-provided graph
    Tool: Playwright (playwright skill)
    Steps:
      1. Open generic graph route with effects adapter fixture
      2. Add/move/connect nodes
      3. Switch to narrative adapter fixture
      4. Repeat same operations
      5. Assert same core controls and behavior in both
      6. Screenshot: .sisyphus/evidence/task-3-web-generic-shell.png
    Expected Result: identical core interactions across adapters
    Evidence: .sisyphus/evidence/task-3-web-generic-shell.png
  ```

- [x] 4. Implement generic native graph editor shell (WebView parity first)

  **What to do**:
  - Mirror generic web shell in native via WebView bridge pattern.
  - Implement typed message bridge at generic command/event level.
  - Keep adapter selection and serialization consistent with web.

  **Must NOT do**:
  - No adapter-specific bridge format.
  - No duplicate command logic in native wrapper.

  **References**:
  - `app/components/editor/code-editor/CodeEditor.native.tsx`
  - `app/components/editor/code-editor/CodeEditor.web.tsx`

  **Acceptance Criteria**:
  - [x] Native shell executes same command set as web shell.
  - [x] Malformed bridge payloads are rejected safely.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Native shell parity on generic commands
    Tool: interactive_bash (tmux)
    Steps:
      1. Run: pnpm ios
      2. Open generic graph editor route
      3. Execute add/connect/pan/zoom actions for effects fixture and narrative fixture
      4. Assert resulting command log shape matches web
      5. Capture: .sisyphus/evidence/task-4-native-generic-shell.png
    Expected Result: native parity at generic command level
    Evidence: .sisyphus/evidence/task-4-native-generic-shell.png
  ```

- [x] 5. Build core test harness and cross-adapter contract tests

  **What to do**:
  - Add contract tests that each adapter must pass.
  - Add snapshot/state equivalence tests for save/load cycles.
  - Add integration tests for undo/redo invariants.

  **Acceptance Criteria**:
  - [x] Shared adapter contract test suite runs against at least two adapters.
  - [x] `pnpm test` and `pnpm tsc --noEmit` pass.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Cross-adapter contract suite
    Tool: Bash
    Steps:
      1. Run: pnpm test
      2. Run: pnpm tsc --noEmit
      3. Assert contract suite includes effects + narrative adapters
      4. Save: .sisyphus/evidence/task-5-contract-suite.txt
    Expected Result: generic platform enforces adapter compatibility
    Evidence: .sisyphus/evidence/task-5-contract-suite.txt
  ```

- [x] 6. Implement Effects adapter/editor on top of generic platform

  **What to do**:
  - Map `EffectGraphSpec` <-> generic `GraphDocument` via Effects adapter.
  - Attach effects-specific inspector, node catalog, and validation rules in adapter layer.
  - Ensure existing effects workflows remain functional.

  **Must NOT do**:
  - No effects branching logic inside core graph packages.

  **References**:
  - `shared/src/effects/types.ts`
  - `shared/src/effects/validator.ts`
  - `docs/effects/EFFECTS_ARCHITECTURE.md`

  **Acceptance Criteria**:
  - [x] Effects editor runs entirely through generic shell + Effects adapter.
  - [x] Effects serialization round-trip is lossless.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Effects adapter round-trip
    Tool: Bash + Playwright
    Steps:
      1. Load existing effect graph fixture
      2. Convert to generic graph and edit
      3. Save back to `EffectGraphSpec`
      4. Assert validator passes and important fields preserved
      5. Save evidence: .sisyphus/evidence/task-6-effects-roundtrip.json
    Expected Result: lossless mapping through adapter
    Evidence: .sisyphus/evidence/task-6-effects-roundtrip.json
  ```

- [x] 7. Implement Narrative adapter/editor (branching tree use case)

  **What to do**:
  - Define narrative domain schema (scenes/choices/transitions) in narrative package.
  - Map narrative schema <-> generic `GraphDocument` via Narrative adapter.
  - Provide narrative-specific inspector and node palette.

  **Must NOT do**:
  - No narrative-specific types in generic core.

  **Acceptance Criteria**:
  - [x] Narrative branching graph is editable with same generic shell controls.
  - [x] Narrative serialization round-trip is lossless.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Narrative branching editor proof
    Tool: Playwright (playwright skill)
    Steps:
      1. Open narrative graph fixture route
      2. Add scene node and branch choice edge
      3. Reorder/organize branches via generic move/connect interactions
      4. Save and reload
      5. Assert branching structure unchanged after reload
      6. Screenshot: .sisyphus/evidence/task-7-narrative-proof.png
    Expected Result: generic platform supports branching tree use case
    Evidence: .sisyphus/evidence/task-7-narrative-proof.png
  ```

- [x] 8. Route AI generation by adapter domain

  **What to do**:
  - Add AI generation API flow keyed by adapter (`effects`, `narrative`, future).
  - Validate generated payload using adapter-specific validators.
  - Convert generated domain payload into generic graph for immediate editing.

  **Acceptance Criteria**:
  - [x] AI can generate effects graph and narrative graph through same generic endpoint contract.
  - [x] Invalid payloads are repaired/rejected with structured errors.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Adapter-targeted AI generation
    Tool: Bash (curl)
    Steps:
      1. POST generate request with adapter=effects
      2. Assert valid effects payload + generic graph projection
      3. POST generate request with adapter=narrative
      4. Assert valid narrative payload + generic graph projection
      5. Save outputs: .sisyphus/evidence/task-8-ai-multi-adapter.json
    Expected Result: one AI entrypoint serves multiple domains safely
    Evidence: .sisyphus/evidence/task-8-ai-multi-adapter.json
  ```

- [x] 9. Run performance gate and decide native renderer path

  **What to do**:
  - Benchmark generic shell with both adapters at target sizes.
  - Decide keep WebView parity vs schedule Skia migration based on evidence.
  - Record thresholds and final decision.

  **Acceptance Criteria**:
  - [x] Performance evidence captured for effects and narrative fixtures on web/native.
  - [x] Migration decision documented with objective thresholds.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Multi-adapter performance gate
    Tool: Playwright + interactive_bash
    Steps:
      1. Run web benchmarks for effects and narrative fixtures (20/50/100 nodes)
      2. Run native parity benchmarks for same fixtures
      3. Capture metrics: frame drops, interaction latency, memory
      4. Save: .sisyphus/evidence/task-9-perf-gate.json
    Expected Result: objective renderer decision input
    Evidence: .sisyphus/evidence/task-9-perf-gate.json
  ```

- [x] 10. Final integration hardening and rollout checklist

  **What to do**:
  - Verify end-to-end create/edit/save/load/AI flows for both adapters.
  - Finalize scope boundaries and extension path for new adapters.
  - Publish internal implementation checklist for next adapters.

  **Acceptance Criteria**:
  - [x] E2E flows pass for effects and narrative.
  - [x] Adapter onboarding checklist exists and is tested with two adapters.
  - [x] All evidence artifacts are present.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Full dual-adapter lifecycle verification
    Tool: Playwright + Bash
    Steps:
      1. Effects: create -> edit -> save -> reload -> AI augment
      2. Narrative: create -> edit -> save -> reload -> AI augment
      3. Assert command history and serialization consistency in both
      4. Save: .sisyphus/evidence/task-10-dual-adapter-e2e.json
    Expected Result: generic platform proven by two distinct domains
    Evidence: .sisyphus/evidence/task-10-dual-adapter-e2e.json
  ```

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(shared): add generic graph core and commands` | `shared/src/graph-core/**` | `pnpm --filter @slopcade/shared test` |
| 2 | `feat(shared): add graph domain adapter contract` | `shared/src/graph-adapters/**` | `pnpm --filter @slopcade/shared test` |
| 3 | `feat(app): add generic web graph editor shell` | `app/components/editor/graph/**` | `pnpm --filter slopcade test` |
| 4 | `feat(app): add native generic graph parity shell` | `app/components/editor/graph/**` | `pnpm --filter slopcade test` |
| 5 | `test(graph): add cross-adapter contract tests` | `shared/**/__tests__/**`, `app/**/__tests__/**` | `pnpm test && pnpm tsc --noEmit` |
| 6 | `feat(effects): implement effects graph adapter` | `shared/src/effects/**`, `app/components/effects/**` | `pnpm test` |
| 7 | `feat(narrative): implement narrative graph adapter` | `shared/src/narrative/**`, `app/components/narrative/**` | `pnpm test` |
| 8 | `feat(api): add adapter-routed ai graph generation` | `api/src/**`, `shared/src/**` | `pnpm test` |
| 9 | `chore(graph): add multi-adapter perf gate` | `docs/**`, `app/**/benchmarks/**` | benchmark suite |
| 10 | `chore(graph): finalize dual-adapter rollout` | `docs/**`, `app/**`, `shared/**` | `pnpm test && pnpm tsc --noEmit` |

---

## Success Criteria

### Verification Commands

```bash
pnpm --filter @slopcade/shared test
pnpm --filter slopcade test
pnpm test
pnpm tsc --noEmit
```

### Final Checklist
- [x] Generic graph platform has zero domain-specific compile-time dependencies.
- [x] Effects editor is implemented as adapter only.
- [x] Narrative editor is implemented as adapter only.
- [x] Core interaction stack is reused unchanged across both adapters.
- [x] AI generation works for multiple adapters through one entrypoint.
- [x] Performance decision for native path is evidence-backed.
- [x] All acceptance evidence exists in `.sisyphus/evidence/`.
