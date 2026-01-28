import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import types for contract validation
import type { ImageGenerationAdapter } from '../pipeline/types';

// ============================================================================
// Provider Adapter Contract Validation Tests
// ============================================================================

describe('Provider Adapter Factory Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ImageGenerationAdapter contract interface', () => {
    it('ComfyUI client satisfies ImageGenerationAdapter contract', async () => {
      const { ComfyUIClient } = await import('../comfyui');
      const client = new ComfyUIClient({
        endpoint: 'https://test.runpod.ai/v2/test',
        apiKey: 'test-key',
      });

      // Verify all required methods exist and are functions
      expect(typeof client.uploadImage).toBe('function');
      expect(typeof client.txt2img).toBe('function');
      expect(typeof client.img2img).toBe('function');
      expect(typeof client.downloadImage).toBe('function');
      expect(typeof client.removeBackground).toBe('function');
      expect(typeof client.layeredDecompose).toBe('function');
    });

  });

  describe('Node adapter factory contract', () => {
    it('createNodeComfyUIAdapter returns adapter with required methods', async () => {
      const { createNodeComfyUIAdapter } = await import('../pipeline/adapters/node');
      
      // Mock the fetch to avoid actual network calls
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: { images: [{ image: 'dGVzdA==', filename: 'test.png' }] } }),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = createNodeComfyUIAdapter({
          endpoint: 'https://test.runpod.ai/v2/test',
          apiKey: 'test-key',
        });

        // Verify contract compliance - all required methods exist
        expect(typeof adapter.uploadImage).toBe('function');
        expect(typeof adapter.txt2img).toBe('function');
        expect(typeof adapter.img2img).toBe('function');
        expect(typeof adapter.downloadImage).toBe('function');
        expect(typeof adapter.removeBackground).toBe('function');
        expect(typeof adapter.layeredDecompose).toBe('function');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('createNodeRunPodAdapter returns adapter with required methods', async () => {
      const { createNodeRunPodAdapter } = await import('../pipeline/adapters/node');
      
      // Mock the fetch to avoid actual network calls
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: 'dGVzdA==' }),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = createNodeRunPodAdapter({
          apiKey: 'test-key',
          fluxEndpointId: 'flux-123',
        });

        expect(typeof adapter.uploadImage).toBe('function');
        expect(typeof adapter.txt2img).toBe('function');
        expect(typeof adapter.img2img).toBe('function');
        expect(typeof adapter.downloadImage).toBe('function');
        expect(typeof adapter.removeBackground).toBe('function');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Workers adapter factory contract', () => {
    it('createWorkersProviderAdapter selects ComfyUI provider', async () => {
      const { createWorkersProviderAdapter } = await import('../pipeline/adapters/workers');

      const mockEnv = {
        IMAGE_GENERATION_PROVIDER: 'comfyui',
        RUNPOD_API_KEY: 'test-key',
        RUNPOD_COMFYUI_ENDPOINT_ID: 'endpoint-123',
        SCENARIO_API_KEY: undefined,
        SCENARIO_SECRET_API_KEY: undefined,
      } as any;

      const adapter = createWorkersProviderAdapter(mockEnv);
      
      // Verify it returns an adapter with required methods
      expect(typeof adapter.txt2img).toBe('function');
      expect(typeof adapter.uploadImage).toBe('function');
      expect(typeof adapter.downloadImage).toBe('function');
    });

    it('createWorkersProviderAdapter selects RunPod provider', async () => {
      const { createWorkersProviderAdapter } = await import('../pipeline/adapters/workers');

      const mockEnv = {
        IMAGE_GENERATION_PROVIDER: 'runpod',
        RUNPOD_API_KEY: 'test-key',
        RUNPOD_COMFYUI_ENDPOINT_ID: 'endpoint-123',
        SCENARIO_API_KEY: undefined,
        SCENARIO_SECRET_API_KEY: undefined,
      } as any;

      const adapter = createWorkersProviderAdapter(mockEnv);
      
      expect(typeof adapter.txt2img).toBe('function');
      expect(typeof adapter.uploadImage).toBe('function');
    });

    it('createWorkersProviderAdapter selects Scenario provider by default', async () => {
      const { createWorkersProviderAdapter } = await import('../pipeline/adapters/workers');

      const mockEnv = {
        IMAGE_GENERATION_PROVIDER: undefined,
        RUNPOD_API_KEY: undefined,
        SCENARIO_API_KEY: 'scenario-key',
        SCENARIO_SECRET_API_KEY: 'scenario-secret',
      } as any;

      const adapter = createWorkersProviderAdapter(mockEnv);
      
      expect(typeof adapter.txt2img).toBe('function');
      expect(typeof adapter.uploadImage).toBe('function');
    });
  });

  describe('Adapter method signatures contract', () => {
    it('txt2img method accepts all required parameters', async () => {
      const { createNodeComfyUIAdapter } = await import('../pipeline/adapters/node');
      
      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          status: 'COMPLETED', 
          output: { images: [{ image: 'dGVzdA==', filename: 'test.png' }] } 
        }),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = createNodeComfyUIAdapter({
          endpoint: 'https://test.runpod.ai/v2/test',
          apiKey: 'test-key',
        });

        // Test with all parameters
        const result1 = await adapter.txt2img({
          prompt: 'test prompt',
          width: 512,
          height: 512,
          negativePrompt: 'bad quality',
        });
        expect(result1).toHaveProperty('assetId');
        expect(typeof result1.assetId).toBe('string');

        // Test with only required parameters
        const result2 = await adapter.txt2img({
          prompt: 'test prompt',
        });
        expect(result2).toHaveProperty('assetId');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('img2img method accepts all required parameters', async () => {
      const { createNodeRunPodAdapter } = await import('../pipeline/adapters/node');
      
      // Mock fetch
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED', output: 'dGVzdA==' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED', output: 'result' }),
        });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = createNodeRunPodAdapter({
          apiKey: 'test-key',
          fluxEndpointId: 'flux-123',
        });

        // Test with all parameters
        const result1 = await adapter.img2img({
          imageAssetId: 'test-image-id',
          prompt: 'test prompt',
          strength: 0.8,
        });
        expect(result1).toHaveProperty('assetId');
        expect(typeof result1.assetId).toBe('string');

        // Test with only required parameters
        const result2 = await adapter.img2img({
          imageAssetId: 'test-image-id',
          prompt: 'test prompt',
        });
        expect(result2).toHaveProperty('assetId');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('layeredDecompose is optional for RunPod but required for ComfyUI/Scenario', async () => {
      const { createNodeRunPodAdapter } = await import('../pipeline/adapters/node');
      const { createNodeComfyUIAdapter } = await import('../pipeline/adapters/node');

      // Mock fetch for RunPod
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: 'dGVzdA==' }),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const runpodAdapter = createNodeRunPodAdapter({
          apiKey: 'test-key',
          fluxEndpointId: 'flux-123',
        });

        // RunPod adapter doesn't implement layeredDecompose
        expect(runpodAdapter.layeredDecompose).toBeUndefined();

        // Reset fetch mock for ComfyUI
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'COMPLETED', output: { images: [{ image: 'dGVzdA==', filename: 'test.png' }] } }),
        });

        const comfyAdapter = createNodeComfyUIAdapter({
          endpoint: 'https://test.runpod.ai/v2/test',
          apiKey: 'test-key',
        });

        // ComfyUI adapter implements layeredDecompose
        expect(typeof comfyAdapter.layeredDecompose).toBe('function');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('downloadImage return type consistency', () => {
    it('ComfyUI downloadImage returns buffer and extension', async () => {
      const { createNodeComfyUIAdapter } = await import('../pipeline/adapters/node');
      
      // Upload and then download
      const testBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          status: 'COMPLETED', 
          output: { images: [{ image: 'dGVzdA==', filename: 'test.png' }] } 
        }),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = createNodeComfyUIAdapter({
          endpoint: 'https://test.runpod.ai/v2/test',
          apiKey: 'test-key',
        });

        // Upload first
        const assetId = await adapter.uploadImage(testBuffer);

        // Download
        const result = await adapter.downloadImage(assetId);

        expect(result).toHaveProperty('buffer');
        expect(result).toHaveProperty('extension');
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(typeof result.extension).toBe('string');
        expect(result.extension).toMatch(/^\./);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('RunPod downloadImage returns buffer and extension', async () => {
      const { createNodeRunPodAdapter } = await import('../pipeline/adapters/node');
      
      const testBuffer = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
      
      // Mock fetch for upload and download
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED', output: 'dGVzdA==' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'COMPLETED', output: 'dGVzdA==' }),
        });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = createNodeRunPodAdapter({
          apiKey: 'test-key',
          fluxEndpointId: 'flux-123',
        });

        // Upload first
        const assetId = await adapter.uploadImage(testBuffer);

        // Download
        const result = await adapter.downloadImage(assetId);

        expect(result).toHaveProperty('buffer');
        expect(result).toHaveProperty('extension');
        expect(result.buffer).toBeInstanceOf(Uint8Array);
        expect(typeof result.extension).toBe('string');
        expect(result.extension).toMatch(/^\./);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('removeBackground return type consistency', () => {
    it('ComfyUI removeBackground returns assetId', async () => {
      const { createNodeComfyUIAdapter } = await import('../pipeline/adapters/node');
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 
          status: 'COMPLETED', 
          output: { images: [{ image: 'dGVzdA==', filename: 'nobg.png' }] } 
        }),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = createNodeComfyUIAdapter({
          endpoint: 'https://test.runpod.ai/v2/test',
          apiKey: 'test-key',
        });

        const result = await adapter.removeBackground('test-asset-id');

        expect(result).toHaveProperty('assetId');
        expect(typeof result.assetId).toBe('string');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('RunPod removeBackground returns assetId', async () => {
      const { createNodeRunPodAdapter } = await import('../pipeline/adapters/node');
      
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'COMPLETED', output: 'nobg-result' }),
      });
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = createNodeRunPodAdapter({
          apiKey: 'test-key',
          bgRemovalEndpointId: 'rembg-123',
        });

        const result = await adapter.removeBackground('test-asset-id');

        expect(result).toHaveProperty('assetId');
        expect(typeof result.assetId).toBe('string');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
