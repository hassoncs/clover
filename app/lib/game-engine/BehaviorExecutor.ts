import type { Behavior, BehaviorType } from '@clover/shared';
import type { RuntimeEntity, RuntimeBehavior } from './types';
import type { BehaviorContext } from './BehaviorContext';

export type BehaviorHandler = (
  behavior: Behavior,
  context: BehaviorContext,
  runtimeBehavior: RuntimeBehavior
) => void;

type BehaviorPhase = 'input' | 'timer' | 'movement' | 'visual' | 'post_physics';

const BEHAVIOR_PHASES: Record<BehaviorType, BehaviorPhase> = {
  control: 'input',
  timer: 'timer',
  move: 'movement',
  follow: 'movement',
  bounce: 'movement',
  oscillate: 'movement',
  rotate: 'visual',
  rotate_toward: 'visual',
  animate: 'visual',
  spawn_on_event: 'post_physics',
  destroy_on_collision: 'post_physics',
  score_on_collision: 'post_physics',
  score_on_destroy: 'post_physics',
  gravity_zone: 'movement',
  magnetic: 'movement',
  health: 'post_physics',
};

const PHASE_ORDER: BehaviorPhase[] = ['input', 'timer', 'movement', 'visual', 'post_physics'];

export class BehaviorExecutor {
  private handlers = new Map<BehaviorType, BehaviorHandler>();

  registerHandler(type: BehaviorType, handler: BehaviorHandler): void {
    this.handlers.set(type, handler);
  }

  executeAll(entities: RuntimeEntity[], context: Omit<BehaviorContext, 'entity'>): void {
    for (const phase of PHASE_ORDER) {
      for (const entity of entities) {
        if (!entity.active) continue;
        this.executePhase(entity, phase, context);
      }
    }
  }

  private executePhase(
    entity: RuntimeEntity,
    phase: BehaviorPhase,
    baseContext: Omit<BehaviorContext, 'entity'>
  ): void {
    const context: BehaviorContext = { ...baseContext, entity };

    for (const runtimeBehavior of entity.behaviors) {
      if (!runtimeBehavior.enabled) continue;

      const behaviorPhase = BEHAVIOR_PHASES[runtimeBehavior.definition.type];
      if (behaviorPhase !== phase) continue;

      const handler = this.handlers.get(runtimeBehavior.definition.type);
      if (handler) {
        handler(runtimeBehavior.definition, context, runtimeBehavior);
      }
    }
  }

  executeSingle(
    entity: RuntimeEntity,
    behavior: RuntimeBehavior,
    context: Omit<BehaviorContext, 'entity'>
  ): void {
    if (!behavior.enabled) return;

    const handler = this.handlers.get(behavior.definition.type);
    if (handler) {
      handler(behavior.definition, { ...context, entity }, behavior);
    }
  }
}

export function createBehaviorExecutor(): BehaviorExecutor {
  const executor = new BehaviorExecutor();

  // Register all built-in handlers
  registerMovementHandlers(executor);
  registerControlHandlers(executor);
  registerTimerHandlers(executor);
  registerCollisionHandlers(executor);
  registerVisualHandlers(executor);

  return executor;
}

