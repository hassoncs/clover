import type {
  ComfyUIConfig,
  ComfyTxt2ImgParams,
  ComfyImg2ImgParams,
  ComfyRemoveBackgroundParams,
  ComfyLayeredParams,
  ComfyWorkflow,
  ComfyAsset,
  RunPodResponse,
} from './comfyui-types';
import {
  COMFYUI_DEFAULTS,
  MIME_TO_EXT,
} from './comfyui-types';

import type { ImageGenerationResult, LayeredImageGenerationResult } from './provider-contract';
import { ProviderError, ProviderErrorCode, tryGetPngDimensions } from './provider-contract';

import * as workflows from './workflows';

export class ComfyUIClient {
  private endpoint: string;
  private apiKey?: string;
  private isServerless: boolean;
  private timeout: number;
  private assetStore: Map<string, ComfyAsset> = new Map();

  constructor(config: ComfyUIConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.isServerless = config.isServerless ?? false;
    this.timeout = config.timeout ?? COMFYUI_DEFAULTS.TIMEOUT_MS;
  }

  private generateAssetId(): string {
    return `comfy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private storeAsset(data: string, mimeType: string, filename?: string): string {
    const id = this.generateAssetId();
    this.assetStore.set(id, { id, data, mimeType, filename });
    return id;
  }

  private getAsset(id: string): ComfyAsset | undefined {
    return this.assetStore.get(id);
  }

  private async executeWorkflow(
    workflow: ComfyWorkflow,
    images?: Array<{ name: string; image: string }>
  ): Promise<Array<{ image: string; filename: string }>> {
    if (this.isServerless) {
      return this.executeServerless(workflow, images);
    }
    return this.executeDirect(workflow, images);
  }

  private async executeWorkflowWithJobId(
    workflow: ComfyWorkflow,
    images?: Array<{ name: string; image: string }>
  ): Promise<{ images: Array<{ image: string; filename: string }>; providerJobId?: string }> {
    if (this.isServerless) {
      return this.executeServerlessWithJobId(workflow, images);
    }
    return this.executeDirectWithJobId(workflow, images);
  }

  private async executeServerless(
    workflow: ComfyWorkflow,
    images?: Array<{ name: string; image: string }>
  ): Promise<Array<{ image: string; filename: string }>> {
    const response = await fetch(`${this.endpoint}/runsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: { workflow, images },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as RunPodResponse;

    if (result.status === 'FAILED' || result.error) {
      throw new Error(`RunPod job failed: ${result.error ?? result.output?.error ?? 'Unknown error'}`);
    }

    if (result.status !== 'COMPLETED') {
      return this.pollRunPodJob(result.id);
    }

    return result.output?.images ?? [];
  }

  private async executeServerlessWithJobId(
    workflow: ComfyWorkflow,
    images?: Array<{ name: string; image: string }>
  ): Promise<{ images: Array<{ image: string; filename: string }>; providerJobId?: string }> {
    const response = await fetch(`${this.endpoint}/runsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: { workflow, images },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as RunPodResponse;

    if (result.status === 'FAILED' || result.error) {
      throw new Error(`RunPod job failed: ${result.error ?? result.output?.error ?? 'Unknown error'}`);
    }

    if (result.status !== 'COMPLETED') {
      const imagesOut = await this.pollRunPodJob(result.id);
      return { images: imagesOut, providerJobId: result.id };
    }

    return { images: result.output?.images ?? [], providerJobId: result.id };
  }

  private async pollRunPodJob(jobId: string): Promise<Array<{ image: string; filename: string }>> {
    const maxAttempts = Math.ceil(this.timeout / COMFYUI_DEFAULTS.POLL_INTERVAL_MS);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.endpoint}/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to poll job status: ${response.status}`);
      }

      const result = await response.json() as RunPodResponse;

      if (result.status === 'COMPLETED') {
        return result.output?.images ?? [];
      }

      if (result.status === 'FAILED' || result.status === 'CANCELLED') {
        throw new Error(`Job ${result.status}: ${result.error ?? result.output?.error ?? 'Unknown error'}`);
      }

