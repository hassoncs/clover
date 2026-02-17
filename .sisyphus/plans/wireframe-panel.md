# Structural Mode in Editor

## TL;DR

> **Quick Summary**: Add a new editor panel and viewer that renders existing game UI/game structure in a low-fidelity structural style for rapid layout iteration, while keeping canonical runtime schema as the single source of truth.
>
> **Deliverables**:
> - New editor panel (`WireframePanel`) registered in dockview
> - Structural/Production mode toggle
> - Phone-ratio flow viewer with screen/phase stepping
> - Editable UI/phase layout path using existing schema
> - Read-only world/entity structural visualization
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Panel registration -> structural renderer -> phase flow/navigation -> verification

---

## Context

### Original Request
User wants a Figma-like, editor-integrated layout iteration mode for Amen game screens/phases, with no second schema, AI-assisted iteration, and future extensibility to responsive layouts.

### Interview Summary
**Key Decisions**:
- No new wireframe schema or sidecar persisted type
- "Wireframe" is a mode over canonical data (renamed conceptually to structural mode)
- MVP includes party phase support
- MVP includes world/entity structural read-only view
- Desktop-first UX, RN-compatible architecture path
- Test strategy: tests-after implementation
- Long-term direction: Storybook-like universal preview system (screens + prefabs + entities)
- MVP slice: UI + party phases editable, world/entity read-only
- Must stay generic across all game types (party is just one game category)
- Orientation/aspect should be typed now with MVP default and future configurability
- Add a small canonical layout adapter layer for code-driven screens in MVP

### Future Compatibility Constraint (non-negotiable)
- MVP implementation must be structured as the first **Preview Surface**, not a one-off wireframe-only panel.
- Future target interaction should remain possible without refactor-heavy rewrites:
  - double-click item (screen/prefab/entity) -> open preview
  - switch structural/production mode
  - eventually provide scenario data variants and screenshot capture
- MVP keeps portrait phone ratio, but must not hard-code assumptions that block later breakpoint/responsive preview extension.

## Terminology Clarification
- **"World/entity structural view (read-only in MVP)"** means:
  - visualize entity bounds, anchors, z-order, hitboxes, hierarchy, and key labels in flat style
  - no gameplay simulation authoring from this panel in MVP
  - this is to inspect structure while UI/phase layout editing is active

- **"Party phase component internals"** in previous wording referred to editing arbitrary React component source directly.
  - Updated interpretation: structural editing must be generic, game-type agnostic.
  - If a surface is currently code-driven, we should expose editable structural controls through canonical data interfaces rather than source editing.

### Metis Review (addressed)
**Identified Gaps**:
- Party phases are component-driven, not declarative -> resolved by constraining MVP editing to phase metadata/flow controls and canonical editable data; phase component internals remain code-owned.
- Missing hard guardrails -> added explicit Must NOT Have list.
- Missing executable acceptance criteria and QA scenarios -> added below.

---

## Work Objectives

### Core Objective
Provide a layout-first structural mode inside the editor so users and AI can iterate screen/phase structure before final styling, without introducing schema divergence.

### Concrete Deliverables
- `app/components/editor/panels/WireframePanel.tsx`
- `app/components/editor/wireframe/WireframeModeProvider.tsx`
- `app/components/editor/wireframe/WireframeViewer.web.tsx`
- `app/components/editor/wireframe/WireframeViewer.native.tsx` (minimal fallback)
- `app/components/editor/wireframe/WireframeRenderer.tsx`
- panel registry/default layout updates
- tests for mode toggle + screen/phase navigation + renderer sanity
- lightweight `PreviewTarget` abstraction (screen/phase/world-readonly) to avoid single-purpose coupling
- typed preview configuration model with defaults:
  - orientation: portrait (default)
  - aspectRatio: phone-default (default)
  - future-ready fields for landscape/custom ratios
- canonical layout adapter contract used by:
  - structural renderer
  - code-driven screen runtime mapping

### Definition of Done
- [ ] Structural mode can be toggled from panel
- [ ] Sidebar remains visible while stepping screens/phases
- [ ] Viewer shows portrait phone ratio for MVP
- [ ] UI/phase edits affect canonical editor data (no sidecar schema)
- [ ] World/entity structural layer renders read-only in structural mode
- [ ] Tests and agent QA scenarios pass

### Must Have
- Single source of truth: canonical schema only
- Party phase support in MVP (flow navigation + editable metadata path)
- AI-compatible edit loop via existing editor/workspace pathways
- Canonical layout adapter for code-driven surfaces to reduce hard-coded positioning

### Must NOT Have (Guardrails)
- No new persisted `wireframe.json` schema
- No wireframe->runtime conversion pipeline
- No editing party phase React component internals in MVP
- No drag-drop world editing in MVP
- No responsive breakpoint system in MVP
- No architecture that hard-couples preview surface to only party screens
- No hard-coded portrait-only assumptions at type level (portrait is default, not a permanent constraint)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: existing app test stack (project conventions)

### Agent-Executed QA Scenarios (MANDATORY)

Scenario: Structural mode toggle switches renderer
  Tool: Playwright (agent-browser/playwright skill)
  Preconditions: editor route open with valid game
  Steps:
    1. Open editor for a known game id
    2. Open Wireframe panel from activity bar/panel list
    3. Toggle from Production -> Structural
    4. Assert viewer root has structural mode marker/class
    5. Toggle back and assert production marker/class
  Expected Result: mode switches both directions with no errors
  Failure Indicators: toggle does nothing, viewer crashes, panel disappears
  Evidence: `.sisyphus/evidence/wireframe-mode-toggle.png`

