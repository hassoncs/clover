import type { GodotBridge } from "@slopcade/godot-bridge";
import type { Vec2 } from "@slopcade/shared/types/common";
import type {
	AnimateOptions,
	AnimateTarget,
	CloneOptions,
	RaycastOptions,
	ReparentOptions,
	SpawnOptions,
	WaitOptions,
	WorldEntityData,
	WorldEntityQuery,
	WorldOps,
	WorldRaycastHit,
} from "@slopcade/shared/types/world-ops";
import type { EasingFunction } from "./animation/easing";
import {
	easeInOutQuad,
	easeInQuad,
	easeOutQuad,
	linear,
} from "./animation/easing";
import type { TweenSystem } from "./animation/TweenSystem";
import type { EntityManager } from "./EntityManager";
import type { Physics2D } from "./physics2d/Physics2D";
import type { EventQueue } from "./systems/runner/EventQueue";

interface WaitTimer {
	remaining: number;
	resolve: () => void;
	realtime: boolean;
}

export class WorldOpsImpl implements WorldOps {
	private waitTimers: WaitTimer[] = [];

	constructor(
		private entityManager: EntityManager,
		private physics: Physics2D,
		private bridge: GodotBridge,
		private tweenSystem: TweenSystem,
		private eventQueue: EventQueue,
		private getGameState: () => {
			variables: Record<string, unknown>;
			constants?: Record<string, number | string | boolean>;
		},
	) {}

	async spawn(
		prefabId: string,
		position: Vec2,
		opts?: SpawnOptions,
	): Promise<string | null> {
		const prefab = this.entityManager.getPrefab(prefabId);
		if (!prefab) return null;

		const entityId = this.entityManager.spawnEntity({
			prefabId,
			position,
			velocity: opts?.velocity,
			angle: opts?.angle,
			tags: opts?.tags,
			parentId: opts?.parentId,
		});

		if (!entityId) return null;

		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return null;

		if (opts?.angle) {
			await this.setRotation(entityId, opts.angle);
		}

		if (opts?.velocity && entity.physics) {
			this.physics.setLinearVelocity(entity.id, opts.velocity);
		}

		if (opts?.parentId) {
			this.entityManager.reparent(entity.id, opts.parentId);
		}

		return entity.id;
	}

	async destroy(entityId: string): Promise<void> {
		this.entityManager.destroyEntity(entityId);
	}

	async clone(entityId: string, opts?: CloneOptions): Promise<string | null> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return null;

		const prefabId = entity.prefab;
		if (!prefabId) return null;

		const position = opts?.position ?? {
			x: entity.transform.x,
			y: entity.transform.y,
		};

		const newEntityId = await this.spawn(prefabId, position);
		if (!newEntityId) return null;

		const newEntity = this.entityManager.getEntity(newEntityId);
		if (!newEntity) return null;

		newEntity.transform.angle = entity.transform.angle;
		newEntity.transform.scaleX = entity.transform.scaleX;
		newEntity.transform.scaleY = entity.transform.scaleY;

		for (const tag of entity.tags) {
			this.entityManager.addTag(newEntityId, tag);
		}

		if (opts?.withChildren && entity.children.length > 0) {
			for (const childId of entity.children) {
				const child = this.entityManager.getEntity(childId);
				if (child) {
					const childCloneId = await this.clone(childId, {
						withChildren: true,
					});
					if (childCloneId) {
						this.entityManager.reparent(childCloneId, newEntityId);
					}
				}
			}
		}

