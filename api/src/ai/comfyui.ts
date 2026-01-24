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
    this.isServerless = config.isServerless ?? this.endpoint.includes('runpod.ai');
    this.timeout = config.timeout ?? COMFYUI_DEFAULTS.TIMEOUT_MS;

    if (this.isServerless && !this.apiKey) {
      throw new Error('RunPod API key required for serverless endpoints');
    }
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

export function createComfyUIClient(env: {
  COMFYUI_ENDPOINT?: string;
  RUNPOD_API_KEY?: string;
  RUNPOD_ENDPOINT_ID?: string;
}): ComfyUIClient {
  let endpoint = env.COMFYUI_ENDPOINT;

  if (!endpoint && env.RUNPOD_ENDPOINT_ID) {
    endpoint = `https://api.runpod.ai/v2/${env.RUNPOD_ENDPOINT_ID}`;
  }

  if (!endpoint) {
    throw new Error(
      'ComfyUI endpoint required. Set COMFYUI_ENDPOINT or RUNPOD_ENDPOINT_ID.'
    );
  }

  return new ComfyUIClient({
    endpoint,
    apiKey: env.RUNPOD_API_KEY,
  });
}
