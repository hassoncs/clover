# Editor Architecture

> **UI Architecture, Component Hierarchy, and State Management**

---

## Core Architecture Principles

### 1. Single Editor Route
One route (`app/editor/[id].tsx`) owns all editor state. Panels are **not** separate screens—they're UI elements within the editor that don't cause navigation.

### 2. Stage-First Layout
The game canvas (Stage) is always visible and interactive. All editing tools work around the stage, not on top of it.

### 3. Mode-Based Interaction
Two explicit modes control what the user can do:
- **Edit Mode**: Physics paused, selection enabled, transforms allowed
- **Playtest Mode**: Physics running, game controls active, editing disabled

### 4. Local-First Data Flow
- Edits update local state immediately (optimistic)
- Persist to device storage frequently
- Sync to server on explicit Save/Publish

---

## Screen Layout Architecture

### Mobile Portrait (Primary)
```
┌────────────────────────────────────────┐
│            TopBar (56px fixed)         │
│  [←] [↶ ↷]      Title      [▶ PLAY]   │
├────────────────────────────────────────┤
│                                        │
│                                        │
│                                        │
│         Stage (flex: 1)                │
│         Full-bleed canvas              │
│         Touch interaction layer        │
│                                        │
│                                        │
│                                        │
├────────────────────────────────────────┤
│         BottomDock (60px fixed)        │
│   [➕]  [✏️]  [📑]  [⚡]  [•••]       │
│   Add   Edit  Layers Logic  More       │
├────────────────────────────────────────┤
│      BottomSheet (variable height)     │
│      Snap points: 10%, 50%, 90%        │
│      Content changes based on tab      │
└────────────────────────────────────────┘
```

### Tablet Landscape (Future Enhancement)
```
┌──────────────────────────────────────────────────────────────┐
│                       TopBar (56px)                          │
├──────────┬───────────────────────────────────────┬───────────┤
│          │                                       │           │
│  Layers  │                                       │ Properties│
│  Panel   │            Stage                      │   Panel   │
│  (240px) │         (flex: 1)                     │  (280px)  │
│          │                                       │           │
│          │                                       │           │
├──────────┴───────────────────────────────────────┴───────────┤
│                    BottomDock (optional)                     │
│              Assets tray / Quick actions                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
EditorScreen (app/editor/[id].tsx)
├── EditorProvider (context for all editor state)
│   ├── EditorTopBar
│   │   ├── BackButton
│   │   ├── UndoRedoButtons
│   │   ├── TitleDisplay
│   │   └── PlaytestToggle
│   │
│   ├── StageContainer
│   │   ├── GameCanvas (Skia Canvas wrapping GameRuntime)
│   │   │   ├── ParallaxBackground
│   │   │   ├── EntityRenderer (for each entity)
│   │   │   └── SelectionOverlay (when entity selected)
│   │   │
│   │   └── InteractionLayer (gesture handling)
│   │       ├── TapHandler (select/deselect)
│   │       ├── DragHandler (move entities)
│   │       ├── PinchHandler (scale entities)
│   │       └── CameraGestureHandler (pan/zoom)
│   │
│   ├── BottomDock (always visible in Edit mode)
│   │   ├── DockButton (Add)
│   │   ├── DockButton (Edit) 
│   │   ├── DockButton (Layers)
│   │   ├── DockButton (Logic)
│   │   └── DockButton (More)
│   │
│   └── BottomSheetHost (@gorhom/bottom-sheet)
│       ├── SheetHeader (drag handle + tab row)
│       └── SheetContent (switches based on activeTab)
│           ├── AssetsPanel
│           │   ├── SearchBar
│           │   ├── CategoryChips
│           │   └── AssetGrid
│           │
│           ├── PropertiesPanel
│           │   ├── TransformSection (x, y, rotation, scale)
│           │   ├── PhysicsSection (density, friction, restitution)
│           │   ├── SpriteSection (color, image, opacity)
│           │   └── BehaviorsSection (list of attached behaviors)
│           │
│           ├── LayersPanel
│           │   ├── LayerSortableList
│           │   └── LayerItem (visibility, lock, select)
│           │
│           └── DebugPanel
│               ├── AssetAlignmentTool
│               └── PhysicsVisualizerToggle
│
└── QuickActionsPopover (appears near selection)
    ├── DuplicateButton
    ├── DeleteButton
    ├── FlipButton
    └── BringToFrontButton
```

---

## State Management

### EditorState Interface
```typescript
interface EditorState {
  // Mode
  mode: 'edit' | 'playtest';
  
  // Selection
  selectedEntityId: string | null;
  multiSelectIds: string[]; // Future: multi-select
  
  // UI State
  activeTab: 'assets' | 'properties' | 'layers' | 'debug';
  sheetSnapPoint: 0 | 1 | 2; // peek, half, full
  
  // Camera
  cameraPosition: { x: number; y: number };
  cameraZoom: number;
  
  // History
  undoStack: EditorAction[];
  redoStack: EditorAction[];
  
  // Document
  document: GameDefinition;
  isDirty: boolean;
  lastSavedAt: number | null;
}

type EditorAction = 
  | { type: 'MOVE_ENTITY'; entityId: string; from: Vec2; to: Vec2 }
  | { type: 'SCALE_ENTITY'; entityId: string; from: number; to: number }
  | { type: 'ROTATE_ENTITY'; entityId: string; from: number; to: number }
  | { type: 'DELETE_ENTITY'; entityId: string; entity: GameEntity }
  | { type: 'ADD_ENTITY'; entity: GameEntity }
  | { type: 'CHANGE_PROPERTY'; entityId: string; path: string; from: any; to: any };
```

