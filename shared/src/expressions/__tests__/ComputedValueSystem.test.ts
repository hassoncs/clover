import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComputedValueSystem, createComputedValueSystem } from '../ComputedValueSystem';
import { createDefaultContext } from '../evaluator';
import type { EvalContext } from '../types';

describe('ComputedValueSystem', () => {
  let system: ComputedValueSystem;
  let ctx: EvalContext;

  beforeEach(() => {
    system = createComputedValueSystem();
    ctx = createDefaultContext({
      score: 100,
      lives: 3,
      time: 10.5,
      wave: 2,
      frameId: 1,
      dt: 0.016,
      variables: {
        baseSpeed: 5,
        multiplier: 2,
        playerPos: { x: 10, y: 20 },
      },
    });
  });

  describe('resolveNumber', () => {
    it('returns literal numbers directly', () => {
      expect(system.resolveNumber(42, ctx)).toBe(42);
      expect(system.resolveNumber(0, ctx)).toBe(0);
      expect(system.resolveNumber(-10.5, ctx)).toBe(-10.5);
    });

    it('evaluates simple expressions', () => {
      expect(system.resolveNumber({ expr: '1 + 2' }, ctx)).toBe(3);
      expect(system.resolveNumber({ expr: '10 * 2' }, ctx)).toBe(20);
      expect(system.resolveNumber({ expr: '100 / 4' }, ctx)).toBe(25);
    });

    it('evaluates expressions with context variables', () => {
      expect(system.resolveNumber({ expr: 'score' }, ctx)).toBe(100);
      expect(system.resolveNumber({ expr: 'lives * 10' }, ctx)).toBe(30);
      expect(system.resolveNumber({ expr: 'time + wave' }, ctx)).toBe(12.5);
    });

    it('evaluates expressions with custom variables', () => {
      expect(system.resolveNumber({ expr: 'baseSpeed' }, ctx)).toBe(5);
      expect(system.resolveNumber({ expr: 'baseSpeed * multiplier' }, ctx)).toBe(10);
    });

    it('evaluates expressions with functions', () => {
      expect(system.resolveNumber({ expr: 'min(10, 5)' }, ctx)).toBe(5);
      expect(system.resolveNumber({ expr: 'max(score, 50)' }, ctx)).toBe(100);
      expect(system.resolveNumber({ expr: 'clamp(150, 0, 100)' }, ctx)).toBe(100);
      expect(system.resolveNumber({ expr: 'abs(-42)' }, ctx)).toBe(42);
    });

    it('evaluates ternary expressions', () => {
      expect(system.resolveNumber({ expr: 'score > 50 ? 100 : 0' }, ctx)).toBe(100);
      expect(system.resolveNumber({ expr: 'lives == 0 ? -1 : lives' }, ctx)).toBe(3);
    });

    it('handles complex nested expressions', () => {
      const expr = 'baseSpeed * (1 + wave * 0.1) * (score > 50 ? 1.5 : 1)';
      expect(system.resolveNumber({ expr }, ctx)).toBe(5 * (1 + 2 * 0.1) * 1.5);
    });

    it('returns 0 and warns for non-number results', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(system.resolveNumber({ expr: 'true' }, ctx)).toBe(0);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('uses debugName in warnings', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      system.resolveNumber({ expr: 'true', debugName: 'enemy.speed' }, ctx);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('enemy.speed'));
      warnSpy.mockRestore();
    });
  });

  describe('resolveVec2', () => {
    it('returns literal Vec2 directly', () => {
      expect(system.resolveVec2({ x: 10, y: 20 }, ctx)).toEqual({ x: 10, y: 20 });
      expect(system.resolveVec2({ x: 0, y: 0 }, ctx)).toEqual({ x: 0, y: 0 });
    });

    it('evaluates vec2 function expressions', () => {
      expect(system.resolveVec2({ expr: 'vec2(5, 10)' }, ctx)).toEqual({ x: 5, y: 10 });
      expect(system.resolveVec2({ expr: 'vec2(score, lives)' }, ctx)).toEqual({ x: 100, y: 3 });
    });

    it('evaluates vector arithmetic', () => {
      expect(system.resolveVec2({ expr: 'vec2(1, 2) + vec2(3, 4)' }, ctx)).toEqual({ x: 4, y: 6 });
      expect(system.resolveVec2({ expr: 'playerPos * 2' }, ctx)).toEqual({ x: 20, y: 40 });
    });

    it('evaluates vector functions', () => {
      const result = system.resolveVec2({ expr: 'normalize(vec2(3, 4))' }, ctx);
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
    });

    it('returns zero vec2 and warns for non-vec2 results', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(system.resolveVec2({ expr: '42' }, ctx)).toEqual({ x: 0, y: 0 });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('resolveBoolean', () => {
    it('returns literal booleans directly', () => {
      expect(system.resolveBoolean(true, ctx)).toBe(true);
      expect(system.resolveBoolean(false, ctx)).toBe(false);
    });

    it('evaluates boolean expressions', () => {
      expect(system.resolveBoolean({ expr: 'true' }, ctx)).toBe(true);
      expect(system.resolveBoolean({ expr: 'false' }, ctx)).toBe(false);
      expect(system.resolveBoolean({ expr: 'score > 50' }, ctx)).toBe(true);
      expect(system.resolveBoolean({ expr: 'lives == 0' }, ctx)).toBe(false);
    });

    it('evaluates complex boolean logic', () => {
      expect(system.resolveBoolean({ expr: 'score > 50 && lives > 0' }, ctx)).toBe(true);
      expect(system.resolveBoolean({ expr: 'score < 50 || lives > 0' }, ctx)).toBe(true);
      expect(system.resolveBoolean({ expr: '!(score < 50)' }, ctx)).toBe(true);
    });
  });

  describe('resolveString', () => {
    it('returns literal strings directly', () => {
      expect(system.resolveString('hello', ctx)).toBe('hello');
      expect(system.resolveString('', ctx)).toBe('');
    });

    it('evaluates string expressions', () => {
      expect(system.resolveString({ expr: '"hello"' }, ctx)).toBe('hello');
    });

    it('converts non-string results to string', () => {
      expect(system.resolveString({ expr: '42' }, ctx)).toBe('42');
      expect(system.resolveString({ expr: 'true' }, ctx)).toBe('true');
    });

    it('evaluates template strings', () => {
      expect(system.resolveString({ expr: '`Score: ${score}`' }, ctx)).toBe('Score: 100');
      expect(system.resolveString({ expr: '`Lives: ${lives}, Wave: ${wave}`' }, ctx)).toBe(
        'Lives: 3, Wave: 2'
      );
    });
  });

  describe('expression compilation caching', () => {
    it('caches compiled expressions', () => {
      const expr = { expr: 'score * 2' };

      system.resolveNumber(expr, ctx);
      const countAfterFirst = system.getCompiledCount();

      system.resolveNumber(expr, ctx);
      const countAfterSecond = system.getCompiledCount();

      expect(countAfterFirst).toBe(1);
      expect(countAfterSecond).toBe(1);
    });

    it('reuses cached compilations for same expression string', () => {
      system.resolveNumber({ expr: 'score + 1' }, ctx);
      system.resolveNumber({ expr: 'score + 1' }, ctx);
      system.resolveNumber({ expr: 'score + 2' }, ctx);

      expect(system.getCompiledCount()).toBe(2);
    });

    it('clears cache when requested', () => {
      system.resolveNumber({ expr: 'score' }, ctx);
      system.resolveNumber({ expr: 'lives' }, ctx);
      expect(system.getCompiledCount()).toBe(2);

      system.clearCache();
      expect(system.getCompiledCount()).toBe(0);
    });
  });

  describe('frame caching', () => {
    it('caches expression results within the same frame when cache=frame', () => {
      let evalCount = 0;
      const originalRandom = ctx.random;
      ctx.random = () => {
        evalCount++;
        return originalRandom();
      };

      const expr = { expr: 'rand()', cache: 'frame' as const };

      const result1 = system.resolveNumber(expr, ctx);
      const result2 = system.resolveNumber(expr, ctx);

      expect(result1).toBe(result2);
    });

    it('does not cache when cache=none (default)', () => {
      let evalCount = 0;
      const originalRandom = ctx.random;
      ctx.random = () => {
        evalCount++;
        return originalRandom();
      };

      const expr = { expr: 'rand()' };

      system.resolveNumber(expr, ctx);
      system.resolveNumber(expr, ctx);

      expect(evalCount).toBe(2);
    });

    it('clears frame cache when frameId changes', () => {
      const expr = { expr: 'rand()', cache: 'frame' as const };

      const result1 = system.resolveNumber(expr, ctx);

      ctx.frameId = 2;
      const result2 = system.resolveNumber(expr, ctx);

      expect(result1).not.toBe(result2);
    });

    it('maintains separate caches for different expressions', () => {
      const expr1 = { expr: 'rand()', cache: 'frame' as const };
      const expr2 = { expr: 'rand() * 2', cache: 'frame' as const };

      const r1a = system.resolveNumber(expr1, ctx);
      const r2a = system.resolveNumber(expr2, ctx);
      const r1b = system.resolveNumber(expr1, ctx);
      const r2b = system.resolveNumber(expr2, ctx);

      expect(r1a).toBe(r1b);
      expect(r2a).toBe(r2b);
      expect(r2a).not.toBe(r1a);
    });
  });

  describe('error handling', () => {
    it('throws on syntax errors', () => {
      expect(() => system.resolveNumber({ expr: '1 +' }, ctx)).toThrow();
      expect(() => system.resolveNumber({ expr: '((1 + 2)' }, ctx)).toThrow();
    });

    it('throws on unknown identifiers', () => {
      expect(() => system.resolveNumber({ expr: 'unknownVar' }, ctx)).toThrow();
    });

    it('throws on unknown functions', () => {
      expect(() => system.resolveNumber({ expr: 'unknownFunc()' }, ctx)).toThrow();
    });

    it('throws on division by zero', () => {
      expect(() => system.resolveNumber({ expr: '1 / 0' }, ctx)).toThrow();
    });
  });

  describe('game context integration', () => {
    it('supports self context when provided', () => {
      ctx.self = {
        id: 'enemy1',
        transform: { x: 50, y: 100, angle: 0.5 },
        velocity: { x: 10, y: -5 },
        health: 80,
        maxHealth: 100,
      };

      expect(system.resolveNumber({ expr: 'self.transform.x' }, ctx)).toBe(50);
      expect(system.resolveNumber({ expr: 'self.health' }, ctx)).toBe(80);
      expect(system.resolveNumber({ expr: 'self.health / self.maxHealth' }, ctx)).toBe(0.8);
    });

    it('throws when accessing self without context', () => {
      expect(() => system.resolveNumber({ expr: 'self.transform.x' }, ctx)).toThrow();
    });

    it('evaluates difficulty scaling expressions', () => {
      const difficultyExpr = { expr: 'baseSpeed * (1 + wave * 0.2)' };
      expect(system.resolveNumber(difficultyExpr, ctx)).toBe(5 * (1 + 2 * 0.2));

      ctx.wave = 5;
      expect(system.resolveNumber(difficultyExpr, ctx)).toBe(5 * (1 + 5 * 0.2));
    });

    it('evaluates health-based expressions', () => {
      ctx.self = {
        id: 'player',
        transform: { x: 0, y: 0, angle: 0 },
        health: 30,
        maxHealth: 100,
      };

      const damageMultiplier = { expr: '1 + (1 - self.health / self.maxHealth) * 0.5' };
      expect(system.resolveNumber(damageMultiplier, ctx)).toBeCloseTo(1.35);
    });

    it('evaluates distance-based expressions', () => {
      ctx.variables.targetPos = { x: 100, y: 100 };
      ctx.self = {
        id: 'enemy',
        transform: { x: 0, y: 0, angle: 0 },
      };

      const distExpr = {
        expr: 'distance(vec2(self.transform.x, self.transform.y), targetPos)',
      };
      expect(system.resolveNumber(distExpr, ctx)).toBeCloseTo(141.42, 1);
    });
  });

  describe('performance characteristics', () => {
    it('handles many evaluations efficiently', () => {
      const expr = { expr: 'score * wave + baseSpeed' };
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        system.resolveNumber(expr, ctx);
      }

      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(100);
    });

    it('compilation is only done once per unique expression', () => {
      const expressions = [
        { expr: 'score + 1' },
        { expr: 'score + 2' },
        { expr: 'score + 3' },
        { expr: 'score + 1' },
        { expr: 'score + 2' },
      ];

      for (const expr of expressions) {
        system.resolveNumber(expr, ctx);
      }

      expect(system.getCompiledCount()).toBe(3);
    });
  });
});

describe('Variable dependency evaluation', () => {
  let system: ComputedValueSystem;
  let ctx: EvalContext;

  beforeEach(() => {
    system = createComputedValueSystem();
    ctx = createDefaultContext();
  });

  it('evaluates variables that depend on other variables', () => {
    ctx.variables = {
      a: 10,
      b: 20,
    };

    expect(system.resolveNumber({ expr: 'a + b' }, ctx)).toBe(30);
  });

  it('evaluates chained variable dependencies', () => {
    ctx.variables = {
      base: 5,
      scaled: 10,
      final: 15,
    };

    expect(system.resolveNumber({ expr: 'base' }, ctx)).toBe(5);
    expect(system.resolveNumber({ expr: 'scaled' }, ctx)).toBe(10);
    expect(system.resolveNumber({ expr: 'final' }, ctx)).toBe(15);
    expect(system.resolveNumber({ expr: 'base + scaled + final' }, ctx)).toBe(30);
  });

  it('handles deeply nested variable references', () => {
    ctx.variables = {
      pos: { x: 10, y: 20 },
    };

    expect(system.resolveNumber({ expr: 'pos.x' }, ctx)).toBe(10);
    expect(system.resolveNumber({ expr: 'pos.y' }, ctx)).toBe(20);
    expect(system.resolveNumber({ expr: 'pos.x + pos.y' }, ctx)).toBe(30);
  });
});

describe('Recomputation and invalidation', () => {
  let system: ComputedValueSystem;
  let ctx: EvalContext;

  beforeEach(() => {
    system = createComputedValueSystem();
    ctx = createDefaultContext({
      score: 0,
      lives: 3,
      time: 0,
      wave: 1,
      frameId: 0,
      variables: {},
    });
  });

  it('recomputes when context values change', () => {
    const expr = { expr: 'score * 2' };

    ctx.score = 10;
    expect(system.resolveNumber(expr, ctx)).toBe(20);

    ctx.score = 50;
    expect(system.resolveNumber(expr, ctx)).toBe(100);

    ctx.score = 0;
    expect(system.resolveNumber(expr, ctx)).toBe(0);
  });

  it('recomputes when variables change', () => {
    const expr = { expr: 'multiplier * 10' };

    ctx.variables.multiplier = 1;
    expect(system.resolveNumber(expr, ctx)).toBe(10);

    ctx.variables.multiplier = 5;
    expect(system.resolveNumber(expr, ctx)).toBe(50);
  });

  it('handles rapidly changing context in game loop simulation', () => {
    const speedExpr = { expr: 'baseSpeed * (1 + time * 0.1)' };
    ctx.variables.baseSpeed = 10;

    const results: number[] = [];
    for (let frame = 0; frame < 100; frame++) {
      ctx.time = frame * 0.016;
      ctx.frameId = frame;
      results.push(system.resolveNumber(speedExpr, ctx));
    }

    expect(results[0]).toBeCloseTo(10);
    expect(results[50]).toBeCloseTo(10 * (1 + 50 * 0.016 * 0.1));
    expect(results[99]).toBeCloseTo(10 * (1 + 99 * 0.016 * 0.1));
  });

  it('frame cache does not interfere with context changes', () => {
    const expr = { expr: 'score + wave', cache: 'frame' as const };

    ctx.score = 10;
    ctx.wave = 1;
    ctx.frameId = 1;
    expect(system.resolveNumber(expr, ctx)).toBe(11);

    ctx.score = 20;
    ctx.wave = 2;
    ctx.frameId = 2;
    expect(system.resolveNumber(expr, ctx)).toBe(22);
  });

  it('correctly handles dt-based calculations', () => {
    const velocityExpr = { expr: 'position + velocity * dt' };
    ctx.variables.position = 0;
    ctx.variables.velocity = 100;
    ctx.dt = 0.016;

    const result = system.resolveNumber(velocityExpr, ctx);
    expect(result).toBeCloseTo(1.6);
  });

  it('handles wave-based difficulty scaling over time', () => {
    const difficultyExpr = { expr: 'clamp(1 + wave * 0.25, 1, 3)' };

    ctx.wave = 1;
    expect(system.resolveNumber(difficultyExpr, ctx)).toBe(1.25);

    ctx.wave = 4;
    expect(system.resolveNumber(difficultyExpr, ctx)).toBe(2);

    ctx.wave = 10;
    expect(system.resolveNumber(difficultyExpr, ctx)).toBe(3);
  });
});

describe('Deterministic random behavior', () => {
  let system: ComputedValueSystem;
  let ctx: EvalContext;

  beforeEach(() => {
    system = createComputedValueSystem();
  });

  it('produces deterministic results with same seed', () => {
    const ctx1 = createDefaultContext();
    const ctx2 = createDefaultContext();

    const expr = { expr: 'rand()' };

    const result1 = system.resolveNumber(expr, ctx1);
    system.clearCache();
    const result2 = system.resolveNumber(expr, ctx2);

    expect(result1).toBe(result2);
  });

  it('rand() with bounds works correctly', () => {
    ctx = createDefaultContext();
    const results: number[] = [];

    for (let i = 0; i < 100; i++) {
      ctx.frameId = i;
      results.push(system.resolveNumber({ expr: 'rand(10, 20)' }, ctx));
    }

    results.forEach((r) => {
      expect(r).toBeGreaterThanOrEqual(10);
      expect(r).toBeLessThanOrEqual(20);
    });
  });
});

describe('Complex game mechanics expressions', () => {
  let system: ComputedValueSystem;
  let ctx: EvalContext;

  beforeEach(() => {
    system = createComputedValueSystem();
    ctx = createDefaultContext();
  });

  it('calculates damage with critical hit chance', () => {
    ctx.variables.baseDamage = 50;
    ctx.variables.critMultiplier = 2.5;
    ctx.variables.isCrit = true;

    const damageExpr = { expr: 'baseDamage * (isCrit ? critMultiplier : 1)' };
    expect(system.resolveNumber(damageExpr, ctx)).toBe(125);

    ctx.variables.isCrit = false;
    expect(system.resolveNumber(damageExpr, ctx)).toBe(50);
  });

  it('calculates health regeneration based on time and level', () => {
    ctx.variables.level = 5;
    ctx.variables.baseRegen = 2;
    ctx.time = 10;

    const regenExpr = { expr: 'baseRegen * (1 + level * 0.1) * dt' };
    ctx.dt = 1;
    expect(system.resolveNumber(regenExpr, ctx)).toBeCloseTo(3);
  });

  it('calculates projectile spread pattern', () => {
    ctx.variables.bulletIndex = 0;
    ctx.variables.totalBullets = 5;
    ctx.variables.spreadAngle = Math.PI / 4;

    const angleExpr = {
      expr: 'spreadAngle * (bulletIndex / (totalBullets - 1) - 0.5)',
    };

    ctx.variables.bulletIndex = 0;
    expect(system.resolveNumber(angleExpr, ctx)).toBeCloseTo(-Math.PI / 8);

    ctx.variables.bulletIndex = 2;
    expect(system.resolveNumber(angleExpr, ctx)).toBe(0);

    ctx.variables.bulletIndex = 4;
    expect(system.resolveNumber(angleExpr, ctx)).toBeCloseTo(Math.PI / 8);
  });

  it('calculates enemy spawn rate that increases with wave', () => {
    const spawnIntervalExpr = { expr: 'max(0.5, 3 - wave * 0.3)' };

    ctx.wave = 1;
    expect(system.resolveNumber(spawnIntervalExpr, ctx)).toBe(2.7);

    ctx.wave = 5;
    expect(system.resolveNumber(spawnIntervalExpr, ctx)).toBe(1.5);

    ctx.wave = 10;
    expect(system.resolveNumber(spawnIntervalExpr, ctx)).toBe(0.5);
  });

  it('calculates score multiplier combo system', () => {
    ctx.variables.combo = 0;
    ctx.variables.maxCombo = 10;

    const multiplierExpr = { expr: '1 + smoothstep(0, maxCombo, combo)' };

    ctx.variables.combo = 0;
    expect(system.resolveNumber(multiplierExpr, ctx)).toBe(1);

    ctx.variables.combo = 5;
    expect(system.resolveNumber(multiplierExpr, ctx)).toBe(1.5);

    ctx.variables.combo = 10;
    expect(system.resolveNumber(multiplierExpr, ctx)).toBe(2);
  });

  it('calculates homing missile steering', () => {
    ctx.variables.missileX = 0;
    ctx.variables.missileY = 0;
    ctx.variables.missileAngle = 0;
    ctx.variables.targetPos = { x: 100, y: 100 };
    ctx.variables.turnRate = 2;

    const steerExpr = {
      expr: 'clamp(atan2(targetPos.y - missileY, targetPos.x - missileX) - missileAngle, -turnRate * dt, turnRate * dt)',
    };

    ctx.dt = 0.016;
    const steer = system.resolveNumber(steerExpr, ctx);
    expect(steer).toBeCloseTo(0.032);
  });
});

describe('Variable resolution behavior', () => {
  let system: ComputedValueSystem;
  let ctx: EvalContext;

  beforeEach(() => {
    system = createComputedValueSystem();
    ctx = createDefaultContext();
  });

  it('expects variables to be pre-resolved values, not expressions', () => {
    ctx.variables = {
      speed: 10,
      damage: 25,
    };

    expect(system.resolveNumber({ expr: 'speed + damage' }, ctx)).toBe(35);
  });

  it('expression objects in variables are NOT auto-evaluated', () => {
    (ctx.variables as Record<string, unknown>).computed = { expr: 'score + 1' };

    expect(() => system.resolveNumber({ expr: 'computed + 1' }, ctx)).toThrow();
  });

  it('variables can be any primitive type', () => {
    ctx.variables = {
      num: 42,
      bool: true,
      str: 'hello',
      vec: { x: 10, y: 20 },
    };

    expect(system.resolveNumber({ expr: 'num' }, ctx)).toBe(42);
    expect(system.resolveBoolean({ expr: 'bool' }, ctx)).toBe(true);
    expect(system.resolveString({ expr: 'str' }, ctx)).toBe('hello');
    expect(system.resolveVec2({ expr: 'vec' }, ctx)).toEqual({ x: 10, y: 20 });
  });

  it('globals take precedence over variables with same name', () => {
    ctx.score = 100;
    ctx.variables = {
      score: 999,
    };

    expect(system.resolveNumber({ expr: 'score' }, ctx)).toBe(100);
  });

  it('custom variables can use names not reserved by globals', () => {
    ctx.variables = {
      myScore: 999,
      playerHealth: 80,
    };

    expect(system.resolveNumber({ expr: 'myScore' }, ctx)).toBe(999);
    expect(system.resolveNumber({ expr: 'playerHealth' }, ctx)).toBe(80);
  });

  it('falls back to globals when variable not defined', () => {
    ctx.score = 100;
    ctx.variables = {};

    expect(system.resolveNumber({ expr: 'score' }, ctx)).toBe(100);
  });
});

describe('Edge cases and boundary conditions', () => {
  let system: ComputedValueSystem;
  let ctx: EvalContext;

  beforeEach(() => {
    system = createComputedValueSystem();
    ctx = createDefaultContext();
  });

  it('handles very large numbers', () => {
    expect(system.resolveNumber({ expr: '1e10 + 1e10' }, ctx)).toBe(2e10);
  });

  it('handles very small numbers', () => {
    expect(system.resolveNumber({ expr: '1e-10 + 1e-10' }, ctx)).toBeCloseTo(2e-10);
  });

  it('handles negative numbers', () => {
    expect(system.resolveNumber({ expr: '-42' }, ctx)).toBe(-42);
    expect(system.resolveNumber({ expr: '-(-42)' }, ctx)).toBe(42);
  });

  it('handles zero correctly', () => {
    expect(system.resolveNumber({ expr: '0' }, ctx)).toBe(0);
    expect(system.resolveNumber({ expr: '0 * 100' }, ctx)).toBe(0);
    expect(system.resolveNumber({ expr: '100 * 0' }, ctx)).toBe(0);
  });

  it('handles floating point precision', () => {
    expect(system.resolveNumber({ expr: '0.1 + 0.2' }, ctx)).toBeCloseTo(0.3);
  });

  it('handles empty/whitespace expressions by throwing', () => {
    expect(() => system.resolveNumber({ expr: '' }, ctx)).toThrow();
    expect(() => system.resolveNumber({ expr: '   ' }, ctx)).toThrow();
  });

  it('handles expressions with many parentheses', () => {
    expect(system.resolveNumber({ expr: '(((1 + 2)))' }, ctx)).toBe(3);
    expect(system.resolveNumber({ expr: '((1 + 2) * (3 + 4))' }, ctx)).toBe(21);
  });

  it('handles PI and E constants', () => {
    expect(system.resolveNumber({ expr: 'PI' }, ctx)).toBeCloseTo(Math.PI);
    expect(system.resolveNumber({ expr: 'E' }, ctx)).toBeCloseTo(Math.E);
  });

  it('handles sin/cos at boundary values', () => {
    expect(system.resolveNumber({ expr: 'sin(0)' }, ctx)).toBe(0);
    expect(system.resolveNumber({ expr: 'cos(0)' }, ctx)).toBe(1);
    expect(system.resolveNumber({ expr: 'sin(PI / 2)' }, ctx)).toBeCloseTo(1);
  });
});
