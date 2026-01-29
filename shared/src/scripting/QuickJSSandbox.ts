import { getQuickJS, shouldInterruptAfterDeadline, isSuccess, type QuickJSRuntime, type QuickJSContext, type QuickJSHandle } from 'quickjs-emscripten';
import type { BudgetConfig, ScriptResult, ScriptError } from './types.js';
import { DEFAULT_BUDGET } from './types.js';

export class QuickJSSandbox {
  private runtime: QuickJSRuntime | null = null;
  private context: QuickJSContext | null = null;
  private budgetConfig: Required<BudgetConfig>;
  private instructionCount = 0;
  private deadline = 0;
  private interruptHandler: (() => boolean) | null = null;
  private isInitialized = false;
  private isDisposed = false;

  constructor(budgetConfig?: Partial<BudgetConfig>) {
    this.budgetConfig = { ...DEFAULT_BUDGET, ...budgetConfig };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const QuickJS = await getQuickJS();
    this.runtime = QuickJS.newRuntime();

    if (this.budgetConfig.maxMemoryBytes !== undefined) {
      this.runtime.setMemoryLimit(this.budgetConfig.maxMemoryBytes);
    }

    this.setupInterruptHandler();
    this.context = this.runtime.newContext();
    this.isInitialized = true;
    this.isDisposed = false;
  }

  private setupInterruptHandler(): void {
    this.instructionCount = 0;
    this.deadline = Date.now() + this.budgetConfig.maxExecutionTimeMs;

    this.interruptHandler = () => {
      this.instructionCount++;

      if (this.instructionCount > this.budgetConfig.maxInstructions) {
        return true;
      }

      if (Date.now() > this.deadline) {
        return true;
      }

      return false;
    };

    this.runtime?.setInterruptHandler(this.interruptHandler);
  }

  async evaluate(code: string, context?: Record<string, unknown>): Promise<ScriptResult> {
    if (this.isDisposed) {
      return {
        success: false,
        error: {
          message: 'Sandbox has been disposed',
          type: 'unknown',
        },
      };
    }

    if (!this.isInitialized || !this.context || !this.runtime) {
      await this.initialize();
    }

    try {
      if (context) {
        const contextHandle = this.context!.newObject();
        for (const [key, value] of Object.entries(context)) {
          const valueHandle = this.valueToHandle(value);
          this.context!.setProp(contextHandle, key, valueHandle);
          valueHandle.dispose();
        }
        this.context!.setProp(this.context!.global, 'ctx', contextHandle);
        contextHandle.dispose();
      }

      this.runtime!.setInterruptHandler(shouldInterruptAfterDeadline(this.deadline));

      const evalResult = this.context!.evalCode(code);

      if (isSuccess(evalResult)) {
        const value = this.context!.dump(evalResult.value);
        evalResult.value.dispose();

        return {
          success: true,
          value,
        };
      } else {
        const errorHandle = evalResult.error;
        const error = this.extractError(errorHandle);
        errorHandle.dispose();

        return {
          success: false,
          error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
          type: 'unknown',
        },
      };
    }
  }

  private valueToHandle(value: unknown): QuickJSHandle {
    if (value === null || value === undefined) {
      return this.context!.null;
    }
    if (typeof value === 'number') {
      return this.context!.newNumber(value);
    }
    if (typeof value === 'string') {
      return this.context!.newString(value);
    }
    if (typeof value === 'boolean') {
      return value ? this.context!.true : this.context!.false;
    }
    return this.context!.newString(JSON.stringify(value));
  }

  private extractError(errorHandle: QuickJSHandle): ScriptError {
    const messageHandle = this.context!.getProp(errorHandle, 'message');
    const message = this.context!.dump(messageHandle) as string ?? 'Unknown error';
    messageHandle.dispose();

    const nameHandle = this.context!.getProp(errorHandle, 'name');
    const name = this.context!.dump(nameHandle) as string | undefined;
    nameHandle.dispose();

    const stackHandle = this.context!.getProp(errorHandle, 'stack');
    const stack = this.context!.dump(stackHandle) as string | undefined;
    stackHandle.dispose();

    let type: ScriptError['type'];
    if (name === 'SyntaxError' || message.includes('SyntaxError')) {
      type = 'syntax';
    } else if (message.includes('RangeError') || message.includes('recursion')) {
      type = 'runtime';
    } else if (message.includes('out of memory') || message.includes('memory')) {
      type = 'memory';
    } else if (this.instructionCount > this.budgetConfig.maxInstructions || Date.now() > this.deadline) {
      type = 'timeout';
    } else {
      type = 'runtime';
    }

    return {
      message,
      type,
      name,
      stack,
    };
  }

  getInstructionCount(): number {
    return this.instructionCount;
  }

  resetBudget(): void {
    this.instructionCount = 0;
    this.deadline = Date.now() + this.budgetConfig.maxExecutionTimeMs;
    this.setupInterruptHandler();
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

    this.interruptHandler = null;
    this.isInitialized = false;
    this.isDisposed = true;
  }
}
