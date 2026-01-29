/**
 * @file angryBurnsValidators.ts
 * Geometry-based validators for Angry Burns generated tower levels.
 */

import type { GameEntity } from '../types/entity';
import type { ColliderComponent, BoxColliderComponent, CircleColliderComponent } from '../types/physics';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metrics: ValidationMetrics;
}

export interface ValidationMetrics {
  entityCount: number;
  blockCount: number;
  targetCount: number;
  groundCount: number;
  launcherCount: number;
  unsupportedBlockCount: number;
  overlappingPairCount: number;
  outOfBoundsCount: number;
}

export const ANGRY_BURNS_CONSTANTS = {
  WORLD_WIDTH: 20,
  WORLD_HEIGHT: 12,
  GROUND_TOP_Y: 11,
  LAUNCHER_X: 3,
  LAUNCHER_Y: 9,
  BLOCK_WIDTH: 0.8,
  BLOCK_HEIGHT: 0.4,
  TARGET_RADIUS: 0.35,
  OVERLAP_EPSILON: 0.01,
  MIN_SUPPORT_RATIO: 0.3,
  BLOCK_TEMPLATES: ['woodBlock', 'stoneBlock', 'glassBlock'] as const,
  TARGET_TEMPLATE: 'target',
  LAUNCHER_TEMPLATE: 'cannon',
  GROUND_TEMPLATE: 'ground',
} as const;

interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  entityId: string;
  entityName: string;
  template?: string;
  isGround: boolean;
  isStatic: boolean;
}

function getColliderDimensions(entity: GameEntity): { width?: number; height?: number; radius?: number; shape?: string } {
  const collider = entity.collider;
  if (!collider) return {};

  if (collider.shape === 'box' && 'width' in collider && 'height' in collider) {
    return { width: collider.width, height: collider.height, shape: 'box' };
  }
  if (collider.shape === 'circle' && 'radius' in collider) {
    return { radius: collider.radius, shape: 'circle' };
  }
  return {};
}

function getEntityAABB(entity: GameEntity): AABB | null {
  const { transform, physics } = entity;
  const { x, y } = transform;

  const isGround = entity.template === ANGRY_BURNS_CONSTANTS.GROUND_TEMPLATE;
  const isStatic = physics?.bodyType === 'static';

  const colliderDims = getColliderDimensions(entity);

  if (colliderDims.shape === 'circle' && colliderDims.radius) {
    return {
      minX: x - colliderDims.radius,
      minY: y - colliderDims.radius,
      maxX: x + colliderDims.radius,
      maxY: y + colliderDims.radius,
      entityId: entity.id,
      entityName: entity.name,
      template: entity.template,
      isGround,
      isStatic,
    };
  }

  const halfWidth = (colliderDims.width ?? 1) / 2;
  const halfHeight = (colliderDims.height ?? 1) / 2;

  return {
    minX: x - halfWidth,
    minY: y - halfHeight,
    maxX: x + halfWidth,
    maxY: y + halfHeight,
    entityId: entity.id,
    entityName: entity.name,
    template: entity.template,
    isGround,
    isStatic,
  };
}

function aabbsOverlap(a: AABB, b: AABB, epsilon: number = 0): boolean {
  return !(a.maxX + epsilon < b.minX || b.maxX + epsilon < a.minX ||
           a.maxY + epsilon < b.minY || b.maxY + epsilon < a.minY);
}

function calculateHorizontalOverlap(a: AABB, b: AABB): number {
  const overlapLeft = Math.max(a.minX, b.minX);
  const overlapRight = Math.min(a.maxX, b.maxX);
  return Math.max(0, overlapRight - overlapLeft);
}

