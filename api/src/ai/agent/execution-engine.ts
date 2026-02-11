import type { AgentStepStage } from '@slopcade/shared/types/agent-run';

import type { AgentTier } from '@/ai/agent/tier-config';
import {
  planningStage,
  buildStage,
  refineStage,
  themeStage,
  assetStage,
  chatStage,
  shaderStage,
} from '@/ai/agent/stages';

type D1Database = import('@cloudflare/workers-types').D1Database;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;

export type FailureReason =
  | 'MISSING_PREREQUISITE'
  | 'VALIDATION_FAILED'
  | 'MODEL_ERROR'
  | 'ASSET_PIPELINE_FAILED'
  | 'PERSISTENCE_ERROR'
  | 'UNKNOWN';

export interface AgentExecutionEnv {
  DB: D1Database;
  ASSETS: R2Bucket;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  IMAGE_GENERATION_PROVIDER?: 'modal' | 'scenario';
  MODAL_ENDPOINT?: string;
  SCENARIO_API_KEY?: string;
  SCENARIO_SECRET_API_KEY?: string;
  SCENARIO_API_URL?: string;
  ASSET_HOST?: string;
  DEBUG_ASSET_GENERATION?: string;
}

export interface AgentExecutionRunContext {
  gameId: string;
  gameTitle: string;
  gameDescription: string | null;
  planningDocJson?: string | null;
}

export interface AgentExecutionStageContext {
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: AgentStepStage;
  tier: AgentTier;
  env: AgentExecutionEnv;
  previousArtifacts: Partial<Record<AgentStepStage, string>>;
  context: AgentExecutionRunContext;
  planningDoc?: string;
  gameDefinition?: import('@slopcade/shared/types/GameDefinition').GameDefinition;
  themePlan?: import('@/ai/pipeline/theme-plan').ThemePlan;
}

export type AgentExecutionStageResult =
  | {
      status: 'succeeded';
      outputArtifactKey: string;
      costMicros: number;
      inputTokens: number;
      outputTokens: number;
      provider: string;
      model: string;
      checkpoint: Record<string, unknown>;
    }
  | {
      status: 'failed';
      failureReason: FailureReason;
      errorMessage: string;
      checkpoint: Record<string, unknown>;
      costMicros: number;
      inputTokens: number;
      outputTokens: number;
      provider: string;
      model: string;
    };

export type AgentStageRunner = (
  context: AgentExecutionStageContext
) => Promise<AgentExecutionStageResult>;

export interface ExecuteAgentStageInput {
  runId: string;
  stepId: string;
  stepIndex: number;
  stage: AgentStepStage;
  tier: AgentTier;
  env: AgentExecutionEnv;
  context: AgentExecutionRunContext;
  previousArtifacts: Partial<Record<AgentStepStage, string>>;
  planningDoc?: string;
  gameDefinition?: import('@slopcade/shared/types/GameDefinition').GameDefinition;
  themePlan?: import('@/ai/pipeline/theme-plan').ThemePlan;
}

export interface ExecuteAgentStageOptions {
  stageRunners?: Partial<Record<AgentStepStage, AgentStageRunner>>;
}

export const STAGE_ORDER: AgentStepStage[] = ['planning', 'build', 'shader', 'refine', 'theme', 'asset'];

const DEFAULT_STAGE_RUNNERS: Record<AgentStepStage, AgentStageRunner> = {
  planning: planningStage,
  build: buildStage,
  shader: shaderStage,
  refine: refineStage,
  theme: themeStage,
  asset: assetStage,
  chat: chatStage,
};

function stageBasePrefix(runId: string, stepIndex: number): string {
  return `agent-runs/${runId}/steps/${stepIndex}`;
}

function checkpointKey(runId: string, stepIndex: number, stage: AgentStepStage): string {
  return `${stageBasePrefix(runId, stepIndex)}/${stage}/checkpoint.json`;
}

function deterministicFailure(
  reason: FailureReason,
  message: string,
  checkpoint: Record<string, unknown> = {}
): AgentExecutionStageResult {
  return {
    status: 'failed',
    failureReason: reason,
    errorMessage: `${reason}: ${message}`,
    checkpoint,
    costMicros: 0,
    inputTokens: 0,
    outputTokens: 0,
    provider: 'none',
    model: 'none',
  };
}

async function persistCheckpoint(
  env: AgentExecutionEnv,
  runId: string,
  stepIndex: number,
  stage: AgentStepStage,
  payload: Record<string, unknown>
): Promise<void> {
  const key = checkpointKey(runId, stepIndex, stage);
  await env.ASSETS.put(key, JSON.stringify(payload), {
    httpMetadata: { contentType: 'application/json' },
  });
}

function validateStagePrerequisites(
  stage: AgentStepStage,
  previousArtifacts: Partial<Record<AgentStepStage, string>>
): AgentExecutionStageResult | null {
  if (stage === 'planning') {
    return null;
  }

  if (!previousArtifacts.planning) {
    return deterministicFailure('MISSING_PREREQUISITE', 'planning artifact missing', {
      stage,
      missing: 'planning',
    });
  }

  if (stage === 'shader' || stage === 'refine' || stage === 'theme' || stage === 'asset') {
    if (!previousArtifacts.build) {
      return deterministicFailure('MISSING_PREREQUISITE', 'build artifact missing', {
        stage,
        missing: 'build',
      });
    }
  }

  if (stage === 'asset' && !previousArtifacts.theme) {
    return deterministicFailure('MISSING_PREREQUISITE', 'theme artifact missing', {
      stage,
      missing: 'theme',
    });
  }

  return null;
}

export async function executeAgentStage(
  input: ExecuteAgentStageInput,
  options: ExecuteAgentStageOptions = {}
): Promise<AgentExecutionStageResult> {
  const { stage, runId, stepIndex, env } = input;
  const prerequisiteFailure = validateStagePrerequisites(stage, input.previousArtifacts);
  if (prerequisiteFailure) {
    await persistCheckpoint(env, runId, stepIndex, stage, prerequisiteFailure.checkpoint);
    return prerequisiteFailure;
  }

  const stageRunners: Record<AgentStepStage, AgentStageRunner> = {
    ...DEFAULT_STAGE_RUNNERS,
    ...options.stageRunners,
  };
  const runner = stageRunners[stage];

  try {
    const result = await runner({
      ...input,
      stage,
      planningDoc: input.planningDoc,
      gameDefinition: input.gameDefinition,
      themePlan: input.themePlan,
    });

    await persistCheckpoint(env, runId, stepIndex, stage, {
      stage,
      status: result.status,
      ...(result.status === 'succeeded'
        ? {
            outputArtifactKey: result.outputArtifactKey,
            costMicros: result.costMicros,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            provider: result.provider,
            model: result.model,
          }
        : {
            failureReason: result.failureReason,
            errorMessage: result.errorMessage,
            costMicros: result.costMicros,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            provider: result.provider,
            model: result.model,
          }),
      checkpoint: result.checkpoint,
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown execution error';
    const failed = deterministicFailure('UNKNOWN', message, {
      stage,
      error: message,
    });
    await persistCheckpoint(env, runId, stepIndex, stage, failed.checkpoint);
    return failed;
  }
}
