import type { Vec2 } from './common';
import type { GameEntity, EntityTemplate } from './entity';
import type { GameRule, WinCondition, LoseCondition } from './rules';
import type { TileSheet, TileMap } from './tilemap';
import type { AssetSystemConfig } from './asset-system';
import type { Value, ExpressionValueType } from '../expressions/types';
import type { StateMachineDefinition } from '../systems/state-machine/types';

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
  viewHeight?: number;
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

export interface VariableDisplay {
  name: string;
  label: string;
  color?: string;
  format?: string;
  showWhen?: 'always' | 'not_default';
  defaultValue?: number | string | boolean;
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
  variableDisplays?: VariableDisplay[];
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
  titleHeroImageUrl?: string;
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

export interface ParallaxBackground {
  type: 'parallax';
  layers: ParallaxLayer[];
}

export interface StaticBackground {
  type: 'static';
  imageUrl?: string;
  color?: string;
}

export type BackgroundConfig = StaticBackground | ParallaxBackground;

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

/**
 * Variable with tuning metadata for live editing
 */
export interface VariableWithTuning {
  /** Current/default value */
  value: GameVariableValue;
  
  /** Tuning configuration for dev UI (optional) */
  tuning?: {
    min: number;
    max: number;
    step: number;
  };
  
  /** Category for grouping in UI (optional) */
  category?: 'physics' | 'gameplay' | 'visuals' | 'economy' | 'ai';
  
  /** Human-readable label (optional) */
  label?: string;
  
  /** Tooltip description (optional) */
  description?: string;
  
  /** Show to player in HUD (optional) */
  display?: boolean;
}

/**
 * Union type: either simple value or rich object with metadata
 */
export type GameVariable = GameVariableValue | VariableWithTuning;

/**
 * Type guard for variables with tuning metadata
 */
export function isVariableWithTuning(v: GameVariable): v is VariableWithTuning {
  return typeof v === 'object' && v !== null && 'value' in v && !('x' in v) && !('expr' in v);
}

/**
 * Check if a variable has tuning metadata
 */
export function isTunable(v: GameVariable): boolean {
  return isVariableWithTuning(v) && v.tuning !== undefined;
}

/**
 * Get the actual value from a GameVariable (handles both formats)
 */
export function getValue(v: GameVariable): GameVariableValue {
  return isVariableWithTuning(v) ? v.value : v;
}

/**
 * Get label for a variable (auto-generates from key if not provided)
 */
export function getLabel(key: string, v: GameVariable): string {
  if (isVariableWithTuning(v) && v.label) {
    return v.label;
  }
  // Auto-generate label from key: "jumpForce" → "Jump Force"
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

export interface MultiplayerConfig {
  enabled: boolean;
  maxPlayers: number;
  syncMode?: 'host-authoritative' | 'peer-to-peer';
  inputDelay?: number;
  snapshotRate?: number;
  deltaRate?: number;
  interpolationDelay?: number;
}

export interface LoadingScreenConfig {
  backgroundImageUrl?: string;
  progressBarImageUrl?: string;
  progressBarFillImageUrl?: string;
  backgroundColor?: string;
  progressBarColor?: string;
  textColor?: string;
}

export interface SoundAsset {
  url: string;
  type: 'sfx' | 'music';
  loop?: boolean;
  defaultVolume?: number;
}

export type TapZoneEdge = 'left' | 'right' | 'top' | 'bottom';
export type TapZoneButton = 'left' | 'right' | 'up' | 'down' | 'jump' | 'action';

export interface TapZone {
  id: string;
  edge: TapZoneEdge;
  size: number;
  button: TapZoneButton;
  debugColor?: string;
}

export type VirtualButtonType = 'jump' | 'action';

export interface VirtualButton {
  id: string;
  button: VirtualButtonType;
  label?: string;
  size?: number;
  color?: string;
  activeColor?: string;
}

export interface VirtualJoystick {
  id: string;
  size?: number;
  knobSize?: number;
  deadZone?: number;
  color?: string;
  knobColor?: string;
}

export type DPadDirection = 'up' | 'down' | 'left' | 'right';

export interface VirtualDPad {
  id: string;
  size?: number;
  buttonSize?: number;
  color?: string;
  activeColor?: string;
  showDiagonals?: boolean;
}

export interface TiltConfig {
  enabled: boolean;
  sensitivity?: number;
  updateInterval?: number;
}

export interface InputConfig {
  tapZones?: TapZone[];
  debugTapZones?: boolean;
  virtualButtons?: VirtualButton[];
  virtualJoystick?: VirtualJoystick;
  virtualDPad?: VirtualDPad;
  enableHaptics?: boolean;
  tilt?: TiltConfig;
}

export interface VariantSheetConfig {
  enabled: boolean;
  groupId: string;
  atlasUrl: string;
  metadataUrl?: string;
  layout: { columns: number; rows: number; cellWidth: number; cellHeight: number };
}

export interface Match3Config {
  gridId: string;
  rows: number;
  cols: number;
  cellSize: number;
  pieceTemplates: string[];
  minMatch?: number;
  swapDuration?: number;
  fallDuration?: number;
  clearDelay?: number;
  variantSheet?: VariantSheetConfig;
  matchDetection?: string;
  scoring?: string;
}

export interface TetrisConfig {
  gridId: string;
  boardWidth: number;
  boardHeight: number;
  pieceTemplates: string[];
  initialDropSpeed?: number;
  levelSpeedMultiplier?: number;
}

export interface GameDefinition {
  metadata: GameMetadata;
  world: WorldConfig;
  presentation?: PresentationConfig;
  camera?: CameraConfig;
  ui?: UIConfig;
  background?: BackgroundConfig;
  variables?: Record<string, GameVariable>;
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
  /** @deprecated Use background with type: 'parallax' instead */
  parallaxConfig?: ParallaxConfig;
  tileSheets?: TileSheet[];
  tileMaps?: TileMap[];
  multiplayer?: MultiplayerConfig;
  loadingScreen?: LoadingScreenConfig;
  sounds?: Record<string, SoundAsset>;
  input?: InputConfig;
  match3?: Match3Config;
  tetris?: TetrisConfig;
  /**
   * Game-level state machines for managing game phases, turns, and flow.
   * Unlike entity-level machines, these have no `owner` field set.
   */
  stateMachines?: StateMachineDefinition[];
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
