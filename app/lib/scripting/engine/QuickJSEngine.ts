import {
  getQuickJS,
  shouldInterruptAfterDeadline,
  isSuccess,
  type QuickJSRuntime,
  type QuickJSContext,
  type QuickJSHandle,
} from 'quickjs-emscripten';
import type {
  ScriptBudgetConfig,
  ScriptResult,
  ScriptErrorReport,
  ScriptErrorType,
} from '../types';
import { DEFAULT_SCRIPT_BUDGET } from '../types';

export interface QuickJSEngineConfig {
  budget?: Partial<ScriptBudgetConfig>;
}

export class QuickJSEngine {
  private runtime: QuickJSRuntime | null = null;
  private context: QuickJSContext | null = null;
  private budget: ScriptBudgetConfig;
  private isInitialized = false;
  private isDisposed = false;

  constructor(config: QuickJSEngineConfig = {}) {
    this.budget = {
      ...DEFAULT_SCRIPT_BUDGET,
      ...config.budget,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const QuickJS = await getQuickJS();
    this.runtime = QuickJS.newRuntime();

    if (this.budget.maxMemoryBytes) {
      this.runtime.setMemoryLimit(this.budget.maxMemoryBytes);
    }

    this.context = this.runtime.newContext();
    this.isInitialized = true;
  }

  setGlobal(name: string, value: unknown): void {
    if (!this.context) throw new Error('Engine not initialized');

    const handle = this.valueToHandle(value);
    this.context.setProp(this.context.global, name, handle);
    handle.dispose();
  }

  evaluate(code: string, phase: ScriptErrorReport['phase'] = 'load'): ScriptResult<unknown> {
    if (this.isDisposed) {
      return {
        success: false,
        error: {
          message: 'Engine disposed',
          type: 'unknown',
          phase,
          frameId: 0,
          timestamp: Date.now(),
        },
      };
    }

    if (!this.isInitialized || !this.context || !this.runtime) {
      return {
        success: false,
        error: {
          message: 'Engine not initialized',
          type: 'unknown',
          phase,
          frameId: 0,
          timestamp: Date.now(),
        },
      };
    }

    try {
      const timeoutMs = phase === 'load' ? this.budget.loadTimeoutMs : this.budget.maxExecutionTimeMs;
      const deadline = Date.now() + timeoutMs;
      this.runtime.setInterruptHandler(shouldInterruptAfterDeadline(deadline));

      const evalResult = this.context.evalCode(code);

      if (isSuccess(evalResult)) {
        const value = this.context.dump(evalResult.value);
        evalResult.value.dispose();
        return { success: true, value };
      } else {
        const error = this.extractError(evalResult.error, phase);
        evalResult.error.dispose();
        return { success: false, error };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: 'unknown',
          phase,
          frameId: 0,
          timestamp: Date.now(),
        },
      };
    }
  }

  callFunction(funcHandle: QuickJSHandle, args: unknown[]): ScriptResult<unknown> {
    if (!this.context) {
      return {
        success: false,
        error: {
          message: 'Engine not initialized',
          type: 'unknown',
          phase: 'update',
          frameId: 0,
          timestamp: Date.now(),
        },
      };
    }

    try {
      const deadline = Date.now() + this.budget.maxExecutionTimeMs;
      this.runtime!.setInterruptHandler(shouldInterruptAfterDeadline(deadline));

      const argHandles = args.map(arg => this.valueToHandle(arg));
      const callResult = this.context.callFunction(funcHandle, this.context.undefined, ...argHandles);

      for (const handle of argHandles) {
        handle.dispose();
      }

      if (isSuccess(callResult)) {
        const value = this.context.dump(callResult.value);
        callResult.value.dispose();
        return { success: true, value };
      } else {
        const error = this.extractError(callResult.error, 'update');
        callResult.error.dispose();
        return { success: false, error };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: 'unknown',
          phase: 'update',
          frameId: 0,
          timestamp: Date.now(),
        },
      };
    }
  }

  getGlobal(name: string): QuickJSHandle | null {
    if (!this.context) return null;
    return this.context.getProp(this.context.global, name);
  }

  private valueToHandle(value: unknown): QuickJSHandle {
    if (!this.context) throw new Error('Engine not initialized');

    if (value === null || value === undefined) {
      return this.context.undefined;
    }
    if (typeof value === 'number') {
      return this.context.newNumber(value);
    }
    if (typeof value === 'string') {
      return this.context.newString(value);
    }
    if (typeof value === 'boolean') {
      return value ? this.context.true : this.context.false;
    }
    if (typeof value === 'function') {
      return this.context.newFunction(
        value.name || 'anonymous',
        (...args: QuickJSHandle[]) => {
          const jsArgs = args.map(arg => this.context!.dump(arg));
          const result = (value as (...args: unknown[]) => unknown)(...jsArgs);
          return this.valueToHandle(result);
        }
      );
    }
    if (Array.isArray(value)) {
      const arrayHandle = this.context.newArray();
      value.forEach((item, index) => {
        const itemHandle = this.valueToHandle(item);
        this.context!.setProp(arrayHandle, index, itemHandle);
        itemHandle.dispose();
      });
      return arrayHandle;
    }
    if (typeof value === 'object') {
      const objHandle = this.context.newObject();
      for (const [key, val] of Object.entries(value)) {
        const valHandle = this.valueToHandle(val);
        this.context.setProp(objHandle, key, valHandle);
        valHandle.dispose();
      }
      return objHandle;
    }
    return this.context.newString(String(value));
  }

  private extractError(errorHandle: QuickJSHandle, phase: ScriptErrorReport['phase']): ScriptErrorReport {
    if (!this.context) {
      return {
        message: 'Unknown error',
        type: 'unknown',
        phase,
        frameId: 0,
        timestamp: Date.now(),
      };
    }

    const messageHandle = this.context.getProp(errorHandle, 'message');
    const message = (this.context.dump(messageHandle) as string) || 'Unknown error';
    messageHandle.dispose();

    const stackHandle = this.context.getProp(errorHandle, 'stack');
    const stack = this.context.dump(stackHandle) as string | undefined;
    stackHandle.dispose();

    const nameHandle = this.context.getProp(errorHandle, 'name');
    const errorName = (this.context.dump(nameHandle) as string) || '';
    nameHandle.dispose();

    let type: ScriptErrorType = 'runtime';
    if (errorName === 'SyntaxError' || message.includes('SyntaxError')) {
      type = 'syntax';
    } else if (this.isSyntaxErrorMessage(message)) {
      type = 'syntax';
    } else if (message.includes('interrupted')) {
      type = 'timeout';
    } else if (message.includes('out of memory')) {
      type = 'memory';
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

  dispose(): void {
    if (this.context) {
      this.context.dispose();
      this.context = null;
    }
    if (this.runtime) {
      this.runtime.dispose();
      this.runtime = null;
    }
    this.isInitialized = false;
    this.isDisposed = true;
  }
}
