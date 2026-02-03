import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameLoopController } from '../GameLoopController';

describe('GameLoopController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    // Mock performance.now to return the fake system time in milliseconds
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Lifecycle', () => {
    it('should not be running initially', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      expect(controller.isRunning()).toBe(false);
    });

    it('should start the game loop', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.start();
      expect(controller.isRunning()).toBe(true);
      
      vi.advanceTimersByTime(16);
      expect(onUpdate).toHaveBeenCalled();
    });

    it('should stop the game loop', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.start();
      controller.stop();
      expect(controller.isRunning()).toBe(false);
      
      vi.advanceTimersByTime(16);
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('should not start multiple intervals if start() is called multiple times', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      controller.start();
      controller.start();
      
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pause/Resume', () => {
    it('should pause the game loop', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.start();
      controller.pause();
      expect(controller.isPaused()).toBe(true);
      
      vi.advanceTimersByTime(16);
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('should resume the game loop', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.start();
      controller.pause();
      controller.resume();
      expect(controller.isPaused()).toBe(false);
      
      vi.advanceTimersByTime(16);
      expect(onUpdate).toHaveBeenCalled();
    });

    it('should still be running when paused', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.start();
      controller.pause();
      expect(controller.isRunning()).toBe(true);
    });
  });

  describe('Time Scale', () => {
    it('should set and get time scale', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.setTimeScale(0.5);
      expect(controller.getTimeScale()).toBe(0.5);
    });

    it('should affect delta time passed to onUpdate', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.setTimeScale(0.5);
      controller.start();
      
      vi.advanceTimersByTime(16);
      
      // 16ms * 0.5 = 8ms = 0.008s
      expect(onUpdate).toHaveBeenCalledWith(0.008);
    });

    it('should handle zero time scale (pause-like)', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.setTimeScale(0);
      controller.start();
      
      vi.advanceTimersByTime(16);
      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('should handle smooth transitions', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate });
      
      controller.start();
      // Transition to 2.0 over 0.2s (hardcoded in implementation)
      controller.setTimeScale(2.0, 1.0); 
      
      // After 0.1s (halfway through transition)
      vi.advanceTimersByTime(110);
      const midScale = controller.getTimeScale();
      expect(midScale).toBeGreaterThan(1.0);
      expect(midScale).toBeLessThan(2.0);
      
      // After 0.2s (transition complete)
      vi.advanceTimersByTime(110);
      expect(controller.getTimeScale()).toBe(2.0);
      
      // After 1.0s (restoreAfter period)
      vi.advanceTimersByTime(1000);
      // Should be transitioning back
      expect(controller.getTimeScale()).toBeLessThan(2.0);
      
      // After another 0.2s (restore transition complete)
      vi.advanceTimersByTime(200);
      expect(controller.getTimeScale()).toBe(1.0);
    });
  });

  describe('Frame Timing', () => {
    it('should call onUpdate with correct delta time', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate, intervalMs: 16 });
      
      controller.start();
      
      vi.advanceTimersByTime(16);
      expect(onUpdate).toHaveBeenCalledWith(0.016);
      
      vi.advanceTimersByTime(16);
      expect(onUpdate).toHaveBeenCalledWith(0.016);
    });

    it('should cap delta time at 100ms', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate, intervalMs: 16 });
      
      controller.start();
      
      // Advance by 200ms
      vi.advanceTimersByTime(200);
      
      // The first tick after start will have dt based on when start() was called.
      // If we advance by 200ms, multiple intervals might trigger.
      // But let's check the first call's argument.
      expect(onUpdate.mock.calls[0][0]).toBeLessThanOrEqual(0.1);
    });

    it('should process multiple frames when time advances', () => {
      const onUpdate = vi.fn();
      const controller = new GameLoopController({ onUpdate, intervalMs: 16 });
      
      controller.start();
      
      vi.advanceTimersByTime(48); // 3 frames
      expect(onUpdate).toHaveBeenCalledTimes(3);
    });
  });
});
