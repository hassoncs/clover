import type { PipelineAdapters, ScenarioAdapter, R2Adapter, SilhouetteAdapter } from './types';
import type { ScenarioClient } from '../../scenario';
import { createSilhouettePng } from '../../assets';

export function createWorkersScenarioAdapter(client: ScenarioClient): ScenarioAdapter {
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
        params.canvasSize ?? 512
      );
    },
  };
}

export function createWorkersAdapters(
  scenarioClient: ScenarioClient,
  r2Bucket: R2Bucket,
): PipelineAdapters {
  return {
    scenario: createWorkersScenarioAdapter(scenarioClient),
    r2: createWorkersR2Adapter(r2Bucket),
    silhouette: createWorkersSilhouetteAdapter(),
  };
}
