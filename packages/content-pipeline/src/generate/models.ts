export type ProviderFamily = "openai" | "anthropic" | "opensource";

export interface ModelPreset {
	id: string;
	name: string;
	description: string;
	providerFamily: ProviderFamily;
	inputPricePer1M: number;
	outputPricePer1M: number;
}

/**
 * Curated model presets for content generation via OpenRouter.
 * All models support tool-calling (used by generateObject mode: 'tool').
 *
 * Switch models with: --model=<preset-name-or-full-model-id>
 * Examples:
 *   --model=fast        (gpt-4o-mini, cheapest)
 *   --model=balanced    (gpt-4o, best reliability)
 *   --model=quality     (claude-sonnet-4, best creativity)
 *   --model=reasoning   (kimi-k2, best for complex logic)
 *   --model=openai/gpt-4o  (direct model ID)
 */
export const MODEL_PRESETS: Record<string, ModelPreset> = {
	fast: {
		id: "openai/gpt-4o-mini",
		name: "Fast",
		description: "Cheapest, good for bulk generation",
		providerFamily: "openai",
		inputPricePer1M: 0.15,
		outputPricePer1M: 0.6,
	},
	balanced: {
		id: "openai/gpt-4o",
		name: "Balanced",
		description: "Best reliability for structured output",
		providerFamily: "openai",
		inputPricePer1M: 2.5,
		outputPricePer1M: 10.0,
	},
	quality: {
		id: "anthropic/claude-sonnet-4",
		name: "Quality",
		description: "Best creativity and nuance",
		providerFamily: "anthropic",
		inputPricePer1M: 3.0,
		outputPricePer1M: 15.0,
	},
	reasoning: {
		id: "moonshotai/kimi-k2",
		name: "Reasoning",
		description: "Best for complex logic and estimation questions",
		providerFamily: "opensource",
		inputPricePer1M: 0.6,
		outputPricePer1M: 2.4,
	},
	opensource: {
		id: "meta-llama/llama-3.1-70b-instruct",
		name: "Open Source",
		description: "Llama 3.1 70B, good balance of cost and quality",
		providerFamily: "opensource",
		inputPricePer1M: 0.4,
		outputPricePer1M: 0.4,
	},
};

export const DEFAULT_PRESET = "balanced";

export function detectProviderFamily(modelId: string): ProviderFamily {
	if (modelId.startsWith("openai/")) return "openai";
	if (modelId.startsWith("anthropic/")) return "anthropic";
	return "opensource";
}

/**
 * Resolve a model string to a full model ID and its provider family.
 * Accepts either a preset name ("fast", "balanced") or a full model ID ("openai/gpt-4o").
 */
export function resolveModel(modelOrPreset?: string): {
	id: string;
	providerFamily: ProviderFamily;
} {
	if (!modelOrPreset) {
		const preset = MODEL_PRESETS[DEFAULT_PRESET];
		return { id: preset.id, providerFamily: preset.providerFamily };
	}
	const preset = MODEL_PRESETS[modelOrPreset];
	if (preset) {
		return { id: preset.id, providerFamily: preset.providerFamily };
	}
	return {
		id: modelOrPreset,
		providerFamily: detectProviderFamily(modelOrPreset),
	};
}

/**
 * Resolve a model string to a full model ID.
 * Accepts either a preset name ("fast", "balanced") or a full model ID ("openai/gpt-4o").
 */
export function resolveModelId(modelOrPreset?: string): string {
	return resolveModel(modelOrPreset).id;
}
