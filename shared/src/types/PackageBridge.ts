import type { Vec2 } from './common';
import type { WorldConfig, BackgroundConfig } from './GameDefinition';
import type { EntityTemplate, GameEntity } from './entity';

/**
 * Minimal bridge surface required by the package runtime orchestrator.
 * Subset of GodotBridge — implementations delegate to the full bridge.
 */
export interface PackageBridgeContract {
  setupWorld(world: WorldConfig, background?: BackgroundConfig): void;
  registerTemplates(templates: Record<string, EntityTemplate>): void;
  loadEntities(entities: GameEntity[]): void;
  clearEntities(): void;
  clearGame(): void;

  spawnEntity(request: BridgeSpawnRequest): void;
  destroyEntity(entityId: string): void;

  pausePhysics(): void;
  resumePhysics(): void;

  preloadTextures(
    urls: string[],
    onProgress?: (percent: number, completed: number, failed: number) => void,
  ): Promise<{ completed: number; failed: number }>;
}

export interface BridgeSpawnRequest {
  entityId: string;
  templateId: string;
  position: Vec2;
  velocity?: Vec2;
}

export type BridgeOperationType =
  | 'setup_world'
  | 'register_templates'
  | 'load_entities'
  | 'clear_entities'
  | 'clear_game'
  | 'spawn_entity'
  | 'destroy_entity'
  | 'pause_physics'
  | 'resume_physics'
  | 'preload_textures';

export interface BridgeOperation {
  type: BridgeOperationType;
  payload: unknown;
  timestamp: number;
}

export interface BridgeOperationResult {
  type: BridgeOperationType;
  success: boolean;
  error?: string;
  durationMs: number;
}

/** Maps each TagGroup to the bridge method(s) invoked when loading that group. */
export interface TagGroupBridgeMapping {
  world: ['setupWorld'];
  prefabs: ['registerTemplates'];
  entities: ['loadEntities'];
  rules: [];
  scripts: [];
  assets: ['preloadTextures'];
}