function registerMovementHandlers(executor: BehaviorExecutor): void {
  executor.registerHandler('move', (behavior, ctx, runtime) => {
    const move = behavior as import('@clover/shared').MoveBehavior;
    if (!ctx.entity.bodyId) return;

    let vx = 0;
    let vy = 0;

    switch (move.direction) {
      case 'left':
        vx = -move.speed;
        break;
      case 'right':
        vx = move.speed;
        break;
      case 'up':
        vy = -move.speed;
        break;
      case 'down':
        vy = move.speed;
        break;
      case 'toward_target':
      case 'away_from_target':
        if (move.target) {
          const target = ctx.entityManager.getEntity(move.target);
          if (target) {
            const dx = target.transform.x - ctx.entity.transform.x;
            const dy = target.transform.y - ctx.entity.transform.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.01) {
              const dir = move.direction === 'toward_target' ? 1 : -1;
              vx = (dx / dist) * move.speed * dir;
              vy = (dy / dist) * move.speed * dir;
            }
          }
        }
        break;
    }

    if (move.patrol) {
      const { x } = ctx.entity.transform;
      const patrolDir = (runtime.state.patrolDirection as number) ?? 1;

      if (move.patrol.minX !== undefined && x <= move.patrol.minX) {
        runtime.state.patrolDirection = 1;
      } else if (move.patrol.maxX !== undefined && x >= move.patrol.maxX) {
        runtime.state.patrolDirection = -1;
      }

      vx = Math.abs(vx) * ((runtime.state.patrolDirection as number) ?? 1);
    }

    if (move.movementType === 'force') {
      ctx.physics.applyForceToCenter(ctx.entity.bodyId, { x: vx, y: vy });
    } else {
      ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx, y: vy });
    }
  });

  executor.registerHandler('oscillate', (behavior, ctx, runtime) => {
    const osc = behavior as import('@clover/shared').OscillateBehavior;
    if (!ctx.entity.bodyId) return;

    const phase = (osc.phase ?? 0) * Math.PI * 2;
    const t = ctx.elapsed * osc.frequency * Math.PI * 2 + phase;
    const offset = Math.sin(t) * osc.amplitude;

    const baseX = (runtime.state.baseX as number) ?? ctx.entity.transform.x;
    const baseY = (runtime.state.baseY as number) ?? ctx.entity.transform.y;

    if (runtime.state.baseX === undefined) {
      runtime.state.baseX = ctx.entity.transform.x;
      runtime.state.baseY = ctx.entity.transform.y;
    }

    let newX = baseX;
    let newY = baseY;

    if (osc.axis === 'x' || osc.axis === 'both') {
      newX = baseX + offset;
    }
    if (osc.axis === 'y' || osc.axis === 'both') {
      newY = baseY + offset;
    }

    ctx.physics.setTransform(ctx.entity.bodyId, {
      position: { x: newX, y: newY },
      angle: ctx.entity.transform.angle,
    });
  });

  executor.registerHandler('follow', (behavior, ctx) => {
    const follow = behavior as import('@clover/shared').FollowBehavior;
    if (!ctx.entity.bodyId) return;

    const target = ctx.entityManager.getEntity(follow.target);
    if (!target) return;

    const dx = target.transform.x - ctx.entity.transform.x;
    const dy = target.transform.y - ctx.entity.transform.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (follow.minDistance !== undefined && dist < follow.minDistance) return;
    if (follow.maxDistance !== undefined && dist > follow.maxDistance) return;

    if (dist > 0.01) {
      const vx = (dx / dist) * follow.speed;
      const vy = (dy / dist) * follow.speed;
      ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: vx, y: vy });
    }
  });

  executor.registerHandler('bounce', (behavior, ctx) => {
    const bounce = behavior as import('@clover/shared').BounceBehavior;
    if (!ctx.entity.bodyId) return;

    const vel = ctx.physics.getLinearVelocity(ctx.entity.bodyId);
    const pos = ctx.entity.transform;
    let newVx = vel.x;
    let newVy = vel.y;

    if ((pos.x <= bounce.bounds.minX && vel.x < 0) || (pos.x >= bounce.bounds.maxX && vel.x > 0)) {
      newVx = -vel.x;
    }
    if ((pos.y <= bounce.bounds.minY && vel.y < 0) || (pos.y >= bounce.bounds.maxY && vel.y > 0)) {
      newVy = -vel.y;
    }

    if (newVx !== vel.x || newVy !== vel.y) {
      ctx.physics.setLinearVelocity(ctx.entity.bodyId, { x: newVx, y: newVy });
    }
  });

  executor.registerHandler('gravity_zone', (behavior, ctx) => {
    const zone = behavior as import('@clover/shared').GravityZoneBehavior;
    
    const entities = ctx.entityManager.getActiveEntities();
    for (const target of entities) {
      if (target.id === ctx.entity.id) continue;
      if (!target.bodyId) continue;
      if (zone.affectsTags && !zone.affectsTags.some(tag => target.tags.includes(tag))) continue;

      const dx = ctx.entity.transform.x - target.transform.x;
      const dy = ctx.entity.transform.y - target.transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > zone.radius || dist < 0.01) continue;

      let force = { x: zone.gravity.x, y: zone.gravity.y };

      if (zone.falloff && zone.falloff !== 'none') {
        const factor = zone.falloff === 'linear' 
          ? 1 - (dist / zone.radius)
          : Math.pow(1 - (dist / zone.radius), 2);
        force = { x: force.x * factor, y: force.y * factor };
      }

      ctx.physics.applyForceToCenter(target.bodyId, force);
    }
  });

  executor.registerHandler('magnetic', (behavior, ctx) => {
    const magnetic = behavior as import('@clover/shared').MagneticBehavior;
    
    const entities = ctx.entityManager.getActiveEntities();
    for (const target of entities) {
      if (target.id === ctx.entity.id) continue;
      if (!target.bodyId) continue;
      if (magnetic.attractsTags && !magnetic.attractsTags.some(tag => target.tags.includes(tag))) continue;

      const dx = ctx.entity.transform.x - target.transform.x;
      const dy = ctx.entity.transform.y - target.transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > magnetic.radius || dist < 0.01) continue;

      const direction = magnetic.repels ? -1 : 1;
      const forceMagnitude = (magnetic.strength * direction) / Math.max(dist * dist, 0.1);
      const forceX = (dx / dist) * forceMagnitude;
      const forceY = (dy / dist) * forceMagnitude;

      ctx.physics.applyForceToCenter(target.bodyId, { x: forceX, y: forceY });
    }
  });
}

