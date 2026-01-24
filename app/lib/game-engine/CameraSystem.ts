import type { Vec2 } from '../physics2d/types';
import type { RuntimeEntity } from './types';
import type { 
  CameraConfig as GameCameraConfig,
  CameraType,
  CameraDeadZone,
  CameraLookAhead,
  CameraAutoScroll,
} from '@slopcade/shared';

export interface CameraConfig {
  type: CameraType;
  position: Vec2;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  rotation?: number;
  followTarget?: string;
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

interface CameraState {
  position: Vec2;
  zoom: number;
  trauma: number;
  targetVelocity: Vec2;
  lookAheadOffset: Vec2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class CameraSystem {
  private config: CameraConfig;
  private state: CameraState;
  private viewport: ViewportSize;
  private pixelsPerMeter: number;
  private shakeTimeRemaining = 0;
  private shakeIntensityPixels = 0;
  private shakeDurationTotal = 0;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private lastTargetPosition: Vec2 | null = null;
  
  private zoomEffectScale = 1.0;
  private zoomEffectTarget = 1.0;
  private zoomEffectStart = 1.0;
  private zoomEffectDuration = 0;
  private zoomEffectElapsed = 0;
  private zoomEffectRestoreDelay = 0;
  private zoomEffectFocusWorld: Vec2 | null = null;

  constructor(config: CameraConfig, viewport: ViewportSize, pixelsPerMeter: number = 50) {
    this.config = { ...config };
    this.viewport = { ...viewport };
    this.pixelsPerMeter = pixelsPerMeter;
    this.state = {
      position: { ...config.position },
      zoom: config.zoom,
      trauma: 0,
      targetVelocity: { x: 0, y: 0 },
      lookAheadOffset: { x: 0, y: 0 },
    };
  }

  static fromGameConfig(
    gameCamera: GameCameraConfig | undefined,
    worldBounds: { width: number; height: number } | undefined,
    viewport: ViewportSize,
    pixelsPerMeter: number
  ): CameraSystem {
    const worldWidth = worldBounds?.width ?? 20;
    const worldHeight = worldBounds?.height ?? 12;
    
    // For fixed cameras, position at origin (0, 0) to match Godot's default camera position
    // For follow cameras, start at world center
    const cameraType = gameCamera?.type ?? 'fixed';
    const initialPosition = cameraType === 'fixed' 
      ? { x: 0, y: 0 }
      : { x: worldWidth / 2, y: worldHeight / 2 };
    
    const config: CameraConfig = {
      type: cameraType,
      position: initialPosition,
      zoom: gameCamera?.zoom ?? 1,
      minZoom: gameCamera?.minZoom,
      maxZoom: gameCamera?.maxZoom,
      followTarget: gameCamera?.followTarget,
      followSmoothing: gameCamera?.followSmoothing ?? 0.1,
      followOffset: gameCamera?.followOffset,
      deadZone: gameCamera?.deadZone,
      lookAhead: gameCamera?.lookAhead,
      bounds: gameCamera?.bounds,
      autoScroll: gameCamera?.autoScroll,
    };
    
    return new CameraSystem(config, viewport, pixelsPerMeter);
  }

  updateViewport(viewport: ViewportSize): void {
    this.viewport = { ...viewport };
  }

  updatePixelsPerMeter(pixelsPerMeter: number): void {
    this.pixelsPerMeter = pixelsPerMeter;
  }

  updateConfig(config: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...config };
  }

  update(dt: number, entityGetter?: (id: string) => RuntimeEntity | undefined): void {
    switch (this.config.type) {
      case 'fixed':
        break;
      case 'follow':
        this.updateFollow(dt, entityGetter, true, true);
        break;
      case 'follow-x':
        this.updateFollow(dt, entityGetter, true, false);
        break;
      case 'follow-y':
        this.updateFollow(dt, entityGetter, false, true);
        break;
      case 'auto-scroll':
        this.updateAutoScroll(dt);
        break;
    }
    
    this.applyBounds();
    this.updateShake(dt);
    this.updateZoomEffect(dt);
  }

