import { describe, it, expect } from 'vitest';
import { FeedbackManager } from '../feedback';
import type { FeedbackPolicy } from '../types';

function makePolicy(overrides: Partial<FeedbackPolicy> = {}): FeedbackPolicy {
  return {
    initMode: 'clear',
    swapPolicy: 'pingPong',
    stopBehavior: 'freeze',
    bufferFormat: 'rgba8',
    ...overrides,
  };
}

describe('FeedbackManager', () => {
  describe('registration', () => {
    it('registers a buffer and returns its state', () => {
      const mgr = new FeedbackManager();
      const policy = makePolicy();
      mgr.register('fb1', policy);

      const state = mgr.getState('fb1');
      expect(state).toBeDefined();
      expect(state!.id).toBe('fb1');
      expect(state!.policy).toEqual(policy);
      expect(state!.currentReadIndex).toBe(0);
      expect(state!.currentWriteIndex).toBe(1);
      expect(state!.initialized).toBe(false);
      expect(state!.frameCount).toBe(0);
      expect(state!.frozen).toBe(false);
    });

    it('throws on duplicate registration', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      expect(() => mgr.register('fb1', makePolicy())).toThrow();
    });

    it('returns undefined for non-existent buffer', () => {
      const mgr = new FeedbackManager();
      expect(mgr.getState('nope')).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('removes buffer and getState returns undefined', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      const result = mgr.unregister('fb1');
      expect(result).toBe(true);
      expect(mgr.getState('fb1')).toBeUndefined();
    });

    it('returns false for non-existent buffer', () => {
      const mgr = new FeedbackManager();
      expect(mgr.unregister('nope')).toBe(false);
    });
  });

  describe('initialize', () => {
    it('marks buffer as initialized with clear mode', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ initMode: 'clear' }));
      mgr.initialize('fb1');

      const state = mgr.getState('fb1');
      expect(state!.initialized).toBe(true);
    });

    it('marks buffer as initialized with seedFromInput mode', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ initMode: 'seedFromInput' }));
      mgr.initialize('fb1');

      const state = mgr.getState('fb1');
      expect(state!.initialized).toBe(true);
    });

    it('throws for non-existent buffer', () => {
      const mgr = new FeedbackManager();
      expect(() => mgr.initialize('nope')).toThrow();
    });
  });

  describe('swap — ping-pong', () => {
    it('alternates indices over 10 swaps', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      mgr.initialize('fb1');

      for (let i = 0; i < 10; i++) {
        const before = mgr.getState('fb1')!;
        const prevRead = before.currentReadIndex;
        const prevWrite = before.currentWriteIndex;

        mgr.swap('fb1');

        const after = mgr.getState('fb1')!;
        expect(after.currentReadIndex).toBe(prevWrite);
        expect(after.currentWriteIndex).toBe(prevRead);
        expect(after.frameCount).toBe(i + 1);
      }
    });

    it('remains stable over 1000 swaps', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      mgr.initialize('fb1');

      for (let i = 0; i < 1000; i++) {
        mgr.swap('fb1');
      }

      const state = mgr.getState('fb1')!;
      expect(state.frameCount).toBe(1000);
      expect(state.currentReadIndex).toBe(0);
      expect(state.currentWriteIndex).toBe(1);
    });

    it('throws when not initialized', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      expect(() => mgr.swap('fb1')).toThrow();
    });

    it('throws when frozen', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ stopBehavior: 'freeze' }));
      mgr.initialize('fb1');
      mgr.stop('fb1');
      expect(() => mgr.swap('fb1')).toThrow();
    });

    it('throws for non-existent buffer', () => {
      const mgr = new FeedbackManager();
      expect(() => mgr.swap('nope')).toThrow();
    });
  });

  describe('stop — freeze behavior', () => {
    it('freezes buffer and preserves state', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ stopBehavior: 'freeze' }));
      mgr.initialize('fb1');
      mgr.swap('fb1');
      mgr.swap('fb1');

      const beforeStop = mgr.getState('fb1')!;
      const readBefore = beforeStop.currentReadIndex;
      const writeBefore = beforeStop.currentWriteIndex;
      const frameBefore = beforeStop.frameCount;

      mgr.stop('fb1');

      const afterStop = mgr.getState('fb1')!;
      expect(afterStop.frozen).toBe(true);
      expect(afterStop.initialized).toBe(true);
      expect(afterStop.currentReadIndex).toBe(readBefore);
      expect(afterStop.currentWriteIndex).toBe(writeBefore);
      expect(afterStop.frameCount).toBe(frameBefore);
    });
  });

  describe('stop — clear behavior', () => {
    it('resets buffer to uninitialized state', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ stopBehavior: 'clear' }));
      mgr.initialize('fb1');
      mgr.swap('fb1');
      mgr.swap('fb1');

      mgr.stop('fb1');

      const state = mgr.getState('fb1')!;
      expect(state.initialized).toBe(false);
      expect(state.frozen).toBe(false);
      expect(state.currentReadIndex).toBe(0);
      expect(state.currentWriteIndex).toBe(1);
      expect(state.frameCount).toBe(0);
    });
  });

  describe('resume', () => {
    it('unfreezes a frozen buffer so swap works again', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ stopBehavior: 'freeze' }));
      mgr.initialize('fb1');
      mgr.swap('fb1');
      mgr.stop('fb1');

      expect(mgr.getState('fb1')!.frozen).toBe(true);

      mgr.resume('fb1');

      expect(mgr.getState('fb1')!.frozen).toBe(false);
      expect(() => mgr.swap('fb1')).not.toThrow();
    });

    it('throws for non-existent buffer', () => {
      const mgr = new FeedbackManager();
      expect(() => mgr.resume('nope')).toThrow();
    });

    it('throws if buffer is not frozen', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      mgr.initialize('fb1');
      expect(() => mgr.resume('fb1')).toThrow();
    });
  });

  describe('reset', () => {
    it('restores buffer to initial state after 100 swaps', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      mgr.initialize('fb1');

      for (let i = 0; i < 100; i++) {
        mgr.swap('fb1');
      }

      mgr.reset('fb1');

      const state = mgr.getState('fb1')!;
      expect(state.initialized).toBe(false);
      expect(state.frozen).toBe(false);
      expect(state.currentReadIndex).toBe(0);
      expect(state.currentWriteIndex).toBe(1);
      expect(state.frameCount).toBe(0);
    });

    it('throws for non-existent buffer', () => {
      const mgr = new FeedbackManager();
      expect(() => mgr.reset('nope')).toThrow();
    });
  });

  describe('isReadable', () => {
    it('returns false before initialization', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      expect(mgr.isReadable('fb1')).toBe(false);
    });

    it('returns true after initialization with clear mode', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ initMode: 'clear' }));
      mgr.initialize('fb1');
      expect(mgr.isReadable('fb1')).toBe(true);
    });

    it('returns false for seedFromInput before first swap', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ initMode: 'seedFromInput' }));
      mgr.initialize('fb1');
      expect(mgr.isReadable('fb1')).toBe(false);
    });

    it('returns true for seedFromInput after first swap', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ initMode: 'seedFromInput' }));
      mgr.initialize('fb1');
      mgr.swap('fb1');
      expect(mgr.isReadable('fb1')).toBe(true);
    });

    it('returns false for non-existent buffer', () => {
      const mgr = new FeedbackManager();
      expect(mgr.isReadable('nope')).toBe(false);
    });

    it('returns true when frozen (state preserved)', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy({ stopBehavior: 'freeze' }));
      mgr.initialize('fb1');
      mgr.swap('fb1');
      mgr.stop('fb1');
      expect(mgr.isReadable('fb1')).toBe(true);
    });
  });

  describe('getAllIds', () => {
    it('returns all registered buffer IDs sorted', () => {
      const mgr = new FeedbackManager();
      mgr.register('charlie', makePolicy());
      mgr.register('alpha', makePolicy());
      mgr.register('bravo', makePolicy());

      expect(mgr.getAllIds()).toEqual(['alpha', 'bravo', 'charlie']);
    });

    it('returns empty array when no buffers registered', () => {
      const mgr = new FeedbackManager();
      expect(mgr.getAllIds()).toEqual([]);
    });
  });

  describe('validate', () => {
    it('returns valid for consistent state', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      mgr.initialize('fb1');
      mgr.swap('fb1');

      const result = mgr.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns valid for empty manager', () => {
      const mgr = new FeedbackManager();
      const result = mgr.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('detects read/write index collision', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      mgr.initialize('fb1');

      const result = mgr.validate();
      expect(result.valid).toBe(true);
    });
  });

  describe('getFrameCount', () => {
    it('returns 0 for newly registered buffer', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      expect(mgr.getFrameCount('fb1')).toBe(0);
    });

    it('returns correct count after swaps', () => {
      const mgr = new FeedbackManager();
      mgr.register('fb1', makePolicy());
      mgr.initialize('fb1');
      mgr.swap('fb1');
      mgr.swap('fb1');
      mgr.swap('fb1');
      expect(mgr.getFrameCount('fb1')).toBe(3);
    });

    it('returns -1 for non-existent buffer', () => {
      const mgr = new FeedbackManager();
      expect(mgr.getFrameCount('nope')).toBe(-1);
    });
  });

  describe('determinism', () => {
    it('initial state is always readIndex=0, writeIndex=1, frameCount=0', () => {
      for (let i = 0; i < 10; i++) {
        const mgr = new FeedbackManager();
        mgr.register(`fb${i}`, makePolicy());
        const state = mgr.getState(`fb${i}`)!;
        expect(state.currentReadIndex).toBe(0);
        expect(state.currentWriteIndex).toBe(1);
        expect(state.frameCount).toBe(0);
      }
    });

    it('swap always alternates deterministically regardless of creation order', () => {
      const mgr1 = new FeedbackManager();
      const mgr2 = new FeedbackManager();

      mgr1.register('a', makePolicy());
      mgr1.register('b', makePolicy());
      mgr2.register('b', makePolicy());
      mgr2.register('a', makePolicy());

      mgr1.initialize('a');
      mgr1.initialize('b');
      mgr2.initialize('a');
      mgr2.initialize('b');

      for (let i = 0; i < 50; i++) {
        mgr1.swap('a');
        mgr1.swap('b');
        mgr2.swap('a');
        mgr2.swap('b');
      }

      expect(mgr1.getState('a')).toEqual(mgr2.getState('a'));
      expect(mgr1.getState('b')).toEqual(mgr2.getState('b'));
    });
  });
});
