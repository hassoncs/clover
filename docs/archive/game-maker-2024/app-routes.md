# App Route Architecture

This document describes the Expo Router structure for the game maker application.

## Route Overview

```
app/
├── index.tsx              → Redirects to /(tabs)/maker
├── _layout.tsx            → Root layout (Stack navigator)
│
├── (tabs)/                → Main tab navigation
│   ├── _layout.tsx        → Tab bar configuration
│   ├── lab.tsx            → Physics Lab (engine demos)
│   ├── maker.tsx          → Game Maker (projects + templates + create)
│   └── gallery.tsx        → Engine Gallery (feature showcase)
│
├── examples/              → Physics demo screens
│   ├── _layout.tsx        → Stack layout for examples
│   ├── avalanche.tsx
│   ├── bridge.tsx
│   ├── car.tsx
│   ├── dominoes.tsx
│   ├── pendulum.tsx
│   ├── pinball.tsx
│   ├── ragdoll.tsx
│   └── ... (17 total)
│
├── play/
│   ├── [id].tsx           → Play saved game by ID (from DB)
│   └── preview.tsx        → Play unsaved game (from JSON param)
│
├── test-games/
│   └── [id].tsx           → Play template game (from registry)
│
├── editor/
│   └── [id].tsx           → Edit game (currently re-exports play/[id])
│
├── maker/
│   └── index.tsx          → Standalone dashboard (alternate entry)
│
└── gallery/
    ├── _layout.tsx
    ├── index.tsx          → Gallery home
    └── [section]/
        ├── index.tsx      → Section list (effects, particles, etc.)
        └── [id].tsx       → Individual item viewer
```

## Tab Structure

### Lab Tab (`/(tabs)/lab`)
Physics engine demonstrations using raw Box2D + Skia.

- Lists examples from `EXAMPLES` registry
- Each example opens in `/examples/[name]`
- Shows low-level physics capabilities

### Maker Tab (`/(tabs)/maker`)
Central hub for game creation and management.

**Three internal sub-tabs:**
1. **My Projects** - Saved games from database (`trpc.games.listByInstall`)
2. **Templates** - Built-in game templates from `TESTGAMES` registry
3. **Create** - AI-powered game generation with prompt input

**User flows:**
- Create game → Preview → Save → Appears in My Projects
- My Projects item → Opens `/play/[id]`
- Template item → Opens `/test-games/[id]`

### Gallery Tab (`/(tabs)/gallery`)
Showcase of engine capabilities organized by category.

Categories: Effects, Particles, Behaviors, Sprites, Physics
Each item can be previewed in isolation.

## Play Routes

### `/play/[id]` - Saved Game Player
- Fetches game from database via `trpc.games.getByGameId`
- Full-featured player with debug controls
- Skin button for asset generation
- Debug toggle (VIS/PRIM +DBG modes)

### `/play/preview` - Unsaved Game Preview
- Receives `GameDefinition` as JSON URL parameter
- Minimal UI (back button + "PREVIEW" badge)
- Used after AI generation, before saving

### `/test-games/[id]` - Template Player
- Loads game from `TESTGAMES` registry
- Same debug controls as `/play/[id]`
- No skin generation (templates are pre-defined)

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Maker Tab                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ My Projects │  │  Templates  │  │   Create    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         │ Game ID        │ Template ID    │ GameDefinition  │
│         ▼                ▼                ▼                 │
└─────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
    /play/[id]      /test-games/[id]   /play/preview
          │                │                │
          ▼                ▼                ▼
    ┌─────────────────────────────────────────┐
    │              GameRuntime                 │
    │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
    │  │ Entity  │  │ Physics │  │ Render  │ │
    │  │ Manager │  │  World  │  │  Layer  │ │
    │  └─────────┘  └─────────┘  └─────────┘ │
    └─────────────────────────────────────────┘
```

## Asset System Integration

The `/play/[id]` route includes:
- **Skin Button** → Opens modal to generate or select asset packs
- **Debug Toggle** → Cycles through render modes (VIS → PRIM → +DBG)
- **Asset Pack Selector** → Applies different visual themes

Asset packs are stored in `GameDefinition.assetPacks` and referenced by `activeAssetPackId`.

## Registry System

Two auto-generated registries power the app:

### `EXAMPLES` (`lib/registry/generated/examples.ts`)
- Scanned from `app/examples/*.tsx`
- Provides metadata + lazy component loading
- Used by Lab tab

### `TESTGAMES` (`lib/registry/generated/testGames.ts`)
- Scanned from `lib/test-games/*.ts`
- Provides `GameDefinition` objects
- Used by Maker tab (Templates) and `/test-games/[id]`

## Future: Editor Route

`/editor/[id]` currently re-exports the play screen but is intended to become a full game editor with:
- Entity tree sidebar
- Property inspector
- Prompt-based editing
- Live preview
