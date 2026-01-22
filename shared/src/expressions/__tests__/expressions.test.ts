import { describe, it, expect } from 'vitest';
import { tokenize } from '../tokenizer';
import { parse } from '../parser';
import { compile, evaluate, createDefaultContext } from '../evaluator';
import { validateExpression, validateAllExpressions } from '../validator';
import type { EvalContext } from '../types';

describe('Tokenizer', () => {
  it('tokenizes numbers', () => {
    const tokens = tokenize('42 3.14 -7');
    expect(tokens.filter((t) => t.type === 'NUMBER').map((t) => t.value)).toEqual([
      '42',
      '3.14',
      '7',
    ]);
  });

  it('tokenizes identifiers', () => {
    const tokens = tokenize('score time self');
    expect(tokens.filter((t) => t.type === 'IDENTIFIER').map((t) => t.value)).toEqual([
      'score',
      'time',
      'self',
    ]);
  });

  it('tokenizes operators', () => {
    const tokens = tokenize('+ - * / < <= > >= == != && ||');
    expect(tokens.filter((t) => t.type === 'OPERATOR').map((t) => t.value)).toEqual([
      '+',
      '-',
      '*',
      '/',
      '<',
      '<=',
      '>',
      '>=',
      '==',
      '!=',
      '&&',
      '||',
    ]);
  });

  it('tokenizes strings', () => {
    const tokens = tokenize('"hello" \'world\'');
    expect(tokens.filter((t) => t.type === 'STRING').map((t) => t.value)).toEqual([
      'hello',
      'world',
    ]);
  });

  it('tokenizes template strings', () => {
    const tokens = tokenize('`hello ${name}`');
    expect(tokens.map((t) => t.type)).toContain('TEMPLATE_START');
    expect(tokens.map((t) => t.type)).toContain('TEMPLATE_TEXT');
    expect(tokens.map((t) => t.type)).toContain('TEMPLATE_EXPR_START');
  });

  it('handles escaped characters in strings', () => {
    const tokens = tokenize('"hello\\nworld"');
    expect(tokens.find((t) => t.type === 'STRING')?.value).toBe('hello\nworld');
  });

  it('tokenizes complex expression', () => {
    const tokens = tokenize('score * 0.1 + baseSpeed');
    expect(tokens.filter((t) => t.type !== 'EOF').length).toBe(5);
  });
});

describe('Parser', () => {
  it('parses number literals', () => {
    const ast = parse('42');
    expect(ast.type).toBe('NumberLiteral');
    expect((ast as any).value).toBe(42);
  });

  it('parses boolean literals', () => {
    expect(parse('true').type).toBe('BooleanLiteral');
    expect(parse('false').type).toBe('BooleanLiteral');
  });

  it('parses string literals', () => {
    const ast = parse('"hello"');
    expect(ast.type).toBe('StringLiteral');
    expect((ast as any).value).toBe('hello');
  });

  it('parses identifiers', () => {
    const ast = parse('score');
    expect(ast.type).toBe('Identifier');
    expect((ast as any).name).toBe('score');
  });

  it('parses binary operations', () => {
    const ast = parse('1 + 2');
    expect(ast.type).toBe('BinaryOp');
    expect((ast as any).operator).toBe('+');
  });

  it('parses unary operations', () => {
    const ast = parse('-x');
    expect(ast.type).toBe('UnaryOp');
    expect((ast as any).operator).toBe('-');
  });

  it('parses ternary expressions', () => {
    const ast = parse('x > 0 ? 1 : 0');
    expect(ast.type).toBe('Ternary');
  });

  it('parses function calls', () => {
    const ast = parse('min(a, b)');
    expect(ast.type).toBe('FunctionCall');
    expect((ast as any).name).toBe('min');
    expect((ast as any).args.length).toBe(2);
  });

  it('parses member access', () => {
    const ast = parse('self.transform.x');
    expect(ast.type).toBe('MemberAccess');
  });

  it('parses vector literals', () => {
    const ast = parse('vec2(1, 2)');
    expect(ast.type).toBe('VectorLiteral');
  });

  it('parses template strings', () => {
    const ast = parse('`Score: ${score}`');
    expect(ast.type).toBe('TemplateString');
  });

  it('respects operator precedence', () => {
    const ast = parse('1 + 2 * 3');
    expect(ast.type).toBe('BinaryOp');
    expect((ast as any).operator).toBe('+');
    expect((ast as any).right.type).toBe('BinaryOp');
    expect((ast as any).right.operator).toBe('*');
  });

  it('respects parentheses', () => {
    const ast = parse('(1 + 2) * 3');
    expect(ast.type).toBe('BinaryOp');
    expect((ast as any).operator).toBe('*');
    expect((ast as any).left.type).toBe('BinaryOp');
    expect((ast as any).left.operator).toBe('+');
  });
});

