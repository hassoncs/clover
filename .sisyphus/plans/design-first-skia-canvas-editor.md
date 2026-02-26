# Design-First Skia Canvas for Slopcade Editor

## TL;DR

> **Quick Summary**: Add a cross-platform, Skia-powered Design Canvas that replaces the current wireframe panel and introduces an additive AI design stage before runtime implementation, while keeping design data file-based and separate from runtime GameDefinition.
>
> **Deliverables**:
> - Cross-platform Design Canvas panel (web + native) with infinite pan/zoom and tap-to-select.
> - New file-based design document model (`design.json`) independent from GameDefinition.
> - AI pipeline update: `planning -> design -> design-iterate -> build -> ...`.
> - Chat tools for AI-driven design generation and iteration.
> - Build handoff that converts approved design intent into runtime GameDefinition.
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves + final verification wave
> **Critical Path**: T1 -> T4 -> T8 -> T13 -> T16 -> F1-F4

---

## Context

### Original Request
Build a Pencil-like visual design phase into Slopcade where users iterate on AI-generated visuals first (in an infinite canvas), then proceed to implementation/game hookup.

### Interview Summary
**Key Discussions**:
- Replace current low-fidelity wireframe with Skia-based canvas.
- Keep v1 AI-first (chat-prompted) rather than full manual drag-and-drop Figma workflows.
- Support infinite canvas with many abstract screens/scenes/iterations.
- Support tap-to-select to target AI edits.
- Keep design model file-based and separate from GameDefinition runtime model.
- Ensure initial version is cross-platform (web + native).
- Keep architecture reusable for future product direction and potential runtime-engine evolution.

**Research Findings**:
- Existing panel shell and state orchestration are strong and reusable (`DockviewLayout.web.tsx`, `EditorProvider.tsx`).
- Existing interaction patterns (tap/pan/pinch) are proven in `InteractionLayer.tsx` but are currently world/physics oriented.
- Current wireframe stack (`WireframePanel.tsx`, `WireframeRenderer.tsx`, `LayoutAdapter.ts`) is too low-fidelity and has hardcoded screen assumptions.
- AI stage pipeline currently lacks a dedicated design iteration stage (`execution-engine.ts`).

### Metis Review
**Identified Gaps** (addressed):
- Explicitly decide wireframe replacement path and avoid dual-UI confusion.
- Lock in cross-platform parity as a release requirement.
- Add explicit guardrails against “accidental Figma clone” scope creep.
- Add stage-order and prerequisite updates as an atomic migration in AI execution engine.
- Validate workspace watcher compatibility with new `design.json` file.

---

## Work Objectives

### Core Objective
Introduce a first-class Design Canvas stage to Slopcade so users can iterate visually via AI before runtime implementation, without coupling design-time artifacts to GameDefinition runtime schema.

### Concrete Deliverables
- New design document schema/types + persistence in workspace files.
- Skia Design Canvas panel replacing wireframe panel entry-point.
- Selection-aware AI design iteration loop in chat.
- New additive AI generation stage for design generation and refinement.
- Deterministic handoff from approved design documents to runtime build prompts.

### Definition of Done
- [ ] Cross-platform design canvas loads and renders `design.json` on web and native.
- [ ] AI can generate and update designs through chat tools with visible canvas updates.
- [ ] User can tap/select frame/elements and issue targeted AI edits.
- [ ] Pipeline supports design stage before build with resumable iteration.
- [ ] Runtime build remains GameDefinition-based and does not embed design-time artifacts.
- [ ] No regressions in existing preview/live workflows.

### Must Have
- Separate file-based design model.
- Skia rendering path for design canvas.
- AI-first editing loop with tap-to-select context.
- Cross-platform parity in initial release.

### Must NOT Have (Guardrails)
- No attempt at full Figma parity in v1.
- No mixing design document schema into runtime GameDefinition payload.
- No web-only MVP; native cannot be deferred.
- No partial stage wiring (must update stage order + prerequisites + runner map atomically).

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: YES (Tests-after for most tasks; TDD where schema/transform logic is high-risk)
- **Framework**: Vitest / existing project test tooling

### QA Policy
Evidence path pattern: `.sisyphus/evidence/task-{N}-{scenario}.{ext}`

- **Frontend/UI**: Playwright for panel render, selection behavior, zoom/pan validation.
- **API/Backend**: Curl/trpc-call validation for stage execution and tool behavior.
- **Library/Module**: Unit tests for schema validation, mapping and transform logic.
- **CLI/Watchers**: Shell commands validating watcher/build behavior with `design.json` present.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation + contracts; start immediately):
- T1: Define design document schema/types and validation.
- T2: Add workspace file persistence/loading for `design.json`.
- T3: Replace wireframe panel registration with Design Canvas panel shell.
- T4: Add editor state slice for design selection/context and mode wiring.
- T5: Add AI tool contracts for design read/write/select operations.

Wave 2 (Canvas + interaction core; after Wave 1):
- T6: Implement Skia Design Canvas renderer (frames/elements visual fidelity).
- T7: Implement infinite canvas camera (pan/zoom) cross-platform behavior.
- T8: Implement tap hit-testing + selection overlays.
- T9: Implement panel UX parity (screen/frame navigator, metadata panel).
- T10: Remove/deprecate wireframe mode provider hardcoded screen behavior.
- T11: Add native/web platform parity fixes for gestures and text rendering.

Wave 3 (AI pipeline + design loop; after Wave 2):
- T12: Add `design` stage to execution engine (order + prerequisites + runners).
- T13: Implement design-stage generator that outputs initial `design.json`.
- T14: Implement design-iteration chat loop with selection-context prompts.
- T15: Add build-stage ingestion of approved design context (without schema coupling).
- T16: Add transition UX: prompt -> design iteration -> implementation kickoff.

Wave 4 (Hardening + regression):
- T17: Validate watcher/build/package compatibility with new design files.
- T18: Add migration/versioning for design document schema.
- T19: Add telemetry + diagnostics for design stage failures.
- T20: Add end-to-end integration tests (design flow through build kickoff).

Wave FINAL (Independent review in parallel):
- F1: Plan compliance audit (oracle)
- F2: Code quality review (unspecified-high)
- F3: Real manual QA execution by agent scripts (unspecified-high + playwright)
- F4: Scope fidelity check (deep)

Critical Path: T1 -> T4 -> T8 -> T13 -> T16 -> F1-F4
Parallel Speedup: ~60%
Max Concurrent: 6

