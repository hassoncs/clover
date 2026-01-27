import type {
  RunPodConfig,
  RunPodJobInput,
  RunPodImg2ImgInput,
  RunPodBgRemovalInput,
  RunPodJobResponse,
} from './runpod-types';
import { RUNPOD_DEFAULTS } from './runpod-types';

import type { ImageGenerationResult } from './provider-contract';
import { ProviderError, ProviderErrorCode, tryGetPngDimensions } from './provider-contract';

export class RunPodClient {
  private apiKey: string;
  private sdxlEndpointId?: string;
  private fluxEndpointId?: string;
  private bgRemovalEndpointId?: string;
  private timeout: number;
  private assetStore: Map<string, { data: string; mimeType: string }> = new Map();

  constructor(config: RunPodConfig) {
    this.apiKey = config.apiKey;
    this.sdxlEndpointId = config.sdxlEndpointId;
    this.fluxEndpointId = config.fluxEndpointId;
    this.bgRemovalEndpointId = config.bgRemovalEndpointId;
    this.timeout = config.timeout ?? RUNPOD_DEFAULTS.TIMEOUT_MS;

    if (!this.apiKey) {
      throw new Error('RunPod API key required');
    }
  }

  private getEndpointUrl(endpointId: string, path: string): string {
    return `${RUNPOD_DEFAULTS.BASE_URL}/${endpointId}${path}`;
  }

