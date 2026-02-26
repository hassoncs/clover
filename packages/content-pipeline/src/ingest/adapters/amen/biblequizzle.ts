import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentItem } from "../../../types/index.js";
import { isValidScriptureRef } from "./scripture-validator.js";

export const DEFAULT_BIBLEQUIZZLE_DATA_PATH =
	"https://raw.githubusercontent.com/BibleQuizzle/BibleQuizzle/main/data/questions.json";

const PLACEHOLDER_WRONG_ANSWER = "[GENERATE_WRONG_ANSWER]";

interface BibleQuizzleRawQuestion {
	question: string;
	answer: string | number;
	categories?: string[];
	reference?: string;
}

export interface FetchBibleQuizzleOptions {
	count: number;
	filePath?: string;
	dataPath?: string;
	gameType?: string;
}

function mapCategory(categories?: string[]): string {
	if (!categories || categories.length === 0) {
		return "Biblical Figures";
	}

	const joined = categories.join(" ").toLowerCase();

	if (joined.includes("gospel")) {
		return "Gospels";
	}
	if (joined.includes("miracle")) {
		return "Miracles";
	}
	if (joined.includes("parable")) {
		return "Parables";
	}
	if (joined.includes("psalm") || joined.includes("proverb")) {
		return "Psalms & Proverbs";
	}
	if (
		joined.includes("epistle") ||
		(joined.includes("acts") && !joined.includes("characters"))
	) {
		return "Acts & Epistles";
	}
	if (joined.includes("geography") || joined.includes("location")) {
		return "Biblical Geography";
	}
	if (joined.includes("commandment")) {
		return "Ten Commandments";
	}
	if (joined.includes("new_testament") || joined.includes("new testament")) {
		return "New Testament";
	}
	if (joined.includes("old_testament") || joined.includes("old testament")) {
		return "Old Testament";
	}
	if (joined.includes("kings") || joined.includes("judges")) {
		return "Old Testament";
	}

	return "Biblical Figures";
}

function parseDataset(data: string): BibleQuizzleRawQuestion[] {
	const parsed = JSON.parse(data) as unknown;

	if (Array.isArray(parsed)) {
		return parsed as BibleQuizzleRawQuestion[];
	}

	if (
		parsed &&
		typeof parsed === "object" &&
		"questions" in parsed &&
		Array.isArray((parsed as { questions: unknown }).questions)
	) {
		return (parsed as { questions: BibleQuizzleRawQuestion[] }).questions;
	}

	return [];
}

async function loadBibleQuizzleQuestions(
	options: FetchBibleQuizzleOptions,
): Promise<BibleQuizzleRawQuestion[]> {
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
		const correctAnswer = String(question.answer).trim();
		const category = mapCategory(question.categories);

		const scriptureRef =
			typeof question.reference === "string" &&
			isValidScriptureRef(question.reference)
				? question.reference
				: "";

		return {
			id: randomUUID(),
			gameType: options.gameType ?? "trivia",
			text: question.question,
			category,
			provenance: {
				source: "biblequizzle" as const,
				metadata: {
					correctAnswer,
					incorrectAnswers: [
						PLACEHOLDER_WRONG_ANSWER,
						PLACEHOLDER_WRONG_ANSWER,
						PLACEHOLDER_WRONG_ANSWER,
					],
					difficulty: "medium" as const,
					scriptureRef,
					explanation: "Imported from BibleQuizzle dataset.",
					needsWrongAnswers: true,
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		};
	});
}
