import { microsToSparks } from "@slopcade/shared";
import type { LanguageModel } from "ai";
import { createModel } from "@/ai/model-factory";

export type AgentTier = "free" | "standard" | "pro";

export interface TierModelConfig {
	tier: AgentTier;
	displayName: string;
	primary: {
		provider: "openrouter";
		model: string;
	};
	maxBudgetMicros: number;
	estimatedCostPerStepMicros: number;
}

export const TIER_CONFIGS: Record<AgentTier, TierModelConfig> = {
	free: {
		tier: "free",
		displayName: "Free",
		primary: {
			provider: "openrouter",
			model: "openai/gpt-4o-mini",
		},
		maxBudgetMicros: 50_000,
		estimatedCostPerStepMicros: 5_000,
	},
	standard: {
		tier: "standard",
		displayName: "Standard",
		primary: {
			provider: "openrouter",
			model: "openai/gpt-4o",
		},
		maxBudgetMicros: 200_000,
		estimatedCostPerStepMicros: 20_000,
	},
	pro: {
		tier: "pro",
		displayName: "Pro",
		primary: {
			provider: "openrouter",
			model: "anthropic/claude-sonnet-4",
		},
		maxBudgetMicros: 500_000,
		estimatedCostPerStepMicros: 50_000,
	},
};

export function resolveTierConfig(tier: string): TierModelConfig {
	const config = TIER_CONFIGS[tier as AgentTier];
	if (!config) {
		throw new Error(
			`Invalid tier: ${tier}. Must be one of: ${Object.keys(TIER_CONFIGS).join(", ")}`,
		);
	}
	return config;
}

export function createModelForTier(
	config: TierModelConfig,
	env: { OPENROUTER_API_KEY?: string },
): LanguageModel {
	if (!env.OPENROUTER_API_KEY) {
		throw new Error("OPENROUTER_API_KEY is required");
	}

	return createModel({
		apiKey: env.OPENROUTER_API_KEY,
		model: config.primary.model,
	});
}

export function estimateRunCost(
	tier: AgentTier,
	estimatedSteps: number,
): { totalMicros: number; displaySparks: number } {
	const config = TIER_CONFIGS[tier];
	const totalMicros = config.estimatedCostPerStepMicros * estimatedSteps;
	return {
		totalMicros,
		displaySparks: microsToSparks(totalMicros),
	};
}
