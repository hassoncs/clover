/**
 * UNSAFE: Eval-based script sandbox. Uses new Function() with NO SECURITY ISOLATION.
 *
 * This is a TEMPORARY implementation for development only.
 * DO NOT use in production - user scripts can access the full JS runtime.
 *
 * Will be replaced by QuickJSScriptSandbox before production launch.
 */

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
  ScriptErrorType,
} from './types';

const _nativeConsole = globalThis.console;

type HookFunction = (ctx: Record<string, unknown>, ...args: unknown[]) => void;

interface CompiledExports {
  onStart?: HookFunction;
  onUpdate?: HookFunction;
  onInput?: HookFunction;
  onCollision?: HookFunction;
  [key: string]: unknown;
}

export class UnsafeScriptSandbox implements IScriptSandbox {
  private config: ScriptSandboxConfig;
  private exports: CompiledExports = {};
  private isInitialized = false;
  private isDisposed = false;
  private lastError: ScriptErrorReport | null = null;
  private reloadCount = 0;
  private logs: ScriptLogEntry[] = [];
  private maxLogs = 500;

  private sandboxConsole = {
    log: (...args: unknown[]) => {
      this.logs.push({ level: 'log', args, timestamp: Date.now() });
      if (this.logs.length > this.maxLogs) this.logs.shift();
      _nativeConsole.log('[Script]', ...args);
    },
    warn: (...args: unknown[]) => {
      this.logs.push({ level: 'warn', args, timestamp: Date.now() });
      if (this.logs.length > this.maxLogs) this.logs.shift();
      _nativeConsole.warn('[Script]', ...args);
    },
    error: (...args: unknown[]) => {
      this.logs.push({ level: 'error', args, timestamp: Date.now() });
      if (this.logs.length > this.maxLogs) this.logs.shift();
      _nativeConsole.error('[Script]', ...args);
    },
  };

  constructor(config: ScriptSandboxConfig) {
    this.config = config;
  }

  async initialize(): Promise<ScriptResult<void>> {
    if (this.isInitialized) return { success: true };

    try {
      this.exports = this.compileScript(this.config.scriptCode);
      this.isInitialized = true;
      return { success: true };
    } catch (error) {
      const errorReport = this.createErrorReport(error, 'load');
      this.lastError = errorReport;
      return { success: false, error: errorReport };
    }
  }

  private compileScript(scriptCode: string): CompiledExports {
    const wrappedCode = `
      "use strict";
      return (function(exports, console) {
        ${scriptCode}
        return exports;
      })(exports, console);
    `;

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const factory = new Function('exports', 'console', wrappedCode);
    const exports: CompiledExports = {};
    return factory(exports, this.sandboxConsole) ?? exports;
  }

  async reload(newScriptCode: string): Promise<ScriptReloadResult> {
    const previousHooks = {
      onStart: this.hasHook('onStart'),
      onUpdate: this.hasHook('onUpdate'),
      onInput: this.hasHook('onInput'),
      onCollision: this.hasHook('onCollision'),
    };

    this.config = { ...this.config, scriptCode: newScriptCode };
    this.exports = {};
    this.isInitialized = false;
    this.lastError = null;

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

    if (typeof this.exports.onStart !== 'function') {
      return { success: true };
    }

    return this.callHook('onStart', runtime);
  }

  runUpdate(runtime: SandboxRuntimeContext, dt: number): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('update') };
    }

    if (typeof this.exports.onUpdate !== 'function') {
      return { success: true };
    }

    return this.callHook('onUpdate', runtime, dt);
  }

  runInput(runtime: SandboxRuntimeContext, event: ScriptInputEvent): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('input') };
    }

    if (typeof this.exports.onInput !== 'function') {
      return { success: true };
    }

    return this.callHook('onInput', runtime, event);
  }

  runCollision(runtime: SandboxRuntimeContext, collision: ScriptCollisionEvent): ScriptResult<void> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('collision') };
    }

    if (typeof this.exports.onCollision !== 'function') {
      return { success: true };
    }

    return this.callHook('onCollision', runtime, collision);
  }

  callFunction(
    runtime: SandboxRuntimeContext,
    functionName: string,
    args?: Record<string, unknown>
  ): ScriptResult<unknown> {
    if (!this.isInitialized || this.isDisposed) {
      return { success: false, error: this.createNotReadyError('start') };
    }

    const fn = this.exports[functionName];
    if (typeof fn !== 'function') {
      return { success: true, value: undefined };
    }

    try {
      const ctx = createScriptContext(runtime);
      const ctxObj = contextToPlainObject(ctx);
      const result = fn(ctxObj, args ?? {});
      return { success: true, value: result };
    } catch (error) {
      const errorReport = this.createErrorReport(error, 'start');
      this.lastError = errorReport;
      return { success: false, error: errorReport };
    }
  }

  private callHook(
    hookName: 'onStart' | 'onUpdate' | 'onInput' | 'onCollision',
    runtime: SandboxRuntimeContext,
    ...extraArgs: unknown[]
  ): ScriptResult<void> {
    try {
      const ctx = createScriptContext(runtime);
      const ctxObj = contextToPlainObject(ctx);
      const fn = this.exports[hookName] as HookFunction;
      fn(ctxObj, ...extraArgs);
      return { success: true };
    } catch (error) {
      const phase = hookName === 'onStart' ? 'start' 
        : hookName === 'onUpdate' ? 'update'
        : hookName === 'onInput' ? 'input'
        : 'collision';
      const errorReport = this.createErrorReport(error, phase);
      this.lastError = errorReport;
      return { success: false, error: errorReport };
    }
  }

  getLastError(): ScriptErrorReport | null {
    return this.lastError;
  }

  hasHook(hookName: ScriptHookName): boolean {
    return typeof this.exports[hookName] === 'function';
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
    this.exports = {};
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

    let type: ScriptErrorType = 'runtime';
    if (error instanceof SyntaxError || this.isSyntaxErrorMessage(message)) {
      type = 'syntax';
    }

    return {
      message,
      type,
      stack,
      phase,
      frameId: 0,
      timestamp: Date.now(),
    };
  }

  private isSyntaxErrorMessage(message: string): boolean {
    const syntaxPatterns = [
      /^expecting /i,
      /^unexpected token/i,
      /^unterminated /i,
      /^invalid /i,
      /^missing /i,
    ];
    return syntaxPatterns.some(pattern => pattern.test(message));
  }
}
