import type { Vec2 } from './common';

export type VisualType = 'rect' | 'circle' | 'polygon' | 'image' | 'text';

export type VisualBlendMode = 'mix' | 'add' | 'sub' | 'mul';

export interface ShadowEffect {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

interface BaseVisualComponent {
  type: VisualType;
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  zIndex?: number;
  blendMode?: VisualBlendMode;
  shadow?: ShadowEffect;
  effects?: EffectChain;
}

export interface RectVisualComponent extends BaseVisualComponent {
  type: 'rect';
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface CircleVisualComponent extends BaseVisualComponent {
  type: 'circle';
  radius?: number;
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface PolygonVisualComponent extends BaseVisualComponent {
  type: 'polygon';
  vertices: Vec2[];
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ImageVisualComponent extends BaseVisualComponent {
  type: 'image';
  /**
   * @deprecated Image URL now comes from asset pack at runtime.
   * Keep only for backward compatibility during migration.
   * Will be removed in Task 11 after all games are migrated.
   */
  imageUrl?: string;
  tint?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface TextVisualComponent extends BaseVisualComponent {
  type: 'text';
  text: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
}

export type VisualComponent =
  | RectVisualComponent
  | CircleVisualComponent
  | PolygonVisualComponent
  | ImageVisualComponent
  | TextVisualComponent;

import type { EffectChain } from './effects';