### Dependency Matrix
- T1: blockedBy none -> blocks T6, T13, T18
- T2: blockedBy none -> blocks T13, T17
- T3: blockedBy none -> blocks T9, T10
- T4: blockedBy none -> blocks T8, T14, T16
- T5: blockedBy none -> blocks T14
- T6: blockedBy T1 -> blocks T8, T9, T11
- T7: blockedBy T1 -> blocks T8, T11
- T8: blockedBy T4,T6,T7 -> blocks T14,T16
- T9: blockedBy T3,T6 -> blocks T16
- T10: blockedBy T3 -> blocks T16
- T11: blockedBy T6,T7 -> blocks T20
- T12: blockedBy none -> blocks T13,T15
- T13: blockedBy T1,T2,T12 -> blocks T14,T15,T16
- T14: blockedBy T4,T5,T8,T13 -> blocks T16,T20
- T15: blockedBy T12,T13 -> blocks T16,T20
- T16: blockedBy T4,T8,T9,T10,T13,T14,T15 -> blocks T20
- T17: blockedBy T2 -> blocks T20
- T18: blockedBy T1 -> blocks T20
- T19: blockedBy T12,T13,T14 -> blocks T20
- T20: blockedBy T11,T14,T15,T16,T17,T18,T19 -> blocks F1-F4

### Agent Dispatch Summary
- Wave 1: T1 quick, T2 quick, T3 visual-engineering, T4 unspecified-high, T5 unspecified-high
- Wave 2: T6 visual-engineering, T7 quick, T8 unspecified-high, T9 visual-engineering, T10 quick, T11 unspecified-high
- Wave 3: T12 deep, T13 deep, T14 unspecified-high, T15 deep, T16 visual-engineering
- Wave 4: T17 quick, T18 quick, T19 unspecified-high, T20 deep
- Final: F1 oracle, F2 unspecified-high, F3 unspecified-high, F4 deep

---

## TODOs

- [x] 1. Define design document schema, types, and validators

  **What to do**:
  - Add new shared types for `DesignDocument`, `DesignFrame`, and `DesignElement` with versioning.
  - Add runtime validators and parse/serialize helpers.
  - Add unit tests for valid/invalid docs and schema evolution guardrails.

  **Must NOT do**:
  - Do not add design schema fields to runtime `GameDefinition`.
  - Do not model Figma-only concepts (auto-layout, vector path tooling) in v1.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused schema/contracts + tests in limited files.
  - **Skills**: [`game-authoring`, `testing-patterns`]
    - `game-authoring`: Align schema semantics with game authoring needs.
    - `testing-patterns`: Match project test conventions.
  - **Skills Evaluated but Omitted**:
    - `effects-system`: Not relevant to schema contracts.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2-T5)
  - **Blocks**: T6, T13, T18
  - **Blocked By**: None

  **References**:
  - `shared/src/types/GameDefinition.ts` - Existing style for serializable document contracts.
  - `shared/src/types/visual.ts` - Visual primitive naming and optional field style.
  - `apps/slopcade/components/editor/wireframe/LayoutAdapter.ts` - Existing screen/layout mapping semantics to mirror.

  **Acceptance Criteria**:
  - [ ] New design schema types compile and export cleanly.
  - [ ] Validator rejects malformed docs and unsupported versions.
  - [ ] Unit tests pass for parse + validation paths.

  **QA Scenarios**:
  ```
  Scenario: Valid design document parses successfully
    Tool: Bash
    Preconditions: Test file with valid design.json fixture exists
    Steps:
      1. Run test command for design schema tests.
      2. Assert validator returns success for valid fixture.
      3. Assert parsed frame count matches fixture.
    Expected Result: Tests pass and no validation errors
    Evidence: .sisyphus/evidence/task-1-validate-pass.txt

  Scenario: Unsupported schema version fails gracefully
    Tool: Bash
    Preconditions: Fixture has version "999.0"
    Steps:
      1. Run schema validation test case.
      2. Assert error includes "unsupported version".
    Expected Result: Deterministic failure with actionable error
    Evidence: .sisyphus/evidence/task-1-version-error.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): add design document schema and validation`
  - Files: `shared/src/types/*`, `shared/src/**/__tests__/*`
  - Pre-commit: `pnpm test`

