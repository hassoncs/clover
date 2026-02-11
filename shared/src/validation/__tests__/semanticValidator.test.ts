import { describe, it, expect } from 'vitest';
import type { GameDefinition } from '../../types/GameDefinition';
import type { Value } from '../../expressions/types';
import { validateGameDefinition } from '../gameDefinitionValidator';

function createValidGame(overrides: Partial<GameDefinition> = {}): GameDefinition {
  return {
    metadata: { id: 'test-game', title: 'Test Game', version: '1.0.0' },
    world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
    templates: {},
    entities: [
      {
        id: 'player',
        name: 'Player',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        tags: ['player'],
      },
    ],
    rules: [
      {
        id: 'tap-rule',
        trigger: { type: 'tap' },
        actions: [{ type: 'game_state', state: 'win' }],
      },
    ],
    winCondition: { expr: 'score >= 1' },
    loseCondition: { type: 'time_up', time: 30 },
    ...overrides,
  } as GameDefinition;
}

describe('semantic validation', () => {
  it('errors on template child cycles', () => {
    const game = createValidGame({
      templates: {
        parent: {
          id: 'parent',
          children: [
            {
              name: 'child',
              template: 'child',
              localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            },
          ],
        },
        child: {
          id: 'child',
          children: [
            {
              name: 'parent',
              template: 'parent',
              localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            },
          ],
        },
      },
      entities: [
        {
          id: 'parent-entity',
          name: 'Parent',
          template: 'parent',
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        },
      ],
    });

    const result = validateGameDefinition(game);

    expect(result.errors.some((error) => error.code === 'TEMPLATE_CYCLE')).toBe(true);
  });

  it('errors on unresolved constant references', () => {
    const badValue = { const: 'MISSING_CONSTANT' } as unknown as Value<number>;
    const game = createValidGame({
      constants: { KNOWN: 10 },
      rules: [
        {
          id: 'set-var',
          trigger: { type: 'tap' },
          actions: [
            { type: 'set_variable', name: 'score', operation: 'add', value: badValue },
          ],
        },
      ],
    });

    const result = validateGameDefinition(game);

    // The Zod schema may reject the { const: ... } value structurally,
    // or the semantic validator catches it as UNKNOWN_CONSTANT.
    // Either way, validation should fail.
    expect(result.valid).toBe(false);
    const hasConstError = result.errors.some(
      (e) => e.code === 'UNKNOWN_CONSTANT' || e.code === 'SCHEMA_VALIDATION_ERROR'
    );
    expect(hasConstError).toBe(true);
  });
});
