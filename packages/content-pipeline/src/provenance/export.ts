import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentItemRow } from "../db/index.js";

export interface ProvenanceRecord {
	itemId: string;
	gameType: string;
	text: string;
	source: string;
	generatedAt?: string;
	generatedBy?: string;
	prompt?: string;
	metadata?: Record<string, unknown>;
	transformHistory: string[];
	createdAt: string;
	updatedAt: string;
}

export function buildProvenanceRecord(item: ContentItemRow): ProvenanceRecord {
	return {
		itemId: item.id,
		gameType: item.gameType,
		text: item.text,
		source: item.provenanceSource,
		generatedAt: item.provenanceGeneratedAt || undefined,
		generatedBy: item.provenanceGeneratedBy || undefined,
		prompt: item.provenancePrompt || undefined,
		metadata: item.provenanceMetadata
			? JSON.parse(item.provenanceMetadata)
			: undefined,
		transformHistory: [],
		createdAt: item.createdAt,
		updatedAt: item.updatedAt,
	};
}

export function exportProvenance(
	items: ContentItemRow[],
	outputDir: string,
): void {
	for (const item of items) {
		const record = buildProvenanceRecord(item);
		const filename = `${item.id}.provenance.json`;
		const filepath = join(outputDir, filename);

		writeFileSync(filepath, JSON.stringify(record, null, 2), "utf-8");
	}

	console.log(`Exported ${items.length} provenance records to ${outputDir}`);
}
