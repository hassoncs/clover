import { describe, it, expect, vi } from 'vitest';
import { createRunnerHarness, createFakeSystemContext, createStubSystem } from './helpers/runnerHarness';
import { SystemPhase } from '@slopcade/shared';
import type { InputEvent, CollisionInfo, UpdateContext } from '../types';

describe('runnerHarness', () => {
  describe('createFakeSystemContext', () => {
    it('creates a SystemContext with all required services', () => {
      const ctx = createFakeSystemContext();

      expect(ctx.bridge).toBeDefined();
      expect(ctx.physics).toBeDefined();
      expect(ctx.entityManager).toBeDefined();
      expect(ctx.eventBus).toBeDefined();
      expect(ctx.eventQueue).toBeDefined();
    });

    it('allows overriding specific services', () => {
      const customBridge = { custom: true };
      const ctx = createFakeSystemContext({ bridge: customBridge as any });

      expect(ctx.bridge).toMatchObject(customBridge);
    });
  });

  describe('createStubSystem', () => {
    it('creates a minimal RuntimeSystem with defaults', () => {
      const system = createStubSystem({ id: 'test' });

      expect(system.id).toBe('test');
      expect(system.phase).toBe(SystemPhase.GAME_LOGIC);
      expect(system.priority).toBe(0);
      expect(typeof system.initialize).toBe('function');
      expect(typeof system.update).toBe('function');
      expect(typeof system.destroy).toBe('function');
      expect(typeof system.getState).toBe('function');
    });

    it('allows overriding phase and priority', () => {
      const system = createStubSystem({
        id: 'physics-system',
        phase: SystemPhase.PHYSICS,
        priority: 10,
      });

      expect(system.phase).toBe(SystemPhase.PHYSICS);
      expect(system.priority).toBe(10);
    });

    it('allows custom update function', () => {
      const updateFn = vi.fn();
      const system = createStubSystem({ id: 'test', update: updateFn });

      system.update({} as any, {});
      expect(updateFn).toHaveBeenCalled();
    });
  });

  describe('createRunnerHarness', () => {
    it('creates a harness with runner and context', async () => {
      const harness = await createRunnerHarness();

      expect(harness.runner).toBeDefined();
      expect(harness.context).toBeDefined();
    });

    it('allows registering systems before initialization', async () => {
      const system = createStubSystem({ id: 'my-system' });
      const harness = await createRunnerHarness({ systems: [system] });

      expect(harness.runner.getSystem('my-system')).toBe(system);
    });

    it('runFrame executes one frame deterministically', async () => {
      const executionOrder: string[] = [];

      const preUpdate = createStubSystem({
        id: 'pre',
        phase: SystemPhase.PRE_UPDATE,
        update: () => executionOrder.push('pre'),
      });

      const gameLogic = createStubSystem({
        id: 'logic',
        phase: SystemPhase.GAME_LOGIC,
        update: () => executionOrder.push('logic'),
      });

      const physics = createStubSystem({
        id: 'physics',
        phase: SystemPhase.PHYSICS,
        update: () => executionOrder.push('physics'),
      });

      const harness = await createRunnerHarness({
        systems: [physics, preUpdate, gameLogic],
      });

      harness.runFrame();

      expect(executionOrder).toEqual(['pre', 'logic', 'physics']);
    });

    it('runFrame allows custom dt and frameId', async () => {
      let capturedCtx: UpdateContext | undefined;
      const system = createStubSystem({
        id: 'capture',
        update: (ctx: UpdateContext) => { capturedCtx = ctx; },
      });

      const harness = await createRunnerHarness({ systems: [system] });
      harness.runFrame({ dt: 0.033, frameId: 100 });

      expect(capturedCtx!.dt).toBe(0.033);
      expect(capturedCtx!.frameId).toBe(100);
    });

    it('allows injecting input events before frame', async () => {
      let capturedEvents: InputEvent[] = [];
      const system = createStubSystem({
        id: 'input-consumer',
        phase: SystemPhase.GAME_LOGIC,
        update: (ctx: UpdateContext) => { capturedEvents = [...ctx.frame.inputEvents]; },
      });

      const harness = await createRunnerHarness({ systems: [system] });

      const tapEvent: InputEvent = {
        type: 'tap',
        x: 100,
        y: 200,
        worldX: 2,
        worldY: 4,
        targetEntityId: 'entity-1',
      };

      harness.injectInputEvents([tapEvent]);
      harness.runFrame();

      expect(capturedEvents).toHaveLength(1);
      expect(capturedEvents[0]).toEqual(tapEvent);
    });

    it('allows injecting collisions before frame', async () => {
      let capturedCollisions: CollisionInfo[] = [];
      const system = createStubSystem({
        id: 'collision-consumer',
        phase: SystemPhase.GAME_LOGIC,
        update: (ctx: UpdateContext) => { capturedCollisions = [...ctx.frame.collisions]; },
      });

      const harness = await createRunnerHarness({ systems: [system] });

      const collision: CollisionInfo = {
        entityA: { id: 'ball', tags: ['ball'] } as any,
        entityB: { id: 'peg', tags: ['peg'] } as any,
        normal: { x: 0, y: 1 },
        impulse: 5.0,
      };

      harness.injectCollisions([collision]);
      harness.runFrame();

      expect(capturedCollisions).toHaveLength(1);
      expect(capturedCollisions[0]).toEqual(collision);
    });

    it('clears injected events after frame', async () => {
      let eventCount = 0;
      const system = createStubSystem({
        id: 'counter',
        update: (ctx: UpdateContext) => { eventCount = ctx.frame.inputEvents.length; },
      });

      const harness = await createRunnerHarness({ systems: [system] });

      harness.injectInputEvents([{ type: 'tap', x: 0, y: 0, worldX: 0, worldY: 0 }]);
      harness.runFrame();
      expect(eventCount).toBe(1);

      harness.runFrame();
      expect(eventCount).toBe(0);
    });

    it('tracks elapsed time across frames', async () => {
      const elapsedValues: number[] = [];
      const system = createStubSystem({
        id: 'time-tracker',
        update: (ctx: UpdateContext) => { elapsedValues.push(ctx.elapsed); },
      });

      const harness = await createRunnerHarness({ systems: [system] });

      harness.runFrame({ dt: 0.016 });
      harness.runFrame({ dt: 0.016 });
      harness.runFrame({ dt: 0.032 });

      expect(elapsedValues[0]).toBeCloseTo(0.016, 5);
      expect(elapsedValues[1]).toBeCloseTo(0.032, 5);
      expect(elapsedValues[2]).toBeCloseTo(0.064, 5);
    });

    it('provides access to last UpdateContext for inspection', async () => {
      const harness = await createRunnerHarness();

      harness.runFrame({ dt: 0.016, frameId: 42 });

      expect(harness.lastUpdateContext).toBeDefined();
      expect(harness.lastUpdateContext?.dt).toBe(0.016);
      expect(harness.lastUpdateContext?.frameId).toBe(42);
    });
  });
});
