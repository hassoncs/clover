# OpenPencil Architecture Migration — Slopcade Pencil (Zero-Tech-Debt End State)

## TL;DR
> **Summary**: Migrate Slopcade Pencil to an OpenPencil-style architecture by converging on a single runtime scene graph, replacing custom layout with Yoga WASM, adding `.fig` import/export, porting high-value then full MCP tool parity, and rebuilding editor panels early in React.
> **Deliverables**:
> - Single canonical runtime model (OpenPencil-style flat map) + stable `.pen` boundary
> - `.fig` import/export pipeline with compatibility tests
> - MCP tool parity roadmap (priority-first, then full parity)
> - Early panel parity implementation in React
> - Legacy path deletion with explicit no-tech-debt verification
> **Effort**: XL
> **Parallel**: YES - 7 waves
> **Critical Path**: T1 → T2 → T3 → T5 → T8 → T10

## Context
### Original Request
- Analyze OpenPencil and our current design stack, then provide a recommendation and full migration path.
- Confirmed direction: replace layout with Yoga WASM, support both `.pen` and `.fig`, adopt OpenPencil-style storage/runtime, port tools, use proven collaboration patterns, include panel parity early.
- Additional hard constraint: end state must contain no legacy migration tech debt.

### Interview Summary
- User approved full directional recommendations and requested complete migration plan now.
- User explicitly requested move-over to OpenPencil-style storage/model and full eventual tool coverage.
- User confirmed panel parity should begin early, not deferred until late stage.

### Metis Review (gaps addressed)
- Added hard guardrails for zero-tech-debt completion and legacy deletion gates.
- Added explicit acceptance for memory stability, layout parity, and consumer-safety compile checks.
- Added edge-case tasks for `connection` node handling, `fill_container` semantics, and tool topology migration.
- Added constraint to avoid long-lived dual-model architecture (strangler with deletion milestones only).

## Work Objectives
### Core Objective
Replace the current Pencil engine/tooling architecture with an OpenPencil-aligned architecture inside Slopcade while preserving platform goals (React + RN Skia), delivering `.pen` + `.fig` support, and eliminating legacy systems by completion.

### Deliverables
- Canonical runtime scene graph package for Pencil operations.
- Yoga WASM layout adapter replacing custom layout logic.
- `.fig` codec integration and bidirectional conversion with `.pen`.
- Expanded MCP tools (priority tranche + full parity backlog attached to same plan).
- React panel parity track started in parallel.
- Collaboration foundation (Yjs + P2P) integrated against canonical model.
- Legacy compatibility layers fully removed and verified.

### Definition of Done (verifiable conditions with commands)
- `pnpm --filter @slopcade/design-canvas test` passes with new scene graph + layout adapters.
- `pnpm test:bridge` passes with updated pencil MCP tooling.
- `pnpm --filter @slopcade/pencil-app typecheck` (or equivalent project typecheck command used in repo) passes.
- `.pen` roundtrip fixtures and `.fig` import/export fixtures pass with deterministic structural assertions.
- No legacy symbols remain (`DesignDocument`, `applyCanvasOps`, old bridge-only op paths) except in migration docs/tests.

### Must Have
- One canonical runtime model (no persistent dual runtime architecture).
- `.pen` remains supported; `.fig` import/export supported.
- Yoga layout as canonical layout engine.
- Tooling expansion to OpenPencil-compatible surface strategy.
- Early panel parity implementation track.
- Explicit legacy deletion tasks and evidence.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No permanent adapter-on-adapter architecture.
- No “temporary” compatibility code surviving final wave.
- No UI rewrite in Vue; React-only implementation in Slopcade.
- No unbounded `.fig` fidelity claims without fixture-backed support matrix.
- No hidden schema changes to `.pen` format without migration + fixture updates.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after with Vitest + bridge E2E + targeted integration fixtures.
- QA policy: every task includes happy path + failure/edge path scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave.

Wave 1: foundation + inventory (canonical model boundaries, support matrix, freeze rules)
Wave 2: runtime convergence + layout adapter
Wave 3: file format + codec boundary
Wave 4: MCP tool architecture + priority tools
Wave 5: panel parity early track + collaboration foundation
Wave 6: full tool parity expansion + hardening
Wave 7: legacy deletion + zero-tech-debt closure

