import type { Tier } from './test-queries';
import { classifyHeuristic } from './approach-a-heuristic';
import { classifyWithLLM } from './approach-b-llm-classifier';

export interface HybridResult {
  tier: Tier;
  confidence: number;
  method: 'heuristic-fast' | 'llm-fallback';
  latencyMs: number;
  costUsd: number;
  signals?: string[];
}

const HIGH_CONFIDENCE_THRESHOLD = 0.75;

export async function classifyHybrid(
  prompt: string,
  systemPrompt: string | undefined,
  apiKey: string,
): Promise<HybridResult> {
  const start = Date.now();

  const heuristic = classifyHeuristic(prompt, systemPrompt);

  if (heuristic.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return {
      tier: heuristic.tier,
      confidence: heuristic.confidence,
      method: 'heuristic-fast',
      latencyMs: Date.now() - start,
      costUsd: 0,
      signals: heuristic.signals,
    };
  }

  const llmResult = await classifyWithLLM(prompt, systemPrompt, apiKey, 0);
  return {
    tier: llmResult.tier,
    confidence: llmResult.confidence,
    method: 'llm-fallback',
    latencyMs: Date.now() - start,
    costUsd: llmResult.costUsd,
  };
}
