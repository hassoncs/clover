# Pencil Skia Recovery

## TL;DR

> Restore the Pencil web scene to a pure Skia renderer, remove the temporary HTML scene fallback, and isolate the exact CanvasKit/web crash through a controlled repro ladder instead of accumulating more renderer divergence.
>
> **Deliverables**:
> - Web Pencil renders the actual `.pen` scene via Skia only
> - `PenHtmlOverlay` and related fallback freshness code removed
> - Web-safe Skia path for fresh-node chrome/effects reintroduced only after validation
> - Native path preserved on the original Skia architecture
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: isolate crash -> minimal Skia web repro -> restore Skia scene -> remove fallback -> reintroduce safe polish

---

## Context

### Original Request
The Pencil renderer must return to a fully Skia-based system. Overlay-only duplication is acceptable for multiplayer cursors and status chrome, but duplicated HTML scene rendering for shapes, images, text, and frames is not acceptable.

### Interview Summary
**Key Discussions**:
- Web briefly rendered the Pencil scene and then crashed/aborted in CanvasKit.
- Native still renders through the original Skia path and should stay that way.
- A temporary web/dev `PenHtmlOverlay` fallback was added to keep the app usable, but it must be removed.
- The current goal is not to keep patching symptoms; it is to systematically isolate the Skia-web failure and restore one real renderer.

**Research Findings**:
- `packages/design-canvas/src/panels/PenCanvasPanel.web.tsx` still boots Pencil through `WithSkiaWeb`, so web is intended to remain Skia-backed.
- `packages/design-canvas/src/panels/PenCanvasPanel.native.tsx` still renders `PenRenderer` directly, so native remains on the original architecture.
- `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` currently contains `PenHtmlOverlay`, a web/dev fallback that duplicates scene rendering for visible node content.
- `packages/design-canvas/src/pen/render/BuildChrome.tsx` bypasses web fresh-node Skia animation.
- `packages/design-canvas/src/pen/render/effects.tsx` disables Skia effects on web.
- `packages/design-canvas/src/panels/MultiplayerOverlay.tsx` was already a React Native overlay path; cursors were not newly moved out of Skia.

### Metis Review
**Identified Gaps** (addressed):
- Metis timed out twice during consultation; guardrails and acceptance criteria below include explicit anti-divergence and repro constraints to compensate.
- The plan now treats every web-only renderer branch as temporary debt with explicit deletion tasks.

---

## Work Objectives

### Core Objective
Return Pencil web rendering to a single Skia scene renderer, isolate the exact Skia-web crash source with reproducible evidence, and remove the temporary HTML scene fallback without regressing native behavior.

### Concrete Deliverables
- `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` no longer renders `PenHtmlOverlay`
- `packages/design-canvas/src/panels/overlayFreshness.ts` and `packages/design-canvas/src/panels/__tests__/overlayFreshness.test.ts` deleted once no longer needed
- `packages/design-canvas/src/pen/render/BuildChrome.tsx` has a validated web Skia path instead of returning bare children forever
- `packages/design-canvas/src/pen/render/effects.tsx` reintroduces only the subset of web-safe effects proven not to crash CanvasKit, or intentionally documents unsupported effect types behind capability guards
- A minimal Skia-only repro fixture/test harness exists to prove which feature class causes the web abort

### Definition of Done
- [ ] Web Pencil renders the sample `.pen` scene through Skia only; no HTML scene fallback remains
- [ ] Native Pencil still renders through the original Skia path with no regression in core scene rendering
- [ ] Browser verification reproduces the previous failure case and shows it fixed with the current bundle
- [ ] The exact web crash trigger is documented in code/tests/plan notes, not just worked around

### Must Have
- Single Skia scene renderer for actual Pencil document content on web and native
- Overlay-only duplication allowed only for multiplayer/status chrome
- Controlled repro ladder for Skia-web failures
- Removal tasks for every temporary fallback branch

### Must NOT Have (Guardrails)
- No permanent HTML/RN duplication of scene rendering for shapes, images, text, or frames
- No new renderer feature work added to `PenHtmlOverlay`
- No “fix” that silently leaves web and native on different scene semantics
- No bundling of multiple speculative Skia fixes into one validation step

---

## Verification Strategy

> ZERO HUMAN INTERVENTION for final verification where possible. Browser automation and targeted tests provide the evidence; ad hoc visual guesswork does not.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after plus targeted regression helpers
- **Framework**: Vitest + browser verification
- **If TDD**: not full TDD for the whole renderer rewrite, but each new pure helper or repro harness should have a targeted failing/passing test cycle

### QA Policy
Every task must include agent-executed QA scenarios. Evidence goes under `.sisyphus/evidence/`.

- **Frontend/UI**: Use Playwright for browser snapshots, console capture, and interaction verification
- **Runtime crash isolation**: Use browser console/network evidence plus focused repro fixtures
- **Library/Module**: Use Vitest for freshness helpers, repro harnesses, and pure logic around crash gating

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately — crash isolation and debt inventory):
- Task 1: Inventory all temporary web-only renderer divergence [quick]
- Task 2: Create minimal Skia-only web repro ladder fixture [deep]
- Task 3: Capture browser evidence for current crash signatures [unspecified-high]
- Task 4: Compare web and native render paths file-by-file [quick]

