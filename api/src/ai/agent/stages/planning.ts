import { generateText } from 'ai';

import { createModelForTier, resolveTierConfig } from '@/ai/agent/tier-config';
import type {
  AgentExecutionStageContext,
  AgentExecutionStageResult,
} from '@/ai/agent/execution-engine';

function stagePrefix(runId: string, stepIndex: number): string {
  return `agent-runs/${runId}/steps/${stepIndex}/planning`;
}

export async function planningStage(
  context: AgentExecutionStageContext
): Promise<AgentExecutionStageResult> {
  const modelConfig = resolveTierConfig(context.tier);
  const model = createModelForTier(modelConfig, context.env);

  const seedPlan = context.context.planningDocJson
    ? `Existing planning doc:\n${context.context.planningDocJson}`
    : 'No existing planning doc provided.';

  try {
    const generated = await generateText({
      model,
      system:
        'You are a game planning assistant. Output concise implementation plan markdown for a 2D mobile game generation run.',
      prompt: [
        `Game title: ${context.context.gameTitle}`,
        `Game description: ${context.context.gameDescription ?? 'none'}`,
        seedPlan,
        'Return markdown with sections: Goal, Mechanics, Risk, Stage Notes.',
      ].join('\n\n'),
      temperature: 0.3,
      maxOutputTokens: 900,
    });

    const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.md`;
    await context.env.ASSETS.put(outputArtifactKey, generated.text, {
      httpMetadata: { contentType: 'text/markdown; charset=utf-8' },
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
        stage: 'planning',
        artifact: outputArtifactKey,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'planning stage failed';
    return {
      status: 'failed',
      failureReason: 'MODEL_ERROR',
      errorMessage: `MODEL_ERROR: ${message}`,
      checkpoint: {
        stage: 'planning',
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
