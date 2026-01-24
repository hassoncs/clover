#!/usr/bin/env npx tsx
/**
 * Physics Stacker Asset Generation Script
 * 
 * Generates AI images for all Physics Stacker game templates using silhouette-based img2img.
 * 
 * Flow: Physics dimensions → Silhouette PNG → Upload → img2img → Poll → Remove BG → Final
 * 
 * Usage:
 *   hush run -- npx tsx api/scripts/generate-physics-stacker-assets.ts
 * 
 * Options:
 *   --dry-run         Only generate silhouettes and prompts, skip API calls
 *   --template=NAME   Only generate for specific template
 *   --theme="..."     Theme prompt (default: "wooden toy blocks")
 *   --style=pixel     Style: pixel, cartoon, 3d, flat (default: cartoon)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

const OUTPUT_DIR = path.join(__dirname, '..', 'debug-output', 'physics-stacker');
const GAME_ASSETS_DIR = path.join(__dirname, '..', '..', 'app', 'public', 'assets', 'games', 'physics-stacker');
const R2_BUCKET = 'slopcade-assets';
const R2_PREFIX = 'generated/item';

const GAME_TITLE = 'Block Stacker';
const GAME_THEME = "wooden toy blocks, natural wood grain, children's toy aesthetic";

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

const PHYSICS_STACKER_TEMPLATES: TemplateSpec[] = [
  { id: 'foundation', shape: 'box', width: 4.0, height: 0.6, entityType: 'platform', color: '#8B4513', description: 'a sturdy wooden table or shelf that blocks rest on' },
  { id: 'dropper', shape: 'box', width: 2.0, height: 0.3, entityType: 'ui', color: '#666666', description: "a cartoon child's hand reaching down, palm facing down, fingers slightly curled as if about to drop something" },
  { id: 'blockWide', shape: 'box', width: 1.8, height: 0.6, entityType: 'item', color: '#FF69B4', description: 'a wide rectangular wooden toy block with rounded edges' },
  { id: 'blockMedium', shape: 'box', width: 1.4, height: 0.6, entityType: 'item', color: '#FF1493', description: 'a medium rectangular wooden toy block with rounded edges' },
  { id: 'blockSmall', shape: 'box', width: 1.0, height: 0.6, entityType: 'item', color: '#DB7093', description: 'a small square-ish wooden toy block with rounded edges' },
  { id: 'blockTall', shape: 'box', width: 0.6, height: 1.2, entityType: 'item', color: '#C71585', description: 'a tall vertical wooden toy block like a pillar or column' },
  { id: 'deathZone', shape: 'box', width: 20, height: 2, entityType: 'ui', color: 'transparent', skipGeneration: true },
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
    return 'PERFECTLY CIRCULAR. The object is round like a ball or coin.';
  }

  const ratio = width / height;
  if (ratio > 4) return `EXTREMELY WIDE HORIZONTAL BAR (${ratio.toFixed(1)}:1). Very thin, very wide rectangle.`;
  if (ratio > 2) return `WIDE HORIZONTAL RECTANGLE (${ratio.toFixed(1)}:1). Like a brick on its side.`;
  if (ratio > 1.2) return `SLIGHTLY WIDE RECTANGLE (${ratio.toFixed(1)}:1). Horizontal rectangle.`;
  if (ratio > 0.8) return `SQUARE-ISH (${ratio.toFixed(2)}:1). Nearly equal width and height.`;
  if (ratio > 0.5) return `SLIGHTLY TALL RECTANGLE (1:${(1/ratio).toFixed(1)}). Vertical rectangle.`;
  if (ratio > 0.25) return `TALL VERTICAL RECTANGLE (1:${(1/ratio).toFixed(1)}). Like a pillar.`;
  return `EXTREMELY TALL VERTICAL BAR (1:${(1/ratio).toFixed(1)}). Like a pole.`;
}

function camelToWords(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/([0-9]+)/g, ' $1 ')
    .trim()
    .toLowerCase();
}

function buildPrompt(template: TemplateSpec, theme: string, style: SpriteStyle): string {
  const styleDesc = STYLE_DESCRIPTORS[style];
  const shapeDesc = describeShapeSilhouette(template.shape, template.width, template.height);

  const subjectDescription = template.description 
    ? `${template.description}, ${theme} style`
    : `${theme} themed ${camelToWords(template.id)}`;

  const entityHints: Record<EntityType, string> = {
    platform: 'This is a solid surface that game objects rest on.',
    item: 'This is a stackable block in a stacking game.',
    character: 'This is a playable character sprite, facing the viewer.',
    enemy: 'This is an enemy character, facing the viewer.',
    background: 'This is a background element.',
    ui: 'This is a UI/game element.',
  };

  const lines = [
    '=== CAMERA/VIEW (CRITICAL) ===',
    'FRONT VIEW. Camera is directly facing the front of the object.',
    'Flat, 2D perspective. NO 3D rotation, NO angled view, NO side view.',
    'Like a sprite in a 2D side-scrolling platformer game.',
    'The object faces the viewer head-on.',
    '',
    '=== SHAPE (CRITICAL - MUST MATCH EXACTLY) ===',
    shapeDesc,
    '',
    '=== COMPOSITION ===',
    'The object FILLS THE ENTIRE FRAME. No empty space around it.',
    '',
    '=== SUBJECT ===',
    `A ${subjectDescription} for a video game.`,
    entityHints[template.entityType],
    '',
    '=== STYLE ===',
    styleDesc.aesthetic,
    '',
    '=== TECHNICAL REQUIREMENTS ===',
    'Transparent background (alpha channel).',
    'Game sprite asset for 2D game.',
    styleDesc.technical,
    'Single object only, no duplicates.',
    'No text, watermarks, or signatures.',
    'Flat front-facing view only.',
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

// ============================================================================
// PIPELINE TYPES & STEP FUNCTIONS
// ============================================================================

interface PipelineResult {
  assetId: string;
  buffer: Buffer;
  extension: string;
}

interface StepContext {
  client: ScenarioClient;
  outputDir: string;
  templateId: string;
}

// --- Individual Pipeline Steps ---

async function stepCreateSilhouette(
  shape: 'box' | 'circle',
  physicsWidth: number,
  physicsHeight: number,
  canvasSize = 512
): Promise<Buffer> {
  return createSilhouettePng(shape, physicsWidth, physicsHeight, canvasSize);
}

async function stepUploadAsset(client: ScenarioClient, buffer: Buffer): Promise<string> {
  return client.uploadAsset(buffer);
}

async function stepImg2Img(
  client: ScenarioClient,
  prompt: string,
  imageAssetId: string
): Promise<string[]> {
  return client.generateImg2Img(prompt, imageAssetId);
}

async function stepTextToImage(
  client: ScenarioClient,
  prompt: string,
  width = 1024,
  height = 1024
): Promise<string[]> {
  return client.generateTextToImage(prompt, width, height);
}

async function stepRemoveBackground(client: ScenarioClient, assetId: string): Promise<string> {
  return client.removeBackground(assetId);
}

async function stepDownload(client: ScenarioClient, assetId: string): Promise<PipelineResult> {
  const result = await client.downloadAsset(assetId);
  return {
    assetId,
    buffer: result.buffer,
    extension: result.extension,
  };
}

async function stepUploadToR2(filePath: string, fileName: string): Promise<string> {
  return uploadToR2(filePath, fileName);
}

async function stepSaveToFile(buffer: Buffer, filePath: string): Promise<void> {
  fs.writeFileSync(filePath, buffer);
}

// --- Composed Pipelines ---

interface EntitySpriteOptions {
  template: TemplateSpec;
  theme: string;
  style: SpriteStyle;
  outputDir: string;
  gameAssetsDir: string;
}

async function generateEntitySprite(
  client: ScenarioClient,
  options: EntitySpriteOptions
): Promise<PipelineResult & { localPath: string }> {
  const { template, theme, style, outputDir, gameAssetsDir } = options;

  log('📐', `Creating silhouette for ${template.id}...`, 1);
  const silhouetteBuffer = await stepCreateSilhouette(template.shape, template.width, template.height);
  const silhouettePath = path.join(outputDir, `${template.id}_1_silhouette.png`);
  await stepSaveToFile(silhouetteBuffer, silhouettePath);
  log('✅', `Silhouette saved: ${path.basename(silhouettePath)}`, 2);

  const prompt = buildPrompt(template, theme, style);
  const promptPath = path.join(outputDir, `${template.id}_2_prompt.txt`);
  const negativePrompt = buildNegativePrompt(style);
  fs.writeFileSync(promptPath, `=== POSITIVE PROMPT ===\n${prompt}\n\n=== NEGATIVE PROMPT ===\n${negativePrompt}`);
  log('✅', `Prompt saved: ${path.basename(promptPath)}`, 2);

  log('📤', 'Uploading silhouette...', 1);
  const uploadedId = await stepUploadAsset(client, silhouetteBuffer);
  log('✅', `Uploaded: ${uploadedId}`, 2);

  log('🎨', 'Generating via img2img...', 1);
  const startGen = Date.now();
  const assetIds = await stepImg2Img(client, prompt, uploadedId);
  const generatedAssetId = assetIds[0];
  log('✅', `Generated in ${((Date.now() - startGen) / 1000).toFixed(1)}s: ${generatedAssetId}`, 2);

  log('📥', 'Downloading generated image...', 1);
  const generated = await stepDownload(client, generatedAssetId);
  const generatedPath = path.join(outputDir, `${template.id}_3_generated${generated.extension}`);
  await stepSaveToFile(generated.buffer, generatedPath);
  log('✅', `Saved: ${path.basename(generatedPath)}`, 2);

  log('✂️', 'Removing background...', 1);
  const startBg = Date.now();
  const noBgAssetId = await stepRemoveBackground(client, generatedAssetId);
  log('✅', `Background removed in ${((Date.now() - startBg) / 1000).toFixed(1)}s`, 2);

  log('📥', 'Downloading final image...', 1);
  const final = await stepDownload(client, noBgAssetId);
  const finalPath = path.join(outputDir, `${template.id}_4_final.png`);
  await stepSaveToFile(final.buffer, finalPath);
  log('✅', `Saved: ${path.basename(finalPath)}`, 2);

  const gameAssetPath = path.join(gameAssetsDir, `${template.id}.png`);
  fs.copyFileSync(finalPath, gameAssetPath);
  log('🎮', `Copied to game assets: ${path.basename(gameAssetPath)}`, 2);

  await stepUploadToR2(finalPath, `${template.id}.png`);

  return { ...final, localPath: finalPath };
}

interface BackgroundOptions {
  prompt: string;
  width?: number;
  height?: number;
  outputDir: string;
  gameAssetsDir: string;
  fileName: string;
}

async function generateBackground(
  client: ScenarioClient,
  options: BackgroundOptions
): Promise<PipelineResult & { localPath: string }> {
  const { prompt, width = 1024, height = 1024, outputDir, gameAssetsDir, fileName } = options;

  log('📝', `Prompt: ${prompt.substring(0, 80)}...`, 2);

  log('🎨', 'Generating background via text-to-image...', 1);
  const startGen = Date.now();
  const assetIds = await stepTextToImage(client, prompt, width, height);
  const assetId = assetIds[0];
  log('✅', `Generated in ${((Date.now() - startGen) / 1000).toFixed(1)}s`, 2);

  log('📥', 'Downloading background...', 1);
  const result = await stepDownload(client, assetId);
  const finalPath = path.join(outputDir, `${fileName}_final.png`);
  await stepSaveToFile(result.buffer, finalPath);
  log('✅', `Saved: ${path.basename(finalPath)}`, 2);

  const gameAssetPath = path.join(gameAssetsDir, `${fileName}.png`);
  fs.copyFileSync(finalPath, gameAssetPath);
  log('🎮', `Copied to game assets: ${fileName}.png`, 2);

  await stepUploadToR2(finalPath, `${fileName}.png`);

  return { ...result, localPath: finalPath };
}

interface TitleHeroOptions {
  title: string;
  theme: string;
  outputDir: string;
  gameAssetsDir: string;
  fileName: string;
}

async function generateTitleHero(
  client: ScenarioClient,
  options: TitleHeroOptions
): Promise<PipelineResult & { localPath: string }> {
  const { title, theme, outputDir, gameAssetsDir, fileName } = options;

  const prompt = [
    `A stylized game title logo that says "${title}".`,
    'Bold, playful 3D text with depth and shadows.',
    `${theme} style letters, colorful and cheerful.`,
    "Children's game aesthetic, fun and inviting.",
    'The text is the main focus, centered in the frame.',
    'Soft gradient background that complements the text.',
    'High quality game logo, professional design.',
    'Cartoon style, vibrant colors.',
  ].join(' ');

  log('📝', `Prompt: ${prompt.substring(0, 80)}...`, 2);

  log('🎨', 'Generating title hero via text-to-image...', 1);
  const startGen = Date.now();
  const assetIds = await stepTextToImage(client, prompt, 1024, 512);
  const assetId = assetIds[0];
  log('✅', `Generated in ${((Date.now() - startGen) / 1000).toFixed(1)}s`, 2);

  log('✂️', 'Removing background...', 1);
  const startBg = Date.now();
  const noBgAssetId = await stepRemoveBackground(client, assetId);
  log('✅', `Background removed in ${((Date.now() - startBg) / 1000).toFixed(1)}s`, 2);

  log('📥', 'Downloading title hero...', 1);
  const result = await stepDownload(client, noBgAssetId);
  const finalPath = path.join(outputDir, `${fileName}_final.png`);
  await stepSaveToFile(result.buffer, finalPath);
  log('✅', `Saved: ${path.basename(finalPath)}`, 2);

  const gameAssetPath = path.join(gameAssetsDir, `${fileName}.png`);
  fs.copyFileSync(finalPath, gameAssetPath);
  log('🎮', `Copied to game assets: ${fileName}.png`, 2);

  await stepUploadToR2(finalPath, `${fileName}.png`);

  return { ...result, localPath: finalPath };
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

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
  logDivider('PHYSICS STACKER ASSET GENERATION');
  log('🎮', `Run ID: ${runId}`);
  log('📁', `Output: ${OUTPUT_DIR}`);
  log('🎨', `Theme: "${config.theme}"`);
  log('✏️', `Style: ${config.style}`);
  log('🔧', `Dry run: ${config.dryRun}`);
  if (config.templateFilter) log('🎯', `Filter: ${config.templateFilter}`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(GAME_ASSETS_DIR, { recursive: true });

  const templates = PHYSICS_STACKER_TEMPLATES.filter(t => {
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
    generatedPath?: string;
    finalPath?: string;
    gameAssetPath?: string;
    error?: string;
  }> = [];

  // --- Generate Entity Sprites ---
  if (shouldRun(config, 'sprites')) {
    for (const template of templates) {
      logDivider(`Template: ${template.id}`);
      log('📐', `Shape: ${template.shape} ${template.width}×${template.height}`, 1);
      log('🏷️', `Entity type: ${template.entityType}`, 1);

      const result: typeof results[0] = {
        templateId: template.id,
        silhouettePath: '',
        promptPath: '',
      };

      try {
        // Always generate silhouette and prompt (even in dry-run)
        const silhouetteBuffer = await stepCreateSilhouette(template.shape, template.width, template.height);
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

        // Use composed pipeline for full generation
        const pipelineResult = await generateEntitySprite(client!, {
          template,
          theme: config.theme,
          style: config.style,
          outputDir: OUTPUT_DIR,
          gameAssetsDir: GAME_ASSETS_DIR,
        });

        result.finalPath = pipelineResult.localPath;
        result.gameAssetPath = path.join(GAME_ASSETS_DIR, `${template.id}.png`);

      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e);
        log('❌', `Error: ${result.error}`, 1);
      }

      results.push(result);
    }
  }

  // --- Generate Background ---
  if (!config.dryRun && client && shouldRun(config, 'background')) {
    logDivider('Background: children_room');
    log('🖼️', 'Generating background image...', 1);

    try {
      const bgPrompt = [
        "A cozy children's playroom background for a video game.",
        "Soft bokeh blur effect, out of focus.",
        "Warm pastel colors, gentle lighting.",
        "Wooden floor, soft toys and building blocks visible but blurry.",
        "Cartoon style, cheerful atmosphere.",
        "No text, no characters, just the environment.",
      ].join(' ');

      await generateBackground(client, {
        prompt: bgPrompt,
        width: 1024,
        height: 1024,
        outputDir: OUTPUT_DIR,
        gameAssetsDir: GAME_ASSETS_DIR,
        fileName: 'background',
      });
    } catch (e) {
      log('❌', `Background generation failed: ${e}`, 1);
    }
  }

  // --- Generate Title Hero ---
  if (!config.dryRun && client && shouldRun(config, 'title-hero')) {
    logDivider('Title Hero: ' + GAME_TITLE);
    log('🎨', 'Generating title hero image...', 1);

    try {
      await generateTitleHero(client, {
        title: GAME_TITLE,
        theme: 'Wooden toy block',
        outputDir: OUTPUT_DIR,
        gameAssetsDir: GAME_ASSETS_DIR,
        fileName: 'title_hero',
      });
    } catch (e) {
      log('❌', `Title hero generation failed: ${e}`, 1);
    }
  }

  // --- Summary ---
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
  console.log('Template          | Silhouette | Generated | Final | Game Asset');
  console.log('------------------|------------|-----------|-------|------------');
  for (const r of results) {
    const sil = r.silhouettePath ? '✅' : '❌';
    const gen = r.generatedPath ? '✅' : (r.error ? '❌' : '⏭️');
    const fin = r.finalPath ? '✅' : (r.error ? '❌' : '⏭️');
    const game = r.gameAssetPath ? '✅' : (r.error ? '❌' : '⏭️');
    console.log(`${r.templateId.padEnd(17)} | ${sil.padEnd(10)} | ${gen.padEnd(9)} | ${fin.padEnd(5)} | ${game}`);
  }

  const successCount = results.filter(r => r.gameAssetPath).length;
  const errorCount = results.filter(r => r.error).length;

  console.log('\n');
  log('✅', `Success: ${successCount}/${results.length}`);
  if (errorCount > 0) log('❌', `Errors: ${errorCount}`);

  console.log('\n📁 Output directories:');
  console.log(`   Debug files: ${OUTPUT_DIR}`);
  console.log(`   Game assets: ${GAME_ASSETS_DIR}`);

  if (successCount > 0) {
    console.log('\n💡 Next step: Update physicsStacker.ts to use image sprites:');
    console.log(`   const ASSET_BASE = "http://localhost:8085/assets/games/physics-stacker";`);
    console.log('   sprite: { type: "image", imageUrl: `${ASSET_BASE}/blockWide.png`, imageWidth: 1.8, imageHeight: 0.6 }');
  }

  console.log('\n');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
