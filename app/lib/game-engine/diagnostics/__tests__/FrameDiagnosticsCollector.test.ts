import { describe, it, expect } from 'vitest';
import { FrameDiagnosticsCollector } from '../FrameDiagnosticsCollector';
import type { UpdateContext } from '../../systems/runner/types';

describe('FrameDiagnosticsCollector', () => {
  it('should not collect when disabled', () => {
    const collector = new FrameDiagnosticsCollector();
    
    const ctx = createMockUpdateContext();
    collector.startFrame(ctx);
    collector.endFrame();
    
    expect(collector.getCurrentFrame()).toBeNull();
    expect(collector.getLastFrames()).toHaveLength(0);
  });

  it('should collect frame data when enabled', () => {
    const collector = new FrameDiagnosticsCollector();
    collector.enable();
    
    const ctx = createMockUpdateContext();
    collector.startFrame(ctx);
    collector.endFrame();
    
    const frames = collector.getLastFrames();
    expect(frames).toHaveLength(1);
    expect(frames[0].frameId).toBe(1);
    expect(frames[0].dt).toBe(1/60);
  });

  it('should track input events', () => {
    const collector = new FrameDiagnosticsCollector();
    collector.enable();
    
    const ctx = createMockUpdateContext({
      inputEvents: [
        { type: 'tap', x: 100, y: 200, worldX: 5, worldY: 10 },
        { type: 'button_pressed', button: 'jump' },
      ],
    });
    
    collector.startFrame(ctx);
    collector.endFrame();
    
    const frame = collector.getLastFrames()[0];
    expect(frame.input.eventCount).toBe(2);
    expect(frame.input.hasTap).toBe(true);
    expect(frame.input.hasButtonPress).toBe(true);
    expect(frame.input.hasDrag).toBe(false);
  });

  it('should track collisions', () => {
    const collector = new FrameDiagnosticsCollector();
    collector.enable();
    
    const ctx = createMockUpdateContext({
      collisions: [
        { entityA: { id: 'ball' }, entityB: { id: 'peg' }, normal: { x: 0, y: 1 }, impulse: 10 },
      ],
    });
    
    collector.startFrame(ctx);
    collector.endFrame();
    
    const frame = collector.getLastFrames()[0];
    expect(frame.collisions.count).toBe(1);
    expect(frame.collisions.entityPairs).toEqual([{ a: 'ball', b: 'peg' }]);
  });

  it('should maintain history limit', () => {
    const collector = new FrameDiagnosticsCollector(5);
    collector.enable();
    
    for (let i = 0; i < 10; i++) {
      const ctx = createMockUpdateContext({ frameId: i + 1 });
      collector.startFrame(ctx);
      collector.endFrame();
    }
    
    const frames = collector.getLastFrames();
    expect(frames).toHaveLength(5);
    expect(frames[0].frameId).toBe(6);
    expect(frames[4].frameId).toBe(10);
  });

  it('should calculate average frame time', () => {
    const collector = new FrameDiagnosticsCollector();
    collector.enable();
    
    collector.startFrame(createMockUpdateContext({ dt: 0.016 }));
    collector.endFrame();
    
    collector.startFrame(createMockUpdateContext({ dt: 0.017 }));
    collector.endFrame();
    
    expect(collector.getAverageFrameTime()).toBeCloseTo(0.0165, 4);
  });

  it('should calculate collision rate', () => {
    const collector = new FrameDiagnosticsCollector();
    collector.enable();
    
    collector.startFrame(createMockUpdateContext({ collisions: [{ entityA: { id: 'a' }, entityB: { id: 'b' }, normal: { x: 0, y: 1 }, impulse: 1 }] }));
    collector.endFrame();
    
    collector.startFrame(createMockUpdateContext({ collisions: [] }));
    collector.endFrame();
    
    expect(collector.getCollisionRate()).toBe(0.5);
  });

  it('should clear history', () => {
    const collector = new FrameDiagnosticsCollector();
    collector.enable();
    
    collector.startFrame(createMockUpdateContext());
    collector.endFrame();
    
    collector.clear();
    
    expect(collector.getLastFrames()).toHaveLength(0);
    expect(collector.getCurrentFrame()).toBeNull();
  });
});

function createMockUpdateContext(overrides: Partial<{
  frameId: number;
  dt: number;
  inputEvents: any[];
  collisions: any[];
}> = {}): UpdateContext {
  return {
    dt: overrides.dt ?? 1/60,
    elapsed: 0,
    frameId: overrides.frameId ?? 1,
    input: { keys: new Set(), buttons: new Set() },
    gameState: { score: 0, lives: 3, time: 0, variables: {} },
    frame: {
      inputEvents: overrides.inputEvents ?? [],
      collisions: overrides.collisions ?? [],
    },
  } as UpdateContext;
}
