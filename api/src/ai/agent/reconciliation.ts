type D1Database = import('@cloudflare/workers-types').D1Database;

interface ReconciliationRunRow {
  id: string;
  actual_cost_micros: number;
  reserved_micros: number;
}

interface SumRow {
  total_micros: number | null;
}

export type AgentRunReconciliationMismatchType =
  | 'actual_vs_cost_records'
  | 'reserved_vs_wallet_transactions';

export interface AgentRunReconciliationMismatch {
  type: AgentRunReconciliationMismatchType;
  runId: string;
  expectedMicros: number;
  actualMicros: number;
  deltaMicros: number;
}

export interface AgentRunReconciliationReport {
  runId: string;
  checkedAt: number;
  actualCostMicros: number;
  summedCostMicros: number;
  reservedMicros: number;
  walletReservedMicros: number;
  mismatches: AgentRunReconciliationMismatch[];
  isConsistent: boolean;
}

export class AgentRunReconciliationService {
  constructor(private readonly db: D1Database) {}

  async reconcileRun(runId: string): Promise<AgentRunReconciliationReport> {
    const run = await this.db
      .prepare('SELECT id, actual_cost_micros, reserved_micros FROM agent_runs WHERE id = ?')
      .bind(runId)
      .first<ReconciliationRunRow>();

    if (!run) {
      throw new Error(`Agent run ${runId} not found`);
    }

    const [costSumRow, reserveTxRow, releaseTxRow] = await Promise.all([
      this.db
        .prepare('SELECT COALESCE(SUM(cost_micros), 0) AS total_micros FROM agent_costs WHERE run_id = ?')
        .bind(runId)
        .first<SumRow>(),
      this.db
        .prepare(
          "SELECT COALESCE(SUM(ABS(amount_micros)), 0) AS total_micros FROM credit_transactions WHERE idempotency_key = ?"
        )
        .bind(`agent-reserve:${runId}`)
        .first<SumRow>(),
      this.db
        .prepare(
          "SELECT COALESCE(SUM(amount_micros), 0) AS total_micros FROM credit_transactions WHERE idempotency_key = ?"
        )
        .bind(`agent-release:${runId}`)
        .first<SumRow>(),
    ]);

    const summedCostMicros = costSumRow?.total_micros ?? 0;
    const reservedFromWalletMicros = Math.max(
      (reserveTxRow?.total_micros ?? 0) - (releaseTxRow?.total_micros ?? 0),
      0
    );

    const mismatches: AgentRunReconciliationMismatch[] = [];
    if (run.actual_cost_micros !== summedCostMicros) {
      mismatches.push({
        type: 'actual_vs_cost_records',
        runId,
        expectedMicros: summedCostMicros,
        actualMicros: run.actual_cost_micros,
        deltaMicros: run.actual_cost_micros - summedCostMicros,
      });
    }

    if (run.reserved_micros !== reservedFromWalletMicros) {
      mismatches.push({
        type: 'reserved_vs_wallet_transactions',
        runId,
        expectedMicros: reservedFromWalletMicros,
        actualMicros: run.reserved_micros,
        deltaMicros: run.reserved_micros - reservedFromWalletMicros,
      });
    }

    return {
      runId,
      checkedAt: Date.now(),
      actualCostMicros: run.actual_cost_micros,
      summedCostMicros,
      reservedMicros: run.reserved_micros,
      walletReservedMicros: reservedFromWalletMicros,
      mismatches,
      isConsistent: mismatches.length === 0,
    };
  }
}
