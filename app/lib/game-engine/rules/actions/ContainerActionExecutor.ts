import type { RuleAction, EntityTarget } from '@slopcade/shared';
import type { ActionExecutor } from './ActionExecutor';
import type { RuleContext } from '../types';
import type { ContainerSystem } from '../../systems/ContainerSystem';

export class ContainerActionExecutor implements ActionExecutor<RuleAction> {
  constructor(private containerSystem: ContainerSystem) {}

  execute(action: RuleAction, context: RuleContext): void {
    switch (action.type) {
      case 'container_push':
        this.executeContainerPush(action, context);
        break;
      case 'container_pop':
        this.executeContainerPop(action, context);
        break;
      case 'container_transfer':
        this.executeContainerTransfer(action, context);
        break;
      case 'container_swap':
        this.executeContainerSwap(action, context);
        break;
      case 'container_clear':
        this.executeContainerClear(action, context);
        break;
      case 'container_select':
        this.executeContainerSelect(action, context);
        break;
      case 'container_deselect':
        this.executeContainerDeselect(action, context);
        break;
    }
  }

  private resolveContainerId(container: string, _context: RuleContext): string {
    return this.resolveValue(container);
  }

  private resolveEntityId(item: string | EntityTarget, context: RuleContext): string | null {
    if (typeof item === 'string') {
      return this.resolveValue(item);
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

  private resolveValue(value: string): string {
    if (value.startsWith('$')) {
      const stored = this.containerSystem.getStoredEntityId(value.slice(1));
      if (stored) return stored;
    }
    return value;
  }

  private executeContainerPush(
    action: import('@slopcade/shared').ContainerPushAction,
    context: RuleContext
  ): void {
    const containerId = this.resolveContainerId(action.container, context);
    const entityId = this.resolveEntityId(action.item, context);

    if (!entityId) {
      console.warn(`[ContainerActionExecutor] Could not resolve entity for push action`);
      return;
    }

    const success = this.containerSystem.push(containerId, entityId);

    if (success && action.storeAs) {
      this.containerSystem.storeItem(action.storeAs, entityId);
    }
  }

  private executeContainerPop(
    action: import('@slopcade/shared').ContainerPopAction,
    context: RuleContext
  ): void {
    const containerId = this.resolveContainerId(action.container, context);
    const entityId = this.containerSystem.pop(containerId, action.position ?? 'top');

    if (entityId && action.storeAs) {
      this.containerSystem.storeItem(action.storeAs, entityId);
    }

    if (entityId && action.destroyAfter) {
      context.entityManager.destroyEntity(entityId);
    }
  }

  private executeContainerTransfer(
    action: import('@slopcade/shared').ContainerTransferAction,
    context: RuleContext
  ): void {
    const fromContainer = this.resolveContainerId(action.fromContainer, context);
    const toContainer = this.resolveContainerId(action.toContainer, context);

    let entityId: string | null = null;

    if (action.item) {
      entityId = this.resolveEntityId(action.item, context);
    } else {
      entityId = this.containerSystem.pop(fromContainer, action.fromPosition ?? 'top');
    }

    if (!entityId) {
      console.warn(`[ContainerActionExecutor] Could not resolve entity for transfer action`);
      return;
    }

    const success = this.containerSystem.push(toContainer, entityId);

    if (success && action.storeAs) {
      this.containerSystem.storeItem(action.storeAs, entityId);
    }
  }

  private executeContainerSwap(
    _action: import('@slopcade/shared').ContainerSwapAction,
    _context: RuleContext
  ): void {
    console.warn('[ContainerActionExecutor] container_swap not yet implemented');
  }

  private executeContainerClear(
    action: import('@slopcade/shared').ContainerClearAction,
    context: RuleContext
  ): void {
    const containerId = this.resolveContainerId(action.container, context);
    const container = this.containerSystem.getContainer(containerId);
    if (!container) return;

    const items = this.containerSystem.getItems(containerId);

    if (action.keep) {
      const toRemove = items.slice(0, -action.keep);

      for (const item of toRemove) {
        const containerIdOfItem = this.containerSystem.getContainerId(item.id);
        if (containerIdOfItem === containerId) {
          this.containerSystem.removeById(containerId, item.id);
          if (action.destroy) {
            context.entityManager.destroyEntity(item.id);
          }
        }
      }
    } else {
      for (const item of items) {
        const containerIdOfItem = this.containerSystem.getContainerId(item.id);
        if (containerIdOfItem === containerId) {
          this.containerSystem.removeById(containerId, item.id);
          if (action.destroy) {
            context.entityManager.destroyEntity(item.id);
          }
        }
      }
    }
  }

  private executeContainerSelect(
    action: import('@slopcade/shared').ContainerSelectAction,
    context: RuleContext
  ): void {
    const containerId = this.resolveContainerId(action.container, context);
    this.containerSystem.selectSlot(containerId, action.index);
  }

  private executeContainerDeselect(
    action: import('@slopcade/shared').ContainerDeselectAction,
    context: RuleContext
  ): void {
    const containerId = this.resolveContainerId(action.container, context);
    this.containerSystem.deselect(containerId);
  }
}
