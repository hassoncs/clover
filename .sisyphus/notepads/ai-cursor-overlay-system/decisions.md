# AI Cursor Overlay System — Decisions

## 2026-03-03 Session: ses_34eea8f70ffeOGOON6CuFdLlEv

### Where to call useAICursorEventParser
The plan says to call it "alongside useEditorCommandHandler". Since `useEditorCommandHandler` is called in `EditorCommandListener` in `apps/slopcade/app/editor/[id].tsx`, we should:
1. Create a similar `AICursorEventListener` component in the app
2. OR add it to the existing `EditorCommandListener`

Decision: Create a separate `AICursorEventListener` component for clean separation.

### AICursorProvider placement
Wrap `EditorProvider`'s children with `<AICursorProvider>` so the cursor context is available to all editor components.

### Coordinate system for v1
For v1, focus on game-world coordinates (world-space). Design canvas coordinates are secondary.
The `StageContainer` already has `pixelsPerMeter` and `worldBounds` from the editor context.
