import type {
  ASTNode,
  EvalContext,
  ExpressionValueType,
  Vec2,
  CompiledExpression,
} from './types';
import { parse } from './parser';

type BuiltinFunction = (args: ExpressionValueType[], ctx: EvalContext) => ExpressionValueType;

const BUILTIN_FUNCTIONS: Record<string, BuiltinFunction> = {
  min: (args) => {
    assertArgCount('min', args, 2);
    const [a, b] = args;
    if (isVec2(a) && isVec2(b)) {
      return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) };
    }
    return Math.min(asNumber(a), asNumber(b));
  },

  max: (args) => {
    assertArgCount('max', args, 2);
    const [a, b] = args;
    if (isVec2(a) && isVec2(b)) {
      return { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) };
    }
    return Math.max(asNumber(a), asNumber(b));
  },

  clamp: (args) => {
    assertArgCount('clamp', args, 3);
    const [val, min, max] = args;
    if (isVec2(val)) {
      const minV = isVec2(min) ? min : { x: asNumber(min), y: asNumber(min) };
      const maxV = isVec2(max) ? max : { x: asNumber(max), y: asNumber(max) };
      return {
        x: Math.max(minV.x, Math.min(maxV.x, val.x)),
        y: Math.max(minV.y, Math.min(maxV.y, val.y)),
      };
    }
    return Math.max(asNumber(min), Math.min(asNumber(max), asNumber(val)));
  },

  lerp: (args) => {
    assertArgCount('lerp', args, 3);
    const [a, b, t] = args;
    const tNum = asNumber(t);
    if (isVec2(a) && isVec2(b)) {
      return {
        x: a.x + (b.x - a.x) * tNum,
        y: a.y + (b.y - a.y) * tNum,
      };
    }
    const aNum = asNumber(a);
    const bNum = asNumber(b);
    return aNum + (bNum - aNum) * tNum;
  },

  abs: (args) => {
    assertArgCount('abs', args, 1);
    const [a] = args;
    if (isVec2(a)) {
      return { x: Math.abs(a.x), y: Math.abs(a.y) };
    }
    return Math.abs(asNumber(a));
  },

  floor: (args) => {
    assertArgCount('floor', args, 1);
    const [a] = args;
    if (isVec2(a)) {
      return { x: Math.floor(a.x), y: Math.floor(a.y) };
    }
    return Math.floor(asNumber(a));
  },

  ceil: (args) => {
    assertArgCount('ceil', args, 1);
    const [a] = args;
    if (isVec2(a)) {
      return { x: Math.ceil(a.x), y: Math.ceil(a.y) };
    }
    return Math.ceil(asNumber(a));
  },

  round: (args) => {
    assertArgCount('round', args, 1);
    const [a] = args;
    if (isVec2(a)) {
      return { x: Math.round(a.x), y: Math.round(a.y) };
    }
    return Math.round(asNumber(a));
  },

  sqrt: (args) => {
    assertArgCount('sqrt', args, 1);
    return Math.sqrt(asNumber(args[0]));
  },

  pow: (args) => {
    assertArgCount('pow', args, 2);
    return Math.pow(asNumber(args[0]), asNumber(args[1]));
  },

  sin: (args) => {
    assertArgCount('sin', args, 1);
    return Math.sin(asNumber(args[0]));
  },

  cos: (args) => {
    assertArgCount('cos', args, 1);
    return Math.cos(asNumber(args[0]));
  },

  tan: (args) => {
    assertArgCount('tan', args, 1);
    return Math.tan(asNumber(args[0]));
  },

  atan2: (args) => {
    assertArgCount('atan2', args, 2);
    return Math.atan2(asNumber(args[0]), asNumber(args[1]));
  },

  rand: (args, ctx) => {
    if (args.length === 0) {
      return ctx.random();
    }
    if (args.length === 2) {
      const min = asNumber(args[0]);
      const max = asNumber(args[1]);
      return min + ctx.random() * (max - min);
    }
    throw new Error('rand() takes 0 or 2 arguments');
  },

  randomInt: (args, ctx) => {
    assertArgCount('randomInt', args, 2);
    const min = Math.floor(asNumber(args[0]));
    const max = Math.floor(asNumber(args[1]));
    return min + Math.floor(ctx.random() * (max - min + 1));
  },

  choose: (args, ctx) => {
    if (args.length === 0) {
      throw new Error('choose() requires at least one argument');
    }
    const index = Math.floor(ctx.random() * args.length);
    return args[index];
  },

  weightedChoice: (args, ctx) => {
    if (args.length < 2 || args.length % 2 !== 0) {
      throw new Error('weightedChoice() requires pairs of (value, weight) arguments');
    }
    const pairs: { value: ExpressionValueType; weight: number }[] = [];
    let totalWeight = 0;
    for (let i = 0; i < args.length; i += 2) {
      const value = args[i];
      const weight = asNumber(args[i + 1]);
      if (weight < 0) {
        throw new Error('weightedChoice() weights must be non-negative');
      }
      pairs.push({ value, weight });
      totalWeight += weight;
    }
    if (totalWeight === 0) {
      return pairs[0].value;
    }
    let roll = ctx.random() * totalWeight;
    for (const pair of pairs) {
      roll -= pair.weight;
      if (roll <= 0) {
        return pair.value;
      }
    }
    return pairs[pairs.length - 1].value;
  },

  entityCount: (args, ctx) => {
    assertArgCount('entityCount', args, 1);
    const tag = String(args[0]);
    if (!ctx.entityManager) {
      return 0;
    }
    return ctx.entityManager.getEntitiesByTag(tag).length;
  },

  entityExists: (args, ctx) => {
    assertArgCount('entityExists', args, 1);
    const tag = String(args[0]);
    if (!ctx.entityManager) {
      return false;
    }
    return ctx.entityManager.getEntitiesByTag(tag).length > 0;
  },

  highestY: (args, ctx) => {
    assertArgCount('highestY', args, 1);
    const tag = String(args[0]);
    if (!ctx.entityManager) {
      return 0;
    }
    const entities = ctx.entityManager.getEntitiesByTag(tag);
    if (entities.length === 0) {
      return 0;
    }
    return Math.min(...entities.map((e) => e.transform.y));
  },

  lowestY: (args, ctx) => {
    assertArgCount('lowestY', args, 1);
    const tag = String(args[0]);
    if (!ctx.entityManager) {
      return 0;
    }
    const entities = ctx.entityManager.getEntitiesByTag(tag);
    if (entities.length === 0) {
      return 0;
    }
    return Math.max(...entities.map((e) => e.transform.y));
  },

  nearestEntity: (args, ctx) => {
    if (args.length < 2) {
      throw new Error('nearestEntity(tag, position) requires 2 arguments');
    }
    const tag = String(args[0]);
    const pos = asVec2(args[1]);
    if (!ctx.entityManager) {
      return { x: 0, y: 0 };
    }
    const entities = ctx.entityManager.getEntitiesByTag(tag);
    if (entities.length === 0) {
      return { x: 0, y: 0 };
    }
    let nearest = entities[0];
    let minDist = Infinity;
    for (const e of entities) {
      const dx = e.transform.x - pos.x;
      const dy = e.transform.y - pos.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    return { x: nearest.transform.x, y: nearest.transform.y };
  },

  length: (args) => {
    assertArgCount('length', args, 1);
    const v = args[0];
    if (isVec2(v)) {
      return Math.sqrt(v.x * v.x + v.y * v.y);
    }
    return Math.abs(asNumber(v));
  },

  normalize: (args) => {
    assertArgCount('normalize', args, 1);
    const v = asVec2(args[0]);
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },

  dot: (args) => {
    assertArgCount('dot', args, 2);
    const a = asVec2(args[0]);
    const b = asVec2(args[1]);
    return a.x * b.x + a.y * b.y;
  },

  distance: (args) => {
    assertArgCount('distance', args, 2);
    const a = asVec2(args[0]);
    const b = asVec2(args[1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  minDistanceToTag: (args, ctx) => {
    if (args.length < 2) {
      throw new Error('minDistanceToTag(tag, position) requires 2 arguments');
    }
    const tag = String(args[0]);
    const pos = asVec2(args[1]);
    if (!ctx.entityManager) {
      console.log('[minDistanceToTag] No entityManager');
      return Infinity;
    }
    const entities = ctx.entityManager.getEntitiesByTag(tag);
    if (entities.length === 0) {
      console.log('[minDistanceToTag] No entities with tag:', tag);
      return Infinity;
    }
    let minDist = Infinity;
    for (const e of entities) {
      const dx = e.transform.x - pos.x;
      const dy = e.transform.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
      }
    }
    console.log('[minDistanceToTag] tag:', tag, 'pos:', pos, 'minDist:', minDist.toFixed(2));
    return minDist;
  },

  entityPos: (args, ctx) => {
    assertArgCount('entityPos', args, 1);
    const tag = String(args[0]);
    if (!ctx.entityManager) {
      console.log('[entityPos] No entityManager');
      return { x: 0, y: 0 };
    }
    const entities = ctx.entityManager.getEntitiesByTag(tag);
    if (entities.length === 0) {
      console.log('[entityPos] No entities with tag:', tag);
      return { x: 0, y: 0 };
    }
    const result = { x: entities[0].transform.x, y: entities[0].transform.y };
    console.log('[entityPos] tag:', tag, 'pos:', result);
    return result;
  },

  sign: (args) => {
    assertArgCount('sign', args, 1);
    const n = asNumber(args[0]);
    return n > 0 ? 1 : n < 0 ? -1 : 0;
  },

  smoothstep: (args) => {
    assertArgCount('smoothstep', args, 3);
    const edge0 = asNumber(args[0]);
    const edge1 = asNumber(args[1]);
    const x = asNumber(args[2]);
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  },

  step: (args) => {
    assertArgCount('step', args, 2);
    const edge = asNumber(args[0]);
    const x = asNumber(args[1]);
    return x < edge ? 0 : 1;
  },

  mix: (args) => {
    assertArgCount('mix', args, 3);
    return BUILTIN_FUNCTIONS.lerp(args, {} as EvalContext);
  },

  fract: (args) => {
    assertArgCount('fract', args, 1);
    const x = asNumber(args[0]);
    return x - Math.floor(x);
  },

  mod: (args) => {
    assertArgCount('mod', args, 2);
    const x = asNumber(args[0]);
    const y = asNumber(args[1]);
    return x - y * Math.floor(x / y);
  },

  vec2: (args) => {
    if (args.length === 1) {
      const v = asNumber(args[0]);
      return { x: v, y: v };
    }
    assertArgCount('vec2', args, 2);
    return { x: asNumber(args[0]), y: asNumber(args[1]) };
  },

  list: (args) => {
    return args.slice();
  },

  listLength: (args) => {
    assertArgCount('listLength', args, 1);
    const list = asList(args[0]);
    return list.length;
  },

  listGet: (args) => {
    assertArgCount('listGet', args, 2);
    const list = asList(args[0]);
    const index = Math.floor(asNumber(args[1]));
    if (index < 0 || index >= list.length) {
      return 0;
    }
    return list[index];
  },

  listContains: (args) => {
    assertArgCount('listContains', args, 2);
    const list = asList(args[0]);
    const value = args[1];
    return list.some((item) => item === value);
  },

  listFirst: (args) => {
    assertArgCount('listFirst', args, 1);
    const list = asList(args[0]);
    return list.length > 0 ? list[0] : 0;
  },

  listLast: (args) => {
    assertArgCount('listLast', args, 1);
    const list = asList(args[0]);
    return list.length > 0 ? list[list.length - 1] : 0;
  },

  listRandom: (args, ctx) => {
    assertArgCount('listRandom', args, 1);
    const list = asList(args[0]);
    if (list.length === 0) return 0;
    const index = Math.floor(ctx.random() * list.length);
    return list[index];
  },
};

function assertArgCount(name: string, args: ExpressionValueType[], expected: number): void {
  if (args.length !== expected) {
    throw new Error(`${name}() expects ${expected} arguments, got ${args.length}`);
  }
}

function isVec2(value: ExpressionValueType): value is Vec2 {
  return typeof value === 'object' && value !== null && 'x' in value && 'y' in value;
}

function asNumber(value: ExpressionValueType): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  throw new Error(`Expected number, got ${typeof value}`);
}

function asVec2(value: ExpressionValueType): Vec2 {
  if (isVec2(value)) return value;
  if (typeof value === 'number') return { x: value, y: value };
  throw new Error(`Expected vec2, got ${typeof value}`);
}

function isList(value: ExpressionValueType): value is ExpressionValueType[] {
  return Array.isArray(value);
}

function asList(value: ExpressionValueType): ExpressionValueType[] {
  if (isList(value)) return value;
  throw new Error(`Expected list, got ${typeof value}`);
}

function asBoolean(value: ExpressionValueType): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (isVec2(value)) return value.x !== 0 || value.y !== 0;
  return false;
}

