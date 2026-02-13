import { GameDefinitionSchema } from "../schemas/gameDefinition";
import type { GameDefinition } from "../types/GameDefinition";
import type {
	GameDefinitionValidationResult,
	ValidationError,
	ValidationWarning,
} from "./gameDefinitionTypes";
import { validateSemantic } from "./semantic";

export type {
	GameDefinitionValidationResult,
	ValidationError,
	ValidationWarning,
} from "./gameDefinitionTypes";

const VALID_BEHAVIOR_TYPES = [
	"move",
	"rotate",
	"rotate_toward",
	"follow",
	"bounce",
	"spawn_on_event",
	"destroy_on_collision",
	"score_on_collision",
	"score_on_destroy",
	"timer",
	"animate",
	"oscillate",
	"gravity_zone",
	"magnetic",
	"health",
	"draggable",
];

const VALID_BODY_TYPES = ["static", "dynamic", "kinematic"];
const VALID_SHAPES = ["box", "circle", "polygon", "capsule"];
const VALID_VISUAL_TYPES = ["rect", "circle", "polygon", "image", "text"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getStringArray = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

function validateMetadata(
	game: GameDefinition,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	if (!game.metadata) {
		errors.push({
			code: "MISSING_METADATA",
			message: "Game definition must have metadata",
			path: "metadata",
		});
		return;
	}

	if (!game.metadata.id) {
		errors.push({
			code: "MISSING_ID",
			message: "Game must have an ID",
			path: "metadata.id",
		});
	}

	if (!game.metadata.title) {
		warnings.push({
			code: "MISSING_TITLE",
			message: "Game should have a title",
			path: "metadata.title",
		});
	}

	if (!game.metadata.version) {
		warnings.push({
			code: "MISSING_VERSION",
			message: "Game should have a version",
			path: "metadata.version",
		});
	}
}

function validateWorld(
	game: GameDefinition,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	if (!game.world) {
		errors.push({
			code: "MISSING_WORLD",
			message: "Game definition must have world config",
			path: "world",
		});
		return;
	}

	if (!game.world.gravity) {
		errors.push({
			code: "MISSING_GRAVITY",
			message: "World must have gravity defined",
			path: "world.gravity",
		});
	} else {
		if (
			typeof game.world.gravity.x !== "number" ||
			typeof game.world.gravity.y !== "number"
		) {
			errors.push({
				code: "INVALID_GRAVITY",
				message: "Gravity must have numeric x and y values",
				path: "world.gravity",
			});
		}
	}

	if (
		typeof game.world.pixelsPerMeter !== "number" ||
		game.world.pixelsPerMeter <= 0
	) {
		warnings.push({
			code: "INVALID_PIXELS_PER_METER",
			message: "pixelsPerMeter should be a positive number",
			path: "world.pixelsPerMeter",
		});
	}
}

function validatePhysicsComponent(
	physics: unknown,
	entityId: string,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	if (!isRecord(physics)) return;
	const bodyType = physics.bodyType;
	if (typeof bodyType !== "string" || !VALID_BODY_TYPES.includes(bodyType)) {
		errors.push({
			code: "INVALID_BODY_TYPE",
			message: `Entity ${entityId} has invalid bodyType: ${String(bodyType)}`,
			path: `entities.${entityId}.physics.bodyType`,
		});
	}

	// Validate density if provided
	if (typeof physics.density === "number") {
		if (physics.density < 0) {
			errors.push({
				code: "NEGATIVE_DENSITY",
				message: `Entity ${entityId} has negative density`,
				path: `entities.${entityId}.physics.density`,
			});
		}

		if (physics.density > 100) {
			warnings.push({
				code: "HIGH_DENSITY",
				message: `Entity ${entityId} has unusually high density (${physics.density})`,
				path: `entities.${entityId}.physics.density`,
			});
		}
	}
}

function validateColliderComponent(
	collider: unknown,
	entityId: string,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	if (!isRecord(collider)) return;
	const shape = collider.shape;
	if (typeof shape !== "string" || !VALID_SHAPES.includes(shape)) {
		errors.push({
			code: "INVALID_SHAPE",
			message: `Entity ${entityId} has invalid shape: ${String(shape)}`,
			path: `entities.${entityId}.collider.shape`,
		});
	}

	if (shape === "box") {
		const width = collider.width;
		const height = collider.height;
		if (typeof width !== "number" || width <= 0) {
			errors.push({
				code: "INVALID_BOX_WIDTH",
				message: `Entity ${entityId} box collider must have positive width`,
				path: `entities.${entityId}.collider.width`,
			});
		}
		if (typeof height !== "number" || height <= 0) {
			errors.push({
				code: "INVALID_BOX_HEIGHT",
				message: `Entity ${entityId} box collider must have positive height`,
				path: `entities.${entityId}.collider.height`,
			});
		}
	}

	if (shape === "circle") {
		const radius = collider.radius;
		if (typeof radius !== "number" || radius <= 0) {
			errors.push({
				code: "INVALID_CIRCLE_RADIUS",
				message: `Entity ${entityId} circle collider must have positive radius`,
				path: `entities.${entityId}.collider.radius`,
			});
		}
	}

	if (typeof collider.restitution === "number" && collider.restitution < 0) {
		errors.push({
			code: "NEGATIVE_RESTITUTION",
			message: `Entity ${entityId} has negative restitution`,
			path: `entities.${entityId}.collider.restitution`,
		});
	}

	if (
		typeof collider.friction === "number" &&
		(collider.friction < 0 || collider.friction > 1)
	) {
		warnings.push({
			code: "FRICTION_OUT_OF_RANGE",
			message: `Entity ${entityId} has friction out of range (0-1)`,
			path: `entities.${entityId}.collider.friction`,
		});
	}
}

function validateVisualComponent(
	visual: unknown,
	entityId: string,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	if (!isRecord(visual)) return;
	const visualType = visual.type;
	if (
		typeof visualType !== "string" ||
		!VALID_VISUAL_TYPES.includes(visualType)
	) {
		errors.push({
			code: "INVALID_VISUAL_TYPE",
			message: `Entity ${entityId} has invalid visual type: ${String(visualType)}`,
			path: `entities.${entityId}.visual.type`,
		});
	}

	if (visualType === "rect") {
		const width = visual.width;
		const height = visual.height;
		if (typeof width !== "number" || width <= 0) {
			errors.push({
				code: "INVALID_RECT_WIDTH",
				message: `Entity ${entityId} rect visual must have positive width`,
				path: `entities.${entityId}.visual.width`,
			});
		}
		if (typeof height !== "number" || height <= 0) {
			errors.push({
				code: "INVALID_RECT_HEIGHT",
				message: `Entity ${entityId} rect visual must have positive height`,
				path: `entities.${entityId}.visual.height`,
			});
		}
	}

	if (visualType === "circle") {
		const radius = visual.radius;
		if (typeof radius !== "number" || radius <= 0) {
			errors.push({
				code: "INVALID_VISUAL_RADIUS",
				message: `Entity ${entityId} circle visual must have positive radius`,
				path: `entities.${entityId}.visual.radius`,
			});
		}
	}
}

function validateBehavior(
	behavior: unknown,
	entityId: string,
	index: number,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	if (!isRecord(behavior)) return;
	const behaviorType = behavior.type;
	if (
		typeof behaviorType !== "string" ||
		!VALID_BEHAVIOR_TYPES.includes(behaviorType)
	) {
		errors.push({
			code: "INVALID_BEHAVIOR_TYPE",
			message: `Entity ${entityId} behavior ${index} has invalid type: ${String(behaviorType)}`,
			path: `entities.${entityId}.behaviors[${index}].type`,
		});
		return;
	}

	if (
		behaviorType === "spawn_on_event" &&
		typeof behavior.entityTemplate !== "string" &&
		!Array.isArray(behavior.entityTemplate)
	) {
		errors.push({
			code: "MISSING_SPAWN_TEMPLATE",
			message: `Entity ${entityId} spawn_on_event behavior missing entityTemplate`,
			path: `entities.${entityId}.behaviors[${index}].entityTemplate`,
		});
	}

	if (
		behaviorType === "destroy_on_collision" ||
		behaviorType === "score_on_collision"
	) {
		const withTags = getStringArray(behavior.withTags);
		if (withTags.length === 0) {
			warnings.push({
				code: "EMPTY_COLLISION_TAGS",
				message: `Entity ${entityId} ${behaviorType} behavior has no tags specified`,
				path: `entities.${entityId}.behaviors[${index}].withTags`,
			});
		}
	}
}

function validateEntity(
	entity: Record<string, unknown>,
	prefabs: Record<string, unknown>,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	const entityId = typeof entity.id === "string" ? entity.id : "unknown";
	if (typeof entity.id !== "string" || entity.id.length === 0) {
		errors.push({
			code: "MISSING_ENTITY_ID",
			message: "Entity must have an ID",
			path: "entities",
		});
		return;
	}

	const transform = isRecord(entity.transform) ? entity.transform : null;
	if (!transform) {
		errors.push({
			code: "MISSING_TRANSFORM",
			message: `Entity ${entityId} must have a transform`,
			path: `entities.${entityId}.transform`,
		});
	} else {
		if (typeof transform.x !== "number" || typeof transform.y !== "number") {
			errors.push({
				code: "INVALID_TRANSFORM",
				message: `Entity ${entityId} transform must have numeric x and y`,
				path: `entities.${entityId}.transform`,
			});
		}
	}

	if (typeof entity.prefab === "string" && !prefabs[entity.prefab]) {
		errors.push({
			code: "UNKNOWN_PREFAB",
			message: `Entity ${entityId} references unknown prefab: ${entity.prefab}`,
			path: `entities.${entityId}.prefab`,
		});
	}

	validatePhysicsComponent(entity.physics, entityId, errors, warnings);
	validateColliderComponent(entity.collider, entityId, errors, warnings);
	validateVisualComponent(entity.visual, entityId, errors, warnings);

	if (Array.isArray(entity.behaviors)) {
		entity.behaviors.forEach((behavior, index) => {
			validateBehavior(behavior, entityId, index, errors, warnings);
		});
	}
}

function validatePrefabs(
	prefabs: Record<string, unknown>,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	for (const [prefabId, prefab] of Object.entries(prefabs)) {
		if (!isRecord(prefab) || typeof prefab.id !== "string") {
			errors.push({
				code: "MISSING_PREFAB_ID",
				message: `Prefab ${prefabId} must have an ID`,
				path: `prefabs.${prefabId}.id`,
			});
		}

		if (prefab && isRecord(prefab)) {
			if (prefab.physics) {
				validatePhysicsComponent(
					prefab.physics,
					`prefab:${prefabId}`,
					errors,
					warnings,
				);
			}

			if (prefab.collider) {
				validateColliderComponent(
					prefab.collider,
					`prefab:${prefabId}`,
					errors,
					warnings,
				);
			}

			if (prefab.visual) {
				validateVisualComponent(
					prefab.visual,
					`prefab:${prefabId}`,
					errors,
					warnings,
				);
			}

			if (Array.isArray(prefab.behaviors)) {
				prefab.behaviors.forEach((behavior, index) => {
					validateBehavior(
						behavior,
						`prefab:${prefabId}`,
						index,
						errors,
						warnings,
					);
				});
			}
		}
	}
}

function validateEntities(
	game: GameDefinition,
	errors: ValidationError[],
	warnings: ValidationWarning[],
): void {
	if (!Array.isArray(game.entities)) {
		errors.push({
			code: "MISSING_ENTITIES",
			message: "Game must have an entities array",
			path: "entities",
		});
		return;
	}

	if (game.entities.length === 0) {
		errors.push({
			code: "NO_ENTITIES",
			message: "Game must have at least one entity",
			path: "entities",
		});
		return;
	}

	if (game.entities.length > 50) {
		warnings.push({
			code: "TOO_MANY_ENTITIES",
			message: `Game has ${game.entities.length} entities, which may impact performance`,
			path: "entities",
		});
	}

	const entityIds = new Set<string>();
	const entities = game.entities;
	const prefabs = isRecord(game.prefabs) ? game.prefabs : {};
	for (const entity of entities) {
		if (!isRecord(entity)) continue;
		if (typeof entity.id === "string" && entityIds.has(entity.id)) {
			errors.push({
				code: "DUPLICATE_ENTITY_ID",
				message: `Duplicate entity ID: ${entity.id}`,
				path: `entities.${entity.id}`,
			});
		}
		if (typeof entity.id === "string") {
			entityIds.add(entity.id);
		}

		validateEntity(entity, prefabs, errors, warnings);
	}
}

export function validateGameDefinition(
	game: GameDefinition,
): GameDefinitionValidationResult {
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

	if (!game || typeof game !== "object") {
		return {
			valid: false,
			errors: [
				{ code: "INVALID_GAME", message: "Game definition must be an object" },
			],
			warnings: [],
		};
	}

	const parsed = GameDefinitionSchema.safeParse(game);
	if (!parsed.success) {
		return {
			valid: false,
			errors: parsed.error.issues.map((issue) => ({
				code: "SCHEMA_VALIDATION_ERROR",
				message: issue.message,
				path: issue.path.join("."),
			})),
			warnings: [],
		};
	}

	const parsedGame = game;

	validateMetadata(parsedGame, errors, warnings);
	validateWorld(parsedGame, errors, warnings);

	if (parsedGame.prefabs) {
		validatePrefabs(parsedGame.prefabs, errors, warnings);
	}

	validateEntities(parsedGame, errors, warnings);
	validateSemantic(parsedGame, errors, warnings);

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

export function getValidationSummary(
	result: GameDefinitionValidationResult,
): string {
	if (result.valid && result.warnings.length === 0) {
		return "Game definition is valid with no issues.";
	}

	const parts: string[] = [];

	if (!result.valid) {
		parts.push(`${result.errors.length} error(s):`);
		result.errors.forEach((e) => {
			parts.push(`  - ${e.message}`);
		});
	}

	if (result.warnings.length > 0) {
		parts.push(`${result.warnings.length} warning(s):`);
		result.warnings.forEach((w) => {
			parts.push(`  - ${w.message}`);
		});
	}

	return parts.join("\n");
}
