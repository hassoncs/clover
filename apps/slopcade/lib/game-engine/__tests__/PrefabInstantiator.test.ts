import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrefabDefinition, PrefabRegistry } from '@slopcade/shared';
import type { GodotBridge } from '../../godot/types';
import { PrefabInstantiator } from '../PrefabInstantiator';

function createMockBridge(): GodotBridge {
  return {
    spawnEntity: vi.fn(),
    instantiateFromScene: vi.fn().mockResolvedValue({ entityId: 'scene-entity-1' }),
    initialize: vi.fn(),
    dispose: vi.fn(),
    loadGame: vi.fn(),
    clearGame: vi.fn(),
    setupWorld: vi.fn(),
    registerPrefabs: vi.fn(),
    loadEntities: vi.fn(),
    clearEntities: vi.fn(),
    pausePhysics: vi.fn(),
    resumePhysics: vi.fn(),
    preloadTextures: vi.fn().mockResolvedValue({ completed: 0, failed: 0 }),
  } as unknown as GodotBridge;
}

const dataPrefab: PrefabDefinition = {
  type: 'data',
  id: 'box',
  entityPrefab: {
    id: 'box',
    physics: { bodyType: 'dynamic' },
  } as any,
};

const scenePrefab: PrefabDefinition = {
  type: 'scene',
  id: 'enemy',
  scenePath: 'res://scenes/enemy.tscn',
};

describe('PrefabInstantiator', () => {
  let bridge: GodotBridge;
  let instantiator: PrefabInstantiator;

  beforeEach(() => {
    bridge = createMockBridge();
    instantiator = new PrefabInstantiator(bridge);
  });

  describe('registry management', () => {
    it('registers and retrieves a prefab', () => {
      instantiator.registerPrefab('box', dataPrefab);

      expect(instantiator.getPrefab('box')).toBe(dataPrefab);
    });

    it('registers multiple prefabs via registerPrefabs', () => {
      const registry: PrefabRegistry = {
        box: dataPrefab,
        enemy: scenePrefab,
      };
      instantiator.registerPrefabs(registry);

      expect(instantiator.getRegisteredIds()).toEqual(['box', 'enemy']);
    });

    it('unregisters a prefab', () => {
      instantiator.registerPrefab('box', dataPrefab);
      instantiator.unregisterPrefab('box');

      expect(instantiator.getPrefab('box')).toBeUndefined();
    });

    it('clears all prefabs', () => {
      instantiator.registerPrefab('box', dataPrefab);
      instantiator.registerPrefab('enemy', scenePrefab);
      instantiator.clearRegistry();

      expect(instantiator.getRegisteredIds()).toEqual([]);
    });

    it('returns undefined for unregistered prefab', () => {
      expect(instantiator.getPrefab('nonexistent')).toBeUndefined();
    });
  });

  describe('data-backed instantiation', () => {
    it('calls bridge.spawnEntity for data prefabs', async () => {
      instantiator.registerPrefab('box', dataPrefab);

      const result = await instantiator.instantiate('box', {
        position: { x: 5, y: 3 },
      });

      expect(result.type).toBe('data');
      expect(result.prefabId).toBe('box');
      expect(bridge.spawnEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          prefabId: 'box',
          position: { x: 5, y: 3 },
        }),
      );
    });

    it('generates entityId when not provided', async () => {
      instantiator.registerPrefab('box', dataPrefab);

      const result = await instantiator.instantiate('box');

      expect(result.entityId).toMatch(/^box_/);
    });

    it('uses provided entityId', async () => {
      instantiator.registerPrefab('box', dataPrefab);

      const result = await instantiator.instantiate('box', {
        entityId: 'my-box-1',
      });

      expect(result.entityId).toBe('my-box-1');
    });

    it('passes velocity to spawnEntity', async () => {
      instantiator.registerPrefab('box', dataPrefab);

      await instantiator.instantiate('box', {
        position: { x: 0, y: 0 },
        velocity: { x: 10, y: -5 },
      });

      expect(bridge.spawnEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          velocity: { x: 10, y: -5 },
        }),
      );
    });

    it('defaults position to origin', async () => {
      instantiator.registerPrefab('box', dataPrefab);

      await instantiator.instantiate('box');

      expect(bridge.spawnEntity).toHaveBeenCalledWith(
        expect.objectContaining({
          position: { x: 0, y: 0 },
        }),
      );
    });
  });

  describe('scene-backed instantiation', () => {
    it('calls bridge.instantiateFromScene for scene prefabs', async () => {
      instantiator.registerPrefab('enemy', scenePrefab);

      const result = await instantiator.instantiate('enemy', {
        position: { x: 10, y: 20 },
      });

      expect(result.type).toBe('scene');
      expect(result.prefabId).toBe('enemy');
      expect(bridge.instantiateFromScene).toHaveBeenCalledWith(
        'res://scenes/enemy.tscn',
        expect.any(String),
        { x: 10, y: 20 },
        undefined,
      );
    });

    it('passes properties to instantiateFromScene', async () => {
      instantiator.registerPrefab('enemy', scenePrefab);

      await instantiator.instantiate('enemy', {
        position: { x: 0, y: 0 },
        properties: { health: 100, speed: 5 },
      });

      expect(bridge.instantiateFromScene).toHaveBeenCalledWith(
        'res://scenes/enemy.tscn',
        expect.any(String),
        { x: 0, y: 0 },
        { health: 100, speed: 5 },
      );
    });

    it('defaults position to origin for scene prefabs', async () => {
      instantiator.registerPrefab('enemy', scenePrefab);

      await instantiator.instantiate('enemy');

      expect(bridge.instantiateFromScene).toHaveBeenCalledWith(
        'res://scenes/enemy.tscn',
        expect.any(String),
        { x: 0, y: 0 },
        undefined,
      );
    });
  });

  describe('mixed registry', () => {
    it('routes data and scene prefabs through same API', async () => {
      instantiator.registerPrefab('box', dataPrefab);
      instantiator.registerPrefab('enemy', scenePrefab);

      const dataResult = await instantiator.instantiate('box');
      const sceneResult = await instantiator.instantiate('enemy');

      expect(dataResult.type).toBe('data');
      expect(sceneResult.type).toBe('scene');
      expect(bridge.spawnEntity).toHaveBeenCalledTimes(1);
      expect(bridge.instantiateFromScene).toHaveBeenCalledTimes(1);
    });

    it('throws for unregistered prefab', async () => {
      await expect(instantiator.instantiate('nonexistent')).rejects.toThrow(
        'Prefab not found: nonexistent',
      );
    });
  });
});
