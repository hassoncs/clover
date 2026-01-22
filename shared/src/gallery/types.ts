/**
 * Gallery System Type Definitions
 * 
 * Provides a unified way to define, display, and export all game engine capabilities
 * including effects, particles, behaviors, sprites, and physics features.
 */

export type GallerySectionId = 
  | 'effects'
  | 'particles'
  | 'behaviors'
  | 'sprites'
  | 'physics';

export type ParamType = 'number' | 'boolean' | 'color' | 'select' | 'vec2';

export interface ParamDefinition {
  key: string;
  type: ParamType;
  displayName: string;
  description?: string;
  defaultValue: number | boolean | string | { x: number; y: number };
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface GallerySection {
  id: GallerySectionId;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface GalleryItemMeta {
  id: string;
  section: GallerySectionId;
  title: string;
  description: string;
  icon?: string;
  tags?: string[];
  category?: string;
  /** Path to static preview image (relative to assets/gallery-previews/) */
  previewImage?: string;
}

export interface GalleryItem<TParams = Record<string, unknown>> extends GalleryItemMeta {
  params: ParamDefinition[];
  defaultParams: TParams;
  getExportJSON: (params: TParams) => Record<string, unknown>;
  getUsageExample?: (params: TParams) => string;
}

export interface GalleryRegistry {
  sections: GallerySection[];
  items: Map<GallerySectionId, GalleryItem[]>;
}

export interface EffectGalleryItem extends GalleryItem {
  section: 'effects';
  effectType: string;
  category: 'glow' | 'distortion' | 'color' | 'postProcess' | 'artistic';
}

export interface ParticleGalleryItem extends GalleryItem {
  section: 'particles';
  emitterType: string;
}

export interface BehaviorGalleryItem extends GalleryItem {
  section: 'behaviors';
  behaviorType: string;
  category: 'movement' | 'control' | 'interaction' | 'spawning' | 'physics' | 'animation';
}

export interface SpriteGalleryItem extends GalleryItem {
  section: 'sprites';
  spriteType: 'rect' | 'circle' | 'polygon' | 'image';
}

export interface PhysicsGalleryItem extends GalleryItem {
  section: 'physics';
  physicsCategory: 'bodies' | 'shapes' | 'joints' | 'materials' | 'forces';
}

export type AnyGalleryItem = 
  | EffectGalleryItem 
  | ParticleGalleryItem 
  | BehaviorGalleryItem 
  | SpriteGalleryItem 
  | PhysicsGalleryItem;
