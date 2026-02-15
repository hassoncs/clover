import type { ExpressionValueType, Value } from "../expressions/types";
import type { AssetSource } from "./asset-system";
import type { Vec2, Vec3 } from "./common";
import type { EntityPrefab, GameEntity } from "./entity";
import type { OverlayConfig } from "./overlay";
import type { TileMap, TileSheet } from "./tilemap";
import type {
	Camera3DConfig,
	EntityPrefab3D,
	GameEntity3D,
	InputConfig3D,
	World3DConfig,
} from "./types3d";

/**
 * Dual-field image reference for backwards compatibility.
 *
 * Preferred: set `assetRef` to the asset UUID (R2 key derivation handled elsewhere).
 * Legacy: set `imageUrl` to a full URL or relative path.
 *
 * During the migration window, callers may provide either (or both); runtime resolution
 * will decide precedence.
 */
export type ImageField = {
	imageUrl?: string;
	url?: string;
	assetRef?: string;
	localPath?: string;
	assetId?: string;
};

export interface EconomyGraphDefinition {
	id: string;
	resourceTypes: string[];
	nodes: Array<{
		id: string;
		type: "source" | "drain" | "pool" | "gate" | "converter";
		label: string;
		resourceType?: string;
		inputResourceType?: string;
		outputResourceType?: string;
		capacity?: number;
		initialValue?: number;
		rate?: number;
		mode?: "probabilistic" | "conditional";
		position?: { x: number; y: number };
	}>;
	edges: Array<{
		id: string;
		type: "resource" | "state";
		from: string;
		to: string;
		formula?: string;
		probability?: number;
		condition?: string;
	}>;
}

export interface WorldConfig {
	gravity: Vec2;
	pixelsPerMeter: number;
	bounds?: {
		width: number;
		height: number;
	};
}

export type CameraType =
	| "fixed"
	| "follow"
	| "follow-x"
	| "follow-y"
	| "auto-scroll";

export interface CameraDeadZone {
	width: number;
	height: number;
}

export interface CameraLookAhead {
	enabled: boolean;
	distance: number;
	smoothing?: number;
	mode?: "velocity" | "facing" | "input";
}

export interface CameraAutoScroll {
	direction: Vec2;
	speed: number;
	acceleration?: number;
}

export interface CameraShakeConfig {
	decay?: number;
	maxOffset?: number;
	maxRotation?: number;
}

export interface CameraConfig {
	type: CameraType;
	followTarget?: string;
	viewHeight?: number;
	zoom?: number;
	minZoom?: number;
	maxZoom?: number;
	followSmoothing?: number;
	followOffset?: Vec2;
	deadZone?: CameraDeadZone;
	lookAhead?: CameraLookAhead;
	bounds?: {
		minX: number;
		maxX: number;
		minY: number;
		maxY: number;
	};
	autoScroll?: CameraAutoScroll;
	shake?: CameraShakeConfig;
}

export interface PresentationConfig {
	aspectRatio?: { width: number; height: number } | number;
	fit?: "contain" | "cover";
	letterboxColor?: string;
	orientation?: "portrait" | "landscape" | "any";
}

export interface GameMetadata {
	id: string;
	slug?: string;
	title: string;
	description?: string;
	instructions?: string;
	author?: string;
	version: string;
	createdAt?: number;
	updatedAt?: number;
	/** Legacy: full URL or relative path */
	thumbnailUrl?: string;
	/** New: asset UUID reference for `thumbnailUrl` */
	thumbnailAssetRef?: string;
	/** Legacy: full URL or relative path */
	titleHeroImageUrl?: string;
	/** New: asset UUID reference for `titleHeroImageUrl` */
	titleHeroAssetRef?: string;
}

export interface AssetConfig extends ImageField {
	source?: AssetSource;
	localPath?: string;
	scale?: number;
	offsetX?: number;
	offsetY?: number;
	animations?: Record<
		string,
		{
			frames: string[];
			fps: number;
			loop?: boolean;
		}
	>;
}

export type ParallaxDepth = "sky" | "far" | "mid" | "near";

export interface ParallaxLayer extends ImageField {
	id: string;
	name: string;
	depth: ParallaxDepth;
	parallaxFactor: number;
	scale?: number;
	offsetX?: number;
	offsetY?: number;
	visible?: boolean;
}

