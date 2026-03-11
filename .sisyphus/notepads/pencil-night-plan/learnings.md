## 2026-03-09 Initialization

## 2026-03-09 Wave 1 verification
- `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` now supports pointer-mode keyboard traversal: `Escape` climbs to parent or clears root selection, `Enter` drills into first child, and `Tab`/`Shift+Tab` cycles siblings with wraparound.
- Delete/backspace already used the existing `applyDocumentUpdate` path, which remains compatible with the parent document history flow in `apps/pencil/app/index.tsx`.
- Hidden/disabled/reusable visual states now show up in the embedded layers panel, inspector badges, and reusable frame titles.
- `packages/game-inspector-mcp/src/tools/pencil.ts` now accepts structured arrays or legacy JSON strings for `pencil_apply_ops`, and adds `pencil_new_document` plus `pencil_save_document`.
- `apps/pencil/lib/usePencilBridge.ts` exposes `newDocument` and `saveDocument` on `window.__PENCIL_BRIDGE__` and persists both to localStorage.

## 2026-03-09 MCP/CLI Parity Slice

### pencil_apply_ops structured args
- Changed `ops` schema from `z.string()` to `z.union([z.array(z.record(z.unknown())), z.string()])`.
- Added `normaliseOpsArg()` helper that accepts either a native array or a JSON-encoded string and always returns a JSON string for the bridge call.
- Backward-compatible: string callers still work; structured callers no longer need to manually `JSON.stringify`.

### pencil_new_document
- New MCP tool that calls `bridge.newDocument()` in the browser context.
- Bridge method resets state to `{ version: 1, children: [] }`, persists to localStorage, and returns `{ ok: true }`.
- Returns `{ ok: false, error: "..." }` if bridge is missing or method not available (graceful degradation).

### pencil_save_document
- New MCP tool that calls `bridge.saveDocument()` in the browser context.
- Bridge method persists current document to localStorage and returns `{ ok: true, document: <PenDocument> }`.
- Does NOT trigger a file download (unlike the in-app Save button) — MCP callers get the JSON directly in the response.

### usePencilBridge changes
- Added `newDocument` and `saveDocument` to the `PencilBridge` interface and implementation.
- `setDocument` ref is now tracked alongside `documentRef` so bridge callbacks always call the latest setter without stale closure issues.
- `LOCAL_DOC_KEY` constant duplicated from `index.tsx` into `usePencilBridge.ts` to keep the bridge self-contained. Consider extracting to a shared constants file if it diverges.

### Pre-existing pencil app typecheck errors
- `apps/pencil` tsc reports ~150 errors in `shared/src/effects/shaders/` (missing `.glsl` type declarations) and `packages/design-canvas/src/ResizableSplit.tsx` (react-resizable-panels API). These are pre-existing and unrelated to this slice.

## 2026-03-09 Selection Hardening Slice

### Keyboard Navigation (Escape/Enter/Tab)
- Added `Escape` → go to parent path (or clear selection at root). Works in pointer mode only; does not conflict with pen-mode Escape (pen mode returns early before reaching the pointer block).
- Added `Enter` → select first child. Guard `!e.metaKey && !e.ctrlKey` avoids conflict with browser default enter behaviors.
- Added `Tab` / `Shift+Tab` → cycle next/prev sibling within the same parent. Uses modular wrap so Tab on last sibling jumps to first.
- All three handlers use `penDocumentRef.current.children` (a ref kept current via `penDocumentRef.current = penDocument` alongside the existing `cameraRef.current = camera` pattern) — no need to add `penDocument` to the `useEffect` deps.

### Delete/Backspace — Undo Safety
- The existing delete path (`applyDocumentUpdate → onDocumentChange → setDocument`) IS undo-safe. `onInteractionEnd` (called on mouse-up after drag) triggers `commitHistory()` in the parent, resetting the debounce flag. The next `setDocument` call (delete) always starts a fresh history entry.
- No changes needed to make delete undo-safe; the existing flow handles it.

