# Open Pencil Parity Master

## TL;DR
> **Summary**: Reach OpenPencil-grade capability parity in Slopcade Pencil by unifying all edits on PenDocument, hardening pointer/inspector/chat/MCP flows, and eliminating dual-runtime tech debt with staged deletion gates.
> **Deliverables**:
> - parity-checked pointer/selection/transform/inspector behavior
> - stable doc lifecycle (new/load/save/import/export)
> - MCP + chat tool parity on the same live document
> - migration guardrails + comprehensive evidence pack
> **Effort**: XL
> **Parallel**: YES - 6 waves
> **Critical Path**: 1 -> 2 -> 3 -> 7 -> 10 -> 12

## Context
### Original Request
User requested full OpenPencil skills/tools parity, complete manipulation support (move/scale/select), comprehensive testing via screenshots/automation, and immediate continuation after committing current work.

### Interview Summary
- User intent is execution-complete parity, not incremental polish.
- User explicitly wants no missed scope and comprehensive testing.
- User asked to commit current implemented work, then continue.

### Metis Review (gaps addressed)
- Added explicit guardrails to prevent dual-runtime regressions.
- Added hard acceptance gates per migration wave.
- Added edge-case coverage for refs, roundtrip integrity, variables, connectors, and malformed data.
- Added scope boundaries to avoid framework-port scope creep.

## Work Objectives
### Core Objective
Deliver a fully operational Pencil tool with OpenPencil-equivalent authoring and automation workflows while converging on one PenDocument runtime path.

### Deliverables
- Unified mutation path for UI, chat, bridge, and MCP.
- Interaction parity: hover/select/multi-select/marquee/transform/delete.
- Inspector parity for core editable props and batch edits.
- Document lifecycle parity: new/load/save/import/export + persistence.
- External parity: MCP tools for open/read/select/edit/new/save/screenshot.
- Legacy cleanup roadmap with deletion checks.

### Definition of Done (verifiable conditions with commands)
- `pnpm --filter @slopcade/design-canvas exec tsc --noEmit`
- `pnpm --filter @slopcade/pencil-app exec tsc --noEmit`
- `pnpm --filter @slopcade/game-inspector-mcp exec tsc --noEmit`
- MCP flow succeeds: `pencil_open`, `pencil_get_document`, `pencil_get_selection`, `pencil_apply_ops`, `pencil_new_document`, `pencil_save_document`, `pencil_screenshot`
- Evidence artifacts exist for every task under `.sisyphus/evidence/`

### Must Have
- Single source of truth for document mutations (PenDocument path).
- No silent failure when ops fail; visible diagnostics in chat and tools.
- Deterministic behavior for selection and inspector updates.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No framework-port detour (do not port OpenPencil Vue UI into React).
- No permanent dual runtime (`DesignDocument` and `PenDocument` both active for writes).
- No fallback layout engine path in production (Yoga gate remains explicit).
- No MCP tool surface that mutates detached virtual state.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after with TypeScript package checks + MCP e2e smoke flows
- QA policy: Every task includes happy + failure scenarios with concrete commands
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: Runtime stabilization + commit checkpoint
Wave 2: Interaction + inspector parity hardening
Wave 3: Document lifecycle and persistence parity
Wave 4: MCP/tool parity and bridge contract hardening
Wave 5: Regression suite + edge-case coverage
Wave 6: Legacy cutover/deletion gates and wrap-up

