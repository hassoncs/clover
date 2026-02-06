export {
  classifyPrompt,
  getClassificationConfidence,
  type GameIntent,
} from '@/ai/game/classifier'

export {
  generateGame,
  refineGame,
  getAIConfigFromEnv,
  type AIConfig,
  type AIProvider,
  type GenerationOptions,
  type GenerationResult,
  type RefinementResult,
} from '@/ai/game/generator'

export { GameDefinitionSchema } from '@/ai/game/schemas'

export {
  validateGameDefinition,
  getValidationSummary,
  type GameDefinitionValidationResult,
  type ValidationError,
  type ValidationWarning,
} from '@/ai/game/validator'

export {
  ScenarioClient,
  createScenarioClient,
} from '@/ai/providers/scenario/client'

export {
  ComfyUIClient,
  createComfyUIClient,
} from '@/ai/providers/comfyui/client'

export {
  AssetService,
  type EntityType,
  type AssetGenerationRequest,
  type AssetGenerationResult,
} from '@/ai/assets'

export type {
  ScenarioConfig,
  GenerationParams,
  GenerationResult as ScenarioGenerationResult,
} from '@/ai/providers/scenario/types'

export type {
  ComfyUIConfig,
  ComfyTxt2ImgParams,
  ComfyImg2ImgParams,
  ComfyGenerateLayeredParams,
  ParallaxLayerConfig,
  ComfyLayeredResult,
} from '@/ai/providers/comfyui/types'

