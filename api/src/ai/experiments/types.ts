import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';
import type { GameEvaluation } from '../evaluator/types';

export interface ExperimentConfig {
  name: string;
  description?: string;
  models: ModelConfig[];
  prompts: string[];
  runsPerCombination: number;
  evaluationModel?: string;
  maxIterations?: number;
  targetScore?: number;
}

export interface ModelConfig {
  provider: 'openai' | 'openrouter' | 'anthropic';
  model: string;
  displayName?: string;
}

export interface RunResult {
  runId: string;
  model: ModelConfig;
  prompt: string;
  iteration: number;
  game?: GameDefinition;
  evaluation?: GameEvaluation;
  success: boolean;
  error?: string;
  durationMs: number;
  timestamp: Date;
}

export interface ExperimentResult {
  experimentId: string;
  config: ExperimentConfig;
  runs: RunResult[];
  summary: ExperimentSummary;
  startTime: Date;
  endTime: Date;
  totalDurationMs: number;
}

export interface ExperimentSummary {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  modelScores: Record<string, ModelStats>;
  promptDifficulty: Record<string, PromptStats>;
}

export interface ModelStats {
  avgScore: number;
  minScore: number;
  maxScore: number;
  successRate: number;
  avgDurationMs: number;
  runs: number;
}

export interface PromptStats {
  avgScore: number;
  successRate: number;
  runs: number;
}

export const BENCHMARK_PROMPTS: string[] = [
  "Make a game where I launch balls at targets",
  "Create a platformer where a character jumps on platforms",
  "Make a game where I catch falling objects",
  "Create a puzzle game with stacking blocks",
  "Make a game where I drag objects to solve puzzles",
];
