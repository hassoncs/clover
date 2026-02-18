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
import {
	DEFAULT_SFX_MODEL,
	SFX_MODELS,
} from "../../shared/src/constants/audio-sfx-models";
import { SFX_PROMPTS } from "../../shared/src/constants/audio-sfx-prompts";
import {
	DEFAULT_VOICE_MODEL,
	VOICE_MODELS,
} from "../../shared/src/constants/audio-voice-models";
import { BRAND_VOICES } from "../../shared/src/constants/voice-presets";
import { ElevenLabsService } from "../src/ai/providers/elevenlabs";
import {
	createScenarioClient,
	ScenarioAudioClient,
	type ScenarioClient,
} from "../src/ai/providers/scenario";
import {
	buildContentAudioR2Key,
	getReadableText,
	sanitizeForTTS,
} from "../src/party/content/audio";

type AudioType = "sfx" | "voice" | "music" | "content-voice";
type AudioProvider = "scenario" | "elevenlabs";
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
  --provider <scenario|elevenlabs>          (default: scenario)
  --brand <amen|slopcade>                   (default: amen)
  --model <model-id>                        Model within provider (type-dependent)
  --id <item-id>                            Generate one item
  --sample                                  Generate a representative sample (first ${SAMPLE_SIZE})
  --generate-all                            Generate all items for this type
  --concurrency <n>                          Parallel jobs (default: 5)
  --force                                   Overwrite existing files
  --help                                    Show this help

Examples:
  hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --id tick
  hush run -- npx tsx api/scripts/generate-audio.ts --type sfx --provider scenario --sample
  hush run -- npx tsx api/scripts/generate-audio.ts --type voice --brand amen --generate-all
  hush run -- npx tsx api/scripts/generate-audio.ts --type voice --provider scenario --model elevenlabs-v3 --sample
  hush run -- npx tsx api/scripts/generate-audio.ts --type music --model beatoven --sample
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
			provider: { type: "string", default: "scenario" },
			brand: { type: "string", default: "amen" },
			model: { type: "string" },
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

	if (values.provider !== "scenario" && values.provider !== "elevenlabs") {
		throw new Error(`Invalid --provider value: ${values.provider}`);
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
		provider: values.provider as AudioProvider,
		brand: values.brand,
		model: values.model,
		id: values.id,
		sample: values.sample,
		generateAll: values["generate-all"],
		concurrency,
		force: values.force,
	};
}

