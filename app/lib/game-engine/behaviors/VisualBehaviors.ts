import type { ScaleOscillateBehavior, SpriteEffectBehavior } from '@slopcade/shared';
import type { BehaviorContext } from '../BehaviorContext';
import type { BehaviorExecutor, BehaviorHandlerSet } from '../BehaviorExecutor';
import type { RuntimeBehavior } from '../types';
import type { ParamValue } from '@slopcade/shared/effects';
import { compileSingleEffect } from '../effects-helpers';

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
  passId?: string;
}

const spriteEffectHandler: BehaviorHandlerSet = {
  execute: (behavior, context, runtimeBehavior) => {
    const b = behavior as SpriteEffectBehavior;
    const state = runtimeBehavior.state as SpriteEffectState;

    if (b.params?.pulse) {
      state.elapsed = (state.elapsed ?? 0) + context.dt;
      const pulseIntensity = (b.params.intensity as number) ?? 1;
      const pulsedIntensity = pulseIntensity * (0.5 + 0.5 * Math.sin(state.elapsed * Math.PI * 4));
      
      if (state.passId) {
        context.updateSpriteEffectParamsV2(context.entity.id, state.passId, {
          intensity: pulsedIntensity,
        }).catch(err => {
          console.error('[SpriteEffect] Failed to update params:', err);
        });
      }
    }
  },
  onActivate: (behavior, context, runtimeBehavior) => {
    const b = behavior as SpriteEffectBehavior;
    const state = runtimeBehavior.state as SpriteEffectState;
    
    try {
      const plan = compileSingleEffect(b.effect, b.params as Record<string, ParamValue> ?? {});
      state.passId = plan.passes[0]?.id;
      
      context.applySpriteEffectV2(context.entity.id, plan).catch(err => {
        console.error('[SpriteEffect] Failed to apply effect:', err);
      });
    } catch (err) {
      console.error('[SpriteEffect] Failed to compile effect:', err);
    }
  },
  onDeactivate: (behavior, context) => {
    context.clearSpriteEffectV2(context.entity.id).catch(err => {
      console.error('[SpriteEffect] Failed to clear effect:', err);
    });
  },
};

export function registerVisualBehaviors(executor: BehaviorExecutor): void {
  executor.registerHandler('scale_oscillate', (behavior, ctx, runtimeBehavior) => {
    handleScaleOscillate(behavior as ScaleOscillateBehavior, ctx, runtimeBehavior);
  });

  executor.registerHandler('sprite_effect', spriteEffectHandler);
}
