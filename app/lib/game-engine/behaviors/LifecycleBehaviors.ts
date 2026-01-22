import type {
  Behavior,
  SpawnOnEventBehavior,
  DestroyOnCollisionBehavior,
  ScoreOnCollisionBehavior,
  ScoreOnDestroyBehavior,
  TimerBehavior,
  AnimateBehavior,
  GravityZoneBehavior,
  MagneticBehavior,
  HealthBehavior,
  ParticleEmitterBehavior,
} from '@slopcade/shared';
import type { BehaviorContext } from '../BehaviorContext';
import type { BehaviorExecutor } from '../BehaviorExecutor';

export function registerLifecycleBehaviors(executor: BehaviorExecutor): void {
  executor.registerHandler('spawn_on_event', (behavior, ctx, runtime) => {
    const spawn = behavior as SpawnOnEventBehavior;

    const spawned = (runtime.state.spawnCount as number) ?? 0;
    if (spawn.maxSpawns !== undefined) {
      const maxSpawns = ctx.resolveNumber(spawn.maxSpawns);
      if (spawned >= maxSpawns) return;
    }

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
        const interval = spawn.interval !== undefined ? ctx.resolveNumber(spawn.interval) : 1;
        const lastSpawn = (runtime.state.lastSpawn as number) ?? 0;
        if (ctx.elapsed >= lastSpawn + interval) {
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
            const offset = ctx.resolveVec2(spawn.offset);
            x += offset.x;
            y += offset.y;
          }
          break;
        case 'random_in_bounds':
          if (spawn.bounds) {
            x = spawn.bounds.minX + Math.random() * (spawn.bounds.maxX - spawn.bounds.minX);
            y = spawn.bounds.minY + Math.random() * (spawn.bounds.maxY - spawn.bounds.minY);
          }
          break;
      }

      const templateId = Array.isArray(spawn.entityTemplate)
        ? spawn.entityTemplate[Math.floor(Math.random() * spawn.entityTemplate.length)]
        : spawn.entityTemplate;

      const newEntity = ctx.spawnEntity(templateId, x, y);
      if (newEntity && spawn.initialVelocity && newEntity.bodyId) {
        const velocity = ctx.resolveVec2(spawn.initialVelocity);
        ctx.physics.setLinearVelocity(newEntity.bodyId, velocity);
      }

      if (spawn.spawnEffect) {
        ctx.triggerParticleEffect(spawn.spawnEffect, x, y);
      }

      runtime.state.spawnCount = spawned + 1;
    }
  });

  executor.registerHandler('destroy_on_collision', (behavior, ctx) => {
    const destroy = behavior as DestroyOnCollisionBehavior;

    for (const collision of ctx.collisions) {
      const other =
        collision.entityA.id === ctx.entity.id ? collision.entityB : collision.entityA;

      if (collision.entityA.id !== ctx.entity.id && collision.entityB.id !== ctx.entity.id) {
        continue;
      }

      const matchesTags = destroy.withTags.some((tag) => other.tags.includes(tag));
      if (!matchesTags) {
        continue;
      }

      if (destroy.minImpactVelocity !== undefined) {
        const minVelocity = ctx.resolveNumber(destroy.minImpactVelocity);
        if (collision.impulse < minVelocity) {
          continue;
        }
      }

      ctx.destroyEntity(ctx.entity.id);
      if (destroy.destroyOther) {
        ctx.destroyEntity(other.id);
      }
      break;
    }
  });

  executor.registerHandler('score_on_collision', (behavior, ctx, runtime) => {
    const score = behavior as ScoreOnCollisionBehavior;

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

      const points = ctx.resolveNumber(score.points);
      ctx.addScore(points);
      scored.add(other.id);
    }
  });

  executor.registerHandler('score_on_destroy', (behavior, ctx, runtime) => {
    const score = behavior as ScoreOnDestroyBehavior;
    
    if (runtime.state.isBeingDestroyed) {
      const points = ctx.resolveNumber(score.points);
      ctx.addScore(points);
    }
  });

  executor.registerHandler('timer', (behavior, ctx, runtime) => {
    const timer = behavior as TimerBehavior;

    if (runtime.state.lastFire === undefined) {
      runtime.state.lastFire = ctx.elapsed;
    }

    const duration = ctx.resolveNumber(timer.duration);
    const lastFire = (runtime.state.lastFire as number);
    const nextFire = lastFire + duration;

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

  executor.registerHandler('animate', (behavior, ctx, runtime) => {
    const animate = behavior as AnimateBehavior;

    if (animate.frames.length === 0) return;

    const fps = ctx.resolveNumber(animate.fps);
    const frameIndex = (runtime.state.frameIndex as number) ?? 0;
    const lastFrameTime = (runtime.state.lastFrameTime as number) ?? 0;
    const frameDuration = 1 / fps;

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

  executor.registerHandler('gravity_zone', (behavior, ctx) => {
    const zone = behavior as GravityZoneBehavior;
    
    const radius = ctx.resolveNumber(zone.radius);
    const gravity = ctx.resolveVec2(zone.gravity);
    
    const entities = ctx.entityManager.getActiveEntities();
    for (const target of entities) {
      if (target.id === ctx.entity.id) continue;
      if (!target.bodyId) continue;
      if (zone.affectsTags && !zone.affectsTags.some(tag => target.tags.includes(tag))) continue;

      const dx = ctx.entity.transform.x - target.transform.x;
      const dy = ctx.entity.transform.y - target.transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius || dist < 0.01) continue;

      let force = { x: gravity.x, y: gravity.y };

      if (zone.falloff && zone.falloff !== 'none') {
        const factor = zone.falloff === 'linear' 
          ? 1 - (dist / radius)
          : Math.pow(1 - (dist / radius), 2);
        force = { x: force.x * factor, y: force.y * factor };
      }

      ctx.physics.applyForceToCenter(target.bodyId, force);
    }
  });

  executor.registerHandler('magnetic', (behavior, ctx) => {
    const magnetic = behavior as MagneticBehavior;
    
    const strength = ctx.resolveNumber(magnetic.strength);
    const radius = ctx.resolveNumber(magnetic.radius);
    
    const entities = ctx.entityManager.getActiveEntities();
    for (const target of entities) {
      if (target.id === ctx.entity.id) continue;
      if (!target.bodyId) continue;
      if (magnetic.attractsTags && !magnetic.attractsTags.some(tag => target.tags.includes(tag))) continue;

      const dx = ctx.entity.transform.x - target.transform.x;
      const dy = ctx.entity.transform.y - target.transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius || dist < 0.01) continue;

      const direction = magnetic.repels ? -1 : 1;
      const forceMagnitude = (strength * direction) / Math.max(dist * dist, 0.1);
      const forceX = (dx / dist) * forceMagnitude;
      const forceY = (dy / dist) * forceMagnitude;

      ctx.physics.applyForceToCenter(target.bodyId, { x: forceX, y: forceY });
    }
  });

  executor.registerHandler('health', (behavior, ctx, runtime) => {
    const health = behavior as HealthBehavior;
    
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

  executor.registerHandler('particle_emitter', (behavior, ctx, runtime) => {
    const emitter = behavior as ParticleEmitterBehavior;
    
    const offsetX = emitter.offset?.x ?? 0;
    const offsetY = emitter.offset?.y ?? 0;
    const x = ctx.entity.transform.x + offsetX;
    const y = ctx.entity.transform.y + offsetY;

    if (!runtime.state.emitterId) {
      const shouldEmit = emitter.emitWhile === 'always' || emitter.emitWhile === undefined || emitter.emitWhile === 'enabled';
      if (shouldEmit) {
        runtime.state.emitterId = ctx.createEntityEmitter(emitter.emitterType, x, y);
      }
    } else {
      const emitterId = runtime.state.emitterId as string;
      
      if (emitter.emitWhile === 'moving') {
        const lastX = (runtime.state.lastX as number) ?? x;
        const lastY = (runtime.state.lastY as number) ?? y;
        const isMoving = Math.abs(x - lastX) > 0.01 || Math.abs(y - lastY) > 0.01;
        
        if (!isMoving && runtime.state.emitterId) {
          ctx.stopEmitter(emitterId);
          runtime.state.emitterId = undefined;
        }
      }
      
      if (runtime.state.emitterId) {
        ctx.updateEmitterPosition(emitterId, x, y);
      }
    }
    
    runtime.state.lastX = x;
    runtime.state.lastY = y;
  });
}
