import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SequenceManager, SequenceCancelledError } from './SequenceManager';
import type { WorldOps, AnimateTarget, AnimateOptions, WaitOptions } from '@slopcade/shared/types/world-ops';

/**
 * Flushes the promise microtask queue to allow pending promises to resolve.
 */
async function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Creates a mock WorldOps that simulates multi-frame animations and waits.
 * This mock tracks pending operations and allows advancing them frame-by-frame
 * to test sequence behavior across multiple frames.
 */
function createFrameBasedMockWorldOps(): {
  worldOps: WorldOps;
  advanceTime: (dt: number) => void;
  completeAnimations: () => void;
  getPendingAnimationCount: () => number;
  getPendingWaitCount: () => number;
} {
  interface PendingAnimation {
    id: string;
    entityId: string;
    target: AnimateTarget;
    opts: AnimateOptions;
    resolve: () => void;
    reject: (err: Error) => void;
    elapsed: number;
    duration: number;
  }

  interface PendingWait {
    id: string;
    remaining: number;
    resolve: () => void;
    reject: (err: Error) => void;
    realtime: boolean;
  }

  const pendingAnimations = new Map<string, PendingAnimation>();
  const pendingWaits = new Map<string, PendingWait>();
  let animationIdCounter = 0;
  let waitIdCounter = 0;

  const worldOps: WorldOps = {
    animate: vi.fn((entityId: string, target: AnimateTarget, opts: AnimateOptions) => {
      return new Promise<void>((resolve, reject) => {
        const id = `anim_${++animationIdCounter}`;
        const durationSeconds = opts.duration / 1000;
        pendingAnimations.set(id, {
          id,
          entityId,
          target,
          opts,
          resolve,
          reject,
          elapsed: 0,
          duration: durationSeconds,
        });
      });
    }),

    wait: vi.fn((ms: number, opts?: WaitOptions) => {
      return new Promise<void>((resolve, reject) => {
        const id = `wait_${++waitIdCounter}`;
        const durationSeconds = ms / 1000;
        pendingWaits.set(id, {
          id,
          remaining: durationSeconds,
          resolve,
          reject,
          realtime: opts?.realtime ?? false,
        });
      });
    }),

    spawn: vi.fn().mockResolvedValue('entity_1'),
    destroy: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn().mockResolvedValue('entity_2'),
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
    removeTag: vi.fn().mockResolvedValue(false),
    hasTag: vi.fn().mockResolvedValue(false),
    getTemplate: vi.fn().mockResolvedValue(undefined),
    getEntityData: vi.fn().mockResolvedValue(null),
    queryEntities: vi.fn().mockResolvedValue([]),
    queryEntitiesWithData: vi.fn().mockResolvedValue([]),
    queryPoint: vi.fn().mockResolvedValue(null),
    queryAABB: vi.fn().mockResolvedValue([]),
    raycast: vi.fn().mockResolvedValue(null),
    getVariable: vi.fn().mockResolvedValue(undefined),
    setVariable: vi.fn().mockResolvedValue(undefined),
    getConstant: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn().mockResolvedValue(undefined),
    win: vi.fn().mockResolvedValue(undefined),
    lose: vi.fn().mockResolvedValue(undefined),
    createPixelBuffer: vi.fn().mockResolvedValue(undefined),
    pixelBufferDraw: vi.fn().mockResolvedValue(undefined),
    pixelBufferClear: vi.fn().mockResolvedValue(undefined),
  };

  function advanceTime(dt: number): void {
    for (const [id, anim] of pendingAnimations) {
      anim.elapsed += dt;
      if (anim.elapsed >= anim.duration) {
        anim.resolve();
        pendingAnimations.delete(id);
      }
    }

    for (const [id, wait] of pendingWaits) {
      wait.remaining -= dt;
      if (wait.remaining <= 0) {
        wait.resolve();
        pendingWaits.delete(id);
      }
    }
  }

  function completeAnimations(): void {
    for (const [id, anim] of pendingAnimations) {
      anim.resolve();
    }
    pendingAnimations.clear();
  }

  function getPendingAnimationCount(): number {
    return pendingAnimations.size;
  }

  function getPendingWaitCount(): number {
    return pendingWaits.size;
  }

  return {
    worldOps,
    advanceTime,
    completeAnimations,
    getPendingAnimationCount,
    getPendingWaitCount,
  };
}

