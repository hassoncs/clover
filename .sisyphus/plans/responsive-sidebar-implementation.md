# Responsive Sidebar Inspector - Implementation Plan

**Date**: 2026-01-27  
**Goal**: Convert bottom sheet editor to sidebar on wide screens (desktop/web) while keeping mobile bottom sheet  
**Platform Strategy**: Web gets rich inspector, mobile gets simple debugging

---

## Overview

### Current State
- **BottomSheetHost**: Bottom sheet with tabs (Gallery, Add, Properties, Layers, Debug)
- **StageContainer**: Game viewport with Godot + InteractionLayer
- **Layout**: Mobile-first, bottom sheet overlays game

### Target State
- **Responsive Layout**: Detect screen width, switch between bottom sheet and sidebar
- **Wide Screens (≥1024px)**: Sidebar on left/right with resizable panels
- **Mobile (<1024px)**: Keep existing bottom sheet
- **Platform-Specific**: Web sidebar gets rich inspector (tree, properties), mobile keeps simple tabs

---

## Architecture

```
Editor Layout
├── useDeviceType() hook (detects mobile/tablet/desktop)
├── ResponsiveEditorLayout (root layout component)
│   ├── Desktop: Sidebar + StageContainer
│   └── Mobile: StageContainer + BottomSheetHost
├── Sidebar (web/desktop only)
│   ├── ResizablePanels (react-native-resizable-panels)
│   │   ├── HierarchyPanel (react-complex-tree)
│   │   ├── PropertiesPanel (rich property editor)
│   │   └── DebugPanel (enhanced debug tools)
│   └── InspectorOverlay (hover highlights)
└── BottomSheetHost (mobile only - current)
    └── Simple tabs (Assets, Properties, Layers, Debug)
```

---

## Implementation Phases

### Phase 1: Responsive Layout Foundation (Week 1)

**Goal**: Detect screen width and conditionally render sidebar vs bottom sheet

#### 1.1 Create Device Detection Hook

**File**: `app/lib/hooks/useDeviceType.ts`

```typescript
import { useWindowDimensions } from 'react-native';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

export function useDeviceType(): DeviceType {
  const { width } = useWindowDimensions();
  
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
}

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= BREAKPOINTS.tablet;
}

export function useIsMobile(): boolean {
  const { width } = useWindowDimensions();
  return width < BREAKPOINTS.mobile;
}
```

#### 1.2 Create Responsive Editor Layout

**File**: `app/components/editor/ResponsiveEditorLayout.tsx`

```typescript
import { View, StyleSheet } from 'react-native';
import { useIsDesktop } from '@/lib/hooks/useDeviceType';
import { StageContainer } from './StageContainer';
import { BottomSheetHost } from './BottomSheetHost';
import { Sidebar } from './sidebar/Sidebar';

export function ResponsiveEditorLayout() {
  const isDesktop = useIsDesktop();
  
  return (
    <View style={styles.container}>
      {isDesktop ? (
        // Desktop: Sidebar + Game viewport
        <View style={styles.desktopLayout}>
          <Sidebar style={styles.sidebar} />
          <View style={styles.viewport}>
            <StageContainer />
          </View>
        </View>
      ) : (
        // Mobile: Game viewport + Bottom sheet
        <View style={styles.mobileLayout}>
          <StageContainer />
          <BottomSheetHost />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileLayout: {
    flex: 1,
  },
  sidebar: {
    width: 320, // Initial width, will be resizable
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  viewport: {
    flex: 1,
  },
});
```

#### 1.3 Update Editor Screen

**File**: Modify `app/app/editor.tsx` (or wherever the editor screen is)

```typescript
import { ResponsiveEditorLayout } from '@/components/editor/ResponsiveEditorLayout';

export default function EditorScreen() {
  return (
    <EditorProvider>
      <ResponsiveEditorLayout />
    </EditorProvider>
  );
}
```

**Acceptance Criteria**:
- [ ] On mobile (< 768px): Shows bottom sheet (current behavior)
- [ ] On tablet (768-1024px): Shows sidebar (320px width)
- [ ] On desktop (≥1024px): Shows sidebar (320px width)
- [ ] Layout updates when window resizes (web)
- [ ] No visual glitches during transition

---

### Phase 2: Web Sidebar with Resizable Panels (Week 2)

**Goal**: Create rich inspector sidebar for web/desktop

#### 2.1 Install Dependencies

```bash
cd app
npm install react-native-resizable-panels
npm install react-complex-tree
npm install -D @types/react-complex-tree
```

#### 2.2 Create Sidebar Component

**File**: `app/components/editor/sidebar/Sidebar.tsx`