Scenario: Screen/phase horizontal flow navigation works
  Tool: Playwright
  Preconditions: selected game has multiple screens/phases
  Steps:
    1. Select game in panel sidebar
    2. Click next-screen control twice
    3. Assert screen counter increments (`2/N`, `3/N`)
    4. Press keyboard left arrow
    5. Assert counter decrements
  Expected Result: deterministic navigation through flow
  Failure Indicators: index desync, sidebar selection resets unexpectedly
  Evidence: `.sisyphus/evidence/wireframe-flow-navigation.png`

Scenario: Canonical data updates reflected immediately
  Tool: Playwright + editor interactions
  Preconditions: editable UI element exists in selected screen
  Steps:
    1. Edit a simple canonical UI property (e.g., label text/offset) via existing editor controls
    2. Assert structural viewer reflects change without reload
    3. Switch to production mode and confirm same canonical change visible
  Expected Result: both modes reflect same source data
  Failure Indicators: stale render, divergence between modes
  Evidence: `.sisyphus/evidence/wireframe-canonical-sync.png`

Scenario: Layout adapter handles viewport variance
  Tool: Playwright
  Preconditions: test screen with adapter-based layout rules
  Steps:
    1. Open structural preview at default portrait ratio
    2. Switch to alternate configured aspect (if available in MVP control) or run adapter test harness with two viewport presets
    3. Assert anchored elements preserve intended relative placement (header/footer/center zones)
    4. Assert no overlap regression for primary action controls
  Expected Result: adapter resolves layout predictably across tested viewport presets
  Failure Indicators: clipped controls, overlapping elements, off-screen primary CTA
  Evidence: `.sisyphus/evidence/wireframe-layout-adapter-viewport.png`

Scenario: World/entity structural visualization is read-only
  Tool: Playwright
  Preconditions: game with visible entities
  Steps:
    1. Enter structural mode
    2. Confirm entity outlines/markers visible
    3. Attempt drag/manipulation in viewer
    4. Assert no mutation occurs to entity transform/state from viewer interaction
  Expected Result: visualization only, no world editing from structural viewer
  Failure Indicators: entity positions change from viewer gestures
  Evidence: `.sisyphus/evidence/wireframe-world-readonly.png`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Add panel registration + layout plumbing
- Task 2: Build mode provider + basic state wiring

Wave 2 (After Wave 1):
- Task 3: Implement web viewer + structural renderer
- Task 4: Implement phase flow navigation + keyboard controls
- Task 5: Native fallback + tests + QA scenarios
- Task 6: Add canonical layout adapter for code-driven screens

Critical Path: Task 1 -> Task 3 -> Task 6 -> Task 5

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3,4 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1,2 | 4,5,6 | None |
| 4 | 3 | 5 | None |
| 5 | 3,4,6 | None | None |
| 6 | 3 | 5 | 4 |

---

## TODOs

- [x] 1. Register and expose Wireframe panel

  **What to do**:
  - Add lazy panel import/definition to panel registry
  - Add default placement in editor layout
  - Ensure panel can be opened/closed from existing editor shell

  **Must NOT do**:
  - Do not alter unrelated panel contracts

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 1
  - Blocks: 3,4
  - Blocked By: None

- [x] 2. Add Structural Mode provider and canonical state bindings

  **What to do**:
  - Create provider for mode + selected screen/phase state
  - Bind to existing editor document context (`useEditor`) only

  **Must NOT do**:
  - Do not introduce new persisted schema

  **Parallelization**:
  - Can Run In Parallel: YES
  - Parallel Group: Wave 1
  - Blocks: 3
  - Blocked By: None

- [ ] 3. Implement structural renderer and web viewer shell

  **What to do**:
  - Render canonical UI/game structures in low-fidelity style
  - Add portrait phone-ratio frame for MVP

  **Must NOT do**:
  - Do not attempt responsive breakpoint editor in MVP

  **Parallelization**:
  - Can Run In Parallel: NO
  - Parallel Group: Wave 2
  - Blocks: 4,5
  - Blocked By: 1,2

- [ ] 4. Implement flow navigation (screens/phases) + controls

  **What to do**:
  - Horizontal stepping, arrows, keyboard shortcuts, counter/dots
  - Party phase flow support in MVP

  **Must NOT do**:
  - Do not edit party phase component internals in MVP

  **Parallelization**:
  - Can Run In Parallel: NO
  - Parallel Group: Wave 2
  - Blocks: 5
  - Blocked By: 3

- [ ] 5. Add native fallback + tests + QA verification

  **What to do**:
  - Implement minimal native-safe viewer behavior
  - Add tests after implementation for key flows
  - Execute QA scenarios and capture evidence

  **Must NOT do**:
  - Do not claim completion without evidence captures

  **Parallelization**:
  - Can Run In Parallel: NO
  - Parallel Group: Wave 2 final
  - Blocks: None
  - Blocked By: 3,4

- [ ] 6. Add canonical layout adapter for code-driven screens

  **What to do**:
  - Define minimal adapter contract for positional/zone-based layout resolution
  - Integrate adapter into structural renderer input path
  - Integrate adapter into code-driven screen mapping path used by runtime-facing screens in scope

  **Must NOT do**:
  - Do not introduce a second persisted schema
  - Do not expand into full responsive breakpoint editor

  **Parallelization**:
  - Can Run In Parallel: NO
  - Parallel Group: Wave 2 final
  - Blocks: 5
  - Blocked By: 3

---

## Success Criteria

### Verification Commands
```bash
# run project tests for touched areas
pnpm test

# type check app/editor changes
pnpm typecheck
```

### Final Checklist
- [ ] Canonical schema remained single source of truth
- [ ] Structural mode usable for UI + party phase flow in MVP
- [ ] World/entity view is structural and read-only
- [ ] Sidebar + viewer workflow works without losing menu context
- [ ] Evidence captured for all QA scenarios
