export type WorkspaceTag =
	| "world"
	| "prefabs"
	| "entities"
	| "scripts"
	| "effects"
	| "assets";

export interface WorkspaceFileMeta {
	path: string;
	contentHash: string;
	size: number;
	uploaded?: number;
	tagHints: WorkspaceTag[];
	/** Scene this file belongs to. null = top-level (V1 default). */
	scene?: string | null;
}

export interface SceneManifest {
	name: string;
	/** e.g. "scenes/main" */
	root: string;
	entitiesPath?: string;
	/** Optional per-scene world override */
	worldPath?: string;
}

export interface LazyWorkspaceManifest {
	schemaVersion: 2;
	gameId: string;
	revision: string;
	files: WorkspaceFileMeta[];
	/** V1: always null */
	activeScene: string | null;
	/** V1: always empty */
	scenes: SceneManifest[];
	createdAt: number;
	updatedAt: number;
}

export interface WorkspaceSnapshotFile {
	filename: string;
	content: string;
	contentHash: string;
	size: number;
	uploaded: number;
}

export interface WorkspaceSnapshot {
	gameId: string;
	revision: string;
	generatedAt: number;
	files: WorkspaceSnapshotFile[];
}