- [x] 2. Add workspace persistence for `design.json`

  **What to do**:
  - Add file read/write lifecycle for `design.json` in editor workspace hooks.
  - Ensure create-if-missing behavior with default scaffold.
  - Add save debouncing and dirty-state integration.

  **Must NOT do**:
  - Do not persist design payload in runtime-only blobs.
  - Do not break existing workspace file behavior.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Scoped workspace I/O integration.
  - **Skills**: [`workspace-system`, `editor-system`]
    - `workspace-system`: Existing file and workspace lifecycle patterns.
    - `editor-system`: Editor state + file-view flow integration.
  - **Skills Evaluated but Omitted**:
    - `ai-game-generation`: Not needed for file persistence.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1,T3,T4,T5)
  - **Blocks**: T13, T17
  - **Blocked By**: None

  **References**:
  - `apps/slopcade/components/editor/useWorkspaceFiles.ts` - Existing open/save tab workflows.
  - `apps/slopcade/components/editor/StageArea.tsx` - Save trigger and compile trigger pattern.
  - `apps/slopcade/components/editor/EditorProvider.tsx` - Dirty-state patterns.

  **Acceptance Criteria**:
  - [ ] `design.json` auto-created for projects missing design file.
  - [ ] Save/load round trip preserves document content.
  - [ ] Existing non-design file tabs remain unaffected.

  **QA Scenarios**:
  ```
  Scenario: New workspace auto-creates design.json
    Tool: Playwright
    Preconditions: Game workspace without design.json
    Steps:
      1. Open editor route for workspace.
      2. Switch to Design Canvas panel.
      3. Verify design file appears in explorer and loads without errors.
    Expected Result: Default design document exists and renders
    Evidence: .sisyphus/evidence/task-2-autocreate.png

  Scenario: Corrupted design.json reports error without editor crash
    Tool: Playwright
    Preconditions: design.json contains invalid JSON
    Steps:
      1. Open Design Canvas panel.
      2. Observe error boundary/toast output.
      3. Verify other panels remain interactive.
    Expected Result: Graceful error with recovery path
    Evidence: .sisyphus/evidence/task-2-invalid-json.png
  ```

  **Commit**: YES
  - Message: `feat(editor): persist design.json in workspace lifecycle`
  - Files: `apps/slopcade/components/editor/useWorkspaceFiles.ts`, related hooks/tests
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 3. Replace wireframe panel entry with Design Canvas panel shell

  **What to do**:
  - Register `design-canvas` panel and route it into existing panel system.
  - Keep title/icon and placement aligned with existing editor UX.
  - Add fallback/loading states and remove wireframe-only assumptions.

  **Must NOT do**:
  - Do not leave duplicate wireframe + design canvas primary entries.
  - Do not break Dockview layout restoration.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Panel UX + shell integration in editor UI.
  - **Skills**: [`editor-system`, `frontend-ui-ux`]
    - `editor-system`: Panel registry and Dockview conventions.
    - `frontend-ui-ux`: Maintain coherent controls and visual affordance.
  - **Skills Evaluated but Omitted**:
    - `game-authoring`: Not needed for panel shell wiring.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1,T2,T4,T5)
  - **Blocks**: T9, T10
  - **Blocked By**: None

  **References**:
  - `apps/slopcade/components/editor/panels/registry.ts` - panel registration contract.
  - `apps/slopcade/components/editor/DockviewLayout.web.tsx` - dynamic panel component wiring.
  - `apps/slopcade/components/editor/panels/WireframePanel.tsx` - current replacement target.

  **Acceptance Criteria**:
  - [ ] Design Canvas appears in panel list and opens in expected placement.
  - [ ] Layout persistence works after reload.
  - [ ] No runtime import errors from removed wireframe path.

  **QA Scenarios**:
  ```
  Scenario: Panel registration and persistence
    Tool: Playwright
    Preconditions: Clean localStorage layout state
    Steps:
      1. Open editor and activate Design Canvas panel.
      2. Rearrange panel, refresh page.
      3. Assert panel restores in saved location.
    Expected Result: Panel persists correctly in layout
    Evidence: .sisyphus/evidence/task-3-layout-persist.png

  Scenario: Legacy wireframe panel IDs do not break restore
    Tool: Playwright
    Preconditions: localStorage includes old wireframe panel id
    Steps:
      1. Open editor with old layout state.
      2. Observe fallback mapping/upgrade behavior.
    Expected Result: App recovers layout and opens Design Canvas
    Evidence: .sisyphus/evidence/task-3-legacy-layout.png
  ```

  **Commit**: YES
  - Message: `feat(editor): replace wireframe panel with design canvas shell`
  - Files: `apps/slopcade/components/editor/panels/registry.ts`, `DockviewLayout.web.tsx`, new panel shell
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 4. Add editor design-selection context and mode wiring

  **What to do**:
  - Extend editor state to track selected frame/element in design canvas.
  - Add actions/selectors for selection updates from canvas + chat.
  - Preserve undo/redo and context synchronization.

  **Must NOT do**:
  - Do not couple design selection state to runtime entity selection in a way that breaks author/live mode.
  - Do not add second competing global state manager.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Central state changes with broad integration impact.
  - **Skills**: [`editor-system`, `testing-patterns`]
    - `editor-system`: reducer/state patterns and mode handling.
    - `testing-patterns`: prevent regressions in reducer transitions.
  - **Skills Evaluated but Omitted**:
    - `native-infrastructure`: Not relevant to state semantics.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1,T2,T3,T5)
  - **Blocks**: T8, T14, T16
  - **Blocked By**: None

  **References**:
  - `apps/slopcade/components/editor/EditorProvider.tsx` - reducer/action patterns.
  - `apps/slopcade/components/editor/InteractionLayer.tsx` - existing selection callback flow.
  - `apps/slopcade/components/editor/StageArea.tsx` - mode/view coordination.

  **Acceptance Criteria**:
  - [ ] Selection state for design frame/element is queryable by chat tools.
  - [ ] Mode transitions do not lose persisted selection unexpectedly.
  - [ ] Reducer tests cover new actions and undo/redo behavior.

  **QA Scenarios**:
  ```
  Scenario: Canvas selection updates shared editor state
    Tool: Playwright
    Preconditions: Design doc with multiple elements loaded
    Steps:
      1. Click an element in Design Canvas.
      2. Open debug/state panel output.
      3. Assert selectedDesignElementId matches clicked element.
    Expected Result: Selection context propagates consistently
    Evidence: .sisyphus/evidence/task-4-selection-state.png

  Scenario: Switching to live mode does not corrupt design selection state
    Tool: Playwright
    Preconditions: Design element selected
    Steps:
      1. Toggle to live mode and back to author/design mode.
      2. Assert selection recovery policy behaves as specified.
    Expected Result: No reducer errors; state remains coherent
    Evidence: .sisyphus/evidence/task-4-mode-toggle.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add design selection context to editor state`
  - Files: `apps/slopcade/components/editor/EditorProvider.tsx`, related tests
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 5. Add AI tool contracts for design document operations

  **What to do**:
  - Define chat tool interfaces for reading/updating design docs and selection context.
  - Add guardrails for bounded mutation operations (batch limits, schema checks).
  - Ensure tool outputs are deterministic and diff-friendly.

  **Must NOT do**:
  - Do not bypass schema validation for tool writes.
  - Do not allow unrestricted destructive operations without explicit instruction context.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Tool contract integrity affects AI behavior and safety.
  - **Skills**: [`agent-orchestration`, `testing-patterns`]
    - `agent-orchestration`: Tool definitions and stream/tool semantics.
    - `testing-patterns`: Contract tests and negative cases.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not required for API/tool contract work.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T4)
  - **Blocks**: T14
  - **Blocked By**: None

  **References**:
  - `api/src/chat/chat-tools.ts` - current tool definition patterns.
  - `api/src/chat/stream-handler.ts` - tool execution lifecycle.
  - `api/src/chat/agui-mapper.ts` - event mapping and tool result flow.

  **Acceptance Criteria**:
  - [ ] New tools registered and discoverable in chat runtime.
  - [ ] Writes are schema-validated and reject malformed payloads.
  - [ ] Contract tests pass for read, write, and invalid mutation attempts.

  **QA Scenarios**:
  ```
  Scenario: AI tool updates design element style
    Tool: Bash (curl)
    Preconditions: chat route available with dev auth token
    Steps:
      1. Send prompt requesting color change on selected element.
      2. Assert tool call payload targets selected element id.
      3. Assert resulting design.json diff contains color change only.
    Expected Result: Targeted, validated update succeeds
    Evidence: .sisyphus/evidence/task-5-tool-update.json

  Scenario: Invalid tool payload is rejected
    Tool: Bash (curl)
    Preconditions: Send malformed payload (missing element id)
    Steps:
      1. Invoke design update tool with invalid payload.
      2. Assert structured validation error response.
    Expected Result: No design file mutation, clear error message
    Evidence: .sisyphus/evidence/task-5-tool-error.json
  ```

  **Commit**: YES
  - Message: `feat(chat): add design document tool contracts`
  - Files: `api/src/chat/chat-tools.ts`, tests
  - Pre-commit: `pnpm -C api test`

