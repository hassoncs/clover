import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import { TweenSystem } from '../../../animation/TweenSystem';
import { setGlobalTweenSystem } from '../../../behaviors/TweenBehaviors';

export type TweenSystemConfig = Record<string, never>;

export interface TweenSystemState {
  activeTweenCount: number;
  tweenIds: string[];
}

export class TweenRuntimeSystem implements RuntimeSystem<TweenSystemConfig, TweenSystemState> {
  readonly id = 'tween';
  readonly phase = SystemPhase.VISUAL;
  readonly priority = 100;
  
  private tweenSystem: TweenSystem | null = null;
  
  constructor() {}
  
  initialize(ctx: SystemContext, _config: TweenSystemConfig): void {
    this.tweenSystem = new TweenSystem({
      setEntityPosition: (entityId, x, y) => ctx.bridge.setPosition(entityId, x, y),
      setEntityRotation: (entityId, angle) => ctx.bridge.setRotation(entityId, angle),
      setEntityScale: (entityId, scaleX, scaleY) => ctx.bridge.setScale(entityId, scaleX, scaleY),
      setEntityOpacity: (entityId, opacity) => ctx.bridge.setOpacity(entityId, opacity),
    });
    setGlobalTweenSystem(this.tweenSystem);
  }
  
  update(ctx: UpdateContext, _state: TweenSystemState): void {
    if (this.tweenSystem) {
      this.tweenSystem.update(ctx.dt);
    }
  }
  
  destroy(): void {
    setGlobalTweenSystem(null);
    this.tweenSystem = null;
  }
  
  getState(): TweenSystemState {
    if (!this.tweenSystem) {
      return { activeTweenCount: 0, tweenIds: [] };
    }
    return {
      activeTweenCount: this.tweenSystem.getTweenCount(),
      tweenIds: [],
    };
  }
  
  getTweenSystem(): TweenSystem | null {
    return this.tweenSystem;
  }
}
