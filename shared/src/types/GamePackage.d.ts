import type { EntityPrefab, GameEntity } from "./entity";
import type { WorldConfig } from "./GameDefinition";
import type { WorkspaceManifest } from "./PackageManifest";
import type { PrefabDefinition } from "./Prefab";
export type { PrefabDefinition } from "./Prefab";
export interface AssetManifestEntry {
    id: string;
    type: "image" | "sound" | "shader" | "data";
    path?: string;
    remoteUrl?: string;
    width?: number;
    height?: number;
}
export type AssetManifest = Record<string, AssetManifestEntry>;
/**
 * Alias for EntityPrefab for backward compatibility.
 */
export type LegacyPrefabDefinition = EntityPrefab;
export interface GamePackage {
    manifest: WorkspaceManifest;
    prefabs?: Record<string, PrefabDefinition | LegacyPrefabDefinition>;
    entities?: GameEntity[];
    scripts?: string;
    assets?: AssetManifest;
    world?: WorldConfig;
    docs?: Record<string, string>;
}
export declare const REQUIRED_PACKAGE_FILES: readonly ["slopcade.json", "script.js", "game.json"];
export declare const WORKSPACE_CONVENTIONS: {
    readonly manifest: "slopcade.json";
    readonly world: "world.json";
    readonly entities: "entities.json";
    readonly prefabsDir: "prefabs/";
    readonly scriptsDir: "scripts/";
    readonly effectsDir: "effects/";
    readonly shadersDir: "shaders/";
    readonly scenesDir: "scenes/";
    readonly assetsDir: "assets/";
    readonly docsDir: "docs/";
};
//# sourceMappingURL=GamePackage.d.ts.map