import { EconomyGraphSchema } from "@slopcade/economy-engine";
import { z } from "zod";

export const Vec2Schema = z.object({
	x: z.number(),
	y: z.number(),
});

export const BoundsSchema = z.object({
	minX: z.number(),
	maxX: z.number(),
	minY: z.number(),
	maxY: z.number(),
});

export const ShadowEffectSchema = z
	.object({
		color: z.string(),
		offsetX: z.number(),
		offsetY: z.number(),
		blur: z.number(),
	})
	.optional();

export const RectSpriteSchema = z.object({
	type: z.literal("rect"),
	width: z.number().positive(),
	height: z.number().positive(),
	color: z.string().optional(),
	strokeColor: z.string().optional(),
	strokeWidth: z.number().optional(),
	opacity: z.number().min(0).max(1).optional(),
});

export const CircleSpriteSchema = z.object({
	type: z.literal("circle"),
	radius: z.number().positive(),
	color: z.string().optional(),
	strokeColor: z.string().optional(),
	strokeWidth: z.number().optional(),
	opacity: z.number().min(0).max(1).optional(),
});

export const PolygonSpriteSchema = z.object({
	type: z.literal("polygon"),
	vertices: z.array(Vec2Schema).min(3),
	color: z.string().optional(),
	strokeColor: z.string().optional(),
	strokeWidth: z.number().optional(),
	opacity: z.number().min(0).max(1).optional(),
});

export const ImageSpriteSchema = z.object({
	type: z.literal("image"),
	imageUrl: z.string(),
	assetId: z.string().optional(),
	imageWidth: z.number().positive(),
	imageHeight: z.number().positive(),
	color: z.string().optional(),
	opacity: z.number().min(0).max(1).optional(),
});

export const VisualComponentSchema = z.discriminatedUnion("type", [
	RectSpriteSchema,
	CircleSpriteSchema,
	PolygonSpriteSchema,
	ImageSpriteSchema,
]);

export const BoxPhysicsSchema = z.object({
	bodyType: z.enum(["static", "dynamic", "kinematic"]),
	shape: z.literal("box"),
	width: z.number().positive(),
	height: z.number().positive(),
	density: z.number().min(0),
	friction: z.number().min(0).max(1),
	restitution: z.number().min(0).max(1),
	isSensor: z.boolean().optional(),
	fixedRotation: z.boolean().optional(),
	bullet: z.boolean().optional(),
	linearDamping: z.number().optional(),
	angularDamping: z.number().optional(),
});

export const CirclePhysicsSchema = z.object({
	bodyType: z.enum(["static", "dynamic", "kinematic"]),
	shape: z.literal("circle"),
	radius: z.number().positive(),
	density: z.number().min(0),
	friction: z.number().min(0).max(1),
	restitution: z.number().min(0).max(1),
	isSensor: z.boolean().optional(),
	fixedRotation: z.boolean().optional(),
	bullet: z.boolean().optional(),
	linearDamping: z.number().optional(),
	angularDamping: z.number().optional(),
});

export const PolygonPhysicsSchema = z.object({
	bodyType: z.enum(["static", "dynamic", "kinematic"]),
	shape: z.literal("polygon"),
	vertices: z.array(Vec2Schema).min(3),
	density: z.number().min(0),
	friction: z.number().min(0).max(1),
	restitution: z.number().min(0).max(1),
	isSensor: z.boolean().optional(),
	fixedRotation: z.boolean().optional(),
	linearDamping: z.number().optional(),
	angularDamping: z.number().optional(),
});

export const PhysicsComponentSchema = z.discriminatedUnion("shape", [
	BoxPhysicsSchema,
	CirclePhysicsSchema,
	PolygonPhysicsSchema,
]);

export const TransformSchema = z.object({
	x: z.number(),
	y: z.number(),
	angle: z.number().default(0),
	scaleX: z.number().default(1),
	scaleY: z.number().default(1),
});

export const EntityPrefabSchema = z.object({
	id: z.string(),
	visual: VisualComponentSchema.optional(),
	physics: PhysicsComponentSchema.optional(),
	scriptRef: z.string().optional(),
	tags: z.array(z.string()).optional(),
	layer: z.number().optional(),
});

export const GameEntitySchema = z.object({
	id: z.string(),
	name: z.string(),
	prefab: z.string().optional(),
	transform: TransformSchema,
	visual: VisualComponentSchema.optional(),
	physics: PhysicsComponentSchema.optional(),
	scriptRef: z.string().optional(),
	tags: z.array(z.string()).optional(),
	layer: z.number().optional(),
	visible: z.boolean().optional(),
	active: z.boolean().optional(),
});

export const WorldConfigSchema = z.object({
	gravity: Vec2Schema,
	pixelsPerMeter: z.number().positive().default(50),
	bounds: z
		.object({
			width: z.number().positive(),
			height: z.number().positive(),
		})
		.optional(),
});

