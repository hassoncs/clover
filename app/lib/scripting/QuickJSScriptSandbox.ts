import type { QuickJSHandle } from 'quickjs-emscripten-core';
import { QuickJSEngine } from './engine/QuickJSEngine';
import { createScriptContext, contextToPlainObject } from './GameScriptAPI';
import type {
  IScriptSandbox,
  ScriptReloadResult,
  ScriptLogEntry,
  ScriptHookName,
} from './IScriptSandbox';
import type {
  ScriptSandboxConfig,
  ScriptResult,
  ScriptErrorReport,
  ScriptInputEvent,
  ScriptCollisionEvent,
  SandboxRuntimeContext,
} from './types';

interface HookHandles {
  onStart: QuickJSHandle | null;
  onUpdate: QuickJSHandle | null;
  onInput: QuickJSHandle | null;
  onCollision: QuickJSHandle | null;
}

export class QuickJSScriptSandbox implements IScriptSandbox {
  private config: ScriptSandboxConfig;
  private engine: QuickJSEngine;
  private hookHandles: HookHandles = {
    onStart: null,
    onUpdate: null,
    onInput: null,
    onCollision: null,
  };
  private exportedFunctions: Map<string, QuickJSHandle> = new Map();
  private isInitialized = false;
  private isDisposed = false;
  private lastError: ScriptErrorReport | null = null;
  private reloadCount = 0;
  private logs: ScriptLogEntry[] = [];
  private maxLogs = 500;

  constructor(config: ScriptSandboxConfig) {
    this.config = config;
    this.engine = new QuickJSEngine({ budget: config.budget });
  }

  async initialize(): Promise<ScriptResult<void>> {
    if (this.isInitialized) return { success: true };

    try {
      await this.engine.initialize();
      this.setupConsole();
      const result = await this.compileScript(this.config.scriptCode);
      if (!result.success) {
        return result;
      }
      this.isInitialized = true;
      return { success: true };
    } catch (error) {
      const errorReport = this.createErrorReport(error, 'load');
      this.lastError = errorReport;
      return { success: false, error: errorReport };
    }
  }

  private setupConsole(): void {
    this.engine.setupConsole({
      log: (...args: unknown[]) => {
        this.logs.push({ level: 'log', args, timestamp: Date.now() });
        if (this.logs.length > this.maxLogs) this.logs.shift();
        console.log('[Script]', ...args);
      },
      warn: (...args: unknown[]) => {
        this.logs.push({ level: 'warn', args, timestamp: Date.now() });
        if (this.logs.length > this.maxLogs) this.logs.shift();
        console.warn('[Script]', ...args);
      },
      error: (...args: unknown[]) => {
        this.logs.push({ level: 'error', args, timestamp: Date.now() });
        if (this.logs.length > this.maxLogs) this.logs.shift();
        console.error('[Script]', ...args);
      },
    });
  }

  private async compileScript(scriptCode: string): Promise<ScriptResult<void>> {
    const wrappedCode = `
      (function() {
        "use strict";
        const exports = {};
        ${scriptCode}
        return exports;
      })()
    `;

    const evalResult = this.engine.evaluate(wrappedCode, 'load');
    if (!evalResult.success) {
      this.lastError = evalResult.error ?? null;
      return evalResult as ScriptResult<void>;
    }

    const exportsHandle = this.engine.getGlobal('__lastResult');
    if (!exportsHandle) {
      const wrappedCode2 = `
        (function() {
          "use strict";
          const exports = {};
          ${scriptCode}
          globalThis.__exports = exports;
        })()
      `;
      const evalResult2 = this.engine.evaluate(wrappedCode2, 'load');
      if (!evalResult2.success) {
        this.lastError = evalResult2.error ?? null;
        return evalResult2 as ScriptResult<void>;
      }
    }

    this.extractHooks();
    return { success: true };
  }

  private extractHooks(): void {
    const hookNames: ScriptHookName[] = ['onStart', 'onUpdate', 'onInput', 'onCollision'];

    for (const hookName of hookNames) {
      const checkCode = `typeof globalThis.__exports?.${hookName} === 'function'`;
      const checkResult = this.engine.evaluate(checkCode, 'load');
      
      if (checkResult.success && checkResult.value === true) {
        const getCode = `globalThis.__exports.${hookName}`;
        const handle = this.engine.getGlobal('__exports');
        if (handle) {
          this.hookHandles[hookName] = handle;
        }
      }
    }
  }

