/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { appRouter } from '../../router';
import { initTestDatabase, createTestUser, createAuthenticatedContext } from '../../../__fixtures__/test-utils';
import type { AuthenticatedContext } from '../../context';
import type { BuildManifest, TagPayloads } from '@slopcade/shared';

function createValidManifest(): BuildManifest {
  return {
    packageManifest: { id: 'test-game', name: 'Test Game', version: '1.0.0' },
    buildId: 'build-001',
    createdAt: Date.now(),
    artifacts: [
      { tag: 'world', hash: 'abc', sizeBytes: 100 },
      { tag: 'prefabs', hash: 'def', sizeBytes: 200 },
      { tag: 'entities', hash: 'ghi', sizeBytes: 300 },
      { tag: 'rules', hash: 'jkl', sizeBytes: 150 },
      { tag: 'scripts', hash: 'mno', sizeBytes: 50 },
      { tag: 'assets', hash: 'pqr', sizeBytes: 80 },
    ],
  };
}

function createValidArtifacts(): TagPayloads {
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
        { id: 'rule-1', trigger: { type: 'tap' }, actions: [] } as any,
      ],
    },
    scripts: { script: '' },
    assets: { urls: {} },
  };
}

describe('Package Readiness Router', () => {
  let ctx: AuthenticatedContext;

  beforeAll(async () => {
    await initTestDatabase();
    await createTestUser();
  });

  beforeEach(() => {
    ctx = createAuthenticatedContext();
  });

  describe('check mutation', () => {
    it('marks a valid build as ready', async () => {
      const caller = appRouter.createCaller(ctx);

      const result = await caller.packageReadiness.check({
        gameId: 'game-1',
        buildId: 'build-001',
        manifest: JSON.stringify(createValidManifest()),
        artifacts: JSON.stringify(createValidArtifacts()),
      });

      expect(result.ready).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.gameId).toBe('game-1');
      expect(result.buildId).toBe('build-001');
      expect(result.checkedAt).toBeGreaterThan(0);
    });

    it('marks an invalid build as not ready', async () => {
      const caller = appRouter.createCaller(ctx);
      const artifacts = createValidArtifacts();
      artifacts.entities.entities = [
        {
          id: 'e1',
          name: 'E1',
          template: 'nonexistent',
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        } as any,
      ];

      const result = await caller.packageReadiness.check({
        gameId: 'game-2',
        buildId: 'build-002',
        manifest: JSON.stringify(createValidManifest()),
        artifacts: JSON.stringify(artifacts),
      });

      expect(result.ready).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'UNKNOWN_PREFAB_REFERENCE')).toBe(true);
    });

    it('rejects invalid manifest JSON', async () => {
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.packageReadiness.check({
          gameId: 'game-3',
          buildId: 'build-003',
          manifest: '{ invalid json }',
          artifacts: JSON.stringify(createValidArtifacts()),
        }),
      ).rejects.toThrow('Invalid manifest JSON');
    });

    it('rejects invalid artifacts JSON', async () => {
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.packageReadiness.check({
          gameId: 'game-4',
          buildId: 'build-004',
          manifest: JSON.stringify(createValidManifest()),
          artifacts: '{ invalid }',
        }),
      ).rejects.toThrow('Invalid artifacts JSON');
    });
  });

  describe('get query', () => {
    it('returns null when no readiness exists', async () => {
      const caller = appRouter.createCaller(ctx);

      const result = await caller.packageReadiness.get({
        gameId: 'nonexistent-game',
        buildId: 'nonexistent-build',
      });

      expect(result).toBeNull();
    });

    it('returns cached readiness after check', async () => {
      const caller = appRouter.createCaller(ctx);

      await caller.packageReadiness.check({
        gameId: 'game-get-test',
        buildId: 'build-get-test',
        manifest: JSON.stringify(createValidManifest()),
        artifacts: JSON.stringify(createValidArtifacts()),
      });

      const result = await caller.packageReadiness.get({
        gameId: 'game-get-test',
        buildId: 'build-get-test',
      });

      expect(result).not.toBeNull();
      expect(result!.ready).toBe(true);
      expect(result!.gameId).toBe('game-get-test');
      expect(result!.buildId).toBe('build-get-test');
    });

    it('returns latest readiness when buildId omitted', async () => {
      const caller = appRouter.createCaller(ctx);

      await caller.packageReadiness.check({
        gameId: 'game-latest',
        buildId: 'build-old',
        manifest: JSON.stringify(createValidManifest()),
        artifacts: JSON.stringify(createValidArtifacts()),
      });

      const laterManifest = createValidManifest();
      laterManifest.buildId = 'build-new';
      await caller.packageReadiness.check({
        gameId: 'game-latest',
        buildId: 'build-new',
        manifest: JSON.stringify(laterManifest),
        artifacts: JSON.stringify(createValidArtifacts()),
      });

      const result = await caller.packageReadiness.get({
        gameId: 'game-latest',
      });

      expect(result).not.toBeNull();
      expect(result!.buildId).toBe('build-new');
    });
  });
});