Wave 2 (After Wave 1 — isolate root cause by feature class):
- Task 5: Validate base solid shapes/fills on web Skia [deep]
- Task 6: Validate text/font loading path on web Skia [deep]
- Task 7: Validate image rendering path on web Skia [unspecified-high]
- Task 8: Validate fresh-node chrome path on web Skia [deep]
- Task 9: Validate effects one class at a time (shadow, blur, backdrop) [ultrabrain]

Wave 3 (After Wave 2 — restore shared Skia path):
- Task 10: Rebuild web-safe `BuildChrome` on Skia only [deep]
- Task 11: Remove `PenHtmlOverlay` and overlay freshness helpers [quick]
- Task 12: Reconcile any temporary fill simplifications with the final Skia path [unspecified-high]
- Task 13: Add explicit capability guards for unsupported web Skia features if needed [quick]

Wave 4 (After Wave 3 — end-to-end verification):
- Task 14: Browser verify sample doc renders with Skia only [unspecified-high]
- Task 15: Browser verify chat-created fresh nodes animate on the Skia path [unspecified-high]
- Task 16: Regression verify native path remains unchanged [deep]
- Task 17: Remove stale evidence/debug scaffolding and document crash root cause [writing]

Wave FINAL (After ALL tasks — independent review):
- Task F1: Plan compliance audit (oracle)
- Task F2: Code quality review (unspecified-high)
- Task F3: Browser QA replay on current web build (unspecified-high)
- Task F4: Scope fidelity / no-fallback audit (deep)

### Dependency Matrix

- **1**: — -> 5, 8, 10, 11
- **2**: — -> 5, 6, 7, 8, 9
- **3**: — -> 9, 14, 15
- **4**: — -> 10, 16
- **5**: 1,2 -> 10, 12
- **6**: 2 -> 10, 14
- **7**: 2 -> 10, 14
- **8**: 1,2 -> 10, 15
- **9**: 2,3 -> 10, 13, 14
- **10**: 5,6,7,8,9 -> 11, 14, 15
- **11**: 1,10 -> 14, 17
- **12**: 5,10 -> 14, 16
- **13**: 9 -> 14, 17
- **14**: 3,6,7,9,10,11,12,13 -> F1-F4
- **15**: 3,8,10 -> F1-F4
- **16**: 4,12 -> F1-F4
- **17**: 11,13 -> F1-F4

### Agent Dispatch Summary

- **1**: 4 — T1 quick, T2 deep, T3 unspecified-high, T4 quick
- **2**: 5 — T5 deep, T6 deep, T7 unspecified-high, T8 deep, T9 ultrabrain
- **3**: 4 — T10 deep, T11 quick, T12 unspecified-high, T13 quick
- **4**: 4 — T14 unspecified-high, T15 unspecified-high, T16 deep, T17 writing
- **FINAL**: 4 — F1 oracle, F2 unspecified-high, F3 unspecified-high, F4 deep

---

## TODOs

