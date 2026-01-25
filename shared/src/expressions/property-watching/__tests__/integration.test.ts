/**
 * Property Watching System - Integration Tests
 * 
 * Tests the complete flow from property sync to expression evaluation
 */

import { describe, it, expect } from 'vitest';
import { WatchRegistry } from '../WatchRegistry';
import { PropertyCache } from '../PropertyCache';
import { EntityContextProxy } from '../EntityContextProxy';
import type { PropertyWatchSpec } from '../types';

describe('Property Watching Integration', () => {
  it('should register watches and generate config', () => {
    const watches: PropertyWatchSpec[] = [
      {
        property: 'velocity.x',
        scope: { type: 'all' },
        frequency: 'frame',
        debugName: 'Template[ball].Behavior[0:maintain_speed].speed',
      },
      {
        property: 'velocity.y',
        scope: { type: 'all' },
        frequency: 'frame',
        debugName: 'Template[ball].Behavior[0:maintain_speed].speed',
      },
    ];

    const registry = new WatchRegistry();
    for (const watch of watches) {
      registry.addWatch(watch);
    }

    const config = registry.getActiveConfig();

    expect(config.frameProperties).toBeDefined();
    expect(config.frameProperties.has('velocity.x')).toBe(true);
    expect(config.frameProperties.has('velocity.y')).toBe(true);
  });

  it('should sync properties through cache', () => {
    const cache = new PropertyCache();

    const payload = {
      frameId: 1,
      timestamp: Date.now(),
      entities: {
        ball_1: {
          'velocity.x': 5.0,
          'velocity.y': 3.0,
          'transform.x': 10.0,
          'transform.y': 5.0,
          'transform.angle': 0.5,
        },
      },
    };

    cache.update(payload);

    expect(cache.get('ball_1', 'velocity.x')).toBe(5.0);
    expect(cache.get('ball_1', 'velocity.y')).toBe(3.0);
    expect(cache.get('ball_1', 'transform.x')).toBe(10.0);
  });

  it('should provide entity context via proxy', () => {
    const cache = new PropertyCache();

    cache.update({
      frameId: 1,
      timestamp: Date.now(),
      entities: {
        player_1: {
          'velocity.x': 2.0,
          'velocity.y': 1.0,
          health: 75,
          maxHealth: 100,
        },
      },
    });

    const entityContext = EntityContextProxy.createEntityContext(
      cache,
      'player_1'
    );

    expect(entityContext.velocity).toEqual({ x: 2.0, y: 1.0 });
    expect(entityContext.health).toBe(75);
    expect(entityContext.maxHealth).toBe(100);
  });

  it('should handle missing properties gracefully', () => {
    const cache = new PropertyCache();

    cache.update({
      frameId: 1,
      timestamp: Date.now(),
      entities: {
        enemy_1: {
          'velocity.x': 1.0,
        },
      },
    });

    expect(cache.get('enemy_1', 'velocity.x')).toBe(1.0);
    expect(cache.get('enemy_1', 'velocity.y')).toBeUndefined();
    expect(cache.get('nonexistent', 'velocity.x')).toBeUndefined();
  });

  it('should update frame metadata correctly', () => {
    const cache = new PropertyCache();
    const timestamp1 = Date.now();

    cache.update({
      frameId: 1,
      timestamp: timestamp1,
      entities: {},
    });

    expect(cache.getCurrentFrame()).toBe(1);
    expect(cache.getTimestamp()).toBe(timestamp1);

    const timestamp2 = Date.now() + 16;
    cache.update({
      frameId: 2,
      timestamp: timestamp2,
      entities: {},
    });

    expect(cache.getCurrentFrame()).toBe(2);
    expect(cache.getTimestamp()).toBe(timestamp2);
  });

  it('should maintain property history across frames', () => {
    const cache = new PropertyCache();

    cache.update({
      frameId: 1,
      timestamp: 1000,
      entities: {
        ball_1: {
          'velocity.x': 5.0,
          'velocity.y': 0.0,
        },
      },
    });

    expect(cache.get('ball_1', 'velocity.x')).toBe(5.0);

    cache.update({
      frameId: 2,
      timestamp: 1016,
      entities: {
        ball_1: {
          'velocity.x': 4.8,
          'velocity.y': -0.2,
        },
      },
    });

    expect(cache.get('ball_1', 'velocity.x')).toBe(4.8);
    expect(cache.get('ball_1', 'velocity.y')).toBe(-0.2);
  });
});
