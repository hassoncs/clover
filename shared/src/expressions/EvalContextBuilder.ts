import { compile } from './evaluator';
import {
  isExpression,
  type EvalContext,
  type ExpressionValueType,
  type Value,
  type EntityContext,
} from './types';
import { getValue, type GameVariable } from '../types/GameDefinition';

export interface GameVariables {
  [key: string]: GameVariable;
}

export interface GameState {
  score: number;
  lives: number;
  time: number;
  wave: number;
  frameId: number;
  dt: number;
}

export interface EvalContextBuilderOptions {
  gameState: GameState;
  variables?: GameVariables;
  self?: EntityContext;
  seed?: number;
}

interface DependencyNode {
  name: string;
  value: Value<ExpressionValueType>;
  dependencies: string[];
  resolved: boolean;
  resolvedValue?: ExpressionValueType;
}

export class CyclicDependencyError extends Error {
  constructor(
    public readonly cycle: string[],
    public readonly variableName: string
  ) {
    super(
      `Cyclic dependency detected: ${cycle.join(' -> ')} -> ${variableName}`
    );
    this.name = 'CyclicDependencyError';
  }
}

export class UnknownVariableError extends Error {
  constructor(
    public readonly variableName: string,
    public readonly referencedIn: string
  ) {
    super(
      `Unknown variable '${variableName}' referenced in expression for '${referencedIn}'`
    );
    this.name = 'UnknownVariableError';
  }
}

function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function extractDependencies(source: string): string[] {
  const compiled = compile(source);
  return compiled.dependencies.filter(
    (dep) =>
      !['score', 'lives', 'time', 'wave', 'dt', 'frameId', 'PI', 'E', 'self', 'true', 'false'].includes(dep)
  );
}

export class EvalContextBuilder {
  private nodes: Map<string, DependencyNode> = new Map();
  private globalNames = new Set([
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

  build(options: EvalContextBuilderOptions): EvalContext {
    const { gameState, variables = {}, self, seed = 12345 } = options;

    this.nodes.clear();

    for (const [name, variable] of Object.entries(variables)) {
      // Extract the actual value from VariableWithTuning if needed
      const value = getValue(variable);
      const deps = isExpression(value) ? extractDependencies(value.expr) : [];
      this.nodes.set(name, {
        name,
        value,
        dependencies: deps,
        resolved: false,
      });
    }

    this.validateDependencies();

    const resolvedVariables: Record<string, ExpressionValueType> = {};
    const tempContext: EvalContext = {
      ...gameState,
      variables: resolvedVariables,
      self,
      random: createSeededRandom(seed),
    };

    const sortedNames = this.topologicalSort();

    for (const name of sortedNames) {
      const node = this.nodes.get(name)!;
      if (isExpression(node.value)) {
        const compiled = compile(node.value.expr);
        resolvedVariables[name] = compiled.evaluate(tempContext);
      } else {
        resolvedVariables[name] = node.value;
      }
      node.resolved = true;
      node.resolvedValue = resolvedVariables[name];
    }

    return {
      ...gameState,
      variables: resolvedVariables,
      self,
      random: createSeededRandom(seed),
    };
  }

  private validateDependencies(): void {
    for (const [name, node] of this.nodes) {
      for (const dep of node.dependencies) {
        if (!this.nodes.has(dep) && !this.globalNames.has(dep)) {
          throw new UnknownVariableError(dep, name);
        }
      }
    }
  }

  private topologicalSort(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string, path: string[] = []): void => {
      if (visited.has(name)) return;

      if (visiting.has(name)) {
        throw new CyclicDependencyError(path, name);
      }

      const node = this.nodes.get(name);
      if (!node) return;

      visiting.add(name);
      const newPath = [...path, name];

      for (const dep of node.dependencies) {
        if (this.nodes.has(dep)) {
          visit(dep, newPath);
        }
      }

      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const name of this.nodes.keys()) {
      visit(name);
    }

    return result;
  }

  static create(): EvalContextBuilder {
    return new EvalContextBuilder();
  }
}

export function buildEvalContext(options: EvalContextBuilderOptions): EvalContext {
  return new EvalContextBuilder().build(options);
}
