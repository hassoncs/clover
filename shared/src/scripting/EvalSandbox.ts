/**
 * TEMPORARY: Eval-based script sandbox for trusted code only.
 *
 * WARNING: This uses eval() and provides NO security isolation.
 * Only use this for code you write yourself.
 *
 * This will be replaced with QuickJS sandbox for proper isolation.
 */

import type { ScriptResult, BudgetConfig, ScriptContext } from './types';
import { DEFAULT_BUDGET } from './types';

let hasWarnedAboutEval = false;

function warnOnce(): void {
  if (!hasWarnedAboutEval) {
    console.warn(
      '[EvalSandbox] WARNING: Running scripts using eval() - NO SECURITY ISOLATION.\n' +
        'This is temporary and should only be used for trusted code.\n' +
        'QuickJS sandbox integration is in progress.'
    );
    hasWarnedAboutEval = true;
  }
}

export class EvalSandbox {
  private budget: Required<BudgetConfig>;

  constructor(budgetConfig?: BudgetConfig) {
    this.budget = { ...DEFAULT_BUDGET, ...budgetConfig };
  }

  /**
   * Evaluate JavaScript code with the given context.
   *
   * The context object's properties are available as globals in the script.
   * The script should return a value or call context methods.
   */
  evaluate<T = unknown>(
    code: string,
    context?: Partial<ScriptContext> | Record<string, unknown>
  ): ScriptResult<T> {
    warnOnce();

    const startTime = Date.now();

    try {
      // Create a function that receives context as 'ctx' parameter
      // The script can access ctx.getVariable(), ctx.setVariable(), etc.
      const wrappedCode = `
        "use strict";
        return (function(ctx) {
          ${code}
        })(ctx);
      `;

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('ctx', wrappedCode);
      const result = fn(context ?? {});

      const elapsed = Date.now() - startTime;
      if (elapsed > this.budget.maxExecutionTimeMs) {
        console.warn(
          `[EvalSandbox] Script exceeded time budget: ${elapsed}ms > ${this.budget.maxExecutionTimeMs}ms`
        );
      }

      return {
        success: true,
        value: result as T,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: {
          message: err.message,
          type: err.name === 'SyntaxError' ? 'syntax' : 'runtime',
          stack: err.stack,
        },
      };
    }
  }

  /**
   * Evaluate an exported function from a script module.
   *
   * @param code - The full script code (should export functions)
   * @param exportName - The name of the exported function to call
   * @param context - The ScriptContext to pass to the function
   */
  evaluateExport<T = unknown>(
    code: string,
    exportName: string,
    context?: Partial<ScriptContext> | Record<string, unknown>
  ): ScriptResult<T> {
    warnOnce();

    try {
      // Wrap the code to capture exports and call the specified function
      const wrappedCode = `
        "use strict";
        const exports = {};
        ${code}
        if (typeof exports.${exportName} !== 'function') {
          throw new Error('Export "${exportName}" is not a function');
        }
        return exports.${exportName}(ctx);
      `;

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function('ctx', wrappedCode);
      const result = fn(context ?? {});

      return {
        success: true,
        value: result as T,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: {
          message: err.message,
          type: err.name === 'SyntaxError' ? 'syntax' : 'runtime',
          stack: err.stack,
        },
      };
    }
  }

  dispose(): void {
    // No cleanup needed for eval-based sandbox
  }
}

/**
 * Create a simple seeded random number generator for deterministic scripts.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Create a minimal ScriptContext for testing.
 */
export function createMockScriptContext(
  overrides?: Partial<ScriptContext>
): ScriptContext {
  const variables: Record<string, unknown> = {};
  const constants: Record<string, number | string | boolean> = {};
  const random = createSeededRandom(12345);

  return {
    getConstant: (name) => constants[name],
    getVariable: (name) => variables[name],
    setVariable: (name, value) => {
      variables[name] = value;
    },
    queryEntities: () => [],
    getEntityPosition: () => null,
    getEntityVelocity: () => null,
    getEntityTags: () => [],
    getEntityData: () => undefined,
    setEntityPosition: () => {},
    setEntityVelocity: () => {},
    applyImpulse: () => {},
    addTag: () => {},
    removeTag: () => {},
    spawnEntity: () => 'mock-entity-id',
    destroyEntity: () => {},
    emit: () => {},
    win: () => {},
    lose: () => {},
    random,
    randomInt: (min, max) => Math.floor(random() * (max - min + 1)) + min,
    randomChoice: (array) => array[Math.floor(random() * array.length)],
    ...overrides,
  };
}
