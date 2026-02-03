# Unified Asset Model

## Overview

Assets are global, not owned by game packs. Games reference assets by ID. Users iterate on prompts until assets look right.

## The Core Workflow

```
AI generates game JSON with entity templates
        ↓
User sees game with placeholder shapes (or initial generated assets)
        ↓
User clicks entity → "Make this look like a scary monster"
        ↓
AI generates image → User: "More teeth, less cute"
        ↓
AI regenerates → User: "Perfect!"
        ↓
Repeat for each entity...
```

**The primary flow is GENERATION, not SEARCH.** Users iterate on prompts, not browse catalogs.

## Database Schema (MVP)

```sql
-- ═══════════════════════════════════════════════════════════
-- ASSETS: Global, referenceable by any game
-- ═══════════════════════════════════════════════════════════

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL,           -- 'entity', 'background', 'title_hero', 'sound'
  
  -- Structural fit (does it fit the slot?)
  width FLOAT,
  height FLOAT,
  shape TEXT,                         -- 'box', 'circle', 'polygon'
  
  -- What created this?
  prompt TEXT,                        -- "scary monster with lots of teeth"
  theme_id UUID REFERENCES themes(id),
  
  -- File location
  url TEXT NOT NULL,
  
  -- Iteration lineage
  parent_asset_id UUID REFERENCES assets(id),  -- Previous version
  
  -- Context
  game_id UUID REFERENCES games(id),  -- Which game was this made for?
  slot_id TEXT,                       -- Which slot? ("enemy", "ball", "background")
  
  -- Meta
  creator_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Find assets for a game slot (most recent first)
CREATE INDEX idx_assets_by_game_slot ON assets(game_id, slot_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Find iteration history
CREATE INDEX idx_assets_parent ON assets(parent_asset_id)
  WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- GAME ASSET SELECTIONS: Which asset is active for each slot
-- ═══════════════════════════════════════════════════════════

CREATE TABLE game_asset_selections (
  game_id UUID REFERENCES games(id) NOT NULL,
  slot_id TEXT NOT NULL,              -- "ball", "enemy", "background"
  asset_id UUID REFERENCES assets(id) NOT NULL,
  selected_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (game_id, slot_id)
);

-- ═══════════════════════════════════════════════════════════
-- THEMES: Optional grouping for visual consistency
-- ═══════════════════════════════════════════════════════════

CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                 -- "pixel art", "cartoon", "dark fantasy"
  prompt_modifier TEXT,               -- Added to all asset prompts
  creator_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## How It Works

### Generating an Asset

```typescript
// User clicks "regenerate" on an entity
const newAsset = await generateAsset({
  gameId: game.id,
  slotId: 'enemy',
  prompt: 'scary monster with lots of teeth',
  themeId: game.themeId,
  parentAssetId: currentAsset?.id,  // Link to previous version
  width: entity.physics.width,
  height: entity.physics.height,
  shape: entity.physics.shape,
});

// Update the game's selection
await db.game_asset_selections.upsert({
  gameId: game.id,
  slotId: 'enemy',
  assetId: newAsset.id,
});
```

### Loading a Game's Assets

```typescript
// Get all active asset selections for a game
const selections = await db.game_asset_selections.findMany({
  where: { gameId: game.id },
  include: { asset: true },
});

// Map slot_id -> asset URL for rendering
const assetMap = Object.fromEntries(
  selections.map(s => [s.slotId, s.asset.url])
);
```

### Viewing Iteration History

```typescript
// Get all versions of an asset (for undo/history UI)
const history = await db.assets.findMany({
  where: { gameId: game.id, slotId: 'enemy' },
  orderBy: { createdAt: 'desc' },
});
// Returns: [current, previous, older, oldest...]
```

## What This Gets You

✅ Assets are global, not trapped in packs
✅ Same asset can be used by multiple games (future)
✅ Iteration history preserved (parent_asset_id)
✅ Simple queries
✅ Works with current infrastructure
✅ No new dependencies (no vector DB, no embeddings)

## What This Doesn't Do (Yet)

- No fuzzy search ("cave" finding "cavern")
- No semantic matching
- No "browse all my assets" catalog
- No cross-game reuse UI

These can be added later if users want them. See [Future Roadmap](./future/asset-catalog-vision.md).

## Migration from Current System

### Phase 1: Add New Tables
- Create `assets` table
- Create `game_asset_selections` table
- Create `themes` table

### Phase 2: Migrate Existing Data
- Copy existing `game_assets` → `assets`
- Create `game_asset_selections` entries for each game's current assets
- Map existing styles → themes

### Phase 3: Update Generation Pipeline
- Generate into `assets` table
- Update `game_asset_selections` when user picks/regenerates
- Store `parent_asset_id` on regeneration

### Phase 4: Update Game Loading
- Load assets via `game_asset_selections` join
- Deprecate direct `imageUrl` fields in game definition

### Phase 5: Cleanup
- Remove old `game_assets` table
- Remove `asset_packs` table
