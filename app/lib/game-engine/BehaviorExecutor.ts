import type { Behavior, BehaviorType } from '@slopcade/shared';
import type { RuntimeEntity, RuntimeBehavior } from './types';
import type { BehaviorContext } from './BehaviorContext';
import { registerMovementBehaviors } from './behaviors/MovementBehaviors';
import { registerLifecycleBehaviors } from './behaviors/LifecycleBehaviors';
import { registerVisualBehaviors } from './behaviors/VisualBehaviors';

export type BehaviorHandler = (
  behavior: Behavior,
  context: BehaviorContext,
  runtimeBehavior: RuntimeBehavior
) => void;

export interface BehaviorHandlerSet {
  execute: BehaviorHandler;
  onActivate?: BehaviorHandler;
  onDeactivate?: BehaviorHandler;
}

type BehaviorPhase = 'input' | 'timer' | 'movement' | 'visual' | 'post_physics';

const BEHAVIOR_PHASES: Record<BehaviorType, BehaviorPhase> = {
  draggable: 'input',
  timer: 'timer',
  move: 'movement',
  follow: 'movement',
  bounce: 'movement',
  oscillate: 'movement',
  maintain_speed: 'movement',
  rotate: 'visual',
  rotate_toward: 'visual',
  animate: 'visual',
  particle_emitter: 'visual',
  scale_oscillate: 'visual',
  sprite_effect: 'visual',
  spawn_on_event: 'post_physics',
  destroy_on_collision: 'post_physics',
  score_on_collision: 'post_physics',
  score_on_destroy: 'post_physics',
  gravity_zone: 'movement',
  magnetic: 'movement',
  health: 'post_physics',
  attach_to: 'movement',
  teleport: 'post_physics',
};

const PHASE_ORDER: BehaviorPhase[] = ['input', 'timer', 'movement', 'visual', 'post_physics'];

export class BehaviorExecutor {
  private handlers = new Map<BehaviorType, BehaviorHandlerSet>();

  registerHandler(type: BehaviorType, handler: BehaviorHandler | BehaviorHandlerSet): void {
    if (typeof handler === 'function') {
      this.handlers.set(type, { execute: handler });
    } else {
      this.handlers.set(type, handler);
    }
  }

  executeAll(entities: RuntimeEntity[], context: Omit<BehaviorContext, 'entity' | 'resolveNumber' | 'resolveVec2'>): void {
    for (const entity of entities) {
      if (!entity.active) continue;
      this.processLifecycleTransitions(entity, context);
    }

    for (const phase of PHASE_ORDER) {
      for (const entity of entities) {
        if (!entity.active) continue;
        this.executePhase(entity, phase, context);
      }
    }
  }

  private processLifecycleTransitions(
    entity: RuntimeEntity,
    baseContext: Omit<BehaviorContext, 'entity' | 'resolveNumber' | 'resolveVec2'>
  ): void {
    const transition = entity.pendingLifecycleTransition;
    if (!transition) return;

    entity.pendingLifecycleTransition = undefined;

    const entityEvalContext = baseContext.createEvalContextForEntity(entity);
    const context: BehaviorContext = {
      ...baseContext,
      entity,
      evalContext: entityEvalContext,
      resolveNumber: (value) => baseContext.computedValues.resolveNumber(value, entityEvalContext),
      resolveVec2: (value) => baseContext.computedValues.resolveVec2(value, entityEvalContext),
    };

    if (transition.oldGroupId >= 0) {
      const oldGroup = entity.conditionalBehaviors[transition.oldGroupId];
      if (oldGroup) {
        for (const behavior of oldGroup.behaviors) {
          const handlerSet = this.handlers.get(behavior.type);
          if (handlerSet?.onDeactivate) {
            const runtimeBehavior: RuntimeBehavior = {
              definition: behavior,
              enabled: behavior.enabled !== false,
              state: {},
            };
            handlerSet.onDeactivate(behavior, context, runtimeBehavior);
          }
        }
      }
    }

    if (transition.newGroupId >= 0) {
      const newGroup = entity.conditionalBehaviors[transition.newGroupId];
      if (newGroup) {
        for (const behavior of newGroup.behaviors) {
          const handlerSet = this.handlers.get(behavior.type);
          if (handlerSet?.onActivate) {
            const runtimeBehavior: RuntimeBehavior = {
              definition: behavior,
              enabled: behavior.enabled !== false,
              state: {},
            };
            handlerSet.onActivate(behavior, context, runtimeBehavior);
          }
        }
      }
    }
  }

  private executePhase(
    entity: RuntimeEntity,
    phase: BehaviorPhase,
    baseContext: Omit<BehaviorContext, 'entity' | 'resolveNumber' | 'resolveVec2'>
  ): void {
    const entityEvalContext = baseContext.createEvalContextForEntity(entity);
    const context: BehaviorContext = {
      ...baseContext,
      entity,
      evalContext: entityEvalContext,
      resolveNumber: (value) => baseContext.computedValues.resolveNumber(value, entityEvalContext),
      resolveVec2: (value) => baseContext.computedValues.resolveVec2(value, entityEvalContext),
    };

    for (const runtimeBehavior of entity.behaviors) {
      if (!runtimeBehavior.enabled) continue;

      const behaviorPhase = BEHAVIOR_PHASES[runtimeBehavior.definition.type];
      if (behaviorPhase !== phase) continue;

      const handlerSet = this.handlers.get(runtimeBehavior.definition.type);
      if (handlerSet) {
        handlerSet.execute(runtimeBehavior.definition, context, runtimeBehavior);
      }
    }

    if (entity.activeConditionalGroupId >= 0) {
      const activeGroup = entity.conditionalBehaviors[entity.activeConditionalGroupId];
      if (activeGroup) {
        for (const behavior of activeGroup.behaviors) {
          const behaviorPhase = BEHAVIOR_PHASES[behavior.type];
          if (behaviorPhase !== phase) continue;

          const handlerSet = this.handlers.get(behavior.type);
          if (handlerSet) {
            const runtimeBehavior: RuntimeBehavior = {
              definition: behavior,
              enabled: behavior.enabled !== false,
              state: {},
            };
            handlerSet.execute(behavior, context, runtimeBehavior);
          }
        }
      }
    }
  }

  executeSingle(
    entity: RuntimeEntity,
    behavior: RuntimeBehavior,
    baseContext: Omit<BehaviorContext, 'entity' | 'resolveNumber' | 'resolveVec2'>
  ): void {
    if (!behavior.enabled) return;

    const handlerSet = this.handlers.get(behavior.definition.type);
    if (handlerSet) {
      const entityEvalContext = baseContext.createEvalContextForEntity(entity);
      const context: BehaviorContext = {
        ...baseContext,
        entity,
        evalContext: entityEvalContext,
        resolveNumber: (value) => baseContext.computedValues.resolveNumber(value, entityEvalContext),
        resolveVec2: (value) => baseContext.computedValues.resolveVec2(value, entityEvalContext),
      };
      handlerSet.execute(behavior.definition, context, behavior);
    }
  }
}

export function createBehaviorExecutor(): BehaviorExecutor {
  const executor = new BehaviorExecutor();

  registerMovementBehaviors(executor);
  registerLifecycleBehaviors(executor);
  registerVisualBehaviors(executor);

  return executor;
}
