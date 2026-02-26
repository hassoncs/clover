import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentItem } from "../../../types/index.js";

const DEFAULT_THEOGRAPHIC_JSON_DIR =
	"data/external/theographic-bible-metadata/json";

interface TheographicRecord<TFields> {
	id?: string;
	fields?: TFields;
}

interface TheographicPersonFields {
	name?: string;
}

interface TheographicPlaceFields {
	displayTitle?: string;
	kjvName?: string;
	esvName?: string;
}

interface TheographicEventFields {
	title?: string;
	startDate?: string;
	duration?: string;
	participants?: string[];
	locations?: string[];
	["people (from verses)"]?: string[];
	["places (from verses)"]?: string[];
}

export interface FetchTheographicHistoryOptions {
	count: number;
	gameType?: string;
	eventsFilePath?: string;
	peopleFilePath?: string;
	placesFilePath?: string;
}

function clean(value: string | undefined): string {
	return value?.replace(/\s+/g, " ").trim() ?? "";
}

async function loadJsonFile<T>(filePath: string): Promise<T> {
	const raw = await readFile(filePath, "utf-8");
	return JSON.parse(raw) as T;
}

function parseYear(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed)) {
		return null;
	}

	return Math.trunc(parsed);
}

function buildNameMap<TFields extends { name?: string }>(
	records: Array<TheographicRecord<TFields>>,
): Map<string, string> {
	const output = new Map<string, string>();
	for (const record of records) {
		if (!record.id || !record.fields) {
			continue;
		}

		const name = clean(record.fields.name);
		if (name) {
			output.set(record.id, name);
		}
	}

	return output;
}

function buildPlaceMap(
	records: Array<TheographicRecord<TheographicPlaceFields>>,
): Map<string, string> {
	const output = new Map<string, string>();
	for (const record of records) {
		if (!record.id || !record.fields) {
			continue;
		}

		const name =
			clean(record.fields.displayTitle) ||
			clean(record.fields.kjvName) ||
			clean(record.fields.esvName);
		if (name) {
			output.set(record.id, name);
		}
	}

	return output;
}

function resolveNames(ids: string[], lookup: Map<string, string>): string[] {
	const names = ids
		.map((id) => lookup.get(id) ?? "")
		.map((value) => clean(value))
		.filter((value) => value.length > 0);

	return [...new Set(names)];
}

export async function fetchTheographicHistory(
	options: FetchTheographicHistoryOptions,
): Promise<ContentItem[]> {
	const eventsFilePath =
		options.eventsFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/events.json`;
	const peopleFilePath =
		options.peopleFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/people.json`;
	const placesFilePath =
		options.placesFilePath ?? `${DEFAULT_THEOGRAPHIC_JSON_DIR}/places.json`;

	const [events, people, places] = await Promise.all([
		loadJsonFile<Array<TheographicRecord<TheographicEventFields>>>(
			eventsFilePath,
		),
		loadJsonFile<Array<TheographicRecord<TheographicPersonFields>>>(
			peopleFilePath,
		),
		loadJsonFile<Array<TheographicRecord<TheographicPlaceFields>>>(
			placesFilePath,
		),
	]);

	const peopleById = buildNameMap(people);
	const placesById = buildPlaceMap(places);
	const now = new Date().toISOString();

	const historyItems: ContentItem[] = [];

	for (const event of events) {
		const fields = event.fields;
		if (!fields) {
			continue;
		}

		const eventName = clean(fields.title);
		const year = parseYear(clean(fields.startDate));
		if (!eventName || year === null) {
			continue;
		}

		const participantIds = [
			...(fields.participants ?? []),
			...(fields["people (from verses)"] ?? []),
		];
		const locationIds = [
			...(fields.locations ?? []),
			...(fields["places (from verses)"] ?? []),
		];

		const peopleNames = resolveNames(participantIds, peopleById).slice(0, 8);
		const placeNames = resolveNames(locationIds, placesById).slice(0, 5);
		const descriptionParts = [
			clean(fields.duration) ? `Duration ${clean(fields.duration)}` : "",
			peopleNames.length > 0
				? `Participants ${peopleNames.slice(0, 3).join(", ")}`
				: "",
			placeNames.length > 0
				? `Places ${placeNames.slice(0, 2).join(", ")}`
				: "",
		].filter((part) => part.length > 0);

		const description = descriptionParts.join(". ");

		historyItems.push({
			id: randomUUID(),
			gameType: options.gameType ?? "estimation",
			text: `Estimate the year for this biblical event: ${eventName}`,
			category: "Bible History",
			provenance: {
				source: "theographic" as const,
				metadata: {
					type: "history",
					event: eventName,
					year,
					description,
					people: peopleNames,
					places: placeNames,
				},
			},
			moderationStatus: "pending" as const,
			createdAt: now,
			updatedAt: now,
		});

		if (historyItems.length >= options.count) {
			break;
		}
	}

	return historyItems;
}