function resolveIdentifier(name: string, ctx: EvalContext): ExpressionValueType {
  switch (name) {
    case 'score':
      return ctx.score;
    case 'lives':
      return ctx.lives;
    case 'time':
      return ctx.time;
    case 'wave':
      return ctx.wave;
    case 'dt':
      return ctx.dt;
    case 'frameId':
      return ctx.frameId;
    case 'PI':
      return Math.PI;
    case 'E':
      return Math.E;
    case 'self':
      if (!ctx.self) throw new Error("'self' is not available in this context");
      return ctx.self as unknown as ExpressionValueType;
    default:
      if (name in ctx.variables) {
        return ctx.variables[name];
      }
      throw new Error(`Unknown identifier: ${name}`);
  }
}

function resolveMemberAccess(obj: ExpressionValueType, property: string): ExpressionValueType {
  if (isVec2(obj)) {
    switch (property) {
      case 'x':
      case 'r':
        return obj.x;
      case 'y':
      case 'g':
        return obj.y;
      default:
        throw new Error(`Unknown vector property: ${property}`);
    }
  }

  if (isList(obj)) {
    if (property === 'length') {
      return obj.length;
    }
    const index = parseInt(property, 10);
    if (!isNaN(index) && index >= 0 && index < obj.length) {
      return obj[index];
    }
    throw new Error(`Invalid list property: ${property}`);
  }

  if (typeof obj === 'object' && obj !== null) {
    const record = obj as unknown as Record<string, unknown>;
    if (property in record) {
      const value = record[property];
      if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'string' ||
        isVec2(value as ExpressionValueType) ||
        isList(value as ExpressionValueType)
      ) {
        return value as ExpressionValueType;
      }
      return value as ExpressionValueType;
    }
    throw new Error(`Property '${property}' not found`);
  }

  throw new Error(`Cannot access property '${property}' on ${typeof obj}`);
}

