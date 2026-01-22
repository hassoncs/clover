import type {
  ASTNode,
  ValidationResult,
  ExpressionError,
} from './types';
import { parse } from './parser';

const KNOWN_GLOBALS = new Set([
  'score',
  'lives',
  'time',
  'wave',
  'dt',
  'frameId',
  'PI',
  'E',
  'self',
  'true',
  'false',
]);

const KNOWN_FUNCTIONS = new Set([
  'min',
  'max',
  'clamp',
  'lerp',
  'abs',
  'floor',
  'ceil',
  'round',
  'sqrt',
  'pow',
  'sin',
  'cos',
  'tan',
  'atan2',
  'rand',
  'length',
  'normalize',
  'dot',
  'distance',
  'sign',
  'smoothstep',
  'step',
  'mix',
  'fract',
  'mod',
  'vec2',
]);

const VECTOR_PROPERTIES = new Set(['x', 'y', 'r', 'g']);

const SELF_PROPERTIES = new Set([
  'id',
  'transform',
  'velocity',
  'health',
  'maxHealth',
]);

const TRANSFORM_PROPERTIES = new Set(['x', 'y', 'angle']);
const VELOCITY_PROPERTIES = new Set(['x', 'y']);

type ExpressionType = 'number' | 'boolean' | 'string' | 'vec2' | 'object' | 'unknown';

interface ValidationContext {
  knownVariables: Set<string>;
  path: string;
  errors: ExpressionError[];
  warnings: string[];
  dependencies: Set<string>;
}

function createError(
  message: string,
  source: string,
  node: ASTNode,
  context?: string
): ExpressionError {
  return {
    message,
    source,
    position: node.start,
    line: 1,
    column: node.start + 1,
    context,
  };
}

function inferType(node: ASTNode, ctx: ValidationContext, source: string): ExpressionType {
  switch (node.type) {
    case 'NumberLiteral':
      return 'number';

    case 'BooleanLiteral':
      return 'boolean';

    case 'StringLiteral':
      return 'string';

    case 'VectorLiteral':
      return 'vec2';

    case 'TemplateString':
      return 'string';

    case 'Identifier': {
      const name = node.name;
      ctx.dependencies.add(name);

      if (KNOWN_GLOBALS.has(name)) {
        if (name === 'true' || name === 'false') return 'boolean';
        if (name === 'self') return 'object';
        return 'number';
      }

      if (ctx.knownVariables.has(name)) {
        return 'unknown';
      }

      ctx.errors.push(
        createError(`Unknown identifier: '${name}'`, source, node, ctx.path)
      );
      return 'unknown';
    }

    case 'MemberAccess': {
      const objType = inferType(node.object, ctx, source);
      const prop = node.property;

      if (objType === 'vec2') {
        if (!VECTOR_PROPERTIES.has(prop)) {
          ctx.errors.push(
            createError(
              `Unknown vector property: '${prop}'. Valid properties: x, y, r, g`,
              source,
              node,
              ctx.path
            )
          );
        }
        return 'number';
      }

      if (node.object.type === 'Identifier' && node.object.name === 'self') {
        if (SELF_PROPERTIES.has(prop)) {
          if (prop === 'transform' || prop === 'velocity') return 'object';
          return 'number';
        }
        return 'unknown';
      }

      if (
        node.object.type === 'MemberAccess' &&
        node.object.object.type === 'Identifier' &&
        node.object.object.name === 'self'
      ) {
        const parentProp = node.object.property;
        if (parentProp === 'transform') {
          if (!TRANSFORM_PROPERTIES.has(prop)) {
            ctx.warnings.push(
              `Unknown transform property: '${prop}'. Expected: x, y, angle`
            );
          }
          return 'number';
        }
        if (parentProp === 'velocity') {
          if (!VELOCITY_PROPERTIES.has(prop)) {
            ctx.warnings.push(`Unknown velocity property: '${prop}'. Expected: x, y`);
          }
          return 'number';
        }
      }

      return 'unknown';
    }

    case 'BinaryOp': {
      const leftType = inferType(node.left, ctx, source);
      const rightType = inferType(node.right, ctx, source);

      switch (node.operator) {
        case '+':
          if (leftType === 'string' || rightType === 'string') return 'string';
          if (leftType === 'vec2' || rightType === 'vec2') return 'vec2';
          return 'number';
        case '-':
        case '*':
        case '/':
        case '%':
          if (leftType === 'vec2' || rightType === 'vec2') return 'vec2';
          return 'number';
        case '<':
        case '<=':
        case '>':
        case '>=':
        case '==':
        case '!=':
        case '&&':
        case '||':
          return 'boolean';
        default:
          return 'unknown';
      }
    }

    case 'UnaryOp':
      if (node.operator === '!') return 'boolean';
      if (node.operator === '-') {
        const operandType = inferType(node.operand, ctx, source);
        return operandType === 'vec2' ? 'vec2' : 'number';
      }
      return 'unknown';

    case 'Ternary': {
      inferType(node.condition, ctx, source);
      const consequentType = inferType(node.consequent, ctx, source);
      const alternateType = inferType(node.alternate, ctx, source);

      if (consequentType === alternateType) return consequentType;
      if (consequentType === 'unknown') return alternateType;
      if (alternateType === 'unknown') return consequentType;
      return 'unknown';
    }

    case 'FunctionCall': {
      if (!KNOWN_FUNCTIONS.has(node.name)) {
        ctx.errors.push(
          createError(`Unknown function: '${node.name}'`, source, node, ctx.path)
        );
        return 'unknown';
      }

      for (const arg of node.args) {
        inferType(arg, ctx, source);
      }

      switch (node.name) {
        case 'min':
        case 'max':
        case 'clamp':
        case 'lerp':
        case 'mix':
        case 'abs':
        case 'floor':
        case 'ceil':
        case 'round': {
          const firstArgType =
            node.args.length > 0 ? inferType(node.args[0], ctx, source) : 'unknown';
          return firstArgType === 'vec2' ? 'vec2' : 'number';
        }
        case 'normalize':
        case 'vec2':
          return 'vec2';
        case 'length':
        case 'distance':
        case 'dot':
        case 'sqrt':
        case 'pow':
        case 'sin':
        case 'cos':
        case 'tan':
        case 'atan2':
        case 'rand':
        case 'sign':
        case 'smoothstep':
        case 'step':
        case 'fract':
        case 'mod':
          return 'number';
        default:
          return 'unknown';
      }
    }

    default:
      return 'unknown';
  }
}

