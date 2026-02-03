# Properties Panel & Context Menu Specification

**Date**: 2026-01-27  
**Context**: Web inspector sidebar with rich property editing and right-click context menu  
**Platform**: Web only (desktop)

---

## Available Data from GodotDebugBridge

Based on the types, here's what information we can display:

### EntitySnapshot (Basic Info)
```typescript
{
  id: string;                    // Entity ID
  template: string;              // Template name
  position: { x, y };            // World position
  angle: number;                 // Rotation in radians
  velocity?: { x, y };           // Linear velocity
  angularVelocity?: number;      // Angular velocity
  aabb?: { minX, minY, maxX, maxY }; // Bounding box
  visible?: boolean;             // Is visible
  zIndex?: number;               // Render order
  tags?: string[];               // Entity tags
  behaviors?: string[];          // Behavior names
}
```

### EntityPhysicsInfo (Physics Details)
```typescript
{
  bodyType: 'static' | 'dynamic' | 'kinematic' | 'sensor';
  mass?: number;
  isSleeping?: boolean;
  isSensor?: boolean;
  collisionLayer?: number;       // Physics layer
  collisionMask?: number;        // What it collides with
  linearDamping?: number;
  angularDamping?: number;
  gravityScale?: number;
  fixedRotation?: boolean;
  ccd?: boolean;                 // Continuous collision detection
  enabled?: boolean;
  velocity?: { x, y };
  angularVelocity?: number;
  material?: {
    friction: number;            // 0-1
    restitution: number;         // Bounciness 0-1
  };
}
```

### QueryMatch (Hierarchy Info)
```typescript
{
  entityId: string;
  name: string;
  template?: string;
  tags?: string[];
  path?: string;                 // Hierarchy path (e.g., "root/child/grandchild")
  parentId?: string;
  childrenIds?: string[];
  transform?: {
    position: Vec2;
    rotation: number;
    scale: Vec2;
    localPosition: Vec2;         // Relative to parent
    localRotation: number;
    localScale: Vec2;
  };
}
```

### GameSnapshot (World Info)
```typescript
{
  world: {
    pixelsPerMeter: number;
    gravity: { x, y };
    bounds: { width, height };
  };
  camera: {
    position: { x, y };
    zoom: number;
    target?: string;             // Entity camera is following
  };
  gameState?: {
    score?: number;
    lives?: number;
    time?: number;
    state?: string;              // Game state machine state
    variables?: Record<string, unknown>;
  };
}
```

---

## Properties Panel Design

### Layout: Accordion Sections

```
┌─────────────────────────────┐
│ 🎯 Entity: player_1         │  ← Header
│ Template: player            │
├─────────────────────────────┤
│ ▶ Transform                 │  ← Collapsible
│   Position: 12.5, 8.3       │
│   Rotation: 45°             │
│   Scale: 1.0, 1.0           │
├─────────────────────────────┤
│ ▶ Physics                   │
│   Body Type: dynamic        │
│   Mass: 1.2 kg              │
│   Velocity: 5.2, -2.1       │
│   Sleeping: No              │
│   Friction: 0.3             │
│   Restitution: 0.5          │
├─────────────────────────────┤
│ ▶ Hierarchy                 │
│   Parent: game_world        │
│   Children: 3               │
│   └─ gun                    │
│   └─ shield                 │
│   └─ health_bar             │
├─────────────────────────────┤
│ ▶ Behaviors (2)             │
│   ☑ move_with_input         │
│   ☑ jump_on_tap             │
├─────────────────────────────┤
│ ▶ Tags                      │
│   🏷️ player                  │
│   🏷️ character               │
├─────────────────────────────┤
│ ▶ Render                    │
│   Visible: ☑                │
│   Z-Index: 10               │
│   Opacity: 100%             │
├─────────────────────────────┤
│ ▶ Advanced                  │
│   ID: player_1              │
│   AABB: { ... }             │
│   [View Raw JSON]           │
└─────────────────────────────┘
```

---

## Section Details

