import type {
  Behavior,
  MoveBehavior,
  RotateBehavior,
  RotateTowardBehavior,
  OscillateBehavior,
  DraggableBehavior,
  FollowBehavior,
  BounceBehavior,
  MaintainSpeedBehavior,
  TranslateBehavior,
  SetVelocityBehavior,
  ApplyImpulseBehavior,
} from '@slopcade/shared';
import type { BehaviorContext } from '../BehaviorContext';
import type { BehaviorExecutor } from '../BehaviorExecutor';

const warnedEntities = new Set<string>();

export function registerMovementBehaviors(executor: BehaviorExecutor): void {
  executor.registerHandler('move', (behavior, ctx) => {
    const b = behavior as MoveBehavior;

    const warningKey = 'move:deprecated';
    if (!warnedEntities.has(warningKey)) {
      console.warn('[move] The "move" behavior is deprecated and will be removed in a future version. Use "translate" behavior instead. "move" now uses transform-based movement for consistency.');
      warnedEntities.add(warningKey);
    }

    const speed = ctx.resolveNumber(b.speed ?? 100);
    const dt = ctx.dt;
    const distance = speed * dt;

    let dx = 0;
    let dy = 0;

    switch (b.direction) {
      case 'left':
        dx = -distance;
        break;
      case 'right':
        dx = distance;
        break;
      case 'up':
        dy = -distance;
        break;
      case 'down':
        dy = distance;
        break;
      case 'toward_target': {
        const target = ctx.entityManager.getEntitiesByTag('player')[0];
        if (target) {
          const tx = target.transform.x - ctx.entity.transform.x;
          const ty = target.transform.y - ctx.entity.transform.y;
          const length = Math.sqrt(tx * tx + ty * ty);
          if (length > 0) {
            dx = (tx / length) * distance;
            dy = (ty / length) * distance;
          }
        }
        break;
      }
      case 'away_from_target': {
        const target = ctx.entityManager.getEntitiesByTag('player')[0];
        if (target) {
          const tx = ctx.entity.transform.x - target.transform.x;
          const ty = ctx.entity.transform.y - target.transform.y;
          const length = Math.sqrt(tx * tx + ty * ty);
          if (length > 0) {
            dx = (tx / length) * distance;
            dy = (ty / length) * distance;
          }
        }
        break;
      }
    }

    if (b.patrol) {
      const newX = ctx.entity.localTransform.x + dx;
      const newY = ctx.entity.localTransform.y + dy;

      if (newX >= b.patrol.minX && newX <= b.patrol.maxX) {
        ctx.entity.localTransform.x = newX;
      }
      if (newY >= b.patrol.minY && newY <= b.patrol.maxY) {
        ctx.entity.localTransform.y = newY;
      }
    } else {
      ctx.entity.localTransform.x += dx;
      ctx.entity.localTransform.y += dy;
    }

    if (ctx.entity.parentId) {
      ctx.entityManager.updateWorldTransforms(ctx.entity.id);
    } else {
      ctx.entity.transform.x = ctx.entity.localTransform.x;
      ctx.entity.transform.y = ctx.entity.localTransform.y;
    }

    ctx.setEntityPosition(ctx.entity.id, ctx.entity.transform.x, ctx.entity.transform.y);
  });

  executor.registerHandler('translate', (behavior, ctx) => {
    const b = behavior as TranslateBehavior;
    
    // Warn if translate is used on a dynamic physics body (should use physics forces instead)
    if (ctx.entity.bodyId) {
      const warningKey = `${ctx.entity.id}:translate`;
      if (!warnedEntities.has(warningKey)) {
        console.warn(`[translate] Entity '${ctx.entity.id}' has a physics body. Using translate on dynamic bodies may cause physics conflicts. Consider using 'move' behavior or apply forces instead.`);
        warnedEntities.add(warningKey);
      }
    }
    
    const speed = ctx.resolveNumber(b.speed);
    const dt = ctx.dt;
    const distance = speed * dt;

    // Calculate movement vector based on direction type
    let dx = 0;
    let dy = 0;

    switch (b.direction.type) {
      case 'vector': {
        // Normalize the vector
        const length = Math.sqrt(b.direction.x * b.direction.x + b.direction.y * b.direction.y);
        if (length > 0) {
          dx = (b.direction.x / length) * distance;
          dy = (b.direction.y / length) * distance;
        }
        break;
      }
      case 'toward_target': {
        const targetTag = b.direction.targetTag ?? 'player';
        const target = ctx.entityManager.getEntitiesByTag(targetTag)[0];
        if (target) {
          const tx = target.transform.x - ctx.entity.transform.x;
          const ty = target.transform.y - ctx.entity.transform.y;
          const length = Math.sqrt(tx * tx + ty * ty);
          if (length > 0) {
            dx = (tx / length) * distance;
            dy = (ty / length) * distance;
          }
        }
        break;
      }
      case 'away_from_target': {
        const targetTag = b.direction.targetTag ?? 'player';
        const target = ctx.entityManager.getEntitiesByTag(targetTag)[0];
        if (target) {
          const tx = ctx.entity.transform.x - target.transform.x;
          const ty = ctx.entity.transform.y - target.transform.y;
          const length = Math.sqrt(tx * tx + ty * ty);
          if (length > 0) {
            dx = (tx / length) * distance;
            dy = (ty / length) * distance;
          }
        }
        break;
      }
      case 'random': {
        // Random direction normalized
        const angle = Math.random() * 2 * Math.PI;
        dx = Math.cos(angle) * distance;
        dy = Math.sin(angle) * distance;
        break;
      }
    }

    // Apply bounds if specified
    if (b.bounds) {
      const newX = ctx.entity.localTransform.x + dx;
      const newY = ctx.entity.localTransform.y + dy;
      
      if (newX >= b.bounds.minX && newX <= b.bounds.maxX) {
        ctx.entity.localTransform.x = newX;
      }
      if (newY >= b.bounds.minY && newY <= b.bounds.maxY) {
        ctx.entity.localTransform.y = newY;
      }
    } else {
      // No bounds, just apply movement
      ctx.entity.localTransform.x += dx;
      ctx.entity.localTransform.y += dy;
    }

    // Handle hierarchy: update localTransform for parented, transform for root
    if (ctx.entity.parentId) {
      // Update localTransform (already done above), then propagate
      ctx.entityManager.updateWorldTransforms(ctx.entity.id);
    } else {
      // Root entity: update transform directly
      ctx.entity.transform.x = ctx.entity.localTransform.x;
      ctx.entity.transform.y = ctx.entity.localTransform.y;
    }

    // Sync to Godot bridge (only the moved entity, not children)
    ctx.setEntityPosition(ctx.entity.id, ctx.entity.transform.x, ctx.entity.transform.y);
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

    if (ctx.entity.bodyId) {
      ctx.physics.setTransform(ctx.entity.bodyId, {
        position: { x: newX, y: newY },
        angle: ctx.entity.transform.angle,
      });
    } else {
      ctx.setEntityPosition(ctx.entity.id, newX, newY);
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

    if (b.mode === 'minimum' && currentSpeed >= targetSpeed) {
      return;
    }

    if (currentSpeed > 0.01) {
      const scale = targetSpeed / currentSpeed;
      const newVel = { x: vel.x * scale, y: vel.y * scale };
      ctx.physics.setLinearVelocity(ctx.entity.bodyId, newVel);
    }
  });

  executor.registerHandler('set_velocity', (behavior, ctx) => {
    const b = behavior as SetVelocityBehavior;
    if (!ctx.entity.bodyId) {
      throw new Error(`[set_velocity] Cannot set velocity on entity '${ctx.entity.id}' without a physics body. Add a physics component or use translate behavior instead.`);
    }

    const speed = ctx.resolveNumber(b.speed);
    const overwrite = b.overwrite ?? true;

    let vx = 0;
    let vy = 0;

    switch (b.direction.type) {
      case 'vector': {
        const length = Math.sqrt(b.direction.x * b.direction.x + b.direction.y * b.direction.y);
        if (length > 0) {
          vx = (b.direction.x / length) * speed;
          vy = (b.direction.y / length) * speed;
        }
        break;
      }
      case 'toward_target': {
        const targetTag = b.direction.targetTag ?? 'player';
        const target = ctx.entityManager.getEntitiesByTag(targetTag)[0];
        if (target) {
          const tx = target.transform.x - ctx.entity.transform.x;
          const ty = target.transform.y - ctx.entity.transform.y;
          const length = Math.sqrt(tx * tx + ty * ty);
          if (length > 0) {
            vx = (tx / length) * speed;
            vy = (ty / length) * speed;
          }
        }
        break;
      }
      case 'away_from_target': {
        const targetTag = b.direction.targetTag ?? 'player';
        const target = ctx.entityManager.getEntitiesByTag(targetTag)[0];
        if (target) {
          const tx = ctx.entity.transform.x - target.transform.x;
          const ty = ctx.entity.transform.y - target.transform.y;
          const length = Math.sqrt(tx * tx + ty * ty);
          if (length > 0) {
            vx = (tx / length) * speed;
            vy = (ty / length) * speed;
          }
        }
        break;
      }
      case 'random': {
        const angle = Math.random() * 2 * Math.PI;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
        break;
      }
    }

    if (overwrite) {
      ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx, y: vy });
    } else {
      const currentVel = ctx.physics.getLinearVelocity(ctx.entity.bodyId);
      ctx.physics.setLinearVelocity(ctx.entity.bodyId, {
        x: currentVel.x + vx,
        y: currentVel.y + vy,
      });
    }
  });

  executor.registerHandler('apply_impulse', (behavior, ctx) => {
    const b = behavior as ApplyImpulseBehavior;
    if (!ctx.entity.bodyId) {
      throw new Error(`[apply_impulse] Cannot apply impulse on entity '${ctx.entity.id}' without a physics body. Add a physics component or use translate behavior instead.`);
    }

    const magnitude = ctx.resolveNumber(b.magnitude);

    let ix = 0;
    let iy = 0;

    switch (b.direction.type) {
      case 'vector': {
        const length = Math.sqrt(b.direction.x * b.direction.x + b.direction.y * b.direction.y);
        if (length > 0) {
          ix = (b.direction.x / length) * magnitude;
          iy = (b.direction.y / length) * magnitude;
        }
        break;
      }
      case 'toward_target': {
        const targetTag = b.direction.targetTag ?? 'player';
        const target = ctx.entityManager.getEntitiesByTag(targetTag)[0];
        if (target) {
          const tx = target.transform.x - ctx.entity.transform.x;
          const ty = target.transform.y - ctx.entity.transform.y;
          const length = Math.sqrt(tx * tx + ty * ty);
          if (length > 0) {
            ix = (tx / length) * magnitude;
            iy = (ty / length) * magnitude;
          }
        }
        break;
      }
      case 'away_from_target': {
        const targetTag = b.direction.targetTag ?? 'player';
        const target = ctx.entityManager.getEntitiesByTag(targetTag)[0];
        if (target) {
          const tx = ctx.entity.transform.x - target.transform.x;
          const ty = ctx.entity.transform.y - target.transform.y;
          const length = Math.sqrt(tx * tx + ty * ty);
          if (length > 0) {
            ix = (tx / length) * magnitude;
            iy = (ty / length) * magnitude;
          }
        }
        break;
      }
      case 'random': {
        const angle = Math.random() * 2 * Math.PI;
        ix = Math.cos(angle) * magnitude;
        iy = Math.sin(angle) * magnitude;
        break;
      }
    }

    ctx.physics.applyImpulse(ctx.entity.bodyId, { x: ix, y: iy });
  });
}
