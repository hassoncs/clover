# Implementation Phases

> **Detailed phase breakdown with dependencies and time estimates**

---

## Phase Overview

| Phase | Name | Duration | Dependencies | Status |
|-------|------|----------|--------------|--------|
| 1 | Foundation & Layout | 2-3 days | None | Not Started |
| 2 | Canvas Interaction | 2-3 days | Phase 1 | Not Started |
| 3 | Bottom Sheet & Panels | 2-3 days | Phase 1 | Not Started |
| 4 | Asset Library & AI | 2 days | Phase 3 | Not Started |
| 5 | Properties & Editing | 2 days | Phases 2, 3 | Not Started |
| 6 | History (Undo/Redo) | 1 day | Phase 5 | Not Started |
| 7 | Social Features | 2-3 days | Phase 1 | Not Started |
| 8 | Polish & Migration | 2 days | All | Not Started |

**Total Estimated: 15-19 days**

---

## Phase 1: Foundation & Layout (2-3 days)

### Goal
Create the basic editor shell with TopBar, Stage, and BottomDock. Get mode switching working.

### Tasks

#### 1.1 Create Editor Route
**File**: `app/app/editor/[id].tsx`

```typescript
// Responsibilities:
// - Load game definition by ID
// - Wrap with EditorProvider
// - Render EditorLayout
```

**Acceptance Criteria**:
- [ ] Route loads without errors
- [ ] Shows game title in header
- [ ] Can navigate back

#### 1.2 Implement EditorProvider
**File**: `app/components/editor/EditorProvider.tsx`

```typescript
// State to manage:
// - mode: 'edit' | 'playtest'
// - selectedEntityId: string | null
// - activeTab: string
// - document: GameDefinition
```

**Acceptance Criteria**:
- [ ] Context provides state to children
- [ ] State updates propagate correctly
- [ ] Mode toggle works

#### 1.3 Build EditorTopBar
**File**: `app/components/editor/EditorTopBar.tsx`

```
┌─────────────────────────────────────────┐
│  [←]  [↶][↷]     Title      [▶ PLAY]   │
└─────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Back button navigates to previous screen
- [ ] Undo/Redo buttons visible (disabled initially)
- [ ] Title shows game name
- [ ] Play/Edit toggle changes mode

#### 1.4 Build BottomDock
**File**: `app/components/editor/BottomDock.tsx`

```
┌─────────────────────────────────────────┐
│   [➕]   [✏️]   [📑]   [⚡]   [•••]    │
│   Add    Edit   Layers  Logic   More   │
└─────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] All 5 buttons render
- [ ] Buttons have labels
- [ ] Active tab highlighted
- [ ] Hidden in Playtest mode

#### 1.5 Integrate Stage
**File**: `app/components/editor/StageContainer.tsx`

- Wrap existing GameRuntime
- Pass `paused={mode === 'edit'}`
- Fill available space

**Acceptance Criteria**:
- [ ] Game renders in stage area
- [ ] Physics paused in Edit mode
- [ ] Physics runs in Playtest mode

### Deliverables
- Editor route with basic navigation
- Mode toggle (Edit ↔ Playtest)
- Visual shell matching mockups

### Dependencies
- None (this is the foundation)

---

## Phase 2: Canvas Interaction (2-3 days)

### Goal
Implement Instagram-style tap/drag/pinch gestures for entity manipulation.

### Tasks

#### 2.1 Selection System
**File**: `app/components/editor/InteractionLayer.tsx`

```typescript
// Gesture handlers:
// - Tap: Select entity at point (physics query)
// - Tap empty: Deselect all
// - Double-tap: Edit primary property
```

**Acceptance Criteria**:
- [ ] Tapping entity selects it
- [ ] Tapping empty area deselects
- [ ] Selection state in context updates

#### 2.2 Selection Overlay
**File**: `app/components/editor/SelectionOverlay.tsx`

