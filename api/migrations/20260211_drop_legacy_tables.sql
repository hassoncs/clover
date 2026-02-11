-- Drop legacy stage-based tables (replaced by threads + messages model)
DROP TABLE IF EXISTS agent_checkpoints;
DROP TABLE IF EXISTS agent_costs;
DROP TABLE IF EXISTS agent_events;
DROP TABLE IF EXISTS agent_steps;
DROP TABLE IF EXISTS agent_runs;
DROP TABLE IF EXISTS chat_events;
