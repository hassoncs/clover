import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import type { GameDefinition } from '../../../shared/src/types/GameDefinition';
import type { GameIntent } from './classifier';
import { classifyPrompt } from './classifier';
import { getTemplateForGameType } from './templates';
import { validateGameDefinition, type ValidationResult } from './validator';
import { GameDefinitionSchema } from './schemas';

export type AIProvider = 'openai' | 'openrouter' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseURL?: string;
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  openrouter: 'openai/gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

function createModel(config: AIConfig): LanguageModel {
  const model = config.model ?? DEFAULT_MODELS[config.provider];

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

const SYSTEM_PROMPT = `You are a game designer AI that creates 2D physics-based mobile games for children ages 6-14.

Given a user's game description, generate a complete GameDefinition that can be immediately played.

## Guidelines

1. **Keep it simple**: 5-15 entities maximum
2. **Use clear entity names and IDs**: lowercase with hyphens (e.g., "player-cat", "platform-1")
3. **Include at least one interactive element**: Player must have a control behavior
4. **Set reasonable physics values**:
   - density: 0.5-2.0 (1.0 is normal)
   - friction: 0.1-0.9 (0.5 is normal)
   - restitution: 0.0-0.9 (0 = no bounce, 0.8 = very bouncy)
5. **Include BOTH win AND lose conditions**
6. **Use tags consistently**: "player", "enemy", "collectible", "ground", "goal"
7. **Match sprite and physics sizes**: If sprite is 1m wide, physics box should be 1m wide
8. **Position entities properly**: Ground at bottom, player above ground, collectibles reachable

## Common Patterns

**Projectile Game** (Angry Birds style):
- Launcher entity with drag_to_aim control
- spawn_on_event to create projectiles
- Targets with destroy_on_collision and score_on_collision
- Win: destroy_all targets
- Lose: lives_zero (limited projectiles)

**Platformer** (Jumpy Cat style):
- Player with tap_to_jump and tilt_to_move controls
- Static platforms at various heights
- Collectibles with score_on_collision and destroy_on_collision
- Goal platform to reach
- Win: reach_entity goal
- Lose: entity_destroyed player

**Falling Objects** (Catch game):
- Catcher entity with drag_to_move control
- Spawner with spawn_on_event (timer) to create falling items
- Good items give points, bad items lose points
- Win: survive_time or reach score
- Lose: score_below 0

**Stacking** (Tower building):
- Moving spawner with oscillate and tap_to_shoot to drop blocks
- Blocks stack on ground/each other
- Death zones on sides
- Win: reach score
- Lose: block falls off

## World Coordinates

- World is in METERS, not pixels (pixelsPerMeter: 50 means 1 meter = 50 pixels)
- Typical world size: 10-20 meters wide, 12-16 meters tall
- Gravity: { x: 0, y: 10 } is standard (positive Y = down)
- Ground should be near the bottom (y: 11-15 depending on world height)`;

const REFINEMENT_SYSTEM_PROMPT = `You are a game designer AI that modifies existing 2D physics games based on user feedback.

## Instructions

1. Identify what needs to change based on the user's request
2. Make MINIMAL changes to satisfy the request
3. Preserve ALL unrelated parts of the game
4. Ensure the game still works after changes

## Common Modifications

| User Request | AI Action |
|--------------|-----------|
| "Make it bouncier" | Increase restitution on relevant entities |
| "Add more enemies" | Add more enemy entities with new positions |
| "Make jumping higher" | Increase force in tap_to_jump behavior |
| "Slow down platforms" | Decrease speed in move/oscillate behaviors |
| "Make it easier" | Slow enemies, reduce difficulty, add more lives |
| "Make it harder" | Speed up enemies, add obstacles, reduce time |
| "More things to collect" | Add more collectible entities |
| "Bigger player" | Increase sprite size AND physics size |`;

export interface GenerationOptions {
  maxRetries?: number;
  temperature?: number;
}

export interface GenerationResult {
  success: boolean;
  game?: GameDefinition;
  error?: {
    code: 'INVALID_PROMPT' | 'GENERATION_FAILED' | 'VALIDATION_FAILED' | 'API_ERROR';
    message: string;
    suggestions?: string[];
  };
  intent?: GameIntent;
  validationResult?: ValidationResult;
  retryCount?: number;
}

export interface RefinementResult {
  success: boolean;
  game?: GameDefinition;
  error?: {
    code: 'INVALID_GAME' | 'REFINEMENT_FAILED' | 'VALIDATION_FAILED' | 'API_ERROR';
    message: string;
    suggestions?: string[];
  };
  validationResult?: ValidationResult;
}

function buildGenerationPrompt(prompt: string, intent: GameIntent): string {
  return `Create a game based on this description: "${prompt}"

Detected game type: ${intent.gameType}
Theme: ${intent.theme}
Player action: ${intent.playerAction}
Goal: ${intent.targetAction}
Control type: ${intent.controlType}
Difficulty: ${intent.difficulty}
${intent.specialRequests.length > 0 ? `Special requests: ${intent.specialRequests.join(', ')}` : ''}

Generate a complete, playable game definition.`;
}

function buildRefinementPrompt(currentGame: GameDefinition, request: string): string {
  return `Current Game:
Title: ${currentGame.metadata.title}
Description: ${currentGame.metadata.description}

Current Definition:
${JSON.stringify(currentGame, null, 2)}

User's modification request: "${request}"

Apply the requested changes and return the complete modified game definition.`;
}

export async function generateGame(
  prompt: string,
  config: AIConfig,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const { maxRetries = 2, temperature = 0.7 } = options;

  const intent = classifyPrompt(prompt);

  if (!intent.gameType) {
    return {
      success: false,
      intent,
      error: {
        code: 'INVALID_PROMPT',
        message: "Couldn't understand what kind of game you want",
        suggestions: [
          "Try being more specific about the gameplay",
          "Example: 'A game where I launch balls at targets'",
          "Example: 'A platformer where a cat collects fish'",
        ],
      },
    };
  }

  const model = createModel(config);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const userPrompt = buildGenerationPrompt(prompt, intent);

      const result = await generateObject({
        model,
        schema: GameDefinitionSchema,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: attempt === 0 ? temperature : temperature + 0.1,
      });

      const game = result.object as GameDefinition;

      if (!game.metadata?.id) {
        game.metadata = {
          ...game.metadata,
          id: `game-${Date.now()}`,
        };
      }

      const validationResult = validateGameDefinition(game);

      if (!validationResult.valid) {
        if (attempt < maxRetries) {
          continue;
        }

        if (validationResult.errors.length <= 3) {
          return {
            success: true,
            game,
            intent,
            validationResult,
            retryCount: attempt,
          };
        }

        const fallbackGame = getTemplateForGameType(intent.gameType);
        fallbackGame.metadata.title = `${intent.theme.charAt(0).toUpperCase() + intent.theme.slice(1)} ${intent.gameType.replace('_', ' ')}`;
        fallbackGame.metadata.description = prompt;
        fallbackGame.metadata.id = `game-${Date.now()}`;

        return {
          success: true,
          game: fallbackGame,
          intent,
          validationResult,
          retryCount: attempt,
        };
      }

      return {
        success: true,
        game,
        intent,
        validationResult,
        retryCount: attempt,
      };
    } catch (err) {
      console.error(`Generation attempt ${attempt + 1} failed:`, err);

      if (attempt === maxRetries) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
          return {
            success: false,
            intent,
            error: {
              code: 'API_ERROR',
              message: 'Too many requests. Please try again in a moment.',
              suggestions: ['Wait a few seconds and try again'],
            },
            retryCount: attempt,
          };
        }

        const fallbackGame = getTemplateForGameType(intent.gameType);
        fallbackGame.metadata.title = `${intent.theme.charAt(0).toUpperCase() + intent.theme.slice(1)} ${intent.gameType.replace('_', ' ')}`;
        fallbackGame.metadata.description = prompt;
        fallbackGame.metadata.id = `game-${Date.now()}`;

        return {
          success: true,
          game: fallbackGame,
          intent,
          retryCount: attempt,
        };
      }
    }
  }

  const fallbackGame = getTemplateForGameType(intent.gameType);
  fallbackGame.metadata.title = `${intent.theme.charAt(0).toUpperCase() + intent.theme.slice(1)} Game`;
  fallbackGame.metadata.description = prompt;
  fallbackGame.metadata.id = `game-${Date.now()}`;

  return {
    success: true,
    game: fallbackGame,
    intent,
    retryCount: maxRetries,
  };
}

