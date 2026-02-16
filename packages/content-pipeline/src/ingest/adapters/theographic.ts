import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentItem } from "../../types/index.js";

interface TheographicPerson {
	name: string;
	description?: string;
	books?: string[];
	era?: string;
}

interface TheographicPlace {
	name: string;
	description?: string;
	significance?: string;
}

interface TheographicEvent {
	name: string;
	description?: string;
	date?: string;
	people?: string[];
	places?: string[];
}

interface TheographicPayload {
	people?: TheographicPerson[];
	places?: TheographicPlace[];
	events?: TheographicEvent[];
}

export interface FetchTheographicOptions {
	count: number;
	filePath?: string;
	gameType?: string;
}

function cleanText(value: string | undefined): string {
	return value?.replace(/\s+/g, " ").trim() ?? "";
}

function removeTrailingPunctuation(value: string): string {
	return value.replace(/[.!?]+$/, "").trim();
}

function lowerFirst(input: string): string {
	if (!input) {
		return input;
	}

	return `${input[0]?.toLowerCase() ?? ""}${input.slice(1)}`;
}

function inferPersonCategory(person: TheographicPerson): string {
	const era = cleanText(person.era).toLowerCase();
	const books =
		person.books?.map((book) => cleanText(book).toLowerCase()) ?? [];
	const booksText = books.join(" ");

	const oldTestamentSignals = [
		"genesis",
		"exodus",
		"leviticus",
		"numbers",
		"deuteronomy",
		"joshua",
		"judges",
		"samuel",
		"kings",
		"chronicles",
		"ezra",
		"nehemiah",
		"esther",
		"job",
		"psalm",
		"proverb",
		"isaiah",
		"jeremiah",
		"ezekiel",
		"daniel",
		"minor prophets",
	];

	if (
		era.includes("old testament") ||
		era.includes("exodus") ||
		era.includes("patriarch") ||
		oldTestamentSignals.some((signal) => booksText.includes(signal))
	) {
		return "Old Testament Leaders";
	}

	if (
		era.includes("new testament") ||
		booksText.includes("matthew") ||
		booksText.includes("mark") ||
		booksText.includes("luke") ||
		booksText.includes("john") ||
		booksText.includes("acts") ||
		booksText.includes("romans")
	) {
		return "New Testament Figures";
	}

	return "Biblical Figures";
}

function buildPersonTriviaQuestion(person: TheographicPerson): string {
	const description = removeTrailingPunctuation(cleanText(person.description));
	if (description) {
		return `Who ${lowerFirst(description)}?`;
	}

	return `Who is ${cleanText(person.name)} in the Bible?`;
}

function buildPlaceTriviaQuestion(place: TheographicPlace): string {
	const significance = cleanText(place.significance);
	const description = cleanText(place.description);

	if (/temple/i.test(significance) || /temple/i.test(description)) {
		return "In which city was the Temple of Solomon built?";
	}

	if (significance) {
		return `Which biblical place is known for ${lowerFirst(removeTrailingPunctuation(significance))}?`;
	}

	if (description) {
		return `Which biblical place is described as ${lowerFirst(removeTrailingPunctuation(description))}?`;
	}

	return `Which biblical place is called ${cleanText(place.name)}?`;
}

function buildPlaceFibbagePrompt(place: TheographicPlace): string {
	const significance = cleanText(place.significance);
	const description = cleanText(place.description);

	if (/crucifixion/i.test(significance) || /crucifixion/i.test(description)) {
		return "The city where Jesus was crucified";
	}

	const descriptor =
		removeTrailingPunctuation(significance) ||
		removeTrailingPunctuation(description);
	if (descriptor) {
		return `The city known for ${lowerFirst(descriptor)}`;
	}

	return `The biblical city named ${cleanText(place.name)}`;
}

function buildEventHistoryPrompt(event: TheographicEvent): string {
	const name = cleanText(event.name);
	const places = event.places ?? [];

	if (
		/^the exodus$/i.test(name) &&
		places.some((place) => /egypt/i.test(place))
	) {
		return "The Exodus from Egypt";
	}

	if (places.length > 0) {
		return `${name} at ${places[0]}`;
	}

	return name;
}

