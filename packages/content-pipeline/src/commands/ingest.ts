import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { PipelineDB } from "../db/index.js";
import { checkDuplicate } from "../dedup/check.js";
import { computeContentHash } from "../dedup/hash.js";
import {
	DEFAULT_BIBLEQUIZZLE_DATA_PATH,
	fetchAlpacaTrivia,
	fetchBibleQuizzle,
	fetchOpenTriviaQA,
	fetchTheographic,
	fetchTheographicFibbage,
	fetchTheographicHeadsUp,
	fetchTheographicHistory,
	fetchTheographicWager,
} from "../ingest/adapters/amen/index.js";
import { fetchOpenTDB } from "../ingest/adapters/opentdb.js";
import type { ContentItem } from "../types/index.js";

export interface IngestOptions {
	source: string;
	gameType: string;
	count?: number;
	file?: string;
	dryRun?: boolean;
}

function resolveDatasetPath(filePath: string): string {
	if (existsSync(filePath)) {
		return filePath;
	}

	const repoRelative = resolve(process.cwd(), "..", "..", filePath);
	if (existsSync(repoRelative)) {
		return repoRelative;
	}

	return filePath;
}

function resolveOptionalDatasetPath(filePath?: string): string | undefined {
	if (!filePath) {
		return undefined;
	}

	return resolveDatasetPath(filePath);
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("source", {
			alias: "s",
			type: "string",
			demandOption: true,
			description:
				"Source id ('opentdb', 'biblequizzle', 'alpaca-trivia', 'opentriviaqa', 'theographic', 'theographic-fibbage', 'theographic-headsup', 'theographic-history', 'theographic-wager') or file path (JSON)",
		})
		.option("game-type", {
			alias: "t",
			type: "string",
			demandOption: true,
			description: "Game type",
		})
		.option("count", {
			alias: "c",
			type: "number",
			description: "Number of items to fetch",
			default: 10,
		})
		.option("file", {
			type: "string",
			description:
				"Local JSON file path for source datasets (e.g. biblequizzle, theographic)",
		})
		.option("dry-run", {
			type: "boolean",
			description: "Display items without saving to DB",
			default: false,
		});
}

export async function handler(
	args: ArgumentsCamelCase<IngestOptions>,
): Promise<void> {
	let items: ContentItem[];

	if (args.source === "opentdb") {
		items = await fetchOpenTDB(args.count || 10);
	} else if (args.source === "biblequizzle") {
		items = await fetchBibleQuizzle({
			count: args.count || 10,
			filePath: resolveOptionalDatasetPath(args.file),
			dataPath:
				process.env.BIBLEQUIZZLE_DATA_PATH ?? DEFAULT_BIBLEQUIZZLE_DATA_PATH,
			gameType: args.gameType,
		});
	} else if (args.source === "theographic") {
		items = await fetchTheographic({
			count: args.count || 10,
			filePath: resolveOptionalDatasetPath(args.file),
			gameType: args.gameType,
		});
	} else if (args.source === "alpaca-trivia") {
		items = await fetchAlpacaTrivia({
			count: args.count || 10,
			filePath: resolveDatasetPath(
				args.file ??
					"data/external/bible-trivia-alpaca/bible_trivia_alpaca.jsonl",
			),
			gameType: args.gameType,
		});
	} else if (args.source === "opentriviaqa") {
		items = await fetchOpenTriviaQA({
			count: args.count || 10,
			filePath: resolveDatasetPath(
				args.file ?? "data/external/OpenTriviaQA/categories/religion-faith",
			),
			gameType: args.gameType,
		});
	} else if (args.source === "theographic-fibbage") {
		items = await fetchTheographicFibbage({
			count: args.count || 10,
			gameType: args.gameType,
			peopleFilePath: resolveDatasetPath(
				args.file ??
					"data/external/theographic-bible-metadata/json/people.json",
			),
			placesFilePath: resolveDatasetPath(
				"data/external/theographic-bible-metadata/json/places.json",
			),
			eventsFilePath: resolveDatasetPath(
				"data/external/theographic-bible-metadata/json/events.json",
			),
		});
	} else if (args.source === "theographic-headsup") {
		items = await fetchTheographicHeadsUp({
			count: args.count || 10,
			gameType: args.gameType,
			peopleFilePath: resolveDatasetPath(
				args.file ??
					"data/external/theographic-bible-metadata/json/people.json",
			),
		});
	} else if (args.source === "theographic-history") {
		items = await fetchTheographicHistory({
			count: args.count || 10,
			gameType: args.gameType,
			eventsFilePath: resolveDatasetPath(
				args.file ??
					"data/external/theographic-bible-metadata/json/events.json",
			),
			peopleFilePath: resolveDatasetPath(
				"data/external/theographic-bible-metadata/json/people.json",
			),
			placesFilePath: resolveDatasetPath(
				"data/external/theographic-bible-metadata/json/places.json",
			),
		});
	} else if (args.source === "theographic-wager") {
		items = await fetchTheographicWager({
			count: args.count || 10,
			gameType: args.gameType,
			booksFilePath: resolveDatasetPath(
				args.file ?? "data/external/theographic-bible-metadata/json/books.json",
			),
			peopleFilePath: resolveDatasetPath(
				"data/external/theographic-bible-metadata/json/people.json",
			),
			eventsFilePath: resolveDatasetPath(
				"data/external/theographic-bible-metadata/json/events.json",
			),
			placesFilePath: resolveDatasetPath(
				"data/external/theographic-bible-metadata/json/places.json",
			),
		});
	} else {
		const data = JSON.parse(readFileSync(args.source, "utf-8"));
		items = (data.items || []).map((item: any) => ({
			id: crypto.randomUUID(),
			gameType: args.gameType,
			text: item.text,
			category: item.category || null,
			provenance: {
				source: data.source || "imported",
				metadata: null,
			},
			moderationStatus: "pending" as const,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}));
	}

	if (args.dryRun) {
		console.log(`Dry run: ${items.length} items fetched`);
		for (const item of items) {
			console.log(`\n[${item.category || "uncategorized"}] ${item.text}`);
			if (item.provenance.metadata) {
				console.log(`  Metadata: ${JSON.stringify(item.provenance.metadata)}`);
			}
		}
		return;
	}

	const db = new PipelineDB();
	let inserted = 0;
	let duplicates = 0;

	for (const item of items) {
		const contentHash = computeContentHash(item.text);
		const dupCheck = checkDuplicate(db, contentHash);

		if (dupCheck.isDuplicate) {
			duplicates++;
			console.log(
				`Duplicate: "${item.text.slice(0, 50)}..." (existing: ${dupCheck.existingItemId})`,
			);
			continue;
		}

		db.insertContentItem({
			id: item.id,
			gameType: args.gameType,
			text: item.text,
			category: item.category ?? null,
			contentHash,
			provenanceSource: item.provenance.source,
			provenanceGeneratedAt: null,
			provenanceGeneratedBy: null,
			provenancePrompt: null,
			provenanceMetadata: item.provenance.metadata
				? JSON.stringify(item.provenance.metadata)
				: null,
			moderationStatus: item.moderationStatus,
			moderationNotes: null,
			createdAt: item.createdAt,
			updatedAt: item.updatedAt,
			metadata: null,
		});
		inserted++;
	}

	db.close();
	console.log(`Ingested ${inserted} items, skipped ${duplicates} duplicates`);
}
