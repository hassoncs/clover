import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users';
import { games } from './games';

export const agentRuns = sqliteTable('agent_runs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  gameId: text('game_id').notNull().references(() => games.id),
  source: text('source').notNull(),
  sourceGameId: text('source_game_id'),
  tier: text('tier').notNull(),
  status: text('status').notNull(),
  planningDocJson: text('planning_doc_json'),
  estimatedCostMicros: integer('estimated_cost_micros'),
  actualCostMicros: integer('actual_cost_micros').notNull().default(0),
  reservedMicros: integer('reserved_micros').notNull().default(0),
  currentStepIndex: integer('current_step_index').notNull().default(0),
  totalSteps: integer('total_steps').notNull().default(0),
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull(),
  startedAt: integer('started_at'),
  finishedAt: integer('finished_at'),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  userIdx: index('idx_agent_runs_user').on(table.userId),
  gameIdx: index('idx_agent_runs_game').on(table.gameId),
  statusIdx: index('idx_agent_runs_status').on(table.status),
}));

export const insertAgentRunSchema = createInsertSchema(agentRuns);
export const selectAgentRunSchema = createSelectSchema(agentRuns);
export type AgentRun = z.infer<typeof selectAgentRunSchema>;
export type NewAgentRun = z.infer<typeof insertAgentRunSchema>;

export const agentSteps = sqliteTable('agent_steps', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').notNull(),
  stage: text('stage').notNull(),
  status: text('status').notNull(),
  inputHash: text('input_hash'),
  outputArtifactKey: text('output_artifact_key'),
  costMicros: integer('cost_micros').notNull().default(0),
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull(),
  startedAt: integer('started_at'),
  finishedAt: integer('finished_at'),
}, (table) => ({
  runStepUnique: uniqueIndex('agent_steps_run_step_unique').on(table.runId, table.stepIndex),
  runIdx: index('idx_agent_steps_run').on(table.runId),
  statusIdx: index('idx_agent_steps_status').on(table.status),
}));

export const insertAgentStepSchema = createInsertSchema(agentSteps);
export const selectAgentStepSchema = createSelectSchema(agentSteps);
export type AgentStep = z.infer<typeof selectAgentStepSchema>;
export type NewAgentStep = z.infer<typeof insertAgentStepSchema>;

export const agentEvents = sqliteTable('agent_events', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  eventType: text('event_type').notNull(),
  payloadJson: text('payload_json'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  runSeqUnique: uniqueIndex('agent_events_run_seq_unique').on(table.runId, table.seq),
  runSeqIdx: index('idx_agent_events_run_seq').on(table.runId, table.seq),
}));

export const insertAgentEventSchema = createInsertSchema(agentEvents);
export const selectAgentEventSchema = createSelectSchema(agentEvents);
export type AgentEvent = z.infer<typeof selectAgentEventSchema>;
export type NewAgentEvent = z.infer<typeof insertAgentEventSchema>;

export const agentCheckpoints = sqliteTable('agent_checkpoints', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').notNull(),
  stateJson: text('state_json').notNull(),
  artifactKeysJson: text('artifact_keys_json'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  runIdx: index('idx_agent_checkpoints_run').on(table.runId),
}));

export const insertAgentCheckpointSchema = createInsertSchema(agentCheckpoints);
export const selectAgentCheckpointSchema = createSelectSchema(agentCheckpoints);
export type AgentCheckpoint = z.infer<typeof selectAgentCheckpointSchema>;
export type NewAgentCheckpoint = z.infer<typeof insertAgentCheckpointSchema>;

export const agentCosts = sqliteTable('agent_costs', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => agentRuns.id, { onDelete: 'cascade' }),
  stepId: text('step_id').references(() => agentSteps.id),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costMicros: integer('cost_micros').notNull().default(0),
  idempotencyKey: text('idempotency_key'),
  createdAt: integer('created_at').notNull(),
}, (table) => ({
  runIdx: index('idx_agent_costs_run').on(table.runId),
  idempotencyIdx: uniqueIndex('idx_agent_costs_idempotency').on(table.idempotencyKey),
}));

export const insertAgentCostSchema = createInsertSchema(agentCosts);
export const selectAgentCostSchema = createSelectSchema(agentCosts);
export type AgentCost = z.infer<typeof selectAgentCostSchema>;
export type NewAgentCost = z.infer<typeof insertAgentCostSchema>;
