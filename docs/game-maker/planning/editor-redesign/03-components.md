# Component Specifications

> **Detailed specifications for each new component**

---

## Component Index

| Component | File | Priority | Phase |
|-----------|------|----------|-------|
| [EditorProvider](#editorprovider) | `components/editor/EditorProvider.tsx` | P0 | 1 |
| [EditorTopBar](#editortopbar) | `components/editor/EditorTopBar.tsx` | P0 | 1 |
| [BottomDock](#bottomdock) | `components/editor/BottomDock.tsx` | P0 | 1 |
| [StageContainer](#stagecontainer) | `components/editor/StageContainer.tsx` | P0 | 1 |
| [InteractionLayer](#interactionlayer) | `components/editor/InteractionLayer.tsx` | P0 | 2 |
| [SelectionOverlay](#selectionoverlay) | `components/editor/SelectionOverlay.tsx` | P0 | 2 |
| [BottomSheetHost](#bottomsheethost) | `components/editor/BottomSheetHost.tsx` | P0 | 3 |
| [LayersPanel](#layerspanel) | `components/editor/panels/LayersPanel.tsx` | P1 | 3 |
| [PropertiesPanel](#propertiespanel) | `components/editor/panels/PropertiesPanel.tsx` | P1 | 3 |
| [AssetsPanel](#assetspanel) | `components/editor/panels/AssetsPanel.tsx` | P1 | 4 |
| [DebugPanel](#debugpanel) | `components/editor/panels/DebugPanel.tsx` | P2 | 3 |
| [QuickActions](#quickactions) | `components/editor/QuickActions.tsx` | P2 | 2 |

---

## EditorProvider

### Purpose
Central state management for the entire editor. Wraps all editor components.

### File
`app/components/editor/EditorProvider.tsx`

### Props
```typescript
interface EditorProviderProps {
  gameId: string;
  initialDefinition: GameDefinition;
  children: React.ReactNode;
}
```

### Context Value
```typescript
interface EditorContextValue {
  // State
  mode: 'edit' | 'playtest';
  selectedEntityId: string | null;
  activeTab: 'assets' | 'properties' | 'layers' | 'debug';
  sheetSnapPoint: 0 | 1 | 2;
  document: GameDefinition;
  isDirty: boolean;
  
  // Mode
  setMode: (mode: 'edit' | 'playtest') => void;
  toggleMode: () => void;
  
  // Selection
  selectEntity: (id: string | null) => void;
  selectedEntity: RuntimeEntity | null;
  
  // Tabs
  setActiveTab: (tab: EditorContextValue['activeTab']) => void;
  setSheetSnapPoint: (point: 0 | 1 | 2) => void;
  
  // Entity Operations
  moveEntity: (id: string, x: number, y: number) => void;
  scaleEntity: (id: string, scale: number) => void;
  rotateEntity: (id: string, angle: number) => void;
  deleteEntity: (id: string) => void;
  duplicateEntity: (id: string) => void;
  addEntity: (templateId: string, x: number, y: number) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Persistence
  save: () => Promise<void>;
  isSaving: boolean;
  
  // Runtime Access (for advanced operations)
  runtimeRef: React.RefObject<GameRuntimeRef>;
}
```

### Implementation Notes
- Use `useReducer` for complex state updates
- Debounce auto-save to AsyncStorage (500ms)
- Track history with action stack (max 50)

### Usage
```tsx
<EditorProvider gameId={id} initialDefinition={definition}>
  <EditorTopBar />
  <StageContainer />
  <BottomDock />
  <BottomSheetHost />
</EditorProvider>
```

---

## EditorTopBar

### Purpose
Top navigation bar with back, undo/redo, title, and mode toggle.

### File
`app/components/editor/EditorTopBar.tsx`

### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│  [←]   [↶] [↷]        My Game Name         [▶ PLAY]        │
│  back  undo redo          title            mode toggle      │
└─────────────────────────────────────────────────────────────┘
Height: 56px
Background: bg-gray-900
```

### Props
```typescript
interface EditorTopBarProps {
  // All data comes from EditorContext
}
```

### Behavior
| Element | Action |
|---------|--------|
| Back button | `router.back()` with unsaved changes prompt |
| Undo | `editorContext.undo()` |
| Redo | `editorContext.redo()` |
| Title | Display only (tap for rename in future) |
| Play/Edit | `editorContext.toggleMode()` |

### Styling
```tsx
// Tailwind classes
<View className="h-14 flex-row items-center justify-between px-4 bg-gray-900 border-b border-gray-800">
  {/* Back */}
  <Pressable className="w-10 h-10 items-center justify-center">
    <Text className="text-white text-xl">←</Text>
  </Pressable>
  
  {/* Undo/Redo */}
  <View className="flex-row gap-2">
    <Pressable className={`w-10 h-10 items-center justify-center rounded-lg ${canUndo ? 'bg-gray-700' : 'bg-gray-800 opacity-50'}`}>
      <Text className="text-white">↶</Text>
    </Pressable>
    {/* ... redo similar */}
  </View>
  
  {/* Title */}
  <Text className="text-white font-semibold text-lg flex-1 text-center" numberOfLines={1}>
    {title}
  </Text>
  
  {/* Mode Toggle */}
  <Pressable className={`px-4 py-2 rounded-lg ${mode === 'playtest' ? 'bg-green-600' : 'bg-indigo-600'}`}>
    <Text className="text-white font-bold">
      {mode === 'playtest' ? '✏️ EDIT' : '▶ PLAY'}
    </Text>
  </Pressable>
</View>
```

---

## BottomDock

### Purpose
Primary navigation for editor tools. Always visible in Edit mode.

### File
`app/components/editor/BottomDock.tsx`

### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│    [➕]       [✏️]       [📑]       [⚡]       [•••]       │
│    Add        Edit      Layers      Logic      More        │
└─────────────────────────────────────────────────────────────┘
Height: 60px (+ safe area)
Background: bg-gray-900
```

### Props
```typescript
interface BottomDockProps {
  // All from context
}
```

### Dock Items
```typescript
const DOCK_ITEMS = [
  { id: 'add', icon: '➕', label: 'Add', tab: 'assets' },
  { id: 'edit', icon: '✏️', label: 'Edit', tab: 'properties', requiresSelection: true },
  { id: 'layers', icon: '📑', label: 'Layers', tab: 'layers' },
  { id: 'logic', icon: '⚡', label: 'Logic', tab: 'behaviors' },
  { id: 'more', icon: '•••', label: 'More', action: 'showMoreMenu' },
] as const;
```

### Behavior
| Tap | Action |
|-----|--------|
| Add | Open sheet to Assets tab |
| Edit | Open sheet to Properties tab (if entity selected) |
| Layers | Open sheet to Layers tab |
| Logic | Open sheet to Behaviors tab |
| More | Show action menu (Settings, Help, Export) |

### Styling
```tsx
<View className="flex-row justify-around items-center h-15 bg-gray-900 border-t border-gray-800 pb-safe">
  {DOCK_ITEMS.map(item => (
    <Pressable
      key={item.id}
      className={`items-center py-2 px-4 ${activeTab === item.tab ? 'opacity-100' : 'opacity-60'}`}
      onPress={() => handleDockPress(item)}
      disabled={item.requiresSelection && !selectedEntityId}
    >
      <Text className="text-2xl">{item.icon}</Text>
      <Text className="text-white text-xs mt-1">{item.label}</Text>
    </Pressable>
  ))}
</View>
```

---

## StageContainer

### Purpose
Hosts the game canvas with the interaction layer overlay.

### File
`app/components/editor/StageContainer.tsx`

### Structure
```tsx
<View className="flex-1">
  {/* Game Canvas (Skia) */}
  <GameCanvas
    definition={document}
    paused={mode === 'edit'}
    ref={runtimeRef}
  />
  
  {/* Interaction Layer (gestures) - only in Edit mode */}
  {mode === 'edit' && (
    <InteractionLayer
      onSelect={selectEntity}
      onMove={moveEntity}
      onScale={scaleEntity}
      selectedEntityId={selectedEntityId}
    />
  )}
  
  {/* Selection Overlay (Skia) - only when selected */}
  {mode === 'edit' && selectedEntityId && (
    <SelectionOverlay entityId={selectedEntityId} />
  )}
</View>
```

### Props
```typescript
interface StageContainerProps {
  // All from context
}
```

---

## InteractionLayer

### Purpose
Handles all touch gestures and routes them appropriately.

### File
`app/components/editor/InteractionLayer.tsx`

### Gesture Handlers
```typescript
// Uses react-native-gesture-handler

// 1. Tap Gesture
const tapGesture = Gesture.Tap()
  .onEnd((event) => {
    const worldPos = screenToWorld(event.x, event.y);
    const hitEntity = queryEntityAtPoint(worldPos);
    if (hitEntity) {
      selectEntity(hitEntity.id);
    } else {
      selectEntity(null);
    }
  });

// 2. Pan Gesture (drag)
const panGesture = Gesture.Pan()
  .onStart((event) => {
    if (selectedEntityId) {
      dragStartRef.current = getEntityPosition(selectedEntityId);
    }
  })
  .onUpdate((event) => {
    if (selectedEntityId && dragStartRef.current) {
      const delta = screenToWorldDelta(event.translationX, event.translationY);
      moveEntity(selectedEntityId, 
        dragStartRef.current.x + delta.x,
        dragStartRef.current.y + delta.y
      );
    }
  });

// 3. Pinch Gesture (scale)
const pinchGesture = Gesture.Pinch()
  .onUpdate((event) => {
    if (selectedEntityId) {
      const newScale = initialScale * event.scale;
      scaleEntity(selectedEntityId, clamp(newScale, 0.25, 4));
    }
  });

// 4. Two-finger Pan (camera)
const cameraPanGesture = Gesture.Pan()
  .minPointers(2)
  .onUpdate((event) => {
    panCamera(event.translationX, event.translationY);
  });

// Compose gestures
const composed = Gesture.Simultaneous(
  tapGesture,
  Gesture.Exclusive(panGesture, cameraPanGesture),
  pinchGesture
);
```

### Hit Testing
```typescript
function queryEntityAtPoint(worldPos: Vec2): RuntimeEntity | null {
  const physics = runtimeRef.current?.getPhysics();
  if (!physics) return null;
  
  const bodyId = physics.queryPoint(worldPos);
  if (!bodyId) return null;
  
  const entityManager = runtimeRef.current?.getEntityManager();
  return entityManager?.getActiveEntities().find(e => e.bodyId === bodyId) ?? null;
}
```

---

## SelectionOverlay

### Purpose
Renders visual selection indicators (bounding box, handles) using Skia.

### File
`app/components/editor/SelectionOverlay.tsx`

### Visual Design
```
       ◎  ← Rotation handle (optional)
       │
  ○────┼────○
  │         │
  │  Entity │  ← Blue stroke bounding box
  │         │
  ○─────────○
  
○ = Scale handles (corners)
◎ = Rotation handle (top center)
```

### Props
```typescript
interface SelectionOverlayProps {
  entityId: string;
  showRotationHandle?: boolean;
  handleSize?: number;
}
```

### Skia Implementation
```tsx
import { Group, Rect, Circle, Line, Paint } from '@shopify/react-native-skia';

function SelectionOverlay({ entityId }: SelectionOverlayProps) {
  const entity = useEntity(entityId);
  if (!entity) return null;
  
  const bounds = getEntityBounds(entity);
  const handleSize = 12;
  
  return (
    <Group>
      {/* Bounding box */}
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        style="stroke"
        strokeWidth={2}
        color="#3B82F6"
      />
      
      {/* Corner handles */}
      {[
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x, y: bounds.y + bounds.height },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      ].map((pos, i) => (
        <Circle
          key={i}
          cx={pos.x}
          cy={pos.y}
          r={handleSize / 2}
          color="white"
          style="fill"
        />
      ))}
    </Group>
  );
}
```

---

## BottomSheetHost

### Purpose
Container for the multi-tab bottom sheet using @gorhom/bottom-sheet.

### File
`app/components/editor/BottomSheetHost.tsx`

### Configuration
```typescript
const SNAP_POINTS = ['10%', '50%', '90%'];

// Snap point meanings:
// 0 (10%): Peek - just shows tab bar
// 1 (50%): Half - comfortable browsing
// 2 (90%): Full - detailed editing
```

### Props
```typescript
interface BottomSheetHostProps {
  // All from context
}
```

### Implementation
```tsx
import BottomSheet from '@gorhom/bottom-sheet';

function BottomSheetHost() {
  const { activeTab, setActiveTab, sheetSnapPoint, setSheetSnapPoint } = useEditor();
  const sheetRef = useRef<BottomSheet>(null);
  
  return (
    <BottomSheet
      ref={sheetRef}
      index={sheetSnapPoint}
      snapPoints={SNAP_POINTS}
      onChange={setSheetSnapPoint}
      backgroundStyle={{ backgroundColor: '#1F2937' }}
      handleIndicatorStyle={{ backgroundColor: '#6B7280' }}
    >
      {/* Tab Header */}
      <View className="flex-row border-b border-gray-700 px-4">
        {TABS.map(tab => (
          <Pressable
            key={tab.id}
            className={`py-3 px-4 ${activeTab === tab.id ? 'border-b-2 border-indigo-500' : ''}`}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text className={activeTab === tab.id ? 'text-white' : 'text-gray-400'}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      
      {/* Tab Content */}
      <BottomSheetScrollView>
        {activeTab === 'assets' && <AssetsPanel />}
        {activeTab === 'properties' && <PropertiesPanel />}
        {activeTab === 'layers' && <LayersPanel />}
        {activeTab === 'debug' && <DebugPanel />}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
```

---

## LayersPanel

### Purpose
List all entities with visibility, lock, and reorder controls.

### File
`app/components/editor/panels/LayersPanel.tsx`

### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ LAYERS                                           [+ Add]    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ │ 👁 │ 🔒 │ 🎮 Player                    │ ≡ │       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ │ 👁 │ 🔓 │ 🧱 Platform-1                │ ≡ │       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ │ 👻 │ 🔓 │ 👾 Enemy-1 (hidden)          │ ≡ │       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

☑/☐ = Selected state
👁/👻 = Visible/Hidden
🔒/🔓 = Locked/Unlocked
≡ = Drag handle
```

### Props
```typescript
interface LayersPanelProps {
  // All from context
}
```

### Features
- Sortable list (drag to reorder z-index)
- Tap row to select entity
- Toggle visibility (affects rendering)
- Toggle lock (prevents selection/editing)
- Shows entity thumbnail or icon

---

## PropertiesPanel

### Purpose
Edit properties of the selected entity.

### File
`app/components/editor/panels/PropertiesPanel.tsx`

### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ Player                                          [🗑️ Delete] │
├─────────────────────────────────────────────────────────────┤
│ POSITION                                                    │
│ X  [━━━━━━━━━●━━━━━━] 5.2                                   │
│ Y  [━━━━●━━━━━━━━━━━] 2.0                                   │
├─────────────────────────────────────────────────────────────┤
│ TRANSFORM                                                   │
│ Scale     [━━━━━●━━━━━] 1.0                                 │
│ Rotation  [●━━━━━━━━━━━] 0°                                 │
├─────────────────────────────────────────────────────────────┤
│ APPEARANCE                                                  │
│ Color  [🟢] Green                              [Change]     │
│ Image  [📷 Player.png]                        [Swap]       │
│ Opacity [━━━━━━━━━●━] 100%                                  │
├─────────────────────────────────────────────────────────────┤
│ PHYSICS                                                     │
│ Type     [Static] [Dynamic ✓] [Kinematic]                   │
│ Density  [━━━●━━━━━━━] 1.0                                  │
│ Friction [━━━━━━●━━━━] 0.3                                  │
│ Bounce   [━━━━━━━━●━━] 0.5                                  │
├─────────────────────────────────────────────────────────────┤
│ [▼ More Options]                                            │
└─────────────────────────────────────────────────────────────┘
```

### Section Components
```typescript
// Reusable property controls
<PropertySlider label="X" value={x} min={0} max={20} onChange={setX} />
<PropertySlider label="Scale" value={scale} min={0.25} max={4} step={0.1} onChange={setScale} />
<PropertySegment label="Type" options={['static', 'dynamic', 'kinematic']} value={type} onChange={setType} />
<PropertyColor label="Color" value={color} onChange={setColor} />
```

---

## AssetsPanel

### Purpose
Browse and add assets to the game.

### File
`app/components/editor/panels/AssetsPanel.tsx`

### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search assets...                                         │
├─────────────────────────────────────────────────────────────┤
│ [All] [Characters] [Props] [Backgrounds] [Effects]          │
├─────────────────────────────────────────────────────────────┤
│ FROM THIS GAME                                              │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                                │
│ │🎮  │ │🎯  │ │🧱  │ │⭐  │                                │
│ │Hero│ │Ball│ │Wall│ │Star│                                │
│ └────┘ └────┘ └────┘ └────┘                                │
├─────────────────────────────────────────────────────────────┤
│ BASIC SHAPES                                                │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                                │
│ │ ⬜ │ │ ⚪ │ │ 🔺 │ │ ⬡  │                                │
│ │Rect│ │Circ│ │Tri │ │Poly│                                │
│ └────┘ └────┘ └────┘ └────┘                                │
├─────────────────────────────────────────────────────────────┤
│ [✨ Generate with AI...]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Behavior
| Action | Result |
|--------|--------|
| Tap asset | Add centered on stage, select it |
| Long-press drag | Drag-to-place on stage |
| Tap "Generate" | Open AI generation modal |

---

## DebugPanel

### Purpose
Developer tools for asset alignment and physics debugging.

### File
`app/components/editor/panels/DebugPanel.tsx`

### Features
```
┌─────────────────────────────────────────────────────────────┐
│ DEBUG OPTIONS                                               │
├─────────────────────────────────────────────────────────────┤
│ [✓] Show Physics Bounds                                     │
│ [✓] Show Sprite Bounds                                      │
│ [ ] Show Entity IDs                                         │
│ [ ] Show FPS Counter                                        │
│ [ ] Show Touch Points                                       │
├─────────────────────────────────────────────────────────────┤
│ ASSET ALIGNMENT (Selected: Player)                          │
│ Offset X  [━━━━━●━━━━━] 0px                                 │
│ Offset Y  [━━━━━●━━━━━] 0px                                 │
│ Scale     [━━━━━●━━━━━] 1.0                                 │
│ [Reset to Default]                                          │
├─────────────────────────────────────────────────────────────┤
│ PHYSICS DEBUG                                               │
│ Active Bodies: 12                                           │
│ Contacts: 4                                                 │
│ FPS: 60                                                     │
│ [Pause Physics] [Step Once]                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## QuickActions

### Purpose
Contextual action buttons that appear near the selected entity.

### File
`app/components/editor/QuickActions.tsx`

### Visual Design
```
           Selected Entity
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
┌──────┐               ┌──────┐
│ 📋  │               │ 🗑️  │
│Copy │               │Delete│
└──────┘               └──────┘
    ▲                       ▲
    │                       │
    └───────────┬───────────┘
                │
         Quick Action Bar
    ┌─────┬─────┬─────┬─────┐
    │ 📋 │ 🗑️ │ ⬆️ │ ↕️ │
    │Copy│Del │Front│Flip │
    └─────┴─────┴─────┴─────┘
```

### Actions
| Button | Action |
|--------|--------|
| Copy | `duplicateEntity(selectedId)` |
| Delete | `deleteEntity(selectedId)` with confirmation |
| Front | Bring to front (max z-index) |
| Flip | Flip horizontal (scaleX *= -1) |

### Positioning
- Appears above or below selection based on available space
- Follows selection when dragging (with slight delay)
- Hides during pinch/rotate gestures

---

## Shared UI Components

### PropertySlider
```tsx
interface PropertySliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}
```

### PropertySegment
```tsx
interface PropertySegmentProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}
```

### PropertyColor
```tsx
interface PropertyColorProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}
```

### PropertyToggle
```tsx
interface PropertyToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}
```