describe('Evaluator', () => {
  const ctx = createDefaultContext({
    score: 100,
    lives: 3,
    time: 10,
    wave: 2,
    variables: {
      baseSpeed: 5,
      multiplier: 1.5,
    },
    self: {
      id: 'player',
      transform: { x: 10, y: 20, angle: 0.5 },
      velocity: { x: 1, y: -2 },
      health: 80,
      maxHealth: 100,
    },
  });

  describe('Arithmetic', () => {
    it('evaluates addition', () => {
      expect(evaluate('1 + 2', ctx)).toBe(3);
    });

    it('evaluates subtraction', () => {
      expect(evaluate('5 - 3', ctx)).toBe(2);
    });

    it('evaluates multiplication', () => {
      expect(evaluate('4 * 3', ctx)).toBe(12);
    });

    it('evaluates division', () => {
      expect(evaluate('10 / 2', ctx)).toBe(5);
    });

    it('evaluates modulo', () => {
      expect(evaluate('7 % 3', ctx)).toBe(1);
    });

    it('evaluates complex expression', () => {
      expect(evaluate('1 + 2 * 3', ctx)).toBe(7);
    });

    it('evaluates parenthesized expression', () => {
      expect(evaluate('(1 + 2) * 3', ctx)).toBe(9);
    });
  });

  describe('Comparisons', () => {
    it('evaluates less than', () => {
      expect(evaluate('1 < 2', ctx)).toBe(true);
      expect(evaluate('2 < 1', ctx)).toBe(false);
    });

    it('evaluates greater than', () => {
      expect(evaluate('2 > 1', ctx)).toBe(true);
      expect(evaluate('1 > 2', ctx)).toBe(false);
    });

    it('evaluates equality', () => {
      expect(evaluate('1 == 1', ctx)).toBe(true);
      expect(evaluate('1 == 2', ctx)).toBe(false);
    });

    it('evaluates inequality', () => {
      expect(evaluate('1 != 2', ctx)).toBe(true);
      expect(evaluate('1 != 1', ctx)).toBe(false);
    });
  });

  describe('Boolean Logic', () => {
    it('evaluates AND', () => {
      expect(evaluate('true && true', ctx)).toBe(true);
      expect(evaluate('true && false', ctx)).toBe(false);
    });

    it('evaluates OR', () => {
      expect(evaluate('true || false', ctx)).toBe(true);
      expect(evaluate('false || false', ctx)).toBe(false);
    });

    it('evaluates NOT', () => {
      expect(evaluate('!true', ctx)).toBe(false);
      expect(evaluate('!false', ctx)).toBe(true);
    });
  });

  describe('Ternary', () => {
    it('evaluates ternary true branch', () => {
      expect(evaluate('true ? 1 : 0', ctx)).toBe(1);
    });

    it('evaluates ternary false branch', () => {
      expect(evaluate('false ? 1 : 0', ctx)).toBe(0);
    });

    it('evaluates complex ternary', () => {
      expect(evaluate('score > 50 ? "high" : "low"', ctx)).toBe('high');
    });
  });

  describe('Variables and Context', () => {
    it('reads score', () => {
      expect(evaluate('score', ctx)).toBe(100);
    });

    it('reads lives', () => {
      expect(evaluate('lives', ctx)).toBe(3);
    });

    it('reads time', () => {
      expect(evaluate('time', ctx)).toBe(10);
    });

    it('reads wave', () => {
      expect(evaluate('wave', ctx)).toBe(2);
    });

    it('reads custom variables', () => {
      expect(evaluate('baseSpeed', ctx)).toBe(5);
      expect(evaluate('multiplier', ctx)).toBe(1.5);
    });

    it('reads self properties', () => {
      expect(evaluate('self.health', ctx)).toBe(80);
      expect(evaluate('self.maxHealth', ctx)).toBe(100);
    });

    it('reads nested self properties', () => {
      expect(evaluate('self.transform.x', ctx)).toBe(10);
      expect(evaluate('self.transform.y', ctx)).toBe(20);
      expect(evaluate('self.velocity.x', ctx)).toBe(1);
    });

    it('computes derived values', () => {
      expect(evaluate('baseSpeed * multiplier', ctx)).toBe(7.5);
      expect(evaluate('baseSpeed + score * 0.1', ctx)).toBe(15);
    });
  });

  describe('Vectors (GLSL-style)', () => {
    it('creates vector literal', () => {
      const result = evaluate('vec2(3, 4)', ctx);
      expect(result).toEqual({ x: 3, y: 4 });
    });

    it('accesses vector components with .x .y', () => {
      const ctxWithVec = { ...ctx, variables: { ...ctx.variables, pos: { x: 10, y: 20 } } };
      expect(evaluate('pos.x', ctxWithVec)).toBe(10);
      expect(evaluate('pos.y', ctxWithVec)).toBe(20);
    });

    it('accesses vector components with .r .g (GLSL alias)', () => {
      const ctxWithVec = { ...ctx, variables: { ...ctx.variables, color: { x: 255, y: 128 } } };
      expect(evaluate('color.r', ctxWithVec)).toBe(255);
      expect(evaluate('color.g', ctxWithVec)).toBe(128);
    });

    it('adds vectors', () => {
      const ctxWithVec = {
        ...ctx,
        variables: { ...ctx.variables, a: { x: 1, y: 2 }, b: { x: 3, y: 4 } },
      };
      expect(evaluate('a + b', ctxWithVec)).toEqual({ x: 4, y: 6 });
    });

    it('multiplies vector by scalar', () => {
      const ctxWithVec = { ...ctx, variables: { ...ctx.variables, v: { x: 2, y: 3 } } };
      expect(evaluate('v * 2', ctxWithVec)).toEqual({ x: 4, y: 6 });
    });

    it('computes vector length', () => {
      expect(evaluate('length(vec2(3, 4))', ctx)).toBe(5);
    });

    it('normalizes vector', () => {
      const result = evaluate('normalize(vec2(3, 4))', ctx) as { x: number; y: number };
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
    });

    it('computes dot product', () => {
      expect(evaluate('dot(vec2(1, 2), vec2(3, 4))', ctx)).toBe(11);
    });

    it('computes distance', () => {
      expect(evaluate('distance(vec2(0, 0), vec2(3, 4))', ctx)).toBe(5);
    });
  });

  describe('Built-in Functions', () => {
    it('min', () => {
      expect(evaluate('min(5, 3)', ctx)).toBe(3);
    });

    it('max', () => {
      expect(evaluate('max(5, 3)', ctx)).toBe(5);
    });

    it('clamp', () => {
      expect(evaluate('clamp(15, 0, 10)', ctx)).toBe(10);
      expect(evaluate('clamp(-5, 0, 10)', ctx)).toBe(0);
      expect(evaluate('clamp(5, 0, 10)', ctx)).toBe(5);
    });

    it('lerp', () => {
      expect(evaluate('lerp(0, 10, 0.5)', ctx)).toBe(5);
      expect(evaluate('lerp(0, 10, 0)', ctx)).toBe(0);
      expect(evaluate('lerp(0, 10, 1)', ctx)).toBe(10);
    });

    it('abs', () => {
      expect(evaluate('abs(-5)', ctx)).toBe(5);
      expect(evaluate('abs(5)', ctx)).toBe(5);
    });

    it('floor', () => {
      expect(evaluate('floor(3.7)', ctx)).toBe(3);
    });

    it('ceil', () => {
      expect(evaluate('ceil(3.2)', ctx)).toBe(4);
    });

    it('round', () => {
      expect(evaluate('round(3.5)', ctx)).toBe(4);
      expect(evaluate('round(3.4)', ctx)).toBe(3);
    });

    it('sqrt', () => {
      expect(evaluate('sqrt(16)', ctx)).toBe(4);
    });

    it('pow', () => {
      expect(evaluate('pow(2, 3)', ctx)).toBe(8);
    });

    it('sin', () => {
      expect(evaluate('sin(0)', ctx)).toBe(0);
    });

    it('cos', () => {
      expect(evaluate('cos(0)', ctx)).toBe(1);
    });

    it('sign', () => {
      expect(evaluate('sign(-5)', ctx)).toBe(-1);
      expect(evaluate('sign(5)', ctx)).toBe(1);
      expect(evaluate('sign(0)', ctx)).toBe(0);
    });

    it('smoothstep', () => {
      expect(evaluate('smoothstep(0, 1, 0)', ctx)).toBe(0);
      expect(evaluate('smoothstep(0, 1, 1)', ctx)).toBe(1);
      expect(evaluate('smoothstep(0, 1, 0.5)', ctx)).toBe(0.5);
    });

    it('step', () => {
      expect(evaluate('step(0.5, 0.3)', ctx)).toBe(0);
      expect(evaluate('step(0.5, 0.7)', ctx)).toBe(1);
    });

    it('fract', () => {
      expect(evaluate('fract(3.7)', ctx)).toBeCloseTo(0.7);
    });

    it('mod', () => {
      expect(evaluate('mod(7, 3)', ctx)).toBeCloseTo(1);
    });

    it('rand with no args', () => {
      const r1 = evaluate('rand()', ctx) as number;
      expect(r1).toBeGreaterThanOrEqual(0);
      expect(r1).toBeLessThan(1);
    });

    it('rand with range', () => {
      const r = evaluate('rand(10, 20)', ctx) as number;
      expect(r).toBeGreaterThanOrEqual(10);
      expect(r).toBeLessThan(20);
    });
  });

  describe('String Interpolation', () => {
    it('evaluates simple template', () => {
      expect(evaluate('`Score: ${score}`', ctx)).toBe('Score: 100');
    });

    it('evaluates template with expression', () => {
      expect(evaluate('`Level ${wave * 2}`', ctx)).toBe('Level 4');
    });

    it('evaluates template with multiple expressions', () => {
      expect(evaluate('`Lives: ${lives}, Score: ${score}`', ctx)).toBe(
        'Lives: 3, Score: 100'
      );
    });

    it('evaluates template with vector', () => {
      const result = evaluate('`Position: ${vec2(10, 20)}`', ctx);
      expect(result).toBe('Position: (10, 20)');
    });
  });

  describe('Compiled Expression', () => {
    it('compiles and evaluates', () => {
      const compiled = compile<number>('score * 2');
      expect(compiled.evaluate(ctx)).toBe(200);
    });

    it('tracks dependencies', () => {
      const compiled = compile('score + baseSpeed * multiplier');
      expect(compiled.dependencies).toContain('score');
      expect(compiled.dependencies).toContain('baseSpeed');
      expect(compiled.dependencies).toContain('multiplier');
    });

    it('evaluates multiple times with different context', () => {
      const compiled = compile<number>('score + 10');
      expect(compiled.evaluate(ctx)).toBe(110);
      expect(compiled.evaluate({ ...ctx, score: 50 })).toBe(60);
    });
  });
});

