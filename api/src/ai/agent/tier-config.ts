import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import { microsToSparks } from '@slopcade/shared';

export type AgentTier = 'free' | 'standard' | 'pro';

export interface TierModelConfig {
  tier: AgentTier;
  displayName: string;
  primary: {
    provider: 'openai' | 'openrouter' | 'anthropic';
    model: string;
    baseURL?: string;
  };
  fallback?: {
    provider: 'openai' | 'openrouter' | 'anthropic';
    model: string;
    baseURL?: string;
  };
  maxBudgetMicros: number;
  estimatedCostPerStepMicros: number;
}

export const TIER_CONFIGS: Record<AgentTier, TierModelConfig> = {
  free: {
    tier: 'free',
    displayName: 'Free',
    primary: {
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
    },
    maxBudgetMicros: 50_000,
    estimatedCostPerStepMicros: 5_000,
  },
  standard: {
    tier: 'standard',
    displayName: 'Standard',
    primary: {
      provider: 'openrouter',
      model: 'openai/gpt-4o',
    },
    fallback: {
      provider: 'openai',
      model: 'gpt-4o',
    },
    maxBudgetMicros: 200_000,
    estimatedCostPerStepMicros: 20_000,
  },
  pro: {
    tier: 'pro',
    displayName: 'Pro',
    primary: {
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4-20250514',
    },
    fallback: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    },
    maxBudgetMicros: 500_000,
    estimatedCostPerStepMicros: 50_000,
  },
};

export function resolveTierConfig(tier: string): TierModelConfig {
  const config = TIER_CONFIGS[tier as AgentTier];
  if (!config) {
    throw new Error(`Invalid tier: ${tier}. Must be one of: ${Object.keys(TIER_CONFIGS).join(', ')}`);
  }
  return config;
}

export function createModelForTier(
  config: TierModelConfig,
  env: { OPENROUTER_API_KEY?: string; OPENAI_API_KEY?: string; ANTHROPIC_API_KEY?: string }
): LanguageModel {
  const { provider, model, baseURL } = config.primary;

  switch (provider) {
    case 'openai': {
      if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for openai provider');
      const openai = createOpenAI({
        apiKey: env.OPENAI_API_KEY,
        baseURL,
      });
      return openai(model);
    }
    case 'openrouter': {
      if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is required for openrouter provider');
      const openrouter = createOpenAI({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL: baseURL ?? 'https://openrouter.ai/api/v1',
      });
      return openrouter(model);
    }
    case 'anthropic': {
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required for anthropic provider');
      const anthropic = createAnthropic({
        apiKey: env.ANTHROPIC_API_KEY,
        baseURL,
      });
      return anthropic(model);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function estimateRunCost(tier: AgentTier, estimatedSteps: number): { totalMicros: number; displaySparks: number } {
  const config = TIER_CONFIGS[tier];
  const totalMicros = config.estimatedCostPerStepMicros * estimatedSteps;
  return {
    totalMicros,
    displaySparks: microsToSparks(totalMicros),
  };
}
