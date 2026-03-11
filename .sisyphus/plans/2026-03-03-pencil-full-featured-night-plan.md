# Pencil Full-Featured Night Plan

## Outcome
Ship a production-credible design tool flow in `apps/pencil` where pointer interactions, inspection, AI edits, doc lifecycle, and external MCP controls all operate on the same live document.

## What Is Done In This Session
- [x] Wire chat operations to mutate the visible `PenDocument` immediately.
- [x] Add chat debug visibility: applied op counts, op payloads, and op errors.
- [x] Add bridge `applyOps` implementation and live selection payload (`selectedNodePath`, `selectedNodePaths`).
- [x] Add pointer hover highlight and click selection in canvas.
- [x] Add multi-select (shift/cmd/ctrl click toggle) and render multi-selection outlines.
- [x] Add inspector popover tied to active selection.
- [x] Add New and Save controls (local persistence + JSON export).

## Remaining Tonight

### 1) Pointer/Selection Hardening
- [x] Add marquee drag-select for area selection.
- [x] Add keyboard selection navigation (parent/child/sibling).
- [x] Add delete/backspace for selected nodes with undo-safe command path.
- [x] Add visual states for locked/hidden/reusable nodes.

### 2) Inspector Completeness
- [x] Add editable properties for position/size/opacity/fill/stroke.
- [x] Add batch editing behavior for multi-select shared fields.
- [x] Add component-aware inspector sections (`ref`, `descendants`, slot metadata).

### 3) Document Lifecycle
- [x] Add explicit Load action (load last, import JSON file).
- [x] Add Save As naming and predictable file naming.
- [x] Add workspace-backed persistence via `chatThreads.readWorkspaceFile` / `writeWorkspaceFile`.
- [x] Add stale/dirty indicators and recovery prompt.

### 4) AI + Tooling UX
- [ ] Add operation timeline panel with step-by-step playback.
- [ ] Add optional ghost cursor animation during agent edits.
- [x] Add deterministic op validation before apply (schema + id targeting checks).
- [x] Add failure recovery actions in chat (retry, rollback last op batch).

### 5) External MCP/CLI Parity
- [x] Extend MCP pencil tools to accept structured args reliably for `pencil_apply_ops`.
- [x] Add `pencil_new_document` and `pencil_save_document` tool operations.
- [ ] Add smoke script documenting outside-in flow: open -> apply ops -> screenshot -> verify.

### 6) Verification Gate
- [ ] Add automated integration test for chat->ops->canvas mutation path.
- [ ] Add automated integration test for bridge selection payload correctness.
- [ ] Add regression test for multi-select rendering and inspector state.

## Acceptance Criteria
- Pointer hover/select/multi-select works on nested nodes without stale selection.
- Inspector always reflects active selection and updates on every selection change.
- Agent edits visibly mutate the current document, never a detached virtual copy.
- New/Save/Load flows preserve full PenDocument fidelity.
- MCP/CLI can open, inspect, edit, and screenshot the same live document.
