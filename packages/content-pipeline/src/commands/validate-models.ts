import type { ArgumentsCamelCase, Argv } from "yargs";
import { generateItems } from "../generate/client.js";
import { MODEL_PRESETS } from "../generate/models.js";
import { GAME_TYPE_CONFIGS } from "../generate/prompts.js";

export interface ValidateModelsOptions {
	preset?: string;
}

export function builder(yargs: Argv): Argv {
	return yargs.option("preset", {
		alias: "p",
		type: "string",
		description: "Test a single preset instead of all",
		choices: Object.keys(MODEL_PRESETS),
	});
}

export async function handler(
	args: ArgumentsCamelCase<ValidateModelsOptions>,
): Promise<void> {
	const presetsToTest = args.preset
		? [args.preset]
		: Object.keys(MODEL_PRESETS);

	console.log(`Testing ${presetsToTest.length} model preset(s)...\n`);

	const results: Array<{
		preset: string;
		modelId: string;
		status: "pass" | "fail";
		duration: number;
		error?: string;
	}> = [];

	const quipConfig = GAME_TYPE_CONFIGS.quip;
	const prompt = quipConfig.promptTemplate(1);

	for (const presetName of presetsToTest) {
		const preset = MODEL_PRESETS[presetName];
		const startTime = Date.now();

		process.stdout.write(`Testing ${presetName} (${preset.id})... `);

		try {
			await generateItems({
				schema: quipConfig.schema,
				system: quipConfig.system,
				prompt,
				model: presetName,
			});

			const duration = Date.now() - startTime;
			console.log(`✓ PASS (${duration}ms)`);

			results.push({
				preset: presetName,
				modelId: preset.id,
				status: "pass",
				duration,
			});
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.log(`✗ FAIL (${duration}ms)`);
			console.log(`  Error: ${errorMessage}\n`);

			results.push({
				preset: presetName,
				modelId: preset.id,
				status: "fail",
				duration,
				error: errorMessage,
			});
		}
	}

	console.log("\n" + "=".repeat(80));
	console.log("SUMMARY");
	console.log("=".repeat(80));

	const passCount = results.filter((r) => r.status === "pass").length;
	const failCount = results.filter((r) => r.status === "fail").length;

	console.log(
		`Total: ${results.length} | Pass: ${passCount} | Fail: ${failCount}`,
	);
	console.log("");

	const maxPresetLen = Math.max(...results.map((r) => r.preset.length));
	const maxModelLen = Math.max(...results.map((r) => r.modelId.length));

	for (const result of results) {
		const presetPadded = result.preset.padEnd(maxPresetLen);
		const modelPadded = result.modelId.padEnd(maxModelLen);
		const statusIcon = result.status === "pass" ? "✓" : "✗";
		const durationStr = `${result.duration}ms`.padStart(8);

		console.log(
			`${statusIcon} ${presetPadded}  ${modelPadded}  ${durationStr}`,
		);
	}

	if (failCount > 0) {
		console.log("\nFailed presets:");
		for (const result of results.filter((r) => r.status === "fail")) {
			console.log(`  - ${result.preset}: ${result.error}`);
		}
		process.exit(1);
	}

	console.log("\n✓ All model presets validated successfully");
}
