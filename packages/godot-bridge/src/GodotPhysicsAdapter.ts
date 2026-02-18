import type { PropertySyncPayload } from "@slopcade/shared";
import { Platform } from "react-native";
import type { Physics2D } from "./physics2d/Physics2D";
import type {
	CollisionCallback,
	CollisionEvent,
	DistanceJointDef,
	JointId,
	MouseJointDef,
	PrismaticJointDef,
	RaycastHit,
	RevoluteJointDef,
	SensorCallback,
	SensorEvent,
	Transform,
	Unsubscribe,
	Vec2,
	WeldJointDef,
} from "./physics2d/types";
import { createJointId } from "./physics2d/types";
import type { EntitySpawnedEvent, EntityTransform, GodotBridge } from "./types";

interface CachedBodyState {
	transform: Transform;
	linearVelocity: Vec2;
	angularVelocity: number;
}

export function createGodotPhysicsAdapter(bridge: GodotBridge): Physics2D {
	const jointIdMap = new Map<number, JointId>();

	const userDataStore = new Map<string, unknown>();
	const groupStore = new Map<string, string>();

	const cachedStates = new Map<string, CachedBodyState>();

	const entityGenerations = new Map<string, number>();
	const knownEntities = new Set<string>();

	let nextJointId = 1;

	const collisionBeginCallbacks: CollisionCallback[] = [];
	const collisionEndCallbacks: CollisionCallback[] = [];
	const sensorBeginCallbacks: SensorCallback[] = [];
	const sensorEndCallbacks: SensorCallback[] = [];

	function handleEntitySpawned(event: EntitySpawnedEvent) {
		entityGenerations.set(event.entityId, event.generation);
		knownEntities.add(event.entityId);
	}

	function handleEntityDestroyed(entityId: string) {
		entityGenerations.delete(entityId);
		knownEntities.delete(entityId);
		cachedStates.delete(entityId);
		userDataStore.delete(entityId);
		groupStore.delete(entityId);
	}

	function handleTransformSync(transforms: Record<string, EntityTransform>) {
		for (const [entityId, transform] of Object.entries(transforms)) {
			if (!entityGenerations.has(entityId)) {
				continue;
			}
			const cached = cachedStates.get(entityId);
			cachedStates.set(entityId, {
				transform: {
					position: { x: transform.x, y: transform.y },
					angle: transform.angle,
				},
				linearVelocity: cached?.linearVelocity ?? { x: 0, y: 0 },
				angularVelocity: cached?.angularVelocity ?? 0,
			});
		}
	}

	function handlePropertySync(payload: PropertySyncPayload) {
		for (const [entityId, props] of Object.entries(payload.entities)) {
			const cached = cachedStates.get(entityId);

			const vx = props["velocity.x"];
			const vy = props["velocity.y"];
			const angVel = props["angularVelocity"];

			if (vx !== undefined && vy !== undefined) {
				if (cached) {
					cached.linearVelocity = { x: vx, y: vy };
					if (angVel !== undefined) {
						cached.angularVelocity = angVel;
					}
				} else {
					cachedStates.set(entityId, {
						transform: { position: { x: 0, y: 0 }, angle: 0 },
						linearVelocity: { x: vx, y: vy },
						angularVelocity: angVel ?? 0,
					});
				}
			}
		}
	}

	bridge.onTransformSync(handleTransformSync);
	bridge.onPropertySync(handlePropertySync);
	bridge.onEntitySpawned(handleEntitySpawned);
	bridge.onEntityDestroyed(handleEntityDestroyed);

	bridge.onCollision((event) => {
		const collisionEvent: CollisionEvent = {
			entityA: event.entityA,
			entityB: event.entityB,
			colliderA: event.entityA,
			colliderB: event.entityB,
			contacts: event.contacts,
		};
		for (const cb of collisionBeginCallbacks) {
			cb(collisionEvent);
		}
	});

	bridge.onSensorBegin((event) => {
		const sensorEvent: SensorEvent = {
			sensor: String(event.sensorShapeIndex),
			otherEntity: event.otherEntityId,
			otherCollider: String(event.otherShapeIndex),
		};
		for (const cb of sensorBeginCallbacks) {
			cb(sensorEvent);
		}
	});

	bridge.onSensorEnd((event) => {
		const sensorEvent: SensorEvent = {
			sensor: String(event.sensorShapeIndex),
			otherEntity: event.otherEntityId,
			otherCollider: String(event.otherShapeIndex),
		};
		for (const cb of sensorEndCallbacks) {
			cb(sensorEvent);
		}
	});

	const adapter: Physics2D = {
		createWorld(_gravity: Vec2): void {},

		dispose(): void {},

		destroyWorld(): void {
			bridge.clearGame();
			knownEntities.clear();
			entityGenerations.clear();
			jointIdMap.clear();
			userDataStore.clear();
			groupStore.clear();
			cachedStates.clear();
		},

		step(
			_dt: number,
			_velocityIterations?: number,
			_positionIterations?: number,
		): void {},

		destroyBody(entityId: string): void {
			bridge.destroyEntity(entityId);
			knownEntities.delete(entityId);
			entityGenerations.delete(entityId);
			userDataStore.delete(entityId);
			groupStore.delete(entityId);
			cachedStates.delete(entityId);
		},

		removeFixture(_entityId: string): void {},

		getTransform(entityId: string): Transform {
			const cached = cachedStates.get(entityId);
			if (cached) {
				return cached.transform;
			}
			return { position: { x: 0, y: 0 }, angle: 0 };
		},

		setTransform(entityId: string, transform: Transform): void {
			bridge.setTransform(
				entityId,
				transform.position.x,
				transform.position.y,
				transform.angle,
			);
		},

		getLinearVelocity(entityId: string): Vec2 {
			const cached = cachedStates.get(entityId);
			if (cached) {
				return cached.linearVelocity;
			}
			return { x: 0, y: 0 };
		},

		setLinearVelocity(entityId: string, velocity: Vec2): void {
			bridge.setLinearVelocity(entityId, velocity);

			const cached = cachedStates.get(entityId);
			if (cached) {
				cached.linearVelocity = velocity;
			} else {
				cachedStates.set(entityId, {
					transform: { position: { x: 0, y: 0 }, angle: 0 },
					linearVelocity: velocity,
					angularVelocity: 0,
				});
			}
		},

		getAngularVelocity(entityId: string): number {
			const cached = cachedStates.get(entityId);
			if (cached) {
				return cached.angularVelocity;
			}
			return 0;
		},

		setAngularVelocity(entityId: string, velocity: number): void {
			bridge.setAngularVelocity(entityId, velocity);

			const cached = cachedStates.get(entityId);
			if (cached) {
				cached.angularVelocity = velocity;
			} else {
				cachedStates.set(entityId, {
					transform: { position: { x: 0, y: 0 }, angle: 0 },
					linearVelocity: { x: 0, y: 0 },
					angularVelocity: velocity,
				});
			}
		},

		applyForce(entityId: string, force: Vec2, _worldPoint?: Vec2): void {
			bridge.applyForce(entityId, force);
		},

		applyForceToCenter(entityId: string, force: Vec2): void {
			bridge.applyForce(entityId, force);
		},

		applyImpulse(entityId: string, impulse: Vec2, _worldPoint?: Vec2): void {
			bridge.applyImpulse(entityId, impulse);
		},

		applyImpulseToCenter(entityId: string, impulse: Vec2): void {
			bridge.applyImpulse(entityId, impulse);
		},

		applyTorque(entityId: string, torque: number): void {
			bridge.applyTorque(entityId, torque);
		},

		createRevoluteJoint(def: RevoluteJointDef): JointId {
			const jointId = createJointId(nextJointId++);
			jointIdMap.set(jointId.value, jointId);

			bridge.createRevoluteJoint({
				type: "revolute",
				bodyA: def.entityA,
				bodyB: def.entityB,
				anchor: def.anchor,
				enableLimit: def.enableLimit,
				lowerAngle: def.lowerAngle,
				upperAngle: def.upperAngle,
				enableMotor: def.enableMotor,
				motorSpeed: def.motorSpeed,
				maxMotorTorque: def.maxMotorTorque,
			});

			return jointId;
		},

		createDistanceJoint(def: DistanceJointDef): JointId {
			const jointId = createJointId(nextJointId++);
			jointIdMap.set(jointId.value, jointId);

			bridge.createDistanceJoint({
				type: "distance",
				bodyA: def.entityA,
				bodyB: def.entityB,
				anchorA: def.anchorA,
				anchorB: def.anchorB,
				length: def.length,
				stiffness: def.stiffness,
				damping: def.damping,
			});

			return jointId;
		},

		createPrismaticJoint(def: PrismaticJointDef): JointId {
			const jointId = createJointId(nextJointId++);
			jointIdMap.set(jointId.value, jointId);

			bridge.createPrismaticJoint({
				type: "prismatic",
				bodyA: def.entityA,
				bodyB: def.entityB,
				anchor: def.anchor,
				axis: def.axis,
				enableLimit: def.enableLimit,
				lowerTranslation: def.lowerTranslation,
				upperTranslation: def.upperTranslation,
				enableMotor: def.enableMotor,
				motorSpeed: def.motorSpeed,
				maxMotorForce: def.maxMotorForce,
			});

			return jointId;
		},

		createMouseJoint(def: MouseJointDef): JointId {
			const jointId = createJointId(nextJointId++);
			jointIdMap.set(jointId.value, jointId);

			bridge.createMouseJoint({
				type: "mouse",
				body: def.entity,
				target: def.target,
				maxForce: def.maxForce,
				stiffness: def.stiffness,
				damping: def.damping,
			});

			return jointId;
		},

		createWeldJoint(def: WeldJointDef): JointId {
			const jointId = createJointId(nextJointId++);
			jointIdMap.set(jointId.value, jointId);

			bridge.createWeldJoint({
				type: "weld",
				bodyA: def.entityA,
				bodyB: def.entityB,
				anchor: def.anchor,
				stiffness: def.stiffness,
				damping: def.damping,
			});

			return jointId;
		},

		destroyJoint(id: JointId): void {
			bridge.destroyJoint(id.value);
			jointIdMap.delete(id.value);
		},

		setMotorSpeed(id: JointId, speed: number): void {
			bridge.setMotorSpeed(id.value, speed);
		},

		setMouseTarget(id: JointId, target: Vec2): void {
			bridge.setMouseTarget(id.value, target);
		},

		queryPoint(_point: Vec2): string | null {
			if (Platform.OS !== "web") {
				console.warn(
					"[GodotPhysicsAdapter] queryPoint is async on native - use queryPointAsync instead",
				);
			}
			return null;
		},

		queryAABB(_min: Vec2, _max: Vec2): string[] {
			if (Platform.OS !== "web") {
				console.warn(
					"[GodotPhysicsAdapter] queryAABB is async on native - use queryAABBAsync instead",
				);
			}
			return [];
		},

		raycast(
			_origin: Vec2,
			_direction: Vec2,
			_maxDistance: number,
		): RaycastHit | null {
			if (Platform.OS !== "web") {
				console.warn(
					"[GodotPhysicsAdapter] raycast is async on native - use raycastAsync instead",
				);
			}
			return null;
		},

		onCollision(callback: CollisionCallback): Unsubscribe {
			collisionBeginCallbacks.push(callback);
			return () => {
				const index = collisionBeginCallbacks.indexOf(callback);
				if (index >= 0) collisionBeginCallbacks.splice(index, 1);
			};
		},

		onSensorBegin(callback: SensorCallback): Unsubscribe {
			sensorBeginCallbacks.push(callback);
			return () => {
				const index = sensorBeginCallbacks.indexOf(callback);
				if (index >= 0) sensorBeginCallbacks.splice(index, 1);
			};
		},

		onSensorEnd(callback: SensorCallback): Unsubscribe {
			sensorEndCallbacks.push(callback);
			return () => {
				const index = sensorEndCallbacks.indexOf(callback);
				if (index >= 0) sensorEndCallbacks.splice(index, 1);
			};
		},

		getUserData<T = unknown>(entityId: string): T | undefined {
			return userDataStore.get(entityId) as T | undefined;
		},

		setUserData(entityId: string, data: unknown): void {
			userDataStore.set(entityId, data);
		},

		getGroup(entityId: string): string | undefined {
			return groupStore.get(entityId);
		},

		getAllEntities(): string[] {
			return Array.from(knownEntities);
		},

		getEntitiesInGroup(group: string): string[] {
			const result: string[] = [];
			for (const [entityId, g] of groupStore) {
				if (g === group) {
					result.push(entityId);
				}
			}
			return result;
		},
	};

	return adapter;
}
