import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentItem } from "../../../types/index.js";

const DEFAULT_THEOGRAPHIC_JSON_DIR =
	"data/external/theographic-bible-metadata/json";

interface TheographicRecord<TFields> {
	fields?: TFields;
}

interface TheographicPersonFields {
	name?: string;
	dictionaryText?: string;
	dictText?: string[];
	gender?: string;
}

interface TheographicPlaceFields {
	displayTitle?: string;
	kjvName?: string;
	esvName?: string;
	featureType?: string;
	dictionaryText?: string;
	dictText?: string[];
}

interface TheographicEventFields {
	title?: string;
}

interface FibbageFact {
	question: string;
	answer: string;
	category: string;
	metadata: Record<string, unknown>;
}

export interface FetchTheographicFibbageOptions {
	count: number;
	gameType?: string;
	peopleFilePath?: string;
	placesFilePath?: string;
	eventsFilePath?: string;
}

function clean(value: string | undefined): string {
	return value?.replace(/\s+/g, " ").trim() ?? "";
}

function removeTrailingPunctuation(value: string): string {
	return value.replace(/[.!?]+$/, "").trim();
}

function cleanDictionaryText(value: string): string {
	return clean(value)
		.replace(/\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/<[^>]+>/g, "")
		.replace(/[“”]/g, '"')
		.replace(/[‘’]/g, "'");
}

function joinDictionaryText(fields: {
	dictionaryText?: string;
	dictText?: string[];
}): string {
	const parts: string[] = [];

	if (clean(fields.dictionaryText)) {
		parts.push(clean(fields.dictionaryText));
	}

	if (Array.isArray(fields.dictText)) {
		for (const entry of fields.dictText) {
			if (clean(entry)) {
				parts.push(clean(entry));
			}
		}
	}

	return cleanDictionaryText(parts.join(" "));
}

function isWordOrPhraseAnswer(value: string): boolean {
	const answer = clean(value);
	return answer.length > 0 && !/\d/.test(answer);
}

async function loadJsonFile<T>(filePath: string): Promise<T> {
	const raw = await readFile(filePath, "utf-8");
	return JSON.parse(raw) as T;
}

function pushUniqueFact(target: FibbageFact[], fact: FibbageFact): void {
	const question = clean(fact.question);
	const answer = removeTrailingPunctuation(clean(fact.answer));

	if (!question.includes("_____")) {
		return;
	}

	if (!isWordOrPhraseAnswer(answer)) {
		return;
	}

	if (
		target.some(
			(entry) =>
				entry.question.toLowerCase() === question.toLowerCase() &&
				entry.answer.toLowerCase() === answer.toLowerCase(),
		)
	) {
		return;
	}

	target.push({
		...fact,
		question,
		answer,
	});
}

