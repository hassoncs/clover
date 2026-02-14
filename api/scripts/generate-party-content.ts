#!/usr/bin/env tsx
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_ROOT = resolve(__dirname, "..");
const CONTENT_DIR = resolve(API_ROOT, "src", "party", "content");

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

const CATEGORIES = [
	"pop culture",
	"food",
	"animals",
	"workplace",
	"hypothetical",
	"absurd",
	"relationships",
	"technology",
] as const;

type Category = (typeof CATEGORIES)[number];

const PROMPT_FORMATS = [
	"The worst X: _____",
	"A rejected X",
	"Something you should never bring/say/do at X: _____",
	"If X had/could/were Y, they would: _____",
	"The real reason X: _____",
	"An honest X would say: _____",
	"A terrible name/slogan for X: _____",
	"The most X thing you could Y: _____",
] as const;

const PromptSchema = z.object({
	id: z.string(),
	text: z.string(),
	category: z.string(),
});

const BatchResultSchema = z.object({
	prompts: z.array(
		z.object({
			text: z
				.string()
				.describe(
					"A fill-in-the-blank comedy prompt, 10-25 words, ending with _____",
				),
			category: z
				.string()
				.describe("One of the 8 categories provided in the system prompt"),
		}),
	),
});

function createModel(apiKey: string, model: string) {
	const openrouter = createOpenAI({
		apiKey,
		baseURL: OPENROUTER_BASE_URL,
	});
	return openrouter.chat(model);
}

function levenshteinDistance(a: string, b: string): number {
	const matrix: number[][] = [];
	for (let i = 0; i <= b.length; i++) {
		matrix[i] = [i];
	}
	for (let j = 0; j <= a.length; j++) {
		matrix[0][j] = j;
	}
	for (let i = 1; i <= b.length; i++) {
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1,
				);
			}
		}
	}
	return matrix[b.length][a.length];
}

function isTooSimilar(a: string, b: string, threshold = 0.3): boolean {
	const lower_a = a.toLowerCase();
	const lower_b = b.toLowerCase();
	if (lower_a === lower_b) return true;
	const maxLen = Math.max(lower_a.length, lower_b.length);
	if (maxLen === 0) return true;
	const distance = levenshteinDistance(lower_a, lower_b);
	const similarity = 1 - distance / maxLen;
	return similarity > 1 - threshold;
}

function deduplicatePrompts(
	prompts: Array<{ text: string; category: string }>,
): Array<{ text: string; category: string }> {
	const unique: Array<{ text: string; category: string }> = [];
	for (const prompt of prompts) {
		const isDupe = unique.some((existing) =>
			isTooSimilar(existing.text, prompt.text),
		);
		if (!isDupe) {
			unique.push(prompt);
		}
	}
	return unique;
}

async function generateBatch(
	model: ReturnType<typeof createModel>,
	categories: readonly string[],
	batchSize: number,
	batchIndex: number,
): Promise<Array<{ text: string; category: string }>> {
	const categoryRotation = categories[batchIndex % categories.length];
	const formatHint = PROMPT_FORMATS[batchIndex % PROMPT_FORMATS.length];

	const result = await generateObject({
		model,
		schema: BatchResultSchema,
		system: [
			"You are a comedy writer for a party game like Quiplash.",
			"Generate fill-in-the-blank comedy prompts that are open-ended and inspire creative, funny answers.",
			"Each prompt should be 10-25 words and end with _____.",
			"",
			`Available categories: ${categories.join(", ")}`,
			"",
			"Format variety examples:",
			'- "The worst X: _____"',
			'- "A rejected X"',
			'- "Something you should never bring to X: _____"',
			'- "If X had a side hustle, it would be: _____"',
			'- "The real reason X: _____"',
			'- "An honest X would say: _____"',
			"",
			"Make prompts genuinely funny, surprising, and open-ended.",
			"Avoid prompts that are too specific or have only one obvious answer.",
			"Distribute across all categories but lean toward the focus category.",
		].join("\n"),
		prompt: [
			`Generate ${batchSize} unique comedy prompts for a party game.`,
			`Focus category for this batch: "${categoryRotation}"`,
			`Try using this format style as inspiration (but vary it): "${formatHint}"`,
			"Ensure variety in phrasing — don't start every prompt the same way.",
			"Make them funny and open-ended so players can give creative answers.",
		].join("\n"),
		temperature: 0.9,
	});

	return result.object.prompts;
}

