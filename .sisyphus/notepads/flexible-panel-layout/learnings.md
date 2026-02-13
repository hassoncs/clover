# Learnings

## 2026-02-13 Session Start
- Project uses `.web.tsx` / `.native.tsx` platform extension convention (established by CodeEditor, GraphEditor, GodotBridge)
- Device detection: `useDeviceType()` in `app/lib/hooks/useDeviceType.ts` — purely width-based (mobile < 768, tablet 768-1024, desktop >= 1024)
- `useShouldShowSidebar()` returns `useIsDesktop()` — sidebar only shows at >= 1024px
- Current layout: ResponsiveEditorLayout branches desktop (3-column) vs mobile (bottom sheets)
- Breakpoints defined in `packages/theme/src/tokens.ts` and `useDeviceType.ts` — keep in sync
- `expo-device` is installed but only used in notifications, not for device type detection

## 2026-02-13 Research Findings

### Panel Duplicates
- `sidebar/DebugPanel.tsx` uses `InspectorProvider`, focuses on visualization toggles + inspector mode
- `panels/DebugPanel.tsx` uses internal state only, includes visualization toggles + INFO section (Active Bodies, FPS)
- `sidebar/PropertiesPanel.tsx` uses `InspectorProvider`, basic read-only Transform/Physics/Render display
- `panels/PropertiesPanel.tsx` uses `EditorProvider`, advanced editable panel with Position, Scale, Rotation, Color, Physics

### Context Split
- `InspectorProvider` and `EditorProvider` both track `selectedEntityId` — potential state sync issues
- Sidebar components use `InspectorProvider`, bottom panels use `EditorProvider`

### onLivePreviewChange Flow
- Can and should be moved to EditorProvider context
- Current flow: useWorkspaceSnapshot reads from storage → StageContainer reports up → EditorScreen drills back down
- Moving to context eliminates all this prop drilling

### Dockview API (for web)
- Install: `npm install dockview`
- Import: `import { DockviewReact, DockviewReadyEvent, IDockviewPanelProps } from 'dockview'`
- CSS: `import 'dockview/dist/styles/dockview.css'`
- Theme: wrap in `<div className="dockview-theme-abyss">`
- Uses component map: `components={{ explorer: ExplorerPanel, ... }}`
- Programmatic layout: `api.addPanel({ id, component, title, position: { direction: 'left' } })`
- Serialization: `api.toJSON()` / `api.fromJSON()`

### react-native-resizable-panels API (for native tablet)
- NPM: `react-native-resizable-panels`
- Peer deps: react >= 19.0.0 ✓, reanimated >= 3.17.5 ✓, gesture-handler >= 2.24.0 ✓
- Components: PanelGroup, Panel, PanelResizeHandle
- Handle must be styled (no default size/color)
- Imperative API via ref: collapse(), expand(), resize(size)

## Panel Consolidation (Phase 1 Prerequisite)

**Date**: 2026-02-12

### What Was Done
- Moved `sidebar/ExplorerPanel.tsx` → `panels/ExplorerPanel.tsx` (git mv)
- Moved `sidebar/HierarchyPanel.tsx` → `panels/HierarchyPanel.tsx` (git mv)
- Replaced `panels/DebugPanel.tsx` with `sidebar/DebugPanel.tsx` content (InspectorProvider version)
- Deleted `sidebar/PropertiesPanel.tsx` (kept panels/ version with EditorProvider)
- Updated `sidebar/Sidebar.tsx` imports to use `../panels/` instead of `./`
- All 4 panel files now in `panels/` directory

### Key Decisions
1. **DebugPanel**: Kept sidebar version because it uses `useInspector()` for inspect mode toggling and visualization controls. The panels/ version only had internal useState.
2. **PropertiesPanel**: Kept panels/ version because it has full editable property controls (position, scale, rotation, color, physics body type) via `useEditor()`. The sidebar version was basic read-only via `useInspector()`.

### Verification
- `tsc --noEmit` passes clean
- Both desktop (Sidebar) and mobile (ToolSheet) import from `panels/` now
- InspectorProvider is wrapped at ResponsiveEditorLayout level, so both desktop and mobile have access to inspect mode

### Next Steps
- Phase 1 tasks can now import from consolidated `panels/` directory
- Create `registry.ts` for panel metadata
- Create `defaultLayout.ts` for layout configuration

## defaultLayout.ts Creation (Phase 1)

**Date**: 2026-02-13

### What Was Done
- Created `app/components/editor/panels/defaultLayout.ts`
- Defined `LayoutConfig` interface with left/center/right/bottom regions
- Defined `DEFAULT_LAYOUT` constant matching current 3-column layout:
  - Left: explorer, hierarchy, properties, debug (320px)
  - Center: stage (special identifier for StageArea)
  - Right: chat (360px)
  - Bottom: omitted (diagnostics rendered inline by StageArea)

### Key Decisions
1. **Panel IDs**: String-based, matches registry.ts (created in parallel)
2. **No imports**: Pure config file, no dependencies on registry
3. **Stage special case**: `center.panels: ['stage']` references StageArea (not in registry)
4. **No bottom panel**: Diagnostics not yet extracted to separate panel

### Verification
- `tsc --noEmit` passes clean
- File-level docstring explains web vs native persistence behavior

