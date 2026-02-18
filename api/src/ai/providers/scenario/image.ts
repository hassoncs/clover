import type {
	ImageGenerationAdapter,
	ImageGenerationResult,
} from "@/ai/providers/contract";
import {
	PROVIDER_DEFAULTS,
	ProviderError,
	ProviderErrorCode,
	tryGetPngDimensions,
} from "@/ai/providers/contract";
import { ScenarioClient, scenarioLog } from "@/ai/providers/scenario/client";
import type {
	GenerationParams,
	GenerationResult,
	Img2ImgParams,
	RemoveBackgroundParams,
	ScenarioConfig,
	ThirdPartyGenerationParams,
} from "@/ai/providers/scenario/types";
import {
	CUSTOM_MODEL_PREFIXES,
	SCENARIO_DEFAULTS,
} from "@/ai/providers/scenario/types";

export class ScenarioImageClient {
	constructor(private client: ScenarioClient) {}

	usesCustomEndpoint(modelId: string): boolean {
		if (!modelId.startsWith("model_")) {
			return false;
		}
		return CUSTOM_MODEL_PREFIXES.some((prefix) => modelId.startsWith(prefix));
	}

	async createGenerationJob(params: GenerationParams): Promise<string> {
		const modelId = params.modelId ?? SCENARIO_DEFAULTS.MODEL;
		const width = params.width ?? SCENARIO_DEFAULTS.DEFAULT_WIDTH;
		const height = params.height ?? SCENARIO_DEFAULTS.DEFAULT_HEIGHT;
		const guidance = Math.max(
			2,
			Math.min(5, params.guidance ?? SCENARIO_DEFAULTS.DEFAULT_GUIDANCE),
		);
		const numInferenceSteps =
			params.numInferenceSteps ?? SCENARIO_DEFAULTS.DEFAULT_STEPS;
		const numSamples = params.numSamples ?? 1;

		const payload: Record<string, unknown> = {
			modelId,
			prompt: params.prompt,
			numSamples,
			width,
			height,
			guidance,
			numInferenceSteps,
		};

		if (params.seed) {
			payload.seed = params.seed;
		}

		const response = await this.client.request<{ job?: { jobId?: string } }>(
			"POST",
			"/generate/txt2img",
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) {
			throw new Error("No jobId returned from API");
		}

		return jobId;
	}

	async createThirdPartyJob(
		params: ThirdPartyGenerationParams,
	): Promise<string> {
		const {
			modelId,
			prompt,
			numSamples = 1,
			aspectRatio = "1:1",
			seed,
		} = params;

		const payload: Record<string, unknown> = {
			prompt,
			numSamples,
			aspectRatio,
		};

		if (seed) {
			payload.seed = seed;
		}

		const response = await this.client.request<{ job?: { jobId?: string } }>(
			"POST",
			`/generate/custom/${modelId}`,
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) {
			throw new Error("No jobId returned from API");
		}

		return jobId;
	}

	async createImg2ImgJob(params: Img2ImgParams): Promise<string> {
		const modelId = params.modelId ?? SCENARIO_DEFAULTS.MODEL;
		const strength = Math.max(0, Math.min(1, params.strength));
		const numSamples = params.numSamples ?? 1;
		const guidance = params.guidance ?? SCENARIO_DEFAULTS.DEFAULT_GUIDANCE;
		const numInferenceSteps =
			params.numInferenceSteps ?? SCENARIO_DEFAULTS.DEFAULT_STEPS;

		const payload: Record<string, unknown> = {
			prompt: params.prompt,
			image: params.image,
			strength,
			modelId,
			numSamples,
			guidance,
			numInferenceSteps,
		};

		if (params.seed) {
			payload.seed = params.seed;
		}

		scenarioLog(
			"DEBUG",
			"",
			`POST /generate/img2img - prompt: "${params.prompt.substring(0, 80)}..." strength: ${strength}`,
		);

		const response = await this.client.request<{ job?: { jobId?: string } }>(
			"POST",
			"/generate/img2img",
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) {
			throw new Error("No jobId returned from API");
		}

		scenarioLog("INFO", "", `img2img job created: ${jobId}`);

		return jobId;
	}

	async createRemoveBackgroundJob(
		params: RemoveBackgroundParams,
	): Promise<string> {
		const payload: Record<string, unknown> = {
			image: params.image,
			format: params.format ?? "png",
		};

		if (params.backgroundColor) {
			payload.backgroundColor = params.backgroundColor;
		}

		const response = await this.client.request<{ job?: { jobId?: string } }>(
			"POST",
			"/generate/remove-background",
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) {
			throw new Error("No jobId returned from API");
		}

		return jobId;
	}

