import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';

import { createModelForTier, resolveTierConfig } from '@/ai/agent/tier-config';

export interface StageGateFieldLocal {
  id: string;
  label: string;
  description: string;
  required: boolean;
  ai_extraction_hint: string;
}

export interface StageGateConfigLocal {
  stage: string;
  gates: StageGateFieldLocal[];
}

export interface GateProcessorInput {
  stageConfig: StageGateConfigLocal;
  userPrompt: string;
  previousAnswers: Array<{ question: string; answer: string }>;
  currentGateValues: Record<string, string>;
}

export interface GateProcessorResult {
  gateValues: Record<string, string>;
  satisfiedFields: string[];
  unsatisfiedFields: string[];
  questions: Array<{
    questionId: string;
    question: string;
    context?: string;
  }>;
}

export interface GateProcessorOptions {
  model?: LanguageModel;
  tier?: string;
  env?: {
    OPENROUTER_API_KEY?: string;
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
  };
}

const GateProcessorOutputSchema = z.object({
  gateValues: z.record(z.string(), z.string()),
  questions: z.array(z.object({
    fieldId: z.string(),
    question: z.string(),
    context: z.string().optional(),
  })),
});

type GateProcessorOutput = z.infer<typeof GateProcessorOutputSchema>;

function resolveModel(options: GateProcessorOptions): LanguageModel {
  if (options.model) {
    return options.model;
  }

  if (!options.env) {
    throw new Error('GateProcessor requires either options.model or options.env');
  }

  const tierConfig = resolveTierConfig(options.tier ?? 'free');
  return createModelForTier(tierConfig, options.env);
}

function createExtractionPrompt(input: GateProcessorInput): string {
  const gateList = input.stageConfig.gates.map((gate) => ({
    id: gate.id,
    label: gate.label,
    description: gate.description,
    required: gate.required,
    ai_extraction_hint: gate.ai_extraction_hint,
  }));

  const priorAnswers = input.previousAnswers.length > 0
    ? input.previousAnswers.map((qa, index) => `${index + 1}. Q: ${qa.question}\n   A: ${qa.answer}`).join('\n')
    : 'None';

  const currentGateValues = Object.keys(input.currentGateValues).length > 0
    ? JSON.stringify(input.currentGateValues, null, 2)
    : '{}';

  return [
    `Stage: ${input.stageConfig.stage}`,
    'Gate fields:',
    JSON.stringify(gateList, null, 2),
    'User prompt:',
    input.userPrompt,
    'Previous Q/A pairs:',
    priorAnswers,
    'Current gate values:',
    currentGateValues,
    'Instructions:',
    '- Extract values for each field from user prompt + previous answers + current gate values.',
    '- Fill fields with extracted values even if partial, but prefer concise and concrete values.',
    '- Keep existing current gate values unless the prompt clearly provides a better correction.',
    '- Only ask questions for truly missing or ambiguous required fields.',
    '- Do not re-ask for information that already appears in previous answers or current gate values.',
    '- Keep every question concise and specific to a single missing detail.',
  ].join('\n\n');
}

function normalizeGateValues(
  stageConfig: StageGateConfigLocal,
  currentGateValues: Record<string, string>,
  llmOutput: GateProcessorOutput,
): Record<string, string> {
  const allowedFieldIds = new Set(stageConfig.gates.map((field) => field.id));
  const merged: Record<string, string> = { ...currentGateValues };

  for (const [key, value] of Object.entries(llmOutput.gateValues)) {
    if (!allowedFieldIds.has(key)) {
      continue;
    }
    const normalized = value.trim();
    if (normalized.length > 0) {
      merged[key] = normalized;
    }
  }

  return merged;
}

function toQuestionId(stage: string, fieldId: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${stage}-${fieldId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function processGates(
  input: GateProcessorInput,
  options: GateProcessorOptions = {},
): Promise<GateProcessorResult> {
  const model = resolveModel(options);
  const prompt = createExtractionPrompt(input);

  const generated = await generateObject({
    model,
    schema: GateProcessorOutputSchema,
    system: 'You are analyzing a game description to extract specific information for building a game.',
    prompt,
    temperature: 0.2,
  });

  const normalizedGateValues = normalizeGateValues(input.stageConfig, input.currentGateValues, generated.object);

  const requiredFields = input.stageConfig.gates.filter((field) => field.required);
  const satisfiedFields = requiredFields
    .filter((field) => {
      const value = normalizedGateValues[field.id];
      return typeof value === 'string' && value.trim().length > 0;
    })
    .map((field) => field.id);

  const unsatisfiedFields = requiredFields
    .filter((field) => !satisfiedFields.includes(field.id))
    .map((field) => field.id);

  const unsatisfiedFieldSet = new Set(unsatisfiedFields);
  const questions = generated.object.questions
    .filter((item) => unsatisfiedFieldSet.has(item.fieldId))
    .map((item) => ({
      questionId: toQuestionId(input.stageConfig.stage, item.fieldId),
      question: item.question.trim(),
      context: item.context?.trim() || undefined,
    }))
    .filter((item) => item.question.length > 0);

  return {
    gateValues: normalizedGateValues,
    satisfiedFields,
    unsatisfiedFields,
    questions,
  };
}
