import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SequenceManager, SequenceCancelledError } from './SequenceManager';
import type { WorldOps, AnimateTarget, AnimateOptions } from '@slopcade/shared/types/world-ops';

function createMockWorldOps(): WorldOps {
  const pendingAnimations = new Map<string, { resolve: () => void; reject: (err: Error) => void }>();
  const pendingWaits = new Map<string, { resolve: () => void; reject: (err: Error) => void }>();
  
  const mock: WorldOps = {
    // Animation / Timing
    animate: vi.fn((entityId: string, target: AnimateTarget, opts: AnimateOptions) => {
      return new Promise<void>((resolve, reject) => {
        const key = `${entityId}_${Date.now()}_${Math.random()}`;
        pendingAnimations.set(key, { resolve, reject });
      });
    }),
    wait: vi.fn((ms: number) => {
      return new Promise<void>((resolve, reject) => {
        const key = `${ms}_${Date.now()}_${Math.random()}`;
        pendingWaits.set(key, { resolve, reject });
      });
    }),
    
    // Entity Lifecycle
    spawn: vi.fn().mockResolvedValue('entity_1'),
    destroy: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn().mockResolvedValue('entity_2'),
    reparent: vi.fn().mockResolvedValue(undefined),
    
    // Transform
    getPosition: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    setPosition: vi.fn().mockResolvedValue(undefined),
    getRotation: vi.fn().mockResolvedValue(0),
    setRotation: vi.fn().mockResolvedValue(undefined),
    getScale: vi.fn().mockResolvedValue({ x: 1, y: 1 }),
    setScale: vi.fn().mockResolvedValue(undefined),
    setVisible: vi.fn().mockResolvedValue(undefined),
    
    // Physics
    getVelocity: vi.fn().mockResolvedValue({ x: 0, y: 0 }),
    setVelocity: vi.fn().mockResolvedValue(undefined),
    getAngularVelocity: vi.fn().mockResolvedValue(0),
    setAngularVelocity: vi.fn().mockResolvedValue(undefined),
    applyImpulse: vi.fn().mockResolvedValue(undefined),
    applyForce: vi.fn().mockResolvedValue(undefined),
    
    // Entity Metadata
    getTags: vi.fn().mockResolvedValue([]),
    addTag: vi.fn().mockResolvedValue(undefined),
    removeTag: vi.fn().mockResolvedValue(false),
    hasTag: vi.fn().mockResolvedValue(false),
    getTemplate: vi.fn().mockResolvedValue(undefined),
    getEntityData: vi.fn().mockResolvedValue(null),
    
    // Queries
    queryEntities: vi.fn().mockResolvedValue([]),
    queryEntitiesWithData: vi.fn().mockResolvedValue([]),
    queryPoint: vi.fn().mockResolvedValue(null),
    queryAABB: vi.fn().mockResolvedValue([]),
    raycast: vi.fn().mockResolvedValue(null),
    
    // Game State
    getVariable: vi.fn().mockResolvedValue(undefined),
    setVariable: vi.fn().mockResolvedValue(undefined),
    getConstant: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn().mockResolvedValue(undefined),
    win: vi.fn().mockResolvedValue(undefined),
    lose: vi.fn().mockResolvedValue(undefined),
  };
  
  return mock;
}

