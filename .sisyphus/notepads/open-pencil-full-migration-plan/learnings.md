## [2026-03-03T00:00:00Z] Task T1: Consumer Audit Complete
- Captured **137** total consumer rows across **65** unique importer files touching pen/design legacy and bridge surfaces.
- Most coupled package is `packages/design-canvas` (73 rows), followed by `api` (24) and `packages/editor` (21).
- Legacy `DesignDocument` ecosystem remains broadly referenced through both `@slopcade/shared/types/design` and `@slopcade/shared` re-exports.
- Pen runtime types are concentrated in `packages/design-canvas/src/pen/*`, with schema entry points in `apps/pencil` and panel seams requiring T7 coordination.
- Bridge/API coupling is narrow but critical: `__PENCIL_BRIDGE__` + MCP tools (`pencil_get_document`, `pencil_apply_ops`) remain hard compatibility gates.

## [2026-03-03T09:35:00Z] T2: Scene Graph Runtime Complete
- **RuntimeNode type design**: Single flat interface with required `id`, `type`, `parentId`, `childIds` plus all PenNode variant fields as optional. Used explicit field listing per variant (not Partial union) for clarity and IDE support.
- **PenDocument to SceneGraph adapter**: Recursive DFS flattening. Each PenNode becomes a RuntimeNode; children extracted from frame/group types and linked via childIds. Uses `insertNode()` (preserves original ids) rather than `createNode()` (generates new ids).
- **SceneGraph to PenDocument adapter**: Recursive tree reconstruction from root childIds. Per-type builder functions emit only defined fields (no undefined pollution) to ensure structural equality with input.
- **Virtual root**: SceneGraph uses `__root__` as a synthetic root node (type frame). Document-level children become root childIds. Matches OpenPencil pattern of having a Document root.
- **Variables/themes**: Stored directly on SceneGraph (Map and PenTheme[]), not as nodes. Matches PenDocument top-level structure.
- **Fixture count**: 3 roundtrip fixtures (simple frame, ref+descendants, connections), 24 roundtrip tests, 12 orphan/error tests = 36 total.
- **Edge cases discovered**: (1) PenPolygon cornerRadius is number not number|tuple unlike PenFrame/PenRectangle. (2) content field shared by PenText (string|PenTextSpan[]) and PenNote (string). (3) Pre-existing facade.test.ts from parallel work has a failing test unrelated to T2.

## [2026-03-03T09:35:30Z] T4: Tool Facade Complete
- **PenToolFacade API surface**: `createNode`, `updateNode`, `deleteNode`, `reparentNode`, `getNode`, `getChildren`, `findNodes`, `getDescendants`, `getAncestors`.
- **UndoEntry shape chosen**: `{ type, nodeId, inverse }` with serializable inverse variants (`delete`, `update`, `restore_subtree`, `reparent`) so tool layers can store/replay undo data without capturing runtime closures.
- **Design decisions made**: (1) facade returns structured clones for reads to avoid leaking mutable SceneGraph internals, (2) create/reparent enforce container parent types, (3) `reparentNode` throws `CycleError` when target parent is a descendant, (4) delete undo captures full subtree snapshots for precise restore metadata.

## [2026-03-03T17:51:48Z] T6: Priority MCP Tools Complete
- Tools implemented: `pencil_get_node`, `pencil_get_children`, `pencil_find_nodes`, `pencil_create_node`, `pencil_update_node`, `pencil_delete_node`, `pencil_reparent_node`, `pencil_set_fill`, `pencil_set_stroke`, `pencil_set_layout`.
- Validation library used: `zod`.
- pencil_apply_ops status: deprecated with notice (`// DEPRECATED: use pencil_create_node, pencil_update_node, etc. instead`).
- Any design decisions: (1) tools are pure facade-backed functions returning `{ success, data|error }`, (2) MCP registration wraps the same functions into JSON text responses, (3) introduced `@slopcade/design-canvas/pen/runtime` export via a runtime-focused `mcp.ts` shim to avoid browser bridge dependencies, (4) layout padding object input is normalized to Pen tuple padding before facade patch application.

