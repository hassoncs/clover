import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentItem } from "../../../types/index.js";

const DEFAULT_THEOGRAPHIC_JSON_DIR =
	"data/external/theographic-bible-metadata/json";

interface TheographicRecord<TFields> {
	id?: string;
	fields?: TFields;
}

interface TheographicBookFields {
	bookName?: string;
	chapterCount?: number;
	verseCount?: number;
	peopleCount?: number;
	placeCount?: number;
	verses?: string[];
}

interface TheographicPersonFields {
	name?: string;
	verseCount?: number;
	dictionaryText?: string;
	minYear?: number | string;
	maxYear?: number | string;
}

interface TheographicEventFields {
	title?: string;
	startDate?: string;
	participants?: string[];
	["people (from verses)"]?: string[];
}

interface TheographicPlaceFields {
	displayTitle?: string;
	kjvName?: string;
	esvName?: string;
	verseCount?: number;
}

interface WagerFact {
	question: string;
	answer: number;
	unit: string;
	category: string;
	type: string;
	metadata: Record<string, unknown>;
}

export interface FetchTheographicWagerOptions {
	count: number;
	gameType?: string;
	booksFilePath?: string;
	peopleFilePath?: string;
	eventsFilePath?: string;
	placesFilePath?: string;
}

function clean(value: string | undefined): string {
	return value?.replace(/\s+/g, " ").trim() ?? "";
}

async function loadJsonFile<T>(filePath: string): Promise<T> {
	const raw = await readFile(filePath, "utf-8");
	return JSON.parse(raw) as T;
}

function parseInteger(value: number | string | undefined): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}

	if (typeof value !== "string") {
		return null;
	}

	const parsed = Number(value.trim());
	if (!Number.isFinite(parsed)) {
		return null;
	}

	return Math.trunc(parsed);
}

function pushUniqueFact(target: WagerFact[], fact: WagerFact): void {
	if (
		target.some(
			(entry) => entry.question.toLowerCase() === fact.question.toLowerCase(),
		)
	) {
		return;
	}

	target.push(fact);
}

function sortByAbsAnswerDesc(facts: WagerFact[]): WagerFact[] {
	return [...facts].sort((a, b) => Math.abs(b.answer) - Math.abs(a.answer));
}

function buildBooksFacts(
	books: Array<TheographicRecord<TheographicBookFields>>,
): WagerFact[] {
	const facts: WagerFact[] = [];

	for (const record of books) {
		const fields = record.fields;
		if (!fields) {
			continue;
		}

		const bookName = clean(fields.bookName);
		if (!bookName) {
			continue;
		}

		const chapterCount = parseInteger(fields.chapterCount);
		const verseCount =
			parseInteger(fields.verseCount) ??
			(Array.isArray(fields.verses) ? fields.verses.length : null);
		const peopleCount = parseInteger(fields.peopleCount);
		const placeCount = parseInteger(fields.placeCount);

		if (chapterCount !== null && chapterCount > 0) {
			pushUniqueFact(facts, {
				question: `How many chapters are in ${bookName}?`,
				answer: chapterCount,
				unit: "chapters",
				category: "Books of the Bible",
				type: "book-chapter-count",
				metadata: { bookName, chapterCount },
			});
		}

		if (verseCount !== null && verseCount > 0) {
			pushUniqueFact(facts, {
				question: `How many verses are in the book of ${bookName}?`,
				answer: verseCount,
				unit: "verses",
				category: "Books of the Bible",
				type: "book-verse-count",
				metadata: { bookName, verseCount },
			});
		}

		if (peopleCount !== null && peopleCount > 0) {
			pushUniqueFact(facts, {
				question: `How many people are mentioned in ${bookName}?`,
				answer: peopleCount,
				unit: "people",
				category: "Bible Numbers",
				type: "book-people-count",
				metadata: { bookName, peopleCount },
			});
		}

		if (placeCount !== null && placeCount >= 0) {
			pushUniqueFact(facts, {
				question: `How many places are mentioned in ${bookName}?`,
				answer: placeCount,
				unit: "places",
				category: "Bible Numbers",
				type: "book-place-count",
				metadata: { bookName, placeCount },
			});
		}
	}

	return sortByAbsAnswerDesc(facts);
}

function buildPeopleNameMap(
	people: Array<TheographicRecord<TheographicPersonFields>>,
): Map<string, string> {
	const byId = new Map<string, string>();
	for (const record of people) {
		if (!record.id || !record.fields) {
			continue;
		}

		const name = clean(record.fields.name);
		if (name) {
			byId.set(record.id, name);
		}
	}

	return byId;
}

