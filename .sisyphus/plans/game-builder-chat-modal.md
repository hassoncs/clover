# Gizmo-Style Create Game Modal + Inline Agent Chat

## TL;DR

> **Quick Summary**: Route the floating plus button to a dedicated modal route (`/create-game`) and implement a chat-first game-builder interface that reuses existing `useAgentRun` infrastructure, rendering all agent questions and user answers inline in a scrollable conversation.
>
> **Deliverables**:
> - New modal route and screen shell for create-game
> - Chat UI components with persistent in-session history
> - Inline rendering of `user_question` and `clarification_requested` interactions
> - Completion handoff to editor flow
> - Plus button wiring update to open modal route
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Route shell -> Chat state/event mapping -> Inline question integration -> Completion handoff

---

## Context

### Original Request
User wants a Gizmo-like creation experience: tapping the floating plus button opens a dedicated modal route with a rich chat-like builder flow, reusing existing agent run infrastructure and showing questions inline. Tier/model controls should be hidden for now and defaulted.

### Interview Summary
**Key Discussions**:
- Create flow should be a **modal route** (not replacing tab screen directly).
- Tier selection should be **hidden** and default to internal configuration.
- Existing question UIs should appear **inline in chat history**.
- Chat should preserve scrollback so users can review prior exchange.
- Later transition modes (split preview/editor/chat vs full editor) are future-facing, but this phase should establish the chat-first foundation.

**Research Findings**:
- Plus button: `app/components/navigation/FloatingTabBar.tsx`
- Current plus action: `app/app/(tabs)/_layout.tsx` pushes `/maker`
- Legacy create modal: `app/app/(tabs)/maker.tsx`
- Agent run client flow: `app/components/editor/AIEditor/useAgentRun.ts`
- Inline-capable question components to reuse/adapt:
  - `app/components/editor/AIEditor/UserQuestionBatch.tsx`
  - `app/components/editor/AIEditor/UserQuestionCard.tsx`
  - `app/components/editor/AIEditor/ClarificationQA.tsx`
- Event contracts: `shared/src/types/agent-run.ts`, `shared/src/types/user-question.ts`
- Existing route modal pattern: `app/app/_layout.tsx`
- Existing bottom sheet pattern: `app/components/editor/BottomSheetHost.tsx`

### Metis Review
**Identified Gaps (addressed in this plan)**:
- Authentication behavior for modal entry/submit not explicitly stated
- Completion destination (editor handoff behavior) needed explicit definition
- Event/state edge cases (disconnect, retries, duplicate taps) needed guardrails
- Scope creep risk around redesigning `maker` and adding non-MVP media/chat features
- Missing explicit acceptance criteria for inline questions, scrollback, and route behavior

---

## Work Objectives

### Core Objective
Deliver a production-ready modal create-game chat flow that mirrors Gizmo interaction patterns while reusing existing agent-run infrastructure and preserving existing `maker` functionality.

### Concrete Deliverables
- New modal route screen at `app/app/create-game.tsx`
- Route registration in `app/app/_layout.tsx` using modal presentation
- Plus button action update in `app/app/(tabs)/_layout.tsx` to push `/create-game`
- New chat UI module(s) under `app/components/create-game/`
- Inline question rendering adapters that reuse existing AIEditor question components
- Completion flow from successful run to editor route (`/editor/[id]` or equivalent resolved target)

### Definition of Done
- [ ] Tapping plus opens create-game modal from tab context
- [ ] User can submit initial prompt without seeing tier selection
- [ ] Agent questions appear inline in chronological chat history
- [ ] User answers (structured + freeform) are captured and rendered inline
- [ ] Run completion triggers deterministic handoff to editor flow
- [ ] Existing `maker` page remains unchanged and functional

### Must Have
- Modal route entry from plus button
- Hidden tier selection with internal default
- Reuse of existing `useAgentRun` data/events
- Inline question/answer in chat log
- Robust loading/error/disconnect states

