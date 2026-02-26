# Skia Design Canvas Fidelity Upgrade

## TL;DR

> **Quick Summary**: Upgrade the current low-fidelity Design Canvas into a high-fidelity, cross-platform visual design surface that supports real images, richer vector primitives, better text/layout behavior, and direct AI-assisted iteration, while keeping design data separate from runtime `GameDefinition`.
>
> **Deliverables**:
> - Expanded design schema (new element types + shared style/transform fields + migration).
> - High-fidelity Skia renderer for web/native with real image rendering and richer visual features.
> - Interaction layer upgrades (drag, resize, rotate, snapping, multi-select basics).
> - AI tooling upgrades for richer canvas edits and safer validation.
> - Design-to-build mapping contract (design intent ingestion, not schema leakage into runtime).
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 implementation waves + final verification wave
> **Critical Path**: T1 -> T5 -> T10 -> T14 -> T18 -> F1-F4

---

## Context

### Original Request
User asked for the full plan needed so the Skia design stage can handle the practical design needs expected from modern tools (images, shapes, vector-like content, richer text/layout behavior), rather than the current placeholder-level fidelity.

### Interview Summary
**Key Discussions**:
- Current implementation is intentionally low-fidelity (rect/text placeholders, no real image rendering).
- User wants the complete roadmap, not incremental patch suggestions.
- Cross-platform parity (web + native) remains non-negotiable.
- Design model must remain separate from runtime `GameDefinition`.

**Research Findings**:
- `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` currently renders basic rect/text and placeholder image blocks.
- `shared/src/types/design.ts` currently supports only `rect`, `text`, and `image` unions.
- `apps/slopcade/components/editor/panels/designCanvasHitTest.ts` is AABB-based and can be expanded.
- Camera, selection, and panel shell are already stable and reusable.

### Metis Review
**Identified Gaps** (addressed in this plan):
- Missing explicit guardrails to prevent scope explosion into full collaborative Figma clone.
- Missing acceptance criteria for fidelity, performance, and migration safety.
- Missing edge-case handling for image failures, invalid geometry, and large documents.
- Missing explicit design-to-build contract boundaries.

---

## Work Objectives

### Core Objective
Deliver a production-usable design phase with materially higher visual fidelity and editing capability, so users can iterate on meaningful visual intent before implementation.

### Concrete Deliverables
- Expanded schema + migration path in `shared/src/types/design.ts` and migration utilities.
- New/updated renderer capabilities in `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx`.
- New interaction/hit-test utilities in `apps/slopcade/components/editor/panels/`.
- Updated AI design tools and prompts in `api/src/chat/` and `api/src/ai/agent/`.
- Tests across shared/app/api validating behavior and compatibility.

### Definition of Done
- [ ] New design element types and style fields validate and migrate correctly.
- [ ] Renderer displays real images and richer shape/text behavior on web + native.
- [ ] Core interactions (drag/resize/rotate/snap/select) are stable and tested.
- [ ] AI design iteration can safely mutate new element types.
- [ ] Build stage ingests richer design intent without leaking design schema into runtime model.

### Must Have
- Cross-platform parity for all newly supported element/render features.
- Backward-compatible migration from existing `design.json` documents.
- Performance safeguards for medium-large documents.

### Must NOT Have (Guardrails)
- No real-time multiplayer collaboration.
- No plugin ecosystem, comments, or branching/version UI.
- No full timeline/animation editor.
- No image editing suite (crop/filter/compositing).
- No design schema fields added to runtime `GameDefinition`.

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — verification is fully agent-executed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (targeted unit/integration + critical interaction coverage)
- **Frameworks**: Vitest (app/shared/api), TypeScript typecheck

### QA Policy
- Every task includes concrete QA scenarios with exact tools and evidence artifacts.
- UI interactions verified using Playwright/agent-browser flows and screenshots.
- API behavior verified via test suites and targeted command execution.
- Evidence root: `.sisyphus/evidence/skia-fidelity-upgrade/`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation contracts + migration + safety):
- T1 Schema extension baseline
- T2 Shared style/transform normalization
- T3 Migration v1.0 -> v1.1
- T4 Validation hardening + error surfaces
- T5 Renderer abstraction split (shape/image/text pipelines)
- T6 Asset/image resolution service contract
- T7 Performance instrumentation baseline

Wave 2 (Core fidelity rendering):
- T8 Real image rendering
- T9 Shape expansion (circle/line/path)
- T10 Text fidelity improvements
- T11 Visual effects baseline (opacity/shadow/gradients)
- T12 Advanced hit-testing support
- T13 Selection overlay v2 (handles + affordances)
- T14 Native parity pass for all Wave 2 features

Wave 3 (Authoring interactions + AI wiring):
- T15 Drag/move + keyboard nudging
- T16 Resize/rotate interactions
- T17 Snapping/grid/guides
- T18 Multi-select + group basics
- T19 AI tool/schema updates for richer element edits
- T20 Prompt and design-stage contract updates
- T21 Conflict-safe document update semantics

