import { QuickJSEngine } from './engine/QuickJSEngine';
import { createScriptContext, contextToPlainObject } from './GameScriptAPI';
import type {
  ScriptSandboxConfig,
  ScriptResult,
  ScriptErrorReport,
  ScriptInputEvent,
  ScriptCollisionEvent,
  SandboxRuntimeContext,
  ScriptBudgetConfig,
} from './types';
import { DEFAULT_SCRIPT_BUDGET } from './types';

const SCRIPT_WRAPPER_PREFIX = `
var exports = {};
(function(exports) {
`;

const SCRIPT_WRAPPER_SUFFIX = `
})(exports);
exports;
`;

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

export class ScriptSandbox {
  private engine: QuickJSEngine;
  private config: ScriptSandboxConfig;
  private isInitialized = false;
  private isDisposed = false;
  private hasOnStart = false;
  private hasOnUpdate = false;
  private hasOnInput = false;
  private hasOnCollision = false;
  private lastError: ScriptErrorReport | null = null;
  private reloadCount = 0;

  constructor(config: ScriptSandboxConfig) {
    this.config = config;
    const budget: ScriptBudgetConfig = {
      ...DEFAULT_SCRIPT_BUDGET,
      ...config.budget,
    };
    this.engine = new QuickJSEngine({ budget });
  }

  async initialize(): Promise<ScriptResult<void>> {
    if (this.isInitialized) return { success: true };

    try {
      await this.engine.initialize();

      const wrappedCode = SCRIPT_WRAPPER_PREFIX + this.config.scriptCode + SCRIPT_WRAPPER_SUFFIX;
      const result = this.engine.evaluate(wrappedCode, 'load');

      if (!result.success) {
        this.lastError = result.error ?? null;
        return { success: false, error: result.error };
      }

      // Detect hooks by evaluating inside QuickJS - dump() doesn't preserve functions
      const hookCheckResult = this.engine.evaluate(
        `({
          onStart: typeof exports.onStart === 'function',
          onUpdate: typeof exports.onUpdate === 'function',
          onInput: typeof exports.onInput === 'function',
          onCollision: typeof exports.onCollision === 'function',
        })`,
        'load'
      );

      if (hookCheckResult.success) {
        const hooks = hookCheckResult.value as Record<string, boolean>;
        this.hasOnStart = hooks.onStart ?? false;
        this.hasOnUpdate = hooks.onUpdate ?? false;
        this.hasOnInput = hooks.onInput ?? false;
        this.hasOnCollision = hooks.onCollision ?? false;
      }

      this.isInitialized = true;
      return { success: true };
    } catch (error) {
      const errorReport: ScriptErrorReport = {
        message: error instanceof Error ? error.message : String(error),
        type: 'unknown',
        phase: 'load',
        frameId: 0,
        timestamp: Date.now(),
      };
      this.lastError = errorReport;
      return { success: false, error: errorReport };
    }
  }

  /**
   * Hot reload the script with new code.
   * This disposes the old engine and creates a new one with the updated script.
   * Game state is preserved in the runtime context, but any in-script state is lost.
   */
  async reload(newScriptCode: string): Promise<ScriptReloadResult> {
    const previousHooks = {
      onStart: this.hasOnStart,
      onUpdate: this.hasOnUpdate,
      onInput: this.hasOnInput,
      onCollision: this.hasOnCollision,
    };

    // Dispose old engine
    this.engine.dispose();
    
    // Create new engine with updated config
    this.config = { ...this.config, scriptCode: newScriptCode };
    const budget: ScriptBudgetConfig = {
      ...DEFAULT_SCRIPT_BUDGET,
      ...this.config.budget,
    };
    this.engine = new QuickJSEngine({ budget });
    
    // Reset state
    this.isInitialized = false;
    this.hasOnStart = false;
    this.hasOnUpdate = false;
    this.hasOnInput = false;
    this.hasOnCollision = false;
    this.lastError = null;
    
    // Re-initialize with new code
    const initResult = await this.initialize();
    
    this.reloadCount++;
    
    const newHooks = {
      onStart: this.hasOnStart,
      onUpdate: this.hasOnUpdate,
      onInput: this.hasOnInput,
      onCollision: this.hasOnCollision,
    };

    if (!initResult.success) {
      return {
        success: false,
        error: initResult.error,
        previousHooks,
        newHooks,
      };
    }

    return {
      success: true,
      previousHooks,
      newHooks,
    };
  }