### Must NOT Have (Guardrails)
- No removal or rewrite of legacy `maker` flow
- No backend API/schema changes for agent runs in this phase
- No new media upload pipeline (image/audio chat payloads out of scope for MVP)
- No user-exposed model/tier controls in this iteration
- No dependence on manual human verification in acceptance criteria

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every task below includes agent-executable verification only.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (targeted UI/unit/integration updates)
- **Framework**: Existing workspace test setup + typecheck

### Agent-Executed QA Scenarios (applies to all tasks)

**Frontend/UI**: Playwright/dev-browser style scripted navigation and DOM/assertion checks

**API/Run State**: Existing `useAgentRun` event stream and mutation behavior assertions via component tests/mocks

**Evidence Paths**:
- Screenshots: `.sisyphus/evidence/task-{N}-{scenario}.png`
- Captured outputs/logs: `.sisyphus/evidence/task-{N}-{scenario}.log`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundations)
- Task 1: Route registration and plus-button wiring
- Task 2: Create-game screen shell and modal container

Wave 2 (Chat Core)
- Task 3: Chat message model and renderer
- Task 4: Input composer + submission orchestration
- Task 5: `useAgentRun` integration and event mapping

Wave 3 (Inline Questions + Handoff)
- Task 6: Inline `user_question` integration
- Task 7: Inline `clarification_requested` integration
- Task 8: Completion and error/edge-state handling

Wave 4 (Hardening + Validation)
- Task 9: Accessibility/keyboard/autoscroll hardening
- Task 10: Regression checks and final verification

Critical Path: 1 -> 2 -> 5 -> 6 -> 8 -> 10

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 2, 10 | 2 |
| 2 | 1 | 3, 4, 5 | 1 |
| 3 | 2 | 6, 7 | 4, 5 |
| 4 | 2 | 5, 8 | 3 |
| 5 | 2, 4 | 6, 7, 8 | 3 |
| 6 | 3, 5 | 8, 10 | 7 |
| 7 | 3, 5 | 8, 10 | 6 |
| 8 | 4, 5, 6, 7 | 9, 10 | None |
| 9 | 8 | 10 | None |
| 10 | 1, 6, 7, 8, 9 | None | None |

---

## TODOs

- [ ] 1. Register create-game modal route and update plus-button navigation

  **What to do**:
  - Add stack screen for `create-game` in `app/app/_layout.tsx` with modal presentation.
  - Update plus action in `app/app/(tabs)/_layout.tsx` from `/maker` to `/create-game`.
  - Keep existing tab architecture and `FloatingTabBar` API intact.

  **Must NOT do**:
  - Do not modify `FloatingTabBar` structure unless strictly needed.
  - Do not alter existing tab list or `maker` route behavior.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 1
  - **Blocks**: 2, 10
  - **Blocked By**: None

  **References**:
  - `app/app/_layout.tsx` - Existing modal screen configuration patterns.
  - `app/app/(tabs)/_layout.tsx` - Current plus button routing callback.
  - `app/components/navigation/FloatingTabBar.tsx` - Primary button callback contract.

  **Acceptance Criteria**:
  - [ ] Plus button opens `/create-game` as modal presentation.
  - [ ] Existing tabs still render and navigate correctly.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Plus button opens create-game modal route
    Tool: Playwright
    Preconditions: App running with tab shell loaded
    Steps:
      1. Navigate to app root tabs screen
      2. Click floating plus button (primary FAB)
      3. Assert route/path reflects /create-game
      4. Assert modal screen container is visible
      5. Screenshot: .sisyphus/evidence/task-1-open-create-game-modal.png
    Expected Result: Modal route overlays tabs
    Evidence: .sisyphus/evidence/task-1-open-create-game-modal.png
  ```

- [ ] 2. Build create-game modal screen shell

  **What to do**:
  - Create `app/app/create-game.tsx` as modal screen entry.
  - Add dark backdrop, dismiss affordance, and top-level safe-area handling.
  - Establish content container for chat interface.

  **Must NOT do**:
  - Do not embed legacy `maker` modal content.
  - Do not add tier/model controls to UI.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1 starts)
  - **Parallel Group**: Wave 1
  - **Blocks**: 3, 4, 5
  - **Blocked By**: 1

  **References**:
  - `app/components/editor/BottomSheetHost.tsx` - Bottom-sheet interaction idioms.
  - `app/components/themes/ThemeEditorModal.tsx` - Modal ergonomics and close patterns.

  **Acceptance Criteria**:
  - [ ] Modal shell renders over current tab view.
  - [ ] Screen can be dismissed safely without breaking navigation.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Dismiss create-game modal
    Tool: Playwright
    Preconditions: Modal opened from plus button
    Steps:
      1. Tap close affordance or backdrop dismissal control
      2. Assert route returns to previous tab
      3. Assert tab content visible and interactive
      4. Screenshot: .sisyphus/evidence/task-2-dismiss-modal.png
    Expected Result: Clean modal dismissal with no orphan overlay
    Evidence: .sisyphus/evidence/task-2-dismiss-modal.png
  ```