### Dependency Matrix (full, all tasks)
- 1 blocks 2-14
- 2 blocks 3,4,5
- 3 blocks 4,6,7
- 4 blocks 6,7
- 5 blocks 8,9
- 6 blocks 10,11
- 7 blocks 10,11
- 8 blocks 12
- 9 blocks 12
- 10 blocks 12,13
- 11 blocks 13
- 12 blocks 14
- 13 blocks 14

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 2 tasks -> `quick`, `unspecified-low`
- Wave 2 -> 3 tasks -> `visual-engineering`, `unspecified-high`
- Wave 3 -> 2 tasks -> `unspecified-high`
- Wave 4 -> 2 tasks -> `deep`, `unspecified-high`
- Wave 5 -> 2 tasks -> `unspecified-high`
- Wave 6 -> 3 tasks -> `deep`, `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Commit Current Pencil Slice Safely

  **What to do**: Stage and commit only Pencil-related changes currently in working tree (`apps/pencil/*`, `packages/design-canvas/*`, `packages/game-inspector-mcp/src/tools/pencil.ts`, plus required new files). Exclude unrelated dirty files.
  **Must NOT do**: Do not include unrelated docs/landing/skill changes in this parity commit.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: precise staging + commit hygiene
  - Skills: [`git-master`] — atomic commit discipline
  - Omitted: [`subagent-driven-development`] — unnecessary for single commit action

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-14 | Blocked By: none

  **References**:
  - Pattern: `AGENTS.md` — commit hygiene and no destructive git behavior
  - Pattern: `apps/pencil/app/index.tsx` — current Pencil integration state

  **Acceptance Criteria**:
  - [ ] `git status --short` shows only intended files staged
  - [ ] one conventional commit exists for Pencil parity slice

  **QA Scenarios**:
  ```text
  Scenario: Commit includes only parity files
    Tool: Bash
    Steps: run git status --short, git diff --cached --name-only
    Expected: staged files limited to Pencil/design-canvas/MCP parity scope
    Evidence: .sisyphus/evidence/task-1-commit-scope.txt

  Scenario: Guard against accidental staging
    Tool: Bash
    Steps: run git restore --staged <unrelated> if any unrelated file appears, re-check status
    Expected: no unrelated files in staged set
    Evidence: .sisyphus/evidence/task-1-commit-scope-error.txt
  ```

  **Commit**: YES | Message: `feat(pencil): harden parity core interactions and bridge` | Files: scoped parity files only

- [x] 2. Enforce Single Mutation Path Invariants

  **What to do**: Audit mutation entry points and ensure all authoring mutations route through PenDocument path only (UI, chat, bridge, MCP).
  **Must NOT do**: Do not leave alternate write paths in legacy `DesignDocument` runtime for Pencil execution.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: cross-surface consistency + architecture correctness
  - Skills: [`workspace-system`] — repo-wide path validation
  - Omitted: [`frontend-ui-ux`] — logic-focused task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3,4,5 | Blocked By: 1

  **References**:
  - Pattern: `apps/pencil/lib/designChatOps.ts` — canonical op mutation path
  - Pattern: `apps/pencil/lib/usePencilBridge.ts` — bridge mutations
  - Pattern: `packages/game-inspector-mcp/src/tools/pencil.ts` — MCP mutation path
  - API/Type: `shared/src/types/pen.ts` — document contract

  **Acceptance Criteria**:
  - [ ] no Pencil mutation path writes through `shared/src/types/design.ts`
  - [ ] bridge/chat/MCP all mutate same live document instance

  **QA Scenarios**:
  ```text
  Scenario: Chat and MCP mutate same state
    Tool: game-inspector_call_op + Bash
    Steps: apply chat op in UI, then run pencil_get_document
    Expected: document reflects chat mutation immediately
    Evidence: .sisyphus/evidence/task-2-mutation-unification.txt

  Scenario: Legacy path blocked
    Tool: Grep
    Steps: search for DesignDocument mutation usage in Pencil runtime paths
    Expected: no active legacy writer in Pencil runtime flow
    Evidence: .sisyphus/evidence/task-2-mutation-unification-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 3. Complete Pointer Transform Interaction Set

  **What to do**: Finalize drag/move/scale/resize behavior for selected nodes including multi-select transforms and consistent hover/selection chrome.
  **Must NOT do**: Do not regress pen tool path authoring behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: interaction-heavy canvas behavior
  - Skills: [`input-handling`] — pointer gesture/state correctness
  - Omitted: [`economy-engine`] — unrelated domain

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6,7 | Blocked By: 2

  **References**:
  - Pattern: `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx`
  - Pattern: `packages/design-canvas/src/pen/render/PenRenderer.tsx`
  - External: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/tools/`

  **Acceptance Criteria**:
  - [ ] drag/move/resize works for single and multi-select
  - [ ] marquee selection does not break camera panning

  **QA Scenarios**:
  ```text
  Scenario: Single + multi transform
    Tool: MCP debug_eval + screenshot
    Steps: select nodes, drag/resize, capture before/after screenshots
    Expected: expected bounds and positions update deterministically
    Evidence: .sisyphus/evidence/task-3-pointer-transform.png

  Scenario: Modifier edge behavior
    Tool: MCP debug_eval
    Steps: perform shift/meta/ctrl selection toggles with drag
    Expected: selection set toggles correctly without stale nodes
    Evidence: .sisyphus/evidence/task-3-pointer-transform-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 4. Inspector Editing Parity (Core Properties)

  **What to do**: Expand inspector from readout + nudges to editable property controls (x/y/width/height/opacity/fill/stroke) with batch edit support for multi-select.
  **Must NOT do**: Do not introduce direct mutation bypass that skips core mutation path.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: UI + state sync complexity
  - Skills: [`editor-system`] — inspector interaction patterns
  - Omitted: [`game-authoring`] — unrelated

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7 | Blocked By: 2

  **References**:
  - Pattern: `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx`
  - Pattern: `packages/editor/src/useEditorChatSession.ts` (status-driven UI patterns)

  **Acceptance Criteria**:
  - [ ] edits apply immediately to selected nodes
  - [ ] multi-select shared property edits apply consistently

  **QA Scenarios**:
  ```text
  Scenario: Inspector edit happy path
    Tool: MCP screenshot + debug_eval
    Steps: edit x/y/opacity in inspector and re-read document
    Expected: values persisted in live PenDocument
    Evidence: .sisyphus/evidence/task-4-inspector-edit.txt

  Scenario: Mixed selection incompatible fields
    Tool: UI automation
    Steps: select incompatible node types and attempt field edit
    Expected: UI prevents invalid edit and shows non-destructive feedback
    Evidence: .sisyphus/evidence/task-4-inspector-edit-error.png
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 5. Layers + Selection Coherence

  **What to do**: Ensure layers panel selection, canvas selection, and bridge selection stay in sync for single/multi paths.
  **Must NOT do**: Do not keep stale `selectedNodePath` assumptions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: cross-component state reconciliation
  - Skills: [`editor-system`] — panel state patterns
  - Omitted: [`physics`] — irrelevant

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8,9 | Blocked By: 2

  **References**:
  - Pattern: `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx`
  - Pattern: `apps/pencil/lib/usePencilBridge.ts`

  **Acceptance Criteria**:
  - [ ] layers and canvas reflect same selected IDs
  - [ ] bridge `getSelection` always matches UI state

  **QA Scenarios**:
  ```text
  Scenario: Layer-first selection
    Tool: UI automation + debug_eval
    Steps: select from layers, then query bridge selection
    Expected: same ids in UI and bridge payload
    Evidence: .sisyphus/evidence/task-5-layer-sync.txt

  Scenario: Rapid toggles
    Tool: debug_eval loop
    Steps: simulate rapid select/unselect changes
    Expected: no stale or duplicate selection payloads
    Evidence: .sisyphus/evidence/task-5-layer-sync-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 6. Document Lifecycle Full Pass

  **What to do**: Finalize New/Load/Save/Import/Export with deterministic persistence policy and clear dirty-state behavior.
  **Must NOT do**: Do not silently drop document data on parse failure.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: state + persistence + UX policy
  - Skills: [`workspace-system`] — file/storage flow discipline
  - Omitted: [`social-features`] — irrelevant

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 10,11 | Blocked By: 3

  **References**:
  - Pattern: `apps/pencil/app/index.tsx`
  - Pattern: `packages/design-canvas/src/document/useDesignDocument.ts`
  - Pattern: `api/src/trpc/routes/chat-threads.ts`

  **Acceptance Criteria**:
  - [ ] load/save survives reload and roundtrip parse
  - [ ] malformed import fails with clear error without clobbering current doc

  **QA Scenarios**:
  ```text
  Scenario: Save and reload
    Tool: Browser automation + debug_eval
    Steps: mutate doc, save, reload page, fetch document
    Expected: persisted document matches pre-reload state
    Evidence: .sisyphus/evidence/task-6-doc-lifecycle.txt

  Scenario: Corrupt JSON import
    Tool: UI automation
    Steps: import invalid JSON file
    Expected: explicit error; previous document unchanged
    Evidence: .sisyphus/evidence/task-6-doc-lifecycle-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 7. MCP Tool Parity and Schema Hardening

  **What to do**: Complete MCP parity set and strict argument validation for ops, new/save, and bridge availability checks.
  **Must NOT do**: Do not rely on implicit JSON parsing quirks.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: tool contract correctness and backward compatibility
  - Skills: [`agent-tool-builder`] — robust tool schema design
  - Omitted: [`frontend-ui-ux`] — not UI-first

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 10,11 | Blocked By: 4

  **References**:
  - Pattern: `packages/game-inspector-mcp/src/tools/pencil.ts`
  - Pattern: `apps/pencil/lib/usePencilBridge.ts`

  **Acceptance Criteria**:
  - [ ] `pencil_apply_ops` accepts both string and object-array payload formats (or explicit documented rejection)
  - [ ] `pencil_new_document` and `pencil_save_document` succeed against live bridge

  **QA Scenarios**:
  ```text
  Scenario: Tool happy path sweep
    Tool: game-inspector_call_op
    Steps: open -> new_document -> apply_ops -> save_document -> get_document -> screenshot
    Expected: each operation returns ok and document state transitions as expected
    Evidence: .sisyphus/evidence/task-7-mcp-parity.txt

  Scenario: Bridge unavailable
    Tool: game-inspector_call_op
    Steps: invoke tool without opening page
    Expected: explicit structured error response
    Evidence: .sisyphus/evidence/task-7-mcp-parity-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 8. Chat Tool-Call Playback + Debug Timeline

  **What to do**: Add ordered operation timeline in chat with status states and optional playback marker/cursor for agent-applied changes.
  **Must NOT do**: Do not hide failed operations.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: timeline UX + state rendering
  - Skills: [`agent-orchestration`] — tool-call status representation patterns
  - Omitted: [`native-infrastructure`] — irrelevant

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 12 | Blocked By: 5

  **References**:
  - Pattern: `apps/pencil/app/index.tsx`
  - Pattern: `packages/editor-ai/src/ChatMessage.tsx`

  **Acceptance Criteria**:
  - [ ] each op shows queued/applied/failed status
  - [ ] failures include actionable reason

  **QA Scenarios**:
  ```text
  Scenario: Mixed success batch
    Tool: chat UI + screenshot
    Steps: send op batch containing one invalid op
    Expected: timeline shows applied and failed entries distinctly
    Evidence: .sisyphus/evidence/task-8-chat-timeline.png

  Scenario: Empty-op response
    Tool: chat UI
    Steps: send prompt returning no ops
    Expected: UI indicates no-op without false success
    Evidence: .sisyphus/evidence/task-8-chat-timeline-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 9. Roundtrip + Edge Fixture Test Pack

  **What to do**: Build fixture suite for deep nesting, refs, variables, connectors, malformed data, and large docs; verify parse/mutate/save/reparse invariants.
  **Must NOT do**: Do not rely on hand-checking only.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: robust regression test creation
  - Skills: [`testing-patterns`] — fixture and assertion conventions
  - Omitted: [`frontend-ui-ux`] — non-UI focus

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: 12 | Blocked By: 5

  **References**:
  - API/Type: `shared/src/types/pen.ts`
  - Pattern: `shared/src/types/__tests__/pen.test.ts`
  - External: `/Users/hassoncs/Workspaces/open-pencil/packages/core/src/scene-graph.ts`

  **Acceptance Criteria**:
  - [ ] fixture suite covers top 10 edge cases from Oracle/Metis
  - [ ] roundtrip invariants pass for valid fixtures

  **QA Scenarios**:
  ```text
  Scenario: Deep tree roundtrip
    Tool: Bash test runner
    Steps: run fixture roundtrip tests
    Expected: no structural drift for valid fixtures
    Evidence: .sisyphus/evidence/task-9-roundtrip-tests.txt

  Scenario: Invalid fixtures
    Tool: Bash test runner
    Steps: run malformed fixture tests
    Expected: deterministic parse errors and no crash
    Evidence: .sisyphus/evidence/task-9-roundtrip-tests-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 10. Legacy DesignDocument Cutover Audit

  **What to do**: Audit and isolate remaining legacy `DesignDocument` dependencies; enforce quarantine list and deletion readiness checklist.
  **Must NOT do**: Do not delete legacy code before parity gates 2-9 are green.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: architecture cutover safety
  - Skills: [`workspace-system`] — cross-package dependency tracking
  - Omitted: [`artistry`] — conventional architecture task

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: 13 | Blocked By: 6,7

  **References**:
  - Pattern: `.sisyphus/notepads/open-pencil-full-migration-plan/issues.md`
  - Pattern: `shared/src/types/design.ts`
  - Pattern: `packages/design-canvas/src/ops/canvasOps.ts`

  **Acceptance Criteria**:
  - [ ] explicit list of remaining legacy imports with owner and removal plan
  - [ ] zero new legacy imports introduced

  **QA Scenarios**:
  ```text
  Scenario: Legacy dependency audit
    Tool: Grep
    Steps: grep for DesignDocument and legacy ops consumers
    Expected: list matches migration checklist; no new leakages
    Evidence: .sisyphus/evidence/task-10-legacy-audit.txt

  Scenario: Guardrail enforcement
    Tool: CI/test command
    Steps: run guardrail check command for forbidden imports
    Expected: fails on forbidden additions
    Evidence: .sisyphus/evidence/task-10-legacy-audit-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 11. Comprehensive Automation Smoke Script

  **What to do**: Build one deterministic outside-in script that executes: open -> new -> apply ops -> selection -> inspector edit -> save -> screenshot -> verify.
  **Must NOT do**: Do not require manual intervention for success path.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: integrated workflow orchestration
  - Skills: [`game-inspector`] — MCP operation flows
  - Omitted: [`frontend-ui-ux`] — automation-focused

  **Parallelization**: Can Parallel: YES | Wave 6 | Blocks: 13 | Blocked By: 6,7

  **References**:
  - Pattern: `packages/game-inspector-mcp/src/tools/pencil.ts`
  - Pattern: `apps/pencil/lib/usePencilBridge.ts`

  **Acceptance Criteria**:
  - [ ] smoke script runs end-to-end without manual edits
  - [ ] screenshots and resulting JSON match expected assertions

  **QA Scenarios**:
  ```text
  Scenario: Full happy-path smoke
    Tool: Bash + game-inspector ops
    Steps: execute scripted pipeline end-to-end
    Expected: all operations succeed and final screenshot generated
    Evidence: .sisyphus/evidence/task-11-smoke-happy.txt

  Scenario: Mid-run tool failure handling
    Tool: scripted run with injected invalid op
    Steps: run same flow with one bad op
    Expected: script fails with clear step-localized error
    Evidence: .sisyphus/evidence/task-11-smoke-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 12. Package Verification + CI Gates

  **What to do**: Enforce package-level type checks and targeted tests as mandatory gate before each integration commit.
  **Must NOT do**: Do not mark parity complete with lint/type failures.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: deterministic gate execution
  - Skills: [`testing-patterns`] — verification rigor
  - Omitted: [`deep`] — not required for command orchestration

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: 14 | Blocked By: 8,9,10

  **References**:
  - Pattern: `AGENTS.md` verification expectations

  **Acceptance Criteria**:
  - [ ] all three package typechecks pass
  - [ ] parity smoke script passes

  **QA Scenarios**:
  ```text
  Scenario: Verification gate pass
    Tool: Bash
    Steps: run all required typecheck/test/smoke commands
    Expected: zero failing commands
    Evidence: .sisyphus/evidence/task-12-verification.txt

  Scenario: Verification gate fail path
    Tool: Bash
    Steps: run with one intentionally failing condition
    Expected: failure detected and reported before completion
    Evidence: .sisyphus/evidence/task-12-verification-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: n/a

- [x] 13. Legacy Deletion Execution

  **What to do**: Remove approved legacy runtime paths once parity gates pass; update references and ensure no dangling imports.
  **Must NOT do**: Do not delete shared types still used by non-Pencil domains without validated replacements.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: high-impact structural cleanup
  - Skills: [`workspace-system`] — deletion safety
  - Omitted: [`visual-engineering`] — cleanup task

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: 14 | Blocked By: 10,11

  **References**:
  - Pattern: `.sisyphus/notepads/open-pencil-full-migration-plan/decisions.md`
  - Pattern: `shared/src/types/design.ts`
  - Pattern: `packages/design-canvas/src/ops/canvasOps.ts`

  **Acceptance Criteria**:
  - [ ] legacy files removed or quarantined per checklist
  - [ ] no active Pencil runtime imports of legacy model remain

  **QA Scenarios**:
  ```text
  Scenario: Post-deletion runtime smoke
    Tool: Bash + MCP
    Steps: run app and parity smoke script after deletions
    Expected: behavior unchanged from pre-deletion baseline
    Evidence: .sisyphus/evidence/task-13-deletion-smoke.txt

  Scenario: Dangling import detection
    Tool: tsc/grep
    Steps: run typecheck and import audit
    Expected: no dangling legacy import errors
    Evidence: .sisyphus/evidence/task-13-deletion-smoke-error.txt
  ```

  **Commit**: YES | Message: `refactor(pencil): remove legacy designdocument runtime path` | Files: legacy cutover files

- [x] 14. Final Integration Commit + Release Notes

  **What to do**: Create final commit sequence for parity waves, summarize evidence, and prepare concise handoff for `/start-work` execution continuity.
  **Must NOT do**: Do not squash away necessary migration traceability.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: final synthesis and handoff clarity
  - Skills: [`git-master`] — commit choreography
  - Omitted: [`deep`] — no architecture decisions left

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: none | Blocked By: 12,13

  **References**:
  - Pattern: `.sisyphus/plans/open-pencil-parity-master.md`
  - Pattern: `.sisyphus/evidence/`

  **Acceptance Criteria**:
  - [ ] commit history reflects wave-by-wave migration intent
  - [ ] evidence index includes all task artifacts

  **QA Scenarios**:
  ```text
  Scenario: Handoff completeness
    Tool: Read + Bash
    Steps: verify plan, evidence, and git log contain all required markers
    Expected: no missing task evidence or undocumented commits
    Evidence: .sisyphus/evidence/task-14-handoff.txt

  Scenario: Missing evidence guard
    Tool: Bash
    Steps: run evidence completeness script/checklist
    Expected: fails if any task evidence file is missing
    Evidence: .sisyphus/evidence/task-14-handoff-error.txt
  ```

  **Commit**: YES | Message: `chore(pencil): finalize open-pencil parity migration` | Files: parity + tests + docs

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: current parity slice (scoped files only)
- Commit 2+: wave-based commits (interaction, lifecycle, MCP, tests, deletion)
- Final: integration + evidence index

## Success Criteria
- OpenPencil parity workflows are executable in Slopcade Pencil with no detached virtual state.
- User can move/manipulate/scale/select/edit/save via UI and via MCP tools on same document.
- Full verification evidence exists and legacy dual-runtime risk is retired or explicitly quarantined.
