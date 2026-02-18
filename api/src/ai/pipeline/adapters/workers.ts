import type { R2Bucket } from "@cloudflare/workers-types";
import { createSilhouettePng } from "@/ai/assets";
import type {
	ImageGenerationAdapter,
	PipelineAdapters,
	R2Adapter,
	SilhouetteAdapter,
} from "@/ai/pipeline/adapters/types";
import { createComfyUIClient } from "@/ai/providers/comfyui/client";
import { createScenarioAdapter } from "@/ai/providers/scenario";
import type { Env } from "@/trpc/context";

export function createWorkersScenarioAdapter(config: {
	apiKey: string;
	apiSecret: string;
	apiUrl?: string;
}): ImageGenerationAdapter {
	return createScenarioAdapter(config);
}

export function createWorkersComfyUIAdapter(env: Env): ImageGenerationAdapter {
	const endpoint =
		env.MODAL_ENDPOINT ??
		"https://hassoncs--slopcade-comfyui-web-img2img.modal.run";

	const client = createComfyUIClient({
		COMFYUI_ENDPOINT: endpoint,
	});

	return {
		async uploadImage(png: Uint8Array): Promise<string> {
			return client.uploadImage(png);
		},

		async txt2img(params): Promise<{ assetId: string }> {
			return client.txt2img({
				prompt: params.prompt,
				width: params.width ?? 1024,
				height: params.height ?? 1024,
			});
		},

		async img2img(params): Promise<{ assetId: string }> {
			return client.img2img({
				image: params.imageAssetId,
				prompt: params.prompt,
				strength: params.strength ?? 0.95,
			});
		},

		async downloadImage(
			assetId: string,
		): Promise<{ buffer: Uint8Array; extension: string }> {
			return client.downloadImage(assetId);
		},

		async removeBackground(assetId: string): Promise<{ assetId: string }> {
			return client.removeBackground({ image: assetId });
		},

		async layeredDecompose(params): Promise<{ assetIds: string[] }> {
			return client.layeredDecompose({
				image: params.imageAssetId,
				layerCount: params.layerCount,
				description: params.description,
			});
		},
	};
}

export function createWorkersProviderAdapter(env: Env): ImageGenerationAdapter {
	const provider = env.IMAGE_GENERATION_PROVIDER ?? "scenario";

	if (provider === "scenario") {
		if (!env.SCENARIO_API_KEY || !env.SCENARIO_SECRET_API_KEY) {
			throw new Error(
				"SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required when using Scenario provider",
			);
		}
		return createWorkersScenarioAdapter({
			apiKey: env.SCENARIO_API_KEY,
			apiSecret: env.SCENARIO_SECRET_API_KEY,
			apiUrl: env.SCENARIO_API_URL,
		});
	}

	// Alternative: Modal ComfyUI
	return createWorkersComfyUIAdapter(env);
}

export function createWorkersR2Adapter(r2Bucket: R2Bucket): R2Adapter {
	return {
		async put(
			key: string,
			body: Uint8Array,
			options?: { contentType?: string },
		): Promise<void> {
			const arrayBuffer = new ArrayBuffer(body.length);
			new Uint8Array(arrayBuffer).set(body);
			await r2Bucket.put(key, arrayBuffer, {
				httpMetadata: options?.contentType
					? { contentType: options.contentType }
					: undefined,
			});
		},

		getPublicUrl(key: string): string {
			return `/assets/${key}`;
		},
	};
}

export function createWorkersSilhouetteAdapter(): SilhouetteAdapter {
	return {
		async createSilhouette(params): Promise<Uint8Array> {
			return createSilhouettePng(
				params.shape,
				params.width,
				params.height,
				params.canvasSize ?? 512,
				params.color ?? "#808080",
			);
		},
	};
}

export function createWorkersAdapters(env: Env): PipelineAdapters;
export function createWorkersAdapters(
	env: Env,
	r2Bucket: R2Bucket,
): PipelineAdapters;
export function createWorkersAdapters(
	env: Env,
	r2Bucket: R2Bucket = env.ASSETS,
): PipelineAdapters {
	const imageGeneration = createWorkersProviderAdapter(env);

	return {
		provider: imageGeneration,
		scenario: imageGeneration,
		r2: createWorkersR2Adapter(r2Bucket),
		silhouette: createWorkersSilhouetteAdapter(),
	};
}