export const CameraConfigSchema = z.object({
	type: z.enum(["fixed", "follow", "follow-x", "follow-y", "auto-scroll"]),
	followTarget: z.string().optional(),
	zoom: z.number().positive().optional(),
	minZoom: z.number().positive().optional(),
	maxZoom: z.number().positive().optional(),
	followSmoothing: z.number().min(0).max(1).optional(),
	followOffset: Vec2Schema.optional(),
	deadZone: z
		.object({
			width: z.number().positive(),
			height: z.number().positive(),
		})
		.optional(),
	lookAhead: z
		.object({
			enabled: z.boolean(),
			distance: z.number().positive(),
			smoothing: z.number().min(0).max(1).optional(),
			mode: z.enum(["velocity", "facing", "input"]).optional(),
		})
		.optional(),
	bounds: BoundsSchema.optional(),
	autoScroll: z
		.object({
			direction: Vec2Schema,
			speed: z.number().positive(),
			acceleration: z.number().optional(),
		})
		.optional(),
	shake: z
		.object({
			decay: z.number().positive().optional(),
			maxOffset: z.number().positive().optional(),
			maxRotation: z.number().optional(),
		})
		.optional(),
});

export const PresentationConfigSchema = z.object({
	aspectRatio: z
		.union([
			z.object({ width: z.number().positive(), height: z.number().positive() }),
			z.number().positive(),
		])
		.optional(),
	fit: z.enum(["contain", "cover"]).optional(),
	letterboxColor: z.string().optional(),
	orientation: z.enum(["portrait", "landscape", "any"]).optional(),
});

export const GameMetadataSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().default(""),
	author: z.string().default(""),
	version: z.string().default("1.0.0"),
});

export const AssetSourceSchema = z.enum(["generated", "uploaded", "none"]);

export const AssetConfigSchema = z.object({
	imageUrl: z.string().optional(),
	assetId: z.string().optional(),
	source: AssetSourceSchema.optional(),
	scale: z.number().optional(),
	offsetX: z.number().optional(),
	offsetY: z.number().optional(),
	animations: z
		.record(
			z.string(),
			z.object({
				frames: z.array(z.string()),
				fps: z.number().positive(),
				loop: z.boolean().optional(),
			}),
		)
		.optional(),
});

export const AssetRemixSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	assets: z.record(z.string(), AssetConfigSchema),
});

export const ParallaxDepthSchema = z.enum(["sky", "far", "mid", "near"]);

export const ParallaxLayerSchema = z.object({
	id: z.string(),
	name: z.string(),
	imageUrl: z.string().optional(),
	assetId: z.string().optional(),
	depth: ParallaxDepthSchema,
	parallaxFactor: z.number().min(0).max(1),
	scale: z.number().optional(),
	offsetX: z.number().optional(),
	offsetY: z.number().optional(),
	visible: z.boolean().optional(),
});

export const ParallaxConfigSchema = z.object({
	enabled: z.boolean(),
	layers: z.array(ParallaxLayerSchema),
});

export const TileCollisionSchema = z.union([
	z.literal("none"),
	z.literal("full"),
	z.literal("platform"),
	z.object({
		polygon: z.array(Vec2Schema),
	}),
]);

export const TileAnimationSchema = z.object({
	frames: z.array(z.number()),
	fps: z.number().positive(),
	loop: z.boolean().optional(),
});

export const TileMetadataSchema = z.object({
	name: z.string().optional(),
	tags: z.array(z.string()).optional(),
	collision: TileCollisionSchema.optional(),
	animation: TileAnimationSchema.optional(),
});

export const TileSheetSchema = z.object({
	id: z.string(),
	name: z.string(),
	imageUrl: z.string(),
	tileWidth: z.number().positive(),
	tileHeight: z.number().positive(),
	columns: z.number().positive(),
	rows: z.number().positive(),
	spacing: z.number().optional(),
	margin: z.number().optional(),
	tiles: z.record(z.number(), TileMetadataSchema).optional(),
	source: AssetSourceSchema.optional(),
});

export const TileLayerTypeSchema = z.enum([
	"background",
	"collision",
	"foreground",
	"decoration",
]);

export const TileLayerSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: TileLayerTypeSchema,
	visible: z.boolean(),
	opacity: z.number().min(0).max(1),
	data: z.array(z.number()),
	parallaxFactor: z.number().optional(),
	zIndex: z.number().optional(),
});

export const TileMapSchema = z.object({
	id: z.string(),
	name: z.string(),
	tileSheetId: z.string(),
	width: z.number().positive(),
	height: z.number().positive(),
	layers: z.array(TileLayerSchema),
});

export const AIEconomyGraphSchema = EconomyGraphSchema;

export const Vec3Schema = z.object({
	x: z.number(),
	y: z.number(),
	z: z.number(),
});

