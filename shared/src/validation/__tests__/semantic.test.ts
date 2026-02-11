import { describe, it, expect } from 'vitest';
import type { GameDefinition } from '../../types/GameDefinition';
import type { ValidationError } from '../gameDefinitionTypes';
import {
  validateEntityPrefabRefs,
  validateRuleEntityRefs,
  validateParentChildCycles,
  validateConstantRefs,
} from '../semantic';

function makeGame(overrides: Partial<GameDefinition> = {}): Partial<GameDefinition> {
  return {
    metadata: { id: 'test', title: 'Test', version: '1.0.0' },
    world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
    prefabs: {},
    entities: [],
    rules: [],
    ...overrides,
  };
}

describe('validateEntityPrefabRefs', () => {
  it('passes when all entity prefab refs are valid', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      prefabs: { ball: { id: 'ball' } } as GameDefinition['prefabs'],
      entities: [
        { id: 'e1', name: 'E1', prefab: 'ball', transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      ] as GameDefinition['entities'],
    });

    validateEntityPrefabRefs(game, errors);

    expect(errors).toHaveLength(0);
  });

  it('errors when entity references unknown prefab', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      prefabs: {} as GameDefinition['prefabs'],
      entities: [
        { id: 'e1', name: 'E1', prefab: 'nonexistent', transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      ] as GameDefinition['entities'],
    });

    validateEntityPrefabRefs(game, errors);

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('UNKNOWN_PREFAB');
    expect(errors[0].message).toContain('nonexistent');
    expect(errors[0].path).toBe('entities.e1.prefab');
  });

  it('passes when entity has no prefab', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      entities: [
        { id: 'e1', name: 'E1', transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      ] as GameDefinition['entities'],
    });

    validateEntityPrefabRefs(game, errors);

    expect(errors).toHaveLength(0);
  });
});

describe('validateRuleEntityRefs', () => {
  it('passes when rule entity refs are valid', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      prefabs: { ball: { id: 'ball' } } as GameDefinition['prefabs'],
      entities: [
        { id: 'spawner', name: 'Spawner', transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      ] as GameDefinition['entities'],
      rules: [
        {
          id: 'r1',
          trigger: { type: 'tap' },
          actions: [
            { type: 'spawn', prefab: 'ball', position: { type: 'at_entity', entityId: 'spawner' } },
          ],
        },
      ] as GameDefinition['rules'],
    });

    validateRuleEntityRefs(game, errors);

    expect(errors).toHaveLength(0);
  });

  it('errors when spawn action references unknown entity', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      prefabs: { ball: { id: 'ball' } } as GameDefinition['prefabs'],
      entities: [] as GameDefinition['entities'],
      rules: [
        {
          id: 'r1',
          trigger: { type: 'tap' },
          actions: [
            { type: 'spawn', prefab: 'ball', position: { type: 'at_entity', entityId: 'ghost' } },
          ],
        },
      ] as GameDefinition['rules'],
    });

    validateRuleEntityRefs(game, errors);

    expect(errors.some((e) => e.code === 'UNKNOWN_ENTITY_REF' && e.message.includes('ghost'))).toBe(true);
  });

  it('errors when spawn action references unknown prefab', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      prefabs: {} as GameDefinition['prefabs'],
      entities: [] as GameDefinition['entities'],
      rules: [
        {
          id: 'r1',
          trigger: { type: 'tap' },
          actions: [
            { type: 'spawn', prefab: 'missing_tmpl', position: { type: 'fixed', x: 0, y: 0 } },
          ],
        },
      ] as GameDefinition['rules'],
    });

    validateRuleEntityRefs(game, errors);

    expect(errors.some((e) => e.code === 'UNKNOWN_PREFAB' && e.message.includes('missing_tmpl'))).toBe(true);
  });

  it('errors when destroy action references unknown entity by id', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      entities: [] as GameDefinition['entities'],
      rules: [
        {
          id: 'r1',
          trigger: { type: 'tap' },
          actions: [
            { type: 'destroy', target: { type: 'by_id', entityId: 'phantom' } },
          ],
        },
      ] as GameDefinition['rules'],
    });

    validateRuleEntityRefs(game, errors);

    expect(errors.some((e) => e.code === 'UNKNOWN_ENTITY_REF' && e.message.includes('phantom'))).toBe(true);
  });

  it('passes when destroy targets by tag (no entity id check)', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      entities: [] as GameDefinition['entities'],
      rules: [
        {
          id: 'r1',
          trigger: { type: 'tap' },
          actions: [
            { type: 'destroy', target: { type: 'by_tag', tag: 'enemy' } },
          ],
        },
      ] as GameDefinition['rules'],
    });

    validateRuleEntityRefs(game, errors);

    expect(errors).toHaveLength(0);
  });
});

