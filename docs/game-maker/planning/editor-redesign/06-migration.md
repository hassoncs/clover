# Migration Path

> **How to evolve from current UI to new editor**

---

## Current State Analysis

### What Exists Today

| Feature | Location | Status |
|---------|----------|--------|
| Game creation (AI prompt) | `app/(tabs)/maker.tsx` | Working |
| Game list | `app/(tabs)/maker.tsx` | Working |
| Game playback | `app/play/[id].tsx` | Working |
| Asset generation modal | `app/play/[id].tsx` | Working |
| Asset pack selection | `app/play/[id].tsx` | Working |
| Per-entity asset editing | `components/assets/EntityAssetList.tsx` | Working |
| Parallax management | `components/assets/ParallaxAssetPanel.tsx` | Working |
| Debug overlays | `app/play/[id].tsx` | Working |
| GameRuntime | `lib/game-engine/GameRuntime.native.tsx` | Working |

### Current User Flows

```
CURRENT FLOW:

Create Game:
Maker Tab → Enter Prompt → Generate → Preview → Save
                                        ↓
                               (Basic modal preview)

Play Game:
Maker Tab → My Projects → Tap Game → Play Screen
                                        ↓
                               Full GameRuntime with HUD

Edit Assets:
Play Screen → "🎨 Skin" Button → Modal
                                   ↓
                          Asset generation, pack switching,
                          per-entity editing, parallax
```

### Pain Points

1. **Asset editing is buried** - Hidden behind a button, then a modal
2. **No direct entity manipulation** - Can't tap/drag entities
3. **No property editing** - Can't change position, scale, physics
4. **Mode confusion** - Same screen for play and "editing"
5. **No layers view** - Can't see all entities at once

---

## Target State

### New User Flows

```
TARGET FLOW:

Create Game:
Maker Tab → Enter Prompt → Generate → Editor (Edit Mode)
                                        ↓
                               Full editing capabilities

Edit Game:
Maker Tab → My Projects → Tap Game → Editor (Edit Mode)
                                        ↓
                               OR Play (if user chooses)

Editor Flow:
┌─────────────────────────────────────────────────┐
│                    EDITOR                        │
│  ┌────────────────────────────────────────────┐ │
│  │ TopBar: Back, Undo/Redo, Title, Play/Edit  │ │
│  ├────────────────────────────────────────────┤ │
│  │                                            │ │
│  │              STAGE                         │ │
│  │   (tap to select, drag to move)            │ │
│  │                                            │ │
│  ├────────────────────────────────────────────┤ │
│  │ BottomDock: Add, Edit, Layers, Logic, More │ │
│  ├────────────────────────────────────────────┤ │
│  │ BottomSheet: Assets/Properties/Layers/Debug│ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

Playtest Flow (from Editor):
Editor (Edit Mode) → Tap "▶ PLAY" → Playtest Mode
                                      ↓
                             Full-screen game
                             Tap "✏️ EDIT" to return
```

---

## Migration Strategy

### Approach: Parallel Development

Build the new editor alongside the existing UI, then switch over.

```
Week 1-2: Build new editor (hidden behind feature flag)
Week 3:   Internal testing, bug fixes
Week 4:   Enable for all users, deprecate old modal
Week 5:   Remove old code
```

### Phase 1: Foundation (No User-Facing Changes)

**Goal:** Create new editor route that works but isn't linked yet.

1. Create `app/editor/[id].tsx`
2. Implement `EditorProvider` with basic state
3. Implement `EditorTopBar`, `BottomDock`, `StageContainer`
4. Verify GameRuntime works in new context
5. **Do NOT change existing routes or components**

**Validation:**
- Navigate directly to `/editor/{gameId}` 
- Game loads and displays
- Mode toggle works (Edit/Playtest)
- No regressions in existing app

### Phase 2: Core Editing (Still Hidden)

**Goal:** Entity selection and manipulation working.

1. Implement `InteractionLayer` with tap/drag/pinch
2. Implement `SelectionOverlay`
3. Add `BottomSheetHost` with tabs
4. Implement basic `LayersPanel` and `PropertiesPanel`
5. **Still no changes to existing UI**

**Validation:**
- Can select entities by tapping
- Can move entities by dragging
- Can scale entities by pinching
- Properties panel shows selected entity info
- Layers panel shows all entities

### Phase 3: Asset Integration

**Goal:** Migrate asset features into new editor.

1. Migrate `EntityAssetList` → `AssetsPanel`
2. Migrate `ParallaxAssetPanel` → `AssetsPanel`
3. Add AI generation UI to `AssetsPanel`
4. Implement `DebugPanel`

**Validation:**
- Can generate assets from editor
- Can swap assets on entities
- Can manage parallax layers
- Debug overlays work

### Phase 4: Polish & Connect

**Goal:** Make new editor the default experience.

1. Update navigation:
   - "Edit" button on game cards → `/editor/[id]`
   - After game creation → `/editor/[id]`
2. Add unsaved changes prompt
3. Add save button
4. Implement undo/redo

**Validation:**
- All entry points lead to new editor
- Unsaved changes warning works
- Save persists correctly
- Undo/redo works

