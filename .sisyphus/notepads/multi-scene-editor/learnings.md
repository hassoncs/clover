## Learnings (Task 2: Author/Live Renaming)

- Renamed `EditorMode` from `"edit" | "playtest"` to `"author" | "live"`.
- This required updates across the editor UI (`EditorTopBar`, `StageContainer`, `InteractionLayer`) and the live preview engine (`LivePreviewController`, `HotReloadOrchestrator`).
- Also updated tests in `lib/game-engine/live/__tests__/` to reflect the new terminology.
- `PreviewControls` now includes an Author/Live toggle button, allowing mode switching directly from the preview area.
- "Live" mode implies `paused=false` in `StageContainer`, consistent with "Playtest".
- "Author" mode allows `timeMode` (Play/Pause) toggling, consistent with "Edit".
- Legacy `mode: "edit"` in `INITIAL_SNAPSHOT_STATE` updated to `"author"`.

## Context Switcher Implementation (Task 6)
- **EditorProvider**: Centralized context management (`previewContexts`, `activeContextId`) works well.
- **Mobile vs Web**: Handled platform differences elegantly:
  - Mobile: Tabs inside `StageArea`.
  - Web: Separate dockview panels for each context.
- **StageContainer**: Made context-aware via `contextId` prop, allowing it to determine `runtimeIntent` (Author vs Live) per instance.
- **Dockview**: Dynamically adding panels via `api.addPanel` works for split view. Using `contextId` in params allows reusing `StageArea` component.
