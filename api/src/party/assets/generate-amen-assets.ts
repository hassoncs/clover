#!/usr/bin/env tsx

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { BRAND_VOICES } from "@slopcade/shared";
import { ElevenLabsService } from "../../ai/providers/elevenlabs";
import {
	AMEN_AVATAR_ICON_PROMPTS,
	AMEN_GAME_ASSET_PROMPTS,
	AMEN_GAME_IDS,
	type AmenAvatarType,
	type AmenGameId,
} from "./amen-game-art-prompts";

type AssetType = "tiles" | "heroes" | "avatars" | "panels" | "voiceovers";

const ALL_ASSET_TYPES: AssetType[] = [
	"tiles",
	"heroes",
	"avatars",
	"panels",
	"voiceovers",
];

function parseCsv(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseAssetTypes(value: string | undefined): AssetType[] {
	const parsed = parseCsv(value);
	if (parsed.length === 0) {
		return ALL_ASSET_TYPES;
	}

	const invalid = parsed.filter(
		(type) => !ALL_ASSET_TYPES.includes(type as AssetType),
	);
	if (invalid.length > 0) {
		throw new Error(`Invalid --asset-types: ${invalid.join(", ")}`);
	}

	return parsed as AssetType[];
}

function parseGameIds(value: string | undefined): AmenGameId[] {
	const parsed = parseCsv(value);
	if (parsed.length === 0) {
		return [...AMEN_GAME_IDS];
	}

	const invalid = parsed.filter(
		(gameId) => !AMEN_GAME_IDS.includes(gameId as AmenGameId),
	);
	if (invalid.length > 0) {
		throw new Error(`Invalid --game-ids: ${invalid.join(", ")}`);
	}

	return parsed as AmenGameId[];
}

async function writeBinaryFile(
	filePath: string,
	bytes: Uint8Array,
): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, bytes);
}

