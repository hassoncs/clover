import type { PipelineAdapters, ImageGenerationAdapter, R2Adapter, SilhouetteAdapter, DebugSink, DebugEvent } from '@/ai/pipeline/types'
import { ComfyUIClient } from '@/ai/comfyui'

const SCENARIO_API_URL = 'https://api.cloud.scenario.com/v1';

interface NodeScenarioConfig {
  apiKey: string;
  apiSecret: string;
}

function getAuthHeader(config: NodeScenarioConfig): string {
  return `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`;
}

async function scenarioRequest<T>(
  config: NodeScenarioConfig,
  method: 'GET' | 'POST',
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${SCENARIO_API_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: getAuthHeader(config),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
    throw new Error(`Scenario API: ${err.error?.message ?? err.message ?? response.status}`);
  }

  return response.json() as Promise<T>;
}

async function pollJob(config: NodeScenarioConfig, jobId: string, maxAttempts = 120): Promise<string[]> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await scenarioRequest<{ job?: { status?: string; metadata?: { assetIds?: string[] }; error?: string } }>(
      config,
      'GET',
      `/jobs/${jobId}`
    );
    const status = res.job?.status;

    if (status === 'success') {
      return res.job?.metadata?.assetIds ?? [];
    }
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(res.job?.error ?? `Job ${status}`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Job timed out after ${maxAttempts * 2} seconds`);
}

export function createNodeScenarioAdapter(config: NodeScenarioConfig): ImageGenerationAdapter {
  return {
    async uploadImage(png: Uint8Array): Promise<string> {
      const res = await scenarioRequest<{ asset?: { id?: string } }>(config, 'POST', '/assets', {
        image: Buffer.from(png).toString('base64'),
        name: `silhouette-${Date.now()}`,
      });
      if (!res.asset?.id) throw new Error('No asset ID from upload');
      return res.asset.id;
    },

    async txt2img(params): Promise<{ assetId: string }> {
      const res = await scenarioRequest<{ job?: { jobId?: string } }>(config, 'POST', '/generate/txt2img', {
        modelId: 'flux.1-dev',
        prompt: params.prompt,
        numSamples: 1,
        guidance: 3.5,
        numInferenceSteps: 28,
        width: params.width ?? 1024,
        height: params.height ?? 1024,
      });
      if (!res.job?.jobId) throw new Error('No jobId returned');
      const assetIds = await pollJob(config, res.job.jobId);
      return { assetId: assetIds[0] };
    },

    async img2img(params): Promise<{ assetId: string }> {
      const res = await scenarioRequest<{ job?: { jobId?: string } }>(config, 'POST', '/generate/img2img', {
        modelId: 'flux.1-dev',
        prompt: params.prompt,
        image: params.imageAssetId,
        strength: params.strength ?? 0.95,
        numSamples: 1,
        guidance: 3.5,
        numInferenceSteps: 28,
      });
      if (!res.job?.jobId) throw new Error('No jobId returned');
      const assetIds = await pollJob(config, res.job.jobId);
      return { assetId: assetIds[0] };
    },

    async downloadImage(assetId: string): Promise<{ buffer: Uint8Array; extension: string }> {
      const res = await scenarioRequest<{ asset?: { url?: string; mimeType?: string } }>(
        config,
        'GET',
        `/assets/${assetId}`
      );
      if (!res.asset?.url) throw new Error('No URL');
      const imgRes = await fetch(res.asset.url);
      if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`);
      const buffer = new Uint8Array(await imgRes.arrayBuffer());
      const ext = res.asset.mimeType?.includes('webp') ? '.webp' : res.asset.mimeType?.includes('jpeg') ? '.jpg' : '.png';
      return { buffer, extension: ext };
    },

    async removeBackground(assetId: string): Promise<{ assetId: string }> {
      const res = await scenarioRequest<{ job?: { jobId?: string } }>(config, 'POST', '/generate/remove-background', {
        image: assetId,
        format: 'png',
      });
      if (!res.job?.jobId) throw new Error('No jobId');
      const assetIds = await pollJob(config, res.job.jobId, 60);
      return { assetId: assetIds[0] };
    },

    async layeredDecompose(params): Promise<{ assetIds: string[] }> {
      const res = await scenarioRequest<{ job?: { jobId?: string } }>(config, 'POST', '/generate/layered', {
        image: params.imageAssetId,
        layersCount: params.layerCount,
        description: params.description,
      });
      if (!res.job?.jobId) throw new Error('No jobId');
      const assetIds = await pollJob(config, res.job.jobId, 120);
      return { assetIds };
    },
  };
}

