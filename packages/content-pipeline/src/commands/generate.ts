import { randomUUID } from "node:crypto";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { PipelineDB } from "../db/index.js";
import { computeContentHash } from "../dedup/hash.js";
import { generateContent } from "../generate/client.js";
import { GAME_TYPE_PROMPTS } from "../generate/prompts.js";

export interface GenerateOptions {
	gameType: string;
	count: number;
	category?: string;
	dryRun?: boolean;
}

export function builder(yargs: Argv): Argv {
	return yargs
		.option("game-type", {
			alias: "t",
			type: "string",
			demandOption: true,
			description: "Game type (trivia, quip, drawing, etc.)",
		})
		.option("count", {
			alias: "n",
			type: "number",
			default: 10,
			description: "Number of items to generate",
		})
		.option("category", {
			alias: "c",
			type: "string",
			description: "Category filter",
		})
		.option("dry-run", {
			type: "boolean",
			default: false,
			description: "Display generated content without saving to database",
		});
}

function extractText(item: Record<string, unknown>, gameType: string): string {
	switch (gameType) {
		case "wyr":
			return `Would you rather: ${item.optionA} OR ${item.optionB}`;
		case "estimation":
			return String(item.question);
		case "drawing":
			return String(item.text || item.prompt);
		default:
			return String(item.text || item.question || "");
	}
}

export async function handler(
	args: ArgumentsCamelCase<GenerateOptions>,
): Promise<void> {
	const { gameType, count, category, dryRun } = args;

	const promptTemplate = GAME_TYPE_PROMPTS[gameType];
	if (!promptTemplate) {
		console.error(`Unknown game type: ${gameType}`);
		console.error(
			`Available types: ${Object.keys(GAME_TYPE_PROMPTS).join(", ")}`,
		);
		process.exit(1);
	}

	console.log(`Generating ${count} items for ${gameType}...`);

	try {
		const response = await generateContent(promptTemplate);

		const jsonMatch = response.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			throw new Error("No JSON array found in response");
		}

		const items = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;

		const limitedItems = items.slice(0, count);

		if (dryRun) {
			console.log("\n=== DRY RUN MODE ===");
			console.log(JSON.stringify(limitedItems, null, 2));
			console.log(`\nGenerated ${limitedItems.length} items (not saved)`);
			return;
		}

		const db = new PipelineDB();
		const now = new Date().toISOString();
		let savedCount = 0;
		let duplicateCount = 0;

		for (const item of limitedItems) {
			const text = extractText(item, gameType);
			const itemCategory = String(item.category || category || "");
			const contentHash = computeContentHash(text);

			const existing = db.getContentItemByHash(contentHash);
			if (existing) {
				duplicateCount++;
				continue;
			}

			db.insertContentItem({
				id: randomUUID(),
				gameType,
				text,
				category: itemCategory || null,
				contentHash,
				provenanceSource: "ai-generated",
				provenanceGeneratedAt: now,
				provenanceGeneratedBy: "claude-3-5-sonnet-20241022",
				provenancePrompt: promptTemplate,
				provenanceMetadata: JSON.stringify({ originalItem: item }),
				moderationStatus: "pending",
				moderationNotes: null,
				createdAt: now,
				updatedAt: now,
				metadata: JSON.stringify(item),
			});

			savedCount++;
		}

		db.close();

		console.log(`\n✓ Saved ${savedCount} new items`);
		if (duplicateCount > 0) {
			console.log(`⊘ Skipped ${duplicateCount} duplicates`);
		}
	} catch (error) {
		console.error("Generation failed:", error);
		process.exit(1);
	}
}
