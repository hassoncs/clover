import { SystemPhase } from '@slopcade/shared';
import type { RuntimeSystem, SystemContext, UpdateContext } from '../types';
import type { EntityManager } from '../../../EntityManager';
import type { GodotBridge } from '@/lib/godot/types';
import {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeOutBounce,
  type EasingFunction,
} from '../../../animation/easing';

export type TargetPositionSystemConfig = Record<string, never>;

export interface TargetPositionSystemState {
  activeAnimationCount: number;
}

const EASING_FUNCTIONS: Record<string, EasingFunction> = {
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeOutBounce,
};

export class TargetPositionRuntimeSystem
  implements RuntimeSystem<TargetPositionSystemConfig, TargetPositionSystemState>
{
  readonly id = 'target-position';
  readonly phase = SystemPhase.VISUAL;
  readonly priority = 50;

  private entityManager: EntityManager | null = null;
  private bridge: GodotBridge | null = null;

  initialize(ctx: SystemContext, _config: TargetPositionSystemConfig): void {
    this.entityManager = ctx.entityManager;
    this.bridge = ctx.bridge;
  }

  update(ctx: UpdateContext, _state: TargetPositionSystemState): void {
    if (!this.entityManager || !this.bridge) return;

    const entities = this.entityManager.getAllEntities();

    for (const entity of entities) {
      if (!entity.movementTarget || !entity.active) continue;

      const target = entity.movementTarget;
      const elapsed = ctx.elapsed - target.startTime;
      const progress = Math.min(1, elapsed / target.duration);
      const easingFn = EASING_FUNCTIONS[target.easing] || easeOutQuad;
      const easedProgress = easingFn(progress);

      const x = target.startX + (target.x - target.startX) * easedProgress;
      const y = target.startY + (target.y - target.startY) * easedProgress;

      entity.transform.x = x;
      entity.transform.y = y;
      entity.localTransform.x = x;
      entity.localTransform.y = y;
      this.entityManager.updateWorldTransforms(entity.id);

      this.bridge.setPosition(entity.id, x, y);

      if (progress >= 1) {
        entity.movementTarget = undefined;
      }
    }
  }

  destroy(): void {
    this.entityManager = null;
    this.bridge = null;
  }

  getState(): TargetPositionSystemState {
    if (!this.entityManager) {
      return { activeAnimationCount: 0 };
    }

    let count = 0;
    for (const entity of this.entityManager.getAllEntities()) {
      if (entity.movementTarget) count++;
    }

    return { activeAnimationCount: count };
  }
}
