import { z } from "zod";
import {
	GameVariablesSchema,
	TuningConfigSchema,
	VariableCategorySchema,
	VariableWithTuningSchema,
} from "../expressions/schema-helpers";
import { AssetSourceSchema } from "./asset-system";

// ============================================================================
// Constant Reference Types (for bundle format)
// ============================================================================

/**
 * Reference to a constant defined in GameDefinition.constants.
 * Used in bundle format to reference values by name instead of hardcoding.
 * Example: { const: "GRAVITY" } resolves to the value of constants.GRAVITY
 */
export const ConstantRefSchema = z.object({
	const: z.string(),
});

export type ConstantRef = z.infer<typeof ConstantRefSchema>;

/**
 * Union type: either a number or a constant reference
 */
export const NumberOrConstantSchema = z.union([z.number(), ConstantRefSchema]);

export type NumberOrConstant = z.infer<typeof NumberOrConstantSchema>;

/**
 * Union type: either a string or a constant reference
 */
export const StringOrConstantSchema = z.union([z.string(), ConstantRefSchema]);

export type StringOrConstant = z.infer<typeof StringOrConstantSchema>;

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

export const ShadowEffectSchema = z.object({
	color: z.string(),
	offsetX: z.number(),
	offsetY: z.number(),
	blur: z.number(),
});

const BaseVisualSchema = z.object({
	color: z.string().optional(),
	strokeColor: z.string().optional(),
	strokeWidth: z.number().optional(),
	opacity: z.number().min(0).max(1).optional(),
	width: z.number().optional(),
	height: z.number().optional(),
	offsetX: z.number().optional(),
	offsetY: z.number().optional(),
	zIndex: z.number().optional(),
	blendMode: z.enum(["mix", "add", "sub", "mul"]).optional(),
	shadow: ShadowEffectSchema.optional(),
});

export const RectVisualSchema = BaseVisualSchema.extend({
	type: z.literal("rect"),
	color: z.string(),
});

export const CircleVisualSchema = BaseVisualSchema.extend({
	type: z.literal("circle"),
	radius: z.number().optional(),
	color: z.string(),
});

export const PolygonVisualSchema = BaseVisualSchema.extend({
	type: z.literal("polygon"),
	vertices: z.array(Vec2Schema).min(3),
	color: z.string(),
});

export const ImageVisualSchema = BaseVisualSchema.extend({
	type: z.literal("image"),
	whatDescription: z.string().optional(),
	tint: z.string().optional(),
	imageWidth: z.number().optional(),
	imageHeight: z.number().optional(),
	url: z.string().optional(),
	assetId: z.string().optional(),
	scale: z.number().optional(),
});

export const TextVisualSchema = BaseVisualSchema.extend({
	type: z.literal("text"),
	text: z.string(),
	color: z.string().optional(),
	fontSize: z.number().optional(),
	fontFamily: z.string().optional(),
	align: z.enum(["left", "center", "right"]).optional(),
});

export const VisualComponentSchema = z.discriminatedUnion("type", [
	RectVisualSchema,
	CircleVisualSchema,
	PolygonVisualSchema,
	ImageVisualSchema,
	TextVisualSchema,
]);

export const SpriteComponentSchema = VisualComponentSchema;

export const PhysicsComponentSchema = z.object({
	bodyType: z.enum(["static", "dynamic", "kinematic"]),
	density: z.number().nonnegative().optional(),
	mass: z.number().nonnegative().optional(),
	gravityScale: z.number().optional(),
	linearDamping: z.number().optional(),
	angularDamping: z.number().optional(),
	fixedRotation: z.boolean().optional(),
	ccd: z.boolean().optional(),
	initialVelocity: Vec2Schema.optional(),
	initialAngularVelocity: z.number().optional(),
});

const BaseColliderSchema = z.object({
	friction: z.number().nonnegative().optional(),
	restitution: z.number().nonnegative().optional(),
	isSensor: z.boolean().optional(),
	categoryBits: z.number().optional(),
	maskBits: z.number().optional(),
});

export const BoxColliderSchema = BaseColliderSchema.extend({
	shape: z.literal("box"),
	width: z.number().positive(),
	height: z.number().positive(),
});

