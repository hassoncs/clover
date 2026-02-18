import { randomUUID } from "node:crypto";
import type { ArgumentsCamelCase, Argv } from "yargs";
import { listBrands } from "../brands/index.js";
import { PipelineDB } from "../db/index.js";
import { computeContentHash } from "../dedup/hash.js";
import { generateItems } from "../generate/client.js";
import { resolveModelId } from "../generate/models.js";
import {
	composeGameTypeConfig,
	listGameTypes,
	resolveBrandGameType,
} from "../generate/prompts.js";

const BATCH_SIZE = 100;

export interface GenerateOptions {
	gameType: string;
	brand?: string;
	count: number;
	category?: string;
	dryRun?: boolean;
	model?: string;
	temperature?: number;
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
		.option("brand", {
			alias: "b",
			type: "string",
			description: "Brand theme to use for generation",
			choices: listBrands(),
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
		})
		.option("temperature", {
			type: "number",
			default: 1.2,
			description:
				"Temperature for generation (0.0-2.0, higher = more creative/diverse)",
		});
}

function extractText(item: Record<string, unknown>, gameType: string): string {
	const baseType = gameType.replace(/^[a-z]+-/, "");

	switch (baseType) {
		case "dilemma":
			return `Would you rather: ${item.optionA} OR ${item.optionB}`;
		case "drawing":
			return String(item.text || item.prompt);
		case "ranking":
			return String(item.topic || "");
		case "headsup":
		case "wordlist":
			return String(item.name || "");
		case "wager":
		case "history":
		case "trivia":
		case "fibbage":
			return String(item.question || "");
		case "chroma": {
			const clues = Array.isArray(item.clues)
				? (item.clues as string[]).join(", ")
				: "";
			return clues;
		}
		default:
			return String(item.text || item.question || item.prompt || "");
	}
}

function summarizeForContext(
	items: Array<Record<string, unknown>>,
	gameType: string,
): string {
	const baseType = gameType.replace(/^[a-z]+-/, "");

	return items
		.map((item) => {
			switch (baseType) {
				case "quip":
				case "personal":
					return `- "${item.text}"`;
				case "trivia":
					return `- Q: "${item.question}" A: "${item.correctAnswer}"`;
				case "fibbage":
					return `- "${item.question}" → ${item.answer}`;
				case "drawing":
					return `- "${item.text || item.prompt}"`;
				case "ranking":
					return `- "${item.topic}"`;
				case "dilemma":
					return `- "${item.optionA}" vs "${item.optionB}"`;
				case "history":
				case "wager":
					return `- "${item.question}" → ${item.answer}`;
				case "headsup":
				case "wordlist":
					return `- Deck: "${item.name}"`;
				default:
					return `- ${JSON.stringify(item).substring(0, 100)}`;
			}
		})
		.join("\n");
}

