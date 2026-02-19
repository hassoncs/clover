interface GameTypeGenerationConfig {
	targetCount: number;
	model: string;
	temperature: number;
	batchSize: number;
}

interface BrandContentConfig {
	brandId: string;
	gameTypes: Record<string, GameTypeGenerationConfig>;
}

const BALANCED_MODEL = "anthropic/claude-sonnet-4.6";

const AMEN_CONTENT_CONFIG: BrandContentConfig = {
	brandId: "amen",
	gameTypes: {
		quip: {
			targetCount: 511,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		trivia: {
			targetCount: 5000,
			model: BALANCED_MODEL,
			temperature: 1.0,
			batchSize: 100,
		},
		drawing: {
			targetCount: 200,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		fibbage: {
			targetCount: 500,
			model: BALANCED_MODEL,
			temperature: 1.0,
			batchSize: 100,
		},
		headsup: {
			targetCount: 500,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		ranking: {
			targetCount: 150,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		dilemma: {
			targetCount: 150,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		wager: {
			targetCount: 500,
			model: BALANCED_MODEL,
			temperature: 1.0,
			batchSize: 100,
		},
		history: {
			targetCount: 350,
			model: BALANCED_MODEL,
			temperature: 1.0,
			batchSize: 100,
		},
	},
};

const SLOPCADE_CONTENT_CONFIG: BrandContentConfig = {
	brandId: "slopcade",
	gameTypes: {
		quip: {
			targetCount: 511,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		trivia: {
			targetCount: 5000,
			model: BALANCED_MODEL,
			temperature: 1.0,
			batchSize: 100,
		},
		drawing: {
			targetCount: 200,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		fibbage: {
			targetCount: 500,
			model: BALANCED_MODEL,
			temperature: 1.0,
			batchSize: 100,
		},
		headsup: {
			targetCount: 500,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		ranking: {
			targetCount: 150,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		dilemma: {
			targetCount: 150,
			model: BALANCED_MODEL,
			temperature: 1.2,
			batchSize: 100,
		},
		wager: {
			targetCount: 500,
			model: BALANCED_MODEL,
			temperature: 1.0,
			batchSize: 100,
		},
		history: {
			targetCount: 350,
			model: BALANCED_MODEL,
			temperature: 1.0,
			batchSize: 100,
		},
	},
};

const BRAND_CONTENT_CONFIGS: Record<string, BrandContentConfig> = {
	amen: AMEN_CONTENT_CONFIG,
	slopcade: SLOPCADE_CONTENT_CONFIG,
};

export function getBrandContentConfig(brandId: string): BrandContentConfig {
	const config = BRAND_CONTENT_CONFIGS[brandId];
	if (!config) {
		const available = Object.keys(BRAND_CONTENT_CONFIGS).join(", ");
		throw new Error(
			`Unknown brand content config: "${brandId}". Available: ${available}`,
		);
	}
	return config;
}

export function getGameTypeConfig(
	brandId: string,
	gameType: string,
): GameTypeGenerationConfig {
	const brand = getBrandContentConfig(brandId);
	const config = brand.gameTypes[gameType];
	if (!config) {
		const available = Object.keys(brand.gameTypes).join(", ");
		throw new Error(
			`Unknown game type "${gameType}" for brand "${brandId}". Available: ${available}`,
		);
	}
	return config;
}

export function listConfiguredGameTypes(brandId: string): string[] {
	return Object.keys(getBrandContentConfig(brandId).gameTypes);
}

export type { BrandContentConfig, GameTypeGenerationConfig };
