import type { RuleContext } from './types';
import type { EntityTarget, Value } from '@slopcade/shared';
import type { RuntimeEntity } from '../types';

export function resolveEntityTarget(target: EntityTarget, context: RuleContext): RuntimeEntity[] {
  switch (target.type) {
    case 'self':
      return context.currentEntity ? [context.currentEntity] : [];
    case 'by_id': {
      if (target.entityId.startsWith('$') && context.inputEntityManager) {
        const systemEntity = context.inputEntityManager.getEntity(target.entityId);
        return systemEntity ? [systemEntity] : [];
      }
      const entity = context.entityManager.getEntity(target.entityId);
      return entity ? [entity] : [];
    }
    case 'by_tag':
      return context.entityManager.getEntitiesByTag(target.tag);
    case 'player':
      return context.entityManager.getEntitiesByTag('player');
    case 'touched':
      if (context.inputEvents.tap?.targetEntityId) {
        const e = context.entityManager.getEntity(context.inputEvents.tap.targetEntityId);
        return e ? [e] : [];
      }
      if (context.inputEvents.dragStart?.targetEntityId) {
         const e = context.entityManager.getEntity(context.inputEvents.dragStart.targetEntityId);
         return e ? [e] : [];
      }
      return [];
    case 'other':
      return context.otherEntity ? [context.otherEntity] : [];
    default:
      return [];
  }
}

export function resolveNumber(value: Value<number>, context: RuleContext): number {
  if (context.computedValues && context.evalContext) {
    return context.computedValues.resolveNumber(value, context.evalContext);
  }
  return typeof value === 'number' ? value : 0;
}

export function resolveValue(value: Value<number | string | boolean>, context: RuleContext): number | string | boolean {
  if (typeof value === 'object' && value !== null && 'type' in value) {
    return resolveNumber(value as Value<number>, context);
  }
  return value as number | string | boolean;
}

export function isEntityOnGround(entity: RuntimeEntity, context: RuleContext): boolean {
  if (!entity.physics || !context.physics) return false;

  const transform = context.physics.getTransform(entity.id);
  const { x, y } = transform.position;
  
  if (!entity.collider) return false;

  let dist = 0.6;
  if (entity.collider.shape === 'box' && entity.collider.height) {
      dist = (entity.collider.height / 2) * entity.transform.scaleY + 0.1;
  } else if (entity.collider.shape === 'circle' && entity.collider.radius) {
      dist = entity.collider.radius * entity.transform.scaleY + 0.1;
  } else if (entity.collider.shape === 'polygon') {
       dist = 0.5 * entity.transform.scaleY + 0.1; 
  }
  
  const hit = context.physics.raycast({ x, y }, { x: 0, y: 1 }, dist);
  
  if (hit && hit.entityId !== entity.id) {
      const other = context.entityManager.getEntity(hit.entityId);
      return !!other;
  }
  return false;
}