### Visual States
- Node state predicates (`isNodeHidden`, `isNodeDisabled`, `isNodeReusable`) use `(node as {field?:type}).field` casts. This is safe because the base schema `PenEntityBaseShape` includes `visible`, `enabled`, and all container types include `reusable`.
- `FrameTitle.tsx` updated to show `◆ ` prefix + purple text (`#a78bfa`) for reusable frames/groups — uses the Skia `SkiaText` color prop directly.
- Layers panel badges use `Ionicons`: `eye-off-outline` (orange `#f97316`) for hidden, `lock-closed-outline` (slate `#94a3b8`) for disabled, `diamond-outline` (violet `#a78bfa`) for reusable.
- Inspector popover adds colored pill badges (background tinted, text + icon) for each active state.
- There is no `locked` field in `PenNode` — the task's "locked" visual state maps to `enabled === false`.

### Pre-existing Test Failures
- `layout.test.ts` has 3 floating-point failures in `estimateTextSize` and `layoutTree` — confirmed pre-existing by stashing changes and re-running. Unrelated to this slice.

## 2026-03-09 Marquee Drag-Select Hardening

### Root cause of the UX gap
`onMouseDown` on empty canvas immediately called `updateSelection(() => [])` AND `setMarqueeRect({ x, y, width: 0, height: 0 })`, destroying the current selection and showing a phantom 0-size rect before any drag intent was established. A user who accidentally grazed empty canvas lost their selection with no way to recover.

### Fix applied
- Added `hasExceededThreshold: boolean` field to `marqueeRef`.
- Added `MARQUEE_THRESHOLD = 4` (px) constant near `MIN_SCALE`/`MAX_SCALE`.
- **`onMouseDown` (empty canvas):** Only records start position and sets `hasExceededThreshold: false`. No selection clear. No marquee rect yet.
- **`onMouseMove` (marquee active):** On the first move that crosses the 4px threshold, sets `hasExceededThreshold = true`, calls `updateSelection(() => [])`, and then shows `marqueeRect`. Subsequent moves update the rect normally.
- **`onMouseUp` (marquee active):** If threshold was crossed → run intersection logic → `updateSelection(() => selected)`. If threshold was never crossed (plain empty-click) → `updateSelection(() => [])`. Either way, cleans up `marqueeRef` and `marqueeRect`.

### Interaction invariants preserved
- Drag-move on a selected node still works (drag state is handled before marquee state in all handlers).
- Hover tracking still works (marquee branch returns early, skipping `hitTestNodePath`).
- Multi-select (shift/cmd+click) is unaffected.
- Spacebar-pan and middle-mouse-pan are unaffected.
- `onMouseLeave` still correctly clears `marqueeRef.current` and `setMarqueeRect(null)`.

### Pre-existing test failures (unchanged)
- `layout.test.ts` has 3 floating-point failures in `estimateTextSize` and `layoutTree` — confirmed pre-existing, unrelated to this slice.

## 2026-03-09 Inspector Completeness Slice

### Re-export conflict pattern
- TypeScript does NOT allow both `import { X } from "./foo"` and `export { X } from "./foo"` in the same file when `X` is the same identifier. This causes "Cannot redeclare exported variable" errors.
- Fix: remove the `export { ... } from` re-export block from the component file. Tests should import directly from the helpers file (`inspectorHelpers.ts`), not from the component file.

### Test file isolation
- `packages/design-canvas` has no `vitest.config.ts` but tests run fine with `npx vitest run` from the package directory.
- Tests that import React Native components (like `Ionicons`) fail due to missing native module resolution. Pure helper functions must live in a separate `.ts` file with no React Native imports.
- The `inspectorHelpers.ts` / `NodeInspector.tsx` split satisfies this: helpers are pure TS (testable), component has React Native imports (not directly tested).

### Inspector field architecture
- `FieldValue<T>` discriminated union (`absent | single | mixed`) cleanly models three states: field not applicable, all nodes agree, nodes disagree.
- `computeSharedNumericField` accepts an optional `isApplicable` predicate — when all nodes fail the predicate, returns `absent` (not `mixed`). This prevents showing W/H fields for line/connection nodes.
- Fill is set as a plain string on the node (`fill: "#hex"`) — the `updateFillColor` callback writes `{ ...node, fill: color }` directly.
- Stroke color lives at `stroke.fill` (not `stroke.color`) — `updateStrokeColor` writes `{ ...existing, fill: color }`.

