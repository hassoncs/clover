// Re-export content types from content-pipeline for convenience
export type {
	CaptionPrompt,
	DrawingPrompt,
	EstimationQuestion,
	FibbageQuestion,
	QuipPrompt,
	TriviaQuestion,
	WordGamePrompt,
	WouldYouRather,
} from "@slopcade/content-pipeline";

import type {
	CaptionPrompt,
	DrawingPrompt,
	EstimationQuestion,
	FibbageQuestion,
	QuipPrompt,
	TriviaQuestion,
	WordGamePrompt,
	WouldYouRather,
} from "@slopcade/content-pipeline";
import fakeWordsData from "./fake-words.json";
import { getActivePacksForType } from "./pack-scheduler";

type D1Database = import("@cloudflare/workers-types").D1Database;

// ============================================================================
// Content Type Definitions
// ============================================================================

/**
 * Supported content types for party games.
 * Each type maps to a specific schema from @slopcade/content-pipeline.
 */
export type ContentType =
	| "quip"
	| "trivia"
	| "drawing"
	| "dilemma"
	| "wyr"
	| "estimation"
	| "fibbage"
	| "caption"
	| "wordgame"
	| "wordlist"
	| "personal"
	| "FakeWord"
	| "ranking"
	| "headsup";

export interface FakeWord {
	id: string;
	word: string;
	phonetic: string;
}

export interface RankingPrompt {
	id: string;
	topic: string;
	items: string[];
}

export interface HeadsUpDeck {
	id: string;
	name: string;
	words: string[];
}

export interface WordlistItem {
	id: string;
	word: string;
	category: string;
}

export interface PersonalPrompt {
	id: string;
	text: string;
	category: string;
}

/**
 * Maps content types to their corresponding TypeScript types.
 * Used for type-safe content loading.
 */
export interface ContentTypeMap {
	quip: QuipPrompt;
	trivia: TriviaQuestion;
	drawing: DrawingPrompt;
	dilemma: WouldYouRather;
	wyr: WouldYouRather;
	estimation: EstimationQuestion;
	fibbage: FibbageQuestion;
	caption: CaptionPrompt;
	wordgame: WordGamePrompt;
	wordlist: WordlistItem;
	personal: PersonalPrompt;
	FakeWord: FakeWord;
	ranking: RankingPrompt;
	headsup: HeadsUpDeck;
}

/**
 * Get the TypeScript type for a content type.
 */
export type ContentItem<T extends ContentType> = ContentTypeMap[T];

// ============================================================================
// Content Pack Registry
// ============================================================================

type UnknownContentPack = unknown[];
type BrandTypeKey = `${string}:${ContentType}`;
type ContentPackLoader = () => Promise<UnknownContentPack>;
type BrandContentLoaders = Record<
	string,
	Partial<Record<ContentType, ContentPackLoader>>
>;
type ScheduledPackLoaders = Record<
	string,
	() => Promise<Partial<Record<ContentType, UnknownContentPack>>>
>;

const loadSlopcadeDilemma = async () => {
	return (await import("./packs/slopcade/dilemma.json"))
		.default as WouldYouRather[];
};

const loadAmenDilemma = async () => {
	return (await import("./packs/amen/amen-dilemma.json"))
		.default as WouldYouRather[];
};

const sharedPackLoaders: Partial<Record<ContentType, ContentPackLoader>> = {
	FakeWord: async () => fakeWordsData as FakeWord[],
};

const contentPackLoaders: BrandContentLoaders = {
	slopcade: {
		quip: async () =>
			(await import("./packs/slopcade/quip.json")).default as QuipPrompt[],
		trivia: async () =>
			(await import("./packs/slopcade/trivia.json"))
				.default as TriviaQuestion[],
		fibbage: async () =>
			(await import("./packs/slopcade/fibbage.json"))
				.default as FibbageQuestion[],
		drawing: async () =>
			(await import("./packs/slopcade/drawing.json"))
				.default as DrawingPrompt[],
		dilemma: loadSlopcadeDilemma,
		wyr: loadSlopcadeDilemma,
		estimation: async () =>
			(await import("./packs/slopcade/wager.json"))
				.default as EstimationQuestion[],
		ranking: async () =>
			(await import("./packs/slopcade/ranking.json"))
				.default as RankingPrompt[],
		headsup: async () =>
			(await import("./packs/slopcade/headsup.json")).default as HeadsUpDeck[],
		personal: async () =>
			(await import("./packs/slopcade/personal.json"))
				.default as PersonalPrompt[],
		wordlist: async () =>
			(await import("./packs/slopcade/wordlist.json"))
				.default as WordlistItem[],
		...sharedPackLoaders,
	},
	amen: {
		trivia: async () =>
			(await import("./packs/amen/amen-trivia.json"))
				.default as TriviaQuestion[],
		quip: async () =>
			(await import("./packs/amen/amen-quip.json")).default as QuipPrompt[],
		fibbage: async () =>
			(await import("./packs/amen/amen-fibbage.json"))
				.default as FibbageQuestion[],
		estimation: async () =>
			(await import("./packs/amen/amen-wager.json"))
				.default as EstimationQuestion[],
		drawing: async () =>
			(await import("./packs/amen/amen-drawing.json"))
				.default as DrawingPrompt[],
		ranking: async () =>
			(await import("./packs/amen/amen-ranking.json"))
				.default as RankingPrompt[],
		dilemma: loadAmenDilemma,
		wyr: loadAmenDilemma,
		wordlist: async () =>
			(await import("./packs/amen/amen-wordlist.json"))
				.default as WordlistItem[],
		personal: async () =>
			(await import("./packs/amen/amen-personal.json"))
				.default as PersonalPrompt[],
		headsup: async () =>
			(await import("./packs/amen/amen-headsup.json")).default as HeadsUpDeck[],
		...sharedPackLoaders,
	},
};