export const CircleColliderSchema = BaseColliderSchema.extend({
	shape: z.literal("circle"),
	radius: z.number().positive(),
});

export const PolygonColliderSchema = BaseColliderSchema.extend({
	shape: z.literal("polygon"),
	vertices: z.array(Vec2Schema).min(3),
});

export const CapsuleColliderSchema = BaseColliderSchema.extend({
	shape: z.literal("capsule"),
	radius: z.number().positive(),
	height: z.number().positive(),
});

export const ColliderComponentSchema = z.discriminatedUnion("shape", [
	BoxColliderSchema,
	CircleColliderSchema,
	PolygonColliderSchema,
	CapsuleColliderSchema,
]);

export const CharacterComponentSchema = z.object({
	upDirection: z.enum(["up", "down"]).optional(),
	snapToGround: z.number().optional(),
	maxSlopeAngle: z.number().optional(),
	minSlopeSlideAngle: z.number().optional(),
	autoStep: z.boolean().optional(),
	maxAutoStepHeight: z.number().optional(),
	slideOnSlope: z.boolean().optional(),
	collisionOffset: z.number().optional(),
	isGrounded: z.boolean().optional(),
	floorNormal: Vec2Schema.optional(),
	floorAngle: z.number().optional(),
	platformVelocity: Vec2Schema.optional(),
	hitCeiling: z.boolean().optional(),
	hitWall: z.boolean().optional(),
});

export const TransformComponentSchema = z
	.object({
		x: z.number(),
		y: z.number(),
		angle: z.number().default(0),
		scaleX: z.number().default(1),
		scaleY: z.number().default(1),
	})
	.describe("Entity transform");

export const SlotDefinitionSchema = z.object({
	x: z.number(),
	y: z.number(),
	layer: z.number().optional(),
});

export const ChildEntityDefinitionSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		id: z.string().optional(),
		name: z.string(),
		prefab: z.string(),
		localTransform: TransformComponentSchema,
		slot: z.string().optional(),
		visual: VisualComponentSchema.optional(),
		physics: PhysicsComponentSchema.optional(),
		collider: ColliderComponentSchema.optional(),
		character: CharacterComponentSchema.optional(),
		tags: z.array(z.string()).optional(),
		visible: z.boolean().optional(),
		children: z.array(ChildEntityDefinitionSchema).optional(),
	}),
);

export const ChildPrefabDefinitionSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		name: z.string(),
		prefab: z.string(),
		localTransform: TransformComponentSchema,
		slot: z.string().optional(),
		visual: VisualComponentSchema.optional(),
		physics: PhysicsComponentSchema.optional(),
		collider: ColliderComponentSchema.optional(),
		character: CharacterComponentSchema.optional(),
		tags: z.array(z.string()).optional(),
		children: z.array(ChildPrefabDefinitionSchema).optional(),
	}),
);

export const BodyEntityPrefabSchema = z.object({
	type: z.literal("body").optional(),
	id: z.string(),
	description: z.string().optional(),
	whatDescription: z.string().optional(),
	scriptRef: z.string().optional(),
	visual: VisualComponentSchema.optional(),
	physics: PhysicsComponentSchema.optional(),
	collider: ColliderComponentSchema.optional(),
	character: CharacterComponentSchema.optional(),
	tags: z.array(z.string()).optional(),
	layer: z.number().optional(),
	slots: z.record(z.string(), SlotDefinitionSchema).optional(),
	children: z.array(ChildPrefabDefinitionSchema).optional(),
});

export const EntityPrefabSchema =
	BodyEntityPrefabSchema.describe("Entity prefab");

export const GameEntitySchema = z
	.object({
		id: z.string(),
		name: z.string().default(""),
		prefab: z.string().optional(),
		scriptRef: z.string().optional(),
		transform: TransformComponentSchema,
		visual: VisualComponentSchema.optional(),
		physics: PhysicsComponentSchema.optional(),
		collider: ColliderComponentSchema.optional(),
		character: CharacterComponentSchema.optional(),
		tags: z.array(z.string()).optional(),
		layer: z.number().optional(),
		visible: z.boolean().optional(),
		active: z.boolean().optional(),
		children: z.array(ChildEntityDefinitionSchema).optional(),
	})
	.describe("Game entity");

