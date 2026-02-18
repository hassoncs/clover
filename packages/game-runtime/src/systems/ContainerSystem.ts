import type { EntityManager } from '../EntityManager';
import type { RuntimeEntity } from '../types';
import type { ContainerConfig, ContainerMatchRule, GridCell, Vec2 } from '@slopcade/shared';

interface ContainerSystemOptions {
  containers?: ContainerConfig[];
}

interface StoredItem {
  entityId: string;
  entity: RuntimeEntity | null;
}

type ContainerInstance = 
  | StackContainerInstance 
  | GridContainerInstance 
  | SlotContainerInstance;

interface StackLayout {
  direction: 'vertical' | 'horizontal';
  spacing: number;
  basePosition: Vec2;
  anchor?: 'center' | 'bottom' | 'top' | 'left' | 'right';
}

interface GridLayout {
  origin: Vec2;
  originAnchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

interface SlotLayout {
  direction: 'vertical' | 'horizontal';
  spacing: number;
  basePosition: Vec2;
}

interface StackContainerInstance {
  id: string;
  type: 'stack';
  capacity: number;
  items: string[];
  layout: StackLayout;
}

interface GridContainerInstance {
  id: string;
  type: 'grid';
  rows: number;
  cols: number;
  cellSize: number;
  origin: Vec2;
  originAnchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  cells: (string | null)[][];
  matchTagPattern?: string;
  minMatch?: number;
}

interface SlotContainerInstance {
  id: string;
  type: 'slots';
  count: number;
  selectedIndex: number | null;
  slots: (string | null)[];
  layout: SlotLayout;
  allowEmpty: boolean;
}

const MEMBERSHIP_TAG_PREFIX = 'in-container-';

export class ContainerSystem {
  private entityManager: EntityManager;
  private containers: Map<string, ContainerInstance> = new Map();
  private storedItems: Map<string, StoredItem> = new Map();

  constructor(entityManager: EntityManager, options: ContainerSystemOptions = {}) {
    this.entityManager = entityManager;
    if (options.containers) {
      for (const config of options.containers) {
        this.createContainer(config);
      }
    }
  }

  private createContainer(config: ContainerConfig): ContainerInstance {
    switch (config.type) {
      case 'stack': {
        const instance: StackContainerInstance = {
          id: config.id,
          type: 'stack',
          capacity: config.capacity,
          items: [],
          layout: config.layout,
        };
        this.containers.set(config.id, instance);
        return instance;
      }
      case 'grid': {
        const cells: (string | null)[][] = [];
        for (let row = 0; row < config.rows; row++) {
          cells[row] = [];
          for (let col = 0; col < config.cols; col++) {
            cells[row][col] = null;
          }
        }
        const instance: GridContainerInstance = {
          id: config.id,
          type: 'grid',
          rows: config.rows,
          cols: config.cols,
          cellSize: config.cellSize,
          origin: config.origin,
          originAnchor: config.originAnchor ?? 'top-left',
          cells,
          matchTagPattern: config.matchTagPattern,
          minMatch: config.minMatch ?? 3,
        };
        this.containers.set(config.id, instance);
        return instance;
      }
      case 'slots': {
        const slots: (string | null)[] = [];
        for (let i = 0; i < config.count; i++) {
          slots[i] = null;
        }
        const instance: SlotContainerInstance = {
          id: config.id,
          type: 'slots',
          count: config.count,
          selectedIndex: null,
          slots,
          layout: config.layout,
          allowEmpty: config.allowEmpty ?? true,
        };
        this.containers.set(config.id, instance);
        return instance;
      }
      default:
        throw new Error(`Unknown container type: ${(config as ContainerConfig).type}`);
    }
  }

  getContainer(id: string): ContainerInstance | undefined {
    return this.containers.get(id);
  }

  getAllContainers(): ContainerInstance[] {
    return Array.from(this.containers.values());
  }

  getContainerId(entityId: string): string | null {
    const entity = this.entityManager.getEntity(entityId);
    if (!entity) return null;

    for (const [containerId] of this.containers) {
      const tag = `${MEMBERSHIP_TAG_PREFIX}${containerId}`;
      if (entity.tags.includes(tag)) {
        return containerId;
      }
    }
    return null;
  }

  getItems(containerId: string): RuntimeEntity[] {
    const container = this.containers.get(containerId);
    if (!container) return [];

    switch (container.type) {
      case 'stack':
        return container.items
          .map((id) => this.entityManager.getEntity(id))
          .filter((e): e is RuntimeEntity => e !== null);
      case 'grid': {
        const items: RuntimeEntity[] = [];
        for (let row = 0; row < container.rows; row++) {
          for (let col = 0; col < container.cols; col++) {
            const entityId = container.cells[row][col];
            if (entityId) {
              const entity = this.entityManager.getEntity(entityId);
              if (entity) items.push(entity);
            }
          }
        }
        return items;
      }
      case 'slots':
        return container.slots
          .map((id) => (id ? this.entityManager.getEntity(id) : null))
          .filter((e): e is RuntimeEntity => e !== null);
    }
  }

