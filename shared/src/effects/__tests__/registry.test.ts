import { describe, it, expect, beforeEach } from 'vitest';
import {
  ManifestRegistry,
  type NodeTypeRegistration,
  type SearchQuery,
} from '../registry';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeRegistration(
  overrides: Partial<NodeTypeRegistration> & { type: string },
): NodeTypeRegistration {
  return {
    family: 'filter',
    displayName: overrides.type,
    description: `A ${overrides.type} node`,
    inputSlots: [{ name: 'input', dataType: 'texture', required: true }],
    outputType: 'texture',
    defaultParams: {},
    paramsSchema: [],
    tags: [],
    performanceTier: 'medium',
    constraints: {},
    aiHints: {
      aliases: [],
      promptDescription: `Applies ${overrides.type}`,
      commonCombinations: [],
    },
    ...overrides,
  };
}

const gaussianBlur = makeRegistration({
  type: 'filter.blur.gaussian',
  displayName: 'Gaussian Blur',
  description: 'Applies a gaussian blur filter',
  tags: ['blur', 'post-process'],
  performanceTier: 'medium',
  constraints: {},
  aiHints: {
    aliases: ['gauss blur', 'soft blur'],
    promptDescription: 'Smooths the image with a gaussian kernel',
    commonCombinations: ['filter.bloom'],
  },
});

const bloom = makeRegistration({
  type: 'filter.bloom',
  displayName: 'Bloom',
  description: 'Adds bright-area bloom glow',
  family: 'filter',
  tags: ['glow', 'post-process', 'cinematic'],
  performanceTier: 'high',
  constraints: {
    requires: ['filter.blur.gaussian'],
  },
  aiHints: {
    aliases: ['glow', 'bloom effect'],
    promptDescription: 'Adds a glow around bright areas',
    commonCombinations: ['filter.blur.gaussian', 'combiner.blend'],
  },
});

const noiseGenerator = makeRegistration({
  type: 'generator.noise.perlin',
  displayName: 'Perlin Noise',
  description: 'Generates perlin noise texture',
  family: 'generator',
  tags: ['noise', 'procedural'],
  performanceTier: 'low',
  inputSlots: [],
  constraints: {},
  aiHints: {
    aliases: ['perlin', 'noise texture'],
    promptDescription: 'Generates a procedural noise pattern',
    commonCombinations: ['combiner.blend'],
  },
});

const blendCombiner = makeRegistration({
  type: 'combiner.blend',
  displayName: 'Blend',
  description: 'Blends two textures together',
  family: 'combiner',
  tags: ['blend', 'composite'],
  performanceTier: 'low',
  inputSlots: [
    { name: 'base', dataType: 'texture', required: true },
    { name: 'overlay', dataType: 'texture', required: true },
  ],
  constraints: {
    conflicts: ['combiner.add'],
  },
  aiHints: {
    aliases: ['mix', 'blend layers'],
    promptDescription: 'Blends two texture inputs using a blend mode',
    commonCombinations: ['generator.noise.perlin', 'filter.blur.gaussian'],
  },
});

const addCombiner = makeRegistration({
  type: 'combiner.add',
  displayName: 'Additive Blend',
  description: 'Adds two textures together',
  family: 'combiner',
  tags: ['blend', 'composite', 'glow'],
  performanceTier: 'low',
  inputSlots: [
    { name: 'base', dataType: 'texture', required: true },
    { name: 'overlay', dataType: 'texture', required: true },
  ],
  constraints: {
    conflicts: ['combiner.blend'],
  },
  aiHints: {
    aliases: ['add layers', 'additive'],
    promptDescription: 'Additively combines two textures',
    commonCombinations: ['filter.bloom'],
  },
});

const vignette = makeRegistration({
  type: 'filter.vignette',
  displayName: 'Vignette',
  description: 'Darkens edges of the screen',
  family: 'filter',
  tags: ['cinematic', 'post-process'],
  performanceTier: 'low',
  constraints: {
    after: ['filter.bloom'],
  },
  aiHints: {
    aliases: ['edge darkening', 'vignette effect'],
    promptDescription: 'Darkens the edges of the frame for a cinematic look',
    commonCombinations: ['filter.bloom', 'filter.blur.gaussian'],
  },
});