export const WorldConfigSchema = z
	.object({
		gravity: Vec2Schema,
		pixelsPerMeter: z.number().default(50),
		bounds: z
			.object({
				width: z.number().positive(),
				height: z.number().positive(),
			})
			.optional(),
	})
	.describe("World config");

export const CameraConfigSchema = z.object({
	type: z.enum(["fixed", "follow", "follow-x", "follow-y", "auto-scroll"]),
	followTarget: z.string().optional(),
	viewHeight: z.number().positive().optional(),
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
	bounds: z
		.object({
			minX: z.number(),
			maxX: z.number(),
			minY: z.number(),
			maxY: z.number(),
		})
		.optional(),
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

export const GameMetadataSchema = z
	.object({
		id: z.string(),
		slug: z.string().optional(),
		title: z.string().default(""),
		description: z.string().optional(),
		instructions: z.string().optional(),
		author: z.string().optional(),
		version: z.string().default(""),
		createdAt: z.number().optional(),
		updatedAt: z.number().optional(),
		thumbnailUrl: z.string().optional(),
		thumbnailAssetRef: z.string().optional(),
		titleHeroImageUrl: z.string().optional(),
		titleHeroAssetRef: z.string().optional(),
	})
	.describe("Game metadata");

export const AssetConfigSchema = z.object({
	imageUrl: z.string().optional(),
	assetRef: z.string().optional(),
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

export const ParallaxDepthSchema = z.enum(["sky", "far", "mid", "near"]);

export const ParallaxLayerSchema = z.object({
	id: z.string(),
	name: z.string(),
	imageUrl: z.string().optional(),
	assetRef: z.string().optional(),
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

const GameJointBaseSchema = z.object({
	id: z.string(),
	entityA: z.string(),
	entityB: z.string(),
	collideConnected: z.boolean().optional(),
});

export const GameRevoluteJointSchema = GameJointBaseSchema.extend({
	type: z.literal("revolute"),
	anchor: Vec2Schema,
	enableLimit: z.boolean().optional(),
	lowerAngle: z.number().optional(),
	upperAngle: z.number().optional(),
	enableMotor: z.boolean().optional(),
	motorSpeed: z.number().optional(),
	maxMotorTorque: z.number().optional(),
});

export const GameDistanceJointSchema = GameJointBaseSchema.extend({
	type: z.literal("distance"),
	anchorA: Vec2Schema,
	anchorB: Vec2Schema,
	length: z.number().positive().optional(),
	stiffness: z.number().optional(),
	damping: z.number().optional(),
});

export const GameWeldJointSchema = GameJointBaseSchema.extend({
	type: z.literal("weld"),
	anchor: Vec2Schema,
	stiffness: z.number().optional(),
	damping: z.number().optional(),
});

export const GamePrismaticJointSchema = GameJointBaseSchema.extend({
	type: z.literal("prismatic"),
	anchor: Vec2Schema,
	axis: Vec2Schema,
	enableLimit: z.boolean().optional(),
	lowerTranslation: z.number().optional(),
	upperTranslation: z.number().optional(),
	enableMotor: z.boolean().optional(),
	motorSpeed: z.number().optional(),
	maxMotorForce: z.number().optional(),
});

export const GameJointSchema = z.discriminatedUnion("type", [
	GameRevoluteJointSchema,
	GameDistanceJointSchema,
	GameWeldJointSchema,
	GamePrismaticJointSchema,
]);

export const SheetLayoutSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("grid"),
		columns: z.number().positive(),
		rows: z.number().positive(),
		cellWidth: z.number().positive(),
		cellHeight: z.number().positive(),
		spacing: z.number().optional(),
		margin: z.number().optional(),
		origin: z.literal("top-left").optional(),
	}),
	z.object({
		type: z.literal("strip"),
		direction: z.enum(["horizontal", "vertical"]),
		frameCount: z.number().positive(),
		cellWidth: z.number().positive(),
		cellHeight: z.number().positive(),
		spacing: z.number().optional(),
		margin: z.number().optional(),
	}),
	z.object({
		type: z.literal("manual"),
	}),
]);

export const SheetRegionSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("gridIndex"),
		index: z.number().int().nonnegative(),
	}),
	z.object({
		type: z.literal("rect"),
		x: z.number().int().nonnegative(),
		y: z.number().int().nonnegative(),
		w: z.number().int().positive(),
		h: z.number().int().positive(),
	}),
]);