  getCount(containerId: string): number {
    const container = this.containers.get(containerId);
    if (!container) return 0;

    switch (container.type) {
      case 'stack':
        return container.items.length;
      case 'grid': {
        let count = 0;
        for (let row = 0; row < container.rows; row++) {
          for (let col = 0; col < container.cols; col++) {
            if (container.cells[row][col]) count++;
          }
        }
        return count;
      }
      case 'slots':
        return container.slots.filter((s) => s !== null).length;
    }
  }

  isEmpty(containerId: string): boolean {
    return this.getCount(containerId) === 0;
  }

  isFull(containerId: string): boolean {
    const container = this.containers.get(containerId);
    if (!container) return true;

    switch (container.type) {
      case 'stack':
        return container.items.length >= container.capacity;
      case 'grid':
        for (let row = 0; row < container.rows; row++) {
          for (let col = 0; col < container.cols; col++) {
            if (!container.cells[row][col]) return false;
          }
        }
        return true;
      case 'slots':
        return container.slots.every((s) => s !== null);
    }
  }

  getTopItem(containerId: string): RuntimeEntity | null {
    const container = this.containers.get(containerId);
    if (!container) return null;

    switch (container.type) {
      case 'stack': {
        if (container.items.length === 0) return null;
        const topId = container.items[container.items.length - 1];
        return this.entityManager.getEntity(topId) ?? null;
      }
      case 'grid': {
        for (let row = container.rows - 1; row >= 0; row--) {
          for (let col = 0; col < container.cols; col++) {
            const entityId = container.cells[row][col];
            if (entityId) {
              return this.entityManager.getEntity(entityId) ?? null;
            }
          }
        }
        return null;
      }
      case 'slots':
        return null;
    }
  }

  push(containerId: string, entityId: string, position?: Vec2): boolean {
    const container = this.containers.get(containerId);
    if (!container) return false;

    const entity = this.entityManager.getEntity(entityId);
    if (!entity) return false;

    switch (container.type) {
      case 'stack':
        return this.pushToStack(container, entity, position);
      case 'grid':
        return this.pushToFirstEmptyGrid(container, entity, position);
      case 'slots':
        return this.pushToFirstEmptySlot(container, entity, position);
    }
  }

  private pushToStack(
    container: StackContainerInstance,
    entity: RuntimeEntity,
    position?: Vec2
  ): boolean {
    if (container.items.length >= container.capacity) return false;

    this.addMembershipTag(entity, container.id);
    container.items.push(entity.id);

    const targetPos = position ?? this.computeStackPosition(container, container.items.length - 1);
    entity.transform.x = targetPos.x;
    entity.transform.y = targetPos.y;

    return true;
  }

  private pushToFirstEmptyGrid(
    container: GridContainerInstance,
    entity: RuntimeEntity,
    position?: Vec2
  ): boolean {
    for (let row = 0; row < container.rows; row++) {
      for (let col = 0; col < container.cols; col++) {
        if (!container.cells[row][col]) {
          this.addMembershipTag(entity, container.id);
          container.cells[row][col] = entity.id;

          const targetPos = position ?? this.computeGridPosition(container, row, col);
          entity.transform.x = targetPos.x;
          entity.transform.y = targetPos.y;

          return true;
        }
      }
    }
    return false;
  }

  private pushToFirstEmptySlot(
    container: SlotContainerInstance,
    entity: RuntimeEntity,
    position?: Vec2
  ): boolean {
    for (let i = 0; i < container.slots.length; i++) {
      if (!container.slots[i]) {
        this.addMembershipTag(entity, container.id);
        container.slots[i] = entity.id;

        const targetPos = position ?? this.computeSlotPosition(container, i);
        entity.transform.x = targetPos.x;
        entity.transform.y = targetPos.y;

        return true;
      }
    }
    return false;
  }

  pop(containerId: string, position: 'top' | 'selected' | number = 'top'): string | null {
    const container = this.containers.get(containerId);
    if (!container) return null;

    switch (container.type) {
      case 'stack':
        return this.popFromStack(container);
      case 'slots': {
        const slotIndex = position === 'selected' ? container.selectedIndex : position;
        return this.popFromSlot(container, slotIndex as number);
      }
      default:
        return null;
    }
  }