### EditorContext
```typescript
interface EditorContextValue {
  state: EditorState;
  
  // Mode
  setMode: (mode: 'edit' | 'playtest') => void;
  
  // Selection
  selectEntity: (id: string | null) => void;
  
  // UI
  setActiveTab: (tab: EditorState['activeTab']) => void;
  setSheetSnapPoint: (point: 0 | 1 | 2) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Entity Operations
  moveEntity: (id: string, position: Vec2) => void;
  scaleEntity: (id: string, scale: number) => void;
  rotateEntity: (id: string, angle: number) => void;
  deleteEntity: (id: string) => void;
  addEntity: (template: string, position: Vec2) => void;
  
  // Document
  saveDocument: () => Promise<void>;
  
  // Runtime Access
  getPhysics: () => Physics2D | null;
  getEntityManager: () => EntityManager | null;
}
```

### State Flow Diagram
```
User Gesture (tap/drag/pinch)
         │
         ▼
┌─────────────────────────┐
│   InteractionLayer      │
│   (gesture-handler)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   EditorContext         │
│   dispatch(action)      │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌────────┐    ┌───────────┐
│ History│    │ Document  │
│ Push   │    │ Update    │
└────────┘    └─────┬─────┘
                    │
                    ▼
            ┌───────────────┐
            │ EntityManager │
            │ (runtime)     │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Re-render     │
            │ Stage         │
            └───────────────┘
```

---

## Integration with GameRuntime

### Current GameRuntime (Unmodified Core)
The existing `GameRuntime.native.tsx` handles:
- Physics simulation (Box2D step)
- Entity rendering (Skia)
- Game input (for Playtest mode)
- HUD overlays

### New EditorController (Wrapper)
A new component wraps GameRuntime to add editor capabilities:

```typescript
interface EditorControllerProps {
  definition: GameDefinition;
  mode: 'edit' | 'playtest';
  selectedEntityId: string | null;
  onEntitySelect: (id: string | null) => void;
  onEntityTransform: (id: string, transform: Partial<Transform>) => void;
}

function EditorController({
  definition,
  mode,
  selectedEntityId,
  onEntitySelect,
  onEntityTransform,
}: EditorControllerProps) {
  // In edit mode: physics paused, allow transforms
  // In playtest mode: physics running, disable selection
  
  return (
    <GameRuntime
      definition={definition}
      paused={mode === 'edit'}
      renderMode={mode === 'edit' ? 'default' : 'default'}
      showDebugOverlays={false}
      // Additional props for editor integration
    />
  );
}
```

### Edit Mode Behavior
When `mode === 'edit'`:
1. Physics runs with `dt = 0` (frozen but world exists)
2. Entities render at their current positions
3. Touch gestures route to editor (select/move/scale)
4. Selection overlay draws on selected entity
5. BottomSheet and BottomDock visible

### Playtest Mode Behavior
When `mode === 'playtest'`:
1. Physics runs normally
2. Touch gestures route to game controls
3. Selection hidden
4. Only "Exit Playtest" button visible
5. Game HUD shows (score, lives, etc.)

---

## Data Persistence Strategy

### Local Storage (Immediate)
```typescript
// Save to AsyncStorage on every edit (debounced 500ms)
const STORAGE_KEY = `editor_draft_${gameId}`;

async function saveDraft(document: GameDefinition) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
    document,
    savedAt: Date.now(),
    version: document.metadata.version,
  }));
}
```

### Server Sync (Explicit)
```typescript
// Save to server on explicit "Save" button press
async function saveToServer(gameId: string, document: GameDefinition) {
  const result = await trpc.games.update.mutate({
    id: gameId,
    definition: JSON.stringify(document),
  });
  return result;
}
```

### Conflict Resolution
Simple "last write wins" with version checking:
```typescript
interface SaveResult {
  success: boolean;
  conflict?: {
    serverVersion: number;
    localVersion: number;
    serverUpdatedAt: number;
  };
}

// On conflict: offer "Overwrite" or "Duplicate as copy"
```

---

## Performance Considerations

### Render Optimization
1. **Memoize entity renderers** - Only re-render changed entities
2. **Separate selection layer** - Selection overlay in its own Skia Group
3. **Debounce transforms** - Update physics 60fps, UI 30fps

### State Updates
1. **Batch updates** - Group related state changes
2. **Selective re-renders** - Context selectors for specific state slices
3. **History pruning** - Keep max 50 undo steps

### Memory
1. **Lazy load assets** - Only load visible asset thumbnails
2. **Unload on background** - Release Skia resources when app backgrounds
3. **Image caching** - Use expo-image-manipulator cache

---

## File Structure

```
app/
├── app/
│   └── editor/
│       └── [id].tsx              # Editor route
│
├── components/
│   └── editor/
│       ├── index.ts              # Barrel exports
│       ├── EditorProvider.tsx    # Context provider
│       ├── EditorTopBar.tsx      # Top navigation
│       ├── BottomDock.tsx        # Bottom navigation
│       ├── BottomSheetHost.tsx   # Sheet container
│       ├── InteractionLayer.tsx  # Gesture handling
│       ├── SelectionOverlay.tsx  # Selection visuals (Skia)
│       ├── QuickActions.tsx      # Contextual actions
│       │
│       └── panels/
│           ├── AssetsPanel.tsx
│           ├── PropertiesPanel.tsx
│           ├── LayersPanel.tsx
│           └── DebugPanel.tsx
│
├── lib/
│   └── editor/
│       ├── useEditorState.ts     # State hook
│       ├── useHistory.ts         # Undo/redo
│       ├── useGestures.ts        # Gesture abstractions
│       └── persistence.ts        # Storage helpers
```
