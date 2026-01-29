/**
 * Type definitions for script execution.
 */

/**
 * Configuration for script execution budget enforcement.
 */
export interface BudgetConfig {
  /** Maximum execution time in milliseconds */
  maxExecutionTimeMs: number;
  /** Maximum number of instructions to execute */
  maxInstructions: number;
  /** Optional: maximum memory usage in bytes */
  maxMemoryBytes?: number;
  /** Optional: maximum engine calls */
  maxEngineCalls?: number;
}

/**
 * QuickJS-specific budget configuration for sandbox execution.
 */
export interface QuickJSBudgetConfig {
  /** Maximum execution time in milliseconds */
  maxTimeMs: number;
  /** Maximum number of instructions (0 = unlimited) */
  maxInstructions?: number;
}

/**
 * Default budget configuration for sandbox execution.
 */
export const DEFAULT_BUDGET: Required<BudgetConfig> = {
  maxExecutionTimeMs: 16,
  maxInstructions: 100_000,
  maxMemoryBytes: 1024 * 1024,
  maxEngineCalls: 1000,
};

/**
 * Structured error information from script execution.
 */
export interface ScriptError {
  /** Error message describing what went wrong */
  message: string;
  /** Error type classification */
  type: 'syntax' | 'runtime' | 'timeout' | 'memory' | 'unknown';
  /** Optional: JavaScript error name */
  name?: string;
  /** Optional: stack trace if available */
  stack?: string;
}

/**
 * Result of script evaluation.
 */
export type ScriptResult<T = unknown> =
  | {
      /** Whether the script executed successfully */
      success: true;
      /** The returned value from the script */
      value: T;
    }
  | {
      /** Whether the script executed successfully */
      success: false;
      /** The error that occurred */
      error: ScriptError;
    };

/**
 * Result of script evaluation with QuickJS sandbox.
 */
export interface QuickJSResult {
  /** Whether execution was successful (no error) */
  success: boolean;
  /** The result value if successful, undefined otherwise */
  value?: unknown;
  /** Error message if execution failed */
  error?: string;
  /** Whether execution was terminated due to budget limits */
  timedOut?: boolean;
}

/**
 * Script execution interface for sandbox.
 */
export interface QuickJSScriptContext {
  /** Evaluate JavaScript code and return the result */
  evaluate(code: string): Promise<QuickJSResult>;
  /** Clean up resources */
  dispose(): void;
}

/**
 * Context provided to scripts during evaluation.
 */
export interface ScriptContext {
  /** Get a constant value by name */
  getConstant: (name: string) => number | string | boolean | undefined;
  /** Get a variable value by name */
  getVariable: (name: string) => unknown;
  /** Set a variable value by name */
  setVariable: (name: string, value: unknown) => void;
  /** Query entities matching criteria */
  queryEntities: (query?: Record<string, unknown>) => unknown[];
  /** Get an entity's position */
  getEntityPosition: (entityId: string) => { x: number; y: number } | null;
  /** Get an entity's velocity */
  getEntityVelocity: (entityId: string) => { x: number; y: number } | null;
  /** Get an entity's tags */
  getEntityTags: (entityId: string) => string[];
  /** Get arbitrary entity data */
  getEntityData: (entityId: string, key: string) => unknown;
  /** Set an entity's position */
  setEntityPosition: (entityId: string, position: { x: number; y: number }) => void;
  /** Set an entity's velocity */
  setEntityVelocity: (entityId: string, velocity: { x: number; y: number }) => void;
  /** Apply an impulse to an entity */
  applyImpulse: (entityId: string, impulse: { x: number; y: number }) => void;
  /** Add a tag to an entity */
  addTag: (entityId: string, tag: string) => void;
  /** Remove a tag from an entity */
  removeTag: (entityId: string, tag: string) => void;
  /** Spawn a new entity */
  spawnEntity: (templateId: string, position: { x: number; y: number }) => string;
  /** Destroy an entity */
  destroyEntity: (entityId: string) => void;
  /** Emit an event */
  emit: (event: string, data?: Record<string, unknown>) => void;
  /** Signal victory */
  win: () => void;
  /** Signal defeat */
  lose: () => void;
  /** Get a random number between 0 and 1 */
  random: () => number;
  /** Get a random integer between min and max (inclusive) */
  randomInt: (min: number, max: number) => number;
  /** Get a random element from an array */
  randomChoice: <T>(array: T[]) => T;
}
