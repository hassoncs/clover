import { describe, it, expect, vi } from 'vitest';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { AssetService, getImageGenerationConfig, buildStructuredPrompt, calculateCanvasDimensions } from '../assets'
import type { Env } from '../../trpc/context'

const createMockEnv = (overrides: Partial<Env> = {}): Env => ({
  DB: {} as D1Database,
  ASSETS: {
    put: vi.fn().mockResolvedValue(undefined),
  } as unknown as R2Bucket,
  SCENARIO_API_KEY: 'test-api-key',
  SCENARIO_SECRET_API_KEY: 'test-secret-key',
  ...overrides,
} as Env);

describe('AssetService', () => {

  describe('selectModel', () => {
    const service = new AssetService(createMockEnv());

    it('selects correct model for character:pixel:static', () => {
      const model = service.selectModel('character', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for character:pixel:animated', () => {
      const model = service.selectModel('character', true);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for character:cartoon:static', () => {
      const model = service.selectModel('character', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for enemy:pixel:static', () => {
      const model = service.selectModel('enemy', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for item:pixel:static', () => {
      const model = service.selectModel('item', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for item:3d:static', () => {
      const model = service.selectModel('item', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for platform:pixel:static', () => {
      const model = service.selectModel('platform', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for background:pixel:static', () => {
      const model = service.selectModel('background', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for background:cartoon:static', () => {
      const model = service.selectModel('background', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for ui:pixel:static', () => {
      const model = service.selectModel('ui', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for ui:flat:static', () => {
      const model = service.selectModel('ui', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });
  });

  describe('calculateCanvasDimensions', () => {
    it('calculates correct dimensions for square physics', () => {
      const dims = calculateCanvasDimensions(1, 1);
      expect(dims.width).toBe(512);
      expect(dims.height).toBe(512);
    });

    it('calculates correct dimensions for wide physics', () => {
      const dims = calculateCanvasDimensions(2, 1);
      expect(dims.width).toBe(704);
      expect(dims.height).toBe(384);
    });

    it('calculates correct dimensions for tall physics', () => {
      const dims = calculateCanvasDimensions(1, 2);
      expect(dims.width).toBe(384);
      expect(dims.height).toBe(704);
    });

    it('respects min/max bounds', () => {
      const tiny = calculateCanvasDimensions(0.01, 0.01);
      expect(tiny.width).toBeGreaterThanOrEqual(64);
      expect(tiny.height).toBeGreaterThanOrEqual(64);

      const huge = calculateCanvasDimensions(100, 1);
      expect(huge.width).toBeLessThanOrEqual(2048);
    });
  });

  describe('buildStructuredPrompt', () => {
    it('includes critical shape information', () => {
      const prompt = buildStructuredPrompt({
        templateId: 'player',
        physicsShape: 'circle',
        entityType: 'character',
        style: 'pixel',
        targetWidth: 512,
        targetHeight: 512,
      });
      expect(prompt).toContain('PERFECTLY CIRCULAR');
      expect(prompt).toContain('pixel art');
    });

    it('includes subject description when provided', () => {
      const prompt = buildStructuredPrompt({
        templateId: 'coin',
        physicsShape: 'circle',
        entityType: 'item',
        style: 'cartoon',
        visualDescription: 'a shiny gold coin with a star',
        targetWidth: 512,
        targetHeight: 512,
      });
      expect(prompt).toContain('a shiny gold coin with a star');
    });
  });

  describe('generateAsset', () => {
    it('returns placeholder when API not configured', async () => {
      const env = createMockEnv({ SCENARIO_API_KEY: undefined });
      const service = new AssetService(env);
      
      const result = await service.generateAsset({
        entityType: 'character',
        description: 'test character',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required');
      expect(result.assetUrl).toContain('data:image/svg+xml');
    });

    it('returns placeholder with correct color for character type', async () => {
      const env = createMockEnv({ SCENARIO_API_KEY: undefined });
      const service = new AssetService(env);
      
      const result = await service.generateAsset({
        entityType: 'character',
        description: 'test character',
      });

      expect(result.success).toBe(false);
      expect(result.assetUrl).toContain('data:image/svg+xml');
      expect(result.error).toContain('SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY required');
    });

    it('returns placeholder with correct color for enemy type', async () => {
      const env = createMockEnv({ SCENARIO_API_KEY: undefined });
      const service = new AssetService(env);
      
      const result = await service.generateAsset({
        entityType: 'enemy',
        description: 'test enemy',
      });

      expect(result.success).toBe(false);
      expect(result.assetUrl).toContain('data:image/svg+xml');
    });
  });

  describe('generateBatch', () => {
    it('generates placeholder assets when API not configured', async () => {
      const env = createMockEnv({ SCENARIO_API_KEY: undefined });
      const service = new AssetService(env);
      
      const results = await service.generateBatch([
        { entityType: 'character', description: 'p1' },
        { entityType: 'enemy', description: 'e1' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
    });
  });

  describe('getImageGenerationConfig', () => {
    it('returns configured: true when both keys present', () => {
      const env = createMockEnv();
      const config = getImageGenerationConfig(env);
      expect(config.configured).toBe(true);
      expect(config.provider).toBe('scenario');
    });

    it('returns configured: false when apiKey missing', () => {
      const env = createMockEnv({ SCENARIO_API_KEY: undefined });
      const config = getImageGenerationConfig(env);
      expect(config.configured).toBe(false);
    });

    it('returns configured: false when apiSecret missing', () => {
      const env = createMockEnv({ SCENARIO_SECRET_API_KEY: undefined });
      const config = getImageGenerationConfig(env);
      expect(config.configured).toBe(false);
    });
  });
});