## Panel Registry Created (2026-02-13)

**File**: `app/components/editor/panels/registry.ts`

### Structure
- `PanelDefinition` interface: id, title, icon (optional), component, defaultPlacement, minWidth (optional)
- `PANEL_REGISTRY` array: 9 panels registered
- Helper functions: `getPanelById(id)`, `getPanelsByPlacement(placement)`

### Registered Panels
| ID | Title | Component | Placement |
|----|-------|-----------|-----------|
| explorer | Explorer | ExplorerPanel | left |
| hierarchy | Hierarchy | HierarchyPanel | left |
| properties | Properties | PropertiesPanel | left |
| debug | Debug | DebugPanel | left |
| assets | Assets | AssetsPanel | left |
| layers | Layers | LayersPanel | left |
| images | Images | AssetGalleryPanel | left |
| diagnostics | Diagnostics | DiagnosticsPanel | bottom |
| chat | Chat | ChatSidebar | right |

### Key Decisions
- Used `React.ComponentType<any>` for component field to handle varying prop signatures (AssetGalleryPanel has `onPrefabPress`, ChatSidebar has `style`)
- Left `icon` field undefined for all entries (can add Ionicons names later)
- StageArea (preview/code) NOT registered — handled specially by layout components
- All imports verified against actual file exports

### Verification
- `pnpm typecheck` passes clean — no errors in registry.ts

## Native Tablet Layout Created (2026-02-12)

### Files Created
- `app/components/editor/PanelTabBar.tsx` — reusable horizontal tab bar with ScrollView for overflow
- `app/components/editor/ResizablePanelLayout.native.tsx` — two-panel horizontal split using `react-native-resizable-panels`

### Type Declaration Update
- Added `children?: ReactNode` to `PanelResizeHandleProps` in `sidebar/react-native-resizable-panels.d.ts`
- The library renders children inside the handle (needed for grabber indicator)

### Architecture Decisions
1. **PanelTabBar is generic** — accepts `tabs: Array<{id, title}>`, not coupled to registry
2. **Filters out diagnostics** from tab options (rendered inline in StageArea)
3. **Chat included** as a tab option in the right panel
4. **InspectOverlay** rendered inside the left panel alongside StageArea (same pattern as desktop layout)
5. **No InspectorProvider wrapper** — that's handled at the ResponsiveEditorLayout level above this component
6. **ActivePanel rendered with no props** — all panels are self-contained (read from context)

### Key Dimensions
- Left panel: `defaultSize={65}`, `minSize={40}` (StageArea)
- Right panel: `defaultSize={35}`, `minSize={20}`, `maxSize={50}` (switchable panel)
- Resize handle: 6px wide, `#374151` background, 2×32px grabber in `#6B7280`

### Verification
- `tsc --noEmit` passes clean from `app/` directory
- LSP diagnostics clean on both new files

## DockviewLayout.web.tsx Created (2026-02-12)

### Key Implementation Details
- Package `dockview` (v4.13.1) exports `DockviewReact`, `themeAbyss`, and all types from `dockview-core`
- `themeAbyss` is a `DockviewTheme` object (not a CSS class) — pass via `theme` prop, it applies `dockview-theme-abyss` class automatically
- CSS variables for abyss theme use `--dv-color-abyss-*` prefix pattern
- Theme overrides injected via `useEffect` + `document.createElement('style')` to avoid `dangerouslySetInnerHTML` lint error
- `dockview/dist/styles/dockview.css` must be imported for base styles
- `api.addPanel()` accepts `position: { referencePanel, direction }` for relative positioning
- `direction: "within"` places panel as a tab in the same group as the reference panel
- `api.toJSON()` / `api.fromJSON()` for serialization — no custom deserializer needed when using `components` prop
- `api.onDidLayoutChange` fires on any layout mutation — must debounce saves
- `disableFloatingGroups` prop prevents floating panel behavior
- Components map values must be `React.FunctionComponent<IDockviewPanelProps>` — wrap registry components to ignore dockview props

## Three-Way Platform Branching (2026-02-12)

### Files Created
- `DockviewLayout.tsx` — bare re-export from `.web` for TypeScript resolution
- `DockviewLayout.native.tsx` — stub (returns empty `<View />`)
- `ResizablePanelLayout.tsx` — bare re-export from `.native` for TypeScript resolution
- `ResizablePanelLayout.web.tsx` — stub (returns `null`)

### Platform Resolution Pattern
- Metro resolves `.web.tsx` / `.native.tsx` at bundle time, but TypeScript needs a bare `.tsx` for import resolution
- Pattern from `CodeEditor.tsx`: bare file re-exports from one platform variant (e.g., `export { X } from './X.web'`)
- Metro overrides the bare file with the platform-specific one at bundle time — the bare file is never used at runtime
- Stubs exist so Metro can resolve the import on the "wrong" platform (e.g., `DockviewLayout.native.tsx` is a no-op stub)

### Branching Logic
```
mobile (any platform) → StageArea + BottomSheetHost
web + non-mobile → DockviewLayout
native + non-mobile → ResizablePanelLayout
```
- Uses `useDeviceType()` for mobile detection and `Platform.OS` for web vs native
- `InspectorProvider` wraps all three branches at the `ResponsiveEditorLayout` level
