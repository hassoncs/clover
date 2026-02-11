-- Thread/Message model (Tambo-inspired)
-- Replaces chat_threads + chat_events + agent_events with unified thread/message model
-- Old tables kept for archival reads (dropped in Task 8)

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  generation_stage TEXT DEFAULT 'idle',
  status_message TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_game ON threads(game_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  role TEXT NOT NULL,
  content_json TEXT NOT NULL,
  component_name TEXT,
  component_props_json TEXT,
  component_state_json TEXT,
  tool_call_id TEXT,
  tool_name TEXT,
  model TEXT,
  cost_micros INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  error_json TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL,
  seq INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, seq);
