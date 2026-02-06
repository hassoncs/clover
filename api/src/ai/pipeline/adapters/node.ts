import type { PipelineAdapters, ImageGenerationAdapter, R2Adapter, SilhouetteAdapter, DebugSink, DebugEvent } from '@/ai/pipeline/types'
import { createScenarioAdapter } from '@/ai/providers/scenario/client'
import { createComfyUIAdapter } from '@/ai/providers/comfyui/client'
import { PROVIDER_DEFAULTS } from '@/ai/providers/contract'

/**
 * Create a Scenario ImageGenerationAdapter for Node.js pipeline usage.
 *
 * This is a thin wrapper around createScenarioAdapter from scenario.ts,
 * providing the same interface used by the rest of the codebase.
 */
export function createNodeScenarioAdapter(config: { apiKey: string; apiSecret: string }): ImageGenerationAdapter {
  return createScenarioAdapter({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  });
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
  onLifecycleUpdate?: (state: ModalLifecycleState) => void;
}

/**
 * Container lifecycle state from Modal's /ready endpoint.
 */
export interface ModalLifecycleState {
  ready: boolean;
  phase: 'initializing' | 'downloading_models' | 'creating_symlinks' | 'starting_comfyui' | 'waiting_for_comfyui' | 'ready' | 'unknown';
  etaSeconds: number;
  elapsedSeconds: number;
  activeJobs: number;
}

/**
 * Human-readable phase descriptions for UI display.
 */
const PHASE_DESCRIPTIONS: Record<ModalLifecycleState['phase'], string> = {
  initializing: 'Container starting...',
  downloading_models: 'Downloading AI models (~17GB)...',
  creating_symlinks: 'Setting up model paths...',
  starting_comfyui: 'Starting ComfyUI server...',
  waiting_for_comfyui: 'Waiting for ComfyUI to be ready...',
  ready: 'Ready',
  unknown: 'Unknown state...',
};