```typescript
import { View, StyleSheet } from 'react-native';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-native-resizable-panels';
import { HierarchyPanel } from './HierarchyPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { DebugPanel } from './DebugPanel';

interface SidebarProps {
  style?: ViewStyle;
}

export function Sidebar({ style }: SidebarProps) {
  return (
    <View style={[styles.container, style]}>
      <PanelGroup direction="vertical" autoSaveId="editor-sidebar-layout">
        {/* Entity Hierarchy */}
        <Panel defaultSize={40} minSize={20} maxSize={60}>
          <HierarchyPanel />
        </Panel>
        
        <PanelResizeHandle style={styles.resizeHandle} />
        
        {/* Properties */}
        <Panel defaultSize={35} minSize={20}>
          <PropertiesPanel />
        </Panel>
        
        <PanelResizeHandle style={styles.resizeHandle} />
        
        {/* Debug */}
        <Panel defaultSize={25} minSize={10} collapsible>
          <DebugPanel />
        </Panel>
      </PanelGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  resizeHandle: {
    height: 4,
    backgroundColor: '#374151',
  },
});
```

#### 2.3 Create Hierarchy Panel (Web Only)

**File**: `app/components/editor/sidebar/HierarchyPanel.tsx`

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useEditor } from '../EditorProvider';
import { useInspector } from '../inspector/useInspector';

