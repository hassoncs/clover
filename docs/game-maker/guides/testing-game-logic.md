# Testing Game Logic

> Patterns for testing game rules, win conditions, and entity behaviors without requiring full physics simulation.

---

## Overview

Game logic tests verify that rules, win conditions, and state machines behave correctly. These tests run fast (no physics or rendering) and focus on the RulesSystem and game definition structure.

---

## Test Pyramid

| Level | What | Speed | Coverage |
|-------|------|-------|----------|
| **Smoke Tests** | Game definition loads, has required templates | ~1ms | Structure |
| **Rule Unit Tests** | Individual rules trigger correct actions | ~5ms | Logic |
| **Win Condition Tests** | Game correctly detects win/lose states | ~10ms | End states |
| **State Machine Tests** | Transitions work correctly | ~10ms | Flow |

---

## Minimal Test Setup

### Basic Mocks

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesSystem } from '@/lib/game-engine/systems/runner/wrappers/RulesSystem';
import type { EntityManager } from '@/lib/game-engine/EntityManager';
import type { Physics2D } from '@/lib/physics2d/Physics2D';
import type { RuntimeEntity } from '@/lib/game-engine/types';

// Minimal EntityManager mock
function createMockEntityManager(): EntityManager {
  return {
    getEntityCountByTag: vi.fn().mockReturnValue(0),
    getEntitiesByTag: vi.fn().mockReturnValue([]),
    getEntity: vi.fn(),
    destroyEntity: vi.fn(),
    clearAll: vi.fn(),
    createEntity: vi.fn(),
    getTemplate: vi.fn().mockReturnValue({ id: 'test' }),
    getActiveEntities: vi.fn().mockReturnValue([]),
    getVisibleEntities: vi.fn().mockReturnValue([]),
    addTag: vi.fn(),
    removeTag: vi.fn(),
  } as any;
}

