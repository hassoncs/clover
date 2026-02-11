import type { WorkspaceManifest } from './PackageManifest';
import type { EntityTemplate, GameEntity } from './entity';
import type { GameRule } from './rules';
import type { WorldConfig } from './GameDefinition';

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
 * Alias for EntityTemplate during the template→prefab migration.
 * Task 10 will make this a standalone type and remove EntityTemplate.
 */
export type PrefabDefinition = EntityTemplate;

export interface GamePackage {
  manifest: WorkspaceManifest;
  prefabs?: Record<string, PrefabDefinition>;
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
