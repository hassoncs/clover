import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentItem } from "../../../types/index.js";
import { BIBLE_BOOKS } from "./scripture-validator.js";

export interface FetchOpenTriviaQAOptions {
	count: number;
	filePath?: string;
	gameType?: string;
}

interface ParsedQuestion {
	question: string;
	correctAnswer: string;
	options: string[];
}

const BIBLE_KEYWORDS = [
	"bible",
	"scripture",
	"old testament",
	"new testament",
	"god",
	"lord",
	"jesus",
	"christ",
	"messiah",
	"holy spirit",
	"apostle",
	"apostles",
	"disciple",
	"disciples",
	"prophet",
	"prophets",
	"gospel",
	"psalm",
	"proverb",
	"commandment",
	"ark",
	"covenant",
	"church",
	"israel",
	"israelites",
	"jerusalem",
	"noah",
	"adam",
	"eve",
	"abraham",
	"isaac",
	"jacob",
	"joseph",
	"moses",
	"david",
	"solomon",
	"samson",
	"elijah",
	"elisha",
	"isaiah",
	"jeremiah",
	"daniel",
	"jonah",
	"mary",
	"peter",
	"paul",
	"john",
	"revelation",
];

const NORMALIZED_BOOK_NAMES = BIBLE_BOOKS.map((book) => book.toLowerCase());

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function normalizeKey(value: string): string {
	return normalizeText(value).toLowerCase();
}

function parseOpenTriviaQA(raw: string): ParsedQuestion[] {
	const lines = raw.split(/\r?\n/);
	const parsed: ParsedQuestion[] = [];

	let question = "";
	let correctAnswer = "";
	let options: string[] = [];

	const pushCurrent = (): void => {
		const cleanQuestion = normalizeText(question);
		const cleanAnswer = normalizeText(correctAnswer);
		const cleanOptions = options.map(normalizeText).filter(Boolean);

		if (!cleanQuestion || !cleanAnswer || cleanOptions.length < 2) {
			return;
		}

		parsed.push({
			question: cleanQuestion,
			correctAnswer: cleanAnswer,
			options: cleanOptions,
		});
	};

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed) {
			if (question || correctAnswer || options.length > 0) {
				pushCurrent();
				question = "";
				correctAnswer = "";
				options = [];
			}
			continue;
		}

		if (trimmed.startsWith("#Q ")) {
			if (question || correctAnswer || options.length > 0) {
				pushCurrent();
				correctAnswer = "";
				options = [];
			}
			question = normalizeText(trimmed.slice(3));
			continue;
		}

		if (trimmed.startsWith("^ ")) {
			correctAnswer = normalizeText(trimmed.slice(2));
			continue;
		}

		if (/^[A-E]\s+/.test(trimmed)) {
			options.push(normalizeText(trimmed.slice(2)));
		}
	}

	if (question || correctAnswer || options.length > 0) {
		pushCurrent();
	}

	return parsed;
}

function isBibleRelevant(item: ParsedQuestion): boolean {
	const haystack = normalizeKey(
		`${item.question} ${item.correctAnswer} ${item.options.join(" ")}`,
	);

	if (
		BIBLE_KEYWORDS.some((keyword) =>
			new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(haystack),
		)
	) {
		return true;
	}

	return NORMALIZED_BOOK_NAMES.some((book) =>
		new RegExp(`\\b${escapeRegex(book)}\\b`, "i").test(haystack),
	);
}

function computeIncorrectAnswers(item: ParsedQuestion): string[] {
	const correctKey = normalizeKey(item.correctAnswer);
	const incorrect: string[] = [];

	for (const option of item.options) {
		if (normalizeKey(option) === correctKey) {
			continue;
		}

		if (
			!incorrect.some(
				(existing) => normalizeKey(existing) === normalizeKey(option),
			)
		) {
			incorrect.push(option);
		}
	}

	return incorrect;
}

export async function fetchOpenTriviaQA(
	options: FetchOpenTriviaQAOptions,
): Promise<ContentItem[]> {
	if (!options.filePath) {
		throw new Error("OpenTriviaQA ingest requires --file=<path>");
	}

	const raw = await readFile(options.filePath, "utf-8");
	const now = new Date().toISOString();

	const filtered = parseOpenTriviaQA(raw).filter(isBibleRelevant);
	const selected = filtered.slice(0, options.count);

	return selected.map((entry) => ({
		id: randomUUID(),
		gameType: options.gameType ?? "trivia",
		text: entry.question,
		category: "Bible Trivia",
		provenance: {
			source: "opentriviaqa" as unknown as "imported",
			metadata: {
				correctAnswer: entry.correctAnswer,
				incorrectAnswers: computeIncorrectAnswers(entry),
			},
		},
		moderationStatus: "pending" as const,
		createdAt: now,
		updatedAt: now,
	}));
}
