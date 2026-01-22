import type { Vec2 } from '../types/common';

export type { Vec2 };

export type ExpressionValueType = number | boolean | string | Vec2 | ExpressionValueType[];

export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'DOT'
  | 'QUESTION'
  | 'COLON'
  | 'TEMPLATE_START'
  | 'TEMPLATE_END'
  | 'TEMPLATE_EXPR_START'
  | 'TEMPLATE_TEXT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
  line: number;
  column: number;
}

export type ASTNodeType =
  | 'NumberLiteral'
  | 'BooleanLiteral'
  | 'StringLiteral'
  | 'VectorLiteral'
  | 'Identifier'
  | 'MemberAccess'
  | 'BinaryOp'
  | 'UnaryOp'
  | 'Ternary'
  | 'FunctionCall'
  | 'TemplateString';

export interface BaseNode {
  type: ASTNodeType;
  start: number;
  end: number;
}

export interface NumberLiteralNode extends BaseNode {
  type: 'NumberLiteral';
  value: number;
}

export interface BooleanLiteralNode extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface StringLiteralNode extends BaseNode {
  type: 'StringLiteral';
  value: string;
}

export interface VectorLiteralNode extends BaseNode {
  type: 'VectorLiteral';
  x: ASTNode;
  y: ASTNode;
}

export interface IdentifierNode extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface MemberAccessNode extends BaseNode {
  type: 'MemberAccess';
  object: ASTNode;
  property: string;
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '<'
  | '<='
  | '>'
  | '>='
  | '=='
  | '!='
  | '&&'
  | '||';

export interface BinaryOpNode extends BaseNode {
  type: 'BinaryOp';
  operator: BinaryOperator;
  left: ASTNode;
  right: ASTNode;
}

export type UnaryOperator = '-' | '!';

export interface UnaryOpNode extends BaseNode {
  type: 'UnaryOp';
  operator: UnaryOperator;
  operand: ASTNode;
}

export interface TernaryNode extends BaseNode {
  type: 'Ternary';
  condition: ASTNode;
  consequent: ASTNode;
  alternate: ASTNode;
}

export interface FunctionCallNode extends BaseNode {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

export interface TemplateStringNode extends BaseNode {
  type: 'TemplateString';
  parts: Array<{ type: 'text'; value: string } | { type: 'expr'; node: ASTNode }>;
}

export type ASTNode =
  | NumberLiteralNode
  | BooleanLiteralNode
  | StringLiteralNode
  | VectorLiteralNode
  | IdentifierNode
  | MemberAccessNode
  | BinaryOpNode
  | UnaryOpNode
  | TernaryNode
  | FunctionCallNode
  | TemplateStringNode;

export interface EntityContext {
  id: string;
  transform: { x: number; y: number; angle: number };
  velocity?: Vec2;
  health?: number;
  maxHealth?: number;
  [key: string]: unknown;
}

export interface EntityManagerLike {
  getEntitiesByTag(tag: string): { id: string; transform: { x: number; y: number } }[];
}

export interface EvalContext {
  score: number;
  lives: number;
  time: number;
  wave: number;
  frameId: number;
  dt: number;

  self?: EntityContext;

  variables: Record<string, ExpressionValueType>;

  random: () => number;

  entityManager?: EntityManagerLike;
}

export interface CompiledExpression<T extends ExpressionValueType = ExpressionValueType> {
  ast: ASTNode;
  source: string;
  evaluate: (ctx: EvalContext) => T;
  dependencies: string[];
}

export interface ExpressionError {
  message: string;
  source: string;
  position: number;
  line: number;
  column: number;
  context?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ExpressionError[];
  warnings: string[];
  dependencies: string[];
  returnType: 'number' | 'boolean' | 'string' | 'vec2' | 'unknown';
}

export interface ExpressionValue {
  expr: string;
  debugName?: string;
  cache?: 'none' | 'frame';
}

export type Value<T> = T | ExpressionValue;

export function isExpression<T>(value: Value<T>): value is ExpressionValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'expr' in value &&
    typeof (value as ExpressionValue).expr === 'string'
  );
}
