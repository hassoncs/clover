import type { Env } from '../trpc/context';
import { ScenarioClient, createScenarioClient } from './scenario';
import { ComfyUIClient, createComfyUIClient } from './comfyui';
import { buildAssetPath } from '@slopcade/shared';

const DEBUG_ASSET_GENERATION = process.env.DEBUG_ASSET_GENERATION === 'true';
const DEBUG_OUTPUT_DIR = 'debug-output';

type DebugAssetsLevel = 'verbose' | 'normal' | 'quiet';
const DEBUG_ASSETS: DebugAssetsLevel = (process.env.DEBUG_ASSETS as DebugAssetsLevel) || 'normal';
const LEVEL_PRIORITY: Record<DebugAssetsLevel, number> = { verbose: 0, normal: 1, quiet: 2 };
const LOG_LEVEL_MAP: Record<string, DebugAssetsLevel> = { 
  DEBUG: 'verbose', 
  INFO: 'normal', 
  WARN: 'quiet', 
  ERROR: 'quiet' 
};

export function shouldLog(level: string): boolean {
  const requiredLevel = LOG_LEVEL_MAP[level] ?? 'normal';
  return LEVEL_PRIORITY[requiredLevel] >= LEVEL_PRIORITY[DEBUG_ASSETS];
}

export function formatLog(level: string, context: string, message: string): string {
  return `[AssetPipeline] [${level}] ${context ? `[${context}] ` : ''}${message}`;
}

export function assetLog(level: string, context: string, message: string): void {
  if (level === 'ERROR' || shouldLog(level)) {
    const formatted = formatLog(level, context, message);
    if (level === 'ERROR') console.error(formatted);
    else if (level === 'WARN') console.warn(formatted);
    else console.log(formatted);
  }
}

export type EntityType =
  | 'character'
  | 'enemy'
  | 'item'
  | 'platform'
  | 'background'
  | 'ui';

export type SpriteStyle = 'pixel' | 'cartoon' | '3d' | 'flat';

export interface StructuredPromptParams {
  templateId: string;
  physicsShape: 'box' | 'circle' | 'polygon';
  physicsWidth?: number;
  physicsHeight?: number;
  physicsRadius?: number;
  entityType: EntityType;
  themePrompt?: string;
  visualDescription?: string;
  style: SpriteStyle;
  targetWidth: number;
  targetHeight: number;
  context?: AssetContext;
}

export interface AssetContext {
  gameId: string;
  packId: string;
}

export interface AssetGenerationRequest {
  entityType: EntityType;
  description: string;
  style: SpriteStyle;
  size?: { width: number; height: number };
  animated?: boolean;
  frameCount?: number;
  seed?: string;
  context?: AssetContext;
}

export interface DirectGenerationRequest {
  prompt: string;
  negativePrompt: string;
  entityType: EntityType;
  style: SpriteStyle;
  width: number;
  height: number;
  strength?: number;
  guidance?: number;
  seed?: string;
  context?: AssetContext;
}

export interface AssetGenerationResult {
  success: boolean;
  assetUrl?: string;
  r2Key?: string;
  silhouetteUrl?: string;
  silhouetteR2Key?: string;
  scenarioAssetId?: string;
  frames?: string[];
  error?: string;
}

const MODEL_MATRIX: Record<string, string> = {
  'character:pixel:static': 'model_retrodiffusion-plus',
  'character:pixel:animated': 'model_retrodiffusion-animation',
  'character:cartoon:static': 'model_c8zak5M1VGboxeMd8kJBr2fn',
  'enemy:pixel:static': 'model_retrodiffusion-plus',
  'enemy:pixel:animated': 'model_retrodiffusion-animation',
  'enemy:cartoon:static': 'model_c8zak5M1VGboxeMd8kJBr2fn',
  'item:pixel:static': 'model_retrodiffusion-plus',
  'item:3d:static': 'model_7v2vV6NRvm8i8jJm6DWHf6DM',
  'platform:pixel:static': 'model_retrodiffusion-tile',
  'background:pixel:static': 'model_uM7q4Ms6Y5X2PXie6oA9ygRa',
  'background:cartoon:static': 'model_hHuMquQ1QvEGHS1w7tGuYXud',
  'ui:pixel:static': 'model_mcYj5uGzXteUw6tKapsaDgBP',
  'ui:flat:static': 'model_mcYj5uGzXteUw6tKapsaDgBP',
};