- [x] 6. Implement Skia Design Canvas renderer for frames and elements

  **What to do**:
  - Build Skia-based renderer for frames, shape blocks, text, and image placeholders.
  - Map design schema to Skia primitives with stable layering.
  - Add selection highlight rendering hooks.

  **Must NOT do**:
  - Do not implement full vector/path editing in v1.
  - Do not regress current editor performance by blocking main thread.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: High-fidelity rendering architecture and UI behavior.
  - **Skills**: [`frontend-ui-ux`, `native-infrastructure`]
    - `frontend-ui-ux`: Visual hierarchy and component rendering polish.
    - `native-infrastructure`: Cross-platform Expo/Skia integration constraints.
  - **Skills Evaluated but Omitted**:
    - `godot-engine`: Not directly needed for design renderer.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T7,T9,T10,T11)
  - **Blocks**: T8, T9, T11
  - **Blocked By**: T1

  **References**:
  - `apps/slopcade/components/editor/wireframe/WireframeRenderer.tsx` - current render mapping baseline.
  - `apps/slopcade/components/editor/wireframe/WireframeViewer.web.tsx` - viewport framing patterns.
  - `apps/slopcade/components/editor/panels/WireframePanel.tsx` - panel chrome and controls to preserve.

  **Acceptance Criteria**:
  - [ ] Frames/elements render in Skia with expected z-order.
  - [ ] Selection visual state appears consistently.
  - [ ] Renderer runs on web + native without fatal feature gaps.

  **QA Scenarios**:
  ```
  Scenario: Multi-frame rendering on canvas
    Tool: Playwright
    Preconditions: design.json with at least 4 frames and mixed element types
    Steps:
      1. Open Design Canvas panel.
      2. Assert all frame titles are visible after zoom-to-fit.
      3. Capture screenshot and compare expected layout.
    Expected Result: All frames render correctly with visual fidelity
    Evidence: .sisyphus/evidence/task-6-render-multiframe.png

  Scenario: Missing image asset fallback
    Tool: Playwright
    Preconditions: One image element references invalid asset id
    Steps:
      1. Open canvas and locate image element bounds.
      2. Assert fallback placeholder appears instead of crash.
    Expected Result: Graceful fallback rendering
    Evidence: .sisyphus/evidence/task-6-image-fallback.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add skia design canvas renderer`
  - Files: new `DesignCanvas*` components
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 7. Implement infinite-canvas pan/zoom camera behavior

  **What to do**:
  - Add shared camera transform model (translate + scale) for design canvas.
  - Implement gesture + wheel handling for web and touch handling for native.
  - Add zoom-to-fit and reset camera actions.

  **Must NOT do**:
  - Do not mix world-meter camera math from runtime interaction layer.
  - Do not add platform-specific behavior that diverges UX drastically.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused transform/gesture logic with contained surface area.
  - **Skills**: [`input-handling`, `editor-system`]
    - `input-handling`: Gesture semantics and coordinate transforms.
    - `editor-system`: Align control behavior with panel commands.
  - **Skills Evaluated but Omitted**:
    - `physics`: Unrelated to design camera interactions.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6,T9,T10,T11)
  - **Blocks**: T8, T11
  - **Blocked By**: T1

  **References**:
  - `apps/slopcade/components/editor/InteractionLayer.tsx` - existing pan/pinch orchestration pattern.
  - `apps/slopcade/components/editor/panels/WireframePanel.tsx` - existing screen navigation controls.
  - `apps/slopcade/components/editor/StageArea.tsx` - preview/context control patterns.

  **Acceptance Criteria**:
  - [ ] Smooth pan/zoom interactions on web and native.
  - [ ] Zoom-to-fit shows all frames on initial load.
  - [ ] Camera transform remains numerically stable across repeated interactions.

  **QA Scenarios**:
  ```
  Scenario: Zoom-to-fit then deep zoom navigation
    Tool: Playwright
    Preconditions: multi-frame design document loaded
    Steps:
      1. Trigger zoom-to-fit action.
      2. Wheel zoom into one frame 3x.
      3. Pan to adjacent frame and verify continuity.
    Expected Result: Camera transitions smoothly with no jumps
    Evidence: .sisyphus/evidence/task-7-camera-navigation.mp4

  Scenario: Excessive zoom clamp
    Tool: Playwright
    Preconditions: canvas open
    Steps:
      1. Send repeated zoom-out gestures beyond min threshold.
      2. Assert zoom clamps at configured minimum.
    Expected Result: No inversion/NaN transforms
    Evidence: .sisyphus/evidence/task-7-zoom-clamp.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): add infinite canvas camera controls`
  - Files: design canvas camera modules
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 8. Implement element hit-testing, tap-to-select, and selection overlay

  **What to do**:
  - Implement hit-test ordering for nested elements and frame bounds.
  - Connect selection updates to editor state + chat context.
  - Render clear visual outline for selected frame/element.

  **Must NOT do**:
  - Do not add drag/resize manipulation scope in v1.
  - Do not allow ambiguous selection where topmost element is unclear.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core interaction correctness and AI-context integrity.
  - **Skills**: [`input-handling`, `editor-system`]
    - `input-handling`: Precise pointer-to-element mapping.
    - `editor-system`: Selection semantics feeding chat tools.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Secondary to core selection correctness.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6,T7,T9,T10,T11)
  - **Blocks**: T14, T16
  - **Blocked By**: T4, T6, T7

  **References**:
  - `apps/slopcade/components/editor/InteractionLayer.tsx` - existing hit-test control flow.
  - `apps/slopcade/components/editor/EditorProvider.tsx` - selection dispatch APIs.
  - `apps/slopcade/components/editor/wireframe/LayoutAdapter.ts` - existing bounds semantics.

  **Acceptance Criteria**:
  - [ ] Tapping a visible element selects the top-most matching target.
  - [ ] Selection outline and state panel match same target id.
  - [ ] Chat tools can read current selection id reliably.

  **QA Scenarios**:
  ```
  Scenario: Overlapping elements select top-most item
    Tool: Playwright
    Preconditions: Frame with two overlapping elements
    Steps:
      1. Tap overlap region.
      2. Assert selected id equals expected top-layer element.
      3. Verify outline appears around same element bounds.
    Expected Result: Deterministic top-layer selection
    Evidence: .sisyphus/evidence/task-8-overlap-selection.png

  Scenario: Tap empty area clears selection
    Tool: Playwright
    Preconditions: One element selected
    Steps:
      1. Tap empty canvas region.
      2. Assert selection id becomes null.
    Expected Result: Selection clears without errors
    Evidence: .sisyphus/evidence/task-8-clear-selection.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add tap-to-select and design overlay`
  - Files: design canvas interaction modules, provider wiring
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 9. Add design canvas panel UX controls and frame navigator

  **What to do**:
  - Add top controls: frame counter, next/prev frame, zoom-to-fit, selection breadcrumb.
  - Add frame list/sidebar affordances for quick navigation among many screens.
  - Ensure controls map to keyboard shortcuts on web and touch controls on native.

  **Must NOT do**:
  - Do not add complex timeline/storyboard editing in v1.
  - Do not duplicate controls already provided elsewhere in editor shell.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UX polish and control ergonomics across platforms.
  - **Skills**: [`frontend-ui-ux`, `editor-system`]
    - `frontend-ui-ux`: Clear, low-friction design navigation UI.
    - `editor-system`: Fit with existing panel behavior and theming.
  - **Skills Evaluated but Omitted**:
    - `agent-orchestration`: Not required for panel control UI.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6,T7,T8,T10,T11)
  - **Blocks**: T16
  - **Blocked By**: T3, T6

  **References**:
  - `apps/slopcade/components/editor/panels/WireframePanel.tsx` - existing header/navigation control pattern.
  - `apps/slopcade/components/editor/FileTabBar.tsx` - compact list/tab navigation patterns.
  - `apps/slopcade/components/editor/PreviewControls.tsx` - existing control cluster style.

  **Acceptance Criteria**:
  - [ ] Users can navigate among frames quickly without manual panning only.
  - [ ] Controls are accessible and consistent on web/native.
  - [ ] Selected frame/element context is visible in control UI.

  **QA Scenarios**:
  ```
  Scenario: Frame navigator controls update viewport target
    Tool: Playwright
    Preconditions: 5+ frames exist in design doc
    Steps:
      1. Click next-frame control twice.
      2. Assert viewport centers on expected frame.
      3. Assert frame counter updates correctly.
    Expected Result: Deterministic frame navigation
    Evidence: .sisyphus/evidence/task-9-frame-nav.png

  Scenario: Invalid frame index recovery
    Tool: Playwright
    Preconditions: Design doc edited to remove currently selected frame
    Steps:
      1. Reload panel with stale selected frame id.
      2. Assert fallback selects first valid frame.
    Expected Result: No crash, coherent fallback state
    Evidence: .sisyphus/evidence/task-9-frame-fallback.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): add design canvas navigation controls`
  - Files: design panel UI components
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 10. Remove wireframe mode hacks and legacy assumptions

  **What to do**:
  - Decommission `WireframeModeProvider` assumptions (hardcoded `totalScreens` behavior).
  - Remove or migrate obsolete wireframe-specific state paths.
  - Add compatibility layer for old layout IDs if needed.

  **Must NOT do**:
  - Do not leave dead wireframe toggles visible to users.
  - Do not break old saved layouts without fallback handling.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Cleanup/refactor with constrained blast radius.
  - **Skills**: [`editor-system`, `git-master`]
    - `editor-system`: Identify all wireframe wiring paths.
    - `git-master`: Keep cleanup changes atomic and safe.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Cleanup is mostly architecture-level.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6,T7,T8,T9,T11)
  - **Blocks**: T16
  - **Blocked By**: T3

  **References**:
  - `apps/slopcade/components/editor/wireframe/WireframeModeProvider.tsx` - hardcoded screens logic to remove.
  - `apps/slopcade/components/editor/panels/WireframePanel.tsx` - legacy panel behavior.
  - `apps/slopcade/components/editor/panels/registry.ts` - panel ID migration mapping.

  **Acceptance Criteria**:
  - [ ] No hardcoded screen-count behavior remains in design flow.
  - [ ] Legacy wireframe UI entry points removed or redirected.
  - [ ] Saved layouts with old panel ids recover gracefully.

  **QA Scenarios**:
  ```
  Scenario: Legacy wireframe state migration
    Tool: Playwright
    Preconditions: localStorage contains wireframe panel and mode state
    Steps:
      1. Open editor.
      2. Assert Design Canvas loads instead of broken panel.
    Expected Result: Backward-compatible transition
    Evidence: .sisyphus/evidence/task-10-legacy-migration.png

  Scenario: Removed provider imports do not break build
    Tool: Bash
    Preconditions: wireframe mode provider cleanup applied
    Steps:
      1. Run TypeScript check/build for app.
      2. Assert no unresolved import errors.
    Expected Result: Clean compile
    Evidence: .sisyphus/evidence/task-10-build-check.txt
  ```

  **Commit**: YES
  - Message: `refactor(editor): remove legacy wireframe mode assumptions`
  - Files: wireframe provider/panel cleanup files
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 11. Ensure cross-platform parity for Skia + interaction behavior

  **What to do**:
  - Resolve web/native gesture differences and text/image rendering parity.
  - Add platform-specific shims only where unavoidable.
  - Validate performance budget and fallback behavior.

  **Must NOT do**:
  - Do not ship platform-specific feature disparity in core interactions.
  - Do not defer native support to post-MVP.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-platform correctness and rendering edge cases.
  - **Skills**: [`native-infrastructure`, `input-handling`]
    - `native-infrastructure`: Expo + native compatibility constraints.
    - `input-handling`: Gesture parity and event normalization.
  - **Skills Evaluated but Omitted**:
    - `godot-engine`: Not required for Skia parity work.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6,T7,T8,T9,T10)
  - **Blocks**: T20
  - **Blocked By**: T6, T7

  **References**:
  - `apps/slopcade/components/editor/InteractionLayer.tsx` - current cross-platform gesture patterns.
  - `apps/slopcade/components/editor/wireframe/WireframeViewer.web.tsx` - web-specific panel implementation approach.
  - `apps/slopcade/components/editor/wireframe/WireframeViewer.native.tsx` - native-specific viewer split pattern.

  **Acceptance Criteria**:
  - [ ] Core interactions (pan/zoom/select) behave equivalently on web + native.
  - [ ] Text and image rendering produce acceptable parity.
  - [ ] Performance remains within interactive thresholds.

  **QA Scenarios**:
  ```
  Scenario: Web parity run
    Tool: Playwright
    Preconditions: web dev server running
    Steps:
      1. Execute scripted pan/zoom/select workflow.
      2. Assert final camera transform and selection IDs.
    Expected Result: Workflow passes on web
    Evidence: .sisyphus/evidence/task-11-web-parity.json

  Scenario: Native parity run
    Tool: interactive_bash
    Preconditions: native simulator running
    Steps:
      1. Run automated native interaction script / test harness.
      2. Assert same final state outputs as web baseline.
    Expected Result: Equivalent behavior on native
    Evidence: .sisyphus/evidence/task-11-native-parity.txt
  ```

  **Commit**: YES
  - Message: `fix(editor): enforce cross-platform design canvas parity`
  - Files: platform-specific canvas/interaction modules
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 12. Add new `design` stage to execution engine atomically

  **What to do**:
  - Extend stage union/type, stage order, prerequisites, and default runners.
  - Define artifact checkpoint schema for design stage output.
  - Add stage sequencing tests and prerequisite failure tests.

  **Must NOT do**:
  - Do not partially update stage configuration files.
  - Do not violate deterministic failure behavior.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Pipeline orchestration correctness is high-impact.
  - **Skills**: [`ai-game-generation`, `testing-patterns`]
    - `ai-game-generation`: Existing stage orchestration semantics.
    - `testing-patterns`: Robust stage-order and failure tests.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not relevant for backend stage pipeline.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T13-T16)
  - **Blocks**: T13, T15
  - **Blocked By**: None

  **References**:
  - `api/src/ai/agent/execution-engine.ts` - stage union/order/prerequisites.
  - `api/src/ai/agent/stages.ts` - stage exports/barrel used by execution engine imports.
  - `api/src/ai/agent/stages/planning.ts` and `build.ts` - adjacent stage patterns.

  **Acceptance Criteria**:
  - [ ] New stage appears in stage order in intended position.
  - [ ] Prerequisite checks enforce design stage dependencies correctly.
  - [ ] Existing stage execution remains stable.

  **QA Scenarios**:
  ```
  Scenario: Full stage sequence includes design
    Tool: Bash
    Preconditions: test harness for agent run pipeline
    Steps:
      1. Run execution-engine integration test.
      2. Assert stage order includes planning -> design -> build.
    Expected Result: Pipeline order matches intended additive flow
    Evidence: .sisyphus/evidence/task-12-stage-order.txt

  Scenario: Missing design artifact blocks build
    Tool: Bash
    Preconditions: simulate run with design artifact removed
    Steps:
      1. Invoke build stage without design prerequisite.
      2. Assert deterministic MISSING_PREREQUISITE failure.
    Expected Result: Controlled failure with explicit reason
    Evidence: .sisyphus/evidence/task-12-prereq-fail.txt
  ```

  **Commit**: YES
  - Message: `feat(ai): add design stage to execution pipeline`
  - Files: `api/src/ai/agent/execution-engine.ts`, stage exports/tests
  - Pre-commit: `pnpm -C api test`

