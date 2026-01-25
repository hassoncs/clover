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

  it('should handle arbitrary custom properties with nested objects', () => {
    const cache = new PropertyCache();
    cache.update({
      frameId: 1,
      timestamp: 1000,
      entities: {
        player: {
          'stats.combat.strength': 10,
          'stats.combat.defense': 5,
          'stats.movement.speed': 8,
          'stats.movement.jump': 12,
        },
      },
    });

    const ctx = EntityContextProxy.createEntityContext(cache, 'player');
    
    expect(ctx['stats.combat.strength']).toBe(10);
    expect(ctx['stats.combat.defense']).toBe(5);
    expect(ctx['stats.movement.speed']).toBe(8);
    expect(ctx['stats.movement.jump']).toBe(12);
  });

  it('should handle arbitrary array properties', () => {
    const cache = new PropertyCache();
    cache.update({
      frameId: 1,
      timestamp: 1000,
      entities: {
        player: {
          'inventory[0]': 'sword',
          'inventory[1]': 'shield',
          'inventory[2]': 'potion',
        },
      },
    });

    const ctx = EntityContextProxy.createEntityContext(cache, 'player');
    
    expect(ctx['inventory[0]']).toBe('sword');
    expect(ctx['inventory[1]']).toBe('shield');
    expect(ctx['inventory[2]']).toBe('potion');
  });

  it('should handle mixed property types', () => {
    const cache = new PropertyCache();
    cache.update({
      frameId: 1,
      timestamp: 1000,
      entities: {
        enemy: {
          'transform.x': 50,
          'health': 100,
          'effects.burning.active': true,
          'effects.burning.damage': 5,
          'loot[0]': 'gold_coin',
          'ai.state': 'patrol',
        },
      },
    });

    const ctx = EntityContextProxy.createEntityContext(cache, 'enemy');
    
    expect((ctx.transform as any)?.x).toBe(50);
    expect(ctx.health).toBe(100);
    expect(ctx['effects.burning.active']).toBe(true);
    expect(ctx['effects.burning.damage']).toBe(5);
    expect(ctx['loot[0]']).toBe('gold_coin');
    expect(ctx['ai.state']).toBe('patrol');
  });

  it('should coerce types for arbitrary properties', () => {
    const cache = new PropertyCache();
    cache.update({
      frameId: 1,
      timestamp: 1000,
      entities: {
        player: {
          'stats.strength': 10,
          'stats.name': 'warrior',
          'flags.isAlive': true,
          'position.vec': { x: 5, y: 10 } as any,
        },
      },
    });

    const ctx = EntityContextProxy.createEntityContext(cache, 'player');
    
    expect(typeof ctx['stats.strength']).toBe('number');
    expect(typeof ctx['stats.name']).toBe('string');
    expect(typeof ctx['flags.isAlive']).toBe('boolean');
    expect(ctx['position.vec']).toEqual({ x: 5, y: 10 });
  });

  it('should handle deeply nested arbitrary properties', () => {
    const cache = new PropertyCache();
    cache.update({
      frameId: 1,
      timestamp: 1000,
      entities: {
        boss: {
          'ai.behavior.combat.strategy.melee.aggression': 0.8,
          'ai.behavior.combat.strategy.ranged.accuracy': 0.6,
          'stats.resistances.fire': 0.5,
          'stats.resistances.ice': 0.3,
        },
      },
    });

    const ctx = EntityContextProxy.createEntityContext(cache, 'boss');
    
    expect(ctx['ai.behavior.combat.strategy.melee.aggression']).toBe(0.8);
    expect(ctx['ai.behavior.combat.strategy.ranged.accuracy']).toBe(0.6);
    expect(ctx['stats.resistances.fire']).toBe(0.5);
    expect(ctx['stats.resistances.ice']).toBe(0.3);
  });
});
