import { nanoid } from 'nanoid';
import { WalletService } from '@/economy/wallet-service';

type D1Database = import('@cloudflare/workers-types').D1Database;

interface AgentRunBillingRow {
  id: string;
  user_id: string;
  reserved_micros: number;
  actual_cost_micros: number;
}

interface AgentCostSummaryRow {
  step_id: string | null;
  step_index: number | null;
  cost_micros: number;
  provider: string;
  model: string;
}

export class AgentBillingService {
  constructor(
    private db: D1Database,
    private walletService: WalletService
  ) {}

  async reserveBudget(params: {
    userId: string;
    runId: string;
    estimatedCostMicros: number;
  }): Promise<{ reservedMicros: number; transactionId: string }> {
    const { userId, runId, estimatedCostMicros } = params;
    if (estimatedCostMicros <= 0) {
      throw new Error('estimatedCostMicros must be greater than 0');
    }

    const run = await this.getRunForUser(runId, userId);
    const idempotencyKey = `agent-reserve:${runId}`;

    const existingTx = await this.db
      .prepare('SELECT id, amount_micros FROM credit_transactions WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first<{ id: string; amount_micros: number }>();

    if (existingTx) {
      const reservedMicros = Math.abs(existingTx.amount_micros);
      const releaseTx = await this.db
        .prepare('SELECT id FROM credit_transactions WHERE idempotency_key = ?')
        .bind(`agent-release:${runId}`)
        .first<{ id: string }>();

      if (!releaseTx && run.reserved_micros !== reservedMicros) {
        await this.db.batch([
          this.db
            .prepare('UPDATE agent_runs SET reserved_micros = ?, updated_at = ? WHERE id = ? AND user_id = ?')
            .bind(reservedMicros, Date.now(), runId, userId),
        ]);
      }
      return { reservedMicros, transactionId: existingTx.id };
    }

    await this.walletService.debit({
      userId,
      type: 'agent_reservation_hold',
      amountMicros: -estimatedCostMicros,
      referenceType: 'agent_run',
      referenceId: runId,
      idempotencyKey,
      description: 'Agent run max-budget reservation hold',
      metadata: { runId, estimatedCostMicros },
    });

    const createdTx = await this.db
      .prepare('SELECT id, amount_micros FROM credit_transactions WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first<{ id: string; amount_micros: number }>();

    if (!createdTx) {
      throw new Error(`Reservation transaction not found for run ${runId}`);
    }

    const reservedMicros = Math.abs(createdTx.amount_micros);
    await this.db.batch([
      this.db
        .prepare('UPDATE agent_runs SET reserved_micros = ?, updated_at = ? WHERE id = ? AND user_id = ?')
        .bind(reservedMicros, Date.now(), runId, userId),
    ]);

    return { reservedMicros, transactionId: createdTx.id };
  }

  async settleStep(params: {
    userId: string;
    runId: string;
    stepId: string;
    stepIndex: number;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costMicros: number;
  }): Promise<{ costRecordId: string; totalActualCostMicros: number }> {
    const {
      userId,
      runId,
      stepId,
      stepIndex,
      provider,
      model,
      inputTokens,
      outputTokens,
      costMicros,
    } = params;

    if (costMicros < 0) {
      throw new Error('costMicros must be non-negative');
    }

    const run = await this.getRunForUser(runId, userId);

    const idempotencyKey = `agent-step-settle:${runId}:${stepIndex}`;
    const existingCost = await this.db
      .prepare('SELECT id, cost_micros FROM agent_costs WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first<{ id: string; cost_micros: number }>();

    if (existingCost) {
      const latestRun = await this.getRunForUser(runId, userId);
      return {
        costRecordId: existingCost.id,
        totalActualCostMicros: latestRun.actual_cost_micros,
      };
    }

    if (run.reserved_micros <= 0) {
      throw new Error(`No active reservation for run ${runId}`);
    }

    const step = await this.db
      .prepare('SELECT id FROM agent_steps WHERE id = ? AND run_id = ? AND step_index = ?')
      .bind(stepId, runId, stepIndex)
      .first<{ id: string }>();

    if (!step) {
      throw new Error(`Step ${stepId} (index ${stepIndex}) not found for run ${runId}`);
    }

    const now = Date.now();
    const costRecordId = nanoid();

    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO agent_costs
           (id, run_id, step_id, provider, model, input_tokens, output_tokens, cost_micros, idempotency_key, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          costRecordId,
          runId,
          stepId,
          provider,
          model,
          inputTokens,
          outputTokens,
          costMicros,
          idempotencyKey,
          now
        ),
      this.db
        .prepare('UPDATE agent_runs SET actual_cost_micros = actual_cost_micros + ?, updated_at = ? WHERE id = ? AND user_id = ?')
        .bind(costMicros, now, runId, userId),
      this.db
        .prepare('UPDATE agent_steps SET cost_micros = ? WHERE id = ? AND run_id = ?')
        .bind(costMicros, stepId, runId),
    ]);

    const latestRun = await this.getRunForUser(runId, userId);
    return {
      costRecordId,
      totalActualCostMicros: latestRun.actual_cost_micros,
    };
  }

  async finalizeRun(params: {
    userId: string;
    runId: string;
  }): Promise<{ releasedMicros: number; totalSpentMicros: number }> {
    const { userId, runId } = params;
    const run = await this.getRunForUser(runId, userId);
    const idempotencyKey = `agent-release:${runId}`;

    const existingReleaseTx = await this.db
      .prepare('SELECT amount_micros FROM credit_transactions WHERE idempotency_key = ?')
      .bind(idempotencyKey)
      .first<{ amount_micros: number }>();

    if (existingReleaseTx) {
      if (run.reserved_micros !== 0) {
        await this.db.batch([
          this.db
            .prepare('UPDATE agent_runs SET reserved_micros = 0, updated_at = ? WHERE id = ? AND user_id = ?')
            .bind(Date.now(), runId, userId),
        ]);
      }
      return {
        releasedMicros: Math.max(existingReleaseTx.amount_micros, 0),
        totalSpentMicros: run.actual_cost_micros,
      };
    }

    const releaseMicros = Math.max(run.reserved_micros - run.actual_cost_micros, 0);

    if (releaseMicros > 0) {
      await this.walletService.credit({
        userId,
        type: 'agent_reservation_release',
        amountMicros: releaseMicros,
        referenceType: 'agent_run',
        referenceId: runId,
        idempotencyKey,
        description: 'Release unspent agent reservation',
        metadata: {
          runId,
          reservedMicros: run.reserved_micros,
          actualCostMicros: run.actual_cost_micros,
        },
      });
    }

    await this.db.batch([
      this.db
        .prepare('UPDATE agent_runs SET reserved_micros = 0, updated_at = ? WHERE id = ? AND user_id = ?')
        .bind(Date.now(), runId, userId),
    ]);

    return {
      releasedMicros: releaseMicros,
      totalSpentMicros: run.actual_cost_micros,
    };
  }

  async getRunCostSummary(runId: string): Promise<{
    reservedMicros: number;
    actualCostMicros: number;
    remainingReserveMicros: number;
    stepCosts: Array<{ stepId: string; stepIndex: number; costMicros: number; provider: string; model: string }>;
  }> {
    const run = await this.db
      .prepare('SELECT reserved_micros, actual_cost_micros FROM agent_runs WHERE id = ?')
      .bind(runId)
      .first<{ reserved_micros: number; actual_cost_micros: number }>();

    if (!run) {
      throw new Error(`Agent run ${runId} not found`);
    }

    const stepCostsResult = await this.db
      .prepare(
        `SELECT ac.step_id, s.step_index, ac.cost_micros, ac.provider, ac.model
         FROM agent_costs ac
         LEFT JOIN agent_steps s ON s.id = ac.step_id
         WHERE ac.run_id = ?
         ORDER BY s.step_index ASC, ac.created_at ASC`
      )
      .bind(runId)
      .all<AgentCostSummaryRow>();

    const stepCosts: Array<{ stepId: string; stepIndex: number; costMicros: number; provider: string; model: string }> = [];
    for (const row of stepCostsResult.results ?? []) {
      if (row.step_id === null || row.step_index === null) {
        continue;
      }

      stepCosts.push({
        stepId: row.step_id,
        stepIndex: row.step_index,
        costMicros: row.cost_micros,
        provider: row.provider,
        model: row.model,
      });
    }

    return {
      reservedMicros: run.reserved_micros,
      actualCostMicros: run.actual_cost_micros,
      remainingReserveMicros: Math.max(run.reserved_micros - run.actual_cost_micros, 0),
      stepCosts,
    };
  }

  private async getRunForUser(runId: string, userId: string): Promise<AgentRunBillingRow> {
    const run = await this.db
      .prepare('SELECT id, user_id, reserved_micros, actual_cost_micros FROM agent_runs WHERE id = ? AND user_id = ?')
      .bind(runId, userId)
      .first<AgentRunBillingRow>();

    if (!run) {
      throw new Error(`Agent run ${runId} not found for user ${userId}`);
    }

    return run;
  }
}
