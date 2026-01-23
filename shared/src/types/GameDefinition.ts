import type { Vec2 } from './common';
import type { GameEntity, EntityTemplate } from './entity';
import type { GameRule, WinCondition, LoseCondition } from './rules';
import type { TileSheet, TileMap } from './tilemap';
import type { AssetSystemConfig } from './asset-system';
import type { Value, ExpressionValueType } from '../expressions/types';

export interface WorldConfig {
  gravity: Vec2;
  pixelsPerMeter: number;
  bounds?: {
    width: number;
    height: number;
  };
}

export type CameraType = 'fixed' | 'follow' | 'follow-x' | 'follow-y' | 'auto-scroll';

export interface CameraDeadZone {
  width: number;
  height: number;
}

export interface CameraLookAhead {
  enabled: boolean;
  distance: number;
  smoothing?: number;
  mode?: 'velocity' | 'facing' | 'input';
}

export interface CameraAutoScroll {
  direction: Vec2;
  speed: number;
  acceleration?: number;
}

export interface CameraShakeConfig {
  decay?: number;
  maxOffset?: number;
  maxRotation?: number;
}

export interface CameraConfig {
  type: CameraType;
  followTarget?: string;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  followSmoothing?: number;
  followOffset?: Vec2;
  deadZone?: CameraDeadZone;
  lookAhead?: CameraLookAhead;
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  autoScroll?: CameraAutoScroll;
  shake?: CameraShakeConfig;
}

export interface PresentationConfig {
  aspectRatio?: { width: number; height: number } | number;
  fit?: 'contain' | 'cover';
  letterboxColor?: string;
  orientation?: 'portrait' | 'landscape' | 'any';
}

export interface EntityCountDisplay {
  tag: string;
  label: string;
  color?: string;
}

export interface UIConfig {
  showScore?: boolean;
  showTimer?: boolean;
  showLives?: boolean;
  livesLabel?: string;
  timerCountdown?: boolean;
  scorePosition?: 'top-left' | 'top-center' | 'top-right';
  backgroundColor?: string;
  entityCountDisplays?: EntityCountDisplay[];
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

export interface GameJointBase {
  id: string;
  entityA: string;
  entityB: string;
  collideConnected?: boolean;
}

export interface GameRevoluteJoint extends GameJointBase {
  type: 'revolute';
  anchor: Vec2;
  enableLimit?: boolean;
  lowerAngle?: number;
  upperAngle?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorTorque?: number;
}

export interface GameDistanceJoint extends GameJointBase {
  type: 'distance';
  anchorA: Vec2;
  anchorB: Vec2;
  length?: number;
  stiffness?: number;
  damping?: number;
}

export interface GameWeldJoint extends GameJointBase {
  type: 'weld';
  anchor: Vec2;
  stiffness?: number;
  damping?: number;
}

export interface GamePrismaticJoint extends GameJointBase {
  type: 'prismatic';
  anchor: Vec2;
  axis: Vec2;
  enableLimit?: boolean;
  lowerTranslation?: number;
  upperTranslation?: number;
  enableMotor?: boolean;
  motorSpeed?: number;
  maxMotorForce?: number;
}

export type GameJoint = GameRevoluteJoint | GameDistanceJoint | GameWeldJoint | GamePrismaticJoint;

export type GameVariableValue = number | boolean | string | Vec2 | Value<ExpressionValueType>;

export interface MultiplayerConfig {
  enabled: boolean;
  maxPlayers: number;
  syncMode?: 'host-authoritative' | 'peer-to-peer';
  inputDelay?: number;
  snapshotRate?: number;
  deltaRate?: number;
  interpolationDelay?: number;
}

export interface GameDefinition {
  metadata: GameMetadata;
  world: WorldConfig;
  presentation?: PresentationConfig;
  camera?: CameraConfig;
  ui?: UIConfig;
  variables?: Record<string, GameVariableValue>;
  templates: Record<string, EntityTemplate>;
  entities: GameEntity[];
  joints?: GameJoint[];
  rules?: GameRule[];
  winCondition?: WinCondition;
  loseCondition?: LoseCondition;
  initialLives?: number;
  initialScore?: number;
  assetPacks?: Record<string, AssetPack>;
  activeAssetPackId?: string;
  assetSystem?: AssetSystemConfig;
  parallaxConfig?: ParallaxConfig;
  tileSheets?: TileSheet[];
  tileMaps?: TileMap[];
  multiplayer?: MultiplayerConfig;
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
