import type {
  BenchmarkReport,
  BenchmarkSuite,
  EvaluationResult,
  Evaluator,
  Mode,
  RecordingMeta,
  RunContext,
  RunResult,
  Transport,
  TurnInput,
  Variant,
} from './types';

function makeRunId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTurnInput(suite: BenchmarkSuite, caseInput: Record<string, unknown>): TurnInput {
  if (suite.taskType === 'routing') {
    const prompt = caseInput.prompt;
    if (typeof prompt !== 'string' || prompt.length === 0) {
      throw new Error('Routing benchmark case is missing string input.prompt');
    }

    return { role: 'user', content: prompt };
  }

  const prompt = caseInput.prompt;
  if (typeof prompt === 'string' && prompt.length > 0) {
    return { role: 'user', content: prompt };
  }

  return { role: 'user', content: JSON.stringify(caseInput) };
}

function combineEvaluations(evaluations: Array<{ evaluatorId: string; result: EvaluationResult }>): EvaluationResult {
  const checks = evaluations.flatMap(({ evaluatorId, result }) =>
    result.checks.map((check) => ({
      ...check,
      id: `${evaluatorId}:${check.id}`,
    }))
  );

  const scores: Record<string, number> = {};
  for (const { evaluatorId, result } of evaluations) {
    if (!result.scores) continue;
    for (const [key, value] of Object.entries(result.scores)) {
      scores[`${evaluatorId}.${key}`] = value;
    }
  }

  return {
    pass: evaluations.every((evaluation) => evaluation.result.pass),
    checks,
    scores: Object.keys(scores).length > 0 ? scores : undefined,
  };
}

export async function runBenchmark(opts: {
  suite: BenchmarkSuite;
  variants: Variant[];
  transport: Transport;
  evaluators: Evaluator[];
  mode: Mode;
  record?: boolean;
  recordingsDir?: string;
  onProgress?: (completed: number, total: number, result: RunResult) => void;
}): Promise<BenchmarkReport> {
  const timestamp = Date.now();
  const totalRuns = opts.suite.cases.length * opts.variants.length;
  const results: RunResult[] = [];
  let completed = 0;

  for (const case_ of opts.suite.cases) {
    for (const variant of opts.variants) {
      const recording: RecordingMeta | undefined = opts.record
        ? ({
            suiteId: opts.suite.id,
            caseId: case_.id,
            variantId: variant.id,
            runId: makeRunId(),
            timestamp,
            recordingsDir: opts.recordingsDir,
          } as RecordingMeta)
        : undefined;

      const ctx: RunContext = {
        suite: opts.suite,
        case_,
        variant,
        mode: opts.mode,
        recording,
      };

      const runStart = Date.now();
      const turnInput = getTurnInput(opts.suite, case_.input);
      const turnResult = await opts.transport.runTurn(ctx, turnInput);
      const turns = [turnResult];

      const evaluation = combineEvaluations(
        opts.evaluators.map((evaluator) => ({
          evaluatorId: evaluator.id,
          result: evaluator.evaluate(ctx, turns),
        }))
      );

      const runResult: RunResult = {
        suiteId: opts.suite.id,
        caseId: case_.id,
        variantId: variant.id,
        mode: opts.mode,
        turns,
        latencyMs: Date.now() - runStart,
        totalInputTokens: turns.reduce((sum, turn) => sum + turn.inputTokens, 0),
        totalOutputTokens: turns.reduce((sum, turn) => sum + turn.outputTokens, 0),
        totalCostUsd: turns.reduce((sum, turn) => sum + turn.costUsd, 0),
        evaluation,
      };

      results.push(runResult);
      completed += 1;
      opts.onProgress?.(completed, totalRuns, runResult);
    }
  }

  const byVariant: BenchmarkReport['summary']['byVariant'] = {};
  for (const variant of opts.variants) {
    const variantResults = results.filter((result) => result.variantId === variant.id);
    const passCount = variantResults.filter((result) => result.evaluation.pass).length;
    const failCount = variantResults.length - passCount;
    const totalCostUsd = variantResults.reduce((sum, result) => sum + result.totalCostUsd, 0);
    const avgLatencyMs =
      variantResults.length > 0
        ? variantResults.reduce((sum, result) => sum + result.latencyMs, 0) / variantResults.length
        : 0;

    byVariant[variant.id] = {
      accuracy: variantResults.length > 0 ? passCount / variantResults.length : 0,
      avgLatencyMs,
      totalCostUsd,
      passCount,
      failCount,
    };
  }

  return {
    timestamp,
    suiteId: opts.suite.id,
    mode: opts.mode,
    variants: opts.variants,
    results,
    summary: {
      totalCases: opts.suite.cases.length,
      totalRuns,
      byVariant,
    },
  };
}
