import type {
  ScenarioConfig,
  GenerationParams,
  ThirdPartyGenerationParams,
  Img2ImgParams,
  RemoveBackgroundParams,
  JobResponse,
  AssetResponse,
  GenerationResult,
  JobStatus,
  ModelsResponse,
  Model,
  UploadResponse,
} from './scenario-types';
import {
  SCENARIO_DEFAULTS,
  CUSTOM_MODEL_PREFIXES,
  MIME_TO_EXT,
} from './scenario-types';

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
        'Scenario API credentials required. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.'
      );
    }
  }

  private getAuthHeader(): string {
    const credentials = `${this.apiKey}:${this.apiSecret}`;
    return `Basic ${btoa(credentials)}`;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: HeadersInit = {
      Authorization: this.getAuthHeader(),
      'Content-Type': 'application/json',
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
    if (!modelId.startsWith('model_')) {
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
      Math.min(5, params.guidance ?? SCENARIO_DEFAULTS.DEFAULT_GUIDANCE)
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

    const isFluxModel = modelId.includes('flux');
    if (params.negativePrompt && !isFluxModel) {
      payload.negativePrompt = params.negativePrompt;
      payload.negativePromptStrength = 1.0;
    }

    if (params.seed) {
      payload.seed = params.seed;
    }

    const response = await this.request<{ job?: { jobId?: string } }>(
      'POST',
      '/generate/txt2img',
      payload
    );

    const jobId = response.job?.jobId;
    if (!jobId) {
      throw new Error('No jobId returned from API');
    }

    return jobId;
  }

  async createThirdPartyJob(params: ThirdPartyGenerationParams): Promise<string> {
    const { modelId, prompt, numSamples = 1, aspectRatio = '1:1', seed } = params;

    const payload: Record<string, unknown> = {
      prompt,
      numSamples,
      aspectRatio,
    };

    if (seed) {
      payload.seed = seed;
    }

    const response = await this.request<{ job?: { jobId?: string } }>(
      'POST',
      `/generate/custom/${modelId}`,
      payload
    );

    const jobId = response.job?.jobId;
    if (!jobId) {
      throw new Error('No jobId returned from API');
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

    const response = await this.request<{ job?: { jobId?: string } }>(
      'POST',
      '/generate/img2img',
      payload
    );

    const jobId = response.job?.jobId;
    if (!jobId) {
      throw new Error('No jobId returned from API');
    }

    return jobId;
  }

  async createRemoveBackgroundJob(params: RemoveBackgroundParams): Promise<string> {
    const payload: Record<string, unknown> = {
      image: params.image,
      format: params.format ?? 'png',
    };

    if (params.backgroundColor) {
      payload.backgroundColor = params.backgroundColor;
    }

    const response = await this.request<{ job?: { jobId?: string } }>(
      'POST',
      '/generate/remove-background',
      payload
    );

    const jobId = response.job?.jobId;
    if (!jobId) {
      throw new Error('No jobId returned from API');
    }

    return jobId;
  }

  async pollJobUntilComplete(jobId: string): Promise<string[]> {
    for (let attempt = 0; attempt < SCENARIO_DEFAULTS.MAX_POLL_ATTEMPTS; attempt++) {
      const response = await this.request<JobResponse>('GET', `/jobs/${jobId}`);
      const job = response.job;

      if (!job) {
        throw new Error('Invalid job response');
      }

      const status: JobStatus = job.status;

      if (status === 'success') {
        const assetIds = job.metadata?.assetIds ?? [];
        if (assetIds.length === 0) {
          throw new Error('No assets generated');
        }
        return assetIds;
      }

      if (status === 'failed' || status === 'cancelled') {
        throw new Error(job.error ?? `Job ${status}`);
      }

      await this.sleep(SCENARIO_DEFAULTS.POLL_INTERVAL_MS);
    }

    throw new Error('Job timed out');
  }

  async getAssetDetails(
    assetId: string
  ): Promise<{ url: string; mimeType?: string }> {
    const response = await this.request<AssetResponse>(
      'GET',
      `/assets/${assetId}`
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
    const { url, mimeType } = await this.getAssetDetails(assetId);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download asset: HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const extension = MIME_TO_EXT[mimeType ?? ''] ?? '.png';

    return { buffer, mimeType: mimeType ?? 'image/png', extension };
  }

  async uploadAsset(imageBuffer: ArrayBuffer, name?: string): Promise<string> {
    const base64Image = this.arrayBufferToBase64(imageBuffer);

    const response = await this.request<UploadResponse>('POST', '/assets', {
      image: base64Image,
      name: name ?? `upload-${Date.now()}`,
    });

    const assetId = response.asset?.id;
    if (!assetId) {
      throw new Error('No asset ID returned from upload');
    }

    return assetId;
  }

  async listModels(includePublic = false): Promise<Model[]> {
    const endpoint = includePublic ? '/models/public' : '/models';
    const response = await this.request<ModelsResponse>('GET', endpoint);
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

  async removeBackground(params: RemoveBackgroundParams): Promise<string> {
    const jobId = await this.createRemoveBackgroundJob(params);
    const assetIds = await this.pollJobUntilComplete(jobId);

    if (assetIds.length === 0) {
      throw new Error('No assets generated from background removal');
    }

    return assetIds[0];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
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
      'Missing Scenario API credentials. Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY.'
    );
  }

  return new ScenarioClient({
    apiKey,
    apiSecret,
    apiUrl: env.SCENARIO_API_URL,
  });
}
