import type { PropertySyncPayload } from "@slopcade/shared";
import type {
	CollisionEnterEvent,
	CollisionEvent,
	CollisionExitEvent,
	EntitySpawnedEvent,
	EntityTransform,
	SensorEvent,
} from "./types";

export interface BridgeCallbackArrays {
	collision: ((event: CollisionEvent) => void)[];
	collisionEnter: ((event: CollisionEnterEvent) => void)[];
	collisionExit: ((event: CollisionExitEvent) => void)[];
	destroy: ((entityId: string) => void)[];
	entitySpawned: ((event: EntitySpawnedEvent) => void)[];
	sensorBegin: ((event: SensorEvent) => void)[];
	sensorEnd: ((event: SensorEvent) => void)[];
	inputEvent: ((
		type: string,
		x: number,
		y: number,
		entityId: string | null,
	) => void)[];
	uiButton: ((
		eventType: "button_down" | "button_up" | "button_pressed",
		buttonId: string,
	) => void)[];
	transformSync: ((transforms: Record<string, EntityTransform>) => void)[];
	propertySync: ((properties: PropertySyncPayload) => void)[];
	score: ((points: number, entityId: string) => void)[];
}

export function createCallbackArrays(): BridgeCallbackArrays {
	return {
		collision: [],
		collisionEnter: [],
		collisionExit: [],
		destroy: [],
		entitySpawned: [],
		sensorBegin: [],
		sensorEnd: [],
		inputEvent: [],
		uiButton: [],
		transformSync: [],
		propertySync: [],
		score: [],
	};
}

function subscribe<T>(arr: T[], callback: T): () => void {
	arr.push(callback);
	return () => {
		const index = arr.indexOf(callback);
		if (index >= 0) arr.splice(index, 1);
	};
}

export function createCallbackMethods(cbs: BridgeCallbackArrays) {
	return {
		onCollision(callback: (event: CollisionEvent) => void) {
			return subscribe(cbs.collision, callback);
		},
		onCollisionEnter(callback: (event: CollisionEnterEvent) => void) {
			return subscribe(cbs.collisionEnter, callback);
		},
		onCollisionExit(callback: (event: CollisionExitEvent) => void) {
			return subscribe(cbs.collisionExit, callback);
		},
		onEntityDestroyed(callback: (entityId: string) => void) {
			return subscribe(cbs.destroy, callback);
		},
		onEntitySpawned(callback: (event: EntitySpawnedEvent) => void) {
			return subscribe(cbs.entitySpawned, callback);
		},
		onSensorBegin(callback: (event: SensorEvent) => void) {
			return subscribe(cbs.sensorBegin, callback);
		},
		onSensorEnd(callback: (event: SensorEvent) => void) {
			return subscribe(cbs.sensorEnd, callback);
		},
		onTransformSync(
			callback: (transforms: Record<string, EntityTransform>) => void,
		) {
			return subscribe(cbs.transformSync, callback);
		},
		onPropertySync(callback: (properties: PropertySyncPayload) => void) {
			return subscribe(cbs.propertySync, callback);
		},
		onScore(callback: (points: number, entityId: string) => void) {
			return subscribe(cbs.score, callback);
		},
		onInputEvent(
			callback: (
				type: string,
				x: number,
				y: number,
				entityId: string | null,
			) => void,
		) {
			return subscribe(cbs.inputEvent, callback);
		},
		onUIButtonEvent(
			callback: (
				eventType: "button_down" | "button_up" | "button_pressed",
				buttonId: string,
			) => void,
		) {
			return subscribe(cbs.uiButton, callback);
		},
	};
}

export function clearAllCallbacks(cbs: BridgeCallbackArrays): void {
	for (const key of Object.keys(cbs) as (keyof BridgeCallbackArrays)[]) {
		cbs[key].length = 0;
	}
}
