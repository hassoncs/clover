# Unified Asset Model

## Overview

This document describes the new asset architecture for Slopcade, where assets are globally discoverable by structural signature rather than owned by games/packs.

## Core Principles

1. **Assets are just images** - globally discoverable, no ownership
2. **Themes have stable IDs** - prompts can evolve, IDs don't change
3. **Hashes based on what matters** - structural fit + theme ID
4. **Dimensions are source of truth** - aspect ratios derived, not stored
5. **Public by default** - once in any published game
6. **Attribution, not ownership** - credit the generator
7. **Games = Engine + Graphics** - can rate them separately
8. **No more "style"** - pixel/cartoon/3d become default themes

## Asset Types

All asset types follow the same pattern: an image of a certain size with certain properties.

| Type | What It Is | Key Properties |
|------|------------|----------------|
| Entity | Game world object | shape, width, height |
| Background | Canvas filler | width, height (viewport) |
| Parallax Layer | Depth-sorted background | width, height, depth |
| UI Component | Screen-space element | width, height, component_type, states |
| Title Hero | Game marketing image | width, height |

## Database Schema

### Themes

Stable IDs with evolving prompts. Default themes replace the old "style" concept.

```sql
CREATE TABLE themes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  creator_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP  -- Tombstone only, never hard delete
);

-- Default themes (formerly "styles")
INSERT INTO themes (id, name, prompt) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Pixel Art', 'pixel art style, 16-bit retro game aesthetic, clean pixels'),
  ('00000000-0000-0000-0000-000000000002', 'Cartoon', 'cartoon style, bold outlines, vibrant colors, hand-drawn look'),
  ('00000000-0000-0000-0000-000000000003', '3D Rendered', '3D rendered style, smooth shading, realistic lighting'),
  ('00000000-0000-0000-0000-000000000004', 'Flat Design', 'flat design style, minimal shading, geometric shapes');
```

### Assets (Global Catalog)

Single table for ALL asset types. Content-addressed by structural hash.

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  image_url TEXT NOT NULL,
  
  -- Asset type
  asset_type TEXT NOT NULL,  -- 'entity', 'background', 'parallax_layer', 'ui_component', 'title_hero'
  
  -- Structural identity (what makes it FIT)
  shape TEXT,                          -- 'box', 'circle' (entities only)
  width DECIMAL(6,2) NOT NULL,         -- Rounded to 2 decimal places
  height DECIMAL(6,2) NOT NULL,        -- Rounded to 2 decimal places
  structural_hash TEXT NOT NULL,       -- Computed from type + shape + width + height
  
  -- Type-specific properties (nullable based on asset_type)
  entity_type TEXT,                    -- 'character', 'item', 'platform', etc. (entities)
  parallax_depth TEXT,                 -- 'sky', 'far', 'mid', 'near' (parallax)
  ui_component_type TEXT,              -- 'button', 'checkbox', etc. (ui)
  ui_state TEXT,                       -- 'normal', 'hover', 'pressed', etc. (ui)
  
  -- Semantic identity (what makes it LOOK right)
  theme_id UUID REFERENCES themes(id), -- Stable theme reference
  semantic_hash TEXT NOT NULL,         -- Computed from structural + theme_id + type-specific
  
  -- Generation context
  description TEXT,                    -- The prompt used
  full_hash TEXT NOT NULL,             -- Everything including description
  
  -- Attribution
  creator_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Visibility
  is_public BOOLEAN DEFAULT FALSE      -- True once used in any published game
);

