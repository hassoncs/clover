import type { EntityPrefab } from './entity';
import type { Vec2 } from './common';

export interface DataPrefabDefinition {
  type: 'data';
  id: string;
  description?: string;
  entityPrefab: EntityPrefab;
}

export interface ScenePrefabDefinition {
  type: 'scene';
  id: string;
  description?: string;
  scenePath: string;
}

export type PrefabDefinition = DataPrefabDefinition | ScenePrefabDefinition;

export interface PrefabRegistry {
  [prefabId: string]: PrefabDefinition;
}

export interface PrefabInstantiateOpts {
  entityId?: string;
  position?: Vec2;
  velocity?: Vec2;
  properties?: Record<string, unknown>;
}

export interface PrefabInstantiateResult {
  entityId: string;
  prefabId: string;
  type: 'data' | 'scene';
}