      await this.sleep(COMFYUI_DEFAULTS.POLL_INTERVAL_MS);
    }

    throw new Error(`Job timed out after ${this.timeout}ms`);
  }

  private async executeDirect(
    workflow: ComfyWorkflow,
    images?: Array<{ name: string; image: string }>
  ): Promise<Array<{ image: string; filename: string }>> {
    if (images?.length) {
      for (const img of images) {
        await this.uploadImageDirect(img.name, img.image);
      }
    }

    const promptResponse = await fetch(`${this.endpoint}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!promptResponse.ok) {
      throw new Error(`ComfyUI prompt error: ${promptResponse.status}`);
    }

    const { prompt_id } = await promptResponse.json() as { prompt_id: string };
    return this.pollDirectJob(prompt_id);
  }

  private async executeDirectWithJobId(
    workflow: ComfyWorkflow,
    images?: Array<{ name: string; image: string }>
  ): Promise<{ images: Array<{ image: string; filename: string }>; providerJobId?: string }> {
    if (images?.length) {
      for (const img of images) {
        await this.uploadImageDirect(img.name, img.image);
      }
    }

    const promptResponse = await fetch(`${this.endpoint}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    });

    if (!promptResponse.ok) {
      throw new Error(`ComfyUI prompt error: ${promptResponse.status}`);
    }

    const { prompt_id } = await promptResponse.json() as { prompt_id: string };
    const imagesOut = await this.pollDirectJob(prompt_id);
    return { images: imagesOut, providerJobId: prompt_id };
  }

  private async uploadImageDirect(filename: string, base64Data: string): Promise<void> {
    const imageData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const binaryData = Buffer.from(imageData, 'base64');

    const formData = new FormData();
    formData.append('image', new Blob([binaryData]), filename);

    const response = await fetch(`${this.endpoint}/upload/image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.status}`);
    }
  }

  private async pollDirectJob(promptId: string): Promise<Array<{ image: string; filename: string }>> {
    const maxAttempts = Math.ceil(this.timeout / COMFYUI_DEFAULTS.POLL_INTERVAL_MS);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const historyResponse = await fetch(`${this.endpoint}/history/${promptId}`);

      if (!historyResponse.ok) {
        await this.sleep(COMFYUI_DEFAULTS.POLL_INTERVAL_MS);
        continue;
      }

      const history = await historyResponse.json() as Record<string, {
        outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }>;
        status?: { status_str: string; completed: boolean };
      }>;
      const entry = history[promptId];

      if (!entry?.status?.completed) {
        await this.sleep(COMFYUI_DEFAULTS.POLL_INTERVAL_MS);
        continue;
      }

      const results: Array<{ image: string; filename: string }> = [];

      for (const nodeOutput of Object.values(entry.outputs ?? {})) {
        for (const img of nodeOutput.images ?? []) {
          const imageUrl = `${this.endpoint}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const buffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            results.push({ image: base64, filename: img.filename });
          }
        }
      }

      return results;
    }

    throw new Error(`Job timed out after ${this.timeout}ms`);
  }

  async txt2img(params: ComfyTxt2ImgParams): Promise<{ assetId: string }> {
    const workflow = workflows.buildTxt2ImgWorkflow({
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      width: params.width ?? COMFYUI_DEFAULTS.WIDTH,
      height: params.height ?? COMFYUI_DEFAULTS.HEIGHT,
      steps: params.steps ?? COMFYUI_DEFAULTS.STEPS,
      guidance: params.guidance ?? COMFYUI_DEFAULTS.GUIDANCE,
      seed: params.seed ?? Math.floor(Math.random() * 1000000000),
    });

    const images = await this.executeWorkflow(workflow);

    if (!images.length) {
      throw new Error('No images generated');
    }

    const assetId = this.storeAsset(images[0].image, 'image/png', images[0].filename);
    return { assetId };
  }

  async txt2imgResult(params: ComfyTxt2ImgParams): Promise<ImageGenerationResult> {
    try {
      const width = params.width ?? COMFYUI_DEFAULTS.WIDTH;
      const height = params.height ?? COMFYUI_DEFAULTS.HEIGHT;
      const seed = params.seed ?? Math.floor(Math.random() * 1000000000);
      const modelId = params.workflow ?? 'comfyui/txt2img';

      const workflow = workflows.buildTxt2ImgWorkflow({
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        width,
        height,
        steps: params.steps ?? COMFYUI_DEFAULTS.STEPS,
        guidance: params.guidance ?? COMFYUI_DEFAULTS.GUIDANCE,
        seed,
      });

      const { images, providerJobId } = await this.executeWorkflowWithJobId(workflow);
      if (!images.length) {
        throw new Error('No images generated');
      }

      const providerAssetId = this.storeAsset(images[0].image, 'image/png', images[0].filename);
      const { buffer } = await this.downloadImage(providerAssetId);
      const dims = tryGetPngDimensions(buffer);

      return {
        buffer,
        providerAssetId,
        mimeType: 'image/png',
        metadata: {
          provider: 'comfyui',
          providerJobId,
          modelId,
          seed,
          width: dims?.width ?? width,
          height: dims?.height ?? height,
        },
      };
    } catch (err) {
      throw new ProviderError({
        provider: 'comfyui',
        code: classifyProviderError(err),
        message: err instanceof Error ? err.message : 'Unknown ComfyUI error',
        cause: err,
      });
    }
  }

  async img2img(params: ComfyImg2ImgParams): Promise<{ assetId: string }> {
    let imageData = params.image;
    const existingAsset = this.getAsset(params.image);
    if (existingAsset) {
      imageData = existingAsset.data;
    }

    const inputFilename = `input_${Date.now()}.png`;
    const workflow = workflows.buildImg2ImgWorkflow({
      inputImage: inputFilename,
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      strength: params.strength ?? COMFYUI_DEFAULTS.STRENGTH,
      steps: params.steps ?? COMFYUI_DEFAULTS.STEPS,
      guidance: params.guidance ?? COMFYUI_DEFAULTS.GUIDANCE,
      seed: params.seed ?? Math.floor(Math.random() * 1000000000),
    });

    const images = await this.executeWorkflow(workflow, [{ name: inputFilename, image: imageData }]);

    if (!images.length) {
      throw new Error('No images generated');
    }

    const assetId = this.storeAsset(images[0].image, 'image/png', images[0].filename);
    return { assetId };
  }

  async img2imgResult(params: ComfyImg2ImgParams): Promise<ImageGenerationResult> {
    try {
      let imageData = params.image;
      const existingAsset = this.getAsset(params.image);
      if (existingAsset) {
        imageData = existingAsset.data;
      }

      const inputFilename = `input_${Date.now()}.png`;
      const seed = params.seed ?? Math.floor(Math.random() * 1000000000);
      const modelId = params.workflow ?? 'comfyui/img2img';

      const workflow = workflows.buildImg2ImgWorkflow({
        inputImage: inputFilename,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        strength: params.strength ?? COMFYUI_DEFAULTS.STRENGTH,
        steps: params.steps ?? COMFYUI_DEFAULTS.STEPS,
        guidance: params.guidance ?? COMFYUI_DEFAULTS.GUIDANCE,
        seed,
      });

      const { images, providerJobId } = await this.executeWorkflowWithJobId(workflow, [{ name: inputFilename, image: imageData }]);
      if (!images.length) {
        throw new Error('No images generated');
      }

      const providerAssetId = this.storeAsset(images[0].image, 'image/png', images[0].filename);
      const { buffer } = await this.downloadImage(providerAssetId);
      const dims = tryGetPngDimensions(buffer);

      return {
        buffer,
        providerAssetId,
        mimeType: 'image/png',
        metadata: {
          provider: 'comfyui',
          providerJobId,
          modelId,
          seed,
          width: dims?.width ?? COMFYUI_DEFAULTS.WIDTH,
          height: dims?.height ?? COMFYUI_DEFAULTS.HEIGHT,
        },
      };
    } catch (err) {
      throw new ProviderError({
        provider: 'comfyui',
        code: classifyProviderError(err),
        message: err instanceof Error ? err.message : 'Unknown ComfyUI error',
        cause: err,
      });
    }
  }

  async removeBackground(params: ComfyRemoveBackgroundParams): Promise<{ assetId: string }> {
    let imageData = params.image;
    const existingAsset = this.getAsset(params.image);
    if (existingAsset) {
      imageData = existingAsset.data;
    }

    const inputFilename = `input_${Date.now()}.png`;
    const workflow = workflows.buildRemoveBackgroundWorkflow({
      inputImage: inputFilename,
      model: params.model ?? COMFYUI_DEFAULTS.BG_REMOVAL_MODEL,
    });

    const images = await this.executeWorkflow(workflow, [{ name: inputFilename, image: imageData }]);

    if (!images.length) {
      throw new Error('No images generated');
    }

    const assetId = this.storeAsset(images[0].image, 'image/png', images[0].filename);
    return { assetId };
  }

  async removeBackgroundResult(params: ComfyRemoveBackgroundParams): Promise<ImageGenerationResult> {
    try {
      let imageData = params.image;
      const existingAsset = this.getAsset(params.image);
      if (existingAsset) {
        imageData = existingAsset.data;
      }

      const inputFilename = `input_${Date.now()}.png`;
      const modelId = params.workflow ?? 'comfyui/remove-background';

      const workflow = workflows.buildRemoveBackgroundWorkflow({
        inputImage: inputFilename,
        model: params.model ?? COMFYUI_DEFAULTS.BG_REMOVAL_MODEL,
      });

      const { images, providerJobId } = await this.executeWorkflowWithJobId(workflow, [{ name: inputFilename, image: imageData }]);
      if (!images.length) {
        throw new Error('No images generated');
      }

      const providerAssetId = this.storeAsset(images[0].image, 'image/png', images[0].filename);
      const { buffer } = await this.downloadImage(providerAssetId);
      const dims = tryGetPngDimensions(buffer);

      return {
        buffer,
        providerAssetId,
        mimeType: 'image/png',
        metadata: {
          provider: 'comfyui',
          providerJobId,
          modelId,
          width: dims?.width ?? COMFYUI_DEFAULTS.WIDTH,
          height: dims?.height ?? COMFYUI_DEFAULTS.HEIGHT,
        },
      };
    } catch (err) {
      throw new ProviderError({
        provider: 'comfyui',
        code: classifyProviderError(err),
        message: err instanceof Error ? err.message : 'Unknown ComfyUI error',
        cause: err,
      });
    }
  }

  async layeredDecompose(params: ComfyLayeredParams): Promise<{ assetIds: string[] }> {
    let imageData = params.image;
    const existingAsset = this.getAsset(params.image);
    if (existingAsset) {
      imageData = existingAsset.data;
    }

    const inputFilename = `input_${Date.now()}.png`;
    const workflow = workflows.buildLayeredDecomposeWorkflow({
      inputImage: inputFilename,
      layerCount: params.layerCount ?? COMFYUI_DEFAULTS.LAYER_COUNT,
      description: params.description,
    });

    const images = await this.executeWorkflow(workflow, [{ name: inputFilename, image: imageData }]);

    if (!images.length) {
      throw new Error('No images generated');
    }

    const assetIds = images.map((img) =>
      this.storeAsset(img.image, 'image/png', img.filename)
    );

    return { assetIds };
  }

  async layeredDecomposeResult(params: ComfyLayeredParams): Promise<LayeredImageGenerationResult> {
    try {
      const result = await this.layeredDecompose(params);
      const layers: ImageGenerationResult[] = [];

      for (const assetId of result.assetIds) {
        const { buffer } = await this.downloadImage(assetId);
        const dims = tryGetPngDimensions(buffer);
        layers.push({
          buffer,
          providerAssetId: assetId,
          mimeType: 'image/png',
          metadata: {
            provider: 'comfyui',
            modelId: params.workflow ?? 'comfyui/layered-decompose',
            width: dims?.width ?? COMFYUI_DEFAULTS.WIDTH,
            height: dims?.height ?? COMFYUI_DEFAULTS.HEIGHT,
          },
        });
      }

      return { layers };
    } catch (err) {
      throw new ProviderError({
        provider: 'comfyui',
        code: classifyProviderError(err),
        message: err instanceof Error ? err.message : 'Unknown ComfyUI error',
        cause: err,
      });
    }
  }

  async uploadImage(imageBuffer: Uint8Array): Promise<string> {
    const base64 = Buffer.from(imageBuffer).toString('base64');
    return this.storeAsset(base64, 'image/png');
  }

  async downloadImage(assetId: string): Promise<{ buffer: Uint8Array; extension: string }> {
    const asset = this.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    const buffer = new Uint8Array(Buffer.from(asset.data, 'base64'));
    const extension = MIME_TO_EXT[asset.mimeType] ?? '.png';

    return { buffer, extension };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function classifyProviderError(err: unknown): ProviderErrorCode {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  if (msg.includes('timed out') || msg.includes('timeout')) return ProviderErrorCode.PROVIDER_TIMEOUT;
  if (msg.includes('cold start')) return ProviderErrorCode.PROVIDER_COLD_START;
  if (msg.includes('workflow') && msg.includes('invalid')) return ProviderErrorCode.WORKFLOW_INVALID;
  if (msg.includes('rate limit') || msg.includes('429')) return ProviderErrorCode.RATE_LIMITED;
  if (msg.includes('upload') && msg.includes('failed')) return ProviderErrorCode.UPLOAD_FAILED;
  if (msg.includes('invalid') || msg.includes('missing')) return ProviderErrorCode.INPUT_INVALID;
  return ProviderErrorCode.UNKNOWN_PROVIDER_ERROR;
}

export function createComfyUIClient(env: {
  COMFYUI_ENDPOINT?: string;
  MODAL_ENDPOINT?: string;
}): ComfyUIClient {
  const endpoint = env.MODAL_ENDPOINT ?? env.COMFYUI_ENDPOINT ?? 'https://hassoncs--slopcade-comfyui-web-img2img.modal.run';

  return new ComfyUIClient({
    endpoint,
    isServerless: false,
  });
}