function buildEventTriviaQuestion(event: TheographicEvent): string {
	const places = event.places ?? [];
	const people = event.people ?? [];

	if (places.some((place) => /red sea/i.test(place))) {
		return "What event involved the parting of the Red Sea?";
	}

	if (people.length >= 2) {
		return `What event involved ${people[0]} and ${people[1]}?`;
	}

	if (people.length === 1) {
		return `What event is associated with ${people[0]}?`;
	}

	const description = removeTrailingPunctuation(cleanText(event.description));
	if (description) {
		return `What biblical event is described as ${lowerFirst(description)}?`;
	}

	return `Which biblical event is known as ${cleanText(event.name)}?`;
}

function parsePayload(raw: string): TheographicPayload {
	const parsed = JSON.parse(raw) as TheographicPayload;
	return {
		people: Array.isArray(parsed.people) ? parsed.people : [],
		places: Array.isArray(parsed.places) ? parsed.places : [],
		events: Array.isArray(parsed.events) ? parsed.events : [],
	};
}

export async function fetchTheographic(
	options: FetchTheographicOptions,
): Promise<ContentItem[]> {
	if (!options.filePath) {
		throw new Error("Theographic ingest requires --file=<path>");
	}

	const raw = await readFile(options.filePath, "utf-8");
	const payload = parsePayload(raw);
	const now = new Date().toISOString();
	const gameType = options.gameType ?? "amen-trivia";
	const output: ContentItem[] = [];

	for (const person of payload.people ?? []) {
		const personName = cleanText(person.name);
		if (!personName) {
			continue;
		}

		output.push({
			id: randomUUID(),
			gameType,
			text: buildPersonTriviaQuestion(person),
			category: inferPersonCategory(person),
			provenance: {
				source: "theographic" as const,
				metadata: {
					type: "trivia",
					answer: personName,
					era: cleanText(person.era),
					books: person.books ?? [],
					description: cleanText(person.description),
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		});

		const clueWords = [
			personName,
			...(person.books ?? []).slice(0, 2),
			cleanText(person.era),
		].filter((word) => cleanText(word).length > 0);

		output.push({
			id: randomUUID(),
			gameType,
			text: personName,
			category: inferPersonCategory(person),
			provenance: {
				source: "theographic" as const,
				metadata: {
					type: "headsup",
					categoryName: inferPersonCategory(person),
					clueWords,
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		});
	}

	for (const place of payload.places ?? []) {
		const placeName = cleanText(place.name);
		if (!placeName) {
			continue;
		}

		output.push({
			id: randomUUID(),
			gameType,
			text: buildPlaceTriviaQuestion(place),
			category: "Biblical Places",
			provenance: {
				source: "theographic" as const,
				metadata: {
					type: "trivia",
					answer: placeName,
					significance: cleanText(place.significance),
					description: cleanText(place.description),
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		});

		output.push({
			id: randomUUID(),
			gameType,
			text: buildPlaceFibbagePrompt(place),
			category: "Bible Fibbage",
			provenance: {
				source: "theographic" as const,
				metadata: {
					type: "fibbage",
					answer: placeName,
					significance: cleanText(place.significance),
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		});
	}

	for (const event of payload.events ?? []) {
		const eventName = cleanText(event.name);
		if (!eventName) {
			continue;
		}

		output.push({
			id: randomUUID(),
			gameType,
			text: buildEventHistoryPrompt(event),
			category: "Bible History",
			provenance: {
				source: "theographic" as const,
				metadata: {
					type: "history",
					answer: cleanText(event.date) || "Unknown date",
					event: eventName,
					people: event.people ?? [],
					places: event.places ?? [],
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		});

		output.push({
			id: randomUUID(),
			gameType,
			text: buildEventTriviaQuestion(event),
			category: "Bible Events",
			provenance: {
				source: "theographic" as const,
				metadata: {
					type: "trivia",
					answer: eventName,
					date: cleanText(event.date),
					people: event.people ?? [],
					places: event.places ?? [],
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		});
	}

	return output.slice(0, options.count);
}