export async function handler(
	args: ArgumentsCamelCase<GenerateOptions>,
): Promise<void> {
	const { gameType, count, category, dryRun } = args;

	const { resolvedBrandId, resolvedGameType, storageGameType, config } =
		(() => {
			try {
				const resolved = resolveBrandGameType(gameType, args.brand);
				return {
					resolvedBrandId: resolved.brandId,
					resolvedGameType: resolved.gameType,
					storageGameType: resolved.storageGameType,
					config: composeGameTypeConfig(resolved.brandId, resolved.gameType),
				};
			} catch (error) {
				console.error(error instanceof Error ? error.message : String(error));
				console.error(`Available game types: ${listGameTypes().join(", ")}`);
				console.error(`Available brands: ${listBrands().join(", ")}`);
				process.exit(1);
			}
		})();

	const resolvedModel = resolveModelId(args.model as string | undefined);
	const totalBatches = Math.ceil(count / BATCH_SIZE);

	console.log(
		`Generating ${count} items for ${resolvedGameType} [brand=${resolvedBrandId}] using ${resolvedModel} (temp=${args.temperature}, ${totalBatches} batch${totalBatches > 1 ? "es" : ""})...`,
	);

	const allItems: Array<Record<string, unknown>> = [];
	let totalSaved = 0;
	let totalDuplicates = 0;

	const db = dryRun ? null : new PipelineDB();

	for (let batch = 0; batch < totalBatches; batch++) {
		const remaining = count - allItems.length;
		const batchCount = Math.min(BATCH_SIZE, remaining);

		if (batchCount <= 0) break;

		console.log(
			`\n--- Batch ${batch + 1}/${totalBatches} (requesting ${batchCount} items) ---`,
		);

		let prompt = config.promptTemplate(batchCount);

		// For subsequent batches, inject previously generated items to avoid duplicates
		if (allItems.length > 0) {
			const existingSummary = summarizeForContext(allItems, storageGameType);
			prompt += `\n\nCRITICAL: The following ${allItems.length} items have ALREADY been generated. You MUST NOT repeat or create items similar to any of these. Explore completely different topics, characters, scenarios, and angles:\n\n${existingSummary}\n\nGenerate ${batchCount} ENTIRELY NEW and UNIQUE items that cover different ground from everything above.`;
		}

		try {
			const result = await generateItems({
				schema: config.schema,
				system: config.system,
				prompt,
				model: args.model,
				temperature: args.temperature,
			});

			const items = (result as { items: Array<Record<string, unknown>> }).items;
			const limitedItems = items.slice(0, batchCount);

			console.log(`  Received ${limitedItems.length} items`);

			if (dryRun) {
				allItems.push(...limitedItems);
				continue;
			}

			const now = new Date().toISOString();
			let batchSaved = 0;
			let batchDuplicates = 0;

			for (const item of limitedItems) {
				const text = extractText(item, storageGameType);
				const itemCategory = String(item.category || category || "");
				const contentHash = computeContentHash(text);

				const existing = db!.getContentItemByHash(contentHash);
				if (existing) {
					batchDuplicates++;
					continue;
				}

				db!.insertContentItem({
					id: randomUUID(),
					gameType: storageGameType,
					text,
					category: itemCategory || null,
					contentHash,
					provenanceSource: "ai-generated",
					provenanceGeneratedAt: now,
					provenanceGeneratedBy: resolvedModel,
					provenancePrompt: prompt.substring(0, 500),
					provenanceMetadata: JSON.stringify({ originalItem: item }),
					moderationStatus: "pending",
					moderationNotes: null,
					createdAt: now,
					updatedAt: now,
					metadata: JSON.stringify(item),
				});

				batchSaved++;
				allItems.push(item);
			}

			totalSaved += batchSaved;
			totalDuplicates += batchDuplicates;
			console.log(
				`  ✓ Saved ${batchSaved} new items${batchDuplicates > 0 ? ` (⊘ ${batchDuplicates} duplicates)` : ""}`,
			);
		} catch (error) {
			console.error(
				`  ✗ Batch ${batch + 1} failed:`,
				error instanceof Error ? error.message : error,
			);
			console.error("  Retrying in 5 seconds...");
			await new Promise((resolve) => setTimeout(resolve, 5000));

			// Retry once
			try {
				const retryPrompt = config.promptTemplate(batchCount);
				const result = await generateItems({
					schema: config.schema,
					system: config.system,
					prompt: retryPrompt,
					model: args.model,
					temperature: args.temperature,
				});
				const items = (result as { items: Array<Record<string, unknown>> })
					.items;
				console.log(`  Retry received ${items.length} items`);
				allItems.push(...items.slice(0, batchCount));
			} catch (retryError) {
				console.error(
					`  ✗ Retry also failed, skipping batch:`,
					retryError instanceof Error ? retryError.message : retryError,
				);
			}
		}
	}

	db?.close();

	if (dryRun) {
		console.log("\n=== DRY RUN MODE ===");
		console.log(JSON.stringify(allItems, null, 2));
		console.log(`\nGenerated ${allItems.length} items (not saved)`);
		return;
	}

	console.log(`\n=== GENERATION COMPLETE ===`);
	console.log(`✓ Total saved: ${totalSaved} new items`);
	if (totalDuplicates > 0) {
		console.log(`⊘ Total skipped: ${totalDuplicates} duplicates`);
	}
}
