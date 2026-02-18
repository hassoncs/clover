/**
 * UNSAFE: Eval-based script sandbox. Uses new Function() with NO SECURITY ISOLATION.
 *
 * This is a TEMPORARY implementation for development only.
 * DO NOT use in production - user scripts can access the full JS runtime.
 *
 * Will be replaced by QuickJSScriptSandbox before production launch.
 */

import { SLOPCADE_MODULES } from "@slopcade/shared/scripting/modules";
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
	ScriptErrorType,
	ScriptInputEvent,
	ScriptResult,
	ScriptSandboxConfig,
} from "./types";

const _nativeConsole = globalThis.console;

type HookFunction = (ctx: Record<string, unknown>, ...args: unknown[]) => void;

interface CompiledExports {
	onStart?: HookFunction;
	onUpdate?: HookFunction;
	onInput?: HookFunction;
	onCollision?: HookFunction;
	onCollisionEnter?: HookFunction;
	onCollisionExit?: HookFunction;
	onNetworkState?: HookFunction;
	onPhaseChange?: HookFunction;
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
			this.logs.push({ level: "log", args, timestamp: Date.now() });
			if (this.logs.length > this.maxLogs) this.logs.shift();
			_nativeConsole.log("[Script]", ...args);
		},
		warn: (...args: unknown[]) => {
			this.logs.push({ level: "warn", args, timestamp: Date.now() });
			if (this.logs.length > this.maxLogs) this.logs.shift();
			_nativeConsole.warn("[Script]", ...args);
		},
		error: (...args: unknown[]) => {
			this.logs.push({ level: "error", args, timestamp: Date.now() });
			if (this.logs.length > this.maxLogs) this.logs.shift();
			_nativeConsole.error("[Script]", ...args);
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
			const errorReport = this.createErrorReport(error, "load");
			this.lastError = errorReport;
			return { success: false, error: errorReport };
		}
	}

	private buildRequireFunction(): (name: string) => unknown {
		const moduleCache: Record<string, unknown> = {};
		return (name: string) => {
			if (moduleCache[name]) return moduleCache[name];
			const src = SLOPCADE_MODULES[name];
			if (!src) throw new Error(`Module not found: ${name}`);
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			const fn = new Function("module", "exports", src);
			const mod = { exports: {} as Record<string, unknown> };
			fn(mod, mod.exports);
			moduleCache[name] = mod.exports;
			return mod.exports;
		};
	}

	private compileScript(scriptCode: string): CompiledExports {
		const wrappedCode = `
      "use strict";
      return (function(exports, console, require) {
        ${scriptCode}
        return exports;
      })(exports, console, require);
    `;

		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		const factory = new Function("exports", "console", "require", wrappedCode);
		const exports: CompiledExports = {};
		const requireFn = this.buildRequireFunction();
		return factory(exports, this.sandboxConsole, requireFn) ?? exports;
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
		this.exports = {};
		this.isInitialized = false;
		this.lastError = null;

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

		if (typeof this.exports.onStart !== "function") {
			return { success: true };
		}

		return this.callHook("onStart", runtime);
	}

	runUpdate(runtime: ScriptRuntimeContext, dt: number): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("update") };
		}

		if (typeof this.exports.onUpdate !== "function") {
			return { success: true };
		}

		return this.callHook("onUpdate", runtime, dt);
	}

	runInput(
		runtime: ScriptRuntimeContext,
		event: ScriptInputEvent,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("input") };
		}

		if (typeof this.exports.onInput !== "function") {
			return { success: true };
		}

		return this.callHook("onInput", runtime, event);
	}

	runCollision(
		runtime: ScriptRuntimeContext,
		collision: ScriptCollisionEvent,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("collision") };
		}

		if (typeof this.exports.onCollision !== "function") {
			return { success: true };
		}

		return this.callHook("onCollision", runtime, collision);
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

		if (typeof this.exports.onCollisionEnter !== "function") {
			return { success: true };
		}

		return this.callHook("onCollisionEnter", runtime, event);
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

		if (typeof this.exports.onCollisionExit !== "function") {
			return { success: true };
		}

		return this.callHook("onCollisionExit", runtime, event);
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

		if (typeof this.exports.onNetworkState !== "function") {
			return { success: true };
		}

		return this.callHook("onNetworkState", runtime, state);
	}

	runPhaseChange(
		runtime: ScriptRuntimeContext,
		phase: string,
		data?: Record<string, unknown>,
	): ScriptResult<void> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("phaseChange") };
		}

		if (typeof this.exports.onPhaseChange !== "function") {
			return { success: true };
		}

		return this.callHook("onPhaseChange", runtime, phase, data ?? {});
	}

	callFunction(
		runtime: ScriptRuntimeContext,
		functionName: string,
		args?: Record<string, unknown>,
	): ScriptResult<unknown> {
		if (!this.isInitialized || this.isDisposed) {
			return { success: false, error: this.createNotReadyError("start") };
		}

		const fn = this.exports[functionName];
		if (typeof fn !== "function") {
			return { success: true, value: undefined };
		}

		try {
			const ctxObj = this.createContextObject(runtime);
			const result = fn(ctxObj, args ?? {});
			return { success: true, value: result };
		} catch (error) {
			const errorReport = this.createErrorReport(error, "start");
			this.lastError = errorReport;
			return { success: false, error: errorReport };
		}
	}

	private static readonly hookPhaseMap: Record<
		string,
		ScriptErrorReport["phase"]
	> = {
		onStart: "start",
		onUpdate: "update",
		onInput: "input",
		onCollision: "collision",
		onCollisionEnter: "collisionEnter",
		onCollisionExit: "collisionExit",
		onNetworkState: "networkState",
		onPhaseChange: "phaseChange",
	};

	private callHook(
		hookName: ScriptHookName,
		runtime: ScriptRuntimeContext,
		...extraArgs: unknown[]
	): ScriptResult<void> {
		const phase = UnsafeScriptSandbox.hookPhaseMap[hookName] ?? "update";
		try {
			const ctxObj = this.createContextObject(runtime);
			const fn = this.exports[hookName] as HookFunction;
			const result = fn(ctxObj, ...extraArgs) as unknown;

			if (
				result &&
				typeof result === "object" &&
				"then" in result &&
				typeof result.then === "function"
			) {
				const message = `[ScriptSandbox] Hook "${hookName}" returned a Promise. Async hooks are not allowed. Script disabled.`;
				this.sandboxConsole.error(message);
				this.isDisposed = true;

				return {
					success: false,
					error: {
						message,
						type: "runtime",
						phase,
						frameId: 0,
						timestamp: Date.now(),
					},
				};
			}

			return { success: true };
		} catch (error) {
			const errorReport = this.createErrorReport(error, phase);
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
		return typeof this.exports[hookName] === "function";
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
		this.exports = {};
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

		let type: ScriptErrorType = "runtime";
		if (error instanceof SyntaxError || this.isSyntaxErrorMessage(message)) {
			type = "syntax";
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
		return syntaxPatterns.some((pattern) => pattern.test(message));
	}
}
