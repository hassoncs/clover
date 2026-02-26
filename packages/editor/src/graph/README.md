# Graph Editor Components

This directory contains the generic web graph editor shell built with React Flow.

## Components

- `GraphEditor.web.tsx`: Main editor component that orchestrates the canvas, palette, and inspector.
- `GraphCanvas.tsx`: Wrapper around React Flow canvas.
- `GraphNode.tsx`: Custom node component.
- `GraphEdge.tsx`: Custom edge component.
- `NodePalette.tsx`: Sidebar for adding new nodes.
- `InspectorPanel.tsx`: Sidebar for editing node properties.

## Hooks

- `useGraphCommands.ts`: Manages graph state and history (undo/redo) using `graph-core`.

## Usage

```tsx
import { GraphEditor } from "@/components/editor/graph";
import { myAdapter } from "@/adapters/my-adapter";

export default function MyEditor() {
  return (
    <GraphEditor
      adapter={myAdapter}
      documentId="my-document-id"
    />
  );
}
```
