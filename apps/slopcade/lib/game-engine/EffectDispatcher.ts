import {
	type CompiledExpression,
	compile,
	createDefaultContext,
	type EvalContext,
	type ExpressionValueType,
} from "@slopcade/shared";
import type { GodotBridge } from "../godot/types";
import type { EntityManager } from "./EntityManager";
import type { RuntimeEntity } from "./types";

type EffectParamsRecord = Record<string, unknown>;

type SpriteEffectType = string;

interface SpriteEffectConfig {
	effect: SpriteEffectType;
	params?: EffectParamsRecord;
}

interface ConditionalBehaviorCondition {
	hasTag?: string;
	hasAnyTag?: string[];
	hasAllTags?: string[];
	lacksTag?: string;
	expr?: string;
}

type SpriteEffectParams = EffectParamsRecord;

interface ResolvedEffect {
	effect: SpriteEffectType;
	params: EffectParamsRecord;
	source: "declarative" | "script";
	effectId?: string;
}

interface ScriptOverride {
	effectId: string;
	effect: SpriteEffectType;
	params: EffectParamsRecord;
	order: number;
}

export interface EntityEffectState {
	entityId: string;
	declarativeEffect: ResolvedEffect | null;
	scriptOverrides: Map<string, ScriptOverride>;
	activeEffect: ResolvedEffect | null;
	nextScriptOrder: number;
}

export interface EffectDispatcherOptions {
	entityManager: EntityManager;
	bridge: GodotBridge;
	getVariables?: () => Record<string, unknown>;
}

export class EffectDispatcher {
	private readonly entityManager: EntityManager;
	private readonly bridge: GodotBridge;
	private readonly getVariables: () => Record<string, unknown>;
	private readonly effectStateByEntityId = new Map<string, EntityEffectState>();
	private readonly expressionCache = new Map<string, CompiledExpression>();
	private readonly unsubscribers: Array<() => void> = [];

	constructor(options: EffectDispatcherOptions) {
		this.entityManager = options.entityManager;
		this.bridge = options.bridge;
		this.getVariables = options.getVariables ?? (() => ({}));

		this.unsubscribers.push(
			this.entityManager.onEntitySpawned((entity) => {
				this.reconcileEntity(entity.id);
			}),
			this.entityManager.onEntityDestroyed((entityId) => {
				this.handleEntityDestroyed(entityId);
			}),
			this.entityManager.onEntityTagsChanged((entityId) => {
				this.reconcileEntity(entityId);
			}),
		);

		for (const entity of this.entityManager.getAllEntities()) {
			this.reconcileEntity(entity.id);
		}
	}

	destroy(): void {
		for (const unsubscribe of this.unsubscribers) {
			unsubscribe();
		}
		this.unsubscribers.length = 0;

		for (const entityId of this.effectStateByEntityId.keys()) {
			this.bridge.clearSpriteEffect(entityId);
		}

		this.effectStateByEntityId.clear();
	}

	getTrackedEntityCount(): number {
		return this.effectStateByEntityId.size;
	}

	applyScriptEffect(
		entityId: string,
		effect: SpriteEffectType,
		params?: SpriteEffectParams,
	): string {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) {
			return "";
		}

		const state = this.ensureEntityState(entityId);
		const explicitId =
			typeof params?.id === "string" && params.id.length > 0 ? params.id : null;
		const effectId =
			explicitId ??
			`effect_${effect}_${entityId}_${state.nextScriptOrder.toString(36)}`;

		state.nextScriptOrder += 1;
		state.scriptOverrides.set(effectId, {
			effectId,
			effect,
			params: this.normalizeParams(params),
			order: state.nextScriptOrder,
		});