export interface ParallaxBackground {
	type: "parallax";
	layers: ParallaxLayer[];
}

export interface StaticBackground extends ImageField {
	type: "static";
	color?: string;
	/**
	 * Description of what the background should look like.
	 * Used by the AI asset generation pipeline.
	 */
	whatDescription?: string;
}

export type BackgroundConfig = StaticBackground | ParallaxBackground;

export interface ParallaxConfig {
	enabled: boolean;
	layers: ParallaxLayer[];
}

export interface GameJointBase {
	id: string;
	entityA: string;
	entityB: string;
	collideConnected?: boolean;
}

export interface GameRevoluteJoint extends GameJointBase {
	type: "revolute";
	anchor: Vec2;
	enableLimit?: boolean;
	lowerAngle?: number;
	upperAngle?: number;
	enableMotor?: boolean;
	motorSpeed?: number;
	maxMotorTorque?: number;
}

export interface GameDistanceJoint extends GameJointBase {
	type: "distance";
	anchorA: Vec2;
	anchorB: Vec2;
	length?: number;
	stiffness?: number;
	damping?: number;
}

export interface GameWeldJoint extends GameJointBase {
	type: "weld";
	anchor: Vec2;
	stiffness?: number;
	damping?: number;
}

export interface GamePrismaticJoint extends GameJointBase {
	type: "prismatic";
	anchor: Vec2;
	axis: Vec2;
	enableLimit?: boolean;
	lowerTranslation?: number;
	upperTranslation?: number;
	enableMotor?: boolean;
	motorSpeed?: number;
	maxMotorForce?: number;
}

export type GameJoint =
	| GameRevoluteJoint
	| GameDistanceJoint
	| GameWeldJoint
	| GamePrismaticJoint;

export type GameVariableValue =
	| number
	| boolean
	| string
	| Vec2
	| Vec3
	| Value<ExpressionValueType>;

/**
 * Discriminated union for knob control configuration.
 * Used by the KnobsPanel to render appropriate UI controls.
 */
export type KnobConfig =
	| { controlType: "slider"; min: number; max: number; step?: number }
	| { controlType: "toggle" }
	| {
			controlType: "select";
			options: Array<{ label: string; value: string | number }>;
	  }
	| { controlType: "color"; presets?: string[] }
	| {
			controlType: "button";
			action: string;
			variant?: "default" | "destructive";
	  }
	| {
			controlType: "vec2";
			min?: { x: number; y: number };
			max?: { x: number; y: number };
	  }
	| {
			controlType: "vec3";
			min?: { x: number; y: number; z: number };
			max?: { x: number; y: number; z: number };
	  }
	| { controlType: "gradient"; minStops?: number; maxStops?: number }
	| { controlType: "text"; maxLength?: number; placeholder?: string };

/**
 * Variable with tuning metadata for live editing
 */
export interface VariableWithTuning {
	/** Current/default value */
	value: GameVariableValue;

	/** Tuning configuration for dev UI (optional) */
	tuning?: {
		min: number;
		max: number;
		step: number;
	};

	/** Rich control type for KnobsPanel (optional) */
	knob?: KnobConfig;

	/** Category for grouping in UI (optional) */
	category?: "physics" | "gameplay" | "visuals" | "economy" | "ai";

	/** Human-readable label (optional) */
	label?: string;

	/** Tooltip description (optional) */
	description?: string;

	/** Show to player in HUD (optional) */
	display?: boolean;
}

/**
 * Union type: either simple value or rich object with metadata
 */
export type GameVariable = GameVariableValue | VariableWithTuning;

/**
 * Type guard for variables with tuning metadata
 */
export function isVariableWithTuning(v: GameVariable): v is VariableWithTuning {
	return (
		typeof v === "object" &&
		v !== null &&
		"value" in v &&
		!("x" in v) &&
		!("expr" in v)
	);
}

/**
 * Check if a variable has tuning metadata
 */
export function isTunable(v: GameVariable): boolean {
	return isVariableWithTuning(v) && v.tuning !== undefined;
}

/**
 * Get the actual value from a GameVariable (handles both formats)
 */
