# Migration Learnings

## 2026-03-03 — Orchestrator Bootstrap

### Codebase Reality

**WORKTREE**: `/private/tmp/slopcade-open-pencil-migration` (branch: `open-pencil-migration`)
**OPENPENCIL REFERENCE**: `/Users/hassoncs/Workspaces/open-pencil`

### Two Separate Systems Coexist (This is the core tech debt)

**System A — Legacy DesignDocument (target for deletion)**:
- `shared/src/types/design.ts` — `DesignDocument`, `DesignFrame`, `DesignElement` (flat frames with element arrays)
- `packages/design-canvas/src/ops/canvasOps.ts` — `applyCanvasOps(doc, ops)` — the legacy batch-op function
- `packages/game-inspector-mcp/src/tools/pencil.ts` — uses `window.__PENCIL_BRIDGE__` global + `pencil_apply_ops` MCP tool

**System B — Pen system (basis for migration)**:
- `shared/src/types/pen.ts` — `PenDocument { version, themes?, variables?, children: PenNode[] }` — NESTED TREE (not flat)
- Node types: frame, group, rectangle, ellipse, line, polygon, path, text, icon_font, ref, note, image, connection
- `PenFrame` has `children?: PenNode[]` — deep nesting
- `packages/design-canvas/src/pen/` — layout.ts, layout-core.ts, components.ts, hitTest.ts, render/

### OpenPencil Target Architecture

**Scene Graph** (`/Users/hassoncs/Workspaces/open-pencil/packages/core/src/scene-graph.ts`):
- `SceneGraph` class with `nodes = new Map<string, SceneNode>()`
- `SceneNode` is a FLAT struct with `parentId: string | null` and `childIds: string[]`
- O(1) lookup: `getNode(id)`, `getChildren(id)`, `isDescendant()`
- Full variable support: `variables`, `variableCollections`, `activeMode`
- Component/instance system: `createInstance()`, `syncInstances()`, `detachInstance()`
- NodeTypes: CANVAS, FRAME, RECTANGLE, ROUNDED_RECTANGLE, ELLIPSE, TEXT, LINE, STAR, POLYGON, VECTOR, GROUP, SECTION, COMPONENT, COMPONENT_SET, INSTANCE, CONNECTOR

**OpenPencil Tools** (`/Users/hassoncs/Workspaces/open-pencil/packages/core/src/tools/`):
- `schema.ts`, `ai-adapter.ts`, `index.ts`

**Kiwi Codec** (`/Users/hassoncs/Workspaces/open-pencil/packages/core/src/kiwi/`):
- `codec.ts`, `fig-file.ts`, `fig-import.ts`, `protocol.ts`, `schema.ts`

**MCP Server** (`/Users/hassoncs/Workspaces/open-pencil/packages/mcp/src/`):
- `server.ts`, `http.ts`, `index.ts`

**Layout** (`/Users/hassoncs/Workspaces/open-pencil/packages/core/src/layout.ts`):
- Yoga WASM adapter

### Key Package Consumers (Known)
- `packages/design-canvas` — main pen canvas package
- `packages/game-inspector-mcp` — MCP bridge tool server  
- `packages/editor` — editor package (also has DesignDocument imports)
- `apps/pencil` — the pencil app entry (apps/pencil/app/index.tsx)
- `shared/src/types/design.ts` — the legacy type source

### Architecture Migration Path
`PenDocument (nested JSON)` → `SceneGraph (flat Map)` → `PenDocument (roundtrip)`

The `.pen` file format (PenDocument JSON) remains the external serialization boundary.
The SceneGraph is the RUNTIME model (in memory only, not persisted directly).