		this.reconcileEntity(entityId);
		return effectId;
	}

	updateScriptEffectParam(
		entityId: string,
		effectId: string,
		paramName: string,
		value: unknown,
	): void {
		const state = this.effectStateByEntityId.get(entityId);
		if (!state) {
			return;
		}

		const override = state.scriptOverrides.get(effectId);
		if (!override) {
			return;
		}

		override.params[paramName] =
			paramName === "color" ? this.normalizeColor(value) : value;
		this.reconcileEntity(entityId);
	}

	clearScriptEffect(entityId: string, effectId?: string): void {
		const state = this.effectStateByEntityId.get(entityId);
		if (!state) {
			return;
		}

		if (effectId) {
			state.scriptOverrides.delete(effectId);
		} else {
			state.scriptOverrides.clear();
		}

		this.reconcileEntity(entityId);
	}

	reconcileEntity(entityId: string): void {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) {
			this.handleEntityDestroyed(entityId);
			return;
		}

		const state = this.ensureEntityState(entityId);
		state.declarativeEffect = this.resolveDeclarativeEffect(entity);
		const desiredEffect = this.resolveDesiredEffect(state);
		this.applyDiff(entityId, state.activeEffect, desiredEffect);
		state.activeEffect = desiredEffect;

		if (!state.activeEffect && state.scriptOverrides.size === 0) {
			this.effectStateByEntityId.delete(entityId);
		}
	}

	private handleEntityDestroyed(entityId: string): void {
		const state = this.effectStateByEntityId.get(entityId);
		if (!state) {
			return;
		}

		if (state.activeEffect) {
			this.bridge.clearSpriteEffect(entityId);
		}

		this.effectStateByEntityId.delete(entityId);
	}

	private ensureEntityState(entityId: string): EntityEffectState {
		const existing = this.effectStateByEntityId.get(entityId);
		if (existing) {
			return existing;
		}

		const created: EntityEffectState = {
			entityId,
			declarativeEffect: null,
			scriptOverrides: new Map(),
			activeEffect: null,
			nextScriptOrder: 0,
		};

		this.effectStateByEntityId.set(entityId, created);
		return created;
	}

	private resolveDeclarativeEffect(
		entity: RuntimeEntity,
	): ResolvedEffect | null {
		type PrefabWithEffects = {
			effects?: SpriteEffectConfig[];
			effectStates?: Array<{
				when: ConditionalBehaviorCondition;
				priority: number;
				effects: SpriteEffectConfig[];
			}>;
		};

		const prefab = entity.prefab
			? (this.entityManager.getPrefab(entity.prefab) as
					| PrefabWithEffects
					| undefined)
			: undefined;

		const orderedEffects: SpriteEffectConfig[] = [];
		orderedEffects.push(...(prefab?.effects ?? []));
		orderedEffects.push(...(entity.effects ?? []));

		const activeStateEffects = this.resolveActiveStateEffects(entity, {
			prefabStateGroups: prefab?.effectStates,
			entityStateGroups: entity.effectStates,
		});
		orderedEffects.push(...activeStateEffects);

		if (orderedEffects.length === 0) {
			return null;
		}

		const chosen = orderedEffects[orderedEffects.length - 1];
		return {
			effect: chosen.effect,
			params: this.normalizeParams(chosen.params),
			source: "declarative",
		};
	}

	private resolveActiveStateEffects(
		entity: RuntimeEntity,
		groups: {
			prefabStateGroups?: Array<{
				when: ConditionalBehaviorCondition;
				priority: number;
				effects: SpriteEffectConfig[];
			}>;
			entityStateGroups?: Array<{
				when: ConditionalBehaviorCondition;
				priority: number;
				effects: SpriteEffectConfig[];
			}>;
		},
	): SpriteEffectConfig[] {
		type Candidate = {
			priority: number;
			sourceRank: number;
			order: number;
			effects: SpriteEffectConfig[];
		};

		const candidates: Candidate[] = [];
		for (const [index, group] of (groups.prefabStateGroups ?? []).entries()) {
			if (this.matchesCondition(entity, group.when)) {
				candidates.push({
					priority: group.priority,
					sourceRank: 0,
					order: index,
					effects: group.effects,
				});
			}
		}

		for (const [index, group] of (groups.entityStateGroups ?? []).entries()) {
			if (this.matchesCondition(entity, group.when)) {
				candidates.push({
					priority: group.priority,
					sourceRank: 1,
					order: index,
					effects: group.effects,
				});
			}
		}

		if (candidates.length === 0) {
			return [];
		}

		candidates.sort((a, b) => {
			if (b.priority !== a.priority) {
				return b.priority - a.priority;
			}
			if (b.sourceRank !== a.sourceRank) {
				return b.sourceRank - a.sourceRank;
			}
			return b.order - a.order;
		});

		return candidates[0].effects;
	}

	private matchesCondition(
		entity: RuntimeEntity,
		condition: ConditionalBehaviorCondition,
	): boolean {
		if (condition.hasTag && !entity.tags.includes(condition.hasTag)) {
			return false;
		}

		if (condition.lacksTag && entity.tags.includes(condition.lacksTag)) {
			return false;
		}

		if (
			condition.hasAllTags &&
			!condition.hasAllTags.every((tag) => entity.tags.includes(tag))
		) {
			return false;
		}

		if (
			condition.hasAnyTag &&
			!condition.hasAnyTag.some((tag) => entity.tags.includes(tag))
		) {
			return false;
		}

		if (condition.expr && condition.expr.trim().length > 0) {
			const result = this.evaluateConditionExpr(entity, condition.expr);
			if (!result) {
				return false;
			}
		}

		return true;
	}

	private evaluateConditionExpr(
		entity: RuntimeEntity,
		expression: string,
	): boolean {
		try {
			const compiled = this.getCompiledExpression(expression);
			const context = this.buildEvalContext(entity);
			const value = compiled.evaluate(context);

			if (typeof value === "boolean") {
				return value;
			}
			if (typeof value === "number") {
				return value !== 0;
			}
			if (typeof value === "string") {
				return value.length > 0;
			}
			return false;
		} catch {
			return false;
		}
	}

	private getCompiledExpression(expression: string): CompiledExpression {
		const cached = this.expressionCache.get(expression);
		if (cached) {
			return cached;
		}

		const compiled = compile(expression);
		this.expressionCache.set(expression, compiled);
		return compiled;
	}

	private buildEvalContext(entity: RuntimeEntity): EvalContext {
		const variables = this.toExpressionVariables(this.getVariables());
		const self: EvalContext["self"] = {
			id: entity.id,
			transform: {
				x: entity.transform.x,
				y: entity.transform.y,
				angle: entity.transform.angle,
			},
			tags: [...entity.tags],
		};

		return createDefaultContext({ variables, self });
	}

	private toExpressionVariables(
		variables: Record<string, unknown>,
	): Record<string, ExpressionValueType> {
		const normalized: Record<string, ExpressionValueType> = {};

		for (const [key, value] of Object.entries(variables)) {
			if (
				typeof value === "number" ||
				typeof value === "boolean" ||
				typeof value === "string"
			) {
				normalized[key] = value;
			}
		}

		return normalized;
	}

	private resolveDesiredEffect(
		state: EntityEffectState,
	): ResolvedEffect | null {
		if (state.scriptOverrides.size > 0) {
			let latest: ScriptOverride | null = null;
			for (const override of state.scriptOverrides.values()) {
				if (!latest || override.order > latest.order) {
					latest = override;
				}
			}

			if (latest) {
				return {
					effect: latest.effect,
					params: { ...latest.params },
					source: "script",
					effectId: latest.effectId,
				};
			}
		}

		if (!state.declarativeEffect) {
			return null;
		}

		return {
			effect: state.declarativeEffect.effect,
			params: { ...state.declarativeEffect.params },
			source: "declarative",
		};
	}

	private applyDiff(
		entityId: string,
		current: ResolvedEffect | null,
		desired: ResolvedEffect | null,
	): void {
		if (!current && !desired) {
			return;
		}

		if (!current && desired) {
			this.bridge.applySpriteEffect(entityId, desired.effect, desired.params);
			return;
		}

		if (current && !desired) {
			this.bridge.clearSpriteEffect(entityId);
			return;
		}

		if (!current || !desired) {
			return;
		}

		if (current.effect !== desired.effect) {
			this.bridge.applySpriteEffect(entityId, desired.effect, desired.params);
			return;
		}

		const diff = this.diffParams(current.params, desired.params);
		if (diff.reapply) {
			this.bridge.applySpriteEffect(entityId, desired.effect, desired.params);
			return;
		}

		for (const [paramName, value] of diff.changedEntries) {
			this.bridge.updateSpriteEffectParam(entityId, paramName, value);
		}
	}

	private diffParams(
		current: EffectParamsRecord,
		desired: EffectParamsRecord,
	): {
		reapply: boolean;
		changedEntries: Array<[string, unknown]>;
	} {
		const changedEntries: Array<[string, unknown]> = [];

		for (const key of Object.keys(current)) {
			if (!(key in desired)) {
				return { reapply: true, changedEntries: [] };
			}
		}

		for (const [key, value] of Object.entries(desired)) {
			if (!this.valuesEqual(current[key], value)) {
				changedEntries.push([key, value]);
			}
		}

		return { reapply: false, changedEntries };
	}

	private valuesEqual(a: unknown, b: unknown): boolean {
		if (a === b) {
			return true;
		}
		return JSON.stringify(a) === JSON.stringify(b);
	}

	private normalizeParams(params?: SpriteEffectParams): EffectParamsRecord {
		if (!params || typeof params !== "object") {
			return {};
		}

		const normalized: EffectParamsRecord = {};
		for (const [key, value] of Object.entries(params)) {
			if (key === "color") {
				normalized[key] = this.normalizeColor(value);
				continue;
			}
			normalized[key] = value;
		}

		return normalized;
	}

	private normalizeColor(value: unknown): unknown {
		if (typeof value === "string") {
			const hex = value.startsWith("#") ? value.slice(1) : value;
			if (/^[0-9a-fA-F]{6}$/.test(hex)) {
				const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
				const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
				const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
				return [r, g, b];
			}
			return value;
		}

		if (!Array.isArray(value) || value.length < 3) {
			return value;
		}

		const numeric = value
			.slice(0, 4)
			.filter((entry): entry is number => typeof entry === "number");
		if (numeric.length < 3) {
			return value;
		}

		const needsScale = numeric.some((component) => component > 1);
		return numeric.map((component) => {
			const normalized = needsScale ? component / 255 : component;
			return Math.max(0, Math.min(1, normalized));
		});
	}
}