- [x] 13. Implement design-stage generator for initial `design.json`

  **What to do**:
  - Implement stage runner that generates initial frames/elements from planning artifact.
  - Persist design artifact and workspace design file with traceable metadata.
  - Add prompt templates and output validation.

  **Must NOT do**:
  - Do not generate runtime GameDefinition in design stage.
  - Do not bypass schema validation when writing design outputs.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Model prompting + artifact correctness + validation.
  - **Skills**: [`ai-game-generation`, `agent-orchestration`]
    - `ai-game-generation`: Stage implementation and artifact handoff patterns.
    - `agent-orchestration`: Structured generation and tool streaming semantics.
  - **Skills Evaluated but Omitted**:
    - `game-authoring`: Not primary for stage-runner implementation.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12,T14,T15,T16)
  - **Blocks**: T14, T15, T16
  - **Blocked By**: T1, T2, T12

  **References**:
  - `api/src/ai/agent/stages/planning.ts` - artifact-generation stage template.
  - `api/src/ai/agent/stages/build.ts` - artifact persistence and checkpoint conventions.
  - `api/src/ai/agent/execution-engine.ts` - stage context contract.

  **Acceptance Criteria**:
  - [ ] Design stage emits valid `design.json` from planning input.
  - [ ] Artifact key/checkpoint persisted with stage metrics.
  - [ ] Invalid model output retries/fails with explicit validation errors.

  **QA Scenarios**:
  ```
  Scenario: Planning artifact produces initial design frames
    Tool: Bash
    Preconditions: test run with valid planning artifact
    Steps:
      1. Execute design stage runner test.
      2. Assert output artifact exists and parses as DesignDocument.
      3. Assert at least one frame generated.
    Expected Result: Valid initial design document produced
    Evidence: .sisyphus/evidence/task-13-generate-design.json

  Scenario: Malformed model response rejected
    Tool: Bash
    Preconditions: mocked model returns invalid JSON
    Steps:
      1. Run stage test with malformed payload.
      2. Assert validation failure and deterministic error code.
    Expected Result: No invalid artifact persisted
    Evidence: .sisyphus/evidence/task-13-invalid-output.txt
  ```

  **Commit**: YES
  - Message: `feat(ai): implement initial design stage generator`
  - Files: new `api/src/ai/agent/stages/design.ts`, tests
  - Pre-commit: `pnpm -C api test`

