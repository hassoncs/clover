export {
  classifyPrompt,
  getClassificationConfidence,
  type GameIntent,
} from '@/ai/classifier'

export {
  generateGame,
  refineGame,
  getAIConfigFromEnv,
  type AIConfig,
  type AIProvider,
  type GenerationOptions,
  type GenerationResult,
  type RefinementResult,
} from '@/ai/generator'

export { GameDefinitionSchema } from '@/ai/schemas'

export {
  validateGameDefinition,
  getValidationSummary,
  type GameDefinitionValidationResult,
  type ValidationError,
  type ValidationWarning,
} from '@/ai/validator'

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
} from '@/ai/templates'

export {
  ScenarioClient,
  createScenarioClient,
} from '@/ai/scenario'

export {
  ComfyUIClient,
  createComfyUIClient,
} from '@/ai/comfyui'

export {
  AssetService,
  type EntityType,
  type SpriteStyle,
  type AssetGenerationRequest,
  type AssetGenerationResult,
} from '@/ai/assets'

export type {
  ScenarioConfig,
  GenerationParams,
  GenerationResult as ScenarioGenerationResult,
} from '@/ai/scenario-types'

export type {
  ComfyUIConfig,
  ComfyTxt2ImgParams,
  ComfyImg2ImgParams,
  ComfyGenerateLayeredParams,
  ParallaxLayerConfig,
  ComfyLayeredResult,
} from '@/ai/comfyui-types'

export {
  evaluateGame,
  evaluateGameStructure,
  runImprovementLoop,
  quickEvaluate,
  type EvaluationRequest,
  type EvaluationConfig,
  type EvaluationResult,
  type GameEvaluation,
  type GameEvaluationDimensions,
  type GameEvaluationStructural,
  type ImprovementLoopConfig,
  type ImprovementLoopResult,
  type IterationRecord,
} from '@/ai/evaluator'

export {
  runExperiment,
  formatExperimentReport,
  BENCHMARK_PROMPTS,
  type ExperimentConfig,
  type ExperimentResult,
  type ExperimentSummary,
  type RunResult,
  type ModelConfig,
  type ModelStats,
  type PromptStats,
} from '@/ai/experiments'
