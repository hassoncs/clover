import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityManager } from '../EntityManager';
import { resetGlobalTagRegistry } from '@slopcade/shared';

const mockPhysics = {
  createBody: vi.fn(() => ({ value: 1 })),
  createFixture: vi.fn(() => ({ value: 1 })),
  addFixture: vi.fn(() => ({ value: 1 })),
  destroyBody: vi.fn(),
  getTransform: vi.fn(() => ({ position: { x: 0, y: 0 }, angle: 0 })),
  queryAABB: vi.fn(() => []),
} as any;

const mockGetEntityByBodyId = vi.fn();

describe('EntityManager Query Operations', () => {
  let entityManager: EntityManager;

  beforeEach(() => {
    resetGlobalTagRegistry();
    entityManager = new EntityManager(mockPhysics);
    (entityManager as any).getEntityByBodyId = mockGetEntityByBodyId;
    vi.clearAllMocks();
  });

  describe('query by tags only', () => {
    it('should return entities with single tag', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        name: 'Entity 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      entityManager.addTag('entity-1', 'player');
      entityManager.addTag('entity-2', 'enemy');

      const result = entityManager.query({ tags: ['player'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-1');
    });

    it('should return entities matching multiple tags (AND logic)', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        name: 'Entity 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity3 = entityManager.createEntity({
        id: 'entity-3',
        name: 'Entity 3',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      entityManager.addTag('entity-1', 'player');
      entityManager.addTag('entity-1', 'alive');
      entityManager.addTag('entity-2', 'player');
      entityManager.addTag('entity-3', 'enemy');

      const result = entityManager.query({ tags: ['player', 'alive'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-1');
    });

    it('should return empty array when no entities match tags', () => {
      entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      entityManager.addTag('entity-1', 'player');

      const result = entityManager.query({ tags: ['nonexistent'] });

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no entities match all tags', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      entityManager.addTag('entity-1', 'player');

      const result = entityManager.query({ tags: ['player', 'nonexistent'] });

      expect(result).toHaveLength(0);
    });
  });

  describe('query by template only', () => {
    it('should return entities matching template', () => {
      entityManager.createEntity({
        id: 'entity-1',
        template: 'coin',
        name: 'Coin 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      entityManager.createEntity({
        id: 'entity-2',
        template: 'coin',
        name: 'Coin 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      entityManager.createEntity({
        id: 'entity-3',
        template: 'enemy',
        name: 'Enemy 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result = entityManager.query({ template: 'coin' });

      expect(result).toHaveLength(2);
      expect(result.every(e => e.template === 'coin')).toBe(true);
    });

    it('should return empty array for non-existent template', () => {
      entityManager.createEntity({
        id: 'entity-1',
        template: 'coin',
        name: 'Coin 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result = entityManager.query({ template: 'nonexistent' });

      expect(result).toHaveLength(0);
    });
  });

  describe('query by has (components) only', () => {
    beforeEach(() => {
      mockPhysics.queryAABB = vi.fn(() => []);
    });

    it('should return entities with visual component', () => {
      const entityWithVisual = entityManager.createEntity({
        id: 'entity-visual',
        name: 'Visual Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });
      entityManager.createEntity({
        id: 'entity-no-visual',
        name: 'No Visual Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result = entityManager.query({ has: ['visual'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-visual');
    });

    it('should return entities with physics component', () => {
      entityManager.createEntity({
        id: 'entity-no-physics',
        name: 'No Physics Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entityWithPhysics = entityManager.createEntity({
        id: 'entity-physics',
        name: 'Physics Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });

      const result = entityManager.query({ has: ['physics'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-physics');
    });

    it('should return entities with bodyId component', () => {
      entityManager.createEntity({
        id: 'entity-no-body',
        name: 'No Body Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entityWithBody = entityManager.createEntity({
        id: 'entity-body',
        name: 'Body Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });

      (entityWithBody as any).bodyId = 42;

      const result = entityManager.query({ has: ['bodyId'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-body');
    });

    it('should return entities with collider component', () => {
      entityManager.createEntity({
        id: 'entity-no-collider',
        name: 'No Collider Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entityWithCollider = entityManager.createEntity({
        id: 'entity-collider',
        name: 'Collider Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        collider: { shape: 'box', width: 1, height: 1 },
      });

      const result = entityManager.query({ has: ['collider'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-collider');
    });

    it('should return entities with zone component', () => {
      entityManager.createEntity({
        id: 'entity-no-zone',
        name: 'No Zone Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entityWithZone = entityManager.createEntity({
        id: 'entity-zone',
        name: 'Zone Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        zone: { shape: { type: 'box', width: 2, height: 2 } },
      });

      const result = entityManager.query({ has: ['zone'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-zone');
    });

    it('should return entities matching multiple components (AND logic)', () => {
      const entityVisualOnly = entityManager.createEntity({
        id: 'entity-visual-only',
        name: 'Visual Only',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });
      const entityPhysicsOnly = entityManager.createEntity({
        id: 'entity-physics-only',
        name: 'Physics Only',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });
      const entityBoth = entityManager.createEntity({
        id: 'entity-both',
        name: 'Both',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });

      const result = entityManager.query({ has: ['visual', 'physics'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-both');
    });

    it('should return empty array when no entities match components', () => {
      entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });

      const result = entityManager.query({ has: ['physics', 'bodyId'] });

      expect(result).toHaveLength(0);
    });
  });

  describe('query by withinAabb only', () => {
    it('should return entities within AABB bounds', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 2, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        name: 'Entity 2',
        transform: { x: 8, y: 8, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity3 = entityManager.createEntity({
        id: 'entity-3',
        name: 'Entity 3',
        transform: { x: 15, y: 15, angle: 0, scaleX: 1, scaleY: 1 },
      });

      mockPhysics.queryAABB.mockReturnValue([{ value: 1 }, { value: 2 }]);
      mockGetEntityByBodyId.mockImplementation((bodyId: any) => {
        if (bodyId.value === 1) return entity1;
        if (bodyId.value === 2) return entity2;
        return undefined;
      });

      const result = entityManager.query({
        withinAabb: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } },
      });

      expect(result).toHaveLength(2);
      expect(result.map(e => e.id)).toContain('entity-1');
      expect(result.map(e => e.id)).toContain('entity-2');
      expect(result.map(e => e.id)).not.toContain('entity-3');
    });

    it('should return empty array when no entities in AABB', () => {
      const entity = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 50, y: 50, angle: 0, scaleX: 1, scaleY: 1 },
      });

      mockPhysics.queryAABB = vi.fn(() => []);

      const result = entityManager.query({
        withinAabb: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } },
      });

      expect(result).toHaveLength(0);
    });
  });

  describe('query combinations of filters', () => {

    it('should combine tags and template filters', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        template: 'coin',
        name: 'Coin 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        template: 'coin',
        name: 'Coin 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity3 = entityManager.createEntity({
        id: 'entity-3',
        template: 'enemy',
        name: 'Enemy 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });

      entityManager.addTag('entity-1', 'collectible');
      entityManager.addTag('entity-2', 'collectible');
      entityManager.addTag('entity-3', 'collectible');

      const result = entityManager.query({ tags: ['collectible'], template: 'coin' });

      expect(result).toHaveLength(2);
      expect(result.every(e => e.template === 'coin')).toBe(true);
    });

    it('should combine tags and has filters', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        name: 'Entity 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });
      const entity3 = entityManager.createEntity({
        id: 'entity-3',
        name: 'Entity 3',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });

      entityManager.addTag('entity-1', 'static');
      entityManager.addTag('entity-2', 'dynamic');
      entityManager.addTag('entity-3', 'dynamic');

      const result = entityManager.query({ tags: ['dynamic'], has: ['physics'] });

      expect(result).toHaveLength(2);
      expect(result.every(e => e.tags.includes('dynamic'))).toBe(true);
    });

    it('should combine template and has filters', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        template: 'wall',
        name: 'Wall 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        template: 'wall',
        name: 'Wall 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
        physics: { bodyType: 'static' },
        collider: { shape: 'box', width: 1, height: 1 },
      });
      const entity3 = entityManager.createEntity({
        id: 'entity-3',
        template: 'player',
        name: 'Player 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });

      const result = entityManager.query({ template: 'wall', has: ['visual', 'physics'] });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-2');
    });

    it('should combine tags, template, and has filters', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        template: 'coin',
        name: 'Coin 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'circle', radius: 0.5, color: '#ffff00' },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        template: 'coin',
        name: 'Coin 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'circle', radius: 0.5, color: '#ffff00' },
      });
      const entity3 = entityManager.createEntity({
        id: 'entity-3',
        template: 'coin',
        name: 'Coin 3',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'circle', radius: 0.5, color: '#ffff00' },
      });

      entityManager.addTag('entity-1', 'collectible');
      entityManager.addTag('entity-1', 'golden');
      entityManager.addTag('entity-2', 'collectible');
      entityManager.addTag('entity-3', 'expired');

      const result = entityManager.query({
        tags: ['collectible', 'golden'],
        template: 'coin',
        has: ['visual'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-1');
    });

    it('should combine withinAabb with other filters', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 2, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        name: 'Entity 2',
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });
      const entity3 = entityManager.createEntity({
        id: 'entity-3',
        name: 'Entity 3',
        transform: { x: 15, y: 15, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });

      mockPhysics.queryAABB.mockReturnValue([{ value: 1 }, { value: 2 }]);
      mockGetEntityByBodyId.mockImplementation((bodyId: any) => {
        if (bodyId.value === 1) return entity1;
        if (bodyId.value === 2) return entity2;
        return undefined;
      });

      const result = entityManager.query({
        withinAabb: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } },
        has: ['visual'],
      });

      expect(result).toHaveLength(2);
    });

    it('should handle all filter types together', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        template: 'enemy',
        name: 'Enemy 1',
        transform: { x: 2, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        template: 'enemy',
        name: 'Enemy 2',
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });
      const entity3 = entityManager.createEntity({
        id: 'entity-3',
        template: 'enemy',
        name: 'Enemy 3',
        transform: { x: 15, y: 15, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
      });

      entityManager.addTag('entity-1', 'hostile');
      entityManager.addTag('entity-2', 'friendly');
      entityManager.addTag('entity-3', 'hostile');

      mockPhysics.queryAABB.mockReturnValue([{ value: 1 }]);
      mockGetEntityByBodyId.mockImplementation((bodyId: any) => {
        if (bodyId.value === 1) return entity1;
        return undefined;
      });

      const result = entityManager.query({
        tags: ['hostile'],
        template: 'enemy',
        has: ['visual', 'physics'],
        withinAabb: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } },
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-1');
    });
  });

  describe('empty results and edge cases', () => {
    beforeEach(() => {
      mockPhysics.queryAABB.mockReturnValue([]);
    });

    it('should return all entities with empty options object', () => {
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

      const result = entityManager.query({});

      expect(result).toHaveLength(2);
    });

    it('should return all entities with empty arrays', () => {
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

      const result = entityManager.query({ tags: [], has: [] });

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no entities exist', () => {
      const result = entityManager.query({ tags: ['player'] });

      expect(result).toHaveLength(0);
    });

    it('should handle entities with no components', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        name: 'Entity 2',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
      });

      const resultNoComponents = entityManager.query({ has: ['physics', 'bodyId'] });

      expect(resultNoComponents).toHaveLength(0);

      const resultVisualOnly = entityManager.query({ has: ['visual'] });

      expect(resultVisualOnly).toHaveLength(1);
      expect(resultVisualOnly[0].id).toBe('entity-2');
    });

    it('should handle entities with all components', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Full Entity',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        visual: { type: 'rect', width: 1, height: 1, color: '#ff0000' },
        physics: { bodyType: 'dynamic' },
        collider: { shape: 'circle', radius: 0.5 },
        zone: { shape: { type: 'box', width: 2, height: 2 } },
      });

      (entity1 as any).bodyId = 42;

      const result = entityManager.query({
        has: ['visual', 'physics', 'collider', 'zone', 'bodyId'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-1');
    });

    it('should return entities outside AABB when no spatial filter', () => {
      const entity1 = entityManager.createEntity({
        id: 'entity-1',
        name: 'Entity 1',
        transform: { x: 5, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
      });
      const entity2 = entityManager.createEntity({
        id: 'entity-2',
        name: 'Entity 2',
        transform: { x: 50, y: 50, angle: 0, scaleX: 1, scaleY: 1 },
      });

      const result = entityManager.query({});

      expect(result).toHaveLength(2);
      expect(result.map(e => e.id)).toContain('entity-1');
      expect(result.map(e => e.id)).toContain('entity-2');
    });
  });

  describe('performance', () => {
    beforeEach(() => {
      mockPhysics.queryAABB = vi.fn(() => []);
    });

    it('should query 1000 entities by tag in <1ms', () => {
      for (let i = 0; i < 1000; i++) {
        entityManager.createEntity({
          id: `entity-${i}`,
          name: `Entity ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
        entityManager.addTag(`entity-${i}`, 'test:tag');
      }

      const start = performance.now();
      const result = entityManager.query({ tags: ['test:tag'] });
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1);
    });

    it('should query 1000 entities by multiple tags in <5ms', () => {
      for (let i = 0; i < 1000; i++) {
        entityManager.createEntity({
          id: `entity-${i}`,
          name: `Entity ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
        entityManager.addTag(`entity-${i}`, 'tag:a');
        entityManager.addTag(`entity-${i}`, 'tag:b');
      }

      const start = performance.now();
      const result = entityManager.query({ tags: ['tag:a', 'tag:b'] });
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(5);
    });

    it('should query all entities with no filters in <1ms', () => {
      for (let i = 0; i < 1000; i++) {
        entityManager.createEntity({
          id: `entity-${i}`,
          name: `Entity ${i}`,
          transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        });
      }

      const start = performance.now();
      const result = entityManager.query({});
      const duration = performance.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(1);
    });
  });
});