### Phase 5: Cleanup

**Goal:** Remove old code.

1. Remove asset modal from `play/[id].tsx`
2. Remove unused components:
   - Old modal code in play screen
   - Redundant debug toggles
3. Simplify `play/[id].tsx` to just play (no editing)
4. Update documentation

**Validation:**
- No dead code
- Play screen is clean
- All features work through editor

---

## Feature Flag Strategy

### Implementation

```typescript
// lib/featureFlags.ts
export const FEATURE_FLAGS = {
  NEW_EDITOR: process.env.EXPO_PUBLIC_FF_NEW_EDITOR === 'true',
} as const;

// Usage
import { FEATURE_FLAGS } from '@/lib/featureFlags';

// In navigation
const editRoute = FEATURE_FLAGS.NEW_EDITOR 
  ? `/editor/${gameId}` 
  : `/play/${gameId}`;
```

### Rollout Plan

| Stage | Flag Value | Users |
|-------|------------|-------|
| Development | `true` (local only) | Developers |
| Alpha | `true` (staging) | Internal testers |
| Beta | `true` (10% rollout) | Beta users |
| GA | `true` (all) | Everyone |
| Cleanup | Remove flag | N/A |

---

## Data Migration

### No Schema Changes Required for Phase 1-4

The existing `GameDefinition` schema supports all new features:
- Entity transforms: Already stored
- Asset packs: Already supported
- Parallax: Already supported

### Future Schema Additions (Phase 5+)

For social features, add to database:

```sql
-- Run before enabling social features
ALTER TABLE games ADD COLUMN visibility TEXT DEFAULT 'private';
ALTER TABLE games ADD COLUMN share_slug TEXT UNIQUE;
ALTER TABLE games ADD COLUMN published_at INTEGER;
ALTER TABLE games ADD COLUMN parent_game_id TEXT;
ALTER TABLE games ADD COLUMN fork_count INTEGER DEFAULT 0;
```

---

## Rollback Plan

### If Issues Found Post-Launch

1. **Immediate:** Set `FEATURE_FLAGS.NEW_EDITOR = false`
2. **Short-term:** Fix bugs in new editor
3. **Re-deploy:** Enable flag again

### Rollback Triggers

- Crash rate > 1%
- User complaints > 10% increase
- Critical functionality broken

### Keeping Old Code During Transition

Old code locations to preserve until GA+2 weeks:

```
app/play/[id].tsx         # Keep asset modal code
components/assets/        # Keep existing components
```

---

## Testing Checklist

### Phase 1 Testing
- [ ] Editor route loads
- [ ] Game renders in Stage
- [ ] Mode toggle works
- [ ] Back navigation works
- [ ] No regressions in existing app

### Phase 2 Testing
- [ ] Tap to select entity
- [ ] Tap empty to deselect
- [ ] Drag to move entity
- [ ] Pinch to scale entity
- [ ] Two-finger pan camera
- [ ] Two-finger zoom camera
- [ ] Selection overlay visible
- [ ] Layers panel shows entities
- [ ] Properties panel shows selected

### Phase 3 Testing
- [ ] Assets panel shows library
- [ ] Can generate new asset
- [ ] Can apply asset to entity
- [ ] Parallax layer generation
- [ ] Debug toggles work

### Phase 4 Testing
- [ ] Entry points navigate correctly
- [ ] Unsaved changes prompt
- [ ] Save button works
- [ ] Undo/redo works
- [ ] Keyboard shortcuts (web)

### Phase 5 Testing
- [ ] Play screen works (no editing)
- [ ] No dead code warnings
- [ ] All documentation updated

---

## Communication Plan

### For Users

**In-App:**
- Toast: "🎉 New editor experience is here!"
- Coach marks for new features
- "?" button for help

**Release Notes:**
```markdown
## New Game Editor! 🎮

We've completely redesigned how you edit games:

- **Tap to select** - Touch any object to select it
- **Drag to move** - Move objects where you want them
- **Pinch to scale** - Make things bigger or smaller
- **Instant preview** - Hit Play to test anytime

Plus all your favorite features:
- AI asset generation
- Parallax backgrounds
- Debug tools

Let us know what you think! 💬
```

### For Developers

- Update AGENTS.md with new component locations
- Update README with editor architecture
- Add inline code comments
- Deprecation warnings on old code

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Performance regression | Profile before/after, optimize hot paths |
| User confusion | Coach marks, help tooltips |
| Data loss | Auto-save every 30 seconds |
| Gesture conflicts | Extensive gesture testing matrix |
| Breaking changes | Feature flag, gradual rollout |

---

## Success Metrics

### Technical
- [ ] No increase in crash rate
- [ ] No increase in ANR rate
- [ ] <100ms selection response time
- [ ] <16ms per frame during editing

### User Experience
- [ ] Time to first edit < 5 seconds
- [ ] Asset swap < 3 taps
- [ ] Edit-to-play toggle < 1 second

### Adoption
- [ ] 80% of users use new editor within 2 weeks
- [ ] <5% rollback to play-only mode
- [ ] Positive sentiment in reviews
