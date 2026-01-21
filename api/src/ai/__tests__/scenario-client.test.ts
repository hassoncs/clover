import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScenarioClient } from '../scenario';
import { SCENARIO_DEFAULTS, CUSTOM_MODEL_PREFIXES } from '../scenario-types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ScenarioClient', () => {
  const validConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates client with valid credentials', () => {
      const client = new ScenarioClient(validConfig);
      expect(client).toBeInstanceOf(ScenarioClient);
    });

    it('throws error when apiKey is missing', () => {
      expect(() => new ScenarioClient({ apiKey: '', apiSecret: 'secret' }))
        .toThrow('Scenario API credentials required');
    });

    it('throws error when apiSecret is missing', () => {
      expect(() => new ScenarioClient({ apiKey: 'key', apiSecret: '' }))
        .toThrow('Scenario API credentials required');
    });

    it('uses default API URL when not provided', () => {
      const client = new ScenarioClient(validConfig);
      expect((client as unknown as { apiUrl: string }).apiUrl).toBe(SCENARIO_DEFAULTS.API_URL);
    });

    it('accepts custom API URL', () => {
      const customUrl = 'https://custom.api.com';
      const client = new ScenarioClient({ ...validConfig, apiUrl: customUrl });
      expect((client as unknown as { apiUrl: string }).apiUrl).toBe(customUrl);
    });
  });

  describe('usesCustomEndpoint', () => {
    const client = new ScenarioClient(validConfig);

    it('returns false for standard flux model', () => {
      expect(client.usesCustomEndpoint('flux.1-dev')).toBe(false);
    });

    it('returns false for models not starting with model_', () => {
      expect(client.usesCustomEndpoint('some-random-model')).toBe(false);
    });

    it.each(CUSTOM_MODEL_PREFIXES)('returns true for custom prefix: %s', (prefix) => {
      const modelId = `${prefix}-test`;
      expect(client.usesCustomEndpoint(modelId)).toBe(true);
    });

    it('returns false for model_ prefix not in custom list', () => {
      expect(client.usesCustomEndpoint('model_retrodiffusion-plus')).toBe(true);
    });
  });

  describe('createGenerationJob', () => {
    const client = new ScenarioClient(validConfig);

    it('sends correct request for basic generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { jobId: 'job-123' } }),
      });

      const jobId = await client.createGenerationJob({
        prompt: 'test prompt',
      });

      expect(jobId).toBe('job-123');
      expect(mockFetch).toHaveBeenCalledWith(
        `${SCENARIO_DEFAULTS.API_URL}/generate/txt2img`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.prompt).toBe('test prompt');
      expect(body.modelId).toBe(SCENARIO_DEFAULTS.MODEL);
      expect(body.width).toBe(SCENARIO_DEFAULTS.DEFAULT_WIDTH);
      expect(body.height).toBe(SCENARIO_DEFAULTS.DEFAULT_HEIGHT);
    });

    it('uses provided parameters over defaults', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { jobId: 'job-456' } }),
      });

      await client.createGenerationJob({
        prompt: 'custom prompt',
        modelId: 'custom-model',
        width: 512,
        height: 768,
        guidance: 4.0,
        numInferenceSteps: 50,
        numSamples: 2,
        seed: 'seed-123',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.prompt).toBe('custom prompt');
      expect(body.modelId).toBe('custom-model');
      expect(body.width).toBe(512);
      expect(body.height).toBe(768);
      expect(body.guidance).toBe(4.0);
      expect(body.numInferenceSteps).toBe(50);
      expect(body.numSamples).toBe(2);
      expect(body.seed).toBe('seed-123');
    });

    it('clamps guidance to valid range', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { jobId: 'job-789' } }),
      });

      await client.createGenerationJob({
        prompt: 'test',
        guidance: 10,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.guidance).toBe(5);
    });

    it('excludes negativePrompt for flux models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { jobId: 'job-flux' } }),
      });

      await client.createGenerationJob({
        prompt: 'test',
        modelId: 'flux.1-dev',
        negativePrompt: 'should be excluded',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.negativePrompt).toBeUndefined();
    });

    it('includes negativePrompt for non-flux models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { jobId: 'job-non-flux' } }),
      });

      await client.createGenerationJob({
        prompt: 'test',
        modelId: 'model_retrodiffusion-plus',
        negativePrompt: 'blur, noise',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.negativePrompt).toBe('blur, noise');
      expect(body.negativePromptStrength).toBe(1.0);
    });

    it('throws error when no jobId returned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: {} }),
      });

      await expect(client.createGenerationJob({ prompt: 'test' }))
        .rejects.toThrow('No jobId returned from API');
    });

    it('throws error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Invalid prompt' } }),
      });

      await expect(client.createGenerationJob({ prompt: 'test' }))
        .rejects.toThrow('Scenario API error: Invalid prompt');
    });
  });

  describe('createThirdPartyJob', () => {
    const client = new ScenarioClient(validConfig);

    it('uses correct endpoint for third-party models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { jobId: 'job-tp' } }),
      });

      await client.createThirdPartyJob({
        modelId: 'model_imagen-test',
        prompt: 'third party test',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `${SCENARIO_DEFAULTS.API_URL}/generate/custom/model_imagen-test`,
        expect.anything()
      );
    });

    it('sends aspectRatio instead of width/height', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job: { jobId: 'job-ar' } }),
      });

      await client.createThirdPartyJob({
        modelId: 'model_imagen-test',
        prompt: 'test',
        aspectRatio: '16:9',
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.aspectRatio).toBe('16:9');
      expect(body.width).toBeUndefined();
      expect(body.height).toBeUndefined();
    });
  });

  describe('pollJobUntilComplete', () => {
    const client = new ScenarioClient(validConfig);

    it('returns assetIds on successful completion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job: {
            status: 'success',
            metadata: { assetIds: ['asset-1', 'asset-2'] },
          },
        }),
      });

      const assetIds = await client.pollJobUntilComplete('job-123');
      expect(assetIds).toEqual(['asset-1', 'asset-2']);
    });

    it('throws error on job failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job: {
            status: 'failed',
            error: 'Generation failed',
          },
        }),
      });

      await expect(client.pollJobUntilComplete('job-fail'))
        .rejects.toThrow('Generation failed');
    });

    it('throws error when no assets generated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job: {
            status: 'success',
            metadata: { assetIds: [] },
          },
        }),
      });

      await expect(client.pollJobUntilComplete('job-empty'))
        .rejects.toThrow('No assets generated');
    });
  });

  describe('getAssetDetails', () => {
    const client = new ScenarioClient(validConfig);

    it('returns asset URL and mimeType', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          asset: {
            url: 'https://example.com/asset.png',
            mimeType: 'image/png',
          },
        }),
      });

      const details = await client.getAssetDetails('asset-123');
      expect(details.url).toBe('https://example.com/asset.png');
      expect(details.mimeType).toBe('image/png');
    });

    it('throws error when asset has no URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ asset: {} }),
      });

      await expect(client.getAssetDetails('asset-no-url'))
        .rejects.toThrow('No URL found for asset');
    });
  });

  describe('downloadAsset', () => {
    const client = new ScenarioClient(validConfig);

    it('downloads and returns buffer with extension', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            asset: { url: 'https://example.com/asset.png', mimeType: 'image/png' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
        });

      const result = await client.downloadAsset('asset-dl');
      expect(result.buffer).toBeInstanceOf(ArrayBuffer);
      expect(result.mimeType).toBe('image/png');
      expect(result.extension).toBe('.png');
    });

    it('defaults to .png for unknown mimeType', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            asset: { url: 'https://example.com/asset.bin', mimeType: 'application/octet-stream' },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
        });

      const result = await client.downloadAsset('asset-unknown');
      expect(result.extension).toBe('.png');
    });
  });

  describe('listModels', () => {
    const client = new ScenarioClient(validConfig);

    it('fetches private models by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ id: 'model-1', name: 'Model 1' }] }),
      });

      const models = await client.listModels();
      expect(mockFetch).toHaveBeenCalledWith(
        `${SCENARIO_DEFAULTS.API_URL}/models`,
        expect.anything()
      );
      expect(models).toHaveLength(1);
    });

    it('fetches public models when includePublic is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      await client.listModels(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `${SCENARIO_DEFAULTS.API_URL}/models/public`,
        expect.anything()
      );
    });
  });
});