  private generateAssetId(): string {
    return `runpod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private storeAsset(data: string, mimeType = 'image/png'): string {
    const id = this.generateAssetId();
    this.assetStore.set(id, { data, mimeType });
    return id;
  }

  private getAsset(id: string): { data: string; mimeType: string } | undefined {
    return this.assetStore.get(id);
  }

  private async runJob<T>(endpointId: string, input: T): Promise<RunPodJobResponse> {
    const response = await fetch(this.getEndpointUrl(endpointId, '/runsync'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as RunPodJobResponse;

    if (result.status === 'FAILED') {
      throw new Error(`RunPod job failed: ${result.error ?? 'Unknown error'}`);
    }

    if (result.status === 'IN_QUEUE' || result.status === 'IN_PROGRESS') {
      return this.pollJob(endpointId, result.id);
    }

    return result;
  }

  private async pollJob(endpointId: string, jobId: string): Promise<RunPodJobResponse> {
    const maxAttempts = Math.ceil(this.timeout / RUNPOD_DEFAULTS.POLL_INTERVAL_MS);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(this.getEndpointUrl(endpointId, `/status/${jobId}`), {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to poll job status: ${response.status}`);
      }

      const result = await response.json() as RunPodJobResponse;

      if (result.status === 'COMPLETED') {
        return result;
      }

      if (result.status === 'FAILED' || result.status === 'CANCELLED') {
        throw new Error(`Job ${result.status}: ${result.error ?? 'Unknown error'}`);
      }

      await this.sleep(RUNPOD_DEFAULTS.POLL_INTERVAL_MS);
    }

    throw new Error(`Job timed out after ${this.timeout}ms`);
  }

  private extractImageFromOutput(output: RunPodJobResponse['output']): string {
    if (!output) {
      throw new Error('No output from job');
    }

    if (typeof output === 'string') {
      return output;
    }

    if (Array.isArray(output)) {
      if (output.length === 0) throw new Error('Empty output array');
      return output[0];
    }

    if (output.image) {
      return output.image;
    }

    if (output.images && output.images.length > 0) {
      return output.images[0];
    }

    throw new Error('Could not extract image from output');
  }

  private async fetchImageAsBase64(urlOrBase64: string): Promise<string> {
    if (!urlOrBase64.startsWith('http')) {
      return urlOrBase64;
    }

    const response = await fetch(urlOrBase64);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  async txt2img(params: {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    guidance?: number;
    seed?: number;
  }): Promise<{ assetId: string }> {
    const endpointId = this.fluxEndpointId ?? this.sdxlEndpointId;
    if (!endpointId) {
      throw new Error('No image generation endpoint configured (set RUNPOD_FLUX_ENDPOINT_ID or RUNPOD_SDXL_ENDPOINT_ID)');
    }

    const input: RunPodJobInput = {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      width: params.width ?? RUNPOD_DEFAULTS.WIDTH,
      height: params.height ?? RUNPOD_DEFAULTS.HEIGHT,
      num_inference_steps: params.steps ?? RUNPOD_DEFAULTS.STEPS,
      guidance_scale: params.guidance ?? RUNPOD_DEFAULTS.GUIDANCE,
      seed: params.seed,
    };

    const result = await this.runJob(endpointId, input);
    const imageData = this.extractImageFromOutput(result.output);
    const base64 = await this.fetchImageAsBase64(imageData);
    const assetId = this.storeAsset(base64);

    return { assetId };
  }

  async txt2imgResult(params: {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    guidance?: number;
    seed?: number;
  }): Promise<ImageGenerationResult> {
    try {
      const endpointId = this.fluxEndpointId ?? this.sdxlEndpointId;
      const modelLabel = this.fluxEndpointId ? 'flux' : 'sdxl';
      if (!endpointId) {
        throw new Error('No image generation endpoint configured (set RUNPOD_FLUX_ENDPOINT_ID or RUNPOD_SDXL_ENDPOINT_ID)');
      }

      const width = params.width ?? RUNPOD_DEFAULTS.WIDTH;
      const height = params.height ?? RUNPOD_DEFAULTS.HEIGHT;

      const input: RunPodJobInput = {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        width,
        height,
        num_inference_steps: params.steps ?? RUNPOD_DEFAULTS.STEPS,
        guidance_scale: params.guidance ?? RUNPOD_DEFAULTS.GUIDANCE,
        seed: params.seed,
      };

      const result = await this.runJob(endpointId, input);
      const imageData = this.extractImageFromOutput(result.output);
      const base64 = await this.fetchImageAsBase64(imageData);
      const providerAssetId = this.storeAsset(base64);
      const { buffer } = await this.downloadImage(providerAssetId);
      const dims = tryGetPngDimensions(buffer);

      return {
        buffer,
        providerAssetId,
        mimeType: 'image/png',
        metadata: {
          provider: 'runpod',
          providerJobId: result.id,
          modelId: `runpod/${modelLabel}`,
          seed: params.seed,
          width: dims?.width ?? width,
          height: dims?.height ?? height,
        },
      };
    } catch (err) {
      throw new ProviderError({
        provider: 'runpod',
        code: classifyProviderError(err),
        message: err instanceof Error ? err.message : 'Unknown RunPod error',
        cause: err,
      });
    }
  }

  async img2img(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    strength?: number;
    steps?: number;
    guidance?: number;
    seed?: number;
  }): Promise<{ assetId: string }> {
    const endpointId = this.fluxEndpointId ?? this.sdxlEndpointId;
    if (!endpointId) {
      throw new Error('No image generation endpoint configured');
    }

    let imageData = params.image;
    const existingAsset = this.getAsset(params.image);
    if (existingAsset) {
      imageData = existingAsset.data;
    }

    const input: RunPodImg2ImgInput = {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      image: imageData,
      strength: params.strength ?? RUNPOD_DEFAULTS.STRENGTH,
      num_inference_steps: params.steps ?? RUNPOD_DEFAULTS.STEPS,
      guidance_scale: params.guidance ?? RUNPOD_DEFAULTS.GUIDANCE,
      seed: params.seed,
    };

    const result = await this.runJob(endpointId, input);
    const outputImage = this.extractImageFromOutput(result.output);
    const base64 = await this.fetchImageAsBase64(outputImage);
    const assetId = this.storeAsset(base64);

    return { assetId };
  }

  async img2imgResult(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    strength?: number;
    steps?: number;
    guidance?: number;
    seed?: number;
  }): Promise<ImageGenerationResult> {
    try {
      const endpointId = this.fluxEndpointId ?? this.sdxlEndpointId;
      const modelLabel = this.fluxEndpointId ? 'flux' : 'sdxl';
      if (!endpointId) {
        throw new Error('No image generation endpoint configured');
      }

      let imageData = params.image;
      const existingAsset = this.getAsset(params.image);
      if (existingAsset) {
        imageData = existingAsset.data;
      }

      const input: RunPodImg2ImgInput = {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        image: imageData,
        strength: params.strength ?? RUNPOD_DEFAULTS.STRENGTH,
        num_inference_steps: params.steps ?? RUNPOD_DEFAULTS.STEPS,
        guidance_scale: params.guidance ?? RUNPOD_DEFAULTS.GUIDANCE,
        seed: params.seed,
      };

      const result = await this.runJob(endpointId, input);
      const outputImage = this.extractImageFromOutput(result.output);
      const base64 = await this.fetchImageAsBase64(outputImage);
      const providerAssetId = this.storeAsset(base64);
      const { buffer } = await this.downloadImage(providerAssetId);
      const dims = tryGetPngDimensions(buffer);

      return {
        buffer,
        providerAssetId,
        mimeType: 'image/png',
        metadata: {
          provider: 'runpod',
          providerJobId: result.id,
          modelId: `runpod/${modelLabel}`,
          seed: params.seed,
          width: dims?.width ?? RUNPOD_DEFAULTS.WIDTH,
          height: dims?.height ?? RUNPOD_DEFAULTS.HEIGHT,
        },
      };
    } catch (err) {
      throw new ProviderError({
        provider: 'runpod',
        code: classifyProviderError(err),
        message: err instanceof Error ? err.message : 'Unknown RunPod error',
        cause: err,
      });
    }
  }

  async removeBackground(params: { image: string }): Promise<{ assetId: string }> {
    if (!this.bgRemovalEndpointId) {
      throw new Error('No background removal endpoint configured (set RUNPOD_BG_REMOVAL_ENDPOINT_ID)');
    }

    let imageData = params.image;
    const existingAsset = this.getAsset(params.image);
    if (existingAsset) {
      imageData = existingAsset.data;
    }

    const input: RunPodBgRemovalInput = { image: imageData };

    const result = await this.runJob(this.bgRemovalEndpointId, input);
    const outputImage = this.extractImageFromOutput(result.output);
    const base64 = await this.fetchImageAsBase64(outputImage);
    const assetId = this.storeAsset(base64);

    return { assetId };
  }

  async removeBackgroundResult(params: { image: string }): Promise<ImageGenerationResult> {
    try {
      if (!this.bgRemovalEndpointId) {
        throw new Error('No background removal endpoint configured (set RUNPOD_BG_REMOVAL_ENDPOINT_ID)');
      }

      let imageData = params.image;
      const existingAsset = this.getAsset(params.image);
      if (existingAsset) {
        imageData = existingAsset.data;
      }

      const input: RunPodBgRemovalInput = { image: imageData };
      const result = await this.runJob(this.bgRemovalEndpointId, input);
      const outputImage = this.extractImageFromOutput(result.output);
      const base64 = await this.fetchImageAsBase64(outputImage);
      const providerAssetId = this.storeAsset(base64);
      const { buffer } = await this.downloadImage(providerAssetId);
      const dims = tryGetPngDimensions(buffer);

      return {
        buffer,
        providerAssetId,
        mimeType: 'image/png',
        metadata: {
          provider: 'runpod',
          providerJobId: result.id,
          modelId: 'runpod/remove-background',
          width: dims?.width ?? RUNPOD_DEFAULTS.WIDTH,
          height: dims?.height ?? RUNPOD_DEFAULTS.HEIGHT,
        },
      };
    } catch (err) {
      throw new ProviderError({
        provider: 'runpod',
        code: classifyProviderError(err),
        message: err instanceof Error ? err.message : 'Unknown RunPod error',
        cause: err,
      });
    }
  }

  async uploadImage(imageBuffer: Uint8Array): Promise<string> {
    const base64 = Buffer.from(imageBuffer).toString('base64');
    return this.storeAsset(base64);
  }

  async downloadImage(assetId: string): Promise<{ buffer: Uint8Array; extension: string }> {
    const asset = this.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const buffer = new Uint8Array(Buffer.from(asset.data, 'base64'));
    return { buffer, extension: '.png' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function classifyProviderError(err: unknown): ProviderErrorCode {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('timed out') || msg.includes('timeout')) return ProviderErrorCode.PROVIDER_TIMEOUT;
  if (msg.includes('cold start')) return ProviderErrorCode.PROVIDER_COLD_START;
  if (msg.includes('rate limit') || msg.includes('429')) return ProviderErrorCode.RATE_LIMITED;
  if (msg.includes('invalid') || msg.includes('missing')) return ProviderErrorCode.INPUT_INVALID;
  return ProviderErrorCode.UNKNOWN_PROVIDER_ERROR;
}

export function createRunPodClient(env: {
  RUNPOD_API_KEY?: string;
  RUNPOD_SDXL_ENDPOINT_ID?: string;
  RUNPOD_FLUX_ENDPOINT_ID?: string;
  RUNPOD_BG_REMOVAL_ENDPOINT_ID?: string;
}): RunPodClient {
  if (!env.RUNPOD_API_KEY) {
    throw new Error('RUNPOD_API_KEY required');
  }

  return new RunPodClient({
    apiKey: env.RUNPOD_API_KEY,
    sdxlEndpointId: env.RUNPOD_SDXL_ENDPOINT_ID,
    fluxEndpointId: env.RUNPOD_FLUX_ENDPOINT_ID,
    bgRemovalEndpointId: env.RUNPOD_BG_REMOVAL_ENDPOINT_ID,
  });
}