Wave 4 (Design-to-build integration + hardening):
- T22 Build-stage richer design-intent ingestion
- T23 Design-to-runtime mapping guardrails/tests
- T24 Large-document performance tuning
- T25 Error/fallback UX for invalid assets/fonts/geometry
- T26 End-to-end integration coverage (design->build)
- T27 Backward compatibility and regression sweep

Wave FINAL (Independent verification gate):
- F1 Plan compliance audit
- F2 Code quality/type/lint/test gate
- F3 Full QA scenario execution and evidence capture
- F4 Scope fidelity and anti-creep audit

### Dependency Matrix
- T1, T2, T3, T4, T5, T6, T7: no blockers
- T8 depends on T5, T6
- T9 depends on T1, T5
- T10 depends on T1, T5
- T11 depends on T2, T5
- T12 depends on T1, T9
- T13 depends on T12
- T14 depends on T8, T9, T10, T11, T12, T13
- T15 depends on T12, T13
- T16 depends on T13, T15
- T17 depends on T15
- T18 depends on T15, T16
- T19 depends on T1, T2, T3
- T20 depends on T19
- T21 depends on T19
- T22 depends on T20
- T23 depends on T22
- T24 depends on T8, T9, T10, T11
- T25 depends on T8, T10
- T26 depends on T14, T18, T22, T23
- T27 depends on T26

### Agent Dispatch Summary
- Wave 1: mostly `quick` / `unspecified-high` (schema + infra)
- Wave 2: mix of `visual-engineering` + `unspecified-high`
- Wave 3: mix of `visual-engineering` + `deep` (interaction + AI contract)
- Wave 4: mix of `deep` + `unspecified-high`
- Final wave: `oracle`, `unspecified-high`, `deep`

---

## TODOs

- [ ] 1. Expand design element schema to v1.1

  **What to do**:
  - Add new element unions (`circle`, `line`, `path`, `group`) in `shared/src/types/design.ts`.
  - Add focused schema tests for parse/validation failure paths.

  **Must NOT do**:
  - Do not modify runtime `GameDefinition` types.

  **Recommended Agent Profile**:
  - **Category**: `quick` (schema-focused, bounded changes)
  - **Skills**: `ecs-architecture`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: T9, T10, T12, T19
  - **Blocked By**: None

  **References**:
  - `shared/src/types/design.ts` - primary schema source.
  - `shared/src/types/__tests__/design.test.ts` - pattern for schema assertions.

  **Acceptance Criteria**:
  - [ ] New unions validate expected shapes.
  - [ ] Invalid type-specific payloads fail with actionable errors.

  **QA Scenarios**:
  ```
  Scenario: New element types parse
    Tool: Bash
    Steps: run shared design schema tests
    Expected Result: tests pass for circle/line/path/group fixtures
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-1-schema-pass.txt

  Scenario: Invalid path payload rejected
    Tool: Bash
    Steps: run negative-case test with malformed path data
    Expected Result: validation throws with field-level error
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-1-schema-fail.txt
  ```

- [ ] 2. Normalize shared style/transform fields

  **What to do**:
  - Introduce shared style fields (`opacity`, `rotation`, optional shadow/gradient descriptors) across element schemas.
  - Keep defaults explicit and backward compatible.

  **Must NOT do**:
  - Do not force all elements to carry non-required visual fields.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `testing-patterns`, `nativewind-theming`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: T11, T19
  - **Blocked By**: None

  **References**:
  - `shared/src/types/design.ts` - shared field definitions.
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - field consumption targets.

  **Acceptance Criteria**:
  - [ ] Shared fields exist and are optional with stable defaults.
  - [ ] Existing v1.0 documents remain valid after migration.

  **QA Scenarios**:
  ```
  Scenario: Shared style defaults apply
    Tool: Bash
    Steps: execute unit tests covering absent optional style fields
    Expected Result: parser returns valid doc with stable behavior
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-2-style-defaults.txt

  Scenario: Out-of-range opacity rejected
    Tool: Bash
    Steps: run negative test using invalid opacity value
    Expected Result: schema validation fails deterministically
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-2-style-invalid.txt
  ```

