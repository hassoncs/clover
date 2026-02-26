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

## [2026-02-25] T12 - Design Stage Engine Wiring

### Agent execution ordering and prerequisites
- `AgentStage` now includes `design`, and `STAGE_ORDER` is `planning -> design -> build -> shader -> refine -> theme -> asset`.
- `design` stage should not short-circuit prerequisites; it requires `previousArtifacts.planning` like other non-planning stages.
- `build` remains backward-compatible without a `design` artifact (only planning is required).

### Stage export pattern
- Runtime stage wiring is sourced from `api/src/ai/agent/stages.ts` (barrel), not `api/src/ai/agent/stages/index.ts`.
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

## [2026-02-26] T13 - Design Stage Generator

### Design stage generation pattern
- Implemented `designStage` with `generateObject` + `DesignDocumentSchema`, using planning artifact text (`context.planningDoc` fallback to `planningDocJson`) as primary prompt context.
- Added post-schema quality gates: reject outputs with zero frames or with no elements across frames.
- Validation failures retry up to 2 attempts; if all attempts fail, stage returns `VALIDATION_FAILED` with explicit `validationIssues` in checkpoint and persists no design artifact.
- Success path persists `agent-runs/{runId}/steps/{stepIndex}/design/output.json` and checkpoint includes `designVersion` + `designFrameCount` plus token metrics/provider/model.

### Testing approach
- Added `api/src/ai/agent/stages/design.test.ts` with direct `designStage` tests.
- Happy path verifies artifact persistence and checkpoint metadata when model output is valid.
- Malformed/invalid output path verifies validation failure and ensures `ASSETS.put` is never called for `output.json`.

## Design Document Versioning & Migration (2026-02-25)
- Implemented a migration pipeline for design documents to handle schema evolution.
- Current version is "1.0".
- Legacy documents (v0.x) are identified by the absence of a `version` field and are automatically upgraded to v1.0 with default metadata and empty frames if missing.
- Migration logic is centralized in `shared/src/types/design-migrations.ts` and integrated into the `useDesignDocument` hook.
- Migration emits a `console.warn` when upgrading legacy documents for auditability.
- Unsupported future versions throw a `DesignSchemaError`.

### Design Canvas Navigation Controls
- **Camera Hook**: `useDesignCamera` provides `zoomToFit` which takes an array of frames and the viewport dimensions. It also provides web-specific event handlers (`onWheel`, `onMouseDown`, `onMouseMove`, `onMouseUp`) that can be spread onto a `View` wrapper for the canvas.
- **Keyboard Shortcuts**: When adding global keyboard shortcuts (like `[` / `]` for frame navigation), ensure to check `document.activeElement?.tagName` to avoid triggering shortcuts while the user is typing in an input or textarea.
- **Frame Selection**: The `useEditor` hook provides `selectDesignFrame` and `selectDesignElement` to manage selection state. The selected frame index can be derived from the `designDocument.frames` array.
- **Dropdown Menus**: A simple absolute-positioned `View` with a high `zIndex` works well for custom dropdown menus (like the frame list selector) in the editor panel header.

## [2026-02-26] T8 - Tap-to-Select and Design Overlay

### Architecture: Pure Hit-Test Function Extraction
- Extracted `hitTestDesignCanvas()` and `screenToWorld()` into `panels/designCanvasHitTest.ts` for testability
- `HitTestResult` discriminated type: `{ frameId: string; elementId: string }` | `{ frameId: string; elementId: null }` | `{ frameId: null; elementId: null }`
- Frames hit-tested in reverse array order (last = topmost); elements sorted by descending zIndex within frame
- `DesignCanvasRenderer.tsx` now uses the extracted pure functions — `handlePress` is 4 lines instead of 40

### Panel-Side Selection Dispatch Pattern
- `DesignCanvasPanel.tsx` `handleElementTap` now:
  - element tap → `selectDesignElement(elementId, frameId)` + `setDesignMode("select")`
  - frame tap → `selectDesignFrame(frameId)` + `setDesignMode("select")`
  - empty canvas tap → `clearDesignSelection()` (sets designMode back to "idle" in reducer)
- Previously `selectDesignFrame(null)` was used for empty tap — this was wrong because it dispatches `SELECT_DESIGN_FRAME` which doesn't reset `designMode` to "idle"

### Testing Pattern for Pure Canvas Logic
- Pure hit-test functions are easy to test with Vitest (no React/Skia mocking needed)
- Test matrix: empty canvas, outside all frames, inside frame (no element), element hit, zIndex overlap, frame overlap, position offsets, boundary conditions
- 13 tests added in `__tests__/DesignCanvasHitTest.test.ts`

### DesignCanvasPanel.tsx State: T7 Already Implemented Camera
- T7 was already implemented — `useDesignCamera()` is in use, breadcrumbs, zoom controls, and keyboard shortcuts (`[`, `]`, `f`) are present
- The "Default camera for now" comment had already been replaced — the file was updated since the plan was written