### 1. Header Section (Always Visible)
**Data**: `EntitySnapshot.id`, `EntitySnapshot.template`

**Fields**:
- Entity ID (read-only, monospace font)
- Template name (clickable → jump to template definition)
- Quick actions: Delete, Duplicate, Focus in viewport

### 2. Transform Section
**Data**: `QueryMatch.transform`, `EntitySnapshot.position`, `EntitySnapshot.angle`

**Fields**:
| Field | Type | Editable | Notes |
|-------|------|----------|-------|
| Position X | number | ✅ | World coordinates (meters) |
| Position Y | number | ✅ | World coordinates (meters) |
| Rotation | degrees | ✅ | Converted from radians |
| Scale X | number | ✅ | Local scale |
| Scale Y | number | ✅ | Local scale |
| Local X | number | ⚠️ Read-only | Relative to parent |
| Local Y | number | ⚠️ Read-only | Relative to parent |

**UI**: 
- Number inputs with steppers
- Copy/paste buttons for position
- "Reset" button to template defaults

### 3. Physics Section
**Data**: `EntityPhysicsInfo`

**Fields**:
| Field | Type | Editable | Notes |
|-------|------|----------|-------|
| Body Type | enum | ✅ | static/dynamic/kinematic/sensor |
| Mass | kg | ⚠️ | Read-only if bodyType is static |
| Velocity X | m/s | ✅ | Linear velocity |
| Velocity Y | m/s | ✅ | Linear velocity |
| Angular Velocity | deg/s | ✅ | Rotation speed |
| Is Sleeping | boolean | ⚠️ Toggle | Wake/sleep toggle |
| Is Sensor | boolean | ✅ | Detects collisions only |
| Friction | 0-1 | ✅ | Material friction |
| Restitution | 0-1 | ✅ | Bounciness |
| Linear Damping | number | ✅ | Velocity decay |
| Angular Damping | number | ✅ | Rotation decay |
| Gravity Scale | number | ✅ | Gravity multiplier |
| Fixed Rotation | boolean | ✅ | Prevent rotation |
| CCD | boolean | ✅ | Continuous collision detection |
| Collision Layer | bitmask | ✅ | Dropdown with layer names |
| Collision Mask | bitmask | ✅ | Dropdown with layer names |

**UI**:
- Body type dropdown
- Sliders for friction/restitution (0-1)
- Toggle switches for booleans
- "Wake Body" button if sleeping

### 4. Hierarchy Section
**Data**: `QueryMatch.parentId`, `QueryMatch.childrenIds`, `QueryMatch.path`

**Fields**:
- Parent: Link to parent entity (click to select)
- Children: List of child entities (click to select)
- Path: Breadcrumb path (e.g., world > level1 > player)

**UI**:
- Parent dropdown (can re-parent)
- Children as clickable chips
- "Make Root" button (detach from parent)

### 5. Behaviors Section
**Data**: `EntitySnapshot.behaviors`

**Fields**:
- List of behavior names
- Toggle to enable/disable each
- "+ Add Behavior" button

**UI**:
- Checkboxes for each behavior
- Expandable to show behavior parameters
- Color-coded by behavior type

### 6. Tags Section
**Data**: `EntitySnapshot.tags`

**Fields**:
- Tag chips (clickable to filter)
- "+ Add Tag" input with autocomplete
- Remove tag (× button)

**UI**:
- Colored chips
- Typeahead search for existing tags
- Bulk tag operations

### 7. Render Section
**Data**: `QueryMatch.render`, `EntitySnapshot.visible`, `EntitySnapshot.zIndex`

**Fields**:
| Field | Type | Editable |
|-------|------|----------|
| Visible | toggle | ✅ |
| Z-Index | number | ✅ |
| Opacity | % | ✅ (if available) |
| Modulate Color | color picker | ✅ (if available) |

### 8. Advanced Section (Collapsed by default)
**Data**: Raw entity data

**Fields**:
- Entity ID
- AABB bounds
- Screen bounds
- Raw JSON viewer (collapsible)

