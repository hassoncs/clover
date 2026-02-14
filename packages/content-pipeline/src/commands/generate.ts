import { randomUUID } from "node:crypto";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { PipelineDB } from "../db/index.js";
import { computeContentHash } from "../dedup/hash.js";
import { generateItems } from "../generate/client.js";
import { resolveModelId } from "../generate/models.js";
import { GAME_TYPE_CONFIGS } from "../generate/prompts.js";

export interface GenerateOptions {
	gameType: string;
	count: number;
	category?: string;
	dryRun?: boolean;
	model?: string;
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
		})
		.option("model", {
			alias: "m",
			type: "string",
			description:
				"Model preset or ID (presets: fast, balanced, quality, reasoning, opensource)",
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

	const config = GAME_TYPE_CONFIGS[gameType];
	if (!config) {
		console.error(`Unknown game type: ${gameType}`);
		console.error(
			`Available types: ${Object.keys(GAME_TYPE_CONFIGS).join(", ")}`,
		);
		process.exit(1);
	}

	const resolvedModel = resolveModelId(args.model as string | undefined);
	console.log(
		`Generating ${count} items for ${gameType} using ${resolvedModel}...`,
	);

	try {
		const prompt = config.promptTemplate(count);
		const result = await generateItems({
			schema: config.schema,
			system: config.system,
			prompt,
			model: args.model,
		});

		const items = result.items as Array<Record<string, unknown>>;
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
		const modelUsed = resolvedModel;

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
				provenanceGeneratedBy: modelUsed,
				provenancePrompt: prompt,
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
