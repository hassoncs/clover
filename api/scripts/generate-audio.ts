#!/usr/bin/env tsx

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { ANNOUNCER_LINES } from "../../shared/src/constants/audio-announcer-lines";
import { MUSIC_PROMPTS } from "../../shared/src/constants/audio-music-prompts";
import { SFX_PROMPTS } from "../../shared/src/constants/audio-sfx-prompts";
import { BRAND_VOICES } from "../../shared/src/constants/voice-presets";

type AudioType = "sfx" | "voice" | "music" | "content-voice";
type Brand = "amen" | "slopcade";

interface ContentVoiceItem {
	id: string;
	text: string;
	contentType: string;
}

interface AudioJob {
	id: string;
	label: string;
	outputPath: string;
	generate: () => Promise<Uint8Array>;
}

const SAMPLE_SIZE = 5;
const OUTPUT_FORMAT = "mp3_44100_128";
const VALID_BRANDS: Brand[] = ["amen", "slopcade"];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const audioRoot = path.join(repoRoot, "r2", "audio");
const contentPacksRoot = path.join(
	repoRoot,
	"api",
	"src",
	"party",
	"content",
	"packs",
);

function printUsage(): void {
	console.log(`Usage: hush run -- npx tsx api/scripts/generate-audio.ts [options]

Options:
  --type <sfx|voice|music|content-voice>
  --brand <amen|slopcade>                   (default: amen)
  --id <item-id>                            Generate one item
  --sample                                  Generate a representative sample (first ${SAMPLE_SIZE})
  --generate-all                            Generate all items for this type
  --force                                   Overwrite existing files
  --help                                    Show this help

Examples:
  hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id tick
  hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --sample
  hush run -- npx tsx api/scripts/generate-audio.ts --type voice --brand amen --generate-all
`);
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDurationMs(ms: number): string {
	return `${(ms / 1000).toFixed(1)}s`;
}

function isBrand(value: string): value is Brand {
	return VALID_BRANDS.includes(value as Brand);
}

function parseCli() {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			type: { type: "string" },
			brand: { type: "string", default: "amen" },
			id: { type: "string" },
			sample: { type: "boolean", default: false },
			"generate-all": { type: "boolean", default: false },
			force: { type: "boolean", default: false },
			help: { type: "boolean", default: false },
		},
	});

	if (values.help) {
		printUsage();
		process.exit(0);
	}

	if (!values.type) {
		throw new Error("Missing required argument: --type");
	}

	const type = values.type;
	if (
		type !== "sfx" &&
		type !== "voice" &&
		type !== "music" &&
		type !== "content-voice"
	) {
		throw new Error(`Invalid --type value: ${type}`);
	}

	if (!isBrand(values.brand)) {
		throw new Error(
			`Invalid --brand value: ${values.brand}. Expected one of: ${VALID_BRANDS.join(", ")}`,
		);
	}

	const modes = [
		Boolean(values.id),
		values.sample,
		values["generate-all"],
	].filter(Boolean).length;
	if (modes !== 1) {
		throw new Error(
			"Exactly one of --id, --sample, or --generate-all is required",
		);
	}

	return {
		type: type as AudioType,
		brand: values.brand,
		id: values.id,
		sample: values.sample,
		generateAll: values["generate-all"],
		force: values.force,
	};
}

async function generateSfxAudio(options: {
	apiKey: string;
	text: string;
	durationSeconds: number;
	promptInfluence?: number;
}): Promise<Uint8Array> {
	const url = new URL("https://api.elevenlabs.io/v1/sound-generation");
	url.searchParams.set("output_format", OUTPUT_FORMAT);

	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"xi-api-key": options.apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			text: options.text,
			duration_seconds: options.durationSeconds,
			prompt_influence: options.promptInfluence ?? 0.3,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`ElevenLabs SFX generation failed (${response.status}): ${errorText}`,
		);
	}

	const audio = await response.arrayBuffer();
	return new Uint8Array(audio);
}