---

## Right-Click Context Menu Specification

### Vision
Right-click on game viewport to see all entities under the cursor, nested by depth (topmost first).

### User Flow

```
1. User right-clicks on game viewport
2. Menu appears at cursor position
3. Menu shows: "Entities at this point"
4. List shows all entities sorted by Z-index (top first)
5. Each item shows: icon + name + template
6. Hovering entity in menu highlights it in game
7. Clicking entity:
   - Selects it
   - Opens properties panel
   - Closes context menu
```

### Menu Structure

```
┌─────────────────────────────────────┐
│ Entities at (125.5, 84.2)           │ ← Header
├─────────────────────────────────────┤
│ 👆 ui_health_bar [ui]               │ ← Topmost (mouse is directly on this)
│ ├─ 🔧 HealthBarController           │   └─ Shows component/script icon
│ ├─ 🎨 SpriteRenderer                │
├─────────────────────────────────────┤
│ 🎯 player_1 [character]             │ ← Next entity down
│ ├─ 🎮 PlayerController              │
│ ├─ 🔵 CircleCollider                │
│ ├─ 🎨 SpriteRenderer                │
│ ├─ 🔫 gun [weapon]                  │   ← Child entity (indented)
│ │  ├─ 🔵 BoxCollider                │
│ │  └─ 🎨 SpriteRenderer             │
│ └─ 🛡️ shield [equipment]            │   ← Another child
├─────────────────────────────────────┤
│ 📦 crate_3 [obstacle]               │ ← Bottom entity
│ ├─ 🔵 BoxCollider                   │
│ └─ 🎨 SpriteRenderer                │
├─────────────────────────────────────┤
│ ─────────────                       │
│ 📋 Copy Position                    │ ← Actions
│ 🎯 Focus Camera Here                │
│ 📸 Inspect in Detail                │
└─────────────────────────────────────┘
```

### Implementation

**Step 1: Capture Right-Click**
```typescript
// In InteractionLayer.web.tsx
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault(); // Prevent browser context menu
  
  const screenPos = { x: e.clientX, y: e.clientY };
  const worldPos = GodotDebugBridge.screenToWorld(screenPos);
  
  // Query all entities at this point
  const entities = await GodotDebugBridge.queryPoint(worldPos.x, worldPos.y);
  
  // Show context menu
  showContextMenu({
    position: screenPos,
    entities: sortByZIndex(entities),
  });
};
```

**Step 2: Query Entities at Point**
```typescript
// Use raycast or queryPoint to get all entities
const getEntitiesAtPoint = async (worldPos: Vec2) => {
  // Option 1: Use raycast to get all intersecting entities
  const result = await GodotDebugBridge.raycast({
    from: { x: worldPos.x, y: worldPos.y - 0.001 },
    to: { x: worldPos.x, y: worldPos.y + 0.001 },
  });
  
  // Option 2: Use queryPoint
  const pointResult = await GodotDebugBridge.queryPoint(
    worldPos.x, 
    worldPos.y,
    { includeSensors: true }
  );
  
  // Sort by Z-index (highest first = topmost)
  return result.hits.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
};
```

**Step 3: Build Nested Menu**
```typescript
const buildContextMenuItems = (entities: EntityAtPoint[]) => {
  return entities.map(entity => ({
    id: entity.id,
    label: entity.name,
    template: entity.template,
    icon: getEntityIcon(entity),
    zIndex: entity.zIndex,
    depth: calculateDepth(entity), // For indentation
    children: entity.childrenIds?.map(childId => ({
      // Recursively build child items
    })),
    onHover: () => highlightEntity(entity.id),
    onClick: () => selectEntity(entity.id),
  }));
};
```

### Menu Features

**Visual Indicators**:
- 🎨 = Has sprite/renderer
- 🔵 = Has collider
- 🔧 = Has behavior/script
- 👆 = Mouse is directly on this (topmost)
- Indentation shows parent-child relationships