		return newEntityId;
	}

	async reparent(
		entityId: string,
		newParentId: string,
		opts?: ReparentOptions,
	): Promise<void> {
		this.entityManager.reparent(
			entityId,
			newParentId,
			opts?.keepGlobalTransform
				? undefined
				: this.entityManager.getEntity(entityId)?.localTransform,
		);
	}

	async getPosition(entityId: string): Promise<Vec2 | null> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return null;
		return { x: entity.transform.x, y: entity.transform.y };
	}

	async setPosition(entityId: string, position: Vec2): Promise<void> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return;

		entity.transform.x = position.x;
		entity.transform.y = position.y;

		if (entity.physics) {
			this.physics.setTransform(entity.id, {
				position,
				angle: entity.transform.angle,
			});
		}

		this.bridge.setPosition(entityId, position.x, position.y);
	}

	async getRotation(entityId: string): Promise<number | null> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return null;
		return entity.transform.angle;
	}

	async setRotation(entityId: string, angle: number): Promise<void> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return;

		entity.transform.angle = angle;

		if (entity.physics) {
			this.physics.setTransform(entity.id, {
				position: { x: entity.transform.x, y: entity.transform.y },
				angle,
			});
		}

		this.bridge.setRotation(entityId, (angle * 180) / Math.PI);
	}

	async getScale(entityId: string): Promise<Vec2 | null> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return null;
		return { x: entity.transform.scaleX, y: entity.transform.scaleY };
	}

	async setScale(entityId: string, scale: Vec2): Promise<void> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return;

		entity.transform.scaleX = scale.x;
		entity.transform.scaleY = scale.y;

		this.bridge.setScale(entityId, scale.x, scale.y);
	}

	async setVisible(entityId: string, visible: boolean): Promise<void> {
		this.entityManager.setEntityVisible(entityId, visible);
		this.bridge.setVisible(entityId, visible);
	}

	async getVelocity(entityId: string): Promise<Vec2 | null> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity || !entity.physics) return null;
		return this.physics.getLinearVelocity(entityId);
	}

	async setVelocity(entityId: string, velocity: Vec2): Promise<void> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity || !entity.physics) return;
		this.physics.setLinearVelocity(entityId, velocity);
	}

	async getAngularVelocity(entityId: string): Promise<number | null> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity || !entity.physics) return null;
		return this.physics.getAngularVelocity(entityId);
	}

	async setAngularVelocity(entityId: string, velocity: number): Promise<void> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity || !entity.physics) return;
		this.physics.setAngularVelocity(entityId, velocity);
	}

	async applyImpulse(entityId: string, impulse: Vec2): Promise<void> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity || !entity.physics) return;
		this.physics.applyImpulseToCenter(entityId, impulse);
		this.bridge.applyImpulse(entityId, impulse);
	}

	async applyForce(entityId: string, force: Vec2): Promise<void> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity || !entity.physics) return;
		this.physics.applyForceToCenter(entityId, force);
		this.bridge.applyForce(entityId, force);
	}

	async getTags(entityId: string): Promise<string[]> {
		const entity = this.entityManager.getEntity(entityId);
		return entity?.tags ?? [];
	}

	async addTag(entityId: string, tag: string): Promise<void> {
		this.entityManager.addTag(entityId, tag);
	}

	async removeTag(entityId: string, tag: string): Promise<boolean> {
		return this.entityManager.removeTag(entityId, tag);
	}

	async hasTag(entityId: string, tag: string): Promise<boolean> {
		return this.entityManager.hasTag(entityId, tag);
	}

	async getPrefab(entityId: string): Promise<string | undefined> {
		const entity = this.entityManager.getEntity(entityId);
		return entity?.prefab;
	}

	async getEntityData(entityId: string): Promise<WorldEntityData | null> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) return null;

		const velocity = entity.physics
			? this.physics.getLinearVelocity(entityId)
			: undefined;
		const angularVelocity = entity.physics
			? this.physics.getAngularVelocity(entityId)
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
	}

	async queryEntities(query?: WorldEntityQuery): Promise<string[]> {
		if (!query) {
			return this.entityManager.getActiveEntities().map((e) => e.id);
		}

		const withinAabb = query.inAABB
			? {
					min: { x: query.inAABB.minX, y: query.inAABB.minY },
					max: { x: query.inAABB.maxX, y: query.inAABB.maxY },
				}
			: undefined;

		const results = this.entityManager.query({
			tags: query.tag ? [query.tag] : undefined,
			prefab: query.prefabId,
			withinAabb,
		});

		return results.map((e) => e.id);
	}

	async queryEntitiesWithData(
		query?: WorldEntityQuery,
	): Promise<WorldEntityData[]> {
		const entityIds = await this.queryEntities(query);
		const results: WorldEntityData[] = [];

		for (const id of entityIds) {
			const data = await this.getEntityData(id);
			if (data) {
				results.push(data);
			}
		}

		return results;
	}

	async queryPoint(point: Vec2): Promise<string | null> {
		return this.physics.queryPoint(point);
	}

	async queryAABB(min: Vec2, max: Vec2): Promise<string[]> {
		return this.physics.queryAABB(min, max);
	}

	async raycast(
		from: Vec2,
		to: Vec2,
		opts?: RaycastOptions,
	): Promise<WorldRaycastHit | null> {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance === 0) return null;

		const direction = { x: dx / distance, y: dy / distance };

		const hit = this.physics.raycast(from, direction, distance);

		if (!hit) return null;

		return {
			entityId: hit.entityId,
			point: hit.point,
			normal: hit.normal,
			distance: hit.fraction * distance,
		};
	}

	async getVariable(name: string): Promise<unknown> {
		return this.getGameState().variables[name];
	}

	async setVariable(name: string, value: unknown): Promise<void> {
		this.getGameState().variables[name] = value;
		this.eventQueue.emit("variable_change", { name, value });
	}

	async getConstant(name: string): Promise<unknown> {
		return this.getGameState().constants?.[name];
	}

	async emit(eventName: string, data?: Record<string, unknown>): Promise<void> {
		this.eventQueue.emit(eventName, data);
	}

	async win(): Promise<void> {
		this.eventQueue.emit("game_state_change", { state: "won" });
	}

	async lose(): Promise<void> {
		this.eventQueue.emit("game_state_change", { state: "lost" });
	}

	async createPixelBuffer(
		entityId: string,
		width: number,
		height: number,
		clearColor: string,
	): Promise<void> {
		this.bridge.createPixelBuffer(entityId, width, height, clearColor);
	}

	async pixelBufferDraw(
		entityId: string,
		commands: Array<{ type: string; [key: string]: unknown }>,
	): Promise<void> {
		this.bridge.pixelBufferDraw(
			entityId,
			commands as import("@slopcade/godot-bridge").DrawCommand[],
		);
	}

	async pixelBufferClear(entityId: string, color: string): Promise<void> {
		this.bridge.pixelBufferClear(entityId, color);
	}

	async animate(
		entityId: string,
		target: AnimateTarget,
		opts: AnimateOptions,
	): Promise<void> {
		const entity = this.entityManager.getEntity(entityId);
		if (!entity) {
			console.warn(`[WorldOpsImpl.animate] Entity not found: ${entityId}`);
			return;
		}
		const promises: Promise<void>[] = [];
		const easing = this.resolveEasing(opts.easing);
		const durationSeconds = opts.duration / 1000;

		if (target.x !== undefined || target.y !== undefined) {
			const currentPos = { x: entity.transform.x, y: entity.transform.y };
			const targetPos = {
				x: target.x ?? currentPos.x,
				y: target.y ?? currentPos.y,
			};

			promises.push(
				new Promise<void>((resolve) => {
					this.tweenSystem.createTween({
						entityId,
						property: "position",
						from: currentPos,
						to: targetPos,
						duration: durationSeconds,
						ease: easing,
						onComplete: () => {
							entity.transform.x = targetPos.x;
							entity.transform.y = targetPos.y;
							resolve();
						},
					});
				}),
			);
		}

		if (target.rotation !== undefined) {
			const currentRotation = entity.transform.angle;
			const targetRotation = target.rotation;

			promises.push(
				new Promise<void>((resolve) => {
					this.tweenSystem.createTween({
						entityId,
						property: "rotation",
						from: currentRotation,
						to: targetRotation,
						duration: durationSeconds,
						ease: easing,
						onComplete: () => {
							entity.transform.angle = targetRotation;
							resolve();
						},
					});
				}),
			);
		}

		if (target.scaleX !== undefined || target.scaleY !== undefined) {
			const currentScale = {
				x: entity.transform.scaleX,
				y: entity.transform.scaleY,
			};
			const targetScale = {
				x: target.scaleX ?? currentScale.x,
				y: target.scaleY ?? currentScale.y,
			};

			promises.push(
				new Promise<void>((resolve) => {
					this.tweenSystem.createTween({
						entityId,
						property: "scale",
						from: currentScale,
						to: targetScale,
						duration: durationSeconds,
						ease: easing,
						onComplete: () => {
							entity.transform.scaleX = targetScale.x;
							entity.transform.scaleY = targetScale.y;
							resolve();
						},
					});
				}),
			);
		}

		if (target.opacity !== undefined) {
			promises.push(
				new Promise<void>((resolve) => {
					this.tweenSystem.createTween({
						entityId,
						property: "opacity",
						from: 1,
						to: target.opacity!,
						duration: durationSeconds,
						ease: easing,
						onComplete: resolve,
					});
				}),
			);
		}

		if (promises.length > 0) {
			await Promise.all(promises);
		}
	}

	async wait(ms: number, opts?: WaitOptions): Promise<void> {
		return new Promise<void>((resolve) => {
			this.waitTimers.push({
				remaining: ms / 1000,
				resolve,
				realtime: opts?.realtime ?? false,
			});
		});
	}

	updateTimers(dt: number): void {
		for (let i = this.waitTimers.length - 1; i >= 0; i--) {
			const timer = this.waitTimers[i];
			timer.remaining -= dt;
			if (timer.remaining <= 0) {
				timer.resolve();
				this.waitTimers.splice(i, 1);
			}
		}
	}

	private resolveEasing(easing?: AnimateOptions["easing"]): EasingFunction {
		switch (easing) {
			case "ease-in":
			case "ease-in-quad":
				return easeInQuad;
			case "ease-out":
			case "ease-out-quad":
				return easeOutQuad;
			case "ease-in-out":
			case "ease-in-out-quad":
				return easeInOutQuad;
			case "linear":
			default:
				return linear;
		}
	}
}
