import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { UnsafeScriptSandbox } from './UnsafeScriptSandbox';
import type { ScriptContext, ScriptInputEvent, ScriptCollisionEvent } from './types';
import type { WorldOps, SequenceHandle } from '@slopcade/shared/types/world-ops';

function createMockScriptContext(overrides: Partial<ScriptContext> = {}): ScriptContext {
  const variables: Record<string, unknown> = {};
  
  const mockWorldOps: WorldOps = {
    spawn: vi.fn().mockResolvedValue('entity_1'),
    destroy: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn().mockResolvedValue(null),
    reparent: vi.fn().mockResolvedValue(undefined),
    getPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    setPosition: vi.fn().mockResolvedValue(undefined),
    getRotation: vi.fn().mockResolvedValue(0),
    setRotation: vi.fn().mockResolvedValue(undefined),
    getScale: vi.fn().mockResolvedValue({ x: 1, y: 1 }),
    setScale: vi.fn().mockResolvedValue(undefined),
    setVisible: vi.fn().mockResolvedValue(undefined),
    getVelocity: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    setVelocity: vi.fn().mockResolvedValue(undefined),
    getAngularVelocity: vi.fn().mockResolvedValue(0),
    setAngularVelocity: vi.fn().mockResolvedValue(undefined),
    applyImpulse: vi.fn().mockResolvedValue(undefined),
    applyForce: vi.fn().mockResolvedValue(undefined),
    getTags: vi.fn().mockResolvedValue([]),
    addTag: vi.fn().mockResolvedValue(undefined),
    removeTag: vi.fn().mockResolvedValue(true),
    hasTag: vi.fn().mockResolvedValue(false),
    getTemplate: vi.fn().mockResolvedValue(undefined),
    getEntityData: vi.fn().mockResolvedValue(null),
    queryEntities: vi.fn().mockResolvedValue([]),
    queryEntitiesWithData: vi.fn().mockResolvedValue([]),
    queryPoint: vi.fn().mockResolvedValue(null),
    queryAABB: vi.fn().mockResolvedValue([]),
    raycast: vi.fn().mockResolvedValue(null),
    animate: vi.fn().mockResolvedValue(undefined),
    wait: vi.fn().mockResolvedValue(undefined),
    getVariable: vi.fn((name: string) => Promise.resolve(variables[name])),
    setVariable: vi.fn((name: string, value: unknown) => { variables[name] = value; return Promise.resolve(); }),
    getConstant: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn().mockResolvedValue(undefined),
    win: vi.fn().mockResolvedValue(undefined),
    lose: vi.fn().mockResolvedValue(undefined),
  };
  
  return {
    getPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    getVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    getRotation: vi.fn().mockReturnValue(0),
    getTags: vi.fn().mockReturnValue([]),
    hasTag: vi.fn().mockReturnValue(false),
    getTemplate: vi.fn().mockReturnValue(undefined),
    getVariable: vi.fn((name: string) => variables[name]),
    getConstant: vi.fn().mockReturnValue(undefined),
    queryEntities: vi.fn().mockReturnValue([]),
    getEntityData: vi.fn().mockReturnValue(null),
    queryEntitiesWithData: vi.fn().mockReturnValue([]),
    world: mockWorldOps,
    startSequence: vi.fn().mockReturnValue({ name: 'test', isRunning: true, cancel: vi.fn() } as unknown as SequenceHandle),
    isSequenceRunning: vi.fn().mockReturnValue(false),
    cancelSequence: vi.fn(),
    dt: 0.016,
    elapsed: 0.016,
    frameId: 1,
    input: null,
    mouse: null,
    drag: null,
    random: vi.fn().mockReturnValue(0.5),
    randomInt: vi.fn().mockReturnValue(5),
    randomChoice: vi.fn().mockReturnValue('choice'),
    clamp: vi.fn().mockReturnValue(0.5),
    lerp: vi.fn().mockReturnValue(0.5),
    distance: vi.fn().mockReturnValue(1),
    ...overrides,
  };
}