-- Indexes for catalog lookups
CREATE INDEX idx_assets_structural ON assets(structural_hash);
CREATE INDEX idx_assets_semantic ON assets(semantic_hash) WHERE is_public = TRUE;
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_theme ON assets(theme_id);
```

### Games

The "engine" side - mechanics, rules, templates.

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  definition JSONB NOT NULL,           -- GameDefinition (templates, rules, etc.)
  
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP,
  
  -- Fork tracking
  base_game_id UUID REFERENCES games(id),    -- Root of fork tree
  forked_from_id UUID REFERENCES games(id),  -- Direct parent
  
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Game Asset Selections

Which assets a game uses for each slot. This replaces "packs" for individual games.

```sql
CREATE TABLE game_asset_selections (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES games(id) NOT NULL,
  
  -- What slot this fills
  slot_type TEXT NOT NULL,             -- 'entity', 'background', 'parallax_layer', 'ui_component', 'title_hero'
  slot_id TEXT NOT NULL,               -- template_id for entities, layer_id for parallax, etc.
  
  -- Which asset fills it
  asset_id UUID REFERENCES assets(id) NOT NULL,
  
  -- Compatibility tracking
  structural_hash_at_selection TEXT,   -- Hash of the slot when selected
  is_hash_matched BOOLEAN,             -- Did hashes match at selection time?
  
  -- Attribution
  selected_by_user_id UUID REFERENCES users(id),
  selected_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(game_id, slot_type, slot_id)
);
```

### Asset Selection Presets (Optional - Replaces "Packs")

Curated collections that can be bulk-applied. Not required, just convenience.

```sql
CREATE TABLE asset_selection_presets (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  theme_id UUID REFERENCES themes(id), -- Primary theme
  
  -- What game engine this is designed for
  target_base_game_id UUID REFERENCES games(id),
  
  creator_user_id UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE asset_selection_preset_entries (
  id UUID PRIMARY KEY,
  preset_id UUID REFERENCES asset_selection_presets(id) NOT NULL,
  
  slot_type TEXT NOT NULL,
  slot_id TEXT NOT NULL,
  asset_id UUID REFERENCES assets(id) NOT NULL,
  
  UNIQUE(preset_id, slot_type, slot_id)
);
```

### Game Contributors (View)

Roll-up of everyone who contributed to a game.

```sql
CREATE VIEW game_contributors AS
SELECT DISTINCT
  g.id AS game_id,
  'engine' AS contribution_type,
  g.user_id AS user_id,
  g.created_at AS contributed_at
FROM games g
WHERE g.user_id IS NOT NULL

UNION ALL

SELECT DISTINCT
  gas.game_id,
  'asset' AS contribution_type,
  a.creator_user_id AS user_id,
  gas.selected_at AS contributed_at
FROM game_asset_selections gas
JOIN assets a ON gas.asset_id = a.id
WHERE a.creator_user_id IS NOT NULL;
```

## Hash Computation

### Configuration

```typescript
const HASH_CONFIG = {
  version: 1,
  dimensionPrecision: 2,  // Decimal places
};
```

### Dimension Normalization

```typescript
function normalizeDimension(value: number): number {
  const precision = HASH_CONFIG.dimensionPrecision;
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}
```

### Structural Hash

What makes an asset FIT a slot.

```typescript
function computeStructuralHash(asset: {
  assetType: string;
  shape?: string;
  width: number;
  height: number;
}): string {
  const normalized = {
    v: HASH_CONFIG.version,
    t: asset.assetType,
    s: asset.shape ?? null,
    w: normalizeDimension(asset.width),
    h: normalizeDimension(asset.height),
  };
  return `s:${sha256(stableStringify(normalized)).slice(0, 16)}`;
}
```

### Semantic Hash

What makes an asset LOOK right in context.

```typescript
function computeSemanticHash(asset: {
  structuralHash: string;
  themeId: string;
  entityType?: string;
  parallaxDepth?: string;
  uiComponentType?: string;
  uiState?: string;
}): string {
  const normalized = {
    v: HASH_CONFIG.version,
    structural: asset.structuralHash,
    theme: asset.themeId,
    // Type-specific (only one will be set)
    et: asset.entityType ?? null,
    pd: asset.parallaxDepth ?? null,
    uic: asset.uiComponentType ?? null,
    uis: asset.uiState ?? null,
  };
  return `m:${sha256(stableStringify(normalized)).slice(0, 16)}`;
}
```

### Full Hash

Exact generation match (includes description).

```typescript
function computeFullHash(asset: {
  semanticHash: string;
  description: string;
}): string {
  const normalized = {
    v: HASH_CONFIG.version,
    semantic: asset.semanticHash,
    desc: asset.description.toLowerCase().trim(),
  };
  return `f:${sha256(stableStringify(normalized)).slice(0, 16)}`;
}
```

## Asset Type Details

### Entity Assets

Game world objects with physics shapes.

| Property | Required | Notes |
|----------|----------|-------|
| shape | Yes | 'box' or 'circle' |
| width | Yes | Physics width (or radius*2) |
| height | Yes | Physics height (or radius*2) |
| entity_type | Yes | 'character', 'enemy', 'item', 'platform', 'obstacle', 'projectile' |
| theme_id | Yes | Reference to themes table |
| description | Yes | Generation prompt |

### Background Assets

Full canvas/viewport backgrounds.

| Property | Required | Notes |
|----------|----------|-------|
| width | Yes | Viewport/canvas width |
| height | Yes | Viewport/canvas height |
| theme_id | Yes | Reference to themes table |
| description | Yes | Generation prompt |

### Parallax Layer Assets

Depth-sorted background layers.

| Property | Required | Notes |
|----------|----------|-------|
| width | Yes | Layer width |
| height | Yes | Layer height |
| parallax_depth | Yes | 'sky', 'far', 'mid', 'near' |
| theme_id | Yes | Reference to themes table |
| description | Yes | Generation prompt |

### UI Component Assets

Screen-space interface elements.

| Property | Required | Notes |
|----------|----------|-------|
| width | Yes | Component width in pixels |
| height | Yes | Component height in pixels |
| ui_component_type | Yes | 'button', 'checkbox', 'slider', 'panel', etc. |
| ui_state | Yes | 'normal', 'hover', 'pressed', 'disabled', 'focus' |
| theme_id | Yes | Reference to themes table |
| description | Yes | Generation prompt |

### Title Hero Assets

Marketing/splash images for games.

| Property | Required | Notes |
|----------|----------|-------|
| width | Yes | Image width |
| height | Yes | Image height |
| theme_id | Yes | Reference to themes table |
| description | Yes | Generation prompt (includes game title) |

## Visibility Rules

1. **New assets start private** (`is_public = FALSE`)
2. **Publishing a game makes its assets public**:
   ```sql
   UPDATE assets SET is_public = TRUE
   WHERE id IN (
     SELECT asset_id FROM game_asset_selections
     WHERE game_id = :published_game_id
   );
   ```
3. **Once public, always public** (no un-publishing)

## Catalog Queries

### Find assets that structurally fit a slot

```sql
SELECT * FROM assets
WHERE structural_hash = :slot_structural_hash
  AND is_public = TRUE
ORDER BY created_at DESC;
```

### Find assets with same theme and structure

```sql
SELECT * FROM assets
WHERE semantic_hash = :slot_semantic_hash
  AND is_public = TRUE
ORDER BY created_at DESC;
```

### Find exact matches (same description)

```sql
SELECT * FROM assets
WHERE full_hash = :full_hash
  AND is_public = TRUE;
```

### Browse catalog for a slot

```sql
-- Tiered results: exact → semantic → structural
SELECT 
  a.*,
  CASE 
    WHEN a.full_hash = :full_hash THEN 1
    WHEN a.semantic_hash = :semantic_hash THEN 2
    WHEN a.structural_hash = :structural_hash THEN 3
  END AS match_tier
FROM assets a
WHERE a.structural_hash = :structural_hash
  AND a.is_public = TRUE
ORDER BY match_tier, a.created_at DESC;
```

## Migration Path

### Phase 1: Add new tables
- Create `themes` table with default themes
- Create new `assets` table (parallel to `game_assets`)
- Create `game_asset_selections` table

### Phase 2: Migrate existing data
- Map old `style` values to default theme IDs
- Compute hashes for existing assets
- Create selection records from current pack entries

### Phase 3: Update generation pipeline
- Generate assets into new `assets` table
- Compute and store all three hash levels
- Reference theme by ID, not string

### Phase 4: Update API/UI
- New catalog browsing endpoints
- Asset selection UI (pick from catalog or generate)
- Attribution display

### Phase 5: Deprecate old tables
- Remove `asset_packs` table
- Remove `asset_pack_entries` table
- Remove `game_assets` table (replaced by `assets`)

## Open Questions

1. **Hash versioning strategy** - When algorithm changes, do we recompute all? For now: just accept breakage in alpha.

2. **Preset sharing** - How do presets work across fork trees? Probably: presets are tied to a `target_base_game_id`.

3. **UI state combinatorics** - A button has 5 states. Is each state a separate asset, or one sheet? Probably: separate assets, UI system composites them.

4. **Background/parallax dimensions** - What's the canonical size? Probably: use presentation config from GameDefinition.

5. **Rating system** - Rate engines and asset selections separately? Future work.