function evaluateNode(node: ASTNode, ctx: EvalContext): ExpressionValueType {
  switch (node.type) {
    case 'NumberLiteral':
      return node.value;

    case 'BooleanLiteral':
      return node.value;

    case 'StringLiteral':
      return node.value;

    case 'VectorLiteral': {
      const x = asNumber(evaluateNode(node.x, ctx));
      const y = asNumber(evaluateNode(node.y, ctx));
      return { x, y };
    }

    case 'Identifier':
      return resolveIdentifier(node.name, ctx);

    case 'MemberAccess': {
      const obj = evaluateNode(node.object, ctx);
      return resolveMemberAccess(obj, node.property);
    }

    case 'BinaryOp': {
      const left = evaluateNode(node.left, ctx);
      const right = evaluateNode(node.right, ctx);
      return evaluateBinaryOp(node.operator, left, right);
    }

    case 'UnaryOp': {
      const operand = evaluateNode(node.operand, ctx);
      return evaluateUnaryOp(node.operator, operand);
    }

    case 'Ternary': {
      const condition = asBoolean(evaluateNode(node.condition, ctx));
      return condition
        ? evaluateNode(node.consequent, ctx)
        : evaluateNode(node.alternate, ctx);
    }

    case 'FunctionCall': {
      const func = BUILTIN_FUNCTIONS[node.name];
      if (!func) {
        throw new Error(`Unknown function: ${node.name}`);
      }
      const args = node.args.map((arg) => evaluateNode(arg, ctx));
      return func(args, ctx);
    }

    case 'TemplateString': {
      let result = '';
      for (const part of node.parts) {
        if (part.type === 'text') {
          result += part.value;
        } else {
          const value = evaluateNode(part.node, ctx);
          result += formatValue(value);
        }
      }
      return result;
    }

    default:
      throw new Error(`Unknown node type: ${(node as ASTNode).type}`);
  }
}