export const SheetPivotSchema = z.object({
	x: z.number(),
	y: z.number(),
});

export const SheetPromptConfigSchema = z.object({
	basePrompt: z.string(),
	commonModifiers: z.array(z.string()).optional(),
	stylePreset: z.string().optional(),
});

export const AssetSheetEntrySchema = z.object({
	id: z.string().min(1),
	region: SheetRegionSchema,
	pivot: SheetPivotSchema.optional(),
	tags: z.array(z.string()).optional(),
	promptOverride: z.string().optional(),
});

export const SheetAnimationSchema = z.object({
	id: z.string().min(1),
	frames: z.array(z.string()).min(1),
	fps: z.number().positive(),
	loop: z.boolean().optional(),
});

export const SheetTileCollisionSchema = z.union([
	z.literal("none"),
	z.literal("full"),
	z.literal("platform"),
	z.object({
		polygon: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
	}),
]);

export const SheetTileAnimationSchema = z.object({
	frames: z.array(z.number().int().nonnegative()).min(1),
	fps: z.number().positive(),
	loop: z.boolean().optional(),
});

export const SheetTileMetadataSchema = z.object({
	name: z.string().optional(),
	tags: z.array(z.string()).optional(),
	collision: SheetTileCollisionSchema.optional(),
	animation: SheetTileAnimationSchema.optional(),
	promptOverride: z.string().optional(),
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
	tiles: z.record(z.number(), SheetTileMetadataSchema).optional(),
	source: AssetSourceSchema.optional(),
});

export const VariationVariantSchema = z.object({
	entryId: z.string().min(1),
	tags: z.array(z.string()).optional(),
	weight: z.number().positive().optional(),
	promptOverride: z.string().optional(),
});

export const VariationGroupSchema = z.object({
	id: z.string().min(1),
	variants: z.record(z.string(), VariationVariantSchema),
});

export const AssetSheetBaseSchema = z.object({
	id: z.string(),
	packId: z.string(),
	source: AssetSourceSchema.optional(),
	imageAssetId: z.string().optional(),
	imageUrl: z.string(),
	imageWidth: z.number().positive(),
	imageHeight: z.number().positive(),
	layout: SheetLayoutSchema,
	entries: z.record(z.string(), AssetSheetEntrySchema),
	promptConfig: SheetPromptConfigSchema.optional(),
	createdAt: z.number(),
	deletedAt: z.number().optional(),
});

export const AssetSheetSchema = z.discriminatedUnion("kind", [
	AssetSheetBaseSchema.extend({
		kind: z.literal("sprite"),
		animations: z.record(z.string(), SheetAnimationSchema).optional(),
		defaultAnimationId: z.string().optional(),
	}),
	AssetSheetBaseSchema.extend({
		kind: z.literal("tile"),
		tileWidth: z.number().positive(),
		tileHeight: z.number().positive(),
		tiles: z.record(z.number(), SheetTileMetadataSchema).optional(),
	}),
	AssetSheetBaseSchema.extend({
		kind: z.literal("variation"),
		groups: z.record(z.string(), VariationGroupSchema),
		defaultGroupId: z.string().optional(),
		defaultVariantKey: z.string().optional(),
	}),
]);

export const TapZoneEdgeSchema = z.enum(["left", "right", "top", "bottom"]);
export const TapZoneButtonSchema = z.enum([
	"left",
	"right",
	"up",
	"down",
	"jump",
	"action",
]);

export const TapZoneSchema = z.object({
	id: z.string(),
	edge: TapZoneEdgeSchema,
	size: z.number().min(0).max(1),
	button: TapZoneButtonSchema,
	debugColor: z.string().optional(),
});

export const VirtualButtonTypeSchema = z.enum(["jump", "action"]);

export const VirtualButtonSchema = z.object({
	id: z.string(),
	button: VirtualButtonTypeSchema,
	label: z.string().optional(),
	size: z.number().positive().optional(),
	color: z.string().optional(),
	activeColor: z.string().optional(),
});

export const VirtualJoystickSchema = z.object({
	id: z.string(),
	size: z.number().positive().optional(),
	knobSize: z.number().positive().optional(),
	deadZone: z.number().min(0).max(1).optional(),
	color: z.string().optional(),
	knobColor: z.string().optional(),
});

