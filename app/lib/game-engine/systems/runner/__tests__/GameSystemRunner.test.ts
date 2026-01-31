import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameSystemRunner } from '../GameSystemRunner';
import { EventQueueImpl } from '../EventQueue';
import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';

describe('GameSystemRunner', () => {
  let runner: GameSystemRunner;
  let mockContext: SystemContext;
  let mockUpdateContext: UpdateContext;

  beforeEach(() => {
    runner = new GameSystemRunner();
    mockContext = {
      bridge: {} as any,
      physics: {} as any,
      entityManager: {} as any,
      eventBus: {} as any,
      eventQueue: new EventQueueImpl(),
    };
    mockUpdateContext = {
      dt: 0.016,
      elapsed: 1.0,
      frameId: 60,
      input: {},
      gameState: {
        score: 0,
        lives: 3,
        time: 0,
        state: 'playing',
        variables: {},
      },
    };
  });

  it('should register systems', () => {
    const system: RuntimeSystem = {
      id: 'test-system',
      phase: SystemPhase.GAME_LOGIC,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    runner.register(system);
    expect(runner.getSystem('test-system')).toBe(system);
  });

  it('should throw when registering duplicate system', () => {
    const system: RuntimeSystem = {
      id: 'test-system',
      phase: SystemPhase.GAME_LOGIC,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    runner.register(system);
    expect(() => runner.register(system)).toThrow("System 'test-system' is already registered");
  });

  it('should initialize all systems', async () => {
    const system1 = {
      id: 'system1',
      phase: SystemPhase.GAME_LOGIC,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    const system2 = {
      id: 'system2',
      phase: SystemPhase.PHYSICS,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    runner.register(system1);
    runner.register(system2);

    await runner.initialize(mockContext);

    expect(system1.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ eventQueue: expect.any(EventQueueImpl) }),
      {}
    );
    expect(system2.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ eventQueue: expect.any(EventQueueImpl) }),
      {}
    );
  });

  it('should update systems in phase order', async () => {
    const executionOrder: string[] = [];

    const preUpdateSystem: RuntimeSystem = {
      id: 'pre-update',
      phase: SystemPhase.PRE_UPDATE,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(() => executionOrder.push('pre-update')),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    const gameLogicSystem: RuntimeSystem = {
      id: 'game-logic',
      phase: SystemPhase.GAME_LOGIC,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(() => executionOrder.push('game-logic')),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    const physicsSystem: RuntimeSystem = {
      id: 'physics',
      phase: SystemPhase.PHYSICS,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(() => executionOrder.push('physics')),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    runner.register(physicsSystem);
    runner.register(preUpdateSystem);
    runner.register(gameLogicSystem);

    await runner.initialize(mockContext);
    runner.update(mockUpdateContext);

    expect(executionOrder).toEqual(['pre-update', 'game-logic', 'physics']);
  });

  it('should update systems by priority within phase', async () => {
    const executionOrder: string[] = [];

    const highPriority: RuntimeSystem = {
      id: 'high',
      phase: SystemPhase.GAME_LOGIC,
      priority: 10,
      initialize: vi.fn(),
      update: vi.fn(() => executionOrder.push('high')),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    const lowPriority: RuntimeSystem = {
      id: 'low',
      phase: SystemPhase.GAME_LOGIC,
      priority: 1,
      initialize: vi.fn(),
      update: vi.fn(() => executionOrder.push('low')),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    runner.register(lowPriority);
    runner.register(highPriority);

    await runner.initialize(mockContext);
    runner.update(mockUpdateContext);

    expect(executionOrder).toEqual(['high', 'low']);
  });

  it('should destroy all systems', async () => {
    const system1 = {
      id: 'system1',
      phase: SystemPhase.GAME_LOGIC,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    const system2 = {
      id: 'system2',
      phase: SystemPhase.PHYSICS,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    runner.register(system1);
    runner.register(system2);

    await runner.initialize(mockContext);
    runner.destroy();

    expect(system1.destroy).toHaveBeenCalled();
    expect(system2.destroy).toHaveBeenCalled();
    expect(runner.getSystem('system1')).toBeUndefined();
    expect(runner.getSystem('system2')).toBeUndefined();
  });

  it('should throw when updating before initialization', () => {
    expect(() => runner.update(mockUpdateContext)).toThrow('GameSystemRunner is not initialized');
  });

  it('should throw when registering after initialization', async () => {
    await runner.initialize(mockContext);

    const system: RuntimeSystem = {
      id: 'late-system',
      phase: SystemPhase.GAME_LOGIC,
      priority: 0,
      initialize: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      getState: () => ({}),
    };

    expect(() => runner.register(system)).toThrow("Cannot register system 'late-system' after initialization");
  });
});
