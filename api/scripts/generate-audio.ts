#!/usr/bin/env tsx

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { ANNOUNCER_LINES } from "../../shared/src/constants/audio-announcer-lines";
import {
	DEFAULT_MUSIC_MODEL,
	MUSIC_MODELS,
} from "../../shared/src/constants/audio-music-models";
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
const SCENARIO_API_URL = "https://api.cloud.scenario.com/v1";
const SCENARIO_POLL_INTERVAL_MS = 3000;
const SCENARIO_MAX_POLL_ATTEMPTS = 200;

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
  --model <beatoven|minimax|musicgen|lyria> (music only, default: beatoven)
  --id <item-id>                            Generate one item
  --sample                                  Generate a representative sample (first ${SAMPLE_SIZE})
  --generate-all                            Generate all items for this type
  --concurrency <n>                          Parallel jobs (default: 5)
  --force                                   Overwrite existing files
  --help                                    Show this help

Examples:
  hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id tick
  hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --sample
  hush run -- npx tsx api/scripts/generate-audio.ts --type voice --brand amen --generate-all
  hush run -- npx tsx api/scripts/generate-audio.ts --type music --model beatoven --sample
`);
}

function sanitizeBlankMarkers(text: string): string {
	let cleaned = text.replace(/[,:;]\s*_+\s*$/, "");
	cleaned = cleaned.replace(/__{2,}/g, "blank");
	return cleaned.trim();
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
			model: { type: "string", default: DEFAULT_MUSIC_MODEL },
			id: { type: "string" },
			sample: { type: "boolean", default: false },
			"generate-all": { type: "boolean", default: false },
			concurrency: { type: "string", default: "5" },
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

	const concurrency = Math.max(1, parseInt(values.concurrency, 10) || 5);

	return {
		type: type as AudioType,
		brand: values.brand,
		model: values.model,
		id: values.id,
		sample: values.sample,
		generateAll: values["generate-all"],
		concurrency,
		force: values.force,
	};
}

async function generateMusicViaScenario(options: {
	scenarioApiKey: string;
	scenarioApiSecret: string;
	scenarioModelId: string;
	prompt: string;
	durationSeconds: number;
	lyrics?: string;
	negativePrompt?: string;
}): Promise<Uint8Array> {
	const authHeader = `Basic ${Buffer.from(
		`${options.scenarioApiKey}:${options.scenarioApiSecret}`,
	).toString("base64")}`;

	const headers = {
		Authorization: authHeader,
		"Content-Type": "application/json",
	};

	const createResponse = await fetch(
		`${SCENARIO_API_URL}/generate/custom/${options.scenarioModelId}`,
		{
			method: "POST",
			headers,
			body: JSON.stringify({
				prompt: options.prompt,
				duration: options.durationSeconds,
				lyrics: options.lyrics ?? "",
				...(options.negativePrompt
					? { negativePrompt: options.negativePrompt }
					: {}),
			}),
		},
	);
	if (!createResponse.ok) {
		const err = await createResponse.text();
		throw new Error(
			`Scenario music job creation failed (${createResponse.status}): ${err}`,
		);
	}
	const createData = (await createResponse.json()) as {
		job?: { jobId?: string };
	};
	const jobId = createData.job?.jobId;
	if (!jobId) {
		throw new Error("No jobId returned from Scenario");
	}

	for (let attempt = 0; attempt < SCENARIO_MAX_POLL_ATTEMPTS; attempt++) {
		const pollResponse = await fetch(`${SCENARIO_API_URL}/jobs/${jobId}`, {
			method: "GET",
			headers,
		});
		if (!pollResponse.ok) {
			throw new Error(`Scenario poll failed (${pollResponse.status})`);
		}
		const pollData = (await pollResponse.json()) as {
			job?: {
				status?: string;
				metadata?: { assetIds?: string[] };
				error?: string;
			};
		};

		const status = pollData.job?.status;
		if (attempt % 5 === 0 || status !== "pending") {
			console.log(
				`  Polling ${jobId}: status=${status} (attempt ${attempt + 1})`,
			);
		}
		if (status === "success" || status === "succeeded") {
			const assetIds = pollData.job?.metadata?.assetIds ?? [];
			if (assetIds.length === 0) {
				throw new Error("Music job succeeded but no assets");
			}

			const assetResponse = await fetch(
				`${SCENARIO_API_URL}/assets/${assetIds[0]}`,
				{
					method: "GET",
					headers,
				},
			);
			if (!assetResponse.ok) {
				throw new Error(`Asset details failed (${assetResponse.status})`);
			}
			const assetData = (await assetResponse.json()) as {
				asset?: { url?: string };
			};
			const assetUrl = assetData.asset?.url;
			if (!assetUrl) {
				throw new Error("No URL for music asset");
			}

			const audioResponse = await fetch(assetUrl);
			if (!audioResponse.ok) {
				throw new Error(`Download failed (${audioResponse.status})`);
			}
			return new Uint8Array(await audioResponse.arrayBuffer());
		}

		if (status === "failed" || status === "failure" || status === "cancelled") {
			throw new Error(
				`Music job ${status}: ${pollData.job?.error ?? "unknown"}`,
			);
		}

		await new Promise((resolve) =>
			setTimeout(resolve, SCENARIO_POLL_INTERVAL_MS),
		);
	}

	throw new Error("Music job timed out");
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
	scenarioApiKey?: string;
	scenarioApiSecret?: string;
	type: AudioType;
	brand: Brand;
	model: string;
	id?: string;
	sample: boolean;
	generateAll: boolean;
}): Promise<AudioJob[]> {
	const {
		apiKey,
		scenarioApiKey,
		scenarioApiSecret,
		type,
		brand,
		model,
		id,
		sample,
		generateAll,
	} = params;

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
		const musicModel = MUSIC_MODELS[model];
		if (!musicModel) {
			throw new Error(
				`Invalid --model value: ${model}. Expected one of: ${Object.keys(MUSIC_MODELS).join(", ")}`,
			);
		}
		if (!scenarioApiKey || !scenarioApiSecret) {
			throw new Error(
				"Scenario credentials are required for music generation. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.",
			);
		}

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

			const requestedSeconds = Math.max(
				1,
				Math.round(entry.durationMinutes * 60),
			);
			const durationSeconds = Math.min(
				requestedSeconds,
				musicModel.maxDurationSeconds,
			);

			return {
				id: entry.id,
				label: `Generating Music (${musicModel.name}): ${entry.id} (${durationSeconds}s)`,
				outputPath,
				generate: () =>
					generateMusicViaScenario({
						scenarioApiKey,
						scenarioApiSecret,
						scenarioModelId: musicModel.scenarioModelId,
						prompt: entry.prompt,
						durationSeconds,
						lyrics:
							entry.lyrics ??
							(musicModel.supportsLyrics ? "[instrumental]" : undefined),
						negativePrompt: entry.negativePrompt,
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
				text: sanitizeBlankMarkers(entry.text),
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
	if (cli.type !== "music" && !apiKey) {
		throw new Error(
			"ELEVENLABS_API_KEY is required. Run with: hush run -- npx tsx api/scripts/generate-audio.ts ...",
		);
	}

	const scenarioApiKey = process.env.SCENARIO_API_KEY;
	const scenarioApiSecret = process.env.SCENARIO_SECRET_API_KEY;
	if (cli.type === "music") {
		if (!scenarioApiKey || !scenarioApiSecret) {
			throw new Error(
				"SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY are required for music generation. Run with: hush run -- npx tsx api/scripts/generate-audio.ts ...",
			);
		}

		const musicModel =
			MUSIC_MODELS[cli.model] ?? MUSIC_MODELS[DEFAULT_MUSIC_MODEL];
		console.log(
			`Music model: ${musicModel.name} (${musicModel.id}, max ${musicModel.maxDurationSeconds}s)`,
		);
	}

	const jobs = await buildJobs({
		apiKey: apiKey ?? "",
		scenarioApiKey,
		scenarioApiSecret,
		type: cli.type,
		brand: cli.brand,
		model: cli.model,
		id: cli.id,
		sample: cli.sample,
		generateAll: cli.generateAll,
	});

	if (jobs.length === 0) {
		throw new Error("No items selected for generation");
	}

	console.log(
		`Generating ${jobs.length} ${cli.type} item(s) for brand ${cli.brand} (concurrency=${cli.concurrency}, force=${cli.force ? "yes" : "no"})`,
	);

	let generated = 0;
	let skipped = 0;
	let completed = 0;

	const pending = jobs.map((job, index) => ({ job, index }));

	async function executeJob(entry: { job: AudioJob; index: number }) {
		const { job, index } = entry;
		const prefix = `[${index + 1}/${jobs.length}] ${job.label}`;

		try {
			await stat(job.outputPath);
			if (!cli.force) {
				console.log(`${prefix}... skipped (exists)`);
				skipped++;
				completed++;
				return;
			}
		} catch {}

		const startedAt = performance.now();
		const bytes = await job.generate();
		const elapsed = performance.now() - startedAt;

		await mkdir(path.dirname(job.outputPath), { recursive: true });
		await writeFile(job.outputPath, bytes);

		generated++;
		completed++;
		console.log(
			`${prefix}... done (${formatDurationMs(elapsed)}, ${formatSize(bytes.byteLength)}) [${completed}/${jobs.length} complete]`,
		);
	}

	for (let i = 0; i < pending.length; i += cli.concurrency) {
		const batch = pending.slice(i, i + cli.concurrency);
		await Promise.all(batch.map(executeJob));
	}

	console.log(`Complete: ${generated} generated, ${skipped} skipped`);
}

run().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	printUsage();
	process.exit(1);
});
