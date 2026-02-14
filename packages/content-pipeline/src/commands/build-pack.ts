import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { PipelineDB } from "../db/index.js";

export interface BuildPackOptions {
	name: string;
	gameType: string;
	output: string;
	count?: number;
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("name", {
			alias: "n",
			type: "string",
			demandOption: true,
			description: "Pack name",
		})
		.option("game-type", {
			alias: "t",
			type: "string",
			demandOption: true,
			description: "Game type",
		})
		.option("output", {
			alias: "o",
			type: "string",
			demandOption: true,
			description: "Output file path",
		})
		.option("count", {
			alias: "c",
			type: "number",
			description: "Number of items to include",
		});
}

export async function handler(
	args: ArgumentsCamelCase<BuildPackOptions>,
): Promise<void> {
	const db = new PipelineDB();

	try {
		console.log(`Building pack "${args.name}" for ${args.gameType}`);

		const items = db.getContentItems({
			gameType: args.gameType,
			moderationStatus: "approved",
		});

		if (items.length === 0) {
			console.warn(`No approved items found for game type: ${args.gameType}`);
			return;
		}

		const selectedItems = args.count ? items.slice(0, args.count) : items;

		const outputData = selectedItems.map((item) => ({
			id: item.id,
			text: item.text,
			...(item.category && { category: item.category }),
		}));

		const outputDir = join(args.output, "..");
		mkdirSync(outputDir, { recursive: true });

		writeFileSync(args.output, JSON.stringify(outputData, null, "\t"));
		console.log(`✓ Wrote ${outputData.length} items to ${args.output}`);

		const creditsPath = join(outputDir, "CREDITS.md");
		const credits = generateCredits(selectedItems, args.name, args.gameType);
		writeFileSync(creditsPath, credits);
		console.log(`✓ Wrote attribution to ${creditsPath}`);
	} finally {
		db.close();
	}
}

function generateCredits(
	items: Array<{
		provenanceSource: string;
		provenanceGeneratedBy: string | null;
	}>,
	packName: string,
	gameType: string,
): string {
	const sources = new Map<string, number>();

	for (const item of items) {
		const source = item.provenanceGeneratedBy || item.provenanceSource;
		sources.set(source, (sources.get(source) || 0) + 1);
	}

	const lines = [
		`# ${packName} - Content Attribution`,
		"",
		`**Game Type:** ${gameType}`,
		`**Total Items:** ${items.length}`,
		"",
		"## Sources",
		"",
	];

	for (const [source, count] of Array.from(sources.entries()).sort(
		(a, b) => b[1] - a[1],
	)) {
		lines.push(`- ${source}: ${count} items`);
	}

	lines.push("");
	lines.push("---");
	lines.push(`Generated: ${new Date().toISOString()}`);

	return lines.join("\n");
}
