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
import type {
	AssetResponse,
	GenerationParams,
	GenerationResult,
	Img2ImgParams,
	JobResponse,
	JobStatus,
	Model,
	ModelsResponse,
	RemoveBackgroundParams,
	ScenarioConfig,
	ThirdPartyGenerationParams,
	UploadResponse,
} from "@/ai/providers/scenario/types";
import {
	CUSTOM_MODEL_PREFIXES,
	MIME_TO_EXT,
	SCENARIO_DEFAULTS,
} from "@/ai/providers/scenario/types";

// Log level utility for production-safe debugging
const LOG_LEVEL = process.env.LOG_LEVEL || "INFO";
const LOG_LEVELS: Record<string, number> = {
	DEBUG: 0,
	INFO: 1,
	WARN: 2,
	ERROR: 3,
};

function shouldLog(level: string): boolean {
	return (LOG_LEVELS[level] ?? 1) >= (LOG_LEVELS[LOG_LEVEL] ?? 1);
}

function scenarioLog(level: string, context: string, message: string): void {
	if (shouldLog(level)) {
		const formatted = `[Scenario] [${level}] ${context ? `[${context}] ` : ""}${message}`;
		if (level === "ERROR") console.error(formatted);
		else if (level === "WARN") console.warn(formatted);
		else console.log(formatted);
	}
}

export class ScenarioClient {
	private apiKey: string;
	private apiSecret: string;
	private apiUrl: string;

	constructor(config: ScenarioConfig) {
		this.apiKey = config.apiKey;
		this.apiSecret = config.apiSecret;
		this.apiUrl = config.apiUrl ?? SCENARIO_DEFAULTS.API_URL;

		if (!this.apiKey || !this.apiSecret) {
			throw new Error(
				"Scenario API credentials required. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.",
			);
		}
	}

	private getAuthHeader(): string {
		const credentials = `${this.apiKey}:${this.apiSecret}`;
		return `Basic ${btoa(credentials)}`;
	}

	private async request<T>(
		method: "GET" | "POST",
		endpoint: string,
		body?: Record<string, unknown>,
	): Promise<T> {
		const url = `${this.apiUrl}${endpoint}`;
		const headers: HeadersInit = {
			Authorization: this.getAuthHeader(),
			"Content-Type": "application/json",
		};

		const response = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const message =
				(errorData as { error?: { message?: string }; message?: string }).error
					?.message ??
				(errorData as { message?: string }).message ??
				`HTTP ${response.status}`;
			throw new Error(`Scenario API error: ${message}`);
		}

