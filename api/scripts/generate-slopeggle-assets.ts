#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

const OUTPUT_DIR = path.join(__dirname, '..', 'debug-output', 'slopeggle');
const GAME_ASSETS_DIR = path.join(__dirname, '..', '..', 'app', 'public', 'assets', 'games', 'slopeggle');
const R2_BUCKET = 'slopcade-assets';
const R2_PREFIX = 'generated/slopeggle';

const GAME_TITLE = 'Slopeggle';
const GAME_THEME = "whimsical pachinko arcade, glowing neon, magical sparkles";

async function uploadToR2(filePath: string, fileName: string): Promise<string> {
  const r2Key = `${R2_PREFIX}/${fileName}`;
  log('☁️', `Uploading to R2: ${r2Key}`, 2);
  try {
    execSync(
      `npx wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${filePath}" --content-type="image/png" --remote`,
      { stdio: 'pipe', cwd: path.join(__dirname, '..') }
    );
    log('✅', `Uploaded to R2: ${r2Key}`, 2);
    return r2Key;
  } catch (e) {
    log('❌', `R2 upload failed: ${e}`, 2);
    throw e;
  }
}

type EntityType = 'character' | 'enemy' | 'item' | 'platform' | 'background' | 'ui';
type SpriteStyle = 'pixel' | 'cartoon' | '3d' | 'flat';

interface TemplateSpec {
  id: string;
  shape: 'box' | 'circle';
  width: number;
  height: number;
  entityType: EntityType;
  color: string;
  description?: string;
  skipGeneration?: boolean;
}

const PEG_RADIUS = 0.125;
const BALL_RADIUS = 0.15;

const SLOPEGGLE_TEMPLATES: TemplateSpec[] = [
  { id: 'ball', shape: 'circle', width: BALL_RADIUS * 2, height: BALL_RADIUS * 2, entityType: 'item', color: '#FFFFFF', description: 'a shiny chrome pinball with reflective highlights' },
  { id: 'bluePeg', shape: 'circle', width: PEG_RADIUS * 2, height: PEG_RADIUS * 2, entityType: 'item', color: '#3B82F6', description: 'a glowing blue orb peg with inner light, like a magical gem' },
  { id: 'orangePeg', shape: 'circle', width: PEG_RADIUS * 2, height: PEG_RADIUS * 2, entityType: 'item', color: '#F97316', description: 'a glowing orange orb peg with fiery inner light, like a magical gem' },
  { id: 'cannon', shape: 'box', width: 0.6, height: 0.25, entityType: 'ui', color: '#4A5568', description: 'a sleek futuristic ball launcher cannon, metallic with neon accents' },
  { id: 'cannonBase', shape: 'circle', width: 0.6, height: 0.6, entityType: 'ui', color: '#2D3748', description: 'a circular metallic base for a cannon, with tech details' },
  { id: 'bucket', shape: 'box', width: 1.2, height: 0.35, entityType: 'item', color: '#22C55E', description: 'a glowing green catch bucket that slides back and forth, arcade style' },
  { id: 'portalA', shape: 'circle', width: 0.8, height: 0.8, entityType: 'item', color: '#00FFFF', description: 'a swirling cyan portal vortex with magical energy' },
  { id: 'portalB', shape: 'circle', width: 0.8, height: 0.8, entityType: 'item', color: '#00FFFF', description: 'a swirling cyan portal vortex with magical energy' },
  { id: 'drain', shape: 'box', width: 12, height: 1, entityType: 'ui', color: 'transparent', skipGeneration: true },
  { id: 'wallVertical', shape: 'box', width: 0.2, height: 16, entityType: 'platform', color: '#1e3a5f', skipGeneration: true },
];

