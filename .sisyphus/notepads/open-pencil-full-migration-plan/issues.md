# Issues & Gotchas

## 2026-03-03 — Orchestrator Bootstrap

### I1: `DesignDocument` vs `PenDocument` — two systems, both active
`canvasOps.ts` imports `DesignDocument` from `@slopcade/shared` (legacy).
`pen.ts` is the NEW system. Both coexist. T1 must map ALL consumers before any deletion.

### I2: `window.__PENCIL_BRIDGE__` is browser-global
All current MCP tools in `pencil.ts` require a live browser page and the global.
Headless server-side execution is blocked until T11 (bridge topology migration).

### I3: PenDocument tree is nested, SceneGraph is flat
Converting between the two requires recursive traversal.
The roundtrip adapter (T2) must handle: orphan nodes, circular refs (should be impossible but validate), deeply nested trees.

### I4: SceneNode has ALL fields non-optional with defaults
OpenPencil's SceneNode has every field with a default. PenNode fields are optional.
The adapter must provide sensible defaults when converting PenNode → SceneNode.

### I5: Yoga WASM loading
Yoga WASM must be async-initialized before layout can run.
Must handle the "WASM not yet loaded" case gracefully.

### I6: PenFrame `fill_container` sizing
PenSizing = number | string. "fill_container" is a valid string value.
Yoga equivalent: FILL layoutSizing. Must map correctly.

### I7: `connection` node type
PenConnection has `fromId` / `toId` — this is a connector, not a visual layout node.
OpenPencil has CONNECTOR type. Map carefully.