function buildPeopleFacts(
	people: Array<TheographicRecord<TheographicPersonFields>>,
): WagerFact[] {
	const facts: WagerFact[] = [];

	for (const record of people) {
		const fields = record.fields;
		if (!fields) {
			continue;
		}

		const name = clean(fields.name);
		if (!name) {
			continue;
		}

		const verseCount = parseInteger(fields.verseCount);
		if (verseCount !== null && verseCount >= 10) {
			pushUniqueFact(facts, {
				question: `How many verses mention ${name}?`,
				answer: verseCount,
				unit: "verses",
				category: "Biblical Figures",
				type: "person-verse-count",
				metadata: { name, verseCount },
			});
		}

		const minYear = parseInteger(fields.minYear);
		const hasDictionaryText = clean(fields.dictionaryText).length > 0;
		if (
			minYear !== null &&
			hasDictionaryText &&
			verseCount !== null &&
			verseCount >= 20
		) {
			pushUniqueFact(facts, {
				question: `In approximately what year was ${name} born?`,
				answer: minYear,
				unit: "year",
				category: "Biblical Ages",
				type: "person-birth-year",
				metadata: {
					name,
					minYear,
					maxYear: parseInteger(fields.maxYear),
				},
			});
		}
	}

	return sortByAbsAnswerDesc(facts);
}

function buildEventFacts(
	events: Array<TheographicRecord<TheographicEventFields>>,
	peopleById: Map<string, string>,
): WagerFact[] {
	const facts: WagerFact[] = [];

	for (const record of events) {
		const fields = record.fields;
		if (!fields) {
			continue;
		}

		const title = clean(fields.title);
		const startDate = parseInteger(fields.startDate);
		if (!title || startDate === null) {
			continue;
		}

		const participantNames = [
			...(fields.participants ?? []),
			...(fields["people (from verses)"] ?? []),
		]
			.map((id) => peopleById.get(id) ?? "")
			.map((name) => clean(name))
			.filter((name) => name.length > 0);

		pushUniqueFact(facts, {
			question: `In approximately what year did ${title} occur?`,
			answer: startDate,
			unit: "year",
			category: "Bible History",
			type: "event-start-date",
			metadata: {
				title,
				startDate,
				participants: [...new Set(participantNames)].slice(0, 6),
			},
		});
	}

	return sortByAbsAnswerDesc(facts);
}

function buildPlaceFacts(
	places: Array<TheographicRecord<TheographicPlaceFields>>,
): WagerFact[] {
	const facts: WagerFact[] = [];

	for (const record of places) {
		const fields = record.fields;
		if (!fields) {
			continue;
		}

		const name =
			clean(fields.displayTitle) ||
			clean(fields.kjvName) ||
			clean(fields.esvName);
		const verseCount = parseInteger(fields.verseCount);
		if (!name || verseCount === null || verseCount < 5) {
			continue;
		}

		pushUniqueFact(facts, {
			question: `How many times is ${name} mentioned in the Bible?`,
			answer: verseCount,
			unit: "mentions",
			category: "Biblical Places",
			type: "place-verse-count",
			metadata: {
				place: name,
				verseCount,
			},
		});
	}

	return sortByAbsAnswerDesc(facts);
}

export async function fetchTheographicWager(
	options: FetchTheographicWagerOptions,
): Promise<ContentItem[]> {
	const booksFilePath =
		options.booksFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/books.json`;
	const peopleFilePath =
		options.peopleFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/people.json`;
	const eventsFilePath =
		options.eventsFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/events.json`;
	const placesFilePath =
		options.placesFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/places.json`;

	const [books, people, events, places] = await Promise.all([
		loadJsonFile<Array<TheographicRecord<TheographicBookFields>>>(
			booksFilePath,
		),
		loadJsonFile<Array<TheographicRecord<TheographicPersonFields>>>(
			peopleFilePath,
		),
		loadJsonFile<Array<TheographicRecord<TheographicEventFields>>>(
			eventsFilePath,
		),
		loadJsonFile<Array<TheographicRecord<TheographicPlaceFields>>>(
			placesFilePath,
		),
	]);

	const peopleById = buildPeopleNameMap(people);
	const facts: WagerFact[] = [
		...buildBooksFacts(books),
		...buildPeopleFacts(people),
		...buildEventFacts(events, peopleById),
		...buildPlaceFacts(places),
	];

	const now = new Date().toISOString();
	return facts.slice(0, options.count).map((fact) => ({
		id: randomUUID(),
		gameType: options.gameType ?? "amen-wager",
		text: fact.question,
		category: fact.category,
		provenance: {
			source: "theographic" as const,
			metadata: {
				type: "wager",
				question: fact.question,
				answer: fact.answer,
				unit: fact.unit,
				category: fact.category,
				factType: fact.type,
				...fact.metadata,
			},
		},
		moderationStatus: "pending" as const,
		createdAt: now,
		updatedAt: now,
	}));
}