export const World3DConfigSchema = z.object({
	gravity: Vec3Schema.optional().default({ x: 0, y: -9.8, z: 0 }),
	bounds: z
		.object({
			width: z.number().positive(),
			height: z.number().positive(),
			depth: z.number().positive(),
		})
		.optional(),
	sky: z
		.object({
			type: z.enum(["color", "procedural"]).optional().default("procedural"),
			color: z.string().optional(),
			topColor: z.string().optional(),
			bottomColor: z.string().optional(),
		})
		.optional(),
	lighting: z
		.object({
			preset: z
				.enum(["noon", "sunset", "overcast", "night", "dawn"])
				.optional()
				.default("noon"),
		})
		.optional(),
	fog: z
		.object({
			enabled: z.boolean().optional().default(false),
			color: z.string().optional(),
			density: z.number().min(0).max(1).optional(),
		})
		.optional(),
});

export const Camera3DConfigSchema = z.object({
	type: z.enum(["first-person", "third-person", "orbit", "fixed", "follow"]),
	fov: z.number().min(30).max(120).optional().default(70),
	follow: z
		.object({
			target: z.string(),
			offset: Vec3Schema.optional(),
			smoothing: z.number().optional(),
		})
		.optional(),
});

export const InputConfig3DSchema = z.object({
	movement: z
		.object({
			enabled: z.boolean().optional().default(true),
			speed: z.number().positive().optional().default(5),
			sprintMultiplier: z.number().positive().optional().default(1.5),
			jumpForce: z.number().positive().optional().default(5),
			target: z.string().optional(),
		})
		.optional(),
	mouseLook: z
		.object({
			enabled: z.boolean().optional().default(true),
			sensitivity: z.number().positive().optional().default(0.002),
		})
		.optional(),
});

export const TransformComponent3DSchema = z.object({
	x: z.number().optional().default(0),
	y: z.number().optional().default(0),
	z: z.number().optional().default(0),
	rotationX: z.number().optional().default(0),
	rotationY: z.number().optional().default(0),
	rotationZ: z.number().optional().default(0),
	scaleX: z.number().optional().default(1),
	scaleY: z.number().optional().default(1),
	scaleZ: z.number().optional().default(1),
});

export const PhysicsComponent3DSchema = z.object({
	bodyType: z.enum(["static", "dynamic", "kinematic"]),
	mass: z.number().positive().optional(),
	friction: z.number().min(0).max(1).optional(),
	restitution: z.number().min(0).max(1).optional(),
	collider: z
		.object({
			type: z.enum(["box", "sphere", "capsule", "cylinder"]),
			size: Vec3Schema.optional(),
			radius: z.number().positive().optional(),
			height: z.number().positive().optional(),
		})
		.optional(),
});

export const VisualComponent3DSchema = z.object({
	type: z.enum(["primitive", "voxels", "model", "sprite3d"]),
	primitive: z
		.enum(["box", "sphere", "cylinder", "capsule", "plane"])
		.optional(),
	size: Vec3Schema.optional(),
	radius: z.number().positive().optional(),
	height: z.number().positive().optional(),
	color: z.string().optional(),
	metallic: z.number().min(0).max(1).optional(),
	roughness: z.number().min(0).max(1).optional(),
	voxels: z
		.array(
			z.object({
				x: z.number(),
				y: z.number(),
				z: z.number(),
				color: z.string().optional(),
			}),
		)
		.optional(),
});

export const EntityPrefab3DSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	tags: z.array(z.string()).optional(),
	transform: TransformComponent3DSchema.optional(),
	physics: PhysicsComponent3DSchema.optional(),
	visual: VisualComponent3DSchema.optional(),
	scriptRef: z.string().optional(),
	children: z
		.array(
			z.object({
				prefabId: z.string(),
				transform: TransformComponent3DSchema.optional(),
			}),
		)
		.optional(),
});

export const GameEntity3DSchema = z.object({
	id: z.string(),
	prefabId: z.string(),
	name: z.string().optional(),
	tags: z.array(z.string()).optional(),
	transform: TransformComponent3DSchema.optional(),
	physics: PhysicsComponent3DSchema.optional(),
	visual: VisualComponent3DSchema.optional(),
	scriptRef: z.string().optional(),
});

export const GameDefinitionSchema = z.object({
	metadata: GameMetadataSchema,
	sceneType: z.enum(["2d", "3d"]).optional().default("2d"),
	world: z.union([WorldConfigSchema, World3DConfigSchema]),
	presentation: PresentationConfigSchema.optional(),
	camera: CameraConfigSchema.optional(),
	camera3d: Camera3DConfigSchema.optional(),
	prefabs: z.record(
		z.string(),
		z.union([EntityPrefabSchema, EntityPrefab3DSchema]),
	),
	entities: z.array(z.union([GameEntitySchema, GameEntity3DSchema])).min(1),
	parallaxConfig: ParallaxConfigSchema.optional(),
	tileSheets: z.array(TileSheetSchema).optional(),
	tileMaps: z.array(TileMapSchema).optional(),
	economy: AIEconomyGraphSchema.optional(),
	input3d: InputConfig3DSchema.optional(),
	sounds: z
		.record(
			z.string(),
			z.object({
				url: z.string().optional(),
				assetRef: z.string().optional(),
				volume: z.number().min(0).max(1).optional(),
			}),
		)
		.optional(),
});

export type GameDefinitionGenerated = z.infer<typeof GameDefinitionSchema>;