describe('SequenceManager', () => {
  let manager: SequenceManager;
  let mockWorldOps: WorldOps;
  
  beforeEach(() => {
    manager = new SequenceManager();
    mockWorldOps = createMockWorldOps();
  });
  
  describe('start sequence — runs to completion', () => {
    it('should run sequence to completion', async () => {
      const sequenceFn = vi.fn(async (world: WorldOps) => {
        await world.spawn('ball', { x: 0, y: 0 });
        await world.setPosition('ball', { x: 5, y: 5 });
      });
      
      const handle = manager.start('test-sequence', sequenceFn, mockWorldOps);
      
      expect(handle.name).toBe('test-sequence');
      expect(handle.isRunning).toBe(true);
      expect(manager.isRunning('test-sequence')).toBe(true);
      
      // Wait for sequence to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(sequenceFn).toHaveBeenCalledTimes(1);
      expect(mockWorldOps.spawn).toHaveBeenCalledWith('ball', { x: 0, y: 0 });
      expect(mockWorldOps.setPosition).toHaveBeenCalledWith('ball', { x: 5, y: 5 });
    });
  });
  
  describe('cancel sequence — rejects with SequenceCancelledError', () => {
    it('should cancel sequence and reject with SequenceCancelledError', async () => {
      let caughtError: Error | null = null;
      
      const sequenceFn = async (world: WorldOps) => {
        try {
          await world.animate('ball', { opacity: 0 }, { duration: 300 });
          await world.wait(200);
          await world.destroy('ball');
        } catch (err) {
          caughtError = err as Error;
          throw err;
        }
      };
      
      const handle = manager.start('death', sequenceFn, mockWorldOps);
      expect(handle.isRunning).toBe(true);
      
      // Cancel immediately
      manager.cancel('death');
      
      // Wait for cancellation to propagate
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(handle.isRunning).toBe(false);
      expect(manager.isRunning('death')).toBe(false);
      expect(caughtError).toBeInstanceOf(SequenceCancelledError);
      expect(caughtError?.name).toBe('SequenceCancelledError');
      expect(caughtError?.message).toContain('death');
    });
  });
  
  describe('re-trigger same name — cancels old', () => {
    it('should cancel old sequence when starting new one with same name', async () => {
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
      
      const handle1 = manager.start('foo', firstSequence, mockWorldOps);
      expect(handle1.isRunning).toBe(true);
      
      // Start second sequence with same name
      const handle2 = manager.start('foo', secondSequence, mockWorldOps);
      
      // Wait for sequences to settle
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(firstCancelled).toBe(true);
      expect(handle1.isRunning).toBe(false);
      expect(secondCompleted).toBe(true);
      expect(handle2.isRunning).toBe(false);
    });
  });
  
  describe('cancelAll — cleans everything', () => {
    it('should cancel all running sequences', async () => {
      const sequences = ['seq1', 'seq2', 'seq3'];
      const cancelledSequences: string[] = [];
      
      for (const name of sequences) {
        const sequenceFn = async (world: WorldOps) => {
          try {
            await world.wait(1000);
          } catch (err) {
            if (err instanceof SequenceCancelledError) {
              cancelledSequences.push(name);
            }
            throw err;
          }
        };
        
        manager.start(name, sequenceFn, mockWorldOps);
      }
      
      expect(manager.isRunning('seq1')).toBe(true);
      expect(manager.isRunning('seq2')).toBe(true);
      expect(manager.isRunning('seq3')).toBe(true);
      
      manager.cancelAll();
      
      // Wait for cancellations to propagate
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(manager.isRunning('seq1')).toBe(false);
      expect(manager.isRunning('seq2')).toBe(false);
      expect(manager.isRunning('seq3')).toBe(false);
      expect(cancelledSequences).toEqual(['seq1', 'seq2', 'seq3']);
    });
  });
  
  describe('errors in sequence body — caught and reported', () => {
    it('should catch and report errors without crashing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const sequenceFn = async (world: WorldOps) => {
        await world.spawn('ball', { x: 0, y: 0 });
        throw new Error('Intentional error');
      };
      
      const handle = manager.start('error-test', sequenceFn, mockWorldOps);
      
      // Wait for sequence to fail
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(handle.isRunning).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('isRunning — reflects state', () => {
    it('should reflect running state correctly', async () => {
      const sequenceFn = async (world: WorldOps) => {
        await world.spawn('ball', { x: 0, y: 0 });
        await world.setPosition('ball', { x: 5, y: 5 });
      };
      
      const handle = manager.start('state-test', sequenceFn, mockWorldOps);
      
      expect(manager.isRunning('state-test')).toBe(true);
      expect(handle.isRunning).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(manager.isRunning('state-test')).toBe(false);
      expect(handle.isRunning).toBe(false);
    });
  });
  
  describe('SequenceHandle.cancel() — works', () => {
    it('should cancel sequence via handle', async () => {
      let cancelled = false;
      
      const sequenceFn = async (world: WorldOps) => {
        try {
          await world.wait(1000);
        } catch (err) {
          if (err instanceof SequenceCancelledError) {
            cancelled = true;
          }
          throw err;
        }
      };
      
      const handle = manager.start('handle-cancel', sequenceFn, mockWorldOps);
      expect(handle.isRunning).toBe(true);
      
      handle.cancel();
      
      // Wait for cancellation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(cancelled).toBe(true);
      expect(handle.isRunning).toBe(false);
      expect(manager.isRunning('handle-cancel')).toBe(false);
    });
  });
  
  describe('dispose', () => {
    it('should cancel all sequences and cleanup', async () => {
      const sequences = ['dispose1', 'dispose2'];
      
      for (const name of sequences) {
        const sequenceFn = async (world: WorldOps) => {
          await world.wait(1000);
        };
        
        manager.start(name, sequenceFn, mockWorldOps);
      }
      
      expect(manager.isRunning('dispose1')).toBe(true);
      expect(manager.isRunning('dispose2')).toBe(true);
      
      manager.dispose();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(manager.isRunning('dispose1')).toBe(false);
      expect(manager.isRunning('dispose2')).toBe(false);
    });
  });
});

describe('SequenceCancelledError', () => {
  it('should be a proper Error subclass', () => {
    const error = new SequenceCancelledError('test-sequence');
    
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SequenceCancelledError');
    expect(error.message).toBe('Sequence "test-sequence" was cancelled');
  });
  
  it('should be catchable by name', () => {
    const error = new SequenceCancelledError('test');
    
    try {
      throw error;
    } catch (err) {
      expect(err instanceof SequenceCancelledError).toBe(true);
      expect((err as Error).name).toBe('SequenceCancelledError');
    }
  });
});
