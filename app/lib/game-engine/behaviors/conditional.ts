import type { ConditionalBehaviorCondition } from '@slopcade/shared';
import type { RuntimeEntity } from '../types';

/**
 * Evaluates a single conditional behavior condition against an entity.
 * Tags-first design: hasTag is primary, expressions are escape hatch.
 * 
 * @param condition - The condition to evaluate
 * @param entity - The entity to check against
 * @returns true if the condition is satisfied
 */
export function evaluateCondition(
  condition: ConditionalBehaviorCondition,
  entity: RuntimeEntity
): boolean {
  if (condition.hasTag !== undefined) {
    if (!entity.tags.includes(condition.hasTag)) {
      return false;
    }
  }

  if (condition.hasAnyTag !== undefined && condition.hasAnyTag.length > 0) {
    const hasAny = condition.hasAnyTag.some(tag => entity.tags.includes(tag));
    if (!hasAny) {
      return false;
    }
  }

  if (condition.hasAllTags !== undefined && condition.hasAllTags.length > 0) {
    const hasAll = condition.hasAllTags.every(tag => entity.tags.includes(tag));
    if (!hasAll) {
      return false;
    }
  }

  if (condition.lacksTag !== undefined) {
    if (entity.tags.includes(condition.lacksTag)) {
      return false;
    }
  }

  // Skip expr for now - escape hatch for later implementation
  // if (condition.expr !== undefined) { ... }

  return true;
}

/**
 * Recomputes which conditional behavior group should be active for an entity.
 * Only ONE group is active at a time (exclusive by priority).
 * Higher priority wins when multiple conditions match.
 * 
 * CRITICAL: This should only be called on tag change, NOT per-frame.
 * 
 * @param entity - The entity to evaluate
 * @returns Index of the winning conditional behavior group, or -1 if none match
 */
export function recomputeActiveConditionalGroup(entity: RuntimeEntity): number {
  if (entity.conditionalBehaviors.length === 0) {
    return -1;
  }

  // Create array of [index, priority] pairs for groups that match
  const matchingGroups: Array<{ index: number; priority: number }> = [];

  for (let i = 0; i < entity.conditionalBehaviors.length; i++) {
    const group = entity.conditionalBehaviors[i];
    if (evaluateCondition(group.when, entity)) {
      matchingGroups.push({ index: i, priority: group.priority });
    }
  }

  if (matchingGroups.length === 0) {
    return -1;
  }

  // Sort by priority descending (higher wins)
  matchingGroups.sort((a, b) => b.priority - a.priority);

  return matchingGroups[0].index;
}