function registerControlHandlers(executor: BehaviorExecutor): void {
  executor.registerHandler('control', (behavior, ctx, runtime) => {
    const control = behavior as import('@clover/shared').ControlBehavior;
    if (!ctx.entity.bodyId) return;

    const cooldownEnd = (runtime.state.cooldownEnd as number) ?? 0;
    if (ctx.elapsed < cooldownEnd) return;

    switch (control.controlType) {
      case 'tap_to_jump':
        if (ctx.input.tap) {
          const force = control.force ?? 10;
          ctx.physics.applyImpulseToCenter(ctx.entity.bodyId, { x: 0, y: -force });
          runtime.state.cooldownEnd = ctx.elapsed + (control.cooldown ?? 0.1);
        }
        break;

      case 'drag_to_aim':
        if (ctx.input.dragEnd) {
          const force = control.force ?? 10;
          const vx = -ctx.input.dragEnd.worldVelocityX * force;
          const vy = -ctx.input.dragEnd.worldVelocityY * force;
          ctx.physics.applyImpulseToCenter(ctx.entity.bodyId, { x: vx, y: vy });
          runtime.state.cooldownEnd = ctx.elapsed + (control.cooldown ?? 0.5);
        }
        break;

      case 'tilt_to_move':
        if (ctx.input.tilt) {
          const force = control.force ?? 5;
          const maxSpeed = control.maxSpeed ?? 10;
          const vel = ctx.physics.getLinearVelocity(ctx.entity.bodyId);

          let fx = ctx.input.tilt.x * force;
          let fy = ctx.input.tilt.y * force;

          if (Math.abs(vel.x) > maxSpeed) fx = 0;
          if (Math.abs(vel.y) > maxSpeed) fy = 0;

          ctx.physics.applyForceToCenter(ctx.entity.bodyId, { x: fx, y: fy });
        }
        break;

      case 'buttons':
        if (ctx.input.buttons) {
          const force = control.force ?? 5;
          let fx = 0;
          let fy = 0;

          if (ctx.input.buttons.left) fx -= force;
          if (ctx.input.buttons.right) fx += force;
          if (ctx.input.buttons.up) fy -= force;
          if (ctx.input.buttons.down) fy += force;
          if (ctx.input.buttons.jump) {
            ctx.physics.applyImpulseToCenter(ctx.entity.bodyId, { x: 0, y: -(control.force ?? 10) });
            runtime.state.cooldownEnd = ctx.elapsed + (control.cooldown ?? 0.2);
          }

          if (fx !== 0 || fy !== 0) {
            ctx.physics.applyForceToCenter(ctx.entity.bodyId, { x: fx, y: fy });
          }
        }
        break;
    }
  });
}

function registerTimerHandlers(executor: BehaviorExecutor): void {
  executor.registerHandler('timer', (behavior, ctx, runtime) => {
    const timer = behavior as import('@clover/shared').TimerBehavior;

    const lastFire = (runtime.state.lastFire as number) ?? 0;
    const nextFire = lastFire + timer.duration;

    if (ctx.elapsed >= nextFire) {
      runtime.state.lastFire = ctx.elapsed;

      switch (timer.action) {
        case 'destroy':
          ctx.destroyEntity(ctx.entity.id);
          break;
        case 'spawn':
          if (timer.spawnTemplate) {
            ctx.spawnEntity(timer.spawnTemplate, ctx.entity.transform.x, ctx.entity.transform.y);
          }
          break;
        case 'trigger_event':
          if (timer.eventName) {
            ctx.triggerEvent(timer.eventName);
          }
          break;
        case 'enable_behavior':
        case 'disable_behavior':
          if (timer.behaviorIndex !== undefined && ctx.entity.behaviors[timer.behaviorIndex]) {
            ctx.entity.behaviors[timer.behaviorIndex].enabled = timer.action === 'enable_behavior';
          }
          break;
      }

      if (!timer.repeat) {
        runtime.enabled = false;
      }
    }
  });
}