	async createLayeredDecomposeJob(params: {
		image: string;
		layerCount: number;
		description?: string;
	}): Promise<string> {
		const payload: Record<string, unknown> = {
			image: params.image,
			layersCount: params.layerCount,
		};

		if (params.description) {
			payload.description = params.description;
		}

		const response = await this.client.request<{ job?: { jobId?: string } }>(
			"POST",
			"/generate/layered",
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) {
			throw new Error("No jobId returned from API");
		}

		return jobId;
	}

	async generate(params: GenerationParams): Promise<GenerationResult> {
		const modelId = params.modelId ?? SCENARIO_DEFAULTS.MODEL;
		const usesCustom = this.usesCustomEndpoint(modelId);

		let jobId: string;

		if (usesCustom) {
			jobId = await this.createThirdPartyJob({
				prompt: params.prompt,
				modelId,
				numSamples: params.numSamples,
				seed: params.seed,
			});
		} else {
			jobId = await this.createGenerationJob(params);
		}

		const assetIds = await this.client.pollJobUntilComplete(jobId);
		const urls: string[] = [];

		for (const assetId of assetIds) {
			const { url } = await this.client.getAssetDetails(assetId);
			urls.push(url);
		}

		return { jobId, assetIds, urls };
	}

	async generateImg2Img(params: Img2ImgParams): Promise<GenerationResult> {
		const jobId = await this.createImg2ImgJob(params);
		const assetIds = await this.client.pollJobUntilComplete(jobId);
		const urls: string[] = [];

		for (const assetId of assetIds) {
			const { url } = await this.client.getAssetDetails(assetId);
			urls.push(url);
		}

		return { jobId, assetIds, urls };
	}

	async txt2imgResult(
		params: GenerationParams,
	): Promise<ImageGenerationResult> {
		try {
			const modelId = params.modelId ?? SCENARIO_DEFAULTS.MODEL;
			const width = params.width ?? SCENARIO_DEFAULTS.DEFAULT_WIDTH;
			const height = params.height ?? SCENARIO_DEFAULTS.DEFAULT_HEIGHT;

			const gen = await this.generate({ ...params, modelId, width, height });
			const assetId = gen.assetIds[0];
			if (!assetId) {
				throw new Error("No assets generated");
			}

			const downloaded = await this.client.downloadAsset(assetId);
			const buffer = new Uint8Array(downloaded.buffer);
			const dims = tryGetPngDimensions(buffer);

			return {
				buffer,
				providerAssetId: assetId,
				mimeType: downloaded.mimeType,
				metadata: {
					provider: "scenario",
					providerJobId: gen.jobId,
					modelId,
					seed: params.seed,
					width: dims?.width ?? width,
					height: dims?.height ?? height,
				},
			};
		} catch (err) {
			throw new ProviderError({
				provider: "scenario",
				code: classifyProviderError(err),
				message: err instanceof Error ? err.message : "Unknown Scenario error",
				cause: err,
			});
		}
	}

	async img2imgResult(params: Img2ImgParams): Promise<ImageGenerationResult> {
		try {
			const modelId = params.modelId ?? SCENARIO_DEFAULTS.MODEL;
			const gen = await this.generateImg2Img({ ...params, modelId });
			const assetId = gen.assetIds[0];
			if (!assetId) {
				throw new Error("No assets generated");
			}

			const downloaded = await this.client.downloadAsset(assetId);
			const buffer = new Uint8Array(downloaded.buffer);
			const dims = tryGetPngDimensions(buffer);

			return {
				buffer,
				providerAssetId: assetId,
				mimeType: downloaded.mimeType,
				metadata: {
					provider: "scenario",
					providerJobId: gen.jobId,
					modelId,
					seed: params.seed,
					width: dims?.width ?? SCENARIO_DEFAULTS.DEFAULT_WIDTH,
					height: dims?.height ?? SCENARIO_DEFAULTS.DEFAULT_HEIGHT,
				},
			};
		} catch (err) {
			throw new ProviderError({
				provider: "scenario",
				code: classifyProviderError(err),
				message: err instanceof Error ? err.message : "Unknown Scenario error",
				cause: err,
			});
		}
	}

