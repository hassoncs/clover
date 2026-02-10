import { describe, it, expect, vi } from 'vitest';
import {
  formatTime,
  formatNumber,
  percent,
  buildBindingContext,
  evaluateExpression,
  evaluateCondition,
  evaluateTemplate,
  resolveBinding,
  type BindingContext,
} from '../BindingEvaluator';

function makeContext(overrides?: {
  variables?: Record<string, number | string | boolean>;
  state?: string;
  time?: number;
  entityCounts?: Record<string, number>;
}): BindingContext {
  const entityCounts = overrides?.entityCounts ?? {};
  const gameState = {
    time: overrides?.time ?? 83,
    state: overrides?.state ?? 'playing',
    variables: overrides?.variables ?? { score: 42, lives: 3, health: 75, maxHealth: 100 },
  };
  return buildBindingContext(gameState, (tag) => entityCounts[tag] ?? 0);
}

describe('BindingEvaluator', () => {
  describe('formatTime', () => {
    it('formats zero seconds', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('formats seconds into M:SS', () => {
      expect(formatTime(83)).toBe('1:23');
    });

    it('formats large values', () => {
      expect(formatTime(3661)).toBe('61:01');
    });

    it('floors fractional seconds', () => {
      expect(formatTime(5.9)).toBe('0:05');
    });
  });

  describe('formatNumber', () => {
    it('adds thousands separators', () => {
      expect(formatNumber(1234)).toBe('1,234');
    });

    it('formats zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('formats large numbers', () => {
      expect(formatNumber(1000000)).toBe('1,000,000');
    });
  });

  describe('percent', () => {
    it('calculates percentage', () => {
      expect(percent(3, 4)).toBe('75%');
    });

    it('handles zero max', () => {
      expect(percent(0, 0)).toBe('0%');
    });

    it('rounds to nearest integer', () => {
      expect(percent(1, 3)).toBe('33%');
    });

    it('handles full value', () => {
      expect(percent(4, 4)).toBe('100%');
    });
  });

  describe('buildBindingContext', () => {
    it('maps gameState fields to context', () => {
      const ctx = makeContext({ time: 10, state: 'playing', variables: { score: 99, lives: 2 } });
      expect(ctx.elapsed).toBe(10);
      expect(ctx.state).toBe('playing');
      expect(ctx.score).toBe(99);
      expect(ctx.lives).toBe(2);
    });

    it('defaults score and lives to 0 when missing', () => {
      const ctx = makeContext({ variables: {} });
      expect(ctx.score).toBe(0);
      expect(ctx.lives).toBe(0);
    });

    it('provides entityCount function', () => {
      const ctx = makeContext({ entityCounts: { brick: 7, ball: 1 } });
      expect(ctx.entityCount('brick')).toBe(7);
      expect(ctx.entityCount('ball')).toBe(1);
      expect(ctx.entityCount('nonexistent')).toBe(0);
    });

    it('includes formatter functions', () => {
      const ctx = makeContext();
      expect(ctx.formatTime).toBe(formatTime);
      expect(ctx.formatNumber).toBe(formatNumber);
      expect(ctx.percent).toBe(percent);
    });
  });

  describe('evaluateExpression', () => {
    it('evaluates variable access', () => {
      const ctx = makeContext();
      expect(evaluateExpression('variables.score', ctx)).toBe(42);
    });

    it('evaluates shorthand score', () => {
      const ctx = makeContext();
      expect(evaluateExpression('score', ctx)).toBe(42);
    });

    it('evaluates comparison', () => {
      const ctx = makeContext({ variables: { health: 15, maxHealth: 100 } });
      expect(evaluateExpression('variables.health < 20', ctx)).toBe(true);
    });

    it('evaluates arithmetic', () => {
      const ctx = makeContext({ variables: { score: 21 } });
      expect(evaluateExpression('variables.score * 2', ctx)).toBe(42);
    });

    it('returns undefined for malformed expressions', () => {
      const ctx = makeContext();
      expect(evaluateExpression('{{invalid}}', ctx)).toBeUndefined();
    });

    it('returns undefined for undefined variables', () => {
      const ctx = makeContext({ variables: {} });
      expect(evaluateExpression('variables.nonexistent', ctx)).toBeUndefined();
    });
  });

  describe('evaluateCondition', () => {
    it('returns true for truthy condition', () => {
      const ctx = makeContext({ variables: { lives: 3 } });
      expect(evaluateCondition('variables.lives > 0', ctx)).toBe(true);
    });

    it('returns false for falsy condition', () => {
      const ctx = makeContext({ variables: { lives: 0 } });
      expect(evaluateCondition('variables.lives > 0', ctx)).toBe(false);
    });

    it('handles boolean logic', () => {
      const ctx = makeContext({ variables: { health: 15, lives: 2 } });
      expect(evaluateCondition('variables.health < 20 and variables.lives > 0', ctx)).toBe(true);
    });

    it('handles negation', () => {
      const ctx = makeContext({ variables: { gameOver: 0 } });
      expect(evaluateCondition('not variables.gameOver', ctx)).toBe(true);
    });

    it('handles parenthesized expressions', () => {
      const ctx = makeContext({ variables: { score: 150, level: 3 } });
      expect(evaluateCondition('(variables.score > 100) or (variables.level > 5)', ctx)).toBe(true);
    });

    it('returns false for malformed expressions', () => {
      const ctx = makeContext();
      expect(evaluateCondition('{{broken}}', ctx)).toBe(false);
    });
  });

  describe('evaluateTemplate', () => {
    it('interpolates variable access', () => {
      const ctx = makeContext();
      expect(evaluateTemplate('Score: {{variables.score}}', ctx)).toBe('Score: 42');
    });

    it('interpolates multiple expressions', () => {
      const ctx = makeContext({ variables: { hp: 75, maxHp: 100 } });
      expect(evaluateTemplate('HP: {{variables.hp}}/{{variables.maxHp}}', ctx)).toBe('HP: 75/100');
    });

    it('interpolates entityCount calls', () => {
      const ctx = makeContext({ entityCounts: { brick: 7 } });
      expect(evaluateTemplate("{{entityCount('brick')}} left", ctx)).toBe('7 left');
    });

    it('interpolates formatTime', () => {
      const ctx = makeContext({ time: 83 });
      expect(evaluateTemplate('{{formatTime(elapsed)}}', ctx)).toBe('1:23');
    });

    it('interpolates formatNumber', () => {
      const ctx = makeContext({ variables: { score: 12345 } });
      expect(evaluateTemplate('{{formatNumber(variables.score)}}', ctx)).toBe('12,345');
    });

    it('passes through literal text', () => {
      const ctx = makeContext();
      expect(evaluateTemplate('Hello World', ctx)).toBe('Hello World');
    });

    it('returns ?? for malformed expressions', () => {
      const ctx = makeContext();
      expect(evaluateTemplate('Value: {{@#$}}', ctx)).toBe('Value: ??');
    });
  });

  describe('resolveBinding', () => {
    it('uses template interpolation for text key', () => {
      const ctx = makeContext();
      expect(resolveBinding('text', 'Score: {{variables.score}}', ctx)).toBe('Score: 42');
    });

    it('uses direct expression for value key', () => {
      const ctx = makeContext({ variables: { health: 75 } });
      expect(resolveBinding('value', 'variables.health', ctx)).toBe(75);
    });

    it('uses direct expression for max key', () => {
      const ctx = makeContext({ variables: { maxHealth: 100 } });
      expect(resolveBinding('max', 'variables.maxHealth', ctx)).toBe(100);
    });

    it('uses direct expression for spread key', () => {
      const ctx = makeContext({ variables: { recoil: 5 } });
      expect(resolveBinding('spread', 'variables.recoil * 10', ctx)).toBe(50);
    });
  });
});