- [ ] 3. Create chat message timeline and renderer

  **What to do**:
  - Implement message model for user/agent/system message types.
  - Render chronological, scrollable conversation with user/agent differentiation.
  - Preserve in-session scrollback and stable keying.

  **Must NOT do**:
  - Do not implement markdown/media rendering in MVP.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 6, 7
  - **Blocked By**: 2

  **References**:
  - `app/components/editor/AIEditor/AIEditorPanel.tsx` - Existing stage-driven messaging semantics.
  - `app/components/editor/AIEditor/ClarificationQA.tsx` - Question/answer visual hierarchy.

  **Acceptance Criteria**:
  - [ ] New messages append in order and remain scrollable.
  - [ ] User and agent messages are visually distinct.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Scrollback through long conversation
    Tool: Playwright
    Preconditions: Seed/test with 20+ rendered messages
    Steps:
      1. Open create-game modal
      2. Scroll message list to top
      3. Assert earliest message visible
      4. Scroll to bottom
      5. Assert latest message and input remain visible
      6. Screenshot: .sisyphus/evidence/task-3-scrollback.png
    Expected Result: Stable, readable scrollback both directions
    Evidence: .sisyphus/evidence/task-3-scrollback.png
  ```

- [ ] 4. Build composer/input and initial prompt submission flow

  **What to do**:
  - Add chat composer with send button, disabled states, and validation.
  - On first submit: create run prompt payload and kick off flow.
  - Keep tier hidden and default internally.

  **Must NOT do**:
  - No tier picker UI.
  - No submission of empty/whitespace-only prompts.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 5, 8
  - **Blocked By**: 2

  **References**:
  - `app/components/editor/AIEditor/AIEditorPanel.tsx` - Prompt creation/start behavior.
  - `app/components/editor/AIEditor/useAgentRun.ts` - `createRun` and `startRun` interfaces.

  **Acceptance Criteria**:
  - [ ] Empty submission blocked.
  - [ ] Valid submission creates and starts run using hidden default tier.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Prompt validation and send
    Tool: Playwright
    Preconditions: Modal open, no active run
    Steps:
      1. Click send with empty input
      2. Assert send blocked and no run-start indicator
      3. Type "Build a physics stacker game"
      4. Click send
      5. Assert loading/progress indicator appears
      6. Screenshot: .sisyphus/evidence/task-4-send-prompt.png
    Expected Result: Valid prompt starts run; invalid prompt blocked
    Evidence: .sisyphus/evidence/task-4-send-prompt.png
  ```