export function getValue(v: GameVariable): GameVariableValue {
	return isVariableWithTuning(v) ? v.value : v;
}

/**
 * Get label for a variable (auto-generates from key if not provided)
 */
export function getLabel(key: string, v: GameVariable): string {
	if (isVariableWithTuning(v) && v.label) {
		return v.label;
	}
	// Auto-generate label from key: "jumpForce" → "Jump Force"
	return key
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (str) => str.toUpperCase())
		.trim();
}

export function inferKnob(
	variable: VariableWithTuning,
): KnobConfig | undefined {
	if (variable.knob) return variable.knob;
	if (variable.tuning) {
		return {
			controlType: "slider",
			min: variable.tuning.min,
			max: variable.tuning.max,
			step: variable.tuning.step,
		};
	}
	const val = variable.value;
	if (typeof val === "boolean") return { controlType: "toggle" };
	if (typeof val === "string" && val.startsWith("#") && val.length === 7)
		return { controlType: "color" };
	return undefined;
}

export interface MultiplayerConfig {
	enabled: boolean;
	maxPlayers: number;
	syncMode?: "host-authoritative" | "peer-to-peer";
	inputDelay?: number;
	snapshotRate?: number;
	deltaRate?: number;
	interpolationDelay?: number;
}

export interface LoadingScreenConfig {
	/** Legacy: full URL or relative path */
	backgroundImageUrl?: string;
	/** New: asset UUID reference for `backgroundImageUrl` */
	backgroundAssetRef?: string;
	/** Legacy: full URL or relative path */
	progressBarImageUrl?: string;
	/** New: asset UUID reference for `progressBarImageUrl` */
	progressBarAssetRef?: string;
	/** Legacy: full URL or relative path */
	progressBarFillImageUrl?: string;
	/** New: asset UUID reference for `progressBarFillImageUrl` */
	progressBarFillAssetRef?: string;
	backgroundColor?: string;
	progressBarColor?: string;
	textColor?: string;
}

export interface SoundAsset {
	url: string;
	assetId?: string;
	type: "sfx" | "music";
	loop?: boolean;
	defaultVolume?: number;
}

export type TapZoneEdge = "left" | "right" | "top" | "bottom";
export type TapZoneButton =
	| "left"
	| "right"
	| "up"
	| "down"
	| "jump"
	| "action";

export interface TapZone {
	id: string;
	edge: TapZoneEdge;
	size: number;
	button: TapZoneButton;
	debugColor?: string;
}

export type VirtualButtonType = "jump" | "action";

export interface VirtualButton {
	id: string;
	button: VirtualButtonType;
	label?: string;
	size?: number;
	color?: string;
	activeColor?: string;
}

export interface VirtualJoystick {
	id: string;
	size?: number;
	knobSize?: number;
	deadZone?: number;
	color?: string;
	knobColor?: string;
}

export type DPadDirection = "up" | "down" | "left" | "right";

export interface VirtualDPad {
	id: string;
	size?: number;
	buttonSize?: number;
	color?: string;
	activeColor?: string;
	showDiagonals?: boolean;
}

export interface TiltConfig {
	enabled: boolean;
	sensitivity?: number;
	updateInterval?: number;
}

export interface InputConfig {
	tapZones?: TapZone[];
	debugTapZones?: boolean;
	/** Enable comprehensive input debug overlay showing tap positions, entity targets, drag vectors, etc. */
	debugInputs?: boolean;
	virtualButtons?: VirtualButton[];
	virtualJoystick?: VirtualJoystick;
	virtualDPad?: VirtualDPad;
	enableHaptics?: boolean;
	tilt?: TiltConfig;
}

export interface VariantSheetConfig {
	enabled: boolean;
	groupId: string;
	/** Legacy: full URL or relative path */
	atlasUrl: string;
	/** New: asset UUID reference for `atlasUrl` */
	atlasAssetRef?: string;
	/** Legacy: full URL or relative path */
	metadataUrl?: string;
	/** New: asset UUID reference for `metadataUrl` */
	metadataAssetRef?: string;
	layout: {
		columns: number;
		rows: number;
		cellWidth: number;
		cellHeight: number;
	};
}