### null vs undefined in getter signatures
- `computeSharedNumericField` expects `getter: (node) => number | undefined`. Returning `number | null` (as `getPrimaryStrokeThickness` does) causes TS2322.
- Fix at the call site: `const t = getPrimaryStrokeThickness(...); return t ?? undefined;` — converts `null` to `undefined` without changing runtime behavior.
- Alternatively the getter signature could accept `null`, but `undefined` is the conventional "absent" sentinel in this codebase.

### Component/ref section
- `PenRef.descendants` is a `Record<string, Partial<PenNode>>` — `Object.keys(singleRefNode.descendants ?? {}).length` gives the override count.
- The referenced component is found by walking `penDocument.children` recursively looking for `node.id === singleRefNode.ref && isNodeReusable(node)`.
- Slot/placeholder metadata is read from the *component* node (not the ref instance): `(refComponent as { slot?: boolean }).slot`.

## 2026-03-09 Marquee Drag-Select Slice
- `PenCanvasPanelImpl.tsx` now uses `MARQUEE_THRESHOLD = 4` and a `hasExceededThreshold` flag on `marqueeRef` so empty-canvas click and drag are distinct interactions.
- Selection is no longer cleared on empty-canvas mouse-down; it clears only after drag intent is established, which preserves current selection during tiny accidental movements.
- On mouse-up, sub-threshold empty clicks clear selection, while true drags intersect `selectableLayoutNodes` against the marquee bounds and select the matching paths.

## 2026-03-09 Chat Validation + Recovery Slice
- `validateDesignChatOps(doc, ops)` runs before per-op application and emits deterministic `error` vs `warning` issues; schema-level errors skip the op, while ID-miss warnings still allow apply attempts for create-then-reference batches.
- `handleApplyChatOps` now prefixes validation issues in the returned `errors[]` (`[error]` / `[warning]`) and advances progress even for skipped ops so the UI remains consistent.
- Assistant chat messages now capture `docBeforeBatch` and `rolledBack` state, enabling in-message `Retry` and `Rollback` actions without introducing a second history system.
- Rollback restores the pre-batch document snapshot through the existing `setDocument` + `commitHistory` path; retry replays the same op batch against the current document.

## 2026-03-09 Op Validation + Failure Recovery Slice

### validateDesignChatOps architecture
- Added `validateDesignChatOps(doc, ops)` to `apps/pencil/lib/designChatOps.ts` — pure function, no mutations, returns `OpValidationIssue[]`.
- Two-tier severity: `"error"` (malformed schema — op is skipped by the apply loop) and `"warning"` (ID targeting miss — op is still attempted, apply handles real errors).
- Reason for "warning not error" on ID targeting: batches can add a node then reference it in the same batch. Blocking on targeting would break valid multi-op sequences.
- 21 tests added to `designChatOps.test.ts`, all 25 tests pass (4 pre-existing + 21 new).

### handleApplyChatOps validation integration
- Validation runs upfront against the initial `documentRef.current` snapshot (before any ops are applied).
- Ops that fail schema validation (`schemaErrorIndices`) are skipped with a 60ms wait tick (so progress tracking stays accurate); ops that only have warnings are still applied normally.
- All validation issues are prepended to the `errors` array with `[error]`/`[warning]` prefixes so callers and the chat UI can distinguish them from apply-time errors.

### Retry + Rollback recovery UI
- `ChatMessage` now carries `docBeforeBatch?: PenDocument` (captured at the start of `handleSend`, before `onApplyOps` is called) and `rolledBack?: boolean`.
- `ChatSidebarProps` gains `onRollback: (snapshot: PenDocument) => void`.
- Call site in `PencilScreen`: `onRollback` calls `setDocument(snapshot)` then `commitHistory()` — restores via the existing history model with a clean break point.
- Each assistant message bubble with `ops.length > 0` shows a `recoveryRow` beneath the op count:
  - **Retry** (`refresh-outline`): re-invokes `onApplyOps(message.ops, ...)` and updates the message in-place with new counts/errors.
  - **Rollback** (`arrow-undo-outline`): calls `onRollback(message.docBeforeBatch)` and marks the message `rolledBack: true` (buttons disappear, label changes to "↩ Rolled back").
  - Both buttons are disabled while `isApplying || isSending`.
