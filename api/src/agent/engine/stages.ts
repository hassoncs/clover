import {
  ASSET_STAGE_PROMPT,
  BUILD_STAGE_PROMPT,
  CHAT_STAGE_PROMPT,
  PLANNING_STAGE_PROMPT,
  REFINE_STAGE_PROMPT,
  SHADER_STAGE_PROMPT,
  THEME_STAGE_PROMPT,
} from './prompts';
import type { CoreTool } from './tools';

export interface StageConfig {
  stage: string;
  displayName: string;
  systemPrompt: string;
  tools: Record<string, CoreTool>;
  maxRetries: number;
  validateOutput: (output: unknown) => { valid: boolean; errors?: string[] };
}

const EMPTY_TOOLS: Record<string, CoreTool> = {};

function validatePlanningOutput(output: unknown): { valid: boolean; errors?: string[] } {
  if (output === undefined) {
    return { valid: true };
  }
  return { valid: true };
}

function validateGameOutput(output: unknown): { valid: boolean; errors?: string[] } {
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

export const shaderStage: StageConfig = {
  stage: 'shader',
  displayName: 'Shader',
  systemPrompt: SHADER_STAGE_PROMPT,
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
  shaderStage,
  refineStage,
  themeStage,
  assetStage,
];

export function getStageConfig(stage: string, tools: Record<string, CoreTool>): StageConfig {
  const base = [chatStage, ...STAGE_PIPELINE].find(item => item.stage === stage);
  if (!base) {
    throw new Error(`Unknown stage: ${stage}`);
  }
  return {
    ...base,
    tools,
  };
}