- [ ] 1. Inventory all temporary web-only renderer divergence

  **What to do**:
  - Enumerate every web-only renderer bypass and fallback currently in play.
  - Record which file introduced it, what behavior it replaced, and whether it is acceptable overlay-only duplication or unacceptable scene duplication.

  **Must NOT do**:
  - Do not add new web-only render branches while inventorying existing ones.
  - Do not classify overlay-only UI helpers as scene-renderer debt.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: targeted file audit with no implementation ambiguity.
  - **Skills**: [`systematic-debugging`]
    - `systematic-debugging`: keeps the audit focused on evidence instead of guesses.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: not needed for a renderer debt inventory.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: 5, 8, 10, 11
  - **Blocked By**: None

  **References**:
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` - contains `PenHtmlOverlay`, the current duplicated scene path.
  - `packages/design-canvas/src/pen/render/BuildChrome.tsx` - shows current web bypass for fresh-node Skia chrome.
  - `packages/design-canvas/src/pen/render/effects.tsx` - shows current web disable for effects.
  - `packages/design-canvas/src/panels/MultiplayerOverlay.tsx` - baseline for overlay-only duplication that is still acceptable.

  **Acceptance Criteria**:
  - [ ] Every temporary web-only divergence is listed with file path and removal target.
  - [ ] Overlay-only duplication is explicitly separated from scene-renderer duplication.

  **QA Scenarios**:
  ```
  Scenario: Render divergence inventory completed
    Tool: Bash (grep) + Read
    Preconditions: Repository at current working tree state
    Steps:
      1. Search for web guards in design-canvas renderer files.
      2. Read each matched file and classify the branch as overlay-only or scene-renderer fallback.
      3. Save the inventory to the plan notes or evidence file.
    Expected Result: Complete file-by-file divergence map with no missing temporary branches.
    Failure Indicators: A later task discovers an untracked web-only scene branch.
    Evidence: .sisyphus/evidence/task-1-render-divergence-audit.md

  Scenario: Overlay-only duplication stays allowed
    Tool: Read
    Preconditions: Multiplayer overlay file exists
    Steps:
      1. Read `packages/design-canvas/src/panels/MultiplayerOverlay.tsx`.
      2. Confirm it renders cursor/status UI, not scene shapes/frames/text.
    Expected Result: Overlay-only duplication remains explicitly allowed.
    Evidence: .sisyphus/evidence/task-1-overlay-allowlist.md
  ```

- [ ] 2. Create minimal Skia-only web repro ladder fixture

  **What to do**:
  - Build a minimal repro harness that renders progressively more of the Skia scene on web.
  - Start with one solid rect/frame, then add text, image, gradients, fresh-node chrome, shadows, blur, and backdrop effects in isolated increments.

  **Must NOT do**:
  - Do not use the HTML fallback in the repro fixture.
  - Do not test multiple suspicious Skia features in the same repro step.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: requires careful isolation of crash sources and tight repro control.
  - **Skills**: [`systematic-debugging`, `test-driven-development`]
    - `systematic-debugging`: needed for feature-by-feature crash isolation.
    - `test-driven-development`: useful for building small repro helpers with evidence.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: fixture correctness matters more than polish.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: 5, 6, 7, 8, 9
  - **Blocked By**: None

  **References**:
  - `packages/design-canvas/src/pen/render/PenCanvasFixture.tsx` - existing fixture entrypoint using `WithSkiaWeb`.
  - `packages/design-canvas/src/pen/render/PenCanvasFixtureInner.tsx` - minimal place to stage controlled web repro scenes.
  - `packages/design-canvas/src/pen/render/PenRenderer.tsx` - source of the current scene graph composition.

  **Acceptance Criteria**:
  - [ ] Repro ladder exists with one feature class per step.
  - [ ] A failing step can be named precisely (for example: backdrop blur step crashes, text step passes).

  **QA Scenarios**:
  ```
  Scenario: Minimal Skia scene renders on web
    Tool: Playwright / browser automation
    Preconditions: web-pencil running on http://127.0.0.1:8089 or fixture route running
    Steps:
      1. Open the repro fixture page.
      2. Verify the first step (single solid rect/frame) appears without crash overlay.
      3. Capture screenshot and console output.
    Expected Result: Base Skia drawing succeeds before advanced features are added.
    Failure Indicators: White page, crash overlay, or CanvasKit abort before first step.
    Evidence: .sisyphus/evidence/task-2-repro-step-1.png

  Scenario: Crash step is isolated
    Tool: Playwright + console capture
    Preconditions: Repro ladder supports progressive toggles/steps
    Steps:
      1. Enable each step in order.
      2. Stop at the first step that produces crash/abort symptoms.
      3. Record the exact feature class and browser console evidence.
    Expected Result: One clearly identified crashing feature class.
    Evidence: .sisyphus/evidence/task-2-crash-step.md
  ```

- [ ] 3. Capture browser evidence for current crash signatures

  **What to do**:
  - Record the web failure as it exists before final cleanup.
  - Capture both console/runtime signals and visible symptoms (white page, abort overlay, partial render then crash).

  **Must NOT do**:
  - Do not rely on memory or informal observation.
  - Do not overwrite evidence from different crash signatures without labeling them.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: cross-tool evidence collection, browser/runtime correlation.
  - **Skills**: [`playwright`, `verification-before-completion`]
    - `playwright`: needed for browser evidence capture.
    - `verification-before-completion`: prevents unsupported claims about fixes.
  - **Skills Evaluated but Omitted**:
    - `ghost-browser`: useful for interaction, but Playwright is stronger for screenshot evidence here.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: 9, 14, 15
  - **Blocked By**: None

  **References**:
  - `.sisyphus/pencil-playwright.png` - prior evidence of white-screen capture timing issues.
  - `.sisyphus/pencil-screen-2.png` - evidence of CanvasKit abort overlay in browser.
  - `packages/design-canvas/src/pen/render/effects.tsx` - likely crash surface for effect-related cases.

  **Acceptance Criteria**:
  - [ ] At least one browser-visible crash artifact captured.
  - [ ] At least one console/runtime artifact captured.
  - [ ] Evidence distinguishes “rendered then crashed” from “never rendered.”

  **QA Scenarios**:
  ```
  Scenario: Crash evidence captured before fix
    Tool: Playwright screenshot + console capture
    Preconditions: Current unstable web path available
    Steps:
      1. Open the Pencil app.
      2. Wait for initial render/settle window.
      3. Save screenshot and console logs.
    Expected Result: Evidence file clearly shows crash signature or blank-page symptom.
    Evidence: .sisyphus/evidence/task-3-web-crash.png

  Scenario: Runtime symptom labeled precisely
    Tool: Read + markdown evidence
    Preconditions: Crash artifacts captured
    Steps:
      1. Summarize whether failure was white page, abort overlay, or post-render panic.
      2. Link it to the exact bundle/runtime message.
    Expected Result: Failure mode can be referenced unambiguously in later tasks.
    Evidence: .sisyphus/evidence/task-3-crash-classification.md
  ```

- [ ] 4. Compare web and native render paths file-by-file

  **What to do**:
  - Trace how web and native mount Pencil today.
  - Confirm exactly where they diverge and which divergence is intended (`WithSkiaWeb`) vs temporary (`PenHtmlOverlay`, web bypasses).

  **Must NOT do**:
  - Do not conflate platform bootstrap differences with renderer divergence.
  - Do not change native behavior while auditing web.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: targeted architecture comparison.
  - **Skills**: [`systematic-debugging`]
    - `systematic-debugging`: keeps comparison tied to evidence.
  - **Skills Evaluated but Omitted**:
    - `writing-plans`: not needed for the audit itself.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: 10, 16
  - **Blocked By**: None

  **References**:
  - `packages/design-canvas/src/panels/PenCanvasPanel.web.tsx` - intended web bootstrap with `WithSkiaWeb`.
  - `packages/design-canvas/src/panels/PenCanvasPanel.native.tsx` - native baseline.
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` - shared implementation plus temporary divergence.

  **Acceptance Criteria**:
  - [ ] Web/native mount path differences are documented.
  - [ ] Native-original Skia path is explicitly protected in later tasks.

  **QA Scenarios**:
  ```
  Scenario: Web/native divergence map completed
    Tool: Read
    Preconditions: Relevant panel files available
    Steps:
      1. Read web, native, and shared panel files.
      2. Record exact divergence points and whether each is intentional or temporary.
    Expected Result: Clear architecture comparison with no ambiguous ownership.
    Evidence: .sisyphus/evidence/task-4-web-native-map.md
  ```

