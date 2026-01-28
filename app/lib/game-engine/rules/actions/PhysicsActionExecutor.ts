import type { ActionExecutor } from './ActionExecutor';
import type { ApplyImpulseAction, ApplyForceAction, SetVelocityAction, MoveAction, MoveTowardAction } from '@slopcade/shared';
import type { RuleContext } from '../types';
import { resolveEntityTarget, resolveNumber } from '../utils';

type PhysicsAction = ApplyImpulseAction | ApplyForceAction | SetVelocityAction | MoveAction | MoveTowardAction;

export class PhysicsActionExecutor implements ActionExecutor<PhysicsAction> {
  execute(action: PhysicsAction, context: RuleContext): void {
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
      case 'move_toward':
        this.executeMoveTowardAction(action, context);
        break;
    }
  }

  private executeApplyImpulseAction(action: ApplyImpulseAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    console.log(`[apply_impulse] Found ${entities.length} entities for target`, action.target);
    for (const entity of entities) {
      if (!entity.bodyId) {
        console.log(`[apply_impulse] Entity ${entity.id} has no bodyId, skipping`);
        continue;
      }
      console.log(`[apply_impulse] Applying to entity ${entity.id} at (${entity.transform.x.toFixed(2)}, ${entity.transform.y.toFixed(2)})`);

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
              console.log(`[apply_impulse] toward_touch: touch=(${touchX.toFixed(2)}, ${touchY.toFixed(2)}), source=(${sourceX.toFixed(2)}, ${sourceY.toFixed(2)}), d=(${dx.toFixed(2)}, ${dy.toFixed(2)}), mag=${mag.toFixed(2)}, force=${force}, impulse=(${(dx/mag*force).toFixed(2)}, ${(dy/mag*force).toFixed(2)})`);
              if (mag > 0.001) {
                impulseX = (dx / mag) * force;
                impulseY = (dy / mag) * force;
              }
            } else {
              console.log('[apply_impulse] toward_touch: NO input.drag or inputEvents.tap');
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
              case 'toward_mouse_x': {
                  const mouse = context.input.mouse;
                  if (mouse) {
                      const pos = entity.transform;
                      const delta = mouse.worldX - pos.x;
                      vx = delta * speed;
                      vy = current.y;
                  } else {
                      vx = 0;
                      vy = current.y;
                  }
                  break;
              }
          }
          context.physics.setLinearVelocity(entity.bodyId, { x: vx, y: vy });
      }
  }

  private moveTowardDebugCounter = 0;

  private executeMoveTowardAction(action: MoveTowardAction, context: RuleContext): void {
    const entities = resolveEntityTarget(action.target, context);
    const towardEntities = resolveEntityTarget(action.towardEntity, context);

    this.moveTowardDebugCounter++;
    const shouldLog = this.moveTowardDebugCounter % 60 === 0;

    if (towardEntities.length === 0) {
      if (shouldLog) {
        console.log('[MoveToward] No toward entities found for:', action.towardEntity);
      }
      return;
    }

    const towardEntity = towardEntities[0];
    if (!towardEntity.active) {
      if (shouldLog) {
        console.log('[MoveToward] Toward entity not active:', towardEntity.id);
      }
      return;
    }

    const targetPos = towardEntity.transform;
    const speed = resolveNumber(action.speed, context);
    const maxSpeed = action.maxSpeed ? resolveNumber(action.maxSpeed, context) : null;
    const axis = action.axis ?? 'both';

    if (shouldLog) {
      console.log('[MoveToward] Executing:', {
        targetEntities: entities.length,
        towardEntity: towardEntity.id,
        towardPos: { x: targetPos.x.toFixed(2), y: targetPos.y.toFixed(2) },
        axis,
        speed,
      });
    }

    for (const entity of entities) {
      if (!entity.bodyId) continue;

      const current = context.physics.getLinearVelocity(entity.bodyId);
      const pos = entity.transform;

      let vx = current.x;
      let vy = current.y;

      if (axis === 'x' || axis === 'both') {
        vx = (targetPos.x - pos.x) * speed;
      }
      if (axis === 'y' || axis === 'both') {
        vy = (targetPos.y - pos.y) * speed;
      }

      if (maxSpeed !== null) {
        const magnitude = Math.sqrt(vx * vx + vy * vy);
        if (magnitude > maxSpeed) {
          const scale = maxSpeed / magnitude;
          vx *= scale;
          vy *= scale;
        }
      }

      if (shouldLog) {
        console.log('[MoveToward] Setting velocity:', {
          entity: entity.id,
          entityPos: { x: pos.x.toFixed(2), y: pos.y.toFixed(2) },
          velocity: { x: vx.toFixed(2), y: vy.toFixed(2) },
        });
      }

      context.physics.setLinearVelocity(entity.bodyId, { x: vx, y: vy });
    }
  }
}
