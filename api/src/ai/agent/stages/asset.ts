import { executeGameAssets } from '@/ai/pipeline/executor';
import { createWorkersAdapters } from '@/ai/pipeline/adapters/workers';
import type { AssetSpec, EntityType } from '@/ai/pipeline/types';
import type { ThemePlan } from '@/ai/pipeline/theme-plan';
import type {
  AgentExecutionStageContext,
  AgentExecutionStageResult,
} from '@/ai/agent/execution-engine';

function stagePrefix(runId: string, stepIndex: number): string {
  return `agent-runs/${runId}/steps/${stepIndex}/asset`;
}

function classifyEntityType(tags: string[]): EntityType {
  if (tags.includes('player') || tags.includes('character')) return 'character';
  if (tags.includes('enemy')) return 'enemy';
  if (tags.includes('platform') || tags.includes('wall') || tags.includes('ground')) return 'platform';
  if (tags.includes('background')) return 'background';
  if (tags.includes('ui')) return 'ui';
  return 'item';
}

function toEntitySpecs(context: AgentExecutionStageContext, themePlan: ThemePlan | null): AssetSpec[] {
  if (!context.gameDefinition) {
    return [];
  }

  return Object.entries(context.gameDefinition.templates).map(([templateId, template]) => {
    const tags = template.tags ?? [];
    const physics = template.physics as { shape?: string; width?: number; height?: number; radius?: number } | undefined;
    const shape = physics?.shape === 'circle' ? 'circle' : 'box';
    const width = shape === 'circle' ? (physics?.radius ?? 0.5) * 2 : (physics?.width ?? 1);
    const height = shape === 'circle' ? (physics?.radius ?? 0.5) * 2 : (physics?.height ?? 1);
    const promptFromTheme = themePlan?.templatePlans[templateId]?.prompt;

    return {
      type: 'entity' as const,
      id: templateId,
      shape,
      width,
      height,
      entityType: classifyEntityType(tags),
      description: promptFromTheme ?? `${templateId} game entity`,
      color: themePlan?.templatePlans[templateId]?.silhouetteColor,
    };
  });
}

export async function assetStage(
  context: AgentExecutionStageContext
): Promise<AgentExecutionStageResult> {
  const themePlan = context.themePlan ?? null;
  const assets = toEntitySpecs(context, themePlan);

  if (assets.length === 0) {
    return {
      status: 'failed',
      failureReason: 'MISSING_PREREQUISITE',
      errorMessage: 'MISSING_PREREQUISITE: no template assets to generate',
      checkpoint: { stage: 'asset', assets: 0 },
      costMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      provider: 'none',
      model: 'none',
    };
  }

  try {
    const adapters = createWorkersAdapters(context.env as never, context.env.ASSETS);
    const batchResult = await executeGameAssets(
      {
        gameId: context.context.gameId,
        gameTitle: context.context.gameTitle,
        theme: themePlan?.theme ?? context.context.gameDescription ?? context.context.gameTitle,
        style: themePlan?.style,
        r2Prefix: `agent-runs/${context.runId}/steps/${context.stepIndex}/asset/generated`,
        assets,
      },
      adapters
    );

    const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.json`;
    await context.env.ASSETS.put(outputArtifactKey, JSON.stringify(batchResult), {
      httpMetadata: { contentType: 'application/json' },
    });

    if (batchResult.failed > 0) {
      return {
        status: 'failed',
        failureReason: 'ASSET_PIPELINE_FAILED',
        errorMessage: `ASSET_PIPELINE_FAILED: ${batchResult.failed} of ${batchResult.totalAssets} assets failed`,
        checkpoint: {
          stage: 'asset',
          successful: batchResult.successful,
          failed: batchResult.failed,
        },
        costMicros: 0,
        inputTokens: 0,
        outputTokens: 0,
        provider: 'asset-pipeline',
        model: context.env.IMAGE_GENERATION_PROVIDER ?? 'scenario',
      };
    }

    return {
      status: 'succeeded',
      outputArtifactKey,
      costMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      provider: 'asset-pipeline',
      model: context.env.IMAGE_GENERATION_PROVIDER ?? 'scenario',
      checkpoint: {
        stage: 'asset',
        successful: batchResult.successful,
        failed: batchResult.failed,
        durationMs: batchResult.durationMs,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'asset stage failed';
    return {
      status: 'failed',
      failureReason: 'ASSET_PIPELINE_FAILED',
      errorMessage: `ASSET_PIPELINE_FAILED: ${message}`,
      checkpoint: {
        stage: 'asset',
        error: message,
      },
      costMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      provider: 'asset-pipeline',
      model: context.env.IMAGE_GENERATION_PROVIDER ?? 'scenario',
    };
  }
}
