# Slopcade Editor Redesign - Master Plan

> **Vision**: Transform Slopcade into a mobile-first game editor with Instagram/CapCut-style UX that kids (ages 6-14) love to use.

**Last Updated**: 2026-01-22
**Status**: 🔄 **75% COMPLETE** - Core editor UI implemented (Phases 1-6 of 8)

---

## Executive Summary

### The Problem
Current UI is a basic prompt-based creation flow with limited editing capabilities. The asset management exists but is buried in modals. There's no true "editor" experience.

### The Solution
A unified, mobile-first game editor with:
- **Stage-first layout** - Canvas is always visible and interactive
- **Bottom-driven navigation** - All tools accessible via thumb-friendly bottom dock/sheet
- **Instagram/CapCut-style gestures** - Tap to select, drag to move, pinch to scale
- **Progressive disclosure** - Simple defaults, advanced options hidden but accessible

### Key Metrics
| Metric | Target |
|--------|--------|
| Time to first edit | < 5 seconds from opening |
| Gesture learning curve | Instant (uses familiar patterns) |
| Asset swap time | < 3 taps |
| Preview-to-edit toggle | < 1 second |

---

## Implementation Progress

| Phase | Description | Status |
|-------|-------------|--------|
| 1. Foundation | EditorProvider, TopBar, BottomDock, StageContainer | ✅ Complete |
| 2. Canvas Interaction | Tap/drag/pinch gestures, SelectionOverlay | ✅ Complete |
| 3. Bottom Sheet | @gorhom/bottom-sheet with tab panels | ✅ Complete |
| 4. Asset Library | AssetsPanel, AIGenerateModal, tap-to-add | ✅ Complete |
| 5. Properties | Full transform, physics, color editing | ✅ Complete |
| 6. History | Undo/redo with document snapshots | ✅ Complete |
| 7. Social | Fork, share, asset packs | ⏳ Pending |
| 8. Polish | Migration, testing, optimization | ⏳ Pending |

**Detailed Progress**: [PROGRESS.md](./PROGRESS.md)

## Planning Documents

| Document | Description | Status |
|----------|-------------|--------|
| [PROGRESS.md](./PROGRESS.md) | Implementation progress with commits | 🔄 Active |
| [01-architecture.md](./01-architecture.md) | UI architecture, component hierarchy, state management | ✅ Complete |
| [02-phases.md](./02-phases.md) | Implementation phases with dependencies and estimates | ✅ Complete |
| [03-components.md](./03-components.md) | Detailed component specifications | ✅ Complete |
| [04-api-design.md](./04-api-design.md) | API endpoints for social features | ✅ Complete |
| [05-wireframes.md](./05-wireframes.md) | ASCII wireframes and screen layouts | ✅ Complete |
| [06-migration.md](./06-migration.md) | Migration path from current to new UI | ✅ Complete |

---

## Quick Reference

### Screen Layout (Mobile Portrait)
```
┌─────────────────────────────────┐
│  ← │ ↶ ↷ │    Title    │ ▶ PLAY │  ← TopBar (56px)
├─────────────────────────────────┤
│                                 │
│                                 │
│           S T A G E             │  ← Full-bleed canvas
│        (Game Preview)           │
│                                 │
│    [Selection handles here]     │
│                                 │
├─────────────────────────────────┤
│  ➕    ✏️    📑    ⚡    •••   │  ← BottomDock (60px)
│  Add  Edit Layers Logic More   │
├─────────────────────────────────┤
│ ══════════════════════════════ │  ← BottomSheet (peek)
│ [Assets] [Props] [Layers] [AI] │
│                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ 🎮  │ │ 🎯  │ │ 🧱  │       │  ← Content grid
│  │Hero │ │Ball │ │Wall │       │
│  └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────┘
```

