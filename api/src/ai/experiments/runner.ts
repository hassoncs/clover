import type { AIConfig } from '../generator';
import { generateGame } from '../generator';
import { evaluateGame } from '../evaluator';
import type { EvaluationConfig } from '../evaluator/types';
import type {
  ExperimentConfig,
  ExperimentResult,
  ExperimentSummary,
  RunResult,
  ModelStats,
  PromptStats,
} from './types';

export interface ExperimentRunner {
  run(
    config: ExperimentConfig,
    apiKeys: { openai?: string; openrouter?: string; anthropic?: string },
    onProgress?: (run: RunResult) => void
  ): Promise<ExperimentResult>;
}

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateExperimentId(): string {
  const date = new Date().toISOString().split('T')[0];
  const seq = Math.random().toString(36).slice(2, 6);
  return `exp-${date}-${seq}`;
}

function getApiKeyForProvider(
  provider: string,
  apiKeys: { openai?: string; openrouter?: string; anthropic?: string }
): string | undefined {
  switch (provider) {
    case 'openai':
      return apiKeys.openai;
    case 'openrouter':
      return apiKeys.openrouter;
    case 'anthropic':
      return apiKeys.anthropic;
    default:
      return undefined;
  }
}

function calculateSummary(runs: RunResult[]): ExperimentSummary {
  const modelScores: Record<string, ModelStats> = {};
  const promptDifficulty: Record<string, PromptStats> = {};

  const successfulRuns = runs.filter(r => r.success && r.evaluation);
  const failedRuns = runs.filter(r => !r.success);

  for (const run of runs) {
    const modelKey = `${run.model.provider}/${run.model.model}`;
    
    if (!modelScores[modelKey]) {
      modelScores[modelKey] = {
        avgScore: 0,
        minScore: 100,
        maxScore: 0,
        successRate: 0,
        avgDurationMs: 0,
        runs: 0,
      };
    }

    const modelStats = modelScores[modelKey];
    modelStats.runs++;

    if (run.success && run.evaluation) {
      const score = run.evaluation.overall;
      modelStats.avgScore = ((modelStats.avgScore * (modelStats.runs - 1)) + score) / modelStats.runs;
      modelStats.minScore = Math.min(modelStats.minScore, score);
      modelStats.maxScore = Math.max(modelStats.maxScore, score);
    }

    modelStats.avgDurationMs = ((modelStats.avgDurationMs * (modelStats.runs - 1)) + run.durationMs) / modelStats.runs;
    modelStats.successRate = runs.filter(r => 
      r.model.provider === run.model.provider && 
      r.model.model === run.model.model && 
      r.success
    ).length / modelStats.runs;
  }

  for (const run of runs) {
    if (!promptDifficulty[run.prompt]) {
      promptDifficulty[run.prompt] = {
        avgScore: 0,
        successRate: 0,
        runs: 0,
      };
    }

    const promptStats = promptDifficulty[run.prompt];
    promptStats.runs++;

    if (run.success && run.evaluation) {
      promptStats.avgScore = ((promptStats.avgScore * (promptStats.runs - 1)) + run.evaluation.overall) / promptStats.runs;
    }

    promptStats.successRate = runs.filter(r => r.prompt === run.prompt && r.success).length / promptStats.runs;
  }

  return {
    totalRuns: runs.length,
    successfulRuns: successfulRuns.length,
    failedRuns: failedRuns.length,
    modelScores,
    promptDifficulty,
  };
}

export async function runExperiment(
  config: ExperimentConfig,
  apiKeys: { openai?: string; openrouter?: string; anthropic?: string },
  onProgress?: (run: RunResult) => void
): Promise<ExperimentResult> {
  const experimentId = generateExperimentId();
  const startTime = new Date();
  const runs: RunResult[] = [];

  const evaluationConfig: EvaluationConfig = {
    provider: 'openrouter',
    apiKey: apiKeys.openrouter ?? apiKeys.openai ?? '',
    model: config.evaluationModel ?? 'anthropic/claude-sonnet-4',
  };

  for (const model of config.models) {
    const apiKey = getApiKeyForProvider(model.provider, apiKeys);
    
    if (!apiKey) {
      console.warn(`No API key for provider ${model.provider}, skipping model ${model.model}`);
      continue;
    }

    const generationConfig: AIConfig = {
      provider: model.provider,
      apiKey,
      model: model.model,
    };

    for (const prompt of config.prompts) {
      for (let i = 0; i < config.runsPerCombination; i++) {
        const runId = generateRunId();
        const runStart = Date.now();

        try {
          const genResult = await generateGame(prompt, generationConfig);

          if (!genResult.success || !genResult.game) {
            const run: RunResult = {
              runId,
              model,
              prompt,
              iteration: i,
              success: false,
              error: genResult.error?.message ?? 'Generation failed',
              durationMs: Date.now() - runStart,
              timestamp: new Date(),
            };
            runs.push(run);
            onProgress?.(run);
            continue;
          }

          const evalResult = await evaluateGame(
            { gameDefinition: genResult.game, originalPrompt: prompt },
            evaluationConfig
          );

          const run: RunResult = {
            runId,
            model,
            prompt,
            iteration: i,
            game: genResult.game,
            evaluation: evalResult.evaluation,
            success: evalResult.success,
            error: evalResult.error?.message,
            durationMs: Date.now() - runStart,
            timestamp: new Date(),
          };

          runs.push(run);
          onProgress?.(run);
        } catch (error) {
          const run: RunResult = {
            runId,
            model,
            prompt,
            iteration: i,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            durationMs: Date.now() - runStart,
            timestamp: new Date(),
          };
          runs.push(run);
          onProgress?.(run);
        }
      }
    }
  }

  const endTime = new Date();
  const summary = calculateSummary(runs);

  return {
    experimentId,
    config,
    runs,
    summary,
    startTime,
    endTime,
    totalDurationMs: endTime.getTime() - startTime.getTime(),
  };
}

export function formatExperimentReport(result: ExperimentResult): string {
  const lines: string[] = [];

  lines.push(`# Experiment Report: ${result.experimentId}`);
  lines.push(`Name: ${result.config.name}`);
  lines.push(`Started: ${result.startTime.toISOString()}`);
  lines.push(`Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push('');

  lines.push('## Summary');
  lines.push(`- Total runs: ${result.summary.totalRuns}`);
  lines.push(`- Successful: ${result.summary.successfulRuns}`);
  lines.push(`- Failed: ${result.summary.failedRuns}`);
  lines.push('');

  lines.push('## Model Performance');
  lines.push('| Model | Avg Score | Min | Max | Success Rate | Avg Time |');
  lines.push('|-------|-----------|-----|-----|--------------|----------|');

  for (const [modelKey, stats] of Object.entries(result.summary.modelScores)) {
    lines.push(
      `| ${modelKey} | ${stats.avgScore.toFixed(1)} | ${stats.minScore} | ${stats.maxScore} | ${(stats.successRate * 100).toFixed(0)}% | ${(stats.avgDurationMs / 1000).toFixed(1)}s |`
    );
  }
  lines.push('');

  lines.push('## Prompt Difficulty');
  lines.push('| Prompt | Avg Score | Success Rate |');
  lines.push('|--------|-----------|--------------|');

  for (const [prompt, stats] of Object.entries(result.summary.promptDifficulty)) {
    const shortPrompt = prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt;
    lines.push(
      `| ${shortPrompt} | ${stats.avgScore.toFixed(1)} | ${(stats.successRate * 100).toFixed(0)}% |`
    );
  }

  return lines.join('\n');
}