function formatValue(value: ExpressionValueType): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (isVec2(value)) return `(${value.x}, ${value.y})`;
  return String(value);
}

function evaluateBinaryOp(
  op: string,
  left: ExpressionValueType,
  right: ExpressionValueType
): ExpressionValueType {
  if (isVec2(left) || isVec2(right)) {
    return evaluateVectorBinaryOp(op, left, right);
  }

  const a = asNumber(left);
  const b = asNumber(right);

  switch (op) {
    case '+':
      if (typeof left === 'string' || typeof right === 'string') {
        return formatValue(left) + formatValue(right);
      }
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    case '%':
      if (b === 0) throw new Error('Modulo by zero');
      return a % b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '&&':
      return asBoolean(left) && asBoolean(right);
    case '||':
      return asBoolean(left) || asBoolean(right);
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
}

function evaluateVectorBinaryOp(
  op: string,
  left: ExpressionValueType,
  right: ExpressionValueType
): ExpressionValueType {
  const a = asVec2(left);
  const b = asVec2(right);

  switch (op) {
    case '+':
      return { x: a.x + b.x, y: a.y + b.y };
    case '-':
      return { x: a.x - b.x, y: a.y - b.y };
    case '*':
      return { x: a.x * b.x, y: a.y * b.y };
    case '/':
      if (b.x === 0 || b.y === 0) throw new Error('Division by zero in vector');
      return { x: a.x / b.x, y: a.y / b.y };
    case '==':
      return a.x === b.x && a.y === b.y;
    case '!=':
      return a.x !== b.x || a.y !== b.y;
    default:
      throw new Error(`Operator '${op}' not supported for vectors`);
  }
}

function evaluateUnaryOp(op: string, operand: ExpressionValueType): ExpressionValueType {
  switch (op) {
    case '-':
      if (isVec2(operand)) {
        return { x: -operand.x, y: -operand.y };
      }
      return -asNumber(operand);
    case '!':
      return !asBoolean(operand);
    default:
      throw new Error(`Unknown unary operator: ${op}`);
  }
}

function collectDependencies(node: ASTNode): string[] {
  const deps = new Set<string>();

  function traverse(n: ASTNode): void {
    switch (n.type) {
      case 'Identifier':
        deps.add(n.name);
        break;
      case 'MemberAccess':
        traverse(n.object);
        break;
      case 'BinaryOp':
        traverse(n.left);
        traverse(n.right);
        break;
      case 'UnaryOp':
        traverse(n.operand);
        break;
      case 'Ternary':
        traverse(n.condition);
        traverse(n.consequent);
        traverse(n.alternate);
        break;
      case 'FunctionCall':
        n.args.forEach(traverse);
        break;
      case 'VectorLiteral':
        traverse(n.x);
        traverse(n.y);
        break;
      case 'TemplateString':
        n.parts.forEach((p) => {
          if (p.type === 'expr') traverse(p.node);
        });
        break;
    }
  }

  traverse(node);
  return Array.from(deps);
}

export function compile<T extends ExpressionValueType = ExpressionValueType>(
  source: string
): CompiledExpression<T> {
  const ast = parse(source);
  const dependencies = collectDependencies(ast);

  return {
    ast,
    source,
    dependencies,
    evaluate: (ctx: EvalContext) => evaluateNode(ast, ctx) as T,
  };
}

export function evaluate(source: string, ctx: EvalContext): ExpressionValueType {
  return compile(source).evaluate(ctx);
}

export function createSeededRandom(initialSeed: number = 12345): () => number {
  let seed = initialSeed;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export function createDefaultContext(overrides?: Partial<EvalContext> & { seed?: number }): EvalContext {
  const { seed = 12345, ...rest } = overrides ?? {};
  
  return {
    score: 0,
    lives: 3,
    time: 0,
    wave: 1,
    frameId: 0,
    dt: 1 / 60,
    variables: {},
    random: createSeededRandom(seed),
    ...rest,
  };
}
