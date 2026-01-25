import type {
  Behavior,
  MoveBehavior,
  RotateBehavior,
  RotateTowardBehavior,
  OscillateBehavior,
  DraggableBehavior,
  FollowBehavior,
  BounceBehavior
} from '@slopcade/shared';
import type { BehaviorContext } from '../BehaviorContext';
import type { BehaviorExecutor } from '../BehaviorExecutor';

export function registerMovementBehaviors(executor: BehaviorExecutor): void {
  executor.registerHandler('move', (behavior, ctx) => {
    const b = behavior as MoveBehavior;
    if (!ctx.entity.bodyId) return;

    let vx = 0;
    let vy = 0;
    const speed = b.speed ?? 100;
    const movementType = b.movementType ?? 'velocity';

    switch (b.direction) {
      case 'left':
        vx = -speed;
        break;
      case 'right':
        vx = speed;
        break;
      case 'up':
        vy = -speed;
        break;
      case 'down':
        vy = speed;
        break;
      case 'toward_target': {
        const target = ctx.entityManager.getEntitiesByTag('player')[0]; // Default target player
        if (target) {
          const dx = target.transform.x - ctx.entity.transform.x;
          const dy = target.transform.y - ctx.entity.transform.y;
          const angle = Math.atan2(dy, dx);
          vx = Math.cos(angle) * speed;
          vy = Math.sin(angle) * speed;
        }
        break;
      }
      case 'away_from_target': {
        const target = ctx.entityManager.getEntitiesByTag('player')[0];
        if (target) {
          const dx = target.transform.x - ctx.entity.transform.x;
          const dy = target.transform.y - ctx.entity.transform.y;
          const angle = Math.atan2(dy, dx);
          vx = -Math.cos(angle) * speed;
          vy = -Math.sin(angle) * speed;
        }
        break;
      }
    }

    if (movementType === 'velocity') {
      const currentVel = ctx.physics.getLinearVelocity(ctx.entity.bodyId);
      if (b.direction === 'left' || b.direction === 'right') {
        ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx / ctx.pixelsPerMeter, y: currentVel.y });
      } else if (b.direction === 'up' || b.direction === 'down') {
        ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: currentVel.x, y: vy / ctx.pixelsPerMeter });
      } else {
        ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx / ctx.pixelsPerMeter, y: vy / ctx.pixelsPerMeter });
      }
    } else {
      ctx.physics.applyForceToCenter(ctx.entity.bodyId, { x: vx / ctx.pixelsPerMeter, y: vy / ctx.pixelsPerMeter });
    }
  });

  executor.registerHandler('rotate', (behavior, ctx) => {
    const b = behavior as RotateBehavior;
    if (!ctx.entity.bodyId) return;

    const speed = b.speed ?? 90;
    const direction = b.direction ?? 'clockwise';
    const radPerSec = (speed * Math.PI) / 180;
    
    // For kinematic bodies (spinners), we set angular velocity directly
    if (b.affectsPhysics) {
        ctx.physics.setAngularVelocity(ctx.entity.bodyId, direction === 'clockwise' ? radPerSec : -radPerSec);
    } else {
        // Visual rotation handled by renderer usually, but if we want physics body to rotate...
        // If affectsPhysics is false, maybe we just update transform?
        // But syncTransformsFromPhysics overwrites it.
        // So we must use physics.
        ctx.physics.setAngularVelocity(ctx.entity.bodyId, direction === 'clockwise' ? radPerSec : -radPerSec);
    }
  });

  executor.registerHandler('rotate_toward', (behavior, ctx) => {
    const b = behavior as RotateTowardBehavior;
    if (!ctx.entity.bodyId) return;

    let targetX = 0;
    let targetY = 0;
    let hasTarget = false;

    if (b.target === 'touch') {
        if (ctx.input.drag) {
            targetX = ctx.input.drag.currentWorldX;
            targetY = ctx.input.drag.currentWorldY;
            hasTarget = true;
        } else if (ctx.input.mouse) {
            targetX = ctx.input.mouse.worldX;
            targetY = ctx.input.mouse.worldY;
            hasTarget = true;
        }
    } else {
        const target = ctx.entityManager.getEntitiesByTag('player')[0];
        if (target) {
            targetX = target.transform.x;
            targetY = target.transform.y;
            hasTarget = true;
        }
    }

    if (!hasTarget) return;

    const dx = targetX - ctx.entity.transform.x;
    const dy = targetY - ctx.entity.transform.y;
    let targetAngle = Math.atan2(dy, dx);
    if (b.offset) targetAngle += (b.offset * Math.PI) / 180;

    const currentAngle = ctx.entity.transform.angle;
    let diff = targetAngle - currentAngle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    
    ctx.physics.setAngularVelocity(ctx.entity.bodyId, diff * (b.speed ? b.speed/50 : 5));
  });

  executor.registerHandler('oscillate', (behavior, ctx) => {
    const b = behavior as OscillateBehavior;
    if (!ctx.entity.bodyId) return;

    // Oscillate needs original position?
    // We can use time-based velocity.
    // v = A * w * cos(w * t + phi)
    const amplitude = b.amplitude ?? 1;
    const frequency = b.frequency ?? 1;
    const phase = ((b.phase ?? 0) * Math.PI) / 180;
    const w = 2 * Math.PI * frequency;
    
    const v = amplitude * w * Math.cos(w * ctx.elapsed + phase);
    
    const currentVel = ctx.physics.getLinearVelocity(ctx.entity.bodyId);
    let vx = currentVel.x;
    let vy = currentVel.y;

    if (b.axis === 'x') vx = v;
    if (b.axis === 'y') vy = v;
    if (b.axis === 'both') { vx = v; vy = v; } // Probably separate phase needed for circles

    ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx, y: vy });
  });

  executor.registerHandler('draggable', (behavior, ctx) => {
    const b = behavior as DraggableBehavior;
    if (!ctx.entity.bodyId) return;

    if (ctx.input.drag && ctx.input.drag.targetEntityId === ctx.entity.id) {
        const stiffness = b.stiffness ?? 0.5;
        const damping = b.damping ?? 0.5;
        
        const targetX = ctx.input.drag.currentWorldX;
        const targetY = ctx.input.drag.currentWorldY;
        const currentX = ctx.entity.transform.x;
        const currentY = ctx.entity.transform.y;
        
        // P-controller for velocity
        const vx = (targetX - currentX) * stiffness * 60; // 60fps factor
        const vy = (targetY - currentY) * stiffness * 60;
        
        ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx, y: vy });
    }
  });

  executor.registerHandler('follow', (behavior, ctx) => {
      const b = behavior as FollowBehavior;
      if (!ctx.entity.bodyId) return;

      const target = ctx.entityManager.getEntitiesByTag('player')[0]; // Default
      if (!target) return;

      const dx = target.transform.x - ctx.entity.transform.x;
      const dy = target.transform.y - ctx.entity.transform.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      const minInfo = b.minDistance ?? 0;
      const maxInfo = b.maxDistance ?? 1000;

      if (dist > minInfo && dist < maxInfo) {
          const speed = b.speed ?? 5;
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;
          ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx, y: vy });
      } else {
          ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: 0, y: 0 });
      }
  });

  executor.registerHandler('bounce', (behavior, ctx) => {
      const b = behavior as BounceBehavior;
      if (!ctx.entity.bodyId) return;
      
      const { x, y } = ctx.entity.transform;
      const vel = ctx.physics.getLinearVelocity(ctx.entity.bodyId);
      
      if (x < (b.bounds.minX ?? 0) && vel.x < 0) ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: -vel.x, y: vel.y });
      if (x > (b.bounds.maxX ?? 100) && vel.x > 0) ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: -vel.x, y: vel.y });
      if (y < (b.bounds.minY ?? 0) && vel.y < 0) ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vel.x, y: -vel.y });
      if (y > (b.bounds.maxY ?? 100) && vel.y > 0) ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vel.x, y: -vel.y });
  });
}
