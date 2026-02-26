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

## [2026-02-26] T17 - Watcher/Build/Package Pipeline Validation

### design.json Handling in Build Pipeline
- **PackageCompiler.ts**: Verified that `design.json` is NOT included in the compiled runtime package. The compiler uses `WORKSPACE_CONVENTIONS` to opt-in to specific files and directories. Since `design.json` is not in the conventions and doesn't match prefab/script/asset patterns, it is naturally excluded from `processedFiles` and tag payloads.
- **game-bundler**: Added `design.json` to `IGNORED_FILES` in `packages/game-bundler/src/compiler.ts` to explicitly prevent it from being processed by the local bundler.
- **sync-r2.ts**: 
  - Added `design.json` to `BUILD_OUTPUTS` to prevent the watcher from triggering rebuilds when design files change (since they don't affect the build output).
  - Updated `walkR2Files` to explicitly skip files in `BUILD_OUTPUTS`, ensuring `design.json` is not synced to the R2 asset bucket.
  - Added an explicit skip for `.DS_Store` in `walkR2Files` for cleaner syncs.

### Verification Evidence
- Created test fixture `r2/games/slopcade/test-design-file/design.json`.
- Verified `sync-r2.ts --build-only` generates `definition.json` without including design data.
- Verified `sync-r2.ts` sync manifest does not include `design.json`.
- Evidence saved to `.sisyphus/evidence/task-17-watcher.log` and `.sisyphus/evidence/task-17-bundle-check.txt`.

## [2026-02-26] T15 - Build Stage Consumes Design Context

### Build prompt design-reference pattern
- Build stage can safely read `previousArtifacts.design` as optional context and stay backward-compatible by soft-falling back when artifact is missing/unreadable/invalid.
- Design reference should be summarized per frame (title + total elements + per-type counts for `rect`/`text`/`image`) instead of embedding raw `design.json` in prompt.
- Keep design usage strictly prompt-only: persisted runtime artifact remains `GameDefinition` output from `GameDefinitionSchema` parse, with no design schema fields leaked.

### Test coverage pattern for optional upstream artifacts
- In stage unit tests, mock `ASSETS.get` with an object exposing `text()` and verify prompt content for the design-present path.
- Add a no-design test asserting prompt omits the design section and `ASSETS.get` is not called.

## [2026-02-26] T11 - Cross-Platform Design Canvas Parity

### Font Path Bug (Fixed)
- `useFont(require("../../../../assets/fonts/Fredoka-Regular.ttf"), 12)` was using 4 levels up from `panels/`, but the correct path is 3 levels (`../../../`).
- `apps/slopcade/components/editor/panels/` → `apps/slopcade/` = 3 levels up.
- Skia `useFont` returns `null` gracefully if the font fails to load, so this bug was silent — guarded with `{font && (...)}`.

### Platform Split: DesignCanvasPanel
- Created `DesignCanvasPanel.native.tsx` with `GestureHandlerRootView` + `GestureDetector` (Simultaneous Pan + Pinch) for native camera control.
- Metro resolver automatically picks `.native.tsx` on iOS/Android and `.tsx` on web.
- `GestureDetector` wraps only the canvas area (inside the content View), NOT the whole panel — this ensures tap-to-select via `TouchableWithoutFeedback` in `DesignCanvasRenderer` still works.
- `runOnJS(handlePanUpdate)(event.translationX, event.translationY)` correctly dispatches pan updates from the gesture worklet thread to the JS thread.

### Web-Only APIs in Platform-Split Files
- `DesignCanvasPanel.tsx` (web fallback) needs to pass `onWheel`, `onMouseDown`, etc. as props to `View`. TypeScript rejects these since they're not in `ViewProps`.
- Workaround: spread as `{ onWheel, ... } as object` — TypeScript accepts spreading `object` onto JSX props.
- Avoid `Platform.OS === "web"` conditionals in a file that already has a `.native.tsx` counterpart — the conditional is always true and adds noise.
- `window.addEventListener` is safe in `DesignCanvasPanel.tsx` without Platform guard once `.native.tsx` exists, since Metro never loads `.tsx` on native when a `.native.tsx` is present.

### useCallback for useEffect Dependencies
- Handlers (`handleZoomToFit`, `goPrevFrame`, `goNextFrame`) used in a `useEffect` dep array must be wrapped in `useCallback` to avoid stale deps warning.
- Without `useCallback`, these inline arrow functions are recreated on every render, causing `useEffect` to re-run on every render.

## [2026-02-26] T20 - Design-first flow integration coverage

- Added `api/src/ai/agent/__tests__/design-flow.integration.test.ts` to exercise cross-stage behavior from design artifact generation into build prompt consumption.
- Integration coverage now includes: happy path artifact persistence + design-informed build prompt, design validation failure retry path (`VALIDATION_FAILED` after 2 attempts), design-present build context, missing-design backward compatibility, and legacy planning-only build flow.
- In-memory R2 mock using `Map<string, string>` with `ASSETS.get`/`ASSETS.put` is sufficient for stage-level integration without worker pool dependencies.
- `createEmptyDesignDocument(gameId, title)` works well for fixtures by mutating frames into a valid minimal design payload.

## [2026-02-25] T14 - Design Iteration Chat Loop

### Selection Context Flow Architecture
- Design selection context travels from frontend → DB → system prompt via this path:
  1. `sendMessage` tRPC accepts `selectedDesignFrameId?` + `selectedDesignElementId?`
  2. Stored in user message's `metadata_json` via `insertUserMessage`
  3. Stream endpoint (`/api/chat/stream`) reads last user message's metadata → `designContext`
  4. `handleChatStream` uses `designContext` in `ChatHandlerContext`
  5. `buildDesignSelectionBlock()` generates a DESIGN CANVAS SELECTION CONTEXT system prompt section
  6. `createChatTools` receives `designContext` in `ChatToolContext`

### getDesignSelectionContext Tool: Dual-Path Pattern
- Pre-resolved path: reads from `ctx.designContext` when set (no SSE roundtrip needed)
- Fallback path: calls `onEditorCommand({ command: "getDesignSelection" })` for non-stream contexts
- SSE is one-directional (server→client), so `onEditorCommand` only dispatches, cannot return selection
- The pre-resolved path is the correct production path; fallback exists for legacy/test cases

### updateDesignElement Return Shape Changed
- Old: `{ ok: true, diff: { elementId, changes } }`
- New: `{ ok: true, elementId, frameId, changedFields: string[], changes }`
- `changedFields` is explicit array of updated field names for AI to summarize in response
- Old `diff` key is gone — update any tests expecting it

### Clarification Behavior Pattern
- Lives in 2 places: (1) tool description on `updateDesignElement`, (2) DESIGN CANVAS ITERATION WORKFLOW section in `CHAT_STAGE_PROMPT`
- No code logic enforces it — it's purely a prompt instruction; the AI decides based on context
- Works because both tool description and system prompt consistently say: "if target is ambiguous and no element selected, call askUser first"

### typecheck script
- `pnpm -C api typecheck` in AGENTS.md is wrong — correct command is `pnpm -C api type-check` (with hyphen)
- Or `pnpm type-check` from within `api/` directory
- Added `DesignPhase` state to `EditorProvider` to track the transition from design to implementation.
- Used `useSharedWorkspaceFiles` to detect when a design document is loaded and automatically transition from `idle` to `designing` phase.
- Added phase badge and action buttons to `DesignCanvasPanel` header to allow explicit user approval before implementation.
- Surfaced the current phase in `ChatSidebar` to keep the user informed of the current state.

## [2026-02-25] T19 - Design Stage Diagnostics and Telemetry

### Structured logging pattern in design.ts
- Used `console.log(JSON.stringify({...}))` for structured telemetry — JSON objects, not template strings.
- Log events: `design.attempt.start`, `design.validation.failed`, `design.model.error`, `design.succeeded`.
- Schema validation failures use `issue.path.join(".")` for field-name-only logging (avoids leaking raw model output).
- Success log includes both `frameCount` and `elementCount` (computed from `frames.reduce`).
- `failureReason` field added to all failure checkpoint objects so callers can classify without parsing `errorMessage`.

### DESIGN_STAGE_FAILED SSE event
- New `DESIGN_STAGE_FAILED` variant added to `AgUiEvent` union in `shared/src/chat/events.ts`.
- Three failure reasons: `VALIDATION_FAILED`, `MODEL_ERROR`, `MISSING_PREREQUISITE` with user-friendly messages.
- `buildDesignStageFailedEvent(failureReason)` exported from `stream-handler.ts` maps reason → message + event shape.
- `ChatHandlerContext.pendingDesignFailure` field added to `chat-handler.ts` — when set, stream-handler emits the event right after `RUN_STARTED`.
- The accumulator's `default: return state` case gracefully ignores the new event type (no accumulator changes needed).

### Testing pattern for failure checkpoints
- Existing checkpoint `toMatchObject` assertions updated to include `failureReason` field.
- Added `MODEL_ERROR` test: mock `generateObject` with `mockRejectedValue` — verifies single attempt + checkpoint shape.
- Added `VALIDATION_FAILED` quality-check test: empty elements array passes schema but fails quality gate — verifies `validationIssues` in checkpoint.

### typecheck command
- Correct command in api dir: `pnpm type-check` (with hyphen), not `pnpm typecheck`.
