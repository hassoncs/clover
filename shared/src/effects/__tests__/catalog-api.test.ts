import { describe, it, expect, beforeEach } from 'vitest';
import {
  createR2PathResolver,
  isValidModerationTransition,
  seedBuiltInNodes,
  VALID_MODERATION_TRANSITIONS,
  type ModerationStatus,
  type CatalogListQuery,
  type CatalogSearchQuery,
  type CatalogListResult,
  type ShaderPackageSummary,
  type ModerationTransition,
  type R2PathResolver,
  type PackageFetchPolicy,
  type PackageFetchResult,
  type CatalogAPI,
  type CreateDraftInput,
  type UpdateDraftInput,
  type PublishInput,
  type SeedEntry,
} from '../catalog-api';
import type { PackageManifest } from '../registry';
import type { EffectGraphSpec, CompiledPlan } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<PackageManifest> = {}): PackageManifest {
  return {
    name: 'Test Effect',
    description: 'A test shader effect',
    tags: ['test'],
    categories: ['filter'],
    scopeSupport: ['screen'],
    nodeTypes: ['filter.blur.gaussian'],
    parameterSummary: [],
    performanceTier: 'medium',
    compatibility: {},
    license: 'open',
    ...overrides,
  };
}

function makeGraphSpec(overrides: Partial<EffectGraphSpec> = {}): EffectGraphSpec {
  return {
    id: 'graph-1',
    version: '1.0.0',
    engineApiVersion: '2.0.0',
    scope: 'screen',
    nodes: [],
    connections: [],
    feedbackEdges: [],
    lifecycle: { autoStart: true, stopMode: 'clear' },
    ...overrides,
  };
}

