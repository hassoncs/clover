# Task T1 Consumer Inventory — `pen.ts` and legacy `design.ts`

Scope: full monorepo audit from `/private/tmp/slopcade-open-pencil-migration` using required grep passes plus import parsing to avoid missing multiline imports.

- Total consumer rows: **137**
- Unique importer files: **65**

## Package concentration
- `packages/design-canvas`: 73
- `api`: 24
- `packages/editor`: 21
- `shared`: 9
- `apps/pencil`: 5
- `packages/game-inspector-mcp`: 4
- `apps/slopcade`: 1

## Migration owner distribution
- `T13`: 80
- `T2 + T3`: 34
- `T2`: 7
- `T3`: 7
- `T4 + T6`: 3
- `T11`: 2
- `T7 (panel parity) + T2`: 2
- `T7 (panel parity) + T2 + T3`: 2

## Detailed inventory

| Symbol | Importer file path | Package | Migration owner | Migration status | Source path/tool |
|---|---|---|---|---|---|
| `DesignDocument` | `api/src/ai/agent/__tests__/design-flow.integration.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignDocumentSchema` | `api/src/ai/agent/__tests__/design-flow.integration.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `createEmptyDesignDocument` | `api/src/ai/agent/__tests__/design-flow.integration.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `parseDesignDocument` | `api/src/ai/agent/__tests__/design-flow.integration.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignDocument` | `api/src/ai/agent/__tests__/design-runtime-boundary.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignElement` | `api/src/ai/agent/__tests__/design-runtime-boundary.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignDocument` | `api/src/ai/agent/stages/build.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignDocument` | `api/src/ai/agent/stages/build.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignDocumentSchema` | `api/src/ai/agent/stages/build.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignElement` | `api/src/ai/agent/stages/build.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignDocument` | `api/src/ai/agent/stages/design.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignDocument` | `api/src/ai/agent/stages/design.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `DesignDocumentSchema` | `api/src/ai/agent/stages/design.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared/types/design` |
| `createEmptyDesignDocument` | `api/src/chat/__tests__/chat-tools.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `api/src/chat/__tests__/design-iteration.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `api/src/chat/__tests__/design-tools.test.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `api/src/chat/chat-tools.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocumentSchema` | `api/src/chat/chat-tools.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `api/src/chat/chat-tools.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElementSchema` | `api/src/chat/chat-tools.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignGradientSchema` | `api/src/chat/chat-tools.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignSchemaError` | `api/src/chat/chat-tools.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignShadowSchema` | `api/src/chat/chat-tools.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `parseDesignDocument` | `api/src/chat/chat-tools.ts` | `api` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `PenDocument` | `apps/pencil/app/index.tsx` | `apps/pencil` | `T2` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenNode` | `apps/pencil/app/index.tsx` | `apps/pencil` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `parsePenDocument` | `apps/pencil/app/index.tsx` | `apps/pencil` | `T2` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenDocument` | `apps/pencil/lib/usePencilBridge.ts` | `apps/pencil` | `T2` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `__PENCIL_BRIDGE__` | `apps/pencil/lib/usePencilBridge.ts` | `apps/pencil` | `T11` | Frozen (bridge/tool surface; no changes in T1) | `global bridge registration` |
| `DesignDocument` | `apps/slopcade/components/editor/__tests__/DesignCanvasHitTest.test.ts` | `apps/slopcade` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/design-canvas/src/assets/useDesignImageResolver.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/design-canvas/src/camera/useDesignCamera.shared.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/design-canvas/src/camera/useDesignCamera.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/design-canvas/src/core/DesignCanvasRenderer.tsx` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/design-canvas/src/core/DesignCanvasRenderer.tsx` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/design-canvas/src/core/DesignCanvasRenderer.tsx` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/design-canvas/src/core/designCanvasHitTest.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/design-canvas/src/core/designCanvasHitTest.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/design-canvas/src/document/useDesignDocument.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignSchemaError` | `packages/design-canvas/src/document/useDesignDocument.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `createEmptyDesignDocument` | `packages/design-canvas/src/document/useDesignDocument.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `migrateDesignDocument` | `packages/design-canvas/src/document/useDesignDocument.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/design-canvas/src/host/types.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `PenDocument` | `packages/design-canvas/src/host/types.ts` | `packages/design-canvas` | `T2` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `CanvasOp` | `packages/design-canvas/src/index.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `re-export` |
| `applyCanvasOps` | `packages/design-canvas/src/index.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `re-export` |
| `DesignDocument` | `packages/design-canvas/src/interactions/useDesignInteractions.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/design-canvas/src/interactions/useDesignInteractions.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/design-canvas/src/interactions/useDesignInteractions.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/design-canvas/src/interactions/useDesignInteractionsNative.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/design-canvas/src/interactions/useDesignInteractionsNative.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/design-canvas/src/interactions/useDesignInteractionsNative.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `CanvasOp` | `packages/design-canvas/src/ops/canvasOps.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `definition` |
| `DesignDocument` | `packages/design-canvas/src/ops/canvasOps.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/design-canvas/src/ops/canvasOps.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `applyCanvasOps` | `packages/design-canvas/src/ops/canvasOps.ts` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `definition` |
| `DesignDocument` | `packages/design-canvas/src/panels/DesignCanvasPanelImpl.tsx` | `packages/design-canvas` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `PenDocument` | `packages/design-canvas/src/panels/PenCanvasPanel.native.tsx` | `packages/design-canvas` | `T7 (panel parity) + T2` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenNode` | `packages/design-canvas/src/panels/PenCanvasPanel.native.tsx` | `packages/design-canvas` | `T7 (panel parity) + T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenDocument` | `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` | `packages/design-canvas` | `T7 (panel parity) + T2` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenNode` | `packages/design-canvas/src/panels/PenCanvasPanelImpl.tsx` | `packages/design-canvas` | `T7 (panel parity) + T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenFrame` | `packages/design-canvas/src/pen/__tests__/components.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenNode` | `packages/design-canvas/src/pen/__tests__/components.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenRef` | `packages/design-canvas/src/pen/__tests__/components.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenText` | `packages/design-canvas/src/pen/__tests__/components.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenFrame` | `packages/design-canvas/src/pen/__tests__/layout.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenNode` | `packages/design-canvas/src/pen/__tests__/layout.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenText` | `packages/design-canvas/src/pen/__tests__/layout.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenTheme` | `packages/design-canvas/src/pen/__tests__/variables.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenVariable` | `packages/design-canvas/src/pen/__tests__/variables.test.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenFrame` | `packages/design-canvas/src/pen/components.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenGroup` | `packages/design-canvas/src/pen/components.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenNode` | `packages/design-canvas/src/pen/components.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenRef` | `packages/design-canvas/src/pen/components.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenPadding` | `packages/design-canvas/src/pen/layout-core.ts` | `packages/design-canvas` | `T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenSizing` | `packages/design-canvas/src/pen/layout-core.ts` | `packages/design-canvas` | `T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenFrame` | `packages/design-canvas/src/pen/layout.ts` | `packages/design-canvas` | `T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenGroup` | `packages/design-canvas/src/pen/layout.ts` | `packages/design-canvas` | `T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenNode` | `packages/design-canvas/src/pen/layout.ts` | `packages/design-canvas` | `T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenSizing` | `packages/design-canvas/src/pen/layout.ts` | `packages/design-canvas` | `T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenText` | `packages/design-canvas/src/pen/layout.ts` | `packages/design-canvas` | `T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenDocument` | `packages/design-canvas/src/pen/render/PenRenderer.tsx` | `packages/design-canvas` | `T2` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenEffect` | `packages/design-canvas/src/pen/render/effects.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenFill` | `packages/design-canvas/src/pen/render/fills.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenGradientStop` | `packages/design-canvas/src/pen/render/fills.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenEllipse` | `packages/design-canvas/src/pen/render/nodes/EllipseNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenFrame` | `packages/design-canvas/src/pen/render/nodes/FrameNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenGroup` | `packages/design-canvas/src/pen/render/nodes/GroupNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenIconFont` | `packages/design-canvas/src/pen/render/nodes/IconFontNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenImage` | `packages/design-canvas/src/pen/render/nodes/ImageNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenLine` | `packages/design-canvas/src/pen/render/nodes/LineNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenPath` | `packages/design-canvas/src/pen/render/nodes/PathNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenPolygon` | `packages/design-canvas/src/pen/render/nodes/PolygonNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenRectangle` | `packages/design-canvas/src/pen/render/nodes/RectangleNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenFill` | `packages/design-canvas/src/pen/render/nodes/TextNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenText` | `packages/design-canvas/src/pen/render/nodes/TextNode.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenStroke` | `packages/design-canvas/src/pen/render/strokes.tsx` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenTheme` | `packages/design-canvas/src/pen/themes.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenDocument` | `packages/design-canvas/src/pen/variables.ts` | `packages/design-canvas` | `T2` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenNode` | `packages/design-canvas/src/pen/variables.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenThemedValue` | `packages/design-canvas/src/pen/variables.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenVariable` | `packages/design-canvas/src/pen/variables.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `PenPath` | `packages/design-canvas/src/tools/penToolState.ts` | `packages/design-canvas` | `T2 + T3` | Frozen (runtime+schema compatibility) | `@slopcade/shared/types/pen` |
| `DesignDocument` | `packages/editor/src/__tests__/DesignCanvasHitTest.test.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/editor/src/__tests__/useDesignDocument.test.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `createEmptyDesignDocument` | `packages/editor/src/__tests__/useDesignDocument.test.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/editor/src/panels/DesignCanvasRenderer.tsx` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/editor/src/panels/DesignCanvasRenderer.tsx` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/editor/src/panels/DesignCanvasRenderer.tsx` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/editor/src/panels/designCanvasHitTest.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/editor/src/panels/designCanvasHitTest.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/editor/src/panels/useDesignCamera.shared.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/editor/src/panels/useDesignCamera.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/editor/src/panels/useDesignImageResolver.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/editor/src/panels/useDesignInteractions.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/editor/src/panels/useDesignInteractions.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/editor/src/panels/useDesignInteractions.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/editor/src/panels/useDesignInteractionsNative.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignElement` | `packages/editor/src/panels/useDesignInteractionsNative.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignFrame` | `packages/editor/src/panels/useDesignInteractionsNative.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignDocument` | `packages/editor/src/useDesignDocument.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `DesignSchemaError` | `packages/editor/src/useDesignDocument.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `createEmptyDesignDocument` | `packages/editor/src/useDesignDocument.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `migrateDesignDocument` | `packages/editor/src/useDesignDocument.ts` | `packages/editor` | `T13` | Frozen (legacy compatibility) | `@slopcade/shared` |
| `CanvasOp` | `packages/game-inspector-mcp/src/tools/pencil.ts` | `packages/game-inspector-mcp` | `T4 + T6` | Frozen (bridge/tool surface; no changes in T1) | `schema mention` |
| `__PENCIL_BRIDGE__` | `packages/game-inspector-mcp/src/tools/pencil.ts` | `packages/game-inspector-mcp` | `T11` | Frozen (bridge/tool surface; no changes in T1) | `global bridge access` |
| `pencil_apply_ops` | `packages/game-inspector-mcp/src/tools/pencil.ts` | `packages/game-inspector-mcp` | `T4 + T6` | Frozen (bridge/tool surface; no changes in T1) | `MCP tool name` |
| `pencil_get_document` | `packages/game-inspector-mcp/src/tools/pencil.ts` | `packages/game-inspector-mcp` | `T4 + T6` | Frozen (bridge/tool surface; no changes in T1) | `MCP tool name` |
| `DesignSchemaError` | `shared/src/types/__tests__/design-migrations.test.ts` | `shared` | `T13` | Frozen (legacy compatibility) | `../design` |
| `DesignSchemaError` | `shared/src/types/__tests__/design.test.ts` | `shared` | `T13` | Frozen (legacy compatibility) | `../design` |
| `createEmptyDesignDocument` | `shared/src/types/__tests__/design.test.ts` | `shared` | `T13` | Frozen (legacy compatibility) | `../design` |
| `isDesignDocument` | `shared/src/types/__tests__/design.test.ts` | `shared` | `T13` | Frozen (legacy compatibility) | `../design` |
| `parseDesignDocument` | `shared/src/types/__tests__/design.test.ts` | `shared` | `T13` | Frozen (legacy compatibility) | `../design` |
| `parsePenDocument` | `shared/src/types/__tests__/pen.test.ts` | `shared` | `T2` | Frozen (runtime+schema compatibility) | `../pen` |
| `DesignDocument` | `shared/src/types/design-migrations.ts` | `shared` | `T13` | Frozen (legacy compatibility) | `./design` |
| `DesignDocumentSchema` | `shared/src/types/design-migrations.ts` | `shared` | `T13` | Frozen (legacy compatibility) | `./design` |
| `DesignSchemaError` | `shared/src/types/design-migrations.ts` | `shared` | `T13` | Frozen (legacy compatibility) | `./design` |
