import { GameDefinitionSchema } from '@/ai/game/schemas';
import { validateGameDefinition } from '@/ai/game/validator';

import type { AgentStepStage } from '@slopcade/shared/types/agent-run';
import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';

import {
  ASSET_STAGE_PROMPT,
  BUILD_STAGE_PROMPT,
  CHAT_STAGE_PROMPT,
  PLANNING_STAGE_PROMPT,
  REFINE_STAGE_PROMPT,
  THEME_STAGE_PROMPT,
} from './prompts';
import type { CoreTool } from './tools';

export interface StageConfig {
  stage: AgentStepStage;
  displayName: string;
  systemPrompt: string;
  tools: Record<string, CoreTool>;
  maxRetries: number;
  validateOutput: (output: unknown) => { valid: boolean; errors?: string[] };
}

const EMPTY_TOOLS: Record<string, CoreTool> = {};

function validatePlanningOutput(output: unknown): { valid: boolean; errors?: string[] } {
  if (typeof output === 'string' && output.trim().length > 0) {
    return { valid: true };
  }
  return { valid: false, errors: ['Planning document is empty'] };
}

function validateGameOutput(output: unknown): { valid: boolean; errors?: string[] } {
  const schemaResult = GameDefinitionSchema.safeParse(output);
  if (!schemaResult.success) {
    return {
      valid: false,
      errors: schemaResult.error.issues.map(issue => issue.message),
    };
  }

  const semantic = validateGameDefinition(schemaResult.data as unknown as GameDefinition);
  if (!semantic.valid) {
    return {
      valid: false,
      errors: semantic.errors.map(error => `${error.path ?? 'game'}: ${error.message}`),
    };
  }

  return { valid: true };
}

export const planningStage: StageConfig = {
  stage: 'planning',
  displayName: 'Planning',
  systemPrompt: PLANNING_STAGE_PROMPT,
  tools: EMPTY_TOOLS,
  maxRetries: 3,
  validateOutput: validatePlanningOutput,
};

export const buildStage: StageConfig = {
  stage: 'build',
  displayName: 'Build',
  systemPrompt: BUILD_STAGE_PROMPT,
  tools: EMPTY_TOOLS,
  maxRetries: 3,
  validateOutput: validateGameOutput,
};

export const refineStage: StageConfig = {
  stage: 'refine',
  displayName: 'Refine',
  systemPrompt: REFINE_STAGE_PROMPT,
  tools: EMPTY_TOOLS,
  maxRetries: 3,
  validateOutput: validateGameOutput,
};

export const themeStage: StageConfig = {
  stage: 'theme',
  displayName: 'Theme',
  systemPrompt: THEME_STAGE_PROMPT,
  tools: EMPTY_TOOLS,
  maxRetries: 3,
  validateOutput: validateGameOutput,
};

export const assetStage: StageConfig = {
  stage: 'asset',
  displayName: 'Asset',
  systemPrompt: ASSET_STAGE_PROMPT,
  tools: EMPTY_TOOLS,
  maxRetries: 3,
  validateOutput: validateGameOutput,
};

export const chatStage: StageConfig = {
  stage: 'chat',
  displayName: 'Chat',
  systemPrompt: CHAT_STAGE_PROMPT,
  tools: EMPTY_TOOLS,
  maxRetries: 1,
  validateOutput: () => ({ valid: true }),
};

export const STAGE_PIPELINE: StageConfig[] = [
  planningStage,
  buildStage,
  refineStage,
  themeStage,
  assetStage,
];

export function getStageConfig(stage: AgentStepStage, tools: Record<string, CoreTool>): StageConfig {
  const base = [chatStage, ...STAGE_PIPELINE].find(item => item.stage === stage);
  if (!base) {
    throw new Error(`Unknown stage: ${stage}`);
  }
  return {
    ...base,
    tools,
  };
}