describe('SequenceManager Integration — Multi-Frame Execution', () => {
  let manager: SequenceManager;
  let mock: ReturnType<typeof createFrameBasedMockWorldOps>;

  beforeEach(() => {
    manager = new SequenceManager();
    mock = createFrameBasedMockWorldOps();
  });

  describe('sequence runs across multiple simulated frames', () => {
    it('should animate entity over multiple frames then destroy', async () => {
      const sequenceSteps: string[] = [];

      const sequenceFn = async (world: WorldOps) => {
        sequenceSteps.push('start');
        await world.animate('ball', { x: 10, y: 5 }, { duration: 500 });
        sequenceSteps.push('animation-complete');
        await world.destroy('ball');
        sequenceSteps.push('destroyed');
      };

      const handle = manager.start('move-and-destroy', sequenceFn, mock.worldOps);
      expect(handle.isRunning).toBe(true);
      expect(sequenceSteps).toEqual(['start']);
      expect(mock.getPendingAnimationCount()).toBe(1);

      mock.advanceTime(0.016);
      await flushPromises();
      expect(sequenceSteps).toEqual(['start']);
      expect(handle.isRunning).toBe(true);

      mock.advanceTime(0.2);
      await flushPromises();
      expect(sequenceSteps).toEqual(['start']);
      expect(handle.isRunning).toBe(true);

      mock.advanceTime(0.3);
      await flushPromises();
      expect(sequenceSteps).toEqual(['start', 'animation-complete', 'destroyed']);
      expect(handle.isRunning).toBe(false);
      expect(mock.worldOps.destroy).toHaveBeenCalledWith('ball');
    });

    it('should wait then animate then wait again across frames', async () => {
      const sequenceSteps: string[] = [];

      const sequenceFn = async (world: WorldOps) => {
        sequenceSteps.push('wait-start');
        await world.wait(300);
        sequenceSteps.push('wait-done');
        await world.animate('box', { rotation: 90 }, { duration: 400 });
        sequenceSteps.push('rotate-done');
        await world.wait(200);
        sequenceSteps.push('final-wait-done');
      };

      const handle = manager.start('wait-animate-wait', sequenceFn, mock.worldOps);
      expect(sequenceSteps).toEqual(['wait-start']);
      expect(mock.getPendingWaitCount()).toBe(1);

      mock.advanceTime(0.1);
      await flushPromises();
      expect(sequenceSteps).toEqual(['wait-start']);

      mock.advanceTime(0.25);
      await flushPromises();
      expect(sequenceSteps).toEqual(['wait-start', 'wait-done']);
      expect(mock.getPendingAnimationCount()).toBe(1);

      mock.advanceTime(0.2);
      await flushPromises();
      expect(sequenceSteps).toEqual(['wait-start', 'wait-done']);

      mock.advanceTime(0.25);
      await flushPromises();
      expect(sequenceSteps).toEqual(['wait-start', 'wait-done', 'rotate-done']);
      expect(mock.getPendingWaitCount()).toBe(1);

      mock.advanceTime(0.3);
      await flushPromises();
      expect(sequenceSteps).toEqual(['wait-start', 'wait-done', 'rotate-done', 'final-wait-done']);
      expect(handle.isRunning).toBe(false);
    });

    it('should handle multiple concurrent operations in parallel', async () => {
      const sequenceSteps: string[] = [];

      const sequenceFn = async (world: WorldOps) => {
        sequenceSteps.push('parallel-start');
        await Promise.all([
          world.animate('entity1', { x: 10 }, { duration: 300 }),
          world.animate('entity2', { y: 20 }, { duration: 500 }),
        ]);
        sequenceSteps.push('parallel-done');
      };

      const handle = manager.start('parallel-animations', sequenceFn, mock.worldOps);
      expect(sequenceSteps).toEqual(['parallel-start']);
      expect(mock.getPendingAnimationCount()).toBe(2);

      mock.advanceTime(0.2);
      await flushPromises();
      expect(sequenceSteps).toEqual(['parallel-start']);
      expect(mock.getPendingAnimationCount()).toBe(2);

      mock.advanceTime(0.15);
      await flushPromises();
      expect(sequenceSteps).toEqual(['parallel-start']);
      expect(mock.getPendingAnimationCount()).toBe(1);

      mock.advanceTime(0.2);
      await flushPromises();
      expect(sequenceSteps).toEqual(['parallel-start', 'parallel-done']);
      expect(handle.isRunning).toBe(false);
    });
  });

  describe('re-trigger same name cancels old sequence', () => {
    it('should cancel old sequence mid-animation when re-triggered', async () => {
      const firstSequenceSteps: string[] = [];
      const secondSequenceSteps: string[] = [];
      let firstCancelled = false;

      const firstSequence = async (world: WorldOps) => {
        try {
          firstSequenceSteps.push('first-start');
          await world.animate('ball', { x: 100 }, { duration: 1000 });
          firstSequenceSteps.push('first-complete');
        } catch (err) {
          if (err instanceof SequenceCancelledError) {
            firstCancelled = true;
            firstSequenceSteps.push('first-cancelled');
          }
          throw err;
        }
      };

      const secondSequence = async (world: WorldOps) => {
        secondSequenceSteps.push('second-start');
        await world.animate('ball', { x: 50 }, { duration: 200 });
        secondSequenceSteps.push('second-complete');
      };

      const handle1 = manager.start('move-ball', firstSequence, mock.worldOps);
      expect(handle1.isRunning).toBe(true);
      expect(firstSequenceSteps).toEqual(['first-start']);

      mock.advanceTime(0.3);
      await flushPromises();
      expect(firstSequenceSteps).toEqual(['first-start']);

      const handle2 = manager.start('move-ball', secondSequence, mock.worldOps);

      await flushPromises();

      expect(firstCancelled).toBe(true);
      expect(firstSequenceSteps).toEqual(['first-start', 'first-cancelled']);
      expect(handle1.isRunning).toBe(false);
      expect(secondSequenceSteps).toEqual(['second-start']);

      mock.advanceTime(0.25);
      await flushPromises();
      expect(secondSequenceSteps).toEqual(['second-start', 'second-complete']);
      expect(handle2.isRunning).toBe(false);
    });

    it('should cancel old sequence during wait when re-triggered', async () => {
      let firstCancelled = false;
      let secondCompleted = false;

      const firstSequence = async (world: WorldOps) => {
        try {
          await world.wait(1000);
        } catch (err) {
          if (err instanceof SequenceCancelledError) {
            firstCancelled = true;
          }
          throw err;
        }
      };

      const secondSequence = async (world: WorldOps) => {
        await world.spawn('ball', { x: 0, y: 0 });
        secondCompleted = true;
      };

      const handle1 = manager.start('delayed-spawn', firstSequence, mock.worldOps);
      expect(handle1.isRunning).toBe(true);

      mock.advanceTime(0.5);
      await flushPromises();
      expect(handle1.isRunning).toBe(true);

      const handle2 = manager.start('delayed-spawn', secondSequence, mock.worldOps);

      await flushPromises();
      await flushPromises();

      expect(firstCancelled).toBe(true);
      expect(handle1.isRunning).toBe(false);
      expect(secondCompleted).toBe(true);
      expect(handle2.isRunning).toBe(false);
    });
  });

  describe('script reload/dispose cancels all active sequences', () => {
    it('should cancel all sequences when dispose() is called', async () => {
      const cancelledSequences: string[] = [];
      const runningSequences: string[] = [];

      const createSequence = (name: string) => async (world: WorldOps) => {
        try {
          runningSequences.push(name);
          await world.wait(1000);
          runningSequences.push(`${name}-completed`);
        } catch (err) {
          if (err instanceof SequenceCancelledError) {
            cancelledSequences.push(name);
          }
          throw err;
        }
      };

      manager.start('seq1', createSequence('seq1'), mock.worldOps);
      manager.start('seq2', createSequence('seq2'), mock.worldOps);
      manager.start('seq3', createSequence('seq3'), mock.worldOps);

      await flushPromises();
      expect(runningSequences).toEqual(['seq1', 'seq2', 'seq3']);
      expect(manager.isRunning('seq1')).toBe(true);
      expect(manager.isRunning('seq2')).toBe(true);
      expect(manager.isRunning('seq3')).toBe(true);

      manager.dispose();

      await flushPromises();
      await flushPromises();

      expect(cancelledSequences).toEqual(['seq1', 'seq2', 'seq3']);
      expect(manager.isRunning('seq1')).toBe(false);
      expect(manager.isRunning('seq2')).toBe(false);
      expect(manager.isRunning('seq3')).toBe(false);
    });

    it('should cancel sequences mid-animation when dispose() is called', async () => {
      const sequenceSteps: string[] = [];
      let wasCancelled = false;

      const sequenceFn = async (world: WorldOps) => {
        try {
          sequenceSteps.push('start');
          await world.animate('ball', { x: 100, y: 100 }, { duration: 2000 });
          sequenceSteps.push('animation-done');
          await world.wait(500);
          sequenceSteps.push('wait-done');
        } catch (err) {
          if (err instanceof SequenceCancelledError) {
            wasCancelled = true;
            sequenceSteps.push('cancelled');
          }
          throw err;
        }
      };

      const handle = manager.start('long-sequence', sequenceFn, mock.worldOps);
      expect(handle.isRunning).toBe(true);
      expect(sequenceSteps).toEqual(['start']);

      mock.advanceTime(0.5);
      await flushPromises();
      expect(sequenceSteps).toEqual(['start']);

      manager.dispose();

      await flushPromises();
      await flushPromises();

      expect(wasCancelled).toBe(true);
      expect(sequenceSteps).toEqual(['start', 'cancelled']);
      expect(handle.isRunning).toBe(false);
    });
  });

  describe('timer advancement verification', () => {
    it('should verify that updateTimers pattern works with sequences', async () => {
      const sequenceSteps: string[] = [];

      const sequenceFn = async (world: WorldOps) => {
        sequenceSteps.push('wait-300ms');
        await world.wait(300);
        sequenceSteps.push('wait-200ms');
        await world.wait(200);
        sequenceSteps.push('done');
      };

      const handle = manager.start('timer-test', sequenceFn, mock.worldOps);

      const dt = 0.016;
      const frames: number[] = [];

      for (let frame = 0; frame < 50; frame++) {
        mock.advanceTime(dt);
        await flushPromises();

        if (sequenceSteps.length > frames.length) {
          frames.push(frame);
        }

        if (!handle.isRunning) break;
      }

      expect(sequenceSteps).toEqual(['wait-300ms', 'wait-200ms', 'done']);
      expect(handle.isRunning).toBe(false);
      expect(frames[0]).toBeLessThan(25);
    });
  });

  describe('complex multi-step sequences', () => {
    it('should handle spawn → animate → wait → destroy chain', async () => {
      const sequenceSteps: string[] = [];

      const sequenceFn = async (world: WorldOps) => {
        sequenceSteps.push('spawning');
        const entityId = await world.spawn('enemy', { x: 0, y: 0 });
        sequenceSteps.push(`spawned:${entityId}`);

        await world.animate(entityId!, { x: 10, y: 0 }, { duration: 400 });
        sequenceSteps.push('moved');

        await world.wait(100);
        sequenceSteps.push('waited');

        await world.destroy(entityId!);
        sequenceSteps.push('destroyed');
      };

      const handle = manager.start('enemy-spawn-chain', sequenceFn, mock.worldOps);

      await flushPromises();
      expect(sequenceSteps).toEqual(['spawning', 'spawned:entity_1']);

      mock.advanceTime(0.2);
      await flushPromises();
      expect(sequenceSteps).toEqual(['spawning', 'spawned:entity_1']);

      mock.advanceTime(0.25);
      await flushPromises();
      expect(sequenceSteps).toEqual(['spawning', 'spawned:entity_1', 'moved']);

      mock.advanceTime(0.1);
      await flushPromises();
      expect(sequenceSteps).toEqual(['spawning', 'spawned:entity_1', 'moved', 'waited', 'destroyed']);
      expect(handle.isRunning).toBe(false);
    });

    it('should handle sequence cancellation during parallel operations', async () => {
      const sequenceSteps: string[] = [];
      let wasCancelled = false;

      const sequenceFn = async (world: WorldOps) => {
        try {
          sequenceSteps.push('parallel-start');
          await Promise.all([
            world.animate('a', { x: 10 }, { duration: 500 }),
            world.animate('b', { y: 20 }, { duration: 600 }),
            world.wait(400),
          ]);
          sequenceSteps.push('parallel-done');
        } catch (err) {
          if (err instanceof SequenceCancelledError) {
            wasCancelled = true;
            sequenceSteps.push('cancelled');
          }
          throw err;
        }
      };

      const handle = manager.start('parallel-cancel', sequenceFn, mock.worldOps);
      await flushPromises();
      expect(sequenceSteps).toEqual(['parallel-start']);

      mock.advanceTime(0.2);
      await flushPromises();

      handle.cancel();
      await flushPromises();
      await flushPromises();

      expect(wasCancelled).toBe(true);
      expect(sequenceSteps).toEqual(['parallel-start', 'cancelled']);
      expect(handle.isRunning).toBe(false);
    });
  });
});

