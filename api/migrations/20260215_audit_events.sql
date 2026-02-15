-- Audit Events - Centralized logging for sensitive/admin actions
-- Tracks who did what to which resource, with optional metadata

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,              -- User who performed the action
  action TEXT NOT NULL,                -- Action type (e.g., 'admin.seed_database', 'admin.generate_sound')
  target_type TEXT,                    -- Type of target (e.g., 'game', 'user', 'asset')
  target_id TEXT,                      -- ID of the target entity
  metadata_json TEXT,                  -- JSON: additional context (no PII)
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON audit_events(target_type, target_id);
