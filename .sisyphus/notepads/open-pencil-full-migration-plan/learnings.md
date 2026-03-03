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