export const DPadDirectionSchema = z.enum(["up", "down", "left", "right"]);

export const VirtualDPadSchema = z.object({
	id: z.string(),
	size: z.number().positive().optional(),
	buttonSize: z.number().positive().optional(),
	color: z.string().optional(),
	activeColor: z.string().optional(),
	showDiagonals: z.boolean().optional(),
});

export const TiltConfigSchema = z.object({
	enabled: z.boolean(),
	sensitivity: z.number().optional(),
	updateInterval: z.number().optional(),
});

export const InputConfigSchema = z.object({
	tapZones: z.array(TapZoneSchema).optional(),
	debugTapZones: z.boolean().optional(),
	debugInputs: z.boolean().optional(),
	virtualButtons: z.array(VirtualButtonSchema).optional(),
	virtualJoystick: VirtualJoystickSchema.optional(),
	virtualDPad: VirtualDPadSchema.optional(),
	enableHaptics: z.boolean().optional(),
	tilt: TiltConfigSchema.optional(),
});

export const ImageFieldSchema = z.object({
	imageUrl: z.string().optional(),
	assetRef: z.string().optional(),
	localPath: z.string().optional(),
	assetId: z.string().optional(),
});

export const StaticBackgroundSchema = ImageFieldSchema.extend({
	type: z.literal("static"),
	color: z.string().optional(),
	whatDescription: z.string().optional(),
});

export const ParallaxBackgroundSchema = z.object({
	type: z.literal("parallax"),
	layers: z.array(ParallaxLayerSchema),
});

export const BackgroundConfigSchema = z.discriminatedUnion("type", [
	StaticBackgroundSchema,
	ParallaxBackgroundSchema,
]);

export const HoverHighlightConfigSchema = z.object({
	targetTag: z.string(),
	highlightEntityId: z.string(),
});

export const GameButtonDefinitionSchema = z.object({
	label: z.string(),
	eventName: z.string(),
	data: z.record(z.unknown()).optional(),
	variant: z.enum(["primary", "secondary"]).optional(),
});

export const GameDialogStatDefinitionSchema = z.object({
	label: z.string(),
	variable: z.string(),
	format: z.string().optional(),
	binding: z.string().optional(),
});

export const GameDialogStyleSchema = z.object({
	backgroundColor: z.string().optional(),
	titleColor: z.string().optional(),
	titleFontSize: z.number().optional(),
	backdropColor: z.string().optional(),
	width: z.union([z.number(), z.string()]).optional(),
	borderRadius: z.number().optional(),
});

export const GameDialogDefinitionSchema = z.object({
	id: z.string(),
	title: z.string(),
	message: z.string().optional(),
	stats: z.array(GameDialogStatDefinitionSchema).optional(),
	dismissible: z.boolean().optional(),
	dismissEventName: z.string().optional(),
	buttons: z.array(GameButtonDefinitionSchema),
	showOnState: z.enum(["ready", "won", "lost", "paused"]).optional(),
	showWhen: z.string().optional(),
	style: GameDialogStyleSchema.optional(),
});

export const GameDialogsConfigSchema = z.object({
	activeDialogVariable: z.string().optional(),
	dialogs: z.array(GameDialogDefinitionSchema),
	legacyWinDialogFallback: z.boolean().optional(),
});

export const MultiplayerConfigSchema = z.object({
	enabled: z.boolean(),
	maxPlayers: z.number(),
	syncMode: z.enum(["host-authoritative", "peer-to-peer"]).optional(),
	inputDelay: z.number().optional(),
	snapshotRate: z.number().optional(),
	deltaRate: z.number().optional(),
	interpolationDelay: z.number().optional(),
});

export const LoadingScreenConfigSchema = z.object({
	backgroundImageUrl: z.string().optional(),
	backgroundAssetRef: z.string().optional(),
	progressBarImageUrl: z.string().optional(),
	progressBarAssetRef: z.string().optional(),
	progressBarFillImageUrl: z.string().optional(),
	progressBarFillAssetRef: z.string().optional(),
	backgroundColor: z.string().optional(),
	progressBarColor: z.string().optional(),
	textColor: z.string().optional(),
});

