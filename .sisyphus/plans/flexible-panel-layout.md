# Flexible Panel Layout System

## Goal

Replace the current fixed 3-column editor layout with a flexible panel system:
- **Web desktop**: Dockview — full VS Code-style drag/dock/resize/tab panels
- **Native tablet (iPad)**: Two-panel resizable split using `react-native-resizable-panels`
- **Native phone**: Current bottom-sheet approach (unchanged)

All three should share a **unified panel interface** so panel components are written once and rendered in whatever container the platform provides.

---

## Current State

```
ResponsiveEditorLayout.tsx
├── Desktop (width >= 1024): Row of [Sidebar(320px) | Viewport(flex) | ChatSidebar(360px)]
└── Mobile (width < 1024):   Stack of [StageArea | BottomSheetHost]
```

- `Sidebar` contains: ExplorerPanel, HierarchyPanel, PropertiesPanel, DebugPanel (stacked vertically, fixed ratios)
- `ChatSidebar` contains: ChatConversation
- `StageArea` contains: file tabs, code editor, preview (Godot), diagnostics
- `BottomSheetHost` contains: EditorToolbar (FAB), ChatSheet, ToolSheet
- `ToolSheet` renders: AssetGalleryPanel, AssetsPanel, PropertiesPanel, LayersPanel, DebugPanel

Device detection: `useDeviceType()` in `app/lib/hooks/useDeviceType.ts` — purely width-based breakpoints (768, 1024).

Platform files: `.web.tsx` / `.native.tsx` convention already established (CodeEditor, GraphEditor, GodotBridge).

---

## Architecture

### Core Abstraction: Panel Registry

Every panel component registers itself with a shared registry. The registry knows nothing about how panels are rendered — it just maps IDs to components and metadata.

```typescript
// app/components/editor/panels/registry.ts

interface PanelDefinition {
  id: string;                    // e.g. "explorer", "chat", "preview"
  title: string;                 // Display name
  icon?: string;                 // Ionicons name
  component: React.ComponentType; // The actual panel content
  defaultPlacement: 'left' | 'center' | 'right' | 'bottom'; // Hint for default layout
  minWidth?: number;             // Minimum panel width (pixels)
}

const PANEL_REGISTRY: PanelDefinition[] = [
  { id: 'explorer',   title: 'Explorer',   component: ExplorerPanel,   defaultPlacement: 'left' },
  { id: 'hierarchy',  title: 'Hierarchy',  component: HierarchyPanel,  defaultPlacement: 'left' },
  { id: 'properties', title: 'Properties', component: PropertiesPanel, defaultPlacement: 'left' },
  { id: 'debug',      title: 'Debug',      component: DebugPanel,      defaultPlacement: 'left' },
  { id: 'preview',    title: 'Preview',    component: PreviewPanel,    defaultPlacement: 'center' },
  { id: 'code',       title: 'Code',       component: CodePanel,       defaultPlacement: 'center' },
  { id: 'chat',       title: 'Chat',       component: ChatPanel,       defaultPlacement: 'right' },
  { id: 'assets',     title: 'Assets',     component: AssetsPanel,     defaultPlacement: 'left' },
  { id: 'layers',     title: 'Layers',     component: LayersPanel,     defaultPlacement: 'left' },
  { id: 'gallery',    title: 'Images',     component: AssetGalleryPanel, defaultPlacement: 'left' },
  { id: 'diagnostics',title: 'Diagnostics',component: DiagnosticsPanel, defaultPlacement: 'bottom' },
];
```

### Layout Strategies (Platform-Specific)

```
ResponsiveEditorLayout.tsx          — shared: picks strategy based on device/platform
├── DockviewLayout.web.tsx          — web: Dockview integration
├── ResizablePanelLayout.native.tsx — native tablet: two-panel resizable split
└── (inline in ResponsiveEditorLayout) — native phone: bottom sheets (existing)
```

The key insight: **ResponsiveEditorLayout stays as the orchestrator.** It doesn't become platform-specific itself. Instead, it delegates to a layout strategy component based on device type.

---

## Detailed Design

### 1. Panel Registry (`panels/registry.ts`)