## [2026-03-03T09:49:00Z] T3: Yoga Layout Adapter Complete
- Yoga package used: `yoga-layout@^3.2.1`
- PenSizing mapping: fixed numbers map to Yoga width/height; `fill_container` maps to `flexGrow=1` (or `flexGrow=N` for `fill_container(N)`) on the parent flex axis; cross-axis `fill_container` maps to `alignSelf: stretch`; no-flex fallback uses numeric fallback (`N` or default `200`)
- Layout modes supported: `none`, `horizontal`, `vertical`, `wrap` (runtime extension)
- Memory management: Yoga nodes are always freed with recursive `node.free()` traversal after `calculateLayout`
- Any edge cases: absolute positioning is applied only when parent layout is `none` and node has explicit `x`/`y`; fit-content sizing is pre-resolved before Yoga (`text` nodes measured, non-text fallback `100`); WASM/runtime init errors throw `LayoutInitError` with explicit message

## [2026-03-03] T7: Panel Parity Early Track Complete
- Components created: `InspectorPanel.tsx`, `LayersPanel.tsx`, `ToolbarShell.tsx`, `PenRuntimeContext.tsx`
- PenRuntimeContext shape: Provides `graph` (SceneGraph), `facade` (PenToolFacade), `selectedId`, `activeTool`, `revision` (for re-renders), and `commitMutation`
- Inspector fields: Position (X, Y), Size (W, H), Fill, Stroke
- Layer tree features: Recursive rendering, click-to-select, visibility toggle, basic up/down reordering via `graph.reorderChild`
- Toolbar tools: pointer, frame, rectangle, ellipse, text, line, pen
- Any design decisions: Replaced the built-in layers and tool palette in `PenCanvasPanelImpl` with the new context-driven panels. `PenCanvasPanelInner` now acts as the layout shell and context provider.

## [2026-03-03T09:54:00Z] T9: Yjs Collaboration Foundation Complete
- Yjs version: `13.6.29`
- Transport used for tests: `InMemoryP2PTransport` (room-scoped in-memory bus with full-state sync on connect)
- Convergence test approach: two peers sync a shared parent, disconnect, each applies a concurrent create under the same parent, reconnect, and assert `sceneGraphToPenDocument()` output is identical across peers
- Awareness fields tracked: `userId`, `selectedNodeId`, `cursorPosition`
- Single version invariant: PASS (`pnpm why yjs --recursive` resolves only `yjs@13.6.29`)
- Any design decisions: Y.Doc is authoritative; PenToolFacade mutations are bridged into Yjs transactions and SceneGraph is reconciled from Yjs after each transaction; awareness sync is protocol-based (`y-protocols/awareness`) and transport-agnostic


## [2026-03-03T09:55:00Z] T5: .fig Codec Integration Complete
- **Kiwi codec vendored**: Copied 7 files from OpenPencil's `kiwi-schema/` (bb.ts, binary.ts, js.ts, parser.ts, schema.ts, util.ts, index.ts) plus `kiwi/schema.ts` (Figma schema text) and `kiwi/protocol.ts`.
- **`as any` elimination**: All `as any` casts in vendored code replaced with `as unknown as T` or proper interface extensions.
- **FontName is a struct**: Kiwi schema defines `FontName` as a struct (not message), so `postscript` field is required. Export generates it as `{family}-{style}` with spaces removed.
- **EffectType enum**: Kiwi schema uses `FOREGROUND_BLUR` (not `LAYER_BLUR`). Import handles both for compatibility with older files.
- **Float precision**: Kiwi uses float32 encoding, so values like `0.8` become `0.800000011920929` after roundtrip. Tests use `toBeCloseTo` for float comparisons.
- **clipsContent not in Kiwi schema**: The `clipsContent` field exists in Figma's REST API but not in the Kiwi wire format. Cannot roundtrip through .fig codec.
- **fflate dependency**: Added `fflate@^0.8.0` to `packages/design-canvas/package.json` for ZIP/deflate operations.
- **Test count**: 22 tests covering codec roundtrip, import (8 tests), unsupported features (3 tests), export→import roundtrip (7 tests), fill edge cases (2 tests).

## [2026-03-03T10:07:00Z] T10: Full MCP Tool Parity Complete
- Tool categories added: components (5), variables (5), effects/styling (5), query/export (5)
- Total tools implemented: 30 (10 from T6 + 20 from T10)
- Parity matrix: 62 total entries — 30 implemented, 31 planned, 1 not-applicable (eval escape hatch)
- Design decisions: (1) `sceneGraphToPenDocument` needed to be added to `mcp.ts` barrel export for vitest resolution, (2) blendMode stored in theme map since RuntimeNode lacks dedicated field, (3) variable binding uses theme map as the property→variable indirection layer, (4) pencil_get_selection accepts selectedIds from context rather than maintaining internal selection state, (5) instance overrides stored in descendants Record<string, unknown> matching PenRef schema

