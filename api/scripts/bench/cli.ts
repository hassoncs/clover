import path from 'node:path';
import { DEFAULT_CONFIG } from './benchmark.config';
import { runBenchmark } from './core/runner';
import type { BenchmarkSuite, Evaluator, Mode, TaskType, Variant } from './core/types';
import { createRoutingEvaluator } from './evaluators/routing';
import { formatMarkdownReport, writeReportOutputs } from './reports/format';
import { ROUTING_SUITE } from './suites/routing';
import { createLiveTransport } from './transport/live';
import { createReplayTransport } from './transport/replay';

interface CliOptions {
  suite: TaskType | 'routing';
  mode: Mode;
  record: boolean;
  variant?: string;
  report: 'json' | 'markdown' | 'both';
}

function usage(): string {
  return `Usage: hush run -- npx tsx api/scripts/bench/cli.ts [options]

Options:
  --suite <name>      Suite to run (routing, generation, etc.)
  --mode <mode>       live or replay (default: live)
  --record            Record responses for future replay
  --variant <id>      Run only specific variant (default: all)
  --report <format>   Output format: json, markdown, both (default: both)`;
}

function requireValue(args: string[], i: number, name: string): string {
  const value = args[i + 1];
  if (!value) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    suite: 'routing',
    mode: 'live',
    record: false,
    report: 'both',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--suite') {
      opts.suite = requireValue(argv, i, '--suite') as CliOptions['suite'];
      i += 1;
      continue;
    }
    if (arg === '--mode') {
      const value = requireValue(argv, i, '--mode');
      if (value !== 'live' && value !== 'replay') {
        throw new Error(`Invalid --mode value: ${value}`);
      }
      opts.mode = value;
      i += 1;
      continue;
    }
    if (arg === '--record') {
      opts.record = true;
      continue;
    }
    if (arg === '--variant') {
      opts.variant = requireValue(argv, i, '--variant');
      i += 1;
      continue;
    }
    if (arg === '--report') {
      const value = requireValue(argv, i, '--report');
      if (value !== 'json' && value !== 'markdown' && value !== 'both') {
        throw new Error(`Invalid --report value: ${value}`);
      }
      opts.report = value;
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return opts;
}

function selectSuite(suiteId: string): { suite: BenchmarkSuite; evaluators: Evaluator[]; variants: Variant[] } {
  if (suiteId === 'routing') {
    return {
      suite: ROUTING_SUITE,
      evaluators: [createRoutingEvaluator()],
      variants: DEFAULT_CONFIG.variants.routing,
    };
  }

  throw new Error(`Unsupported suite: ${suiteId}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const selected = selectSuite(opts.suite);
  const variants = opts.variant
    ? selected.variants.filter((variant) => variant.id === opts.variant)
    : selected.variants;

  if (variants.length === 0) {
    throw new Error(`No variants selected${opts.variant ? ` for id ${opts.variant}` : ''}`);
  }

  const recordingsDir = path.resolve(process.cwd(), DEFAULT_CONFIG.recordingsDir);
  const reportsDir = path.resolve(process.cwd(), DEFAULT_CONFIG.reportsDir);

  const transport =
    opts.mode === 'live'
      ? createLiveTransport({
          apiKey: process.env.OPENROUTER_API_KEY || (() => {
            throw new Error('OPENROUTER_API_KEY not set. Run with: hush run -- npx tsx api/scripts/bench/cli.ts ...');
          })(),
        })
      : createReplayTransport({ recordingsDir });

  const report = await runBenchmark({
    suite: selected.suite,
    variants,
    transport,
    evaluators: selected.evaluators,
    mode: opts.mode,
    record: opts.record,
    recordingsDir,
    onProgress: (completed, total, result) => {
      const marker = result.evaluation.pass ? 'PASS' : 'FAIL';
      console.log(`[${completed}/${total}] ${marker} ${result.variantId} ${result.caseId}`);
    },
  });

  const stamp = new Date(report.timestamp).toISOString().replace(/[:.]/g, '-');
  const reportBasePath = path.join(reportsDir, `${report.suiteId}-${report.mode}-${stamp}`);
  const outputPaths = await writeReportOutputs({
    report,
    reportBasePath,
    format: opts.report,
  });

  if (opts.report === 'markdown' || opts.report === 'both') {
    console.log('\n' + formatMarkdownReport(report));
  }

  if (outputPaths.markdownPath) {
    console.log(`\nMarkdown report: ${outputPaths.markdownPath}`);
  }
  if (outputPaths.jsonPath) {
    console.log(`JSON report: ${outputPaths.jsonPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('\n' + usage());
  process.exit(1);
});
