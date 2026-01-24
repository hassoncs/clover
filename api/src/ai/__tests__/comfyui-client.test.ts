import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComfyUIClient } from '../comfyui';
import { COMFYUI_DEFAULTS } from '../comfyui-types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ComfyUIClient', () => {
  const validConfig = {
    endpoint: 'https://test-endpoint.runpod.ai/v2/test-id',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates client with valid config', () => {
      const client = new ComfyUIClient(validConfig);
      expect(client).toBeInstanceOf(ComfyUIClient);
    });

    it('throws error when serverless endpoint has no API key', () => {
      expect(() => new ComfyUIClient({ endpoint: 'https://api.runpod.ai/v2/test' }))
        .toThrow('RunPod API key required for serverless endpoints');
    });

    it('allows direct ComfyUI endpoint without API key', () => {
      const client = new ComfyUIClient({ endpoint: 'http://localhost:8188' });
      expect(client).toBeInstanceOf(ComfyUIClient);
    });

    it('detects RunPod serverless from endpoint URL', () => {
      const client = new ComfyUIClient(validConfig);
      expect((client as unknown as { isServerless: boolean }).isServerless).toBe(true);
    });

    it('uses default timeout', () => {
      const client = new ComfyUIClient(validConfig);
      expect((client as unknown as { timeout: number }).timeout).toBe(COMFYUI_DEFAULTS.TIMEOUT_MS);
    });

    it('accepts custom timeout', () => {
      const client = new ComfyUIClient({ ...validConfig, timeout: 60000 });
      expect((client as unknown as { timeout: number }).timeout).toBe(60000);
    });
  });

  describe('uploadImage', () => {
    it('stores image and returns asset ID', async () => {
      const client = new ComfyUIClient(validConfig);
      const testBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

      const assetId = await client.uploadImage(testBuffer);

      expect(assetId).toMatch(/^comfy-\d+-[a-z0-9]+$/);
    });
  });

  describe('downloadImage', () => {
    it('returns stored image buffer', async () => {
      const client = new ComfyUIClient(validConfig);
      const testBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

      const assetId = await client.uploadImage(testBuffer);
      const result = await client.downloadImage(assetId);

      expect(result.buffer).toEqual(testBuffer);
      expect(result.extension).toBe('.png');
    });

    it('throws error for unknown asset ID', async () => {
      const client = new ComfyUIClient(validConfig);

      await expect(client.downloadImage('unknown-id'))
        .rejects.toThrow('Asset not found: unknown-id');
    });
  });

  describe('txt2img (serverless)', () => {
    const client = new ComfyUIClient(validConfig);

    it('sends correct request to RunPod', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'COMPLETED',
          output: {
            images: [{ image: 'dGVzdA==', filename: 'output.png' }],
          },
        }),
      });

      const result = await client.txt2img({ prompt: 'test prompt' });

      expect(result.assetId).toMatch(/^comfy-/);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/runsync'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('uses default parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: { images: [{ image: 'dGVzdA==', filename: 'out.png' }] },
        }),
      });

      await client.txt2img({ prompt: 'test' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const workflow = callBody.input.workflow;

      expect(workflow['5'].inputs.width).toBe(COMFYUI_DEFAULTS.WIDTH);
      expect(workflow['5'].inputs.height).toBe(COMFYUI_DEFAULTS.HEIGHT);
      expect(workflow['3'].inputs.steps).toBe(COMFYUI_DEFAULTS.STEPS);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod API error');
    });

    it('throws on job failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'FAILED',
          error: 'Model not found',
        }),
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod job failed: Model not found');
    });
  });

  describe('img2img', () => {
    const client = new ComfyUIClient(validConfig);

    it('uses uploaded asset as input', async () => {
      const testBuffer = new Uint8Array([1, 2, 3, 4]);
      const assetId = await client.uploadImage(testBuffer);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: { images: [{ image: 'dGVzdA==', filename: 'out.png' }] },
        }),
      });

      await client.img2img({
        image: assetId,
        prompt: 'transform image',
        strength: 0.8,
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input.images).toHaveLength(1);
    });

    it('uses default strength', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: { images: [{ image: 'dGVzdA==', filename: 'out.png' }] },
        }),
      });

      await client.img2img({ image: 'base64data', prompt: 'test' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input.workflow['3'].inputs.denoise).toBe(COMFYUI_DEFAULTS.STRENGTH);
    });
  });

  describe('removeBackground', () => {
    const client = new ComfyUIClient(validConfig);

    it('uses BEN2 model by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: { images: [{ image: 'dGVzdA==', filename: 'nobg.png' }] },
        }),
      });

      await client.removeBackground({ image: 'test-image' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input.workflow['2'].inputs.model).toBe('BEN2');
    });
  });

  describe('layeredDecompose', () => {
    const client = new ComfyUIClient(validConfig);

    it('returns multiple asset IDs for layers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: {
            images: [
              { image: 'bGF5ZXIx', filename: 'layer1.png' },
              { image: 'bGF5ZXIy', filename: 'layer2.png' },
              { image: 'bGF5ZXIz', filename: 'layer3.png' },
            ],
          },
        }),
      });

      const result = await client.layeredDecompose({
        image: 'test-image',
        layerCount: 3,
      });

      expect(result.assetIds).toHaveLength(3);
      result.assetIds.forEach((id) => {
        expect(id).toMatch(/^comfy-/);
      });
    });

    it('uses default layer count', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: { images: [{ image: 'dGVzdA==', filename: 'layer.png' }] },
        }),
      });

      await client.layeredDecompose({ image: 'test' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input.workflow['2'].inputs.layers_count).toBe(COMFYUI_DEFAULTS.LAYER_COUNT);
    });
  });
});
