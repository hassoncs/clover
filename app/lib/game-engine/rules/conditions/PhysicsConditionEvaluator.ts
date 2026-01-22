import type { ConditionEvaluator } from './ConditionEvaluator';
import type { EntityExistsCondition, OnGroundCondition, TouchingCondition, VelocityCondition } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { isEntityOnGround } from '../utils';

export class PhysicsConditionEvaluator implements ConditionEvaluator<EntityExistsCondition | OnGroundCondition | TouchingCondition | VelocityCondition> {
  evaluate(condition: EntityExistsCondition | OnGroundCondition | TouchingCondition | VelocityCondition, context: RuleContext): boolean {
    switch (condition.type) {
      case 'entity_exists':
        if (condition.entityId) {
          return !!context.entityManager.getEntity(condition.entityId);
        }
        if (condition.entityTag) {
          return context.entityManager.getEntitiesByTag(condition.entityTag).length > 0;
        }
        return true;

      case 'on_ground': {
        if (!context.currentEntity) return !condition.value;
        const isOnGround = isEntityOnGround(context.currentEntity, context);
        return condition.value ? isOnGround : !isOnGround;
      }

      case 'touching': {
        if (!context.currentEntity) return condition.negated ?? false;
        const touching = context.collisions.some(c => {
           const isA = c.entityA.id === context.currentEntity!.id;
           const isB = c.entityB.id === context.currentEntity!.id;
           if (!isA && !isB) return false;
           const other = isA ? c.entityB : c.entityA;
           return other.tags.includes(condition.tag);
        });
        return condition.negated ? !touching : touching;
      }

      case 'velocity': {
         if (!context.currentEntity?.bodyId) return false;
         const vel = context.physics.getLinearVelocity(context.currentEntity.bodyId);
         const v = condition.axis === 'x' ? vel.x : vel.y;
         switch (condition.comparison) {
             case 'gt': return v > condition.value;
             case 'lt': return v < condition.value;
             case 'gte': return v >= condition.value;
             case 'lte': return v <= condition.value;
             case 'eq': return Math.abs(v - condition.value) < 0.01;
         }
         return false;
      }

      default:
        return true;
    }
  }
}
