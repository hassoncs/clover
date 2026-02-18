import type { z } from "zod";
import { getBrandTheme } from "../brands/index.js";
import type { BrandTheme } from "../types/brand-theme.js";
import { BASE_CONTENT_CONFIGS, listBaseGameTypes } from "./base-configs.js";

export interface GameTypeConfig {
	schema: z.ZodType<{ items: unknown[] }>;
	system: string;
	promptTemplate: (count: number) => string;
}

const DEFAULT_BRAND_ID = "slopcade";

const LEGACY_BRAND_GAME_TYPES: Record<
	string,
	{ brandId: string; gameType: string }
> = {
	"amen-trivia": { brandId: "amen", gameType: "trivia" },
	"amen-quip": { brandId: "amen", gameType: "quip" },
	"amen-fibbage": { brandId: "amen", gameType: "fibbage" },
	"amen-drawing": { brandId: "amen", gameType: "drawing" },
	"amen-history": { brandId: "amen", gameType: "history" },
	"amen-ranking": { brandId: "amen", gameType: "ranking" },
	"amen-dilemma": { brandId: "amen", gameType: "dilemma" },
	"amen-headsup": { brandId: "amen", gameType: "headsup" },
	"amen-wager": { brandId: "amen", gameType: "wager" },
};

function formatBulletList(items: string[]): string {
	return items.map((item) => `- ${item}`).join("\n");
}

function buildSystemPrompt(brand: BrandTheme): string {
	const factualDomains = brand.factualDomains?.length
		? `\n\nFACTUAL DOMAINS:\n${brand.factualDomains.join(", ")}`
		: "";

	return `${brand.voice.systemPrefix}

BRAND: ${brand.name}
TONE: ${brand.tone}
AUDIENCE: ${brand.audience}
COMEDY STYLE: ${brand.voice.comedyStyle}

HARD GUARDRAILS (DO NOT GENERATE):
${formatBulletList(brand.voice.doNotTouch)}

PREFERRED COMEDY MATERIAL:
${formatBulletList(brand.voice.encouraged)}${factualDomains}`;
}

function buildPromptOverlay(brand: BrandTheme, gameType: string): string {
	const categoryList = brand.categories?.[gameType];
	const categoryText =
		categoryList && categoryList.length > 0
			? `\n\nCATEGORY CONSTRAINTS:\nUse one of these category values when relevant:\n${formatBulletList(categoryList)}`
			: "";

	return `${categoryText}

BRAND DIRECTION:
- Keep all outputs aligned with tone: ${brand.tone}
- Write for audience: ${brand.audience}
- Avoid all forbidden zones listed in system guardrails
- Lean into: ${brand.voice.encouraged.join(", ")}`;
}

export function composeGameTypeConfig(
	brandId: string,
	gameType: string,
): GameTypeConfig {
	const baseConfig = BASE_CONTENT_CONFIGS[gameType];
	if (!baseConfig) {
		throw new Error(
			`Unknown game type: ${gameType}. Available: ${listBaseGameTypes().join(", ")}`,
		);
	}

	const brand = getBrandTheme(brandId);
	const overlay = buildPromptOverlay(brand, gameType);

	return {
		schema: baseConfig.schema,
		system: buildSystemPrompt(brand),
		promptTemplate: (count) => `${baseConfig.promptTemplate(count)}${overlay}`,
	};
}

export function listGameTypes(): string[] {
	return listBaseGameTypes();
}

export interface ResolvedBrandGameType {
	brandId: string;
	gameType: string;
	storageGameType: string;
}

export function resolveBrandGameType(
	requestedGameType: string,
	requestedBrand?: string,
): ResolvedBrandGameType {
	const legacyMatch = LEGACY_BRAND_GAME_TYPES[requestedGameType];
	if (legacyMatch) {
		if (requestedBrand && requestedBrand !== legacyMatch.brandId) {
			throw new Error(
				`Game type ${requestedGameType} is pinned to brand ${legacyMatch.brandId}, but --brand=${requestedBrand} was provided.`,
			);
		}

		return {
			brandId: legacyMatch.brandId,
			gameType: legacyMatch.gameType,
			storageGameType: requestedGameType,
		};
	}

	const brandId = requestedBrand ?? DEFAULT_BRAND_ID;
	const baseExists = BASE_CONTENT_CONFIGS[requestedGameType];
	if (!baseExists) {
		throw new Error(
			`Unknown game type: ${requestedGameType}. Available: ${listBaseGameTypes().join(", ")}`,
		);
	}

	return {
		brandId,
		gameType: requestedGameType,
		storageGameType:
			brandId === DEFAULT_BRAND_ID
				? requestedGameType
				: `${brandId}-${requestedGameType}`,
	};
}

export const GAME_TYPE_CONFIGS: Record<string, GameTypeConfig> = {
	...Object.fromEntries(
		listBaseGameTypes().map((gameType) => [
			gameType,
			composeGameTypeConfig(DEFAULT_BRAND_ID, gameType),
		]),
	),
	...Object.fromEntries(
		Object.entries(LEGACY_BRAND_GAME_TYPES).map(([legacyType, resolved]) => [
			legacyType,
			composeGameTypeConfig(resolved.brandId, resolved.gameType),
		]),
	),
};