  async reload(newScriptCode: string): Promise<ScriptReloadResult> {
    const previousHooks = {
      onStart: this.hasHook('onStart'),
      onUpdate: this.hasHook('onUpdate'),
      onInput: this.hasHook('onInput'),
      onCollision: this.hasHook('onCollision'),
    };

    this.disposeHooks();
    this.config = { ...this.config, scriptCode: newScriptCode };
    this.isInitialized = false;
    this.lastError = null;

    this.engine.dispose();
    this.engine = new QuickJSEngine({ budget: this.config.budget });

    const initResult = await this.initialize();
    this.reloadCount++;

    const newHooks = {
      onStart: this.hasHook('onStart'),
      onUpdate: this.hasHook('onUpdate'),
      onInput: this.hasHook('onInput'),
      onCollision: this.hasHook('onCollision'),
    };

    if (!initResult.success) {
      return {
        success: false,
        error: initResult.error,
        previousHooks,
        newHooks,
      };
    }

    return { success: true, previousHooks, newHooks };
  }

  private disposeHooks(): void {
    for (const handle of Object.values(this.hookHandles)) {
      if (handle) {
        handle.dispose();
      }
    }
    this.hookHandles = {
      onStart: null,
      onUpdate: null,
      onInput: null,
      onCollision: null,
    };
    for (const handle of this.exportedFunctions.values()) {
      handle.dispose();
    }
    this.exportedFunctions.clear();
  }

  getReloadCount(): number {
    return this.reloadCount;
  }

  getScriptCode(): string {
    return this.config.scriptCode;
  }

  runStart(runtime: SandboxRuntimeContext): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('start') };
    }

    if (!this.hasHook('onStart')) {
      return { success: true };
    }

    return this.callHook('onStart', runtime, 'start');
  }

  runUpdate(runtime: SandboxRuntimeContext, dt: number): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('update') };
    }

    if (!this.hasHook('onUpdate')) {
      return { success: true };
    }

    return this.callHook('onUpdate', runtime, 'update', dt);
  }

  runInput(runtime: SandboxRuntimeContext, event: ScriptInputEvent): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('input') };
    }

    if (!this.hasHook('onInput')) {
      return { success: true };
    }

    return this.callHook('onInput', runtime, 'input', event);
  }

  runCollision(runtime: SandboxRuntimeContext, collision: ScriptCollisionEvent): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('collision') };
    }

    if (!this.hasHook('onCollision')) {
      return { success: true };
    }

    return this.callHook('onCollision', runtime, 'collision', collision);
  }

  private callHook(
    hookName: ScriptHookName,
    runtime: SandboxRuntimeContext,
    phase: ScriptErrorReport['phase'],
    ...extraArgs: unknown[]
  ): ScriptResult<void> {
    try {
      const ctx = createScriptContext(runtime);
      const ctxObj = contextToPlainObject(ctx);

      const callCode = `globalThis.__exports.${hookName}(${JSON.stringify(ctxObj)}${extraArgs.length > 0 ? ', ' + extraArgs.map(a => JSON.stringify(a)).join(', ') : ''})`;
      
      const result = this.engine.evaluate(callCode, phase);
      if (!result.success) {
        this.lastError = result.error ?? null;
        return result as ScriptResult<void>;
      }

      return { success: true };
    } catch (error) {
      const errorReport = this.createErrorReport(error, phase);
      this.lastError = errorReport;
      return { success: false, error: errorReport };
    }
  }

  callFunction(
    runtime: SandboxRuntimeContext,
    functionName: string,
    args?: Record<string, unknown>
  ): ScriptResult<unknown> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('start') };
    }

    const checkCode = `typeof globalThis.__exports?.${functionName} === 'function'`;
    const checkResult = this.engine.evaluate(checkCode, 'update');
    if (!checkResult.success || checkResult.value !== true) {
      return { success: true, value: undefined };
    }

    try {
      const ctx = createScriptContext(runtime);
      const ctxObj = contextToPlainObject(ctx);

      const callCode = `globalThis.__exports.${functionName}(${JSON.stringify(ctxObj)}, ${JSON.stringify(args ?? {})})`;
      const result = this.engine.evaluate(callCode, 'update');
      
      if (!result.success) {
        this.lastError = result.error ?? null;
        return result;
      }

      return { success: true, value: result.value };
    } catch (error) {
      const errorReport = this.createErrorReport(error, 'start');
      this.lastError = errorReport;
      return { success: false, error: errorReport };
    }
  }

  getLastError(): ScriptErrorReport | null {
    return this.lastError;
  }

  hasHook(hookName: ScriptHookName): boolean {
    const checkCode = `typeof globalThis.__exports?.${hookName} === 'function'`;
    const result = this.engine.evaluate(checkCode, 'load');
    return result.success && result.value === true;
  }

  getLogs(since?: number): ScriptLogEntry[] {
    if (since === undefined) return [...this.logs];
    return this.logs.filter(log => log.timestamp >= since);
  }

  clearLogs(): void {
    this.logs = [];
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.disposeHooks();
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

  private createErrorReport(error: unknown, phase: ScriptErrorReport['phase']): ScriptErrorReport {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    return {
      message,
      type: 'runtime',
      stack,
      phase,
      frameId: 0,
      timestamp: Date.now(),
    };
  }
}