- [ ] 5. Validate base solid shapes and fills on web Skia

  **What to do**:
  - Use the repro ladder to prove whether base frame/rectangle/ellipse rendering works in pure web Skia.
  - Confirm which fill style is stable on web (`color` prop vs child `Paint` path) without relying on fallback rendering.

  **Must NOT do**:
  - Do not keep both fill implementations in production just because both might work.
  - Do not test gradients/effects in this task.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: basic render correctness is the foundation for all later web fixes.
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]
    - `systematic-debugging`: keeps the test limited to solid shape rendering.
    - `verification-before-completion`: requires real browser proof.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: appearance polish is not the goal here.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9)
  - **Blocks**: 10, 12
  - **Blocked By**: 1, 2

  **References**:
  - `packages/design-canvas/src/pen/render/fills.tsx` - shared fill implementation surface.
  - `packages/design-canvas/src/pen/render/nodes/FrameNode.tsx` - top-level panel rendering.
  - `packages/design-canvas/src/pen/render/nodes/RectangleNode.tsx` - primitive rect rendering.
  - `packages/design-canvas/src/pen/render/nodes/EllipseNode.tsx` - primitive ellipse rendering.

  **Acceptance Criteria**:
  - [ ] Web Skia renders a base solid frame/shape scene without abort.
  - [ ] Final chosen solid-fill path is identified and documented.

  **QA Scenarios**:
  ```
  Scenario: Base Skia shape scene renders
    Tool: Playwright
    Preconditions: Minimal Skia repro fixture available
    Steps:
      1. Load the base-shapes repro step.
      2. Verify at least one frame, one rectangle, and one ellipse are visible.
      3. Save screenshot and console output.
    Expected Result: Base shapes render with no blank page and no crash overlay.
    Evidence: .sisyphus/evidence/task-5-base-shapes.png

  Scenario: Fill implementation chosen from evidence
    Tool: Read + browser evidence
    Preconditions: Base-shape variants tested
    Steps:
      1. Compare variant A and variant B results.
      2. Record which path is stable on web Skia.
    Expected Result: One validated fill path chosen for production use.
    Evidence: .sisyphus/evidence/task-5-fill-choice.md
  ```

- [ ] 6. Validate text and font loading path on web Skia

  **What to do**:
  - Test Skia text rendering separately from the rest of the scene.
  - Verify the font-loading path in `PenRenderer` does not trigger the web crash and that fallback fonts behave predictably.

  **Must NOT do**:
  - Do not mix image/effect debugging into text validation.
  - Do not depend on the HTML overlay to declare text fixed.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: font loading and Skia paragraph rendering are a distinct crash surface.
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]
    - `systematic-debugging`: isolate text from the rest of the scene.
    - `verification-before-completion`: require browser proof.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: not yet about typography polish.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8, 9)
  - **Blocks**: 10, 14
  - **Blocked By**: 2

  **References**:
  - `packages/design-canvas/src/pen/render/PenRenderer.tsx` - current font loading and `Paragraph` setup entrypoint.
  - `packages/design-canvas/src/pen/render/nodes/TextNode.tsx` - actual Skia text node rendering.

  **Acceptance Criteria**:
  - [ ] Minimal text renders through Skia on web.
  - [ ] Font-loading behavior is understood and documented for web.

  **QA Scenarios**:
  ```
  Scenario: Minimal text scene renders on web Skia
    Tool: Playwright
    Preconditions: Text-only repro step exists
    Steps:
      1. Load the text repro step.
      2. Verify visible text appears and page does not abort.
      3. Capture screenshot and console output.
    Expected Result: Text rendering is either validated or isolated as the crash trigger.
    Evidence: .sisyphus/evidence/task-6-text-scene.png

  Scenario: Font fallback behavior documented
    Tool: Read + browser evidence
    Preconditions: Text step executed
    Steps:
      1. Record whether bundled fonts loaded and whether fallback fonts appeared.
      2. Document any mismatch between expected and actual font behavior.
    Expected Result: Clear font-path diagnosis for web.
    Evidence: .sisyphus/evidence/task-6-font-behavior.md
  ```

