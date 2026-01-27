import { describe, it, expect, beforeEach } from 'vitest';
import { WatchRegistry } from '../WatchRegistry';
import type { PropertyWatchSpec } from '../types';

describe('WatchRegistry', () => {
  let registry: WatchRegistry;

  beforeEach(() => {
    registry = new WatchRegistry();
  });

  describe('addWatch', () => {
    it('adds a watch specification', () => {
      const spec: PropertyWatchSpec = {
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
      };

      registry.addWatch(spec);
      expect(registry.getAllWatches()).toHaveLength(1);
    });

    it('ignores duplicate watches', () => {
      const spec: PropertyWatchSpec = {
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
      };

      registry.addWatch(spec);
      registry.addWatch(spec);
      expect(registry.getAllWatches()).toHaveLength(1);
    });

    it('allows same property with different scopes', () => {
      registry.addWatch({
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
      });

      registry.addWatch({
        property: 'velocity.x',
        scope: { type: 'by_tag', tag: 'enemy' },
        frequency: 'frame',
      });

      expect(registry.getAllWatches()).toHaveLength(2);
    });
  });

  describe('addWatches', () => {
    it('adds multiple watches at once', () => {
      const specs: PropertyWatchSpec[] = [
        { property: 'velocity.x', scope: { type: 'all' }, frequency: 'frame' },
        { property: 'velocity.y', scope: { type: 'all' }, frequency: 'frame' },
        { property: 'health', scope: { type: 'by_tag', tag: 'player' }, frequency: 'change' },
      ];

      registry.addWatches(specs);
      expect(registry.getAllWatches()).toHaveLength(3);
    });
  });

  describe('removeWatch', () => {
    it('removes a watch specification', () => {
      const spec: PropertyWatchSpec = {
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
      };

      registry.addWatch(spec);
      expect(registry.getAllWatches()).toHaveLength(1);

      registry.removeWatch(spec);
      expect(registry.getAllWatches()).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('removes all watches', () => {
      registry.addWatch({ property: 'velocity.x', scope: { type: 'all' }, frequency: 'frame' });
      registry.addWatch({ property: 'velocity.y', scope: { type: 'all' }, frequency: 'frame' });

      registry.clear();
      expect(registry.getAllWatches()).toHaveLength(0);
    });
  });

  describe('getActiveConfig', () => {
    it('includes frame properties with all scope', () => {
      registry.addWatch({
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
      });

      const config = registry.getActiveConfig();
      expect(config.frameProperties.has('velocity.x')).toBe(true);
    });

    it('includes change properties for specific entities', () => {
      registry.addWatch({
        property: 'health',
        scope: { type: 'by_id', entityId: 'player-1' },
        frequency: 'change',
      });

      const config = registry.getActiveConfig();
      expect(config.changeProperties.get('health')?.has('player-1')).toBe(true);
    });

    it('includes entity watches', () => {
      registry.addWatch({
        property: 'velocity.x',
        scope: { type: 'by_id', entityId: 'ball-1' },
        frequency: 'frame',
      });

      const config = registry.getActiveConfig();
      expect(config.entityWatches.get('ball-1')?.has('velocity.x')).toBe(true);
    });

    it('includes tag watches', () => {
      registry.addWatch({
        property: 'health',
        scope: { type: 'by_tag', tag: 'enemy' },
        frequency: 'change',
      });

      const config = registry.getActiveConfig();
      expect(config.tagWatches.get('enemy')?.has('health')).toBe(true);
    });

    it('combines multiple watches correctly', () => {
      registry.addWatch({
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
      });

      registry.addWatch({
        property: 'velocity.y',
        scope: { type: 'all' },
        frequency: 'frame',
      });

      registry.addWatch({
        property: 'health',
        scope: { type: 'by_tag', tag: 'player' },
        frequency: 'change',
      });

      const config = registry.getActiveConfig();
      expect(config.frameProperties.size).toBe(2);
      expect(config.tagWatches.size).toBe(1);
    });
  });

  describe('getWatchesForProperty', () => {
    it('returns all watches for a specific property', () => {
      registry.addWatch({
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
      });

      registry.addWatch({
        property: 'velocity.x',
        scope: { type: 'by_tag', tag: 'enemy' },
        frequency: 'frame',
      });

      registry.addWatch({
        property: 'velocity.y',
        scope: { type: 'all' },
        frequency: 'frame',
      });

      const watches = registry.getWatchesForProperty('velocity.x');
      expect(watches).toHaveLength(2);
    });
  });

  describe('getWatchesForScope', () => {
    it('returns watches matching scope', () => {
      registry.addWatch({
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
      });

      registry.addWatch({
        property: 'velocity.y',
        scope: { type: 'by_tag', tag: 'enemy' },
        frequency: 'frame',
      });

      const allWatches = registry.getWatchesForScope({ type: 'all' });
      expect(allWatches).toHaveLength(1);
      expect(allWatches[0].property).toBe('velocity.x');

      const tagWatches = registry.getWatchesForScope({ type: 'by_tag', tag: 'enemy' });
      expect(tagWatches).toHaveLength(1);
      expect(tagWatches[0].property).toBe('velocity.y');
    });
  });
});