### Dependency Matrix (full, all tasks)
- T1 blocks T2, T3, T4.
- T2 blocks T5, T7, T8.
- T3 blocks T6, T8.
- T4 blocks T9, T11.
- T5 + T6 + T7 + T9 feed T10.
- T8 + T10 + T11 + T12 feed T13.
- T13 blocks T14 (final deletion + closure audit).

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → deep / unspecified-high
- Wave 2 → 2 tasks → deep / ultrabrain
- Wave 3 → 2 tasks → ultrabrain / deep
- Wave 4 → 2 tasks → deep / quick
- Wave 5 → 2 tasks → visual-engineering / unspecified-high
- Wave 6 → 2 tasks → deep / ultrabrain
- Wave 7 → 2 tasks → unspecified-high / deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task includes Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Canonical Model Consumer Audit + Freeze Contract

  **What to do**: Enumerate every consumer of `shared/src/types/pen.ts` and existing `DesignDocument`-style paths; publish migration freeze contract (what cannot change until replacement points exist).
  **Must NOT do**: No schema deletions in this task.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: cross-package dependency discovery.
  - Skills: [`workspace-system`] — repo-wide impact mapping.
  - Omitted: [`visual-engineering`] — not UI work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T2,T3,T4 | Blocked By: none

  **References**:
  - Pattern: `shared/src/types/pen.ts` — existing canonical schema.
  - Pattern: `packages/design-canvas/src/ops/canvasOps.ts` — legacy operation path.
  - Pattern: `packages/game-inspector-mcp/src/tools/pencil.ts` — current bridge tool surface.

  **Acceptance Criteria**:
  - [ ] Consumer inventory file committed under `.sisyphus/evidence/task-1-consumer-inventory.md` with package-level owner list.
  - [ ] Freeze rules documented and linked in plan evidence.
  - [ ] `pnpm -r typecheck` (or project-equivalent) runs successfully pre-migration baseline.

  **QA Scenarios**:
  ```
  Scenario: Consumer map completeness
    Tool: Bash
    Steps: Run repo-wide symbol search for pen types and legacy ops imports; compare against inventory.
    Expected: Every matched import path appears in inventory.
    Evidence: .sisyphus/evidence/task-1-consumer-inventory.txt

  Scenario: Missing-owner failure gate
    Tool: Bash
    Steps: Validate inventory rows include package + migration owner columns.
    Expected: Validation fails if any row missing owner.
    Evidence: .sisyphus/evidence/task-1-consumer-audit-error.txt
  ```

  **Commit**: YES | Message: `chore(pencil): audit consumers and define migration freeze` | Files: `.sisyphus/evidence/*`, migration inventory doc

- [ ] 2. Scene Graph Runtime Foundation (OpenPencil-style flat map)

  **What to do**: Introduce canonical runtime scene graph (`Map<id,node>` with parent/children indices) and adapters from/to `PenDocument` JSON.
  **Must NOT do**: Do not yet remove existing runtime paths.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` — Reason: core model correctness.
  - Skills: [`ecs-architecture`] — graph/entity-style data modeling.
  - Omitted: [`frontend-ui-ux`] — no UI concern.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: T5,T6,T7 | Blocked By: T1

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/scene-graph.ts` — flat map runtime.
  - API/Type: `shared/src/types/pen.ts:PenDocument` — external serialization boundary.
  - Test: `packages/design-canvas/src/pen/__tests__/components.test.ts` — current behavior baseline.

  **Acceptance Criteria**:
  - [ ] PenDocument → RuntimeGraph → PenDocument roundtrip fixture tests pass.
  - [ ] O(1) lookup API exists for id access and parent traversal.
  - [ ] No renderer-facing API break in this task.

  **QA Scenarios**:
  ```
  Scenario: Roundtrip stability
    Tool: Bash
    Steps: Run fixture roundtrip tests for sample .pen docs.
    Expected: Structural equality (or approved normalized equality) passes.
    Evidence: .sisyphus/evidence/task-2-roundtrip.txt

  Scenario: Missing parent edge case
    Tool: Bash
    Steps: Feed corrupted fixture with orphan node id.
    Expected: Deterministic validation error, no crash.
    Evidence: .sisyphus/evidence/task-2-orphan-error.txt
  ```

  **Commit**: YES | Message: `feat(pencil): add canonical runtime scene graph` | Files: design-canvas runtime graph + tests

