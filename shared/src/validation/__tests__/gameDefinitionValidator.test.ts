import { describe, it, expect } from 'vitest';
import { validateGameDefinition } from '../gameDefinitionValidator';
import type { GameDefinition } from '../../types/GameDefinition';

function createMinimalGame(overrides: Partial<GameDefinition> = {}): GameDefinition {
  return {
    metadata: { id: 'test-game', title: 'Test Game', version: '1.0.0' },
    world: { gravity: { x: 0, y: 10 }, pixelsPerMeter: 50 },
    templates: {},
    entities: [
      {
        id: 'player',
        name: 'Player',
        tags: ['player'],
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      },
    ],
    rules: [
      {
        id: 'tap-rule',
        trigger: { type: 'tap' },
        actions: [{ type: 'score', operation: 'add', value: 10 }],
      },
    ],
    winCondition: { expr: 'score >= 100' },
    loseCondition: { type: "custom", expr: "lives <= 0" },
    variables: { lives: 3 },
    ...overrides,
  } as GameDefinition;
}

describe('gameDefinitionValidator', () => {
  describe('expression-based win condition validation', () => {
    it('should warn when no win mechanism is present', () => {
      const game = createMinimalGame({
        winCondition: {},
        rules: [],
      });

      const result = validateGameDefinition(game);

      expect(result.warnings.some(w => w.code === 'NO_WIN_MECHANISM')).toBe(true);
    });

    it('should not warn when win condition has expr', () => {
      const game = createMinimalGame({
        winCondition: { expr: 'score >= 100' },
      });

      const result = validateGameDefinition(game);

      expect(result.warnings.some(w => w.code === 'NO_WIN_MECHANISM')).toBe(false);
    });

    it('should not warn when game has game_state win action', () => {
      const game = createMinimalGame({
        winCondition: {},
        rules: [
          {
            id: 'check-win',
            trigger: { type: 'event', eventName: 'check_win' },
            actions: [{ type: 'game_state', state: 'win' }],
          },
        ],
      });

      const result = validateGameDefinition(game);

      expect(result.warnings.some(w => w.code === 'NO_WIN_MECHANISM')).toBe(false);
    });

    it('should not warn when game has ball_sort_check_win action', () => {
      const game = createMinimalGame({
        winCondition: {},
        rules: [
          {
            id: 'check-win',
            trigger: { type: 'event', eventName: 'ball_dropped' },
            actions: [{ type: 'ball_sort_check_win' }],
          },
        ],
      });

      const result = validateGameDefinition(game);

      expect(result.warnings.some(w => w.code === 'NO_WIN_MECHANISM')).toBe(false);
    });
  });

  describe('custom lose condition validation', () => {
    it('should error when custom lose condition has no rule to trigger lose', () => {
      const game = createMinimalGame({
        loseCondition: { type: 'custom' },
      });

      const result = validateGameDefinition(game);

      expect(result.valid).toBe(false);
      const hasRelevantError = result.errors.some(
        (e) => e.code === 'CUSTOM_LOSE_NO_RULE' || e.code === 'SCHEMA_VALIDATION_ERROR'
      );
      expect(hasRelevantError).toBe(true);
    });

    it('should pass when custom lose condition has game_state lose action', () => {
      const game = createMinimalGame({
        loseCondition: { type: 'custom' },
        rules: [
          {
            id: 'tap-rule',
            trigger: { type: 'tap' },
            actions: [{ type: 'score', operation: 'add', value: 10 }],
          },
          {
            id: 'check-lose',
            trigger: { type: 'timer', time: 60 },
            actions: [{ type: 'game_state', state: 'lose' }],
          },
        ],
      });

      const result = validateGameDefinition(game);

      const customLoseError = result.errors.find(e => e.code === 'CUSTOM_LOSE_NO_RULE');
      expect(customLoseError).toBeUndefined();
    });
  });

  describe('expression-based win conditions', () => {
    it('should accept expression-based win conditions', () => {
      const game = createMinimalGame({
        winCondition: { expr: 'score >= 100' },
      });

      const result = validateGameDefinition(game);

      expect(result.warnings.some(w => w.code === 'NO_WIN_MECHANISM')).toBe(false);
    });

    it('should accept entity count expressions', () => {
      const game = createMinimalGame({
        winCondition: { expr: "entityCount('enemy') == 0" },
      });

      const result = validateGameDefinition(game);

      expect(result.warnings.some(w => w.code === 'NO_WIN_MECHANISM')).toBe(false);
    });
  });
});
