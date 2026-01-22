import type { Vec2 } from './common';
import type { EffectChain } from './effects';

export type SpriteType = 'rect' | 'circle' | 'polygon' | 'image';

export interface ShadowEffect {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface BaseSpriteComponent {
  type: SpriteType;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  shadow?: ShadowEffect;
  tint?: string;
  effects?: EffectChain;
}

export interface RectSpriteComponent extends BaseSpriteComponent {
  type: 'rect';
  width: number;
  height: number;
}

export interface CircleSpriteComponent extends BaseSpriteComponent {
  type: 'circle';
  radius: number;
}

export interface PolygonSpriteComponent extends BaseSpriteComponent {
  type: 'polygon';
  vertices: Vec2[];
}

export interface ImageSpriteComponent extends BaseSpriteComponent {
  type: 'image';
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export type SpriteComponent =
  | RectSpriteComponent
  | CircleSpriteComponent
  | PolygonSpriteComponent
  | ImageSpriteComponent;