  private updateFollow(
    dt: number,
    entityGetter: ((id: string) => RuntimeEntity | undefined) | undefined,
    followX: boolean,
    followY: boolean
  ): void {
    if (!this.config.followTarget || !entityGetter) return;

    const target = entityGetter(this.config.followTarget);
    if (!target) return;

    const targetPos = { x: target.transform.x, y: target.transform.y };
    
    if (this.lastTargetPosition) {
      this.state.targetVelocity = {
        x: (targetPos.x - this.lastTargetPosition.x) / Math.max(dt, 0.001),
        y: (targetPos.y - this.lastTargetPosition.y) / Math.max(dt, 0.001),
      };
    }
    this.lastTargetPosition = { ...targetPos };

    let desiredPos = { ...targetPos };

    if (this.config.followOffset) {
      desiredPos.x += this.config.followOffset.x;
      desiredPos.y += this.config.followOffset.y;
    }

    if (this.config.lookAhead?.enabled) {
      const lookAheadTarget = this.computeLookAhead();
      const lookAheadSmoothing = this.config.lookAhead.smoothing ?? 0.05;
      this.state.lookAheadOffset = {
        x: lerp(this.state.lookAheadOffset.x, lookAheadTarget.x, lookAheadSmoothing),
        y: lerp(this.state.lookAheadOffset.y, lookAheadTarget.y, lookAheadSmoothing),
      };
      desiredPos.x += this.state.lookAheadOffset.x;
      desiredPos.y += this.state.lookAheadOffset.y;
    }

    if (this.config.deadZone) {
      desiredPos = this.applyDeadZone(desiredPos);
    }

    const smoothing = this.config.followSmoothing ?? 0.1;

    this.state.position = {
      x: followX ? lerp(this.state.position.x, desiredPos.x, smoothing) : this.state.position.x,
      y: followY ? lerp(this.state.position.y, desiredPos.y, smoothing) : this.state.position.y,
    };

    this.config.position = { ...this.state.position };
  }

  private computeLookAhead(): Vec2 {
    if (!this.config.lookAhead) return { x: 0, y: 0 };
    
    const distance = this.config.lookAhead.distance;
    const velocity = this.state.targetVelocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    if (speed < 0.1) return { x: 0, y: 0 };
    
    return {
      x: (velocity.x / speed) * distance,
      y: (velocity.y / speed) * distance,
    };
  }

  private applyDeadZone(targetPos: Vec2): Vec2 {
    const dz = this.config.deadZone!;
    const halfW = dz.width / 2;
    const halfH = dz.height / 2;
    
    const result = { ...this.state.position };
    
    if (targetPos.x < this.state.position.x - halfW) {
      result.x = targetPos.x + halfW;
    } else if (targetPos.x > this.state.position.x + halfW) {
      result.x = targetPos.x - halfW;
    }
    
    if (targetPos.y < this.state.position.y - halfH) {
      result.y = targetPos.y + halfH;
    } else if (targetPos.y > this.state.position.y + halfH) {
      result.y = targetPos.y - halfH;
    }
    
    return result;
  }

  private updateAutoScroll(dt: number): void {
    if (!this.config.autoScroll) return;
    
    const { direction, speed, acceleration } = this.config.autoScroll;
    
    let currentSpeed = speed;
    if (acceleration) {
      currentSpeed += acceleration * dt;
      this.config.autoScroll.speed = currentSpeed;
    }
    
    this.config.position = {
      x: this.config.position.x + direction.x * currentSpeed * dt,
      y: this.config.position.y + direction.y * currentSpeed * dt,
    };
    this.state.position = { ...this.config.position };
  }

