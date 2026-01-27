import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityManager, combineTransforms, worldToLocal } from '../EntityManager';

// Mock Physics2D
const mockPhysics = {
  createBody: vi.fn(() => ({ value: 1 })),
  createFixture: vi.fn(() => ({ value: 1 })),
  destroyBody: vi.fn(),
  getTransform: vi.fn(() => ({ position: { x: 0, y: 0 }, angle: 0 })),
} as any;

describe('Entity Hierarchy', () => {
  let manager: EntityManager;

  beforeEach(() => {
    manager = new EntityManager(mockPhysics, {
      templates: {
        parent: {
          id: 'parent',
          sprite: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
        },
        child: {
          id: 'child',
          sprite: { type: 'rect', width: 0.5, height: 0.5, color: '#00ff00' },
        },
        parentWithChildren: {
          id: 'parentWithChildren',
          sprite: { type: 'rect', width: 2, height: 2, color: '#0000ff' },
          children: [
            {
              name: 'Child1',
              template: 'child',
              localTransform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            },
            {
              name: 'Child2',
              template: 'child',
              localTransform: { x: -1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            },
          ],
        },
      },
    });
  });

  describe('combineTransforms', () => {
    it('should combine position correctly', () => {
      const parent = { x: 5, y: 3, angle: 0, scaleX: 1, scaleY: 1 };
      const local = { x: 1, y: 2, angle: 0, scaleX: 1, scaleY: 1 };
      const world = combineTransforms(parent, local);
      expect(world.x).toBeCloseTo(6);
      expect(world.y).toBeCloseTo(5);
    });

    it('should rotate child position by parent angle', () => {
      const parent = { x: 0, y: 0, angle: Math.PI / 2, scaleX: 1, scaleY: 1 };
      const local = { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 };
      const world = combineTransforms(parent, local);
      expect(world.x).toBeCloseTo(0);
      expect(world.y).toBeCloseTo(1);
    });

    it('should combine angles additively', () => {
      const parent = { x: 0, y: 0, angle: Math.PI / 4, scaleX: 1, scaleY: 1 };
      const local = { x: 0, y: 0, angle: Math.PI / 4, scaleX: 1, scaleY: 1 };
      const world = combineTransforms(parent, local);
      expect(world.angle).toBeCloseTo(Math.PI / 2);
    });

    it('should multiply scales', () => {
      const parent = { x: 0, y: 0, angle: 0, scaleX: 2, scaleY: 3 };
      const local = { x: 0, y: 0, angle: 0, scaleX: 2, scaleY: 2 };
      const world = combineTransforms(parent, local);
      expect(world.scaleX).toBe(4);
      expect(world.scaleY).toBe(6);
    });

    it('should apply parent scale to rotated offset', () => {
      const parent = { x: 0, y: 0, angle: 0, scaleX: 2, scaleY: 3 };
      const local = { x: 1, y: 1, angle: 0, scaleX: 1, scaleY: 1 };
      const world = combineTransforms(parent, local);
      expect(world.x).toBeCloseTo(2); // 1 * 2
      expect(world.y).toBeCloseTo(3); // 1 * 3
    });
  });

  describe('worldToLocal', () => {
    it('should invert combineTransforms', () => {
      const parent = { x: 5, y: 3, angle: Math.PI / 4, scaleX: 2, scaleY: 2 };
      const local = { x: 1, y: 1, angle: Math.PI / 6, scaleX: 0.5, scaleY: 0.5 };
      const world = combineTransforms(parent, local);
      const recovered = worldToLocal(world, parent);
      expect(recovered.x).toBeCloseTo(local.x);
      expect(recovered.y).toBeCloseTo(local.y);
      expect(recovered.angle).toBeCloseTo(local.angle);
      expect(recovered.scaleX).toBeCloseTo(local.scaleX);
      expect(recovered.scaleY).toBeCloseTo(local.scaleY);
    });

    it('should handle zero position', () => {
      const parent = { x: 10, y: 5, angle: 0, scaleX: 1, scaleY: 1 };
      const world = { x: 10, y: 5, angle: 0, scaleX: 1, scaleY: 1 };
      const local = worldToLocal(world, parent);
      expect(local.x).toBeCloseTo(0);
      expect(local.y).toBeCloseTo(0);
    });

    it('should handle rotation', () => {
      const parent = { x: 0, y: 0, angle: Math.PI / 2, scaleX: 1, scaleY: 1 };
      const world = { x: 0, y: 1, angle: Math.PI / 2, scaleX: 1, scaleY: 1 };
      const local = worldToLocal(world, parent);
      expect(local.x).toBeCloseTo(1);
      expect(local.y).toBeCloseTo(0);
      expect(local.angle).toBeCloseTo(0);
    });
  });

  describe('Query Methods', () => {
    it('getParent should return parent entity', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');

      expect(manager.getParent('c1')?.id).toBe('p1');
      expect(manager.getParent('p1')).toBeUndefined();
    });

    it('getParent should return undefined for non-existent entity', () => {
      expect(manager.getParent('nonexistent')).toBeUndefined();
    });

    it('getChildren should return direct children', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child1',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c2',
        name: 'Child2',
        transform: { x: -1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');
      manager.attachChild('p1', 'c2');

      const children = manager.getChildren('p1');
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.id)).toContain('c1');
      expect(children.map((c) => c.id)).toContain('c2');
    });

    it('getChildren should return empty array for entity with no children', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      expect(manager.getChildren('p1')).toEqual([]);
    });

    it('getChildren should return empty array for non-existent entity', () => {
      expect(manager.getChildren('nonexistent')).toEqual([]);
    });

    it('getDescendants should return all nested children', () => {
      manager.createEntity({
        id: 'root',
        name: 'Root',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'child',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'grandchild',
        name: 'Grandchild',
        transform: { x: 2, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('root', 'child');
      manager.attachChild('child', 'grandchild');

      const descendants = manager.getDescendants('root');
      expect(descendants).toHaveLength(2);
      expect(descendants.map((d) => d.id)).toContain('child');
      expect(descendants.map((d) => d.id)).toContain('grandchild');
    });

    it('getDescendants should return empty array for leaf entity', () => {
      manager.createEntity({
        id: 'leaf',
        name: 'Leaf',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      expect(manager.getDescendants('leaf')).toEqual([]);
    });

    it('getRoot should return topmost ancestor', () => {
      manager.createEntity({
        id: 'root',
        name: 'Root',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'child',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'grandchild',
        name: 'Grandchild',
        transform: { x: 2, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('root', 'child');
      manager.attachChild('child', 'grandchild');

      expect(manager.getRoot('grandchild')?.id).toBe('root');
      expect(manager.getRoot('child')?.id).toBe('root');
      expect(manager.getRoot('root')?.id).toBe('root');
    });

    it('getRoot should return undefined for non-existent entity', () => {
      expect(manager.getRoot('nonexistent')).toBeUndefined();
    });

    it('getAncestors should return all ancestors in order', () => {
      manager.createEntity({
        id: 'root',
        name: 'Root',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'child',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'grandchild',
        name: 'Grandchild',
        transform: { x: 2, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('root', 'child');
      manager.attachChild('child', 'grandchild');

      const ancestors = manager.getAncestors('grandchild');
      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe('child');
      expect(ancestors[1].id).toBe('root');
    });

    it('getAncestors should return empty array for root entity', () => {
      manager.createEntity({
        id: 'root',
        name: 'Root',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      expect(manager.getAncestors('root')).toEqual([]);
    });
  });

  describe('Modification Methods', () => {
    it('attachChild should preserve world position by default', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 10, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const childBefore = manager.getEntity('c1')!;
      const worldXBefore = childBefore.worldTransform.x;

      manager.attachChild('p1', 'c1');

      const childAfter = manager.getEntity('c1')!;
      expect(childAfter.worldTransform.x).toBeCloseTo(worldXBefore);
      expect(childAfter.localTransform.x).toBeCloseTo(5); // 10 - 5 = 5
    });

    it('attachChild should use provided local transform', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 10, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
      });

      manager.attachChild('p1', 'c1', { x: 2, y: 3, angle: 0, scaleX: 1, scaleY: 1 });

      const child = manager.getEntity('c1')!;
      expect(child.localTransform.x).toBe(2);
      expect(child.localTransform.y).toBe(3);
      expect(child.worldTransform.x).toBeCloseTo(7); // 5 + 2
      expect(child.worldTransform.y).toBeCloseTo(8); // 5 + 3
    });

    it('attachChild should detach from previous parent', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'p2',
        name: 'Parent2',
        transform: { x: 5, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      manager.attachChild('p1', 'c1');
      expect(manager.getChildren('p1')).toHaveLength(1);

      manager.attachChild('p2', 'c1');
      expect(manager.getChildren('p1')).toHaveLength(0);
      expect(manager.getChildren('p2')).toHaveLength(1);
      expect(manager.getParent('c1')?.id).toBe('p2');
    });

    it('attachChild should warn on missing entities', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      manager.attachChild('nonexistent', 'alsoNonexistent');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('attachChild: Missing entity')
      );

      consoleSpy.mockRestore();
    });

    it('detachChild should preserve world position', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 3, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1', { x: 3, y: 0, angle: 0, scaleX: 1, scaleY: 1 });

      const worldXBefore = manager.getEntity('c1')!.worldTransform.x;

      manager.detachChild('c1');

      const child = manager.getEntity('c1')!;
      expect(child.parentId).toBeUndefined();
      expect(child.worldTransform.x).toBeCloseTo(worldXBefore);
      expect(child.localTransform.x).toBeCloseTo(worldXBefore);
    });

    it('detachChild should remove from parent children array', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');

      expect(manager.getChildren('p1')).toHaveLength(1);

      manager.detachChild('c1');

      expect(manager.getChildren('p1')).toHaveLength(0);
    });

    it('detachChild should handle entity with no parent', () => {
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      // Should not throw
      manager.detachChild('c1');

      const child = manager.getEntity('c1')!;
      expect(child.parentId).toBeUndefined();
    });

    it('reparent should prevent circular references', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');

      // Try to make parent a child of its own child
      manager.reparent('p1', 'c1');

      // Parent should still have no parent
      expect(manager.getEntity('p1')?.parentId).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Would create circular reference')
      );

      consoleSpy.mockRestore();
    });

    it('reparent should move entity to new parent', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'p2',
        name: 'Parent2',
        transform: { x: 10, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 5, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      manager.attachChild('p1', 'c1');
      const worldXBefore = manager.getEntity('c1')!.worldTransform.x;

      manager.reparent('c1', 'p2');

      const child = manager.getEntity('c1')!;
      expect(child.parentId).toBe('p2');
      expect(manager.getChildren('p1')).toHaveLength(0);
      expect(manager.getChildren('p2')).toHaveLength(1);
      expect(child.worldTransform.x).toBeCloseTo(worldXBefore);
    });
  });

  describe('Recursive Entity Creation', () => {
    it('should create children from template', () => {
      const entity = manager.createEntity({
        id: 'p1',
        name: 'ParentWithKids',
        template: 'parentWithChildren',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      expect(entity).toBeDefined();
      const children = manager.getChildren('p1');
      expect(children).toHaveLength(2);
      expect(children[0].parentId).toBe('p1');
      expect(children[1].parentId).toBe('p1');
    });

    it('should set correct local transforms for children', () => {
      manager.createEntity({
        id: 'p1',
        name: 'ParentWithKids',
        template: 'parentWithChildren',
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const children = manager.getChildren('p1');
      const child1 = children.find((c) => c.name === 'Child1');
      const child2 = children.find((c) => c.name === 'Child2');

      expect(child1?.localTransform.x).toBe(1);
      expect(child2?.localTransform.x).toBe(-1);
      expect(child1?.worldTransform.x).toBeCloseTo(6);
      expect(child2?.worldTransform.x).toBeCloseTo(4);
    });

    it('should assign unique IDs to children', () => {
      manager.createEntity({
        id: 'p1',
        name: 'ParentWithKids',
        template: 'parentWithChildren',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const children = manager.getChildren('p1');
      expect(children[0].id).not.toBe(children[1].id);
      expect(children[0].id).toBeTruthy();
      expect(children[1].id).toBeTruthy();
    });
  });

  describe('Cascade Operations', () => {
    it('destroyEntity with recursive should destroy descendants', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');

      manager.destroyEntity('p1', { recursive: true });

      expect(manager.getEntity('p1')).toBeUndefined();
      expect(manager.getEntity('c1')).toBeUndefined();
    });

    it('destroyEntity without recursive should detach children', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');

      manager.destroyEntity('p1', { recursive: false });

      expect(manager.getEntity('p1')).toBeUndefined();
      const child = manager.getEntity('c1');
      expect(child).toBeDefined();
      expect(child?.parentId).toBeUndefined();
    });

    it('destroyEntity recursive should destroy deep hierarchies', () => {
      manager.createEntity({
        id: 'root',
        name: 'Root',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'child',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'grandchild',
        name: 'Grandchild',
        transform: { x: 2, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('root', 'child');
      manager.attachChild('child', 'grandchild');

      manager.destroyEntity('root', { recursive: true });

      expect(manager.getEntity('root')).toBeUndefined();
      expect(manager.getEntity('child')).toBeUndefined();
      expect(manager.getEntity('grandchild')).toBeUndefined();
    });

    it('setEntityVisible with recursive should affect descendants', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');

      manager.setEntityVisible('p1', false, { recursive: true });

      expect(manager.getEntity('p1')?.visible).toBe(false);
      expect(manager.getEntity('c1')?.visible).toBe(false);
    });

    it('setEntityVisible without recursive should only affect target', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');

      manager.setEntityVisible('p1', false, { recursive: false });

      expect(manager.getEntity('p1')?.visible).toBe(false);
      expect(manager.getEntity('c1')?.visible).toBe(true);
    });

    it('setEntityActive with recursive should affect descendants', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1');

      manager.setEntityActive('p1', false, { recursive: true });

      expect(manager.getEntity('p1')?.active).toBe(false);
      expect(manager.getEntity('c1')?.active).toBe(false);
    });
  });

  describe('Transform Propagation', () => {
    it('should update child world transforms when parent moves', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 2, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1', { x: 2, y: 0, angle: 0, scaleX: 1, scaleY: 1 });

      // Move parent
      const parent = manager.getEntity('p1')!;
      parent.localTransform.x = 5;
      parent.worldTransform.x = 5;
      parent.transform.x = 5;
      manager.updateWorldTransforms('p1');

      const child = manager.getEntity('c1')!;
      expect(child.worldTransform.x).toBeCloseTo(7); // 5 + 2
    });

    it('should propagate rotation to children', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1', { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 });

      // Rotate parent 90 degrees
      const parent = manager.getEntity('p1')!;
      parent.localTransform.angle = Math.PI / 2;
      parent.worldTransform.angle = Math.PI / 2;
      parent.transform.angle = Math.PI / 2;
      manager.updateWorldTransforms('p1');

      const child = manager.getEntity('c1')!;
      expect(child.worldTransform.x).toBeCloseTo(0);
      expect(child.worldTransform.y).toBeCloseTo(1);
      expect(child.worldTransform.angle).toBeCloseTo(Math.PI / 2);
    });

    it('should propagate scale to children', () => {
      manager.createEntity({
        id: 'p1',
        name: 'Parent',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'c1',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('p1', 'c1', { x: 1, y: 0, angle: 0, scaleX: 2, scaleY: 2 });

      // Scale parent
      const parent = manager.getEntity('p1')!;
      parent.localTransform.scaleX = 3;
      parent.localTransform.scaleY = 3;
      parent.worldTransform.scaleX = 3;
      parent.worldTransform.scaleY = 3;
      parent.transform.scaleX = 3;
      parent.transform.scaleY = 3;
      manager.updateWorldTransforms('p1');

      const child = manager.getEntity('c1')!;
      expect(child.worldTransform.scaleX).toBeCloseTo(6); // 3 * 2
      expect(child.worldTransform.scaleY).toBeCloseTo(6); // 3 * 2
    });

    it('should propagate transforms through deep hierarchies', () => {
      manager.createEntity({
        id: 'root',
        name: 'Root',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'child',
        name: 'Child',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.createEntity({
        id: 'grandchild',
        name: 'Grandchild',
        transform: { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      manager.attachChild('root', 'child', { x: 1, y: 0, angle: 0, scaleX: 1, scaleY: 1 });
      manager.attachChild('child', 'grandchild', {
        x: 1,
        y: 0,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
      });

      // Move root
      const root = manager.getEntity('root')!;
      root.localTransform.x = 10;
      root.worldTransform.x = 10;
      root.transform.x = 10;
      manager.updateWorldTransforms('root');

      const child = manager.getEntity('child')!;
      const grandchild = manager.getEntity('grandchild')!;
      expect(child.worldTransform.x).toBeCloseTo(11); // 10 + 1
      expect(grandchild.worldTransform.x).toBeCloseTo(12); // 10 + 1 + 1
    });
  });
});
