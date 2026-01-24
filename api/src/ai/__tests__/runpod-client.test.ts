import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunPodClient } from '../runpod';
import { RUNPOD_DEFAULTS } from '../runpod-types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RunPodClient', () => {
  const validConfig = {
    apiKey: 'test-api-key',
    fluxEndpointId: 'flux-endpoint-123',
    sdxlEndpointId: 'sdxl-endpoint-456',
    bgRemovalEndpointId: 'rembg-endpoint-789',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates client with valid config', () => {
      const client = new RunPodClient(validConfig);
      expect(client).toBeInstanceOf(RunPodClient);
    });

    it('throws error when API key is missing', () => {
      expect(() => new RunPodClient({ apiKey: '' }))
        .toThrow('RunPod API key required');
    });

    it('uses default timeout', () => {
      const client = new RunPodClient(validConfig);
      expect((client as unknown as { timeout: number }).timeout).toBe(RUNPOD_DEFAULTS.TIMEOUT_MS);
    });

    it('accepts custom timeout', () => {
      const client = new RunPodClient({ ...validConfig, timeout: 60000 });
      expect((client as unknown as { timeout: number }).timeout).toBe(60000);
    });
  });

  describe('uploadImage', () => {
    it('stores image and returns asset ID', async () => {
      const client = new RunPodClient(validConfig);
      const testBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

      const assetId = await client.uploadImage(testBuffer);

      expect(assetId).toMatch(/^runpod-\d+-[a-z0-9]+$/);
    });
  });

  describe('downloadImage', () => {
    it('returns stored image buffer', async () => {
      const client = new RunPodClient(validConfig);
      const testBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

      const assetId = await client.uploadImage(testBuffer);
      const result = await client.downloadImage(assetId);

      expect(result.buffer).toEqual(testBuffer);
      expect(result.extension).toBe('.png');
    });

    it('throws error for unknown asset ID', async () => {
      const client = new RunPodClient(validConfig);

      await expect(client.downloadImage('unknown-id'))
        .rejects.toThrow('Asset not found: unknown-id');
    });
  });

  describe('txt2img', () => {
    const client = new RunPodClient(validConfig);

    it('sends correct request to RunPod', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'COMPLETED',
          output: 'https://storage.runpod.ai/output.png',
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      });

      const result = await client.txt2img({ prompt: 'test prompt' });

      expect(result.assetId).toMatch(/^runpod-/);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('flux-endpoint-123/runsync'),
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
          output: 'base64imagedata',
        }),
      });

      await client.txt2img({ prompt: 'test' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input.width).toBe(RUNPOD_DEFAULTS.WIDTH);
      expect(callBody.input.height).toBe(RUNPOD_DEFAULTS.HEIGHT);
      expect(callBody.input.num_inference_steps).toBe(RUNPOD_DEFAULTS.STEPS);
      expect(callBody.input.guidance_scale).toBe(RUNPOD_DEFAULTS.GUIDANCE);
    });

    it('throws when no endpoint configured', async () => {
      const clientNoEndpoint = new RunPodClient({ apiKey: 'key' });

      await expect(clientNoEndpoint.txt2img({ prompt: 'test' }))
        .rejects.toThrow('No image generation endpoint configured');
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

    it('polls async job until completion', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'job-123', status: 'IN_QUEUE' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'job-123', status: 'IN_PROGRESS' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'job-123',
            status: 'COMPLETED',
            output: 'base64data',
          }),
        });

      const result = await client.txt2img({ prompt: 'test' });

      expect(result.assetId).toMatch(/^runpod-/);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('prefers flux endpoint over sdxl', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: 'data' }),
      });

      await client.txt2img({ prompt: 'test' });

      expect(mockFetch.mock.calls[0][0]).toContain('flux-endpoint-123');
    });
  });

  describe('img2img', () => {
    const client = new RunPodClient(validConfig);

    it('uses uploaded asset as input', async () => {
      const testBuffer = new Uint8Array([1, 2, 3, 4]);
      const assetId = await client.uploadImage(testBuffer);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: 'result' }),
      });

      await client.img2img({
        image: assetId,
        prompt: 'transform image',
        strength: 0.8,
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input.image).toBeDefined();
      expect(callBody.input.strength).toBe(0.8);
    });

    it('uses default strength', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: 'data' }),
      });

      await client.img2img({ image: 'base64data', prompt: 'test' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input.strength).toBe(RUNPOD_DEFAULTS.STRENGTH);
    });
  });

  describe('removeBackground', () => {
    const client = new RunPodClient(validConfig);

    it('calls background removal endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: 'nobg-result' }),
      });

      await client.removeBackground({ image: 'test-image' });

      expect(mockFetch.mock.calls[0][0]).toContain('rembg-endpoint-789');
    });

    it('throws when no bg removal endpoint configured', async () => {
      const clientNoBg = new RunPodClient({ apiKey: 'key', fluxEndpointId: 'flux' });

      await expect(clientNoBg.removeBackground({ image: 'test' }))
        .rejects.toThrow('No background removal endpoint configured');
    });
  });

  describe('output extraction', () => {
    const client = new RunPodClient(validConfig);

    it('handles string output', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: 'base64string' }),
      });

      const result = await client.txt2img({ prompt: 'test' });
      expect(result.assetId).toMatch(/^runpod-/);
    });

    it('handles array output', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: ['image1', 'image2'] }),
      });

      const result = await client.txt2img({ prompt: 'test' });
      expect(result.assetId).toMatch(/^runpod-/);
    });

    it('handles object output with image key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: { image: 'data' } }),
      });

      const result = await client.txt2img({ prompt: 'test' });
      expect(result.assetId).toMatch(/^runpod-/);
    });

    it('handles object output with images array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: { images: ['img1', 'img2'] } }),
      });

      const result = await client.txt2img({ prompt: 'test' });
      expect(result.assetId).toMatch(/^runpod-/);
    });

    it('fetches image from URL', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED', output: 'https://example.com/image.png' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
        });

      const result = await client.txt2img({ prompt: 'test' });
      expect(result.assetId).toMatch(/^runpod-/);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.png');
    });
  });
});
