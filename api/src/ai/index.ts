export {
	type AssetGenerationRequest,
	type AssetGenerationResult,
	AssetService,
	type EntityType,
} from "@/ai/assets";

export {
	classifyPrompt,
	type GameIntent,
	getClassificationConfidence,
} from "@/ai/game/classifier";

export {
	type AIConfig,
	type AIProvider,
	type GenerationOptions,
	type GenerationResult,
	generateGame,
	getAIConfigFromEnv,
	type RefinementResult,
	refineGame,
} from "@/ai/game/generator";

export { GameDefinitionSchema } from "@/ai/game/schemas";

export {
	type GameDefinitionValidationResult,
	getValidationSummary,
	type ValidationError,
	type ValidationWarning,
	validateGameDefinition,
} from "@/ai/game/validator";
export { generateTitle } from "@/ai/generate-title";

export {
	ComfyUIClient,
	createComfyUIClient,
} from "@/ai/providers/comfyui/client";
export type {
	ComfyGenerateLayeredParams,
	ComfyImg2ImgParams,
	ComfyLayeredResult,
	ComfyTxt2ImgParams,
	ComfyUIConfig,
	ParallaxLayerConfig,
} from "@/ai/providers/comfyui/types";
export {
	createScenarioClient,
	ScenarioClient,
} from "@/ai/providers/scenario/client";
export type {
	GenerationParams,
	GenerationResult as ScenarioGenerationResult,
	ScenarioConfig,
} from "@/ai/providers/scenario/types";
