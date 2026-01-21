import { describe, it, expect, vi } from 'vitest';
import { AssetService, getScenarioConfigFromEnv } from '../assets';
import type { Env } from '../../trpc/context';

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
      const model = service.selectModel('character', 'pixel', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for character:pixel:animated', () => {
      const model = service.selectModel('character', 'pixel', true);
      expect(model).toBe('model_retrodiffusion-animation');
    });

    it('selects correct model for character:cartoon:static', () => {
      const model = service.selectModel('character', 'cartoon', false);
      expect(model).toBe('model_c8zak5M1VGboxeMd8kJBr2fn');
    });

    it('selects correct model for enemy:pixel:static', () => {
      const model = service.selectModel('enemy', 'pixel', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for item:pixel:static', () => {
      const model = service.selectModel('item', 'pixel', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('selects correct model for item:3d:static', () => {
      const model = service.selectModel('item', '3d', false);
      expect(model).toBe('model_7v2vV6NRvm8i8jJm6DWHf6DM');
    });

    it('selects correct model for platform:pixel:static', () => {
      const model = service.selectModel('platform', 'pixel', false);
      expect(model).toBe('model_retrodiffusion-tile');
    });

    it('selects correct model for background:pixel:static', () => {
      const model = service.selectModel('background', 'pixel', false);
      expect(model).toBe('model_uM7q4Ms6Y5X2PXie6oA9ygRa');
    });

    it('selects correct model for background:cartoon:static', () => {
      const model = service.selectModel('background', 'cartoon', false);
      expect(model).toBe('model_hHuMquQ1QvEGHS1w7tGuYXud');
    });

    it('selects correct model for ui:pixel:static', () => {
      const model = service.selectModel('ui', 'pixel', false);
      expect(model).toBe('model_mcYj5uGzXteUw6tKapsaDgBP');
    });

    it('selects correct model for ui:flat:static', () => {
      const model = service.selectModel('ui', 'flat', false);
      expect(model).toBe('model_mcYj5uGzXteUw6tKapsaDgBP');
    });

    it('falls back to pixel variant when style not found', () => {
      const model = service.selectModel('character', '3d', false);
      expect(model).toBe('model_retrodiffusion-plus');
    });

    it('falls back to pixel variant for unmatched style', () => {
      const model = service.selectModel('background', '3d', false);
      expect(model).toBe('model_uM7q4Ms6Y5X2PXie6oA9ygRa');
    });
  });

  describe('buildPrompt', () => {
    const service = new AssetService(createMockEnv());

    it('builds character prompt correctly', () => {
      const prompt = service.buildPrompt('character', 'brave knight', 'pixel');
      expect(prompt).toContain('brave knight');
      expect(prompt).toContain('character');
      expect(prompt).toContain('16-bit');
      expect(prompt).toContain('transparent background');
    });

    it('builds enemy prompt correctly', () => {
      const prompt = service.buildPrompt('enemy', 'fierce dragon', 'cartoon');
      expect(prompt).toContain('fierce dragon');
      expect(prompt).toContain('enemy');
      expect(prompt).toContain('menacing');
      expect(prompt).toContain('cartoon');
    });

    it('builds item prompt correctly', () => {
      const prompt = service.buildPrompt('item', 'gold coin', 'pixel');
      expect(prompt).toContain('gold coin');
      expect(prompt).toContain('icon');
      expect(prompt).toContain('game item');
    });

    it('builds platform prompt correctly', () => {
      const prompt = service.buildPrompt('platform', 'grass ground', 'pixel');
      expect(prompt).toContain('grass ground');
      expect(prompt).toContain('tile');
      expect(prompt).toContain('tileable seamless');
    });

    it('builds background prompt correctly', () => {
      const prompt = service.buildPrompt('background', 'forest scene', 'pixel');
      expect(prompt).toContain('forest scene');
      expect(prompt).toContain('parallax-ready');
    });

    it('builds ui prompt correctly', () => {
      const prompt = service.buildPrompt('ui', 'health bar', 'flat');
      expect(prompt).toContain('health bar');
      expect(prompt).toContain('flat design');
    });

    it('uses correct style mapping for pixel', () => {
      const prompt = service.buildPrompt('character', 'test', 'pixel');
      expect(prompt).toContain('16-bit');
    });

    it('uses correct style mapping for cartoon', () => {
      const prompt = service.buildPrompt('character', 'test', 'cartoon');
      expect(prompt).toContain('cartoon');
    });

    it('uses correct style mapping for 3d', () => {
      const prompt = service.buildPrompt('item', 'test', '3d');
      expect(prompt).toContain('3D rendered');
    });

    it('uses correct style mapping for flat', () => {
      const prompt = service.buildPrompt('ui', 'test', 'flat');
      expect(prompt).toContain('flat design');
    });
  });

  describe('generateAsset', () => {
    it('returns placeholder when API not configured', async () => {
      const service = new AssetService(createMockEnv({
        SCENARIO_API_KEY: undefined,
        SCENARIO_SECRET_API_KEY: undefined,
      }));

      const result = await service.generateAsset({
        entityType: 'character',
        description: 'test character',
        style: 'pixel',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
      expect(result.assetUrl).toContain('data:image/svg+xml');
    });

    it('returns placeholder with correct color for character type', async () => {
      const service = new AssetService(createMockEnv({
        SCENARIO_API_KEY: undefined,
        SCENARIO_SECRET_API_KEY: undefined,
      }));

      const result = await service.generateAsset({
        entityType: 'character',
        description: 'brave knight',
        style: 'pixel',
        size: { width: 256, height: 256 },
      });

      expect(result.success).toBe(false);
      expect(result.assetUrl).toContain('data:image/svg+xml');
      expect(result.error).toContain('not configured');
    });

    it('returns placeholder with correct color for enemy type', async () => {
      const service = new AssetService(createMockEnv({
        SCENARIO_API_KEY: undefined,
        SCENARIO_SECRET_API_KEY: undefined,
      }));

      const result = await service.generateAsset({
        entityType: 'enemy',
        description: 'dragon',
        style: 'pixel',
      });

      expect(result.success).toBe(false);
      expect(result.assetUrl).toContain('data:image/svg+xml');
    });
  });

  describe('generateBatch', () => {
    it('generates placeholder assets when API not configured', async () => {
      const service = new AssetService(createMockEnv({
        SCENARIO_API_KEY: undefined,
        SCENARIO_SECRET_API_KEY: undefined,
      }));

      const results = await service.generateBatch([
        { entityType: 'character', description: 'hero', style: 'pixel' },
        { entityType: 'enemy', description: 'monster', style: 'pixel' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
      expect(results[0].assetUrl).toContain('data:image/svg+xml');
      expect(results[1].assetUrl).toContain('data:image/svg+xml');
    });
  });
});

describe('getScenarioConfigFromEnv', () => {
  it('returns configured: true when both keys present', () => {
    const env = createMockEnv();
    const config = getScenarioConfigFromEnv(env);
    expect(config.configured).toBe(true);
    expect(config.apiKey).toBe('test-api-key');
    expect(config.apiSecret).toBe('test-secret-key');
  });

  it('returns configured: false when apiKey missing', () => {
    const env = createMockEnv({ SCENARIO_API_KEY: undefined });
    const config = getScenarioConfigFromEnv(env);
    expect(config.configured).toBe(false);
  });

  it('returns configured: false when apiSecret missing', () => {
    const env = createMockEnv({ SCENARIO_SECRET_API_KEY: undefined });
    const config = getScenarioConfigFromEnv(env);
    expect(config.configured).toBe(false);
  });
});
