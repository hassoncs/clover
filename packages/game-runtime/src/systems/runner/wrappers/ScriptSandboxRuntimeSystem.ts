import { SystemPhase } from "@slopcade/shared";
import type { AsyncWorldOps } from "@slopcade/shared/types/async-world-ops";
import type { Vec2, Vec3 } from "@slopcade/shared/types/common";
import type {
	HapticStyle,
	NotificationStyle,
} from "@slopcade/shared/types/haptics";
import type {
	AnimateOptions,
	AnimateTarget,
	CloneOptions,
	RaycastOptions,
	ReparentOptions,
	SpawnOptions,
	WorldEntityData,
	WorldEntityQuery,
	WorldOps,
	WorldRaycastHit,
} from "@slopcade/shared/types/world-ops";
import * as Haptics from "@/lib/haptics";
import {
	createScriptSandbox,
	type IScriptSandbox,
	type ScriptHookName,
} from "@/lib/scripting";
import type {
	DragSnapshot,
	InputSnapshot,
	ScriptCollisionEnterEvent,
	ScriptCollisionEvent,
	ScriptCollisionExitEvent,
	ScriptContext,
	ScriptErrorReport,
	ScriptInputEvent,
	ScriptSandboxConfig,
} from "@/lib/scripting/types";
import type { EffectDispatcher } from "../../../EffectDispatcher";
import { SequenceManager } from "../../../SequenceManager";
import {
	type VoiceGenerationAdapter,
	VoicePrepareService,
} from "../../../VoicePrepareService";
import type { WorldOpsImpl } from "../../../WorldOpsImpl";
import type { RuntimeSystem, SystemContext, UpdateContext } from "../types";

export interface ScriptSandboxSystemConfig {
	scriptCode: string;
	scriptId: string;
	gameId: string;
	constants?: Record<string, number | string | boolean>;
	modules?: Record<string, string>;
	entrypoint?: string;
	voiceAdapter?: VoiceGenerationAdapter;
}

export interface ScriptRefError {
	entityId: string;
	prefabId?: string;
	scriptRef: string;
	message: string;
}

export interface ModuleHookState {
	hasOnStart: boolean;
	hasOnUpdate: boolean;
	hasOnInput: boolean;
	hasOnCollision: boolean;
	hasOnCollisionEnter: boolean;
	hasOnCollisionExit: boolean;
	hasOnNetworkState: boolean;
	hasOnPhaseChange: boolean;
}

export interface ScriptSandboxSystemState {
	hasOnStart: boolean;
	hasOnUpdate: boolean;
	hasOnInput: boolean;
	hasOnCollision: boolean;
	hasOnCollisionEnter: boolean;
	hasOnCollisionExit: boolean;
	hasOnNetworkState: boolean;
	hasOnPhaseChange: boolean;
	lastError: ScriptErrorReport | null;
	reloadCount: number;
	onStartCalled: boolean;
	moduleHooks: Record<string, ModuleHookState>;
	scriptRefErrors: ScriptRefError[];
}

