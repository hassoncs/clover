import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyCache } from '../PropertyCache';
import { EntityContextProxy } from '../EntityContextProxy';

describe('EntityContextProxy', () => {
  let cache: PropertyCache;

  beforeEach(() => {
    cache = new PropertyCache();
  });

  describe('get/set', () => {
    it('gets and sets properties through proxy', () => {
      const proxy = new EntityContextProxy(cache, 'entity-1');

      proxy.set('velocity.x', 10);
      expect(proxy.get('velocity.x')).toBe(10);
    });

    it('returns undefined for non-existent properties', () => {
      const proxy = new EntityContextProxy(cache, 'entity-1');
      expect(proxy.get('unknownProperty')).toBeUndefined();
    });
  });

  describe('toObject', () => {
    it('returns property snapshot as object', () => {
      const proxy = new EntityContextProxy(cache, 'entity-1');

      proxy.set('transform.x', 100);
      proxy.set('transform.y', 200);
      proxy.set('velocity.x', 5);

      const obj = proxy.toObject();
      expect(obj).toEqual({
        'transform.x': 100,
        'transform.y': 200,
        'velocity.x': 5,
      });
    });

    it('returns empty object for entity without properties', () => {
      const proxy = new EntityContextProxy(cache, 'entity-1');
      expect(proxy.toObject()).toEqual({});
    });
  });

  describe('createEntityContext', () => {
    it('creates context with id property', () => {
      const context = EntityContextProxy.createEntityContext(cache, 'player-1');
      expect(context.id).toBe('player-1');
    });

    it('creates context with transform getters', () => {
      cache.set('player-1', 'transform.x', 50);
      cache.set('player-1', 'transform.y', 100);
      cache.set('player-1', 'transform.angle', 45);

      const context = EntityContextProxy.createEntityContext(cache, 'player-1');
      
      expect((context.transform as any).x).toBe(50);
      expect((context.transform as any).y).toBe(100);
      expect((context.transform as any).angle).toBe(45);
    });

    it('creates context with velocity getters', () => {
      cache.set('ball-1', 'velocity.x', 15);
      cache.set('ball-1', 'velocity.y', -8);

      const context = EntityContextProxy.createEntityContext(cache, 'ball-1');
      
      expect((context.velocity as any).x).toBe(15);
      expect((context.velocity as any).y).toBe(-8);
    });

    it('returns default 0 for missing velocity components', () => {
      const context = EntityContextProxy.createEntityContext(cache, 'ball-1');
      
      expect((context.velocity as any).x).toBe(0);
      expect((context.velocity as any).y).toBe(0);
    });

    it('creates context with angularVelocity getter', () => {
      cache.set('spinner-1', 'angularVelocity', 2.5);

      const context = EntityContextProxy.createEntityContext(cache, 'spinner-1');
      expect(context.angularVelocity).toBe(2.5);
    });

    it('returns default 0 for missing angularVelocity', () => {
      const context = EntityContextProxy.createEntityContext(cache, 'entity-1');
      expect(context.angularVelocity).toBe(0);
    });

    it('creates context with health getters', () => {
      cache.set('player-1', 'health', 80);
      cache.set('player-1', 'maxHealth', 100);

      const context = EntityContextProxy.createEntityContext(cache, 'player-1');
      expect(context.health).toBe(80);
      expect(context.maxHealth).toBe(100);
    });

    it('prevents setting transform object', () => {
      const context = EntityContextProxy.createEntityContext(cache, 'player-1');
      
      const result = Reflect.set(context, 'transform', { x: 999, y: 999, angle: 999 });
      expect(result).toBe(false);
    });

    it('prevents setting velocity object', () => {
      const context = EntityContextProxy.createEntityContext(cache, 'ball-1');
      
      const result = Reflect.set(context, 'velocity', { x: 999, y: 999 });
      expect(result).toBe(false);
    });

    it('reflects cache updates in transform getters', () => {
      const context = EntityContextProxy.createEntityContext(cache, 'player-1');

      cache.set('player-1', 'transform.x', 10);
      expect((context.transform as any).x).toBe(10);

      cache.set('player-1', 'transform.x', 20);
      expect((context.transform as any).x).toBe(20);
    });

    it('reflects cache updates in velocity getters', () => {
      const context = EntityContextProxy.createEntityContext(cache, 'ball-1');

      cache.set('ball-1', 'velocity.x', 5);
      expect((context.velocity as any).x).toBe(5);

      cache.set('ball-1', 'velocity.x', 15);
      expect((context.velocity as any).x).toBe(15);
    });
  });
});
