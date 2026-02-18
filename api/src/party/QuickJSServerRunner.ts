import {
	getQuickJSWASMModule,
	type QuickJSContext,
	type QuickJSDeferredPromise,
	type QuickJSHandle,
	type QuickJSRuntime,
	type QuickJSWASMModule,
} from "@cf-wasm/quickjs/workerd";
import { SLOPCADE_MODULES } from "@slopcade/shared/scripting/modules";
import type {
	PartyInputRequest,
	PartyInputResponse,
} from "@slopcade/shared/types/party";

const SCRIPT_EXECUTION_TIMEOUT_MS = 30 * 60 * 1000;
const SYNCHRONOUS_EXECUTION_TIMEOUT_MS = 5 * 1000;
const MEMORY_LIMIT_BYTES = 10 * 1024 * 1024;

type ExecuteWithSyncBudget = <T>(fn: () => T) => T;

export interface RoomAPI {
	setPhase(phase: string): Promise<void>;
	updateSharedData(data: Record<string, unknown>): Promise<void>;
	requestInput(
		requestId: string,
		request: PartyInputRequest,
	): Promise<Map<string, PartyInputResponse>>;
	requestInputFromSubset(
		requestId: string,
		request: PartyInputRequest,
		playerIds: string[],
	): Promise<Map<string, PartyInputResponse>>;
	sendToPlayer(playerId: string, data: Record<string, unknown>): Promise<void>;
	updatePlayerScore(playerId: string, delta: number): Promise<void>;
	delay(ms: number): Promise<void>;
	getPlayers(): string[];
}

export interface ServerScriptRoom {
	setPhase(phase: string): Promise<void>;
	updateSharedData(data: Record<string, unknown>): Promise<void>;
	requestInput(
		requestId: string,
		request: PartyInputRequest,
	): Promise<Map<string, PartyInputResponse>>;
	requestInputFromSubset(
		requestId: string,
		request: PartyInputRequest,
		playerIds: string[],
	): Promise<Map<string, PartyInputResponse>>;
	sendToPlayer(playerId: string, data: Record<string, unknown>): Promise<void>;
	updatePlayerScore(playerId: string, delta: number): Promise<void>;
	getPlayers(): string[];
}

let modulePromise: Promise<QuickJSWASMModule> | null = null;

async function getModule(): Promise<QuickJSWASMModule> {
	if (!modulePromise) {
		modulePromise = getQuickJSWASMModule();
	}
	return modulePromise;
}

export class QuickJSServerRunner {
	private readonly roomAPI: RoomAPI;
	private pendingResults: Map<number, unknown> = new Map();
	private resultId: number = 0;

	constructor(private readonly room: ServerScriptRoom) {
		this.roomAPI = {
			setPhase: (phase) => this.room.setPhase(phase),
			updateSharedData: (data) => this.room.updateSharedData(data),
			requestInput: (requestId, request) =>
				this.room.requestInput(requestId, request),
			requestInputFromSubset: (requestId, request, playerIds) =>
				this.room.requestInputFromSubset(requestId, request, playerIds),
			sendToPlayer: (playerId, data) => this.room.sendToPlayer(playerId, data),
			updatePlayerScore: (playerId, delta) =>
				this.room.updatePlayerScore(playerId, delta),
			delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
			getPlayers: () => this.room.getPlayers(),
		};
	}

	async execute(
		scriptCode: string,
		config: Record<string, unknown> = {},
	): Promise<void> {
		const module = await getModule();
		const runtime = module.newRuntime();
		runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);

		let interruptDeadline = Number.POSITIVE_INFINITY;
		runtime.setInterruptHandler(() => Date.now() >= interruptDeadline);
		const executeWithSyncBudget: ExecuteWithSyncBudget = <T>(
			fn: () => T,
		): T => {
			interruptDeadline = Date.now() + SYNCHRONOUS_EXECUTION_TIMEOUT_MS;
			try {
				return fn();
			} finally {
				interruptDeadline = Number.POSITIVE_INFINITY;
			}
		};

		const context = runtime.newContext();
		const retainedHandles: QuickJSHandle[] = [];
		const pendingDeferreds: Set<QuickJSDeferredPromise> = new Set();