describe('Validator', () => {
  describe('Valid Expressions', () => {
    it('validates simple expressions', () => {
      expect(validateExpression('42').valid).toBe(true);
      expect(validateExpression('score + 10').valid).toBe(true);
      expect(validateExpression('min(a, b)', { knownVariables: ['a', 'b'] }).valid).toBe(true);
    });

    it('validates vector expressions', () => {
      expect(validateExpression('vec2(1, 2)').valid).toBe(true);
      expect(validateExpression('vec2(1, 2).x').valid).toBe(true);
    });

    it('validates self access', () => {
      expect(validateExpression('self.health').valid).toBe(true);
      expect(validateExpression('self.transform.x').valid).toBe(true);
    });

    it('validates ternary', () => {
      expect(validateExpression('score > 100 ? "high" : "low"').valid).toBe(true);
    });

    it('infers return types', () => {
      expect(validateExpression('42').returnType).toBe('number');
      expect(validateExpression('true').returnType).toBe('boolean');
      expect(validateExpression('"hello"').returnType).toBe('string');
      expect(validateExpression('vec2(1, 2)').returnType).toBe('vec2');
    });
  });

  describe('Invalid Expressions', () => {
    it('catches unknown identifiers', () => {
      const result = validateExpression('unknownVar');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Unknown identifier');
    });

    it('catches unknown functions', () => {
      const result = validateExpression('unknownFunc()');
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Unknown function');
    });

    it('catches syntax errors', () => {
      const result = validateExpression('1 + + 2');
      expect(result.valid).toBe(false);
    });

    it('catches unterminated strings', () => {
      const result = validateExpression('"hello');
      expect(result.valid).toBe(false);
    });

    it('catches unknown vector properties', () => {
      const result = validateExpression('vec2(1, 2).z');
      expect(result.valid).toBe(false);
    });
  });

  describe('Dependency Tracking', () => {
    it('tracks variable dependencies', () => {
      const result = validateExpression('score + lives * wave');
      expect(result.dependencies).toContain('score');
      expect(result.dependencies).toContain('lives');
      expect(result.dependencies).toContain('wave');
    });

    it('tracks self dependencies', () => {
      const result = validateExpression('self.health / self.maxHealth');
      expect(result.dependencies).toContain('self');
    });
  });

  describe('Batch Validation', () => {
    it('validates multiple expressions', () => {
      const result = validateAllExpressions([
        { source: 'score + 10', path: 'behaviors[0].speed' },
        { source: 'unknownVar', path: 'behaviors[1].speed' },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].context).toBe('behaviors[1].speed');
    });

    it('uses known variables', () => {
      const result = validateAllExpressions(
        [
          { source: 'baseSpeed * 2', path: 'test' },
          { source: 'difficultyMultiplier', path: 'test2' },
        ],
        ['baseSpeed', 'difficultyMultiplier']
      );
      expect(result.valid).toBe(true);
    });
  });
});

