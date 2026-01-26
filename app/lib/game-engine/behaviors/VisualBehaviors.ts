import type { ScaleOscillateBehavior, SpriteEffectBehavior } from '@slopcade/shared';
import type { BehaviorContext } from '../BehaviorContext';
import type { BehaviorExecutor, BehaviorHandlerSet } from '../BehaviorExecutor';
import type { RuntimeBehavior } from '../types';

interface ScaleOscillateState {
  elapsed?: number;
}

function handleScaleOscillate(
  behavior: ScaleOscillateBehavior,
  context: BehaviorContext,
  runtimeBehavior: RuntimeBehavior
): void {
  const state = runtimeBehavior.state as ScaleOscillateState;
  state.elapsed = (state.elapsed ?? 0) + context.dt;

  const phase = behavior.phase ?? 0;
  const t = state.elapsed * behavior.speed + phase;
  const normalized = (Math.sin(t * Math.PI * 2) + 1) / 2;
  const scale = behavior.min + normalized * (behavior.max - behavior.min);

  context.entity.transform.scaleX = scale;
  context.entity.transform.scaleY = scale;
}

interface SpriteEffectState {
  applied?: boolean;
  elapsed?: number;
}

const spriteEffectHandler: BehaviorHandlerSet = {
  execute: (behavior, context, runtimeBehavior) => {
    const b = behavior as SpriteEffectBehavior;
    const state = runtimeBehavior.state as SpriteEffectState;

    if (b.params?.pulse) {
      state.elapsed = (state.elapsed ?? 0) + context.dt;
      const pulseIntensity = b.params.intensity ?? 1;
      const pulsedIntensity = pulseIntensity * (0.5 + 0.5 * Math.sin(state.elapsed * Math.PI * 4));
      context.applySpriteEffect(context.entity.id, b.effect, {
        ...b.params,
        intensity: pulsedIntensity,
      });
    }
  },
  onActivate: (behavior, context) => {
    const b = behavior as SpriteEffectBehavior;
    context.applySpriteEffect(context.entity.id, b.effect, b.params ?? {});
  },
  onDeactivate: (behavior, context) => {
    context.clearSpriteEffect(context.entity.id);
  },
};

export function registerVisualBehaviors(executor: BehaviorExecutor): void {
  executor.registerHandler('scale_oscillate', (behavior, ctx, runtimeBehavior) => {
    handleScaleOscillate(behavior as ScaleOscillateBehavior, ctx, runtimeBehavior);
  });

  executor.registerHandler('sprite_effect', spriteEffectHandler);
}