		return response.json() as Promise<T>;
	}

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

		const response = await this.request<{ job?: { jobId?: string } }>(
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

		const response = await this.request<{ job?: { jobId?: string } }>(
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

	async createMusicJob(params: {
		modelId: string;
		prompt: string;
		durationSeconds: number;
		negativePrompt?: string;
		lyrics?: string;
	}): Promise<string> {
		const payload: Record<string, unknown> = {
			prompt: params.prompt,
			duration: params.durationSeconds,
		};
		if (params.negativePrompt) payload.negativePrompt = params.negativePrompt;
		if (params.lyrics) payload.lyrics = params.lyrics;

		scenarioLog(
			"DEBUG",
			"",
			`POST /generate/custom/${params.modelId} - music: "${params.prompt.substring(0, 80)}..." duration: ${params.durationSeconds}s`,
		);

		const response = await this.request<{ job?: { jobId?: string } }>(
			"POST",
			`/generate/custom/${params.modelId}`,
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) throw new Error("No jobId returned from music generation");

		scenarioLog("INFO", "", `Music job created: ${jobId}`);
		return jobId;
	}

	async createSfxJob(params: {
		modelId: string;
		text: string;
		durationSeconds?: number;
		promptInfluence?: number;
		loop?: boolean;
		outputFormat?: string;
	}): Promise<string> {
		const payload: Record<string, unknown> = {
			text: params.text,
		};
		if (params.durationSeconds !== undefined)
			payload.durationSeconds = params.durationSeconds;
		if (params.promptInfluence !== undefined)
			payload.promptInfluence = params.promptInfluence;
		if (params.loop !== undefined) payload.loop = params.loop;
		if (params.outputFormat !== undefined)
			payload.outputFormat = params.outputFormat;

		scenarioLog(
			"DEBUG",
			"",
			`POST /generate/custom/${params.modelId} - sfx: "${params.text.substring(0, 60)}..."`,
		);

		const response = await this.request<{ job?: { jobId?: string } }>(
			"POST",
			`/generate/custom/${params.modelId}`,
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) throw new Error("No jobId returned from SFX generation");

		scenarioLog("INFO", "", `SFX job created: ${jobId}`);
		return jobId;
	}

	async createVoiceJob(params: {
		modelId: string;
		text: string;
		voice: string;
		stability?: number;
		similarityBoost?: number;
		styleExaggeration?: number;
		speed?: number;
		languageCode?: string;
	}): Promise<string> {
		const payload: Record<string, unknown> = {
			text: params.text,
			voice: params.voice,
		};
		if (params.stability !== undefined) payload.stability = params.stability;
		if (params.similarityBoost !== undefined)
			payload.similarityBoost = params.similarityBoost;
		if (params.styleExaggeration !== undefined)
			payload.styleExaggeration = params.styleExaggeration;
		if (params.speed !== undefined) payload.speed = params.speed;
		if (params.languageCode !== undefined)
			payload.languageCode = params.languageCode;

		scenarioLog(
			"DEBUG",
			"",
			`POST /generate/custom/${params.modelId} - voice: "${params.voice}" text: "${params.text.substring(0, 40)}..."`,
		);

		const response = await this.request<{ job?: { jobId?: string } }>(
			"POST",
			`/generate/custom/${params.modelId}`,
			payload,
		);

		const jobId = response.job?.jobId;
		if (!jobId) throw new Error("No jobId returned from voice generation");

		scenarioLog("INFO", "", `Voice job created: ${jobId}`);
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

		const response = await this.request<{ job?: { jobId?: string } }>(
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

		const response = await this.request<{ job?: { jobId?: string } }>(
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

		const response = await this.request<{ job?: { jobId?: string } }>(
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

	async pollJobUntilComplete(jobId: string): Promise<string[]> {
		for (
			let attempt = 0;
			attempt < SCENARIO_DEFAULTS.MAX_POLL_ATTEMPTS;
			attempt++
		) {
			const response = await this.request<JobResponse>("GET", `/jobs/${jobId}`);
			const job = response.job;

			if (!job) {
				throw new Error("Invalid job response");
			}

			const status: JobStatus = job.status;

			scenarioLog(
				"DEBUG",
				jobId,
				`Polling: status=${status} (attempt ${attempt + 1}/${SCENARIO_DEFAULTS.MAX_POLL_ATTEMPTS})`,
			);

			if (status === "success") {
				const assetIds = job.metadata?.assetIds ?? [];
				if (assetIds.length === 0) {
					throw new Error("No assets generated");
				}
				scenarioLog(
					"INFO",
					jobId,
					`Job succeeded: ${assetIds.length} asset(s) generated`,
				);
				return assetIds;
			}

			if (status === "failed" || status === "cancelled") {
				throw new Error(job.error ?? `Job ${status}`);
			}

			await this.sleep(SCENARIO_DEFAULTS.POLL_INTERVAL_MS);
		}

		throw new Error("Job timed out");
	}

	async getAssetDetails(
		assetId: string,
	): Promise<{ url: string; mimeType?: string }> {
		const response = await this.request<AssetResponse>(
			"GET",
			`/assets/${assetId}`,
		);
		const asset = response.asset;

		if (!asset?.url) {
			throw new Error(`No URL found for asset ${assetId}`);
		}

		return { url: asset.url, mimeType: asset.mimeType };
	}

	async downloadAsset(assetId: string): Promise<{
		buffer: ArrayBuffer;
		mimeType: string;
		extension: string;
	}> {
		scenarioLog("DEBUG", "", `Downloading asset: ${assetId}`);

		const { url, mimeType } = await this.getAssetDetails(assetId);

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to download asset: HTTP ${response.status}`);
		}

		const buffer = await response.arrayBuffer();
		const extension = MIME_TO_EXT[mimeType ?? ""] ?? ".png";

		scenarioLog(
			"INFO",
			"",
			`Downloaded: ${assetId} (${mimeType}, ${extension})`,
		);

		return { buffer, mimeType: mimeType ?? "image/png", extension };
	}

	async uploadAsset(imageBuffer: ArrayBuffer, name?: string): Promise<string> {
		scenarioLog(
			"DEBUG",
			"",
			`Uploading asset: ${name ?? "unnamed"} (size: ${imageBuffer.byteLength} bytes)`,
		);

		const base64Image = this.arrayBufferToBase64(imageBuffer);

		const response = await this.request<UploadResponse>("POST", "/assets", {
			image: base64Image,
			name: name ?? `upload-${Date.now()}`,
		});

		const assetId = response.asset?.id;
		if (!assetId) {
			throw new Error("No asset ID returned from upload");
		}

		scenarioLog("INFO", "", `Asset uploaded: ${assetId}`);

		return assetId;
	}

	async listModels(includePublic = false): Promise<Model[]> {
		const endpoint = includePublic ? "/models/public" : "/models";
		const response = await this.request<ModelsResponse>("GET", endpoint);
		return response.models ?? [];
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

		const assetIds = await this.pollJobUntilComplete(jobId);
		const urls: string[] = [];

		for (const assetId of assetIds) {
			const { url } = await this.getAssetDetails(assetId);
			urls.push(url);
		}

		return { jobId, assetIds, urls };
	}

	async generateImg2Img(params: Img2ImgParams): Promise<GenerationResult> {
		const jobId = await this.createImg2ImgJob(params);
		const assetIds = await this.pollJobUntilComplete(jobId);
		const urls: string[] = [];

		for (const assetId of assetIds) {
			const { url } = await this.getAssetDetails(assetId);
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

			const downloaded = await this.downloadAsset(assetId);
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

			const downloaded = await this.downloadAsset(assetId);
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
			const assetIds = await this.pollJobUntilComplete(jobId);
			const assetId = assetIds[0];
			if (!assetId) {
				throw new Error("No assets generated from background removal");
			}

			const downloaded = await this.downloadAsset(assetId);
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
		const assetIds = await this.pollJobUntilComplete(jobId);

		if (assetIds.length === 0) {
			throw new Error("No assets generated from background removal");
		}

		return assetIds[0];
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = "";
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}
}

function classifyProviderError(err: unknown): ProviderErrorCode {
	const msg = err instanceof Error ? err.message.toLowerCase() : "";
	if (msg.includes("timed out") || msg.includes("timeout"))
		return ProviderErrorCode.PROVIDER_TIMEOUT;
	if (msg.includes("rate limit") || msg.includes("429"))
		return ProviderErrorCode.RATE_LIMITED;
	if (msg.includes("invalid") || msg.includes("missing"))
		return ProviderErrorCode.INPUT_INVALID;
	return ProviderErrorCode.UNKNOWN_PROVIDER_ERROR;
}

export function createScenarioClient(env: {
	SCENARIO_API_KEY?: string;
	SCENARIO_SECRET_API_KEY?: string;
	SCENARIO_API_URL?: string;
}): ScenarioClient {
	const apiKey = env.SCENARIO_API_KEY;
	const apiSecret = env.SCENARIO_SECRET_API_KEY;

	if (!apiKey || !apiSecret) {
		throw new Error(
			"Missing Scenario API credentials. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.",
		);
	}

	return new ScenarioClient({
		apiKey,
		apiSecret,
		apiUrl: env.SCENARIO_API_URL,
	});
}

/**
 * Create an ImageGenerationAdapter that wraps ScenarioClient.
 *
 * This is the canonical adapter factory for Scenario provider.
 * Use this in pipeline stages and AssetService.
 */
export function createScenarioAdapter(
	config: ScenarioConfig,
): ImageGenerationAdapter {
	const client = new ScenarioClient(config);

	return {
		async uploadImage(png: Uint8Array): Promise<string> {
			const arrayBuffer = png.buffer.slice(
				png.byteOffset,
				png.byteOffset + png.byteLength,
			) as ArrayBuffer;
			return client.uploadAsset(arrayBuffer);
		},

		async txt2img(params): Promise<{ assetId: string }> {
			const result = await client.generate({
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
			const result = await client.generateImg2Img({
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
			const resultAssetId = await client.removeBackground({ image: assetId });
			return { assetId: resultAssetId };
		},

		async layeredDecompose(params): Promise<{ assetIds: string[] }> {
			const jobId = await client.createLayeredDecomposeJob({
				image: params.imageAssetId,
				layerCount: params.layerCount,
				description: params.description,
			});
			const assetIds = await client.pollJobUntilComplete(jobId);
			return { assetIds };
		},
	};
}
