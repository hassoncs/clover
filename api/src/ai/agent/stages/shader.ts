import { generateText } from 'ai';
import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';

import { createModelForTier, resolveTierConfig } from '@/ai/agent/tier-config';
import { ARCHETYPES } from '@/ai/archetypes';
import type {
  AgentExecutionStageContext,
  AgentExecutionStageResult,
} from '@/ai/agent/execution-engine';

function stagePrefix(runId: string, stepIndex: number): string {
  return `agent-runs/${runId}/steps/${stepIndex}/shader`;
}

interface ShaderOutput {
  shaders: Record<string, { filename: string; glsl: string }>;
}

function parseShaderOutput(text: string): ShaderOutput {
  const shaders: Record<string, { filename: string; glsl: string }> = {};

  const shaderBlockRegex = /###\s+(\w+)\s*\nFilename:\s*`?([^\n`]+)`?\s*\n```(?:gdshader|glsl)?\n([\s\S]*?)```/g;

  for (const match of text.matchAll(shaderBlockRegex)) {
    const [, id, filename, glsl] = match;
    if (id && filename && glsl) {
      shaders[id] = { filename: filename.trim(), glsl: glsl.trim() };
    }
  }

  return { shaders };
}

function needsShaders(definition: GameDefinition): boolean {
  if (definition.effects?.shaders && Object.keys(definition.effects.shaders).length > 0) {
    return true;
  }
  if (definition.effects?.graph) {
    return true;
  }
  return false;
}

export async function shaderStage(
  context: AgentExecutionStageContext
): Promise<AgentExecutionStageResult> {
  const modelConfig = resolveTierConfig(context.tier);

  const definition = context.gameDefinition;
  if (!definition || !needsShaders(definition)) {
    const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.json`;
    await context.env.ASSETS.put(outputArtifactKey, JSON.stringify({
      stage: 'shader',
      mode: 'skipped',
      reason: 'no effects.shaders in game definition',
    }), {
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
        stage: 'shader',
        mode: 'skipped',
      },
    };
  }

  const model = createModelForTier(modelConfig, context.env);

  const shaderEntries = definition.effects?.shaders ?? {};
  const requestedShaders = Object.entries(shaderEntries)
    .map(([id, entry]) => `- **${id}**: ${entry.filename}`)
    .join('\n');

  const paintArchetype = ARCHETYPES['paint-shader'];
  const exampleShaderText = Object.entries(paintArchetype.exampleShaders)
    .map(([id, shader]) => `### Example: ${id}\nFilename: \`${shader.filename}\`\n\`\`\`gdshader\n${shader.glsl}\n\`\`\``)
    .join('\n\n');

  try {
    const generated = await generateText({
      model,
      system: `You are a shader engineer specializing in Godot Shading Language.
Generate custom shaders for a 2D game. All shaders must use Godot Shading Language (NOT WebGL GLSL).

Rules:
- Start every shader with: shader_type canvas_item;
- Use uniforms with Godot hints: hint_range(min, max), source_color
- Main function: void fragment() { COLOR = ...; }
- Texture sampling: texture(TEXTURE, UV) or texture(sampler2D_uniform, UV)
- Output ONLY valid, compilable Godot shader code

${paintArchetype.promptContext}

## Example Shaders for Reference
${exampleShaderText}`,
      prompt: `Generate shaders for the game "${context.context.gameTitle}".

Game description: ${context.context.gameDescription ?? 'none'}

The game definition requests the following shaders:
${requestedShaders}

For each shader, output in this exact format:

### shaderId
Filename: \`filename.gdshader\`
\`\`\`gdshader
shader_type canvas_item;
// ... shader code
\`\`\`

Generate all requested shaders now.`,
      temperature: 0.3,
      maxOutputTokens: 2000,
    });

    const parsed = parseShaderOutput(generated.text);

    if (definition.effects && Object.keys(parsed.shaders).length > 0) {
      if (!definition.effects.shaders) {
        definition.effects.shaders = {};
      }
      for (const [id, shader] of Object.entries(parsed.shaders)) {
        definition.effects.shaders[id] = {
          filename: shader.filename,
          glsl: shader.glsl,
        };
      }

      const gameId = context.context.gameId;
      if (gameId) {
        const definitionKey = `games/${gameId}/definition.json`;
        await context.env.ASSETS.put(definitionKey, JSON.stringify(definition), {
          httpMetadata: { contentType: 'application/json' },
        });
      }

      const finalDefinitionKey = `agent-runs/${context.runId}/final/definition.json`;
      await context.env.ASSETS.put(finalDefinitionKey, JSON.stringify(definition), {
        httpMetadata: { contentType: 'application/json' },
      });

      if (gameId) {
        for (const [, shader] of Object.entries(parsed.shaders)) {
          const workspaceKey = `games/${gameId}/workspace/${shader.filename}`;
          await context.env.ASSETS.put(workspaceKey, shader.glsl, {
            httpMetadata: { contentType: 'text/plain; charset=utf-8' },
          });
        }
      }
    }

    const outputData = {
      stage: 'shader',
      mode: 'generated',
      shaders: parsed.shaders,
      rawText: generated.text,
    };

    const outputArtifactKey = `${stagePrefix(context.runId, context.stepIndex)}/output.json`;
    await context.env.ASSETS.put(outputArtifactKey, JSON.stringify(outputData), {
      httpMetadata: { contentType: 'application/json' },
    });

    for (const [, shader] of Object.entries(parsed.shaders)) {
      const shaderFileKey = `${stagePrefix(context.runId, context.stepIndex)}/shaders/${shader.filename}`;
      await context.env.ASSETS.put(shaderFileKey, shader.glsl, {
        httpMetadata: { contentType: 'text/plain; charset=utf-8' },
      });
    }

    return {
      status: 'succeeded',
      outputArtifactKey,
      costMicros: modelConfig.estimatedCostPerStepMicros,
      inputTokens: generated.usage.inputTokens ?? 0,
      outputTokens: generated.usage.outputTokens ?? 0,
      provider: modelConfig.primary.provider,
      model: modelConfig.primary.model,
      checkpoint: {
        stage: 'shader',
        shaderCount: Object.keys(parsed.shaders).length,
        shaderIds: Object.keys(parsed.shaders),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'shader stage failed';
    return {
      status: 'failed',
      failureReason: 'MODEL_ERROR',
      errorMessage: `MODEL_ERROR: ${message}`,
      checkpoint: {
        stage: 'shader',
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
