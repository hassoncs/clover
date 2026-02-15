import type { GameDefinition, GameEntity, GameJoint } from "@slopcade/shared";
import type { EffectGraphSpec } from "@slopcade/shared/effects";
import { compileGraph } from "@slopcade/shared/effects";
import type { GodotBridge } from "../godot/types";
import type { Physics2D } from "../physics2d/Physics2D";
import type { JointId } from "../physics2d/types";
import { EntityManager } from "./EntityManager";
import { createGameEventBus } from "./runtime/GameEventBus";
import { createGameState } from "./runtime/GameStateHelpers";
import type { GameEventBus, GameState } from "./runtime/types";

export interface LoadedGame {
	definition: GameDefinition;
	entityManager: EntityManager;
	pixelsPerMeter: number;
	joints: Map<string, JointId>;
	gameState: GameState;
	events: GameEventBus;
}

export interface GameLoaderOptions {
	physics: Physics2D;
	bridge?: GodotBridge;
}

export class GameLoader {
	private physics: Physics2D;
	private bridge: GodotBridge | undefined;

	constructor(options: GameLoaderOptions) {
		this.physics = options.physics;
		this.bridge = options.bridge;
	}

	load(definition: GameDefinition): LoadedGame {
		const pixelsPerMeter = definition.world.pixelsPerMeter ?? 50;

		this.physics.createWorld(definition.world.gravity);

		const entityManager = new EntityManager({
			prefabs: definition.prefabs,
			bridge: this.bridge,
		});

		entityManager.loadEntities(definition.entities);

		const joints = new Map<string, JointId>();
		if (definition.joints) {
			for (const joint of definition.joints) {
				const jointId = this.createJoint(joint, entityManager);
				if (jointId) {
					joints.set(joint.id, jointId);
				}
			}
		}

		const gameState = createGameState(definition);
		const events = createGameEventBus();

		return {
			definition,
			entityManager,
			pixelsPerMeter,
			joints,
			gameState,
			events,
		};
	}

	private createJoint(
		joint: GameJoint,
		entityManager: EntityManager,
	): JointId | null {
		const entityA = entityManager.getEntity(joint.entityA);
		const entityB = entityManager.getEntity(joint.entityB);

		if (!entityA?.physics || !entityB?.physics) {
			console.warn(
				`Cannot create joint ${joint.id}: entities not found or missing physics bodies`,
			);
			return null;
		}

		const baseProps = {
			entityA: entityA.id,
			entityB: entityB.id,
			collideConnected: joint.collideConnected,
		};

		switch (joint.type) {
			case "revolute":
				return this.physics.createRevoluteJoint({
					...baseProps,
					type: "revolute",
					anchor: joint.anchor,
					enableLimit: joint.enableLimit,
					lowerAngle: joint.lowerAngle,
					upperAngle: joint.upperAngle,
					enableMotor: joint.enableMotor,
					motorSpeed: joint.motorSpeed,
					maxMotorTorque: joint.maxMotorTorque,
				});

			case "distance":
				return this.physics.createDistanceJoint({
					...baseProps,
					type: "distance",
					anchorA: joint.anchorA,
					anchorB: joint.anchorB,
					length: joint.length,
					stiffness: joint.stiffness,
					damping: joint.damping,
				});

			case "weld":
				return this.physics.createWeldJoint({
					...baseProps,
					type: "weld",
					anchor: joint.anchor,
					stiffness: joint.stiffness,
					damping: joint.damping,
				});

			case "prismatic":
				return this.physics.createPrismaticJoint({
					...baseProps,
					type: "prismatic",
					anchor: joint.anchor,
					axis: joint.axis,
					enableLimit: joint.enableLimit,
					lowerTranslation: joint.lowerTranslation,
					upperTranslation: joint.upperTranslation,
					enableMotor: joint.enableMotor,
					motorSpeed: joint.motorSpeed,
					maxMotorForce: joint.maxMotorForce,
				});

			default:
				console.warn(`Unknown joint type: ${(joint as GameJoint).type}`);
				return null;
		}
	}

	unload(game: LoadedGame): void {
		game.entityManager.clearAll();
		this.physics.destroyWorld();
	}

	loadSectioned(definition: GameDefinition): LoadedGame {
		const pixelsPerMeter = definition.world.pixelsPerMeter ?? 50;

		this.physics.createWorld(definition.world.gravity);

		this.bridge?.setupWorld(definition.world, definition.background);
		this.bridge?.registerPrefabs(definition.prefabs);
		this.bridge?.loadEntities(definition.entities);

		const entityManager = new EntityManager({
			prefabs: definition.prefabs,
			bridge: this.bridge,
		});

		entityManager.loadEntities(definition.entities);

		const joints = new Map<string, JointId>();
		if (definition.joints) {
			for (const joint of definition.joints) {
				const jointId = this.createJoint(joint, entityManager);
				if (jointId) {
					joints.set(joint.id, jointId);
				}
			}
		}

		const gameState = createGameState(definition);
		const events = createGameEventBus();

		return {
			definition,
			entityManager,
			pixelsPerMeter,
			joints,
			gameState,
			events,
		};
	}

