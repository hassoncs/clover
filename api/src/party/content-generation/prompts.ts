import type { z } from "zod";
import { BASE_CONTENT_CONFIGS, listBaseGameTypes } from "./base-configs";
import { getBrandTheme } from "./brands";
import type { BrandTheme } from "./types";

export interface GameTypeConfig {
	schema: z.ZodType<{ items: unknown[] }>;
	system: string;
	promptTemplate: (count: number) => string;
}

const DEFAULT_BRAND_ID = "slopcade";

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
}

export function resolveBrandGameType(
	requestedGameType: string,
	requestedBrand?: string,
): ResolvedBrandGameType {
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
	};
}

export const GAME_TYPE_CONFIGS: Record<string, GameTypeConfig> = {
	...Object.fromEntries(
		listBaseGameTypes().map((gameType) => [
			gameType,
			composeGameTypeConfig(DEFAULT_BRAND_ID, gameType),
		]),
	),
};
