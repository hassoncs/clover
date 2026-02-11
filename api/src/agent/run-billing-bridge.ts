import { AgentBillingService } from '@/economy/agent-billing-service';
import { WalletService } from '@/economy/wallet-service';
import { logAgentEvent } from '@/agent/observability';
import type { RunStepResult } from './types';

type D1Database = import('@cloudflare/workers-types').D1Database;

export class RunBillingBridge {
  constructor(private db: D1Database) {}

  async settleStep(result: RunStepResult): Promise<void> {
    const run = await this.db
      .prepare('SELECT user_id, tier FROM agent_runs WHERE id = ?')
      .bind(result.runId)
      .first<{ user_id: string; tier: string }>();

    if (!run) {
      throw new Error(`Missing run row for billing settle: ${result.runId}`);
    }

    const billingService = new AgentBillingService(this.db, new WalletService(this.db));
    await billingService.settleStep({
      userId: run.user_id,
      runId: result.runId,
      stepId: result.stepId,
      stepIndex: result.stepIndex,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens ?? 0,
      outputTokens: result.outputTokens ?? 0,
      costMicros: result.costMicros,
    });

    logAgentEvent({
      event: 'agent_run.billing_settled',
      runId: result.runId,
      userId: run.user_id,
      tier: run.tier,
      stepIndex: result.stepIndex,
      costMicros: result.costMicros,
      metadata: {
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens ?? 0,
        outputTokens: result.outputTokens ?? 0,
      },
    });
  }

  async persistCheckpoint(result: RunStepResult): Promise<void> {
    try {
      await this.db.prepare(
        `INSERT OR REPLACE INTO agent_checkpoints
         (id, run_id, step_index, state_json, artifact_keys_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          result.checkpointId,
          result.runId,
          result.stepIndex,
          result.checkpointStateJson ?? JSON.stringify({ status: result.status, stepIndex: result.stepIndex }),
          result.checkpointArtifactKeysJson ?? null,
          result.completedAt
        )
        .run();
    } catch (error) {
      console.error('[RunBillingBridge] D1 INSERT agent_checkpoints failed', {
        checkpointId: result.checkpointId,
        runId: result.runId,
        stepIndex: result.stepIndex,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateStepStatus(result: RunStepResult): Promise<void> {
    let dbStatus: 'succeeded' | 'running' | 'failed';
    if (result.status === 'succeeded') {
      dbStatus = 'succeeded';
    } else if (result.status === 'suspended') {
      dbStatus = 'running';
    } else {
      dbStatus = 'failed';
    }
    await this.db.prepare(
      `UPDATE agent_steps
       SET status = ?,
           output_artifact_key = COALESCE(?, output_artifact_key),
           cost_micros = ?,
           error_message = ?,
           finished_at = ?,
           started_at = COALESCE(started_at, ?)
       WHERE run_id = ? AND step_index = ?`
    )
      .bind(
        dbStatus,
        result.outputArtifactKey ?? null,
        result.costMicros,
        result.errorMessage ?? null,
        result.status === 'suspended' ? null : result.completedAt,
        result.completedAt,
        result.runId,
        result.stepIndex
      )
      .run();
  }
}