- [ ] 5. Integrate `useAgentRun` into create-game chat state

  **What to do**:
  - Connect run lifecycle state to modal chat UI.
  - Map connection/loading/error/run status to chat system messages.
  - Ensure reconnection-safe event processing and dedupe semantics stay intact.

  **Must NOT do**:
  - Do not rewrite event processing logic in `useAgentRun`.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 6, 7, 8
  - **Blocked By**: 2, 4

  **References**:
  - `app/components/editor/AIEditor/useAgentRun.ts` - Connection lifecycle, event queue, question state derivation.
  - `shared/src/types/agent-run.ts` - Valid event and status contracts.

  **Acceptance Criteria**:
  - [ ] Run states reflected in UI (`planning`, `running`, `waiting_for_input`, `failed`, `succeeded`).
  - [ ] Connection loss/reconnect does not duplicate rendered events.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Reconnect resilience
    Tool: Playwright + network throttle controls
    Preconditions: Active run in progress
    Steps:
      1. Start a run from chat
      2. Simulate temporary network disconnect
      3. Restore network
      4. Assert chat resumes with no duplicated events
      5. Screenshot: .sisyphus/evidence/task-5-reconnect.png
    Expected Result: Event continuity preserved after reconnect
    Evidence: .sisyphus/evidence/task-5-reconnect.png
  ```

- [ ] 6. Render `user_question` batches inline in chat

  **What to do**:
  - Reuse/adapt `UserQuestionBatch` + `UserQuestionCard` to inline chat context.
  - Persist submitted answers as user-side chat entries.
  - Maintain batch-level submit semantics.

  **Must NOT do**:
  - Do not launch separate full-screen question mode.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 8, 10
  - **Blocked By**: 3, 5

  **References**:
  - `app/components/editor/AIEditor/UserQuestionBatch.tsx` - Batch answer submission pattern.
  - `app/components/editor/AIEditor/UserQuestionCard.tsx` - Option rendering and custom-text merge behavior.
  - `shared/src/types/user-question.ts` - Question/option data contract.

  **Acceptance Criteria**:
  - [ ] `user_question` payload appears inline with selectable options.
  - [ ] Submitted answers appear as chat history entries and clear pending state.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Inline structured question answer flow
    Tool: Playwright
    Preconditions: Run emits a `user_question` event
    Steps:
      1. Wait for inline question block in chat timeline
      2. Select one option and add custom text where allowed
      3. Submit answers
      4. Assert submitted answer appears as user message bubble
      5. Screenshot: .sisyphus/evidence/task-6-inline-user-question.png
    Expected Result: Structured Q/A occurs inline and persists in timeline
    Evidence: .sisyphus/evidence/task-6-inline-user-question.png
  ```

- [ ] 7. Render `clarification_requested` inline and capture reply

  **What to do**:
  - Reuse/adapt `ClarificationQA` semantics as inline clarification cards.
  - Capture clarification answers and render them in chat history.

  **Must NOT do**:
  - Do not hide clarification context metadata when available.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-ui-ux`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 8, 10
  - **Blocked By**: 3, 5

  **References**:
  - `app/components/editor/AIEditor/ClarificationQA.tsx` - Pending vs history rendering model.
  - `shared/src/types/agent-run.ts` - Clarification payload contract.

  **Acceptance Criteria**:
  - [ ] Clarification prompt appears inline with response input.
  - [ ] Submitted clarification renders as user response in chat timeline.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Inline freeform clarification flow
    Tool: Playwright
    Preconditions: Run emits `clarification_requested`
    Steps:
      1. Wait for clarification card in timeline
      2. Enter answer text
      3. Submit answer
      4. Assert pending clarification is marked answered
      5. Assert answer appears in timeline
      6. Screenshot: .sisyphus/evidence/task-7-inline-clarification.png
    Expected Result: Clarification cycle completes inline with persistent history
    Evidence: .sisyphus/evidence/task-7-inline-clarification.png
  ```

