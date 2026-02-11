import type {
  AgentExecutionStageContext,
  AgentExecutionStageResult,
} from '@/ai/agent/execution-engine';
import { resolveTierConfig } from '@/ai/agent/tier-config';

import { buildStage } from '@/ai/agent/stages/build';
import { planningStage } from '@/ai/agent/stages/planning';

function makePassThroughStage(stage: 'refine' | 'theme' | 'asset' | 'chat' | 'shader') {
  return async function passThroughStage(
    context: AgentExecutionStageContext,
  ): Promise<AgentExecutionStageResult> {
    const modelConfig = resolveTierConfig(context.tier);
    const outputArtifactKey = `agent-runs/${context.runId}/steps/${context.stepIndex}/${stage}/output.json`;

    await context.env.ASSETS.put(outputArtifactKey, JSON.stringify({
      stage,
      mode: 'placeholder',
      sourceArtifact: context.previousArtifacts.build ?? null,
    }), {
      httpMetadata: { contentType: 'application/json' },
    });

    return {
      status: 'succeeded',
      outputArtifactKey,
      costMicros: modelConfig.estimatedCostPerStepMicros,
      inputTokens: 0,
      outputTokens: 0,
      provider: modelConfig.primary.provider,
      model: modelConfig.primary.model,
      checkpoint: {
        stage,
        artifact: outputArtifactKey,
      },
    };
  };
}

export const refineStage = makePassThroughStage('refine');
export const themeStage = makePassThroughStage('theme');
export const assetStage = makePassThroughStage('asset');
export const chatStage = makePassThroughStage('chat');
export const shaderStage = makePassThroughStage('shader');

export {
  planningStage,
  buildStage,
};