- [ ] 3. Implement migration pipeline v1.0 -> v1.1

  **What to do**:
  - Add migration logic and tests in `shared/src/types/design-migrations.ts`.
  - Ensure old docs are upgraded without data loss.

  **Must NOT do**:
  - Do not silently drop unknown fields without test coverage.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `testing-patterns`, `workspace-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: T19
  - **Blocked By**: None

  **References**:
  - `shared/src/types/design-migrations.ts` - migration entrypoint.
  - `shared/src/types/__tests__/design-migrations.test.ts` - migration test pattern.

  **Acceptance Criteria**:
  - [ ] Legacy docs migrate to v1.1.
  - [ ] Unsupported future versions fail explicitly.

  **QA Scenarios**:
  ```
  Scenario: v1.0 document migrates cleanly
    Tool: Bash
    Steps: run migration tests with representative v1.0 fixtures
    Expected Result: upgraded doc passes v1.1 schema
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-3-migration-pass.txt

  Scenario: unknown version rejected
    Tool: Bash
    Steps: run test with future-version fixture
    Expected Result: explicit unsupported-version error
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-3-migration-fail.txt
  ```

- [ ] 4. Harden design validation and error surfacing

  **What to do**:
  - Improve validation error shaping and user-facing messages for malformed design docs.
  - Wire consistent error pathways through editor load/save and API tools.

  **Must NOT do**:
  - Do not expose raw stack traces to chat/tool responses.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `editor-system`, `agent-orchestration`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: T25
  - **Blocked By**: None

  **References**:
  - `apps/slopcade/components/editor/useDesignDocument.ts` - load/save error handling.
  - `api/src/chat/chat-tools.ts` - safe tool-level error contracts.

  **Acceptance Criteria**:
  - [ ] Corrupt docs fail gracefully without editor crash.
  - [ ] Tool errors remain structured and actionable.

  **QA Scenarios**:
  ```
  Scenario: Invalid JSON in design document
    Tool: Playwright
    Steps: open workspace with malformed design.json
    Expected Result: user-visible error state, editor remains usable
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-4-invalid-json.png

  Scenario: invalid tool update payload
    Tool: Bash
    Steps: run tool-level test using invalid field update
    Expected Result: structured error response with reason
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-4-tool-error.txt
  ```

- [ ] 5. Split renderer into composable pipelines

  **What to do**:
  - Refactor `DesignCanvasRenderer.tsx` into shape/image/text/group render helpers.
  - Keep existing visual behavior intact before adding new features.

  **Must NOT do**:
  - Do not change user-visible behavior in this refactor task.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `editor-system`, `native-infrastructure`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: T8, T9, T10, T11
  - **Blocked By**: None

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - current monolithic renderer.
  - `apps/slopcade/components/editor/panels/designCanvasHitTest.ts` - geometry assumptions to preserve.

  **Acceptance Criteria**:
  - [ ] Renderer structure modularized with no regressions.
  - [ ] Existing rect/text/image placeholder behavior unchanged.

  **QA Scenarios**:
  ```
  Scenario: Baseline canvas parity after refactor
    Tool: Playwright
    Steps: capture before/after screenshot for same fixture document
    Expected Result: no visual delta except acceptable anti-alias noise
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-5-refactor-parity.png

  Scenario: renderer handles unknown element safely
    Tool: Bash
    Steps: run unit test with unknown element type injection
    Expected Result: element skipped or surfaced safely, no crash
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-5-unknown-safe.txt
  ```

- [ ] 6. Add image asset resolution contract

  **What to do**:
  - Define image source priority (`assetRef` -> local asset URL -> `imageUrl`).
  - Implement caching/fallback hooks for image retrieval.

  **Must NOT do**:
  - Do not block render thread on unresolved network fetches.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `storage-ops`, `editor-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: T8
  - **Blocked By**: None

  **References**:
  - `shared/src/types/design.ts` - image element fields.
  - `apps/slopcade/components/editor/useWorkspaceFiles.ts` - workspace file access patterns.

  **Acceptance Criteria**:
  - [ ] Deterministic source-resolution order documented and tested.
  - [ ] Missing assets fall back to placeholder visuals without exceptions.

  **QA Scenarios**:
  ```
  Scenario: valid assetRef resolves and renders
    Tool: Playwright
    Steps: open design with known valid assetRef image element
    Expected Result: actual image appears in frame
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-6-image-resolve.png

  Scenario: broken image source fallback
    Tool: Playwright
    Steps: open design with invalid imageUrl
    Expected Result: fallback placeholder appears with no crash
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-6-image-fallback.png
  ```

