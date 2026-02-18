import {
	DEFAULT_MUSIC_MODEL,
	DEFAULT_SFX_MODEL,
	DEFAULT_VOICE_MODEL,
	MUSIC_MODELS,
	PRESET_TO_SCENARIO_VOICE,
	SCENARIO_VOICES,
	SFX_MODELS,
	VOICE_MODELS,
	VOICE_PRESETS,
} from "@slopcade/shared";
import { TRPCError } from "@trpc/server";
import type { LanguageModel } from "ai";
import { generateObject } from "ai";
import { z } from "zod";
import { createModel } from "@/ai/model-factory";
import { ElevenLabsService } from "@/ai/providers/elevenlabs";
import {
	createScenarioClient,
	ScenarioAudioClient,
} from "@/ai/providers/scenario";
import { AuditService } from "@/services/audit-service";
import { adminProcedure, router } from "@/trpc/index";

const PARTY_CATEGORIES = [
	"pop culture",
	"food",
	"animals",
	"workplace",
	"hypothetical",
	"absurd",
	"relationships",
	"technology",
] as const;

const PARTY_PROMPT_FORMATS = [
	"The worst X: _____",
	"A rejected X",
	"Something you should never bring/say/do at X: _____",
	"If X had/could/were Y, they would: _____",
	"The real reason X: _____",
	"An honest X would say: _____",
	"A terrible name/slogan for X: _____",
	"The most X thing you could Y: _____",
] as const;

const PartyBatchSchema = z.object({
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

const THEME_PROMPT_MODIFIERS = [
	{
		name: "Halloween Horror",
		promptModifier:
			"Spooky Halloween aesthetic with haunted houses, jack-o-lanterns glowing orange, twisted bare trees, full moon, bats, cobwebs, and an eerie purple-green fog. Dark shadows with glowing eyes lurking. Gothic horror cartoon style with a playful twist.",
	},
	{
		name: "Candy Kingdom",
		promptModifier:
			"Sweet candy land with lollipop trees, gumdrop bushes, chocolate rivers, cotton candy clouds, and gingerbread structures. Bright pastel colors - pink, mint green, baby blue, and sunny yellow. Glossy, sugary cartoon textures that look deliciously edible.",
	},
	{
		name: "Synthwave Arcade",
		promptModifier:
			"Retro 80s synthwave aesthetic with neon pink and cyan grid lines, chrome metallic surfaces, palm tree silhouettes against sunset gradients, glowing wireframe mountains, and VHS scan lines. Pixel art style, futuristic yet nostalgic, like a neon-drenched arcade from the future.",
	},
	{
		name: "Enchanted Forest",
		promptModifier:
			"Magical fantasy forest with towering ancient trees, glowing mushrooms, floating fireflies, mystical fog, fairy dust particles, and hidden woodland creatures. Dappled sunlight filtering through emerald canopy. Whimsical cartoon style with mysterious atmosphere.",
	},
	{
		name: "Deep Sea Adventure",
		promptModifier:
			"Underwater ocean world with vibrant coral reefs, bioluminescent jellyfish, treasure chests, sunken ships, schools of tropical fish, and mysterious deep-sea creatures. Shafts of light penetrating the blue depths. Rich teals, deep blues, and pops of bright orange and yellow. Cartoon illustration style.",
	},
] as const;

function assertElevenLabsApiKey(apiKey: string | undefined): string {
	if (!apiKey) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "ELEVENLABS_API_KEY is not configured",
		});
	}
	return apiKey;
}

function assertOpenRouterApiKey(apiKey: string | undefined): string {
	if (!apiKey) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "OPENROUTER_API_KEY is not configured",
		});
	}
	return apiKey;
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
	const lowerA = a.toLowerCase();
	const lowerB = b.toLowerCase();
	if (lowerA === lowerB) return true;
	const maxLen = Math.max(lowerA.length, lowerB.length);
	if (maxLen === 0) return true;
	const distance = levenshteinDistance(lowerA, lowerB);
	const similarity = 1 - distance / maxLen;
	return similarity > 1 - threshold;
}

