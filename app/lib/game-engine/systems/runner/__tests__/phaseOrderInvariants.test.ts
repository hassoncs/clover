import { describe, it, expect } from 'vitest';
import { GameSystemRunner } from '../GameSystemRunner';
import { createFakeSystemContext } from './helpers/runnerHarness';
import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, UpdateContext } from '../types';

describe('Phase order invariants', () => {
  it('should execute systems in phase order: PRE_UPDATE → GAME_LOGIC → PHYSICS → POST_PHYSICS → VISUAL → CLEANUP', async () => {
    const runner = new GameSystemRunner();
    const executionOrder: string[] = [];
    
    const createSystem = (id: string, phase: SystemPhase): RuntimeSystem => ({
      id,
      phase,
      priority: 0,
      initialize: async () => {},
      update: () => {
        executionOrder.push(id);
      },
      destroy: () => {},
      getState: () => ({}),
    });
    
    runner.register(createSystem('visual-system', SystemPhase.VISUAL));
    runner.register(createSystem('pre-update-system', SystemPhase.PRE_UPDATE));
    runner.register(createSystem('cleanup-system', SystemPhase.CLEANUP));
    runner.register(createSystem('physics-system', SystemPhase.PHYSICS));
    runner.register(createSystem('game-logic-system', SystemPhase.GAME_LOGIC));
    runner.register(createSystem('post-physics-system', SystemPhase.POST_PHYSICS));
    
    await runner.initialize(createFakeSystemContext());
    
    runner.update({
      dt: 1/60,
      elapsed: 0,
      frameId: 1,
      input: { keys: new Set(), buttons: new Set() },
      gameState: { score: 0, lives: 3, time: 0, variables: {} },
      frame: { inputEvents: [], collisions: [] },
    } as UpdateContext);
    
    expect(executionOrder).toEqual([
      'pre-update-system',
      'game-logic-system',
      'physics-system',
      'post-physics-system',
      'visual-system',
      'cleanup-system',
    ]);
  });

  it('should respect priority within same phase', async () => {
    const runner = new GameSystemRunner();
    const executionOrder: string[] = [];
    
    const createSystem = (id: string, priority: number): RuntimeSystem => ({
      id,
      phase: SystemPhase.GAME_LOGIC,
      priority,
      initialize: async () => {},
      update: () => {
        executionOrder.push(id);
      },
      destroy: () => {},
      getState: () => ({}),
    });
    
    runner.register(createSystem('low-priority', 10));
    runner.register(createSystem('high-priority', 100));
    runner.register(createSystem('medium-priority', 50));
    
    await runner.initialize(createFakeSystemContext());
    
    runner.update({
      dt: 1/60,
      elapsed: 0,
      frameId: 1,
      input: { keys: new Set(), buttons: new Set() },
      gameState: { score: 0, lives: 3, time: 0, variables: {} },
      frame: { inputEvents: [], collisions: [] },
    } as UpdateContext);
    
    expect(executionOrder).toEqual([
      'high-priority',
      'medium-priority',
      'low-priority',
    ]);
  });

  it('should maintain consistent order across multiple frames', async () => {
    const runner = new GameSystemRunner();
    const frameOrders: string[][] = [[], [], []];
    let currentFrame = 0;
    
    const createSystem = (id: string, phase: SystemPhase): RuntimeSystem => ({
      id,
      phase,
      priority: 0,
      initialize: async () => {},
      update: (ctx: UpdateContext) => {
        const frameIndex = ctx.frameId - 1;
        if (frameIndex < 3) {
          frameOrders[frameIndex].push(id);
        }
      },
      destroy: () => {},
      getState: () => ({}),
    });
    
    runner.register(createSystem('physics', SystemPhase.PHYSICS));
    runner.register(createSystem('game-logic', SystemPhase.GAME_LOGIC));
    runner.register(createSystem('pre-update', SystemPhase.PRE_UPDATE));
    
    await runner.initialize(createFakeSystemContext());
    
    for (let i = 0; i < 3; i++) {
      runner.update({
        dt: 1/60,
        elapsed: i * 1/60,
        frameId: i + 1,
        input: { keys: new Set(), buttons: new Set() },
        gameState: { score: 0, lives: 3, time: 0, variables: {} },
        frame: { inputEvents: [], collisions: [] },
      } as UpdateContext);
    }
    
    const expectedOrder = ['pre-update', 'game-logic', 'physics'];
    expect(frameOrders[0]).toEqual(expectedOrder);
    expect(frameOrders[1]).toEqual(expectedOrder);
    expect(frameOrders[2]).toEqual(expectedOrder);
  });

  it('should handle empty phases gracefully', async () => {
    const runner = new GameSystemRunner();
    let updateCount = 0;
    
    runner.register({
      id: 'only-system',
      phase: SystemPhase.GAME_LOGIC,
      priority: 0,
      initialize: async () => {},
      update: () => {
        updateCount++;
      },
      destroy: () => {},
      getState: () => ({}),
    });
    
    await runner.initialize(createFakeSystemContext());
    
    runner.update({
      dt: 1/60,
      elapsed: 0,
      frameId: 1,
      input: { keys: new Set(), buttons: new Set() },
      gameState: { score: 0, lives: 3, time: 0, variables: {} },
      frame: { inputEvents: [], collisions: [] },
    } as UpdateContext);
    
    expect(updateCount).toBe(1);
  });
});