- [ ] 3. Yoga WASM Layout Adapter Replacement

  **What to do**: Replace custom layout calculations with Yoga WASM adapter mapped from `PenFrame` semantics, preserving deterministic layout outputs for approved fixtures.
  **Must NOT do**: No permanent fallback to old layout engine.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: migration with parity constraints.
  - Skills: [`native-infrastructure`] — WASM/runtime loading concerns.
  - Omitted: [`agent-orchestration`] — unrelated.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: T8,T10 | Blocked By: T2

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/layout.ts` — Yoga mapping model.
  - Pattern: `packages/design-canvas/src/pen/layout.ts` — current behavior contract.
  - Test: `packages/design-canvas/src/pen/__tests__/layout.test.ts` — baseline expectations.

  **Acceptance Criteria**:
  - [ ] New layout tests cover horizontal/vertical/wrap/absolute and fill edge cases.
  - [ ] Memory stability checks confirm no unbounded Yoga node leaks.
  - [ ] Legacy layout implementation no longer used in runtime path.

  **QA Scenarios**:
  ```
  Scenario: Layout parity fixtures
    Tool: Bash
    Steps: Execute layout fixture tests comparing expected bounds.
    Expected: All approved fixtures pass.
    Evidence: .sisyphus/evidence/task-3-layout-parity.txt

  Scenario: WASM init failure
    Tool: Bash
    Steps: Simulate unavailable WASM and run startup/layout tests.
    Expected: Controlled error and fallback messaging; no silent bad layout.
    Evidence: .sisyphus/evidence/task-3-wasm-error.txt
  ```

  **Commit**: YES | Message: `refactor(pencil): replace custom layout with yoga adapter` | Files: layout runtime + tests

- [ ] 4. Tool Execution API Facade (FigmaAPI-equivalent for Pen runtime)

  **What to do**: Build an internal API facade over runtime graph to support tool operations with typed accessors and mutation primitives.
  **Must NOT do**: No direct coupling to browser bridge globals.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: abstraction boundary for 75+ tools.
  - Skills: [`agent-orchestration`] — tool abstraction and execution contracts.
  - Omitted: [`visual-engineering`] — no panel work.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T9,T11 | Blocked By: T1

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/figma-api.ts` — facade shape.
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/tools/schema.ts` — expected consumer contract.
  - API/Type: `shared/src/types/pen.ts` — node/variable fields.

  **Acceptance Criteria**:
  - [ ] Facade supports read/write/query operations required by priority tool tranche.
  - [ ] Unit tests prove deterministic mutation + undo entry generation shape.
  - [ ] Existing `pencil_apply_ops` can be reimplemented through facade shim.

  **QA Scenarios**:
  ```
  Scenario: Facade mutation correctness
    Tool: Bash
    Steps: Run unit tests for create/update/delete/reparent sequences.
    Expected: Graph integrity preserved after each mutation.
    Evidence: .sisyphus/evidence/task-4-facade-tests.txt

  Scenario: Invalid mutation rejection
    Tool: Bash
    Steps: Attempt cyclic parent reassign via test harness.
    Expected: Explicit validation error; no graph corruption.
    Evidence: .sisyphus/evidence/task-4-cycle-error.txt
  ```

  **Commit**: YES | Message: `feat(pencil): add runtime tool facade over scene graph` | Files: facade + tests

- [ ] 5. `.fig` Codec Integration + `.pen` Boundary Contract

  **What to do**: Integrate OpenPencil Kiwi codec modules for `.fig` read/write and define explicit conversion layer to/from canonical runtime + `.pen` schema.
  **Must NOT do**: No promise of unsupported Figma feature parity beyond declared support matrix.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` — Reason: binary format + conversion correctness.
  - Skills: [`game-package`] — packaging/format validation mindset.
  - Omitted: [`frontend-ui-ux`] — not visual layer.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: T8,T10 | Blocked By: T2

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/kiwi/` — codec implementation.
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/fig-export.ts` — export pathway.
  - API/Type: `shared/src/types/pen.ts:PenDocument` — stable JSON schema boundary.

  **Acceptance Criteria**:
  - [ ] `.fig` import supports declared node/effect subset with fixture tests.
  - [ ] `.fig` export reopens with no fatal parser failures in test harness.
  - [ ] `.pen` schema remains backward compatible with existing sample fixtures.

  **QA Scenarios**:
  ```
  Scenario: Supported .fig roundtrip
    Tool: Bash
    Steps: Import fixture .fig -> runtime -> export .fig -> re-import.
    Expected: Supported fields preserved per support matrix assertions.
    Evidence: .sisyphus/evidence/task-5-fig-roundtrip.txt

  Scenario: Unsupported feature guard
    Tool: Bash
    Steps: Import fixture containing unsupported feature token.
    Expected: Explicit warning/error classification, no crash.
    Evidence: .sisyphus/evidence/task-5-unsupported-error.txt
  ```

  **Commit**: YES | Message: `feat(pencil): add fig codec boundary with pen conversion` | Files: codec integration + fixtures

