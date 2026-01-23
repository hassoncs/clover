import { describe, it, expect, beforeAll } from 'vitest';
import { ScenarioClient } from '../scenario';
import { AssetService, buildStructuredPrompt } from '../assets';
import type { Env } from '../../trpc/context';

const hasCredentials = !!(process.env.SCENARIO_API_KEY && process.env.SCENARIO_SECRET_API_KEY);

const describeWithCredentials = hasCredentials ? describe : describe.skip;

describeWithCredentials('Scenario.com Integration Tests (Real API)', () => {
  let client: ScenarioClient;

  beforeAll(() => {
    client = new ScenarioClient({
      apiKey: process.env.SCENARIO_API_KEY!,
      apiSecret: process.env.SCENARIO_SECRET_API_KEY!,
    });
  });

  describe('listModels', () => {
    it('fetches private models', async () => {
      const models = await client.listModels(false);
      expect(Array.isArray(models)).toBe(true);
    }, 30000);

    it('fetches public models', async () => {
      const models = await client.listModels(true);
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('generate (txt2img)', () => {
    it('generates image with flux model', async () => {
      const result = await client.generate({
        prompt: 'simple red circle on white background',
        modelId: 'flux.1-dev',
        width: 256,
        height: 256,
        numInferenceSteps: 10,
      });

      expect(result.jobId).toBeDefined();
      expect(result.assetIds.length).toBeGreaterThan(0);
      expect(result.urls.length).toBeGreaterThan(0);
    }, 120000);

    it('generates image with retrodiffusion-plus', async () => {
      const result = await client.generate({
        prompt: 'pixel art red apple, 16-bit style, transparent background',
        modelId: 'model_retrodiffusion-plus',
        width: 256,
        height: 256,
      });

      expect(result.jobId).toBeDefined();
      expect(result.assetIds.length).toBeGreaterThan(0);
    }, 120000);
  });

  describe('downloadAsset', () => {
    it('downloads generated asset', async () => {
      const genResult = await client.generate({
        prompt: 'pixel art blue square',
        modelId: 'flux.1-dev',
        width: 64,
        height: 64,
        numInferenceSteps: 10,
      });

      const { buffer, mimeType, extension } = await client.downloadAsset(genResult.assetIds[0]);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(0);
      expect(mimeType).toMatch(/^image\//);
      expect(extension).toMatch(/^\./);
    }, 120000);
  });

  describe('getAssetDetails', () => {
    it('retrieves asset URL and metadata', async () => {
      const genResult = await client.generate({
        prompt: 'simple test image',
        modelId: 'flux.1-dev',
        width: 64,
        height: 64,
        numInferenceSteps: 10,
      });

      const details = await client.getAssetDetails(genResult.assetIds[0]);

      expect(details.url).toMatch(/^https?:\/\//);
      expect(details.mimeType).toBeDefined();
    }, 120000);
  });
});

describeWithCredentials('AssetService Integration Tests (Real API)', () => {
  let service: AssetService;

  beforeAll(() => {
    const mockEnv = {
      SCENARIO_API_KEY: process.env.SCENARIO_API_KEY,
      SCENARIO_SECRET_API_KEY: process.env.SCENARIO_SECRET_API_KEY,
      ASSETS: {
        put: async () => undefined,
      },
    } as unknown as Env;

    service = new AssetService(mockEnv);
  });

  describe('selectModel', () => {
    const testCases: Array<{ entityType: 'character' | 'enemy' | 'item' | 'platform' | 'background' | 'ui'; style: 'pixel' | 'cartoon' | '3d' | 'flat'; animated: boolean; expected: string }> = [
      { entityType: 'character', style: 'pixel', animated: false, expected: 'model_retrodiffusion-plus' },
      { entityType: 'character', style: 'pixel', animated: true, expected: 'model_retrodiffusion-animation' },
      { entityType: 'character', style: 'cartoon', animated: false, expected: 'model_c8zak5M1VGboxeMd8kJBr2fn' },
      { entityType: 'enemy', style: 'pixel', animated: false, expected: 'model_retrodiffusion-plus' },
      { entityType: 'item', style: 'pixel', animated: false, expected: 'model_retrodiffusion-plus' },
      { entityType: 'item', style: '3d', animated: false, expected: 'model_7v2vV6NRvm8i8jJm6DWHf6DM' },
      { entityType: 'platform', style: 'pixel', animated: false, expected: 'model_retrodiffusion-tile' },
      { entityType: 'background', style: 'pixel', animated: false, expected: 'model_uM7q4Ms6Y5X2PXie6oA9ygRa' },
      { entityType: 'background', style: 'cartoon', animated: false, expected: 'model_hHuMquQ1QvEGHS1w7tGuYXud' },
      { entityType: 'ui', style: 'pixel', animated: false, expected: 'model_mcYj5uGzXteUw6tKapsaDgBP' },
      { entityType: 'ui', style: 'flat', animated: false, expected: 'model_mcYj5uGzXteUw6tKapsaDgBP' },
    ];

    it.each(testCases)(
      'selects $expected for $entityType:$style:$animated',
      ({ entityType, style, animated, expected }) => {
        const model = service.selectModel(entityType, style, animated);
        expect(model).toBe(expected);
      }
    );
  });

  describe('buildStructuredPrompt', () => {
    it('generates descriptive prompts for each entity type', () => {
      const types: Array<'character' | 'enemy' | 'item' | 'platform' | 'background' | 'ui'> = ['character', 'enemy', 'item', 'platform', 'background', 'ui'];

      for (const entityType of types) {
        const prompt = buildStructuredPrompt({
          templateId: 'test',
          physicsShape: 'box',
          physicsWidth: 1,
          physicsHeight: 1,
          entityType,
          visualDescription: 'test description',
          style: 'pixel',
          targetWidth: 256,
          targetHeight: 256,
        });
        expect(prompt).toContain('test description');
        expect(prompt.length).toBeGreaterThan(100);
      }
    });
  });

  describe('generateAsset (Real API)', () => {
    it('generates character sprite', async () => {
      const result = await service.generateAsset({
        entityType: 'character',
        description: 'simple pixel hero',
        style: 'pixel',
        size: { width: 256, height: 256 },
      });

      expect(result.success).toBe(true);
      expect(result.scenarioAssetId).toBeDefined();
      expect(result.r2Key).toContain('generated/character/');
    }, 180000);

    it('generates item sprite', async () => {
      const result = await service.generateAsset({
        entityType: 'item',
        description: 'gold coin',
        style: 'pixel',
        size: { width: 64, height: 64 },
      });

      expect(result.success).toBe(true);
      expect(result.scenarioAssetId).toBeDefined();
    }, 180000);
  });
});

describe('Scenario Integration Test Skip Check', () => {
  it('reports credential status', () => {
    if (!hasCredentials) {
      console.log('⚠️  Scenario.com integration tests skipped: credentials not set');
      console.log('   Set SCENARIO_API_KEY and SCENARIO_SECRET_API_KEY to run');
    } else {
      console.log('✅ Scenario.com credentials found, integration tests will run');
    }
    expect(true).toBe(true);
  });
});
