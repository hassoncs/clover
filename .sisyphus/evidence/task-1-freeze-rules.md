# Task T1 Freeze Contract — OpenPencil Migration Wave 1

This contract freezes the currently consumed surface area from:
- `shared/src/types/pen.ts`
- `shared/src/types/design.ts` (+ re-exported legacy symbols through `@slopcade/shared`)
- Bridge/tool compatibility points used by MCP and web bridge.

## Rule 1 — Legacy DesignDocument family is frozen

### Frozen Symbol: `DesignDocument` (`shared/src/types/design.ts`)
Frozen because: Legacy editor/canvas/chat flows still read/write this schema directly.
Frozen until: **T13** removes legacy DesignDocument pipeline and all downstream consumers.
Unfreeze condition: T13 lands with replacement points and passing migration tests.

### Frozen Symbol: `DesignFrame` (`shared/src/types/design.ts`)
Frozen because: Camera/interaction/render code depends on frame shape (`frames[]`, position, dimensions).
Frozen until: **T13**.
Unfreeze condition: Legacy frame consumers replaced by canonical SceneGraph adapters.

### Frozen Symbol: `DesignElement` (+ `DesignElementSchema`)
Frozen because: Hit-test, renderer, chat mutation tools, and image resolvers still branch on legacy element union.
Frozen until: **T13**.
Unfreeze condition: All element operations routed through replacement model, then fixtures updated.

### Frozen Symbol: `DesignDocumentSchema` / `parseDesignDocument` / `isDesignDocument`
Frozen because: Validation boundary for chat tools and AI stage tests still enforces this contract.
Frozen until: **T13**.
Unfreeze condition: New parser/validator introduced with migration harness and parity tests.

### Frozen Symbol: `createEmptyDesignDocument` / `migrateDesignDocument` / `DesignSchemaError`
Frozen because: Bootstrap, migration, and error handling paths still depend on exact behavior.
Frozen until: **T13**.
Unfreeze condition: Replacement bootstrap/migration implementation exists and old path is removed.

### Frozen Symbol: `applyCanvasOps` / `CanvasOp` (`packages/design-canvas/src/ops/canvasOps.ts`)
Frozen because: Legacy mutation API is referenced by package exports and MCP tool docs.
Frozen until: **T13**.
Unfreeze condition: Legacy canvas ops path removed/replaced with canonical operation executor.

## Rule 2 — Pen external format contract is frozen (adapter-first changes)

### Frozen Symbol: `PenDocument` (`shared/src/types/pen.ts`)
Frozen because: T2 SceneGraph adapter must read existing nested JSON and write compatible roundtrip output.
Frozen until: **T2** ships PenDocument⇄SceneGraph adapter + roundtrip fixtures.
Unfreeze condition: Any schema change must land with fixture + migration test updates in same change.

### Frozen Symbol: `parsePenDocument`
Frozen because: App bootstrap and bridge load path depend on parse behavior.
Frozen until: **T2**.
Unfreeze condition: Parser contract update paired with adapter+fixture update.

### Frozen Symbols: runtime Pen node/paint/layout types (`PenNode`, `PenFrame`, `PenGroup`, `PenRectangle`, `PenEllipse`, `PenLine`, `PenPolygon`, `PenPath`, `PenText`, `PenIconFont`, `PenRef`, `PenImage`, `PenFill`, `PenStroke`, `PenEffect`, `PenTheme`, `PenVariable`, `PenThemedValue`, `PenPadding`, `PenSizing`, `PenGradientStop`)
Frozen because: Current renderer/layout runtime consumes these shapes directly.
Frozen until: **T2 + T3** (SceneGraph/runtime adapter and Yoga adapter).
Unfreeze condition: Runtime replacement path exists with compatibility tests for renderer/layout.

## Rule 3 — Bridge and MCP facade surface is frozen

### Frozen Symbol: `window.__PENCIL_BRIDGE__`
Frozen because: game-inspector MCP currently reaches canvas through this global bridge.
Frozen until: **T11** (bridge topology migration).
Unfreeze condition: New bridge registration path lands and MCP consumers switch without regression.

### Frozen Symbol: MCP tools `pencil_apply_ops`, `pencil_get_document`
Frozen because: External tool callers depend on these names and argument contracts.
Frozen until: **T4 + T6** (tool execution facade + priority tools).
Unfreeze condition: New facade endpoints shipped with backward-compatible aliasing/migration plan.

## Rule 4 — Panel integration seam is frozen

### Frozen Surface: `PenCanvasPanel*` using `PenDocument`/`PenNode`
Frozen because: Panel parity track needs stable props/selection contract while runtime internals migrate.
Frozen until: **T7** (panel parity early track).
Unfreeze condition: T7 parity checklist complete and panel adapters switched.

## Enforcement Notes (Wave 1)

1. No symbol signature or structural changes to frozen entries without corresponding owner task prerequisites above.
2. If emergency fix is needed, it must preserve backward compatibility and update this contract in the same PR.
3. Any attempted schema change before owning task completion is a migration-blocking violation.
