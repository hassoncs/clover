import { generateText } from 'ai';

import { createModelForTier, resolveTierConfig } from '@/ai/agent/tier-config';
import { ARCHETYPES } from '@/ai/archetypes';
import type {
  AgentExecutionStageContext,
  AgentExecutionStageResult,
} from '@/ai/agent/execution-engine';

const SHADER_KEYWORDS = ['paint', 'shader', 'draw', 'canvas', 'brush', 'fluid', 'ripple', 'generative', 'pixel art'];

function detectArchetype(title: string, description: string | null): string | null {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  if (SHADER_KEYWORDS.some(kw => text.includes(kw))) {
    return 'paint-shader';
  }
  return null;
}

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

  const archetypeId = detectArchetype(context.context.gameTitle, context.context.gameDescription);
  const archetype = archetypeId ? ARCHETYPES[archetypeId] : null;
  const archetypeContext = archetype
    ? `\n\n## Available Archetype: ${archetype.name}\n${archetype.promptContext}\n\nUse this archetype as the foundation. The game should include an \`effects.shaders\` section in its definition.`
    : '';

  try {
    const generated = await generateText({
      model,
      system:
        'You are a game planning assistant. Output concise implementation plan markdown for a 2D mobile game generation run.' +
        (archetype ? ' This game uses custom shaders. Plan accordingly — include a Shader section in your output.' : ''),
      prompt: [
        `Game title: ${context.context.gameTitle}`,
        `Game description: ${context.context.gameDescription ?? 'none'}`,
        seedPlan,
        'Return markdown with sections: Goal, Mechanics, Risk, Stage Notes.' +
          (archetype ? ' Also include a Shaders section describing the shader effects needed.' : ''),
        archetypeContext,
      ].join('\n\n'),
      temperature: 0.3,
      maxOutputTokens: archetype ? 1200 : 900,
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