- [ ] 7. Validate image rendering path on web Skia

  **What to do**:
  - Test image nodes independently after basic shapes/text.
  - Confirm whether `ImageShader` / fit modes are stable or part of the crash chain.

  **Must NOT do**:
  - Do not mix image fit, effects, and clipping in one first pass.
  - Do not leave image rendering permanently disabled without explicit capability decision.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: image path has async loading and shader behavior that can fail independently.
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]
    - `systematic-debugging`: isolate images from other features.
    - `verification-before-completion`: require concrete browser evidence.
  - **Skills Evaluated but Omitted**:
    - `asset-pack-generation`: not relevant to runtime image rendering.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8, 9)
  - **Blocks**: 10, 14
  - **Blocked By**: 2

  **References**:
  - `packages/design-canvas/src/pen/render/nodes/ImageNode.tsx` - image shader implementation.
  - `apps/pencil/assets/sample.json` - sample document image usage and fit modes.

  **Acceptance Criteria**:
  - [ ] Minimal image node renders on web Skia, or image path is proven to be the crash trigger.
  - [ ] Fit-mode behavior documented if it differs on web.

  **QA Scenarios**:
  ```
  Scenario: Minimal image node renders
    Tool: Playwright
    Preconditions: Image-only repro step exists with one known-good image URL
    Steps:
      1. Load the image repro step.
      2. Verify the image appears and page remains stable.
      3. Capture screenshot and console output.
    Expected Result: Image rendering status is conclusively known.
    Evidence: .sisyphus/evidence/task-7-image-scene.png

  Scenario: Fit mode isolation
    Tool: Playwright + notes
    Preconditions: Base image rendering works
    Steps:
      1. Test `cover`, `contain`, and `fill` sequentially.
      2. Record the first fit mode that destabilizes rendering, if any.
    Expected Result: Image fit behavior isolated by mode.
    Evidence: .sisyphus/evidence/task-7-fit-modes.md
  ```

- [ ] 8. Validate fresh-node chrome on web Skia

  **What to do**:
  - Rebuild fresh-node treatment on the real Skia path, not in the HTML overlay.
  - Prove which parts are safe on web: static ring, fade, scale, dashed border, or some subset.

  **Must NOT do**:
  - Do not reintroduce the full native animated Skia wrapper on web all at once.
  - Do not keep fresh-node logic only in the HTML fallback.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: this is the most likely place where web-specific animation instability sneaks back in.
  - **Skills**: [`systematic-debugging`, `test-driven-development`]
    - `systematic-debugging`: isolate transform/opacity/dash individually.
    - `test-driven-development`: helpful for pure helper math around freshness thresholds.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: motion taste matters later, stability first.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 9)
  - **Blocks**: 10, 15
  - **Blocked By**: 1, 2

  **References**:
  - `packages/design-canvas/src/pen/render/BuildChrome.tsx` - current native Skia fresh-node implementation and web bypass.
  - `apps/pencil/lib/designChatOps.ts` - source of `createdAt` tagging for new nodes.

  **Acceptance Criteria**:
  - [ ] At least one Skia-based fresh-node treatment is proven safe on web.
  - [ ] Temporary overlay freshness path is no longer required for final behavior.

  **QA Scenarios**:
  ```
  Scenario: New node gets Skia-only fresh-node chrome
    Tool: Playwright
    Preconditions: Chat/API working and no HTML scene fallback relied upon for validation
    Steps:
      1. Create a new node through the Pencil chat.
      2. Verify the node appears through the Skia scene.
      3. Verify the fresh-node affordance appears and decays without crashing the page.
    Expected Result: New-node motion exists on the Skia path only.
    Evidence: .sisyphus/evidence/task-8-fresh-node.md

  Scenario: Motion feature isolation
    Tool: Playwright + console capture
    Preconditions: Fresh-node path supports toggling subfeatures
    Steps:
      1. Test static ring alone.
      2. Add fade.
      3. Add scale.
      4. Add dashed border last.
    Expected Result: The exact safe subset is known.
    Evidence: .sisyphus/evidence/task-8-motion-ladder.md
  ```

- [ ] 9. Validate effects one class at a time on web Skia

  **What to do**:
  - Test shadows, blur, and backdrop blur independently.
  - Identify which effect class actually triggers the CanvasKit abort.

  **Must NOT do**:
  - Do not restore all effects in one change.
  - Do not leave a global web disable in place without documenting the exact unsupported class.

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: likely root-cause task with subtle CanvasKit/runtime interactions.
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]
    - `systematic-debugging`: essential for strict one-feature-at-a-time testing.
    - `verification-before-completion`: requires proof before declaring an effect safe or unsafe.
  - **Skills Evaluated but Omitted**:
    - `effects-system`: this is not the Slopcade shader graph system; this is Skia runtime behavior.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8)
  - **Blocks**: 10, 13, 14
  - **Blocked By**: 2, 3

  **References**:
  - `packages/design-canvas/src/pen/render/effects.tsx` - current effect implementation and blanket web disable.
  - `apps/pencil/assets/sample.json` - sample document effect usage.

  **Acceptance Criteria**:
  - [ ] The crashing effect class is identified precisely, or all tested classes are proven safe.
  - [ ] The plan records whether unsupported effect classes need capability guards or a different implementation.

  **QA Scenarios**:
  ```
  Scenario: Shadow-only scene tested
    Tool: Playwright
    Preconditions: Shadow-only repro step available
    Steps:
      1. Load the shadow step.
      2. Verify scene remains stable.
      3. Save screenshot and console output.
    Expected Result: Shadow either passes or is identified as the crash trigger.
    Evidence: .sisyphus/evidence/task-9-shadow.md

  Scenario: Backdrop blur isolated last
    Tool: Playwright + console capture
    Preconditions: Base scene and simpler effects already pass
    Steps:
      1. Enable backdrop blur only.
      2. Observe whether CanvasKit abort overlay or blank page returns.
    Expected Result: Backdrop blur either passes or is conclusively identified as unsupported/crashing.
    Evidence: .sisyphus/evidence/task-9-backdrop-blur.md
  ```

