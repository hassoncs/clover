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
  ComfyUIClient,
  createComfyUIClient,
} from './comfyui';

export {
  RunPodClient,
  createRunPodClient,
} from './runpod';

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

export type {
  ComfyUIConfig,
  ComfyTxt2ImgParams,
  ComfyImg2ImgParams,
} from './comfyui-types';

export type {
  RunPodConfig,
  RunPodJobInput,
} from './runpod-types';

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
} from './evaluator';

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
} from './experiments';
