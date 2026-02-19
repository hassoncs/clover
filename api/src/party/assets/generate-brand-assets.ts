#!/usr/bin/env tsx

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { BRAND_VOICES } from "@slopcade/shared";
import { ElevenLabsService } from "../../ai/providers/elevenlabs";
import {
	ALL_ASSET_TYPES,
	type AssetType,
	getBrandArtConfig,
	listBrandIds,
} from "./brand-art-registry";

function parseCsv(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseAssetTypes(
	value: string | undefined,
	supportsVoiceovers: boolean,
): AssetType[] {
	const parsed = parseCsv(value);
	let types =
		parsed.length === 0
			? ALL_ASSET_TYPES.filter((t) => t !== "voiceovers")
			: (parsed as AssetType[]);

	const invalid = types.filter((type) => !ALL_ASSET_TYPES.includes(type));
	if (invalid.length > 0) {
		throw new Error(`Invalid --asset-types: ${invalid.join(", ")}`);
	}

	if (!supportsVoiceovers && types.includes("voiceovers")) {
		console.warn("Warning: Brand does not support voiceovers. Skipping.");
		types = types.filter((t) => t !== "voiceovers");
	}

	return types;
}

function parseGameIds(
	value: string | undefined,
	availableGameIds: readonly string[],
): string[] {
	const parsed = parseCsv(value);
	if (parsed.length === 0) {
		return [...availableGameIds];
	}

	const invalid = parsed.filter((gameId) => !availableGameIds.includes(gameId));
	if (invalid.length > 0) {
		throw new Error(`Invalid --game-ids: ${invalid.join(", ")}`);
	}

	return parsed;
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
			brand: { type: "string" },
			"asset-types": { type: "string" },
			"game-ids": { type: "string" },
			"output-dir": { type: "string" },
			help: { type: "boolean", default: false },
		},
	});

	if (values.help || !values.brand) {
		const brands = listBrandIds().join(", ");
		console.log(`Usage: hush run -- npx tsx api/src/party/assets/generate-brand-assets.ts --brand <brand> [options]

Options:
  --brand <brand>       Required. One of: ${brands}
  --asset-types <csv>   tiles,heroes,avatars,panels,voiceovers (default: all except voiceovers)
  --game-ids <csv>      subset of game ids (default: all for brand)
  --output-dir <path>   output directory (default: api/debug-output/<brand>-assets/<timestamp>)

Examples:
  hush run -- npx tsx api/src/party/assets/generate-brand-assets.ts --brand amen
  hush run -- npx tsx api/src/party/assets/generate-brand-assets.ts --brand slopcade --asset-types tiles,heroes --game-ids quiplash,truth-trap
`);
		return;
	}

	const brandId = values.brand;
	const brandConfig = getBrandArtConfig(brandId);

	const assetTypes = parseAssetTypes(
		values["asset-types"],
		brandConfig.supportsVoiceovers,
	);
	const gameIds = parseGameIds(values["game-ids"], brandConfig.gameIds);

	const scenarioApiKey = process.env.SCENARIO_API_KEY;
	const scenarioApiSecret = process.env.SCENARIO_SECRET_API_KEY;
	const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

	if (!scenarioApiKey || !scenarioApiSecret) {
		throw new Error(
			"SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY are required. Run with hush run --",
		);
	}

	if (assetTypes.includes("voiceovers") && !elevenLabsApiKey) {
		throw new Error(
			"ELEVENLABS_API_KEY is required for voiceovers. Run with hush run --",
		);
	}

	const now = new Date().toISOString().replace(/[.:]/g, "-");
	const outputDir = path.resolve(
		values["output-dir"] ??
			path.join("api", "debug-output", `${brandId}-assets`, now),
	);

	const scenarioApiUrl =
		process.env.SCENARIO_API_URL ?? "https://api.cloud.scenario.com/v1";

	const voiceService = elevenLabsApiKey
		? new ElevenLabsService(elevenLabsApiKey)
		: null;
	const brandVoice = (BRAND_VOICES as any)[brandId]?.rules;

	const manifest: Record<string, unknown> = {
		generatedAt: new Date().toISOString(),
		brandId,
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
		`Generating ${brandId} assets locally -> ${outputDir} (types: ${assetTypes.join(", ")})`,
	);

	for (const gameId of gameIds) {
		const game = brandConfig.gamePrompts[gameId];
		if (!game) {
			console.warn(`Warning: No prompts found for game ${gameId}. Skipping.`);
			continue;
		}
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

		if (assetTypes.includes("voiceovers") && voiceService && brandVoice) {
			const audio = await voiceService.generateVoice({
				text: game.voiceoverScript,
				voiceId: brandVoice.voiceId,
				modelId: brandVoice.model,
				stability: brandVoice.settings.stability,
				similarityBoost: brandVoice.settings.similarityBoost,
				style: brandVoice.settings.style,
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
		for (const avatarType of Object.keys(brandConfig.avatarPrompts)) {
			const avatarBytes = await generateImageBytes({
				apiKey: scenarioApiKey,
				apiSecret: scenarioApiSecret,
				apiUrl: scenarioApiUrl,
				prompt: brandConfig.avatarPrompts[avatarType],
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