export function HierarchyPanel() {
  const { selectedEntityId, selectEntity } = useEditor();
  const { entities, isLoading } = useInspector();
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hierarchy</Text>
      </View>
      
      {isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : (
        <TreeView
          data={entities}
          selectedId={selectedEntityId}
          onSelect={selectEntity}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loading: {
    color: '#9CA3AF',
    padding: 16,
  },
});
```

**Note**: For Phase 2, use a simple FlatList-based tree. In Phase 3, integrate react-complex-tree.

#### 2.4 Create Properties Panel (Web Only)

**File**: `app/components/editor/sidebar/PropertiesPanel.tsx`

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { useEditor } from '../EditorProvider';
import { useInspector } from '../inspector/useInspector';

export function PropertiesPanel() {
  const { selectedEntityId } = useEditor();
  const { getEntityProps } = useInspector();
  
  const props = selectedEntityId ? getEntityProps(selectedEntityId) : null;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Properties</Text>
      </View>
      
      {selectedEntityId ? (
        <PropertyEditor data={props} />
      ) : (
        <Text style={styles.empty}>Select an entity to edit</Text>
      )}
    </View>
  );
}
```

**Acceptance Criteria**:
- [ ] Sidebar has 3 resizable panels (Hierarchy, Properties, Debug)
- [ ] Panels can be resized by dragging handles
- [ ] Panel sizes persist via AsyncStorage
- [ ] Debug panel can be collapsed
- [ ] Smooth 60fps animations when resizing

---

### Phase 3: Web Inspector with react-complex-tree (Week 3)

**Goal**: Replace simple tree with full-featured react-complex-tree

#### 3.1 Set Up react-complex-tree

**File**: `app/components/editor/sidebar/TreeView.tsx`

```typescript
import { View } from 'react-native';
import { useState } from 'react';
import {
  ControlledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
} from 'react-complex-tree';
import 'react-complex-tree/lib/style.css'; // Import styles

interface TreeViewProps {
  data: EntityNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TreeView({ data, selectedId, onSelect }: TreeViewProps) {
  const [focusedItem, setFocusedItem] = useState<string>();
  const [expandedItems, setExpandedItems] = useState<string[]>(['root']);
  
  // Convert entities to tree data provider
  const dataProvider = new StaticTreeDataProvider(
    convertEntitiesToTreeItems(data),
    (item, newName) => ({ ...item, data: newName })
  );
  
  return (
    <View style={{ flex: 1 }}>
      <ControlledTreeEnvironment
        items={dataProvider}
        getItemTitle={(item) => item.data}
        viewState={{
          ['tree-1']: {
            focusedItem,
            expandedItems,
            selectedItems: selectedId ? [selectedId] : [],
          },
        }}
        onFocusItem={(item) => setFocusedItem(item.index)}
        onExpandItem={(item) => 
          setExpandedItems((prev) => [...prev, item.index])
        }
        onCollapseItem={(item) =>
          setExpandedItems((prev) => prev.filter((i) => i !== item.index))
        }
        onSelectItems={(items) => {
          if (items.length > 0) {
            onSelect(items[0] as string);
          }
        }}
      >
        <Tree treeId="tree-1" rootItem="root" treeLabel="Entity Hierarchy" />
      </ControlledTreeEnvironment>
    </View>
  );
}
```

#### 3.2 Add Inspect Mode

**File**: `app/components/editor/inspector/InspectOverlay.tsx`

```typescript
import { View, StyleSheet } from 'react-native';
import { useInspector } from './useInspector';

export function InspectOverlay() {
  const { hoveredEntity, selectedEntity } = useInspector();
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Highlight box for hovered entity */}
      {hoveredEntity && (
        <View
          style={[
            styles.highlight,
            styles.hoverHighlight,
            hoveredEntity.screenBounds,
          ]}
        />
      )}
      
      {/* Highlight box for selected entity */}
      {selectedEntity && (
        <View
          style={[
            styles.highlight,
            styles.selectHighlight,
            selectedEntity.screenBounds,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  highlight: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  hoverHighlight: {
    borderColor: '#FBBF24', // Yellow
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  selectHighlight: {
    borderColor: '#60A5FA', // Blue
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
});
```

**Acceptance Criteria**:
- [ ] Tree view shows entity hierarchy with expandable nodes
- [ ] Clicking entity selects it and shows properties
- [ ] Hovering entity in tree highlights it in game view
- [ ] Multi-select works with Ctrl/Cmd+click
- [ ] Search/filter entities by name

---

### Phase 4: Mobile Inspector Features (Week 4)

**Goal**: Add screenshot/markup debugging for mobile

#### 4.1 Create Screenshot Debug Tool

**File**: `app/components/editor/mobile/ScreenshotDebugger.tsx`

```typescript
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useState } from 'react';

export function ScreenshotDebugger() {
  const [isCapturing, setIsCapturing] = useState(false);
  
  const captureScreenshot = async () => {
    setIsCapturing(true);
    // Use GodotDebugBridge to capture screenshot
    const screenshot = await GodotDebugBridge.captureScreenshot();
    setIsCapturing(false);
    
    // Navigate to markup screen
    router.push({
      pathname: '/editor/screenshot-markup',
      params: { imageUri: screenshot.uri }
    });
  };
  
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.button}
        onPress={captureScreenshot}
        disabled={isCapturing}
      >
        <Text style={styles.buttonText}>
          {isCapturing ? 'Capturing...' : '📸 Capture Screenshot'}
        </Text>
      </Pressable>
      
      <Text style={styles.description}>
        Take a screenshot and mark up issues for AI debugging
      </Text>
    </View>
  );
}
```

#### 4.2 Add to Debug Panel

Modify `app/components/editor/panels/DebugPanel.tsx` to include screenshot button on mobile.

**Acceptance Criteria**:
- [ ] Mobile debug panel has screenshot capture button
- [ ] Screenshots can be marked up with drawings
- [ ] Marked up screenshots can be sent to AI for analysis
- [ ] Mobile keeps simple entity list (no complex tree)

---

## File Structure

```
app/components/editor/
├── ResponsiveEditorLayout.tsx       # Root responsive layout
├── EditorProvider.tsx               # Existing (no changes)
├── StageContainer.tsx               # Existing (no changes)
├── BottomSheetHost.tsx              # Existing (mobile only)
├── InteractionLayer.tsx             # Existing (no changes)
├── sidebar/                         # NEW: Desktop sidebar
│   ├── Sidebar.tsx                  # Resizable panel container
│   ├── HierarchyPanel.tsx           # Entity tree view
│   ├── PropertiesPanel.tsx          # Property editor
│   ├── DebugPanel.tsx               # Debug tools
│   └── TreeView.tsx                 # react-complex-tree wrapper
├── inspector/                       # NEW: Inspector state
│   ├── InspectorProvider.tsx        # Inspector context
│   ├── useInspector.ts              # Inspector hook
│   ├── InspectOverlay.tsx           # Highlight overlay
│   └── types.ts                     # Inspector types
├── mobile/                          # NEW: Mobile-specific
│   └── ScreenshotDebugger.tsx       # Screenshot + markup
└── hooks/
    └── useDeviceType.ts             # Device detection
```

---

## Platform-Specific Component Injection

### Pattern: Platform-Specific Files

Use `.web.tsx` and `.native.tsx` extensions for platform-specific implementations:

**HierarchyPanel.web.tsx** (rich tree):
```typescript
import { TreeView } from 'react-complex-tree';
// Full-featured tree with drag-drop, multi-select
```

**HierarchyPanel.native.tsx** (simple list):
```typescript
import { FlatList } from 'react-native';
// Simple flat list for mobile
```

**HierarchyPanel.tsx** (shared types):
```typescript
export interface HierarchyPanelProps {
  entities: Entity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}
```

### Pattern: Feature Detection

Instead of Platform.OS checks, detect capabilities:

```typescript
function InspectorPanel() {
  const supportsComplexTree = useSupportsComplexTree(); // Check if web
  
  if (supportsComplexTree) {
    return <ComplexTreeInspector />;
  }
  
  return <SimpleListInspector />;
}
```

---

## Responsive Breakpoint Strategy

| Breakpoint | Width | Layout | Inspector |
|------------|-------|--------|-----------|
| Mobile | < 768px | Bottom sheet | Simple tabs, screenshot tool |
| Tablet | 768-1024px | Sidebar (240px) | Simplified tree, properties |
| Desktop | ≥ 1024px | Sidebar (320px) | Full tree, properties, debug |

---

## Animation Strategy

### Layout Transitions

Use layout animations for smooth transitions:

```typescript
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

function ResponsiveLayout() {
  const isDesktop = useIsDesktop();
  
  return (
    <View style={styles.container}>
      {isDesktop ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.desktopLayout}
        >
          <Sidebar />
          <StageContainer />
        </Animated.View>
      ) : (
        <MobileLayout />
      )}
    </View>
  );
}
```

### Sidebar Resize

react-native-resizable-panels handles smooth resize animations automatically.

---

## Testing Strategy

### Manual Testing Checklist

**Mobile (iPhone)**:
- [ ] Bottom sheet appears at bottom
- [ ] Can swipe up to expand
- [ ] Tabs switch correctly
- [ ] Screenshot button works

**Tablet (iPad)**:
- [ ] Sidebar appears on left
- [ ] Sidebar width is 240px
- [ ] Can resize panels
- [ ] Tree view works

**Desktop (Browser)**:
- [ ] Sidebar appears on left
- [ ] Sidebar width is 320px
- [ ] Resizable panels work
- [ ] react-complex-tree renders
- [ ] Hover states work
- [ ] Multi-select works

### Responsive Testing

Test at these exact widths:
- 375px (iPhone SE)
- 768px (iPad portrait)
- 1024px (iPad landscape)
- 1440px (Desktop)

Resize browser window and verify layout switches smoothly.

---

## Success Criteria

### Functional
- [ ] Layout automatically adapts to screen width
- [ ] Desktop (≥1024px): Shows sidebar with rich inspector
- [ ] Mobile (< 768px): Shows bottom sheet with simple tools
- [ ] Tablet (768-1024px): Shows simplified sidebar
- [ ] Panel sizes persist across sessions
- [ ] Inspector state shared between mobile and desktop

### Performance
- [ ] 60fps when resizing panels
- [ ] Tree view handles 500+ entities smoothly
- [ ] No lag when switching between tabs
- [ ] Memory usage reasonable on mobile

### Quality
- [ ] No visual glitches during layout transitions
- [ ] Touch targets adequate on mobile (≥44px)
- [ ] Accessible (keyboard navigation on desktop)
- [ ] TypeScript types complete

---

## Dependencies to Add

```json
{
  "dependencies": {
    "react-native-resizable-panels": "^0.0.3",
    "react-complex-tree": "^latest",
    "@shopify/flash-list": "^1.0.0"
  },
  "devDependencies": {
    "@types/react-complex-tree": "^latest"
  }
}
```

---

## Migration Path from Current Code

1. **Week 1**: Add responsive layout, keep bottom sheet
   - No breaking changes
   - Mobile users see no difference
   - Desktop users see sidebar appear

2. **Week 2**: Build sidebar with basic panels
   - Resizable panels
   - Simple entity list
   - Basic properties

3. **Week 3**: Add react-complex-tree (web only)
   - Rich hierarchy view
   - Inspect mode
   - Advanced features

4. **Week 4**: Mobile screenshot tools
   - Add to debug panel
   - Markup interface
   - AI integration

---

## Open Questions

1. **Sidebar Position**: Left or right side?
   - Recommendation: Left (follows Figma, Unity, Unreal pattern)

2. **Default Panel Sizes**: 
   - Hierarchy: 40%
   - Properties: 35%
   - Debug: 25%

3. **Mobile Tree View**: 
   - Option A: Simple flat list
   - Option B: Collapsible sections
   - Option C: Drill-down navigation

4. **Inspector on Mobile**:
   - Option A: Modal popup
   - Option B: Inline in bottom sheet
   - Option C: Full-screen overlay

---

## Next Steps

1. ✅ Review this plan
2. 🔄 Confirm sidebar position (left vs right)
3. 🔄 Confirm mobile tree approach
4. 🔄 Approve Phase 1 implementation
5. 🔄 Start Week 1 development

---

*This plan provides a pragmatic path to responsive editor layout with platform-appropriate tools.*