  private popFromStack(container: StackContainerInstance): string | null {
    if (container.items.length === 0) return null;

    const entityId = container.items.pop()!;
    const entity = this.entityManager.getEntity(entityId);
    if (entity) {
      this.removeMembershipTag(entity, container.id);
    }

    return entityId;
  }

  private popFromSlot(container: SlotContainerInstance, index: number): string | null {
    if (index < 0 || index >= container.slots.length) return null;
    if (!container.slots[index]) return null;

    const entityId = container.slots[index]!;
    container.slots[index] = null;
    const entity = this.entityManager.getEntity(entityId);
    if (entity) {
      this.removeMembershipTag(entity, container.id);
    }

    return entityId;
  }

  place(containerId: string, entityId: string, position: GridCell | number): boolean {
    const container = this.containers.get(containerId);
    if (!container) return false;

    const entity = this.entityManager.getEntity(entityId);
    if (!entity) return false;

    if (container.type === 'grid') {
      const cell = typeof position === 'number' 
        ? this.getGridBottomCell(container, position) 
        : position;
      
      if (cell.row < 0 || cell.row >= container.rows || 
          cell.col < 0 || cell.col >= container.cols) {
        return false;
      }

      if (container.cells[cell.row][cell.col]) return false;

      this.addMembershipTag(entity, container.id);
      container.cells[cell.row][cell.col] = entity.id;

      const targetPos = this.computeGridPosition(container, cell.row, cell.col);
      entity.transform.x = targetPos.x;
      entity.transform.y = targetPos.y;

      return true;
    }

    return false;
  }

  remove(containerId: string, position: GridCell | number): string | null {
    const container = this.containers.get(containerId);
    if (!container) return null;

    if (container.type === 'grid') {
      const cell = typeof position === 'number' 
        ? this.getGridBottomCell(container, position) 
        : position;
      
      if (cell.row < 0 || cell.row >= container.rows || 
          cell.col < 0 || cell.col >= container.cols) {
        return null;
      }

      const entityId = container.cells[cell.row][cell.col];
      if (!entityId) return null;

      container.cells[cell.row][cell.col] = null;
      const entity = this.entityManager.getEntity(entityId);
      if (entity) {
        this.removeMembershipTag(entity, container.id);
      }

      return entityId;
    }

    return null;
  }

  removeById(containerId: string, entityId: string): boolean {
    const container = this.containers.get(containerId);
    if (!container) return false;

    switch (container.type) {
      case 'stack': {
        const index = container.items.indexOf(entityId);
        if (index === -1) return false;
        container.items.splice(index, 1);
        const entity = this.entityManager.getEntity(entityId);
        if (entity) {
          this.removeMembershipTag(entity, container.id);
        }
        return true;
      }
      case 'grid': {
        for (let row = 0; row < container.rows; row++) {
          for (let col = 0; col < container.cols; col++) {
            if (container.cells[row][col] === entityId) {
              container.cells[row][col] = null;
              const entity = this.entityManager.getEntity(entityId);
              if (entity) {
                this.removeMembershipTag(entity, container.id);
              }
              return true;
            }
          }
        }
        return false;
      }
      case 'slots': {
        const index = container.slots.indexOf(entityId);
        if (index === -1) return false;
        container.slots[index] = null;
        const entity = this.entityManager.getEntity(entityId);
        if (entity) {
          this.removeMembershipTag(entity, container.id);
        }
        return true;
      }
    }
  }

  private getGridBottomCell(container: GridContainerInstance, col: number): GridCell {
    for (let row = container.rows - 1; row >= 0; row--) {
      if (container.cells[row][col] === null) {
        return { row, col };
      }
    }
    return { row: container.rows - 1, col };
  }

  canAccept(containerId: string, entityId: string, match?: ContainerMatchRule): boolean {
    const container = this.containers.get(containerId);
    if (!container) return false;

    const entity = this.entityManager.getEntity(entityId);
    if (!entity) return false;

    switch (container.type) {
      case 'stack':
        return this.canPushToStack(container, entity, match);
      case 'grid':
        return !this.isFull(containerId);
      case 'slots':
        return !this.isFull(containerId);
    }
  }

  private canPushToStack(
    container: StackContainerInstance,
    entity: RuntimeEntity,
    match?: ContainerMatchRule
  ): boolean {
    if (container.items.length >= container.capacity) return false;

    if (!match) return true;
    if (match.allowEmpty !== false && container.items.length === 0) return true;

    const topEntity = this.getTopItem(container.id);
    if (!topEntity) return match.allowEmpty !== false;

    return this.matchEntities(topEntity, entity, match);
  }

