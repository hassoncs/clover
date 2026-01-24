import type { ActionExecutor } from './ActionExecutor';
import type { SpawnAction } from '@slopcade/shared';
import type { RuleContext } from '../types';

export class SpawnActionExecutor implements ActionExecutor<SpawnAction> {
  execute(action: SpawnAction, context: RuleContext): void {
    const count = action.count ?? 1;

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;

      switch (action.position.type) {
        case 'fixed':
          x = action.position.x;
          y = action.position.y;
          break;
        case 'random':
          x =
            action.position.bounds.minX +
            Math.random() * (action.position.bounds.maxX - action.position.bounds.minX);
          y =
            action.position.bounds.minY +
            Math.random() * (action.position.bounds.maxY - action.position.bounds.minY);
          break;
        case 'at_entity': {
          const entity = context.entityManager.getEntity(action.position.entityId);
          if (entity) {
            x = entity.transform.x;
            y = entity.transform.y;
          }
          break;
        }
        case 'at_collision':
          if (context.collisions.length > 0) {
            x = context.collisions[0].entityA.transform.x;
            y = context.collisions[0].entityA.transform.y;
          }
          break;
      }

      if (action.spread) {
        x += (Math.random() - 0.5) * action.spread * 2;
        y += (Math.random() - 0.5) * action.spread * 2;
      }

      const templateId = Array.isArray(action.template)
        ? action.template[Math.floor(Math.random() * action.template.length)]
        : action.template;

      const template = context.entityManager.getTemplate(templateId);
      if (template) {
        let entityId: string;

        if (context.bridge) {
          entityId = context.bridge.spawnEntity(templateId, x, y);
        } else {
          entityId = `spawned_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        }

        context.entityManager.createEntity({
          id: entityId,
          name: template.id,
          template: templateId,
          transform: { x, y, angle: 0, scaleX: 1, scaleY: 1 },
        });
      }
    }
  }
}