export class ScriptSandboxRuntimeSystem
	implements RuntimeSystem<ScriptSandboxSystemConfig, ScriptSandboxSystemState>
{
	readonly id = "script-sandbox";
	readonly phase = SystemPhase.GAME_LOGIC;
	readonly priority = 60;

	private config: ScriptSandboxSystemConfig;
	private sandbox: IScriptSandbox | null = null;
	private systemContext: SystemContext | null = null;
	private constants?: Record<string, number | string | boolean>;
	private onStartCalled = false;
	private pendingDestroys: Set<string> = new Set();
	private worldOps: WorldOpsImpl | null = null;
	private sequenceManager: SequenceManager | null = null;
	private seededRandom: (() => number) | null = null;
	private lastUpdateCtx: UpdateContext | null = null;
	private pendingNetworkStateEvents: Record<string, unknown>[] = [];
	private pendingPhaseChangeEvents: {
		phase: string;
		data?: Record<string, unknown>;
	}[] = [];
	private pendingGameEvents: [string, unknown][] = [];
	private networkEventUnsubscribers: (() => void)[] = [];
	private activeCollisionPairs: Set<string> = new Set();
	private moduleHooks: Map<string, ModuleHookState> = new Map();
	private moduleStartCalled: Set<string> = new Set();
	private voicePrepareService: VoicePrepareService | null = null;
	private scriptRefErrors: ScriptRefError[] = [];
	private effectDispatcher: EffectDispatcher | null = null;

	constructor(config: ScriptSandboxSystemConfig) {
		this.config = config;
	}

	async initialize(
		ctx: SystemContext,
		_config: ScriptSandboxSystemConfig,
	): Promise<void> {
		this.systemContext = ctx;
		this.constants = this.config.constants;

		const scriptCode = this.buildScriptCode();

		const sandboxConfig: ScriptSandboxConfig = {
			scriptCode,
			scriptId: this.config.scriptId,
			gameId: this.config.gameId,
		};

		this.sandbox = createScriptSandbox(sandboxConfig);
		const result = await this.sandbox.initialize();

		if (!result.success) {
			console.error(
				"[ScriptSandboxRuntimeSystem] Failed to initialize sandbox:",
				result.error,
			);
		}

		this.detectModuleHooks();

		if (!ctx.worldOps) {
			throw new Error(
				"[ScriptSandboxRuntimeSystem] Missing worldOps in SystemContext",
			);
		}
		this.worldOps = ctx.worldOps;
		this.effectDispatcher = ctx.effectDispatcher ?? null;

		this.sequenceManager = new SequenceManager();
		this.seededRandom = this.createSeededRandom(Date.now());

		const voiceAdapter: VoiceGenerationAdapter = this.config.voiceAdapter ?? {
			generate: async () => {
				throw new Error(
					"Voice generation not configured — pass voiceAdapter in config",
				);
			},
		};
		this.voicePrepareService = new VoicePrepareService(voiceAdapter);

		const eventQueue = ctx.eventQueue;
		this.networkEventUnsubscribers.push(
			eventQueue.subscribe("network:state_update", (data) => {
				this.pendingNetworkStateEvents.push(
					(data as Record<string, unknown>) ?? {},
				);
			}),
			eventQueue.subscribe("network:phase_change", (data) => {
				const d = (data as Record<string, unknown>) ?? {};
				this.pendingPhaseChangeEvents.push({
					phase: (d.phase as string) ?? "unknown",
					data: d.data as Record<string, unknown> | undefined,
				});
			}),
			eventQueue.subscribe("game_event", (data) => {
				const d = (data as Record<string, unknown>) ?? {};
				const eventName = d.eventName as string;
				if (eventName) {
					this.pendingGameEvents.push([eventName, d.data]);
				}
			}),
		);
	}

	private buildScriptCode(): string {
		const modules = this.config.modules;
		if (!modules || Object.keys(modules).length === 0) {
			return this.config.scriptCode;
		}

		const sortedKeys = Object.keys(modules).sort();
		const entrypoint = this.config.entrypoint ?? sortedKeys[0];
		const hookNames = [
			"onStart",
			"onUpdate",
			"onInput",
			"onCollision",
			"onCollisionEnter",
			"onCollisionExit",
			"onNetworkState",
			"onPhaseChange",
		];
		const parts: string[] = [];

		parts.push("globalThis.__moduleExports = {};");

		for (const key of sortedKeys) {
			const moduleCode = modules[key];
			parts.push(
				`(function() {`,
				`  var exports = {};`,
				`  ${moduleCode}`,
				`  globalThis.__moduleExports[${JSON.stringify(key)}] = exports;`,
				`})();`,
			);
		}

		for (const key of sortedKeys) {
			for (const hookName of hookNames) {
				const fnName = `__checkModuleHook_${key}_${hookName}`;
				parts.push(
					`exports[${JSON.stringify(fnName)}] = function() {`,
					`  var mod = globalThis.__moduleExports[${JSON.stringify(key)}];`,
					`  return !!mod && typeof mod.${hookName} === 'function';`,
					`};`,
				);
			}
		}

		parts.push(
			`exports.__callModuleHook = function(ctx, args) {`,
			`  var moduleKey = args.moduleKey;`,
			`  var hookName = args.hookName;`,
			`  var extraArgs = args.extraArgs || [];`,
			`  var mod = globalThis.__moduleExports[moduleKey];`,
			`  if (!mod || typeof mod[hookName] !== 'function') return undefined;`,
			`  return mod[hookName].apply(null, [ctx].concat(extraArgs));`,
			`};`,
		);

		const entrypointHooks = hookNames
			.map(
				(h) =>
					`if (typeof globalThis.__moduleExports[${JSON.stringify(entrypoint)}]?.${h} === 'function') { exports.${h} = globalThis.__moduleExports[${JSON.stringify(entrypoint)}].${h}; }`,
			)
			.join("\n");
		parts.push(entrypointHooks);

		return parts.join("\n");
	}

	private detectModuleHooks(): void {
		this.moduleHooks.clear();

		if (!this.sandbox) return;

		const modules = this.config.modules;
		if (!modules || Object.keys(modules).length === 0) {
			return;
		}

		const hookNames: ScriptHookName[] = [
			"onStart",
			"onUpdate",
			"onInput",
			"onCollision",
			"onCollisionEnter",
			"onCollisionExit",
			"onNetworkState",
			"onPhaseChange",
		];

		for (const key of Object.keys(modules).sort()) {
			const state: ModuleHookState = {
				hasOnStart: false,
				hasOnUpdate: false,
				hasOnInput: false,
				hasOnCollision: false,
				hasOnCollisionEnter: false,
				hasOnCollisionExit: false,
				hasOnNetworkState: false,
				hasOnPhaseChange: false,
			};

			for (const hookName of hookNames) {
				const propKey =
					`has${hookName.charAt(0).toUpperCase()}${hookName.slice(1)}` as keyof ModuleHookState;
				state[propKey] = this.moduleHasHook(key, hookName);
			}

			this.moduleHooks.set(key, state);
		}
	}

	private moduleHasHook(moduleKey: string, hookName: ScriptHookName): boolean {
		if (!this.sandbox) return false;
		const dummyCtx = {} as ScriptContext;
		const checkFnName = `__checkModuleHook_${moduleKey}_${hookName}`;
		const result = this.sandbox.callFunction(dummyCtx, checkFnName);
		return result.success && result.value === true;
	}

	private hasModules(): boolean {
		return this.moduleHooks.size > 0;
	}

	private resolveEntityScriptRef(entityId: string): string | null {
		if (!this.systemContext) return null;
		const em = this.systemContext.entityManager;
		const entity = em.getEntity(entityId);
		if (!entity) return null;

		const prefabId = entity.prefab;
		if (!prefabId) return null;

		const prefab = em.getPrefab(prefabId);
		const scriptRef = prefab?.scriptRef ?? null;

		if (scriptRef && !this.moduleHooks.has(scriptRef)) {
			this.reportScriptRefError(
				entityId,
				scriptRef,
				`Module "${scriptRef}" not found in loaded modules. Available: [${[...this.moduleHooks.keys()].join(", ")}]`,
			);
			return null;
		}

		return scriptRef;
	}

	private callModuleHook(
		scriptContext: ScriptContext,
		moduleKey: string,
		hookName: string,
		...extraArgs: unknown[]
	): { success: boolean; error?: ScriptErrorReport } {
		if (!this.sandbox) {
			return { success: false };
		}

		const result = this.sandbox.callFunction(
			scriptContext,
			"__callModuleHook",
			{ moduleKey, hookName, extraArgs },
		);

		if (!result.success) {
			console.error(
				`[ScriptSandboxRuntimeSystem] Module "${moduleKey}" hook "${hookName}" error:`,
				result.error,
			);
			return { success: false, error: result.error };
		}

		return { success: true };
	}

	private reportScriptRefError(
		entityId: string,
		scriptRef: string,
		message: string,
	): void {
		const entity = this.systemContext?.entityManager.getEntity(entityId);
		const error: ScriptRefError = {
			entityId,
			prefabId: entity?.prefab,
			scriptRef,
			message,
		};
		this.scriptRefErrors.push(error);
		console.error(
			`[ScriptSandboxRuntimeSystem] ScriptRef error: ${message} (entity=${entityId}, scriptRef=${scriptRef})`,
		);
	}

	private getCurrentGameState() {
		return {
			variables: this.currentGameState?.variables ?? {},
			constants: this.constants,
		};
	}

	private currentGameState: { variables: Record<string, unknown> } | null =
		null;

	update(ctx: UpdateContext, _state: ScriptSandboxSystemState): void {
		if (!this.sandbox || !this.systemContext) {
			return;
		}

		this.lastUpdateCtx = ctx;
		this.currentGameState = { variables: ctx.gameState.variables };
		this.scriptRefErrors = [];

		const em = this.systemContext.entityManager;

		if (this.pendingDestroys.size > 0) {
			for (const entityId of this.pendingDestroys) {
				em.destroyEntity(entityId);
			}
			this.pendingDestroys.clear();
		}

		if (this.worldOps) {
			this.worldOps.updateTimers(ctx.dt);
		}

		const scriptContext = this.createScriptContext(ctx);

		if (this.hasModules()) {
			this.updateWithModuleDispatch(ctx, scriptContext);
		} else {
			this.updateLegacy(ctx, scriptContext);
		}
	}

	private updateLegacy(ctx: UpdateContext, scriptContext: ScriptContext): void {
		if (!this.sandbox) return;

		if (!this.onStartCalled && this.sandbox.hasHook("onStart")) {
			const result = this.sandbox.runStart(scriptContext);
			if (!result.success) {
				console.error(
					"[ScriptSandboxRuntimeSystem] onStart error:",
					result.error,
				);
			}
			this.onStartCalled = true;
		}

		if (this.sandbox.hasHook("onUpdate")) {
			const result = this.sandbox.runUpdate(scriptContext, ctx.dt);
			if (!result.success) {
				console.error(
					"[ScriptSandboxRuntimeSystem] onUpdate error:",
					result.error,
				);
			}
		}

		if (this.sandbox.hasHook("onInput")) {
			for (const event of ctx.frame.inputEvents) {
				if (event.type === "tap") {
					const tapEvent: ScriptInputEvent = {
						type: "tap",
						position: { x: event.worldX, y: event.worldY },
						entityId: event.targetEntityId ?? null,
						timestamp: Date.now(),
					};
					this.runInput(ctx, tapEvent);
				}
			}
		}

		if (
			this.sandbox.hasHook("onCollision") &&
			ctx.frame.collisions.length > 0
		) {
			for (const collision of ctx.frame.collisions) {
				const collisionEvent: ScriptCollisionEvent = {
					entityA: collision.entityA.id,
					entityB: collision.entityB.id,
					normal: collision.normal,
					impulse: collision.impulse,
					contactPoint: { x: 0, y: 0 },
					timestamp: Date.now(),
				};
				this.runCollision(ctx, collisionEvent);
			}
		}

		this.processCollisionEnterExit(ctx);

		if (
			this.sandbox.hasHook("onNetworkState") &&
			this.pendingNetworkStateEvents.length > 0
		) {
			const events = this.pendingNetworkStateEvents.splice(0);
			for (const state of events) {
				this.runNetworkState(ctx, state);
			}
		} else {
			this.pendingNetworkStateEvents.length = 0;
		}

		if (
			this.sandbox.hasHook("onPhaseChange") &&
			this.pendingPhaseChangeEvents.length > 0
		) {
			const events = this.pendingPhaseChangeEvents.splice(0);
			for (const event of events) {
				this.runPhaseChange(ctx, event.phase, event.data);
			}
		} else {
			this.pendingPhaseChangeEvents.length = 0;
		}

		if (this.pendingGameEvents.length > 0) {
			const events = this.pendingGameEvents.splice(0);
			for (const [eventName, data] of events) {
				this.sandbox.callFunction(
					scriptContext,
					eventName,
					(data as Record<string, unknown>) ?? {},
				);
			}
		}
	}

	private updateWithModuleDispatch(
		ctx: UpdateContext,
		scriptContext: ScriptContext,
	): void {
		if (!this.sandbox || !this.systemContext) return;

		const sortedModuleKeys = [...this.moduleHooks.keys()].sort();

		for (const moduleKey of sortedModuleKeys) {
			const hooks = this.moduleHooks.get(moduleKey);
			if (!hooks?.hasOnStart) continue;
			if (this.moduleStartCalled.has(moduleKey)) continue;

			const result = this.callModuleHook(scriptContext, moduleKey, "onStart");
			if (!result.success) {
				console.error(
					`[ScriptSandboxRuntimeSystem] Module "${moduleKey}" onStart error:`,
					result.error,
				);
			}
			this.moduleStartCalled.add(moduleKey);
		}

		for (const moduleKey of sortedModuleKeys) {
			const hooks = this.moduleHooks.get(moduleKey);
			if (!hooks?.hasOnUpdate) continue;

			const result = this.callModuleHook(
				scriptContext,
				moduleKey,
				"onUpdate",
				ctx.dt,
			);
			if (!result.success) {
				console.error(
					`[ScriptSandboxRuntimeSystem] Module "${moduleKey}" onUpdate error:`,
					result.error,
				);
			}
		}

		for (const event of ctx.frame.inputEvents) {
			if (event.type !== "tap") continue;
			const tapEvent: ScriptInputEvent = {
				type: "tap",
				position: { x: event.worldX, y: event.worldY },
				entityId: event.targetEntityId ?? null,
				timestamp: Date.now(),
			};

			for (const moduleKey of sortedModuleKeys) {
				const hooks = this.moduleHooks.get(moduleKey);
				if (!hooks?.hasOnInput) continue;
				this.callModuleHook(scriptContext, moduleKey, "onInput", tapEvent);
			}
		}

		if (ctx.frame.collisions.length > 0) {
			const dispatchedCollisions = new Set<string>();

			for (const collision of ctx.frame.collisions) {
				const collisionEvent: ScriptCollisionEvent = {
					entityA: collision.entityA.id,
					entityB: collision.entityB.id,
					normal: collision.normal,
					impulse: collision.impulse,
					contactPoint: { x: 0, y: 0 },
					timestamp: Date.now(),
				};

				const moduleA = this.resolveEntityScriptRef(collision.entityA.id);
				const moduleB = this.resolveEntityScriptRef(collision.entityB.id);

				const modulesToNotify = new Set<string>();
				if (moduleA) modulesToNotify.add(moduleA);
				if (moduleB) modulesToNotify.add(moduleB);

				for (const moduleKey of [...modulesToNotify].sort()) {
					const hooks = this.moduleHooks.get(moduleKey);
					if (!hooks?.hasOnCollision) continue;

					const key = `${moduleKey}:${collision.entityA.id}:${collision.entityB.id}`;
					if (dispatchedCollisions.has(key)) continue;
					dispatchedCollisions.add(key);

					this.callModuleHook(
						scriptContext,
						moduleKey,
						"onCollision",
						collisionEvent,
					);
				}
			}
		}

		this.processCollisionEnterExitModular(ctx, scriptContext, sortedModuleKeys);

		if (this.pendingNetworkStateEvents.length > 0) {
			const events = this.pendingNetworkStateEvents.splice(0);
			for (const state of events) {
				for (const moduleKey of sortedModuleKeys) {
					const hooks = this.moduleHooks.get(moduleKey);
					if (!hooks?.hasOnNetworkState) continue;
					this.callModuleHook(
						scriptContext,
						moduleKey,
						"onNetworkState",
						state,
					);
				}
			}
		} else {
			this.pendingNetworkStateEvents.length = 0;
		}

		if (this.pendingPhaseChangeEvents.length > 0) {
			const events = this.pendingPhaseChangeEvents.splice(0);
			for (const event of events) {
				for (const moduleKey of sortedModuleKeys) {
					const hooks = this.moduleHooks.get(moduleKey);
					if (!hooks?.hasOnPhaseChange) continue;
					this.callModuleHook(
						scriptContext,
						moduleKey,
						"onPhaseChange",
						event.phase,
						event.data,
					);
				}
			}
		} else {
			this.pendingPhaseChangeEvents.length = 0;
		}

		if (this.pendingGameEvents.length > 0) {
			const events = this.pendingGameEvents.splice(0);
			for (const [eventName, data] of events) {
				this.sandbox.callFunction(
					scriptContext,
					eventName,
					(data as Record<string, unknown>) ?? {},
				);
			}
		}
	}

	private processCollisionEnterExitModular(
		ctx: UpdateContext,
		scriptContext: ScriptContext,
		sortedModuleKeys: string[],
	): void {
		if (!this.systemContext) return;

		const anyEnter = sortedModuleKeys.some(
			(k) => this.moduleHooks.get(k)?.hasOnCollisionEnter,
		);
		const anyExit = sortedModuleKeys.some(
			(k) => this.moduleHooks.get(k)?.hasOnCollisionExit,
		);
		if (!anyEnter && !anyExit) return;

		const em = this.systemContext.entityManager;
		const currentPairs = new Set<string>();

		for (const collision of ctx.frame.collisions) {
			const key = this.makeCollisionPairKey(
				collision.entityA.id,
				collision.entityB.id,
			);
			currentPairs.add(key);

			if (anyEnter && !this.activeCollisionPairs.has(key)) {
				const tagsA = em.getEntity(collision.entityA.id)?.tags ?? [];
				const tagsB = em.getEntity(collision.entityB.id)?.tags ?? [];
				const enterEvent: ScriptCollisionEnterEvent = {
					entityA: collision.entityA.id,
					entityB: collision.entityB.id,
					tagsA: [...tagsA],
					tagsB: [...tagsB],
					normal: collision.normal,
					impulse: collision.impulse,
				};

				const moduleA = this.resolveEntityScriptRef(collision.entityA.id);
				const moduleB = this.resolveEntityScriptRef(collision.entityB.id);
				const modulesToNotify = new Set<string>();
				if (moduleA) modulesToNotify.add(moduleA);
				if (moduleB) modulesToNotify.add(moduleB);

				for (const moduleKey of [...modulesToNotify].sort()) {
					const hooks = this.moduleHooks.get(moduleKey);
					if (!hooks?.hasOnCollisionEnter) continue;
					this.callModuleHook(
						scriptContext,
						moduleKey,
						"onCollisionEnter",
						enterEvent,
					);
				}
			}
		}

		if (anyExit) {
			for (const key of this.activeCollisionPairs) {
				if (!currentPairs.has(key)) {
					const [idA, idB] = key.split("\0");
					const tagsA = em.getEntity(idA)?.tags ?? [];
					const tagsB = em.getEntity(idB)?.tags ?? [];
					const exitEvent: ScriptCollisionExitEvent = {
						entityA: idA,
						entityB: idB,
						tagsA: [...tagsA],
						tagsB: [...tagsB],
					};

					const moduleA = this.resolveEntityScriptRef(idA);
					const moduleB = this.resolveEntityScriptRef(idB);
					const modulesToNotify = new Set<string>();
					if (moduleA) modulesToNotify.add(moduleA);
					if (moduleB) modulesToNotify.add(moduleB);

					for (const moduleKey of [...modulesToNotify].sort()) {
						const hooks = this.moduleHooks.get(moduleKey);
						if (!hooks?.hasOnCollisionExit) continue;
						this.callModuleHook(
							scriptContext,
							moduleKey,
							"onCollisionExit",
							exitEvent,
						);
					}
				}
			}
		}

		this.activeCollisionPairs = currentPairs;
	}

	destroy(): void {
		for (const unsub of this.networkEventUnsubscribers) {
			unsub();
		}
		this.networkEventUnsubscribers.length = 0;
		this.pendingNetworkStateEvents.length = 0;
		this.pendingPhaseChangeEvents.length = 0;
		this.pendingGameEvents.length = 0;
		this.activeCollisionPairs.clear();

		if (this.sequenceManager) {
			this.sequenceManager.dispose();
			this.sequenceManager = null;
		}

		if (this.voicePrepareService) {
			this.voicePrepareService.dispose();
			this.voicePrepareService = null;
		}

		if (this.sandbox) {
			this.sandbox.dispose();
			this.sandbox = null;
		}

		this.systemContext = null;
		this.worldOps = null;
		this.onStartCalled = false;
		this.moduleHooks.clear();
		this.moduleStartCalled.clear();
		this.scriptRefErrors = [];
		this.effectDispatcher = null;
	}

	getState(): ScriptSandboxSystemState {
		const moduleHooksRecord: Record<string, ModuleHookState> = {};
		for (const [key, state] of this.moduleHooks) {
			moduleHooksRecord[key] = state;
		}

		if (!this.sandbox) {
			return {
				hasOnStart: false,
				hasOnUpdate: false,
				hasOnInput: false,
				hasOnCollision: false,
				hasOnCollisionEnter: false,
				hasOnCollisionExit: false,
				hasOnNetworkState: false,
				hasOnPhaseChange: false,
				lastError: null,
				reloadCount: 0,
				onStartCalled: false,
				moduleHooks: moduleHooksRecord,
				scriptRefErrors: [...this.scriptRefErrors],
			};
		}

		return {
			hasOnStart: this.sandbox.hasHook("onStart"),
			hasOnUpdate: this.sandbox.hasHook("onUpdate"),
			hasOnInput: this.sandbox.hasHook("onInput"),
			hasOnCollision: this.sandbox.hasHook("onCollision"),
			hasOnCollisionEnter: this.sandbox.hasHook("onCollisionEnter"),
			hasOnCollisionExit: this.sandbox.hasHook("onCollisionExit"),
			hasOnNetworkState: this.sandbox.hasHook("onNetworkState"),
			hasOnPhaseChange: this.sandbox.hasHook("onPhaseChange"),
			lastError: this.sandbox.getLastError(),
			reloadCount: this.sandbox.getReloadCount(),
			onStartCalled: this.onStartCalled,
			moduleHooks: moduleHooksRecord,
			scriptRefErrors: [...this.scriptRefErrors],
		};
	}

	getSandbox(): IScriptSandbox | null {
		return this.sandbox;
	}

	callExport(
		functionName: string,
		args?: Record<string, unknown>,
	): { success: boolean; error?: { message: string; stack?: string } } {
		if (!this.sandbox || !this.systemContext || !this.lastUpdateCtx) {
			console.warn(
				`[ScriptSandboxRuntimeSystem] callExport("${functionName}") failed: system not ready`,
			);
			return { success: false, error: { message: "Script system not ready" } };
		}

		const scriptContext = this.createScriptContext(this.lastUpdateCtx);
		const result = this.sandbox.callFunction(scriptContext, functionName, args);
		if (!result.success && result.error) {
			console.error(
				`[ScriptSandboxRuntimeSystem] callExport("${functionName}") error:`,
				result.error.message,
			);
		}
		return result;
	}

	runInput(ctx: UpdateContext, event: ScriptInputEvent): void {
		if (!this.sandbox || !this.systemContext) return;
		if (!this.sandbox.hasHook("onInput")) return;

		const scriptContext = this.createScriptContext(ctx);
		const result = this.sandbox.runInput(scriptContext, event);
		if (!result.success) {
			console.error(
				"[ScriptSandboxRuntimeSystem] onInput error:",
				result.error,
			);
		}
	}

	runCollision(ctx: UpdateContext, collision: ScriptCollisionEvent): void {
		if (!this.sandbox || !this.systemContext) return;
		if (!this.sandbox.hasHook("onCollision")) return;

		const scriptContext = this.createScriptContext(ctx);
		const result = this.sandbox.runCollision(scriptContext, collision);
		if (!result.success) {
			console.error(
				"[ScriptSandboxRuntimeSystem] onCollision error:",
				result.error,
			);
		}
	}

	private makeCollisionPairKey(idA: string, idB: string): string {
		return idA < idB ? `${idA}\0${idB}` : `${idB}\0${idA}`;
	}

	private processCollisionEnterExit(ctx: UpdateContext): void {
		if (!this.sandbox || !this.systemContext) return;

		const hasEnter = this.sandbox.hasHook("onCollisionEnter");
		const hasExit = this.sandbox.hasHook("onCollisionExit");
		if (!hasEnter && !hasExit) return;

		const em = this.systemContext.entityManager;
		const currentPairs = new Set<string>();

		for (const collision of ctx.frame.collisions) {
			const key = this.makeCollisionPairKey(
				collision.entityA.id,
				collision.entityB.id,
			);
			currentPairs.add(key);

			if (hasEnter && !this.activeCollisionPairs.has(key)) {
				const tagsA = em.getEntity(collision.entityA.id)?.tags ?? [];
				const tagsB = em.getEntity(collision.entityB.id)?.tags ?? [];
				const enterEvent: ScriptCollisionEnterEvent = {
					entityA: collision.entityA.id,
					entityB: collision.entityB.id,
					tagsA: [...tagsA],
					tagsB: [...tagsB],
					normal: collision.normal,
					impulse: collision.impulse,
				};
				const scriptContext = this.createScriptContext(ctx);
				const result = this.sandbox!.runCollisionEnter(
					scriptContext,
					enterEvent,
				);
				if (!result.success) {
					console.error(
						"[ScriptSandboxRuntimeSystem] onCollisionEnter error:",
						result.error,
					);
				}
			}
		}

		if (hasExit) {
			for (const key of this.activeCollisionPairs) {
				if (!currentPairs.has(key)) {
					const [idA, idB] = key.split("\0");
					const tagsA = em.getEntity(idA)?.tags ?? [];
					const tagsB = em.getEntity(idB)?.tags ?? [];
					const exitEvent: ScriptCollisionExitEvent = {
						entityA: idA,
						entityB: idB,
						tagsA: [...tagsA],
						tagsB: [...tagsB],
					};
					const scriptContext = this.createScriptContext(ctx);
					const result = this.sandbox!.runCollisionExit(
						scriptContext,
						exitEvent,
					);
					if (!result.success) {
						console.error(
							"[ScriptSandboxRuntimeSystem] onCollisionExit error:",
							result.error,
						);
					}
				}
			}
		}

		this.activeCollisionPairs = currentPairs;
	}

	private runNetworkState(
		ctx: UpdateContext,
		state: Record<string, unknown>,
	): void {
		if (!this.sandbox || !this.systemContext) return;
		if (!this.sandbox.hasHook("onNetworkState")) return;

		const scriptContext = this.createScriptContext(ctx);
		const result = this.sandbox.runNetworkState(scriptContext, state);
		if (!result.success) {
			console.error(
				"[ScriptSandboxRuntimeSystem] onNetworkState error:",
				result.error,
			);
		}
	}

	private runPhaseChange(
		ctx: UpdateContext,
		phase: string,
		data?: Record<string, unknown>,
	): void {
		if (!this.sandbox || !this.systemContext) return;
		if (!this.sandbox.hasHook("onPhaseChange")) return;

		const scriptContext = this.createScriptContext(ctx);
		const result = this.sandbox.runPhaseChange(scriptContext, phase, data);
		if (!result.success) {
			console.error(
				"[ScriptSandboxRuntimeSystem] onPhaseChange error:",
				result.error,
			);
		}
	}

	private createScriptContext(ctx: UpdateContext): ScriptContext {
		const em = this.systemContext!.entityManager;
		const physics = this.systemContext!.physics;
		const bridge = this.systemContext!.bridge;
		const eventQueue = this.systemContext!.eventQueue;
		const worldOps = this.worldOps!;
		const seqMgr = this.sequenceManager!;
		const seededRandom =
			this.seededRandom ?? this.createSeededRandom(Date.now());

		const inputSnapshot: InputSnapshot | null = ctx.input.tap
			? {
					type: "tap",
					position: { x: ctx.input.tap.worldX, y: ctx.input.tap.worldY },
					timestamp: Date.now(),
				}
			: null;

		const queryEntities = (query?: WorldEntityQuery): string[] => {
			if (!query) return em.getActiveEntities().map((e) => e.id);
			const withinAabb = query.inAABB
				? {
						min: { x: query.inAABB.minX, y: query.inAABB.minY },
						max: { x: query.inAABB.maxX, y: query.inAABB.maxY },
					}
				: undefined;
			return em
				.query({
					tags: query.tag ? [query.tag] : undefined,
					prefab: query.prefabId,
					withinAabb,
				})
				.map((e) => e.id);
		};

		const getEntityData = (entityId: string): WorldEntityData | null => {
			const entity = em.getEntity(entityId);
			if (!entity) return null;

			const velocity = entity.physics
				? physics.getLinearVelocity(entityId)
				: undefined;
			const angularVelocity = entity.physics
				? physics.getAngularVelocity(entityId)
				: undefined;

			return {
				id: entity.id,
				prefab: entity.prefab,
				tags: [...entity.tags],
				position: { x: entity.transform.x, y: entity.transform.y },
				rotation: entity.transform.angle,
				scale: { x: entity.transform.scaleX, y: entity.transform.scaleY },
				velocity,
				angularVelocity,
			};
		};

		const queryEntitiesWithData = (
			query?: WorldEntityQuery,
		): WorldEntityData[] => {
			const entityIds = queryEntities(query);
			const results: WorldEntityData[] = [];
			for (const entityId of entityIds) {
				const data = getEntityData(entityId);
				if (data) {
					results.push(data);
				}
			}
			return results;
		};

		const cloneEntityRecursive = (
			sourceEntityId: string,
			parentId?: string,
			positionOverride?: Vec2,
			includeChildren?: boolean,
		): string | null => {
			const source = em.getEntity(sourceEntityId);
			if (!source || !source.prefab) return null;

			const newEntityId = em.spawnEntity({
				prefabId: source.prefab,
				position: positionOverride ?? {
					x: source.transform.x,
					y: source.transform.y,
				},
				angle: source.transform.angle,
				tags: [...source.tags],
				parentId,
			});

			if (!newEntityId) return null;

			const newEntity = em.getEntity(newEntityId);
			if (!newEntity) return null;

			newEntity.transform.scaleX = source.transform.scaleX;
			newEntity.transform.scaleY = source.transform.scaleY;
			bridge.setScale(
				newEntityId,
				newEntity.transform.scaleX,
				newEntity.transform.scaleY,
			);

			if (includeChildren) {
				for (const childId of source.children) {
					cloneEntityRecursive(childId, newEntityId, undefined, true);
				}
			}

			return newEntityId;
		};

		const voiceService = this.voicePrepareService!;

		const worldAsync: AsyncWorldOps = {
			animate: (entityId, target, opts) =>
				worldOps.animate(entityId, target, opts),
			wait: (ms, opts) => worldOps.wait(ms, opts),
			waitForVoices: (handleIds, _opts) => voiceService.awaitMany(handleIds),
		};

		return {
			spawnEntity: (
				prefabId: string,
				position: Vec2,
				opts?: SpawnOptions,
			): string | null => {
				return em.spawnEntity({
					prefabId,
					position,
					velocity: opts?.velocity,
					angle: opts?.angle,
					tags: opts?.tags,
					parentId: opts?.parentId,
					entityId: opts?.entityId,
				});
			},

			destroyEntity: (entityId: string): void => {
				em.destroyEntity(entityId);
			},

			cloneEntity: (entityId: string, opts?: CloneOptions): string | null => {
				return cloneEntityRecursive(
					entityId,
					undefined,
					opts?.position,
					opts?.withChildren,
				);
			},

			reparentEntity: (
				entityId: string,
				newParentId: string,
				opts?: ReparentOptions,
			): void => {
				em.reparent(
					entityId,
					newParentId,
					opts?.keepGlobalTransform
						? undefined
						: em.getEntity(entityId)?.localTransform,
				);
			},

			getEntityPosition: (entityId: string): Vec2 | null => {
				const entity = em.getEntity(entityId);
				if (!entity) return null;
				return { x: entity.transform.x, y: entity.transform.y };
			},

			setEntityPosition: (entityId: string, position: Vec2): void => {
				const entity = em.getEntity(entityId);
				if (!entity) return;

				entity.transform.x = position.x;
				entity.transform.y = position.y;

				if (entity.physics) {
					physics.setTransform(entity.id, {
						position,
						angle: entity.transform.angle,
					});
				}

				bridge.setPosition(entityId, position.x, position.y);
			},

			getEntityRotation: (entityId: string): number | null => {
				const entity = em.getEntity(entityId);
				return entity ? entity.transform.angle : null;
			},

			setEntityRotation: (entityId: string, angle: number): void => {
				const entity = em.getEntity(entityId);
				if (!entity) return;

				entity.transform.angle = angle;

				if (entity.physics) {
					physics.setTransform(entity.id, {
						position: { x: entity.transform.x, y: entity.transform.y },
						angle,
					});
				}

				bridge.setRotation(entityId, (angle * 180) / Math.PI);
			},

			getEntityScale: (entityId: string): Vec2 | null => {
				const entity = em.getEntity(entityId);
				if (!entity) return null;
				return { x: entity.transform.scaleX, y: entity.transform.scaleY };
			},

			setEntityScale: (entityId: string, scale: Vec2): void => {
				const entity = em.getEntity(entityId);
				if (!entity) return;

				entity.transform.scaleX = scale.x;
				entity.transform.scaleY = scale.y;
				bridge.setScale(entityId, scale.x, scale.y);
			},

			setEntityVisible: (entityId: string, visible: boolean): void => {
				em.setEntityVisible(entityId, visible);
				bridge.setVisible(entityId, visible);
			},

			getEntityVelocity: (entityId: string): Vec2 | null => {
				const entity = em.getEntity(entityId);
				if (!entity || !entity.physics) return null;
				return physics.getLinearVelocity(entityId);
			},

			setEntityVelocity: (entityId: string, velocity: Vec2): void => {
				const entity = em.getEntity(entityId);
				if (!entity || !entity.physics) return;
				physics.setLinearVelocity(entityId, velocity);
			},

			getEntityAngularVelocity: (entityId: string): number | null => {
				const entity = em.getEntity(entityId);
				if (!entity || !entity.physics) return null;
				return physics.getAngularVelocity(entityId);
			},

			setEntityAngularVelocity: (entityId: string, velocity: number): void => {
				const entity = em.getEntity(entityId);
				if (!entity || !entity.physics) return;
				physics.setAngularVelocity(entityId, velocity);
			},

			applyImpulse: (entityId: string, impulse: Vec2): void => {
				const entity = em.getEntity(entityId);
				if (!entity || !entity.physics) return;
				physics.applyImpulseToCenter(entityId, impulse);
				bridge.applyImpulse(entityId, impulse);
			},

			applyForce: (entityId: string, force: Vec2): void => {
				const entity = em.getEntity(entityId);
				if (!entity || !entity.physics) return;
				physics.applyForceToCenter(entityId, force);
				bridge.applyForce(entityId, force);
			},

			spawnEntity3D: (
				prefabId: string,
				position: Vec3,
				_opts?: SpawnOptions,
			): string | null => {
				return bridge.spawnEntity3D(
					prefabId,
					position.x,
					position.y,
					position.z,
				) as string | null;
			},

			destroyEntity3D: (entityId: string): void => {
				bridge.destroyEntity3D(entityId);
			},

			getEntityPosition3D: (_entityId: string): Vec3 | null => {
				// TODO: 3D entity state tracking for sync getters (Godot-side state is not accessible synchronously)
				return null;
			},

			setEntityPosition3D: (entityId: string, position: Vec3): void => {
				bridge.setPosition3D(entityId, position.x, position.y, position.z);
			},

			getEntityRotation3D: (_entityId: string): Vec3 | null => {
				return null;
			},

			setEntityRotation3D: (entityId: string, rotation: Vec3): void => {
				bridge.setRotation3D(entityId, rotation.x, rotation.y, rotation.z);
			},

			getEntityScale3D: (_entityId: string): Vec3 | null => {
				return null;
			},

			setEntityScale3D: (entityId: string, scale: Vec3): void => {
				bridge.setScale3D(entityId, scale.x, scale.y, scale.z);
			},

			setEntityVisible3D: (entityId: string, visible: boolean): void => {
				bridge.setVisible3D(entityId, visible);
			},

			getEntityVelocity3D: (_entityId: string): Vec3 | null => {
				return null;
			},

			setEntityVelocity3D: (entityId: string, velocity: Vec3): void => {
				bridge.setVelocity3D(entityId, velocity.x, velocity.y, velocity.z);
			},

			applyImpulse3D: (entityId: string, impulse: Vec3): void => {
				bridge.applyImpulse3D(entityId, impulse.x, impulse.y, impulse.z);
			},

			applyForce3D: (entityId: string, force: Vec3): void => {
				bridge.applyForce3D(entityId, force.x, force.y, force.z);
			},

			setCameraPosition3D: (position: Vec3): void => {
				bridge.setCamera3DPosition(position.x, position.y, position.z);
			},

			setCameraLookAt3D: (target: Vec3): void => {
				bridge.setCamera3DLookAt(target.x, target.y, target.z);
			},

			setCameraFov3D: (fov: number): void => {
				bridge.setCamera3DFov(fov);
			},

			setCameraTarget3D: (entityId: string): void => {
				bridge.setCamera3DFollowTarget(entityId);
			},

			cameraShake3D: (intensity: number, duration: number): void => {
				bridge.camera3DShake(intensity, duration);
			},

			createVoxelBatch: (
				voxels: Array<{ x: number; y: number; z: number; color: string }>,
			): string => {
				return (
					(bridge.createVoxelBatch(JSON.stringify(voxels)) as string) || ""
				);
			},

			updateVoxelBatch: (
				batchId: string,
				voxels: Array<{ x: number; y: number; z: number; color: string }>,
			): void => {
				bridge.updateVoxelBatch(batchId, JSON.stringify(voxels));
			},

			destroyVoxelBatch: (batchId: string): void => {
				bridge.destroyVoxelBatch(batchId);
			},

			placeVoxel: (x: number, y: number, z: number, color: string): string => {
				return (bridge.placeVoxel(x, y, z, color) as string) || "";
			},

			removeVoxel: (voxelId: string): void => {
				bridge.removeVoxel(voxelId);
			},

			getEntityTags: (entityId: string): string[] =>
				em.getEntity(entityId)?.tags ?? [],

			addTag: (entityId: string, tag: string): void => {
				em.addTag(entityId, tag);
			},

			removeTag: (entityId: string, tag: string): boolean =>
				em.removeTag(entityId, tag),

			hasTag: (entityId: string, tag: string): boolean =>
				em.hasTag(entityId, tag),

			getEntityPrefab: (entityId: string): string | undefined =>
				em.getEntity(entityId)?.prefab,

			getEntityData,

			queryEntities,

			queryEntitiesWithData,

			queryPoint: (point: Vec2): string | null => {
				return physics.queryPoint(point);
			},

			queryAABB: (min: Vec2, max: Vec2): string[] => {
				return physics.queryAABB(min, max);
			},

			raycast: (
				from: Vec2,
				to: Vec2,
				_opts?: RaycastOptions,
			): WorldRaycastHit | null => {
				const dx = to.x - from.x;
				const dy = to.y - from.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance === 0) return null;

				const direction = { x: dx / distance, y: dy / distance };
				const hit = physics.raycast(from, direction, distance);

				if (!hit) return null;

				return {
					entityId: hit.entityId,
					point: hit.point,
					normal: hit.normal,
					distance: hit.fraction * distance,
				};
			},

			getVariable: (name: string): unknown => ctx.gameState.variables[name],

			setVariable: (name: string, value: unknown): void => {
				if (name.startsWith("room.")) {
					return;
				}
				if (
					typeof value !== "number" &&
					typeof value !== "string" &&
					typeof value !== "boolean"
				) {
					return;
				}
				ctx.gameState.variables[name] = value;
				eventQueue.emit("variable_change", { name, value });
			},

			getConstant: (name: string): unknown => this.constants?.[name],

			emit: (eventName: string, data?: Record<string, unknown>): void => {
				eventQueue.emit(eventName, data);
			},

			win: (): void => {
				eventQueue.emit("game_state_change", { state: "won" });
			},

			lose: (): void => {
				eventQueue.emit("game_state_change", { state: "lost" });
			},

			worldAsync,

			startSequence: (name: string, fn: (world: WorldOps) => Promise<void>) => {
				return seqMgr.start(name, fn, worldOps as WorldOps);
			},

			isSequenceRunning: (name: string): boolean =>
				seqMgr?.isRunning(name) ?? false,

			cancelSequence: (name: string): void => seqMgr?.cancel(name),

			dt: ctx.dt,
			elapsed: ctx.elapsed,
			frameId: ctx.frameId,

			input: inputSnapshot,

			mouse: ctx.input.mouse
				? { x: ctx.input.mouse.worldX, y: ctx.input.mouse.worldY }
				: null,

			drag: this.createDragSnapshot(ctx),

			random: () => seededRandom(),
			randomInt: (min: number, max: number) =>
				Math.floor(seededRandom() * (max - min + 1)) + min,
			randomChoice: <T>(array: readonly T[]) =>
				array[Math.floor(seededRandom() * array.length)],
			clamp: (value: number, min: number, max: number) =>
				Math.max(min, Math.min(max, value)),
			lerp: (a: number, b: number, t: number) => a + (b - a) * t,
			distance: (a: Vec2, b: Vec2) =>
				Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2),
			vec3: (x: number, y: number, z: number): Vec3 => ({ x, y, z }),
			addVec3: (a: Vec3, b: Vec3): Vec3 => ({
				x: a.x + b.x,
				y: a.y + b.y,
				z: a.z + b.z,
			}),
			subVec3: (a: Vec3, b: Vec3): Vec3 => ({
				x: a.x - b.x,
				y: a.y - b.y,
				z: a.z - b.z,
			}),
			scaleVec3: (v: Vec3, s: number): Vec3 => ({
				x: v.x * s,
				y: v.y * s,
				z: v.z * s,
			}),
			normalizeVec3: (v: Vec3): Vec3 => {
				const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
				return len > 0
					? { x: v.x / len, y: v.y / len, z: v.z / len }
					: { x: 0, y: 0, z: 0 };
			},
			dotVec3: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
			crossVec3: (a: Vec3, b: Vec3): Vec3 => ({
				x: a.y * b.z - a.z * b.y,
				y: a.z * b.x - a.x * b.z,
				z: a.x * b.y - a.y * b.x,
			}),
			lengthVec3: (v: Vec3): number =>
				Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
			distance3D: (a: Vec3, b: Vec3): number =>
				Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2),
			lerpVec3: (a: Vec3, b: Vec3, t: number): Vec3 => ({
				x: a.x + (b.x - a.x) * t,
				y: a.y + (b.y - a.y) * t,
				z: a.z + (b.z - a.z) * t,
			}),
			createPixelBuffer: () => {},
			pixelBufferDraw: () => {},
			pixelBufferClear: () => {},

			animateEntity: (
				entityId: string,
				target: AnimateTarget,
				opts?: AnimateOptions,
			): void => {
				worldOps.animate(entityId, target, opts ?? { duration: 300 });
			},

			playSound: (
				soundId: string,
				opts?: { volume?: number; pitch?: number },
			): void => {
				bridge.playSound(soundId, opts?.volume, opts?.pitch);
			},

			prepareVoice: (voicePreset: string, text: string, opts?): string => {
				return voiceService.prepare(voicePreset, text, opts);
			},

			isVoiceReady: (handleId: string): boolean => {
				return voiceService.isReady(handleId);
			},

			playVoice: (
				handleId: string,
				opts?: { volume?: number; pitch?: number },
			): void => {
				const assetUrl = voiceService.getPlayableAsset(handleId);
				if (!assetUrl) return;
				bridge.playSound(assetUrl, opts?.volume, opts?.pitch);
			},

			cameraShake: (intensity: number, duration: number): void => {
				bridge.screenShake(intensity, duration);
			},

			cameraZoom: (scale: number, duration?: number): void => {
				bridge.zoomPunch(scale, duration);
			},

			applySpriteEffect: (
				entityId: string,
				effect: string,
				params?: Record<string, unknown>,
			): string => {
				if (!this.effectDispatcher) {
					return "";
				}
				return this.effectDispatcher.applyScriptEffect(
					entityId,
					effect,
					params,
				);
			},

			updateSpriteEffectParam: (
				entityId: string,
				effectId: string,
				paramName: string,
				value: unknown,
			): void => {
				this.effectDispatcher?.updateScriptEffectParam(
					entityId,
					effectId,
					paramName,
					value,
				);
			},

			clearSpriteEffect: (entityId: string, effectId?: string): void => {
				this.effectDispatcher?.clearScriptEffect(entityId, effectId);
			},

			setTimeScale: (scale: number, duration?: number): void => {
				eventQueue.emit("set_time_scale", { scale, duration });
			},

			showDialog: (dialogId: string, data?: Record<string, unknown>): void => {
				ctx.gameState.variables.activeDialog = dialogId;
				eventQueue.emit("variable_change", {
					name: "activeDialog",
					value: dialogId,
				});
				eventQueue.emit("show_dialog", { dialogId, data });
			},

			dismissDialog: (): void => {
				ctx.gameState.variables.activeDialog = "";
				eventQueue.emit("variable_change", {
					name: "activeDialog",
					value: "",
				});
				eventQueue.emit("dismiss_dialog", {});
			},

			destroyByTag: (tag: string): void => {
				const entities = queryEntities({ tag });
				for (const entityId of entities) {
					this.pendingDestroys.add(entityId);
				}
			},

			haptic: (style?: HapticStyle): void => {
				Haptics.impactAsync((style as Haptics.ImpactFeedbackStyle) ?? "Medium");
			},

			hapticNotification: (style?: NotificationStyle): void => {
				Haptics.notificationAsync(style ?? "Success");
			},

			hapticSelection: (): void => {
				Haptics.selectionAsync();
			},
		};
	}

	private createDragSnapshot(ctx: UpdateContext): DragSnapshot | null {
		if (!ctx.input.drag) return null;

		return {
			isDragging: true,
			startPosition: {
				x: ctx.input.drag.startWorldX,
				y: ctx.input.drag.startWorldY,
			},
			currentPosition: {
				x: ctx.input.drag.currentWorldX,
				y: ctx.input.drag.currentWorldY,
			},
			entityId: ctx.input.drag.targetEntityId ?? null,
		};
	}

	private createSeededRandom(seed: number): () => number {
		let state = seed;
		return () => {
			state = (state * 1103515245 + 12345) & 0x7fffffff;
			return state / 0x7fffffff;
		};
	}
}