```
┌─────────────────────┐
│  ○               ○  │   ← Corner handles (scale)
│                     │
│      Entity         │   ← Bounding box outline
│                     │
│  ○               ○  │
└─────────────────────┘
        ◎              ← Rotation handle (optional)
```

**Acceptance Criteria**:
- [ ] Blue bounding box around selected entity
- [ ] Corner handles visible
- [ ] Overlay tracks entity position/rotation

#### 2.3 Drag to Move
```typescript
// In InteractionLayer:
// - PanGesture on selected entity
// - Update entity.transform.x/y
// - Visual feedback during drag
```

**Acceptance Criteria**:
- [ ] Can drag selected entity
- [ ] Entity follows finger
- [ ] Position persists after release

#### 2.4 Pinch to Scale
```typescript
// PinchGesture on selected entity:
// - Scale relative to center
// - Min/max constraints (0.25x - 4x)
// - Show scale indicator
```

**Acceptance Criteria**:
- [ ] Pinch gesture scales entity
- [ ] Scale constrained to valid range
- [ ] Works smoothly

#### 2.5 Camera Pan/Zoom
```typescript
// Two-finger gestures on empty canvas:
// - Pan: Move camera position
// - Pinch: Zoom camera
```

**Acceptance Criteria**:
- [ ] Two-finger drag pans camera
- [ ] Two-finger pinch zooms camera
- [ ] Doesn't conflict with entity gestures

### Deliverables
- Tap-to-select working
- Drag-to-move working
- Pinch-to-scale working
- Camera navigation working

### Dependencies
- Phase 1 (Editor shell)

---

## Phase 3: Bottom Sheet & Panels (2-3 days)

### Goal
Implement the multi-tab bottom sheet with snap points.

### Tasks

#### 3.1 Install & Configure Bottom Sheet
```bash
pnpm add @gorhom/bottom-sheet
```

**File**: `app/components/editor/BottomSheetHost.tsx`

```typescript
// Configuration:
// - Snap points: ['10%', '50%', '90%']
// - Tab header inside sheet
// - Content switches based on activeTab
```

**Acceptance Criteria**:
- [ ] Sheet renders at peek height
- [ ] Can drag to half/full
- [ ] Snaps to defined points

#### 3.2 Sheet Tab Navigation
```
┌─────────────────────────────────────────┐
│ ════════════════════════════════════════│  ← Drag handle
│ [Assets] [Properties] [Layers] [Debug]  │  ← Tab row
├─────────────────────────────────────────┤
│                                         │
│            Tab Content                  │
│                                         │
└─────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Tabs are tappable
- [ ] Active tab highlighted
- [ ] Content switches instantly

#### 3.3 Layers Panel
**File**: `app/components/editor/panels/LayersPanel.tsx`

```
┌─────────────────────────────────────────┐
│ 🔍 Search layers...                     │
├─────────────────────────────────────────┤
│ ☐ 👁 🔒  Player          [↑][↓]        │
│ ☑ 👁 🔒  Platform-1      [↑][↓]        │
│ ☐ 👁 🔒  Enemy-1         [↑][↓]        │
│ ☐ 👁 🔒  Ground          [↑][↓]        │
└─────────────────────────────────────────┘
```

Features:
- List all entities from EntityManager
- Select row to select entity
- Toggle visibility (👁)
- Toggle lock (🔒)
- Reorder (drag or arrows)

**Acceptance Criteria**:
- [ ] Shows all entities
- [ ] Tapping row selects entity
- [ ] Visibility toggle works
- [ ] Reorder works

#### 3.4 Properties Panel (Basic)
**File**: `app/components/editor/panels/PropertiesPanel.tsx`

```
┌─────────────────────────────────────────┐
│ Player                                  │
├─────────────────────────────────────────┤
│ POSITION                                │
│ X: [━━━━━●━━] 5.2                       │
│ Y: [━━●━━━━━] 2.0                       │
├─────────────────────────────────────────┤
│ TRANSFORM                               │
│ Scale:    [━━━━●━━━━] 1.0               │
│ Rotation: [●━━━━━━━━] 0°                │
├─────────────────────────────────────────┤
│ [More Properties ▼]                     │
└─────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Shows selected entity properties
- [ ] Sliders update entity
- [ ] Shows "Select an entity" when none selected

