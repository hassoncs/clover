import type { RuleCondition, EntityTarget } from '@slopcade/shared';
import type { ConditionEvaluator } from './ConditionEvaluator';
import type { RuleContext } from '../types';
import type { ContainerSystem } from '../../systems/ContainerSystem';

export class ContainerConditionEvaluator implements ConditionEvaluator<RuleCondition> {
  constructor(private containerSystem: ContainerSystem) {}

  evaluate(condition: RuleCondition, context: RuleContext): boolean {
    switch (condition.type) {
      case 'container_is_empty':
        return this.evaluateContainerIsEmpty(condition, context);
      case 'container_is_full':
        return this.evaluateContainerIsFull(condition, context);
      case 'container_count':
        return this.evaluateContainerCount(condition, context);
      case 'container_has_item':
        return this.evaluateContainerHasItem(condition, context);
      case 'container_can_accept':
        return this.evaluateContainerCanAccept(condition, context);
      case 'container_top_item':
        return this.evaluateContainerTopItem(condition, context);
      case 'container_is_occupied':
        return this.evaluateContainerIsOccupied(condition, context);
      default:
        return false;
    }
  }

  private resolveContainerId(container: string, context: RuleContext): string {
    return this.resolveValue(container, context);
  }

  private resolveEntityId(item: string | EntityTarget, context: RuleContext): string | null {
    if (typeof item === 'string') {
      return this.resolveValue(item, context);
    }

    switch (item.type) {
      case 'self':
        return context.currentEntity?.id ?? null;
      case 'by_id':
        return item.entityId;
      case 'by_tag': {
        const entities = context.entityManager.getEntitiesByTag(item.tag);
        return entities[0]?.id ?? null;
      }
      case 'touched':
        return context.input.tap?.targetEntityId ?? null;
      case 'player':
        return context.input.tap?.targetEntityId ?? null;
      case 'other':
        return context.otherEntity?.id ?? null;
      default:
        return null;
    }
  }

  private resolveValue(value: string, context: RuleContext): string {
    if (value.startsWith('$')) {
      const stored = this.containerSystem.getStoredEntityId(value.slice(1));
      if (stored) return stored;
    }
    return value;
  }

  private evaluateContainerIsEmpty(
    condition: import('@slopcade/shared').ContainerIsEmptyCondition,
    _context: RuleContext
  ): boolean {
    const containerId = this.resolveContainerId(condition.container, _context);
    const isEmpty = this.containerSystem.isEmpty(containerId);
    return condition.negated ? !isEmpty : isEmpty;
  }

  private evaluateContainerIsFull(
    condition: import('@slopcade/shared').ContainerIsFullCondition,
    _context: RuleContext
  ): boolean {
    const containerId = this.resolveContainerId(condition.container, _context);
    const isFull = this.containerSystem.isFull(containerId);
    return condition.negated ? !isFull : isFull;
  }

  private evaluateContainerCount(
    condition: import('@slopcade/shared').ContainerCountCondition,
    _context: RuleContext
  ): boolean {
    const containerId = this.resolveContainerId(condition.container, _context);
    const count = this.containerSystem.getCount(containerId);

    switch (condition.comparison) {
      case 'eq':
        return count === condition.value;
      case 'gt':
        return count > condition.value;
      case 'lt':
        return count < condition.value;
      case 'gte':
        return count >= condition.value;
      case 'lte':
        return count <= condition.value;
      case 'neq':
        return count !== condition.value;
      default:
        return false;
    }
  }

  private evaluateContainerHasItem(
    condition: import('@slopcade/shared').ContainerHasItemCondition,
    context: RuleContext
  ): boolean {
    const containerId = this.resolveContainerId(condition.container, context);
    const entityId = this.resolveEntityId(condition.item, context);

    if (!entityId) return condition.negated ?? false;

    const containerIdOfItem = this.containerSystem.getContainerId(entityId);
    const hasItem = containerIdOfItem === containerId;
    return condition.negated ? !hasItem : hasItem;
  }

  private evaluateContainerCanAccept(
    condition: import('@slopcade/shared').ContainerCanAcceptCondition,
    context: RuleContext
  ): boolean {
    const containerId = this.resolveContainerId(condition.container, context);
    const entityId = this.resolveEntityId(condition.item, context);

    if (!entityId) return condition.negated ?? true;

    const canAccept = this.containerSystem.canAccept(containerId, entityId, condition.match);
    return condition.negated ? !canAccept : canAccept;
  }

  private evaluateContainerTopItem(
    condition: import('@slopcade/shared').ContainerTopItemCondition,
    _context: RuleContext
  ): boolean {
    const containerId = this.resolveContainerId(condition.container, _context);
    const topItem = this.containerSystem.getTopItem(containerId);

    if (!topItem) return condition.negated ?? true;

    if (condition.entityId) {
      const matches = topItem.id === condition.entityId;
      return condition.negated ? !matches : matches;
    }

    if (condition.tag) {
      const tagPattern = condition.tag.replace('*', '');
      const hasTag = topItem.tags.some((t) => t.startsWith(tagPattern));
      return condition.negated ? !hasTag : hasTag;
    }

    return condition.negated ? false : true;
  }

  private evaluateContainerIsOccupied(
    condition: import('@slopcade/shared').ContainerIsOccupiedCondition,
    _context: RuleContext
  ): boolean {
    const containerId = this.resolveContainerId(condition.container, _context);
    const container = this.containerSystem.getContainer(containerId);

    if (!container || container.type !== 'grid') {
      return condition.negated ?? true;
    }

    let row = 0, col = 0;
    if (typeof condition.position === 'number') {
      col = condition.position;
      for (let r = container.rows - 1; r >= 0; r--) {
        if (container.cells[r][col] !== null) {
          row = r;
          break;
        }
      }
    } else {
      row = condition.position.row;
      col = condition.position.col;
    }

    if (row < 0 || row >= container.rows || col < 0 || col >= container.cols) {
      return condition.negated ?? true;
    }

    const isOccupied = container.cells[row][col] !== null;
    return condition.negated ? !isOccupied : isOccupied;
  }
}
