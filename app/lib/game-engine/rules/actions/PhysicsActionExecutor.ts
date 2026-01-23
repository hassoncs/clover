import type { ActionExecutor } from './ActionExecutor';
import type { ApplyImpulseAction, ApplyForceAction, SetVelocityAction, MoveAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveEntityTarget, resolveNumber } from '../utils';

export class PhysicsActionExecutor implements ActionExecutor<ApplyImpulseAction | ApplyForceAction | SetVelocityAction | MoveAction> {
  execute(action: ApplyImpulseAction | ApplyForceAction | SetVelocityAction | MoveAction, context: RuleContext): void {
    switch (action.type) {
      case 'apply_impulse':
        this.executeApplyImpulseAction(action, context);
        break;
      case 'apply_force':
        this.executeApplyForceAction(action, context);
        break;
      case 'set_velocity':
        this.executeSetVelocityAction(action, context);
        break;
      case 'move':
        this.executeMoveAction(action, context);
        break;
    }
  }

  private executeApplyImpulseAction(action: ApplyImpulseAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    for (const entity of entities) {
      if (!entity.bodyId) continue;

      let impulseX = action.x ? resolveNumber(action.x, context) : 0;
      let impulseY = action.y ? resolveNumber(action.y, context) : 0;

      if (action.direction && action.force !== undefined) {
        const force = resolveNumber(action.force, context);
        switch (action.direction) {
          case 'up': impulseY = -force; break;
          case 'down': impulseY = force; break;
          case 'left': impulseX = -force; break;
          case 'right': impulseX = force; break;
          case 'drag_direction':
            if (context.inputEvents.dragEnd) {
              const { worldVelocityX, worldVelocityY } = context.inputEvents.dragEnd;
              const mag = Math.sqrt(worldVelocityX ** 2 + worldVelocityY ** 2);
              if (mag > 0.001) {
                impulseX = (worldVelocityX / mag) * force;
                impulseY = (worldVelocityY / mag) * force;
              }
            }
            break;
          case 'tilt_direction':
            if (context.input.tilt) {
              impulseX = context.input.tilt.x * force;
              impulseY = context.input.tilt.y * force;
            }
            break;
          case 'toward_touch':
            if (context.input.drag || context.inputEvents.tap) {
              const touchX = context.input.drag?.currentWorldX ?? context.inputEvents.tap?.worldX ?? 0;
              const touchY = context.input.drag?.currentWorldY ?? context.inputEvents.tap?.worldY ?? 0;
              
              let sourceX = entity.transform.x;
              let sourceY = entity.transform.y;
              if (action.sourceEntityId) {
                const sourceEntity = context.entityManager.getEntity(action.sourceEntityId);
                if (sourceEntity) {
                  sourceX = sourceEntity.transform.x;
                  sourceY = sourceEntity.transform.y;
                }
              }
              
              const dx = touchX - sourceX;
              const dy = touchY - sourceY;
              const mag = Math.sqrt(dx * dx + dy * dy);
              if (mag > 0.001) {
                impulseX = (dx / mag) * force;
                impulseY = (dy / mag) * force;
              }
            }
            break;
        }
      }
      context.physics.applyImpulseToCenter(entity.bodyId, { x: impulseX, y: impulseY });
    }
  }

  private executeApplyForceAction(action: ApplyForceAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    for (const entity of entities) {
      if (!entity.bodyId) continue;

      let forceX = action.x ? resolveNumber(action.x, context) : 0;
      let forceY = action.y ? resolveNumber(action.y, context) : 0;

      if (action.direction && action.force !== undefined) {
        const force = resolveNumber(action.force, context);
        switch (action.direction) {
          case 'drag_direction':
             if (context.input.drag) {
                 const dx = context.input.drag.currentWorldX - context.input.drag.startWorldX;
                 const dy = context.input.drag.currentWorldY - context.input.drag.startWorldY;
                 const mag = Math.sqrt(dx*dx + dy*dy);
                 if (mag > 0.001) {
                     forceX = (dx/mag) * force;
                     forceY = (dy/mag) * force;
                 }
             }
             break;
          case 'tilt_direction':
             if (context.input.tilt) {
                 forceX = context.input.tilt.x * force;
                 forceY = context.input.tilt.y * force;
             }
             break;
          case 'toward_touch':
             if (context.input.drag) {
                  const pos = context.physics.getTransform(entity.bodyId).position;
                  const dx = context.input.drag.currentWorldX - pos.x;
                  const dy = context.input.drag.currentWorldY - pos.y;
                  const mag = Math.sqrt(dx*dx + dy*dy);
                  if (mag > 0.001) {
                      forceX = (dx/mag) * force;
                      forceY = (dy/mag) * force;
                  }
             }
             break;
        }
      }
      context.physics.applyForceToCenter(entity.bodyId, { x: forceX, y: forceY });
    }
  }

  private executeSetVelocityAction(action: SetVelocityAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    for (const entity of entities) {
      if (!entity.bodyId) continue;
      const vx = action.x ? resolveNumber(action.x, context) : undefined;
      const vy = action.y ? resolveNumber(action.y, context) : undefined;
      
      const current = context.physics.getLinearVelocity(entity.bodyId);
      context.physics.setLinearVelocity(entity.bodyId, {
          x: vx ?? current.x,
          y: vy ?? current.y
      });
    }
  }

  private executeMoveAction(action: MoveAction, context: RuleContext): void {
      const entities = resolveEntityTarget(action.target, context);
      const speed = resolveNumber(action.speed, context);
      for (const entity of entities) {
          if (!entity.bodyId) continue;
          let vx = 0;
          let vy = 0;
          const current = context.physics.getLinearVelocity(entity.bodyId);
          
          switch (action.direction) {
              case 'left': vx = -speed; vy = current.y; break;
              case 'right': vx = speed; vy = current.y; break;
              case 'up': vy = -speed; vx = current.x; break;
              case 'down': vy = speed; vx = current.x; break;
              case 'tilt_direction':
                  if (context.input.tilt) {
                      vx = context.input.tilt.x * speed;
                      vy = context.input.tilt.y * speed;
                  } else {
                      vx = current.x;
                      vy = current.y;
                  }
                  break;
              case 'toward_touch':
                  if (context.input.drag) {
                      const pos = context.physics.getTransform(entity.bodyId).position;
                      vx = (context.input.drag.currentWorldX - pos.x) * speed;
                      vy = (context.input.drag.currentWorldY - pos.y) * speed;
                  } else {
                      vx = current.x;
                      vy = current.y;
                  }
                  break;
              case 'toward_touch_x':
                  if (context.input.drag) {
                      const pos = context.physics.getTransform(entity.bodyId).position;
                      vx = (context.input.drag.currentWorldX - pos.x) * speed;
                      vy = current.y;
                  } else {
                      vx = current.x;
                      vy = current.y;
                  }
                  break;
              case 'toward_touch_y':
                  if (context.input.drag) {
                      const pos = context.physics.getTransform(entity.bodyId).position;
                      vx = current.x;
                      vy = (context.input.drag.currentWorldY - pos.y) * speed;
                  } else {
                      vx = current.x;
                      vy = current.y;
                  }
                  break;
          }
          context.physics.setLinearVelocity(entity.bodyId, { x: vx, y: vy });
      }
  }
}
