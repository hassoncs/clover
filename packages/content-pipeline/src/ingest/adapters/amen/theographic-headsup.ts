import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentItem } from "../../../types/index.js";

const DEFAULT_THEOGRAPHIC_PEOPLE_PATH =
	"data/external/theographic-bible-metadata/json/people.json";

const DECKS = [
	"Old Testament Heroes",
	"New Testament Figures",
	"Kings & Queens",
	"Prophets & Priests",
	"Everyone Else",
] as const;

type DeckName = (typeof DECKS)[number];

interface TheographicRecord<TFields> {
	fields?: TFields;
}

interface TheographicPersonFields {
	name?: string;
	verseCount?: number;
	dictText?: string[];
	dictionaryText?: string;
	alsoCalled?: string;
	gender?: string;
	minYear?: number;
	maxYear?: number;
}

interface HeadsUpEntry {
	name: string;
	deck: DeckName;
	clueWords: string[];
	description: string;
	verseCount: number;
}

export interface FetchTheographicHeadsUpOptions {
	count: number;
	gameType?: string;
	peopleFilePath?: string;
}

function clean(value: string | undefined): string {
	return value?.replace(/\s+/g, " ").trim() ?? "";
}

function tokenizeDescription(input: string): string[] {
	const candidates = input
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, " ")
		.split(/\s+/)
		.filter((part) => part.length >= 4);

	const stopWords = new Set([
		"that",
		"with",
		"from",
		"this",
		"where",
		"which",
		"there",
		"into",
		"after",
		"before",
		"during",
		"about",
		"their",
		"those",
	]);

	const unique: string[] = [];
	for (const word of candidates) {
		if (stopWords.has(word)) {
			continue;
		}
		if (!unique.includes(word)) {
			unique.push(word);
		}
		if (unique.length >= 4) {
			break;
		}
	}

	return unique;
}

function chooseDescription(fields: TheographicPersonFields): string {
	const dictText = fields.dictText?.find((entry) => clean(entry).length > 0);
	const fallback = clean(fields.dictionaryText);
	const source = clean(dictText) || fallback;
	if (!source) {
		return "";
	}

	const firstSentence = source.split(/[.!?]/)[0] ?? source;
	return clean(firstSentence);
}

function inferDeck(
	fields: TheographicPersonFields,
	description: string,
): DeckName {
	const text = `${description} ${clean(fields.alsoCalled)}`.toLowerCase();

	if (/king|queen|pharaoh|ruler|throne/.test(text)) {
		return "Kings & Queens";
	}

	if (/prophet|priest|levite|high priest|seer/.test(text)) {
		return "Prophets & Priests";
	}

	const minYear = fields.minYear;
	if (
		/jesus|apostle|disciple|roman|church|gospel|acts/.test(text) ||
		(typeof minYear === "number" && minYear > -20)
	) {
		return "New Testament Figures";
	}

	if ((fields.verseCount ?? 0) >= 20) {
		return "Old Testament Heroes";
	}

	return "Everyone Else";
}

function buildClueWords(
	name: string,
	fields: TheographicPersonFields,
	description: string,
): string[] {
	const words = tokenizeDescription(description);
	const aliases = clean(fields.alsoCalled)
		.split(",")
		.map((alias) => clean(alias))
		.filter((alias) => alias.length > 0)
		.slice(0, 2);

	const gender = clean(fields.gender);
	const clues = [name, ...aliases, ...words, gender]
		.map((entry) => clean(entry))
		.filter((entry) => entry.length > 0);

	return [...new Set(clues)].slice(0, 6);
}

async function loadPeopleData(
	filePath: string,
): Promise<Array<TheographicRecord<TheographicPersonFields>>> {
	const raw = await readFile(filePath, "utf-8");
	return JSON.parse(raw) as Array<TheographicRecord<TheographicPersonFields>>;
}

function selectEntriesByDeck(
	entries: HeadsUpEntry[],
	count: number,
): HeadsUpEntry[] {
	const deckMap = new Map<DeckName, HeadsUpEntry[]>();
	for (const deck of DECKS) {
		deckMap.set(deck, []);
	}

	for (const entry of entries) {
		deckMap.get(entry.deck)?.push(entry);
	}

	for (const deck of DECKS) {
		deckMap
			.get(deck)
			?.sort(
				(a, b) => b.verseCount - a.verseCount || a.name.localeCompare(b.name),
			);
	}

	const selected: HeadsUpEntry[] = [];
	let index = 0;
	while (selected.length < count) {
		const deck = DECKS[index % DECKS.length];
		const bucket = deckMap.get(deck);
		const next = bucket?.shift();
		if (next) {
			selected.push(next);
		}

		index += 1;
		if (index > count * DECKS.length * 2) {
			break;
		}
	}

	return selected;
}

export async function fetchTheographicHeadsUp(
	options: FetchTheographicHeadsUpOptions,
): Promise<ContentItem[]> {
	const peopleFilePath =
		options.peopleFilePath ?? DEFAULT_THEOGRAPHIC_PEOPLE_PATH;
	const peopleData = await loadPeopleData(peopleFilePath);

	const byName = new Map<string, HeadsUpEntry>();

	for (const person of peopleData) {
		const fields = person.fields;
		if (!fields) {
			continue;
		}

		const name = clean(fields.name);
		const verseCount = fields.verseCount ?? 0;
		const description = chooseDescription(fields);

		const appearsMultipleBooks = verseCount >= 3;
		if (!name || !description || !appearsMultipleBooks) {
			continue;
		}

		const entry: HeadsUpEntry = {
			name,
			deck: inferDeck(fields, description),
			clueWords: buildClueWords(name, fields, description),
			description,
			verseCount,
		};

		const existing = byName.get(name.toLowerCase());
		if (!existing || existing.verseCount < verseCount) {
			byName.set(name.toLowerCase(), entry);
		}
	}

	const selected = selectEntriesByDeck([...byName.values()], options.count);
	const now = new Date().toISOString();

	return selected.map((entry) => ({
		id: randomUUID(),
		gameType: options.gameType ?? "headsup",
		text: entry.name,
		category: entry.deck,
		provenance: {
			source: "theographic" as const,
			metadata: {
				type: "headsup",
				name: entry.name,
				deck: entry.deck,
				clueWords: entry.clueWords,
				description: entry.description,
			},
		},
		moderationStatus: "pending" as const,
		createdAt: now,
		updatedAt: now,
	}));
}
