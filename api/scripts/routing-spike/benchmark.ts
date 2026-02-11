/**
 * Run with: hush run -- npx tsx api/scripts/routing-spike/benchmark.ts
 */
import { TEST_QUERIES, SYSTEM_PROMPT, type Tier } from './test-queries';
import { classifyHeuristic } from './approach-a-heuristic';
import { classifyWithLLM, CLASSIFIER_MODELS } from './approach-b-llm-classifier';
import { classifyHybrid } from './approach-c-hybrid';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('OPENROUTER_API_KEY not set. Run with: hush run -- npx tsx api/scripts/routing-spike/benchmark.ts');
  process.exit(1);
}

interface BenchmarkRow {
  queryId: number;
  prompt: string;
  expected: Tier;
  heuristicTier: Tier;
  heuristicCorrect: boolean;
  heuristicMs: number;
  llmTier: Record<string, Tier>;
  llmCorrect: Record<string, boolean>;
  llmMs: Record<string, number>;
  llmCost: Record<string, number>;
  hybridTier: Tier;
  hybridCorrect: boolean;
  hybridMs: number;
  hybridMethod: string;
  hybridCost: number;
}

function accuracy(results: BenchmarkRow[], key: (r: BenchmarkRow) => boolean): string {
  const correct = results.filter(key).length;
  return `${correct}/${results.length} (${((correct / results.length) * 100).toFixed(0)}%)`;
}

function avgMs(results: BenchmarkRow[], key: (r: BenchmarkRow) => number): string {
  const avg = results.reduce((sum, r) => sum + key(r), 0) / results.length;
  return `${avg.toFixed(0)}ms`;
}

function totalCost(results: BenchmarkRow[], key: (r: BenchmarkRow) => number): string {
  const total = results.reduce((sum, r) => sum + key(r), 0);
  return `$${total.toFixed(6)}`;
}