const FALLBACK_MODEL = 'model_retrodiffusion-plus';

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

const FALLBACK_COLORS: Record<EntityType, string> = {
  character: '#4CAF50',
  enemy: '#F44336',
  item: '#FFD700',
  platform: '#8B4513',
  background: '#87CEEB',
  ui: '#9E9E9E',
};

export function calculateCanvasDimensions(
  physicsWidth: number,
  physicsHeight: number,
  targetPixelCount: number = 262144
): { width: number; height: number } {
  const aspectRatio = physicsWidth / physicsHeight;
  
  const width = Math.sqrt(targetPixelCount * aspectRatio);
  const height = width / aspectRatio;
  
  const roundedWidth = Math.round(width / 64) * 64;
  const roundedHeight = Math.round(height / 64) * 64;
  
  return {
    width: Math.max(64, Math.min(2048, roundedWidth || 512)),
    height: Math.max(64, Math.min(2048, roundedHeight || 512)),
  };
}

function createRawPngBuffer(
  width: number,
  height: number,
  pixelData: Uint8Array
): Uint8Array {
  const crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crc32Table[i] = c;
  }
  
  function crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  
  function writeChunk(type: string, data: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(4 + 4 + data.length + 4);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.length, false);
    for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
    chunk.set(data, 8);
    const crcData = new Uint8Array(4 + data.length);
    for (let i = 0; i < 4; i++) crcData[i] = type.charCodeAt(i);
    crcData.set(data, 4);
    view.setUint32(8 + data.length, crc32(crcData), false);
    return chunk;
  }
  
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width, false);
  ihdrView.setUint32(4, height, false);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  const rawData = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      const dstIdx = y * (1 + width * 3) + 1 + x * 3;
      rawData[dstIdx] = pixelData[srcIdx];
      rawData[dstIdx + 1] = pixelData[srcIdx + 1];
      rawData[dstIdx + 2] = pixelData[srcIdx + 2];
    }
  }
  
  const deflated = deflateSync(rawData);
  
  const iend = new Uint8Array(0);
  
  const ihdrChunk = writeChunk('IHDR', ihdr);
  const idatChunk = writeChunk('IDAT', deflated);
  const iendChunk = writeChunk('IEND', iend);
  
  const png = new Uint8Array(signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let offset = 0;
  png.set(signature, offset); offset += signature.length;
  png.set(ihdrChunk, offset); offset += ihdrChunk.length;
  png.set(idatChunk, offset); offset += idatChunk.length;
  png.set(iendChunk, offset);
  
  return png;
}