- [ ] 10. Rebuild web-safe `BuildChrome` on the Skia path only

  **What to do**:
  - Replace the current `Platform.OS === "web"` bypass in `BuildChrome` with the minimal proven-safe Skia implementation discovered in Tasks 8 and 9.
  - Keep web and native on the same scene architecture, even if the web motion subset is simpler.

  **Must NOT do**:
  - Do not leave `BuildChrome` as a permanent no-op on web.
  - Do not reintroduce unsafe transform/opacity/dash combinations without proof.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: this is the main shared Skia restoration point.
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]
    - `systematic-debugging`: ensures only validated subfeatures return.
    - `verification-before-completion`: requires fresh browser proof.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: polish follows stability.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 11, 14, 15
  - **Blocked By**: 5, 6, 7, 8, 9

  **References**:
  - `packages/design-canvas/src/pen/render/BuildChrome.tsx` - current web bypass target.
  - `packages/design-canvas/src/pen/render/PenRenderer.tsx` - all scene node types route through this wrapper.

  **Acceptance Criteria**:
  - [ ] Web `BuildChrome` stays on Skia and no longer returns bare children purely because platform is web.
  - [ ] Fresh-node visual treatment remains visibly functional on web without crashes.

  **QA Scenarios**:
  ```
  Scenario: BuildChrome restored on web Skia
    Tool: Playwright
    Preconditions: Tasks 5-9 identified the safe Skia subset
    Steps:
      1. Load Pencil web app with restored BuildChrome.
      2. Create a new node.
      3. Verify the node appears, fresh-node chrome appears, and page remains stable.
    Expected Result: BuildChrome works on web without HTML fallback support.
    Evidence: .sisyphus/evidence/task-10-buildchrome-web.png

  Scenario: No crash regression after BuildChrome restore
    Tool: Playwright + console capture
    Preconditions: BuildChrome web implementation restored
    Steps:
      1. Open the sample document.
      2. Wait through the full fresh-node animation window.
      3. Confirm no abort overlay and no fatal console errors.
    Expected Result: Web remains stable after motion restoration.
    Evidence: .sisyphus/evidence/task-10-buildchrome-stability.md
  ```

- [ ] 11. Remove `PenHtmlOverlay` and overlay freshness helpers

  **What to do**:
  - Delete `PenHtmlOverlay` from `PenCanvasPanelImpl.tsx`.
  - Delete `packages/design-canvas/src/panels/overlayFreshness.ts` and `packages/design-canvas/src/panels/__tests__/overlayFreshness.test.ts` once no longer needed.

  **Must NOT do**:
  - Do not remove the fallback before web Skia scene rendering is verified stable.
  - Do not leave dead helper code or commented-out overlay fragments behind.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: cleanup/deletion after the real path is proven.
  - **Skills**: [`verification-before-completion`]
    - `verification-before-completion`: ensures the fallback is only removed after proof.
  - **Skills Evaluated but Omitted**:
    - `systematic-debugging`: the isolation work should already be done by this point.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: 14, 17
  - **Blocked By**: 1, 10

  **References**:
  - `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` - current HTML scene fallback location.
  - `packages/design-canvas/src/panels/overlayFreshness.ts` - temporary fallback-only freshness logic.

  **Acceptance Criteria**:
  - [ ] No HTML scene fallback remains in the Pencil panel implementation.
  - [ ] Temporary freshness helper files removed.

  **QA Scenarios**:
  ```
  Scenario: App still renders after fallback deletion
    Tool: Playwright
    Preconditions: BuildChrome and Skia scene stable on web
    Steps:
      1. Load the Pencil app after deleting `PenHtmlOverlay`.
      2. Verify the sample document is still visible.
      3. Capture screenshot and console output.
    Expected Result: Scene remains visible through Skia only.
    Evidence: .sisyphus/evidence/task-11-no-fallback.png

  Scenario: No scene duplication remains
    Tool: Grep + Read
    Preconditions: Fallback code deleted
    Steps:
      1. Search for `PenHtmlOverlay` and overlay freshness helper references.
      2. Confirm only overlay-level duplication remains in acceptable files.
    Expected Result: No scene-level HTML fallback code remains.
    Evidence: .sisyphus/evidence/task-11-duplication-audit.md
  ```

