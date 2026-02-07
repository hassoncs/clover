import type { RunStepResult } from './types';
import type { RunState, RunExecutionContextRow, WorkerCheckpointResponse, UnsettledSucceededStepRow } from './run-state-machine';
import { LEASE_MS, getStage } from './run-state-machine';
import type { RunBillingBridge } from './run-billing-bridge';

type DurableObjectNamespace = import('@cloudflare/workers-types').DurableObjectNamespace;
type DurableObjectStorage = import('@cloudflare/workers-types').DurableObjectStorage;
type D1Database = import('@cloudflare/workers-types').D1Database;

export async function refreshLease(
  state: RunState,
  storage: DurableObjectStorage,
): Promise<void> {
  const now = Date.now();
  state.heartbeatAt = now;
  state.leaseExpiresAt = now + LEASE_MS;
  state.recoveryAttempts = 0;
  state.updatedAt = now;
  await storage.setAlarm(state.leaseExpiresAt);
}

export async function getLastSuccessfulWorkerCheckpoint(
  runId: string,
  workerNamespace: DurableObjectNamespace,
): Promise<WorkerCheckpointResponse | null> {
  const workerId = workerNamespace.idFromName(runId);
  const workerStub = workerNamespace.get(workerId);
  const response = await workerStub.fetch('https://run-step/internal/last-successful-checkpoint', {
    method: 'POST',
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json().catch(() => null)) as WorkerCheckpointResponse | null;
  if (!body) {
    return null;
  }

  return body;
}

export async function settleCompletedUnsettledSteps(
  state: RunState,
  db: D1Database,
  billing: RunBillingBridge,
  throughStepIndex: number,
): Promise<void> {
  if (throughStepIndex < 0) {
    return;
  }

  const unsettled = await db
    .prepare(
      `SELECT
        s.id AS step_id,
        s.step_index,
        s.cost_micros,
        s.finished_at
       FROM agent_steps s
       LEFT JOIN agent_costs ac
         ON ac.run_id = s.run_id
        AND (
          ac.step_id = s.id
          OR ac.idempotency_key = ('agent-step-settle:' || s.run_id || ':' || s.step_index)
        )
       WHERE s.run_id = ?
         AND s.status = 'succeeded'
         AND s.step_index <= ?
         AND ac.id IS NULL
       ORDER BY s.step_index ASC`
    )
    .bind(state.runId, throughStepIndex)
    .all<UnsettledSucceededStepRow>();

  for (const step of unsettled.results) {
    const recoveredResult: RunStepResult = {
      type: 'step_result',
      runId: state.runId,
      stepId: step.step_id,
      stepIndex: step.step_index,
      stage: getStage(step.step_index),
      status: 'succeeded',
      costMicros: step.cost_micros,
      checkpointId: `${state.runId}:checkpoint:${step.step_index}`,
      provider: 'unknown',
      model: 'unknown',
      inputTokens: 0,
      outputTokens: 0,
      completedAt: step.finished_at ?? Date.now(),
    };

    await billing.settleStep(recoveredResult);
  }
}

export async function loadRunExecutionContext(
  runId: string,
  db: D1Database,
): Promise<RunExecutionContextRow | null> {
  return db
    .prepare(
      `SELECT
         ar.user_id,
         ar.game_id,
         ar.tier,
         ar.planning_doc_json,
         g.title AS game_title,
         g.description AS game_description
       FROM agent_runs ar
       JOIN games g ON g.id = ar.game_id
       WHERE ar.id = ?`
    )
    .bind(runId)
    .first<RunExecutionContextRow>();
}
