import { TRPCError } from '@trpc/server';
import type { AgentEvent, AgentRunSnapshot } from '@/agent/types';
import { RecoveryService } from '@/agent/recovery-service';
import { AgentBillingService } from '@/economy/agent-billing-service';
import { WalletService } from '@/economy/wallet-service';
import { AgentEventPayloadSchema } from '@slopcade/shared/types/agent-run';

type D1Database = import('@cloudflare/workers-types').D1Database;
type DurableObjectNamespace = import('@cloudflare/workers-types').DurableObjectNamespace;

export interface AgentRunRow {
  id: string;
  user_id: string;
  game_id: string;
  source: 'scratch' | 'fork';
  source_game_id: string | null;
  tier: 'free' | 'standard' | 'pro';
  status: 'planning' | 'queued' | 'running' | 'waiting_for_input' | 'paused' | 'succeeded' | 'failed' | 'canceled';
  planning_doc_json: string | null;
  estimated_cost_micros: number | null;
  actual_cost_micros: number;
  reserved_micros: number;
  current_step_index: number;
  total_steps: number;
  error_message: string | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  updated_at: number;
}

export interface AgentStepRow {
  id: string;
  run_id: string;
  step_index: number;
  stage: 'planning' | 'build' | 'refine' | 'theme' | 'asset';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  input_hash: string | null;
  output_artifact_key: string | null;
  cost_micros: number;
  error_message: string | null;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
}

export interface AgentEventRow {
  id: string;
  seq: number;
  event_type: AgentEvent['eventType'];
  payload_json: string | null;
  created_at: number;
}

export interface GameOwnerRow {
  id: string;
  user_id: string | null;
}

export const STAGES: AgentStepRow['stage'][] = ['planning', 'build', 'refine', 'theme', 'asset'];

export function toRun(row: AgentRunRow) {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    source: row.source,
    sourceGameId: row.source_game_id,
    tier: row.tier,
    status: row.status,
    planningDocJson: row.planning_doc_json,
    estimatedCostMicros: row.estimated_cost_micros,
    actualCostMicros: row.actual_cost_micros,
    reservedMicros: row.reserved_micros,
    currentStepIndex: row.current_step_index,
    totalSteps: row.total_steps,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at,
  };
}

export function toStep(row: AgentStepRow) {
  return {
    id: row.id,
    runId: row.run_id,
    stepIndex: row.step_index,
    stage: row.stage,
    status: row.status,
    inputHash: row.input_hash,
    outputArtifactKey: row.output_artifact_key,
    costMicros: row.cost_micros,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export function toEvent(row: AgentEventRow): AgentEvent {
  let payload: AgentEvent['payload'] = {
    type: 'error',
    errorMessage: 'Invalid event payload',
    errorContext: `event:${row.id}`,
  };

  if (row.payload_json) {
    try {
      const parsed = AgentEventPayloadSchema.safeParse(JSON.parse(row.payload_json));
      if (parsed.success) {
        payload = parsed.data;
      }
    } catch {
      payload = {
        type: 'error',
        errorMessage: 'Invalid event payload',
        errorContext: `event:${row.id}`,
      };
    }
  }

  return {
    seq: row.seq,
    eventType: row.event_type,
    payload,
    timestamp: row.created_at,
  };
}

export function toSnapshot(run: AgentRunRow, lastSeq: number): AgentRunSnapshot {
  return {
    runId: run.id,
    status: run.status,
    currentStepIndex: run.current_step_index,
    totalSteps: run.total_steps,
    lastSeq,
    totalCostMicros: run.actual_cost_micros,
    heartbeatAt: null,
    leaseExpiresAt: null,
    updatedAt: run.updated_at,
  };
}

export async function getRunForUserOrThrow(db: D1Database, runId: string, userId: string): Promise<AgentRunRow> {
  const run = await db
    .prepare('SELECT * FROM agent_runs WHERE id = ? AND user_id = ?')
    .bind(runId, userId)
    .first<AgentRunRow>();

  if (!run) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent run not found' });
  }

  return run;
}

export async function getLastSeq(db: D1Database, runId: string): Promise<number> {
  const result = await db
    .prepare('SELECT COALESCE(MAX(seq), 0) as last_seq FROM agent_events WHERE run_id = ?')
    .bind(runId)
    .first<{ last_seq: number }>();

  return result?.last_seq ?? 0;
}

export async function resumeRunFromCheckpoint(params: {
  db: D1Database;
  run: AgentRunRow;
  userId: string;
  runCoordinator: DurableObjectNamespace;
}): Promise<{
  runId: string;
  resumedFromStepIndex: number;
  settledStepIndexes: number[];
  unsettledStepIndexes: number[];
}> {
  const { db, run, userId, runCoordinator } = params;

  if (run.status !== 'paused' && run.status !== 'failed' && run.status !== 'waiting_for_input') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Run must be paused, failed, or waiting_for_input to resume from checkpoint',
    });
  }

  const recoveryService = new RecoveryService(db, new AgentBillingService(db, new WalletService(db)));
  const resumePlan = await recoveryService.prepareResume(run.id);
  const resumedFromStepIndex = Math.min(resumePlan.resumeFromStepIndex, run.total_steps);
  const now = Date.now();

  const unsettledSet = new Set(resumePlan.unsettledStepIndexes);

  await db.batch([
    db
      .prepare(
        `UPDATE agent_runs
         SET status = 'queued',
             current_step_index = ?,
             error_message = NULL,
             finished_at = NULL,
             updated_at = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(resumedFromStepIndex, now, run.id, userId),
    db
      .prepare(
        `UPDATE agent_steps
         SET status = 'queued',
              error_message = NULL,
              started_at = NULL,
              finished_at = NULL
          WHERE run_id = ?
            AND step_index >= ?
            AND status != 'succeeded'
            AND step_index IN (${resumePlan.unsettledStepIndexes.map(() => '?').join(',') || 'NULL'})`
      )
      .bind(run.id, resumedFromStepIndex, ...Array.from(unsettledSet.values())),
  ]);

  const coordinatorId = runCoordinator.idFromName(run.id);
  const coordinator = runCoordinator.get(coordinatorId);
  const startResponse = await coordinator.fetch('https://run-coordinator/internal/resume-from-checkpoint', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      resumeFromStepIndex: resumedFromStepIndex,
      allowStatuses: ['paused', 'failed', 'waiting_for_input'],
    }),
  });

  if (!startResponse.ok) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to restart coordinator from checkpoint',
    });
  }

  return {
    runId: run.id,
    resumedFromStepIndex,
    settledStepIndexes: resumePlan.settledStepIndexes,
    unsettledStepIndexes: resumePlan.unsettledStepIndexes,
  };
}
