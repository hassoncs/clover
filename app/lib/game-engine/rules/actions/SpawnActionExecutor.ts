import type { ActionExecutor } from './ActionExecutor';
import type { LaunchConfig, SpawnAction } from '@slopcade/shared';
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

      const prefabId = Array.isArray(action.prefab)
        ? action.prefab[Math.floor(Math.random() * action.prefab.length)]
        : action.prefab;

        const prefab = context.entityManager.getPrefab(prefabId);
        if (prefab) {
          let initialVelocity: { x: number; y: number } | undefined;
          if (action.launch) {
            initialVelocity = this.calculateLaunchVelocity(action.launch, x, y, context);
          }

          if (context.worldOps) {
            context.worldOps.spawn(prefabId, { x, y }, { velocity: initialVelocity });
          } else {
            context.entityManager.spawnEntity({
              prefabId,
              position: { x, y },
              velocity: initialVelocity,
            });
          }
        }
    }
  }

  private calculateLaunchVelocity(
    launch: LaunchConfig,
    spawnX: number,
    spawnY: number,
    context: RuleContext
  ): { x: number; y: number } {
    const force = launch.force;
    let directionX = 0;
    let directionY = 0;

    switch (launch.direction) {
      case 'up':
        directionX = 0;
        directionY = 1;
        break;
      case 'down':
        directionX = 0;
        directionY = -1;
        break;
      case 'left':
        directionX = -1;
        directionY = 0;
        break;
      case 'right':
        directionX = 1;
        directionY = 0;
        break;
      case 'toward_touch': {
        const touchX = context.input.drag?.currentWorldX ?? context.inputEvents.tap?.worldX ?? context.input.tap?.worldX ?? spawnX;
        const touchY = context.input.drag?.currentWorldY ?? context.inputEvents.tap?.worldY ?? context.input.tap?.worldY ?? spawnY;
        
        // Get source entity position (or use spawn position if not specified)
        let sourceX = spawnX;
        let sourceY = spawnY;
        
        if (launch.sourceEntityId) {
          const sourceEntity = context.entityManager.getEntity(launch.sourceEntityId);
          if (sourceEntity) {
            sourceX = sourceEntity.transform.x;
            sourceY = sourceEntity.transform.y;
          }
        }
        
        // Calculate direction from source to touch
        const dx = touchX - sourceX;
        const dy = touchY - sourceY;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        if (magnitude > 0.001) {
          directionX = dx / magnitude;
          directionY = dy / magnitude;
        } else {
          // Default to upward if touch is at same position as source
          directionY = 1;
        }
        break;
      }
      default:
        // Handle { x: number, y: number } direction
        if (typeof launch.direction === 'object') {
          const dx = launch.direction.x;
          const dy = launch.direction.y;
          const magnitude = Math.sqrt(dx * dx + dy * dy);
          if (magnitude > 0.001) {
            directionX = dx / magnitude;
            directionY = dy / magnitude;
          }
        }
        break;
    }

    return {
      x: directionX * force,
      y: directionY * force,
    };
  }
}
