import type { CompiledPlan } from "../effects/types";
import type { Vec2 } from "./common";
import type { EntityPrefab, GameEntity } from "./entity";
import type { BackgroundConfig, WorldConfig } from "./GameDefinition";
import type { WorkspaceManifest } from "./PackageManifest";
import type { GameRule } from "./rules";

export type TagGroup =
	| "world"
	| "prefabs"
	| "entities"
	| "rules"
	| "scripts"
	| "effects"
	| "assets";

export interface PackageArtifact {
	tag: TagGroup;
	hash: string;
	sizeBytes: number;
}

/** Wraps WorkspaceManifest with build-specific metadata and artifact references. */
export interface BuildManifest {
	packageManifest: WorkspaceManifest;
	buildId: string;
	createdAt: number;
	artifacts: PackageArtifact[];
}

export interface TagPayloads {
	world: {
		world: WorldConfig;
		background?: BackgroundConfig;
	};
	prefabs: {
		prefabs: Record<string, EntityPrefab>;
	};
	entities: {
		entities: GameEntity[];
	};
	rules: {
		rules: GameRule[];
	};
	scripts: {
		script: string;
	};
	effects: {
		plans: Record<string, CompiledPlan>;
		shaders: Record<string, string>;
	};
	assets: {
		urls: Record<string, string>;
	};
}

export type TagPayload<T extends TagGroup> = TagPayloads[T];

export interface PackageError {
	code: PackageErrorCode;
	message: string;
	tag?: TagGroup;
	details?: Record<string, unknown>;
}

export type PackageErrorCode =
	| "MANIFEST_INVALID"
	| "ARTIFACT_NOT_FOUND"
	| "ARTIFACT_HASH_MISMATCH"
	| "LOAD_FAILED"
	| "UNLOAD_FAILED"
	| "INSTANTIATE_FAILED"
	| "BRIDGE_ERROR"
	| "TIMEOUT";

export interface LoadResult {
	success: boolean;
	loadedTags: TagGroup[];
	errors?: PackageError[];
	durationMs?: number;
}

export interface InstantiateOpts {
	position?: Vec2;
	parentId?: string;
	initialVelocity?: Vec2;
	properties?: Record<string, unknown>;
}

export interface EntityRef {
	entityId: string;
	prefabId: string;
	tags: string[];
}

export type TimeMode = "paused" | "playing";

/**
 * Orchestration layer between editor/game-runner and GodotBridge.
 * Maps to bridge primitives: setupWorld, registerPrefabs, loadEntities, etc.
 */
export interface PackageRuntimeAPI {
	/** Load all tag groups from manifest in order: world → prefabs → entities → rules → scripts → assets */
	loadPackage(manifest: BuildManifest): Promise<LoadResult>;

	/** Load a single tag group. Manifest must already be set. */
	loadByTag(tag: TagGroup): Promise<LoadResult>;

	/** Unload a tag group. Not all groups support unloading (world requires full reload). */
	unloadByTag(tag: TagGroup): Promise<void>;

	/** Hot-reload only the tag groups whose artifact hashes changed. */
	reloadChangedTags(changed: TagGroup[]): Promise<LoadResult>;

	/** Instantiate a data-backed prefab. Prefab must be loaded via 'prefabs' tag group. */
	instantiatePrefab(
		prefabId: string,
		opts?: InstantiateOpts,
	): Promise<EntityRef>;

	/** Instantiate from a Godot scene reference (opt-in lane for scene-backed prefabs). */
	instantiatePrefabFromScene(
		sceneRef: string,
		opts?: InstantiateOpts,
	): Promise<EntityRef>;

	/** Control game time — maps to bridge pausePhysics/resumePhysics. */
	setTimeMode(mode: TimeMode): Promise<void>;
}

export interface PackageLoadState {
	manifest: BuildManifest | null;
	loadedTags: Set<TagGroup>;
	artifactHashes: Partial<Record<TagGroup, string>>;
	timeMode: TimeMode;
}

/** Resolves artifact data from a build. Different environments provide different implementations. */
export interface ArtifactResolver {
	resolve<T extends TagGroup>(
		manifest: BuildManifest,
		tag: T,
	): Promise<TagPayload<T>>;
}