- [ ] 8. Implement completion trigger, handoff state, and failure handling

  **What to do**:
  - Detect completion (`run_completed`) and transition out of pure conversation mode.
  - For this phase, hand off to editor route once completion payload is resolvable.
  - Add actionable error states for run failure/cancel/timeouts.

  **Must NOT do**:
  - Do not block future split-view evolution; keep transition logic extensible.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 9, 10
  - **Blocked By**: 4, 5, 6, 7

  **References**:
  - `app/app/editor/[id].tsx` - Editor entry route and required params.
  - `shared/src/types/agent-run.ts` - Completion and failure event semantics.

  **Acceptance Criteria**:
  - [ ] Successful run transitions to editor handoff without user confusion.
  - [ ] Failed run shows retry/close options and does not dead-end.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Successful completion transitions to editor
    Tool: Playwright
    Preconditions: Run reaches completion state with resolvable game target
    Steps:
      1. Drive run to completion (mock or fixture)
      2. Assert transition card/state appears
      3. Assert navigation to editor route occurs
      4. Screenshot: .sisyphus/evidence/task-8-complete-to-editor.png
    Expected Result: User exits conversation mode into editor flow
    Evidence: .sisyphus/evidence/task-8-complete-to-editor.png

  Scenario: Failure displays recovery options
    Tool: Playwright
    Preconditions: Run emits failure
    Steps:
      1. Trigger failure state
      2. Assert error message with retry/close actions present
      3. Click retry and assert new attempt can start
      4. Screenshot: .sisyphus/evidence/task-8-failure-recovery.png
    Expected Result: Failure path recoverable, no dead-end
    Evidence: .sisyphus/evidence/task-8-failure-recovery.png
  ```

- [ ] 9. Keyboard, accessibility, and interaction hardening

  **What to do**:
  - Ensure input remains visible with keyboard open.
  - Ensure focus and VoiceOver labels for chat controls and option cards.
  - Guard against rapid double-submit and repeated modal opens.

  **Must NOT do**:
  - Do not introduce new global state manager for this hardening pass.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `web-design-guidelines`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 10
  - **Blocked By**: 8

  **References**:
  - `app/components/editor/AIEditor/UserQuestionBatch.tsx` - Existing form submission guards.
  - `app/components/navigation/FloatingTabBar.tsx` - FAB interaction behavior.

  **Acceptance Criteria**:
  - [ ] Keyboard does not occlude input/composer.
  - [ ] Accessibility labels are present for all interactive controls.
  - [ ] Duplicate send/open actions are prevented.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Keyboard-safe composer behavior
    Tool: Playwright (mobile viewport)
    Preconditions: Modal open
    Steps:
      1. Focus chat input
      2. Assert composer remains visible above keyboard area
      3. Type and submit without obscured controls
      4. Screenshot: .sisyphus/evidence/task-9-keyboard-safe.png
    Expected Result: Input UX remains usable with keyboard open
    Evidence: .sisyphus/evidence/task-9-keyboard-safe.png
  ```

- [ ] 10. Regression verification + type/test/build checks

  **What to do**:
  - Verify routing regressions (tabs, maker, modal open/close, editor handoff).
  - Run project typecheck and relevant tests.
  - Capture evidence artifacts and summarize validation.

  **Must NOT do**:
  - Do not ship without successful typecheck.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final wave
  - **Blocks**: None
  - **Blocked By**: 1, 6, 7, 8, 9

  **References**:
  - `app/app/_layout.tsx` - Route wiring verification.
  - `app/app/(tabs)/_layout.tsx` - Plus action verification.
  - `app/app/(tabs)/maker.tsx` - Regression guard: legacy behavior unchanged.

  **Acceptance Criteria**:
  - [ ] Typecheck passes.
  - [ ] Modal/chat flow scenarios pass.
  - [ ] Legacy maker route still functional.

  **Agent-Executed QA Scenarios**:
  ```text
  Scenario: Full regression sweep for create flow and legacy maker
    Tool: Bash + Playwright
    Preconditions: Build environment available
    Steps:
      1. Run typecheck command(s)
      2. Execute key UI verification scenarios for modal and inline Q/A
      3. Navigate to /maker and verify old flow still renders
      4. Capture outputs and screenshots
    Expected Result: New flow works, legacy flow unaffected
    Evidence: .sisyphus/evidence/task-10-regression.log + screenshots
  ```

---

## Commit Strategy

| After Task | Message | Scope |
|------------|---------|-------|
| 1-2 | `feat(create-game): add modal route and plus-button entry` | routing + shell |
| 3-7 | `feat(create-game): add chat timeline with inline agent questions` | chat + events |
| 8-10 | `feat(create-game): add completion handoff and hardening` | transition + QA |

---

## Success Criteria

### Verification Commands

```bash
pnpm --filter app tsc --noEmit
pnpm test
```

### Final Checklist
- [ ] Plus FAB opens create-game modal route
- [ ] Tier controls hidden; default tier applied internally
- [ ] Inline structured/freeform question flows fully functional
- [ ] Chat history remains scrollable and coherent
- [ ] Completion handoff works for success path
- [ ] Failure/reconnect states are recoverable
- [ ] Legacy maker flow remains intact
