import { generateObject } from 'ai';
import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';

import { createModelForTier, resolveTierConfig } from '@/ai/agent/tier-config';
import { GameDefinitionSchema } from '@/ai/game/schemas';
import type {
  AgentExecutionStageContext,
  AgentExecutionStageResult,
} from '@/ai/agent/execution-engine';

function stagePrefix(runId: string, stepIndex: number): string {
  return `agent-runs/${runId}/steps/${stepIndex}/build`;
}

export async function buildStage(
  context: AgentExecutionStageContext
): Promise<AgentExecutionStageResult> {
  const modelConfig = resolveTierConfig(context.tier);
  const model = createModelForTier(modelConfig, context.env);

  const planningDoc = context.planningDoc ?? context.context.planningDocJson ?? 'No planning doc available';

  try {
    const generated = await generateObject({
      model,
      schema: GameDefinitionSchema,
      system:
        'You produce valid Slopcade GameDefinition JSON. Keep output constrained to playable 2D game behavior.',
      prompt: [
        `Game title: ${context.context.gameTitle}`,
        `Game description: ${context.context.gameDescription ?? 'none'}`,
        `Planning doc:\n${planningDoc}`,
      ].join('\n\n'),
      temperature: 0.4,
    });

    const parsed = GameDefinitionSchema.safeParse(generated.object);
    if (!parsed.success) {
      return {
        status: 'failed',
        failureReason: 'VALIDATION_FAILED',
        errorMessage: `VALIDATION_FAILED: ${parsed.error.issues[0]?.message ?? 'invalid game definition output'}`,
        checkpoint: {
          stage: 'build',
          validationIssues: parsed.error.issues.map((issue) => issue.message),
        },
        costMicros: modelConfig.estimatedCostPerStepMicros,
        inputTokens: generated.usage.inputTokens ?? 0,
        outputTokens: generated.usage.outputTokens ?? 0,
        provider: modelConfig.primary.provider,
        model: modelConfig.primary.model,
      };
    }

    const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.json`;
    await context.env.ASSETS.put(outputArtifactKey, JSON.stringify(parsed.data), {
      httpMetadata: { contentType: 'application/json' },
    });

    return {
      status: 'succeeded',
      outputArtifactKey,
      costMicros: modelConfig.estimatedCostPerStepMicros,
      inputTokens: generated.usage.inputTokens ?? 0,
      outputTokens: generated.usage.outputTokens ?? 0,
      provider: modelConfig.primary.provider,
      model: modelConfig.primary.model,
      checkpoint: {
        stage: 'build',
        metadata: {
          id: (parsed.data as GameDefinition).metadata.id,
          title: (parsed.data as GameDefinition).metadata.title,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'build stage failed';
    return {
      status: 'failed',
      failureReason: 'MODEL_ERROR',
      errorMessage: `MODEL_ERROR: ${message}`,
      checkpoint: {
        stage: 'build',
        error: message,
      },
      costMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      provider: modelConfig.primary.provider,
      model: modelConfig.primary.model,
    };
  }
}