- [ ] 7. Add renderer performance instrumentation baseline

  **What to do**:
  - Add element-count/render-duration diagnostics for development and tests.
  - Add benchmark fixture docs (100/300/500 elements).

  **Must NOT do**:
  - Do not ship verbose logging in production mode.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `editor-system`, `testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Blocks**: T24
  - **Blocked By**: None

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - timing instrumentation insertion points.
  - `api/src/ai/agent/stages/design.ts` - telemetry formatting conventions.

  **Acceptance Criteria**:
  - [ ] Benchmark fixture rendering metrics captured in CI-safe output.
  - [ ] Perf counters available for later tuning tasks.

  **QA Scenarios**:
  ```
  Scenario: benchmark fixture metrics captured
    Tool: Bash
    Steps: run renderer perf test suite
    Expected Result: output includes frame render timings per fixture size
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-7-perf-metrics.txt

  Scenario: production mode suppresses debug logs
    Tool: Bash
    Steps: run production build test with instrumentation enabled
    Expected Result: no dev-only perf logs emitted
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-7-perf-prod.txt
  ```

- [ ] 8. Render real images in canvas

  **What to do**:
  - Replace image placeholders with actual Skia image rendering.
  - Support `contain`/`cover`/`fill` behaviors from schema.

  **Must NOT do**:
  - Do not remove fallback placeholder for failed loads.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `editor-system`, `native-infrastructure`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: T14, T24, T25
  - **Blocked By**: T5, T6

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - image branch to replace.
  - `shared/src/types/design.ts` - `DesignElementImageSchema`.

  **Acceptance Criteria**:
  - [ ] Image elements render real assets/URLs.
  - [ ] Fit modes apply correctly for frame-relative sizing.

  **QA Scenarios**:
  ```
  Scenario: image renders with contain fit
    Tool: Playwright
    Steps: load fixture with contain image and compare expected letterboxing
    Expected Result: full image visible without distortion
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-8-image-contain.png

  Scenario: broken image URL fallback
    Tool: Playwright
    Steps: load fixture with invalid image URL
    Expected Result: fallback placeholder rendered, no runtime crash
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-8-image-broken.png
  ```

- [ ] 9. Add shape expansion: circle, line, path

  **What to do**:
  - Implement rendering for new geometric element types.
  - Add deterministic z-order and stroke/fill handling.

  **Must NOT do**:
  - Do not merge path editing UX into this rendering-only task.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `editor-system`, `physics`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: T12, T14, T24
  - **Blocked By**: T1, T5

  **References**:
  - `shared/src/types/design.ts` - new shape schemas.
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - shape rendering switch.

  **Acceptance Criteria**:
  - [ ] New shape types render accurately in both platforms.
  - [ ] Stroke/fill behavior matches schema fields.

  **QA Scenarios**:
  ```
  Scenario: mixed shape fixture renders correctly
    Tool: Playwright
    Steps: open fixture with circle/line/path elements
    Expected Result: all shapes visible with expected position and style
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-9-shapes.png

  Scenario: malformed path element fails safely
    Tool: Bash
    Steps: run test with invalid path data
    Expected Result: element skipped/error surfaced without panel crash
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-9-path-invalid.txt
  ```

- [ ] 10. Improve text fidelity and layout

  **What to do**:
  - Support multiline text and alignment behavior.
  - Respect `fontSize`, `fontWeight`, and text box bounds.

  **Must NOT do**:
  - Do not add rich-text editor controls in this task.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `editor-system`, `native-infrastructure`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: T14, T24, T25
  - **Blocked By**: T1, T5

  **References**:
  - `shared/src/types/design.ts` - text element fields.
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - text branch.

  **Acceptance Criteria**:
  - [ ] Text respects line breaks and alignment.
  - [ ] Text style fields affect rendering as expected.

  **QA Scenarios**:
  ```
  Scenario: multiline centered text renders in bounds
    Tool: Playwright
    Steps: open text-heavy fixture with multiline/center alignment
    Expected Result: text wraps/aligns inside box without clipping regressions
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-10-text-multiline.png

  Scenario: missing font fallback
    Tool: Playwright
    Steps: use fixture referencing unavailable font weight variant
    Expected Result: stable fallback font rendered
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-10-text-fallback.png
  ```

- [ ] 11. Add visual effects baseline (opacity/shadow/gradients)

  **What to do**:
  - Render core style effects supported by schema.
  - Keep implementation deterministic across web/native.

  **Must NOT do**:
  - Do not introduce custom post-processing effect graphs.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `effects-system`, `editor-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: T14, T24
  - **Blocked By**: T2, T5

  **References**:
  - `shared/src/types/design.ts` - effect fields.
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - style application points.

  **Acceptance Criteria**:
  - [ ] Opacity and shadow render consistently.
  - [ ] Linear/radial gradient fills apply for supported shapes.

  **QA Scenarios**:
  ```
  Scenario: gradient and shadow fixture
    Tool: Playwright
    Steps: open fixture with gradient + shadow combinations
    Expected Result: expected visual styling appears on both platforms
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-11-effects.png

  Scenario: unsupported gradient payload
    Tool: Bash
    Steps: run validation test with malformed gradient stops
    Expected Result: validation fails with explicit reason
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-11-effects-invalid.txt
  ```

