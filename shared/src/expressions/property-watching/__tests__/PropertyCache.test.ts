import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropertyCache } from '../PropertyCache';
import type { PropertySyncPayload } from '../types';

describe('PropertyCache', () => {
  let cache: PropertyCache;

  beforeEach(() => {
    cache = new PropertyCache();
  });

  describe('update', () => {
    it('updates cache with payload data', () => {
      const payload: PropertySyncPayload = {
        frameId: 100,
        timestamp: Date.now(),
        entities: {
          'entity-1': {
            'transform.x': 10,
            'transform.y': 20,
            'velocity.x': 5,
          },
        },
      };

      cache.update(payload);

      expect(cache.get('entity-1', 'transform.x')).toBe(10);
      expect(cache.get('entity-1', 'transform.y')).toBe(20);
      expect(cache.get('entity-1', 'velocity.x')).toBe(5);
      expect(cache.getCurrentFrame()).toBe(100);
    });

    it('overwrites previous data', () => {
      cache.update({
        frameId: 1,
        timestamp: 1000,
        entities: { 'entity-1': { 'transform.x': 10 } },
      });

      cache.update({
        frameId: 2,
        timestamp: 2000,
        entities: { 'entity-1': { 'transform.x': 20 } },
      });

      expect(cache.get('entity-1', 'transform.x')).toBe(20);
      expect(cache.getCurrentFrame()).toBe(2);
    });
  });

  describe('get/set', () => {
    it('returns undefined for non-existent entity', () => {
      expect(cache.get('unknown', 'transform.x')).toBeUndefined();
    });

    it('returns undefined for non-existent property', () => {
      cache.set('entity-1', 'transform.x', 10);
      expect(cache.get('entity-1', 'transform.y')).toBeUndefined();
    });

    it('sets and gets property values', () => {
      cache.set('entity-1', 'transform.x', 15);
      cache.set('entity-1', 'velocity.y', 8);

      expect(cache.get('entity-1', 'transform.x')).toBe(15);
      expect(cache.get('entity-1', 'velocity.y')).toBe(8);
    });

    it('creates entity snapshot on first set', () => {
      expect(cache.has('entity-1')).toBe(false);
      cache.set('entity-1', 'health', 100);
      expect(cache.has('entity-1')).toBe(true);
    });
  });

  describe('getSnapshot/setSnapshot', () => {
    it('returns snapshot copy', () => {
      cache.set('entity-1', 'transform.x', 10);
      cache.set('entity-1', 'transform.y', 20);

      const snapshot = cache.getSnapshot('entity-1');
      expect(snapshot).toEqual({
        'transform.x': 10,
        'transform.y': 20,
      });
    });

    it('returns undefined for non-existent entity', () => {
      expect(cache.getSnapshot('unknown')).toBeUndefined();
    });

    it('sets entire snapshot', () => {
      cache.setSnapshot('entity-1', {
        'transform.x': 30,
        'velocity.x': 5,
        health: 80,
      });

      expect(cache.get('entity-1', 'transform.x')).toBe(30);
      expect(cache.get('entity-1', 'velocity.x')).toBe(5);
      expect(cache.get('entity-1', 'health')).toBe(80);
    });

    it('snapshot is independent copy', () => {
      cache.set('entity-1', 'transform.x', 10);
      const snapshot = cache.getSnapshot('entity-1');
      
      if (snapshot) {
        snapshot['transform.x'] = 999;
      }

      expect(cache.get('entity-1', 'transform.x')).toBe(10);
    });
  });

  describe('has/delete', () => {
    it('checks entity existence', () => {
      expect(cache.has('entity-1')).toBe(false);
      cache.set('entity-1', 'transform.x', 10);
      expect(cache.has('entity-1')).toBe(true);
    });

    it('deletes entity snapshot', () => {
      cache.set('entity-1', 'transform.x', 10);
      expect(cache.has('entity-1')).toBe(true);

      cache.delete('entity-1');
      expect(cache.has('entity-1')).toBe(false);
      expect(cache.get('entity-1', 'transform.x')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('clears all data', () => {
      cache.update({
        frameId: 100,
        timestamp: 5000,
        entities: {
          'entity-1': { 'transform.x': 10 },
          'entity-2': { 'transform.y': 20 },
        },
      });

      cache.clear();

      expect(cache.getSize()).toBe(0);
      expect(cache.getCurrentFrame()).toBe(0);
      expect(cache.getTimestamp()).toBe(0);
      expect(cache.has('entity-1')).toBe(false);
      expect(cache.has('entity-2')).toBe(false);
    });
  });

  describe('getAllEntityIds', () => {
    it('returns all entity IDs', () => {
      cache.set('entity-1', 'transform.x', 10);
      cache.set('entity-2', 'transform.y', 20);
      cache.set('entity-3', 'velocity.x', 5);

      const ids = cache.getAllEntityIds();
      expect(ids).toContain('entity-1');
      expect(ids).toContain('entity-2');
      expect(ids).toContain('entity-3');
      expect(ids.length).toBe(3);
    });
  });

  describe('getSize', () => {
    it('returns number of cached entities', () => {
      expect(cache.getSize()).toBe(0);

      cache.set('entity-1', 'transform.x', 10);
      expect(cache.getSize()).toBe(1);

      cache.set('entity-2', 'transform.y', 20);
      expect(cache.getSize()).toBe(2);

      cache.delete('entity-1');
      expect(cache.getSize()).toBe(1);
    });
  });

  describe('type coercion', () => {
    it('should coerce string numbers to numbers', () => {
      const payload: PropertySyncPayload = {
        frameId: 1,
        timestamp: 1000,
        entities: {
          'entity-1': {
            'transform.x': '42' as any,
            'velocity.y': '3.14' as any,
          },
        },
      };

      cache.update(payload);

      expect(cache.get('entity-1', 'transform.x')).toBe(42);
      expect(cache.get('entity-1', 'velocity.y')).toBe(3.14);
    });

    it('should coerce boolean to number', () => {
      const payload: PropertySyncPayload = {
        frameId: 1,
        timestamp: 1000,
        entities: {
          'entity-1': {
            'transform.x': true as any,
            'transform.y': false as any,
          },
        },
      };

      cache.update(payload);

      expect(cache.get('entity-1', 'transform.x')).toBe(1);
      expect(cache.get('entity-1', 'transform.y')).toBe(0);
    });

    it('should handle custom properties with inferred types', () => {
      const payload: PropertySyncPayload = {
        frameId: 1,
        timestamp: 1000,
        entities: {
          'player': {
            'stats.strength': 10,
            'stats.agility': 15,
            'inventory[0]': 'sword',
          },
        },
      };

      cache.update(payload);

      expect(cache.get('player', 'stats.strength')).toBe(10);
      expect(cache.get('player', 'stats.agility')).toBe(15);
      expect(cache.get('player', 'inventory[0]')).toBe('sword');
    });

    it('should validate types when validation enabled and coerce invalid values', () => {
      const cacheWithValidation = new PropertyCache(true);
      
      const payload: PropertySyncPayload = {
        frameId: 1,
        timestamp: 1000,
        entities: {
          'entity-1': {
            'transform.x': 42,
            'transform.y': '10' as any,
            'custom.flag': true as any,
          },
        },
      };

      cacheWithValidation.update(payload);

      expect(cacheWithValidation.get('entity-1', 'transform.x')).toBe(42);
      expect(cacheWithValidation.get('entity-1', 'transform.y')).toBe(10);
      expect(cacheWithValidation.get('entity-1', 'custom.flag')).toBe(true);
    });
  });
});
