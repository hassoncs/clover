-- Pro subscription entitlement gating support
-- See: api/src/billing/subscription-tiers.ts

-- Track party hosting sessions per user for monthly limits
CREATE TABLE IF NOT EXISTS party_hosting_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  room_code TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch() * 1000)
);

CREATE INDEX idx_party_hosting_user_month ON party_hosting_sessions(user_id, created_at);

-- Add priority column to generation_jobs for Pro queue ordering
ALTER TABLE generation_jobs ADD COLUMN priority INTEGER DEFAULT 0;