- [ ] 12. Extend hit-testing for advanced geometry

  **What to do**:
  - Update hit-test engine to support circle/line/path bounds + rotation-aware checks.
  - Maintain predictable topmost selection order.

  **Must NOT do**:
  - Do not degrade simple rect hit performance.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `editor-system`, `physics`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: T13, T15
  - **Blocked By**: T1, T9

  **References**:
  - `apps/slopcade/components/editor/panels/designCanvasHitTest.ts` - current engine.
  - `apps/slopcade/components/editor/__tests__/DesignCanvasHitTest.test.ts` - test extension point.

  **Acceptance Criteria**:
  - [ ] Hit-tests resolve correct element for new geometry types.
  - [ ] Overlap/z-index behavior remains deterministic.

  **QA Scenarios**:
  ```
  Scenario: overlapping mixed geometry selection
    Tool: Bash
    Steps: run hit-test suite with overlapping path/circle/rect fixtures
    Expected Result: topmost element selected consistently
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-12-hit-overlap.txt

  Scenario: rotated element edge tap
    Tool: Bash
    Steps: run hit-test case near rotated boundary
    Expected Result: expected hit/no-hit classification
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-12-hit-rotated.txt
  ```

- [ ] 13. Build selection overlay v2 with transform handles

  **What to do**:
  - Add resize/rotate handle visuals and clear affordances.
  - Preserve frame-vs-element selection distinctions.

  **Must NOT do**:
  - Do not ship invisible/too-small touch targets.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `editor-system`, `input-handling`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Blocks**: T15, T16
  - **Blocked By**: T12

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - current overlay.
  - `apps/slopcade/components/editor/EditorProvider.tsx` - selection state model.

  **Acceptance Criteria**:
  - [ ] Selected elements show transform handles.
  - [ ] Handles are usable with mouse and touch.

  **QA Scenarios**:
  ```
  Scenario: select element shows handles
    Tool: Playwright
    Steps: tap known element in fixture
    Expected Result: handle set appears at expected locations
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-13-handles.png

  Scenario: tiny element remains selectable
    Tool: Playwright
    Steps: tap tiny element and nearest handle
    Expected Result: stable selection without accidental deselect
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-13-small-handle.png
  ```

- [ ] 14. Complete cross-platform parity pass for fidelity features

  **What to do**:
  - Validate and patch web/native differences for Waves 2 features.
  - Ensure parity in render output and interaction behavior.

  **Must NOT do**:
  - Do not leave known platform-specific TODOs unresolved.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `native-infrastructure`, `editor-system`

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 2 completion gate)
  - **Blocks**: T26
  - **Blocked By**: T8, T9, T10, T11, T12, T13

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasPanel.tsx`
  - `apps/slopcade/components/editor/panels/DesignCanvasPanel.native.tsx`
  - `apps/slopcade/components/editor/panels/useDesignCamera.web.ts`
  - `apps/slopcade/components/editor/panels/useDesignCamera.native.ts`

  **Acceptance Criteria**:
  - [ ] Feature matrix parity documented and green for both platforms.
  - [ ] No platform-specific crashers in fidelity paths.

  **QA Scenarios**:
  ```
  Scenario: web/native parity screenshot sweep
    Tool: Playwright + native test flow
    Steps: render same fixtures on both platforms and compare snapshots
    Expected Result: parity within accepted visual delta budget
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-14-parity-report.txt

  Scenario: native gesture interactions with new overlay
    Tool: interactive_bash
    Steps: run native interaction test suite for pan/select/handle taps
    Expected Result: tests pass with no gesture conflicts
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-14-native-gestures.txt
  ```

- [ ] 15. Implement drag/move and keyboard nudge interactions

  **What to do**:
  - Add pointer/touch drag to reposition selected elements.
  - Add keyboard nudging for precise movement on web.

  **Must NOT do**:
  - Do not break existing canvas pan behavior when no element selected.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `input-handling`, `editor-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocks**: T16, T17, T18
  - **Blocked By**: T12, T13

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasPanel.tsx` - keyboard pattern.
  - `apps/slopcade/components/editor/panels/useDesignCamera.ts` - camera gesture boundaries.

  **Acceptance Criteria**:
  - [ ] Dragging moves selected element with smooth updates.
  - [ ] Arrow key nudging adjusts by fixed step sizes.

  **QA Scenarios**:
  ```
  Scenario: drag selected element
    Tool: Playwright
    Steps: select element and drag by known delta
    Expected Result: element position updates by expected coordinates
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-15-drag.png

  Scenario: pan fallback when no selection
    Tool: Playwright
    Steps: drag empty canvas with no selected element
    Expected Result: camera pans, element positions unchanged
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-15-pan-fallback.png
  ```

- [ ] 16. Implement resize and rotate interactions

  **What to do**:
  - Connect overlay handles to resize/rotate transforms.
  - Clamp minimum sizes and preserve numeric stability.

  **Must NOT do**:
  - Do not allow negative width/height outputs.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `input-handling`, `physics`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocks**: T18
  - **Blocked By**: T13, T15

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - transform application points.
  - `shared/src/types/design.ts` - transform fields.

  **Acceptance Criteria**:
  - [ ] Resize/rotate operations update model correctly.
  - [ ] Constraints prevent invalid geometry values.

  **QA Scenarios**:
  ```
  Scenario: resize from corner handle
    Tool: Playwright
    Steps: select element, drag corner handle to new bounds
    Expected Result: width/height reflect expected delta
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-16-resize.png

  Scenario: rotate then hit-test selection
    Tool: Playwright
    Steps: rotate element and click within rotated bounds
    Expected Result: rotated element remains selectable
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-16-rotate-hit.png
  ```

- [ ] 17. Add snapping, guides, and optional grid display

  **What to do**:
  - Add edge/center snapping and lightweight visual guide lines.
  - Add optional grid toggle for alignment.

  **Must NOT do**:
  - Do not introduce heavy auto-layout behavior.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `editor-system`, `input-handling`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocks**: T26
  - **Blocked By**: T15

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasPanel.tsx` - header controls/toggles.
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - guide rendering layer.

  **Acceptance Criteria**:
  - [ ] Snap behavior can be enabled/disabled.
  - [ ] Alignment guides appear only during relevant transforms.

  **QA Scenarios**:
  ```
  Scenario: snap to center guide
    Tool: Playwright
    Steps: drag element near frame center with snapping enabled
    Expected Result: element snaps to center and guide line appears
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-17-snap-center.png

  Scenario: snapping disabled free movement
    Tool: Playwright
    Steps: toggle snapping off and drag near guide position
    Expected Result: no forced snap occurs
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-17-snap-off.png
  ```