  private matchEntities(
    topEntity: RuntimeEntity, 
    newEntity: RuntimeEntity, 
    match: ContainerMatchRule
  ): boolean {
    if (match.tag) {
      const tagPattern = match.tag.replace('*', '');
      // Find the full tag that starts with the pattern
      const topTag = topEntity.tags.find((t) => t.startsWith(tagPattern));
      const newTag = newEntity.tags.find((t) => t.startsWith(tagPattern));
      
      // Both must have a matching tag
      if (!topTag || !newTag) return false;
      
      // For wildcard patterns, the tags must be exactly equal
      // e.g., "color-*" matches only if both have "color-0" or both have "color-1"
      if (match.tag.includes('*') && topTag !== newTag) return false;
    }

    if (match.excludeTag) {
      const excludePattern = match.excludeTag.replace('*', '');
      const newHasExclude = newEntity.tags.some((t) => t.startsWith(excludePattern));
      if (newHasExclude) return false;
    }

    return true;
  }

  selectSlot(
    containerId: string, 
    index: number | 'next' | 'previous' | 'first' | 'last'
  ): boolean {
    const container = this.containers.get(containerId);
    if (!container || container.type !== 'slots') return false;

    let targetIndex: number | null = null;

    switch (index) {
      case 'next':
        targetIndex = container.selectedIndex !== null
          ? (container.selectedIndex + 1) % container.count
          : 0;
        break;
      case 'previous':
        targetIndex = container.selectedIndex !== null
          ? (container.selectedIndex - 1 + container.count) % container.count
          : container.count - 1;
        break;
      case 'first':
        targetIndex = 0;
        break;
      case 'last':
        targetIndex = container.count - 1;
        break;
      default:
        if (index >= 0 && index < container.count) {
          targetIndex = index;
        }
    }

    if (targetIndex !== null && targetIndex >= 0 && targetIndex < container.count) {
      container.selectedIndex = targetIndex;
      return true;
    }

    return false;
  }

  deselect(containerId: string): boolean {
    const container = this.containers.get(containerId);
    if (!container || container.type !== 'slots') return false;
    container.selectedIndex = null;
    return true;
  }

  storeItem(key: string, entityId: string): void {
    this.storedItems.set(key, {
      entityId,
      entity: this.entityManager.getEntity(entityId) ?? null,
    });
  }

  getStoredItem(key: string): StoredItem | undefined {
    return this.storedItems.get(key);
  }

  getStoredEntityId(key: string): string | null {
    return this.storedItems.get(key)?.entityId ?? null;
  }

  private addMembershipTag(entity: RuntimeEntity, containerId: string): void {
    const tag = `${MEMBERSHIP_TAG_PREFIX}${containerId}`;
    if (!entity.tags.includes(tag)) {
      entity.tags.push(tag);
      this.entityManager.addTag(entity.id, tag);
    }
  }

  private removeMembershipTag(entity: RuntimeEntity, containerId: string): void {
    const tag = `${MEMBERSHIP_TAG_PREFIX}${containerId}`;
    const index = entity.tags.indexOf(tag);
    if (index !== -1) {
      entity.tags.splice(index, 1);
      this.entityManager.removeTag(entity.id, tag);
    }
  }

  private computeStackPosition(container: StackContainerInstance, index: number): Vec2 {
    const { layout } = container;
    const offset = index * layout.spacing;
    return {
      x: layout.basePosition.x + (layout.direction === 'horizontal' ? offset : 0),
      y: layout.basePosition.y + (layout.direction === 'vertical' ? offset : 0),
    };
  }

  private computeGridPosition(
    container: GridContainerInstance, 
    row: number, 
    col: number
  ): Vec2 {
    const { origin, originAnchor, cellSize } = container;
    const halfCell = cellSize / 2;

    let x = origin.x + col * cellSize + halfCell;
    let y = origin.y + row * cellSize + halfCell;

    switch (originAnchor) {
      case 'bottom-left':
        y = origin.y - (container.rows - 1 - row) * cellSize - halfCell;
        break;
      case 'bottom-right':
        x = origin.x - (container.cols - 1 - col) * cellSize - halfCell;
        y = origin.y - (container.rows - 1 - row) * cellSize - halfCell;
        break;
      case 'top-right':
        x = origin.x - (container.cols - 1 - col) * cellSize - halfCell;
        break;
      case 'center':
        x = origin.x + (col - (container.cols - 1) / 2) * cellSize;
        y = origin.y + (row - (container.rows - 1) / 2) * cellSize;
        break;
    }

    return { x, y };
  }

  private computeSlotPosition(container: SlotContainerInstance, index: number): Vec2 {
    const { layout } = container;
    const offset = index * layout.spacing;
    return {
      x: layout.basePosition.x + (layout.direction === 'horizontal' ? offset : 0),
      y: layout.basePosition.y + (layout.direction === 'vertical' ? offset : 0),
    };
  }

  destroy(): void {
    this.containers.clear();
    this.storedItems.clear();
  }
}
