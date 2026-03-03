# AI Cursor Overlay System — Learnings

## 2026-03-03 Session: ses_34eea8f70ffeOGOON6CuFdLlEv

### Codebase Architecture

**Worktree:** `/private/tmp/slopcade-ai-cursor-overlay-system`
**Branch:** `ai-cursor-overlay-system`

### Key File Locations
- `packages/editor/src/EditorProvider.tsx` — main editor context provider (does NOT call useEditorCommandHandler)
- `packages/editor/src/useEditorCommandHandler.ts` — subscribes to AgUiEvent stream for EDITOR_COMMAND events
- `packages/editor/src/editor-context.tsx` — defines `useEditorChat()` which provides `useChatEventSubscription`
- `packages/editor/src/StageContainer.tsx` — renders game canvas + InteractionLayer
- `packages/editor/src/index.ts` — package exports
- `apps/slopcade/app/editor/[id].tsx` — app-level editor screen
- `shared/src/chat/events.ts` — AgUiEvent type definition

### Where useEditorCommandHandler is Called
`useEditorCommandHandler()` is called inside `EditorCommandListener` component in `apps/slopcade/app/editor/[id].tsx`:
```tsx
function EditorCommandListener() {
  useEditorCommandHandler();
  return null;
}
```
This component is rendered inside `EditorProvider`. The plan says to add `useAICursorEventParser()` alongside it.

### AgUiEvent Types (from shared/src/chat/events.ts)
- `TOOL_CALL_START` — `{ toolCallId, toolName, parentMessageId }`
- `TOOL_CALL_ARGS` — `{ toolCallId, delta }`
- `TOOL_CALL_END` — `{ toolCallId }`
- `TOOL_CALL_RESULT` — `{ toolCallId, result, isError? }`
- `EDITOR_COMMAND` — `{ command, payload }`
- `FILE_CHANGED` — `{ gameId, filename }`

### useChatEventSubscription Pattern
```ts
const { useChatEventSubscription } = useEditorChat();
useChatEventSubscription(useCallback((event: AgUiEvent) => {
  // handle event
}, [deps]));
```

### New Package Location
All new files go in: `packages/editor/src/ai-cursor/`

### StageContainer Structure
- Renders `<WithGodot>` for game runtime
- In author mode, renders `<InteractionLayer>` in an absolute-fill View with `pointerEvents="box-none"`
- We add `<AICursorLayer>` ABOVE InteractionLayer in the same absolute-fill pattern

### EditorProvider Structure
- Pure state management provider, no hooks called inside
- We wrap its children with `<AICursorProvider>`

### Integration Points
1. `packages/editor/src/ai-cursor/` — new package with all AI cursor files
2. `packages/editor/src/EditorProvider.tsx` — wrap children with `<AICursorProvider>`
3. `packages/editor/src/StageContainer.tsx` — add `<AICursorLayer>` above InteractionLayer
4. `apps/slopcade/app/editor/[id].tsx` — add `AICursorEventListener` component alongside `EditorCommandListener`
5. `packages/editor/src/index.ts` — export new components

### Animation Library
Use `react-native-reanimated` — NEVER CSS animations. Already used in the codebase.