export function validateExpression(
  source: string,
  options: {
    knownVariables?: string[];
    path?: string;
  } = {}
): ValidationResult {
  const ctx: ValidationContext = {
    knownVariables: new Set(options.knownVariables ?? []),
    path: options.path ?? '',
    errors: [],
    warnings: [],
    dependencies: new Set(),
  };

  let ast: ASTNode;
  let returnType: ValidationResult['returnType'] = 'unknown';

  try {
    ast = parse(source);
    returnType = inferType(ast, ctx, source) as ValidationResult['returnType'];
  } catch (e) {
    const error = e as Error;
    const match = error.message.match(/at line (\d+), column (\d+)/);
    ctx.errors.push({
      message: error.message,
      source,
      position: 0,
      line: match ? parseInt(match[1], 10) : 1,
      column: match ? parseInt(match[2], 10) : 1,
      context: options.path,
    });
  }

  return {
    valid: ctx.errors.length === 0,
    errors: ctx.errors,
    warnings: ctx.warnings,
    dependencies: Array.from(ctx.dependencies),
    returnType,
  };
}

export function formatValidationErrors(result: ValidationResult): string {
  if (result.valid) return '';

  return result.errors
    .map((err) => {
      let msg = `Error: ${err.message}`;
      if (err.context) {
        msg = `[${err.context}] ${msg}`;
      }
      msg += `\n  at line ${err.line}, column ${err.column}`;
      if (err.source) {
        msg += `\n  in expression: "${err.source}"`;
      }
      return msg;
    })
    .join('\n\n');
}

export function validateAllExpressions(
  expressions: Array<{ source: string; path: string }>,
  knownVariables: string[] = []
): { valid: boolean; errors: ExpressionError[]; warnings: string[] } {
  const allErrors: ExpressionError[] = [];
  const allWarnings: string[] = [];

  for (const { source, path } of expressions) {
    const result = validateExpression(source, { knownVariables, path });
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
