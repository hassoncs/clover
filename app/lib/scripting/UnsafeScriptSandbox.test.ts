import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { UnsafeScriptSandbox } from './UnsafeScriptSandbox';
import type { ScriptContext, ScriptInputEvent, ScriptCollisionEvent } from './types';
import type { SequenceHandle } from '@slopcade/shared/types/world-ops';
import { RunScriptActionExecutor } from '../game-engine/rules/actions/RunScriptActionExecutor';
import { EntityManager } from '../game-engine/EntityManager';
import type { RuleContext, IGameStateMutator } from '../game-engine/rules/types';
import type { Physics2D } from '../physics2d/Physics2D';

function createMockScriptContext(overrides: Partial<ScriptContext> = {}): ScriptContext {
  const variables: Record<string, unknown> = {};

  return {
    spawnEntity: vi.fn().mockReturnValue('entity_1'),
    destroyEntity: vi.fn(),
    cloneEntity: vi.fn().mockReturnValue(null),
    reparentEntity: vi.fn(),
    getEntityPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    setEntityPosition: vi.fn(),
    getEntityRotation: vi.fn().mockReturnValue(0),
    setEntityRotation: vi.fn(),
    getEntityScale: vi.fn().mockReturnValue({ x: 1, y: 1 }),
    setEntityScale: vi.fn(),
    setEntityVisible: vi.fn(),
    getEntityVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    setEntityVelocity: vi.fn(),
    getEntityAngularVelocity: vi.fn().mockReturnValue(0),
    setEntityAngularVelocity: vi.fn(),
    applyImpulse: vi.fn(),
    applyForce: vi.fn(),
    getEntityTags: vi.fn().mockReturnValue([]),
    addTag: vi.fn(),
    removeTag: vi.fn().mockReturnValue(true),
    hasTag: vi.fn().mockReturnValue(false),
    getEntityTemplate: vi.fn().mockReturnValue(undefined),
    getEntityData: vi.fn().mockReturnValue(null),
    queryEntities: vi.fn().mockReturnValue([]),
    queryEntitiesWithData: vi.fn().mockReturnValue([]),
    queryPoint: vi.fn().mockReturnValue(null),
    queryAABB: vi.fn().mockReturnValue([]),
    raycast: vi.fn().mockReturnValue(null),
    getVariable: vi.fn((name: string) => variables[name]),
    setVariable: vi.fn((name: string, value: unknown) => { variables[name] = value; }),
    getConstant: vi.fn().mockReturnValue(undefined),
    emit: vi.fn(),
    win: vi.fn(),
    lose: vi.fn(),

    worldAsync: {
      animate: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue(undefined),
    },
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
    createPixelBuffer: vi.fn(),
    pixelBufferDraw: vi.fn(),
    pixelBufferClear: vi.fn(),
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
            ctx.setVariable('started', true);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);
      
      expect(result.success).toBe(true);
      expect(runtime.setVariable).toHaveBeenCalledWith('started', true);
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
            ctx.setVariable('lastDt', dt);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runUpdate(runtime, 0.016);
      
      expect(result.success).toBe(true);
      expect(runtime.setVariable).toHaveBeenCalledWith('lastDt', 0.016);
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
      const runtime = createMockScriptContext();
      const event: ScriptInputEvent = {
        type: 'tap',
        position: { x: 5, y: 10 },
        timestamp: Date.now(),
      };
      const result = sandbox.runInput(runtime, event);
      
      expect(result.success).toBe(true);
      expect(runtime.setVariable).toHaveBeenCalledWith('tapped', true);
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
      expect(runtime.setVariable).toHaveBeenCalledWith('collisionA', 'ball_1');
      expect(runtime.setVariable).toHaveBeenCalledWith('collisionB', 'ground');
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
      const runtime = createMockScriptContext();
      sandbox.runStart(runtime);
      
      expect(runtime.spawnEntity).toHaveBeenCalledWith('ball', { x: 5, y: 10 });
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
      const runtime = createMockScriptContext();
      sandbox.runStart(runtime);
      
      expect(runtime.destroyEntity).toHaveBeenCalledWith('entity_1');
    });

    it('should generate deterministic distinct spawn IDs for multiple spawns in one script call', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.default = function(ctx) {
            const first = ctx.spawnEntity('ball', { x: 1, y: 2 });
            const second = ctx.spawnEntity('ball', { x: 3, y: 4 });
            ctx.addTag(first, 'first-spawn');
            ctx.addTag(second, 'second-spawn');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });

      await sandbox.initialize();

      const entityManager = new EntityManager();
      entityManager.registerTemplate({ id: 'ball' });

      const mutator: IGameStateMutator = {
        getElapsed: () => 0,
        setGameState: vi.fn(),
        triggerEvent: vi.fn(),
        setVariable: vi.fn(),
        getVariable: vi.fn(),
        setCooldown: vi.fn(),
        getList: vi.fn(),
        setList: vi.fn(),
        pushToList: vi.fn(),
        popFromList: vi.fn(),
        shuffleList: vi.fn(),
        listContains: vi.fn(),
      };

      const context: RuleContext = {
        entityManager,
        physics: {
          getLinearVelocity: vi.fn(),
          setLinearVelocity: vi.fn(),
          applyImpulseToCenter: vi.fn(),
        } as unknown as Physics2D,
        mutator,
        elapsed: 0,
        collisions: [],
        events: new Map(),
        input: {},
        inputEvents: {},
        evalContext: { frameId: 17, dt: 1 / 60 } as RuleContext['evalContext'],
      };

      const executor = new RunScriptActionExecutor();
      executor.setSandbox(sandbox);
      executor.execute({ type: 'run_script' }, context);

      const firstEntity = entityManager.getEntitiesByTag('first-spawn').at(0);
      const secondEntity = entityManager.getEntitiesByTag('second-spawn').at(0);

      expect(firstEntity?.id).toBe('spawned_17_0');
      expect(secondEntity?.id).toBe('spawned_17_1');
      expect(firstEntity?.id).not.toBe(secondEntity?.id);
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
            ctx.setVariable('updated', true);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runUpdate(runtime, 0.016);
      
      expect(result.success).toBe(true);
      expect(runtime.setVariable).toHaveBeenCalledWith('updated', true);
    });
  });

  describe('BallSort-style script startup pattern (RED test)', () => {
    it('should support flat sync API: ctx.spawnEntity + ctx.setVariable', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            const id = ctx.spawnEntity('ball', { x: 5, y: 10 });
            ctx.addTag(id, 'test-tag');
            ctx.setVariable('spawned', true);
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });
      
      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);
      
      expect(result.success).toBe(true);
      expect(runtime.spawnEntity).toHaveBeenCalledWith('ball', { x: 5, y: 10 });
      expect(runtime.addTag).toHaveBeenCalledWith('entity_1', 'test-tag');
      expect(runtime.setVariable).toHaveBeenCalledWith('spawned', true);
    });
  });

  describe('async boundary invariants', () => {
    it('allows ctx.worldAsync.wait in sync hook and returns a Promise', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            const waitPromise = ctx.worldAsync.wait(25);
            ctx.setVariable('waitReturnsPromise', typeof waitPromise.then === 'function');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });

      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);

      expect(result.success).toBe(true);
      expect(runtime.worldAsync.wait).toHaveBeenCalledWith(25);
      expect(runtime.setVariable).toHaveBeenCalledWith('waitReturnsPromise', true);
    });

    it('allows ctx.worldAsync.animate in sync hook and returns a Promise', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            const animatePromise = ctx.worldAsync.animate('entity_1', { x: 10, y: 20 }, { duration: 200 });
            ctx.setVariable('animateReturnsPromise', typeof animatePromise.then === 'function');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });

      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);

      expect(result.success).toBe(true);
      expect(runtime.worldAsync.animate).toHaveBeenCalledWith('entity_1', { x: 10, y: 20 }, { duration: 200 });
      expect(runtime.setVariable).toHaveBeenCalledWith('animateReturnsPromise', true);
    });

    it('exposes ctx.startSequence in sync hooks and returns a sequence handle', async () => {
      sandbox = new UnsafeScriptSandbox({
        scriptCode: `
          exports.onStart = function(ctx) {
            const handle = ctx.startSequence('intro-sequence', async function(world) {
              await world.wait(10);
            });
            ctx.setVariable('sequenceName', handle.name);
            ctx.setVariable('hasCancel', typeof handle.cancel === 'function');
          };
        `,
        scriptId: 'test-script',
        gameId: 'test-game',
      });

      await sandbox.initialize();
      const runtime = createMockScriptContext();
      const result = sandbox.runStart(runtime);

      expect(result.success).toBe(true);
      expect(runtime.startSequence).toHaveBeenCalledWith('intro-sequence', expect.any(Function));
      expect(runtime.setVariable).toHaveBeenCalledWith('sequenceName', 'test');
      expect(runtime.setVariable).toHaveBeenCalledWith('hasCancel', true);
    });
  });
});