function buildPeopleFacts(
	people: Array<TheographicRecord<TheographicPersonFields>>,
): FibbageFact[] {
	const facts: FibbageFact[] = [];

	for (const record of people) {
		const fields = record.fields;
		if (!fields) {
			continue;
		}

		const name = clean(fields.name);
		const dictionaryText = joinDictionaryText(fields);
		if (!name || !dictionaryText) {
			continue;
		}

		const eldestSonMatch = dictionaryText.match(
			/the eldest son of ([^.]+?)\./i,
		);
		if (eldestSonMatch?.[1]) {
			pushUniqueFact(facts, {
				question: `The eldest son of ${clean(eldestSonMatch[1])} was _____.`,
				answer: name,
				category: "Biblical Figures",
				metadata: {
					type: "person-eldest-son",
					name,
					sourceText: eldestSonMatch[0],
				},
			});
		}

		if (/first high priest/i.test(dictionaryText)) {
			pushUniqueFact(facts, {
				question: "The first high priest of Israel was _____.",
				answer: name,
				category: "Biblical Figures",
				metadata: {
					type: "person-first-high-priest",
					name,
				},
			});
		}

		const occupationMatch = dictionaryText.match(
			/by occupation (?:a|an) ([^,.;]+)/i,
		);
		if (occupationMatch?.[1]) {
			pushUniqueFact(facts, {
				question: `${name}'s occupation was _____.`,
				answer: clean(occupationMatch[1]).toLowerCase(),
				category: "Biblical Figures",
				metadata: {
					type: "person-occupation",
					name,
					sourceText: occupationMatch[0],
				},
			});
		}

		const wifeOfMatch = dictionaryText.match(
			/the wife of ([A-Z][A-Za-z' -]+)/i,
		);
		if (wifeOfMatch?.[1]) {
			pushUniqueFact(facts, {
				question: `The wife of ${clean(wifeOfMatch[1])} was _____.`,
				answer: name,
				category: "Biblical Figures",
				metadata: {
					type: "person-wife-of",
					name,
					spouse: clean(wifeOfMatch[1]),
				},
			});
		}

		const fatherOfMatch = dictionaryText.match(
			/the father of ([A-Z][A-Za-z' -]+)/i,
		);
		if (fatherOfMatch?.[1]) {
			pushUniqueFact(facts, {
				question: `The father of ${clean(fatherOfMatch[1])} was _____.`,
				answer: name,
				category: "Biblical Figures",
				metadata: {
					type: "person-father-of",
					name,
					child: clean(fatherOfMatch[1]),
				},
			});
		}
	}

	return facts;
}

function buildPlaceFacts(
	places: Array<TheographicRecord<TheographicPlaceFields>>,
): FibbageFact[] {
	const facts: FibbageFact[] = [];

	for (const record of places) {
		const fields = record.fields;
		if (!fields) {
			continue;
		}

		const name =
			clean(fields.displayTitle) ||
			clean(fields.kjvName) ||
			clean(fields.esvName);
		const featureType = clean(fields.featureType);
		const dictionaryText = joinDictionaryText(fields);
		if (!name || !dictionaryText) {
			continue;
		}

		if (/birth-place of .*jesus|birthplace of .*jesus/i.test(dictionaryText)) {
			pushUniqueFact(facts, {
				question: "Jesus was born in the city of _____.",
				answer: name,
				category: "Biblical Geography",
				metadata: {
					type: "place-birthplace-of-jesus",
					name,
				},
			});
		}

		if (
			/jesus was baptized|where john baptized|john baptized/i.test(
				dictionaryText,
			) &&
			/river/i.test(featureType)
		) {
			pushUniqueFact(facts, {
				question: "The river where Jesus was baptized is called the _____.",
				answer: name,
				category: "Biblical Geography",
				metadata: {
					type: "place-river-of-baptism",
					name,
				},
			});
		}

		const nameMeaningMatch = dictionaryText.match(/^([^,]{3,60}),/);
		if (nameMeaningMatch?.[1]) {
			pushUniqueFact(facts, {
				question: `The place name meaning "${clean(nameMeaningMatch[1])}" is _____.`,
				answer: name,
				category: "Biblical Geography",
				metadata: {
					type: "place-name-meaning",
					name,
					meaning: clean(nameMeaningMatch[1]),
				},
			});
		}

		if (/city of david/i.test(dictionaryText)) {
			pushUniqueFact(facts, {
				question:
					"The Bible location called the 'city of David' in Jesus' birth story is _____.",
				answer: name,
				category: "Biblical Geography",
				metadata: {
					type: "place-city-of-david",
					name,
				},
			});
		}
	}

	return facts;
}

function buildEventFacts(
	events: Array<TheographicRecord<TheographicEventFields>>,
): FibbageFact[] {
	const facts: FibbageFact[] = [];

	for (const record of events) {
		const fields = record.fields;
		if (!fields) {
			continue;
		}

		const title = clean(fields.title);
		if (!title) {
			continue;
		}

		if (/^tower of babel$/i.test(title)) {
			pushUniqueFact(facts, {
				question:
					"The event where God confused human language is called the _____.",
				answer: title,
				category: "Old Testament",
				metadata: {
					type: "event-language-confusion",
					title,
				},
			});
		}

		const birthMatch = title.match(/^Birth of (.+)$/i);
		if (birthMatch?.[1]) {
			pushUniqueFact(facts, {
				question: "The person named in this birth event is _____.",
				answer: clean(birthMatch[1]),
				category: "Old Testament",
				metadata: {
					type: "event-birth-of",
					title,
					person: clean(birthMatch[1]),
				},
			});
		}
	}

	return facts;
}

export async function fetchTheographicFibbage(
	options: FetchTheographicFibbageOptions,
): Promise<ContentItem[]> {
	const peopleFilePath =
		options.peopleFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/people.json`;
	const placesFilePath =
		options.placesFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/places.json`;
	const eventsFilePath =
		options.eventsFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/events.json`;

	const [people, places, events] = await Promise.all([
		loadJsonFile<Array<TheographicRecord<TheographicPersonFields>>>(
			peopleFilePath,
		),
		loadJsonFile<Array<TheographicRecord<TheographicPlaceFields>>>(
			placesFilePath,
		),
		loadJsonFile<Array<TheographicRecord<TheographicEventFields>>>(
			eventsFilePath,
		),
	]);

	const facts: FibbageFact[] = [
		...buildPeopleFacts(people),
		...buildPlaceFacts(places),
		...buildEventFacts(events),
	];

	const now = new Date().toISOString();
	return facts.slice(0, options.count).map((fact) => ({
		id: randomUUID(),
		gameType: options.gameType ?? "fibbage",
		text: fact.question,
		category: fact.category,
		provenance: {
			source: "theographic" as const,
			metadata: {
				type: "fibbage",
				answer: fact.answer,
				...fact.metadata,
			},
		},
		moderationStatus: "pending" as const,
		createdAt: now,
		updatedAt: now,
	}));
}