async function main() {
	const { values } = parseArgs({
		options: {
			game: { type: "string" },
			count: { type: "string", default: "100" },
			model: { type: "string", default: DEFAULT_MODEL },
			"batch-size": { type: "string", default: "15" },
			"dry-run": { type: "boolean", default: false },
		},
		strict: true,
	});

	if (!values.game) {
		console.error(
			"Usage: hush run -- npx tsx api/scripts/generate-party-content.ts --game=quiplash [--count=100] [--model=openai/gpt-4o-mini] [--batch-size=15] [--dry-run]",
		);
		console.error("");
		console.error("Options:");
		console.error(
			"  --game        Game type to generate prompts for (required)",
		);
		console.error(
			"  --count       Target number of prompts to generate (default: 100)",
		);
		console.error(
			"  --model       OpenRouter model ID (default: openai/gpt-4o-mini)",
		);
		console.error("  --batch-size  Prompts per API call (default: 15)");
		console.error("  --dry-run     Print plan without calling API");
		process.exit(1);
	}

	const game = values.game;
	const targetCount = parseInt(values.count ?? "100", 10);
	const modelId = values.model ?? DEFAULT_MODEL;
	const batchSize = parseInt(values["batch-size"] ?? "15", 10);
	const dryRun = values["dry-run"] ?? false;

	if (game !== "quiplash") {
		console.error(
			`Unsupported game type: ${game}. Currently supported: quiplash`,
		);
		process.exit(1);
	}

	const outputPath = join(CONTENT_DIR, `${game}-prompts.json`);
	const batchCount = Math.ceil(targetCount / batchSize);

	console.log("\nParty Content Generation Plan:");
	console.log(`  Game: ${game}`);
	console.log(`  Target prompts: ${targetCount}`);
	console.log(`  Model: ${modelId}`);
	console.log(`  Batch size: ${batchSize}`);
	console.log(`  Batches: ${batchCount}`);
	console.log(`  Output: ${outputPath}`);

	if (dryRun) {
		console.log("\n(dry run — no API calls made)");
		return;
	}

	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		console.error(
			"\nOPENROUTER_API_KEY not found. Run with: hush run -- npx tsx api/scripts/generate-party-content.ts ...",
		);
		process.exit(1);
	}

	const model = createModel(apiKey, modelId);
	const allPrompts: Array<{ text: string; category: string }> = [];

	let existingPrompts: Array<{ id: string; text: string; category: string }> =
		[];
	if (existsSync(outputPath)) {
		try {
			existingPrompts = JSON.parse(readFileSync(outputPath, "utf-8"));
			console.log(
				`\nLoaded ${existingPrompts.length} existing prompts from ${outputPath}`,
			);
			for (const p of existingPrompts) {
				allPrompts.push({ text: p.text, category: p.category });
			}
		} catch {
			console.log("\nCould not parse existing prompts, starting fresh.");
		}
	}

	console.log(`\nGenerating prompts in ${batchCount} batches...\n`);

	for (let i = 0; i < batchCount; i++) {
		const remaining = targetCount - allPrompts.length;
		if (remaining <= 0) break;

		const currentBatchSize = Math.min(batchSize, remaining);
		const focusCategory = CATEGORIES[i % CATEGORIES.length];
		console.log(
			`Batch ${i + 1}/${batchCount} (focus: ${focusCategory}, requesting ${currentBatchSize})...`,
		);

		try {
			const batch = await generateBatch(model, CATEGORIES, currentBatchSize, i);
			const beforeCount = allPrompts.length;
			const newPrompts = deduplicatePrompts([...allPrompts, ...batch]).slice(
				beforeCount,
			);
			allPrompts.push(...newPrompts);
			console.log(
				`  Got ${batch.length} prompts, ${newPrompts.length} unique after dedup (total: ${allPrompts.length})`,
			);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error(`  Batch ${i + 1} failed: ${msg}`);
		}
	}

	const finalPrompts = allPrompts.map((p, i) => ({
		id: `q${String(i + 1).padStart(3, "0")}`,
		text: p.text,
		category: p.category,
	}));

	const categoryCounts: Record<string, number> = {};
	for (const p of finalPrompts) {
		categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1;
	}

	if (!existsSync(CONTENT_DIR)) {
		mkdirSync(CONTENT_DIR, { recursive: true });
	}

	writeFileSync(outputPath, JSON.stringify(finalPrompts, null, "\t") + "\n");

	console.log(`\nGenerated ${finalPrompts.length} prompts.`);
	console.log("Category distribution:");
	for (const [cat, count] of Object.entries(categoryCounts).sort()) {
		console.log(`  ${cat}: ${count}`);
	}
	console.log(`\nWritten to: ${outputPath}`);
}

main().catch((err) => {
	console.error("Content generation failed:", err);
	process.exit(1);
});
