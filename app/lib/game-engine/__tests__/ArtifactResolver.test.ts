import { describe, it, expect, vi } from 'vitest';
import type { BuildManifest, TagPayloads } from '@slopcade/shared';
import {
  R2ArtifactResolver,
  InMemoryArtifactResolver,
  ArtifactNotFoundError,
} from '../ArtifactResolver';

function createManifest(overrides?: Partial<BuildManifest>): BuildManifest {
  return {
    packageManifest: { id: 'test-game', name: 'Test Game', version: '1.0.0' },
    buildId: 'build-001',
    createdAt: Date.now(),
    artifacts: [
      { tag: 'world', hash: 'abc123', sizeBytes: 100 },
      { tag: 'prefabs', hash: 'def456', sizeBytes: 200 },
      { tag: 'entities', hash: 'ghi789', sizeBytes: 150 },
      { tag: 'rules', hash: 'jkl012', sizeBytes: 50 },
      { tag: 'scripts', hash: 'mno345', sizeBytes: 300 },
      { tag: 'assets', hash: 'pqr678', sizeBytes: 80 },
    ],
    ...overrides,
  };
}

const worldPayload: TagPayloads['world'] = {
  world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
  background: { type: 'static', color: '#000' },
};

const prefabsPayload: TagPayloads['prefabs'] = {
  prefabs: {
    box: {
      id: 'box',
      physics: { bodyType: 'dynamic' },
      visual: { type: 'rect', width: 1, height: 1, color: '#f00' },
    },
  },
};

describe('R2ArtifactResolver', () => {
  it('resolves artifact from correct URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(worldPayload);
    const resolver = new R2ArtifactResolver({ baseUrl: 'https://cdn.example.com', fetcher });
    const manifest = createManifest();

    const result = await resolver.resolve(manifest, 'world');

    expect(fetcher).toHaveBeenCalledWith(
      'https://cdn.example.com/games/test-game/build/build-001/world.json',
    );
    expect(result).toEqual(worldPayload);
  });

  it('strips trailing slash from baseUrl', async () => {
    const fetcher = vi.fn().mockResolvedValue(worldPayload);
    const resolver = new R2ArtifactResolver({ baseUrl: 'https://cdn.example.com/', fetcher });
    const manifest = createManifest();

    await resolver.resolve(manifest, 'world');

    expect(fetcher).toHaveBeenCalledWith(
      'https://cdn.example.com/games/test-game/build/build-001/world.json',
    );
  });

  it('caches resolved artifacts by buildId:tag', async () => {
    const fetcher = vi.fn().mockResolvedValue(worldPayload);
    const resolver = new R2ArtifactResolver({ baseUrl: 'https://cdn.example.com', fetcher });
    const manifest = createManifest();

    await resolver.resolve(manifest, 'world');
    await resolver.resolve(manifest, 'world');

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when artifact hash changes', async () => {
    const fetcher = vi.fn().mockResolvedValue(worldPayload);
    const resolver = new R2ArtifactResolver({ baseUrl: 'https://cdn.example.com', fetcher });

    const manifest1 = createManifest();
    await resolver.resolve(manifest1, 'world');

    const manifest2 = createManifest({
      buildId: 'build-001',
      artifacts: [{ tag: 'world', hash: 'new-hash', sizeBytes: 100 }],
    });
    await resolver.resolve(manifest2, 'world');

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('throws ArtifactNotFoundError for missing tag', async () => {
    const resolver = new R2ArtifactResolver({
      baseUrl: 'https://cdn.example.com',
      fetcher: vi.fn(),
    });
    const manifest = createManifest({ artifacts: [] });

    await expect(resolver.resolve(manifest, 'world')).rejects.toThrow(ArtifactNotFoundError);
  });

  it('isCached returns true for cached artifact', async () => {
    const fetcher = vi.fn().mockResolvedValue(worldPayload);
    const resolver = new R2ArtifactResolver({ baseUrl: 'https://cdn.example.com', fetcher });
    const manifest = createManifest();

    expect(resolver.isCached(manifest, 'world')).toBe(false);
    await resolver.resolve(manifest, 'world');
    expect(resolver.isCached(manifest, 'world')).toBe(true);
  });

  it('clearCache invalidates all entries', async () => {
    const fetcher = vi.fn().mockResolvedValue(worldPayload);
    const resolver = new R2ArtifactResolver({ baseUrl: 'https://cdn.example.com', fetcher });
    const manifest = createManifest();

    await resolver.resolve(manifest, 'world');
    expect(resolver.isCached(manifest, 'world')).toBe(true);

    resolver.clearCache();
    expect(resolver.isCached(manifest, 'world')).toBe(false);
  });

  it('getArtifact returns artifact descriptor', () => {
    const resolver = new R2ArtifactResolver({ baseUrl: 'https://cdn.example.com', fetcher: vi.fn() });
    const manifest = createManifest();

    const artifact = resolver.getArtifact(manifest, 'world');
    expect(artifact).toEqual({ tag: 'world', hash: 'abc123', sizeBytes: 100 });
  });

  it('getArtifact returns undefined for missing tag', () => {
    const resolver = new R2ArtifactResolver({ baseUrl: 'https://cdn.example.com', fetcher: vi.fn() });
    const manifest = createManifest({ artifacts: [] });

    expect(resolver.getArtifact(manifest, 'world')).toBeUndefined();
  });
});

describe('InMemoryArtifactResolver', () => {
  it('resolves pre-loaded artifacts', async () => {
    const resolver = new InMemoryArtifactResolver({ world: worldPayload });
    const manifest = createManifest();

    const result = await resolver.resolve(manifest, 'world');
    expect(result).toEqual(worldPayload);
  });

  it('throws for missing tag', async () => {
    const resolver = new InMemoryArtifactResolver({});
    const manifest = createManifest();

    await expect(resolver.resolve(manifest, 'prefabs')).rejects.toThrow(ArtifactNotFoundError);
  });

  it('supports set() to add artifacts after construction', async () => {
    const resolver = new InMemoryArtifactResolver({});
    const manifest = createManifest();

    resolver.set('prefabs', prefabsPayload);
    const result = await resolver.resolve(manifest, 'prefabs');
    expect(result).toEqual(prefabsPayload);
  });
});
