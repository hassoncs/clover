import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { TweenSystem } from '../../../animation/TweenSystem';

export type TweenSystemConfig = Record<string, never>;

export interface TweenSystemState {
  activeTweenCount: number;
  tweenIds: string[];
}

/**
 * RuntimeSystem wrapper for TweenSystem.
 * 
 * Handles smooth animations for entity properties (position, rotation, scale, opacity).
 * Tweens are visual effects that interpolate properties over time, so they run in
 * the VISUAL phase after game logic and physics have completed.
 * 
 * Phase: VISUAL (runs after game logic and physics)
 * Priority: 100
 */
export class TweenRuntimeSystem implements RuntimeSystem<TweenSystemConfig, TweenSystemState> {
  readonly id = 'tween';
  readonly phase = SystemPhase.VISUAL;
  readonly priority = 100;
  
  private tweenSystem: TweenSystem | null = null;
  
  initialize(ctx: SystemContext, _config: TweenSystemConfig): void {
    this.tweenSystem = new TweenSystem({
      setEntityPosition: (entityId, x, y) => ctx.bridge.setPosition(entityId, x, y),
      setEntityRotation: (entityId, angle) => ctx.bridge.setRotation(entityId, angle),
      setEntityScale: (entityId, scaleX, scaleY) => ctx.bridge.setScale(entityId, scaleX, scaleY),
      setEntityOpacity: (entityId, opacity) => ctx.bridge.setOpacity(entityId, opacity),
    });
  }
  
  update(ctx: UpdateContext, _state: TweenSystemState): void {
    if (this.tweenSystem) {
      this.tweenSystem.update(ctx.dt);
    }
  }
  
  destroy(): void {
    this.tweenSystem = null;
  }
  
  getState(): TweenSystemState {
    if (!this.tweenSystem) {
      return { activeTweenCount: 0, tweenIds: [] };
    }
    return {
      activeTweenCount: this.tweenSystem.getTweenCount(),
      tweenIds: [], // Could iterate all tweens if needed
    };
  }
  
  /**
   * Expose underlying TweenSystem for direct access by other systems.
   * This allows other systems to create and manage tweens programmatically.
   */
  getTweenSystem(): TweenSystem | null {
    return this.tweenSystem;
  }
}