function deflateSync(data: Uint8Array): Uint8Array {
  const output: number[] = [];
  output.push(0x78, 0x9C);
  
  const BLOCK_SIZE = 65535;
  for (let i = 0; i < data.length; i += BLOCK_SIZE) {
    const isLast = i + BLOCK_SIZE >= data.length;
    const blockData = data.slice(i, Math.min(i + BLOCK_SIZE, data.length));
    const len = blockData.length;
    
    output.push(isLast ? 0x01 : 0x00);
    output.push(len & 0xFF, (len >> 8) & 0xFF);
    output.push((~len) & 0xFF, ((~len) >> 8) & 0xFF);
    for (let j = 0; j < blockData.length; j++) {
      output.push(blockData[j]);
    }
  }
  
  let adler = 1;
  let s1 = 1, s2 = 0;
  for (let i = 0; i < data.length; i++) {
    s1 = (s1 + data[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  adler = (s2 << 16) | s1;
  
  output.push((adler >> 24) & 0xFF, (adler >> 16) & 0xFF, (adler >> 8) & 0xFF, adler & 0xFF);
  
  return new Uint8Array(output);
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

export function createSilhouettePng(
  shape: 'box' | 'circle' | 'polygon',
  physicsWidth: number,
  physicsHeight: number,
  canvasSize: number = 512,
  color: string = '#808080'
): Uint8Array {
  const aspectRatio = physicsWidth / physicsHeight;
  const { r, g, b } = parseHexColor(color);
  
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
  
  const pixels = new Uint8Array(canvasSize * canvasSize * 3);
  pixels.fill(255);
  
  if (shape === 'circle') {
    const radius = Math.min(shapeWidth, shapeHeight) / 2;
    const cx = canvasSize / 2;
    const cy = canvasSize / 2;
    
    for (let py = 0; py < canvasSize; py++) {
      for (let px = 0; px < canvasSize; px++) {
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          const idx = (py * canvasSize + px) * 3;
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
        }
      }
    }
  } else {
    for (let py = y; py < y + shapeHeight && py < canvasSize; py++) {
      for (let px = x; px < x + shapeWidth && px < canvasSize; px++) {
        const idx = (py * canvasSize + px) * 3;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
      }
    }
  }
  
  return createRawPngBuffer(canvasSize, canvasSize, pixels);
}

function describeShapeSilhouette(
  shape: 'box' | 'circle' | 'polygon',
  width?: number,
  height?: number
): string {
  if (shape === 'circle') {
    return 'PERFECTLY CIRCULAR. The object is round like a ball or coin. The silhouette is a perfect circle.';
  }

  if (shape === 'polygon') {
    return 'IRREGULAR POLYGON shape. The silhouette follows the polygon vertices.';
  }

  const w = width ?? 1;
  const h = height ?? 1;
  const ratio = w / h;

  if (ratio > 4) {
    return `EXTREMELY WIDE HORIZONTAL BAR. The object is ${ratio.toFixed(1)}x wider than it is tall. Think of a long shelf, beam, or plank viewed from the side. The silhouette is a very thin, very wide horizontal rectangle.`;
  }
  if (ratio > 2) {
    return `WIDE HORIZONTAL RECTANGLE. The object is ${ratio.toFixed(1)}x wider than tall. Like a brick on its side or a wide platform. The silhouette is a wide, short rectangle.`;
  }
  if (ratio > 1.2) {
    return `SLIGHTLY WIDE RECTANGLE. The object is a bit wider than tall (${ratio.toFixed(1)}:1). The silhouette is a horizontal rectangle.`;
  }
  if (ratio > 0.8) {
    return `PERFECT SQUARE. The object has equal width and height. The silhouette is a square shape.`;
  }
  if (ratio > 0.5) {
    return `SLIGHTLY TALL RECTANGLE. The object is a bit taller than wide (1:${(1/ratio).toFixed(1)}). The silhouette is a vertical rectangle.`;
  }
  if (ratio > 0.25) {
    return `TALL VERTICAL RECTANGLE. The object is ${(1/ratio).toFixed(1)}x taller than wide. Like a pillar or tower. The silhouette is a tall, narrow vertical rectangle.`;
  }
  return `EXTREMELY TALL VERTICAL BAR. The object is ${(1/ratio).toFixed(1)}x taller than wide. Like a pole or column. The silhouette is a very thin, very tall vertical rectangle.`;
}

function describeComposition(
  shape: 'box' | 'circle' | 'polygon',
  entityType: EntityType
): string {
  const base = 'The object FILLS THE ENTIRE FRAME. No empty space around it. The edges of the object touch the edges of the image.';
  
  if (shape === 'circle') {
    return `${base} The circular object fills the square frame, touching all four sides at its widest points.`;
  }
  
  if (entityType === 'character' || entityType === 'enemy') {
    return `${base} The character is centered and sized to fill the frame while maintaining the correct proportions.`;
  }
  
  return base;
}

function camelToWords(str: string): string {
  const sizeModifiers = ['small', 'medium', 'large', 'wide', 'tall', 'tiny', 'huge', 'narrow'];
  
  let words = str
    .replace(/([A-Z])/g, ' $1')
    .replace(/([0-9]+)/g, ' $1 ')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/);
  
  const lastWord = words[words.length - 1];
  if (sizeModifiers.includes(lastWord) && words.length > 1) {
    words = [lastWord, ...words.slice(0, -1)];
  }
  
  return words.join(' ');
}

export function buildStructuredPrompt(params: StructuredPromptParams): string {
  const {
    templateId,
    physicsShape,
    physicsWidth,
    physicsHeight,
    entityType,
    themePrompt,
    visualDescription,
    style,
  } = params;

  const readableName = camelToWords(templateId);
  const styleDesc = STYLE_DESCRIPTORS[style];
  const shapeDesc = describeShapeSilhouette(physicsShape, physicsWidth, physicsHeight);
  const compositionDesc = describeComposition(physicsShape, entityType);

  const subjectDescription = visualDescription 
    ? visualDescription 
    : themePrompt 
      ? `${themePrompt} themed ${readableName}` 
      : readableName;

  const lines = [
    '=== SHAPE (CRITICAL - MUST MATCH EXACTLY) ===',
    shapeDesc,
    '',
    '=== COMPOSITION ===',
    compositionDesc,
    '',
    '=== SUBJECT ===',
    `A ${subjectDescription} for a video game.`,
    entityType === 'platform' ? 'This is a solid surface that game characters stand on.' : '',
    entityType === 'item' ? 'This is a collectible object in the game.' : '',
    entityType === 'character' ? 'This is a playable character sprite, shown in idle pose.' : '',
    entityType === 'enemy' ? 'This is an enemy character, shown in threatening pose.' : '',
    '',
    '=== STYLE ===',
    styleDesc.aesthetic,
    '',
    '=== TECHNICAL REQUIREMENTS ===',
    'Transparent background (alpha channel).',
    'Game sprite asset.',
    styleDesc.technical,
    'Single object only, no duplicates.',
    'No text, watermarks, or signatures.',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildStructuredNegativePrompt(style: SpriteStyle): string {
  const baseNegatives = [
    'blurry',
    'low quality',
    'text',
    'watermark',
    'signature',
    'cropped',
    'cut off',
    'partial object',
    'out of frame',
    'duplicate objects',
    'multiple objects',
    'empty space around object',
    'object too small',
    'wrong aspect ratio',
    'wrong shape',
  ];

  const styleSpecific: Record<SpriteStyle, string[]> = {
    pixel: ['anti-aliasing', 'smooth gradients', '3d render', 'realistic', 'photo'],
    cartoon: ['realistic', 'photo', 'noisy', 'grainy'],
    '3d': ['2d flat', 'sketch', 'drawing'],
    flat: ['gradients', 'shadows', '3d', 'realistic', 'detailed textures'],
  };

  return [...baseNegatives, ...styleSpecific[style]].join(', ');
}

export type ImageGenerationProvider = 'scenario' | 'comfyui' | 'modal';

export interface ProviderClient {
  uploadImage(imageBuffer: Uint8Array): Promise<string>;
  txt2img(params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    strength?: number;
    guidance?: number;
    seed?: number;
  }): Promise<{ assetId: string }>;
  img2img(params: {
    image: string;
    prompt: string;
    negativePrompt?: string;
    strength?: number;
    guidance?: number;
    seed?: number;
  }): Promise<{ assetId: string }>;
  downloadImage(assetId: string): Promise<{ buffer: Uint8Array; extension: string }>;
  removeBackground(params: { image: string; format?: string }): Promise<{ assetId: string }>;
}

function createScenarioProviderClient(env: Env): ProviderClient {
  const client = createScenarioClient(env);

  return {
    uploadImage: async (png: Uint8Array): Promise<string> => {
      const arrayBuffer = png.buffer.slice(
        png.byteOffset,
        png.byteOffset + png.byteLength
      ) as ArrayBuffer;
      return client.uploadAsset(arrayBuffer);
    },

    txt2img: async (params): Promise<{ assetId: string }> => {
      const result = await client.generate({
        prompt: params.prompt,
        width: params.width,
        height: params.height,
        negativePrompt: params.negativePrompt,
        seed: params.seed !== undefined ? String(params.seed) : undefined,
      });
      if (result.assetIds.length === 0) {
        throw new Error('No assets generated');
      }
      return { assetId: result.assetIds[0] };
    },

    img2img: async (params): Promise<{ assetId: string }> => {
      const result = await client.generateImg2Img({
        image: params.image,
        prompt: params.prompt,
        strength: params.strength ?? 0.95,
        guidance: params.guidance ?? 3.5,
        seed: params.seed !== undefined ? String(params.seed) : undefined,
      });
      if (result.assetIds.length === 0) {
        throw new Error('No assets generated');
      }
      return { assetId: result.assetIds[0] };
    },

    downloadImage: async (assetId: string): Promise<{ buffer: Uint8Array; extension: string }> => {
      const result = await client.downloadAsset(assetId);
      return {
        buffer: new Uint8Array(result.buffer),
        extension: result.extension,
      };
    },

    removeBackground: async (params): Promise<{ assetId: string }> => {
      const resultAssetId = await client.removeBackground({
        image: params.image,
        format: params.format as 'png' | 'jpg' | 'webp' | undefined,
      });
      return { assetId: resultAssetId };
    },
  };
}

function createComfyUIProviderClient(env: Env): ProviderClient {
  if (!env.RUNPOD_API_KEY) {
    throw new Error('RUNPOD_API_KEY required when using ComfyUI/RunPod image generation provider');
  }
  if (!env.RUNPOD_COMFYUI_ENDPOINT_ID) {
    throw new Error('RUNPOD_COMFYUI_ENDPOINT_ID required when using ComfyUI/RunPod image generation provider');
  }

  const endpoint = `https://api.runpod.ai/v2/${env.RUNPOD_COMFYUI_ENDPOINT_ID}`;
  const client = createComfyUIClient({
    COMFYUI_ENDPOINT: endpoint,
    RUNPOD_API_KEY: env.RUNPOD_API_KEY,
  });

  return {
    uploadImage: async (png: Uint8Array): Promise<string> => {
      return client.uploadImage(png);
    },

    txt2img: async (params): Promise<{ assetId: string }> => {
      return client.txt2img({
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        width: params.width,
        height: params.height,
        guidance: params.guidance,
        seed: params.seed,
      });
    },

    img2img: async (params): Promise<{ assetId: string }> => {
      return client.img2img({
        image: params.image,
        prompt: params.prompt,
        strength: params.strength ?? 0.95,
        guidance: params.guidance,
        seed: params.seed,
      });
    },

    downloadImage: async (assetId: string): Promise<{ buffer: Uint8Array; extension: string }> => {
      return client.downloadImage(assetId);
    },

    removeBackground: async (params): Promise<{ assetId: string }> => {
      return client.removeBackground({ image: params.image });
    },
  };
}

export function getProviderClient(env: Env): ProviderClient {
  const provider = env.IMAGE_GENERATION_PROVIDER;

  if (provider === 'comfyui' || provider === 'runpod') {
    return createComfyUIProviderClient(env);
  }

  if (!env.SCENARIO_API_KEY || !env.SCENARIO_SECRET_API_KEY) {
    throw new Error('SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required when using Scenario image generation provider');
  }

  return createScenarioProviderClient(env);
}

export class AssetService {
  private providerClient: ProviderClient | null = null;
  private env: Env;
  private debugMode: boolean;

  constructor(env: Env) {
    this.env = env;
    this.debugMode = DEBUG_ASSET_GENERATION || env.DEBUG_ASSET_GENERATION === 'true';
  }

  private async saveDebugFile(filename: string, data: Uint8Array | ArrayBuffer | string): Promise<void> {
    if (!this.debugMode) return;
    
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      
      const debugDir = path.join(process.cwd(), DEBUG_OUTPUT_DIR);
      await fs.mkdir(debugDir, { recursive: true });
      
      const filePath = path.join(debugDir, filename);
      
      if (typeof data === 'string') {
        await fs.writeFile(filePath, data, 'utf-8');
      } else {
        const buffer = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data);
        await fs.writeFile(filePath, buffer);
      }
      
      console.log(`[AssetService DEBUG] Saved: ${filePath}`);
    } catch (err) {
      console.warn(`[AssetService DEBUG] Failed to save ${filename}:`, err);
    }
  }

  private generateDebugId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private getProviderClient(): ProviderClient {
    if (!this.providerClient) {
      this.providerClient = getProviderClient(this.env);
    }
    return this.providerClient;
  }

  selectModel(
    entityType: EntityType,
    style: SpriteStyle,
    animated: boolean
  ): string {
    const animKey = animated ? 'animated' : 'static';
    const key = `${entityType}:${style}:${animKey}`;

    if (MODEL_MATRIX[key]) {
      return MODEL_MATRIX[key];
    }

    const fallbackKey = `${entityType}:pixel:${animKey}`;
    if (MODEL_MATRIX[fallbackKey]) {
      return MODEL_MATRIX[fallbackKey];
    }

    return FALLBACK_MODEL;
  }

  async generateDirect(request: DirectGenerationRequest): Promise<AssetGenerationResult> {
    const {
      prompt,
      entityType,
      style,
      width,
      height,
      strength = 0.95,
      guidance = 3.5,
      seed,
      context,
    } = request;

    const debugId = this.generateDebugId();
    const startTime = Date.now();

    try {
      const provider = this.getProviderClient();

       const physicsShape: 'box' | 'circle' = entityType === 'item' ? 'circle' : 'box';
       const silhouetteData = createSilhouettePng(physicsShape, width, height);

       assetLog('DEBUG', '', `Physics: shape=${physicsShape}, width=${width}, height=${height}`);
       assetLog('INFO', '', `Silhouette created: 512x512 for ${physicsShape} ${width}x${height}`);

      await this.saveDebugFile(`${debugId}_silhouette.png`, silhouetteData);

       const uploadedAssetId = await provider.uploadImage(silhouetteData);

      const silhouetteR2Key = await this.uploadToR2(silhouetteData, '.png', entityType, context, 'silhouette');

       assetLog('INFO', '', `Uploaded silhouette to provider: ${uploadedAssetId}`);
       assetLog('INFO', '', `Starting img2img generation with strength=${strength}`);

      const result = await provider.img2img({
        prompt,
        image: uploadedAssetId,
        strength,
        guidance,
        seed: seed !== undefined ? parseInt(seed, 10) : undefined,
      });

        const assetId = result.assetId;
        const { buffer, extension } = await provider.downloadImage(assetId);

       assetLog('INFO', '', `Downloaded generated asset: ${assetId}`);

       // Debug: save result image and metadata
       await this.saveDebugFile(`${debugId}_result${extension}`, buffer);
      await this.saveDebugFile(`${debugId}_metadata.json`, JSON.stringify({
        debugId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        request: { prompt: prompt.substring(0, 500), entityType, style, width, height },
        silhouette: { shape: physicsShape, width, height },
        result: { scenarioAssetId: assetId, extension },
      }, null, 2));

       const r2Key = await this.uploadToR2(buffer, extension, entityType, context);

       assetLog('INFO', '', `Uploaded to R2: ${r2Key}`);
       assetLog('INFO', '', `Uploaded silhouette to R2: ${silhouetteR2Key}`);

       return {
         success: true,
         assetUrl: this.getR2PublicUrl(r2Key),
         r2Key,
         silhouetteUrl: this.getR2PublicUrl(silhouetteR2Key),
         silhouetteR2Key,
         scenarioAssetId: assetId,
       };
     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Unknown error';
       assetLog('ERROR', '', `Generation failed: ${errorMessage}`);

      // Debug: save error metadata
      await this.saveDebugFile(`${debugId}_error.json`, JSON.stringify({
        debugId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        request: { prompt: prompt.substring(0, 500), entityType, style, width, height },
        error: errorMessage,
      }, null, 2));

      return this.createPlaceholderResult(entityType, prompt, errorMessage);
    }
  }

  async generateFromStructuredParams(params: StructuredPromptParams): Promise<AssetGenerationResult> {
    const prompt = buildStructuredPrompt(params);
    const negativePrompt = buildStructuredNegativePrompt(params.style);

    return this.generateDirect({
      prompt,
      negativePrompt,
      entityType: params.entityType,
      style: params.style,
      width: params.targetWidth,
      height: params.targetHeight,
      context: params.context,
    });
  }

  async generateWithSilhouette(params: StructuredPromptParams): Promise<AssetGenerationResult> {
    const {
      physicsShape,
      physicsWidth = 1,
      physicsHeight = 1,
      entityType,
      style,
    } = params;

    const debugId = this.generateDebugId();
    const startTime = Date.now();

    try {
      const provider = this.getProviderClient();
      
      const silhouetteData = createSilhouettePng(
        physicsShape,
        physicsWidth,
        physicsHeight
      );

      // Debug: save silhouette
      await this.saveDebugFile(`${debugId}_silhouette.png`, silhouetteData);

      const uploadedAssetId = await provider.uploadImage(silhouetteData);

      const prompt = buildStructuredPrompt(params);
      
      // Debug: save prompt
      await this.saveDebugFile(`${debugId}_prompt.txt`, prompt);

      const result = await provider.img2img({
        prompt,
        image: uploadedAssetId,
        strength: 0.95,
        guidance: 3.5,
      });

      const assetId = result.assetId;
      const { buffer, extension } = await provider.downloadImage(assetId);

      // Debug: save result image and metadata
      await this.saveDebugFile(`${debugId}_result${extension}`, buffer);
      await this.saveDebugFile(`${debugId}_metadata.json`, JSON.stringify({
        debugId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        params: { ...params, prompt: undefined },
        silhouette: { shape: physicsShape, width: physicsWidth, height: physicsHeight },
        result: { scenarioAssetId: assetId, extension },
      }, null, 2));

      const r2Key = await this.uploadToR2(buffer, extension, entityType, params.context);

      return {
        success: true,
        assetUrl: this.getR2PublicUrl(r2Key),
        r2Key,
        scenarioAssetId: assetId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[AssetService] Silhouette generation failed: ${errorMessage}`);

      // Debug: save error metadata
      await this.saveDebugFile(`${debugId}_error.json`, JSON.stringify({
        debugId,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        params: { ...params },
        error: errorMessage,
      }, null, 2));

      return this.createPlaceholderResult(entityType, buildStructuredPrompt(params), errorMessage);
    }
  }

  async generateAsset(request: AssetGenerationRequest): Promise<AssetGenerationResult> {
    const {
      entityType,
      description,
      size,
      context,
    } = request;

    try {
      const provider = this.getProviderClient();

      const width = size?.width ?? 256;
      const height = size?.height ?? 256;
      const physicsShape: 'box' | 'circle' = entityType === 'item' ? 'circle' : 'box';

      const silhouetteData = createSilhouettePng(physicsShape, width, height);

      console.log(`[AssetService] Creating silhouette for ${entityType} (${width}x${height}, ${physicsShape})`);

      const uploadedAssetId = await provider.uploadImage(silhouetteData);

      console.log(`[AssetService] Generating ${entityType} with silhouette img2img`);

      const result = await provider.img2img({
        prompt: description,
        image: uploadedAssetId,
        strength: 0.95,
        guidance: 3.5,
      });

      const assetId = result.assetId;
      const { buffer, extension } = await provider.downloadImage(assetId);

      const r2Key = await this.uploadToR2(buffer, extension, entityType, context);

      return {
        success: true,
        assetUrl: this.getR2PublicUrl(r2Key),
        r2Key,
        scenarioAssetId: assetId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[AssetService] Asset generation failed: ${errorMessage}`);
      return this.createPlaceholderResult(entityType, description, errorMessage);
    }
  }

  async generateBatch(
    requests: AssetGenerationRequest[]
  ): Promise<AssetGenerationResult[]> {
    return Promise.all(requests.map((req) => this.generateAsset(req)));
  }

  async removeBackground(
    imageBuffer: ArrayBuffer,
    entityType: EntityType,
    context?: AssetContext
  ): Promise<AssetGenerationResult> {
    try {
      const provider = this.getProviderClient();

      const uploadedAssetId = await provider.uploadImage(new Uint8Array(imageBuffer));

      const result = await provider.removeBackground({
        image: uploadedAssetId,
        format: 'png',
      });

      const { buffer, extension } = await provider.downloadImage(result.assetId);
      const r2Key = await this.uploadToR2(buffer, extension, entityType, context);

      return {
        success: true,
        assetUrl: this.getR2PublicUrl(r2Key),
        r2Key,
        scenarioAssetId: result.assetId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: `Background removal failed: ${errorMessage}`,
      };
    }
  }

  private async uploadToR2(
    buffer: ArrayBuffer | Uint8Array,
    extension: string,
    entityType: EntityType,
    context?: AssetContext,
    suffix?: string
  ): Promise<string> {
    const assetId = crypto.randomUUID();
    const fileSuffix = suffix ? `-${suffix}` : '';
    
    let r2Key: string;
    if (context?.gameId && context?.packId) {
      const basePath = buildAssetPath(context.gameId, context.packId, assetId);
      r2Key = suffix ? basePath.replace(extension, `${fileSuffix}${extension}`) : basePath;
    } else {
      r2Key = `generated/${entityType}/${assetId}${fileSuffix}${extension}`;
    }

    await this.env.ASSETS.put(r2Key, buffer, {
      httpMetadata: {
        contentType: extension === '.png' ? 'image/png' : 'image/webp',
      },
    });

    return r2Key;
  }

  private getR2PublicUrl(r2Key: string): string {
    return `/assets/${r2Key}`;
  }

  private createPlaceholderResult(
    entityType: EntityType,
    description: string,
    error?: string
  ): AssetGenerationResult {
    const color = FALLBACK_COLORS[entityType];

    return {
      success: false,
      error: error ?? 'Scenario API not configured - using placeholder',
      assetUrl: this.createPlaceholderDataUrl(color, description),
    };
  }

  private createPlaceholderDataUrl(color: string, text: string): string {
    const label = text.substring(0, 10);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
      <rect width="64" height="64" fill="${color}"/>
      <text x="32" y="36" text-anchor="middle" fill="white" font-size="8">${label}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
}

export function getScenarioConfigFromEnv(env: Env): {
  configured: boolean;
  apiKey?: string;
  apiSecret?: string;
} {
  const apiKey = env.SCENARIO_API_KEY;
  const apiSecret = env.SCENARIO_SECRET_API_KEY;

  return {
    configured: Boolean(apiKey && apiSecret),
    apiKey,
    apiSecret,
  };
}

export function getImageGenerationConfig(env: Env): {
  configured: boolean;
  provider: 'scenario' | 'comfyui' | 'modal';
  error?: string;
} {
  // Default to Modal (comfyui) - Scenario is deprecated
  const provider = env.IMAGE_GENERATION_PROVIDER ?? 'comfyui';

  if (provider === 'comfyui' || provider === 'modal') {
    // Modal uses the deployed endpoint - no API key needed for public endpoints
    // Private endpoints would need MODAL_TOKEN
    return { configured: true, provider: 'comfyui' };
  }

  // Scenario support maintained for backwards compatibility but deprecated
  if (provider === 'scenario') {
    console.warn('⚠️  SCENARIO PROVIDER IS DEPRECATED. Please migrate to Modal (comfyui).');
    const apiKey = env.SCENARIO_API_KEY;
    const apiSecret = env.SCENARIO_SECRET_API_KEY;

    if (!apiKey || !apiSecret) {
      return {
        configured: false,
        provider: 'scenario',
        error: 'SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required when using Scenario provider (deprecated)',
      };
    }
    return { configured: true, provider: 'scenario' };
  }

  return {
    configured: false,
    provider: 'comfyui',
    error: `Unknown provider: ${provider}. Use 'comfyui' (Modal) or 'scenario' (deprecated)`,
  };
}
