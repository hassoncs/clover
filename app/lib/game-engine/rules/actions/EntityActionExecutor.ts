import type { ActionExecutor } from './ActionExecutor';
import type { ModifyAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import type { RuntimeEntity } from '../../types';
import { resolveNumber } from '../utils';

export class EntityActionExecutor implements ActionExecutor<ModifyAction> {
  execute(action: ModifyAction, context: RuleContext): void {
    const entities: RuntimeEntity[] = [];

    switch (action.target.type) {
      case 'by_id': {
        const entity = context.entityManager.getEntity(action.target.entityId);
        if (entity) entities.push(entity);
        break;
      }
      case 'by_tag': {
        entities.push(...context.entityManager.getEntitiesByTag(action.target.tag));
        break;
      }
    }

    const value = resolveNumber(action.value, context);
    for (const entity of entities) {
      this.applyPropertyModification(entity, action.property, action.operation, value);
    }
  }

  private applyPropertyModification(
    entity: RuntimeEntity,
    property: string,
    operation: 'set' | 'add' | 'multiply',
    value: number
  ): void {
    const parts = property.split('.');
    let target: Record<string, unknown> = entity as unknown as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof target[part] === 'object' && target[part] !== null) {
        target = target[part] as Record<string, unknown>;
      } else {
        return;
      }
    }

    const finalProp = parts[parts.length - 1];
    const currentValue = target[finalProp];

    if (typeof currentValue !== 'number') return;

    switch (operation) {
      case 'set':
        target[finalProp] = value;
        break;
      case 'add':
        target[finalProp] = currentValue + value;
        break;
      case 'multiply':
        target[finalProp] = currentValue * value;
        break;
    }
  }
}
