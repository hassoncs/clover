import type { PipelineAdapters, ImageGenerationAdapter, R2Adapter, SilhouetteAdapter } from './types';
import { createComfyUIClient } from '../../comfyui';
import { createScenarioClient, type ScenarioClient } from '../../scenario';
import { createSilhouettePng } from '../../assets';
import type { Env } from '../../../trpc/context';
import type { R2Bucket } from '@cloudflare/workers-types';

export function createWorkersScenarioAdapter(client: ScenarioClient): ImageGenerationAdapter {
  return {
    async uploadImage(png: Uint8Array): Promise<string> {
      const arrayBuffer = png.buffer.slice(
        png.byteOffset,
        png.byteOffset + png.byteLength
      ) as ArrayBuffer;
      return client.uploadAsset(arrayBuffer);
    },

    async txt2img(params): Promise<{ assetId: string }> {
      const result = await client.generate({
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        negativePrompt: params.negativePrompt,
      });
      return { assetId: result.assetIds[0] };
    },

    async img2img(params): Promise<{ assetId: string }> {
      const result = await client.generateImg2Img({
        image: params.imageAssetId,
        prompt: params.prompt,
        strength: params.strength ?? 0.95,
      });
      return { assetId: result.assetIds[0] };
    },

    async downloadImage(assetId: string): Promise<{ buffer: Uint8Array; extension: string }> {
      const result = await client.downloadAsset(assetId);
      return {
        buffer: new Uint8Array(result.buffer),
        extension: result.extension,
      };
    },

    async removeBackground(assetId: string): Promise<{ assetId: string }> {
      const resultAssetId = await client.removeBackground({ image: assetId, format: 'png' });
      return { assetId: resultAssetId };
    },
  };
}

export function createWorkersComfyUIAdapter(env: Env): ImageGenerationAdapter {
  if (!env.RUNPOD_API_KEY) {
    throw new Error('RUNPOD_API_KEY required when using ComfyUI/RunPod image generation provider');
  }
  if (!env.RUNPOD_COMFYUI_ENDPOINT_ID) {
    throw new Error('RUNPOD_COMFYUI_ENDPOINT_ID required when using ComfyUI/RunPod image generation provider');
  }

  const endpoint = `https://api.runpod.ai/v2/${env.RUNPOD_COMFYUI_ENDPOINT_ID}`;
  const client = createComfyUIClient({
    COMFYUI_ENDPOINT: endpoint,
    RUNPOD_API_KEY: env.RUNPOD_API_KEY,
  });

  return {
    async uploadImage(png: Uint8Array): Promise<string> {
      return client.uploadImage(png);
    },

    async txt2img(params): Promise<{ assetId: string }> {
      return client.txt2img({
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
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

    async downloadImage(assetId: string): Promise<{ buffer: Uint8Array; extension: string }> {
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
  const provider = env.IMAGE_GENERATION_PROVIDER;

  if (provider === 'comfyui' || provider === 'runpod') {
    return createWorkersComfyUIAdapter(env);
  }

  if (!env.SCENARIO_API_KEY || !env.SCENARIO_SECRET_API_KEY) {
    throw new Error('SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required when using Scenario image generation provider');
  }

  return createWorkersScenarioAdapter(createScenarioClient(env));
}

export function createWorkersR2Adapter(r2Bucket: R2Bucket): R2Adapter {
  return {
    async put(key: string, body: Uint8Array, options?: { contentType?: string }): Promise<void> {
      const arrayBuffer = new ArrayBuffer(body.length);
      new Uint8Array(arrayBuffer).set(body);
      await r2Bucket.put(key, arrayBuffer, {
        httpMetadata: options?.contentType ? { contentType: options.contentType } : undefined,
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
        params.color ?? '#808080'
      );
    },
  };
}

export function createWorkersAdapters(env: Env): PipelineAdapters;
export function createWorkersAdapters(env: Env, r2Bucket: R2Bucket): PipelineAdapters;
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