const STYLE_DESCRIPTORS: Record<SpriteStyle, { aesthetic: string; technical: string }> = {
  pixel: {
    aesthetic: 'pixel art, 16-bit retro game style, crisp pixels',
    technical: 'no anti-aliasing, sharp pixel edges, limited color palette',
  },
  cartoon: {
    aesthetic: 'cartoon style, bold black outlines, vibrant saturated colors',
    technical: 'cel-shaded, clean vector-like edges, flat color fills',
  },
  '3d': {
    aesthetic: '3D rendered, stylized low-poly, soft ambient occlusion',
    technical: 'clean geometry, subtle shadows, matte materials',
  },
  flat: {
    aesthetic: 'flat design, geometric shapes, modern minimal',
    technical: 'no gradients, solid colors, clean vector shapes',
  },
};

type PipelineType = 'sprites' | 'background' | 'title-hero';

interface Config {
  dryRun: boolean;
  templateFilter?: string;
  theme: string;
  style: SpriteStyle;
  only?: PipelineType[];
}

function parseArgs(): Config {
  const args = process.argv.slice(2);
  const config: Config = {
    dryRun: false,
    theme: GAME_THEME,
    style: 'cartoon',
  };

  for (const arg of args) {
    if (arg === '--dry-run') config.dryRun = true;
    else if (arg.startsWith('--template=')) config.templateFilter = arg.split('=')[1];
    else if (arg.startsWith('--theme=')) config.theme = arg.split('=').slice(1).join('=');
    else if (arg.startsWith('--style=')) {
      const style = arg.split('=')[1] as SpriteStyle;
      if (['pixel', 'cartoon', '3d', 'flat'].includes(style)) config.style = style;
    } else if (arg.startsWith('--only=')) {
      const types = arg.split('=')[1].split(',') as PipelineType[];
      config.only = types.filter(t => ['sprites', 'background', 'title-hero'].includes(t));
    }
  }

  return config;
}

function shouldRun(config: Config, pipeline: PipelineType): boolean {
  if (!config.only || config.only.length === 0) return true;
  return config.only.includes(pipeline);
}

function describeShapeSilhouette(shape: 'box' | 'circle', width: number, height: number): string {
  if (shape === 'circle') {
    return 'PERFECTLY CIRCULAR. The object is round like a ball or orb.';
  }
  const ratio = width / height;
  if (ratio > 4) return `EXTREMELY WIDE HORIZONTAL BAR (${ratio.toFixed(1)}:1).`;
  if (ratio > 2) return `WIDE HORIZONTAL RECTANGLE (${ratio.toFixed(1)}:1).`;
  if (ratio > 1.2) return `SLIGHTLY WIDE RECTANGLE (${ratio.toFixed(1)}:1).`;
  if (ratio > 0.8) return `SQUARE-ISH (${ratio.toFixed(2)}:1).`;
  if (ratio > 0.5) return `SLIGHTLY TALL RECTANGLE (1:${(1/ratio).toFixed(1)}).`;
  return `TALL VERTICAL RECTANGLE (1:${(1/ratio).toFixed(1)}).`;
}

function buildPrompt(template: TemplateSpec, theme: string, style: SpriteStyle): string {
  const styleDesc = STYLE_DESCRIPTORS[style];
  const shapeDesc = describeShapeSilhouette(template.shape, template.width, template.height);

  const subjectDescription = template.description 
    ? `${template.description}`
    : `${theme} themed ${template.id}`;

  const lines = [
    '=== CAMERA/VIEW (CRITICAL) ===',
    'FRONT VIEW. Camera is directly facing the front of the object.',
    'Flat, 2D perspective. NO 3D rotation, NO angled view.',
    '',
    '=== SHAPE (CRITICAL) ===',
    shapeDesc,
    '',
    '=== COMPOSITION ===',
    'The object FILLS THE ENTIRE FRAME. No empty space around it.',
    '',
    '=== SUBJECT ===',
    `A ${subjectDescription} for a video game.`,
    `Style: ${theme}`,
    '',
    '=== STYLE ===',
    styleDesc.aesthetic,
    '',
    '=== TECHNICAL ===',
    'Transparent background (alpha channel).',
    styleDesc.technical,
    'Single object only, no duplicates.',
    'No text, watermarks, or signatures.',
  ];

  return lines.join('\n');
}

