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
import amenDilemmaData from "./packs/amen/amen-dilemma.json";
import amenDrawingData from "./packs/amen/amen-drawing.json";
import amenEasterSpecialData from "./packs/amen/amen-easter-special.json";
import amenFibbageData from "./packs/amen/amen-fibbage.json";
import amenGoodFridayData from "./packs/amen/amen-good-friday.json";
import amenHeadsUpData from "./packs/amen/amen-headsup.json";
import amenPersonalData from "./packs/amen/amen-personal.json";
import amenQuipData from "./packs/amen/amen-quip.json";
import amenRankingData from "./packs/amen/amen-ranking.json";
import amenTriviaData from "./packs/amen/amen-trivia.json";
import amenWagerData from "./packs/amen/amen-wager.json";
import amenWordlistData from "./packs/amen/amen-wordlist.json";
import quiplashPromptsData from "./quiplash-prompts.json";
import triviaPromptsData from "./trivia-prompts.json";

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

/**
 * Content pack registry with brand namespacing.
 * Maps brand IDs to their content packs, where each pack maps content types to arrays.
 *
 * Resolution order:
 * 1. Brand-specific pack: contentPacks[brandId][type]
 * 2. Fallback to default (slopcade) pack
 *
 * To add a new content pack for a brand:
 * 1. Import the JSON file: `import amenTriviaData from "./amen/trivia-prompts.json";`
 * 2. Add to contentPacks under the brand namespace:
 *    amen: { trivia: amenTriviaData as TriviaQuestion[] }
 */
const contentPacks: Record<
	string,
	Partial<{ [K in ContentType]: unknown[] }>
> = {
	slopcade: {
		quip: quiplashPromptsData as QuipPrompt[],
		trivia: triviaPromptsData as TriviaQuestion[],
		FakeWord: fakeWordsData as FakeWord[],
		headsup: [
			{
				id: "default-deck",
				name: "General Knowledge",
				words: [
					"Albert Einstein",
					"The Eiffel Tower",
					"Basketball",
					"Pizza",
					"Harry Potter",
					"The Moon Landing",
					"Dinosaurs",
					"Shakespeare",
					"The Mona Lisa",
					"Chocolate",
					"Mount Everest",
					"Beethoven",
					"The Great Wall of China",
					"Soccer",
					"Sushi",
					"Cleopatra",
					"The Olympics",
					"Gravity",
					"Penguins",
					"The Internet",
				],
			},
		] as HeadsUpDeck[],
	},
	amen: {
		trivia: amenTriviaData as TriviaQuestion[],
		quip: amenQuipData as QuipPrompt[],
		fibbage: amenFibbageData as FibbageQuestion[],
		estimation: amenWagerData as EstimationQuestion[],
		drawing: amenDrawingData as DrawingPrompt[],
		ranking: amenRankingData as RankingPrompt[],
		dilemma: amenDilemmaData as WouldYouRather[],
		wyr: amenDilemmaData as WouldYouRather[],
		wordlist: amenWordlistData as WordlistItem[],
		personal: amenPersonalData as PersonalPrompt[],
		headsup: amenHeadsUpData as HeadsUpDeck[],
	},
};

const scheduledContentPacks: Record<
	string,
	Partial<{ [K in ContentType]: unknown[] }>
> = {
	"amen-easter-special": amenEasterSpecialData as Partial<{
		[K in ContentType]: unknown[];
	}>,
	"amen-good-friday": amenGoodFridayData as Partial<{
		[K in ContentType]: unknown[];
	}>,
};

// ============================================================================
// Content Loading Functions
// ============================================================================

const DEFAULT_BRAND = "slopcade";

/**
 * Load a content pack by type, optionally scoped to a brand.
 *
 * Resolution order:
 * 1. Look for brand-specific pack: contentPacks[brandId][type]
 * 2. If not found, fall back to default (slopcade) pack
 * 3. If neither exists, throw error
 */
export function loadContentPack<T extends ContentType>(
	type: T,
	brandId?: string,
): ContentItem<T>[] {
	const brand = brandId || DEFAULT_BRAND;
	const brandPacks = contentPacks[brand] ?? {};
	const defaultPacks = contentPacks[DEFAULT_BRAND] ?? {};
	const basePack =
		(brandPacks[type] as ContentItem<T>[] | undefined) ??
		(defaultPacks[type] as ContentItem<T>[] | undefined);

	if (!basePack) {
		throw new Error(
			`Content pack not found for type "${type}" (brand: ${brand}). ` +
				`Available types: ${getAvailableContentTypes(brand).join(", ") || "none"}`,
		);
	}

	const mergedPack = [...basePack];
	const activeSeasonalPacks = getActivePacksForType(brand, type);

	for (const seasonalPack of activeSeasonalPacks) {
		const seasonalContent = scheduledContentPacks[seasonalPack.packId]?.[
			type
		] as ContentItem<T>[] | undefined;

		if (seasonalContent) {
			mergedPack.push(...seasonalContent);
		}
	}

	return mergedPack;
}

/**
 * Check if a content pack exists for a given type and brand.
 */
export function hasContentPack(type: ContentType, brandId?: string): boolean {
	const brand = brandId || DEFAULT_BRAND;
	const brandPacks = contentPacks[brand];
	if (brandPacks?.[type]) return true;
	const defaultPacks = contentPacks[DEFAULT_BRAND];
	return defaultPacks?.[type] !== undefined;
}

/**
 * Get list of available content types for a brand.
 */
export function getAvailableContentTypes(brandId?: string): ContentType[] {
	const brand = brandId || DEFAULT_BRAND;
	const brandPacks = contentPacks[brand] || {};
	const defaultPacks = contentPacks[DEFAULT_BRAND] || {};

	const allTypes = new Set([
		...Object.keys(brandPacks),
		...Object.keys(defaultPacks),
	]);

	return [...allTypes].filter((key) => {
		return (
			brandPacks[key as ContentType] !== undefined ||
			defaultPacks[key as ContentType] !== undefined
		);
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