async function generateImageBytes(options: {
	apiKey: string;
	apiSecret: string;
	apiUrl: string;
	prompt: string;
	width: number;
	height: number;
}): Promise<Uint8Array> {
	const authHeader = `Basic ${btoa(`${options.apiKey}:${options.apiSecret}`)}`;

	const scenarioRequest = async <T>(
		method: "GET" | "POST",
		endpoint: string,
		body?: Record<string, unknown>,
	): Promise<T> => {
		const response = await fetch(`${options.apiUrl}${endpoint}`, {
			method,
			headers: {
				Authorization: authHeader,
				"Content-Type": "application/json",
			},
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			throw new Error(`Scenario API error (${response.status}): ${text}`);
		}

		return response.json() as Promise<T>;
	};

	const jobResponse = await scenarioRequest<{ job?: { jobId?: string } }>(
		"POST",
		"/generate/txt2img",
		{
			modelId: "flux.1-dev",
			prompt: options.prompt,
			numSamples: 1,
			width: options.width,
			height: options.height,
			guidance: 3.5,
			numInferenceSteps: 28,
		},
	);

	const jobId = jobResponse.job?.jobId;
	if (!jobId) {
		throw new Error("Scenario image job did not return a jobId");
	}

	let assetIds: string[] = [];
	for (let attempt = 0; attempt < 200; attempt++) {
		const statusResponse = await scenarioRequest<{
			job?: {
				status?: "pending" | "running" | "success" | "failed" | "cancelled";
				error?: string;
				metadata?: { assetIds?: string[] };
			};
		}>("GET", `/jobs/${jobId}`);

		const status = statusResponse.job?.status;
		if (status === "success") {
			assetIds = statusResponse.job?.metadata?.assetIds ?? [];
			break;
		}
		if (status === "failed" || status === "cancelled") {
			throw new Error(statusResponse.job?.error ?? `Scenario job ${status}`);
		}

		await new Promise((resolve) => setTimeout(resolve, 3000));
	}

	const firstAssetId = assetIds[0];
	if (!firstAssetId) {
		throw new Error("Scenario image job returned no assets");
	}

	const assetDetails = await scenarioRequest<{ asset?: { url?: string } }>(
		"GET",
		`/assets/${firstAssetId}`,
	);
	const assetUrl = assetDetails.asset?.url;
	if (!assetUrl) {
		throw new Error(`Scenario asset missing URL: ${firstAssetId}`);
	}

	const downloaded = await fetch(assetUrl);
	if (!downloaded.ok) {
		throw new Error(
			`Failed to download Scenario asset (${downloaded.status}): ${firstAssetId}`,
		);
	}

	return new Uint8Array(await downloaded.arrayBuffer());
}

async function run(): Promise<void> {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			"asset-types": { type: "string" },
			"game-ids": { type: "string" },
			"output-dir": { type: "string" },
			help: { type: "boolean", default: false },
		},
	});

	if (values.help) {
		console.log(`Usage: hush run -- npx tsx api/src/party/assets/generate-amen-assets.ts [options]

Options:
  --asset-types <csv>   tiles,heroes,avatars,panels,voiceovers (default: all)
  --game-ids <csv>      subset of game ids (default: all 8)
  --output-dir <path>   output directory (default: api/debug-output/amen-assets/<timestamp>)

Examples:
  hush run -- npx tsx api/src/party/assets/generate-amen-assets.ts
  hush run -- npx tsx api/src/party/assets/generate-amen-assets.ts --asset-types tiles,heroes --game-ids quiplash,truth-trap
`);
		return;
	}

	const assetTypes = parseAssetTypes(values["asset-types"]);
	const gameIds = parseGameIds(values["game-ids"]);

	const scenarioApiKey = process.env.SCENARIO_API_KEY;
	const scenarioApiSecret = process.env.SCENARIO_SECRET_API_KEY;
	const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

	if (!scenarioApiKey || !scenarioApiSecret) {
		throw new Error(
			"SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY are required. Run with hush run --",
		);
	}
	if (!elevenLabsApiKey) {
		throw new Error("ELEVENLABS_API_KEY is required. Run with hush run --");
	}

	const now = new Date().toISOString().replace(/[.:]/g, "-");
	const outputDir = path.resolve(
		values["output-dir"] ??
			path.join("api", "debug-output", "amen-assets", now),
	);

	const scenarioApiUrl =
		process.env.SCENARIO_API_URL ?? "https://api.cloud.scenario.com/v1";
	const voiceService = new ElevenLabsService(elevenLabsApiKey);
	const amenRulesVoice = BRAND_VOICES.amen.rules;

	const manifest: Record<string, unknown> = {
		generatedAt: new Date().toISOString(),
		assetTypes,
		gameIds,
		outputDir,
		files: {
			tiles: {} as Record<string, string>,
			heroes: {} as Record<string, string>,
			avatars: {} as Record<string, string>,
			panels: {} as Record<string, string[]>,
			voiceovers: {} as Record<string, string>,
		},
	};

	console.log(
		`Generating Amen assets locally -> ${outputDir} (types: ${assetTypes.join(", ")})`,
	);

	for (const gameId of gameIds) {
		const game = AMEN_GAME_ASSET_PROMPTS[gameId];
		const gameDir = path.join(outputDir, gameId);

		if (assetTypes.includes("tiles")) {
			const tileBytes = await generateImageBytes({
				apiKey: scenarioApiKey,
				apiSecret: scenarioApiSecret,
				apiUrl: scenarioApiUrl,
				prompt: game.tilePrompt,
				width: 512,
				height: 512,
			});
			const tilePath = path.join(gameDir, "tile.png");
			await writeBinaryFile(tilePath, tileBytes);
			(manifest.files as { tiles: Record<string, string> }).tiles[gameId] =
				tilePath;
			console.log(`- tile: ${gameId}`);
		}

		if (assetTypes.includes("heroes")) {
			const heroBytes = await generateImageBytes({
				apiKey: scenarioApiKey,
				apiSecret: scenarioApiSecret,
				apiUrl: scenarioApiUrl,
				prompt: game.heroPrompt,
				width: 1024,
				height: 512,
			});
			const heroPath = path.join(gameDir, "hero.png");
			await writeBinaryFile(heroPath, heroBytes);
			(manifest.files as { heroes: Record<string, string> }).heroes[gameId] =
				heroPath;
			console.log(`- hero: ${gameId}`);
		}

		if (assetTypes.includes("panels")) {
			const panelPaths: string[] = [];
			for (let index = 0; index < game.panelPrompts.length; index++) {
				const panelBytes = await generateImageBytes({
					apiKey: scenarioApiKey,
					apiSecret: scenarioApiSecret,
					apiUrl: scenarioApiUrl,
					prompt: game.panelPrompts[index],
					width: 1024,
					height: 1024,
				});
				const panelPath = path.join(gameDir, `panel-${index + 1}.png`);
				await writeBinaryFile(panelPath, panelBytes);
				panelPaths.push(panelPath);
			}
			(manifest.files as { panels: Record<string, string[]> }).panels[gameId] =
				panelPaths;
			console.log(`- panels: ${gameId} (${panelPaths.length})`);
		}

		if (assetTypes.includes("voiceovers")) {
			const audio = await voiceService.generateVoice({
				text: game.voiceoverScript,
				voiceId: amenRulesVoice.voiceId,
				modelId: amenRulesVoice.model,
				stability: amenRulesVoice.settings.stability,
				similarityBoost: amenRulesVoice.settings.similarityBoost,
				style: amenRulesVoice.settings.style,
				outputFormat: "mp3_44100_128",
			});
			const voicePath = path.join(gameDir, "how-to-play.mp3");
			await writeBinaryFile(voicePath, new Uint8Array(audio.audio));
			(manifest.files as { voiceovers: Record<string, string> }).voiceovers[
				gameId
			] = voicePath;
			console.log(`- voiceover: ${gameId}`);
		}
	}

	if (assetTypes.includes("avatars")) {
		const avatarDir = path.join(outputDir, "avatars");
		for (const avatarType of Object.keys(
			AMEN_AVATAR_ICON_PROMPTS,
		) as AmenAvatarType[]) {
			const avatarBytes = await generateImageBytes({
				apiKey: scenarioApiKey,
				apiSecret: scenarioApiSecret,
				apiUrl: scenarioApiUrl,
				prompt: AMEN_AVATAR_ICON_PROMPTS[avatarType],
				width: 256,
				height: 256,
			});
			const avatarPath = path.join(avatarDir, `${avatarType}.png`);
			await writeBinaryFile(avatarPath, avatarBytes);
			(manifest.files as { avatars: Record<string, string> }).avatars[
				avatarType
			] = avatarPath;
			console.log(`- avatar: ${avatarType}`);
		}
	}

	const manifestPath = path.join(outputDir, "manifest.json");
	await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
	console.log(`Done. Manifest: ${manifestPath}`);
}

run().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
