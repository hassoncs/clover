export {
  classifyPrompt,
  getClassificationConfidence,
  type GameIntent,
} from './classifier';

export {
  generateGame,
  refineGame,
  getAIConfigFromEnv,
  type AIConfig,
  type AIProvider,
  type GenerationOptions,
  type GenerationResult,
  type RefinementResult,
} from './generator';

export { GameDefinitionSchema } from './schemas';

export {
  validateGameDefinition,
  getValidationSummary,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './validator';

export {
  GAME_TEMPLATES,
  getTemplateForGameType,
  getRandomTemplate,
  BALL_LAUNCHER_TEMPLATE,
  STACK_ATTACK_TEMPLATE,
  JUMPY_CAT_TEMPLATE,
  HILL_RACER_TEMPLATE,
  FALLING_CATCHER_TEMPLATE,
  type GameType,
} from './templates';

export {
  ScenarioClient,
  createScenarioClient,
} from './scenario';

export {
  AssetService,
  getScenarioConfigFromEnv,
  type EntityType,
  type SpriteStyle,
  type AssetGenerationRequest,
  type AssetGenerationResult,
} from './assets';

export type {
  ScenarioConfig,
  GenerationParams,
  GenerationResult as ScenarioGenerationResult,
} from './scenario-types';