  private applyBounds(): void {
    if (!this.config.bounds) return;

    const { bounds } = this.config;
    this.config.position = {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, this.config.position.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, this.config.position.y)),
    };
    this.state.position = { ...this.config.position };
  }

  private updateShake(dt: number): void {
    if (this.shakeTimeRemaining <= 0) {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      return;
    }

    this.shakeTimeRemaining = Math.max(0, this.shakeTimeRemaining - dt);
    
    const progress = this.shakeDurationTotal > 0 
      ? this.shakeTimeRemaining / this.shakeDurationTotal 
      : 0;
    const currentIntensity = this.shakeIntensityPixels * progress;

    this.shakeOffsetX = (Math.random() - 0.5) * 2 * currentIntensity;
    this.shakeOffsetY = (Math.random() - 0.5) * 2 * currentIntensity;
  }

  shake(intensityWorldUnits: number, duration: number): void {
    const maxPixels = 3;
    
    if (this.shakeTimeRemaining > 0) {
      return;
    }
    
    this.shakeIntensityPixels = maxPixels;
    this.shakeDurationTotal = duration;
    this.shakeTimeRemaining = duration;
    
    this.shakeOffsetX = (Math.random() - 0.5) * 2 * maxPixels;
    this.shakeOffsetY = (Math.random() - 0.5) * 2 * maxPixels;
    
    console.log('[CameraSystem.shake] Started with offset:', this.shakeOffsetX, this.shakeOffsetY);
  }

  addTrauma(amount: number): void {
    this.state.trauma = Math.min(1, this.state.trauma + amount);
    this.shake(this.state.trauma * 0.5, 0.3);
  }

  getShakeOffset(): { x: number; y: number } {
    return { x: this.shakeOffsetX, y: this.shakeOffsetY };
  }

  private updateZoomEffect(dt: number): void {
    if (this.zoomEffectDuration <= 0) {
      return;
    }

    this.zoomEffectElapsed += dt;
    const t = Math.min(1, this.zoomEffectElapsed / this.zoomEffectDuration);
    const eased = t * t * (3 - 2 * t);
    
    this.zoomEffectScale = this.zoomEffectStart + (this.zoomEffectTarget - this.zoomEffectStart) * eased;

    if (t >= 1) {
      this.zoomEffectScale = this.zoomEffectTarget;
      
      if (this.zoomEffectRestoreDelay > 0) {
        this.zoomEffectStart = this.zoomEffectScale;
        this.zoomEffectTarget = 1.0;
        this.zoomEffectDuration = 0.3;
        this.zoomEffectElapsed = -this.zoomEffectRestoreDelay;
        this.zoomEffectRestoreDelay = 0;
      } else {
        this.zoomEffectDuration = 0;
      }
    }
  }

  zoomEffect(scale: number, duration: number, restoreDelay?: number, focusWorld?: Vec2): void {
    console.log('[CameraSystem.zoomEffect] scale:', scale, 'duration:', duration, 'focus:', focusWorld);
    this.zoomEffectStart = this.zoomEffectScale;
    this.zoomEffectTarget = scale;
    this.zoomEffectDuration = duration;
    this.zoomEffectElapsed = 0;
    this.zoomEffectRestoreDelay = restoreDelay ?? 0;
    this.zoomEffectFocusWorld = focusWorld ?? null;
  }

  getZoomEffectScale(): number {
    return this.zoomEffectScale;
  }

  getZoomEffectFocus(): Vec2 | null {
    return this.zoomEffectFocusWorld;
  }

  getWorldToScreenTransform(): CameraTransform {
    const centerX = this.viewport.width / 2;
    const centerY = this.viewport.height / 2;
    
    const worldX = this.config.position.x;
    const worldY = this.config.position.y;
    
    const translateX = centerX - worldX * this.pixelsPerMeter * this.config.zoom;
    const translateY = centerY - worldY * this.pixelsPerMeter * this.config.zoom;
    
    return {
      translateX,
      translateY,
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

  getType(): CameraType {
    return this.config.type;
  }

  setPosition(position: Vec2): void {
    this.config.position = { ...position };
    this.state.position = { ...position };
  }

  setZoom(zoom: number): void {
    const minZoom = this.config.minZoom ?? 0.1;
    const maxZoom = this.config.maxZoom ?? 10;
    this.config.zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    this.state.zoom = this.config.zoom;
  }

  zoomToFit(worldBounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldHeight = worldBounds.maxY - worldBounds.minY;
    
    const scaleX = this.viewport.width / (worldWidth * this.pixelsPerMeter);
    const scaleY = this.viewport.height / (worldHeight * this.pixelsPerMeter);
    
    this.setZoom(Math.min(scaleX, scaleY) * 0.9);
    this.setPosition({
      x: (worldBounds.minX + worldBounds.maxX) / 2,
      y: (worldBounds.minY + worldBounds.maxY) / 2,
    });
  }

  getViewportWorldBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const halfWidth = (this.viewport.width / this.pixelsPerMeter / this.config.zoom) / 2;
    const halfHeight = (this.viewport.height / this.pixelsPerMeter / this.config.zoom) / 2;
    
    return {
      minX: this.config.position.x - halfWidth,
      maxX: this.config.position.x + halfWidth,
      minY: this.config.position.y - halfHeight,
      maxY: this.config.position.y + halfHeight,
    };
  }
}