#### 3.5 Debug Panel
**File**: `app/components/editor/panels/DebugPanel.tsx`

```
┌─────────────────────────────────────────┐
│ DEBUG OPTIONS                           │
├─────────────────────────────────────────┤
│ [✓] Show Physics Bounds                 │
│ [✓] Show Sprite Bounds                  │
│ [ ] Show Entity IDs                     │
│ [ ] Show FPS                            │
├─────────────────────────────────────────┤
│ ASSET ALIGNMENT                         │
│ Selected: Player                        │
│ Offset X: [━━━●━━━━] 0px                │
│ Offset Y: [━━━●━━━━] 0px                │
└─────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Toggle switches work
- [ ] Overlays show/hide
- [ ] Asset offset controls work

### Deliverables
- Bottom sheet with 3 snap points
- Tab navigation
- Layers panel
- Basic properties panel
- Debug panel

### Dependencies
- Phase 1 (Editor shell)

---

## Phase 4: Asset Library & AI (2 days)

### Goal
Build the asset browser and integrate AI generation.

### Tasks

#### 4.1 Assets Panel Structure
**File**: `app/components/editor/panels/AssetsPanel.tsx`

```
┌─────────────────────────────────────────┐
│ 🔍 Search assets...                     │
├─────────────────────────────────────────┤
│ [Characters] [Props] [Backgrounds] [FX] │
├─────────────────────────────────────────┤
│ RECENT                                  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│ │ 🎮 │ │ 🎯 │ │ 🧱 │ │ ⭐ │            │
│ └────┘ └────┘ └────┘ └────┘            │
├─────────────────────────────────────────┤
│ FROM THIS GAME                          │
│ ┌────┐ ┌────┐                           │
│ │Hero│ │Wall│                           │
│ └────┘ └────┘                           │
├─────────────────────────────────────────┤
│ [✨ Generate with AI]                   │
└─────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Category chips filter results
- [ ] Grid shows asset thumbnails
- [ ] Tapping asset adds to stage
- [ ] Drag-to-stage works

#### 4.2 AI Generation UI
**File**: `app/components/editor/panels/AIGenerateModal.tsx`

