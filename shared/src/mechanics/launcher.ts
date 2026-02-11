import type { GameRule, DragTrigger, ApplyImpulseAction, SpawnAction, SetVariableAction } from '../types/rules';

/**
 * Configuration for a pull-back launcher mechanic.
 * 
 * This creates a "slingshot" style launcher where:
 * 1. User drags on the launcher entity to pull back
 * 2. Release fires the projectile with force proportional to pull distance
 * 
 * The launcher entity must have a `draggable` behavior attached.
 */
export interface LauncherConfig {
  /** ID of the launcher entity (must exist in entities array) */
  launcherEntityId: string;
  
  /** Template ID of the projectile to spawn */
  projectileTemplate: string;
  
  /** Position to spawn projectile at */
  projectileSpawnPosition: { x: number; y: number };
  
  /** Maximum pull distance in meters (clamps the drag vector) */
  maxPullDistance: number;
  
  /** Force multiplier - applied to the pull vector length */
  forceMultiplier: number;
  
  /** Minimum pull distance threshold - drags smaller than this are ignored */
  minPullThreshold: number;
  
  /** Optional: whether to consume a life on each shot */
  consumeLives: boolean;
  
  /** Optional: lives consumed per shot (default: 1) */
  livesPerShot?: number;
  
  /** Optional: game over when lives reach zero (default: true) */
  gameOverOnLivesZero?: boolean;
  
  /** Optional: cooldown between shots in seconds (default: 0.5) */
  cooldown?: number;
  
  /** Optional: whether to allow only one projectile at a time */
  oneShotAtATime: boolean;
  
  /** Optional: tag to check for one-shot restriction */
  projectileTag: string;
  
  /** Optional: maximum projectiles allowed (default: 1) */
  maxProjectiles?: number;
}

/**
 * Creates a complete set of rules for a pull-back launcher.
 * 
 * Usage:
 * ```typescript
 * import { createLauncherRules } from '@slopcade/shared';
 * 
 * const game: GameDefinition = {
 *   // ... other config
 *   rules: [
 *     ...createLauncherRules({
 *       launcherEntityId: 'cannon',
 *       projectileTemplate: 'ball',
 *       projectileSpawnPosition: { x: 2, y: 8 },
 *       maxPullDistance: 3,
 *       forceMultiplier: 15,
 *       minPullThreshold: 0.2,
 *       consumeLives: true,
 *       oneShotAtATime: true,
 *       projectileTag: 'projectile',
 *     })
 *   ]
 * }
 * ```
 */
export function createLauncherRules(config: LauncherConfig): GameRule[] {
  const {
    launcherEntityId,
    projectileTemplate,
    projectileSpawnPosition,
    maxPullDistance,
    forceMultiplier,
    minPullThreshold,
    consumeLives,
    livesPerShot = 1,
    gameOverOnLivesZero = true,
    cooldown = 0.5,
    oneShotAtATime,
    projectileTag,
    maxProjectiles = 1,
  } = config;

  const rules: GameRule[] = [];

  // =========================================================================
  // Rule 1: Fire projectile on drag end
  // =========================================================================
  rules.push({
    id: `${launcherEntityId}-fire`,
    name: `${launcherEntityId} fire on drag end`,
    trigger: {
      type: 'drag',
      phase: 'end',
      target: launcherEntityId,
    } as DragTrigger,
    conditions: [
      // Only fire if projectile count is under limit
      ...(oneShotAtATime ? [{
        type: 'entity_count' as const,
        tag: projectileTag,
        max: maxProjectiles - 1,
      }] : []),
    ],
    actions: [
      // Spawn the projectile
      {
        type: 'spawn' as const,
        prefab: projectileTemplate,
        position: {
          type: 'fixed' as const,
          x: projectileSpawnPosition.x,
          y: projectileSpawnPosition.y,
        },
      } as SpawnAction,
      
      // Apply impulse using drag direction (pull-back vector)
      {
        type: 'apply_impulse' as const,
        target: { type: 'by_tag' as const, tag: projectileTag },
        direction: 'drag_direction' as const,
        force: forceMultiplier,
      } as ApplyImpulseAction,
      
      // Optional: decrement lives
      ...(consumeLives ? [{
        type: 'set_variable' as const,
        name: 'lives',
        operation: 'subtract' as const,
        value: livesPerShot,
      } as SetVariableAction] : []),
      
      // Optional: start cooldown
      ...(cooldown > 0 ? [{
        type: 'start_cooldown' as const,
        cooldownId: `${launcherEntityId}-cooldown`,
        duration: cooldown,
      } as const] : []),
    ],
    cooldown,
  });

  // Game over on lives zero: add loseCondition: { type: 'custom' } to GameDefinition

  return rules;
}

/**
 * Creates the launcher entity configuration with draggable behavior.
 * Call this in your entities array.
 */
export function createLauncherEntity(config: {
  id: string;
  x: number;
  y: number;
  radius?: number;
  color?: string;
}): {
  id: string;
  name: string;
  transform: { x: number; y: number; angle: number; scaleX: number; scaleY: number };
  visual: { type: 'circle'; radius: number; color: string };
  behaviors: Array<{
    type: 'draggable';
    mode: 'force';
    stiffness: number;
    damping: number;
    requireDirectHit: boolean;
  }>;
  tags: string[];
} {
  return {
    id: config.id,
    name: config.id,
    transform: {
      x: config.x,
      y: config.y,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
    },
    visual: {
      type: 'circle' as const,
      radius: config.radius ?? 0.5,
      color: config.color ?? '#333333',
    },
    behaviors: [
      {
        type: 'draggable' as const,
        mode: 'force',
        stiffness: 10,
        damping: 2,
        requireDirectHit: true,
      },
    ],
    tags: ['launcher'],
  };
}

/**
 * Creates a complete launcher setup (entity + rules) for convenience.
 */
export function createLauncherSetup(config: LauncherConfig & {
  launcherId: string;
  launcherX: number;
  launcherY: number;
  launcherRadius?: number;
  launcherColor?: string;
}): {
  entities: ReturnType<typeof createLauncherEntity>;
  rules: GameRule[];
} {
  return {
    entities: createLauncherEntity({
      id: config.launcherId,
      x: config.launcherX,
      y: config.launcherY,
      radius: config.launcherRadius,
      color: config.launcherColor,
    }),
    rules: createLauncherRules(config),
  };
}
