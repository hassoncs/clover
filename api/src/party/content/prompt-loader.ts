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
	| "wyr"
	| "estimation"
	| "fibbage"
	| "caption"
	| "wordgame"
	| "FakeWord";

export interface FakeWord {
	id: string;
	word: string;
	phonetic: string;
}

/**
 * Maps content types to their corresponding TypeScript types.
 * Used for type-safe content loading.
 */
export interface ContentTypeMap {
	quip: QuipPrompt;
	trivia: TriviaQuestion;
	drawing: DrawingPrompt;
	wyr: WouldYouRather;
	estimation: EstimationQuestion;
	fibbage: FibbageQuestion;
	caption: CaptionPrompt;
	wordgame: WordGamePrompt;
	FakeWord: FakeWord;
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
		// Other content types will be added as JSON files are generated:
		// drawing: drawingData as DrawingPrompt[],
		// wyr: wyrData as WouldYouRather[],
		// estimation: estimationData as EstimationQuestion[],
	},
	// Brand-specific packs will be added as JSON files are generated:
	// amen: {
	//   trivia: amenTriviaData as TriviaQuestion[],
	//   quip: amenQuipData as QuipPrompt[],
	// },
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

	const brandPacks = contentPacks[brand];
	if (brandPacks?.[type]) {
		return [...brandPacks[type]] as ContentItem<T>[];
	}

	const defaultPacks = contentPacks[DEFAULT_BRAND];
	if (defaultPacks?.[type]) {
		return [...defaultPacks[type]] as ContentItem<T>[];
	}

	throw new Error(
		`Content pack not found for type "${type}" (brand: ${brand}). ` +
			`Available types: ${getAvailableContentTypes(brand).join(", ") || "none"}`,
	);
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
