#!/usr/bin/env tsx
import { VOICE_PRESETS, type VoicePresetId } from "@slopcade/shared";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOUNDS_DIR = resolve(__dirname, "..", "..", "godot_project", "sounds");
const API_URL = "https://api.elevenlabs.io/v1";

async function main() {
	const { values } = parseArgs({
		options: {
			text: { type: "string" },
			output: { type: "string" },
			voice: { type: "string", default: "announcer" },
			stability: { type: "string", default: "0.5" },
			"dry-run": { type: "boolean", default: false },
		},
		strict: true,
	});

	if (!values.text || !values.output) {
		console.error(
			'Usage: hush run -- npx tsx api/scripts/generate-voice.ts --text="<text>" --output="<name>" [--voice=<preset>] [--stability=<0.0-1.0>] [--dry-run]',
		);
		console.error("");
		console.error("Options:");
		console.error("  --text       Text to speak (required)");
		console.error(
			"  --output     Output filename without extension (required)",
		);
		console.error("  --voice      Voice preset (default: announcer)");
		console.error("  --stability  Voice stability 0-1 (default: 0.5)");
		console.error("  --dry-run    Print plan without calling API");
		console.error("");
		console.error("Available voice presets:");
		for (const [id, preset] of Object.entries(VOICE_PRESETS)) {
			console.error(
				`  ${id.padEnd(12)} - ${preset.name}: ${preset.description}`,
			);
		}
		console.error("");
		console.error("Example:");
		console.error(
			'  hush run -- npx tsx api/scripts/generate-voice.ts --text="Player one wins!" --output="player1-wins" --voice=announcer',
		);
		process.exit(1);
	}

	const text = values.text;
	const output = values.output;
	const voicePreset = values.voice as VoicePresetId;
	const stability = parseFloat(values.stability ?? "0.5");
	const dryRun = values["dry-run"] ?? false;

	const preset = VOICE_PRESETS[voicePreset];
	if (!preset) {
		console.error(
			`Unknown voice preset: ${voicePreset}. Available: ${Object.keys(VOICE_PRESETS).join(", ")}`,
		);
		process.exit(1);
	}

	if (isNaN(stability) || stability < 0 || stability > 1) {
		console.error(`Invalid stability: ${values.stability} (must be 0.0-1.0)`);
		process.exit(1);
	}

	const outputPath = join(SOUNDS_DIR, `${output}.mp3`);

	console.log(`\nVoice Generation Plan:`);
	console.log(`  Text: "${text}"`);
	console.log(`  Voice: ${preset.name} (${voicePreset})`);
	console.log(`  Voice ID: ${preset.voiceId}`);
	console.log(`  Stability: ${stability}`);
	console.log(`  Output: ${outputPath}`);

	if (dryRun) {
		console.log("\n(dry run — no API call made)");
		return;
	}

	const apiKey = process.env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		console.error(
			"\nELEVENLABS_API_KEY not found. Run with: hush run -- npx tsx api/scripts/generate-voice.ts ...",
		);
		process.exit(1);
	}

	const url = new URL(`${API_URL}/text-to-speech/${preset.voiceId}`);
	url.searchParams.set("output_format", "mp3_44100_128");

	console.log(`\nCalling ElevenLabs API...`);

	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"xi-api-key": apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			text,
			model_id: "eleven_multilingual_v2",
			voice_settings: {
				stability,
				similarity_boost: 0.75,
				style: 0,
			},
		}),
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
	console.log(`\nGenerated voice: ${outputPath} (${buffer.length} bytes)`);
}

main().catch((err) => {
	console.error("Voice generation failed:", err);
	process.exit(1);
});