function registerCollisionHandlers(executor: BehaviorExecutor): void {
  executor.registerHandler('destroy_on_collision', (behavior, ctx) => {
    const destroy = behavior as import('@clover/shared').DestroyOnCollisionBehavior;

    for (const collision of ctx.collisions) {
      const other =
        collision.entityA.id === ctx.entity.id ? collision.entityB : collision.entityA;

      if (collision.entityA.id !== ctx.entity.id && collision.entityB.id !== ctx.entity.id) {
        continue;
      }

      const matchesTags = destroy.withTags.some((tag) => other.tags.includes(tag));
      if (!matchesTags) continue;

      if (destroy.minImpactVelocity !== undefined && collision.impulse < destroy.minImpactVelocity) {
        continue;
      }

      ctx.destroyEntity(ctx.entity.id);
      if (destroy.destroyOther) {
        ctx.destroyEntity(other.id);
      }
      break;
    }
  });

  executor.registerHandler('score_on_collision', (behavior, ctx, runtime) => {
    const score = behavior as import('@clover/shared').ScoreOnCollisionBehavior;

    const scored = (runtime.state.scoredEntities as Set<string>) ?? new Set<string>();
    if (runtime.state.scoredEntities === undefined) {
      runtime.state.scoredEntities = scored;
    }

    for (const collision of ctx.collisions) {
      const other =
        collision.entityA.id === ctx.entity.id ? collision.entityB : collision.entityA;

      if (collision.entityA.id !== ctx.entity.id && collision.entityB.id !== ctx.entity.id) {
        continue;
      }

      const matchesTags = score.withTags.some((tag) => other.tags.includes(tag));
      if (!matchesTags) continue;

      if (score.once && scored.has(other.id)) continue;

      ctx.addScore(score.points);
      scored.add(other.id);
    }
  });

  executor.registerHandler('score_on_destroy', (behavior, ctx, runtime) => {
    const score = behavior as import('@clover/shared').ScoreOnDestroyBehavior;
    
    if (runtime.state.isBeingDestroyed) {
      ctx.addScore(score.points);
    }
  });

  executor.registerHandler('health', (behavior, ctx, runtime) => {
    const health = behavior as import('@clover/shared').HealthBehavior;
    
    if (runtime.state.currentHealth === undefined) {
      runtime.state.currentHealth = health.currentHealth ?? health.maxHealth;
    }
    
    const lastHitTime = (runtime.state.lastHitTime as number) ?? 0;
    const invulnerable = health.invulnerabilityTime && 
                        (ctx.elapsed - lastHitTime) < health.invulnerabilityTime;
    
    if (!invulnerable && health.damageFromTags) {
      for (const collision of ctx.collisions) {
        const other =
          collision.entityA.id === ctx.entity.id ? collision.entityB : collision.entityA;
        
        if (collision.entityA.id !== ctx.entity.id && collision.entityB.id !== ctx.entity.id) {
          continue;
        }
        
        const matchesTags = health.damageFromTags.some((tag) => other.tags.includes(tag));
        if (!matchesTags) continue;
        
        const damage = health.damagePerHit ?? 1;
        runtime.state.currentHealth = (runtime.state.currentHealth as number) - damage;
        runtime.state.lastHitTime = ctx.elapsed;
        
        if ((runtime.state.currentHealth as number) <= 0) {
          if (health.destroyOnDeath !== false) {
            runtime.state.isBeingDestroyed = true;
            ctx.destroyEntity(ctx.entity.id);
          }
        }
        break;
      }
    }
  });

  executor.registerHandler('spawn_on_event', (behavior, ctx, runtime) => {
    const spawn = behavior as import('@clover/shared').SpawnOnEventBehavior;

    const spawned = (runtime.state.spawnCount as number) ?? 0;
    if (spawn.maxSpawns !== undefined && spawned >= spawn.maxSpawns) return;

    let shouldSpawn = false;

    switch (spawn.event) {
      case 'start':
        if (!runtime.state.startSpawned) {
          shouldSpawn = true;
          runtime.state.startSpawned = true;
        }
        break;
      case 'tap':
        if (ctx.input.tap) shouldSpawn = true;
        break;
      case 'timer': {
        const lastSpawn = (runtime.state.lastSpawn as number) ?? 0;
        if (ctx.elapsed >= lastSpawn + (spawn.interval ?? 1)) {
          shouldSpawn = true;
          runtime.state.lastSpawn = ctx.elapsed;
        }
        break;
      }
      case 'collision':
        for (const collision of ctx.collisions) {
          if (collision.entityA.id !== ctx.entity.id && collision.entityB.id !== ctx.entity.id) {
            continue;
          }
          const other =
            collision.entityA.id === ctx.entity.id ? collision.entityB : collision.entityA;
          if (!spawn.withTags || spawn.withTags.some((tag) => other.tags.includes(tag))) {
            shouldSpawn = true;
            break;
          }
        }
        break;
    }

    if (shouldSpawn) {
      let x = ctx.entity.transform.x;
      let y = ctx.entity.transform.y;

      switch (spawn.spawnPosition) {
        case 'at_self':
          break;
        case 'at_touch':
          if (ctx.input.tap) {
            x = ctx.input.tap.worldX;
            y = ctx.input.tap.worldY;
          }
          break;
        case 'offset':
          if (spawn.offset) {
            x += spawn.offset.x;
            y += spawn.offset.y;
          }
          break;
        case 'random_in_bounds':
          if (spawn.bounds) {
            x = spawn.bounds.minX + Math.random() * (spawn.bounds.maxX - spawn.bounds.minX);
            y = spawn.bounds.minY + Math.random() * (spawn.bounds.maxY - spawn.bounds.minY);
          }
          break;
      }

      const newEntity = ctx.spawnEntity(spawn.entityTemplate, x, y);
      if (newEntity && spawn.initialVelocity && newEntity.bodyId) {
        ctx.physics.setLinearVelocity(newEntity.bodyId, spawn.initialVelocity);
      }

      runtime.state.spawnCount = spawned + 1;
    }
  });
}