export const SoundAssetSchema = z.object({
	url: z.string(),
	assetId: z.string().optional(),
	type: z.enum(["sfx", "music"]),
	loop: z.boolean().optional(),
	defaultVolume: z.number().optional(),
});

export const VariantSheetConfigSchema = z.object({
	enabled: z.boolean(),
	groupId: z.string(),
	atlasUrl: z.string(),
	atlasAssetRef: z.string().optional(),
	metadataUrl: z.string().optional(),
	metadataAssetRef: z.string().optional(),
	layout: z.object({
		columns: z.number(),
		rows: z.number(),
		cellWidth: z.number(),
		cellHeight: z.number(),
	}),
});

export const Match3ConfigSchema = z.object({
	gridId: z.string(),
	rows: z.number(),
	cols: z.number(),
	cellSize: z.number(),
	piecePrefabs: z.array(z.string()),
	minMatch: z.number().optional(),
	swapDuration: z.number().optional(),
	fallDuration: z.number().optional(),
	clearDelay: z.number().optional(),
	variantSheet: VariantSheetConfigSchema.optional(),
	matchDetection: z.string().optional(),
	scoring: z.string().optional(),
});

export const TetrisConfigSchema = z.object({
	gridId: z.string(),
	boardWidth: z.number(),
	boardHeight: z.number(),
	piecePrefabs: z.array(z.string()),
	initialDropSpeed: z.number().optional(),
	levelSpeedMultiplier: z.number().optional(),
});

export const OverlayConfigSchema = z.object({
	elements: z.array(z.object({}).passthrough()),
	theme: z.object({}).passthrough().optional(),
});

export const PersistenceConfigSchema = z.object({
	storageKey: z.string().optional(),
	schema: z.unknown(),
	defaultProgress: z.unknown(),
	version: z.number(),
	autoSave: z.object({}).passthrough().optional(),
});

// ============================================================================
// Effects / Shader Integration
// ============================================================================

export const ShaderEntrySchema = z.object({
	/** Filename for the shader, e.g. "paint.gdshader" */
	filename: z.string(),
	/** Godot Shading Language source code */
	glsl: z.string(),
});

export type ShaderEntry = z.infer<typeof ShaderEntrySchema>;

export const EffectsConfigSchema = z.object({
	/** Effect graph specification — validated separately by the effects compiler */
	graph: z.unknown().optional(),
	/** Named shader sources that the AI or user can write/edit */
	shaders: z.record(z.string(), ShaderEntrySchema).optional(),
});

export type EffectsConfig = z.infer<typeof EffectsConfigSchema>;

export const GameDefinitionSchema = z
	.object({
		metadata: GameMetadataSchema,
		world: WorldConfigSchema,
		presentation: PresentationConfigSchema.optional(),
		camera: CameraConfigSchema.optional(),
		background: BackgroundConfigSchema.optional(),
		variables: GameVariablesSchema.optional(),
		prefabs: z.record(z.string(), EntityPrefabSchema),
		entities: z.array(GameEntitySchema),
		joints: z.array(GameJointSchema).optional(),
		parallaxConfig: ParallaxConfigSchema.optional(),
		tileSheets: z.array(TileSheetSchema).optional(),
		tileMaps: z.array(TileMapSchema).optional(),
		multiplayer: MultiplayerConfigSchema.optional(),
		loadingScreen: LoadingScreenConfigSchema.optional(),
		sounds: z.record(z.string(), SoundAssetSchema).optional(),
		input: InputConfigSchema.optional(),
		match3: Match3ConfigSchema.optional(),
		tetris: TetrisConfigSchema.optional(),
		persistence: PersistenceConfigSchema.optional(),
		constants: z
			.record(z.union([z.number(), z.string(), z.boolean()]))
			.optional(),
		effects: EffectsConfigSchema.optional(),
		hoverHighlight: HoverHighlightConfigSchema.optional(),
		dialogs: GameDialogsConfigSchema.optional(),
		overlay: OverlayConfigSchema.optional(),
	})
	.describe("Game definition");

export type GameDefinitionInput = z.infer<typeof GameDefinitionSchema>;

export {
	TuningConfigSchema,
	VariableCategorySchema,
	VariableWithTuningSchema,
} from "../expressions/schema-helpers";