	async removeBackgroundResult(
		params: RemoveBackgroundParams,
	): Promise<ImageGenerationResult> {
		try {
			const jobId = await this.createRemoveBackgroundJob(params);
			const assetIds = await this.client.pollJobUntilComplete(jobId);
			const assetId = assetIds[0];
			if (!assetId) {
				throw new Error("No assets generated from background removal");
			}

			const downloaded = await this.client.downloadAsset(assetId);
			const buffer = new Uint8Array(downloaded.buffer);
			const dims = tryGetPngDimensions(buffer);

			return {
				buffer,
				providerAssetId: assetId,
				mimeType: downloaded.mimeType,
				metadata: {
					provider: "scenario",
					providerJobId: jobId,
					modelId: "remove-background",
					width: dims?.width ?? SCENARIO_DEFAULTS.DEFAULT_WIDTH,
					height: dims?.height ?? SCENARIO_DEFAULTS.DEFAULT_HEIGHT,
				},
			};
		} catch (err) {
			throw new ProviderError({
				provider: "scenario",
				code: classifyProviderError(err),
				message: err instanceof Error ? err.message : "Unknown Scenario error",
				cause: err,
			});
		}
	}

	async removeBackground(params: RemoveBackgroundParams): Promise<string> {
		const jobId = await this.createRemoveBackgroundJob(params);
		const assetIds = await this.client.pollJobUntilComplete(jobId);

		if (assetIds.length === 0) {
			throw new Error("No assets generated from background removal");
		}

		return assetIds[0];
	}
}

export function classifyProviderError(err: unknown): ProviderErrorCode {
	const msg = err instanceof Error ? err.message.toLowerCase() : "";
	if (msg.includes("timed out") || msg.includes("timeout")) {
		return ProviderErrorCode.PROVIDER_TIMEOUT;
	}
	if (msg.includes("rate limit") || msg.includes("429")) {
		return ProviderErrorCode.RATE_LIMITED;
	}
	if (msg.includes("invalid") || msg.includes("missing")) {
		return ProviderErrorCode.INPUT_INVALID;
	}
	return ProviderErrorCode.UNKNOWN_PROVIDER_ERROR;
}

export function createScenarioAdapter(
	config: ScenarioConfig,
): ImageGenerationAdapter {
	const client = new ScenarioClient(config);
	const image = new ScenarioImageClient(client);

	return {
		async uploadImage(png: Uint8Array): Promise<string> {
			const arrayBuffer = png.buffer.slice(
				png.byteOffset,
				png.byteOffset + png.byteLength,
			) as ArrayBuffer;
			return client.uploadAsset(arrayBuffer);
		},

		async txt2img(params): Promise<{ assetId: string }> {
			const result = await image.generate({
				prompt: params.prompt,
				width: params.width ?? PROVIDER_DEFAULTS.WIDTH,
				height: params.height ?? PROVIDER_DEFAULTS.HEIGHT,
				guidance: params.guidance ?? PROVIDER_DEFAULTS.GUIDANCE,
				seed: params.seed !== undefined ? String(params.seed) : undefined,
			});
			if (result.assetIds.length === 0) {
				throw new Error("No assets generated");
			}
			return { assetId: result.assetIds[0] };
		},

		async img2img(params): Promise<{ assetId: string }> {
			const result = await image.generateImg2Img({
				image: params.imageAssetId,
				prompt: params.prompt,
				strength: params.strength ?? PROVIDER_DEFAULTS.IMG2IMG_STRENGTH,
				guidance: params.guidance ?? PROVIDER_DEFAULTS.GUIDANCE,
			});
			if (result.assetIds.length === 0) {
				throw new Error("No assets generated");
			}
			return { assetId: result.assetIds[0] };
		},

		async downloadImage(
			assetId: string,
		): Promise<{ buffer: Uint8Array; extension: string }> {
			const result = await client.downloadAsset(assetId);
			return {
				buffer: new Uint8Array(result.buffer),
				extension: result.extension,
			};
		},

		async removeBackground(assetId: string): Promise<{ assetId: string }> {
			const resultAssetId = await image.removeBackground({ image: assetId });
			return { assetId: resultAssetId };
		},

		async layeredDecompose(params): Promise<{ assetIds: string[] }> {
			const jobId = await image.createLayeredDecomposeJob({
				image: params.imageAssetId,
				layerCount: params.layerCount,
				description: params.description,
			});
			const assetIds = await client.pollJobUntilComplete(jobId);
			return { assetIds };
		},
	};
}
