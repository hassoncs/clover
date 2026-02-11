import type { WorkspaceManifest } from './PackageManifest';
import type { EntityPrefab, GameEntity } from './entity';
import type { GameRule } from './rules';
import type { WorldConfig } from './GameDefinition';
import type { PrefabDefinition } from './Prefab';

export type { PrefabDefinition } from './Prefab';

export interface AssetManifestEntry {
  id: string;
  type: 'image' | 'sound' | 'shader' | 'data';
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
  rules?: GameRule[];
  scripts?: string;
  assets?: AssetManifest;
  world?: WorldConfig;
  docs?: Record<string, string>;
}

export const REQUIRED_PACKAGE_FILES = ['slopcade.json', 'script.js', 'game.json'] as const;

export const WORKSPACE_CONVENTIONS = {
  manifest: 'slopcade.json',
  world: 'world.json',
  entities: 'entities.json',
  rules: 'rules.json',
  prefabsDir: 'prefabs/',
  scriptsDir: 'scripts/',
  assetsDir: 'assets/',
  docsDir: 'docs/',
} as const;
