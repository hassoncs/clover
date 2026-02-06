import { generateObject } from 'ai';

import { createModelForTier, resolveTierConfig } from '@/ai/agent/tier-config';
import { GameDefinitionSchema } from '@/ai/game/schemas';
import { validateGameDefinition } from '@/ai/game/validator';
import type {
  AgentExecutionStageContext,
  AgentExecutionStageResult,
} from '@/ai/agent/execution-engine';
import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';

function stagePrefix(runId: string, stepIndex: number): string {
  return `agent-runs/${runId}/steps/${stepIndex}/refine`;
}

export async function refineStage(
  context: AgentExecutionStageContext
): Promise<AgentExecutionStageResult> {
  const modelConfig = resolveTierConfig(context.tier);
  const model = createModelForTier(modelConfig, context.env);

  if (!context.gameDefinition) {
    return {
      status: 'failed',
      failureReason: 'MISSING_PREREQUISITE',
      errorMessage: 'MISSING_PREREQUISITE: gameDefinition required for refine stage',
      checkpoint: { stage: 'refine', missing: 'gameDefinition' },
      costMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      provider: modelConfig.primary.provider,
      model: modelConfig.primary.model,
    };
  }

  const validation = validateGameDefinition(context.gameDefinition);
  if (validation.valid) {
    const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.json`;
    await context.env.ASSETS.put(outputArtifactKey, JSON.stringify(context.gameDefinition), {
      httpMetadata: { contentType: 'application/json' },
    });

    return {
      status: 'succeeded',
      outputArtifactKey,
      costMicros: 0,
      inputTokens: 0,
      outputTokens: 0,
      provider: modelConfig.primary.provider,
      model: modelConfig.primary.model,
      checkpoint: {
        stage: 'refine',
        refined: false,
        validationErrors: 0,
      },
    };
  }

  try {
    const generated = await generateObject({
      model,
      schema: GameDefinitionSchema,
      system: 'You fix invalid game JSON and preserve intended gameplay.',
      prompt: [
        `Invalid game JSON:\n${JSON.stringify(context.gameDefinition)}`,
        `Validation errors:\n${validation.errors.map((error) => `- ${error.message}`).join('\n')}`,
      ].join('\n\n'),
      temperature: 0.3,
    });

    const parsed = GameDefinitionSchema.safeParse(generated.object);
    if (!parsed.success) {
      return {
        status: 'failed',
        failureReason: 'VALIDATION_FAILED',
        errorMessage: `VALIDATION_FAILED: ${parsed.error.issues[0]?.message ?? 'refined output failed schema validation'}`,
        checkpoint: {
          stage: 'refine',
          issueCount: parsed.error.issues.length,
        },
        costMicros: modelConfig.estimatedCostPerStepMicros,
        inputTokens: generated.usage.inputTokens ?? 0,
        outputTokens: generated.usage.outputTokens ?? 0,
        provider: modelConfig.primary.provider,
        model: modelConfig.primary.model,
      };
    }

    const refinedValidation = validateGameDefinition(parsed.data as unknown as GameDefinition);
    if (!refinedValidation.valid) {
      return {
        status: 'failed',
        failureReason: 'VALIDATION_FAILED',
        errorMessage: `VALIDATION_FAILED: refined game still invalid (${refinedValidation.errors.length} errors)`,
        checkpoint: {
          stage: 'refine',
          validationErrors: refinedValidation.errors.map((error) => error.message),
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
        stage: 'refine',
        refined: true,
        initialValidationErrors: validation.errors.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'refine stage failed';
    return {
      status: 'failed',
      failureReason: 'MODEL_ERROR',
      errorMessage: `MODEL_ERROR: ${message}`,
      checkpoint: {
        stage: 'refine',
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