async function loadContentVoiceItems(
	brand: Brand,
): Promise<ContentVoiceItem[]> {
	const brandDir = path.join(contentPacksRoot, brand);
	const packFiles = (await readdir(brandDir)).filter((name) =>
		name.endsWith(".json"),
	);

	const items: ContentVoiceItem[] = [];
	// Content types that don't benefit from voice narration
	const SKIP_VOICE_TYPES = new Set(["headsup", "wordlist"]);

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

		if (SKIP_VOICE_TYPES.has(contentType)) {
			continue;
		}

		for (const entry of parsed) {
			if (typeof entry !== "object" || entry === null || !("id" in entry)) {
				continue;
			}

			const record = entry as Record<string, unknown>;
			if (typeof record.id !== "string") continue;

			const text = getReadableText(record, contentType);
			if (!text) continue;

			items.push({
				id: record.id as string,
				text,
				contentType,
			});
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
	provider: AudioProvider;
	scenarioBase?: ScenarioClient;
	scenarioAudio?: ScenarioAudioClient;
	elevenLabsService?: ElevenLabsService;
	type: AudioType;
	brand: Brand;
	model?: string;
	id?: string;
	sample: boolean;
	generateAll: boolean;
}): Promise<AudioJob[]> {
	const {
		provider,
		scenarioBase,
		scenarioAudio,
		elevenLabsService,
		type,
		brand,
		model,
		id,
		sample,
		generateAll,
	} = params;

	if (type === "sfx") {
		if (provider === "scenario") {
			if (!scenarioBase || !scenarioAudio) {
				throw new Error("Scenario client is required for Scenario generation");
			}

			const sfxModelKey = model ?? DEFAULT_SFX_MODEL;
			const sfxModel = SFX_MODELS[sfxModelKey];
			if (!sfxModel) {
				throw new Error(
					`Invalid --model value: ${sfxModelKey}. Expected one of: ${Object.keys(SFX_MODELS).join(", ")}`,
				);
			}

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
				generate: async () => {
					const jobId = await scenarioAudio.createSfxJob({
						modelId: sfxModel.scenarioModelId,
						text: entry.prompt,
						durationSeconds: Math.min(
							entry.duration,
							sfxModel.maxDurationSeconds,
						),
						promptInfluence: entry.promptInfluence,
						outputFormat: OUTPUT_FORMAT,
					});
					const assetIds = await scenarioBase.pollJobUntilComplete(jobId);
					const assetId = assetIds[0];
					if (!assetId) {
						throw new Error("SFX job succeeded but no assets");
					}
					const downloaded = await scenarioBase.downloadAsset(assetId);
					return new Uint8Array(downloaded.buffer);
				},
			}));
		}

		if (!elevenLabsService) {
			throw new Error(
				"ElevenLabs service is required for ElevenLabs generation",
			);
		}

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
			generate: async () =>
				new Uint8Array(
					(
						await elevenLabsService.generateSFX({
							text: entry.prompt,
							durationSeconds: entry.duration,
							promptInfluence: entry.promptInfluence,
							outputFormat: OUTPUT_FORMAT,
						})
					).audio,
				),
		}));
	}

	if (type === "voice") {
		if (provider === "scenario") {
			if (!scenarioBase || !scenarioAudio) {
				throw new Error("Scenario client is required for Scenario generation");
			}

			const voiceModelKey = model ?? DEFAULT_VOICE_MODEL;
			const voiceModel = VOICE_MODELS[voiceModelKey];
			if (!voiceModel) {
				throw new Error(
					`Invalid --model value: ${voiceModelKey}. Expected one of: ${Object.keys(VOICE_MODELS).join(", ")}`,
				);
			}

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
					generate: async () => {
						const jobId = await scenarioAudio.createVoiceJob({
							modelId: voiceModel.scenarioModelId,
							text,
							voice: voice.voiceId,
							stability: voice.settings.stability,
							similarityBoost: voice.settings.similarityBoost,
							styleExaggeration: voice.settings.style,
						});
						const assetIds = await scenarioBase.pollJobUntilComplete(jobId);
						const assetId = assetIds[0];
						if (!assetId) {
							throw new Error("Voice job succeeded but no assets");
						}
						const downloaded = await scenarioBase.downloadAsset(assetId);
						return new Uint8Array(downloaded.buffer);
					},
				} satisfies AudioJob;
			});
		}

		if (!elevenLabsService) {
			throw new Error(
				"ElevenLabs service is required for ElevenLabs generation",
			);
		}

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
				generate: async () =>
					new Uint8Array(
						(
							await elevenLabsService.generateVoice({
								text,
								voiceId: voice.voiceId,
								modelId: voice.model,
								stability: voice.settings.stability,
								similarityBoost: voice.settings.similarityBoost,
								style: voice.settings.style,
								outputFormat: OUTPUT_FORMAT,
							})
						).audio,
					),
			} satisfies AudioJob;
		});
	}

	if (type === "music") {
		if (!scenarioBase || !scenarioAudio) {
			throw new Error("Scenario client is required for music generation");
		}

		const musicModelKey = model ?? DEFAULT_MUSIC_MODEL;
		const musicModel = MUSIC_MODELS[musicModelKey];
		if (!musicModel) {
			throw new Error(
				`Invalid --model value: ${musicModelKey}. Expected one of: ${Object.keys(MUSIC_MODELS).join(", ")}`,
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
				generate: async () => {
					const jobId = await scenarioAudio.createMusicJob({
						modelId: musicModel.scenarioModelId,
						prompt: entry.prompt,
						durationSeconds,
						lyrics:
							entry.lyrics ??
							(musicModel.supportsLyrics ? "[instrumental]" : undefined),
						negativePrompt: entry.negativePrompt,
					});
					const assetIds = await scenarioBase.pollJobUntilComplete(jobId);
					const assetId = assetIds[0];
					if (!assetId) {
						throw new Error("Music job succeeded but no assets");
					}
					const downloaded = await scenarioBase.downloadAsset(assetId);
					return new Uint8Array(downloaded.buffer);
				},
			} satisfies AudioJob;
		});
	}

	if (!elevenLabsService) {
		throw new Error("ElevenLabs service is required for ElevenLabs generation");
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

	const r2Root = path.resolve(audioRoot, "..");
	return targets.map((entry) => ({
		id: entry.id,
		label: `Generating Content Voice: ${entry.id}`,
		outputPath: path.join(
			r2Root,
			buildContentAudioR2Key(brand, entry.contentType, entry.id),
		),
		generate: async () =>
			new Uint8Array(
				(
					await elevenLabsService.generateVoice({
						text: sanitizeForTTS(entry.text),
						voiceId: voice.voiceId,
						modelId: voice.model,
						stability: voice.settings.stability,
						similarityBoost: voice.settings.similarityBoost,
						style: voice.settings.style,
						outputFormat: OUTPUT_FORMAT,
					})
				).audio,
			),
	}));
}

async function run(): Promise<void> {
	const cli = parseCli();

	const scenarioApiKey = process.env.SCENARIO_API_KEY;
	const scenarioApiSecret = process.env.SCENARIO_SECRET_API_KEY;
	const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

	const requiresScenario =
		cli.type === "music" ||
		((cli.type === "sfx" || cli.type === "voice") &&
			cli.provider === "scenario");
	const requiresElevenLabs =
		cli.type === "content-voice" ||
		((cli.type === "sfx" || cli.type === "voice") &&
			cli.provider === "elevenlabs");

	if (requiresScenario) {
		if (!scenarioApiKey || !scenarioApiSecret) {
			throw new Error(
				"SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY are required for music generation. Run with: hush run -- npx tsx api/scripts/generate-audio.ts ...",
			);
		}
	}

	if (requiresElevenLabs && !elevenLabsApiKey) {
		throw new Error(
			"ELEVENLABS_API_KEY is required. Run with: hush run -- npx tsx api/scripts/generate-audio.ts ...",
		);
	}

	const scenarioBase = requiresScenario
		? createScenarioClient({
				SCENARIO_API_KEY: scenarioApiKey,
				SCENARIO_SECRET_API_KEY: scenarioApiSecret,
				SCENARIO_API_URL: process.env.SCENARIO_API_URL,
			})
		: undefined;
	const scenarioAudio = scenarioBase
		? new ScenarioAudioClient(scenarioBase)
		: undefined;
	const elevenLabsService = requiresElevenLabs
		? new ElevenLabsService(elevenLabsApiKey as string)
		: undefined;

	if (cli.type === "music") {
		const musicModel =
			MUSIC_MODELS[cli.model ?? DEFAULT_MUSIC_MODEL] ??
			MUSIC_MODELS[DEFAULT_MUSIC_MODEL];
		console.log(
			`Music model: ${musicModel.name} (${musicModel.id}, max ${musicModel.maxDurationSeconds}s)`,
		);
	}

	const jobs = await buildJobs({
		provider: cli.provider,
		scenarioBase,
		scenarioAudio,
		elevenLabsService,
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
