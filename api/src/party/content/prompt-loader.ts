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

type D1Database = import("@cloudflare/workers-types").D1Database;

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
	| "headsup"
	| "chroma";

export interface ChromeClue {
	id: string;
	clues: string[];
	bannedColorNames: string[];
}

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
	chroma: ChromeClue;
}

export type ContentItem<T extends ContentType> = ContentTypeMap[T];

export async function loadContentPackFromDB<T extends ContentType>(
	type: T,
	brandId: string,
	db: D1Database,
): Promise<ContentItem<T>[]> {
	const snapshot = await db
		.prepare(
			"SELECT content_ids FROM party_content_snapshots ORDER BY version DESC LIMIT 1",
		)
		.first<{ content_ids: string }>();

	if (!snapshot) {
		throw new Error(
			`No published snapshot found for brand "${brandId}" type "${type}". Run importPacks then publish.`,
		);
	}

	const allIds: string[] = JSON.parse(snapshot.content_ids);

	if (allIds.length === 0) {
		throw new Error(`Published snapshot exists but contains no content IDs.`);
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
		throw new Error(
			`Snapshot has no active "${type}" content for brand "${brandId}". Run importPacks and republish.`,
		);
	}

	return rows.map((row) => JSON.parse(row.body) as ContentItem<T>);
}

export function shufflePrompts<T extends { id: string }>(prompts: T[]): T[] {
	const shuffled = [...prompts];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export function selectPromptsForRound<T extends { id: string }>(
	pool: T[],
	count: number,
	usedIds: Set<string>,
): T[] {
	return pool.filter((p) => !usedIds.has(p.id)).slice(0, count);
}
