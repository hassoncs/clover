import type { GameDefinition } from '../../../../shared/src/types/GameDefinition';

export interface GameEvaluationDimensions {
  visualAppeal: number;
  themeMatch: number;
  entityClarity: number;
  layoutBalance: number;
}

export interface GameEvaluationStructural {
  hasWinCondition: boolean;
  hasLoseCondition: boolean;
  hasPlayerControl: boolean;
  entityCountReasonable: boolean;
  physicsConfigured: boolean;
}

export interface GameEvaluation {
  overall: number;
  dimensions: GameEvaluationDimensions;
  structural: GameEvaluationStructural;
  issues: string[];
  suggestions: string[];
  confidence: number;
}

export interface EvaluationRequest {
  screenshot?: string;
  gameDefinition: GameDefinition;
  originalPrompt?: string;
}

export interface EvaluationConfig {
  provider: 'openai' | 'openrouter' | 'anthropic';
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export interface EvaluationResult {
  success: boolean;
  evaluation?: GameEvaluation;
  error?: {
    code: 'EVALUATION_FAILED' | 'API_ERROR' | 'INVALID_INPUT';
    message: string;
  };
  durationMs?: number;
}

export const DEFAULT_EVALUATION_MODELS: Record<string, string> = {
  openai: 'gpt-4o',
  openrouter: 'anthropic/claude-sonnet-4',
  anthropic: 'claude-sonnet-4-20250514',
};
