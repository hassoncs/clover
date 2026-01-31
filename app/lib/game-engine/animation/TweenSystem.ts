import type { EasingFunction } from './easing';
import { easeInOutQuad, easeInQuad, easeOutBounce, easeOutQuad, linear } from './easing';

const MAX_DELTA_TIME = 0.05;

export type TweenProperty = 'position' | 'rotation' | 'scale' | 'opacity';

export interface TweenConfig {
  entityId: string;
  property: TweenProperty;
  from: number | { x: number; y: number };
  to: number | { x: number; y: number };
  duration: number;
  ease?: EasingFunction;
  onComplete?: () => void;
}

interface Tween {
  id: string;
  entityId: string;
  property: TweenProperty;
  from: number | { x: number; y: number };
  to: number | { x: number; y: number };
  duration: number;
  elapsed: number;
  ease: EasingFunction;
  onComplete?: () => void;
}

interface RenderAdapter {
  setEntityPosition(entityId: string, x: number, y: number): void;
  setEntityRotation(entityId: string, angle: number): void;
  setEntityScale(entityId: string, scaleX: number, scaleY: number): void;
  setEntityOpacity(entityId: string, opacity: number): void;
}

export class TweenSystem {
  private tweens: Map<string, Tween> = new Map();
  private adapter: RenderAdapter | null = null;

  constructor(adapter?: RenderAdapter) {
    this.adapter = adapter ?? null;
  }

  setAdapter(adapter: RenderAdapter): void {
    this.adapter = adapter;
  }

  createTween(config: TweenConfig): string {
    const id = `tween_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ease = config.ease ?? linear;

    const tween: Tween = {
      id,
      entityId: config.entityId,
      property: config.property,
      from: config.from,
      to: config.to,
      duration: config.duration,
      elapsed: 0,
      ease,
      onComplete: config.onComplete,
    };

    this.tweens.set(id, tween);
    return id;
  }

  update(dt: number): void {
    const clampedDt = Math.min(dt, MAX_DELTA_TIME);
    const completedIds: string[] = [];

    for (const [id, tween] of this.tweens) {
      tween.elapsed += clampedDt;

      const progress = Math.min(tween.elapsed / tween.duration, 1);
      const easedProgress = tween.ease(progress);

      this.applyTweenValue(tween, easedProgress);

      if (progress >= 1) {
        completedIds.push(id);
      }
    }

    for (const id of completedIds) {
      const tween = this.tweens.get(id);
      if (tween?.onComplete) {
        tween.onComplete();
      }
      this.tweens.delete(id);
    }
  }

  cancelTween(tweenId: string): void {
    this.tweens.delete(tweenId);
  }

  cancelAllForEntity(entityId: string): void {
    const idsToDelete: string[] = [];

    for (const [id, tween] of this.tweens) {
      if (tween.entityId === entityId) {
        idsToDelete.push(id);
      }
    }

    for (const id of idsToDelete) {
      this.tweens.delete(id);
    }
  }

  getTweenCount(): number {
    return this.tweens.size;
  }

  getTweensForEntity(entityId: string): string[] {
    const ids: string[] = [];

    for (const [id, tween] of this.tweens) {
      if (tween.entityId === entityId) {
        ids.push(id);
      }
    }

    return ids;
  }

  private applyTweenValue(tween: Tween, progress: number): void {
    if (!this.adapter) return;

    switch (tween.property) {
      case 'position': {
        const from = tween.from as { x: number; y: number };
        const to = tween.to as { x: number; y: number };
        const x = from.x + (to.x - from.x) * progress;
        const y = from.y + (to.y - from.y) * progress;
        this.adapter.setEntityPosition(tween.entityId, x, y);
        break;
      }
      case 'rotation': {
        const from = tween.from as number;
        const to = tween.to as number;
        const angle = from + (to - from) * progress;
        this.adapter.setEntityRotation(tween.entityId, angle);
        break;
      }
      case 'scale': {
        const from = tween.from as { x: number; y: number };
        const to = tween.to as { x: number; y: number };
        const scaleX = from.x + (to.x - from.x) * progress;
        const scaleY = from.y + (to.y - from.y) * progress;
        this.adapter.setEntityScale(tween.entityId, scaleX, scaleY);
        break;
      }
      case 'opacity': {
        const from = tween.from as number;
        const to = tween.to as number;
        const opacity = from + (to - from) * progress;
        this.adapter.setEntityOpacity(tween.entityId, opacity);
        break;
      }
    }
  }
}

export const defaultEasingFunctions = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeOutBounce,
};