	swapEntities(game: LoadedGame, newEntities: GameEntity[]): void {
		this.bridge?.clearEntities();
		game.entityManager.clearAll();
		this.bridge?.loadEntities(newEntities);
		game.entityManager.loadEntities(newEntities);
	}

	applyEffects(definition: GameDefinition): void {
		if (!this.bridge || !definition.effects) {
			console.log(
				"[GameLoader] applyEffects: skipped (bridge=" +
					!!this.bridge +
					", effects=" +
					!!definition.effects +
					")",
			);
			return;
		}
		console.log(
			"[GameLoader] applyEffects: starting, has graph=" +
				!!(definition.effects.graph || definition.effects.graphs) +
				", has shaders=" +
				!!definition.effects.shaders,
		);

		const graphs: EffectGraphSpec[] = [];
		if (definition.effects.graphs) {
			graphs.push(...(definition.effects.graphs as EffectGraphSpec[]));
		} else if (definition.effects.graph) {
			graphs.push(definition.effects.graph as EffectGraphSpec);
		}

		for (const graph of graphs) {
			console.log(
				"[GameLoader] Compiling graph, scope=" +
					graph.scope +
					", nodes=" +
					(graph.nodes?.length ?? 0),
			);
			const result = compileGraph(graph);
			if (result.success && result.plan) {
				console.log(
					"[GameLoader] Compiled OK, plan passes=" +
						result.plan.passes?.length +
						", scope=" +
						result.plan.scope,
				);
				this.bridge
					.applyGraph(result.plan)
					.then((r) => {
						console.log(
							"[GameLoader] applyGraph result:",
							JSON.stringify(r).substring(0, 200),
						);
					})
					.catch((error) => {
						console.error("[GameLoader] Failed to apply effects graph:", error);
					});
			} else {
				console.error(
					"[GameLoader] Failed to compile effects graph:",
					result.errors.map((e) => e.message).join(", "),
				);
			}
		}

		if (definition.effects.shaders) {
			for (const [id, entry] of Object.entries(definition.effects.shaders)) {
				this.bridge.hotSwapShader(id, entry.glsl);
			}
		}

		if (definition.effects.entityEffects) {
			for (const effect of definition.effects.entityEffects) {
				this.bridge.applySpriteEffect(
					effect.entityId,
					effect.glsl,
					effect.params ?? {},
				);
			}
		}
	}

	reload(game: LoadedGame): LoadedGame {
		this.unload(game);
		return this.load(game.definition);
	}
}

export function validateGameDefinition(
	definition: unknown,
): definition is GameDefinition {
	if (!definition || typeof definition !== "object") return false;

	const def = definition as Record<string, unknown>;

	if (!def.metadata || typeof def.metadata !== "object") return false;
	if (!def.world || typeof def.world !== "object") return false;
	if (!def.entities || !Array.isArray(def.entities)) return false;

	const metadata = def.metadata as Record<string, unknown>;
	if (typeof metadata.id !== "string") return false;
	if (typeof metadata.title !== "string") return false;
	if (typeof metadata.version !== "string") return false;

	const world = def.world as Record<string, unknown>;
	if (!world.gravity || typeof world.gravity !== "object") return false;

	const gravity = world.gravity as Record<string, unknown>;
	if (typeof gravity.x !== "number" || typeof gravity.y !== "number")
		return false;

	for (const entity of def.entities as unknown[]) {
		if (!validateEntity(entity)) return false;
	}

	return true;
}

function validateEntity(entity: unknown): entity is GameEntity {
	if (!entity || typeof entity !== "object") return false;

	const e = entity as Record<string, unknown>;

	if (typeof e.id !== "string") return false;
	if (typeof e.name !== "string") return false;
	if (!e.transform || typeof e.transform !== "object") return false;

	const transform = e.transform as Record<string, unknown>;
	if (typeof transform.x !== "number") return false;
	if (typeof transform.y !== "number") return false;
	if (typeof transform.angle !== "number") return false;
	if (typeof transform.scaleX !== "number") return false;
	if (typeof transform.scaleY !== "number") return false;

	return true;
}

export function createDefaultGameDefinition(): GameDefinition {
	return {
		metadata: {
			id: `game_${Date.now()}`,
			title: "Untitled Game",
			version: "1.0.0",
		},
		world: {
			gravity: { x: 0, y: 10 },
			pixelsPerMeter: 50,
			bounds: { width: 20, height: 12 },
		},
		prefabs: {},
		entities: [],
	};
}
