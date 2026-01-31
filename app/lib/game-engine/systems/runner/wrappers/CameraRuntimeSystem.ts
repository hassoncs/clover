import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { CameraSystem } from '../../../CameraSystem';
import type { CameraConfig, ViewportSize } from '../../../CameraSystem';
import type { Vec2 } from '@/lib/physics2d/types';
import type { EntityManager } from '../../../EntityManager';

export interface CameraSystemConfig {
  cameraConfig: CameraConfig;
  viewport: ViewportSize;
  pixelsPerMeter: number;
}

export interface CameraSystemState {
  position: Vec2;
  zoom: number;
  trauma: number;
}

export class CameraRuntimeSystem implements RuntimeSystem<CameraSystemConfig, CameraSystemState> {
  readonly id = 'camera';
  readonly phase = SystemPhase.PRE_UPDATE;
  readonly priority = 50;
  
  private camera: CameraSystem | null = null;
  private entityManager: EntityManager | null = null;
  
  initialize(ctx: SystemContext, config: CameraSystemConfig): void {
    this.camera = new CameraSystem(
      config.cameraConfig,
      config.viewport,
      config.pixelsPerMeter
    );
    this.entityManager = ctx.entityManager;
  }
  
  update(ctx: UpdateContext, _state: CameraSystemState): void {
    if (this.camera && this.entityManager) {
      this.camera.update(ctx.dt, (id) => this.entityManager!.getEntity(id));
    }
  }
  
  destroy(): void {
    this.camera = null;
    this.entityManager = null;
  }
  
  getState(): CameraSystemState {
    if (!this.camera) {
      return { position: { x: 0, y: 0 }, zoom: 1, trauma: 0 };
    }
    
    return {
      position: this.camera.getPosition(),
      zoom: this.camera.getZoom(),
      trauma: 0,
    };
  }
  
  getCamera(): CameraSystem | null {
    return this.camera;
  }
}