describe('Real-World Scenarios', () => {
  const gameCtx = createDefaultContext({
    score: 500,
    lives: 3,
    time: 60,
    wave: 3,
    variables: {
      baseSpeed: 5,
      baseDamage: 10,
      difficultyMultiplier: 1,
    },
    self: {
      id: 'player',
      transform: { x: 10, y: 5, angle: 0 },
      velocity: { x: 2, y: 0 },
      health: 80,
      maxHealth: 100,
    },
  });

  it('difficulty scaling: speed increases with score', () => {
    const speedFormula = compile<number>('baseSpeed + floor(score / 200) * 0.5');
    expect(speedFormula.evaluate(gameCtx)).toBe(6);

    const higherScore = { ...gameCtx, score: 1000 };
    expect(speedFormula.evaluate(higherScore)).toBe(7.5);
  });

  it('difficulty scaling: spawn rate decreases over time', () => {
    const spawnRate = compile<number>('max(0.5, 3 - time * 0.02)');
    expect(spawnRate.evaluate(gameCtx)).toBe(1.8);
  });

  it('damage calculation with multiplier', () => {
    const damage = compile<number>('baseDamage * (1 + wave * 0.2)');
    expect(damage.evaluate(gameCtx)).toBe(16);
  });

  it('health percentage', () => {
    const healthPct = compile<number>('self.health / self.maxHealth');
    expect(healthPct.evaluate(gameCtx)).toBe(0.8);
  });

  it('conditional behavior: enraged when low health', () => {
    const speedMultiplier = compile<number>(
      'self.health < self.maxHealth * 0.3 ? 2 : 1'
    );
    expect(speedMultiplier.evaluate(gameCtx)).toBe(1);

    const lowHealth = {
      ...gameCtx,
      self: { ...gameCtx.self!, health: 20 },
    };
    expect(speedMultiplier.evaluate(lowHealth)).toBe(2);
  });

  it('wave-based enemy health', () => {
    const enemyHealth = compile<number>('50 + wave * 25');
    expect(enemyHealth.evaluate(gameCtx)).toBe(125);
  });

  it('combo multiplier', () => {
    const comboCtx = {
      ...gameCtx,
      variables: { ...gameCtx.variables, comboCount: 5 },
    };
    const points = compile<number>('10 * (1 + comboCount * 0.1)');
    expect(points.evaluate(comboCtx)).toBe(15);
  });

  it('UI text with interpolation', () => {
    const scoreText = compile<string>('`Score: ${score} | Lives: ${lives}`');
    expect(scoreText.evaluate(gameCtx)).toBe('Score: 500 | Lives: 3');
  });

  it('vector-based distance check', () => {
    const targetCtx = {
      ...gameCtx,
      variables: { ...gameCtx.variables, targetPos: { x: 13, y: 9 } },
    };
    const dist = compile<number>('distance(vec2(self.transform.x, self.transform.y), targetPos)');
    expect(dist.evaluate(targetCtx)).toBe(5);
  });
});