export async function refineGame(
  currentGame: GameDefinition,
  request: string,
  config: AIConfig
): Promise<RefinementResult> {
  const model = createModel(config);

  try {
    const userPrompt = buildRefinementPrompt(currentGame, request);

    const result = await generateObject({
      model,
      schema: GameDefinitionSchema,
      system: REFINEMENT_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.5,
    });

    const game = result.object as GameDefinition;

    if (!game.metadata?.id) {
      game.metadata = {
        ...game.metadata,
        id: currentGame.metadata.id,
      };
    }

    const validationResult = validateGameDefinition(game);

    if (!validationResult.valid && validationResult.errors.length > 3) {
      return {
        success: false,
        game,
        validationResult,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Refined game has validation errors',
          suggestions: ['Try a different modification'],
        },
      };
    }

    return {
      success: true,
      game,
      validationResult,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: `API error: ${errorMessage}`,
        suggestions: ['Try again in a moment'],
      },
    };
  }
}

export function getAIConfigFromEnv(env: {
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  AI_MODEL?: string;
  AI_BASE_URL?: string;
}): AIConfig | null {
  const provider = (env.AI_PROVIDER ?? 'openai') as AIProvider;

  let apiKey: string | undefined;

  switch (provider) {
    case 'openai':
      apiKey = env.OPENAI_API_KEY;
      break;
    case 'openrouter':
      apiKey = env.OPENROUTER_API_KEY;
      break;
    case 'anthropic':
      apiKey = env.ANTHROPIC_API_KEY;
      break;
  }

  if (!apiKey) {
    return null;
  }

  return {
    provider,
    apiKey,
    model: env.AI_MODEL,
    baseURL: env.AI_BASE_URL,
  };
}
