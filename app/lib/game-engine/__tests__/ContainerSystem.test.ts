import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContainerSystem } from '../systems/ContainerSystem';
import { EntityManager } from '../EntityManager';
import type { StackContainerConfig, GridContainerConfig, SlotContainerConfig, ContainerMatchRule } from '@slopcade/shared';
import { resetGlobalTagRegistry } from '@slopcade/shared';

// Mock Physics2D
const mockPhysics = {
  createBody: vi.fn(() => ({ value: 1 })),
  createFixture: vi.fn(() => ({ value: 1 })),
  destroyBody: vi.fn(),
  getTransform: vi.fn(() => ({ position: { x: 0, y: 0 }, angle: 0 })),
} as any;

describe('ContainerSystem', () => {
  let entityManager: EntityManager;
  let containerSystem: ContainerSystem;

  beforeEach(() => {
    resetGlobalTagRegistry();
    entityManager = new EntityManager(mockPhysics);
    containerSystem = new ContainerSystem(entityManager);
  });

  describe('Stack Container', () => {
    const stackConfig: StackContainerConfig = {
      id: 'test-stack',
      type: 'stack',
      capacity: 4,
      layout: {
        direction: 'vertical',
        spacing: 1.0,
        basePosition: { x: 0, y: 0 },
        anchor: 'bottom',
      },
    };

    beforeEach(() => {
      containerSystem = new ContainerSystem(entityManager, { containers: [stackConfig] });
    });

    it('should create stack container from config', () => {
      const container = containerSystem.getContainer('test-stack');
      expect(container).toBeDefined();
      expect(container?.type).toBe('stack');
      expect((container as any)?.capacity).toBe(4);
    });

    it('should push items to stack', () => {
      const entity1 = entityManager.createEntity({
        id: 'item-1',
        name: 'Item 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'item-2',
        name: 'Item 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result1 = containerSystem.push('test-stack', 'item-1');
      const result2 = containerSystem.push('test-stack', 'item-2');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(containerSystem.getCount('test-stack')).toBe(2);
    });

    it('should not exceed capacity', () => {
      for (let i = 0; i < 4; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
      }
      entityManager.createEntity({
        id: 'item-4',
        name: 'Item 4',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      for (let i = 0; i < 4; i++) {
        expect(containerSystem.push('test-stack', `item-${i}`)).toBe(true);
      }
      expect(containerSystem.push('test-stack', 'item-4')).toBe(false);
    });

    it('should pop items from stack', () => {
      for (let i = 0; i < 3; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
        containerSystem.push('test-stack', `item-${i}`);
      }

      const popped = containerSystem.pop('test-stack', 'top');

      expect(popped).toBe('item-2');
      expect(containerSystem.getCount('test-stack')).toBe(2);
    });

    it('should return null when popping from empty stack', () => {
      const popped = containerSystem.pop('test-stack', 'top');
      expect(popped).toBeNull();
    });

    it('should track membership via tags', () => {
      const entity = entityManager.createEntity({
        id: 'item-1',
        name: 'Item 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      containerSystem.push('test-stack', 'item-1');

      expect(entity.tags).toContain('in-container-test-stack');
      expect(entityManager.hasTag('item-1', 'in-container-test-stack')).toBe(true);
    });

    it('should remove membership tag on pop', () => {
      const entity = entityManager.createEntity({
        id: 'item-1',
        name: 'Item 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      containerSystem.push('test-stack', 'item-1');
      containerSystem.pop('test-stack', 'top');

      expect(entity.tags).not.toContain('in-container-test-stack');
    });

    it('should report isEmpty correctly', () => {
      expect(containerSystem.isEmpty('test-stack')).toBe(true);

      const entity = entityManager.createEntity({
        id: 'item-1',
        name: 'Item 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      containerSystem.push('test-stack', 'item-1');

      expect(containerSystem.isEmpty('test-stack')).toBe(false);
    });

    it('should report isFull correctly', () => {
      expect(containerSystem.isFull('test-stack')).toBe(false);

      for (let i = 0; i < 4; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
        containerSystem.push('test-stack', `item-${i}`);
      }

      expect(containerSystem.isFull('test-stack')).toBe(true);
    });

    it('should get top item', () => {
      for (let i = 0; i < 3; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: i, angle: 0, scaleX: 1, scaleY: 1 },
        });
        containerSystem.push('test-stack', `item-${i}`);
      }

      const top = containerSystem.getTopItem('test-stack');
      expect(top?.id).toBe('item-2');
    });

    it('should validate match rules', () => {
      const matchRule: ContainerMatchRule = {
        tag: 'color-*',
        allowEmpty: true,
      };

      const redEntity = entityManager.createEntity({
        id: 'red-ball',
        name: 'Red Ball',
        tags: ['color-0'],
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const blueEntity = entityManager.createEntity({
        id: 'blue-ball',
        name: 'Blue Ball',
        tags: ['color-1'],
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const wrongEntity = entityManager.createEntity({
        id: 'wrong-ball',
        name: 'Wrong Ball',
        tags: ['shape-square'],
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      // Empty container should accept any item (allowEmpty: true)
      expect(containerSystem.canAccept('test-stack', 'red-ball', matchRule)).toBe(true);

      // Push red ball
      containerSystem.push('test-stack', 'red-ball');

      // Same color should be accepted
      const red2 = entityManager.createEntity({
        id: 'red-ball-2',
        name: 'Red Ball 2',
        tags: ['color-0'],
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      expect(containerSystem.canAccept('test-stack', 'red-ball-2', matchRule)).toBe(true);

      // Different color should be rejected
      expect(containerSystem.canAccept('test-stack', 'blue-ball', matchRule)).toBe(false);

      // Wrong tag should be rejected
      expect(containerSystem.canAccept('test-stack', 'wrong-ball', matchRule)).toBe(false);
    });

    it('should remove item by entity ID', () => {
      for (let i = 0; i < 3; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
        containerSystem.push('test-stack', `item-${i}`);
      }

      const removed = containerSystem.removeById('test-stack', 'item-1');

      expect(removed).toBe(true);
      expect(containerSystem.getCount('test-stack')).toBe(2);
    });
  });

  describe('Grid Container', () => {
    const gridConfig: GridContainerConfig = {
      id: 'test-grid',
      type: 'grid',
      rows: 3,
      cols: 3,
      cellSize: 1.0,
      origin: { x: 0, y: 0 },
      originAnchor: 'top-left',
    };

    beforeEach(() => {
      containerSystem = new ContainerSystem(entityManager, { containers: [gridConfig] });
    });

    it('should create grid container from config', () => {
      const container = containerSystem.getContainer('test-grid');
      expect(container).toBeDefined();
      expect(container?.type).toBe('grid');
      expect((container as any)?.rows).toBe(3);
      expect((container as any)?.cols).toBe(3);
    });

    it('should push items to first empty cell', () => {
      const entity1 = entityManager.createEntity({
        id: 'item-1',
        name: 'Item 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result = containerSystem.push('test-grid', 'item-1');

      expect(result).toBe(true);
      expect(containerSystem.getCount('test-grid')).toBe(1);
    });

    it('should fill cells row by row', () => {
      for (let i = 0; i < 5; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
      }

      for (let i = 0; i < 5; i++) {
        expect(containerSystem.push('test-grid', `item-${i}`)).toBe(true);
      }

      expect(containerSystem.getCount('test-grid')).toBe(5);
    });

    it('should report isFull when all cells filled', () => {
      for (let i = 0; i < 9; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
        containerSystem.push('test-grid', `item-${i}`);
      }

      expect(containerSystem.isFull('test-grid')).toBe(true);
    });

    it('should place item at specific grid cell', () => {
      const entity = entityManager.createEntity({
        id: 'item-1',
        name: 'Item 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result = containerSystem.place('test-grid', 'item-1', { row: 2, col: 1 });

      expect(result).toBe(true);
      const container = containerSystem.getContainer('test-grid')!;
      expect((container as any).cells[2][1]).toBe('item-1');
    });

    it('should not place on occupied cell', () => {
      const entity1 = entityManager.createEntity({
        id: 'item-1',
        name: 'Item 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'item-2',
        name: 'Item 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      containerSystem.place('test-grid', 'item-1', { row: 1, col: 1 });
      const result = containerSystem.place('test-grid', 'item-2', { row: 1, col: 1 });

      expect(result).toBe(false);
    });

    it('should remove item from grid cell', () => {
      const entity = entityManager.createEntity({
        id: 'item-1',
        name: 'Item 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      containerSystem.place('test-grid', 'item-1', { row: 0, col: 0 });
      const removed = containerSystem.remove('test-grid', { row: 0, col: 0 });

      expect(removed).toBe('item-1');
      const container = containerSystem.getContainer('test-grid')!;
      expect((container as any).cells[0][0]).toBeNull();
    });
  });

  describe('Slot Container', () => {
    const slotConfig: SlotContainerConfig = {
      id: 'test-slots',
      type: 'slots',
      count: 3,
      layout: {
        direction: 'horizontal',
        spacing: 2.0,
        basePosition: { x: 0, y: 0 },
      },
      allowEmpty: true,
    };

    beforeEach(() => {
      containerSystem = new ContainerSystem(entityManager, { containers: [slotConfig] });
    });

    it('should create slots container from config', () => {
      const container = containerSystem.getContainer('test-slots');
      expect(container).toBeDefined();
      expect(container?.type).toBe('slots');
      expect((container as any)?.count).toBe(3);
    });

    it('should push items to first empty slot', () => {
      for (let i = 0; i < 2; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
      }

      expect(containerSystem.push('test-slots', 'item-0')).toBe(true);
      expect(containerSystem.push('test-slots', 'item-1')).toBe(true);
    });

    it('should select slot', () => {
      containerSystem.selectSlot('test-slots', 1);
      const container = containerSystem.getContainer('test-slots')!;
      expect((container as any).selectedIndex).toBe(1);
    });

    it('should deselect slot', () => {
      containerSystem.selectSlot('test-slots', 1);
      containerSystem.deselect('test-slots');
      const container = containerSystem.getContainer('test-slots')!;
      expect((container as any).selectedIndex).toBeNull();
    });

    it('should select next/previous', () => {
      containerSystem.selectSlot('test-slots', 0);
      containerSystem.selectSlot('test-slots', 'next');
      expect((containerSystem.getContainer('test-slots') as any).selectedIndex).toBe(1);

      containerSystem.selectSlot('test-slots', 'next');
      expect((containerSystem.getContainer('test-slots') as any).selectedIndex).toBe(2);

      // Wrap around
      containerSystem.selectSlot('test-slots', 'next');
      expect((containerSystem.getContainer('test-slots') as any).selectedIndex).toBe(0);
    });

    it('should pop from selected slot', () => {
      for (let i = 0; i < 2; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
      }

      containerSystem.push('test-slots', 'item-0');
      containerSystem.push('test-slots', 'item-1');
      containerSystem.selectSlot('test-slots', 1);

      const popped = containerSystem.pop('test-slots', 'selected');
      expect(popped).toBe('item-1');
    });
  });

  describe('Item Storage', () => {
    const stackConfig: StackContainerConfig = {
      id: 'storage-stack',
      type: 'stack',
      capacity: 4,
      layout: {
        direction: 'vertical',
        spacing: 1.0,
        basePosition: { x: 0, y: 0 },
      },
    };

    beforeEach(() => {
      containerSystem = new ContainerSystem(entityManager, { containers: [stackConfig] });
    });

    it('should store and retrieve items', () => {
      entityManager.createEntity({
        id: 'test-item',
        name: 'Test Item',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      containerSystem.storeItem('myKey', 'test-item');

      const stored = containerSystem.getStoredItem('myKey');
      expect(stored?.entityId).toBe('test-item');
      expect(containerSystem.getStoredEntityId('myKey')).toBe('test-item');
    });

    it('should return null for non-existent stored item', () => {
      expect(containerSystem.getStoredEntityId('nonexistent')).toBeNull();
    });
  });

  describe('Container Utility Methods', () => {
    const configs: (StackContainerConfig | GridContainerConfig | SlotContainerConfig)[] = [
      {
        id: 'stack-1',
        type: 'stack',
        capacity: 4,
        layout: { direction: 'vertical', spacing: 1.0, basePosition: { x: 0, y: 0 } },
      },
      {
        id: 'grid-1',
        type: 'grid',
        rows: 3,
        cols: 3,
        cellSize: 1.0,
        origin: { x: 0, y: 0 },
      },
      {
        id: 'slots-1',
        type: 'slots',
        count: 5,
        layout: { direction: 'horizontal', spacing: 2.0, basePosition: { x: 0, y: 0 } },
      },
    ];

    beforeEach(() => {
      containerSystem = new ContainerSystem(entityManager, { containers: configs });
    });

    it('should get all containers', () => {
      const all = containerSystem.getAllContainers();
      expect(all.length).toBe(3);
    });

    it('should get container ID for entity', () => {
      const entity = entityManager.createEntity({
        id: 'entity-in-stack',
        name: 'Entity',
        tags: ['in-container-stack-1'],
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const containerId = containerSystem.getContainerId('entity-in-stack');
      expect(containerId).toBe('stack-1');
    });

    it('should return null for entity not in any container', () => {
      const entity = entityManager.createEntity({
        id: 'orphan-entity',
        name: 'Orphan',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const containerId = containerSystem.getContainerId('orphan-entity');
      expect(containerId).toBeNull();
    });

    it('should get items in container', () => {
      for (let i = 0; i < 3; i++) {
        entityManager.createEntity({
          id: `item-${i}`,
          name: `Item ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
      }

      containerSystem.push('stack-1', 'item-0');
      containerSystem.push('stack-1', 'item-1');
      containerSystem.push('stack-1', 'item-2');

      const items = containerSystem.getItems('stack-1');
      expect(items.length).toBe(3);
    });

    it('should destroy all containers', () => {
      const allBefore = containerSystem.getAllContainers();
      expect(allBefore.length).toBe(3);

      containerSystem.destroy();

      const allAfter = containerSystem.getAllContainers();
      expect(allAfter.length).toBe(0);
    });
  });
});
