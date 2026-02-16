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
 * Content pack file mapping.
 * Maps content types to their JSON file imports.
 *
 * To add a new content pack:
 * 1. Import the JSON file: `import triviaData from "./trivia-prompts.json";`
 * 2. Add to contentPacks: `trivia: triviaData as TriviaQuestion[],`
 */
const contentPacks: Partial<{
	[K in ContentType]: unknown[];
}> = {
	quip: quiplashPromptsData as QuipPrompt[],
	trivia: triviaPromptsData as TriviaQuestion[],
	FakeWord: fakeWordsData as FakeWord[],
	// Other content types will be added as JSON files are generated:
	// drawing: drawingData as DrawingPrompt[],
	// wyr: wyrData as WouldYouRather[],
	// estimation: estimationData as EstimationQuestion[],
};

// ============================================================================
// Content Loading Functions
// ============================================================================

/**
 * Load a content pack by type.
 *
 * @param type - The content type to load
 * @returns Array of content items for the specified type
 * @throws Error if the content pack doesn't exist
 *
 * @example
 * ```ts
 * const quips = loadContentPack("quip");
 * // quips: QuipPrompt[]
 *
 * const trivia = loadContentPack("trivia");
 * // trivia: TriviaQuestion[]
 * ```
 */
export function loadContentPack<T extends ContentType>(
	type: T,
): ContentItem<T>[] {
	const pack = contentPacks[type];

	if (!pack) {
		throw new Error(
			`Content pack not found for type "${type}". ` +
				`Available types: ${Object.keys(contentPacks).join(", ") || "none"}`,
		);
	}

	return [...pack] as ContentItem<T>[];
}

/**
 * Check if a content pack exists for a given type.
 *
 * @param type - The content type to check
 * @returns true if the content pack exists
 */
export function hasContentPack(type: ContentType): boolean {
	return type in contentPacks && contentPacks[type] !== undefined;
}

/**
 * Get list of available content types.
 *
 * @returns Array of content types that have loaded content packs
 */
export function getAvailableContentTypes(): ContentType[] {
	return Object.keys(contentPacks).filter(
		(key) => contentPacks[key as ContentType] !== undefined,
	) as ContentType[];
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
