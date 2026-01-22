import { describe, it, expect, beforeEach } from 'vitest';
import {
  EvalContextBuilder,
  buildEvalContext,
  CyclicDependencyError,
  UnknownVariableError,
  type GameState,
} from '../EvalContextBuilder';
import { ComputedValueSystem } from '../ComputedValueSystem';

describe('EvalContextBuilder', () => {
  let builder: EvalContextBuilder;
  const defaultGameState: GameState = {
    score: 0,
    lives: 3,
    time: 0,
    wave: 1,
    frameId: 0,
    dt: 0.016,
  };

  beforeEach(() => {
    builder = EvalContextBuilder.create();
  });

  describe('basic variable resolution', () => {
    it('resolves literal variables directly', () => {
      const ctx = builder.build({
        gameState: defaultGameState,
        variables: {
          speed: 10,
          damage: 25,
          isActive: true,
        },
      });

      expect(ctx.variables.speed).toBe(10);
      expect(ctx.variables.damage).toBe(25);
      expect(ctx.variables.isActive).toBe(true);
    });

    it('resolves expression variables', () => {
      const ctx = builder.build({
        gameState: { ...defaultGameState, score: 100, wave: 3 },
        variables: {
          scoreBonus: { expr: 'score * 0.1' },
          waveDifficulty: { expr: '1 + wave * 0.2' },
        },
      });

      expect(ctx.variables.scoreBonus).toBe(10);
      expect(ctx.variables.waveDifficulty).toBeCloseTo(1.6);
    });

    it('resolves vec2 variables', () => {
      const ctx = builder.build({
        gameState: defaultGameState,
        variables: {
          position: { x: 10, y: 20 },
          velocity: { expr: 'vec2(5, -3)' },
        },
      });

      expect(ctx.variables.position).toEqual({ x: 10, y: 20 });
      expect(ctx.variables.velocity).toEqual({ x: 5, y: -3 });
    });
  });

  describe('variable dependencies', () => {
    it('resolves variables in dependency order', () => {
      const ctx = builder.build({
        gameState: defaultGameState,
        variables: {
          a: 10,
          b: { expr: 'a * 2' },
          c: { expr: 'b + 5' },
        },
      });

      expect(ctx.variables.a).toBe(10);
      expect(ctx.variables.b).toBe(20);
      expect(ctx.variables.c).toBe(25);
    });

    it('handles complex dependency chains', () => {
      const ctx = builder.build({
        gameState: defaultGameState,
        variables: {
          base: 5,
          multiplier: 2,
          scaled: { expr: 'base * multiplier' },
          bonus: { expr: 'scaled * 0.5' },
          final: { expr: 'scaled + bonus' },
        },
      });

      expect(ctx.variables.base).toBe(5);
      expect(ctx.variables.multiplier).toBe(2);
      expect(ctx.variables.scaled).toBe(10);
      expect(ctx.variables.bonus).toBe(5);
      expect(ctx.variables.final).toBe(15);
    });

    it('handles diamond dependencies (A -> B, A -> C, B -> D, C -> D)', () => {
      const ctx = builder.build({
        gameState: defaultGameState,
        variables: {
          a: 1,
          b: { expr: 'a + 1' },
          c: { expr: 'a + 2' },
          d: { expr: 'b + c' },
        },
      });

      expect(ctx.variables.a).toBe(1);
      expect(ctx.variables.b).toBe(2);
      expect(ctx.variables.c).toBe(3);
      expect(ctx.variables.d).toBe(5);
    });

    it('variables can reference game state', () => {
      const ctx = builder.build({
        gameState: { ...defaultGameState, score: 500, wave: 5 },
        variables: {
          scoreMultiplier: { expr: '1 + score / 1000' },
          waveBonus: { expr: 'wave * 10' },
        },
      });

      expect(ctx.variables.scoreMultiplier).toBe(1.5);
      expect(ctx.variables.waveBonus).toBe(50);
    });
  });

  describe('cycle detection', () => {
    it('detects simple direct cycles (A -> A)', () => {
      expect(() =>
        builder.build({
          gameState: defaultGameState,
          variables: {
            a: { expr: 'a + 1' },
          },
        })
      ).toThrow(CyclicDependencyError);
    });

    it('detects two-node cycles (A -> B -> A)', () => {
      expect(() =>
        builder.build({
          gameState: defaultGameState,
          variables: {
            a: { expr: 'b + 1' },
            b: { expr: 'a + 1' },
          },
        })
      ).toThrow(CyclicDependencyError);
    });

    it('detects longer cycles (A -> B -> C -> A)', () => {
      expect(() =>
        builder.build({
          gameState: defaultGameState,
          variables: {
            a: { expr: 'b + 1' },
            b: { expr: 'c + 1' },
            c: { expr: 'a + 1' },
          },
        })
      ).toThrow(CyclicDependencyError);
    });

    it('provides cycle path in error message', () => {
      try {
        builder.build({
          gameState: defaultGameState,
          variables: {
            x: { expr: 'y * 2' },
            y: { expr: 'z + 1' },
            z: { expr: 'x - 1' },
          },
        });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(CyclicDependencyError);
        const error = e as CyclicDependencyError;
        expect(error.cycle).toContain('x');
        expect(error.cycle).toContain('y');
        expect(error.cycle).toContain('z');
      }
    });

    it('does not falsely detect cycles in valid diamond pattern', () => {
      expect(() =>
        builder.build({
          gameState: defaultGameState,
          variables: {
            root: 1,
            left: { expr: 'root + 1' },
            right: { expr: 'root + 2' },
            merged: { expr: 'left + right' },
          },
        })
      ).not.toThrow();
    });
  });

  describe('unknown variable detection', () => {
    it('throws on reference to undefined variable', () => {
      expect(() =>
        builder.build({
          gameState: defaultGameState,
          variables: {
            result: { expr: 'unknownVar + 1' },
          },
        })
      ).toThrow(UnknownVariableError);
    });

    it('provides helpful error message for unknown variables', () => {
      try {
        builder.build({
          gameState: defaultGameState,
          variables: {
            calc: { expr: 'missingValue * 2' },
          },
        });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(UnknownVariableError);
        const error = e as UnknownVariableError;
        expect(error.variableName).toBe('missingValue');
        expect(error.referencedIn).toBe('calc');
      }
    });

    it('allows references to game state variables', () => {
      expect(() =>
        builder.build({
          gameState: defaultGameState,
          variables: {
            calc: { expr: 'score + lives + time + wave + dt + frameId' },
          },
        })
      ).not.toThrow();
    });

    it('allows references to constants', () => {
      expect(() =>
        builder.build({
          gameState: defaultGameState,
          variables: {
            calc: { expr: 'PI * 2' },
            euler: { expr: 'E' },
          },
        })
      ).not.toThrow();
    });
  });

  describe('integration with ComputedValueSystem', () => {
    it('built context works with ComputedValueSystem', () => {
      const ctx = builder.build({
        gameState: { ...defaultGameState, wave: 3 },
        variables: {
          baseSpeed: 5,
          speedMultiplier: { expr: '1 + wave * 0.1' },
        },
      });

      const system = new ComputedValueSystem();
      const finalSpeed = system.resolveNumber(
        { expr: 'baseSpeed * speedMultiplier' },
        ctx
      );

      expect(finalSpeed).toBe(5 * 1.3);
    });

    it('handles real game difficulty scaling scenario', () => {
      const ctx = builder.build({
        gameState: { ...defaultGameState, wave: 5, score: 1000 },
        variables: {
          baseDamage: 10,
          baseSpeed: 100,
          waveMultiplier: { expr: '1 + wave * 0.15' },
          scoreBonus: { expr: 'floor(score / 500) * 0.1' },
          enemyDamage: { expr: 'baseDamage * waveMultiplier' },
          enemySpeed: { expr: 'baseSpeed * (waveMultiplier + scoreBonus)' },
        },
      });

      expect(ctx.variables.waveMultiplier).toBeCloseTo(1.75);
      expect(ctx.variables.scoreBonus).toBe(0.2);
      expect(ctx.variables.enemyDamage).toBe(17.5);
      expect(ctx.variables.enemySpeed).toBeCloseTo(195);
    });
  });

  describe('deterministic behavior', () => {
    it('produces same results with same seed', () => {
      const ctx1 = builder.build({
        gameState: defaultGameState,
        variables: {
          randomVal: { expr: 'rand()' },
        },
        seed: 42,
      });

      const ctx2 = builder.build({
        gameState: defaultGameState,
        variables: {
          randomVal: { expr: 'rand()' },
        },
        seed: 42,
      });

      expect(ctx1.variables.randomVal).toBe(ctx2.variables.randomVal);
    });

    it('produces different results with different seeds', () => {
      const ctx1 = builder.build({
        gameState: defaultGameState,
        variables: {
          randomVal: { expr: 'rand()' },
        },
        seed: 42,
      });

      const ctx2 = builder.build({
        gameState: defaultGameState,
        variables: {
          randomVal: { expr: 'rand()' },
        },
        seed: 123,
      });

      expect(ctx1.variables.randomVal).not.toBe(ctx2.variables.randomVal);
    });
  });

  describe('self context', () => {
    it('passes self context through to expressions', () => {
      const ctx = builder.build({
        gameState: defaultGameState,
        variables: {
          healthPercent: { expr: 'self.health / self.maxHealth' },
        },
        self: {
          id: 'player',
          transform: { x: 0, y: 0, angle: 0 },
          health: 75,
          maxHealth: 100,
        },
      });

      expect(ctx.variables.healthPercent).toBe(0.75);
    });
  });
});

describe('buildEvalContext helper', () => {
  it('provides a simpler API for building contexts', () => {
    const ctx = buildEvalContext({
      gameState: {
        score: 100,
        lives: 3,
        time: 10,
        wave: 2,
        frameId: 0,
        dt: 0.016,
      },
      variables: {
        speed: { expr: 'wave * 10' },
      },
    });

    expect(ctx.variables.speed).toBe(20);
  });
});