## [2026-03-03T10:08:00Z] T11: Bridge Topology Migration Complete
- **ServerBridge pattern**: Module-level singleton in `packages/game-inspector-mcp/src/server-bridge.ts`. API: `register(facade)`, `getInstance(): PenToolFacade | null`, `isAvailable(): boolean`, `clear()` (for tests). Uses `import type` for PenToolFacade so no runtime dependency on design-canvas in the bridge module itself.
- **Tools updated to server-first**: `pencil_get_document`, `pencil_get_selection`, `pencil_apply_ops`. Each checks `ServerBridge.isAvailable()` first; on true uses facade path; on false emits deprecation warning then takes the existing browser path.
- **Deprecation warning (exact message)**: `DEPRECATED: __PENCIL_BRIDGE__ bridge in use. Register a ServerBridge facade for headless operation.`
- **Server-path pure functions exported from pencil.ts**: `getDocumentViaFacade(facade)` returns `{ success: true, data: { nodes: RuntimeNode[] } }`; `applyOpsViaFacade(facade, opsJson)` translates CanvasOp JSON array to facade calls, returns `{ success: true, data: { opCount } }`.
- **Handler functions exported for testability**: `executeGetDocument`, `executeGetSelection`, `executeApplyOps`. Each encapsulates the server-first/browser-fallback dispatch. MCP `server.tool()` registrations delegate to these, keeping them independently testable.
- **CanvasOp translation in applyOpsViaFacade**: `addFrame` maps to `createNode("frame", rootId, props)`; `updateFrame/deleteFrame` map to `updateNode/deleteNode`; `addElement` maps to `createNode(elementType, frameId, propsWithoutTypeAndId)`; `updateElement/deleteElement` likewise.
- **pencil_get_selection server path**: Returns `{ success: false, error: "Selection state is not available in headless mode" }` since selection is a browser UI concept with no facade equivalent.
- **window.__PENCIL_BRIDGE__ preserved**: Not removed. Removal deferred to T13.
- **Test count**: 29 tests in `server-bridge.test.ts`, 118 total in `tools/__tests__/` (no regressions in pencil-v2 or pencil-v2-full tests).

## [2026-03-03T10:11:00Z] T8: Runtime Renderer + File I/O Cutover Complete
- Files updated: `apps/pencil/app/index.tsx`, `apps/pencil/lib/usePencilBridge.ts`
- New file: `apps/pencil/lib/file-io.ts` (loadPenFile, savePenFile, loadFigFile, saveFigFile, loadCorruptFile)
- New file: `apps/pencil/lib/__tests__/file-io.test.ts` (8 tests)
- New file: `apps/pencil/vitest.config.ts`
- Design-canvas changes: added `./pen/fig` export to package.json; exported `PenRuntimeProvider` + `usePenRuntime` from `src/index.ts`; updated `PenRuntimeProvider` to accept pre-built `SceneGraph` via discriminated union prop
- Legacy paths removed from: `apps/pencil/app/index.tsx` (no more `useState<PenDocument>`, no more `handleAddNode`, no direct `PenDocument` state); `apps/pencil/lib/usePencilBridge.ts` (no more `PenDocument` parameter)
- File I/O functions: `loadPenFile(json: string): SceneGraph` → parses + validates via `parsePenDocument` + `penDocumentToSceneGraph`; `savePenFile(graph: SceneGraph): string` → `sceneGraphToPenDocument` + JSON.stringify; `loadFigFile(buffer: ArrayBuffer): SceneGraph` → `importFig(buffer).graph`; `saveFigFile(graph: SceneGraph): ArrayBuffer` → `exportFig(graph).buffer`; `loadCorruptFile(data: unknown): never` → always throws FileIOError
- Architecture: `PenCanvasPanelConnector` inner component subscribes to `usePenRuntime().revision` and re-derives PenDocument on each mutation — clean data flow with SceneGraph as single source of truth
- Edge cases: `PenRuntimeProviderProps` is now a discriminated union — either `{ document }` (legacy, auto-converts) or `{ graph, facade? }` (new path, no conversion needed)
- Test command: `npx vitest run apps/pencil/` from repo root (vitest.config.ts in apps/pencil/)