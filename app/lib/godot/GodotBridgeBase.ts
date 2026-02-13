import type { PropertySyncPayload } from "@slopcade/shared";
import type {
	CollisionEnterEvent,
	CollisionEvent,
	CollisionExitEvent,
	EffectsError,
	EffectsPipelineSnapshot,
	EffectsResult,
	EntitySpawnedEvent,
	EntityTransform,
	SensorEvent,
} from "./types";

type EffectsRawPassSnapshot = {
	id?: string;
	passId?: string;
	params?: Record<string, unknown>;
};

type EffectsRawFeedbackState = {
	frameCount?: unknown;
	frozen?: unknown;
};

const EFFECTS_ERROR_CODE = "E_EFFECTS_EXECUTION";

function toEffectsError(error: unknown): EffectsError {
	if (typeof error === "string") {
		return { code: EFFECTS_ERROR_CODE, message: error };
	}

	if (error && typeof error === "object") {
		const err = error as {
			code?: unknown;
			message?: unknown;
			details?: unknown;
			error?: unknown;
		};

		if (err.error !== undefined) {
			return toEffectsError(err.error);
		}

		return {
			code:
				typeof err.code === "string" && err.code.length > 0
					? err.code
					: EFFECTS_ERROR_CODE,
			message:
				typeof err.message === "string" && err.message.length > 0
					? err.message
					: "Effects operation failed",
			details:
				err.details && typeof err.details === "object"
					? (err.details as Record<string, unknown>)
					: undefined,
		};
	}

	return {
		code: EFFECTS_ERROR_CODE,
		message: "Effects operation failed",
	};
}

export function normalizeEffectsResult<T = void>(
	raw: unknown,
	mapData?: (rawData: unknown) => T,
): EffectsResult<T> {
	if (raw && typeof raw === "object") {
		const payload = raw as {
			success?: unknown;
			error?: unknown;
			data?: unknown;
			message?: unknown;
		};

		if (payload.success === false || payload.error !== undefined) {
			return {
				success: false,
				error: toEffectsError(payload.error ?? payload.message),
			};
		}

		if (payload.success === true) {
			const dataSource = payload.data !== undefined ? payload.data : raw;
			return {
				success: true,
				data: mapData ? mapData(dataSource) : (undefined as T),
			};
		}
	}

	if (raw === null || raw === undefined) {
		return {
			success: false,
			error: {
				code: "E_EFFECTS_EMPTY_RESPONSE",
				message: "Effects operation returned no response",
			},
		};
	}

	return {
		success: true,
		data: mapData ? mapData(raw) : (undefined as T),
	};
}

export function normalizeEffectsSnapshot(
	raw: unknown,
): EffectsPipelineSnapshot {
	const payload = (
		raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
	) as {
		planHash?: unknown;
		hash?: unknown;
		passParams?: unknown;
		passes?: EffectsRawPassSnapshot[];
		feedbackStates?: Record<string, EffectsRawFeedbackState>;
		lifecycleState?: unknown;
		state?: unknown;
		timestamp?: unknown;
	};

	const passParams: Record<string, Record<string, unknown>> = {};
	if (payload.passParams && typeof payload.passParams === "object") {
		for (const [passId, params] of Object.entries(payload.passParams)) {
			if (params && typeof params === "object") {
				passParams[passId] = params as Record<string, unknown>;
			}
		}
	}

	if (Array.isArray(payload.passes)) {
		for (const pass of payload.passes) {
			if (!pass || typeof pass !== "object") {
				continue;
			}
			const passId =
				typeof pass.id === "string"
					? pass.id
					: typeof pass.passId === "string"
						? pass.passId
						: "";
			if (!passId) {
				continue;
			}
			passParams[passId] =
				pass.params && typeof pass.params === "object" ? pass.params : {};
		}
	}

	const feedbackStates: EffectsPipelineSnapshot["feedbackStates"] = {};
	if (payload.feedbackStates && typeof payload.feedbackStates === "object") {
		for (const [feedbackId, state] of Object.entries(payload.feedbackStates)) {
			feedbackStates[feedbackId] = {
				frameCount:
					state && typeof state.frameCount === "number" ? state.frameCount : 0,
				frozen: !!(state && typeof state.frozen === "boolean"
					? state.frozen
					: false),
			};
		}
	}

	return {
		planHash:
			typeof payload.planHash === "string"
				? payload.planHash
				: typeof payload.hash === "string"
					? payload.hash
					: "",
		passParams,
		feedbackStates,
		lifecycleState:
			typeof payload.lifecycleState === "string"
				? payload.lifecycleState
				: typeof payload.state === "string"
					? payload.state
					: "idle",
		timestamp:
			typeof payload.timestamp === "number" ? payload.timestamp : Date.now(),
	};
}

export function createEffectsSnapshotPayload(
	snapshot: EffectsPipelineSnapshot,
): Record<string, unknown> {
	const passes = Object.entries(snapshot.passParams).map(([id, params]) => ({
		id,
		params,
	}));

	return {
		planHash: snapshot.planHash,
		state: snapshot.lifecycleState,
		timestamp: snapshot.timestamp,
		feedbackStates: snapshot.feedbackStates,
		passes,
	};
}