interface NodeR2Config {
  bucket: string;
  wranglerCwd: string;
  publicUrlBase: string;
}

export function createNodeR2Adapter(config: NodeR2Config): R2Adapter {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  return {
    async put(key: string, body: Uint8Array, options?: { contentType?: string }): Promise<void> {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'r2-upload-'));
      const tmpFile = path.join(tmpDir, 'upload.png');
      
      try {
        fs.writeFileSync(tmpFile, Buffer.from(body));
        const contentType = options?.contentType ?? 'image/png';
        execSync(
          `npx wrangler r2 object put "${config.bucket}/${key}" --file="${tmpFile}" --content-type="${contentType}" --remote`,
          { stdio: 'pipe', cwd: config.wranglerCwd }
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    },

    getPublicUrl(key: string): string {
      return `${config.publicUrlBase}/${key}`;
    },
  };
}

export async function createNodeSilhouetteAdapter(): Promise<SilhouetteAdapter> {
  const sharp = (await import('sharp')).default;

  return {
    async createSilhouette(params): Promise<Uint8Array> {
      const canvasSize = params.canvasSize ?? 512;
      const fillColor = params.color ?? '#808080';
      const aspectRatio = params.width / params.height;

      let shapeWidth: number, shapeHeight: number;
      if (aspectRatio >= 1) {
        shapeWidth = Math.floor(canvasSize * 0.9);
        shapeHeight = Math.floor(shapeWidth / aspectRatio);
      } else {
        shapeHeight = Math.floor(canvasSize * 0.9);
        shapeWidth = Math.floor(shapeHeight * aspectRatio);
      }

      const x = Math.floor((canvasSize - shapeWidth) / 2);
      const y = Math.floor((canvasSize - shapeHeight) / 2);

      const minDimension = Math.min(shapeWidth, shapeHeight);
      const needsStroke = minDimension < 30;
      const strokeWidth = needsStroke ? Math.max(4, Math.floor(minDimension * 0.3)) : 0;
      const strokeAttr = needsStroke ? `stroke="#333333" stroke-width="${strokeWidth}"` : '';

      let svg: string;
      if (params.shape === 'circle') {
        const radius = Math.min(shapeWidth, shapeHeight) / 2;
        svg = `<svg width="${canvasSize}" height="${canvasSize}">
          <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
          <circle cx="${canvasSize/2}" cy="${canvasSize/2}" r="${radius}" fill="${fillColor}" ${strokeAttr}/>
        </svg>`;
      } else {
        svg = `<svg width="${canvasSize}" height="${canvasSize}">
          <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
          <rect x="${x}" y="${y}" width="${shapeWidth}" height="${shapeHeight}" fill="${fillColor}" rx="8" ${strokeAttr}/>
        </svg>`;
      }

      const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
      return new Uint8Array(buffer);
    },
  };
}

interface ComfyUIAdapterConfig {
  endpoint: string;
  apiKey?: string;
}

interface ModalAdapterConfig {
  endpoint: string;
  maxWakeTimeMs?: number;
  pollIntervalMs?: number;
}

/**
 * Creates a Modal-aware image generation adapter with auto-wake functionality.
 * Handles Modal's cold start gracefully with clear status messages.
 */