const ALL_FIXTURES = [gaussianBlur, bloom, noiseGenerator, blendCombiner, addCombiner, vignette];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ManifestRegistry', () => {
  let registry: ManifestRegistry;

  beforeEach(() => {
    registry = new ManifestRegistry();
  });

  // -------------------------------------------------------------------------
  // Registration basics
  // -------------------------------------------------------------------------

  describe('register / get / has', () => {
    it('registers and retrieves a node type', () => {
      registry.register(gaussianBlur);
      expect(registry.has('filter.blur.gaussian')).toBe(true);
      expect(registry.get('filter.blur.gaussian')).toEqual(gaussianBlur);
    });

    it('returns undefined for unregistered type', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('unregisters a node type', () => {
      registry.register(gaussianBlur);
      expect(registry.unregister('filter.blur.gaussian')).toBe(true);
      expect(registry.has('filter.blur.gaussian')).toBe(false);
      expect(registry.unregister('filter.blur.gaussian')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Deterministic iteration
  // -------------------------------------------------------------------------

  describe('getAll - deterministic order', () => {
    it('returns nodes sorted by type string regardless of insertion order', () => {
      for (const reg of [...ALL_FIXTURES].reverse()) {
        registry.register(reg);
      }
      const types = registry.getAll().map((r) => r.type);
      const sorted = [...types].sort();
      expect(types).toEqual(sorted);
    });

    it('returns identical order on repeated calls', () => {
      for (const reg of ALL_FIXTURES) {
        registry.register(reg);
      }
      const first = registry.getAll().map((r) => r.type);
      const second = registry.getAll().map((r) => r.type);
      expect(first).toEqual(second);
    });
  });

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  describe('search', () => {
    beforeEach(() => {
      for (const reg of ALL_FIXTURES) {
        registry.register(reg);
      }
    });

    it('search by tag returns matching results in stable order', () => {
      const results = registry.search({ tags: ['post-process'] });
      expect(results.length).toBe(3);
      for (const r of results) {
        expect(r.registration.tags).toContain('post-process');
      }
      const results2 = registry.search({ tags: ['post-process'] });
      expect(results2.map((r) => r.registration.type)).toEqual(
        results.map((r) => r.registration.type),
      );
    });

    it('search by family filters correctly', () => {
      const generators = registry.search({ family: 'generator' });
      expect(generators.length).toBe(1);
      expect(generators[0].registration.type).toBe('generator.noise.perlin');
    });

    it('search by performanceTier filters correctly', () => {
      const highPerf = registry.search({ performanceTier: 'high' });
      expect(highPerf.length).toBe(1);
      expect(highPerf[0].registration.type).toBe('filter.bloom');
    });

    it('search by free text matches aliases', () => {
      const results = registry.search({ text: 'gauss blur' });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].registration.type).toBe('filter.blur.gaussian');
    });

    it('search by free text matches displayName', () => {
      const results = registry.search({ text: 'Vignette' });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].registration.type).toBe('filter.vignette');
    });

    it('search by free text matches description', () => {
      const results = registry.search({ text: 'perlin noise' });
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].registration.type).toBe('generator.noise.perlin');
    });

    it('search with multiple criteria intersects them', () => {
      const results = registry.search({
        tags: ['post-process'],
        family: 'filter',
        performanceTier: 'medium',
      });
      expect(results.length).toBe(1);
      expect(results[0].registration.type).toBe('filter.blur.gaussian');
    });

    it('empty query returns all nodes in deterministic order', () => {
      const results = registry.search({});
      expect(results.length).toBe(ALL_FIXTURES.length);
      const types = results.map((r) => r.registration.type);
      const sorted = [...types].sort();
      expect(types).toEqual(sorted);
    });

    it('repeated search calls return identical results (determinism)', () => {
      const query: SearchQuery = { tags: ['glow'], text: 'bloom' };
      const run1 = registry.search(query);
      const run2 = registry.search(query);
      const run3 = registry.search(query);
      expect(run1.map((r) => r.registration.type)).toEqual(run2.map((r) => r.registration.type));
      expect(run2.map((r) => r.registration.type)).toEqual(run3.map((r) => r.registration.type));
      expect(run1.map((r) => r.relevanceScore)).toEqual(run2.map((r) => r.relevanceScore));
    });
  });

  // -------------------------------------------------------------------------
  // Alias resolution
  // -------------------------------------------------------------------------

  describe('resolveAlias', () => {
    it('maps alias to canonical type', () => {
      registry.register(gaussianBlur);
      registry.register(bloom);
      expect(registry.resolveAlias('gauss blur')).toBe('filter.blur.gaussian');
      expect(registry.resolveAlias('soft blur')).toBe('filter.blur.gaussian');
      expect(registry.resolveAlias('glow')).toBe('filter.bloom');
      expect(registry.resolveAlias('bloom effect')).toBe('filter.bloom');
    });

    it('returns undefined for unknown alias', () => {
      registry.register(gaussianBlur);
      expect(registry.resolveAlias('unknown effect')).toBeUndefined();
    });

    it('removes aliases on unregister', () => {
      registry.register(gaussianBlur);
      expect(registry.resolveAlias('gauss blur')).toBe('filter.blur.gaussian');
      registry.unregister('filter.blur.gaussian');
      expect(registry.resolveAlias('gauss blur')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // AI context
  // -------------------------------------------------------------------------

  describe('getAIContext', () => {
    it('returns formatted context for given types', () => {
      registry.register(gaussianBlur);
      registry.register(bloom);
      const context = registry.getAIContext(['filter.blur.gaussian', 'filter.bloom']);
      expect(context).toContain('filter.blur.gaussian');
      expect(context).toContain('Gaussian Blur');
      expect(context).toContain('Smooths the image with a gaussian kernel');
      expect(context).toContain('filter.bloom');
      expect(context).toContain('Bloom');
    });

    it('skips unknown types gracefully', () => {
      registry.register(gaussianBlur);
      const context = registry.getAIContext(['filter.blur.gaussian', 'nonexistent']);
      expect(context).toContain('filter.blur.gaussian');
      expect(context).not.toContain('nonexistent');
    });
  });

  // -------------------------------------------------------------------------
  // Constraint validation
  // -------------------------------------------------------------------------

  describe('validateConstraints', () => {
    beforeEach(() => {
      for (const reg of ALL_FIXTURES) {
        registry.register(reg);
      }
    });

    it('valid set passes', () => {
      const result = registry.validateConstraints([
        'filter.blur.gaussian',
        'filter.bloom',
        'filter.vignette',
      ]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing required dependencies', () => {
      const result = registry.validateConstraints(['filter.bloom']);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some((e) => e.includes('requires'))).toBe(true);
    });

    it('detects conflicts between node types', () => {
      const result = registry.validateConstraints(['combiner.blend', 'combiner.add']);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some((e) => e.includes('conflicts'))).toBe(true);
    });

    it('handles unknown types gracefully', () => {
      const result = registry.validateConstraints(['nonexistent.type']);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('nonexistent.type'))).toBe(true);
    });
  });
});