export abstract class GodotBridgeBase {
	protected collisionCallbacks: ((event: CollisionEvent) => void)[] = [];
	protected collisionEnterCallbacks: ((event: CollisionEnterEvent) => void)[] =
		[];
	protected collisionExitCallbacks: ((event: CollisionExitEvent) => void)[] =
		[];
	protected destroyCallbacks: ((entityId: string) => void)[] = [];
	protected entitySpawnedCallbacks: ((event: EntitySpawnedEvent) => void)[] =
		[];
	protected sensorBeginCallbacks: ((event: SensorEvent) => void)[] = [];
	protected sensorEndCallbacks: ((event: SensorEvent) => void)[] = [];
	protected inputEventCallbacks: ((
		type: string,
		x: number,
		y: number,
		entityId: string | null,
	) => void)[] = [];
	protected uiButtonCallbacks: ((
		eventType: "button_down" | "button_up" | "button_pressed",
		buttonId: string,
	) => void)[] = [];
	protected transformSyncCallbacks: ((
		transforms: Record<string, EntityTransform>,
	) => void)[] = [];
	protected propertySyncCallbacks: ((
		properties: PropertySyncPayload,
	) => void)[] = [];
	protected scoreCallbacks: ((points: number, entityId: string) => void)[] = [];

	onCollision(callback: (event: CollisionEvent) => void): () => void {
		this.collisionCallbacks.push(callback);
		return () => {
			const index = this.collisionCallbacks.indexOf(callback);
			if (index >= 0) this.collisionCallbacks.splice(index, 1);
		};
	}

	onCollisionEnter(callback: (event: CollisionEnterEvent) => void): () => void {
		this.collisionEnterCallbacks.push(callback);
		return () => {
			const index = this.collisionEnterCallbacks.indexOf(callback);
			if (index >= 0) this.collisionEnterCallbacks.splice(index, 1);
		};
	}

	onCollisionExit(callback: (event: CollisionExitEvent) => void): () => void {
		this.collisionExitCallbacks.push(callback);
		return () => {
			const index = this.collisionExitCallbacks.indexOf(callback);
			if (index >= 0) this.collisionExitCallbacks.splice(index, 1);
		};
	}

	onEntityDestroyed(callback: (entityId: string) => void): () => void {
		this.destroyCallbacks.push(callback);
		return () => {
			const index = this.destroyCallbacks.indexOf(callback);
			if (index >= 0) this.destroyCallbacks.splice(index, 1);
		};
	}

	onEntitySpawned(callback: (event: EntitySpawnedEvent) => void): () => void {
		this.entitySpawnedCallbacks.push(callback);
		return () => {
			const index = this.entitySpawnedCallbacks.indexOf(callback);
			if (index >= 0) this.entitySpawnedCallbacks.splice(index, 1);
		};
	}

	onSensorBegin(callback: (event: SensorEvent) => void): () => void {
		this.sensorBeginCallbacks.push(callback);
		return () => {
			const index = this.sensorBeginCallbacks.indexOf(callback);
			if (index >= 0) this.sensorBeginCallbacks.splice(index, 1);
		};
	}

	onSensorEnd(callback: (event: SensorEvent) => void): () => void {
		this.sensorEndCallbacks.push(callback);
		return () => {
			const index = this.sensorEndCallbacks.indexOf(callback);
			if (index >= 0) this.sensorEndCallbacks.splice(index, 1);
		};
	}

	onTransformSync(
		callback: (transforms: Record<string, EntityTransform>) => void,
	): () => void {
		this.transformSyncCallbacks.push(callback);
		return () => {
			const index = this.transformSyncCallbacks.indexOf(callback);
			if (index >= 0) this.transformSyncCallbacks.splice(index, 1);
		};
	}

	onPropertySync(
		callback: (properties: PropertySyncPayload) => void,
	): () => void {
		this.propertySyncCallbacks.push(callback);
		return () => {
			const index = this.propertySyncCallbacks.indexOf(callback);
			if (index >= 0) this.propertySyncCallbacks.splice(index, 1);
		};
	}

	onScore(callback: (points: number, entityId: string) => void): () => void {
		this.scoreCallbacks.push(callback);
		return () => {
			const index = this.scoreCallbacks.indexOf(callback);
			if (index >= 0) this.scoreCallbacks.splice(index, 1);
		};
	}

	onInputEvent(
		callback: (
			type: string,
			x: number,
			y: number,
			entityId: string | null,
		) => void,
	): () => void {
		this.inputEventCallbacks.push(callback);
		return () => {
			const index = this.inputEventCallbacks.indexOf(callback);
			if (index >= 0) this.inputEventCallbacks.splice(index, 1);
		};
	}

	protected generateEntityId(prefabId: string): string {
		return `${prefabId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	}
}
