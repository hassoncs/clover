import { SLOPCADE_MODULES } from "@slopcade/shared/scripting/modules";
import { QuickJSEngine } from "./engine/QuickJSEngine";
import type {
	IScriptSandbox,
	ScriptHookName,
	ScriptLogEntry,
	ScriptReloadResult,
	ScriptRuntimeContext,
} from "./IScriptSandbox";
import type {
	ScriptCollisionEnterEvent,
	ScriptCollisionEvent,
	ScriptCollisionExitEvent,
	ScriptContext,
	ScriptErrorReport,
	ScriptInputEvent,
	ScriptResult,
	ScriptSandboxConfig,
} from "./types";

export class QuickJSScriptSandbox implements IScriptSandbox {
	private config: ScriptSandboxConfig;
	private engine: QuickJSEngine;
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
			const errorReport = this.createErrorReport(error, "load");
			this.lastError = errorReport;
			return { success: false, error: errorReport };
		}
	}

	private setupConsole(): void {
		this.engine.setupConsole({
			log: (...args: unknown[]) => {
				this.logs.push({ level: "log", args, timestamp: Date.now() });
				if (this.logs.length > this.maxLogs) this.logs.shift();
				console.log("[Script]", ...args);
			},
			warn: (...args: unknown[]) => {
				this.logs.push({ level: "warn", args, timestamp: Date.now() });
				if (this.logs.length > this.maxLogs) this.logs.shift();
				console.warn("[Script]", ...args);
			},
			error: (...args: unknown[]) => {
				this.logs.push({ level: "error", args, timestamp: Date.now() });
				if (this.logs.length > this.maxLogs) this.logs.shift();
				console.error("[Script]", ...args);
			},
		});
	}

	private buildRequirePrelude(): string {
		const moduleEntries = Object.entries(SLOPCADE_MODULES)
			.map(
				([name, source]) =>
					`${JSON.stringify(name)}: ${JSON.stringify(source)}`,
			)
			.join(",\n");

		return `
      var __modules = {${moduleEntries}};
      var __moduleCache = {};
      function require(name) {
        if (__moduleCache[name]) return __moduleCache[name];
        var src = __modules[name];
        if (!src) throw new Error("Module not found: " + name);
        var mod = { exports: {} };
        var fn = new Function("module", "exports", src);
        fn(mod, mod.exports);
        __moduleCache[name] = mod.exports;
        return mod.exports;
      }
    `;
	}

	private async compileScript(scriptCode: string): Promise<ScriptResult<void>> {
		const requirePrelude = this.buildRequirePrelude();
		const wrappedCode = `
      (function() {
        "use strict";
        const exports = {};
        ${requirePrelude}
        ${scriptCode}
        globalThis.__exports = exports;
        return exports;
      })()
    `;

		const evalResult = this.engine.evaluate(wrappedCode, "load");
		if (!evalResult.success) {
			this.lastError = evalResult.error ?? null;
			return evalResult as ScriptResult<void>;
		}

		return { success: true };
	}

	async reload(newScriptCode: string): Promise<ScriptReloadResult> {
		const previousHooks = {
			onStart: this.hasHook("onStart"),
			onUpdate: this.hasHook("onUpdate"),
			onInput: this.hasHook("onInput"),
			onCollision: this.hasHook("onCollision"),
			onCollisionEnter: this.hasHook("onCollisionEnter"),
			onCollisionExit: this.hasHook("onCollisionExit"),
			onNetworkState: this.hasHook("onNetworkState"),
			onPhaseChange: this.hasHook("onPhaseChange"),
		};

		this.config = { ...this.config, scriptCode: newScriptCode };
		this.isInitialized = false;
		this.lastError = null;

		this.engine.dispose();
		this.engine = new QuickJSEngine({ budget: this.config.budget });

		const initResult = await this.initialize();
		this.reloadCount++;

		const newHooks = {
			onStart: this.hasHook("onStart"),
			onUpdate: this.hasHook("onUpdate"),
			onInput: this.hasHook("onInput"),
			onCollision: this.hasHook("onCollision"),
			onCollisionEnter: this.hasHook("onCollisionEnter"),
			onCollisionExit: this.hasHook("onCollisionExit"),
			onNetworkState: this.hasHook("onNetworkState"),
			onPhaseChange: this.hasHook("onPhaseChange"),
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

	runStart(runtime: ScriptRuntimeContext): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("start") };
		}

		if (!this.hasHook("onStart")) {
			return { success: true };
		}

		return this.callHook("onStart", runtime, "start");
	}

	runUpdate(runtime: ScriptRuntimeContext, dt: number): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("update") };
		}

		if (!this.hasHook("onUpdate")) {
			return { success: true };
		}

		return this.callHook("onUpdate", runtime, "update", dt);
	}

	runInput(
		runtime: ScriptRuntimeContext,
		event: ScriptInputEvent,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("input") };
		}

		if (!this.hasHook("onInput")) {
			return { success: true };
		}

		return this.callHook("onInput", runtime, "input", event);
	}

	runCollision(
		runtime: ScriptRuntimeContext,
		collision: ScriptCollisionEvent,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("collision") };
		}

		if (!this.hasHook("onCollision")) {
			return { success: true };
		}

		return this.callHook("onCollision", runtime, "collision", collision);
	}

	runCollisionEnter(
		runtime: ScriptRuntimeContext,
		event: ScriptCollisionEnterEvent,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return {
				success: false,
				error: this.createNotReadyError("collisionEnter"),
			};
		}

		if (!this.hasHook("onCollisionEnter")) {
			return { success: true };
		}

		return this.callHook("onCollisionEnter", runtime, "collisionEnter", event);
	}

	runCollisionExit(
		runtime: ScriptRuntimeContext,
		event: ScriptCollisionExitEvent,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return {
				success: false,
				error: this.createNotReadyError("collisionExit"),
			};
		}

		if (!this.hasHook("onCollisionExit")) {
			return { success: true };
		}

		return this.callHook("onCollisionExit", runtime, "collisionExit", event);
	}

	runNetworkState(
		runtime: ScriptRuntimeContext,
		state: Record<string, unknown>,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return {
				success: false,
				error: this.createNotReadyError("networkState"),
			};
		}

		if (!this.hasHook("onNetworkState")) {
			return { success: true };
		}

		return this.callHook("onNetworkState", runtime, "networkState", state);
	}

	runPhaseChange(
		runtime: ScriptRuntimeContext,
		phase: string,
		data?: Record<string, unknown>,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("phaseChange") };
		}

		if (!this.hasHook("onPhaseChange")) {
			return { success: true };
		}

		return this.callHook(
			"onPhaseChange",
			runtime,
			"phaseChange",
			phase,
			data ?? {},
		);
	}

	private callHook(
		hookName: ScriptHookName,
		runtime: ScriptRuntimeContext,
		phase: ScriptErrorReport["phase"],
		...extraArgs: unknown[]
	): ScriptResult<void> {
		try {
			const ctxObj = this.createContextObject(runtime);

			const callCode = `
        (function() {
          const result = globalThis.__exports.${hookName}(${JSON.stringify(ctxObj)}${extraArgs.length > 0 ? ", " + extraArgs.map((a) => JSON.stringify(a)).join(", ") : ""});
          if (result && typeof result === 'object' && typeof result.then === 'function') {
            return "__ASYNC_PROMISE_DETECTED__";
          }
          return result;
        })()
      `;

			const result = this.engine.evaluate(callCode, phase);
			if (!result.success) {
				this.lastError = result.error ?? null;
				return result as ScriptResult<void>;
			}

			if (result.value === "__ASYNC_PROMISE_DETECTED__") {
				const message = `[ScriptSandbox] Hook "${hookName}" returned a Promise. Async hooks are not allowed. Script disabled.`;
				console.error(message);
				this.dispose();

				const errorReport: ScriptErrorReport = {
					message,
					type: "runtime",
					phase,
					frameId: 0,
					timestamp: Date.now(),
				};
				this.lastError = errorReport;
				return { success: false, error: errorReport };
			}

			return { success: true };
		} catch (error) {
			const errorReport = this.createErrorReport(error, phase);
			this.lastError = errorReport;
			return { success: false, error: errorReport };
		}
	}

	callFunction(
		runtime: ScriptRuntimeContext,
		functionName: string,
		args?: Record<string, unknown>,
	): ScriptResult<unknown> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("start") };
		}

		const checkCode = `typeof globalThis.__exports?.${functionName} === 'function'`;
		const checkResult = this.engine.evaluate(checkCode, "update");
		if (!checkResult.success || checkResult.value !== true) {
			return { success: true, value: undefined };
		}

		try {
			const ctxObj = this.createContextObject(runtime);

			const callCode = `globalThis.__exports.${functionName}(${JSON.stringify(ctxObj)}, ${JSON.stringify(args ?? {})})`;
			const result = this.engine.evaluate(callCode, "update");

			if (!result.success) {
				this.lastError = result.error ?? null;
				return result;
			}

			return { success: true, value: result.value };
		} catch (error) {
			const errorReport = this.createErrorReport(error, "start");
			this.lastError = errorReport;
			return { success: false, error: errorReport };
		}
	}

	private createContextObject(
		runtime: ScriptRuntimeContext,
	): Record<string, unknown> {
		return runtime as unknown as Record<string, unknown>;
	}

	getLastError(): ScriptErrorReport | null {
		return this.lastError;
	}

	hasHook(hookName: ScriptHookName): boolean {
		const checkCode = `typeof globalThis.__exports?.${hookName} === 'function'`;
		const result = this.engine.evaluate(checkCode, "load");
		return result.success && result.value === true;
	}

	getLogs(since?: number): ScriptLogEntry[] {
		if (since === undefined) return [...this.logs];
		return this.logs.filter((log) => log.timestamp >= since);
	}

	clearLogs(): void {
		this.logs = [];
	}

	dispose(): void {
		if (this.isDisposed) return;
		this.engine.dispose();
		this.isDisposed = true;
		this.isInitialized = false;
	}

	private createNotReadyError(
		phase: ScriptErrorReport["phase"],
	): ScriptErrorReport {
		return {
			message: this.isDisposed ? "Sandbox disposed" : "Sandbox not initialized",
			type: "unknown",
			phase,
			frameId: 0,
			timestamp: Date.now(),
		};
	}

	private createErrorReport(
		error: unknown,
		phase: ScriptErrorReport["phase"],
	): ScriptErrorReport {
		const message = error instanceof Error ? error.message : String(error);
		const stack = error instanceof Error ? error.stack : undefined;

		return {
			message,
			type: "runtime",
			stack,
			phase,
			frameId: 0,
			timestamp: Date.now(),
		};
	}
}
