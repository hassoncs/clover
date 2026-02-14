import { readFileSync } from "node:fs";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { PipelineDB } from "../db/index.js";
import { checkDuplicate } from "../dedup/check.js";
import { computeContentHash } from "../dedup/hash.js";

export interface IngestOptions {
	source: string;
	gameType: string;
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("source", {
			alias: "s",
			type: "string",
			demandOption: true,
			description: "Source file path (JSON)",
		})
		.option("game-type", {
			alias: "t",
			type: "string",
			demandOption: true,
			description: "Game type",
		});
}

export async function handler(
	args: ArgumentsCamelCase<IngestOptions>,
): Promise<void> {
	const db = new PipelineDB();
	const data = JSON.parse(readFileSync(args.source, "utf-8"));

	let inserted = 0;
	let duplicates = 0;

	for (const item of data.items || []) {
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
			id: crypto.randomUUID(),
			gameType: args.gameType,
			text: item.text,
			category: item.category || null,
			contentHash,
			provenanceSource: data.source || "imported",
			provenanceGeneratedAt: null,
			provenanceGeneratedBy: null,
			provenancePrompt: null,
			provenanceMetadata: null,
			moderationStatus: "pending",
			moderationNotes: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			metadata: null,
		});
		inserted++;
	}

	db.close();
	console.log(`Ingested ${inserted} items, skipped ${duplicates} duplicates`);
}