### Gesture Cheat Sheet
| Gesture | Action |
|---------|--------|
| Tap entity | Select |
| Tap empty | Deselect |
| Drag selected | Move |
| Pinch on selected | Scale |
| Rotate on selected | Rotate |
| Two-finger drag | Pan camera |
| Two-finger pinch (empty) | Zoom camera |
| Long-press entity | Quick actions menu |
| Double-tap entity | Edit primary property |

### Mode States
| Mode | Physics | Selection | Gestures | Bottom UI |
|------|---------|-----------|----------|-----------|
| **Edit** | Paused (dt=0) | Enabled | Transform | Full dock + sheet |
| **Playtest** | Running | Hidden | Game input | Minimal (Exit button) |

---

## Design Principles

### 1. Mobile-First, Always
- Everything reachable with thumbs
- Large hit targets (minimum 44pt)
- No hover states - all interactions work on touch
- Bottom-heavy UI (top of screen is hardest to reach)

### 2. Progressive Disclosure
- Show 3-5 properties by default, "More" for advanced
- Hide complexity until needed
- Presets before custom values

### 3. Instant Feedback
- Selections highlight immediately
- Transforms update in real-time
- Preview mode enters in < 1 second

### 4. Kid-Friendly Safety
- Undo always available and prominent
- No permanent deletes without confirmation
- Constrained transforms (min/max size)
- Snap guides prevent chaos

### 5. Familiar Patterns
- Copy Instagram/TikTok/CapCut patterns kids already know
- Avoid desktop metaphors (menus, toolbars, right-click)
- Bottom sheets, not modals

---

## Dependencies

### Required Packages (to add)
```json
{
  "@gorhom/bottom-sheet": "^4.x",
  "react-native-gesture-handler": "^2.x" (already installed),
  "react-native-reanimated": "^3.x" (already installed)
}
```

### Existing Code to Leverage
| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| GameRuntime | `app/lib/game-engine/GameRuntime.native.tsx` | Wrap with EditorController |
| EntityRenderer | `app/lib/game-engine/renderers/` | Use directly |
| EntityAssetList | `app/components/assets/` | Migrate to Assets panel |
| ParallaxAssetPanel | `app/components/assets/` | Migrate to Assets panel |
| Play screen asset modal | `app/app/play/[id].tsx` | Extract patterns |

---

## Success Criteria

### Phase 1 Complete ✅
- [x] Editor route loads with TopBar + Stage + BottomDock
- [x] Mode toggle switches between Edit and Playtest
- [x] Selection works (tap to select, tap empty to deselect)
- [x] Undo/Redo buttons are visible

### Phase 2 Complete ✅
- [x] Drag-to-move works for selected entities
- [x] Pinch-to-scale works
- [x] Selection shows visual handles
- [x] Camera pan/zoom works with two fingers

### Phase 3 Complete ✅
- [x] Bottom sheet opens with tabs
- [x] Layers panel shows all entities
- [x] Properties panel shows selected entity info
- [x] Assets panel shows asset library

### Phase 4 Complete ✅
- [x] Can add basic shapes from Assets panel
- [x] Can add entities from game templates
- [x] AI generation modal exists (placeholder)

### Phase 5 Complete ✅
- [x] Transform properties editable (position, scale, rotation)
- [x] Physics properties editable (bodyType, density, friction, restitution)
- [x] Color picker with presets

### Phase 6 Complete ✅
- [x] Undo restores previous state
- [x] Redo restores next state
- [x] All entity operations tracked in history

### Phase 7 Pending ⏳
- [ ] Can fork a game
- [ ] Can share a game link
- [ ] Can browse themed asset packs

### Phase 8 Pending ⏳
- [ ] Navigation links to new editor
- [ ] Old code cleaned up
- [ ] Cross-platform testing passed

---

## Related Documentation

- [System Architecture](../../architecture/system-overview.md)
- [Asset Integration Design](../../architecture/asset-integration-design.md)
- [Implementation Roadmap](../implementation-roadmap.md)
- [Current Work](../CURRENT_WORK.md)