export function createNodeModalAdapter(config: ModalAdapterConfig): ImageGenerationAdapter {
  const endpoint = config.endpoint.replace(/\/$/, '');
  const maxWakeTimeMs = config.maxWakeTimeMs ?? 900000;
  const pollIntervalMs = config.pollIntervalMs ?? 5000;

  const assetStore = new Map<string, { id: string; data: string; mimeType: string }>();

  // Global coordination to prevent multiple cold-starts
  let wakeUpPromise: Promise<void> | null = null;
  let isWakingUp = false;

  function generateAssetId(): string {
    return `modal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  function storeAsset(data: string, mimeType: string): string {
    const id = generateAssetId();
    assetStore.set(id, { id, data, mimeType });
    return id;
  }

  function getAsset(id: string) {
    return assetStore.get(id);
  }

  async function wakeModal(): Promise<void> {
    // If already waking up, wait for that to complete
    if (isWakingUp && wakeUpPromise) {
      console.log('  ⏳ Another request is waking Modal, waiting...');
      return wakeUpPromise;
    }

    // Start the wake-up process
    isWakingUp = true;
    wakeUpPromise = doWakeModal();

    try {
      await wakeUpPromise;
    } finally {
      isWakingUp = false;
      wakeUpPromise = null;
    }
  }

  async function doWakeModal(): Promise<void> {
    const startTime = Date.now();
    let attempt = 0;
    let lastStatus: string | null = null;

    console.log('  🌙 Modal is sleeping, waking it up...');
    console.log(`  ⏱️  Max wait time: ${(maxWakeTimeMs / 1000).toFixed(0)}s`);
    console.log('  📡 Sending wake-up pings...');

    while (Date.now() - startTime < maxWakeTimeMs) {
      attempt++;
      const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'ping',
            image_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            strength: 0.1,
            steps: 1
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 200) {
          console.log(`  ✅ Modal woke up! (${elapsedSecs}s, ${attempt} attempts)`);
          return;
        }

        if (response.status === 503) {
          const status = `  ⏳ Container starting... (${elapsedSecs}s elapsed)`;
          if (status !== lastStatus) {
            console.log(status);
            lastStatus = status;
          }
        } else if (response.status === 404) {
          const status = `  🔍 Endpoint not ready... (${elapsedSecs}s elapsed)`;
          if (status !== lastStatus) {
            console.log(status);
            lastStatus = status;
          }
        } else {
          const status = `  ⚠️  Status ${response.status}... (${elapsedSecs}s elapsed)`;
          if (status !== lastStatus) {
            console.log(status);
            lastStatus = status;
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('abort')) {
          const status = `  ⏱️  Request timeout, still waking... (${elapsedSecs}s elapsed)`;
          if (status !== lastStatus) {
            console.log(status);
            lastStatus = status;
          }
        } else {
          const status = `  🔄 Connection error, retrying... (${elapsedSecs}s elapsed)`;
          if (status !== lastStatus) {
            console.log(status);
            lastStatus = status;
          }
        }
      }

      await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`Modal failed to wake up after ${maxWakeTimeMs / 1000}s`);
  }

  async function modalRequest(payload: unknown): Promise<{ success: boolean; image_base64?: string; error?: string }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 503 || response.status === 404) {
          if (attempt === 0) {
            await wakeModal();
            continue;
          } else {
            throw new Error('Modal returned 503 even after wake attempt');
          }
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Modal error ${response.status}: ${text}`);
        }

        return await response.json() as { success: boolean; image_base64?: string; error?: string };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === 0 && (lastError.message.includes('fetch failed') || lastError.message.includes('ECONNREFUSED'))) {
          await wakeModal();
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Modal request failed');
  }

  return {
    async uploadImage(png: Uint8Array): Promise<string> {
      const base64 = Buffer.from(png).toString('base64');
      return storeAsset(base64, 'image/png');
    },

    async txt2img(params): Promise<{ assetId: string }> {
      console.log('  🎨 Generating image with Modal...');
      const startTime = Date.now();

      const result = await modalRequest({
        prompt: params.prompt,
        width: params.width ?? 512,
        height: params.height ?? 512,
        steps: 20,
        guidance: 3.5
      });

      if (!result.success || !result.image_base64) {
        throw new Error(result.error || 'Modal generation failed');
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ✅ Generated in ${duration}s`);

      const assetId = storeAsset(result.image_base64, 'image/png');
      return { assetId };
    },

    async img2img(params): Promise<{ assetId: string }> {
      console.log('  🎨 Transforming image with Modal...');
      const startTime = Date.now();

      const asset = getAsset(params.imageAssetId);
      if (!asset) {
        throw new Error(`Asset not found: ${params.imageAssetId}`);
      }

      const result = await modalRequest({
        prompt: params.prompt,
        image_base64: asset.data,
        strength: params.strength ?? 0.5,
        steps: 20,
        guidance: 3.5
      });

      if (!result.success || !result.image_base64) {
        throw new Error(result.error || 'Modal img2img failed');
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ✅ Transformed in ${duration}s`);

      const assetId = storeAsset(result.image_base64, 'image/png');
      return { assetId };
    },

    async downloadImage(assetId: string): Promise<{ buffer: Uint8Array; extension: string }> {
      const asset = getAsset(assetId);
      if (!asset) {
        throw new Error(`Asset not found: ${assetId}`);
      }

      const buffer = Buffer.from(asset.data, 'base64');
      return { buffer: new Uint8Array(buffer), extension: '.png' };
    },

    async removeBackground(assetId: string): Promise<{ assetId: string }> {
      return { assetId };
    },

    async layeredDecompose(): Promise<{ assetIds: string[] }> {
      throw new Error('Layered decompose not supported in Modal adapter');
    },
  };
}