describe('SequenceManager Integration — Script Sandbox Context', () => {
  it('should simulate ScriptSandboxRuntimeSystem integration pattern', async () => {
    const manager = new SequenceManager();
    const mock = createFrameBasedMockWorldOps();

    const scriptContext = {
      world: mock.worldOps,
      startSequence: (name: string, fn: (world: WorldOps) => Promise<void>) =>
        manager.start(name, fn, mock.worldOps),
      isSequenceRunning: (name: string): boolean => manager.isRunning(name),
      cancelSequence: (name: string): void => manager.cancel(name),
      dt: 0.016,
      elapsed: 0,
    };

    const sequenceSteps: string[] = [];

    const scriptStartedSequence = scriptContext.startSequence('script-sequence', async (world) => {
      sequenceSteps.push('start');
      await world.wait(100);
      sequenceSteps.push('wait-done');
      await world.animate('entity', { x: 5 }, { duration: 200 });
      sequenceSteps.push('animate-done');
    });

    expect(scriptStartedSequence.isRunning).toBe(true);
    expect(scriptContext.isSequenceRunning('script-sequence')).toBe(true);

    const simulateFrame = async (dt: number) => {
      mock.advanceTime(dt);
      await flushPromises();
    };

    for (let i = 0; i < 30 && scriptStartedSequence.isRunning; i++) {
      await simulateFrame(0.016);
    }

    expect(sequenceSteps).toEqual(['start', 'wait-done', 'animate-done']);
    expect(scriptStartedSequence.isRunning).toBe(false);

    manager.dispose();
    expect(manager.isRunning('script-sequence')).toBe(false);
  });
});
