import type { Variant } from './core/types';
import { ROUTING_CLASSIFIER_PROMPT } from './suites/routing';

export const DEFAULT_CONFIG: {
  recordingsDir: string;
  reportsDir: string;
  variants: {
    routing: Variant[];
  };
} = {
  recordingsDir: 'api/scripts/bench/recordings',
  reportsDir: 'api/scripts/bench/reports',
  variants: {
    routing: [
      { id: 'gpt4o-mini', model: 'openai/gpt-4o-mini', systemPrompt: ROUTING_CLASSIFIER_PROMPT },
      { id: 'gemini-flash', model: 'google/gemini-2.0-flash-001', systemPrompt: ROUTING_CLASSIFIER_PROMPT },
      { id: 'deepseek-v3', model: 'deepseek/deepseek-chat', systemPrompt: ROUTING_CLASSIFIER_PROMPT },
    ],
  },
};
