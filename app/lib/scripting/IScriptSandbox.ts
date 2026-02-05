/**
 * Interface for script sandbox implementations.
 *
 * This defines the contract that both UnsafeScriptSandbox (eval-based, temporary)
 * and QuickJSScriptSandbox (secure, production) must implement.
 */

import type {
  ScriptSandboxConfig,
  ScriptResult,
  ScriptErrorReport,
  ScriptInputEvent,
  ScriptCollisionEvent,
  ScriptContext,
} from './types';

/**
 * The runtime context passed to script hooks.
 * This is the ScriptContext with sync reads + WorldOps + sequence management.
 */
export type ScriptRuntimeContext = ScriptContext;

export interface ScriptLogEntry {
  level: 'log' | 'warn' | 'error';
  args: unknown[];
  timestamp: number;
}

export interface ScriptReloadResult {
  success: boolean;
  error?: ScriptErrorReport;
  previousHooks: {
    onStart: boolean;
    onUpdate: boolean;
    onInput: boolean;
    onCollision: boolean;
  };
  newHooks: {
    onStart: boolean;
    onUpdate: boolean;
    onInput: boolean;
    onCollision: boolean;
  };
}

export type ScriptHookName = 'onStart' | 'onUpdate' | 'onInput' | 'onCollision';

/**
 * Script sandbox interface.
 *
 * Implementations:
 * - UnsafeScriptSandbox: Uses eval/new Function - NO SECURITY. Temporary for development.
 * - QuickJSScriptSandbox: Uses QuickJS WASM - Full isolation. For production.
 */
export interface IScriptSandbox {
  /**
   * Initialize the sandbox and compile the script.
   * Must be called before running any hooks.
   */
  initialize(): Promise<ScriptResult<void>>;

  /**
   * Hot-reload with new script code.
   * Returns information about which hooks changed.
   */
  reload(newScriptCode: string): Promise<ScriptReloadResult>;

  /**
   * Get the number of times the script has been reloaded.
   */
  getReloadCount(): number;

  /**
   * Get the current script source code.
   */
  getScriptCode(): string;

  /**
   * Run the onStart hook (called once when game starts).
   */
  runStart(runtime: ScriptRuntimeContext): ScriptResult<void>;

  /**
   * Run the onUpdate hook (called every frame).
   */
  runUpdate(runtime: ScriptRuntimeContext, dt: number): ScriptResult<void>;

  /**
   * Run the onInput hook (called on user input events).
   */
  runInput(runtime: ScriptRuntimeContext, event: ScriptInputEvent): ScriptResult<void>;

  /**
   * Run the onCollision hook (called on physics collisions).
   */
  runCollision(runtime: ScriptRuntimeContext, collision: ScriptCollisionEvent): ScriptResult<void>;

  /**
   * Call an arbitrary exported function by name.
   */
  callFunction(
    runtime: ScriptRuntimeContext,
    functionName: string,
    args?: Record<string, unknown>
  ): ScriptResult<unknown>;

  /**
   * Get the last error that occurred during script execution.
   */
  getLastError(): ScriptErrorReport | null;

  /**
   * Check if a specific hook is defined in the script.
   */
  hasHook(hookName: ScriptHookName): boolean;

  /**
   * Get captured console logs from the script.
   * @param since - Optional timestamp to filter logs after
   */
  getLogs(since?: number): ScriptLogEntry[];

  /**
   * Clear all captured logs.
   */
  clearLogs(): void;

  /**
   * Dispose of the sandbox and release all resources.
   */
  dispose(): void;
}

/**
 * Configuration for creating a script sandbox.
 */
export type { ScriptSandboxConfig };