export function createNodeComfyUIAdapter(config: ComfyUIAdapterConfig): ImageGenerationAdapter {
  const client = new ComfyUIClient({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
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

export interface NodeAdaptersOptions {
  r2Bucket: string;
  wranglerCwd: string;
  publicUrlBase: string;
}

export async function createNodeAdapters(options: NodeAdaptersOptions): Promise<PipelineAdapters> {
  // Read provider from env - default to 'modal'
  const provider = process.env.IMAGE_GENERATION_PROVIDER ?? 'modal';
  
  let imageAdapter: ImageGenerationAdapter;
  
  if (provider === 'scenario') {
    // Use Scenario client
    const apiKey = process.env.SCENARIO_API_KEY;
    const apiSecret = process.env.SCENARIO_SECRET_API_KEY;
    
    if (!apiKey || !apiSecret) {
      throw new Error('SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required when using Scenario provider');
    }
    
    imageAdapter = createNodeScenarioAdapter({ apiKey, apiSecret });
  } else {
    // Use Modal ComfyUI - default provider
    const endpoint = process.env.MODAL_ENDPOINT ?? 'https://hassoncs--slopcade-comfyui-web-generate.modal.run';
    imageAdapter = createNodeModalAdapter({ endpoint });
  }

  return {
    provider: imageAdapter,
    r2: createNodeR2Adapter({
      bucket: options.r2Bucket,
      wranglerCwd: options.wranglerCwd,
      publicUrlBase: options.publicUrlBase,
    }),
    silhouette: await createNodeSilhouetteAdapter(),
  };
}

export function createFileDebugSink(outputDir: string): DebugSink {
  const fs = require('fs');
  const path = require('path');

  fs.mkdirSync(outputDir, { recursive: true });

  return async (event: DebugEvent) => {
    if (event.type === 'artifact') {
      const assetDir = path.join(outputDir, event.assetId);
      fs.mkdirSync(assetDir, { recursive: true });

      const filename = `${event.stageId}_${event.name}`;
      const filepath = path.join(assetDir, filename);

      if (typeof event.data === 'string') {
        fs.writeFileSync(filepath, event.data, 'utf-8');
      } else {
        fs.writeFileSync(filepath, Buffer.from(event.data));
      }

      console.log(`  [DEBUG] Saved: ${filepath}`);
    } else if (event.type === 'stage:start') {
      console.log(`  [STAGE] ${event.stageId} starting...`);
    } else if (event.type === 'stage:end') {
      const status = event.ok ? '✅' : '❌';
      console.log(`  [STAGE] ${event.stageId} ${status} (${event.durationMs}ms)${event.error ? ` - ${event.error}` : ''}`);
    } else if (event.type === 'run:start') {
      console.log(`\n[ASSET] ${event.assetId} (${event.assetType})`);
    } else if (event.type === 'run:end') {
      const status = event.ok ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`[ASSET] ${event.assetId} ${status} (${event.durationMs}ms)`);
      if (event.r2Keys?.length) {
        console.log(`  R2 Keys: ${event.r2Keys.join(', ')}`);
      }

      const assetDir = path.join(outputDir, event.assetId);
      fs.mkdirSync(assetDir, { recursive: true });
      const metadataPath = path.join(assetDir, 'metadata.json');

      const metadata = {
        gameId: event.gameId,
        packId: event.packId,
        assetId: event.generatedAssetId,
        specId: event.assetId,
        r2Key: event.r2Keys?.[0],
        publicUrl: event.publicUrls?.[0],
        pipelineRunId: event.runId,
        generatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      console.log(`  [DEBUG] Saved: ${metadataPath}`);
    }
  };
}
