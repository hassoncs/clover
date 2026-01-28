import type {
  Behavior,
  MoveBehavior,
  RotateBehavior,
  RotateTowardBehavior,
  OscillateBehavior,
  DraggableBehavior,
  FollowBehavior,
  BounceBehavior,
  MaintainSpeedBehavior
} from '@slopcade/shared';
import type { BehaviorContext } from '../BehaviorContext';
import type { BehaviorExecutor } from '../BehaviorExecutor';

export function registerMovementBehaviors(executor: BehaviorExecutor): void {
  executor.registerHandler('move', (behavior, ctx) => {
    const b = behavior as MoveBehavior;
    if (!ctx.entity.bodyId) return;

    let vx = 0;
    let vy = 0;
    const speed = ctx.resolveNumber(b.speed ?? 100);
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

    const speed = ctx.resolveNumber(b.speed ?? 90);
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

    let targetX = 0;
    let targetY = 0;
    let hasTarget = false;

    if (b.target === 'touch') {
        if (ctx.input.touch) {
            targetX = ctx.input.touch.worldX;
            targetY = ctx.input.touch.worldY;
            hasTarget = true;
        } else if (ctx.input.drag) {
            targetX = ctx.input.drag.currentWorldX;
            targetY = ctx.input.drag.currentWorldY;
            hasTarget = true;
        } else if (ctx.input.mouse) {
            targetX = ctx.input.mouse.worldX;
            targetY = ctx.input.mouse.worldY;
            hasTarget = true;
        }
    } else {
        // Treat target as a tag
        const target = ctx.entityManager.getEntitiesByTag(b.target)[0];
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

    ctx.setEntityRotation(ctx.entity.id, targetAngle);
  });

  executor.registerHandler('oscillate', (behavior, ctx) => {
    const b = behavior as OscillateBehavior;
    if (!ctx.entity.bodyId) return;

    // Position-based oscillation for reliable kinematic body movement
    // Store initial position as center point on first frame
    const initialPosKey = `__oscillate_initial_${b.axis}`;
    let centerX = ctx.entity.transform.x;
    let centerY = ctx.entity.transform.y;

    // Check if we have stored initial position
    const storedInit = (ctx.entity as any)[initialPosKey];
    if (storedInit !== undefined) {
      centerX = storedInit.x;
      centerY = storedInit.y;
    } else {
      // Store initial position for future frames
      (ctx.entity as any)[initialPosKey] = { x: centerX, y: centerY };
    }

    const amplitude = ctx.resolveNumber(b.amplitude ?? 1);
    const frequency = ctx.resolveNumber(b.frequency ?? 1);
    const phase = ctx.resolveNumber(b.phase ?? 0) * Math.PI / 180;
    const w = 2 * Math.PI * frequency;

    // Calculate displacement: displacement = amplitude * sin(w * t + phase)
    const displacement = amplitude * Math.sin(w * ctx.elapsed + phase);

    // Calculate new position based on axis
    let newX = centerX;
    let newY = centerY;

    if (b.axis === 'x' || b.axis === 'both') {
      newX = centerX + displacement;
    }
    if (b.axis === 'y' || b.axis === 'both') {
      newY = centerY + displacement;
    }

    // Set position directly for kinematic bodies
    if (b.axis === 'x' || b.axis === 'both') {
      ctx.entity.transform.x = newX;
    }
    if (b.axis === 'y' || b.axis === 'both') {
      ctx.entity.transform.y = newY;
    }

    // Update physics body position for kinematic bodies
    if (ctx.entity.bodyId) {
      ctx.physics.setTransform(ctx.entity.bodyId, {
        position: { x: newX, y: newY },
        angle: ctx.entity.transform.angle,
      });
    }
  });

  executor.registerHandler('draggable', (behavior, ctx) => {
    const b = behavior as DraggableBehavior;
    if (!ctx.entity.bodyId) return;

    if (ctx.input.drag && ctx.input.drag.targetEntityId === ctx.entity.id) {
        const stiffness = ctx.resolveNumber(b.stiffness ?? 0.5);
        const damping = ctx.resolveNumber(b.damping ?? 0.5);
        
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
      
      const minInfo = ctx.resolveNumber(b.minDistance ?? 0);
      const maxInfo = ctx.resolveNumber(b.maxDistance ?? 1000);

      if (dist > minInfo && dist < maxInfo) {
          const speed = ctx.resolveNumber(b.speed ?? 5);
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
      
      const minX = ctx.resolveNumber(b.bounds.minX ?? 0);
      const maxX = ctx.resolveNumber(b.bounds.maxX ?? 100);
      const minY = ctx.resolveNumber(b.bounds.minY ?? 0);
      const maxY = ctx.resolveNumber(b.bounds.maxY ?? 100);
      
      if (x < minX && vel.x < 0) ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: -vel.x, y: vel.y });
      if (x > maxX && vel.x > 0) ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: -vel.x, y: vel.y });
      if (y < minY && vel.y < 0) ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vel.x, y: -vel.y });
      if (y > maxY && vel.y > 0) ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vel.x, y: -vel.y });
  });

  executor.registerHandler('maintain_speed', (behavior, ctx) => {
    const b = behavior as MaintainSpeedBehavior;
    if (!ctx.entity.bodyId) {
      if (ctx.entity.tags.includes('ball')) {
        console.warn('[maintain_speed] Ball has no bodyId!');
      }
      return;
    }

    const targetSpeed = ctx.resolveNumber(b.speed);
    const vel = ctx.physics.getLinearVelocity(ctx.entity.bodyId);
    const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);

    const frameNum = Math.floor(ctx.elapsed * 60);
    const isBall = ctx.entity.tags.includes('ball');
    
    if (frameNum % 60 === 0 && isBall) {
      const diff = ((currentSpeed - targetSpeed) / targetSpeed * 100).toFixed(1);
      console.log(`[maintain_speed] frame=${frameNum}, target=${targetSpeed.toFixed(2)}, current=${currentSpeed.toFixed(2)} (${diff}%), vel=(${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}), mode=${b.mode || 'constant'}`);
    }

    if (b.mode === 'minimum' && currentSpeed >= targetSpeed) {
      return;
    }

    if (currentSpeed > 0.01) {
      const scale = targetSpeed / currentSpeed;
      const newVel = { x: vel.x * scale, y: vel.y * scale };
      ctx.physics.setLinearVelocity(ctx.entity.bodyId, newVel);
      
      if (frameNum % 60 === 0 && isBall) {
        console.log(`[maintain_speed] Corrected velocity: scale=${scale.toFixed(3)}, new=(${newVel.x.toFixed(2)}, ${newVel.y.toFixed(2)})`);
      }
    } else if (isBall) {
      console.warn('[maintain_speed] Ball speed too low to maintain!', currentSpeed);
    }
  });
}
