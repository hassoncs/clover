-- Add lineage columns to games table
ALTER TABLE games ADD COLUMN base_game_id TEXT REFERENCES games(id);
ALTER TABLE games ADD COLUMN forked_from_id TEXT REFERENCES games(id);

-- Backfill: set base_game_id = id for existing games
UPDATE games SET base_game_id = id WHERE base_game_id IS NULL;

-- Add new columns to asset_packs
ALTER TABLE asset_packs ADD COLUMN base_game_id TEXT REFERENCES games(id);
ALTER TABLE asset_packs ADD COLUMN source_game_id TEXT REFERENCES games(id);
ALTER TABLE asset_packs ADD COLUMN creator_user_id TEXT REFERENCES users(id);
ALTER TABLE asset_packs ADD COLUMN is_complete INTEGER DEFAULT 0;

-- Migrate existing asset_packs: copy game_id to base_game_id
UPDATE asset_packs SET base_game_id = game_id WHERE base_game_id IS NULL;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_games_base_game ON games(base_game_id);
CREATE INDEX IF NOT EXISTS idx_games_forked_from ON games(forked_from_id);
CREATE INDEX IF NOT EXISTS idx_asset_packs_base_game ON asset_packs(base_game_id);
CREATE INDEX IF NOT EXISTS idx_asset_packs_creator ON asset_packs(creator_user_id);