describe('UnsafeScriptSandbox', () => {
  let sandbox: UnsafeScriptSandbox;
  
  afterEach(() => {
    sandbox?.dispose();
  });

  describe('initialization', () => {
    it('should initialize with valid script', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: 'exports.onStart = function(ctx) {};',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      const result = await sandbox.initialize();
      expect(result.success).toBe(true);
    });

    it('should detect exported hooks', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {};
          exports.onUpdate = function(ctx, dt) {};
          exports.onInput = function(ctx, event) {};
          exports.onCollision = function(ctx, collision) {};
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      
      expect(sandbox.hasHook('onStart')).toBe(true);
      expect(sandbox.hasHook('onUpdate')).toBe(true);
      expect(sandbox.hasHook('onInput')).toBe(true);
      expect(sandbox.hasHook('onCollision')).toBe(true);
    });

    it('should report missing hooks correctly', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: 'exports.onStart = function(ctx) {};',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      
      expect(sandbox.hasHook('onStart')).toBe(true);
      expect(sandbox.hasHook('onUpdate')).toBe(false);
      expect(sandbox.hasHook('onInput')).toBe(false);
      expect(sandbox.hasHook('onCollision')).toBe(false);
    });

    it('should report syntax errors', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: 'exports.onStart = function( { broken syntax',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      const result = await sandbox.initialize();
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('syntax');
    });
  });

  describe('runStart', () => {
    it('should call onStart hook', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            ctx.world.setVariable('started', true);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);
      
      expect(result.success).toBe(true);
      expect(runtime.world.setVariable).toHaveBeenCalledWith('started', true);
    });

    it('should succeed when no onStart hook exists', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: '// No hooks defined',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);
      
      expect(result.success).toBe(true);
    });
  });

  describe('runUpdate', () => {
    it('should call onUpdate hook with dt', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onUpdate = function(ctx, dt) {
            ctx.world.setVariable('lastDt', dt);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runUpdate(runtime, 0.016);
      
      expect(result.success).toBe(true);
      expect(runtime.world.setVariable).toHaveBeenCalledWith('lastDt', 0.016);
    });
  });

  describe('runInput', () => {
    it('should call onInput hook with event', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onInput = function(ctx, event) {
            if (event.type === 'tap') {
              ctx.world.setVariable('tapped', true);
            }
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const event: ScriptInputEvent = {
        type: 'tap',
        position: { x: 5, y: 10 },
        timestamp: Date.now(),
      };
      const result = sandbox.runInput(runtime, event);
      
      expect(result.success).toBe(true);
      expect(runtime.world.setVariable).toHaveBeenCalledWith('tapped', true);
    });
  });

  describe('runCollision', () => {
    it('should call onCollision hook with collision data', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onCollision = function(ctx, collision) {
            ctx.world.setVariable('collisionA', collision.entityA);
            ctx.world.setVariable('collisionB', collision.entityB);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const collision: ScriptCollisionEvent = {
        entityA: 'ball_1',
        entityB: 'ground',
        normal: { x: 0, y: 1 },
        impulse: 10,
        contactPoint: { x: 0, y: 0 },
        timestamp: Date.now(),
      };
      const result = sandbox.runCollision(runtime, collision);
      
      expect(result.success).toBe(true);
      expect(runtime.world.setVariable).toHaveBeenCalledWith('collisionA', 'ball_1');
      expect(runtime.world.setVariable).toHaveBeenCalledWith('collisionB', 'ground');
    });
  });

  describe('hot reload', () => {
    it('should reload script with new code', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: 'exports.onStart = function(ctx) { ctx.world.setVariable("v", 1); };',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      expect(sandbox.hasHook('onStart')).toBe(true);
      expect(sandbox.hasHook('onUpdate')).toBe(false);
      
      const reloadResult = await sandbox.reload(
        'exports.onUpdate = function(ctx, dt) { ctx.world.setVariable("v", 2); };'
      );
      
      expect(reloadResult.success).toBe(true);
      expect(reloadResult.previousHooks.onStart).toBe(true);
      expect(reloadResult.previousHooks.onUpdate).toBe(false);
      expect(reloadResult.newHooks.onStart).toBe(false);
      expect(reloadResult.newHooks.onUpdate).toBe(true);
    });

    it('should track reload count', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: 'exports.onStart = function(ctx) {};',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      expect(sandbox.getReloadCount()).toBe(0);
      
      await sandbox.reload('exports.onUpdate = function(ctx, dt) {};');
      expect(sandbox.getReloadCount()).toBe(1);
      
      await sandbox.reload('exports.onCollision = function(ctx, c) {};');
      expect(sandbox.getReloadCount()).toBe(2);
    });

    it('should return error on reload with invalid script', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: 'exports.onStart = function(ctx) {};',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      
      const reloadResult = await sandbox.reload('invalid { syntax');
      
      expect(reloadResult.success).toBe(false);
      expect(reloadResult.error?.type).toBe('syntax');
    });

    it('should return current script code', async () => {
      const originalCode = 'exports.onStart = function(ctx) {};';
      sandbox = new UnsafeScriptSandbox({
        scriptCode: originalCode,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      expect(sandbox.getScriptCode()).toBe(originalCode);
      
      const newCode = 'exports.onUpdate = function(ctx, dt) {};';
      await sandbox.reload(newCode);
      expect(sandbox.getScriptCode()).toBe(newCode);
    });
  });

  describe('entity operations', () => {
    it('should spawn entities via script', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            ctx.world.spawn('ball', { x: 5, y: 10 });
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      sandbox.runStart(runtime);
      
      expect(runtime.world.spawn).toHaveBeenCalledWith('ball', { x: 5, y: 10 });
    });

    it('should destroy entities via script', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            ctx.world.destroy('entity_1');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      sandbox.runStart(runtime);
      
      expect(runtime.world.destroy).toHaveBeenCalledWith('entity_1');
    });
  });

  describe('dispose', () => {
    it('should prevent execution after dispose', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: 'exports.onStart = function(ctx) {};',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      sandbox.dispose();
      
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('disposed');
    });
  });

  describe('console logging', () => {
    let consoleLogSpy: MockInstance;
    let consoleWarnSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should prefix console.log with [Script]', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            console.log('Hello from script!');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      sandbox.runStart(runtime);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[Script]', 'Hello from script!');
    });

    it('should handle multiple console.log arguments', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            console.log('Value:', 42, { key: 'test' });
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      sandbox.runStart(runtime);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[Script]', 'Value:', 42, { key: 'test' });
    });

    it('should prefix console.warn with [Script]', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            console.warn('Warning message');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      sandbox.runStart(runtime);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Script]', 'Warning message');
    });

    it('should prefix console.error with [Script]', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            console.error('Error message');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      sandbox.runStart(runtime);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Script]', 'Error message');
    });

    it('should allow console.log in onUpdate', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onUpdate = function(ctx, dt) {
            console.log('Frame update, dt:', dt);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      sandbox.runUpdate(runtime, 0.016);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[Script]', 'Frame update, dt:', 0.016);
    });
  });

  describe('async safety guard', () => {
    it('should disable script if onUpdate is async', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onUpdate = async function(ctx, dt) {
            // This should trigger the guard
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runUpdate(runtime, 0.016);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Async hooks are not allowed');
      
      // Subsequent calls should also fail because script is disabled
      const result2 = sandbox.runUpdate(runtime, 0.016);
      expect(result2.success).toBe(false);
      expect(result2.error?.message).toContain('disposed');
    });

    it('should disable script if onStart is async', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = async function(ctx) {
            // This should trigger the guard
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Async hooks are not allowed');
    });

    it('should allow normal sync hooks', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onUpdate = function(ctx, dt) {
            ctx.world.setVariable('updated', true);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runUpdate(runtime, 0.016);
      
      expect(result.success).toBe(true);
      expect(runtime.world.setVariable).toHaveBeenCalledWith('updated', true);
    });
  });
});
