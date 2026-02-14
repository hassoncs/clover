import type { TagGroup } from "./PackageRuntime";

export type { TagGroup } from "./PackageRuntime";

export const TAG_GROUPS: readonly TagGroup[] = [
	"world",
	"prefabs",
	"entities",
	"scripts",
	"effects",
	"assets",
] as const;

/**
 * Workspace manifest — identity and configuration for a game package.
 * Corresponds to `slopcade.json` in the workspace. Optional in workspace
 * (script-first packages may omit it), always present in build artifacts.
 *
 * Distinct from `PackageManifest` in PackageRuntime.ts (build descriptor)
 * and `PackageManifest` in effects/registry.ts (shader package manifest).
 */
export interface WorkspaceManifest {
	id: string;
	name: string;
	version: string;
	slug?: string;
	description?: string;
	instructions?: string;
	author?: string;

	/** Runtime entry point file. Resolved by convention when omitted (`game.json` or `script.js`). */
	entrypoint?: string;

	/**
	 * Tag groups for lazy loading. When specified, only listed groups load initially;
	 * others load on demand via `loadByTag`. When omitted, all groups load eagerly.
	 */
	tagGroups?: TagGroup[];

	createdAt?: number;
	updatedAt?: number;
}
