const API_BIBLE_BASE_URL = "https://rest.api.bible/v1";
const DEFAULT_BIBLE_ID = "78a9f6124f344018-01";

interface ApiBibleVerseResponse {
	data?: {
		id?: string;
		reference?: string;
		content?: string;
	};
}

interface ApiBibleSearchResponse {
	data?: {
		verses?: Array<{
			id?: string;
			reference?: string;
			text?: string;
			content?: string;
		}>;
	};
}

export interface BibleSearchResult {
	id: string;
	reference: string;
	text: string;
	bibleId: string;
}

const verseCache = new Map<string, Promise<string>>();
const searchCache = new Map<string, Promise<BibleSearchResult[]>>();

function getApiBibleApiKey(): string {
	const key = process.env.API_BIBLE_API_KEY?.trim();
	if (!key) {
		throw new Error("API_BIBLE_API_KEY is required to call API.Bible");
	}
	return key;
}

function normalizeVerseId(ref: string): string {
	const trimmed = ref.trim();
	if (!trimmed) {
		throw new Error("Verse reference is required");
	}

	if (trimmed.includes(".")) {
		return trimmed;
	}

	const refMatch = trimmed.match(/^([1-3]?\s*[A-Za-z]+)\s+(\d+):(\d+)$/);
	if (!refMatch) {
		return trimmed;
	}

	const rawBook = refMatch[1]?.replace(/\s+/g, "") ?? "";
	const chapter = refMatch[2] ?? "";
	const verse = refMatch[3] ?? "";
	return `${rawBook}.${chapter}.${verse}`;
}

async function fetchApiBibleJson<T>(url: URL): Promise<T> {
	const response = await fetch(url, {
		headers: {
			"api-key": getApiBibleApiKey(),
			accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(
			`API.Bible request failed (${response.status} ${response.statusText}) for ${url.pathname}`,
		);
	}

	return (await response.json()) as T;
}

function stripMarkup(content: string | undefined): string {
	if (!content) {
		return "";
	}

	return content
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export async function fetchVerseText(
	ref: string,
	bibleId = DEFAULT_BIBLE_ID,
): Promise<string> {
	const verseId = normalizeVerseId(ref);
	const cacheKey = `${bibleId}:${verseId}`;
	const cached = verseCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const request = (async () => {
		const url = new URL(
			`/bibles/${encodeURIComponent(bibleId)}/verses/${encodeURIComponent(verseId)}`,
			API_BIBLE_BASE_URL,
		);
		url.searchParams.set("content-type", "text");
		url.searchParams.set("include-verse-numbers", "false");

		const payload = await fetchApiBibleJson<ApiBibleVerseResponse>(url);
		return stripMarkup(payload.data?.content);
	})();

	verseCache.set(cacheKey, request);
	return request;
}

export async function searchBible(
	query: string,
	bibleId = DEFAULT_BIBLE_ID,
	limit = 10,
): Promise<BibleSearchResult[]> {
	const normalizedQuery = query.trim();
	if (!normalizedQuery) {
		return [];
	}

	const clampedLimit = Math.max(1, Math.min(50, limit));
	const cacheKey = `${bibleId}:${clampedLimit}:${normalizedQuery.toLowerCase()}`;
	const cached = searchCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const request = (async () => {
		const url = new URL(
			`/bibles/${encodeURIComponent(bibleId)}/search`,
			API_BIBLE_BASE_URL,
		);
		url.searchParams.set("query", normalizedQuery);
		url.searchParams.set("limit", String(clampedLimit));

		const payload = await fetchApiBibleJson<ApiBibleSearchResponse>(url);
		const verses = payload.data?.verses ?? [];

		return verses
			.map((verse) => {
				const id = verse.id?.trim() ?? "";
				if (!id) {
					return null;
				}

				return {
					id,
					reference: verse.reference?.trim() ?? "",
					text: stripMarkup(verse.text ?? verse.content),
					bibleId,
				};
			})
			.filter((item): item is BibleSearchResult => item !== null);
	})();

	searchCache.set(cacheKey, request);
	return request;
}