```
┌─────────────────────────────────────────┐
│ ✨ Generate Asset with AI               │
├─────────────────────────────────────────┤
│ Describe what you want:                 │
│ ┌─────────────────────────────────────┐ │
│ │ A friendly red robot with wheels    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Style: [Pixel ▼]                        │
│                                         │
│ [Cancel]              [Generate]        │
├─────────────────────────────────────────┤
│ ⏳ Generating...                        │
├─────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│ │ V1 │ │ V2 │ │ V3 │ │ V4 │ ← Results  │
│ └────┘ └────┘ └────┘ └────┘            │
│                                         │
│ [Use Selected]                          │
└─────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Prompt input works
- [ ] Style dropdown (pixel/cartoon/3d/flat)
- [ ] Shows generation progress
- [ ] Displays generated options
- [ ] Can apply to selected entity or add new

#### 4.3 Asset Application
```typescript
// When asset selected/generated:
// 1. If entity selected → replace its asset
// 2. If no selection → add new entity with asset
// 3. Update assetOverrides in document
```

**Acceptance Criteria**:
- [ ] Can swap asset on existing entity
- [ ] Can add new entity with asset
- [ ] Changes persist in document

### Deliverables
- Asset browsing panel
- Category filtering
- AI generation modal
- Asset application to entities

### Dependencies
- Phase 3 (Bottom sheet)

---

## Phase 5: Properties & Editing (2 days)

### Goal
Full property editing for all entity types.

### Tasks

#### 5.1 Transform Properties
- Position (X, Y) with sliders + numeric input
- Scale (uniform or X/Y separate)
- Rotation (degrees with snap to 0/90/180/270)

#### 5.2 Physics Properties
- Body type (static/dynamic/kinematic)
- Density, Friction, Restitution sliders
- Sensor toggle

#### 5.3 Sprite Properties
- Color picker
- Opacity slider
- Asset selector (opens Assets panel)

#### 5.4 Behavior List
- Show attached behaviors
- Edit behavior parameters
- Add/remove behaviors

### Deliverables
- Full property editor
- All entity types supported
- Behavior editing

### Dependencies
- Phase 3 (Properties panel shell)
- Phase 2 (Selection)

---

## Phase 6: History (Undo/Redo) (1 day)

### Goal
Track all edits and enable undo/redo.

### Tasks

#### 6.1 History Stack
**File**: `app/lib/editor/useHistory.ts`

```typescript
// Track actions:
// - Move, Scale, Rotate
// - Add/Delete entity
// - Property changes
// - Max 50 steps
```

#### 6.2 Undo/Redo Logic
- Push action with before/after state
- Undo: revert to before state, move to redo stack
- Redo: apply after state, move to undo stack

#### 6.3 UI Integration
- Enable/disable undo/redo buttons
- Keyboard shortcuts (web): Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z

### Deliverables
- Working undo/redo
- History limited to 50 actions
- Keyboard shortcuts on web

### Dependencies
- Phase 5 (All editing operations)

---

## Phase 7: Social Features (2-3 days)

### Goal
Implement sharing, forking, and themed asset packs.

### Tasks

#### 7.1 API Endpoints
See [04-api-design.md](./04-api-design.md) for full specifications.

- `games.fork(id)` - Clone game
- `games.share(id)` - Get/create share link
- `games.getByShareSlug(slug)` - Load shared game
- `assetPacks.list()` - Browse themed packs
- `assetPacks.apply(gameId, packId)` - Apply pack

#### 7.2 Fork UI
- "Fork" button in editor
- Creates copy with attribution
- Opens copy in editor

#### 7.3 Share UI
- "Share" button in editor
- Shows shareable link
- Copy to clipboard
- QR code (optional)

#### 7.4 Asset Pack Browser
- Browse themed packs
- Preview pack contents
- Apply pack to game

### Deliverables
- Fork functionality
- Share links
- Asset pack browser

### Dependencies
- Phase 1 (Editor shell)

---

## Phase 8: Polish & Migration (2 days)

### Goal
Final polish, bug fixes, and migration from old UI.

### Tasks

#### 8.1 Update Navigation
- Point all "Edit" actions to new editor
- Remove old editor route
- Update deep links

#### 8.2 Remove Old Code
- Delete unused modal code from Play screen
- Clean up old asset management UI
- Remove deprecated components

#### 8.3 Performance Optimization
- Profile and fix any jank
- Optimize re-renders
- Image loading optimization

#### 8.4 Testing
- Manual testing on iOS, Android, Web
- Fix platform-specific issues
- Accessibility check (VoiceOver, TalkBack)

#### 8.5 Documentation
- Update README
- Add code comments
- Update AGENTS.md

### Deliverables
- Production-ready editor
- No regression from old flow
- Clean codebase

### Dependencies
- All previous phases

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gesture conflicts | High | Clear gesture priority rules |
| Bottom sheet performance | Medium | Lazy load panel content |
| Physics pause issues | Medium | Test thoroughly, add fallbacks |
| Breaking existing flows | High | Feature flag for gradual rollout |
| Asset generation latency | Low | Show progress, allow cancel |

---

## Definition of Done

A phase is complete when:
1. All acceptance criteria pass
2. No TypeScript errors (`tsc --noEmit`)
3. Works on iOS simulator
4. Works on web
5. Code reviewed/self-reviewed
6. Committed with descriptive message