- [x] 14. Implement design-iteration chat loop with selection context

  **What to do**:
  - Add chat behavior that edits selected frames/elements using design tools.
  - Include selection context and nearby-frame context in prompts.
  - Add safe batching and explainable diff responses.

  **Must NOT do**:
  - Do not mutate unrelated frames by default.
  - Do not proceed with ambiguous target references without clarification.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Chat UX, tool orchestration, and scoped mutations.
  - **Skills**: [`agent-orchestration`, `editor-system`]
    - `agent-orchestration`: Stream/tool control and stateful chat loop.
    - `editor-system`: Bridge selection context from UI to AI tools.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Secondary versus orchestration logic.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12,T13,T15,T16)
  - **Blocks**: T16, T20
  - **Blocked By**: T4, T5, T8, T13

  **References**:
  - `api/src/chat/stream-handler.ts` - stream lifecycle and tool execution integration.
  - `api/src/chat/chat-tools.ts` - tool registration and argument structure.
  - `apps/slopcade/components/editor/ChatSidebar.tsx` - chat UX entrypoint.

  **Acceptance Criteria**:
  - [ ] Chat can target selected element by id reliably.
  - [ ] AI responses include structured summary of changed design nodes.
  - [ ] Off-target edits are prevented by scoped mutation rules.

  **QA Scenarios**:
  ```
  Scenario: Selected-element targeted edit
    Tool: Playwright
    Preconditions: Element selected in canvas
    Steps:
      1. Send prompt: "Make this button background orange".
      2. Assert tool payload includes selected element id.
      3. Assert only selected node diff changed.
    Expected Result: Scoped update to selected node only
    Evidence: .sisyphus/evidence/task-14-scoped-edit.json

  Scenario: Ambiguous target triggers clarification
    Tool: Playwright
    Preconditions: No selection, multiple similar elements exist
    Steps:
      1. Send prompt: "Make the card bigger".
      2. Assert assistant asks for target clarification before mutation.
    Expected Result: No mutation until disambiguated
    Evidence: .sisyphus/evidence/task-14-clarify.png
  ```

  **Commit**: YES
  - Message: `feat(chat): add selection-aware design iteration loop`
  - Files: chat handlers/tools + editor context bridges
  - Pre-commit: `pnpm -C api test && pnpm -C apps/slopcade test`

- [x] 15. Add build-stage ingestion of approved design context

  **What to do**:
  - Update build-stage prompt/template to consume approved design docs as reference.
  - Add mapping instructions from design frames/elements to runtime entities/components.
  - Preserve runtime model purity: design remains reference input, not embedded payload.

  **Must NOT do**:
  - Do not serialize design document into runtime output.
  - Do not skip planning/build safeguards when design doc is absent.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: High-impact generation behavior and model prompt quality.
  - **Skills**: [`ai-game-generation`, `game-authoring`]
    - `ai-game-generation`: Build-stage prompting and artifact generation patterns.
    - `game-authoring`: Accurate runtime mapping semantics.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not required for backend prompt/mapping logic.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12,T13,T14,T16)
  - **Blocks**: T16, T20
  - **Blocked By**: T12, T13

  **References**:
  - `api/src/ai/agent/stages/build.ts` - runtime artifact generation stage.
  - `shared/src/types/GameDefinition.ts` - runtime output schema constraints.
  - `api/src/ai/agent/stages/planning.ts` - prompt context assembly pattern.

  **Acceptance Criteria**:
  - [ ] Build stage consumes design context when available.
  - [ ] Runtime output remains valid GameDefinition without design leakage.
  - [ ] Fallback behavior works when design doc missing/invalid.

  **QA Scenarios**:
  ```
  Scenario: Build with approved design context
    Tool: Bash
    Preconditions: run with valid planning + design artifacts
    Steps:
      1. Execute build-stage integration test.
      2. Assert output GameDefinition reflects design intent (frame mapping hints).
      3. Assert no design schema fields in runtime output.
    Expected Result: Design-informed runtime artifact without schema leakage
    Evidence: .sisyphus/evidence/task-15-build-with-design.json

  Scenario: Build without design context fallback
    Tool: Bash
    Preconditions: planning artifact only
    Steps:
      1. Execute build stage.
      2. Assert build succeeds using baseline behavior.
    Expected Result: Backward-compatible build path
    Evidence: .sisyphus/evidence/task-15-build-fallback.txt
  ```

  **Commit**: YES
  - Message: `feat(ai): make build stage consume approved design context`
  - Files: `api/src/ai/agent/stages/build.ts`, prompt templates/tests
  - Pre-commit: `pnpm -C api test`

