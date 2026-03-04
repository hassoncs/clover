# Learnings — open-pencil-parity-master

## [2026-03-04T08:23:28Z] Session Start: Inherited from open-pencil-full-migration-plan

### Architecture State (from previous plan)
- **SceneGraph** is the single source of truth — PenDocument is derived from it
- **PenToolFacade** is the mutation API — all writes go through it
- **PenRuntimeContext** provides `graph`, `facade`, `selectedId`, `activeTool`, `revision`, `commitMutation`
- **ServerBridge** pattern: module-level singleton in `packages/game-inspector-mcp/src/server-bridge.ts`
- Legacy `window.__PENCIL_BRIDGE__` was removed in T13 of previous plan
- Legacy `canvasOps.ts` and `usePencilBridge.ts` were deleted

### Key Files
- `apps/pencil/app/index.tsx` — main Pencil app entry
- `apps/pencil/lib/file-io.ts` — loadPenFile, savePenFile, loadFigFile, saveFigFile
- `packages/design-canvas/src/pen/runtime/` — SceneGraph, PenToolFacade, adapters
- `packages/design-canvas/src/panels/` — InspectorPanel, LayersPanel, ToolbarShell
- `packages/design-canvas/src/pen/runtime/context.tsx` — PenRuntimeContext
- `packages/game-inspector-mcp/src/tools/pencil.ts` — MCP tools (legacy)
- `packages/game-inspector-mcp/src/tools/pencil-v2.ts` — new MCP tools
- `packages/game-inspector-mcp/src/server-bridge.ts` — ServerBridge singleton

### TypeScript Errors (as of session start)
- `design-canvas`: `DesignFrame` missing from shared, fig-codec type issues, `wrap` layout not in PenFrame type, padding tuple type issues, vitest `beforeEach`/`afterEach` not exported
- `pencil-app`: trpc client collision (useContext), inherits design-canvas errors
- `game-inspector-mcp`: `error` variable not found in pencil-v2-components.ts

### MCP Tools Implemented (30 total)
- T6: pencil_get_node, pencil_get_children, pencil_find_nodes, pencil_create_node, pencil_update_node, pencil_delete_node, pencil_reparent_node, pencil_set_fill, pencil_set_stroke, pencil_set_layout
- T10: components (5), variables (5), effects/styling (5), query/export (5)

### Commit Convention
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Worktree: `/private/tmp/slopcade-open-pencil-migration`
- Branch: `open-pencil-migration`

## [2026-03-04T08:38:43Z] Task 2: TypeScript Error Fixes
- Switched Design type imports in design-canvas camera/image resolver hooks to `@slopcade/shared/types/design` to bypass local shared shim collisions with missing `DesignFrame`/`DesignElement` exports.
- Fixed fig codec/export typing issues: unsafe schema casts now go through `unknown`, zip buffer return is explicitly `ArrayBuffer`, and padding normalization now safely handles widened tuple shapes.
- Updated Pen type system for runtime parity: added `"wrap"` to `PenFrame`/`PenGroup` layout unions and zod schemas, and tightened `PenPadding`/`PenCornerRadius` aliases for cleaner adapter assignments.
- Fixed runtime adapter and MCP issues: narrowed cornerRadius assignment when rebuilding polygons/frames and removed stray out-of-scope `error` return in `pencil-v2-components.ts`.
- Resolved design-canvas test typing by extending local vitest shim with `beforeEach`/`afterEach` declarations.
- Unblocked `apps/pencil` tRPC client compile by casting `createTRPCReact<AppRouter>()` to a minimal local client/provider interface (works around backend router key collision without modifying API router).
