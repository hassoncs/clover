import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { ViewportSystem, type ViewportRect, type ScreenSize } from '../../../ViewportSystem';

export interface ViewportSystemConfig {
  worldBounds?: { width: number; height: number };
  aspectRatio?: number | { width: number; height: number };
  fit?: 'contain' | 'cover';
  letterboxColor?: string;
}

export interface ViewportSystemState {
  viewportRect: ViewportRect;
  screenSize: ScreenSize;
}

/**
 * RuntimeSystem wrapper for ViewportSystem.
 * 
 * Manages viewport calculations for screen-to-world coordinate transformations.
 * This system is event-driven (updates on layout changes) and doesn't need
 * per-frame update logic.
 * 
 * Phase: PRE_UPDATE (runs first to establish viewport before other systems)
 * Priority: 100 (highest in PRE_UPDATE phase)
 */
export class ViewportRuntimeSystem implements RuntimeSystem<ViewportSystemConfig, ViewportSystemState> {
  readonly id = 'viewport';
  readonly phase = SystemPhase.PRE_UPDATE;
  readonly priority = 100;
  
  private config: ViewportSystemConfig;
  private system: ViewportSystem | null = null;
  
  constructor(config: ViewportSystemConfig) {
    this.config = config;
  }
  
  initialize(_ctx: SystemContext, _config: ViewportSystemConfig): void {
    this.system = new ViewportSystem(this.config.worldBounds, {
      aspectRatio: this.config.aspectRatio,
      fit: this.config.fit,
      letterboxColor: this.config.letterboxColor,
    });
  }
  
  update(_ctx: UpdateContext, _state: ViewportSystemState): void {
    // Viewport is event-driven via layout changes, no per-frame update needed
  }
  
  destroy(): void {
    this.system = null;
  }
  
  getState(): ViewportSystemState {
    if (!this.system) {
      return { 
        viewportRect: { x: 0, y: 0, width: 0, height: 0, scale: 1 }, 
        screenSize: { width: 0, height: 0 } 
      };
    }
    return {
      viewportRect: this.system.getViewportRect(),
      screenSize: this.system.getScreenSize(),
    };
  }
  
  /**
   * Expose underlying ViewportSystem for direct access by other systems.
   * This is necessary because ViewportSystem provides coordinate transformation
   * utilities that other systems need to call directly.
   */
  getSystem(): ViewportSystem | null {
    return this.system;
  }
}