// Minimal Physics mock (most tests don't need real physics)
function createMockPhysics(): Physics2D {
  return {
    applyImpulseToCenter: vi.fn(),
    applyForceToCenter: vi.fn(),
    setLinearVelocity: vi.fn(),
    getLinearVelocity: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    setAngularVelocity: vi.fn(),
    raycast: vi.fn().mockReturnValue(null),
    getTransform: vi.fn().mockReturnValue({ position: { x: 0, y: 0 } }),
  } as any;
}
```

### Entity Factory

```typescript
function createMockEntity(
  id: string,
  tags: string[] = [],
  position: { x: number; y: number } = { x: 0, y: 0 }
): RuntimeEntity {
  return {
    id,
    name: id,
    tags,
    transform: { x: position.x, y: position.y, angle: 0, scaleX: 1, scaleY: 1 },
    physics: { bodyType: 'dynamic' },
  } as RuntimeEntity;
}
```

---

## Pattern 1: Smoke Tests

Verify game definition structure without running any logic.

```typescript
describe('myGame smoke tests', () => {
  it('should load game definition', () => {
    const game = createMyGame();
    expect(game).toBeDefined();
    expect(game.metadata.id).toBeDefined();
  });

  it('should have required templates', () => {
    const game = createMyGame();
    expect(game.templates?.player).toBeDefined();
    expect(game.templates?.enemy).toBeDefined();
  });

  it('should have win condition configured', () => {
    const game = createMyGame();
    expect(game.winCondition).toBeDefined();
    // Expression-based win condition
    expect(game.winCondition?.expr).toBe('score >= 100');
    // OR rule-managed win condition (no expr)
    expect(game.winCondition?.expr).toBeUndefined();
  });
});
```

---

## Pattern 2: Expression-Based Win Conditions

For games with simple win conditions using expressions.

```typescript
describe('expression win condition', () => {
  let rulesSystem: RulesSystem;
  let mockEntityManager: EntityManager;
  let mockPhysics: Physics2D;

  const runUpdate = () => {
    rulesSystem.update({ dt: 0.016, elapsed: 0, frameId: 0, frame: { inputEvents: [], collisions: [] }, input: {} } as any, {} as any);
  };

  beforeEach(() => {
    const game = createMyGame();
    mockEntityManager = createMockEntityManager();
    mockPhysics = createMockPhysics();
    rulesSystem = new RulesSystem({
      rules: game.rules ?? [],
      winCondition: game.winCondition,
      loseCondition: game.loseCondition,
      variables: game.variables,
      containers: game.containers,
      stateMachines: game.stateMachines,
    });
    
    rulesSystem.initialize({ 
      entityManager: mockEntityManager, 
      physics: mockPhysics,
      bridge: {} as any,
      eventBus: { emit: vi.fn(), subscribe: vi.fn() } as any,
      eventQueue: {} as any
    } as any, {} as any);
    
    rulesSystem.setRuntimeState({
      vars: { ...game.variables },
      firedOnce: new Set(),
      cooldowns: new Map(),
      pendingEvents: new Map(),
      smStates: {}
    } as any);
  });

  it('should NOT win when score is below threshold', () => {
    rulesSystem.setVariable('score', 50);
    runUpdate();
    expect(rulesSystem.getState().gameState).toBe('playing');
  });

  it('should win when score reaches threshold', () => {
    rulesSystem.setVariable('score', 100);
    runUpdate();
    expect(rulesSystem.getState().gameState).toBe('won');
  });
});
```

---

## Pattern 3: Rule-Managed Win Conditions

For complex games where win logic lives in custom rules/actions.

```typescript
describe('rule-managed win condition', () => {
  let rulesSystem: RulesSystem;
  let mockEntityManager: EntityManager;

  beforeEach(() => {
    const game = createBallSortGame(1);
    mockEntityManager = createMockEntityManager();
    rulesSystem = new RulesSystem({
      rules: game.rules ?? [],
      winCondition: game.winCondition,
      stateMachines: game.stateMachines,
    });
    
    rulesSystem.initialize({ 
      entityManager: mockEntityManager,
      eventBus: { emit: vi.fn(), subscribe: vi.fn() } as any,
    } as any, {} as any);
    
    rulesSystem.setRuntimeState({
      vars: { ...game.variables },
      firedOnce: new Set(),
      cooldowns: new Map(),
      pendingEvents: new Map(),
    } as any);
  });

  it('should NOT win with unsorted state', () => {
    // Trigger the event
    rulesSystem.triggerEvent('ball_dropped');
    rulesSystem.update({ dt: 0.016 } as any, {} as any);
    expect(rulesSystem.getState().gameState).toBe('playing');
  });

  it('should win when custom action calls ctx.win()', () => {
    // Set up the state that causes the custom action to call ctx.win()
    setupSortedState(rulesSystem, mockEntityManager);
    
    rulesSystem.triggerEvent('ball_dropped');
    rulesSystem.update({ dt: 0.016 } as any, {} as any);
    expect(rulesSystem.getState().gameState).toBe('won');
  });
});
```

---

## Pattern 4: Event-Driven Rules

Test rules that respond to game events.

```typescript
describe('event-driven rules', () => {
  it('should increment score on enemy_destroyed event', () => {
    const game = createMyGame();
    const rulesSystem = new RulesSystem({ rules: game.rules ?? [] });
    rulesSystem.initialize({ 
      entityManager: createMockEntityManager(),
      eventBus: { emit: vi.fn(), subscribe: vi.fn() } as any,
    } as any, {} as any);
    
    rulesSystem.setRuntimeState({
      vars: { score: 0 },
      firedOnce: new Set(),
      cooldowns: new Map(),
      pendingEvents: new Map(),
    } as any);

    // Trigger the event
    rulesSystem.triggerEvent('enemy_destroyed');
    rulesSystem.update({ dt: 0.016 } as any, {} as any);

    expect(rulesSystem.getState().variables.score).toBe(10);
  });
});
```

---

## Pattern 5: State Machine Transitions

Test game flow state machines.

```typescript
describe('state machine transitions', () => {
  it('should transition from idle to active on start event', () => {
    const game = createMyGame();
    const rulesSystem = new RulesSystem({ stateMachines: game.stateMachines });
    rulesSystem.initialize({ 
      entityManager: createMockEntityManager(),
      eventBus: { emit: vi.fn(), subscribe: vi.fn() } as any,
    } as any, {} as any);
    
    rulesSystem.setRuntimeState({
      vars: {},
      firedOnce: new Set(),
      cooldowns: new Map(),
      pendingEvents: new Map(),
      smStates: { gameFlow: 'idle' }
    } as any);

    expect(rulesSystem.getStateMachineState('gameFlow')).toBe('idle');
    
    rulesSystem.triggerEvent('game_start');
    rulesSystem.update({ dt: 0.016 } as any, {} as any);
    
    expect(rulesSystem.getStateMachineState('gameFlow')).toBe('active');
  });
});
```

---

## Pattern 6: Mocking Entity State

For tests that depend on entity positions or tags.

```typescript
describe('entity-dependent rules', () => {
  it('should detect all enemies destroyed', () => {
    const mockEntityManager = createMockEntityManager();
    
    // Initially 3 enemies
    mockEntityManager.getEntityCountByTag = vi.fn().mockReturnValue(3);
    
    const rulesSystem = new RulesSystem({ winCondition: { expr: 'enemyCount == 0' } });
    rulesSystem.initialize({ 
      entityManager: mockEntityManager,
      eventBus: { emit: vi.fn(), subscribe: vi.fn() } as any,
    } as any, {} as any);
    
    rulesSystem.setRuntimeState({
      vars: {},
      firedOnce: new Set(),
      cooldowns: new Map(),
      pendingEvents: new Map(),
    } as any);
    
    // Simulate destroying all enemies
    mockEntityManager.getEntityCountByTag = vi.fn().mockReturnValue(0);
    rulesSystem.update({ dt: 0.016 } as any, {} as any);
    
    expect(rulesSystem.getState().gameState).toBe('won');
  });
});
```


---

## Pattern 5: State Machine Transitions

Test game flow state machines.

```typescript
describe('state machine transitions', () => {
  it('should transition from idle to active on start event', () => {
    const game = createMyGame();
    const evaluator = new RulesEvaluator(createMockEntityManager());
    evaluator.setStateMachines(game.stateMachines);
    evaluator.start();

    expect(evaluator.getStateMachineState('gameFlow')).toBe('idle');
    
    evaluator.triggerEvent('game_start');
    evaluator.update(0.016, mockEntityManager, [], {}, {}, mockPhysics);
    
    expect(evaluator.getStateMachineState('gameFlow')).toBe('active');
  });
});
```

---

## Pattern 6: Mocking Entity State

For tests that depend on entity positions or tags.

```typescript
describe('entity-dependent rules', () => {
  it('should detect all enemies destroyed', () => {
    const mockEntityManager = createMockEntityManager();
    
    // Initially 3 enemies
    mockEntityManager.getEntityCountByTag = vi.fn().mockReturnValue(3);
    
    const evaluator = new RulesEvaluator(mockEntityManager);
    evaluator.setWinCondition({ expr: 'enemyCount == 0' });
    evaluator.start();
    
    // Simulate destroying all enemies
    mockEntityManager.getEntityCountByTag = vi.fn().mockReturnValue(0);
    evaluator.update(0.016, mockEntityManager, [], {}, {}, mockPhysics);
    
    expect(evaluator.getGameStateValue()).toBe('won');
  });
});
```

---

## Best Practices

### Do

- **Test structure first**: Smoke tests catch definition errors early
- **Mock minimally**: Only mock what the test actually needs
- **Use variables**: Set game variables directly instead of complex entity setups
- **Test boundaries**: Win at exactly threshold, not win below threshold

### Don't

- **Don't test physics**: Use the game-inspector MCP for physics verification
- **Don't duplicate engine tests**: Trust RulesSystem internals, test your game's logic
- **Don't test rendering**: Visual testing is separate

---

## File Organization

```
lib/test-games/games/
└── myGame/
    ├── __tests__/
    │   └── myGame.test.ts    # Logic tests
    ├── game.ts               # Game factory
    └── index.ts              # Exports
```

---

## Running Tests

```bash
# Run all tests for a specific game
pnpm test --filter slopcade -- --run myGame

# Run with coverage
pnpm test --filter slopcade -- --run --coverage myGame

# Watch mode during development
pnpm test --filter slopcade -- myGame
```

---

## Reference Implementation

See `lib/test-games/games/ballSort/__tests__/ballSort.test.ts` for a complete example demonstrating:
- Smoke tests for game definition
- Rule-managed win condition testing
- Mocking entity state for complex scenarios
- Event triggering and state verification
