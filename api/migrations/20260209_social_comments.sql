-- =============================================================================
-- SOCIAL SYSTEM: Comments, Reactions, Follows
-- =============================================================================

-- Comments - Threaded comments on games (depth-limited to 2 levels)
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  body_json TEXT,
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth <= 2),
  reply_count INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  is_edited INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_comments_game ON comments(game_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id, created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id) WHERE deleted_at IS NULL;

-- Reactions - On games and comments (one per user per target per type)
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('game', 'comment')),
  target_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, target_type, target_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- Follows - Follow users or games
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'game')),
  target_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(follower_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id, target_type);
CREATE INDEX IF NOT EXISTS idx_follows_target ON follows(target_type, target_id);

-- Denormalized counters on games for reactions/likes
-- (play_count already exists; adding like_count, comment_count, follower_count)
ALTER TABLE games ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN follower_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN rating_average REAL NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;

-- Ratings - Star ratings on games (one per user per game)
CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_game ON ratings(game_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);

-- Bookmarks - Save games for later
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_game ON bookmarks(game_id);
