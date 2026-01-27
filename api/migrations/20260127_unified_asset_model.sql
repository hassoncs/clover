-- Unified Asset Model Migration

-- THEMES
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_modifier TEXT,
  creator_user_id TEXT REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_themes_creator ON themes(creator_user_id);

-- ASSETS: new columns
ALTER TABLE assets ADD COLUMN prompt TEXT;
ALTER TABLE assets ADD COLUMN parent_asset_id TEXT REFERENCES assets(id);
ALTER TABLE assets ADD COLUMN game_id TEXT REFERENCES games(id);
ALTER TABLE assets ADD COLUMN slot_id TEXT;
ALTER TABLE assets ADD COLUMN shape TEXT;
ALTER TABLE assets ADD COLUMN theme_id TEXT REFERENCES themes(id);
ALTER TABLE assets ADD COLUMN deleted_at INTEGER;

-- GAME ASSET SELECTIONS
CREATE TABLE IF NOT EXISTS game_asset_selections (
  game_id TEXT NOT NULL REFERENCES games(id),
  slot_id TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  selected_at INTEGER NOT NULL,
  PRIMARY KEY (game_id, slot_id)
);

CREATE INDEX IF NOT EXISTS idx_game_asset_selections_asset ON game_asset_selections(asset_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_assets_game_slot ON assets(game_id, slot_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_parent ON assets(parent_asset_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_theme ON assets(theme_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_structural ON assets(shape, width, height)
  WHERE deleted_at IS NULL;