		this.pendingResults.clear();
		this.resultId = 0;

		try {
			this.setupConsole(context, retainedHandles);
			this.setupRequire(context, retainedHandles, executeWithSyncBudget);
			this.setupRoomAPI(
				context,
				runtime,
				retainedHandles,
				pendingDeferreds,
				executeWithSyncBudget,
			);

			const configHandle = this.valueToHandle(context, config, retainedHandles);
			context.setProp(context.global, "config", configHandle);

			const wrappedCode = `"use strict";const module={exports:{}};const exports=module.exports;${scriptCode};module.exports;`;
			const result = executeWithSyncBudget(() =>
				context.evalCode(wrappedCode, "server.js"),
			);

			if ("error" in result && result.error) {
				const error = context.dump(result.error);
				result.error.dispose();
				if (this.isInterruptedError(error)) {
					throw new Error(
						`Synchronous script execution timeout (${SYNCHRONOUS_EXECUTION_TIMEOUT_MS}ms)`,
					);
				}
				throw new Error(`Script error: ${JSON.stringify(error)}`);
			}

			const exportsHandle = result.value;
			const runHandle = context.getProp(exportsHandle, "run");
			try {
				const runType = context.typeof(runHandle);

				if (runType === "function") {
					await this.invokeRunFunction(
						context,
						runtime,
						exportsHandle,
						executeWithSyncBudget,
					);
				}
			} finally {
				runHandle.dispose();
				exportsHandle.dispose();
			}
		} catch (error) {
			await this.transitionRoomToEndedState();
			throw error;
		} finally {
			for (const deferred of pendingDeferreds) {
				if (deferred.alive) {
					deferred.resolve(context.undefined);
					executeWithSyncBudget(() => runtime.executePendingJobs());
				}
			}

			for (let i = 0; i < 10; i++) {
				while (runtime.hasPendingJob()) {
					executeWithSyncBudget(() => runtime.executePendingJobs());
				}
			}

			for (const handle of retainedHandles) handle.dispose();
			context.dispose();
			runtime.dispose();
		}
	}

	private setupConsole(
		context: QuickJSContext,
		retainedHandles: QuickJSHandle[],
	): void {
		const consoleObj = context.newObject();

		const logFn = context.newFunction("log", (...args) => {
			console.log("[PartyServerScript]", ...args.map((a) => context.dump(a)));
		});
		context.setProp(consoleObj, "log", logFn);
		retainedHandles.push(logFn);

		const warnFn = context.newFunction("warn", (...args) => {
			console.warn("[PartyServerScript]", ...args.map((a) => context.dump(a)));
		});
		context.setProp(consoleObj, "warn", warnFn);
		retainedHandles.push(warnFn);

		const errorFn = context.newFunction("error", (...args) => {
			console.error("[PartyServerScript]", ...args.map((a) => context.dump(a)));
		});
		context.setProp(consoleObj, "error", errorFn);
		retainedHandles.push(errorFn);

		context.setProp(context.global, "console", consoleObj);
		retainedHandles.push(consoleObj);
	}

	private setupRequire(
		context: QuickJSContext,
		retainedHandles: QuickJSHandle[],
		executeWithSyncBudget: ExecuteWithSyncBudget,
	): void {
		const requireFn = context.newFunction("require", (nameHandle) => {
			const name = context.getString(nameHandle);
			const source = SLOPCADE_MODULES[name];
			if (!source) throw new Error(`Module not found: ${name}`);

			const moduleResult = executeWithSyncBudget(() =>
				context.evalCode(
					`(()=>{const module={exports:{}};const exports=module.exports;${source};return module.exports;})()`,
					`module:${name}`,
				),
			);

			if ("error" in moduleResult && moduleResult.error) {
				const err = context.dump(moduleResult.error);
				moduleResult.error.dispose();
				if (this.isInterruptedError(err)) {
					throw new Error(
						`Synchronous script execution timeout (${SYNCHRONOUS_EXECUTION_TIMEOUT_MS}ms)`,
					);
				}
				throw new Error(`Module ${name} load error: ${JSON.stringify(err)}`);
			}

			return moduleResult.value;
		});

		context.setProp(context.global, "require", requireFn);
		retainedHandles.push(requireFn);
	}

	private setupRoomAPI(
		context: QuickJSContext,
		runtime: QuickJSRuntime,
		retainedHandles: QuickJSHandle[],
		pendingDeferreds: Set<QuickJSDeferredPromise>,
		executeWithSyncBudget: ExecuteWithSyncBudget,
	): void {
		const roomObj = context.newObject();

		const setPhaseFn = this.createAsyncFunction(
			context,
			runtime,
			executeWithSyncBudget,
			async (phaseHandle) => {
				await this.roomAPI.setPhase(context.getString(phaseHandle));
			},
			pendingDeferreds,
		);
		context.setProp(roomObj, "setPhase", setPhaseFn);
		setPhaseFn.dispose();

		const updateSharedDataFn = this.createAsyncFunction(
			context,
			runtime,
			executeWithSyncBudget,
			async (dataHandle) => {
				await this.roomAPI.updateSharedData(
					context.dump(dataHandle) as Record<string, unknown>,
				);
			},
			pendingDeferreds,
		);
		context.setProp(roomObj, "updateSharedData", updateSharedDataFn);
		updateSharedDataFn.dispose();

		const requestInputFn = this.createAsyncFunctionWithResult(
			context,
			runtime,
			executeWithSyncBudget,
			async (requestIdHandle, requestHandle) => {
				const requestId = context.getString(requestIdHandle);
				const request = context.dump(requestHandle) as PartyInputRequest;
				const result = await this.roomAPI.requestInput(requestId, request);
				if (result instanceof Map) {
					const obj: Record<string, unknown> = {};
					for (const [key, value] of result) {
						obj[key] = value;
					}
					return obj;
				}
				return result;
			},
			pendingDeferreds,
		);
		context.setProp(roomObj, "requestInput", requestInputFn);
		requestInputFn.dispose();

		const requestInputFromSubsetFn = this.createAsyncFunctionWithResult(
			context,
			runtime,
			executeWithSyncBudget,
			async (requestIdHandle, requestHandle, playerIdsHandle) => {
				const requestId = context.getString(requestIdHandle);
				const request = context.dump(requestHandle) as PartyInputRequest;
				const playerIds = context.dump(playerIdsHandle) as string[];
				const result = await this.roomAPI.requestInputFromSubset(
					requestId,
					request,
					playerIds,
				);
				if (result instanceof Map) {
					const obj: Record<string, unknown> = {};
					for (const [key, value] of result) {
						obj[key] = value;
					}
					return obj;
				}
				return result;
			},
			pendingDeferreds,
		);
		context.setProp(
			roomObj,
			"requestInputFromSubset",
			requestInputFromSubsetFn,
		);
		requestInputFromSubsetFn.dispose();

		const sendToPlayerFn = this.createAsyncFunction(
			context,
			runtime,
			executeWithSyncBudget,
			async (playerIdHandle, dataHandle) => {
				await this.roomAPI.sendToPlayer(
					context.getString(playerIdHandle),
					context.dump(dataHandle) as Record<string, unknown>,
				);
			},
			pendingDeferreds,
		);
		context.setProp(roomObj, "sendToPlayer", sendToPlayerFn);
		sendToPlayerFn.dispose();

		const updatePlayerScoreFn = this.createAsyncFunction(
			context,
			runtime,
			executeWithSyncBudget,
			async (playerIdHandle, deltaHandle) => {
				await this.roomAPI.updatePlayerScore(
					context.getString(playerIdHandle),
					context.getNumber(deltaHandle),
				);
			},
			pendingDeferreds,
		);
		context.setProp(roomObj, "updatePlayerScore", updatePlayerScoreFn);
		updatePlayerScoreFn.dispose();

		const delayFn = this.createAsyncFunction(
			context,
			runtime,
			executeWithSyncBudget,
			async (msHandle) => {
				await this.roomAPI.delay(context.getNumber(msHandle));
			},
			pendingDeferreds,
		);
		context.setProp(roomObj, "delay", delayFn);
		delayFn.dispose();

		const getPlayersFn = context.newFunction("getPlayers", () =>
			this.valueToHandle(context, this.roomAPI.getPlayers()),
		);
		context.setProp(roomObj, "getPlayers", getPlayersFn);
		getPlayersFn.dispose();

		context.setProp(context.global, "room", roomObj);
		retainedHandles.push(roomObj);

		const getResultFn = context.newFunction("__getResult", (idHandle) => {
			const id = context.getNumber(idHandle);
			const result = this.pendingResults.get(id);
			this.pendingResults.delete(id);
			if (result === undefined) {
				return context.undefined;
			}
			const json = JSON.stringify(result);
			const evalResult = context.evalCode(`(${json})`, "result.json");
			if ("error" in evalResult && evalResult.error) {
				evalResult.error.dispose();
				return context.undefined;
			}
			return evalResult.value;
		});
		context.setProp(context.global, "__getResult", getResultFn);
		retainedHandles.push(getResultFn);

		const wrapperCode = `
			var origRequestInput = room.requestInput;
			room.requestInput = async function(requestId, request) {
				var id = await origRequestInput.call(room, requestId, request);
				var data = __getResult(id);
				return __toMapLike(data);
			};
			var origRequestInputFromSubset = room.requestInputFromSubset;
			room.requestInputFromSubset = async function(requestId, request, playerIds) {
				var id = await origRequestInputFromSubset.call(room, requestId, request, playerIds);
				var data = __getResult(id);
				return __toMapLike(data);
			};
			function __toMapLike(obj) {
				if (typeof obj !== 'object' || obj === null) return obj;
				var mapLike = {};
				Object.keys(obj).forEach(function(key) {
					mapLike[key] = obj[key];
				});
				mapLike.get = function(k) { return this[k]; };
				mapLike.has = function(k) { return k in obj; };
				mapLike.forEach = function(callback) {
					var self = this;
					Object.keys(obj).forEach(function(key) {
						if (key !== 'get' && key !== 'has' && key !== 'forEach') {
							callback(self[key], key, self);
						}
					});
				};
				return mapLike;
			}
		`;
		const wrapperResult = executeWithSyncBudget(() =>
			context.evalCode(wrapperCode, "wrappers.js"),
		);
		if ("value" in wrapperResult) {
			wrapperResult.value.dispose();
		}
	}

	private createAsyncFunction(
		context: QuickJSContext,
		runtime: QuickJSRuntime,
		executeWithSyncBudget: ExecuteWithSyncBudget,
		fn: (...args: QuickJSHandle[]) => Promise<void>,
		pendingDeferreds: Set<QuickJSDeferredPromise>,
	): QuickJSHandle {
		const fnHandle = context.newFunction("asyncFn", (...args) => {
			const deferred = context.newPromise();
			pendingDeferreds.add(deferred);

			fn(...args)
				.then(() => {
					if (deferred.alive && runtime.alive) {
						deferred.resolve(context.undefined);
						executeWithSyncBudget(() => runtime.executePendingJobs());
					}
				})
				.catch((error) => {
					if (deferred.alive && runtime.alive) {
						console.error("[QuickJS] Async error:", error);
						deferred.resolve(context.undefined);
						executeWithSyncBudget(() => runtime.executePendingJobs());
					}
				})
				.finally(() => {
					pendingDeferreds.delete(deferred);
				});

			return deferred.handle;
		});
		return fnHandle;
	}

	private createAsyncFunctionWithResult(
		context: QuickJSContext,
		runtime: QuickJSRuntime,
		executeWithSyncBudget: ExecuteWithSyncBudget,
		fn: (...args: QuickJSHandle[]) => Promise<unknown>,
		pendingDeferreds: Set<QuickJSDeferredPromise>,
	): QuickJSHandle {
		const fnHandle = context.newFunction("asyncFnWithResult", (...args) => {
			const deferred = context.newPromise();
			pendingDeferreds.add(deferred);

			const resultId = ++this.resultId;
			const idHandle = context.newNumber(resultId);

			fn(...args)
				.then((result) => {
					if (deferred.alive && runtime.alive) {
						this.pendingResults.set(resultId, result);
						deferred.resolve(idHandle);
						executeWithSyncBudget(() => runtime.executePendingJobs());
					}
				})
				.catch((error) => {
					if (deferred.alive && runtime.alive) {
						console.error("[QuickJS] Async error:", error);
						deferred.resolve(context.undefined);
						executeWithSyncBudget(() => runtime.executePendingJobs());
					}
				})
				.finally(() => {
					pendingDeferreds.delete(deferred);
					idHandle.dispose();
				});

			return deferred.handle;
		});
		return fnHandle;
	}

	private valueToHandle(
		context: QuickJSContext,
		value: unknown,
		retainedHandles?: QuickJSHandle[],
	): QuickJSHandle {
		if (value === null || value === undefined) {
			return context.undefined;
		}
		if (typeof value === "number") {
			return context.newNumber(value);
		}
		if (typeof value === "string") {
			return context.newString(value);
		}
		if (typeof value === "boolean") {
			return value ? context.true : context.false;
		}

		if (Array.isArray(value)) {
			const arrHandle = context.newArray();
			if (retainedHandles) retainedHandles.push(arrHandle);
			value.forEach((item, index) => {
				const itemHandle = this.valueToHandle(context, item, retainedHandles);
				context.setProp(arrHandle, index, itemHandle);
			});
			return arrHandle;
		}

		if (typeof value === "object") {
			const objHandle = context.newObject();
			if (retainedHandles) retainedHandles.push(objHandle);
			for (const [key, val] of Object.entries(value)) {
				const valHandle = this.valueToHandle(context, val, retainedHandles);
				context.setProp(objHandle, key, valHandle);
			}
			return objHandle;
		}

		const strHandle = context.newString(String(value));
		if (retainedHandles) retainedHandles.push(strHandle);
		return strHandle;
	}

	private async invokeRunFunction(
		context: QuickJSContext,
		runtime: QuickJSRuntime,
		exportsHandle: QuickJSHandle,
		executeWithSyncBudget: ExecuteWithSyncBudget,
	): Promise<void> {
		const runHandle = context.getProp(exportsHandle, "run");
		const roomHandle = context.getProp(context.global, "room");
		const configHandle = context.getProp(context.global, "config");

		const timeoutMs = SCRIPT_EXECUTION_TIMEOUT_MS;
		const startTime = Date.now();
		let resultHandle: QuickJSHandle | null = null;

		try {
			const callResult = executeWithSyncBudget(() =>
				context.callFunction(
					runHandle,
					context.undefined,
					roomHandle,
					configHandle,
				),
			);

			if ("error" in callResult && callResult.error) {
				const error = context.dump(callResult.error);
				callResult.error.dispose();
				if (this.isInterruptedError(error)) {
					throw new Error(
						`Synchronous script execution timeout (${SYNCHRONOUS_EXECUTION_TIMEOUT_MS}ms)`,
					);
				}
				throw new Error(`Runtime error: ${JSON.stringify(error)}`);
			}

			resultHandle = callResult.value;

			while (Date.now() - startTime < timeoutMs) {
				executeWithSyncBudget(() => runtime.executePendingJobs());
				const state = context.getPromiseState(resultHandle);

				if (state.type === "fulfilled") {
					state.value.dispose();
					return;
				}
				if (state.type === "rejected") {
					const error = context.dump(state.error);
					state.error.dispose();
					if (this.isInterruptedError(error)) {
						throw new Error(
							`Synchronous script execution timeout (${SYNCHRONOUS_EXECUTION_TIMEOUT_MS}ms)`,
						);
					}
					throw new Error(`Script error: ${JSON.stringify(error)}`);
				}

				await new Promise((r) => setTimeout(r, 10));
			}

			throw new Error("Script execution timeout");
		} finally {
			if (resultHandle) resultHandle.dispose();
			runHandle.dispose();
			roomHandle.dispose();
			configHandle.dispose();
		}
	}

	private async transitionRoomToEndedState(): Promise<void> {
		try {
			await this.room.setPhase("ended");
		} catch {}
	}

	private isInterruptedError(error: unknown): boolean {
		if (typeof error === "string") {
			return /interrupt/i.test(error);
		}
		if (!error || typeof error !== "object") {
			return false;
		}
		if (
			"message" in error &&
			typeof (error as { message?: unknown }).message === "string"
		) {
			return /interrupt/i.test((error as { message: string }).message);
		}
		return /interrupt/i.test(JSON.stringify(error));
	}
}
