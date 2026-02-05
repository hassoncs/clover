import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { UnsafeScriptSandbox } from './UnsafeScriptSandbox';
import type { SandboxRuntimeContext, ScriptInputEvent, ScriptCollisionEvent } from './types';

function createMockRuntime(overrides: Partial<SandboxRuntimeContext> = {}): SandboxRuntimeContext {
  const variables: Record<string, unknown> = {};
  const events: Array<{ name: string; data?: Record<string, unknown> }> = [];
  
  return {
    entityManager: {
      spawnEntity: vi.fn().mockReturnValue('entity_1'),
      destroyEntity: vi.fn(),
      getEntityPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      setEntityPosition: vi.fn(),
      getEntityVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      setEntityVelocity: vi.fn(),
      applyImpulse: vi.fn(),
      getEntityTags: vi.fn().mockReturnValue([]),
      addTag: vi.fn(),
      removeTag: vi.fn().mockReturnValue(true),
      hasTag: vi.fn().mockReturnValue(false),
      queryEntities: vi.fn().mockReturnValue([]),
      getEntityData: vi.fn().mockReturnValue(null),
      queryEntitiesWithData: vi.fn().mockReturnValue([]),
      getEntityTemplate: vi.fn().mockReturnValue(undefined),
    },
    rulesEvaluator: {
      getVariable: vi.fn((name: string) => variables[name]),
      setVariable: vi.fn((name: string, value: unknown) => { variables[name] = value; }),
      getConstant: vi.fn().mockReturnValue(undefined),
      emitEvent: vi.fn((name: string, data?: Record<string, unknown>) => { events.push({ name, data }); }),
      win: vi.fn(),
      lose: vi.fn(),
    },
    inputSnapshot: null,
    mousePosition: null,
    dragState: null,
    frameInfo: {
      frameId: 1,
      elapsed: 0.016,
      dt: 0.016,
    },
    constants: {},
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
      const startCalled = { value: false };
      
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            ctx.setVariable('started', true);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockRuntime();
      const result = sandbox.runStart(runtime);
      
      expect(result.success).toBe(true);
      expect(runtime.rulesEvaluator.setVariable).toHaveBeenCalledWith('started', true);
    });

    it('should succeed when no onStart hook exists', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: '// No hooks defined',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockRuntime();
      const result = sandbox.runStart(runtime);
      
      expect(result.success).toBe(true);
    });
  });

  describe('runUpdate', () => {
    it('should call onUpdate hook with dt', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onUpdate = function(ctx, dt) {
            ctx.setVariable('lastDt', dt);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockRuntime();
      const result = sandbox.runUpdate(runtime, 0.016);
      
      expect(result.success).toBe(true);
      expect(runtime.rulesEvaluator.setVariable).toHaveBeenCalledWith('lastDt', 0.016);
    });
  });

  describe('runInput', () => {
    it('should call onInput hook with event', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onInput = function(ctx, event) {
            if (event.type === 'tap') {
              ctx.setVariable('tapped', true);
            }
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockRuntime();
      const event: ScriptInputEvent = {
        type: 'tap',
        position: { x: 5, y: 10 },
        timestamp: Date.now(),
      };
      const result = sandbox.runInput(runtime, event);
      
      expect(result.success).toBe(true);
      expect(runtime.rulesEvaluator.setVariable).toHaveBeenCalledWith('tapped', true);
    });
  });

  describe('runCollision', () => {
    it('should call onCollision hook with collision data', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onCollision = function(ctx, collision) {
            ctx.setVariable('collisionA', collision.entityA);
            ctx.setVariable('collisionB', collision.entityB);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockRuntime();
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
      expect(runtime.rulesEvaluator.setVariable).toHaveBeenCalledWith('collisionA', 'ball_1');
      expect(runtime.rulesEvaluator.setVariable).toHaveBeenCalledWith('collisionB', 'ground');
    });
  });

  describe('hot reload', () => {
    it('should reload script with new code', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: 'exports.onStart = function(ctx) { ctx.setVariable("v", 1); };',
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      expect(sandbox.hasHook('onStart')).toBe(true);
      expect(sandbox.hasHook('onUpdate')).toBe(false);
      
      const reloadResult = await sandbox.reload(
        'exports.onUpdate = function(ctx, dt) { ctx.setVariable("v", 2); };'
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
            ctx.spawnEntity('ball', { x: 5, y: 10 });
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockRuntime();
      sandbox.runStart(runtime);
      
      expect(runtime.entityManager.spawnEntity).toHaveBeenCalledWith('ball', { x: 5, y: 10 }, undefined);
    });

    it('should destroy entities via script', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            ctx.destroyEntity('entity_1');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockRuntime();
      sandbox.runStart(runtime);
      
      expect(runtime.entityManager.destroyEntity).toHaveBeenCalledWith('entity_1');
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
      
      const runtime = createMockRuntime();
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
      const runtime = createMockRuntime();
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
      const runtime = createMockRuntime();
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
      const runtime = createMockRuntime();
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
      const runtime = createMockRuntime();
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
      const runtime = createMockRuntime();
      sandbox.runUpdate(runtime, 0.016);
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[Script]', 'Frame update, dt:', 0.016);
    });
  });
});
