# Learnings - Design-First Skia Canvas Editor

## [2026-02-26] Session ses_3682ff736ffeXsqVDzvJsE6Tj5 - Initial Exploration

### Codebase Structure

**Editor components** at `apps/slopcade/components/editor/`:
- `EditorProvider.tsx` — Main reducer/state management (mode, selection, etc.)
- `DockviewLayout.web.tsx` — Panel registration and wiring for web
- `panels/registry.ts` — Panel registration contract
- `panels/WireframePanel.tsx` — Current replacement target (and `WireframePanel.test.tsx`)
- `wireframe/` — WireframeModeProvider, WireframeRenderer, WireframeViewer (web/native splits), LayoutAdapter, index.ts

**Shared types** at `shared/src/types/`:
- `GameDefinition.ts` — Main runtime schema (DO NOT add design fields here)
- `visual.ts` — Visual primitive naming to align with
- Has versioning pattern to follow for design schema

**AI Pipeline** at `api/src/ai/agent/stages/`:
- `planning.ts`, `build.ts`, `refine.ts`, `asset.ts`, `theme.ts`, `shader.ts`
- Need to add `design.ts` stage

**Chat/Tools** at `api/src/chat/`:
- `chat-tools.ts` — Tool registration
- `stream-handler.ts` — Tool execution lifecycle
- `agui-mapper.ts` — Event mapping
- `chat-handler.ts` — Main handler

**Workspace files**: `apps/slopcade/components/editor/useWorkspaceFiles.ts`
**Workspace provider**: `apps/slopcade/components/editor/WorkspaceFilesProvider.tsx`

### Key Patterns
- Platform splits: `.web.tsx` / `.native.tsx` — metro resolver handles it
- Panel registration via `panels/registry.ts`
- Reducer pattern in `EditorProvider.tsx`
- Stage pattern: colocated test files at `stages/*.test.ts`

### Must NOT Do (from plan)
- Do not add design schema fields to runtime `GameDefinition`
- No design data in runtime blobs
- No duplicate wireframe + design canvas entries
- No full Figma clone scope in v1
- No web-only MVP (native cannot be deferred)
- No partial stage wiring (must be atomic)

## Design Document Schema
- Implemented `DesignDocument`, `DesignFrame`, and `DesignElement` in `shared/src/types/design.ts`.
- Used `zod` for validation, following the pattern in `shared/src/types/schemas.ts`.
- Versioning is strictly enforced (currently only "1.0" supported).
- Discriminated union for `DesignElement` handles `rect`, `text`, and `image` types.
- Implemented `useDesignDocument` hook for `design.json` persistence.
- Integrated `useDesignDocument` into `useWorkspaceFiles` to expose design document state to the editor.
- Used `ReturnType<typeof setTimeout>` for debounce timer refs, matching existing patterns in the codebase.

## [2026-02-25] T4 — Design Selection Context Wiring

### Pattern: View state vs. document state in EditorProvider
- `HistoryEntry` only captures `document` + `selectedEntityId` — design selection fields are intentionally excluded since they're ephemeral view state, not document mutations.
- Mode transitions (`SET_MODE`) do not touch design selection fields — preserving them on `live → author` transitions works by design (reducer returns `{ ...state, mode: action.mode }` which carries existing design fields through).

### Testing EditorProvider hooks
- Use `renderHook(() => useEditor(), { wrapper: makeWrapper() })` with a minimal `GameDefinition` cast via `as unknown as GameDefinition`.
- Must mock `usePackageReadiness` (imports tRPC + chat providers) and `getStorageItem` (async localStorage).
- The `act(...)` warnings from async `getStorageItem` resolution are cosmetic — tests still pass.
- `MicButton.test.tsx` was already failing before T4 (TurboModuleRegistry mock issue — pre-existing).

### `EditorProvider.tsx` exports for consumers
- New exported type: `DesignMode = "idle" | "select" | "pan"`
- New context values: `selectedDesignFrameId`, `selectedDesignElementId`, `designMode`
- New action dispatchers: `selectDesignFrame`, `selectDesignElement`, `clearDesignSelection`, `setDesignMode`

## [2026-02-26] Session T5 - AI Tool Contracts

### Chat Tool Implementation Pattern
- `tool()` from `ai` SDK with `inputSchema` (not `parameters`) is the project pattern
- `ChatToolContext` provides: `gameId`, `gitService`, `onFileChanged?`, `onEditorCommand?`, `env?`
- Read: `ctx.gitService.readFile(gameId, filename)` → `Uint8Array | null`
- Write: `ctx.gitService.commitFiles(gameId, [{path, content}], message, author)`
- Always call `ctx.onFileChanged?.()` after writes
- Return `{ ok: true/false, ... }` discriminated union for consistent error handling
- Never leak raw stack traces; always `err instanceof Error ? err.message : String(err)`
- Schema validation: `DesignDocumentSchema.safeParse(updatedDoc)` before EVERY write

### API Test Runner Infrastructure Warning
- `pnpm -C api test` uses `@cloudflare/vitest-pool-workers` which is BROKEN in this repo (version mismatch with @vitest/runner@4.0.18)
- The pool-workers error is pre-existing and does NOT affect test logic
- To run chat tests against simple Node.js vitest: create temp `vitest.simple.ts` with `defineConfig` (no workers pool)
- The design tool tests all pass in this environment

### Design Tool Contracts Implemented
- `readDesignDocument` — reads design.json, returns parsed doc or error
- `updateDesignElement` — finds element by frameId+elementId, shallow-merges updates, validates, writes
- `addDesignFrame` — appends frame with nanoid(), writes back
- `getDesignSelectionContext` — calls `onEditorCommand?.({ command: "getDesignSelection" })` or returns nulls

### Git Stash Hazard
- Running `git stash && ... && git stash pop` in a bash command during work WILL stash in-progress edits
- If you need to test pre-change state, use `git diff HEAD` to see what's modified first
- After a stash pop, always verify your edits are still present via grep
Removed legacy WireframeModeProvider and hardcoded totalScreens logic. Cleaned up WireframePanel and WireframeViewer to use static defaults as they are now legacy components replaced by DesignCanvasPanel.

## Camera Implementation (T7)
- Implemented a shared camera hook with platform-specific handlers for web and native.
- Used `.web.ts` and `.native.ts` extensions to handle platform-specific event types (React events vs. Gesture Handler).
- Shared logic (state, zoomToFit, reset) is extracted into `useDesignCamera.shared.ts`.
- Zoom-toward-cursor logic implemented for both web (mouse wheel) and native (pinch focal point).
- Camera state is a simple `{ translateX, translateY, scale }` object, suitable for Skia's `Group` transform.

## T6: Skia Design Canvas Renderer
- Used `@shopify/react-native-skia` to render the design document.
- Used `useFont` with a bundled font (`Fredoka-Regular.ttf`) to render text elements and frame titles.
- Implemented hit testing by converting screen coordinates to world coordinates using the camera transform, then checking frame and element bounds in reverse z-index order.
- Used `TouchableWithoutFeedback` to capture tap events and calculate the tapped element.
