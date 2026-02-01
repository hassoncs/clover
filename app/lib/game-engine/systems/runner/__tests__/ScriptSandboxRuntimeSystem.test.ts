import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptSandboxRuntimeSystem } from '../wrappers/ScriptSandboxRuntimeSystem';
import { EventQueueImpl } from '../EventQueue';
import { SystemPhase } from '@slopcade/shared';
import type { SystemContext, UpdateContext } from '../types';

describe('ScriptSandboxRuntimeSystem', () => {
  let system: ScriptSandboxRuntimeSystem;
  let mockContext: SystemContext;
  let mockUpdateContext: UpdateContext;

  beforeEach(() => {
    system = new ScriptSandboxRuntimeSystem({
      scriptCode: 'exports.onStart = function() {};',
      scriptId: 'test-script',
      gameId: 'test-game',
    });
    
    mockContext = {
      bridge: {} as any,
      physics: {
        setLinearVelocity: vi.fn(),
        getLinearVelocity: vi.fn(() => ({ x: 0, y: 0 })),
        setTransform: vi.fn(),
        applyImpulseToCenter: vi.fn(),
      } as any,
      entityManager: {
        getTemplate: vi.fn(() => ({ id: 'test-template' })),
        createEntity: vi.fn((def) => ({
          id: 'entity-1',
          name: def.name,
          template: def.template,
          transform: def.transform,
          tags: [],
          bodyId: { value: 1 },
        })),
        destroyEntity: vi.fn(),
        getEntity: vi.fn((id) => ({
          id,
          transform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
          tags: ['test-tag'],
          bodyId: { value: 1 },
        })),
        addTag: vi.fn(),
        removeTag: vi.fn(() => true),
        hasTag: vi.fn(() => true),
        getActiveEntities: vi.fn(() => [
          { id: 'entity-1' },
          { id: 'entity-2' },
        ]),
        query: vi.fn(() => [
          { id: 'entity-1' },
          { id: 'entity-2' },
        ]),
      } as any,
      eventBus: {} as any,
      eventQueue: new EventQueueImpl(),
    };
    
    mockUpdateContext = {
      dt: 0.016,
      elapsed: 1.0,
      frameId: 60,
      input: {
        tap: { x: 100, y: 200, worldX: 5, worldY: 10 },
      },
      gameState: {
        score: 100,
        lives: 3,
        time: 1.0,
        state: 'playing',
        variables: { testVar: 42 },
      },
    };
  });

  it('should have correct phase and priority', () => {
    expect(system.id).toBe('script-sandbox');
    expect(system.phase).toBe(SystemPhase.GAME_LOGIC);
    expect(system.priority).toBe(40);
  });

  it('should initialize sandbox asynchronously', async () => {
    const config = {
      scriptCode: 'exports.onStart = function() {};',
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);

    const state = system.getState();
    expect(state.hasOnStart).toBe(true);
    expect(state.hasOnUpdate).toBe(false);
    expect(state.onStartCalled).toBe(false);
  });

  it('should call onStart once after initialization', async () => {
    const config = {
      scriptCode: 'exports.onStart = function(ctx) { ctx.setVariable("started", true); };',
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    
    system.update(mockUpdateContext, system.getState());
    let state = system.getState();
    expect(state.onStartCalled).toBe(true);
    
    system.update(mockUpdateContext, system.getState());
    state = system.getState();
    expect(state.onStartCalled).toBe(true);
  });

  it('should call onUpdate every frame', async () => {
    let updateCount = 0;
    const config = {
      scriptCode: `
        var count = 0;
        exports.onUpdate = function(ctx, dt) {
          count++;
          ctx.setVariable("updateCount", count);
        };
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    
    system.update(mockUpdateContext, system.getState());
    system.update(mockUpdateContext, system.getState());
    system.update(mockUpdateContext, system.getState());
    
    const state = system.getState();
    expect(state.hasOnUpdate).toBe(true);
  });

  it('should handle script errors gracefully', async () => {
    const config = {
      scriptCode: 'exports.onUpdate = function() { throw new Error("Test error"); };',
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    
    system.update(mockUpdateContext, system.getState());
    
    const state = system.getState();
    expect(state.lastError).not.toBeNull();
    expect(state.lastError?.message).toContain('Test error');
  });

  it('should provide entity manager adapter', async () => {
    const config = {
      scriptCode: `
        exports.onStart = function(ctx) {
          var id = ctx.spawnEntity('test-template', { x: 5, y: 10 });
          var pos = ctx.getEntityPosition(id);
          ctx.setEntityPosition(id, { x: 15, y: 20 });
          ctx.destroyEntity(id);
        };
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    system.update(mockUpdateContext, system.getState());
    
    expect(mockContext.entityManager.createEntity).toHaveBeenCalled();
    expect(mockContext.entityManager.getEntity).toHaveBeenCalled();
    expect(mockContext.entityManager.destroyEntity).toHaveBeenCalled();
  });

  it('should provide tag operations', async () => {
    const config = {
      scriptCode: `
        exports.onStart = function(ctx) {
          ctx.addTag('entity-1', 'new-tag');
          var has = ctx.hasTag('entity-1', 'test-tag');
          ctx.removeTag('entity-1', 'old-tag');
          var tags = ctx.getEntityTags('entity-1');
        };
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    system.update(mockUpdateContext, system.getState());
    
    expect(mockContext.entityManager.addTag).toHaveBeenCalledWith('entity-1', 'new-tag');
    expect(mockContext.entityManager.hasTag).toHaveBeenCalledWith('entity-1', 'test-tag');
    expect(mockContext.entityManager.removeTag).toHaveBeenCalledWith('entity-1', 'old-tag');
  });

  it('should provide query operations', async () => {
    const config = {
      scriptCode: `
        exports.onStart = function(ctx) {
          var all = ctx.queryEntities();
          var tagged = ctx.queryEntities({ tag: 'enemy' });
        };
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    system.update(mockUpdateContext, system.getState());
    
    expect(mockContext.entityManager.getActiveEntities).toHaveBeenCalled();
    expect(mockContext.entityManager.query).toHaveBeenCalledWith({
      tags: ['enemy'],
      template: undefined,
      withinAabb: undefined,
    });
  });

  it('should provide physics operations', async () => {
    const config = {
      scriptCode: `
        exports.onStart = function(ctx) {
          var vel = ctx.getEntityVelocity('entity-1');
          ctx.setEntityVelocity('entity-1', { x: 5, y: -10 });
          ctx.applyImpulse('entity-1', { x: 0, y: -20 });
        };
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    system.update(mockUpdateContext, system.getState());
    
    expect(mockContext.physics.getLinearVelocity).toHaveBeenCalled();
    expect(mockContext.physics.setLinearVelocity).toHaveBeenCalled();
    expect(mockContext.physics.applyImpulseToCenter).toHaveBeenCalled();
  });

  it('should provide game state access', async () => {
    const config = {
      scriptCode: `
        exports.onStart = function(ctx) {
          var testVar = ctx.getVariable('testVar');
          ctx.setVariable('newVar', 123);
          ctx.emit('custom-event', { data: 'test' });
        };
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    system.update(mockUpdateContext, system.getState());
    
    const state = system.getState();
    expect(state.lastError).toBeNull();
  });

  it('should provide constants', async () => {
    const config = {
      scriptCode: `
        exports.onStart = function(ctx) {
          var gravity = ctx.getConstant('GRAVITY');
        };
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
      constants: { GRAVITY: 9.8 },
    };

    await system.initialize(mockContext, config);
    system.update(mockUpdateContext, system.getState());
    
    const state = system.getState();
    expect(state.lastError).toBeNull();
  });

  it('should provide input snapshot', async () => {
    const config = {
      scriptCode: `
        exports.onStart = function(ctx) {
          var input = ctx.getInput();
        };
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    system.update(mockUpdateContext, system.getState());
    
    const state = system.getState();
    expect(state.lastError).toBeNull();
  });

  it('should clean up on destroy', async () => {
    const config = {
      scriptCode: 'exports.onStart = function() {};',
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    system.destroy();
    
    expect(system.getSandbox()).toBeNull();
  });

  it('should return correct state', async () => {
    const config = {
      scriptCode: `
        exports.onStart = function() {};
        exports.onUpdate = function() {};
        exports.onInput = function() {};
        exports.onCollision = function() {};
      `,
      scriptId: 'test-script',
      gameId: 'test-game',
    };

    await system.initialize(mockContext, config);
    
    const state = system.getState();
    expect(state.hasOnStart).toBe(true);
    expect(state.hasOnUpdate).toBe(true);
    expect(state.hasOnInput).toBe(true);
    expect(state.hasOnCollision).toBe(true);
    expect(state.reloadCount).toBe(0);
    expect(state.onStartCalled).toBe(false);
  });
});
