import type { Bounds, Vec2 } from '../../types/common';
import type { Value } from '../../expressions/types';

export type SpawnFormation = 'none' | 'line' | 'circle' | 'grid' | 'random_in_bounds';

export interface FormationParams {
  spacing?: number;
  radius?: number;
  rows?: number;
  cols?: number;
  bounds?: Bounds;
}

export type WaveSpawnPosition =
  | { type: 'fixed'; x: number; y: number }
  | { type: 'random'; bounds: Bounds }
  | { type: 'path_start'; pathId: string }
  | { type: 'formation_center'; center: Vec2 };

export interface SpawnGroup {
  template: string | string[];
  count: Value<number>;
  interval: Value<number>;
  delay?: Value<number>;
  position: WaveSpawnPosition;
  formation?: SpawnFormation;
  formationParams?: FormationParams;
}

export interface Wave {
  id: string;
  spawns: SpawnGroup[];
  duration?: number;
  onWaveComplete?: string;
}

export interface WaveDefinition {
  id: string;
  waves: Wave[];
  autoStart?: boolean;
  delayBetweenWaves?: number;
  onAllWavesComplete?: string;
}

export interface WavesStartAction {
  type: 'waves_start';
  waveDefId: string;
}

export interface WavesNextAction {
  type: 'waves_next';
  waveDefId: string;
}

export interface WavesPauseAction {
  type: 'waves_pause';
  waveDefId: string;
}

export interface WavesResumeAction {
  type: 'waves_resume';
  waveDefId: string;
}

export type WaveAction = WavesStartAction | WavesNextAction | WavesPauseAction | WavesResumeAction;

export interface WaveState {
  currentWave: number;
  isActive: boolean;
  isPaused: boolean;
  spawnedEntityIds: string[];
  waveStartTime: number;
}
