---
name: editor-system
description: Use when working with the in-app game editor UI, dockview layouts, panels, code editor, preview, AI chat, graph editor, inspector, or asset gallery
---

# Editor System

## File Map

| Path | Purpose |
|------|---------|
| `app/components/editor/EditorProvider.tsx` | Central state — `useEditor()` hook, `EditorContextValue` |
| `app/components/editor/DockviewLayout.web.tsx` | Web layout (dockview-core) |
| `app/components/editor/DockviewLayout.native.tsx` | Native layout (custom) |
| `app/components/editor/panels/` | HierarchyPanel, PropertiesPanel, ExplorerPanel, AssetsPanel, LayersPanel, LiveStatePanel, DebugPanel |
| `app/components/editor/code-editor/CodeEditor.web.tsx` | **CodeMirror** (`@uiw/react-codemirror`, NOT Monaco) |
| `app/components/editor/code-editor/CodeEditor.native.tsx` | Native code editor (WebView + codemirror bundle) |
| `app/components/editor/graph/` | GraphEditor, GraphCanvas, GraphNode, GraphEdge, NodePalette |
| `app/components/editor/AssetGallery/` | AssetGalleryPanel, PrefabGrid, PrefabAssetCard, VariantGroupEditor |
| `app/components/editor/AIEditor/` | ClarificationQA, UserQuestionBatch, UserQuestionCard |
| `app/components/editor/inspector/` | InspectOverlay, ContextMenu, InspectorProvider |
| `app/components/editor/ChatSidebar.tsx` | AI chat sidebar |
| `app/components/editor/FileTabBar.tsx` | Open file tabs |
| `app/components/editor/WorkspaceFilesProvider.tsx` | File tree state |
| `app/app/editor/[id].tsx` | Editor route (wraps in EditorProvider) |

## EditorProvider — Real API

```typescript
// app/components/editor/EditorProvider.tsx
interface EditorContextValue {
  gameId: string;
  document: GameDefinition;
  mode: EditorMode;
  timeMode: TimeMode;
  selectedEntityId: string | null;
  selectedEntity: GameEntity | null;
  activeTab: EditorTab;
  isDirty: boolean;
  previewContexts: PreviewContext[];
  readiness: { ready: boolean; errors: ValidationError[]; warnings: ValidationWarning[]; isChecking: boolean; isCompiling: boolean; checkNow: () => void; triggerCompile: () => void; };
  // Actions: selectEntity, moveEntity, deleteEntity, addEntity, undo, redo, setCamera, hotSwapShader...
}
export function useEditor(): EditorContextValue;
```

## Live Preview & Hot Reload

The editor uses a live preview system with incremental hot-reload:

- **`HotReloadOrchestrator`** stores previous payloads/hashes and determines hot-swap vs full reload per tag, in fixed order
- **`TagHotReloadHandler`** contract: each tag (world, prefabs, entities, rules, scripts, effects) has a handler with `canHotSwap` policy
- **Edit mode**: Incremental hot-swap via 7 generic tag handlers when `canHotSwap` returns true
- **Play mode**: Always full reload — bypasses `canHotSwap` entirely
- **Handler mapping**: world→`setupWorld`, prefabs→`registerPrefabs`+empty entity reset, entities→`clearEntities`+`loadEntities`, rules/scripts→runtime methods, effects→`hotSwapShader`
- **`LivePreviewController`** polls workspace for changes; tests should use `vi.hoisted(() => vi.fn())` for mocked queries
- **`reset()`** rebuilds the orchestrator instance — assert via bridge side-effects (`setupWorld` call count), not pre-reset spy refs
- **`TagPayloadResolver`** tolerates both wrapped (`{ rules: [...] }`) and raw array JSON payloads
- **Phase 5 (PrefabReconciler)**: Deferred until V1 latency measurements show need. `PrefabDiff` uses 3 categories: visual, physics, structural

## Gotchas

- Code editor is **CodeMirror** (`@codemirror/*`), NOT Monaco
- Dockview is web-only — native uses completely different layout
- No centralized event bus — panels communicate via `useEditor()` React Context
- Platform split: most editor components have `.web.tsx` / `.native.tsx` variants