async function run() {
  console.log(`\n${'═'.repeat(80)}`);
  console.log('  ROUTING SPIKE BENCHMARK');
  console.log(`  ${TEST_QUERIES.length} test queries × 3 approaches × ${CLASSIFIER_MODELS.length} LLM classifier models`);
  console.log(`${'═'.repeat(80)}\n`);

  const results: BenchmarkRow[] = [];

  for (const query of TEST_QUERIES) {
    const truncatedPrompt = query.prompt.length > 60
      ? query.prompt.slice(0, 57) + '...'
      : query.prompt;

    process.stdout.write(`  [${String(query.id).padStart(2)}] ${truncatedPrompt.padEnd(62)} `);

    // ── Approach A: Heuristic ──
    const hStart = Date.now();
    const hResult = classifyHeuristic(query.prompt, SYSTEM_PROMPT);
    const hMs = Date.now() - hStart;

    // ── Approach B: LLM Classifier (all models) ──
    const llmTiers: Record<string, Tier> = {};
    const llmCorrects: Record<string, boolean> = {};
    const llmTimes: Record<string, number> = {};
    const llmCosts: Record<string, number> = {};

    for (let i = 0; i < CLASSIFIER_MODELS.length; i++) {
      const model = CLASSIFIER_MODELS[i];
      try {
        const llmResult = await classifyWithLLM(query.prompt, SYSTEM_PROMPT, apiKey!, i);
        llmTiers[model.id] = llmResult.tier;
        llmCorrects[model.id] = llmResult.tier === query.expectedTier;
        llmTimes[model.id] = llmResult.latencyMs;
        llmCosts[model.id] = llmResult.costUsd;
      } catch (err) {
        llmTiers[model.id] = 'CODING';
        llmCorrects[model.id] = false;
        llmTimes[model.id] = 0;
        llmCosts[model.id] = 0;
        console.error(`  ⚠ ${model.displayName} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ── Approach C: Hybrid ──
    const hybridResult = await classifyHybrid(query.prompt, SYSTEM_PROMPT, apiKey!);

    const row: BenchmarkRow = {
      queryId: query.id,
      prompt: query.prompt,
      expected: query.expectedTier,
      heuristicTier: hResult.tier,
      heuristicCorrect: hResult.tier === query.expectedTier,
      heuristicMs: hMs,
      llmTier: llmTiers,
      llmCorrect: llmCorrects,
      llmMs: llmTimes,
      llmCost: llmCosts,
      hybridTier: hybridResult.tier,
      hybridCorrect: hybridResult.tier === query.expectedTier,
      hybridMs: hybridResult.latencyMs,
      hybridMethod: hybridResult.method,
      hybridCost: hybridResult.costUsd,
    };
    results.push(row);

    const hMark = row.heuristicCorrect ? '✓' : '✗';
    const firstLLM = CLASSIFIER_MODELS[0].id;
    const lMark = row.llmCorrect[firstLLM] ? '✓' : '✗';
    const cMark = row.hybridCorrect ? '✓' : '✗';
    console.log(
      `H:${hMark} ${hResult.tier.padEnd(9)} | L:${lMark} ${(llmTiers[firstLLM] ?? '?').padEnd(9)} ${String(llmTimes[firstLLM] ?? 0).padStart(4)}ms | C:${cMark} ${hybridResult.method === 'heuristic-fast' ? 'fast' : 'llm '} ${hybridResult.tier.padEnd(9)}`
    );
  }

  // ── Summary ──
  console.log(`\n${'─'.repeat(80)}`);
  console.log('  RESULTS SUMMARY');
  console.log(`${'─'.repeat(80)}\n`);

  console.log('  Approach A — Heuristic (keyword matching):');
  console.log(`    Accuracy:  ${accuracy(results, r => r.heuristicCorrect)}`);
  console.log(`    Avg time:  ${avgMs(results, r => r.heuristicMs)}`);
  console.log(`    Cost:      $0 (runs locally)`);
  console.log();

  for (const model of CLASSIFIER_MODELS) {
    console.log(`  Approach B — LLM Classifier (${model.displayName}):`);
    console.log(`    Accuracy:  ${accuracy(results, r => r.llmCorrect[model.id] ?? false)}`);
    console.log(`    Avg time:  ${avgMs(results, r => r.llmMs[model.id] ?? 0)}`);
    console.log(`    Total cost: ${totalCost(results, r => r.llmCost[model.id] ?? 0)} for ${results.length} queries`);
    console.log();
  }

  console.log('  Approach C — Hybrid (heuristic + LLM fallback):');
  console.log(`    Accuracy:  ${accuracy(results, r => r.hybridCorrect)}`);
  console.log(`    Avg time:  ${avgMs(results, r => r.hybridMs)}`);
  console.log(`    Total cost: ${totalCost(results, r => r.hybridCost)} for ${results.length} queries`);
  const fastCount = results.filter(r => r.hybridMethod === 'heuristic-fast').length;
  console.log(`    Fast path:  ${fastCount}/${results.length} resolved by heuristic alone`);
  console.log();

  // ── Per-query detail table ──
  console.log(`${'─'.repeat(80)}`);
  console.log('  PER-QUERY BREAKDOWN');
  console.log(`${'─'.repeat(80)}\n`);

  console.log('  ID | Expected   | Heuristic  | GPT-4o-mini | Gemini Flash | DeepSeek V3 | Hybrid     ');
  console.log('  ---|------------|------------|-------------|--------------|-------------|------------');

  for (const r of results) {
    const models = CLASSIFIER_MODELS;
    const h = `${r.heuristicCorrect ? '✓' : '✗'} ${r.heuristicTier}`;
    const l0 = `${r.llmCorrect[models[0].id] ? '✓' : '✗'} ${r.llmTier[models[0].id] ?? '?'}`;
    const l1 = `${r.llmCorrect[models[1].id] ? '✓' : '✗'} ${r.llmTier[models[1].id] ?? '?'}`;
    const l2 = `${r.llmCorrect[models[2].id] ? '✓' : '✗'} ${r.llmTier[models[2].id] ?? '?'}`;
    const hy = `${r.hybridCorrect ? '✓' : '✗'} ${r.hybridTier}`;

    console.log(
      `  ${String(r.queryId).padStart(2)} | ${r.expected.padEnd(10)} | ${h.padEnd(10)} | ${l0.padEnd(11)} | ${l1.padEnd(12)} | ${l2.padEnd(11)} | ${hy.padEnd(10)}`
    );
  }

  // ── Misclassifications ──
  console.log(`\n${'─'.repeat(80)}`);
  console.log('  MISCLASSIFICATIONS');
  console.log(`${'─'.repeat(80)}\n`);

  for (const r of results) {
    const misses: string[] = [];
    if (!r.heuristicCorrect) misses.push(`Heuristic→${r.heuristicTier}`);
    for (const model of CLASSIFIER_MODELS) {
      if (!r.llmCorrect[model.id]) misses.push(`${model.displayName}→${r.llmTier[model.id]}`);
    }
    if (!r.hybridCorrect) misses.push(`Hybrid→${r.hybridTier}`);

    if (misses.length > 0) {
      const truncated = r.prompt.length > 50 ? r.prompt.slice(0, 47) + '...' : r.prompt;
      console.log(`  [${r.queryId}] "${truncated}"`);
      console.log(`      Expected: ${r.expected} | Missed by: ${misses.join(', ')}`);
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log('  DONE');
  console.log(`${'═'.repeat(80)}\n`);
}

run().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