- [ ] 6. Priority MCP Tool Parity (Read + Core Mutations)

  **What to do**: Port first tranche of OpenPencil-style tools (node read/query + create/update/delete/reparent + base style/layout setters) on top of new facade.
  **Must NOT do**: No browser-global-only execution model.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: broad tool-surface migration.
  - Skills: [`agent-orchestration`] — tool schema + execution plumbing.
  - Omitted: [`visual-engineering`] — no panel rendering.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: T11,T12 | Blocked By: T4

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/tools/schema.ts` — tool definitions.
  - Pattern: `packages/game-inspector-mcp/src/tools/pencil.ts` — current MCP entry points.
  - Pattern: `packages/design-canvas/src/ops/canvasOps.ts` — legacy op semantics to retire.

  **Acceptance Criteria**:
  - [ ] Priority tool tranche callable from MCP with typed validation.
  - [ ] Existing `pencil_apply_ops` has compatibility wrapper or migration notice path.
  - [ ] Bridge E2E tests validate deterministic document outcomes.

  **QA Scenarios**:
  ```
  Scenario: Tool-driven document mutation
    Tool: Bash
    Steps: Call priority MCP tools against fixture document; read back state.
    Expected: Expected node graph changes match assertions.
    Evidence: .sisyphus/evidence/task-6-mcp-priority.txt

  Scenario: Invalid tool payload
    Tool: Bash
    Steps: Submit malformed params for each priority tool class.
    Expected: Validation errors returned; no partial writes.
    Evidence: .sisyphus/evidence/task-6-mcp-validation-error.txt
  ```

  **Commit**: YES | Message: `feat(pencil): port priority mcp tool tranche` | Files: mcp tools + tests

- [ ] 7. Panel Parity Early Track — Inspector + Layers + Toolbar Shell

  **What to do**: Implement early OpenPencil-style panel parity in React (inspector primitives, layer tree interactions, toolbar shell) against canonical runtime APIs.
  **Must NOT do**: No direct Vue component embedding/forking.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: high-velocity UI parity work.
  - Skills: [`editor-system`,`frontend-ui-ux`] — panel architecture and UX quality.
  - Omitted: [`ai-sdk-usage`] — not model integration.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: T10,T12 | Blocked By: T2

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/src/components/` — UX reference.
  - Pattern: `packages/design-canvas/src/panels/PenCanvasPanelInner.tsx` — current panel composition.
  - Pattern: `apps/pencil/app/index.tsx` — entry integration point.

  **Acceptance Criteria**:
  - [ ] Inspector edits reflect in runtime model and canvas render path.
  - [ ] Layer tree supports select, reorder, and visibility toggles.
  - [ ] Toolbar invokes priority creation/edit tools through unified command path.

  **QA Scenarios**:
  ```
  Scenario: Inspector edit happy path
    Tool: Playwright
    Steps: Open pencil UI, select node, edit fill/size in inspector.
    Expected: Canvas updates and document state reflects new values.
    Evidence: .sisyphus/evidence/task-7-inspector-ui.png

  Scenario: Layer reorder failure path
    Tool: Playwright
    Steps: Attempt invalid reorder into forbidden parent context.
    Expected: Reorder blocked with clear UI feedback; model unchanged.
    Evidence: .sisyphus/evidence/task-7-layer-reorder-error.png
  ```

  **Commit**: YES | Message: `feat(pencil): ship early panel parity shell` | Files: panel components + ui tests

