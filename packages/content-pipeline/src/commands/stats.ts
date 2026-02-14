import type { ArgumentsCamelCase, Argv } from "yargs";
import { PipelineDB } from "../db/index.js";

export type StatsOptions = {};

export function builder(yargs: Argv): Argv {
	return yargs;
}

export async function handler(
	args: ArgumentsCamelCase<StatsOptions>,
): Promise<void> {
	const db = new PipelineDB();

	const allItems = db.getContentItems();
	const total = allItems.length;

	const byStatus = new Map<string, number>();
	const bySource = new Map<string, number>();
	const uniqueHashes = new Set<string>();

	for (const item of allItems) {
		byStatus.set(
			item.moderationStatus,
			(byStatus.get(item.moderationStatus) || 0) + 1,
		);
		bySource.set(
			item.provenanceSource,
			(bySource.get(item.provenanceSource) || 0) + 1,
		);
		uniqueHashes.add(item.contentHash);
	}

	const duplicateCount = total - uniqueHashes.size;

	console.log("\n=== Content Pipeline Stats ===\n");
	console.log(`Total items: ${total}`);
	console.log(`Unique items: ${uniqueHashes.size}`);
	console.log(`Duplicates: ${duplicateCount}`);

	console.log("\nBy Status:");
	for (const [status, count] of byStatus.entries()) {
		console.log(`  ${status}: ${count}`);
	}

	console.log("\nBy Source:");
	for (const [source, count] of bySource.entries()) {
		console.log(`  ${source}: ${count}`);
	}

	db.close();
}