- [x] 16. Add explicit UX transition: prompt -> design iteration -> implementation

  **What to do**:
  - Add orchestrated UI states for generation phases in chat/editor shell.
  - Provide user actions: “Iterate Design”, “Approve Design”, “Start Implementation”.
  - Surface phase state and artifact status in editor UI.

  **Must NOT do**:
  - Do not auto-start implementation without explicit user approval.
  - Do not hide phase-state transitions from user.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Multi-step UX and state transitions across panels.
  - **Skills**: [`editor-system`, `frontend-ui-ux`]
    - `editor-system`: Integrate transition state with provider and panels.
    - `frontend-ui-ux`: Clear call-to-action flow for design-first journey.
  - **Skills Evaluated but Omitted**:
    - `game-authoring`: Not required for transition UI state machine.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with T12-T15)
  - **Blocks**: T20
  - **Blocked By**: T4, T8, T9, T10, T13, T14, T15

  **References**:
  - `apps/slopcade/components/editor/ChatSidebar.tsx` - action affordances and conversation context.
  - `apps/slopcade/components/editor/StageArea.tsx` - view switching and status indicators.
  - `api/src/chat/stream-handler.ts` - stage/phase event surfaces.

  **Acceptance Criteria**:
  - [ ] User can iterate multiple times in design phase without losing state.
  - [ ] Implementation phase starts only after explicit approval action.
  - [ ] Phase badges/status visible and synchronized with backend pipeline state.

  **QA Scenarios**:
  ```
  Scenario: Full phase transition happy path
    Tool: Playwright
    Preconditions: start from new game prompt
    Steps:
      1. Trigger generation and wait for design stage completion.
      2. Apply one design iteration prompt.
      3. Click Approve Design then Start Implementation.
      4. Assert build stage starts and status updates.
    Expected Result: Deterministic staged workflow
    Evidence: .sisyphus/evidence/task-16-phase-happy.mp4

  Scenario: Attempt implementation without approval is blocked
    Tool: Playwright
    Preconditions: design stage active, no approval
    Steps:
      1. Attempt Start Implementation action.
      2. Assert UI blocks action and requests approval.
    Expected Result: Guardrail enforced
    Evidence: .sisyphus/evidence/task-16-approval-guard.png
  ```

  **Commit**: YES
  - Message: `feat(editor): add design-to-implementation phase flow`
  - Files: editor/chat UI state integration
  - Pre-commit: `pnpm -C apps/slopcade test`

- [x] 17. Validate watchers/build/package pipeline with `design.json`

  **What to do**:
  - Verify game source watchers ignore/handle design files correctly.
  - Ensure compile/package flows do not fail on design artifacts.
  - Add explicit include/exclude rules where needed.

  **Must NOT do**:
  - Do not silently drop runtime-critical files while adding design-file filtering.
  - Do not assume watcher behavior without automated verification.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Build/watcher config validation and small targeted fixes.
  - **Skills**: [`workspace-system`, `game-package`]
    - `workspace-system`: File watcher/workspace lifecycle behavior.
    - `game-package`: Package compile/readiness pipeline expectations.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not relevant to watcher/build mechanics.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T18,T19,T20)
  - **Blocks**: T20
  - **Blocked By**: T2

  **References**:
  - `api/scripts/sync-r2.ts` - watcher/compile behavior around source files.
  - `apps/slopcade/components/editor/usePackageReadiness.ts` - readiness trigger path.
  - `apps/slopcade/components/editor/StageArea.tsx` - save/compile coupling.

  **Acceptance Criteria**:
  - [ ] Watchers run without errors when `design.json` changes.
  - [ ] Runtime package output is unchanged by design-only file additions.
  - [ ] Build logs explicitly show expected handling path for design files.

  **QA Scenarios**:
  ```
  Scenario: Watcher reacts safely to design.json updates
    Tool: Bash
    Preconditions: dev services running
    Steps:
      1. Modify design.json.
      2. Observe watcher output and compile trigger behavior.
      3. Assert no packaging failure occurs.
    Expected Result: Safe handling of design-only file changes
    Evidence: .sisyphus/evidence/task-17-watcher.log

  Scenario: Runtime bundle excludes design-only artifacts
    Tool: Bash
    Preconditions: package compile command available
    Steps:
      1. Run package compile.
      2. Inspect output for design schema leakage.
    Expected Result: Runtime bundle remains clean
    Evidence: .sisyphus/evidence/task-17-bundle-check.txt
  ```

  **Commit**: YES
  - Message: `chore(build): support design files in watcher and package flow`
  - Files: watcher/build config and tests
  - Pre-commit: `pnpm test`

- [x] 18. Add design-document versioning and migration utilities

  **What to do**:
  - Add version migration pipeline for future schema changes.
  - Implement migrate-on-load behavior with clear warnings.
  - Add test fixtures for backward compatibility.

  **Must NOT do**:
  - Do not break existing design documents on load.
  - Do not perform destructive migration without backup/trace metadata.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Focused utility layer and tests.
  - **Skills**: [`testing-patterns`, `editor-system`]
    - `testing-patterns`: Fixture-driven migration tests.
    - `editor-system`: Load-time integration in editor state.
  - **Skills Evaluated but Omitted**:
    - `ai-game-generation`: Not primary for local migration logic.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17,T19,T20)
  - **Blocks**: T20
  - **Blocked By**: T1

  **References**:
  - `shared/src/types/GameDefinition.ts` - versioned schema style and patterns.
  - `api/src/ai/agent/execution-engine.ts` - deterministic error reporting style for invalid versions.
  - `apps/slopcade/components/editor/useWorkspaceFiles.ts` - load-time parse hook points.

  **Acceptance Criteria**:
  - [ ] Older design docs migrate to current version on load.
  - [ ] Migration emits trace info for auditability.
  - [ ] Migration tests cover at least two historical fixtures.

  **QA Scenarios**:
  ```
  Scenario: Legacy design doc auto-migrates
    Tool: Bash
    Preconditions: fixture with version 0.x
    Steps:
      1. Load fixture via migration tests.
      2. Assert migrated output version is current.
      3. Assert semantic fields preserved.
    Expected Result: Safe upgrade path
    Evidence: .sisyphus/evidence/task-18-migration-pass.txt

  Scenario: Unknown future version fails safely
    Tool: Bash
    Preconditions: fixture with unsupported high version
    Steps:
      1. Run parser/migration.
      2. Assert explicit unsupported-version error.
    Expected Result: Controlled failure, no silent corruption
    Evidence: .sisyphus/evidence/task-18-unknown-version.txt
  ```

  **Commit**: YES
  - Message: `feat(editor): add design document migrations`
  - Files: migration utilities + tests
  - Pre-commit: `pnpm test`