- [ ] 8. Runtime Renderer + File I/O Integration Cutover

  **What to do**: Connect canonical runtime model to renderer and file I/O paths (`.pen` + `.fig`) so editor session flow uses new architecture end-to-end.
  **Must NOT do**: No hidden fallback to legacy runtime in main execution path.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: cross-layer integration risk.
  - Skills: [`bridge-development`,`native-infrastructure`] — bridge + platform path correctness.
  - Omitted: [`economy-engine`] — irrelevant domain.

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: T13 | Blocked By: T3,T5,T7

  **References**:
  - Pattern: `packages/design-canvas/src/pen/render/PenRenderer.tsx` — render integration point.
  - Pattern: `apps/pencil/app/index.tsx` — app wiring.
  - Pattern: `packages/game-inspector-mcp/src/tools/pencil.ts` — external bridge touchpoint.

  **Acceptance Criteria**:
  - [ ] Load/save flows support `.pen` and `.fig` through unified runtime conversion layer.
  - [ ] Renderer consumes new runtime-derived layout/render state in production path.
  - [ ] No runtime flag defaults to legacy path.

  **QA Scenarios**:
  ```
  Scenario: End-to-end open/edit/save cycle
    Tool: Playwright
    Steps: Open file, mutate via UI + tool call, save, reload.
    Expected: Persisted state matches expected structural diff.
    Evidence: .sisyphus/evidence/task-8-e2e-save-cycle.png

  Scenario: Corrupt file import
    Tool: Bash
    Steps: Attempt open on malformed .fig and malformed .pen fixtures.
    Expected: Graceful parse failure with actionable error messages.
    Evidence: .sisyphus/evidence/task-8-corrupt-io-error.txt
  ```

  **Commit**: YES | Message: `feat(pencil): cut over runtime rendering and io` | Files: integration paths + e2e tests

- [ ] 9. Collaboration Foundation (Yjs + P2P) on Canonical Runtime

  **What to do**: Add Yjs-backed shared document state and P2P sync transport using canonical runtime graph deltas; include awareness baseline.
  **Must NOT do**: No second state authority besides canonical runtime/Yjs doc.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: distributed consistency + merge correctness.
  - Skills: [`social-features`,`editor-system`] — realtime state patterns.
  - Omitted: [`visual-engineering`] — protocol-first task.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: T12 | Blocked By: T4

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/AGENTS.md` collaboration notes (Trystero + Yjs).
  - Pattern: `packages/design-canvas/src/document` — existing doc state hooks to replace/augment.

  **Acceptance Criteria**:
  - [ ] Two-editor concurrent edit test passes deterministic convergence assertions.
  - [ ] Presence metadata sync works for selection/cursor baseline.
  - [ ] Single Yjs version invariant enforced in dependency graph checks.

  **QA Scenarios**:
  ```
  Scenario: Concurrent edit convergence
    Tool: Bash
    Steps: Run multi-client integration test mutating same parent subtree concurrently.
    Expected: Final graph converges identically across clients.
    Evidence: .sisyphus/evidence/task-9-crdt-convergence.txt

  Scenario: Duplicate yjs dependency failure
    Tool: Bash
    Steps: Run dependency invariant check script.
    Expected: Fails if more than one yjs instance resolved.
    Evidence: .sisyphus/evidence/task-9-yjs-invariant.txt
  ```

  **Commit**: YES | Message: `feat(pencil): add yjs p2p collaboration foundation` | Files: collab runtime + tests

- [ ] 10. Full MCP Tool Parity Expansion (Remaining Surface)

  **What to do**: Implement remaining OpenPencil-style tool categories (components, variables, advanced styling/effects, query utilities, export utilities) on top of unified facade.
  **Must NOT do**: No divergent naming if equivalent OpenPencil semantics exist.

  **Recommended Agent Profile**:
  - Category: `ultrabrain` — Reason: large API surface consistency.
  - Skills: [`agent-orchestration`] — schema-driven tool systems.
  - Omitted: [`frontend-ui-ux`] — API work.

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: T13 | Blocked By: T3,T5,T6

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/tools/schema.ts` — complete target surface.
  - Pattern: `packages/game-inspector-mcp/src/tools/pencil.ts` — migration source endpoint.

  **Acceptance Criteria**:
  - [ ] Tool catalog parity matrix checked in and all planned tool classes marked implemented.
  - [ ] MCP contract tests cover happy + validation failure paths for each tool class.
  - [ ] Legacy batch-op-only pathways marked deprecated then removed in T14.

  **QA Scenarios**:
  ```
  Scenario: Full tool catalog contract run
    Tool: Bash
    Steps: Execute MCP tool contract suite against local server.
    Expected: All parity-class tools pass.
    Evidence: .sisyphus/evidence/task-10-tool-contracts.txt

  Scenario: Unknown tool invocation
    Tool: Bash
    Steps: Invoke nonexistent tool via MCP client test.
    Expected: Structured not-found response; server remains healthy.
    Evidence: .sisyphus/evidence/task-10-unknown-tool-error.txt
  ```

  **Commit**: YES | Message: `feat(pencil): complete mcp tool parity surface` | Files: tool modules + contract tests

