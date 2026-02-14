import { randomUUID } from "node:crypto";
import type { ContentItem } from "../../types/index.js";

interface OpenTDBQuestion {
	type: string;
	difficulty: string;
	category: string;
	question: string;
	correct_answer: string;
	incorrect_answers: string[];
}

interface OpenTDBResponse {
	response_code: number;
	results: OpenTDBQuestion[];
}

function decodeHTMLEntities(text: string): string {
	return text
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ");
}

export async function fetchOpenTDB(count: number): Promise<ContentItem[]> {
	const url = `https://opentdb.com/api.php?amount=${count}&type=multiple`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`OpenTDB API error: ${response.statusText}`);
	}

	const data: OpenTDBResponse = await response.json();

	if (data.response_code !== 0) {
		throw new Error(`OpenTDB API returned error code: ${data.response_code}`);
	}

	const now = new Date().toISOString();

	return data.results.map((q) => {
		const question = decodeHTMLEntities(q.question);
		const correctAnswer = decodeHTMLEntities(q.correct_answer);
		const incorrectAnswers = q.incorrect_answers.map(decodeHTMLEntities);
		const category = decodeHTMLEntities(q.category);

		return {
			id: randomUUID(),
			gameType: "trivia",
			text: question,
			category,
			provenance: {
				source: "imported" as const,
				metadata: {
					correctAnswer,
					incorrectAnswers,
					difficulty: q.difficulty,
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		};
	});
}