- [ ] 12. Reconcile temporary fill simplifications with final Skia path

  **What to do**:
  - Decide which fill-path changes were genuine fixes versus temporary mitigations.
  - Keep only the web-stable Skia implementation that also preserves shared semantics.

  **Must NOT do**:
  - Do not keep parallel fill implementations for convenience.
  - Do not regress native parity without explicit evidence.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: shared renderer cleanup with cross-platform correctness concerns.
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]
    - `systematic-debugging`: prevents locking in accidental mitigations.
    - `verification-before-completion`: requires render proof after reconciliation.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: semantics and stability first.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 13)
  - **Blocks**: 14, 16
  - **Blocked By**: 5, 10

  **References**:
  - `packages/design-canvas/src/pen/render/fills.tsx` - current simplified fill helper.
  - `packages/design-canvas/src/pen/render/nodes/FrameNode.tsx` - frame fill usage.
  - `packages/design-canvas/src/pen/render/nodes/RectangleNode.tsx` - rectangle fill usage.
  - `packages/design-canvas/src/pen/render/nodes/EllipseNode.tsx` - ellipse fill usage.

  **Acceptance Criteria**:
  - [ ] Final fill path is single-source and documented.
  - [ ] Web and native render the same intended semantics for supported fill types.

  **QA Scenarios**:
  ```
  Scenario: Supported fills render consistently
    Tool: Playwright
    Preconditions: Final fill path implemented
    Steps:
      1. Open a sample scene with solid fills for frame/rectangle/ellipse.
      2. Verify shapes render and match expected colors.
      3. Capture screenshot.
    Expected Result: Supported fills render consistently on web Skia.
    Evidence: .sisyphus/evidence/task-12-fill-consistency.png

  Scenario: Native path not regressed conceptually
    Tool: Read + targeted check
    Preconditions: Shared fill files updated
    Steps:
      1. Inspect native-rendering node files for unintended platform divergence.
      2. Confirm shared fill logic remains valid for native Skia.
    Expected Result: Fill changes are not web-only hacks hidden in shared code.
    Evidence: .sisyphus/evidence/task-12-native-fill-audit.md
  ```

- [ ] 13. Add explicit capability guards for unsupported web Skia features if needed

  **What to do**:
  - If a feature class is conclusively unsupported or crashy on web Skia, gate it explicitly with a documented capability decision rather than a silent blanket disable.
  - Keep the scene Skia-based even when a specific effect is skipped.

  **Must NOT do**:
  - Do not leave a hidden web `return null` without documenting why.
  - Do not use HTML fallback to simulate unsupported scene features.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: capability guard is a narrow policy change after root-cause isolation.
  - **Skills**: [`systematic-debugging`, `verification-before-completion`]
    - `systematic-debugging`: ensures guards are evidence-backed.
    - `verification-before-completion`: requires proof they solve the crash without widening divergence.
  - **Skills Evaluated but Omitted**:
    - `writing-plans`: not implementation-critical here.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 12)
  - **Blocks**: 14, 17
  - **Blocked By**: 9

  **References**:
  - `packages/design-canvas/src/pen/render/effects.tsx` - current blanket disable to replace/refine.

  **Acceptance Criteria**:
  - [ ] Any remaining unsupported web Skia feature is explicitly documented and guarded.
  - [ ] No broad hidden fallbacks remain.

  **QA Scenarios**:
  ```
  Scenario: Guarded unsupported feature no longer crashes app
    Tool: Playwright
    Preconditions: Unsupported feature class identified
    Steps:
      1. Load a scene that previously crashed because of the unsupported feature.
      2. Verify the rest of the Skia scene still renders.
      3. Confirm no abort overlay appears.
    Expected Result: Guard prevents crash while preserving Skia scene rendering.
    Evidence: .sisyphus/evidence/task-13-capability-guard.md
  ```