- Recovery button styles added to `getChatSidebarStyles` (`recoveryRow`, `recoveryButton`, `recoveryButtonDisabled`, `recoveryButtonText`).
- LSP on both modified files is clean; `tsc --noEmit` produces no new errors in `app/index.tsx` or `lib/designChatOps.ts` (pre-existing errors are in `shared/src/effects/shaders/` and `design-canvas/ResizableSplit.tsx`, unrelated).

## 2026-03-09 Document Lifecycle Slice

### DocMeta pattern
- Added `DocMeta { name, savedAt, savedChecksum }` stored at `pencil:document-meta` in localStorage.
- `simpleHash(str)` uses djb2-style XOR hash (32-bit → base-36) for fast content fingerprinting without a crypto dep.
- `docChecksum(doc)` hashes `JSON.stringify(doc)` to track whether current doc matches last explicit save.
- `hasUnsavedAutoSave()` compares hash of raw localStorage string (auto-save) against `meta.savedChecksum` (last explicit save) — if they differ, there's unsaved work from a previous session.

### Dirty tracking via useDocumentHistory callback
- `useDocumentHistory` now accepts optional `onDirty?: () => void` second argument.
- Called inside `setState` whenever `prevDoc !== nextDoc` (uses a stable `onDirtyRef` to avoid stale closure issues).
- This avoids an effect-on-document antipattern; the callback fires synchronously within the state update.

### Recovery banner
- `RecoveryBanner` reads `meta.savedAt` from `loadDocMeta()` and shows human-friendly elapsed time ("X minutes ago", "X hours ago").
- **Continue** → dismisses banner, keeps auto-saved document already loaded.
- **Discard** → calls `handleNewDocument` which resets to empty doc + clears all state.
- Shown only when `hasUnsavedAutoSave()` is true at mount; hidden after any explicit action.

### Save As with predictable naming
- `exportDocumentToFile(doc, name)` extracted as a shared helper used by both `handleSaveDocument` and `handleSaveAs`.
- Filename sanitization: `name.replace(/[^a-zA-Z0-9-_ ]/g, "_").trim() || "Untitled"`, then `.pen.json` extension.
- After export: saves `DocMeta`, sets `isDirty = false`, clears recovery banner.
- `handleLoadDocument` parses the imported filename into a doc name (strips extension, sanitizes).

### Load Last Auto-Save
- `loadLastDocument()` explicitly reads `pencil:last-document` from localStorage (same key as auto-save).
- Exposed in the Load dropdown → "Load Last Auto-Save" for user-initiated recovery/reload.
- Resets `isDirty = false` and dismisses recovery banner on load.

### Load/Save dropdowns
- Both "Load" and "Save" buttons in TitleBar are now dropdowns (hover-dismiss via `onMouseLeave` on web).
- Load: "Load Last Auto-Save" + "Import JSON File…"
- Save: "Save (docname.pen.json)" + "Save As…" (prompts for new name via browser `prompt()`)
- Dirty dot (6px accent-colored circle) appears in title bar center before filename when `isDirty`.

### Workspace-backed persistence (usePencilDocumentSync)
- New `apps/pencil/lib/usePencilDocumentSync.ts` hook implements the `useDesignDocument` pattern from `packages/editor`.
- Reads `gameId` from URL param `?gameId=` or `pencil:workspace-game-id` localStorage key.
- If gameId is configured: uses `trpc.chatThreads.readWorkspaceFile/writeWorkspaceFile` with 1.5s debounce.
- Stale detection: remote `_syncedAt` timestamp vs local `loadedAtRef` — sets `syncStatus: "stale"` when remote is newer.
- Gracefully no-ops when no gameId is configured (pencil runs purely localStorage-backed by default).
- `SyncStatus` shown in title bar center rail: `workspace ↑` (syncing), `workspace ⚠` (stale), `workspace ✕` (error), `workspace` (idle), `local` (no gameId).

### Pre-existing errors unaffected
- `tsc --noEmit` grep for `apps/pencil` returns zero errors. Pre-existing errors remain in `shared/src/effects/shaders/` and `design-canvas/ResizableSplit.tsx`.
