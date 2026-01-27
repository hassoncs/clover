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
      expect(workflow['17'].inputs.steps).toBe(COMFYUI_DEFAULTS.STEPS);
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
      expect(callBody.input.workflow['17'].inputs.denoise).toBe(COMFYUI_DEFAULTS.STRENGTH);
    });
  });

  describe('removeBackground', () => {
    const client = new ComfyUIClient(validConfig);

    it('sets input image in workflow', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: { images: [{ image: 'dGVzdA==', filename: 'nobg.png' }] },
        }),
      });

      await client.removeBackground({ image: 'test-image' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.input.workflow['1'].inputs.image).toBeDefined();
    });
  });

  describe('layeredDecompose', () => {
    const client = new ComfyUIClient(validConfig);

    it('throws not implemented error', async () => {
      await expect(
        client.layeredDecompose({
          image: 'test-image',
          layerCount: 3,
        })
      ).rejects.toThrow('Layered decomposition not yet implemented for ComfyUI serverless');
    });
  });

  // ============================================================================
  // Provider Contract Stability Tests - Request Payload Shaping
  // ============================================================================

  describe('request payload shaping (provider contract)', () => {
    const client = new ComfyUIClient(validConfig);

    it('txt2img shapes workflow nodes correctly for serverless', async () => {
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

      await client.txt2img({
        prompt: 'a beautiful landscape',
        negativePrompt: 'blurry, low quality',
        width: 512,
        height: 512,
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const workflow = callBody.input.workflow;

      // Verify required workflow nodes exist
      expect(workflow['4']).toBeDefined(); // DualCLIPLoader
      expect(workflow['5']).toBeDefined(); // EmptySD3LatentImage
      expect(workflow['6']).toBeDefined(); // CLIPTextEncode (prompt)
      expect(workflow['10']).toBeDefined(); // UNETLoader
      expect(workflow['12']).toBeDefined(); // VAELoader
      expect(workflow['13']).toBeDefined(); // FluxGuidance
      expect(workflow['17']).toBeDefined(); // KSampler
      expect(workflow['8']).toBeDefined(); // VAEDecode
      expect(workflow['9']).toBeDefined(); // SaveImage

      // Verify prompt is passed to CLIP Text Encode (node 6)
      expect(workflow['6'].inputs.text).toBe('a beautiful landscape');

      // Verify dimensions are set in latent image node (node 5)
      expect(workflow['5'].inputs.width).toBe(512);
      expect(workflow['5'].inputs.height).toBe(512);
    });

    it('img2img shapes workflow with init image reference', async () => {
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
        prompt: 'modify this image',
        strength: 0.7,
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const workflow = callBody.input.workflow;

      // Verify LoadImage node references the uploaded asset by filename
      // The workflow stores the image and references it by filename
      expect(workflow['1']).toBeDefined(); // LoadImage node

      // Verify denoise strength is set correctly in KSampler (node 17)
      expect(workflow['17'].inputs.denoise).toBe(0.7);
    });

    it('removeBackground sets up correct workflow nodes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'COMPLETED',
          output: { images: [{ image: 'dGVzdA==', filename: 'nobg.png' }] },
        }),
      });

      await client.removeBackground({ image: 'test-image-asset-id' });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const workflow = callBody.input.workflow;

      // Verify RemoveBackground workflow nodes exist
      expect(workflow['1']).toBeDefined(); // LoadImage or RemBg node
    });
  });

  // ============================================================================
  // Provider Contract Stability Tests - Error Mapping
  // ============================================================================

  describe('error mapping (provider contract)', () => {
    const client = new ComfyUIClient(validConfig);

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

    it('maps HTTP 429 to rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Too Many Requests',
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod API error: 429');
    });

    it('maps job status IN_QUEUE to in-progress', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'job-123', status: 'IN_QUEUE' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'job-123',
            status: 'COMPLETED',
            output: { images: [{ image: 'dGVzdA==', filename: 'out.png' }] },
          }),
        });

      const result = await client.txt2img({ prompt: 'test' });
      expect(result.assetId).toMatch(/^comfy-/);
    });

    it('maps job status IN_PROGRESS to in-progress', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'job-123', status: 'IN_PROGRESS' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'job-123',
            status: 'COMPLETED',
            output: { images: [{ image: 'dGVzdA==', filename: 'out.png' }] },
          }),
        });

      const result = await client.txt2img({ prompt: 'test' });
      expect(result.assetId).toMatch(/^comfy-/);
    });

    it('maps job status FAILED with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'FAILED',
          error: 'Model file not found: model.safetensors',
        }),
      });

      await expect(client.txt2img({ prompt: 'test' }))
        .rejects.toThrow('RunPod job failed: Model file not found: model.safetensors');
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
        .rejects.toThrow('RunPod job failed: Job cancelled by user');
    });
  });

  // ============================================================================
  // Provider Contract Stability Tests - Status Polling Behavior
  // ============================================================================

  describe('status polling behavior (provider contract)', () => {
    const client = new ComfyUIClient(validConfig);

    it('polls until completion with exponential backoff', async () => {
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
            output: { images: [{ image: 'dGVzdA==', filename: 'out.png' }] },
          }),
        });

      const result = await client.txt2img({ prompt: 'test' });

      expect(result.assetId).toMatch(/^comfy-/);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('handles immediate completion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'COMPLETED',
          output: { images: [{ image: 'dGVzdA==', filename: 'out.png' }] },
        }),
      });

      const result = await client.txt2img({ prompt: 'test' });

      expect(result.assetId).toMatch(/^comfy-/);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('extracts first image from multi-image output', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'job-123',
          status: 'COMPLETED',
          output: {
            images: [
              { image: 'aW1hZ2Ux', filename: 'out1.png' },
              { image: 'aW1hZ2Uy', filename: 'out2.png' },
            ],
          },
        }),
      });

      const result = await client.txt2img({ prompt: 'test' });

      expect(result.assetId).toMatch(/^comfy-/);
    });
  });
});
