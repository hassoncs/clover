import { readFileSync } from "node:fs";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { PipelineDB } from "../db/index.js";
import { checkDuplicate } from "../dedup/check.js";
import { computeContentHash } from "../dedup/hash.js";
import {
	DEFAULT_BIBLEQUIZZLE_DATA_PATH,
	fetchBibleQuizzle,
} from "../ingest/adapters/biblequizzle.js";
import { fetchOpenTDB } from "../ingest/adapters/opentdb.js";
import type { ContentItem } from "../types/index.js";

export interface IngestOptions {
	source: string;
	gameType: string;
	count?: number;
	file?: string;
	dryRun?: boolean;
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("source", {
			alias: "s",
			type: "string",
			demandOption: true,
			description: "Source id ('opentdb', 'biblequizzle') or file path (JSON)",
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
				"Local JSON file path for source datasets (e.g. biblequizzle)",
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
			filePath: args.file,
			dataPath:
				process.env.BIBLEQUIZZLE_DATA_PATH ?? DEFAULT_BIBLEQUIZZLE_DATA_PATH,
			gameType: args.gameType,
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
