import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { BibleTriviaQuestionSchema } from "../../../types/amen/bible-trivia.js";
import type { ContentItem } from "../../../types/index.js";
import { isValidScriptureRef } from "./scripture-validator.js";

export const DEFAULT_BIBLEQUIZZLE_DATA_PATH =
	"https://raw.githubusercontent.com/BibleQuizzle/BibleQuizzle/main/data/questions.json";

interface BibleQuizzleQuestion {
	question: string;
	correct_answer: string;
	incorrect_answers: string[];
	category?: string;
	difficulty?: string;
	reference?: string;
	explanation?: string;
}

interface BibleQuizzlePayload {
	questions?: BibleQuizzleQuestion[];
	items?: BibleQuizzleQuestion[];
}

export interface FetchBibleQuizzleOptions {
	count: number;
	filePath?: string;
	dataPath?: string;
	gameType?: string;
}

function mapCategory(input?: string): string {
	const category = input?.toLowerCase().trim() ?? "";

	if (category.includes("old testament") || category === "ot") {
		return "Old Testament";
	}

	if (category.includes("new testament") || category === "nt") {
		return "New Testament";
	}

	if (category.includes("gospel")) {
		return "Gospels";
	}

	if (category.includes("epistle") || category.includes("acts")) {
		return "Acts & Epistles";
	}

	if (category.includes("geography") || category.includes("location")) {
		return "Biblical Geography";
	}

	if (category.includes("psalm") || category.includes("proverb")) {
		return "Psalms & Proverbs";
	}

	if (category.includes("parable")) {
		return "Parables";
	}

	if (category.includes("miracle")) {
		return "Miracles";
	}

	if (category.includes("commandment")) {
		return "Ten Commandments";
	}

	return "Biblical Figures";
}

function mapDifficulty(input?: string): "easy" | "medium" | "hard" {
	const difficulty = input?.toLowerCase().trim();
	if (
		difficulty === "easy" ||
		difficulty === "medium" ||
		difficulty === "hard"
	) {
		return difficulty;
	}
	return "medium";
}

function parseDataset(data: string): BibleQuizzleQuestion[] {
	const parsed = JSON.parse(data) as
		| BibleQuizzlePayload
		| BibleQuizzleQuestion[];

	if (Array.isArray(parsed)) {
		return parsed;
	}

	if (Array.isArray(parsed.questions)) {
		return parsed.questions;
	}

	if (Array.isArray(parsed.items)) {
		return parsed.items;
	}

	return [];
}

async function loadBibleQuizzleQuestions(
	options: FetchBibleQuizzleOptions,
): Promise<BibleQuizzleQuestion[]> {
	if (options.filePath) {
		const raw = await readFile(options.filePath, "utf-8");
		return parseDataset(raw);
	}

	if (!options.dataPath) {
		throw new Error(
			"BibleQuizzle ingest requires --file=<path> or a configured data path",
		);
	}

	const dataPath = options.dataPath.trim();
	if (dataPath.startsWith("http://") || dataPath.startsWith("https://")) {
		const response = await fetch(dataPath);
		if (!response.ok) {
			throw new Error(
				`BibleQuizzle data fetch failed (${response.status} ${response.statusText})`,
			);
		}

		const raw = await response.text();
		return parseDataset(raw);
	}

	const raw = await readFile(dataPath, "utf-8");
	return parseDataset(raw);
}

export async function fetchBibleQuizzle(
	options: FetchBibleQuizzleOptions,
): Promise<ContentItem[]> {
	const dataset = await loadBibleQuizzleQuestions(options);
	const now = new Date().toISOString();
	const selected = dataset.slice(0, options.count);

	return selected.map((question) => {
		const scriptureRef =
			typeof question.reference === "string" &&
			isValidScriptureRef(question.reference)
				? question.reference
				: "";

		const bibleTrivia = BibleTriviaQuestionSchema.parse({
			id: randomUUID(),
			question: question.question,
			correctAnswer: question.correct_answer,
			incorrectAnswers: question.incorrect_answers,
			category: mapCategory(question.category),
			difficulty: mapDifficulty(question.difficulty),
			scriptureRef,
			explanation:
				typeof question.explanation === "string" && question.explanation.trim()
					? question.explanation
					: "Imported from BibleQuizzle dataset.",
		});

		return {
			id: randomUUID(),
			gameType: options.gameType ?? "amen-trivia",
			text: bibleTrivia.question,
			category: bibleTrivia.category,
			provenance: {
				source: "biblequizzle" as const,
				metadata: {
					correctAnswer: bibleTrivia.correctAnswer,
					incorrectAnswers: bibleTrivia.incorrectAnswers,
					difficulty: bibleTrivia.difficulty,
					scriptureRef: bibleTrivia.scriptureRef,
					explanation: bibleTrivia.explanation,
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		};
	});
}
