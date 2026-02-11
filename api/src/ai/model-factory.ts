import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export function createModel(options: {
  apiKey: string;
  model?: string;
}): LanguageModel {
  const openrouter = createOpenAI({
    apiKey: options.apiKey,
    baseURL: OPENROUTER_BASE_URL,
  });
  return openrouter.chat(options.model ?? DEFAULT_MODEL);
}
