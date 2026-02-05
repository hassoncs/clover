import type { TweenBehavior } from '@slopcade/shared';
import type { BehaviorContext } from '../BehaviorContext';
import type { BehaviorExecutor, BehaviorHandlerSet } from '../BehaviorExecutor';
import type { RuntimeBehavior } from '../types';
import type { TweenSystem } from '../animation/TweenSystem';

let globalTweenSystem: TweenSystem | null = null;

export function setGlobalTweenSystem(system: TweenSystem | null): void {
  globalTweenSystem = system;
}

export function getGlobalTweenSystem(): TweenSystem | null {
  return globalTweenSystem;
}

interface TweenBehaviorState {
  tweenId?: string;
  originalFrom?: number | { x: number; y: number };
  isYoyo?: boolean;
  yoyoDirection?: 'forward' | 'backward';
  loopCount?: number;
}

function getEasingFunction(easeName: string | undefined): ((t: number) => number) | undefined {
  if (!easeName) return undefined;

  const easingFunctions: Record<string, (t: number) => number> = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    easeOutBounce: (t: number) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t - 1.5 / d1) * (t - 1.5 / d1) + 0.75;
      if (t < 2.5 / d1) return n1 * (t - 2.25 / d1) * (t - 2.25 / d1) + 0.9375;
      return n1 * (t - 2.625 / d1) * (t - 2.625 / d1) + 0.984375;
    },
  };

  return easingFunctions[easeName];
}

const tweenBehaviorHandler: BehaviorHandlerSet = {
  execute: () => {
    // Tween updates are handled by TweenSystem.update(), not here
  },
  onActivate: (behavior, context, runtimeBehavior) => {
    if (!globalTweenSystem) return;

    const tweenBehavior = behavior as TweenBehavior;
    const state = runtimeBehavior.state as TweenBehaviorState;

    const fromValue = tweenBehavior.from ?? getCurrentPropertyValue(context, tweenBehavior.property);
    state.originalFrom = fromValue;
    state.isYoyo = tweenBehavior.yoyo ?? false;
    state.yoyoDirection = 'forward';
    state.loopCount = 0;

    const tweenId = globalTweenSystem.createTween({
      entityId: context.entity.id,
      property: tweenBehavior.property,
      from: fromValue,
      to: tweenBehavior.to,
      duration: tweenBehavior.duration,
      ease: getEasingFunction(tweenBehavior.ease),
      onComplete: () => {
        handleTweenComplete(tweenBehavior, context, runtimeBehavior, state);
      },
    });

    state.tweenId = tweenId;
  },
  onDeactivate: (behavior, context, runtimeBehavior) => {
    if (!globalTweenSystem) return;

    const state = (runtimeBehavior.state as TweenBehaviorState);
    if (state.tweenId) {
      globalTweenSystem.cancelTween(state.tweenId);
      state.tweenId = undefined;
    }
  },
};

function getCurrentPropertyValue(
  context: BehaviorContext,
  property: 'position' | 'rotation' | 'scale' | 'opacity'
): number | { x: number; y: number } {
  const entity = context.entity;

  switch (property) {
    case 'position':
      return { x: entity.transform.x, y: entity.transform.y };
    case 'rotation':
      return entity.transform.angle ?? 0;
    case 'scale':
      return { x: entity.transform.scaleX ?? 1, y: entity.transform.scaleY ?? 1 };
    case 'opacity':
      return 1;
    default:
      return 0;
  }
}

function getDefaultFromValue(property: 'position' | 'rotation' | 'scale' | 'opacity'): number | { x: number; y: number } {
  switch (property) {
    case 'position':
      return { x: 0, y: 0 };
    case 'rotation':
      return 0;
    case 'scale':
      return { x: 1, y: 1 };
    case 'opacity':
      return 1;
    default:
      return 0;
  }
}

function handleTweenComplete(
  tweenBehavior: TweenBehavior,
  context: BehaviorContext,
  runtimeBehavior: RuntimeBehavior,
  state: TweenBehaviorState
): void {
  if (!globalTweenSystem) return;

  if (tweenBehavior.loop) {
    state.loopCount = (state.loopCount ?? 0) + 1;

    if (state.isYoyo && state.yoyoDirection === 'forward') {
      state.yoyoDirection = 'backward';
      state.tweenId = globalTweenSystem.createTween({
        entityId: context.entity.id,
        property: tweenBehavior.property,
        from: tweenBehavior.to,
        to: state.originalFrom ?? getDefaultFromValue(tweenBehavior.property),
        duration: tweenBehavior.duration,
        ease: getEasingFunction(tweenBehavior.ease),
        onComplete: () => {
          state.yoyoDirection = 'forward';
          handleTweenComplete(tweenBehavior, context, runtimeBehavior, state);
        },
      });
    } else {
      state.tweenId = globalTweenSystem.createTween({
        entityId: context.entity.id,
        property: tweenBehavior.property,
        from: state.originalFrom ?? getDefaultFromValue(tweenBehavior.property),
        to: tweenBehavior.to,
        duration: tweenBehavior.duration,
        ease: getEasingFunction(tweenBehavior.ease),
        onComplete: () => {
          handleTweenComplete(tweenBehavior, context, runtimeBehavior, state);
        },
      });
    }
  } else if (tweenBehavior.onCompleteEvent) {
    context.triggerEvent(tweenBehavior.onCompleteEvent);
  }
}

export function registerTweenBehaviors(executor: BehaviorExecutor): void {
  executor.registerHandler('tween', tweenBehaviorHandler);
}

export function cancelTweensForEntity(entityId: string): void {
  if (globalTweenSystem) {
    globalTweenSystem.cancelAllForEntity(entityId);
  }
}
