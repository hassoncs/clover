import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityManager } from '../EntityManager';
import { resetGlobalTagRegistry } from '@slopcade/shared';

// Mock Physics2D
const mockPhysics = {
  createBody: vi.fn(() => ({ value: 1 })),
  createFixture: vi.fn(() => ({ value: 1 })),
  destroyBody: vi.fn(),
  getTransform: vi.fn(() => ({ position: { x: 0, y: 0 }, angle: 0 })),
} as any;

describe('EntityManager Tag Operations', () => {
  let entityManager: EntityManager;

  beforeEach(() => {
    resetGlobalTagRegistry();
    entityManager = new EntityManager(mockPhysics);
  });

  describe('addTag', () => {
    it('should add a tag to an entity', () => {
      const entity = entityManager.createEntity({
        id: 'test-entity',
        name: 'Test',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result = entityManager.addTag('test-entity', 'test:tag');

      expect(result).toBe(true);
      expect(entity.tags).toContain('test:tag');
      expect(entityManager.hasTag('test-entity', 'test:tag')).toBe(true);
    });

    it('should return false when adding duplicate tag', () => {
      entityManager.createEntity({
        id: 'test-entity',
        name: 'Test',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      entityManager.addTag('test-entity', 'test:tag');
      const result = entityManager.addTag('test-entity', 'test:tag');

      expect(result).toBe(false);
    });

    it('should return false for non-existent entity', () => {
      const result = entityManager.addTag('nonexistent', 'test:tag');
      expect(result).toBe(false);
    });
  });

  describe('removeTag', () => {
    it('should remove a tag from an entity', () => {
      const entity = entityManager.createEntity({
        id: 'test-entity',
        name: 'Test',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      entityManager.addTag('test-entity', 'test:tag');
      const result = entityManager.removeTag('test-entity', 'test:tag');

      expect(result).toBe(true);
      expect(entity.tags).not.toContain('test:tag');
      expect(entityManager.hasTag('test-entity', 'test:tag')).toBe(false);
    });

    it('should return false when removing non-existent tag', () => {
      entityManager.createEntity({
        id: 'test-entity',
        name: 'Test',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result = entityManager.removeTag('test-entity', 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('hasTag', () => {
    it('should return true for existing tag', () => {
      entityManager.createEntity({
        id: 'test-entity',
        name: 'Test',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      entityManager.addTag('test-entity', 'test:tag');

      expect(entityManager.hasTag('test-entity', 'test:tag')).toBe(true);
    });

    it('should return false for non-existent tag', () => {
      entityManager.createEntity({
        id: 'test-entity',
        name: 'Test',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      expect(entityManager.hasTag('test-entity', 'nonexistent')).toBe(false);
    });

    it('should return false for non-existent entity', () => {
      expect(entityManager.hasTag('nonexistent', 'test:tag')).toBe(false);
    });
  });

  describe('getEntitiesByTag', () => {
    it('should return entities with the specified tag', () => {
      entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      entityManager.createEntity({
        id: 'entity-2',
        name: 'Entity 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      entityManager.createEntity({
        id: 'entity-3',
        name: 'Entity 3',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      entityManager.addTag('entity-1', 'group:a');
      entityManager.addTag('entity-2', 'group:a');
      entityManager.addTag('entity-3', 'group:b');

      const groupA = entityManager.getEntitiesByTag('group:a');

      expect(groupA).toHaveLength(2);
      expect(groupA.map(e => e.id)).toContain('entity-1');
      expect(groupA.map(e => e.id)).toContain('entity-2');
    });

    it('should return empty array for non-existent tag', () => {
      const result = entityManager.getEntitiesByTag('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should query 1000 entities by tag in <1ms', () => {
      // Create 1000 entities
      for (let i = 0; i < 1000; i++) {
        entityManager.createEntity({
          id: `entity-${i}`,
          name: `Entity ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
        entityManager.addTag(`entity-${i}`, 'test:tag');
      }

      // Benchmark query
      const start = performance.now();
      const tagged = entityManager.getEntitiesByTag('test:tag');
      const duration = performance.now() - start;

      expect(tagged).toHaveLength(1000);
      expect(duration).toBeLessThan(1); // <1ms
    });

    it('should handle multiple tags per entity efficiently', () => {
      // Create 100 entities with 10 tags each
      for (let i = 0; i < 100; i++) {
        entityManager.createEntity({
          id: `entity-${i}`,
          name: `Entity ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
        for (let j = 0; j < 10; j++) {
          entityManager.addTag(`entity-${i}`, `tag:${j}`);
        }
      }

      // Query each tag
      const start = performance.now();
      for (let j = 0; j < 10; j++) {
        const tagged = entityManager.getEntitiesByTag(`tag:${j}`);
        expect(tagged).toHaveLength(100);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(10); // <10ms for 10 queries
    });
  });

  describe('Index Cleanup', () => {
    it('should clean up index when entity is destroyed', () => {
      entityManager.createEntity({
        id: 'test-entity',
        name: 'Test',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      entityManager.addTag('test-entity', 'test:tag');

      expect(entityManager.getEntitiesByTag('test:tag')).toHaveLength(1);

      entityManager.destroyEntity('test-entity');

      expect(entityManager.getEntitiesByTag('test:tag')).toHaveLength(0);
    });
  });
});