function buildNegativePrompt(style: SpriteStyle): string {
  const base = ['blurry', 'low quality', 'text', 'watermark', 'signature', 'cropped', 'multiple objects'];
  const styleSpecific: Record<SpriteStyle, string[]> = {
    pixel: ['anti-aliasing', 'smooth gradients', '3d render', 'realistic'],
    cartoon: ['realistic', 'photo', 'noisy', 'grainy'],
    '3d': ['2d flat', 'sketch', 'drawing'],
    flat: ['gradients', 'shadows', '3d', 'realistic'],
  };
  return [...base, ...styleSpecific[style]].join(', ');
}

async function createSilhouettePng(
  shape: 'box' | 'circle',
  physicsWidth: number,
  physicsHeight: number,
  canvasSize: number = 512
): Promise<Buffer> {
  const aspectRatio = physicsWidth / physicsHeight;

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

  let svg: string;
  if (shape === 'circle') {
    const radius = Math.min(shapeWidth, shapeHeight) / 2;
    svg = `<svg width="${canvasSize}" height="${canvasSize}">
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
      <circle cx="${canvasSize/2}" cy="${canvasSize/2}" r="${radius}" fill="black"/>
    </svg>`;
  } else {
    svg = `<svg width="${canvasSize}" height="${canvasSize}">
      <rect width="${canvasSize}" height="${canvasSize}" fill="white"/>
      <rect x="${x}" y="${y}" width="${shapeWidth}" height="${shapeHeight}" fill="black" rx="8"/>
    </svg>`;
  }

  return sharp(Buffer.from(svg)).png().toBuffer();
}

class ScenarioClient {
  private apiKey: string;
  private apiSecret: string;
  private apiUrl = 'https://api.cloud.scenario.com/v1';

