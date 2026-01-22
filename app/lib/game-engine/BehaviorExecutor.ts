import type { Behavior, BehaviorType } from '@slopcade/shared';
import type { RuntimeEntity, RuntimeBehavior } from './types';
import type { BehaviorContext } from './BehaviorContext';
import { registerMovementBehaviors } from './behaviors/MovementBehaviors';
import { registerLifecycleBehaviors } from './behaviors/LifecycleBehaviors';

export type BehaviorHandler = (
  behavior: Behavior,
  context: BehaviorContext,
  runtimeBehavior: RuntimeBehavior
) => void;

type BehaviorPhase = 'input' | 'timer' | 'movement' | 'visual' | 'post_physics';

const BEHAVIOR_PHASES: Record<BehaviorType, BehaviorPhase> = {
  draggable: 'input',
  timer: 'timer',
  move: 'movement',
  follow: 'movement',
  bounce: 'movement',
  oscillate: 'movement',
  rotate: 'visual',
  rotate_toward: 'visual',
  animate: 'visual',
  particle_emitter: 'visual',
  spawn_on_event: 'post_physics',
  destroy_on_collision: 'post_physics',
  score_on_collision: 'post_physics',
  score_on_destroy: 'post_physics',
  gravity_zone: 'movement',
  magnetic: 'movement',
  health: 'post_physics',
};

const PHASE_ORDER: BehaviorPhase[] = ['input', 'timer', 'movement', 'visual', 'post_physics'];

export class BehaviorExecutor {
  private handlers = new Map<BehaviorType, BehaviorHandler>();

  registerHandler(type: BehaviorType, handler: BehaviorHandler): void {
    this.handlers.set(type, handler);
  }

  executeAll(entities: RuntimeEntity[], context: Omit<BehaviorContext, 'entity' | 'resolveNumber' | 'resolveVec2'>): void {
    for (const phase of PHASE_ORDER) {
      for (const entity of entities) {
        if (!entity.active) continue;
        this.executePhase(entity, phase, context);
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

      const handler = this.handlers.get(runtimeBehavior.definition.type);
      if (handler) {
        handler(runtimeBehavior.definition, context, runtimeBehavior);
      }
    }
  }

  executeSingle(
    entity: RuntimeEntity,
    behavior: RuntimeBehavior,
    baseContext: Omit<BehaviorContext, 'entity' | 'resolveNumber' | 'resolveVec2'>
  ): void {
    if (!behavior.enabled) return;

    const handler = this.handlers.get(behavior.definition.type);
    if (handler) {
      const entityEvalContext = baseContext.createEvalContextForEntity(entity);
      const context: BehaviorContext = {
        ...baseContext,
        entity,
        evalContext: entityEvalContext,
        resolveNumber: (value) => baseContext.computedValues.resolveNumber(value, entityEvalContext),
        resolveVec2: (value) => baseContext.computedValues.resolveVec2(value, entityEvalContext),
      };
      handler(behavior.definition, context, behavior);
    }
  }
}

export function createBehaviorExecutor(): BehaviorExecutor {
  const executor = new BehaviorExecutor();

  registerMovementBehaviors(executor);
  registerLifecycleBehaviors(executor);

  return executor;
}