export interface Match3Config {
	gridId: string;
	rows: number;
	cols: number;
	cellSize: number;
	piecePrefabs: string[];
	minMatch?: number;
	swapDuration?: number;
	fallDuration?: number;
	clearDelay?: number;
	variantSheet?: VariantSheetConfig;
	matchDetection?: string;
	scoring?: string;
}

export interface TetrisConfig {
	gridId: string;
	boardWidth: number;
	boardHeight: number;
	piecePrefabs: string[];
	initialDropSpeed?: number;
	levelSpeedMultiplier?: number;
}

export interface GameDefinition {
	metadata: GameMetadata;
	sceneType?: "2d" | "3d";
	world: WorldConfig | World3DConfig;
	presentation?: PresentationConfig;
	camera?: CameraConfig;
	camera3d?: Camera3DConfig;
	background?: BackgroundConfig;
	variables?: Record<string, GameVariable>;
	prefabs: Record<string, EntityPrefab | EntityPrefab3D>;
	entities: Array<GameEntity | GameEntity3D>;
	joints?: GameJoint[];
	/** @deprecated Use background with type: 'parallax' instead */
	parallaxConfig?: ParallaxConfig;
	tileSheets?: TileSheet[];
	tileMaps?: TileMap[];
	multiplayer?: MultiplayerConfig;
	loadingScreen?: LoadingScreenConfig;
	sounds?: Record<string, SoundAsset>;
	input?: InputConfig;
	input3d?: InputConfig3D;
	match3?: Match3Config;
	tetris?: TetrisConfig;
	/**
	 * Optional persistence configuration for saving/loading game progress.
	 * Games opt-in to persistence by providing this configuration.
	 */
	persistence?: import("./progress").PersistenceConfig<unknown>;

	/**
	 * Constants that can be referenced throughout the bundle using { const: "NAME" } syntax.
	 * The compiler resolves these at bundle compile time.
	 * Example: { GRAVITY: 9.8, JUMP_FORCE: 15 }
	 */
	constants?: Record<string, number | string | boolean>;

	/**
	 * Machinations-inspired economy graph for resource flow simulation.
	 * Validated by @slopcade/economy-engine schemas at build/API layer.
	 */
	economy?: EconomyGraphDefinition;

	effects?: {
		graph?: unknown;
		graphs?: unknown[];
		shaders?: Record<string, { filename: string; glsl: string }>;
		entityEffects?: Array<{
			entityId: string;
			glsl: string;
			params?: Record<string, unknown>;
		}>;
	};

	hoverHighlight?: HoverHighlightConfig;

	dialogs?: GameDialogsConfig;

	overlay?: OverlayConfig;

	party?: import("./party").PartyConfig;

	/**
	 * Script modules loaded by ScriptSandboxRuntimeSystem.
	 * Keys are module names, values are JavaScript source code strings.
	 */
	modules?: Record<string, string>;
}

export interface HoverHighlightConfig {
	targetTag: string;
	highlightEntityId: string;
}

// ============================================================================
// Game-Defined Dialog System
// ============================================================================

export type GameButtonVariant = "primary" | "secondary";

export interface GameButtonDefinition {
	label: string;
	eventName: string;
	data?: Record<string, unknown>;
	variant?: GameButtonVariant;
}

export interface GameDialogStatDefinition {
	label: string;
	variable: string;
	format?: string;
	binding?: string;
}

export interface GameDialogStyle {
	backgroundColor?: string;
	titleColor?: string;
	titleFontSize?: number;
	backdropColor?: string;
	width?: number | string;
	borderRadius?: number;
}

export interface GameDialogDefinition {
	id: string;
	title: string;
	message?: string;
	stats?: GameDialogStatDefinition[];
	dismissible?: boolean;
	dismissEventName?: string;
	buttons: GameButtonDefinition[];
	showOnState?: "ready" | "won" | "lost" | "paused";
	showWhen?: string;
	style?: GameDialogStyle;
}

export interface GameDialogsConfig {
	activeDialogVariable?: string;
	dialogs: GameDialogDefinition[];
	legacyWinDialogFallback?: boolean;
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
	gravity: { x: 0, y: 10 },
	pixelsPerMeter: 50,
	bounds: { width: 20, height: 12 },
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
	type: "fixed",
	zoom: 1,
};
