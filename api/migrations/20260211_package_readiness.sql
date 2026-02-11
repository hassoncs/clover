-- Package readiness tracking for build validation
CREATE TABLE IF NOT EXISTS package_readiness (
  game_id TEXT NOT NULL,
  build_id TEXT NOT NULL,
  ready INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT NOT NULL DEFAULT '[]',
  warnings_json TEXT NOT NULL DEFAULT '[]',
  checked_at INTEGER NOT NULL,
  PRIMARY KEY (game_id, build_id)
);

CREATE INDEX IF NOT EXISTS idx_package_readiness_game ON package_readiness(game_id, checked_at DESC);