**Interactions**:
- **Hover**: Highlight entity in game (yellow outline)
- **Click**: Select entity and close menu
- **Ctrl+Click**: Multi-select
- **Right-click on item**: Sub-menu (Delete, Duplicate, etc.)

**Actions Section** (bottom of menu):
- Copy position to clipboard
- Focus camera on this point
- Open detailed inspector
- Create entity at this point

### Styling

```typescript
const contextMenuStyles = {
  container: {
    position: 'absolute',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
    minWidth: 250,
    maxHeight: 400,
    overflow: 'auto',
  },
  header: {
    padding: '8px 12px',
    borderBottom: '1px solid #374151',
    color: '#9CA3AF',
    fontSize: 12,
  },
  item: {
    padding: '8px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  itemHover: {
    backgroundColor: '#374151',
  },
  itemTopmost: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)', // Indigo tint
  },
  indent: (depth: number) => ({
    paddingLeft: 12 + depth * 16,
  }),
};
```

---

## Click to Inspect Mode

### Toggle
In Debug panel, add toggle: "🔍 Inspect Mode"

### Behavior
When enabled:
1. Cursor changes to crosshair
2. Hovering entity shows tooltip: "entity_name [template]"
3. Click selects entity
4. Shift+Click adds to multi-select
5. Escape exits inspect mode

### Implementation
```typescript
const InspectModeOverlay = () => {
  const { inspectMode, hoveredEntity } = useInspector();
  
  if (!inspectMode) return null;
  
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Crosshair cursor via CSS */}
      <style>{`
        body { cursor: crosshair !important; }
      `}</style>
      
      {/* Hover tooltip */}
      {hoveredEntity && (
        <Tooltip
          position={hoveredEntity.screenPosition}
          text={`${hoveredEntity.name} [${hoveredEntity.template}]`}
        />
      )}
      
      {/* Highlight */}
      {hoveredEntity && (
        <HighlightBox bounds={hoveredEntity.screenBounds} />
      )}
    </View>
  );
};
```

---

## API Integration Summary

### For Properties Panel
```typescript
// Fetch entity data
const snapshot = await GodotDebugBridge.getSnapshot({ detail: 'high' });
const entity = snapshot.entities.find(e => e.id === entityId);

// Fetch full properties
const props = await GodotDebugBridge.getAllProps(entityId);

// Fetch hierarchy info
const query = await GodotDebugBridge.queryAsync(/* selector */);
```

### For Context Menu
```typescript
// Get entities at point
const worldPos = GodotDebugBridge.screenToWorld(screenPos);
const raycast = await GodotDebugBridge.raycast({
  from: worldPos,
  to: { x: worldPos.x, y: worldPos.y + 0.001 },
});

// Or use queryPoint
const pointResult = await GodotDebugBridge.queryPoint(worldPos.x, worldPos.y);
```

### For Hover/Highlight
```typescript
// Poll at low frequency while inspect mode is on
useEffect(() => {
  if (!inspectMode) return;
  
  const interval = setInterval(async () => {
    const mousePos = getMousePosition();
    const worldPos = GodotDebugBridge.screenToWorld(mousePos);
    const result = await GodotDebugBridge.queryPoint(worldPos.x, worldPos.y);
    setHoveredEntity(result.entity);
  }, 100); // 10Hz polling
  
  return () => clearInterval(interval);
}, [inspectMode]);
```

---

## Mobile Simplified Version

On mobile, replace context menu with:

### Long-Press Menu
1. User long-presses on entity
2. Show action sheet:
   - "Inspect Entity"
   - "Focus Camera"
   - "Copy Position"
   - Cancel

### Simple Entity List
In bottom sheet Debug tab:
- Flat list of all entities
- Search bar at top
- Tap to select
- Swipe to delete

---

## Next Steps

1. **Start with Properties Panel**: Show basic transform info
2. **Add Right-Click Menu**: Query point → show list
3. **Add Inspect Mode**: Toggle + hover highlights
4. **Iterate**: Add more sections based on usage

---

*This specification provides a roadmap for rich inspector functionality on web/desktop.*
