import type { EntityType } from '@/ai/pipeline/types';
import { generateThemePlan, type ThemePlannerInput } from '@/ai/pipeline/theme-planner';
import type {
  AgentExecutionStageContext,
  AgentExecutionStageResult,
} from '@/ai/agent/execution-engine';

function stagePrefix(runId: string, stepIndex: number): string {
  return `agent-runs/${runId}/steps/${stepIndex}/theme`;
}

function classifyEntityType(tags: string[]): EntityType {
  if (tags.includes('player') || tags.includes('character')) return 'character';
  if (tags.includes('enemy')) return 'enemy';
  if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) return 'platform';
  if (tags.includes('background')) return 'background';
  if (tags.includes('ui')) return 'ui';
  return 'item';
}

function buildPlannerInput(context: AgentExecutionStageContext): ThemePlannerInput {
  const game = context.gameDefinition;
  if (!game) {
    return {
      prefabs: [],
      theme: context.context.gameTitle,
      style: undefined,
      gameTitle: context.context.gameTitle,
    };
  }

  const prefabs = Object.entries(game.prefabs ?? {}).map(([prefabId, prefab]) => {
    const tags = prefab.tags ?? [];
    const physicsShape: 'box' | 'circle' =
      prefab.physics && 'shape' in prefab.physics && prefab.physics.shape === 'circle'
        ? 'circle'
        : 'box';

    return {
      prefabId,
      whatDescription: prefab.id,
      entityType: classifyEntityType(tags),
      physicsShape,
      tags,
    };
  });

  return {
    prefabs,
    theme: context.context.gameDescription ?? context.context.gameTitle,
    gameTitle: context.context.gameTitle,
  };
}

export async function themeStage(
  context: AgentExecutionStageContext
): Promise<AgentExecutionStageResult> {
  if (!context.env.OPENROUTER_API_KEY) {
    return {
      status: 'failed',
      failureReason: 'MISSING_PREREQUISITE',
      errorMessage: 'MISSING_PREREQUISITE: OPENROUTER_API_KEY is required for theme stage',
      checkpoint: { stage: 'theme', missing: 'OPENROUTER_API_KEY' },
      costMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
    };
  }

  const plannerInput = buildPlannerInput(context);
  const plan = await generateThemePlan(plannerInput, context.env.OPENROUTER_API_KEY);

  if (!plan) {
    return {
      status: 'failed',
      failureReason: 'MODEL_ERROR',
      errorMessage: 'MODEL_ERROR: theme planner returned no plan',
      checkpoint: {
        stage: 'theme',
        prefabCount: plannerInput.prefabs.length,
      },
      costMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
    };
  }

  const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.json`;
  await context.env.ASSETS.put(outputArtifactKey, JSON.stringify(plan), {
    httpMetadata: { contentType: 'application/json' },
  });

  return {
    status: 'succeeded',
    outputArtifactKey,
    costMicros: 0,
    inputTokens: 0,
    outputTokens: 0,
    provider: 'openrouter',
    model: plan.providerModel ?? 'openai/gpt-4o-mini',
    checkpoint: {
      stage: 'theme',
      templateCount: Object.keys(plan.prefabPlans).length,
    },
  };
}