function registerVisualHandlers(executor: BehaviorExecutor): void {
  executor.registerHandler('rotate', (behavior, ctx) => {
    const rotate = behavior as import('@clover/shared').RotateBehavior;

    const direction = rotate.direction === 'clockwise' ? 1 : -1;
    const deltaAngle = rotate.speed * ctx.dt * direction;

    ctx.entity.transform.angle += deltaAngle;

    if (rotate.affectsPhysics && ctx.entity.bodyId) {
      ctx.physics.setAngularVelocity(ctx.entity.bodyId, rotate.speed * direction);
    }
  });

  executor.registerHandler('rotate_toward', (behavior, ctx) => {
    const rotateTo = behavior as import('@clover/shared').RotateTowardBehavior;
    
    const target = ctx.entityManager.getEntity(rotateTo.target);
    if (!target) return;

    const dx = target.transform.x - ctx.entity.transform.x;
    const dy = target.transform.y - ctx.entity.transform.y;
    
    const targetAngle = Math.atan2(dy, dx) + (rotateTo.offset ?? 0);
    
    if (rotateTo.speed) {
      const angleDiff = targetAngle - ctx.entity.transform.angle;
      const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      const maxRotation = rotateTo.speed * ctx.dt;
      const rotation = Math.max(-maxRotation, Math.min(maxRotation, normalizedDiff));
      
      ctx.entity.transform.angle += rotation;
    } else {
      ctx.entity.transform.angle = targetAngle;
    }
  });

  executor.registerHandler('animate', (behavior, ctx, runtime) => {
    const animate = behavior as import('@clover/shared').AnimateBehavior;

    if (animate.frames.length === 0) return;

    const frameIndex = (runtime.state.frameIndex as number) ?? 0;
    const lastFrameTime = (runtime.state.lastFrameTime as number) ?? 0;
    const frameDuration = 1 / animate.fps;

    if (ctx.elapsed >= lastFrameTime + frameDuration) {
      let nextIndex = frameIndex + 1;

      if (nextIndex >= animate.frames.length) {
        if (animate.loop) {
          nextIndex = 0;
        } else {
          nextIndex = animate.frames.length - 1;
          runtime.enabled = false;
        }
      }

      runtime.state.frameIndex = nextIndex;
      runtime.state.lastFrameTime = ctx.elapsed;
      runtime.state.currentFrame = animate.frames[nextIndex];
    }
  });
}
