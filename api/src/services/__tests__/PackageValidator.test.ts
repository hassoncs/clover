import { describe, it, expect } from 'vitest';
import { PackageValidator } from '../PackageValidator';
import type { BuildManifest, TagPayloads } from '@slopcade/shared';

function createManifest(overrides?: Partial<BuildManifest>): BuildManifest {
  return {
    packageManifest: { id: 'test-game', name: 'Test Game', version: '1.0.0' },
    buildId: 'build-001',
    createdAt: Date.now(),
    artifacts: [
      { tag: 'world', hash: 'abc123', sizeBytes: 100 },
      { tag: 'prefabs', hash: 'def456', sizeBytes: 200 },
      { tag: 'entities', hash: 'ghi789', sizeBytes: 300 },
      { tag: 'rules', hash: 'jkl012', sizeBytes: 150 },
      { tag: 'scripts', hash: 'mno345', sizeBytes: 50 },
      { tag: 'assets', hash: 'pqr678', sizeBytes: 80 },
    ],
    ...overrides,
  };
}

function createArtifacts(overrides?: Partial<TagPayloads>): TagPayloads {
  return {
    world: {
      world: { gravity: { x: 0, y: 9.8 }, pixelsPerMeter: 50 },
    },
    prefabs: {
      prefabs: {
        'ball-prefab': {
          id: 'ball-prefab',
          name: 'Ball',
          physics: { bodyType: 'dynamic' },
          collider: { shape: 'circle', radius: 0.5 },
          visual: { type: 'circle', radius: 0.5, color: '#FF0000' },
        } as any,
      },
    },
    entities: {
      entities: [
        {
          id: 'ball-1',
          name: 'Ball 1',
          template: 'ball-prefab',
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        } as any,
      ],
    },
    rules: {
      rules: [
        {
          id: 'rule-1',
          trigger: { type: 'tap' },
          actions: [],
        } as any,
      ],
    },
    scripts: {
      script: 'exports.onTick = function() {};',
    },
    assets: {
      urls: { 'ball-sprite': 'https://example.com/ball.png' },
    },
    ...overrides,
  };
}

describe('PackageValidator', () => {
  const validator = new PackageValidator();

  describe('validateBuild', () => {
    it('validates a correct build as valid', () => {
      const result = validator.validateBuild(createManifest(), createArtifacts());

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('reports missing buildId', () => {
      const manifest = createManifest({ buildId: '' });
      const result = validator.validateBuild(manifest, createArtifacts());

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_BUILD_ID' }),
      );
    });

    it('reports missing packageManifest id', () => {
      const manifest = createManifest({
        packageManifest: { id: '', name: 'Test', version: '1.0.0' },
      });
      const result = validator.validateBuild(manifest, createArtifacts());

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_PACKAGE_ID' }),
      );
    });

    it('reports missing artifact data for manifest entries', () => {
      const manifest = createManifest();
      const artifacts = createArtifacts();
      delete (artifacts as any).world;

      const result = validator.validateBuild(manifest, artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_ARTIFACT_DATA' }),
      );
    });

    it('reports duplicate prefab IDs', () => {
      const artifacts = createArtifacts({
        prefabs: {
          prefabs: {
            'key-a': { id: 'dup-id', name: 'A' } as any,
            'key-b': { id: 'dup-id', name: 'B' } as any,
          },
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'DUPLICATE_PREFAB_ID' }),
      );
    });

    it('reports missing prefab ID', () => {
      const artifacts = createArtifacts({
        prefabs: {
          prefabs: {
            'no-id': { name: 'No ID' } as any,
          },
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_PREFAB_ID' }),
      );
    });

    it('reports duplicate entity IDs', () => {
      const artifacts = createArtifacts({
        entities: {
          entities: [
            { id: 'dup', name: 'A', template: 'ball-prefab', transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } } as any,
            { id: 'dup', name: 'B', template: 'ball-prefab', transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 } } as any,
          ],
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'DUPLICATE_ENTITY_ID' }),
      );
    });

    it('reports entity referencing unknown prefab', () => {
      const artifacts = createArtifacts({
        entities: {
          entities: [
            {
              id: 'e1',
              name: 'E1',
              template: 'nonexistent-prefab',
              transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            } as any,
          ],
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'UNKNOWN_PREFAB_REFERENCE' }),
      );
    });

    it('warns on rule referencing unknown prefab in spawn action', () => {
      const artifacts = createArtifacts({
        rules: {
          rules: [
            {
              id: 'r1',
              trigger: { type: 'tap' },
              actions: [{ type: 'spawn', template: 'ghost-prefab' }],
            } as any,
          ],
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'UNKNOWN_RULE_PREFAB_REFERENCE' }),
      );
    });

    it('reports rule referencing unknown entity by ID', () => {
      const artifacts = createArtifacts({
        rules: {
          rules: [
            {
              id: 'r1',
              trigger: { type: 'collision' },
              actions: [
                {
                  type: 'destroy',
                  target: { type: 'by_id', entityId: 'nonexistent-entity' },
                },
              ],
            } as any,
          ],
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'UNKNOWN_RULE_ENTITY_REFERENCE' }),
      );
    });

    it('reports missing rule trigger as error', () => {
      const artifacts = createArtifacts({
        rules: {
          rules: [
            { id: 'r1', actions: [] } as any,
          ],
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_RULE_TRIGGER' }),
      );
    });

    it('reports invalid prefab bodyType', () => {
      const artifacts = createArtifacts({
        prefabs: {
          prefabs: {
            'bad-physics': {
              id: 'bad-physics',
              name: 'Bad',
              physics: { bodyType: 'invalid-type' },
            } as any,
          },
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_PREFAB_BODY_TYPE' }),
      );
    });

    it('handles empty artifacts gracefully', () => {
      const artifacts: Partial<TagPayloads> = {
        world: { world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 } },
        prefabs: { prefabs: {} },
        entities: { entities: [] },
        rules: { rules: [] },
        scripts: { script: '' },
        assets: { urls: {} },
      };
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('entity without template is valid', () => {
      const artifacts = createArtifacts({
        entities: {
          entities: [
            {
              id: 'standalone',
              name: 'Standalone',
              transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            } as any,
          ],
        },
      });
      const result = validator.validateBuild(createManifest(), artifacts);

      expect(result.valid).toBe(true);
    });
  });
});
