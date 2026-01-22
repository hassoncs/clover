import type { Vec2 } from './common';
import type { GameEntity, EntityTemplate } from './entity';
import type { GameRule, WinCondition, LoseCondition } from './rules';

export interface WorldConfig {
  gravity: Vec2;
  pixelsPerMeter: number;
  bounds?: {
    width: number;
    height: number;
  };
}

export interface CameraConfig {
  type: 'fixed' | 'follow';
  followTarget?: string;
  zoom?: number;
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface UIConfig {
  showScore?: boolean;
  showTimer?: boolean;
  showLives?: boolean;
  timerCountdown?: boolean;
  scorePosition?: 'top-left' | 'top-center' | 'top-right';
  backgroundColor?: string;
}

export interface GameMetadata {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  author?: string;
  version: string;
  createdAt?: number;
  updatedAt?: number;
  thumbnailUrl?: string;
}

export type AssetSource = 'generated' | 'uploaded' | 'none';

export interface AssetConfig {
  imageUrl?: string;
  source?: AssetSource;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  animations?: Record<string, {
    frames: string[];
    fps: number;
    loop?: boolean;
  }>;
}

export interface AssetPack {
  id: string;
  name: string;
  description?: string;
  style?: 'pixel' | 'cartoon' | '3d' | 'flat';
  assets: Record<string, AssetConfig>;
}

export type ParallaxDepth = 'sky' | 'far' | 'mid' | 'near';

export interface ParallaxLayer {
  id: string;
  name: string;
  imageUrl?: string;
  depth: ParallaxDepth;
  parallaxFactor: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  visible?: boolean;
}

export interface ParallaxConfig {
  enabled: boolean;
  layers: ParallaxLayer[];
}

export interface GameDefinition {
  metadata: GameMetadata;
  world: WorldConfig;
  camera?: CameraConfig;
  ui?: UIConfig;
  templates: Record<string, EntityTemplate>;
  entities: GameEntity[];
  rules?: GameRule[];
  winCondition?: WinCondition;
  loseCondition?: LoseCondition;
  initialLives?: number;
  initialScore?: number;
  assetPacks?: Record<string, AssetPack>;
  activeAssetPackId?: string;
  parallaxConfig?: ParallaxConfig;
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  gravity: { x: 0, y: 10 },
  pixelsPerMeter: 50,
  bounds: { width: 20, height: 12 },
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  type: 'fixed',
  zoom: 1,
};

export const DEFAULT_UI_CONFIG: UIConfig = {
  showScore: true,
  showTimer: false,
  showLives: false,
  scorePosition: 'top-right',
  backgroundColor: '#87CEEB',
};
