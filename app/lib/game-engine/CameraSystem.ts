import type { Vec2 } from '../physics2d/types';
import type { RuntimeEntity } from './types';

export interface CameraConfig {
  position: Vec2;
  zoom: number;
  rotation?: number;
  followTarget?: string;
  followSmoothing?: number;
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  shakeIntensity?: number;
  shakeDuration?: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface CameraTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export class CameraSystem {
  private config: CameraConfig;
  private viewport: ViewportSize;
  private pixelsPerMeter: number;
  private shakeTimeRemaining = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;

  constructor(config: CameraConfig, viewport: ViewportSize, pixelsPerMeter: number = 50) {
    this.config = { ...config };
    this.viewport = { ...viewport };
    this.pixelsPerMeter = pixelsPerMeter;
  }

  updateViewport(viewport: ViewportSize): void {
    this.viewport = { ...viewport };
  }

  updateConfig(config: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...config };
  }

  update(dt: number, entityGetter?: (id: string) => RuntimeEntity | undefined): void {
    this.updateFollowTarget(entityGetter);
    this.applyBounds();
    this.updateShake(dt);
  }

  private updateFollowTarget(entityGetter?: (id: string) => RuntimeEntity | undefined): void {
    if (!this.config.followTarget || !entityGetter) return;

    const target = entityGetter(this.config.followTarget);
    if (!target) return;

    const smoothing = this.config.followSmoothing ?? 0.1;
    const targetX = target.transform.x;
    const targetY = target.transform.y;

    if (smoothing === 0) {
      this.config.position = { x: targetX, y: targetY };
    } else {
      this.config.position = {
        x: this.config.position.x + (targetX - this.config.position.x) * smoothing,
        y: this.config.position.y + (targetY - this.config.position.y) * smoothing,
      };
    }
  }

  private applyBounds(): void {
    if (!this.config.bounds) return;

    const { bounds } = this.config;
    this.config.position = {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, this.config.position.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, this.config.position.y)),
    };
  }

  private updateShake(dt: number): void {
    if (this.shakeTimeRemaining <= 0) {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }

    this.shakeTimeRemaining -= dt;
    const intensity = this.config.shakeIntensity ?? 0;
    const progress = this.shakeTimeRemaining / (this.config.shakeDuration ?? 1);
    const currentIntensity = intensity * progress;

    this.shakeOffsetX = (Math.random() - 0.5) * currentIntensity * 2;
    this.shakeOffsetY = (Math.random() - 0.5) * currentIntensity * 2;
  }

  shake(intensity: number, duration: number): void {
    this.config.shakeIntensity = intensity;
    this.config.shakeDuration = duration;
    this.shakeTimeRemaining = duration;
  }

  getWorldToScreenTransform(): CameraTransform {
    const centerX = this.viewport.width / 2;
    const centerY = this.viewport.height / 2;
    
    const worldX = this.config.position.x + this.shakeOffsetX;
    const worldY = this.config.position.y + this.shakeOffsetY;
    
    // Convert world position to pixels and apply zoom
    // Entity positions are already converted to pixels by renderers (entity.x * pixelsPerMeter)
    // So camera translation needs to offset from screen center by (worldPos * pixelsPerMeter * zoom)
    return {
      translateX: centerX - worldX * this.pixelsPerMeter * this.config.zoom,
      translateY: centerY - worldY * this.pixelsPerMeter * this.config.zoom,
      scaleX: this.config.zoom,
      scaleY: this.config.zoom,
      rotation: this.config.rotation ?? 0,
    };
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    const transform = this.getWorldToScreenTransform();
    
    const pixelX = (screenX - transform.translateX) / transform.scaleX;
    const pixelY = (screenY - transform.translateY) / transform.scaleY;
    
    return { x: pixelX / this.pixelsPerMeter, y: pixelY / this.pixelsPerMeter };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const transform = this.getWorldToScreenTransform();
    
    const pixelX = worldX * this.pixelsPerMeter;
    const pixelY = worldY * this.pixelsPerMeter;
    const screenX = pixelX * transform.scaleX + transform.translateX;
    const screenY = pixelY * transform.scaleY + transform.translateY;
    
    return { x: screenX, y: screenY };
  }

  getPosition(): Vec2 {
    return { ...this.config.position };
  }

  getZoom(): number {
    return this.config.zoom;
  }

  setPosition(position: Vec2): void {
    this.config.position = { ...position };
  }

  setZoom(zoom: number): void {
    this.config.zoom = Math.max(0.1, zoom);
  }

  zoomToFit(worldBounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldHeight = worldBounds.maxY - worldBounds.minY;
    
    const scaleX = this.viewport.width / worldWidth;
    const scaleY = this.viewport.height / worldHeight;
    
    this.config.zoom = Math.min(scaleX, scaleY) * 0.9;
    this.config.position = {
      x: (worldBounds.minX + worldBounds.maxX) / 2,
      y: (worldBounds.minY + worldBounds.maxY) / 2,
    };
  }
}