describe('validateParentChildCycles', () => {
  it('passes with no cycles', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      prefabs: {
        parent: {
          id: 'parent',
          children: [
            { name: 'c', prefab: 'leaf', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
          ],
        },
        leaf: { id: 'leaf' },
      } as GameDefinition['prefabs'],
    });

    validateParentChildCycles(game, errors);

    expect(errors).toHaveLength(0);
  });

  it('detects direct cycle between two prefabs', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      prefabs: {
        a: {
          id: 'a',
          children: [
            { name: 'b-child', prefab: 'b', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
          ],
        },
        b: {
          id: 'b',
          children: [
            { name: 'a-child', prefab: 'a', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
          ],
        },
      } as GameDefinition['prefabs'],
    });

    validateParentChildCycles(game, errors);

    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some((e) => e.code === 'PARENT_CHILD_CYCLE')).toBe(true);
    const cycleError = errors.find((e) => e.code === 'PARENT_CHILD_CYCLE');
    expect(cycleError?.message).toContain('a');
    expect(cycleError?.message).toContain('b');
  });

  it('detects transitive cycle a -> b -> c -> a', () => {
    const errors: ValidationError[] = [];
    const game = makeGame({
      prefabs: {
        a: {
          id: 'a',
          children: [
            { name: 'b-child', prefab: 'b', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
          ],
        },
        b: {
          id: 'b',
          children: [
            { name: 'c-child', prefab: 'c', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
          ],
        },
        c: {
          id: 'c',
          children: [
            { name: 'a-child', prefab: 'a', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
          ],
        },
      } as GameDefinition['prefabs'],
    });

    validateParentChildCycles(game, errors);

    expect(errors.some((e) => e.code === 'PARENT_CHILD_CYCLE')).toBe(true);
  });
});

describe('validateConstantRefs', () => {
  it('passes when all constant refs resolve', () => {
    const errors: ValidationError[] = [];
    const game = {
      rules: [
        {
          id: 'r1',
          trigger: { type: 'tap' },
          actions: [
            { type: 'set_variable', name: 'score', operation: 'add', value: { const: 'POINTS' } },
          ],
        },
      ],
    } as unknown as Partial<GameDefinition>;

    validateConstantRefs(game, { POINTS: 10 }, errors);

    expect(errors).toHaveLength(0);
  });

  it('errors on dead constant reference', () => {
    const errors: ValidationError[] = [];
    const game = {
      rules: [
        {
          id: 'r1',
          trigger: { type: 'tap' },
          actions: [
            { type: 'set_variable', name: 'score', operation: 'add', value: { const: 'MISSING' } },
          ],
        },
      ],
    } as unknown as Partial<GameDefinition>;

    validateConstantRefs(game, { POINTS: 10 }, errors);

    expect(errors.some((e) => e.code === 'UNKNOWN_CONSTANT' && e.message.includes('MISSING'))).toBe(true);
  });

  it('passes when no constants defined and no refs used', () => {
    const errors: ValidationError[] = [];
    const game = makeGame();

    validateConstantRefs(game, undefined, errors);

    expect(errors).toHaveLength(0);
  });

  it('errors on nested constant reference', () => {
    const errors: ValidationError[] = [];
    const game = {
      prefabs: {
        ball: {
          id: 'ball',
          collider: { shape: 'circle', radius: { const: 'BALL_RADIUS' } },
        },
      },
    } as unknown as Partial<GameDefinition>;

    validateConstantRefs(game, { OTHER: 5 }, errors);

    expect(errors.some((e) => e.code === 'UNKNOWN_CONSTANT' && e.message.includes('BALL_RADIUS'))).toBe(true);
  });
});
