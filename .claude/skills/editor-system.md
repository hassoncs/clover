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

## Gotchas

- Code editor is **CodeMirror** (`@codemirror/*`), NOT Monaco
- Dockview is web-only — native uses completely different layout
- No centralized event bus — panels communicate via `useEditor()` React Context
- Platform split: most editor components have `.web.tsx` / `.native.tsx` variants