  constructor() {
    this.apiKey = process.env.SCENARIO_API_KEY || '';
    this.apiSecret = process.env.SCENARIO_SECRET_API_KEY || '';
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Missing SCENARIO_API_KEY or SCENARIO_SECRET_API_KEY');
    }
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`;
  }

  private async request<T>(method: 'GET' | 'POST', endpoint: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: { Authorization: this.getAuthHeader(), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
      throw new Error(`Scenario API: ${err.error?.message ?? err.message ?? response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async uploadAsset(buffer: Buffer): Promise<string> {
    const res = await this.request<{ asset?: { id?: string } }>('POST', '/assets', {
      image: buffer.toString('base64'),
      name: `silhouette-${Date.now()}`,
    });
    if (!res.asset?.id) throw new Error('No asset ID from upload');
    return res.asset.id;
  }

  async generateImg2Img(prompt: string, imageAssetId: string): Promise<string[]> {
    log('📤', 'Firing img2img request...', 2);
    const res = await this.request<{ job?: { jobId?: string } }>('POST', '/generate/img2img', {
      modelId: 'flux.1-dev',
      prompt,
      image: imageAssetId,
      strength: 0.95,
      numSamples: 1,
      guidance: 3.5,
      numInferenceSteps: 28,
    });
    if (!res.job?.jobId) throw new Error('No jobId returned');
    log('⏳', `Job started: ${res.job.jobId}`, 2);
    return this.pollJob(res.job.jobId);
  }

  async generateTextToImage(prompt: string, width = 1024, height = 1024): Promise<string[]> {
    log('📤', 'Firing text-to-image request...', 2);
    const res = await this.request<{ job?: { jobId?: string } }>('POST', '/generate/txt2img', {
      modelId: 'flux.1-dev',
      prompt,
      numSamples: 1,
      guidance: 3.5,
      numInferenceSteps: 28,
      width,
      height,
    });
    if (!res.job?.jobId) throw new Error('No jobId returned');
    log('⏳', `Job started: ${res.job.jobId}`, 2);
    return this.pollJob(res.job.jobId);
  }

  async removeBackground(assetId: string): Promise<string> {
    const res = await this.request<{ job?: { jobId?: string } }>('POST', '/generate/remove-background', {
      image: assetId,
      format: 'png',
    });
    if (!res.job?.jobId) throw new Error('No jobId');
    const ids = await this.pollJob(res.job.jobId, 60);
    return ids[0];
  }

  private async pollJob(jobId: string, maxAttempts = 120): Promise<string[]> {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await this.request<{ job?: { status?: string; metadata?: { assetIds?: string[] }; error?: string } }>(
        'GET', `/jobs/${jobId}`
      );
      const status = res.job?.status;
      if (i % 10 === 0 && i > 0) {
        log('⏳', `Still polling... attempt ${i}/${maxAttempts}, status: ${status}`, 2);
      }
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

  async downloadAsset(assetId: string): Promise<{ buffer: Buffer; extension: string }> {
    const res = await this.request<{ asset?: { url?: string; mimeType?: string } }>('GET', `/assets/${assetId}`);
    if (!res.asset?.url) throw new Error('No URL');
    const imgRes = await fetch(res.asset.url);
    if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ext = res.asset.mimeType?.includes('webp') ? '.webp' : res.asset.mimeType?.includes('jpeg') ? '.jpg' : '.png';
    return { buffer, extension: ext };
  }
}

interface PipelineResult {
  assetId: string;
  buffer: Buffer;
  extension: string;
}

async function stepSaveToFile(buffer: Buffer, filePath: string): Promise<void> {
  fs.writeFileSync(filePath, buffer);
}

function log(emoji: string, message: string, indent = 0) {
  const prefix = '  '.repeat(indent);
  console.log(`${prefix}${emoji} ${message}`);
}

function logDivider(title?: string) {
  if (title) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'═'.repeat(60)}`);
  } else {
    console.log(`${'─'.repeat(60)}`);
  }
}

async function main() {
  const config = parseArgs();
  const runId = `run-${Date.now()}`;

  console.log('\n');
  logDivider('SLOPEGGLE ASSET GENERATION');
  log('🎮', `Run ID: ${runId}`);
  log('📁', `Output: ${OUTPUT_DIR}`);
  log('🎨', `Theme: "${config.theme}"`);
  log('✏️', `Style: ${config.style}`);
  log('🔧', `Dry run: ${config.dryRun}`);
  if (config.templateFilter) log('🎯', `Filter: ${config.templateFilter}`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(GAME_ASSETS_DIR, { recursive: true });

  const templates = SLOPEGGLE_TEMPLATES.filter(t => {
    if (t.skipGeneration) return false;
    if (config.templateFilter && t.id !== config.templateFilter) return false;
    return true;
  });

  log('📋', `Templates to process: ${templates.map(t => t.id).join(', ')}`);

  let client: ScenarioClient | null = null;
  if (!config.dryRun) {
    try {
      client = new ScenarioClient();
      log('✅', 'Scenario API client initialized');
    } catch (e) {
      log('❌', `Scenario API not available: ${e}`);
      log('💡', 'Running in dry-run mode (silhouettes + prompts only)');
      config.dryRun = true;
    }
  }

  const results: Array<{
    templateId: string;
    silhouettePath: string;
    promptPath: string;
    finalPath?: string;
    gameAssetPath?: string;
    error?: string;
  }> = [];

  if (shouldRun(config, 'sprites')) {
    for (const template of templates) {
      logDivider(`Template: ${template.id}`);
      log('📐', `Shape: ${template.shape} ${template.width.toFixed(2)}×${template.height.toFixed(2)}`, 1);
      log('🏷️', `Entity type: ${template.entityType}`, 1);

      const result: typeof results[0] = {
        templateId: template.id,
        silhouettePath: '',
        promptPath: '',
      };

      try {
        const silhouetteBuffer = await createSilhouettePng(template.shape, template.width, template.height);
        const silhouettePath = path.join(OUTPUT_DIR, `${template.id}_1_silhouette.png`);
        await stepSaveToFile(silhouetteBuffer, silhouettePath);
        result.silhouettePath = silhouettePath;
        log('✅', `Silhouette saved: ${path.basename(silhouettePath)}`, 1);

        const prompt = buildPrompt(template, config.theme, config.style);
        const negativePrompt = buildNegativePrompt(config.style);
        const promptPath = path.join(OUTPUT_DIR, `${template.id}_2_prompt.txt`);
        fs.writeFileSync(promptPath, `=== POSITIVE PROMPT ===\n${prompt}\n\n=== NEGATIVE PROMPT ===\n${negativePrompt}`);
        result.promptPath = promptPath;
        log('✅', `Prompt saved: ${path.basename(promptPath)}`, 1);

        console.log('\n--- PROMPT PREVIEW ---');
        console.log(prompt.split('\n').slice(0, 8).join('\n'));
        console.log('...(truncated)');
        console.log('----------------------\n');

        if (config.dryRun) {
          log('⏭️', 'Dry run - skipping API calls', 1);
          results.push(result);
          continue;
        }

        log('📤', 'Uploading silhouette...', 1);
        const uploadedId = await client!.uploadAsset(silhouetteBuffer);
        log('✅', `Uploaded: ${uploadedId}`, 2);

        log('🎨', 'Generating via img2img...', 1);
        const startGen = Date.now();
        const assetIds = await client!.generateImg2Img(prompt, uploadedId);
        const generatedAssetId = assetIds[0];
        log('✅', `Generated in ${((Date.now() - startGen) / 1000).toFixed(1)}s`, 2);

        log('📥', 'Downloading generated image...', 1);
        const generated = await client!.downloadAsset(generatedAssetId);
        const generatedPath = path.join(OUTPUT_DIR, `${template.id}_3_generated${generated.extension}`);
        await stepSaveToFile(generated.buffer, generatedPath);
        log('✅', `Saved: ${path.basename(generatedPath)}`, 2);

        log('✂️', 'Removing background...', 1);
        const startBg = Date.now();
        const noBgAssetId = await client!.removeBackground(generatedAssetId);
        log('✅', `Background removed in ${((Date.now() - startBg) / 1000).toFixed(1)}s`, 2);

        log('📥', 'Downloading final image...', 1);
        const final = await client!.downloadAsset(noBgAssetId);
        const finalPath = path.join(OUTPUT_DIR, `${template.id}_4_final.png`);
        await stepSaveToFile(final.buffer, finalPath);
        result.finalPath = finalPath;
        log('✅', `Saved: ${path.basename(finalPath)}`, 2);

        const gameAssetPath = path.join(GAME_ASSETS_DIR, `${template.id}.png`);
        fs.copyFileSync(finalPath, gameAssetPath);
        result.gameAssetPath = gameAssetPath;
        log('🎮', `Copied to game assets: ${path.basename(gameAssetPath)}`, 2);

        await uploadToR2(finalPath, `${template.id}.png`);

      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e);
        log('❌', `Error: ${result.error}`, 1);
      }

      results.push(result);
    }
  }

  if (!config.dryRun && client && shouldRun(config, 'background')) {
    logDivider('Background: arcade');
    log('🖼️', 'Generating background image...', 1);

    try {
      const bgPrompt = [
        "A magical arcade game background for a pachinko-style video game.",
        "Deep blue cosmic space with stars and nebula.",
        "Soft glowing particles and magical sparkles.",
        "Neon accents in blue and purple.",
        "Dreamy, ethereal atmosphere.",
        "No text, no characters, just the environment.",
      ].join(' ');

      log('📝', `Prompt: ${bgPrompt.substring(0, 80)}...`, 2);

      const startGen = Date.now();
      const bgAssetIds = await client.generateTextToImage(bgPrompt, 1024, 1024);
      const bgAssetId = bgAssetIds[0];
      log('✅', `Generated in ${((Date.now() - startGen) / 1000).toFixed(1)}s`, 2);

      log('📥', 'Downloading background...', 1);
      const bgImage = await client.downloadAsset(bgAssetId);
      const bgPath = path.join(OUTPUT_DIR, 'background_final.png');
      fs.writeFileSync(bgPath, bgImage.buffer);
      log('✅', `Saved: ${path.basename(bgPath)}`, 2);

      const bgGamePath = path.join(GAME_ASSETS_DIR, 'background.png');
      fs.copyFileSync(bgPath, bgGamePath);
      log('🎮', `Copied to game assets: background.png`, 2);

      await uploadToR2(bgPath, 'background.png');
    } catch (e) {
      log('❌', `Background generation failed: ${e}`, 1);
    }
  }

  if (!config.dryRun && client && shouldRun(config, 'title-hero')) {
    logDivider('Title Hero: ' + GAME_TITLE);
    log('🎨', 'Generating title hero image...', 1);

    try {
      const heroPrompt = [
        `A stylized game title logo that says "${GAME_TITLE}".`,
        'Bold, playful 3D text with depth and shadows.',
        'Neon glow effects, arcade game aesthetic.',
        'Magical sparkles and stars around the text.',
        'The text is the main focus, centered in the frame.',
        'Deep blue and purple gradient background.',
        'High quality game logo, professional design.',
        'Cartoon style, vibrant neon colors.',
      ].join(' ');

      log('📝', `Prompt: ${heroPrompt.substring(0, 80)}...`, 2);

      const startGen = Date.now();
      const heroAssetIds = await client.generateTextToImage(heroPrompt, 1024, 512);
      const heroAssetId = heroAssetIds[0];
      log('✅', `Generated in ${((Date.now() - startGen) / 1000).toFixed(1)}s`, 2);

      log('✂️', 'Removing background...', 1);
      const startBg = Date.now();
      const noBgAssetId = await client.removeBackground(heroAssetId);
      log('✅', `Background removed in ${((Date.now() - startBg) / 1000).toFixed(1)}s`, 2);

      log('📥', 'Downloading title hero...', 1);
      const heroImage = await client.downloadAsset(noBgAssetId);
      const heroPath = path.join(OUTPUT_DIR, 'title_hero_final.png');
      fs.writeFileSync(heroPath, heroImage.buffer);
      log('✅', `Saved: ${path.basename(heroPath)}`, 2);

      const heroGamePath = path.join(GAME_ASSETS_DIR, 'title_hero.png');
      fs.copyFileSync(heroPath, heroGamePath);
      log('🎮', `Copied to game assets: title_hero.png`, 2);

      await uploadToR2(heroPath, 'title_hero.png');
    } catch (e) {
      log('❌', `Title hero generation failed: ${e}`, 1);
    }
  }

  logDivider('SUMMARY');

  const manifestPath = path.join(OUTPUT_DIR, `${runId}_manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify({
    runId,
    config,
    timestamp: new Date().toISOString(),
    results,
  }, null, 2));
  log('📋', `Manifest: ${manifestPath}`);

  console.log('\n');
  console.log('Template          | Silhouette | Final | Game Asset');
  console.log('------------------|------------|-------|------------');
  for (const r of results) {
    const sil = r.silhouettePath ? '✅' : '❌';
    const fin = r.finalPath ? '✅' : (r.error ? '❌' : '⏭️');
    const game = r.gameAssetPath ? '✅' : (r.error ? '❌' : '⏭️');
    console.log(`${r.templateId.padEnd(17)} | ${sil.padEnd(10)} | ${fin.padEnd(5)} | ${game}`);
  }

  const successCount = results.filter(r => r.gameAssetPath).length;
  const errorCount = results.filter(r => r.error).length;

  console.log('\n');
  log('✅', `Success: ${successCount}/${results.length}`);
  if (errorCount > 0) log('❌', `Errors: ${errorCount}`);

  console.log('\n📁 Output directories:');
  console.log(`   Debug files: ${OUTPUT_DIR}`);
  console.log(`   Game assets: ${GAME_ASSETS_DIR}`);

  console.log('\n');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