- Define `PanelDefinition` type and `PANEL_REGISTRY` array
- Each panel component stays in its current file, keeps its current props
- Panels that currently receive props from parent (like `StageArea`'s `onLivePreviewChange`) will get them from context instead — the `EditorProvider` already has most of what's needed
- Export `getPanelById(id: string)` and `getPanelsByPlacement(placement)` helpers

### 2. Default Layout Config (`panels/defaultLayout.ts`)

A serializable layout description that both Dockview and the native layout can interpret:

```typescript
interface LayoutConfig {
  left: { panels: string[]; width: number };    // ["explorer", "hierarchy", "properties", "debug"]
  center: { panels: string[] };                  // ["code", "preview"]  (tabbed)
  right: { panels: string[]; width: number };    // ["chat"]
  bottom?: { panels: string[]; height: number }; // ["diagnostics"]
}

const DEFAULT_LAYOUT: LayoutConfig = {
  left:   { panels: ['explorer', 'hierarchy', 'properties', 'debug'], width: 320 },
  center: { panels: ['code', 'preview'] },
  right:  { panels: ['chat'], width: 360 },
};
```

This is the "factory default." On web, Dockview will serialize/restore from localStorage. On native, this is always used (no user layout persistence needed initially).

### 3. Web: Dockview Integration (`DockviewLayout.web.tsx`)

**Dependency**: `dockview-react` (web-only, tree-shaken from native bundle)

```typescript
import { DockviewReact, DockviewReadyEvent } from 'dockview-react';

function DockviewLayout() {
  const onReady = (event: DockviewReadyEvent) => {
    // Restore from localStorage, or apply DEFAULT_LAYOUT
    const saved = localStorage.getItem('editor-layout');
    if (saved) {
      event.api.fromJSON(JSON.parse(saved));
    } else {
      // Programmatically add panels from DEFAULT_LAYOUT
      const leftGroup = event.api.addGroup();
      PANEL_REGISTRY
        .filter(p => DEFAULT_LAYOUT.left.panels.includes(p.id))
        .forEach(p => event.api.addPanel({ id: p.id, title: p.title, component: p.id }));
      // ... center, right groups
    }
  };

  const onLayoutChange = (api) => {
    localStorage.setItem('editor-layout', JSON.stringify(api.toJSON()));
  };

  return (
    <DockviewReact
      onReady={onReady}
      components={dockviewComponents}  // Map of id -> React component
      className="editor-dockview"
    />
  );
}

// Map panel IDs to components for Dockview
const dockviewComponents = Object.fromEntries(
  PANEL_REGISTRY.map(p => [p.id, p.component])
);
```

**CSS**: Dockview ships its own CSS. We'll need a thin theme override to match the dark editor theme (`#1F2937` backgrounds, `#374151` borders).

**Web-only dependency management**: Install `dockview-react` but only import in `.web.tsx` files. Metro/webpack won't include it in native bundles.

### 4. Native Tablet: Resizable Two-Panel Split (`ResizablePanelLayout.native.tsx`)

**Dependency**: `react-native-resizable-panels` (works on iOS/Android, uses reanimated + gesture-handler)

The tablet layout is intentionally simpler: a **two-panel horizontal split** where:
- **Left panel**: StageArea (preview + code editor) — always visible
- **Right panel**: Switchable sidebar content (Explorer, Properties, Chat, etc.)

```typescript
import { Panel, PanelGroup, PanelResizeHandle } from 'react-native-resizable-panels';

function ResizablePanelLayout() {
  const [activeRightPanel, setActiveRightPanel] = useState<string>('explorer');

  return (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={65} minSize={40}>
        <StageArea />
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={35} minSize={20} maxSize={50}>
        <TabBar
          tabs={PANEL_REGISTRY.filter(p => p.id !== 'preview' && p.id !== 'code')}
          activeTab={activeRightPanel}
          onTabPress={setActiveRightPanel}
        />
        <PanelContent panelId={activeRightPanel} />
      </Panel>
    </PanelGroup>
  );
}
```

This gives iPad users a resizable divider between the main content and a sidebar, with tabs to switch what's in the sidebar. Much simpler than full docking, but a meaningful upgrade from the phone layout.

### 5. Updated `ResponsiveEditorLayout.tsx`

```typescript
import { Platform } from 'react-native';
import { useDeviceType } from '@/lib/hooks/useDeviceType';

// Lazy imports for platform-specific layouts
const DockviewLayout = Platform.OS === 'web'
  ? React.lazy(() => import('./DockviewLayout'))
  : null;

const ResizablePanelLayout = Platform.OS !== 'web'
  ? React.lazy(() => import('./ResizablePanelLayout'))
  : null;

export function ResponsiveEditorLayout({ onLivePreviewChange }) {
  const deviceType = useDeviceType();

  // Web desktop → Dockview
  if (Platform.OS === 'web' && deviceType === 'desktop') {
    return <DockviewLayout />;
  }

  // Native tablet (iPad landscape) → Resizable two-panel
  if (Platform.OS !== 'web' && deviceType !== 'mobile') {
    return <ResizablePanelLayout />;
  }

  // Phone (any platform) → Bottom sheets (existing behavior)
  return (
    <View style={styles.mobileLayout}>
      <StageArea onLivePreviewChange={onLivePreviewChange} />
      <BottomSheetHost />
    </View>
  );
}
```

Note: `deviceType !== 'mobile'` catches both `tablet` and `desktop` on native — an iPad in landscape is `desktop` (>= 1024px), and in portrait is `tablet` (768-1024px). Both should get the resizable split.

### 6. Web Mobile → Bottom Sheets Too

For web on small screens (phone-sized browser), the bottom-sheet mobile layout should still work. `@gorhom/bottom-sheet` works on web via RN Web. No change needed — the `deviceType === 'mobile'` path already handles this.

---

## Task Breakdown

### Phase 1: Panel Registry & Refactoring (no new deps)
- [x] Create `panels/registry.ts` with `PanelDefinition` type and registry
- [x] Create `panels/defaultLayout.ts` with `LayoutConfig` type and default
- [x] Refactor panel components to be self-contained (pull any props they get from parents into context reads instead)
  - `StageArea` already reads from `useEditor()` — verify `onLivePreviewChange` can move to context
  - `ChatSidebar` already uses `useEditorChatSession()` — already self-contained
  - Sidebar panels (Explorer, Hierarchy, Properties, Debug) — already self-contained
- [x] Move sidebar sub-panels from `sidebar/` into `panels/` for consistent location (ExplorerPanel, HierarchyPanel are currently under `sidebar/`, while PropertiesPanel, LayersPanel etc. are under `panels/`)

### Phase 2: Native Tablet Layout
- [x] Install `react-native-resizable-panels`
- [x] Create `ResizablePanelLayout.native.tsx` — two-panel split with tab switcher
- [x] Create a simple `PanelTabBar` component for the right panel tab switching
- [x] Update `ResponsiveEditorLayout.tsx` to use the three-way branch (web desktop / native tablet / phone)
- [ ] Test on iPad simulator in portrait (tablet breakpoint) and landscape (desktop breakpoint)

### Phase 3: Web Dockview Layout
- [x] Install `dockview-react` (web-only)
- [x] Create `DockviewLayout.web.tsx`
- [x] Create Dockview theme CSS to match editor dark theme
- [x] Wire up layout persistence to localStorage
- [x] Map all registered panels to Dockview components
- [ ] Test layout save/restore, panel drag-and-drop, tab management
- [x] Add a "Reset Layout" button somewhere accessible

### Phase 4: Polish
- [ ] Ensure InspectOverlay still works (currently rendered inside the desktop viewport — needs to layer on top of Dockview)
- [ ] Ensure editor keyboard shortcuts work through Dockview's focus management
- [ ] Handle window resize gracefully (Dockview handles this, but verify)
- [ ] Verify web mobile still gets bottom-sheet layout
- [ ] Performance test — Dockview shouldn't add meaningful overhead

---

## Dependency Impact

| Package | Platform | Size | Why |
|---------|----------|------|-----|
| `dockview-react` | Web only | ~100-200KB gzipped | Full docking system |
| `react-native-resizable-panels` | Native only | Small (reanimated-based) | Two-panel resize on iPad |

Neither package affects the other platform's bundle. Web won't include `react-native-resizable-panels` (it's `.native.tsx` only). Native won't include `dockview-react` (it's `.web.tsx` only).

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Dockview CSS conflicts with NativeWind/existing styles | Scope Dockview styles in a container div with reset styles |
| `react-native-resizable-panels` is a smaller library, may have bugs | It's a thin wrapper over reanimated — we can fork/fix easily. Also we're only using simple horizontal split, not complex nesting. |
| Panel components assume they're inside specific parents (e.g., BottomSheetScrollView) | Phase 1 refactoring ensures panels are self-contained and don't depend on parent container |
| Dockview version churn | Pin exact version, test on upgrade |
| `onLivePreviewChange` threading | Move to EditorProvider context so it's available regardless of layout strategy |

---

## Non-Goals (Explicit)

- **No docking on native**. iPad gets a simple resizable two-panel split. That's it.
- **No layout persistence on native**. The tablet layout is always the default. Users can resize the divider but the layout shape is fixed.
- **No floating/popout panels on web** initially. Dockview supports it, but we can enable later.
- **No changes to the phone layout**. Bottom sheets stay as-is.