- [ ] 18. Add multi-select and group basics

  **What to do**:
  - Add multi-select state model and marquee/shift selection.
  - Add minimal group/ungroup operations aligned with new schema.

  **Must NOT do**:
  - Do not build full component/symbol library features.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `editor-system`, `ecs-architecture`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocks**: T26
  - **Blocked By**: T15, T16

  **References**:
  - `apps/slopcade/components/editor/EditorProvider.tsx` - selection state/reducer patterns.
  - `shared/src/types/design.ts` - group element contract.

  **Acceptance Criteria**:
  - [ ] Multiple elements can be selected and transformed together.
  - [ ] Grouping preserves relative transforms.

  **QA Scenarios**:
  ```
  Scenario: shift-select two elements and move
    Tool: Playwright
    Steps: shift-click two elements and drag
    Expected Result: both move by identical delta
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-18-multiselect.png

  Scenario: ungroup restores individual selection
    Tool: Playwright
    Steps: group selected elements, then ungroup
    Expected Result: children remain intact and independently selectable
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-18-ungroup.png
  ```

- [ ] 19. Update AI tool contracts for richer schema edits

  **What to do**:
  - Extend chat tool input schemas for new element types/style fields.
  - Keep validation-first writes and precise error messages.

  **Must NOT do**:
  - Do not bypass schema validation before persistence.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `agent-orchestration`, `ai-game-generation`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocks**: T20, T21
  - **Blocked By**: T1, T2, T3

  **References**:
  - `api/src/chat/chat-tools.ts` - tool contracts.
  - `api/src/chat/chat-handler.ts` - design context wiring.

  **Acceptance Criteria**:
  - [ ] Tools can add/update new element types safely.
  - [ ] Invalid AI payloads fail with deterministic messages.

  **QA Scenarios**:
  ```
  Scenario: AI tool updates path element
    Tool: Bash
    Steps: run chat-tool test invoking updateDesignElement on path type
    Expected Result: update persists and validation passes
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-19-tool-path.txt

  Scenario: AI tool submits malformed style payload
    Tool: Bash
    Steps: run negative test with invalid style field
    Expected Result: tool returns structured validation error
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-19-tool-invalid.txt
  ```

- [ ] 20. Update design-stage and chat prompts for fidelity-aware generation

  **What to do**:
  - Update planning/design prompt contracts to target richer schema output.
  - Add explicit instructions for ambiguity handling and element targeting.

  **Must NOT do**:
  - Do not over-constrain prompts to a single visual style.

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: `ai-game-generation`, `agent-orchestration`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocks**: T22
  - **Blocked By**: T19

  **References**:
  - `api/src/agent/engine/prompts.ts` - stage prompt source.
  - `api/src/ai/agent/stages/design.ts` - design generation path.

  **Acceptance Criteria**:
  - [ ] Prompt contracts mention new element/style capabilities.
  - [ ] Ambiguous requests trigger clarification flow when needed.

  **QA Scenarios**:
  ```
  Scenario: design stage outputs richer schema object
    Tool: Bash
    Steps: run design stage tests with fixture planning docs
    Expected Result: generated design includes new fields/types and validates
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-20-design-prompt.txt

  Scenario: ambiguous edit request asks for clarification
    Tool: Bash
    Steps: run chat iteration test with ambiguous target context
    Expected Result: askUser/clarification branch is triggered
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-20-clarify.txt
  ```