export function validateBounds(entities: GameEntity[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let outOfBoundsCount = 0;

  const { WORLD_WIDTH, WORLD_HEIGHT } = ANGRY_BURNS_CONSTANTS;

  for (const entity of entities) {
    const aabb = getEntityAABB(entity);
    if (!aabb) continue;

    if (aabb.minX < 0) {
      errors.push(
        `Entity "${entity.id}" (${entity.name}) extends beyond left bound ` +
          `(minX = ${aabb.minX.toFixed(3)} < 0)`
      );
      outOfBoundsCount++;
    }

    if (aabb.maxX > WORLD_WIDTH) {
      errors.push(
        `Entity "${entity.id}" (${entity.name}) extends beyond right bound ` +
          `(maxX = ${aabb.maxX.toFixed(3)} > ${WORLD_WIDTH})`
      );
      outOfBoundsCount++;
    }

    if (aabb.minY < 0) {
      errors.push(
        `Entity "${entity.id}" (${entity.name}) extends beyond top bound ` +
          `(minY = ${aabb.minY.toFixed(3)} < 0)`
      );
      outOfBoundsCount++;
    }

    if (aabb.maxY > WORLD_HEIGHT) {
      errors.push(
        `Entity "${entity.id}" (${entity.name}) extends beyond bottom bound ` +
          `(maxY = ${aabb.maxY.toFixed(3)} > ${WORLD_HEIGHT})`
      );
      outOfBoundsCount++;
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      entityCount: entities.length,
      blockCount: 0,
      targetCount: 0,
      groundCount: 0,
      launcherCount: 0,
      unsupportedBlockCount: 0,
      overlappingPairCount: 0,
      outOfBoundsCount,
    },
  };
}

export function validateOverlap(entities: GameEntity[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let overlappingPairCount = 0;

  const { OVERLAP_EPSILON } = ANGRY_BURNS_CONSTANTS;

  const aabbs: AABB[] = [];
  for (const entity of entities) {
    const aabb = getEntityAABB(entity);
    if (aabb) {
      aabbs.push(aabb);
    }
  }

  for (let i = 0; i < aabbs.length; i++) {
    for (let j = i + 1; j < aabbs.length; j++) {
      const a = aabbs[i];
      const b = aabbs[j];

      if (a.isStatic && b.isStatic) continue;

      if (aabbsOverlap(a, b, OVERLAP_EPSILON)) {
        overlappingPairCount++;

        const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
        const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
        const overlapArea = overlapX * overlapY;

        errors.push(
          `Entities "${a.entityId}" (${a.entityName}) and "${b.entityId}" (${b.entityName}) ` +
            `overlap by ${overlapArea.toFixed(4)} m² (epsilon = ${OVERLAP_EPSILON})`
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      entityCount: entities.length,
      blockCount: 0,
      targetCount: 0,
      groundCount: 0,
      launcherCount: 0,
      unsupportedBlockCount: 0,
      overlappingPairCount,
      outOfBoundsCount: 0,
    },
  };
}

export function validateSupport(entities: GameEntity[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let unsupportedBlockCount = 0;

  const { MIN_SUPPORT_RATIO, BLOCK_WIDTH } = ANGRY_BURNS_CONSTANTS;

  const aabbs: AABB[] = [];
  for (const entity of entities) {
    const aabb = getEntityAABB(entity);
    if (aabb) {
      aabbs.push(aabb);
    }
  }

  for (const block of aabbs) {
    if (block.isGround || block.isStatic) continue;
    if (!block.template || !ANGRY_BURNS_CONSTANTS.BLOCK_TEMPLATES.includes(block.template as typeof ANGRY_BURNS_CONSTANTS.BLOCK_TEMPLATES[number])) {
      continue;
    }

    const blockBottom = block.minY;
    const supportZoneTop = blockBottom;
    const supportZoneBottom = blockBottom - 0.1;

    let totalSupportWidth = 0;
    const supportingEntities: string[] = [];

    for (const potentialSupport of aabbs) {
      if (potentialSupport.entityId === block.entityId) continue;

      if (potentialSupport.maxY <= supportZoneTop && potentialSupport.maxY >= supportZoneBottom) {
        const horizontalOverlap = calculateHorizontalOverlap(block, potentialSupport);
        if (horizontalOverlap > 0) {
          totalSupportWidth += horizontalOverlap;
          supportingEntities.push(potentialSupport.entityName);
        }
      }
    }

    const supportRatio = totalSupportWidth / BLOCK_WIDTH;
    if (supportRatio < MIN_SUPPORT_RATIO) {
      unsupportedBlockCount++;
      errors.push(
        `Block "${block.entityId}" (${block.entityName}) has insufficient support: ` +
          `${(supportRatio * 100).toFixed(1)}% width supported (minimum: ${MIN_SUPPORT_RATIO * 100}%). ` +
          `Supporting entities: ${supportingEntities.length > 0 ? supportingEntities.join(', ') : 'none'}`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      entityCount: entities.length,
      blockCount: 0,
      targetCount: 0,
      groundCount: 0,
      launcherCount: 0,
      unsupportedBlockCount,
      overlappingPairCount: 0,
      outOfBoundsCount: 0,
    },
  };
}

export function validateRequiredEntities(entities: GameEntity[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let hasLauncher = false;
  let hasGround = false;
  let targetCount = 0;
  let groundCount = 0;
  let launcherCount = 0;

  const { LAUNCHER_TEMPLATE, GROUND_TEMPLATE, TARGET_TEMPLATE } = ANGRY_BURNS_CONSTANTS;

  for (const entity of entities) {
    if (entity.template === LAUNCHER_TEMPLATE) {
      hasLauncher = true;
      launcherCount++;
    }
    if (entity.template === GROUND_TEMPLATE) {
      hasGround = true;
      groundCount++;
    }
    if (entity.template === TARGET_TEMPLATE) {
      targetCount++;
    }
  }

  if (!hasLauncher) {
    errors.push(`Missing required entity: launcher (template "${LAUNCHER_TEMPLATE}")`);
  }
  if (!hasGround) {
    errors.push(`Missing required entity: ground (template "${GROUND_TEMPLATE}")`);
  }
  if (targetCount === 0) {
    errors.push(`Missing required entity: at least one target (template "${TARGET_TEMPLATE}")`);
  }

  if (launcherCount > 1) {
    warnings.push(`Multiple launchers found (${launcherCount}) - may cause gameplay issues`);
  }
  if (groundCount > 1) {
    warnings.push(`Multiple ground entities found (${groundCount}) - may cause physics issues`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      entityCount: entities.length,
      blockCount: 0,
      targetCount,
      groundCount,
      launcherCount,
      unsupportedBlockCount: 0,
      overlappingPairCount: 0,
      outOfBoundsCount: 0,
    },
  };
}

function collectMetrics(entities: GameEntity[]): Pick<ValidationMetrics, 'entityCount' | 'blockCount' | 'targetCount' | 'groundCount' | 'launcherCount'> {
  let blockCount = 0;
  let targetCount = 0;
  let groundCount = 0;
  let launcherCount = 0;

  for (const entity of entities) {
    if (entity.template && ANGRY_BURNS_CONSTANTS.BLOCK_TEMPLATES.includes(entity.template as typeof ANGRY_BURNS_CONSTANTS.BLOCK_TEMPLATES[number])) {
      blockCount++;
    }
    if (entity.template === ANGRY_BURNS_CONSTANTS.TARGET_TEMPLATE) {
      targetCount++;
    }
    if (entity.template === ANGRY_BURNS_CONSTANTS.GROUND_TEMPLATE) {
      groundCount++;
    }
    if (entity.template === ANGRY_BURNS_CONSTANTS.LAUNCHER_TEMPLATE) {
      launcherCount++;
    }
  }

  return {
    entityCount: entities.length,
    blockCount,
    targetCount,
    groundCount,
    launcherCount,
  };
}

function mergeResults(results: ValidationResult[]): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const metrics: ValidationMetrics = {
    entityCount: 0,
    blockCount: 0,
    targetCount: 0,
    groundCount: 0,
    launcherCount: 0,
    unsupportedBlockCount: 0,
    overlappingPairCount: 0,
    outOfBoundsCount: 0,
  };

  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    metrics.entityCount = Math.max(metrics.entityCount, result.metrics.entityCount);
    metrics.blockCount = Math.max(metrics.blockCount, result.metrics.blockCount);
    metrics.targetCount = Math.max(metrics.targetCount, result.metrics.targetCount);
    metrics.groundCount = Math.max(metrics.groundCount, result.metrics.groundCount);
    metrics.launcherCount = Math.max(metrics.launcherCount, result.metrics.launcherCount);
    metrics.unsupportedBlockCount += result.metrics.unsupportedBlockCount;
    metrics.overlappingPairCount += result.metrics.overlappingPairCount;
    metrics.outOfBoundsCount += result.metrics.outOfBoundsCount;
  }

  return {
    ok: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    metrics,
  };
}

export function validateAngryBurnsLevel(entities: GameEntity[]): ValidationResult {
  const boundsResult = validateBounds(entities);
  const overlapResult = validateOverlap(entities);
  const supportResult = validateSupport(entities);
  const requiredResult = validateRequiredEntities(entities);

  const merged = mergeResults([boundsResult, overlapResult, supportResult, requiredResult]);

  const baseMetrics = collectMetrics(entities);

  return {
    ok: merged.ok,
    errors: merged.errors,
    warnings: merged.warnings,
    metrics: {
      ...merged.metrics,
      blockCount: baseMetrics.blockCount,
      targetCount: baseMetrics.targetCount,
      groundCount: baseMetrics.groundCount,
      launcherCount: baseMetrics.launcherCount,
    },
  };
}
