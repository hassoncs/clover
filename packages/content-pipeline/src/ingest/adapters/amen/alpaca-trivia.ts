import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type {
	BibleTriviaCategory,
	BibleTriviaDifficulty,
} from "../../../types/amen/bible-trivia.js";
import { BibleTriviaQuestionSchema } from "../../../types/amen/bible-trivia.js";
import type { ContentItem } from "../../../types/index.js";

const PLACEHOLDER_WRONG_ANSWER = "[GENERATE_WRONG_ANSWER]";

interface AlpacaTriviaRow {
	instruction?: string;
	input?: string;
	output?: string;
	context?: string;
	response?: string;
}

export interface FetchAlpacaTriviaOptions {
	count: number;
	filePath?: string;
	gameType?: string;
}

function normalizeText(value: string | undefined): string {
	return value?.replace(/\s+/g, " ").trim() ?? "";
}

function normalizeKey(value: string): string {
	return normalizeText(value).toLowerCase();
}

function parseDataset(raw: string): AlpacaTriviaRow[] {
	const trimmed = raw.trim();
	if (!trimmed) {
		return [];
	}

	if (trimmed.startsWith("[")) {
		const parsed = JSON.parse(trimmed) as unknown;
		return Array.isArray(parsed) ? (parsed as AlpacaTriviaRow[]) : [];
	}

	return trimmed
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line) as AlpacaTriviaRow);
}

function inferCategory(question: string): BibleTriviaCategory {
	const q = normalizeKey(question);

	if (
		q.includes("where") ||
		q.includes("city") ||
		q.includes("river") ||
		q.includes("mount")
	) {
		return "Biblical Geography";
	}

	if (q.includes("parable")) {
		return "Parables";
	}

	if (q.includes("miracle")) {
		return "Miracles";
	}

	if (q.includes("commandment")) {
		return "Ten Commandments";
	}

	if (q.includes("psalm") || q.includes("proverb")) {
		return "Psalms & Proverbs";
	}

	if (
		q.includes("matthew") ||
		q.includes("mark") ||
		q.includes("luke") ||
		q.includes("john") ||
		q.includes("jesus")
	) {
		return "Gospels";
	}

	if (q.includes("paul") || q.includes("acts") || q.includes("epistle")) {
		return "Acts & Epistles";
	}

	if (
		q.includes("genesis") ||
		q.includes("exodus") ||
		q.includes("old testament") ||
		q.includes("moses") ||
		q.includes("abraham")
	) {
		return "Old Testament";
	}

	if (q.includes("new testament")) {
		return "New Testament";
	}

	return "Biblical Figures";
}

function inferDifficulty(
	question: string,
	answer: string,
): BibleTriviaDifficulty {
	const qWords = normalizeText(question).split(" ").filter(Boolean).length;
	const aWords = normalizeText(answer).split(" ").filter(Boolean).length;

	if (qWords <= 8 && aWords <= 2) {
		return "easy";
	}

	if (qWords >= 16 || aWords >= 6) {
		return "hard";
	}

	return "medium";
}

function extractScriptureRef(text: string): string {
	const match = text.match(/([1-3]?\s?[A-Za-z]+\s+\d+:\d+)/);
	return match?.[1]?.trim() ?? "";
}

function buildDistractors(
	question: string,
	correctAnswer: string,
	answerPool: string[],
): { incorrectAnswers: string[]; needsWrongAnswerGeneration: boolean } {
	const incorrect: string[] = [];
	const correctKey = normalizeKey(correctAnswer);

	const pushIfUnique = (candidate: string): void => {
		const cleaned = normalizeText(candidate);
		if (!cleaned || normalizeKey(cleaned) === correctKey) {
			return;
		}
		if (
			!incorrect.some((item) => normalizeKey(item) === normalizeKey(cleaned))
		) {
			incorrect.push(cleaned);
		}
	};

	if (correctKey === "true") {
		pushIfUnique("False");
		pushIfUnique("Not enough information");
		pushIfUnique("Partly true");
	}

	if (correctKey === "false") {
		pushIfUnique("True");
		pushIfUnique("Not enough information");
		pushIfUnique("Partly false");
	}

	if (/^\d+$/.test(correctKey)) {
		const value = Number.parseInt(correctKey, 10);
		if (Number.isFinite(value)) {
			pushIfUnique(String(Math.max(1, value - 1)));
			pushIfUnique(String(value + 1));
			pushIfUnique(String(value + 2));
		}
	}

	const q = normalizeKey(question);
	if (
		q.includes("first book in the bible") ||
		q.includes("last book in the bible")
	) {
		pushIfUnique("Exodus");
		pushIfUnique("Psalms");
		pushIfUnique("Matthew");
	}

	for (const candidate of answerPool) {
		if (incorrect.length >= 3) {
			break;
		}
		pushIfUnique(candidate);
	}

	while (incorrect.length < 3) {
		pushIfUnique(`${PLACEHOLDER_WRONG_ANSWER}_${incorrect.length + 1}`);
	}

	const needsWrongAnswerGeneration = incorrect.some((answer) =>
		answer.startsWith(PLACEHOLDER_WRONG_ANSWER),
	);

	return {
		incorrectAnswers: incorrect.slice(0, 3),
		needsWrongAnswerGeneration,
	};
}

export async function fetchAlpacaTrivia(
	options: FetchAlpacaTriviaOptions,
): Promise<ContentItem[]> {
	if (!options.filePath) {
		throw new Error("Alpaca trivia ingest requires --file=<path>");
	}

	const raw = await readFile(options.filePath, "utf-8");
	const rows = parseDataset(raw);
	const now = new Date().toISOString();
	const answerPool = rows
		.map((row) => normalizeText(row.output ?? row.response))
		.filter((answer) => answer.length > 0);

	const selected = rows.slice(0, options.count);
	const output: ContentItem[] = [];

	for (const row of selected) {
		const question = normalizeText(row.instruction);
		const input = normalizeText(row.input ?? row.context);
		const correctAnswer = normalizeText(row.output ?? row.response);

		if (!question || !correctAnswer) {
			continue;
		}

		const distractors = buildDistractors(question, correctAnswer, answerPool);
		const trivia = BibleTriviaQuestionSchema.parse({
			id: randomUUID(),
			question,
			correctAnswer,
			incorrectAnswers: distractors.incorrectAnswers,
			category: inferCategory(question),
			difficulty: inferDifficulty(question, correctAnswer),
			scriptureRef: extractScriptureRef(`${question} ${input}`),
			explanation: input || "Imported from Bible Trivia Alpaca dataset.",
		});

		output.push({
			id: randomUUID(),
			gameType: options.gameType ?? "amen-trivia",
			text: trivia.question,
			category: trivia.category,
			provenance: {
				source: "alpaca-bible-trivia" as unknown as "imported",
				metadata: {
					correctAnswer: trivia.correctAnswer,
					incorrectAnswers: trivia.incorrectAnswers,
					difficulty: trivia.difficulty,
					scriptureRef: trivia.scriptureRef,
					explanation: trivia.explanation,
					needsWrongAnswerGeneration: distractors.needsWrongAnswerGeneration,
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		});
	}

	return output;
}
