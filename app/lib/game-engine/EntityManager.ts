import type { Physics2D } from '../physics2d/Physics2D';
import type { BodyDef, FixtureDef, ShapeDef } from '../physics2d/types';
import type {
  GameEntity,
  EntityTemplate,
  PhysicsComponent,
  Behavior,
} from '@slopcade/shared';
import type { RuntimeEntity, RuntimeBehavior, EntityManagerOptions } from './types';
import { getGlobalTagRegistry } from '@slopcade/shared';
import { recomputeActiveConditionalGroup } from './behaviors/conditional';

interface PooledEntitySlot {
  id: string;
  generation: number;
  entity: RuntimeEntity | null;
}

function generateId(): string {
  return `entity_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class EntityManager {
  private entities = new Map<string, RuntimeEntity>();
  private templates = new Map<string, EntityTemplate>();
  private physics: Physics2D;
  
  private entityPool: PooledEntitySlot[] = [];
  private freeSlots: number[] = [];
  private nextGeneration = 1;
  
  /** Index for O(1) tag queries: tagId -> Set of entityIds */
  private entitiesByTagId = new Map<number, Set<string>>();

  constructor(physics: Physics2D, options: EntityManagerOptions = {}) {
    this.physics = physics;
    if (options.templates) {
      Object.entries(options.templates).forEach(([id, template]) => {
        this.templates.set(id, template);
      });
    }
  }

  registerTemplate(template: EntityTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): EntityTemplate | undefined {
    return this.templates.get(id);
  }

  createEntity(definition: GameEntity): RuntimeEntity {
    const id = definition.id || this.getPooledEntityId();

    if (this.entities.has(id)) {
      throw new Error(`Entity with id "${id}" already exists`);
    }

    const resolved = this.resolveTemplate(definition);
    const runtime = this.createRuntimeEntity(id, resolved);

    if (resolved.physics) {
      this.createPhysicsBody(runtime, resolved.physics);
    }

    this.entities.set(id, runtime);
    return runtime;
  }

  private getPooledEntityId(): string {
    let slotIndex: number;
    
    if (this.freeSlots.length > 0) {
      slotIndex = this.freeSlots.pop()!;
      const slot = this.entityPool[slotIndex];
      slot.generation = this.nextGeneration++;
      slot.entity = null;
      return slot.id;
    } else {
      slotIndex = this.entityPool.length;
      const id = `pooled_${slotIndex}_${this.nextGeneration}`;
      this.entityPool.push({
        id,
        generation: this.nextGeneration++,
        entity: null,
      });
      return id;
    }
  }

  private getSlotIndex(id: string): number {
    return this.entityPool.findIndex(slot => slot.id === id);
  }

  private resolveTemplate(definition: GameEntity): GameEntity {
    if (!definition.template) {
      return definition;
    }

    const template = this.templates.get(definition.template);
    if (!template) {
      console.warn(`Template "${definition.template}" not found, using definition as-is`);
      return definition;
    }

    return {
      ...definition,
      sprite: definition.sprite ?? template.sprite,
      physics: definition.physics ?? template.physics,
      behaviors: definition.behaviors ?? template.behaviors,
      tags: [...(template.tags ?? []), ...(definition.tags ?? [])],
      layer: definition.layer ?? template.layer ?? 0,
    };
  }

    private createRuntimeEntity(id: string, resolved: GameEntity): RuntimeEntity {
      const behaviors: RuntimeBehavior[] = (resolved.behaviors ?? []).map((b: Behavior) => ({
        definition: b,
        enabled: b.enabled !== false,
        state: {},
      }));
  
      return {
        id,
        name: resolved.name,
        template: resolved.template,
        transform: { ...resolved.transform },
        sprite: resolved.sprite,
        physics: resolved.physics,
        behaviors,
        tags: resolved.tags ?? [],
        tagBits: new Set(),
        layer: resolved.layer ?? 0,
        visible: resolved.visible !== false,
        active: resolved.active !== false,
        bodyId: null,
        colliderId: null,
        assetPackId: resolved.assetPackId,
        conditionalBehaviors: [],
        activeConditionalGroupId: -1,
      };
    }

  private createPhysicsBody(entity: RuntimeEntity, physicsConfig: PhysicsComponent): void {
    const bodyDef: BodyDef = {
      type: physicsConfig.bodyType,
      position: { x: entity.transform.x, y: entity.transform.y },
      angle: entity.transform.angle,
      linearDamping: physicsConfig.linearDamping,
      angularDamping: physicsConfig.angularDamping,
      fixedRotation: physicsConfig.fixedRotation,
      bullet: physicsConfig.bullet,
      userData: { entityId: entity.id },
    };

    const bodyId = this.physics.createBody(bodyDef);
    entity.bodyId = bodyId;

    const shapeDef = this.createShapeDef(physicsConfig);
    const fixtureDef: FixtureDef = {
      shape: shapeDef,
      density: physicsConfig.density,
      friction: physicsConfig.friction,
      restitution: physicsConfig.restitution,
      isSensor: physicsConfig.isSensor,
    };

    const colliderId = this.physics.addFixture(bodyId, fixtureDef);
    entity.colliderId = colliderId;

    if (physicsConfig.initialVelocity) {
      this.physics.setLinearVelocity(bodyId, physicsConfig.initialVelocity);
    }
    if (physicsConfig.initialAngularVelocity !== undefined) {
      this.physics.setAngularVelocity(bodyId, physicsConfig.initialAngularVelocity);
    }
  }

  private createShapeDef(physics: PhysicsComponent): ShapeDef {
    switch (physics.shape) {
      case 'circle':
        return {
          type: 'circle',
          radius: physics.radius,
        };
      case 'box':
        return {
          type: 'box',
          halfWidth: physics.width / 2,
          halfHeight: physics.height / 2,
        };
      case 'polygon':
        return {
          type: 'polygon',
          vertices: physics.vertices,
        };
      default:
        throw new Error(`Unknown physics shape: ${(physics as any).shape}`);
    }
  }

  destroyEntity(id: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    if (entity.bodyId) {
      this.physics.destroyBody(entity.bodyId);
    }

    for (const tagId of entity.tagBits) {
      this.entitiesByTagId.get(tagId)?.delete(id);
    }

    this.resetEntityForPooling(entity);
    this.entities.delete(id);
    this.returnEntityToPool(id);
  }

    private resetEntityForPooling(entity: RuntimeEntity): void {
      entity.transform = { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 };
      entity.template = undefined;
      entity.sprite = undefined;
      entity.physics = undefined;
      entity.behaviors = [];
      entity.tags = [];
      entity.tagBits.clear();
      entity.layer = 0;
      entity.visible = true;
      entity.active = true;
      entity.bodyId = null;
      entity.colliderId = null;
      entity.conditionalBehaviors = [];
      entity.activeConditionalGroupId = -1;
    }

  private returnEntityToPool(id: string): void {
    const slotIndex = this.getSlotIndex(id);
    if (slotIndex >= 0) {
      this.freeSlots.push(slotIndex);
    }
  }

  getEntity(id: string): RuntimeEntity | undefined {
    return this.entities.get(id);
  }

  getEntitiesByTag(tag: string): RuntimeEntity[] {
    const tagId = getGlobalTagRegistry().getId(tag);
    if (tagId === undefined) {
      const results: RuntimeEntity[] = [];
      this.entities.forEach((entity) => {
        if (entity.tags.includes(tag)) {
          results.push(entity);
        }
      });
      return results;
    }
    
    const entityIds = this.entitiesByTagId.get(tagId);
    if (!entityIds) return [];
    
    const results: RuntimeEntity[] = [];
    for (const id of entityIds) {
      const entity = this.entities.get(id);
      if (entity) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Adds a tag to an entity. Updates both tags array and tagBits set.
   * Returns true if the tag was added, false if entity already had it.
   */
  addTag(entityId: string, tag: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    
    if (entity.tags.includes(tag)) return false;
    
    entity.tags.push(tag);
    
    const tagId = getGlobalTagRegistry().intern(tag);
    entity.tagBits.add(tagId);
    
    if (!this.entitiesByTagId.has(tagId)) {
      this.entitiesByTagId.set(tagId, new Set());
    }
    this.entitiesByTagId.get(tagId)!.add(entityId);
    
    if (entity.conditionalBehaviors.length > 0) {
      const oldGroupId = entity.activeConditionalGroupId;
      const newGroupId = recomputeActiveConditionalGroup(entity);
      if (oldGroupId !== newGroupId) {
        entity.pendingLifecycleTransition = { oldGroupId, newGroupId };
        entity.activeConditionalGroupId = newGroupId;
      }
    }
    
    return true;
  }

  removeTag(entityId: string, tag: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    
    const index = entity.tags.indexOf(tag);
    if (index === -1) return false;
    
    entity.tags.splice(index, 1);
    
    const tagId = getGlobalTagRegistry().getId(tag);
    if (tagId !== undefined) {
      entity.tagBits.delete(tagId);
      this.entitiesByTagId.get(tagId)?.delete(entityId);
    }
    
    if (entity.conditionalBehaviors.length > 0) {
      const oldGroupId = entity.activeConditionalGroupId;
      const newGroupId = recomputeActiveConditionalGroup(entity);
      if (oldGroupId !== newGroupId) {
        entity.pendingLifecycleTransition = { oldGroupId, newGroupId };
        entity.activeConditionalGroupId = newGroupId;
      }
    }
    
    return true;
  }

  /**
   * Checks if an entity has a specific tag.
   * Uses tagBits for O(1) lookup when possible.
   */
  hasTag(entityId: string, tag: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    
    // Use tagBits for O(1) lookup if tag is interned
    const tagId = getGlobalTagRegistry().getId(tag);
    if (tagId !== undefined) {
      return entity.tagBits.has(tagId);
    }
    
    // Fallback to string array for non-interned tags
    return entity.tags.includes(tag);
  }

  getAllEntities(): RuntimeEntity[] {
    return Array.from(this.entities.values());
  }

  getActiveEntities(): RuntimeEntity[] {
    return this.getAllEntities().filter((e) => e.active);
  }

  getVisibleEntities(): RuntimeEntity[] {
    return this.getAllEntities()
      .filter((e) => e.visible)
      .sort((a, b) => a.layer - b.layer);
  }

  syncTransformsFromPhysics(): void {
    this.entities.forEach((entity) => {
      if (entity.bodyId && entity.active) {
        const transform = this.physics.getTransform(entity.bodyId);
        entity.transform.x = transform.position.x;
        entity.transform.y = transform.position.y;
        entity.transform.angle = transform.angle;
      }
    });
  }

  loadEntities(entities: GameEntity[]): void {
    entities.forEach((e) => {
      this.createEntity(e);
    });
  }

  clearAll(): void {
    const ids = Array.from(this.entities.keys());
    ids.forEach((id) => {
      this.destroyEntity(id);
    });
    this.entitiesByTagId.clear();
  }

  getEntityByBodyId(bodyId: { value: number }): RuntimeEntity | undefined {
    const entities = Array.from(this.entities.values());
    for (const entity of entities) {
      if (entity.bodyId && entity.bodyId.value === bodyId.value) {
        return entity;
      }
    }
    return undefined;
  }

  getEntityCount(): number {
    return this.entities.size;
  }

  getEntityCountByTag(tag: string): number {
    return this.getEntitiesByTag(tag).length;
  }

  getEntitiesInAABB(min: { x: number; y: number }, max: { x: number; y: number }): RuntimeEntity[] {
    const bodyIds = this.physics.queryAABB(min, max);
    
    const entities: RuntimeEntity[] = [];
    for (const bodyId of bodyIds) {
      const entity = this.getEntityByBodyId(bodyId);
      if (entity) {
        entities.push(entity);
      }
    }
    
    return entities;
  }
}