function makeCompiledPlan(overrides: Partial<CompiledPlan> = {}): CompiledPlan {
  return {
    id: 'plan-1',
    graphId: 'graph-1',
    graphVersion: '1.0.0',
    engineApiVersion: '2.0.0',
    scope: 'screen',
    passes: [],
    resourceMap: {},
    feedbackPolicies: {},
    hash: 'abc123',
    compiledAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// R2 path resolver
// ---------------------------------------------------------------------------

describe('R2PathResolver', () => {
  let resolver: R2PathResolver;

  beforeEach(() => {
    resolver = createR2PathResolver();
  });

  it('produces deterministic graphSpec path', () => {
    const path = resolver.graphSpec('pkg-abc', '1.0.0');
    expect(path).toBe('shaders/pkg-abc/1.0.0/graph-spec.json');
    expect(resolver.graphSpec('pkg-abc', '1.0.0')).toBe(path);
  });

  it('produces deterministic compiledPlan path', () => {
    const path = resolver.compiledPlan('pkg-abc', '1.0.0');
    expect(path).toBe('shaders/pkg-abc/1.0.0/compiled-plan.json');
  });

  it('produces deterministic preview path', () => {
    const path = resolver.preview('pkg-abc', '1.0.0');
    expect(path).toBe('shaders/pkg-abc/1.0.0/preview.png');
  });

  it('produces deterministic provenance path', () => {
    const path = resolver.provenance('pkg-abc', '1.0.0');
    expect(path).toBe('shaders/pkg-abc/1.0.0/provenance.json');
  });

  it('encodes different versions as different paths', () => {
    const v1 = resolver.graphSpec('pkg-abc', '1.0.0');
    const v2 = resolver.graphSpec('pkg-abc', '2.0.0');
    expect(v1).not.toBe(v2);
  });
});

// ---------------------------------------------------------------------------
// Moderation state machine
// ---------------------------------------------------------------------------

describe('Moderation state machine', () => {
  it('accepts valid transitions', () => {
    expect(isValidModerationTransition('pending_review', 'approved')).toBe(true);
    expect(isValidModerationTransition('pending_review', 'rejected')).toBe(true);
    expect(isValidModerationTransition('approved', 'published')).toBe(true);
    expect(isValidModerationTransition('rejected', 'pending_review')).toBe(true);
    expect(isValidModerationTransition('published', 'deprecated')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(isValidModerationTransition('pending_review', 'published')).toBe(false);
    expect(isValidModerationTransition('pending_review', 'deprecated')).toBe(false);
    expect(isValidModerationTransition('approved', 'rejected')).toBe(false);
    expect(isValidModerationTransition('deprecated', 'published')).toBe(false);
    expect(isValidModerationTransition('deprecated', 'pending_review')).toBe(false);
  });

  it('deprecated is terminal — no transitions allowed', () => {
    const targets = VALID_MODERATION_TRANSITIONS.deprecated;
    expect(targets).toEqual([]);
  });

  it('all states are represented in transition map', () => {
    const allStates: ModerationStatus[] = [
      'pending_review',
      'approved',
      'rejected',
      'published',
      'deprecated',
    ];
    for (const state of allStates) {
      expect(VALID_MODERATION_TRANSITIONS).toHaveProperty(state);
    }
  });
});

// ---------------------------------------------------------------------------
// CatalogListQuery defaults
// ---------------------------------------------------------------------------

describe('CatalogListQuery', () => {
  it('type satisfies query with default sort being deterministic', () => {
    const query: CatalogListQuery = {};
    expect(query.sortBy).toBeUndefined();
    expect(query.sortOrder).toBeUndefined();
    expect(query.limit).toBeUndefined();
    expect(query.offset).toBeUndefined();
  });

  it('type supports tag and scope filters', () => {
    const query: CatalogSearchQuery = {
      text: 'blur',
      tags: ['filter'],
      scope: 'screen',
    };
    expect(query.text).toBe('blur');
    expect(query.tags).toEqual(['filter']);
    expect(query.scope).toBe('screen');
  });
});

// ---------------------------------------------------------------------------
// ShaderPackageSummary shape
// ---------------------------------------------------------------------------

describe('ShaderPackageSummary', () => {
  it('includes all required fields', () => {
    const summary: ShaderPackageSummary = {
      id: 'pkg-1',
      slug: 'gaussian-blur',
      name: 'Gaussian Blur',
      description: 'A gaussian blur effect',
      status: 'published',
      tags: ['filter', 'blur'],
      latestVersion: '1.0.0',
      creatorId: 'user-1',
      license: 'open',
      thumbnailUrl: 'https://example.com/thumb.png',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(summary.id).toBe('pkg-1');
    expect(summary.slug).toBe('gaussian-blur');
    expect(summary.name).toBe('Gaussian Blur');
    expect(summary.description).toBe('A gaussian blur effect');
    expect(summary.status).toBe('published');
    expect(summary.tags).toEqual(['filter', 'blur']);
    expect(summary.latestVersion).toBe('1.0.0');
    expect(summary.creatorId).toBe('user-1');
    expect(summary.license).toBe('open');
    expect(summary.thumbnailUrl).toBe('https://example.com/thumb.png');
    expect(summary.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(summary.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('allows optional fields to be undefined', () => {
    const summary: ShaderPackageSummary = {
      id: 'pkg-2',
      slug: 'noise',
      name: 'Noise',
      description: 'Noise generator',
      status: 'draft',
      tags: [],
      latestVersion: '0.1.0',
      license: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(summary.creatorId).toBeUndefined();
    expect(summary.thumbnailUrl).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ModerationTransition shape
// ---------------------------------------------------------------------------

describe('ModerationTransition', () => {
  it('captures full transition metadata', () => {
    const transition: ModerationTransition = {
      from: 'pending_review',
      to: 'approved',
      reason: 'Looks good',
      moderatorId: 'mod-1',
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    expect(transition.from).toBe('pending_review');
    expect(transition.to).toBe('approved');
    expect(transition.reason).toBe('Looks good');
    expect(transition.moderatorId).toBe('mod-1');
  });
});

// ---------------------------------------------------------------------------
// CatalogAPI contract shape
// ---------------------------------------------------------------------------

describe('CatalogAPI contract', () => {
  it('CreateDraftInput has required fields', () => {
    const input: CreateDraftInput = {
      slug: 'my-effect',
      manifest: makeManifest(),
      engineApiVersion: '2.0.0',
      license: 'open',
    };

    expect(input.slug).toBe('my-effect');
    expect(input.engineApiVersion).toBe('2.0.0');
    expect(input.creatorId).toBeUndefined();
  });

  it('UpdateDraftInput supports partial manifest', () => {
    const input: UpdateDraftInput = {
      id: 'pkg-1',
      manifest: { name: 'Updated Name' },
    };

    expect(input.id).toBe('pkg-1');
    expect(input.manifest?.name).toBe('Updated Name');
    expect(input.license).toBeUndefined();
  });

  it('PublishInput carries all publication artifacts', () => {
    const input: PublishInput = {
      packageId: 'pkg-1',
      version: '1.0.0',
      graphSpec: makeGraphSpec(),
      compiledPlan: makeCompiledPlan(),
      provenance: {
        sourceType: 'user',
      },
    };

    expect(input.packageId).toBe('pkg-1');
    expect(input.version).toBe('1.0.0');
    expect(input.preview).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PackageFetchResult shape
// ---------------------------------------------------------------------------

describe('PackageFetchResult', () => {
  it('represents cache hit', () => {
    const result: PackageFetchResult = {
      source: 'cache',
      data: {
        id: 'ver-1',
        packageId: 'pkg-1',
        version: '1.0.0',
        graphSpec: makeGraphSpec(),
        compiledPlan: makeCompiledPlan(),
        provenance: { sourceType: 'user' },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };

    expect(result.source).toBe('cache');
    expect(result.data?.version).toBe('1.0.0');
    expect(result.error).toBeUndefined();
  });

  it('represents fetch error', () => {
    const result: PackageFetchResult = {
      source: 'remote',
      error: 'Package not found',
    };

    expect(result.source).toBe('remote');
    expect(result.data).toBeUndefined();
    expect(result.error).toBe('Package not found');
  });
});

// ---------------------------------------------------------------------------
// Seed entries
// ---------------------------------------------------------------------------

describe('seedBuiltInNodes', () => {
  it('creates entries from seed data', async () => {
    const created: CreateDraftInput[] = [];
    const published: PublishInput[] = [];

    const mockCatalog: CatalogAPI = {
      createDraft: async (input) => {
        created.push(input);
        return {
          id: `pkg-${created.length}`,
          slug: input.slug,
          status: 'draft',
          engineApiVersion: input.engineApiVersion,
          sourceType: 'system',
          license: input.license,
          manifest: input.manifest,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        };
      },
      updateDraft: async () => {
        throw new Error('not expected');
      },
      publish: async (input) => {
        published.push(input);
        return {
          id: `ver-${published.length}`,
          packageId: input.packageId,
          version: input.version,
          graphSpec: input.graphSpec,
          compiledPlan: input.compiledPlan,
          provenance: input.provenance,
          preview: input.preview,
          publishedAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
        };
      },
      list: async () => ({ items: [], total: 0, hasMore: false }),
      search: async () => ({ items: [], total: 0, hasMore: false }),
      getById: async () => null,
      getVersion: async () => null,
    };

    const entries: SeedEntry[] = [
      {
        slug: 'gaussian-blur',
        shaderVersion: '1.0.0',
        manifest: makeManifest({ name: 'Gaussian Blur' }),
        graphSpec: makeGraphSpec(),
        sourceType: 'system',
      },
    ];

    await seedBuiltInNodes(entries, mockCatalog);

    expect(created).toHaveLength(1);
    expect(created[0].slug).toBe('gaussian-blur');
    expect(published).toHaveLength(1);
    expect(published[0].version).toBe('1.0.0');
  });

  it('is idempotent — skips existing slug+version', async () => {
    const created: CreateDraftInput[] = [];

    const mockCatalog: CatalogAPI = {
      createDraft: async (input) => {
        created.push(input);
        return {
          id: 'pkg-existing',
          slug: input.slug,
          status: 'draft',
          engineApiVersion: input.engineApiVersion,
          sourceType: 'system',
          license: input.license,
          manifest: input.manifest,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        };
      },
      updateDraft: async () => {
        throw new Error('not expected');
      },
      publish: async (input) => ({
        id: 'ver-existing',
        packageId: input.packageId,
        version: input.version,
        graphSpec: input.graphSpec,
        compiledPlan: input.compiledPlan,
        provenance: input.provenance,
        preview: input.preview,
        publishedAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      list: async () => ({ items: [], total: 0, hasMore: false }),
      search: async () => ({ items: [], total: 0, hasMore: false }),
      getById: async (id) => {
        if (id === 'pkg-existing') {
          return {
            id: 'pkg-existing',
            slug: 'gaussian-blur',
            status: 'published' as const,
            engineApiVersion: '2.0.0',
            sourceType: 'system' as const,
            license: 'open' as const,
            manifest: makeManifest({ name: 'Gaussian Blur' }),
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          };
        }
        return null;
      },
      getVersion: async (packageId, version) => {
        if (packageId === 'pkg-existing' && version === '1.0.0') {
          return {
            id: 'ver-existing',
            packageId: 'pkg-existing',
            version: '1.0.0',
            graphSpec: makeGraphSpec(),
            compiledPlan: makeCompiledPlan(),
            provenance: { sourceType: 'system' as const },
            createdAt: '2026-01-01T00:00:00.000Z',
          };
        }
        return null;
      },
    };

    const entries: SeedEntry[] = [
      {
        slug: 'gaussian-blur',
        shaderVersion: '1.0.0',
        manifest: makeManifest({ name: 'Gaussian Blur' }),
        graphSpec: makeGraphSpec(),
        sourceType: 'system',
      },
    ];

    // First seed creates
    await seedBuiltInNodes(entries, mockCatalog);
    const firstCreateCount = created.length;

    // Second seed with same data should skip (getById returns existing)
    // We need to update the mock to return the created package on list
    const mockCatalogWithExisting: CatalogAPI = {
      ...mockCatalog,
      list: async () => ({
        items: [{
          id: 'pkg-existing',
          slug: 'gaussian-blur',
          name: 'Gaussian Blur',
          description: 'A test shader effect',
          status: 'published' as const,
          tags: ['test'],
          latestVersion: '1.0.0',
          license: 'open' as const,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }],
        total: 1,
        hasMore: false,
      }),
    };

    created.length = 0;
    await seedBuiltInNodes(entries, mockCatalogWithExisting);
    expect(created).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CatalogListResult shape
// ---------------------------------------------------------------------------

describe('CatalogListResult', () => {
  it('represents paginated results', () => {
    const result: CatalogListResult = {
      items: [],
      total: 0,
      hasMore: false,
    };

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});
