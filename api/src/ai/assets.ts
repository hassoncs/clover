import type { Env } from '../trpc/context';
import { ScenarioClient, createScenarioClient } from './scenario';

export type EntityType =
  | 'character'
  | 'enemy'
  | 'item'
  | 'platform'
  | 'background'
  | 'ui';

export type SpriteStyle = 'pixel' | 'cartoon' | '3d' | 'flat';

export interface AssetGenerationRequest {
  entityType: EntityType;
  description: string;
  style: SpriteStyle;
  size?: { width: number; height: number };
  animated?: boolean;
  frameCount?: number;
  seed?: string;
}

export interface AssetGenerationResult {
  success: boolean;
  assetUrl?: string;
  r2Key?: string;
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

const STYLE_BIT_MAP: Record<SpriteStyle, string> = {
  pixel: '16-bit',
  cartoon: 'cartoon',
  '3d': '3D rendered',
  flat: 'flat design',
};

const ENTITY_PROMPT_TEMPLATES: Record<EntityType, string> = {
  character:
    'pixel art {DESCRIPTION} character, {STYLE} style, side view, transparent background, game sprite, clean edges',
  enemy:
    'pixel art {DESCRIPTION} enemy character, {STYLE} style, side view, menacing appearance, transparent background, game sprite',
  item: 'pixel art {DESCRIPTION} icon, {STYLE} style, centered, transparent background, game item, simple design',
  platform:
    'pixel art {DESCRIPTION} tile, {STYLE} style, top-down view, tileable seamless pattern, game tileset',
  background: 'pixel art {DESCRIPTION} scene, {STYLE} style, game background, parallax-ready',
  ui: 'game UI {DESCRIPTION}, {STYLE} style, clean design, transparent background',
};

const NEGATIVE_PROMPT =
  'blurry, anti-aliasing, smooth shading, 3d render, realistic, gradients, soft edges, text, watermark';

const FALLBACK_COLORS: Record<EntityType, string> = {
  character: '#4CAF50',
  enemy: '#F44336',
  item: '#FFD700',
  platform: '#8B4513',
  background: '#87CEEB',
  ui: '#9E9E9E',
};

export class AssetService {
  private client: ScenarioClient | null = null;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  private getClient(): ScenarioClient {
    if (!this.client) {
      this.client = createScenarioClient(this.env);
    }
    return this.client;
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

  buildPrompt(
    entityType: EntityType,
    description: string,
    style: SpriteStyle
  ): string {
    const template = ENTITY_PROMPT_TEMPLATES[entityType];
    const styleBit = STYLE_BIT_MAP[style];

    return template.replace('{DESCRIPTION}', description).replace('{STYLE}', styleBit);
  }

  async generateAsset(request: AssetGenerationRequest): Promise<AssetGenerationResult> {
    const {
      entityType,
      description,
      style,
      size,
      animated = false,
      seed,
    } = request;

    if (!this.env.SCENARIO_API_KEY || !this.env.SCENARIO_SECRET_API_KEY) {
      return this.createPlaceholderResult(entityType, description);
    }

    try {
      const client = this.getClient();
      const modelId = this.selectModel(entityType, style, animated);
      const prompt = this.buildPrompt(entityType, description, style);

      const result = await client.generate({
        prompt,
        modelId,
        width: size?.width ?? 256,
        height: size?.height ?? 256,
        negativePrompt: NEGATIVE_PROMPT,
        seed,
      });

      if (result.assetIds.length === 0) {
        return {
          success: false,
          error: 'No assets generated',
        };
      }

      const assetId = result.assetIds[0];
      const { buffer, extension } = await client.downloadAsset(assetId);

      const r2Key = await this.uploadToR2(buffer, extension, entityType);

      return {
        success: true,
        assetUrl: this.getR2PublicUrl(r2Key),
        r2Key,
        scenarioAssetId: assetId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      console.error(`Asset generation failed: ${errorMessage}`);

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
    entityType: EntityType
  ): Promise<AssetGenerationResult> {
    if (!this.env.SCENARIO_API_KEY || !this.env.SCENARIO_SECRET_API_KEY) {
      return {
        success: false,
        error: 'Scenario API not configured',
      };
    }

    try {
      const client = this.getClient();

      const uploadedAssetId = await client.uploadAsset(imageBuffer);

      const resultAssetId = await client.removeBackground({
        image: uploadedAssetId,
        format: 'png',
      });

      const { buffer, extension } = await client.downloadAsset(resultAssetId);
      const r2Key = await this.uploadToR2(buffer, extension, entityType);

      return {
        success: true,
        assetUrl: this.getR2PublicUrl(r2Key),
        r2Key,
        scenarioAssetId: resultAssetId,
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
    buffer: ArrayBuffer,
    extension: string,
    entityType: EntityType
  ): Promise<string> {
    const assetId = crypto.randomUUID();
    const r2Key = `generated/${entityType}/${assetId}${extension}`;

    await this.env.ASSETS.put(r2Key, buffer, {
      httpMetadata: {
        contentType: extension === '.png' ? 'image/png' : 'image/webp',
      },
    });

    return r2Key;
  }

  private getR2PublicUrl(r2Key: string): string {
    const baseUrl = this.env.ASSET_HOST ?? 'https://assets.clover.app';
    const cleanBase = baseUrl.replace(/\/$/, '');
    return `${cleanBase}/${r2Key}`;
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