- [ ] 21. Add conflict-safe document update semantics

  **What to do**:
  - Introduce optimistic concurrency/version checks for design writes.
  - Ensure AI and UI edits fail safely on stale document base.

  **Must NOT do**:
  - Do not silently overwrite newer edits.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `workspace-system`, `agent-orchestration`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Blocks**: T26
  - **Blocked By**: T19

  **References**:
  - `apps/slopcade/components/editor/useDesignDocument.ts` - save flow.
  - `api/src/chat/chat-tools.ts` - write semantics.

  **Acceptance Criteria**:
  - [ ] Stale update attempts are rejected with actionable retry info.
  - [ ] Merge/retry path does not corrupt document state.

  **QA Scenarios**:
  ```
  Scenario: concurrent update conflict
    Tool: Bash
    Steps: simulate stale AI write against newer document version
    Expected Result: conflict error returned; newer state preserved
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-21-conflict.txt

  Scenario: valid retry after refetch
    Tool: Bash
    Steps: refetch latest doc and retry same update
    Expected Result: update succeeds
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-21-retry.txt
  ```

- [ ] 22. Expand build-stage ingestion of richer design intent

  **What to do**:
  - Update build-stage prompt context summaries to include richer visual descriptors.
  - Keep design context as reference input only.

  **Must NOT do**:
  - Do not serialize design schema into runtime output artifacts.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `ai-game-generation`, `game-authoring`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Blocks**: T23, T26
  - **Blocked By**: T20

  **References**:
  - `api/src/ai/agent/stages/build.ts` - design-context consumption path.
  - `api/src/ai/agent/stages/design.ts` - upstream artifact shape.

  **Acceptance Criteria**:
  - [ ] Build prompt includes richer design summaries.
  - [ ] Runtime artifact remains valid `GameDefinition` only.

  **QA Scenarios**:
  ```
  Scenario: design-informed build prompt content
    Tool: Bash
    Steps: run build stage test with rich design artifact fixture
    Expected Result: prompt includes expected design summary cues
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-22-build-prompt.txt

  Scenario: no design-schema leakage in build output
    Tool: Bash
    Steps: assert generated artifact against GameDefinition schema
    Expected Result: output passes schema with no design-specific fields
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-22-build-schema.txt
  ```

- [ ] 23. Add design-to-runtime guardrail tests

  **What to do**:
  - Add tests that enforce strict boundary between design documents and runtime game data.
  - Cover regressions where design-only fields might leak.

  **Must NOT do**:
  - Do not rely on manual review for boundary enforcement.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `testing-patterns`, `game-validation`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Blocks**: T26
  - **Blocked By**: T22

  **References**:
  - `shared/src/types/GameDefinition.ts` - runtime boundary contract.
  - `api/src/ai/agent/__tests__/design-flow.integration.test.ts` - integration pattern.

  **Acceptance Criteria**:
  - [ ] Tests fail if design-only fields appear in runtime artifact.
  - [ ] Integration path remains backward compatible.

  **QA Scenarios**:
  ```
  Scenario: guardrail test blocks leaked fields
    Tool: Bash
    Steps: run targeted integration test with intentional leak fixture
    Expected Result: test fails with explicit boundary assertion
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-23-leak-guard.txt

  Scenario: normal rich design flow passes
    Tool: Bash
    Steps: run standard design->build integration test
    Expected Result: green end-to-end path
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-23-flow-pass.txt
  ```

- [ ] 24. Tune large-document performance

  **What to do**:
  - Optimize rendering for 100-500 element documents.
  - Apply batching/memoization/culling where needed.

  **Must NOT do**:
  - Do not reduce visual correctness to gain benchmark wins.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `editor-system`, `effects-system`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Blocks**: T27
  - **Blocked By**: T8, T9, T10, T11, T7

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - optimization target.
  - `apps/slopcade/components/editor/panels/useDesignCamera.shared.ts` - camera-state update paths.

  **Acceptance Criteria**:
  - [ ] Benchmark fixture performance meets agreed target thresholds.
  - [ ] Interaction remains responsive under load.

  **QA Scenarios**:
  ```
  Scenario: 300-element interaction benchmark
    Tool: Bash
    Steps: run perf suite on medium fixture with drag/select loops
    Expected Result: frame-time and interaction latency within budget
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-24-perf-300.txt

  Scenario: stress fixture with image-heavy scene
    Tool: Bash
    Steps: run stress benchmark for image-dense document
    Expected Result: no OOM/crash, acceptable degraded performance
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-24-perf-stress.txt
  ```

