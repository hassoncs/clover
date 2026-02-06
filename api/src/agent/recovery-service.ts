import { AgentBillingService } from '@/economy/agent-billing-service';

type D1Database = import('@cloudflare/workers-types').D1Database;

interface CheckpointRow {
  step_index: number;
  state_json: string;
  artifact_keys_json: string | null;
}

interface SettledStepRow {
  idempotency_key: string | null;
  step_index: number | null;
}

interface StepIndexRow {
  step_index: number;
}

interface StaleRunRow {
  id: string;
  user_id: string;
  status: string;
  updated_at: number;
  current_step_index: number;
}

interface RunBillingRow {
  id: string;
  actual_cost_micros: number;
  reserved_micros: number;
}

interface SumMicrosRow {
  total_micros: number | null;
}

interface TerminalRunRow {
  id: string;
}

function parseSettledStepIndex(runId: string, idempotencyKey: string): number | null {
  const prefix = `agent-step-settle:${runId}:`;
  if (!idempotencyKey.startsWith(prefix)) {
    return null;
  }

  const suffix = idempotencyKey.slice(prefix.length);
  const parsed = Number.parseInt(suffix, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function isSuccessfulCheckpointState(stateJson: string): boolean {
  try {
    const parsed = JSON.parse(stateJson) as { status?: string };
    return parsed.status === 'succeeded';
  } catch {
    return false;
  }
}

export class RecoveryService {
  constructor(
    private db: D1Database,
    private billingService: AgentBillingService
  ) {}

  async getLastCheckpoint(runId: string): Promise<{
    stepIndex: number;
    stateJson: string;
    artifactKeysJson: string | null;
  } | null> {
    const checkpoints = await this.db
      .prepare(
        `SELECT step_index, state_json, artifact_keys_json
         FROM agent_checkpoints
         WHERE run_id = ?
         ORDER BY step_index DESC, created_at DESC`
      )
      .bind(runId)
      .all<CheckpointRow>();

    for (const checkpoint of checkpoints.results) {
      if (!isSuccessfulCheckpointState(checkpoint.state_json)) {
        continue;
      }

      return {
        stepIndex: checkpoint.step_index,
        stateJson: checkpoint.state_json,
        artifactKeysJson: checkpoint.artifact_keys_json,
      };
    }

    return null;
  }

  async prepareResume(runId: string): Promise<{
    resumeFromStepIndex: number;
    settledStepIndexes: number[];
    unsettledStepIndexes: number[];
  }> {
    void this.billingService;

    const checkpoint = await this.getLastCheckpoint(runId);
    const resumeFromStepIndex = checkpoint ? checkpoint.stepIndex + 1 : 0;

    const settledRows = await this.db
      .prepare(
        `SELECT ac.idempotency_key, s.step_index
         FROM agent_costs ac
         LEFT JOIN agent_steps s ON s.id = ac.step_id
         WHERE ac.run_id = ?`
      )
      .bind(runId)
      .all<SettledStepRow>();

    const settledIndexes = new Set<number>();
    for (const row of settledRows.results) {
      if (typeof row.step_index === 'number' && row.step_index >= 0) {
        settledIndexes.add(row.step_index);
        continue;
      }

      if (!row.idempotency_key) {
        continue;
      }

      const parsed = parseSettledStepIndex(runId, row.idempotency_key);
      if (parsed !== null) {
        settledIndexes.add(parsed);
      }
    }

    const settledStepIndexes = Array.from(settledIndexes).sort((a, b) => a - b);

    const runStepRows = await this.db
      .prepare('SELECT step_index FROM agent_steps WHERE run_id = ? ORDER BY step_index ASC')
      .bind(runId)
      .all<StepIndexRow>();

    const unsettledStepIndexes = runStepRows.results
      .map((row) => row.step_index)
      .filter((stepIndex) => stepIndex >= resumeFromStepIndex && !settledIndexes.has(stepIndex));

    return {
      resumeFromStepIndex,
      settledStepIndexes,
      unsettledStepIndexes,
    };
  }

  async findStaleRuns(staleThresholdMs: number): Promise<Array<{
    runId: string;
    userId: string;
    status: string;
    lastUpdatedAt: number;
    currentStepIndex: number;
  }>> {
    const cutoff = Date.now() - staleThresholdMs;
    const rows = await this.db
      .prepare(
        `SELECT id, user_id, status, updated_at, current_step_index
         FROM agent_runs
         WHERE status = 'running' AND updated_at < ?
         ORDER BY updated_at ASC`
      )
      .bind(cutoff)
      .all<StaleRunRow>();

    return rows.results.map((row) => ({
      runId: row.id,
      userId: row.user_id,
      status: row.status,
      lastUpdatedAt: row.updated_at,
      currentStepIndex: row.current_step_index,
    }));
  }

  async reconcileRunBilling(runId: string): Promise<{
    runId: string;
    isConsistent: boolean;
    costSumMicros: number;
    runActualCostMicros: number;
    costDelta: number;
    reservedMicros: number;
    holdTransactionMicros: number;
    reserveDelta: number;
  }> {
    const run = await this.db
      .prepare('SELECT id, actual_cost_micros, reserved_micros FROM agent_runs WHERE id = ?')
      .bind(runId)
      .first<RunBillingRow>();

    if (!run) {
      throw new Error(`Agent run ${runId} not found`);
    }

    const [costSumRow, holdRow, releaseRow] = await Promise.all([
      this.db
        .prepare('SELECT COALESCE(SUM(cost_micros), 0) as total_micros FROM agent_costs WHERE run_id = ?')
        .bind(runId)
        .first<SumMicrosRow>(),
      this.db
        .prepare(
          `SELECT COALESCE(SUM(ABS(amount_micros)), 0) as total_micros
           FROM credit_transactions
           WHERE idempotency_key = ?`
        )
        .bind(`agent-reserve:${runId}`)
        .first<SumMicrosRow>(),
      this.db
        .prepare(
          `SELECT COALESCE(SUM(amount_micros), 0) as total_micros
           FROM credit_transactions
           WHERE idempotency_key = ?`
        )
        .bind(`agent-release:${runId}`)
        .first<SumMicrosRow>(),
    ]);

    const costSumMicros = costSumRow?.total_micros ?? 0;
    const runActualCostMicros = run.actual_cost_micros;
    const costDelta = runActualCostMicros - costSumMicros;

    const holdTransactionMicros = Math.max((holdRow?.total_micros ?? 0) - (releaseRow?.total_micros ?? 0), 0);
    const reservedMicros = run.reserved_micros;
    const reserveDelta = reservedMicros - holdTransactionMicros;

    return {
      runId,
      isConsistent: costDelta === 0 && reserveDelta === 0,
      costSumMicros,
      runActualCostMicros,
      costDelta,
      reservedMicros,
      holdTransactionMicros,
      reserveDelta,
    };
  }

  async reconcileAllRuns(options?: { limit?: number }): Promise<{
    totalChecked: number;
    mismatches: Array<{ runId: string; costDelta: number; reserveDelta: number }>;
  }> {
    const limit = options?.limit ?? 100;
    const rows = await this.db
      .prepare(
        `SELECT id
         FROM agent_runs
         WHERE status IN ('succeeded', 'failed', 'canceled')
         ORDER BY updated_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<TerminalRunRow>();

    const mismatches: Array<{ runId: string; costDelta: number; reserveDelta: number }> = [];

    for (const row of rows.results) {
      const report = await this.reconcileRunBilling(row.id);
      if (!report.isConsistent) {
        mismatches.push({
          runId: report.runId,
          costDelta: report.costDelta,
          reserveDelta: report.reserveDelta,
        });
      }
    }

    return {
      totalChecked: rows.results.length,
      mismatches,
    };
  }
}
