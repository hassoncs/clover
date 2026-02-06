import { beforeEach, describe, expect, it } from 'vitest';

import { RecoveryService } from './recovery-service.ts';
import { AgentBillingService } from '../economy/agent-billing-service';
import { WalletService } from '../economy/wallet-service';
import { createAuthenticatedContext, createTestUser, initTestDatabase, TEST_USER } from '../__fixtures__/test-utils';

const testEnv = createAuthenticatedContext().env;

const TEST_GAME_ID = '11111111-1111-4111-8111-111111111111';

async function seedGame(): Promise<void> {
  const now = Date.now();
  await testEnv.DB.prepare(
    `INSERT OR REPLACE INTO games (id, user_id, title, description, r2_prefix, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(TEST_GAME_ID, TEST_USER.id, 'Recovery Test Game', 'test game', `games/${TEST_GAME_ID}`, now, now)
    .run();
}

async function seedRun(params: {
  runId: string;
  status: 'planning' | 'queued' | 'running' | 'paused' | 'succeeded' | 'failed' | 'canceled';
  updatedAt?: number;
  actualCostMicros?: number;
  reservedMicros?: number;
  currentStepIndex?: number;
}): Promise<void> {
  const now = Date.now();
  await testEnv.DB.prepare(
    `INSERT INTO agent_runs (
      id, user_id, game_id, source, source_game_id, tier, status,
      planning_doc_json, estimated_cost_micros, actual_cost_micros, reserved_micros,
      current_step_index, total_steps, error_message, created_at, started_at, finished_at, updated_at
    ) VALUES (?, ?, ?, 'scratch', NULL, 'standard', ?, NULL, ?, ?, ?, ?, 5, NULL, ?, ?, NULL, ?)`
  )
    .bind(
      params.runId,
      TEST_USER.id,
      TEST_GAME_ID,
      params.status,
      500_000,
      params.actualCostMicros ?? 0,
      params.reservedMicros ?? 0,
      params.currentStepIndex ?? 0,
      now,
      now,
      params.updatedAt ?? now
    )
    .run();
}

describe('RecoveryService', () => {
  beforeEach(async () => {
    await initTestDatabase();
    await createTestUser();
    await seedGame();
  });

  it('returns the latest successful checkpoint', async () => {
    const runId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await seedRun({ runId, status: 'paused' });

    const now = Date.now();
    await testEnv.DB.batch([
      testEnv.DB
        .prepare(
          'INSERT INTO agent_checkpoints (id, run_id, step_index, state_json, artifact_keys_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind('cp-0', runId, 0, JSON.stringify({ status: 'succeeded' }), null, now - 20),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_checkpoints (id, run_id, step_index, state_json, artifact_keys_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind('cp-1', runId, 1, JSON.stringify({ status: 'failed' }), null, now - 10),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_checkpoints (id, run_id, step_index, state_json, artifact_keys_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind('cp-2', runId, 2, JSON.stringify({ status: 'succeeded' }), JSON.stringify(['artifact']), now),
    ]);

    const billing = new AgentBillingService(testEnv.DB, new WalletService(testEnv.DB));
    const service = new RecoveryService(testEnv.DB, billing);

    const checkpoint = await service.getLastCheckpoint(runId);

    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.stepIndex).toBe(2);
    expect(checkpoint?.artifactKeysJson).toBe(JSON.stringify(['artifact']));
  });

  it('prepares resume from last checkpoint and reports settled indexes', async () => {
    const runId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await seedRun({ runId, status: 'failed' });

    const now = Date.now();
    await testEnv.DB.batch([
      testEnv.DB
        .prepare(
          'INSERT INTO agent_steps (id, run_id, step_index, stage, status, input_hash, output_artifact_key, cost_micros, error_message, created_at, started_at, finished_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, NULL, ?, NULL, NULL)'
        )
        .bind('step-0', runId, 0, 'planning', 'succeeded', now),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_steps (id, run_id, step_index, stage, status, input_hash, output_artifact_key, cost_micros, error_message, created_at, started_at, finished_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, NULL, ?, NULL, NULL)'
        )
        .bind('step-1', runId, 1, 'build', 'succeeded', now),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_steps (id, run_id, step_index, stage, status, input_hash, output_artifact_key, cost_micros, error_message, created_at, started_at, finished_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, 0, NULL, ?, NULL, NULL)'
        )
        .bind('step-2', runId, 2, 'refine', 'failed', now),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_checkpoints (id, run_id, step_index, state_json, artifact_keys_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind('cp-0', runId, 0, JSON.stringify({ status: 'succeeded' }), null, now - 20),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_checkpoints (id, run_id, step_index, state_json, artifact_keys_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind('cp-1', runId, 1, JSON.stringify({ status: 'succeeded' }), null, now - 10),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_costs (id, run_id, step_id, provider, model, input_tokens, output_tokens, cost_micros, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind('cost-0', runId, 'step-0', 'openrouter', 'gpt', 1, 1, 100, `agent-step-settle:${runId}:0`, now - 10),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_costs (id, run_id, step_id, provider, model, input_tokens, output_tokens, cost_micros, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind('cost-1', runId, 'step-1', 'openrouter', 'gpt', 1, 1, 200, `agent-step-settle:${runId}:1`, now - 9),
    ]);

    const billing = new AgentBillingService(testEnv.DB, new WalletService(testEnv.DB));
    const service = new RecoveryService(testEnv.DB, billing);
    const resume = await service.prepareResume(runId);

    expect(resume.resumeFromStepIndex).toBe(2);
    expect(resume.settledStepIndexes).toEqual([0, 1]);
    expect(resume.unsettledStepIndexes).toEqual([2]);
  });

  it('finds stale running runs only', async () => {
    const now = Date.now();
    await seedRun({
      runId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      status: 'running',
      updatedAt: now - 700_000,
      currentStepIndex: 2,
    });
    await seedRun({
      runId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      status: 'running',
      updatedAt: now,
      currentStepIndex: 1,
    });
    await seedRun({
      runId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      status: 'paused',
      updatedAt: now - 700_000,
      currentStepIndex: 2,
    });

    const billing = new AgentBillingService(testEnv.DB, new WalletService(testEnv.DB));
    const service = new RecoveryService(testEnv.DB, billing);

    const stale = await service.findStaleRuns(300_000);
    expect(stale).toHaveLength(1);
    expect(stale[0]?.runId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  });

  it('reconciles billing deltas for a run', async () => {
    const runId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    await seedRun({ runId, status: 'succeeded', actualCostMicros: 400, reservedMicros: 500 });

    const now = Date.now();
    await testEnv.DB.batch([
      testEnv.DB
        .prepare(
          'INSERT INTO agent_costs (id, run_id, step_id, provider, model, input_tokens, output_tokens, cost_micros, idempotency_key, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind('cost-a', runId, 'openrouter', 'gpt', 1, 1, 300, `agent-step-settle:${runId}:0`, now - 5),
      testEnv.DB
        .prepare(
          'INSERT INTO credit_transactions (id, user_id, type, amount_micros, balance_before_micros, balance_after_micros, reference_type, reference_id, idempotency_key, description, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          'hold-a',
          TEST_USER.id,
          'agent_reservation_hold',
          -650,
          10000,
          9350,
          'agent_run',
          runId,
          `agent-reserve:${runId}`,
          'hold',
          null,
          now - 5
        ),
    ]);

    const billing = new AgentBillingService(testEnv.DB, new WalletService(testEnv.DB));
    const service = new RecoveryService(testEnv.DB, billing);
    const report = await service.reconcileRunBilling(runId);

    expect(report.isConsistent).toBe(false);
    expect(report.costDelta).toBe(100);
    expect(report.reserveDelta).toBe(-150);
  });

  it('reconciles completed terminal runs in batch', async () => {
    const consistentRunId = '12121212-1212-4121-8121-121212121212';
    const mismatchRunId = '34343434-3434-4343-8343-343434343434';

    await seedRun({ runId: consistentRunId, status: 'succeeded', actualCostMicros: 200, reservedMicros: 0 });
    await seedRun({ runId: mismatchRunId, status: 'failed', actualCostMicros: 400, reservedMicros: 100 });

    const now = Date.now();
    await testEnv.DB.batch([
      testEnv.DB
        .prepare(
          'INSERT INTO agent_costs (id, run_id, step_id, provider, model, input_tokens, output_tokens, cost_micros, idempotency_key, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind('cost-c', consistentRunId, 'openrouter', 'gpt', 1, 1, 200, `agent-step-settle:${consistentRunId}:0`, now),
      testEnv.DB
        .prepare(
          'INSERT INTO agent_costs (id, run_id, step_id, provider, model, input_tokens, output_tokens, cost_micros, idempotency_key, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind('cost-m', mismatchRunId, 'openrouter', 'gpt', 1, 1, 100, `agent-step-settle:${mismatchRunId}:0`, now),
      testEnv.DB
        .prepare(
          'INSERT INTO credit_transactions (id, user_id, type, amount_micros, balance_before_micros, balance_after_micros, reference_type, reference_id, idempotency_key, description, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(
          'hold-m',
          TEST_USER.id,
          'agent_reservation_hold',
          -80,
          10000,
          9920,
          'agent_run',
          mismatchRunId,
          `agent-reserve:${mismatchRunId}`,
          'hold',
          null,
          now
        ),
    ]);

    const billing = new AgentBillingService(testEnv.DB, new WalletService(testEnv.DB));
    const service = new RecoveryService(testEnv.DB, billing);
    const batch = await service.reconcileAllRuns();

    expect(batch.totalChecked).toBe(2);
    expect(batch.mismatches).toHaveLength(1);
    expect(batch.mismatches[0]?.runId).toBe(mismatchRunId);
  });
});