- [ ] 14. Browser verify sample document renders with Skia only

  **What to do**:
  - Verify the full sample Pencil document is visible on web after fallback removal.
  - Confirm the browser no longer shows the prior white-page/abort behavior.

  **Must NOT do**:
  - Do not count HTML fallback rendering as success.
  - Do not rely on stale screenshots or pre-fix snapshots.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: end-to-end browser proof of the restored architecture.
  - **Skills**: [`playwright`, `verification-before-completion`]
    - `playwright`: primary browser evidence tool.
    - `verification-before-completion`: ensures current-bundle proof only.
  - **Skills Evaluated but Omitted**:
    - `ghost-browser`: useful for exploratory browsing, but final evidence should be stable.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 16, 17)
  - **Blocks**: F1-F4
  - **Blocked By**: 3, 6, 7, 9, 10, 11, 12, 13

  **References**:
  - `apps/pencil/assets/sample.json` - canonical sample scene to render.
  - `packages/design-canvas/src/pen/render/PenRenderer.tsx` - final Skia scene renderer.

  **Acceptance Criteria**:
  - [ ] Sample document content visibly renders on web via Skia.
  - [ ] No crash/abort overlay appears during or after scene load.

  **QA Scenarios**:
  ```
  Scenario: Sample document renders end-to-end
    Tool: Playwright
    Preconditions: web-pencil running with final bundle
    Steps:
      1. Open `http://127.0.0.1:8089`.
      2. Wait for full page settle.
      3. Verify visible content from the sample document appears in the canvas area.
      4. Capture screenshot and console messages.
    Expected Result: Full sample scene visible with no abort.
    Evidence: .sisyphus/evidence/task-14-sample-scene.png
  ```

- [ ] 15. Browser verify chat-created fresh nodes animate on the Skia path

  **What to do**:
  - Exercise the real chat flow after renderer restoration.
  - Verify newly created nodes appear and get the intended Skia-based fresh-node affordance.

  **Must NOT do**:
  - Do not validate fresh-node behavior only through fixtures.
  - Do not accept HTML overlay motion as the final behavior.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: end-to-end UI + API + renderer verification.
  - **Skills**: [`playwright`, `verification-before-completion`]
    - `playwright`: browser automation for the real flow.
    - `verification-before-completion`: requires current evidence.
  - **Skills Evaluated but Omitted**:
    - `editor-browser-testing`: useful contextually, but this is the Pencil app specifically.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 16, 17)
  - **Blocks**: F1-F4
  - **Blocked By**: 3, 8, 10

  **References**:
  - `apps/pencil/lib/designChatOps.ts` - source of `createdAt` tagging.
  - `packages/design-canvas/src/pen/render/BuildChrome.tsx` - final fresh-node Skia path.

  **Acceptance Criteria**:
  - [ ] Real chat-generated node appears in the Skia scene.
  - [ ] Fresh-node affordance runs on the Skia path and decays without crash.

  **QA Scenarios**:
  ```
  Scenario: Real new-node flow works
    Tool: Playwright
    Preconditions: Chat/API working and final renderer bundle deployed locally
    Steps:
      1. Open Pencil app.
      2. Enter a prompt that creates a small frame or card.
      3. Submit the prompt and wait for update.
      4. Verify the new node appears and its Skia-based fresh-node chrome is visible.
    Expected Result: End-to-end creation works on the pure Skia path.
    Evidence: .sisyphus/evidence/task-15-chat-created-node.png
  ```

- [ ] 16. Regression verify native path remains unchanged

  **What to do**:
  - Audit the final file set to ensure native still renders through the original Skia path.
  - Verify no web-only stabilization changes accidentally weakened native behavior.

  **Must NOT do**:
  - Do not rewrite native behavior unless a shared-file regression demands it.
  - Do not assume native is safe just because web is fixed.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: cross-platform regression audit in shared renderer files.
  - **Skills**: [`verification-before-completion`]
    - `verification-before-completion`: requires evidence-based native audit.
  - **Skills Evaluated but Omitted**:
    - `mac-e2e`: not necessary unless native runtime verification is explicitly needed in this pass.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 15, 17)
  - **Blocks**: F1-F4
  - **Blocked By**: 4, 12

  **References**:
  - `packages/design-canvas/src/panels/PenCanvasPanel.native.tsx` - native baseline.
  - Shared renderer files modified during web recovery.

  **Acceptance Criteria**:
  - [ ] Native still mounts `PenRenderer` directly with no HTML scene fallback.
  - [ ] Shared renderer changes do not introduce web-only hacks that break native semantics.

  **QA Scenarios**:
  ```
  Scenario: Native render path audit complete
    Tool: Read
    Preconditions: Final shared files updated
    Steps:
      1. Read `PenCanvasPanel.native.tsx` and final shared renderer files.
      2. Confirm native still goes through Skia directly and no HTML fallback path exists there.
    Expected Result: Native architecture remains unchanged.
    Evidence: .sisyphus/evidence/task-16-native-audit.md
  ```

- [ ] 17. Remove stale evidence/debug scaffolding and document crash root cause

  **What to do**:
  - Delete temporary debug probes and stale evidence artifacts that were only needed during isolation.
  - Record the actual root cause and the final supported/unsupported web Skia feature set.

  **Must NOT do**:
  - Do not delete evidence needed to prove the fix.
  - Do not leave future engineers guessing why the fallback was removed.

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: cleanup plus durable explanation.
  - **Skills**: [`verification-before-completion`]
    - `verification-before-completion`: ensures cleanup happens after proof is collected.
  - **Skills Evaluated but Omitted**:
    - `compound-docs`: not necessary unless we want to externalize this beyond the plan.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 15, 16)
  - **Blocks**: F1-F4
  - **Blocked By**: 11, 13

  **References**:
  - `.sisyphus/evidence/` - proof artifacts to keep vs remove.
  - Modified renderer files and final browser evidence.

  **Acceptance Criteria**:
  - [ ] Temporary debug scaffolding removed.
  - [ ] Root cause and final web capability notes recorded clearly.

  **QA Scenarios**:
  ```
  Scenario: Cleanup leaves no stale debug renderer code
    Tool: Grep + Read
    Preconditions: Final implementation complete
    Steps:
      1. Search for known debug probe markers and temporary fallback-only helpers.
      2. Confirm only intentional final code remains.
    Expected Result: No stale debug scaffolding survives.
    Evidence: .sisyphus/evidence/task-17-cleanup-audit.md
  ```

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify the final web path renders actual `.pen` scene content through Skia only. Confirm `PenHtmlOverlay` and related temporary fallback files/branches are gone. Reject if any HTML scene duplication remains.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run targeted type/lint/test checks on modified renderer files. Search for stale `Platform.OS === "web"` renderer bypasses, stale debug scaffolding, and temporary comments left behind.

- [ ] F3. **Browser QA Replay** — `unspecified-high`
  Use Playwright/browser tooling to load `http://127.0.0.1:8089`, verify the sample design content is visible, verify no abort/crash overlay appears, and verify a fresh AI-created node shows the intended Skia-only highlight behavior.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Confirm the final change set removed scene-duplication debt instead of deepening it. Explicitly verify only overlay-level duplication remains.

---

## Commit Strategy

- `fix(pencil): restore web skia rendering path`
- `test(design-canvas): add skia web repro coverage`
- `refactor(pencil): remove html scene fallback`

---

## Success Criteria

### Verification Commands
```bash
pnpm exec vitest run packages/design-canvas/src/panels/__tests__/overlayFreshness.test.ts
pnpm svc:status
npx playwright screenshot --device="Desktop Chrome" "http://127.0.0.1:8089" ".sisyphus/evidence/pencil-web-final.png"
```

### Final Checklist
- [ ] Web renders Pencil scene content through Skia only
- [ ] No HTML scene fallback remains
- [ ] Native still uses original Skia path
- [ ] Web crash trigger is identified and documented
- [ ] Fresh-node behavior restored through Skia-safe path
