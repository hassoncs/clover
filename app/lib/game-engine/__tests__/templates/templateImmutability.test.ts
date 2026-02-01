import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityManager } from '../../EntityManager';
import type { Physics2D } from '../../../physics2d/Physics2D';

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const val = (obj as any)[prop];
    if (val && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  });
  return obj;
}

describe('Template Immutability', () => {
  let physics: Physics2D;
  let em: EntityManager;
  const addFixtureCalls: Array<{bodyId: number, def: any}> = [];

  const createTestTemplates = () => ({
    ball: {
      id: 'ball',
      tags: ['ball'],
      physics: {
        bodyType: 'dynamic' as const,
        density: 1,
        linearDamping: 0,
        fixedRotation: true,
        ccd: true,
      },
      collider: {
        shape: 'circle' as const,
        radius: 0.25,
        friction: 0,
        restitution: 1,
      },
    },
    brick: {
      id: 'brick',
      tags: ['brick'],
      physics: {
        bodyType: 'static' as const,
        density: 0,
      },
      collider: {
        shape: 'box' as const,
        width: 1.15,
        height: 0.48,
        friction: 0,
        restitution: 1,
      },
    },
    paddle: {
      id: 'paddle',
      tags: ['paddle'],
      physics: {
        bodyType: 'kinematic' as const,
        density: 0,
        fixedRotation: true,
      },
      collider: {
        shape: 'box' as const,
        width: 2,
        height: 0.4,
        friction: 0,
        restitution: 1,
      },
    },
  });

  beforeEach(() => {
    addFixtureCalls.length = 0;
    
    physics = {
      createBody: vi.fn(() => ({ value: addFixtureCalls.length + 1 })),
      addFixture: vi.fn((bodyId, def) => {
        addFixtureCalls.push({ bodyId: bodyId.value, def });
        return { value: addFixtureCalls.length };
      }),
      destroyBody: vi.fn(),
    } as any;
  });

  it('should not mutate template registry when spawning entities', () => {
    const templates = deepFreeze(createTestTemplates());
    
    expect(() => {
      em = new EntityManager(physics, { templates });
      
      em.createEntity({
        id: 'ball-1',
        name: 'Ball 1',
        template: 'ball',
        transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      
      em.createEntity({
        id: 'brick-1',
        name: 'Brick 1',
        template: 'brick',
        transform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      });
    }).not.toThrow();
  });

  it('should not share collider references between entities from same template', () => {
    const templates = createTestTemplates();
    em = new EntityManager(physics, { templates });
    
    const brick1 = em.createEntity({
      id: 'brick-1',
      name: 'Brick 1',
      template: 'brick',
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    });
    
    const brick2 = em.createEntity({
      id: 'brick-2',
      name: 'Brick 2',
      template: 'brick',
      transform: { x: 5, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    });
    
    expect(brick1.collider).toBeDefined();
    expect(brick2.collider).toBeDefined();
    expect(brick1.collider).not.toBe(brick2.collider);
  });

  it('should maintain separate collider data for different templates', () => {
    const templates = createTestTemplates();
    em = new EntityManager(physics, { templates });
    
    const ball = em.createEntity({
      id: 'ball-1',
      name: 'Ball 1',
      template: 'ball',
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    });
    
    const brick = em.createEntity({
      id: 'brick-1',
      name: 'Brick 1',
      template: 'brick',
      transform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
    });
    
    const paddle = em.createEntity({
      id: 'paddle-1',
      name: 'Paddle 1',
      template: 'paddle',
      transform: { x: 0, y: -8, angle: 0, scaleX: 1, scaleY: 1 },
    });
    
    expect(ball.collider?.shape).toBe('circle');
    expect((ball.collider as any)?.radius).toBe(0.25);
    
    expect(brick.collider?.shape).toBe('box');
    expect((brick.collider as any)?.width).toBe(1.15);
    expect((brick.collider as any)?.height).toBe(0.48);
    
    expect(paddle.collider?.shape).toBe('box');
    expect((paddle.collider as any)?.width).toBe(2);
    expect((paddle.collider as any)?.height).toBe(0.4);
  });

  it('should send correct shape args to addFixture for each entity type', () => {
    const templates = createTestTemplates();
    em = new EntityManager(physics, { templates });
    
    em.createEntity({
      id: 'ball-1',
      name: 'Ball 1',
      template: 'ball',
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    });
    
    em.createEntity({
      id: 'brick-1',
      name: 'Brick 1',
      template: 'brick',
      transform: { x: 5, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
    });
    

    
    expect(addFixtureCalls).toHaveLength(2);
    
    const ballFixture = addFixtureCalls[0].def;
    expect(ballFixture.shape.type).toBe('circle');
    expect(ballFixture.shape.radius).toBe(0.25);
    
    const brickFixture = addFixtureCalls[1].def;
    expect(brickFixture.shape.type).toBe('box');
    expect(brickFixture.shape.halfWidth).toBe(1.15 / 2);
    expect(brickFixture.shape.halfHeight).toBe(0.48 / 2);
  });

  it('should not mutate original template registry after multiple spawns', () => {
    const templates = createTestTemplates();
    const originalBallCollider = JSON.stringify(templates.ball.collider);
    const originalBrickCollider = JSON.stringify(templates.brick.collider);
    
    em = new EntityManager(physics, { templates });
    
    for (let i = 0; i < 10; i++) {
      em.createEntity({
        id: `ball-${i}`,
        name: `Ball ${i}`,
        template: 'ball',
        transform: { x: i, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
      });
      
      em.createEntity({
        id: `brick-${i}`,
        name: `Brick ${i}`,
        template: 'brick',
        transform: { x: i, y: 10, angle: 0, scaleX: 1, scaleY: 1 },
      });
    }
    
    expect(JSON.stringify(templates.ball.collider)).toBe(originalBallCollider);
    expect(JSON.stringify(templates.brick.collider)).toBe(originalBrickCollider);
  });
});