function deduplicatePrompts(
	prompts: Array<{ text: string; category: string }>,
): Array<{ text: string; category: string }> {
	const unique: Array<{ text: string; category: string }> = [];
	for (const prompt of prompts) {
		const duplicate = unique.some((existing) =>
			isTooSimilar(existing.text, prompt.text),
		);
		if (!duplicate) {
			unique.push(prompt);
		}
	}
	return unique;
}

function toSqlLiteral(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

async function generatePartyBatch(options: {
	model: LanguageModel;
	batchSize: number;
	batchIndex: number;
}) {
	const categoryRotation =
		PARTY_CATEGORIES[options.batchIndex % PARTY_CATEGORIES.length];
	const formatHint =
		PARTY_PROMPT_FORMATS[options.batchIndex % PARTY_PROMPT_FORMATS.length];

	const result = await generateObject({
		model: options.model,
		schema: PartyBatchSchema,
		system: [
			"You are a comedy writer for a party game like Quiplash.",
			"Generate fill-in-the-blank comedy prompts that are open-ended and inspire creative, funny answers.",
			"Each prompt should be 10-25 words and end with _____.",
			"",
			`Available categories: ${PARTY_CATEGORIES.join(", ")}`,
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
			`Generate ${options.batchSize} unique comedy prompts for a party game.`,
			`Focus category for this batch: "${categoryRotation}"`,
			`Try using this format style as inspiration (but vary it): "${formatHint}"`,
			"Ensure variety in phrasing - don't start every prompt the same way.",
			"Make them funny and open-ended so players can give creative answers.",
		].join("\n"),
		temperature: 0.9,
	});

	return result.object.prompts;
}

export const adminToolsRouter = router({
	generateSound: adminProcedure
		.input(
			z.object({
				text: z.string().describe("Sound effect description"),
				outputName: z.string().describe("Output filename without extension"),
				durationSeconds: z.number().default(2),
				promptInfluence: z.number().min(0).max(1).default(0.3),
				provider: z.enum(["scenario", "elevenlabs"]).default("scenario"),
				model: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.durationSeconds <= 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "durationSeconds must be greater than 0",
				});
			}

			let audio: ArrayBuffer;
			let modelId: string;
			let providerJobId: string | undefined;

			if (input.provider === "scenario") {
				const modelDef = SFX_MODELS[input.model ?? DEFAULT_SFX_MODEL];
				if (!modelDef) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Unknown SFX model: ${input.model}`,
					});
				}
				if (input.durationSeconds > modelDef.maxDurationSeconds) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `durationSeconds exceeds max for ${modelDef.id} (${modelDef.maxDurationSeconds}s)`,
					});
				}

				const base = createScenarioClient({
					SCENARIO_API_KEY: ctx.env.SCENARIO_API_KEY,
					SCENARIO_SECRET_API_KEY: ctx.env.SCENARIO_SECRET_API_KEY,
					SCENARIO_API_URL: ctx.env.SCENARIO_API_URL,
				});
				const audioClient = new ScenarioAudioClient(base);

				const jobId = await audioClient.createSfxJob({
					modelId: modelDef.scenarioModelId,
					text: input.text,
					durationSeconds: input.durationSeconds,
					promptInfluence: input.promptInfluence,
					outputFormat: "mp3_44100_128",
				});
				const assetIds = await base.pollJobUntilComplete(jobId);
				const firstAssetId = assetIds[0];
				if (!firstAssetId) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "No audio assets generated",
					});
				}

				const downloaded = await base.downloadAsset(firstAssetId);
				audio = downloaded.buffer;
				modelId = modelDef.id;
				providerJobId = jobId;
			} else {
				const service = new ElevenLabsService(
					assertElevenLabsApiKey(ctx.env.ELEVENLABS_API_KEY),
				);
				const result = await service.generateSFX({
					text: input.text,
					durationSeconds: input.durationSeconds,
					promptInfluence: input.promptInfluence,
					outputFormat: "mp3_44100_128",
				});
				audio = result.audio;
				modelId = "elevenlabs-direct";
			}

			const key = `sounds/${input.outputName}.mp3`;
			await ctx.env.ASSETS.put(key, audio, {
				httpMetadata: { contentType: "audio/mpeg" },
				customMetadata: {
					provider: input.provider,
					model: modelId,
					providerJobId: providerJobId ?? "",
				},
			});

			const audit = new AuditService(ctx.env.DB);
			await audit.logEvent({
				actorId: ctx.user.id,
				action: "admin.generate_sound",
				metadata: {
					outputName: input.outputName,
					provider: input.provider,
					sizeBytes: audio.byteLength,
				},
			});

			return {
				url: `/assets/${key}`,
				sizeBytes: audio.byteLength,
				provider: input.provider,
				model: modelId,
			};
		}),

	generateVoice: adminProcedure
		.input(
			z.object({
				text: z.string().describe("Text to speak"),
				outputName: z.string().describe("Output filename without extension"),
				voicePreset: z
					.string()
					.default("announcer")
					.describe("Voice preset ID"),
				stability: z.number().min(0).max(1).default(0.5),
				provider: z.enum(["scenario", "elevenlabs"]).default("scenario"),
				model: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const preset =
				VOICE_PRESETS[input.voicePreset as keyof typeof VOICE_PRESETS];
			if (!preset) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Unknown voice preset: ${input.voicePreset}`,
				});
			}

			let audio: ArrayBuffer;
			let modelId: string;
			let providerJobId: string | undefined;
			let voiceName: string;

			if (input.provider === "scenario") {
				const modelDef = VOICE_MODELS[input.model ?? DEFAULT_VOICE_MODEL];
				if (!modelDef) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Unknown voice model: ${input.model}`,
					});
				}

				const scenarioVoiceId =
					PRESET_TO_SCENARIO_VOICE[input.voicePreset] ?? "george";
				const scenarioVoice = SCENARIO_VOICES[scenarioVoiceId];
				voiceName = scenarioVoice?.name ?? scenarioVoiceId;

				const base = createScenarioClient({
					SCENARIO_API_KEY: ctx.env.SCENARIO_API_KEY,
					SCENARIO_SECRET_API_KEY: ctx.env.SCENARIO_SECRET_API_KEY,
					SCENARIO_API_URL: ctx.env.SCENARIO_API_URL,
				});
				const audioClient = new ScenarioAudioClient(base);

				const jobId = await audioClient.createVoiceJob({
					modelId: modelDef.scenarioModelId,
					text: input.text,
					voice: voiceName,
					stability: input.stability,
					similarityBoost: 0.75,
					styleExaggeration: 0,
					speed: 1,
				});
				const assetIds = await base.pollJobUntilComplete(jobId);
				const firstAssetId = assetIds[0];
				if (!firstAssetId) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "No audio assets generated",
					});
				}

				const downloaded = await base.downloadAsset(firstAssetId);
				audio = downloaded.buffer;
				modelId = modelDef.id;
				providerJobId = jobId;
			} else {
				const service = new ElevenLabsService(
					assertElevenLabsApiKey(ctx.env.ELEVENLABS_API_KEY),
				);
				const result = await service.generateVoice({
					text: input.text,
					voiceId: preset.voiceId,
					modelId: "eleven_multilingual_v2",
					stability: input.stability,
					similarityBoost: 0.75,
					style: 0,
					outputFormat: "mp3_44100_128",
				});
				audio = result.audio;
				modelId = "elevenlabs-direct";
				voiceName = preset.name;
			}

			const key = `sounds/${input.outputName}.mp3`;
			await ctx.env.ASSETS.put(key, audio, {
				httpMetadata: { contentType: "audio/mpeg" },
				customMetadata: {
					provider: input.provider,
					model: modelId,
					voicePreset: input.voicePreset,
					voiceName,
					voiceId: preset.voiceId,
					providerJobId: providerJobId ?? "",
				},
			});

			const audit = new AuditService(ctx.env.DB);
			await audit.logEvent({
				actorId: ctx.user.id,
				action: "admin.generate_voice",
				metadata: {
					outputName: input.outputName,
					provider: input.provider,
					voicePreset: input.voicePreset,
					sizeBytes: audio.byteLength,
				},
			});

			return {
				url: `/assets/${key}`,
				sizeBytes: audio.byteLength,
				provider: input.provider,
				model: modelId,
				voiceName,
			};
		}),

	generateMusic: adminProcedure
		.input(
			z.object({
				prompt: z.string().describe("Music description"),
				outputName: z.string().describe("Output filename without extension"),
				durationSeconds: z.number().min(5).max(240).default(30),
				model: z
					.string()
					.default(DEFAULT_MUSIC_MODEL)
					.describe("Music model: beatoven, minimax, musicgen, lyria"),
				negativePrompt: z.string().optional(),
				lyrics: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const modelDef = MUSIC_MODELS[input.model as keyof typeof MUSIC_MODELS];
			if (!modelDef) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Unknown music model: ${input.model}`,
				});
			}

			if (input.durationSeconds > modelDef.maxDurationSeconds) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `durationSeconds exceeds max for ${input.model} (${modelDef.maxDurationSeconds}s)`,
				});
			}

			const base = createScenarioClient({
				SCENARIO_API_KEY: ctx.env.SCENARIO_API_KEY,
				SCENARIO_SECRET_API_KEY: ctx.env.SCENARIO_SECRET_API_KEY,
				SCENARIO_API_URL: ctx.env.SCENARIO_API_URL,
			});
			const audioClient = new ScenarioAudioClient(base);

			const jobId = await audioClient.createMusicJob({
				modelId: modelDef.scenarioModelId,
				prompt: input.prompt,
				durationSeconds: input.durationSeconds,
				negativePrompt: input.negativePrompt,
				lyrics: input.lyrics,
			});
			const assetIds = await base.pollJobUntilComplete(jobId);
			const firstAssetId = assetIds[0];
			if (!firstAssetId) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "No audio assets generated",
				});
			}

			const audio = await base.downloadAsset(firstAssetId);
			const key = `audio/music/${input.outputName}.mp3`;
			await ctx.env.ASSETS.put(key, audio.buffer, {
				httpMetadata: { contentType: "audio/mpeg" },
				customMetadata: {
					model: input.model,
					scenarioModelId: modelDef.scenarioModelId,
					providerAssetId: firstAssetId,
					providerJobId: jobId,
					durationSeconds: String(input.durationSeconds),
				},
			});

			const audit = new AuditService(ctx.env.DB);
			await audit.logEvent({
				actorId: ctx.user.id,
				action: "admin.generate_music",
				metadata: {
					outputName: input.outputName,
					model: input.model,
					durationSeconds: input.durationSeconds,
					sizeBytes: audio.buffer.byteLength,
				},
			});

			return {
				url: `/assets/${key}`,
				sizeBytes: audio.buffer.byteLength,
				model: input.model,
				durationSeconds: input.durationSeconds,
			};
		}),

	generatePartyContent: adminProcedure
		.input(
			z.object({
				game: z.string().describe("Game type, e.g. 'quiplash'"),
				count: z.number().default(100).describe("Target number of prompts"),
				model: z.string().default("openai/gpt-4o-mini"),
				batchSize: z.number().default(15),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (input.game !== "quiplash") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Unsupported game type: ${input.game}. Supported: quiplash`,
				});
			}

			if (input.count <= 0 || input.batchSize <= 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "count and batchSize must be greater than 0",
				});
			}

			const apiKey = assertOpenRouterApiKey(ctx.env.OPENROUTER_API_KEY);
			const model = createModel({ apiKey, model: input.model });

			const allPrompts: Array<{ text: string; category: string }> = [];
			const batchCount = Math.ceil(input.count / input.batchSize);

			for (let i = 0; i < batchCount; i++) {
				const remaining = input.count - allPrompts.length;
				if (remaining <= 0) {
					break;
				}

				const currentBatchSize = Math.min(input.batchSize, remaining);
				const batch = await generatePartyBatch({
					model,
					batchSize: currentBatchSize,
					batchIndex: i,
				});

				const beforeCount = allPrompts.length;
				const newPrompts = deduplicatePrompts([...allPrompts, ...batch]).slice(
					beforeCount,
				);
				allPrompts.push(...newPrompts);
			}

			const finalPrompts = allPrompts.map((prompt, index) => ({
				id: `q${String(index + 1).padStart(3, "0")}`,
				text: prompt.text,
				category: prompt.category,
			}));

			const key = `party-content/${input.game}-prompts.json`;
			const payload = JSON.stringify(finalPrompts, null, "\t") + "\n";
			await ctx.env.ASSETS.put(key, payload, {
				httpMetadata: { contentType: "application/json" },
			});

			const categories: Record<string, number> = {};
			for (const prompt of finalPrompts) {
				categories[prompt.category] = (categories[prompt.category] ?? 0) + 1;
			}

			const audit = new AuditService(ctx.env.DB);
			await audit.logEvent({
				actorId: ctx.user.id,
				action: "admin.generate_party_content",
				metadata: { game: input.game, promptCount: finalPrompts.length },
			});

			return {
				promptCount: finalPrompts.length,
				categories,
			};
		}),

	seedDatabase: adminProcedure
		.input(
			z.object({
				targets: z
					.array(z.enum(["system-users", "economy", "themes"]))
					.describe("What to seed"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = Date.now();
			const seeded: string[] = [];

			if (input.targets.includes("system-users")) {
				const slopUserId = "00000000-0000-0000-0000-000000000001";
				const devUserId = "00000000-0000-0000-0000-000000000000";
				const systemUsersSql = `
INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
VALUES ('${slopUserId}', 'system@slopcade.dev', 'Slop', ${now}, ${now});

INSERT OR REPLACE INTO user_wallets (user_id, balance_micros, lifetime_earned_micros, lifetime_spent_micros, created_at, updated_at)
VALUES ('${slopUserId}', 999999999, 999999999, 0, ${now}, ${now});

INSERT OR IGNORE INTO users (id, email, display_name, created_at, updated_at)
VALUES ('${devUserId}', 'dev@localhost', 'Dev', ${now}, ${now});

INSERT OR REPLACE INTO user_wallets (user_id, balance_micros, lifetime_earned_micros, lifetime_spent_micros, created_at, updated_at)
VALUES ('${devUserId}', 999999999, 999999999, 0, ${now}, ${now});
`;
				await ctx.env.DB.exec(systemUsersSql);
				seeded.push("system-users");
			}

			if (input.targets.includes("economy")) {
				const economySql = `
INSERT OR IGNORE INTO signup_codes (code, name, max_uses, grant_amount_micros, is_active, created_at, updated_at)
VALUES
  ('BETA2026', 'Beta Tester Invite', NULL, 1000000, 1, ${now}, ${now}),
  ('LAUNCH100', 'Launch Party Invite', 100, 2000000, 1, ${now}, ${now}),
  ('CREATOR50', 'Influencer Invite', 50, 5000000, 1, ${now}, ${now});

INSERT OR IGNORE INTO promo_codes (code, name, grant_amount_micros, is_active, requires_purchase_history, created_at, updated_at)
VALUES
  ('WELCOME50', 'Welcome Bonus', 500000, 1, 0, ${now}, ${now}),
  ('THANKYOU', 'Loyalty Reward', 200000, 1, 1, ${now}, ${now});
`;
				await ctx.env.DB.exec(economySql);
				seeded.push("economy");
			}

			if (input.targets.includes("themes")) {
				const systemUserId = "00000000-0000-0000-0000-000000000001";
				const values = THEME_PROMPT_MODIFIERS.map((theme) => {
					const id = crypto.randomUUID();
					return `(${toSqlLiteral(id)}, ${toSqlLiteral(theme.name)}, ${toSqlLiteral(theme.promptModifier)}, ${toSqlLiteral(systemUserId)}, 1, ${now}, ${now})`;
				}).join(",\n  ");
				const themesSql = `
INSERT OR IGNORE INTO themes (id, name, prompt_modifier, creator_user_id, is_public, created_at, updated_at)
VALUES
  ${values};
`;
				await ctx.env.DB.exec(themesSql);
				seeded.push("themes");
			}

			const audit = new AuditService(ctx.env.DB);
			await audit.logEvent({
				actorId: ctx.user.id,
				action: "admin.seed_database",
				metadata: { targets: input.targets, seeded },
			});

			return { seeded };
		}),
});