const scheduledContentPackLoaders: ScheduledPackLoaders = {
	"amen-easter-special": async () =>
		(await import("./packs/amen/amen-easter-special.json")).default as Partial<
			Record<ContentType, UnknownContentPack>
		>,
	"amen-good-friday": async () =>
		(await import("./packs/amen/amen-good-friday.json")).default as Partial<
			Record<ContentType, UnknownContentPack>
		>,
};

const brandPackCache = new Map<BrandTypeKey, UnknownContentPack>();
const scheduledPackCache = new Map<
	string,
	Partial<Record<ContentType, UnknownContentPack>>
>();

function getCacheKey(brandId: string, type: ContentType): BrandTypeKey {
	return `${brandId}:${type}`;
}

async function loadBrandPack<T extends ContentType>(
	type: T,
	brandId: string,
): Promise<ContentItem<T>[] | undefined> {
	const cacheKey = getCacheKey(brandId, type);
	const cachedPack = brandPackCache.get(cacheKey);

	if (cachedPack) {
		return cachedPack as ContentItem<T>[];
	}

	const loader = contentPackLoaders[brandId]?.[type];
	if (!loader) {
		return undefined;
	}

	const loadedPack = (await loader()) as ContentItem<T>[];
	brandPackCache.set(cacheKey, loadedPack);
	return loadedPack;
}

async function loadScheduledPack(
	packId: string,
): Promise<Partial<Record<ContentType, UnknownContentPack>> | undefined> {
	const cachedPack = scheduledPackCache.get(packId);
	if (cachedPack) {
		return cachedPack;
	}

	const loader = scheduledContentPackLoaders[packId];
	if (!loader) {
		return undefined;
	}

	const loadedPack = await loader();
	scheduledPackCache.set(packId, loadedPack);
	return loadedPack;
}

// ============================================================================
// Content Loading Functions
// ============================================================================

const DEFAULT_BRAND = "slopcade";

export async function loadContentPack<T extends ContentType>(
	type: T,
	brandId?: string,
): Promise<ContentItem<T>[]> {
	const brand = brandId || DEFAULT_BRAND;
	const basePack = await loadBrandPack(type, brand);

	if (!basePack) {
		throw new Error(
			`Content pack not found for type "${type}" (brand: ${brand}). ` +
				`Available types: ${getAvailableContentTypes(brand).join(", ") || "none"}`,
		);
	}

	const mergedPack = [...basePack];
	const activeSeasonalPacks = getActivePacksForType(brand, type);

	for (const seasonalPack of activeSeasonalPacks) {
		const scheduledPackData = await loadScheduledPack(seasonalPack.packId);
		const seasonalContent = scheduledPackData?.[type] as
			| ContentItem<T>[]
			| undefined;

		if (seasonalContent) {
			mergedPack.push(...seasonalContent);
		}
	}

	return mergedPack;
}

export async function loadContentPackFromDB<T extends ContentType>(
	type: T,
	brandId: string,
	db: D1Database,
): Promise<ContentItem<T>[]> {
	try {
		const snapshot = await db
			.prepare(
				"SELECT content_ids FROM party_content_snapshots ORDER BY version DESC LIMIT 1",
			)
			.first<{ content_ids: string }>();

		if (!snapshot) {
			return loadContentPack(type, brandId);
		}

		const allIds: string[] = JSON.parse(snapshot.content_ids);

		if (allIds.length === 0) {
			return loadContentPack(type, brandId);
		}

		const placeholders = allIds.map(() => "?").join(",");
		const result = await db
			.prepare(
				`SELECT body FROM party_content
				 WHERE id IN (${placeholders})
				   AND brand_id = ?
				   AND content_type = ?
				   AND deleted_at IS NULL`,
			)
			.bind(...allIds, brandId, type)
			.all<{ body: string }>();

		const rows = result.results ?? [];

		if (rows.length === 0) {
			return loadContentPack(type, brandId);
		}

		return rows.map((row) => JSON.parse(row.body) as ContentItem<T>);
	} catch (err) {
		console.error("loadContentPackFromDB failed, falling back to JSON:", err);
		return loadContentPack(type, brandId);
	}
}

/**
 * Check if a content pack exists for a given type and brand.
 */
export function hasContentPack(type: ContentType, brandId?: string): boolean {
	const brand = brandId || DEFAULT_BRAND;
	return contentPackLoaders[brand]?.[type] !== undefined;
}

/**
 * Get list of available content types for a brand.
 */
export function getAvailableContentTypes(brandId?: string): ContentType[] {
	const brand = brandId || DEFAULT_BRAND;
	const brandPacks = contentPackLoaders[brand] || {};

	return Object.keys(brandPacks).filter((key) => {
		return brandPacks[key as ContentType] !== undefined;
	}) as ContentType[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Shuffle prompts using Fisher-Yates algorithm.
 */
export function shufflePrompts<T extends { id: string }>(prompts: T[]): T[] {
	const shuffled = [...prompts];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Select prompts for a round, excluding already-used IDs.
 */
export function selectPromptsForRound<T extends { id: string }>(
	pool: T[],
	count: number,
	usedIds: Set<string>,
): T[] {
	return pool.filter((p) => !usedIds.has(p.id)).slice(0, count);
}
