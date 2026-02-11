import type { Tier } from './test-queries';

export interface LLMClassifierResult {
  tier: Tier;
  confidence: number;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const CLASSIFIER_PROMPT = `Classify this user message into exactly one category based on what kind of AI model capability it needs.

Categories:
- SIMPLE: Quick answers, trivial edits, confirmations, factual lookups. A small fast model handles this fine.
- CODING: Needs to write/edit code, implement features, create game mechanics. Needs a good coding model.
- COMPLEX: Multi-step design, architecture, creative game design, system redesign. Needs a strong general model.
- REASONING: Mathematical proofs, formal logic, algorithm analysis, optimization theory. Needs a reasoning model.

Respond with ONLY the category name. Nothing else.`;

interface ModelConfig {
  id: string;
  displayName: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

const CLASSIFIER_MODELS: ModelConfig[] = [
  {
    id: 'openai/gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
  },
  {
    id: 'google/gemini-2.0-flash-001',
    displayName: 'Gemini 2.0 Flash',
    inputPricePer1M: 0.10,
    outputPricePer1M: 0.40,
  },
  {
    id: 'deepseek/deepseek-chat',
    displayName: 'DeepSeek V3',
    inputPricePer1M: 0.14,
    outputPricePer1M: 0.28,
  },
];

function parseTier(text: string): Tier {
  const upper = text.trim().toUpperCase();
  if (upper.includes('REASONING')) return 'REASONING';
  if (upper.includes('COMPLEX')) return 'COMPLEX';
  if (upper.includes('CODING')) return 'CODING';
  if (upper.includes('SIMPLE')) return 'SIMPLE';
  return 'CODING';
}

export async function classifyWithLLM(
  prompt: string,
  _systemPrompt: string | undefined,
  apiKey: string,
  classifierModelIndex = 0,
): Promise<LLMClassifierResult> {
  const modelConfig = CLASSIFIER_MODELS[classifierModelIndex] ?? CLASSIFIER_MODELS[0];
  const truncated = prompt.slice(0, 500);

  const start = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelConfig.id,
      messages: [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: truncated },
      ],
      max_tokens: 5,
      temperature: 0,
    }),
  });
  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM classifier failed (${response.status}): ${body}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const content = data.choices?.[0]?.message?.content ?? '';
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  const costUsd =
    (inputTokens / 1_000_000) * modelConfig.inputPricePer1M +
    (outputTokens / 1_000_000) * modelConfig.outputPricePer1M;

  return {
    tier: parseTier(content),
    confidence: 0.85,
    model: modelConfig.id,
    latencyMs,
    inputTokens,
    outputTokens,
    costUsd,
  };
}

export { CLASSIFIER_MODELS };
