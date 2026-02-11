import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { CHAT_MODELS, DEFAULT_CHAT_TIER } from './chat-model-config';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export function createModel(options: {
  apiKey: string;
  model?: string;
}): LanguageModel {
  const openrouter = createOpenAI({
    apiKey: options.apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });
  return openrouter.chat(options.model ?? CHAT_MODELS[DEFAULT_CHAT_TIER].id);
}
