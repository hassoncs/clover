import type {
  AssertResult,
  GameSnapshot,
  DebugBridgeState,
  Vec2,
} from './types';

function createResult(
  passed: boolean,
  assertionType: string,
  message: string,
  options: {
    expected?: unknown;
    actual?: unknown;
    entityId?: string;
  } = {}
): AssertResult {
  return {
    passed,
    message,
    assertionType,
    expected: options.expected,
    actual: options.actual,
    entityId: options.entityId,
    timestamp: Date.now(),
  };
}

export function createAssertions(
  getLatestSnapshot: () => GameSnapshot | null,
  state: DebugBridgeState
): {
  exists(entityId: string): AssertResult;
  notExists(entityId: string): AssertResult;
  nearPosition(entityId: string, pos: Vec2, epsilon?: number): AssertResult;
  hasVelocity(entityId: string, minMagnitude?: number): AssertResult;
  isStationary(entityId: string, epsilon?: number): AssertResult;
  collisionOccurred(entityA: string, entityB: string, withinMs?: number): AssertResult;
  stateEquals(key: string, value: unknown): AssertResult;
  entityCount(count: number): AssertResult;
  entityCountAtLeast(count: number): AssertResult;
} {
  const findEntity = (entityId: string) => {
    const snapshot = getLatestSnapshot();
    if (!snapshot) return null;
    return snapshot.entities.find((e) => e.id === entityId) ?? null;
  };

  return {
    exists(entityId: string): AssertResult {
      const entity = findEntity(entityId);
      if (entity) {
        return createResult(true, 'exists', `Entity "${entityId}" exists`, { entityId });
      }
      return createResult(false, 'exists', `Entity "${entityId}" not found`, { entityId });
    },

    notExists(entityId: string): AssertResult {
      const entity = findEntity(entityId);
      if (!entity) {
        return createResult(true, 'notExists', `Entity "${entityId}" does not exist`, { entityId });
      }
      return createResult(false, 'notExists', `Entity "${entityId}" unexpectedly exists`, { entityId });
    },

    nearPosition(entityId: string, pos: Vec2, epsilon: number = 0.5): AssertResult {
      const entity = findEntity(entityId);
      if (!entity) {
        return createResult(false, 'nearPosition', `Entity "${entityId}" not found`, {
          entityId,
          expected: pos,
        });
      }

      const dx = entity.position.x - pos.x;
      const dy = entity.position.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= epsilon) {
        return createResult(
          true,
          'nearPosition',
          `Entity "${entityId}" is within ${epsilon}m of target (distance: ${distance.toFixed(2)}m)`,
          {
            entityId,
            expected: pos,
            actual: entity.position,
          }
        );
      }

      return createResult(
        false,
        'nearPosition',
        `Entity "${entityId}" is ${distance.toFixed(2)}m from target (expected within ${epsilon}m)`,
        {
          entityId,
          expected: pos,
          actual: entity.position,
        }
      );
    },

    hasVelocity(entityId: string, minMagnitude: number = 0.1): AssertResult {
      const entity = findEntity(entityId);
      if (!entity) {
        return createResult(false, 'hasVelocity', `Entity "${entityId}" not found`, { entityId });
      }

      if (!entity.velocity) {
        return createResult(false, 'hasVelocity', `Entity "${entityId}" has no velocity data`, {
          entityId,
          expected: minMagnitude,
        });
      }

      const speed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2);

      if (speed >= minMagnitude) {
        return createResult(
          true,
          'hasVelocity',
          `Entity "${entityId}" is moving at ${speed.toFixed(2)}m/s`,
          {
            entityId,
            expected: minMagnitude,
            actual: speed,
          }
        );
      }

      return createResult(
        false,
        'hasVelocity',
        `Entity "${entityId}" speed ${speed.toFixed(2)}m/s is below minimum ${minMagnitude}m/s`,
        {
          entityId,
          expected: minMagnitude,
          actual: speed,
        }
      );
    },

    isStationary(entityId: string, epsilon: number = 0.1): AssertResult {
      const entity = findEntity(entityId);
      if (!entity) {
        return createResult(false, 'isStationary', `Entity "${entityId}" not found`, { entityId });
      }

      if (!entity.velocity) {
        return createResult(true, 'isStationary', `Entity "${entityId}" has no velocity (stationary)`, {
          entityId,
        });
      }

      const speed = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2);

      if (speed < epsilon) {
        return createResult(
          true,
          'isStationary',
          `Entity "${entityId}" is stationary (speed: ${speed.toFixed(3)}m/s)`,
          {
            entityId,
            expected: `< ${epsilon}`,
            actual: speed,
          }
        );
      }

      return createResult(
        false,
        'isStationary',
        `Entity "${entityId}" is moving at ${speed.toFixed(2)}m/s`,
        {
          entityId,
          expected: `< ${epsilon}`,
          actual: speed,
        }
      );
    },

    collisionOccurred(entityA: string, entityB: string, withinMs: number = 5000): AssertResult {
      const cutoffTime = Date.now() - withinMs;

      const collision = state.collisionHistory.find(
        (c) =>
          c.timestamp >= cutoffTime &&
          ((c.entityA === entityA && c.entityB === entityB) ||
            (c.entityA === entityB && c.entityB === entityA))
      );

      if (collision) {
        return createResult(
          true,
          'collisionOccurred',
          `Collision between "${entityA}" and "${entityB}" occurred ${Date.now() - collision.timestamp}ms ago`,
          {
            expected: `collision within ${withinMs}ms`,
            actual: collision,
          }
        );
      }

      return createResult(
        false,
        'collisionOccurred',
        `No collision between "${entityA}" and "${entityB}" in last ${withinMs}ms`,
        {
          expected: `collision within ${withinMs}ms`,
        }
      );
    },

    stateEquals(key: string, value: unknown): AssertResult {
      const snapshot = getLatestSnapshot();
      if (!snapshot) {
        return createResult(false, 'stateEquals', `No snapshot available`, { expected: value });
      }

      const gameState = snapshot.gameState ?? {};
      const actual = (gameState as Record<string, unknown>)[key];

      if (actual === value) {
        return createResult(true, 'stateEquals', `State "${key}" equals expected value`, {
          expected: value,
          actual,
        });
      }

      return createResult(
        false,
        'stateEquals',
        `State "${key}" is ${JSON.stringify(actual)}, expected ${JSON.stringify(value)}`,
        {
          expected: value,
          actual,
        }
      );
    },

    entityCount(count: number): AssertResult {
      const snapshot = getLatestSnapshot();
      if (!snapshot) {
        return createResult(false, 'entityCount', `No snapshot available`, { expected: count });
      }

      const actual = snapshot.entityCount;

      if (actual === count) {
        return createResult(true, 'entityCount', `Entity count is ${count}`, {
          expected: count,
          actual,
        });
      }

      return createResult(false, 'entityCount', `Entity count is ${actual}, expected ${count}`, {
        expected: count,
        actual,
      });
    },

    entityCountAtLeast(count: number): AssertResult {
      const snapshot = getLatestSnapshot();
      if (!snapshot) {
        return createResult(false, 'entityCountAtLeast', `No snapshot available`, { expected: count });
      }

      const actual = snapshot.entityCount;

      if (actual >= count) {
        return createResult(true, 'entityCountAtLeast', `Entity count ${actual} >= ${count}`, {
          expected: count,
          actual,
        });
      }

      return createResult(
        false,
        'entityCountAtLeast',
        `Entity count ${actual} is less than ${count}`,
        {
          expected: count,
          actual,
        }
      );
    },
  };
}
