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

  // ============================================================================
  // Provider Contract Stability Tests - Status Polling Behavior
  // ============================================================================

  describe('status polling behavior (provider contract)', () => {
    const client = new RunPodClient(validConfig);

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

    it('polls with correct endpoint selection', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'job-456', status: 'IN_PROGRESS' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'job-456',
            status: 'COMPLETED',
            output: 'data',
          }),
        });

      const result = await client.txt2img({ prompt: 'test' });

      expect(result.assetId).toMatch(/^runpod-/);
      // Verify flux endpoint is used (preferred over sdxl)
      expect(mockFetch.mock.calls[0][0]).toContain('flux-endpoint-123');
    });

    it('handles rapid completion (no polling needed)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-789',
          status: 'COMPLETED',
          output: 'base64data',
        }),
      });

      const result = await client.txt2img({ prompt: 'test' });

      expect(result.assetId).toMatch(/^runpod-/);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('respects timeout during polling', async () => {
      // Simulate long-running job that times out
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'job-timeout', status: 'IN_PROGRESS' }),
      });

      const clientWithShortTimeout = new RunPodClient({ ...validConfig, timeout: 1000 });

      await expect(clientWithShortTimeout.txt2img({ prompt: 'test' }))
        .rejects.toThrow();
    });

    it('polls img2img until completion', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'job-img2img', status: 'IN_QUEUE' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'job-img2img',
            status: 'COMPLETED',
            output: 'result',
          }),
        });

      const result = await client.img2img({
        image: 'existing-asset-id',
        prompt: 'transform this',
      });

      expect(result.assetId).toMatch(/^runpod-/);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================================================
  // Provider Contract Stability Tests - Error Mapping
  // ============================================================================

  describe('error mapping (provider contract)', () => {
    const client = new RunPodClient(validConfig);

    it('maps HTTP 401 to authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod API error: 401');
    });

    it('maps HTTP 403 to forbidden error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod API error: 403');
    });

    it('maps HTTP 429 to rate limit error with retry hint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Too Many Requests',
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod API error: 429');
    });

    it('maps HTTP 404 to not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Endpoint not found',
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod API error: 404');
    });

    it('maps job status FAILED with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'FAILED',
          error: 'Model loading failed: out of memory',
        }),
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod job failed: Model loading failed: out of memory');
    });

    it('maps job status CANCELLED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'CANCELLED',
          error: 'Job cancelled by user',
        }),
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('No output from job');
    });

    it('maps timeout during polling to error', async () => {
      // Simulate timeout by returning IN_PROGRESS repeatedly
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'job-timeout', status: 'IN_PROGRESS' }),
      });

      const clientWithShortTimeout = new RunPodClient({ ...validConfig, timeout: 500 });

      await expect(clientWithShortTimeout.txt2img({ prompt: 'test' }))
        .rejects.toThrow();
    });

    it('handles network errors during polling', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'job-network', status: 'IN_PROGRESS' }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('Network error');
    });
  });

  // ============================================================================
  // Provider Contract Stability Tests - Request Payload Shaping
  // ============================================================================

  describe('request payload shaping (provider contract)', () => {
    const client = new RunPodClient(validConfig);

    it('txt2img shapes request correctly for Flux endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'COMPLETED',
          output: 'base64data',
        }),
      });

      await client.txt2img({
        prompt: 'a futuristic cityscape',
        negativePrompt: 'blurry, low quality',
        width: 768,
        height: 1024,
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      // Verify required fields for Flux
      expect(callBody.input).toBeDefined();
      expect(callBody.input.prompt).toBe('a futuristic cityscape');
      expect(callBody.input.negative_prompt).toBe('blurry, low quality');
      expect(callBody.input.width).toBe(768);
      expect(callBody.input.height).toBe(1024);
    });

    it('img2img shapes request with image reference', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: 'result',
        }),
      });

      await client.img2img({
        image: 'base64-image-data',
        prompt: 'add style to this',
        strength: 0.75,
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      // Verify required fields
      expect(callBody.input.image).toBe('base64-image-data');
      expect(callBody.input.prompt).toBe('add style to this');
      expect(callBody.input.strength).toBe(0.75);
    });

    it('removeBackground calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: 'nobg-result',
        }),
      });

      await client.removeBackground({ image: 'test-image' });

      // Verify bg removal endpoint is used
      expect(mockFetch.mock.calls[0][0]).toContain('rembg-endpoint-789');
    });

    it('uses SDXL endpoint when flux is not available', async () => {
      const clientSdxlOnly = new RunPodClient({
        apiKey: 'test-api-key',
        sdxlEndpointId: 'sdxl-endpoint-123',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: 'data',
        }),
      });

      await clientSdxlOnly.txt2img({ prompt: 'test' });

      // Verify SDXL endpoint is used
      expect(mockFetch.mock.calls[0][0]).toContain('sdxl-endpoint-123');
    });
  });
});
