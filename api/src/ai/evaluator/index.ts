import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import type {
  EvaluationRequest,
  EvaluationConfig,
  EvaluationResult,
  GameEvaluation,
} from './types';
import { DEFAULT_EVALUATION_MODELS } from './types';
import { EVALUATION_SYSTEM_PROMPT, buildEvaluationPrompt } from './prompts';

function createModel(config: EvaluationConfig): LanguageModel {
  const model = config.model ?? DEFAULT_EVALUATION_MODELS[config.provider];

  switch (config.provider) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return openai(model) as LanguageModel;
    }

    case 'openrouter': {
      const openrouter = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL ?? 'https://openrouter.ai/api/v1',
      });
      return openrouter(model) as LanguageModel;
    }

    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      return anthropic(model) as LanguageModel;
    }

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

function parseEvaluationResponse(text: string): GameEvaluation | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (
      typeof parsed.overall !== 'number' ||
      !parsed.dimensions ||
      !parsed.structural ||
      !Array.isArray(parsed.issues) ||
      !Array.isArray(parsed.suggestions)
    ) {
      return null;
    }

    return {
      overall: Math.max(0, Math.min(100, parsed.overall)),
      dimensions: {
        visualAppeal: Math.max(0, Math.min(100, parsed.dimensions.visualAppeal ?? 50)),
        themeMatch: Math.max(0, Math.min(100, parsed.dimensions.themeMatch ?? 50)),
        entityClarity: Math.max(0, Math.min(100, parsed.dimensions.entityClarity ?? 50)),
        layoutBalance: Math.max(0, Math.min(100, parsed.dimensions.layoutBalance ?? 50)),
      },
      structural: {
        hasWinCondition: Boolean(parsed.structural.hasWinCondition),
        hasLoseCondition: Boolean(parsed.structural.hasLoseCondition),
        hasPlayerControl: Boolean(parsed.structural.hasPlayerControl),
        entityCountReasonable: Boolean(parsed.structural.entityCountReasonable),
        physicsConfigured: Boolean(parsed.structural.physicsConfigured),
      },
      issues: parsed.issues.filter((i: unknown) => typeof i === 'string'),
      suggestions: parsed.suggestions.filter((s: unknown) => typeof s === 'string'),
      confidence: typeof parsed.confidence === 'number' 
        ? Math.max(0, Math.min(1, parsed.confidence)) 
        : 0.8,
    };
  } catch {
    return null;
  }
}

export async function evaluateGame(
  request: EvaluationRequest,
  config: EvaluationConfig
): Promise<EvaluationResult> {
  const startTime = Date.now();

  try {
    const model = createModel(config);
    const hasScreenshot = Boolean(request.screenshot);

    const userPrompt = buildEvaluationPrompt(
      request.gameDefinition,
      request.originalPrompt,
      hasScreenshot
    );

    let prompt = userPrompt;

    if (hasScreenshot && request.screenshot) {
      prompt = `[Screenshot provided as base64 - analyze the visual appearance]\n\n${userPrompt}`;
    }

    const result = await generateText({
      model,
      system: EVALUATION_SYSTEM_PROMPT,
      prompt,
      temperature: 0.3,
    });

    const evaluation = parseEvaluationResponse(result.text);

    if (!evaluation) {
      return {
        success: false,
        error: {
          code: 'EVALUATION_FAILED',
          message: 'Failed to parse evaluation response',
        },
        durationMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      evaluation,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      durationMs: Date.now() - startTime,
    };
  }
}

export function evaluateGameStructure(gameDefinition: {
  winCondition?: unknown;
  loseCondition?: unknown;
  rules?: unknown[];
  entities?: unknown[];
  world?: { gravity?: { x?: number; y?: number } };
  templates?: Record<string, { physics?: { density?: number; friction?: number; restitution?: number } }>;
}): Pick<GameEvaluation, 'structural'> {
  const rules = gameDefinition.rules ?? [];
  const entities = gameDefinition.entities ?? [];
  const templates = gameDefinition.templates ?? {};

  const hasWinCondition = Boolean(
    gameDefinition.winCondition &&
    typeof gameDefinition.winCondition === 'object' &&
    'type' in gameDefinition.winCondition
  );

  const hasLoseCondition = Boolean(
    gameDefinition.loseCondition &&
    typeof gameDefinition.loseCondition === 'object' &&
    'type' in gameDefinition.loseCondition
  );

  const hasPlayerControl = rules.some((rule: unknown) => {
    if (typeof rule !== 'object' || rule === null) return false;
    const r = rule as { trigger?: { type?: string } };
    const triggerType = r.trigger?.type;
    return ['tap', 'drag', 'key_down', 'key_up', 'tilt'].includes(triggerType ?? '');
  });

  const entityCount = entities.length;
  const entityCountReasonable = entityCount >= 3 && entityCount <= 50;

  let physicsConfigured = true;
  for (const template of Object.values(templates)) {
    if (template.physics) {
      const { density, friction, restitution } = template.physics;
      if (density !== undefined && (density < 0 || density > 100)) {
        physicsConfigured = false;
      }
      if (friction !== undefined && (friction < 0 || friction > 1)) {
        physicsConfigured = false;
      }
      if (restitution !== undefined && (restitution < 0 || restitution > 1)) {
        physicsConfigured = false;
      }
    }
  }

  return {
    structural: {
      hasWinCondition,
      hasLoseCondition,
      hasPlayerControl,
      entityCountReasonable,
      physicsConfigured,
    },
  };
}

export * from './types';
export {
  runImprovementLoop,
  quickEvaluate,
  type ImprovementLoopConfig,
  type ImprovementLoopResult,
  type IterationRecord,
} from './improvement-loop';
