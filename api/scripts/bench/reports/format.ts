import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BenchmarkReport } from '../core/types';

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(6)}`;
}

export function formatMarkdownReport(report: BenchmarkReport): string {
  const lines: string[] = [];
  lines.push(`# Benchmark Report: ${report.suiteId}`);
  lines.push('');
  lines.push(`- Timestamp: ${new Date(report.timestamp).toISOString()}`);
  lines.push(`- Mode: ${report.mode}`);
  lines.push(`- Total runs: ${report.summary.totalRuns}`);
  lines.push('');
  lines.push('| Variant | Accuracy | Avg Latency (ms) | Total Cost (USD) | Pass | Fail |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');

  for (const variant of report.variants) {
    const summary = report.summary.byVariant[variant.id];
    lines.push(
      `| ${variant.id} | ${formatPercent(summary.accuracy)} | ${summary.avgLatencyMs.toFixed(1)} | ${formatMoney(summary.totalCostUsd)} | ${summary.passCount} | ${summary.failCount} |`
    );
  }

  const failures = report.results.filter((result) => !result.evaluation.pass);
  lines.push('');
  lines.push('## Misclassifications');
  lines.push('');
  if (failures.length === 0) {
    lines.push('- None');
  } else {
    for (const result of failures) {
      const check = result.evaluation.checks.find((entry) => !entry.pass);
      const value = check?.value as { expectedTier?: string; actualTier?: string } | undefined;
      lines.push(
        `- case=${result.caseId} variant=${result.variantId} expected=${value?.expectedTier ?? 'UNKNOWN'} actual=${value?.actualTier ?? 'UNKNOWN'} message=${check?.message ?? 'failed'}`
      );
    }
  }

  return lines.join('\n');
}

export function formatJsonReport(report: BenchmarkReport): string {
  return JSON.stringify(report, null, 2);
}

export async function writeReportOutputs(opts: {
  report: BenchmarkReport;
  reportBasePath: string;
  format: 'json' | 'markdown' | 'both';
}): Promise<{ markdownPath?: string; jsonPath?: string }> {
  await mkdir(path.dirname(opts.reportBasePath), { recursive: true });

  const output: { markdownPath?: string; jsonPath?: string } = {};
  if (opts.format === 'markdown' || opts.format === 'both') {
    const markdownPath = `${opts.reportBasePath}.md`;
    await writeFile(markdownPath, formatMarkdownReport(opts.report), 'utf8');
    output.markdownPath = markdownPath;
  }

  if (opts.format === 'json' || opts.format === 'both') {
    const jsonPath = `${opts.reportBasePath}.json`;
    await writeFile(jsonPath, formatJsonReport(opts.report), 'utf8');
    output.jsonPath = jsonPath;
  }

  return output;
}
