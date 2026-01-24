/**
 * Manual end-to-end test for asset generation pipeline
 * 
 * Tests the full flow:
 * 1. Create a silhouette PNG from physics dimensions
 * 2. Upload silhouette to Scenario.com
 * 3. Run img2img generation with the silhouette
 * 4. Remove background from result
 * 5. Save final asset locally
 * 
 * Usage: 
 *   SCENARIO_API_KEY=xxx SCENARIO_SECRET_API_KEY=xxx npx tsx api/scripts/manual-asset-test.ts
 * 
 * Options:
 *   --skip-img2img    Use text-to-image instead of img2img (faster, works around timeouts)
 *   --shape=circle    Use circle shape (default: box)
 *   --width=1.2       Physics width in meters (default: 1.0)
 *   --height=0.5      Physics height in meters (default: 1.0)
 *   --prompt="..."    Custom prompt (default: test prompt)
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const OUTPUT_DIR = path.join(__dirname, '..', 'debug-output', 'manual-test');

interface TestConfig {
  shape: 'box' | 'circle';
  width: number;
  height: number;
  prompt: string;
  skipImg2Img: boolean;
}

function parseArgs(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    shape: 'box',
    width: 1.0,
    height: 1.0,
    prompt: 'pixel art game character, bright colors, transparent background, game sprite',
    skipImg2Img: false,
  };

  for (const arg of args) {
    if (arg === '--skip-img2img') {
      config.skipImg2Img = true;
    } else if (arg.startsWith('--shape=')) {
      const value = arg.split('=')[1];
      if (value === 'circle' || value === 'box') {
        config.shape = value;
      }
    } else if (arg.startsWith('--width=')) {
      config.width = parseFloat(arg.split('=')[1]) || 1.0;
    } else if (arg.startsWith('--height=')) {
      config.height = parseFloat(arg.split('=')[1]) || 1.0;
    } else if (arg.startsWith('--prompt=')) {
      config.prompt = arg.split('=').slice(1).join('=');
    }
  }

  return config;
}

async function createSilhouettePng(
  shape: 'box' | 'circle',
  physicsWidth: number,
  physicsHeight: number,
  canvasSize: number = 512
): Promise<Buffer> {
  const aspectRatio = physicsWidth / physicsHeight;
  
  let shapeWidth: number;
  let shapeHeight: number;
  
  if (aspectRatio >= 1) {
    shapeWidth = Math.floor(canvasSize * 0.9);
    shapeHeight = Math.floor(shapeWidth / aspectRatio);
  } else {
    shapeHeight = Math.floor(canvasSize * 0.9);
    shapeWidth = Math.floor(shapeHeight * aspectRatio);
  }
  
  const x = Math.floor((canvasSize - shapeWidth) / 2);
  const y = Math.floor((canvasSize - shapeHeight) / 2);
  
  let shapeSvg: string;
  if (shape === 'circle') {
    const radius = Math.min(shapeWidth, shapeHeight) / 2;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    shapeSvg = `<svg width="${canvasSize}" height="${canvasSize}">
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="black"/>
    </svg>`;
  } else {
    shapeSvg = `<svg width="${canvasSize}" height="${canvasSize}">
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
      <rect x="${x}" y="${y}" width="${shapeWidth}" height="${shapeHeight}" fill="black" rx="8"/>
    </svg>`;
  }
  
  return sharp(Buffer.from(shapeSvg)).png().toBuffer();
}

class ScenarioClientLocal {
  private apiKey: string;
  private apiSecret: string;
  private apiUrl = 'https://api.scenario.com/v1';

  constructor() {
    this.apiKey = process.env.SCENARIO_API_KEY || '';
    this.apiSecret = process.env.SCENARIO_SECRET_API_KEY || '';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'Missing SCENARIO_API_KEY or SCENARIO_SECRET_API_KEY environment variables'
      );
    }
  }

  private getAuthHeader(): string {
    const credentials = `${this.apiKey}:${this.apiSecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
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
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
      const message = errorData.error?.message ?? errorData.message ?? `HTTP ${response.status}`;
      throw new Error(`Scenario API error: ${message}`);
    }

    return response.json() as Promise<T>;
  }

  async uploadAsset(imageBuffer: Buffer): Promise<string> {
    const base64Image = imageBuffer.toString('base64');

    const response = await this.request<{ asset?: { id?: string } }>('POST', '/assets', {
      image: base64Image,
      name: `test-upload-${Date.now()}`,
    });

    const assetId = response.asset?.id;
    if (!assetId) {
      throw new Error('No asset ID returned from upload');
    }

    return assetId;
  }

  async generateTxt2Img(prompt: string, width: number, height: number): Promise<string[]> {
    const payload = {
      modelId: 'flux.1-dev',
      prompt,
      numSamples: 1,
      width,
      height,
      guidance: 3.5,
      numInferenceSteps: 28,
    };

    const response = await this.request<{ job?: { jobId?: string } }>('POST', '/generate/txt2img', payload);
    const jobId = response.job?.jobId;
    if (!jobId) throw new Error('No jobId returned');

    return this.pollJob(jobId);
  }

  async generateImg2Img(prompt: string, imageAssetId: string, strength: number = 0.95): Promise<string[]> {
    const payload = {
      modelId: 'flux.1-dev',
      prompt,
      image: imageAssetId,
      strength,
      numSamples: 1,
      guidance: 3.5,
      numInferenceSteps: 20,
    };

    const response = await this.request<{ job?: { jobId?: string } }>('POST', '/generate/img2img', payload);
    const jobId = response.job?.jobId;
    if (!jobId) throw new Error('No jobId returned');

    return this.pollJob(jobId);
  }

  async removeBackground(imageAssetId: string): Promise<string> {
    const payload = {
      image: imageAssetId,
      format: 'png',
    };

    const response = await this.request<{ job?: { jobId?: string } }>('POST', '/generate/remove-background', payload);
    const jobId = response.job?.jobId;
    if (!jobId) throw new Error('No jobId returned');

    const assetIds = await this.pollJob(jobId);
    return assetIds[0];
  }

  private async pollJob(jobId: string, maxAttempts = 60): Promise<string[]> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await this.request<{ job?: { status?: string; metadata?: { assetIds?: string[] }; error?: string } }>(
        'GET',
        `/jobs/${jobId}`
      );

      const status = response.job?.status;
      if (status === 'success') {
        return response.job?.metadata?.assetIds ?? [];
      }
      if (status === 'failed' || status === 'cancelled') {
        throw new Error(response.job?.error ?? `Job ${status}`);
      }

      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('Job timed out');
  }

  async downloadAsset(assetId: string): Promise<{ buffer: Buffer; extension: string }> {
    const response = await this.request<{ asset?: { url?: string; mimeType?: string } }>(
      'GET',
      `/assets/${assetId}`
    );

    const url = response.asset?.url;
    if (!url) throw new Error('No URL for asset');

    const imageResponse = await fetch(url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download: ${imageResponse.status}`);
    }

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const mimeType = response.asset?.mimeType ?? 'image/png';
    const extension = mimeType.includes('webp') ? '.webp' : mimeType.includes('jpeg') ? '.jpg' : '.png';

    return { buffer, extension };
  }
}

async function main(): Promise<void> {
  const config = parseArgs();
  const testId = `test-${Date.now()}`;
  
  console.log('🧪 Manual Asset Generation Test\n');
  console.log('Configuration:');
  console.log(`  Shape: ${config.shape}`);
  console.log(`  Dimensions: ${config.width}x${config.height}`);
  console.log(`  Skip img2img: ${config.skipImg2Img}`);
  console.log(`  Prompt: ${config.prompt.substring(0, 50)}...`);
  console.log();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const client = new ScenarioClientLocal();
  const results: Record<string, string> = {};
  const timings: Record<string, number> = {};

  try {
    console.log('📐 Step 1: Creating silhouette...');
    let start = Date.now();
    const silhouetteBuffer = await createSilhouettePng(config.shape, config.width, config.height);
    const silhouettePath = path.join(OUTPUT_DIR, `${testId}_1_silhouette.png`);
    fs.writeFileSync(silhouettePath, silhouetteBuffer);
    timings.silhouette = Date.now() - start;
    results.silhouette = silhouettePath;
    console.log(`   ✅ Saved: ${path.basename(silhouettePath)} (${timings.silhouette}ms)\n`);

    let generatedAssetId: string;
    let generatedBuffer: Buffer;
    let generatedExt: string;

    if (config.skipImg2Img) {
      console.log('🎨 Step 2: Generating via text-to-image (skip img2img)...');
      start = Date.now();
      
      const aspectRatio = config.width / config.height;
      let canvasWidth: number, canvasHeight: number;
      if (aspectRatio >= 1) {
        canvasWidth = 512;
        canvasHeight = Math.round(512 / aspectRatio);
      } else {
        canvasHeight = 512;
        canvasWidth = Math.round(512 * aspectRatio);
      }
      canvasWidth = Math.round(canvasWidth / 64) * 64 || 512;
      canvasHeight = Math.round(canvasHeight / 64) * 64 || 512;

      const assetIds = await client.generateTxt2Img(config.prompt, canvasWidth, canvasHeight);
      generatedAssetId = assetIds[0];
      timings.generate = Date.now() - start;
      console.log(`   ✅ Generated asset: ${generatedAssetId} (${timings.generate}ms)\n`);

    } else {
      console.log('📤 Step 2a: Uploading silhouette...');
      start = Date.now();
      const uploadedAssetId = await client.uploadAsset(silhouetteBuffer);
      timings.upload = Date.now() - start;
      console.log(`   ✅ Uploaded: ${uploadedAssetId} (${timings.upload}ms)\n`);

      console.log('🎨 Step 2b: Generating via img2img...');
      start = Date.now();
      const assetIds = await client.generateImg2Img(config.prompt, uploadedAssetId);
      generatedAssetId = assetIds[0];
      timings.generate = Date.now() - start;
      console.log(`   ✅ Generated asset: ${generatedAssetId} (${timings.generate}ms)\n`);
    }

    console.log('📥 Step 3: Downloading generated image...');
    start = Date.now();
    const generated = await client.downloadAsset(generatedAssetId);
    generatedBuffer = generated.buffer;
    generatedExt = generated.extension;
    const generatedPath = path.join(OUTPUT_DIR, `${testId}_2_generated${generatedExt}`);
    fs.writeFileSync(generatedPath, generatedBuffer);
    timings.downloadGen = Date.now() - start;
    results.generated = generatedPath;
    console.log(`   ✅ Saved: ${path.basename(generatedPath)} (${timings.downloadGen}ms)\n`);

    console.log('✂️ Step 4: Removing background...');
    start = Date.now();
    const noBgAssetId = await client.removeBackground(generatedAssetId);
    timings.removeBg = Date.now() - start;
    console.log(`   ✅ Background removed: ${noBgAssetId} (${timings.removeBg}ms)\n`);

    console.log('📥 Step 5: Downloading final image...');
    start = Date.now();
    const final = await client.downloadAsset(noBgAssetId);
    const finalPath = path.join(OUTPUT_DIR, `${testId}_3_final.png`);
    fs.writeFileSync(finalPath, final.buffer);
    timings.downloadFinal = Date.now() - start;
    results.final = finalPath;
    console.log(`   ✅ Saved: ${path.basename(finalPath)} (${timings.downloadFinal}ms)\n`);

    const totalTime = Object.values(timings).reduce((a, b) => a + b, 0);
    console.log('═'.repeat(50));
    console.log('📊 Results Summary');
    console.log('═'.repeat(50));
    console.log(`  Total time: ${(totalTime / 1000).toFixed(1)}s`);
    console.log();
    console.log('  Timing breakdown:');
    for (const [key, ms] of Object.entries(timings)) {
      console.log(`    ${key}: ${ms}ms`);
    }
    console.log();
    console.log('  Output files:');
    for (const [key, filePath] of Object.entries(results)) {
      console.log(`    ${key}: ${path.basename(filePath)}`);
    }
    console.log();
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log('\n✅ Test completed successfully!');

    const metadataPath = path.join(OUTPUT_DIR, `${testId}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify({
      testId,
      config,
      timings,
      results: Object.fromEntries(
        Object.entries(results).map(([k, v]) => [k, path.basename(v)])
      ),
      totalTimeMs: totalTime,
    }, null, 2));

  } catch (err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

main();