export function createNodeModalAdapter(config: ModalAdapterConfig): ImageGenerationAdapter {
  const endpoint = config.endpoint.replace(/\/$/, '');
  const maxWakeTimeMs = config.maxWakeTimeMs ?? 900000;
  const pollIntervalMs = config.pollIntervalMs ?? 5000;
  const onLifecycleUpdate = config.onLifecycleUpdate;

  const assetStore = new Map<string, { id: string; data: string; mimeType: string }>();

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

  function getReadyEndpoint(): string {
    return endpoint
      .replace('web-generate', 'ready')
      .replace('web-img2img', 'ready')
      .replace('web-controlnet', 'ready')
      .replace('web_generate', 'ready')
      .replace('web_img2img', 'ready');
  }

  async function checkReady(): Promise<ModalLifecycleState> {
    const readyUrl = getReadyEndpoint();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(readyUrl, { 
        method: 'GET',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      if (response.status === 503 || response.status === 404) {
        return {
          ready: false,
          phase: 'initializing',
          etaSeconds: 120,
          elapsedSeconds: 0,
          activeJobs: 0,
        };
      }
      
      if (!response.ok) {
        return {
          ready: false,
          phase: 'unknown',
          etaSeconds: 60,
          elapsedSeconds: 0,
          activeJobs: 0,
        };
      }
      
      const data = await response.json() as {
        ready: boolean;
        phase: string;
        eta_seconds: number;
        elapsed_seconds: number;
        active_jobs: number;
      };
      
      return {
        ready: data.ready,
        phase: (data.phase || 'unknown') as ModalLifecycleState['phase'],
        etaSeconds: data.eta_seconds ?? 60,
        elapsedSeconds: data.elapsed_seconds ?? 0,
        activeJobs: data.active_jobs ?? 0,
      };
    } catch {
      return {
        ready: false,
        phase: 'initializing',
        etaSeconds: 120,
        elapsedSeconds: 0,
        activeJobs: 0,
      };
    }
  }

  function logLifecycleState(state: ModalLifecycleState, elapsedSecs: number): void {
    const phaseDesc = PHASE_DESCRIPTIONS[state.phase] || state.phase;
    const etaInfo = state.etaSeconds > 0 ? ` (ETA: ~${state.etaSeconds}s)` : '';
    console.log(`  ⏳ [${elapsedSecs}s] ${phaseDesc}${etaInfo}`);
  }

  async function waitForReady(): Promise<void> {
    const startTime = Date.now();
    let lastPhase: string | null = null;

    console.log('  🌙 Modal container starting...');
    console.log(`  ⏱️  Max wait time: ${(maxWakeTimeMs / 1000).toFixed(0)}s`);

    while (Date.now() - startTime < maxWakeTimeMs) {
      const elapsedSecs = Math.floor((Date.now() - startTime) / 1000);
      const state = await checkReady();
      
      if (onLifecycleUpdate) {
        onLifecycleUpdate(state);
      }
      
      if (state.ready) {
        console.log(`  ✅ Modal ready! (${elapsedSecs}s total startup time)`);
        return;
      }
      
      if (state.phase !== lastPhase) {
        logLifecycleState(state, elapsedSecs);
        lastPhase = state.phase;
      }
      
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`Modal failed to become ready after ${maxWakeTimeMs / 1000}s`);
  }

  async function wakeModal(): Promise<void> {
    if (isWakingUp && wakeUpPromise) {
      console.log('  ⏳ Another request is waking Modal, waiting...');
      return wakeUpPromise;
    }

    isWakingUp = true;
    wakeUpPromise = waitForReady();

    try {
      await wakeUpPromise;
    } finally {
      isWakingUp = false;
      wakeUpPromise = null;
    }
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
        width: params.width ?? PROVIDER_DEFAULTS.WIDTH,
        height: params.height ?? PROVIDER_DEFAULTS.HEIGHT,
        steps: PROVIDER_DEFAULTS.STEPS,
        guidance: PROVIDER_DEFAULTS.GUIDANCE
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
        strength: params.strength ?? PROVIDER_DEFAULTS.IMG2IMG_STRENGTH,
        steps: PROVIDER_DEFAULTS.STEPS,
        guidance: PROVIDER_DEFAULTS.GUIDANCE
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

/**
 * Create a ComfyUI ImageGenerationAdapter for Node.js pipeline usage.
 *
 * This is a thin wrapper around createComfyUIAdapter from comfyui.ts,
 * providing the same interface used by the rest of the codebase.
 */
export function createNodeComfyUIAdapter(config: ComfyUIAdapterConfig): ImageGenerationAdapter {
  return createComfyUIAdapter({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
  });
}

export interface NodeAdaptersOptions {
  r2Bucket: string;
  wranglerCwd: string;
  publicUrlBase: string;
}

export async function createNodeAdapters(options: NodeAdaptersOptions): Promise<PipelineAdapters> {
  // Read provider from env - default to 'scenario'
  const provider = process.env.IMAGE_GENERATION_PROVIDER ?? 'scenario';
  
  let imageAdapter: ImageGenerationAdapter;
  
  if (provider === 'scenario') {
    // Use Scenario client
    const apiKey = process.env.SCENARIO_API_KEY;
    const apiSecret = process.env.SCENARIO_SECRET_API_KEY;
    
    if (!apiKey || !apiSecret) {
      throw new Error('SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required when using Scenario provider. Use `hush run -- <command>` to inject secrets from the hush vault.');
    }
    
    imageAdapter = createNodeScenarioAdapter({ apiKey, apiSecret });
  } else {
    // Use Modal ComfyUI - alternative provider
    const endpoint = process.env.MODAL_ENDPOINT ?? 'https://hassoncs--slopcade-comfyui-comfyuiworker-web-generate.modal.run';
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
    } else if (event.type === 'stage:skipped') {
      console.log(`  [STAGE] ${event.stageId} ⏭️ SKIPPED`);
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