  /**
   * Get the number of times this sandbox has been reloaded.
   */
  getReloadCount(): number {
    return this.reloadCount;
  }

  /**
   * Get the current script code.
   */
  getScriptCode(): string {
    return this.config.scriptCode;
  }

  runStart(runtime: SandboxRuntimeContext): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('start') };
    }

    if (!this.hasOnStart) return { success: true };

    const ctx = createScriptContext(runtime);
    const ctxObj = contextToPlainObject(ctx);

    this.engine.setGlobal('__ctx__', ctxObj);
    const result = this.engine.evaluate(
      'if (exports.onStart) exports.onStart(__ctx__);',
      'start'
    );

    if (!result.success) {
      this.lastError = result.error ?? null;
    }
    return result as ScriptResult<void>;
  }

  runUpdate(runtime: SandboxRuntimeContext, dt: number): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('update') };
    }

    if (!this.hasOnUpdate) return { success: true };

    const ctx = createScriptContext(runtime);
    const ctxObj = contextToPlainObject(ctx);

    this.engine.setGlobal('__ctx__', ctxObj);
    this.engine.setGlobal('__dt__', dt);
    const result = this.engine.evaluate(
      'if (exports.onUpdate) exports.onUpdate(__ctx__, __dt__);',
      'update'
    );

    if (!result.success) {
      this.lastError = result.error ?? null;
    }
    return result as ScriptResult<void>;
  }

  runInput(runtime: SandboxRuntimeContext, event: ScriptInputEvent): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('input') };
    }

    if (!this.hasOnInput) return { success: true };

    const ctx = createScriptContext(runtime);
    const ctxObj = contextToPlainObject(ctx);

    this.engine.setGlobal('__ctx__', ctxObj);
    this.engine.setGlobal('__event__', event);
    const result = this.engine.evaluate(
      'if (exports.onInput) exports.onInput(__ctx__, __event__);',
      'input'
    );

    if (!result.success) {
      this.lastError = result.error ?? null;
    }
    return result as ScriptResult<void>;
  }

  runCollision(runtime: SandboxRuntimeContext, collision: ScriptCollisionEvent): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('collision') };
    }

    if (!this.hasOnCollision) return { success: true };

    const ctx = createScriptContext(runtime);
    const ctxObj = contextToPlainObject(ctx);

    this.engine.setGlobal('__ctx__', ctxObj);
    this.engine.setGlobal('__collision__', collision);
    const result = this.engine.evaluate(
      'if (exports.onCollision) exports.onCollision(__ctx__, __collision__);',
      'collision'
    );

    if (!result.success) {
      this.lastError = result.error ?? null;
    }
    return result as ScriptResult<void>;
  }

  /**
   * Call an arbitrary exported function from the script.
   * Used by run_script action to execute specific script functions.
   */
  callFunction(
    runtime: SandboxRuntimeContext,
    functionName: string,
    args?: Record<string, unknown>
  ): ScriptResult<unknown> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('start') };
    }

    const ctx = createScriptContext(runtime);
    const ctxObj = contextToPlainObject(ctx);

    this.engine.setGlobal('__ctx__', ctxObj);
    this.engine.setGlobal('__args__', args ?? {});
    
    const result = this.engine.evaluate(
      `if (exports.${functionName}) exports.${functionName}(__ctx__, __args__);`,
      'start'
    );

    if (!result.success) {
      this.lastError = result.error ?? null;
    }
    return result as ScriptResult<unknown>;
  }

  getLastError(): ScriptErrorReport | null {
    return this.lastError;
  }

  hasHook(hookName: 'onStart' | 'onUpdate' | 'onInput' | 'onCollision'): boolean {
    switch (hookName) {
      case 'onStart': return this.hasOnStart;
      case 'onUpdate': return this.hasOnUpdate;
      case 'onInput': return this.hasOnInput;
      case 'onCollision': return this.hasOnCollision;
    }
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.engine.dispose();
    this.isDisposed = true;
    this.isInitialized = false;
  }

  private createNotReadyError(phase: ScriptErrorReport['phase']): ScriptErrorReport {
    return {
      message: this.isDisposed ? 'Sandbox disposed' : 'Sandbox not initialized',
      type: 'unknown',
      phase,
      frameId: 0,
      timestamp: Date.now(),
    };
  }
}