- [ ] 11. Bridge Topology Migration (Browser Global → Server/Facade First)

  **What to do**: Migrate from browser-global bridge dependence to server/facade-first execution topology while preserving external automation entry points.
  **Must NOT do**: No hidden dependence on `window.__PENCIL_BRIDGE__` in new core path.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: integration contract migration.
  - Skills: [`bridge-development`,`agent-orchestration`] — endpoint and dispatch design.
  - Omitted: [`visual-engineering`] — not UI.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: T13,T14 | Blocked By: T4,T6

  **References**:
  - Pattern: `packages/game-inspector-mcp/src/tools/pencil.ts` — current bridge-driven tooling.
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/packages/mcp/src/server.ts` — server-side registration model.

  **Acceptance Criteria**:
  - [ ] Core mutation/read tools execute without browser page context.
  - [ ] Existing client integrations have migration alias period documented and tested.
  - [ ] Error envelopes standardized across old/new entry points.

  **QA Scenarios**:
  ```
  Scenario: Headless tool execution
    Tool: Bash
    Steps: Execute core tool set without opening browser session.
    Expected: Successful operations and deterministic outputs.
    Evidence: .sisyphus/evidence/task-11-headless-tools.txt

  Scenario: Legacy endpoint deprecation behavior
    Tool: Bash
    Steps: Call old bridge endpoint after migration flag on.
    Expected: Explicit deprecation warning or alias routing per policy.
    Evidence: .sisyphus/evidence/task-11-legacy-bridge-warning.txt
  ```

  **Commit**: YES | Message: `refactor(pencil): migrate bridge topology to server facade` | Files: mcp bridge modules + tests

- [ ] 12. Panel Parity Expansion (Variables, Components, Advanced Inspector)

  **What to do**: Extend early panel shell to include variable mode management, component/instance controls, and advanced inspector controls mapped to full tool/runtime surface.
  **Must NOT do**: No direct model mutations bypassing command/tool pathways.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: heavy UI + interaction design.
  - Skills: [`editor-system`,`frontend-ui-ux`] — panel UX and editor architecture.
  - Omitted: [`storage-ops`] — not DB-centric.

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: T13 | Blocked By: T7,T9,T10

  **References**:
  - Pattern: `/Users/hassoncs/Workspaces/open-pencil/src/components/` — feature reference.
  - Pattern: `packages/design-canvas/src/panels` — existing panel host structure.

  **Acceptance Criteria**:
  - [ ] Variables panel supports create/edit/apply mode changes via unified runtime.
  - [ ] Component panel supports instance overrides and restore/reset flows.
  - [ ] Inspector covers advanced fill/stroke/effect controls used by parity tools.

  **QA Scenarios**:
  ```
  Scenario: Variable mode switch
    Tool: Playwright
    Steps: Create variable with modes, bind to node style, switch mode.
    Expected: Bound node visuals update consistently.
    Evidence: .sisyphus/evidence/task-12-variable-mode.png

  Scenario: Invalid component override
    Tool: Playwright
    Steps: Attempt override on non-overridable property.
    Expected: Guarded UI error; underlying model unchanged.
    Evidence: .sisyphus/evidence/task-12-component-override-error.png
  ```

  **Commit**: YES | Message: `feat(pencil): expand panel parity for variables and components` | Files: panel ui + integration tests

- [ ] 13. Legacy Path Deletion Wave (No Tech Debt Gate)

  **What to do**: Remove legacy document/runtime/layout/tooling paths and compatibility shims after parity gates pass.
  **Must NOT do**: No deferred TODO markers for legacy cleanup.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: high-risk deletions requiring precision.
  - Skills: [`workspace-system`] — coordinated cross-package removal.
  - Omitted: [`visual-engineering`] — deletion/hardening task.

  **Parallelization**: Can Parallel: NO | Wave 7 | Blocks: T14 | Blocked By: T8,T10,T11,T12

  **References**:
  - Pattern: `packages/design-canvas/src/ops/canvasOps.ts` — legacy op path target.
  - Pattern: legacy imports discovered in T1 inventory.

  **Acceptance Criteria**:
  - [ ] Legacy symbols/import paths removed (except migration evidence/tests explicitly tagged).
  - [ ] Repo-wide grep audit passes zero-legacy assertions.
  - [ ] All previously passing parity + integration suites remain green.

  **QA Scenarios**:
  ```
  Scenario: Legacy grep audit
    Tool: Bash
    Steps: Run zero-legacy symbol audit script.
    Expected: No forbidden legacy symbol matches.
    Evidence: .sisyphus/evidence/task-13-legacy-audit.txt

  Scenario: Regression after deletion
    Tool: Bash
    Steps: Execute full pencil test matrix post-deletion.
    Expected: All suites pass; no missing-module/runtime fallback errors.
    Evidence: .sisyphus/evidence/task-13-post-delete-regression.txt
  ```

  **Commit**: YES | Message: `refactor(pencil): remove legacy migration paths` | Files: deleted legacy modules + updated references

- [ ] 14. Zero-Tech-Debt Closure Audit + Final Migration Report

  **What to do**: Produce final evidence-backed closure report proving all migration constraints are satisfied and no planned debt remains.
  **Must NOT do**: No unverifiable claims.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: closure quality + evidence synthesis.
  - Skills: [`testing-patterns`] — verification rigor.
  - Omitted: [`frontend-ui-ux`] — not implementation.

  **Parallelization**: Can Parallel: NO | Wave 7 | Blocks: Final Verification Wave | Blocked By: T13

  **References**:
  - Pattern: `.sisyphus/evidence/` — all task outputs.
  - Pattern: this plan file for success criteria and must-not-have gates.

  **Acceptance Criteria**:
  - [ ] Closure report includes pass/fail table for every deliverable + guardrail.
  - [ ] Explicit statement and proof links for “no legacy migration debt remains”.
  - [ ] Final matrix of `.pen` + `.fig` compatibility status and known intentional exclusions.

  **QA Scenarios**:
  ```
  Scenario: Evidence completeness
    Tool: Bash
    Steps: Validate every task has evidence file references and existing artifacts.
    Expected: 100% task evidence coverage.
    Evidence: .sisyphus/evidence/task-14-evidence-completeness.txt

  Scenario: Closure mismatch detection
    Tool: Bash
    Steps: Run closure checker against plan acceptance criteria.
    Expected: Fails if any criterion lacks proof.
    Evidence: .sisyphus/evidence/task-14-closure-mismatch.txt
  ```

  **Commit**: YES | Message: `docs(pencil): finalize migration closure and zero-debt audit` | Files: closure report + evidence index

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit by wave with conventional commits and explicit migration checkpoints.
- No squash-until-stable policy for early waves; preserve rollback granularity.
- Final cleanup wave must contain only deletion + deprecation removal + docs/evidence updates.

## Success Criteria
- OpenPencil-aligned architecture active in Slopcade Pencil with React stack retained.
- Priority tool parity shipped and full parity backlog completed within same plan scope.
- `.pen` + `.fig` workflows verified by fixtures.
- Zero legacy migration tech debt verified by automated grep/audit acceptance criteria.
