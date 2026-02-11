export type ChatModelTier = 'fast' | 'balanced' | 'quality' | 'reasoning';

export interface ChatModelOption {
  id: string;
  tier: ChatModelTier;
  label: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

export const CHAT_MODELS: Record<ChatModelTier, ChatModelOption> = {
  fast: {
    id: 'openai/gpt-oss-120b:nitro',
    tier: 'fast',
    label: 'Fast (GPT-OSS 120B Nitro)',
    inputPricePer1M: 0.30,
    outputPricePer1M: 0.80,
  },
  balanced: {
    id: 'openai/gpt-4o',
    tier: 'balanced',
    label: 'Balanced (GPT-4o)',
    inputPricePer1M: 2.50,
    outputPricePer1M: 10.00,
  },
  quality: {
    id: 'anthropic/claude-sonnet-4-20250514',
    tier: 'quality',
    label: 'Quality (Claude Sonnet 4)',
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
  },
  reasoning: {
    id: 'moonshotai/kimi-k2-thinking',
    tier: 'reasoning',
    label: 'Reasoning (Kimi K2.5)',
    inputPricePer1M: 0.60,
    outputPricePer1M: 2.40,
  },
};

export const DEFAULT_CHAT_TIER: ChatModelTier = 'fast';

export function resolveChatModel(tierOrModelId?: string): ChatModelOption {
  if (!tierOrModelId) {
    return CHAT_MODELS[DEFAULT_CHAT_TIER];
  }

  const asTier = tierOrModelId as ChatModelTier;
  if (asTier in CHAT_MODELS) {
    return CHAT_MODELS[asTier];
  }

  const byId = Object.values(CHAT_MODELS).find(m => m.id === tierOrModelId);
  if (byId) {
    return byId;
  }

  return {
    id: tierOrModelId,
    tier: 'balanced',
    label: tierOrModelId,
    inputPricePer1M: 0,
    outputPricePer1M: 0,
  };
}