async function generateTtsAudio(options: {
	apiKey: string;
	text: string;
	voiceId: string;
	modelId: string;
	stability: number;
	similarityBoost: number;
	style: number;
}): Promise<Uint8Array> {
	const url = new URL(
		`https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}`,
	);
	url.searchParams.set("output_format", OUTPUT_FORMAT);

	const response = await fetch(url.toString(), {
		method: "POST",
		headers: {
			"xi-api-key": options.apiKey,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			text: options.text,
			model_id: options.modelId,
			voice_settings: {
				stability: options.stability,
				similarity_boost: options.similarityBoost,
				style: options.style,
			},
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`ElevenLabs TTS generation failed (${response.status}): ${errorText}`,
		);
	}

	const audio = await response.arrayBuffer();
	return new Uint8Array(audio);
}

async function loadContentVoiceItems(
	brand: Brand,
): Promise<ContentVoiceItem[]> {
	const brandDir = path.join(contentPacksRoot, brand);
	const packFiles = (await readdir(brandDir)).filter((name) =>
		name.endsWith(".json"),
	);

	const items: ContentVoiceItem[] = [];
	for (const fileName of packFiles) {
		const filePath = path.join(brandDir, fileName);
		const raw = await readFile(filePath, "utf-8");
		const parsed = JSON.parse(raw) as unknown;

		if (!Array.isArray(parsed)) {
			continue;
		}

		const contentType = fileName
			.replace(/\.json$/i, "")
			.replace(new RegExp(`^${brand}-`), "");

		for (const entry of parsed) {
			if (
				typeof entry === "object" &&
				entry !== null &&
				"id" in entry &&
				"text" in entry &&
				typeof entry.id === "string" &&
				typeof entry.text === "string"
			) {
				items.push({
					id: entry.id,
					text: entry.text,
					contentType,
				});
			}
		}
	}

	return items;
}

function selectTargets<T extends { id: string }>(options: {
	items: T[];
	id?: string;
	sample: boolean;
	generateAll: boolean;
	label: string;
}): T[] {
	if (options.id) {
		const item = options.items.find((entry) => entry.id === options.id);
		if (!item) {
			throw new Error(`${options.label} item not found for id: ${options.id}`);
		}
		return [item];
	}

	if (options.sample) {
		return options.items.slice(0, SAMPLE_SIZE);
	}

	if (options.generateAll) {
		return options.items;
	}

	return [];
}

async function buildJobs(params: {
	apiKey: string;
	type: AudioType;
	brand: Brand;
	id?: string;
	sample: boolean;
	generateAll: boolean;
}): Promise<AudioJob[]> {
	const { apiKey, type, brand, id, sample, generateAll } = params;

	if (type === "sfx") {
		const targets = selectTargets({
			items: SFX_PROMPTS,
			id,
			sample,
			generateAll,
			label: "SFX",
		});

		return targets.map((entry) => ({
			id: entry.id,
			label: `Generating SFX: ${entry.id}`,
			outputPath: path.join(audioRoot, "sfx", "shared", `${entry.id}.mp3`),
			generate: () =>
				generateSfxAudio({
					apiKey,
					text: entry.prompt,
					durationSeconds: entry.duration,
					promptInfluence: entry.promptInfluence,
				}),
		}));
	}

	if (type === "voice") {
		const targets = selectTargets({
			items: ANNOUNCER_LINES,
			id,
			sample,
			generateAll,
			label: "Voice",
		});

		const voice = BRAND_VOICES[brand]?.announcer;
		if (!voice) {
			throw new Error(`Missing brand voice config for ${brand}`);
		}

		return targets.map((entry) => {
			const text = entry.brandOverrides?.[brand] ?? entry.text;
			return {
				id: entry.id,
				label: `Generating Voice: ${entry.id}`,
				outputPath: path.join(
					audioRoot,
					"voice",
					brand,
					"transitions",
					`${entry.id}.mp3`,
				),
				generate: () =>
					generateTtsAudio({
						apiKey,
						text,
						voiceId: voice.voiceId,
						modelId: voice.model,
						stability: voice.settings.stability,
						similarityBoost: voice.settings.similarityBoost,
						style: voice.settings.style,
					}),
			} satisfies AudioJob;
		});
	}

	if (type === "music") {
		const shared = MUSIC_PROMPTS.filter((entry) => !entry.brand);
		const brandOverrides = MUSIC_PROMPTS.filter(
			(entry) => entry.brand === brand,
		);

		const merged = new Map(shared.map((entry) => [entry.id, entry]));
		for (const override of brandOverrides) {
			merged.set(override.id, override);
		}

		const mergedList = [...merged.values()];
		const targets = selectTargets({
			items: mergedList,
			id,
			sample,
			generateAll,
			label: "Music",
		});

		return targets.map((entry) => {
			const outputPath = entry.brand
				? path.join(audioRoot, "music", brand, `${entry.id}.mp3`)
				: path.join(audioRoot, "music", "shared", `${entry.id}.mp3`);

			// ElevenLabs SFX endpoint caps at 22 seconds.
			// For now we generate 22-second quality samples.
			// Full-length tracks will need a different API (Suno, Udio, etc.) or looping.
			const maxSfxDuration = 22;
			const requestedSeconds = Math.round(entry.durationMinutes * 60);
			const durationSeconds = Math.min(
				Math.max(1, requestedSeconds),
				maxSfxDuration,
			);

			return {
				id: entry.id,
				label: `Generating Music: ${entry.id} (${durationSeconds}s sample of ${requestedSeconds}s)`,
				outputPath,
				generate: () =>
					generateSfxAudio({
						apiKey,
						text: entry.prompt,
						durationSeconds,
						promptInfluence: 0.35,
					}),
			} satisfies AudioJob;
		});
	}

	const contentItems = await loadContentVoiceItems(brand);
	const targets = selectTargets({
		items: contentItems,
		id,
		sample,
		generateAll,
		label: "Content voice",
	});

	const voice = BRAND_VOICES[brand]?.rules;
	if (!voice) {
		throw new Error(`Missing rules voice config for ${brand}`);
	}

	return targets.map((entry) => ({
		id: entry.id,
		label: `Generating Content Voice: ${entry.id}`,
		outputPath: path.join(
			audioRoot,
			"voice",
			brand,
			"content",
			entry.contentType,
			`${entry.id}.mp3`,
		),
		generate: () =>
			generateTtsAudio({
				apiKey,
				text: entry.text,
				voiceId: voice.voiceId,
				modelId: voice.model,
				stability: voice.settings.stability,
				similarityBoost: voice.settings.similarityBoost,
				style: voice.settings.style,
			}),
	}));
}

async function run(): Promise<void> {
	const cli = parseCli();

	const apiKey = process.env.ELEVENLABS_API_KEY;
	if (!apiKey) {
		throw new Error(
			"ELEVENLABS_API_KEY is required. Run with: hush run -- npx tsx api/scripts/generate-audio.ts ...",
		);
	}

	const jobs = await buildJobs({
		apiKey,
		type: cli.type,
		brand: cli.brand,
		id: cli.id,
		sample: cli.sample,
		generateAll: cli.generateAll,
	});

	if (jobs.length === 0) {
		throw new Error("No items selected for generation");
	}

	console.log(
		`Generating ${jobs.length} ${cli.type} item(s) for brand ${cli.brand} (force=${cli.force ? "yes" : "no"})`,
	);

	let generated = 0;
	let skipped = 0;

	for (const [index, job] of jobs.entries()) {
		const displayIndex = index + 1;
		const prefix = `[${displayIndex}/${jobs.length}] ${job.label}`;

		try {
			await stat(job.outputPath);
			if (!cli.force) {
				console.log(`${prefix}... skipped (exists)`);
				skipped++;
				continue;
			}
		} catch {}

		const startedAt = performance.now();
		const bytes = await job.generate();
		const elapsed = performance.now() - startedAt;

		await mkdir(path.dirname(job.outputPath), { recursive: true });
		await writeFile(job.outputPath, bytes);

		console.log(
			`${prefix}... done (${formatDurationMs(elapsed)}, ${formatSize(bytes.byteLength)})`,
		);
		generated++;
	}

	console.log(`Complete: ${generated} generated, ${skipped} skipped`);
}

run().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	printUsage();
	process.exit(1);
});