- [ ] 25. Add fallback UX for invalid assets/fonts/geometry

  **What to do**:
  - Introduce graceful fallbacks for image/font/path failures.
  - Surface user-facing warnings without blocking the editing session.

  **Must NOT do**:
  - Do not leave blank/unexplained missing-render states.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `editor-system`, `native-infrastructure`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Blocks**: T27
  - **Blocked By**: T4, T8, T10

  **References**:
  - `apps/slopcade/components/editor/panels/DesignCanvasRenderer.tsx` - fallback rendering paths.
  - `apps/slopcade/components/editor/panels/DesignCanvasPanel.tsx` - warning/notification surfaces.

  **Acceptance Criteria**:
  - [ ] Invalid assets/fonts/path data show visible fallback indicators.
  - [ ] Editing flow remains functional after fallback.

  **QA Scenarios**:
  ```
  Scenario: missing font fallback indicator
    Tool: Playwright
    Steps: open fixture with unavailable font variant
    Expected Result: text renders in fallback style and warning shown
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-25-font-fallback.png

  Scenario: invalid path fallback rendering
    Tool: Playwright
    Steps: open fixture with malformed path element
    Expected Result: element fallback marker shown; panel stable
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-25-path-fallback.png
  ```

- [ ] 26. Add end-to-end integration coverage for design -> build

  **What to do**:
  - Expand integration tests for richer design docs through design/build stages.
  - Include happy path + validation failure + fallback path coverage.

  **Must NOT do**:
  - Do not leave new schema paths untested in end-to-end flow.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `testing-patterns`, `ai-game-generation`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Blocks**: T27, Final wave
  - **Blocked By**: T14, T17, T18, T21, T22, T23

  **References**:
  - `api/src/ai/agent/__tests__/design-flow.integration.test.ts` - integration baseline.
  - `api/src/ai/agent/stages/design.ts` and `api/src/ai/agent/stages/build.ts` - stage boundaries.

  **Acceptance Criteria**:
  - [ ] Integration tests validate richer schema flow from design to build.
  - [ ] Failure checkpoints are explicit and user-actionable.

  **QA Scenarios**:
  ```
  Scenario: rich design artifact reaches build context
    Tool: Bash
    Steps: run integration suite with rich element fixtures
    Expected Result: build stage receives summarized rich design intent
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-26-integration-pass.txt

  Scenario: design validation failure path
    Tool: Bash
    Steps: run integration case with invalid generated design payload
    Expected Result: checkpoint reports validation failure, build not contaminated
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-26-integration-fail.txt
  ```

- [ ] 27. Run backward-compatibility and regression sweep

  **What to do**:
  - Validate old design docs, legacy flows, and baseline editor operations.
  - Ensure no regressions in previously completed design-first pipeline behavior.

  **Must NOT do**:
  - Do not ship with unclassified regressions.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `testing-patterns`, `editor-system`

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 4 final gate)
  - **Blocks**: Final verification wave
  - **Blocked By**: T24, T25, T26

  **References**:
  - `.sisyphus/plans/design-first-skia-canvas-editor.md` - baseline behavior reference.
  - `apps/slopcade/components/editor/panels/DesignCanvasPanel.tsx` - core panel behavior.

  **Acceptance Criteria**:
  - [ ] Legacy docs migrate and render without data loss.
  - [ ] Existing design-first workflow remains functional end-to-end.

  **QA Scenarios**:
  ```
  Scenario: legacy document compatibility
    Tool: Bash
    Steps: run migration + render regression suite on archived v1.0 fixtures
    Expected Result: all fixtures auto-migrate and render
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-27-legacy-pass.txt

  Scenario: baseline design-first flow regression
    Tool: Playwright
    Steps: execute original design-first happy-path scenario
    Expected Result: planning->design->approve->implement flow remains intact
    Evidence: .sisyphus/evidence/skia-fidelity-upgrade/task-27-flow-regression.png
  ```

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify every must-have and must-not-have against implemented artifacts and evidence.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run type/lint/tests and detect anti-patterns, unsafe casts, placeholder leftovers, and drift.

- [ ] F3. **Real QA Execution** — `unspecified-high` (+ `playwright`)
  Execute every QA scenario across web/native/API-facing behavior and capture evidence.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Confirm delivery is 1:1 with this plan and no unauthorized feature expansion occurred.

---

## Commit Strategy

- Wave 1: `feat(design-schema): expand design model and migration safeguards`
- Wave 2: `feat(design-canvas): add high-fidelity skia rendering features`
- Wave 3: `feat(design-authoring): add transform interactions and ai contract updates`
- Wave 4: `chore(design-pipeline): harden build integration and regression coverage`
- Final: `chore(plan): complete skia fidelity verification wave`

---

## Success Criteria

### Verification Commands
```bash
pnpm -C shared test
pnpm -C api type-check
pnpm -C apps/slopcade test
npx tsc --noEmit -p apps/slopcade/tsconfig.json
```

### Final Checklist
- [ ] All planned element types and style fields render correctly on web + native.
- [ ] Real images render with resilient fallback behavior.
- [ ] Interaction layer supports select/move/resize/rotate/snap for target element types.
- [ ] AI tooling safely reads/updates richer design documents.
- [ ] Build stage uses richer design intent without schema contamination.
- [ ] Regression and migration tests pass.
