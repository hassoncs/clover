#!/usr/bin/env tsx
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOUNDS_DIR = resolve(__dirname, "..", "..", "godot_project", "sounds");
const API_URL = "https://api.elevenlabs.io/v1/sound-generation";

async function main() {
	const { values } = parseArgs({
		options: {
			text: { type: "string" },
			output: { type: "string" },
			duration: { type: "string", default: "2" },
			"prompt-influence": { type: "string", default: "0.3" },
			"dry-run": { type: "boolean", default: false },
		},
		strict: true,
	});

	if (!values.text || !values.output) {
		console.error(
			'Usage: hush run -- npx tsx api/scripts/generate-sound.ts --text="<prompt>" --output="<name>" [--duration=<seconds>] [--prompt-influence=<0.0-1.0>] [--dry-run]',
		);
		console.error("");
		console.error("Options:");
		console.error("  --text              Sound effect description (required)");
		console.error(
			"  --output            Output filename without extension (required)",
		);
		console.error("  --duration          Duration in seconds (default: 2)");
		console.error(
			"  --prompt-influence  How closely to follow prompt, 0.0-1.0 (default: 0.3)",
		);
		console.error("  --dry-run           Print plan without calling API");
		console.error("");
		console.error("Example:");
		console.error(
			'  hush run -- npx tsx api/scripts/generate-sound.ts --text="short bouncy rubber ball bounce" --output="bounce" --duration=1',
		);
		process.exit(1);
	}

	const text = values.text;
	const output = values.output;
	const durationSeconds = parseFloat(values.duration ?? "2");
	const promptInfluence = parseFloat(values["prompt-influence"] ?? "0.3");
	const dryRun = values["dry-run"] ?? false;

	if (isNaN(durationSeconds) || durationSeconds <= 0) {
		console.error(`Invalid duration: ${values.duration}`);
		process.exit(1);
	}

	if (isNaN(promptInfluence) || promptInfluence < 0 || promptInfluence > 1) {
		console.error(
			`Invalid prompt-influence: ${values["prompt-influence"]} (must be 0.0-1.0)`,
		);
		process.exit(1);
	}

	const outputPath = join(SOUNDS_DIR, `${output}.mp3`);

	console.log(`\nSound Generation Plan:`);
	console.log(`  Text: "${text}"`);
	console.log(`  Duration: ${durationSeconds}s`);
	console.log(`  Prompt influence: ${promptInfluence}`);
	console.log(`  Output: ${outputPath}`);

	if (dryRun) {
		console.log("\n(dry run — no API call made)");
		return;
	}

	const apiKey = process.env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		console.error(
			"\nELEVENLABS_API_KEY not found. Run with: hush run -- npx tsx api/scripts/generate-sound.ts ...",
		);
		process.exit(1);
	}

	const body: Record<string, unknown> = {
		text,
		duration_seconds: durationSeconds,
		prompt_influence: promptInfluence,
	};

	const url = new URL(API_URL);
	url.searchParams.set("output_format", "mp3_44100_128");

	console.log(`\nCalling ElevenLabs API...`);

	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"xi-api-key": apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const errorText = await response.text();
		console.error(`\nAPI error ${response.status}: ${errorText}`);
		process.exit(1);
	}

	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	if (!existsSync(SOUNDS_DIR)) {
		mkdirSync(SOUNDS_DIR, { recursive: true });
	}

	writeFileSync(outputPath, buffer);
	console.log(`\nGenerated sound: ${outputPath} (${buffer.length} bytes)`);
}

main().catch((err) => {
	console.error("Sound generation failed:", err);
	process.exit(1);
});