- [x] 19. Add diagnostics and telemetry for design-stage failures

  **What to do**:
  - Add structured logs/diagnostics for design stage and iteration failures.
  - Expose meaningful failure states in diagnostics panel and chat UI.
  - Capture common error classes (schema errors, tool errors, stage timeouts).

  **Must NOT do**:
  - Do not hide underlying error causes behind generic messages.
  - Do not leak sensitive prompt/context data into user-visible logs.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-cutting diagnostics across backend and UI.
  - **Skills**: [`agent-orchestration`, `editor-system`]
    - `agent-orchestration`: Stream/stage failure observability points.
    - `editor-system`: Surface errors coherently in panel UX.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: helpful but secondary to observability plumbing.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17,T18,T20)
  - **Blocks**: T20
  - **Blocked By**: T12, T13, T14

  **References**:
  - `api/src/chat/stream-handler.ts` - runtime failure event handling.
  - `apps/slopcade/components/editor/DiagnosticsPanel.tsx` - diagnostics surfacing patterns.
  - `api/src/ai/agent/execution-engine.ts` - stage checkpoint + error metadata patterns.

  **Acceptance Criteria**:
  - [ ] Design-stage failures appear with actionable labels/messages.
  - [ ] Telemetry distinguishes design-generation vs design-iteration failure modes.
  - [ ] No sensitive payload leakage in logs.

  **QA Scenarios**:
  ```
  Scenario: Design stage timeout surfaces diagnostic
    Tool: Bash + Playwright
    Preconditions: mocked delayed design stage response
    Steps:
      1. Trigger design generation run.
      2. Force timeout path.
      3. Assert diagnostics panel shows timeout classification.
    Expected Result: Actionable error surfaced
    Evidence: .sisyphus/evidence/task-19-timeout-diagnostic.png

  Scenario: Schema validation failure is sanitized
    Tool: Bash
    Preconditions: invalid design payload from model
    Steps:
      1. Run failing design stage.
      2. Inspect emitted logs/events.
    Expected Result: Error explains class/cause without sensitive dump
    Evidence: .sisyphus/evidence/task-19-sanitized-error.txt
  ```

  **Commit**: YES
  - Message: `chore(ai): add design stage diagnostics and telemetry`
  - Files: stage runner, stream handler, diagnostics UI
  - Pre-commit: `pnpm test`

- [x] 20. Add end-to-end design-first flow integration tests

  **What to do**:
  - Add E2E coverage for prompt -> design stage -> iteration -> implementation kickoff.
  - Add fixture-based tests for design file persistence + stage handoff.
  - Add regression tests for legacy non-design flow.

  **Must NOT do**:
  - Do not skip negative-path coverage.
  - Do not rely only on unit tests for cross-stage behavior.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: End-to-end orchestration and integration reliability.
  - **Skills**: [`testing-patterns`, `agent-orchestration`]
    - `testing-patterns`: E2E fixture and assertion strategy.
    - `agent-orchestration`: Cross-stage and tool-call validation.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not central to E2E assertion logic.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with T17,T18,T19)
  - **Blocks**: F1-F4
  - **Blocked By**: T11, T14, T15, T16, T17, T18, T19

  **References**:
  - `apps/slopcade/components/editor/panels/WireframePanel.test.tsx` - existing editor panel test pattern to mirror for design canvas tests.
  - `api/src/chat/__tests__/` - chat stream and tool-call tests.
  - `api/src/ai/agent/stages/*.test.ts` - intended colocated stage-test convention for new design-stage tests.

  **Acceptance Criteria**:
  - [ ] E2E happy path passes from prompt to implementation kickoff.
  - [ ] At least one negative path per phase covered.
  - [ ] Legacy (no-design) path remains passing.

  **QA Scenarios**:
  ```
  Scenario: Full design-first pipeline happy path
    Tool: Playwright + Bash
    Preconditions: test game workspace and mock AI provider configured
    Steps:
      1. Start prompt-driven generation.
      2. Wait for design stage artifact generation.
      3. Apply one iteration edit with selected element context.
      4. Approve design and kick off implementation stage.
      5. Assert build artifact produced.
    Expected Result: End-to-end flow completes successfully
    Evidence: .sisyphus/evidence/task-20-e2e-happy.json

  Scenario: Design-stage failure recovery path
    Tool: Playwright + Bash
    Preconditions: inject design stage validation failure
    Steps:
      1. Trigger generation.
      2. Observe failure in diagnostics/chat.
      3. Retry design generation action.
      4. Assert recovery and continued flow.
    Expected Result: Failure recoverable without session corruption
    Evidence: .sisyphus/evidence/task-20-e2e-recovery.json
  ```

  **Commit**: YES
  - Message: `test(editor): add end-to-end coverage for design-first flow`
  - Files: e2e/integration tests across app + api
  - Pre-commit: `pnpm test`

---

## Final Verification Wave (MANDATORY)

- [x] F1. **Plan Compliance Audit** — `oracle`
  Validate Must Have / Must NOT Have and evidence completeness across all tasks.

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run static checks + test suite; detect unsafe patterns and architecture drift.

- [x] F3. **Real QA Execution** — `unspecified-high` (+ `playwright`)
  Execute all task QA scenarios, capture artifacts under `.sisyphus/evidence/final-qa/`.

- [x] F4. **Scope Fidelity Check** — `deep`
  Confirm implementation matches plan 1:1 without unauthorized scope expansion.

---

## Commit Strategy

- Wave 1 contracts: `feat(editor): add design document schema and panel shell`
- Wave 2 canvas: `feat(editor): add skia design canvas and selection interactions`
- Wave 3 pipeline: `feat(ai): add design stage and iteration flow`
- Wave 4 hardening: `chore(editor): add design-flow telemetry migration and e2e coverage`

---

## Success Criteria

### Verification Commands
```bash
pnpm test
pnpm -C apps/slopcade test
pnpm -C api test
pnpm -C apps/slopcade web
```

### Final Checklist
- [ ] Design canvas panel is cross-platform and replaces wireframe panel role.
- [ ] Design documents are persisted as standalone file-based artifacts.
- [ ] AI design stage and iteration loop are operational before build stage.
- [ ] Build stage consumes design context but runtime stays GameDefinition-native.
- [ ] Existing editor/game preview workflows remain functional.
