import type { Physics2D } from '../physics2d/Physics2D';
import type { BodyDef, FixtureDef, ShapeDef } from '../physics2d/types';
import type {
  GameEntity,
  EntityTemplate,
  PhysicsComponent,
  Behavior,
  TransformComponent,
  SpriteComponent,
  ChildEntityDefinition,
} from '@slopcade/shared';
import type { RuntimeEntity, RuntimeBehavior, EntityManagerOptions } from './types';
import { getGlobalTagRegistry } from '@slopcade/shared';
import { recomputeActiveConditionalGroup } from './behaviors/conditional';

export interface EntitySpawnedSnapshot {
  entityId: string;
  template: string;
  generation: number;
  tags: string[];
  transform: { x: number; y: number; angle: number; scaleX: number; scaleY: number };
}

/**
 * Combines parent and local transforms into a world transform.
 * Handles rotation, scale, and translation.
 */
export function combineTransforms(
  parent: TransformComponent,
  local: TransformComponent
): TransformComponent {
  // Rotate local offset by parent angle
  const cos = Math.cos(parent.angle);
  const sin = Math.sin(parent.angle);
  const rotatedX = local.x * cos - local.y * sin;
  const rotatedY = local.x * sin + local.y * cos;

  return {
    x: parent.x + rotatedX * parent.scaleX,
    y: parent.y + rotatedY * parent.scaleY,
    angle: parent.angle + local.angle,
    scaleX: parent.scaleX * local.scaleX,
    scaleY: parent.scaleY * local.scaleY,
  };
}

/**
 * Converts a world transform to local relative to a parent transform.
 * Used when reparenting entities.
 */
export function worldToLocal(
  world: TransformComponent,
  parent: TransformComponent
): TransformComponent {
  // Inverse rotation
  const cos = Math.cos(-parent.angle);
  const sin = Math.sin(-parent.angle);
  
  // Translate relative to parent
  const dx = world.x - parent.x;
  const dy = world.y - parent.y;
  
  // Inverse rotate and scale
  const localX = (dx * cos - dy * sin) / parent.scaleX;
  const localY = (dx * sin + dy * cos) / parent.scaleY;

  return {
    x: localX,
    y: localY,
    angle: world.angle - parent.angle,
    scaleX: world.scaleX / parent.scaleX,
    scaleY: world.scaleY / parent.scaleY,
  };
}

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
  
  /** Godot generation tokens for pool safety during async operations */
  private godotGenerations = new Map<string, number>();

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

    this.spawnChildEntities(runtime, resolved.children || [], resolved.slots);

    return runtime;
  }

  handleEntitySpawned(snapshot: EntitySpawnedSnapshot): RuntimeEntity | null {
    if (this.entities.has(snapshot.entityId)) {
      return this.entities.get(snapshot.entityId)!;
    }

    this.godotGenerations.set(snapshot.entityId, snapshot.generation);

    const template = this.templates.get(snapshot.template);
    const tags = [...(template?.tags ?? []), ...snapshot.tags];

    const runtime: RuntimeEntity = {
      id: snapshot.entityId,
      name: template?.id ?? snapshot.template,
      template: snapshot.template,
      parentId: undefined,
      children: [],
      localTransform: { ...snapshot.transform },
      worldTransform: { ...snapshot.transform },
      transform: { ...snapshot.transform },
      sprite: template?.sprite,
      physics: template?.physics,
      behaviors: (template?.behaviors ?? []).map((b: Behavior) => ({
        definition: b,
        enabled: b.enabled !== false,
        state: {},
      })),
      tags,
      tagBits: new Set(),
      layer: template?.layer ?? 0,
      visible: true,
      active: true,
      bodyId: null,
      colliderId: null,
      conditionalBehaviors: template?.conditionalBehaviors ?? [],
      activeConditionalGroupId: -1,
    };

    for (const tag of tags) {
      const tagId = getGlobalTagRegistry().intern(tag);
      runtime.tagBits.add(tagId);
      if (!this.entitiesByTagId.has(tagId)) {
        this.entitiesByTagId.set(tagId, new Set());
      }
      this.entitiesByTagId.get(tagId)!.add(snapshot.entityId);
    }

    this.entities.set(snapshot.entityId, runtime);
    return runtime;
  }

  handleEntityDestroyed(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    for (const tagId of entity.tagBits) {
      this.entitiesByTagId.get(tagId)?.delete(entityId);
    }

    this.entities.delete(entityId);
    this.godotGenerations.delete(entityId);
  }

  getGodotGeneration(entityId: string): number | undefined {
    return this.godotGenerations.get(entityId);
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

  private resolveTemplate(definition: GameEntity): GameEntity & { slots?: Record<string, { x: number; y: number; layer?: number }> } {
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
      conditionalBehaviors: definition.conditionalBehaviors ?? template.conditionalBehaviors,
      tags: [...(template.tags ?? []), ...(definition.tags ?? [])],
      layer: definition.layer ?? template.layer ?? 0,
      children: [
        ...(template.children || []),
        ...(definition.children || []),
      ],
      slots: template.slots,
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
        parentId: undefined,
        children: [],
        localTransform: { ...resolved.transform },
        worldTransform: { ...resolved.transform },
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
        conditionalBehaviors: resolved.conditionalBehaviors ?? [],
        activeConditionalGroupId: -1,
      };
    }

  private spawnChildEntities(
    parent: RuntimeEntity,
    childDefs: ChildEntityDefinition[],
    slots?: Record<string, { x: number; y: number; layer?: number }>
  ): void {
    for (const childDef of childDefs) {
      const childId = childDef.id || `${parent.id}_${childDef.name}`;
      
      let childLocalTransform = { ...childDef.localTransform };
      if (childDef.slot && slots?.[childDef.slot]) {
        const slot = slots[childDef.slot];
        childLocalTransform.x = childDef.localTransform.x ?? slot.x;
        childLocalTransform.y = childDef.localTransform.y ?? slot.y;
      }
      
      const childEntity: GameEntity = {
        id: childId,
        name: childDef.name,
        template: childDef.template,
        transform: childLocalTransform,
        sprite: childDef.sprite as SpriteComponent | undefined,
        physics: childDef.physics as PhysicsComponent | undefined,
        behaviors: childDef.behaviors,
        tags: childDef.tags,
        visible: childDef.visible,
        assetPackId: childDef.assetPackId,
        children: childDef.children as ChildEntityDefinition[] | undefined,
      };
      
      const childRuntime = this.createEntity(childEntity);
      
      if (childRuntime) {
        childRuntime.parentId = parent.id;
        childRuntime.localTransform = { ...childLocalTransform };
        parent.children.push(childRuntime.id);
        this.updateWorldTransforms(childRuntime.id);
      }
    }
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

  /**
   * Destroys an entity and optionally all its descendants.
   * @param id - Entity ID to destroy
   * @param options - Destruction options
   *   - recursive: If true, destroys all descendants. If false (default), detaches children.
   */
  destroyEntity(id: string, options: { recursive?: boolean } = {}): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    const { recursive = false } = options;
    
    if (recursive) {
      // Destroy all descendants first (depth-first, bottom-up)
      const descendants = this.getDescendants(id);
      for (const descendant of descendants.reverse()) {
        this.destroyEntityInternal(descendant.id);
      }
    } else {
      // Detach all children (they become root entities)
      for (const childId of [...entity.children]) {
        this.detachChild(childId);
      }
    }
    
    // Detach from parent if any
    if (entity.parentId) {
      const parent = this.entities.get(entity.parentId);
      if (parent) {
        parent.children = parent.children.filter(cid => cid !== id);
      }
    }
    
    // Destroy the entity itself
    this.destroyEntityInternal(id);
  }

  /**
   * Internal method to destroy a single entity (no hierarchy handling).
   */
  private destroyEntityInternal(id: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    // Destroy physics body if exists
    if (entity.bodyId) {
      this.physics.destroyBody(entity.bodyId);
    }
    
    // Remove from tag index
    for (const tagId of entity.tagBits) {
      this.entitiesByTagId.get(tagId)?.delete(id);
    }
    
    // Reset and return to pool
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

  private syncEntityTransformFromPhysics(entity: RuntimeEntity): void {
    const transform = this.physics.getTransform(entity.bodyId!);
    entity.transform.x = transform.position.x;
    entity.transform.y = transform.position.y;
    entity.transform.angle = transform.angle;
  }

  private syncHierarchyTransformsForRoot(entity: RuntimeEntity): void {
    entity.worldTransform = { ...entity.transform };
    entity.localTransform = { ...entity.transform };
  }

  private syncHierarchyTransformsForChildWithPhysics(entity: RuntimeEntity): void {
    const parent = this.entities.get(entity.parentId!);
    if (parent) {
      entity.localTransform = worldToLocal(entity.transform, parent.worldTransform);
    }
  }

  syncTransformsFromPhysics(): void {
    this.entities.forEach((entity) => {
      if (entity.bodyId && entity.active) {
        this.syncEntityTransformFromPhysics(entity);

        if (entity.children.length > 0) {
          if (!entity.parentId) {
            this.syncHierarchyTransformsForRoot(entity);
          } else {
            this.syncHierarchyTransformsForChildWithPhysics(entity);
          }
          this.updateWorldTransforms(entity.id);
        } else if (!entity.parentId) {
          this.syncHierarchyTransformsForRoot(entity);
        }
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

  /**
   * Recursively updates world transforms for an entity and all descendants.
   * Call this when a parent entity moves.
   */
  updateWorldTransforms(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;

    if (entity.parentId) {
      const parent = this.entities.get(entity.parentId);
      if (parent) {
        entity.worldTransform = combineTransforms(parent.worldTransform, entity.localTransform);
      } else {
        entity.worldTransform = { ...entity.localTransform };
      }
    } else {
      entity.worldTransform = { ...entity.localTransform };
    }

    entity.transform = entity.worldTransform;

    for (const childId of entity.children) {
      this.updateWorldTransforms(childId);
    }
  }

   /**
    * Updates world transforms for ALL entities (call sparingly - expensive).
    * Prefer updateWorldTransforms(entityId) for targeted updates.
    */
   updateAllWorldTransforms(): void {
     for (const entity of this.entities.values()) {
       if (!entity.parentId) {
         this.updateWorldTransforms(entity.id);
       }
     }
   }

   /**
    * Gets the parent entity of the given entity.
    */
   getParent(entityId: string): RuntimeEntity | undefined {
     const entity = this.entities.get(entityId);
     if (!entity?.parentId) return undefined;
     return this.entities.get(entity.parentId);
   }

   /**
    * Gets direct children of the given entity.
    */
   getChildren(entityId: string): RuntimeEntity[] {
     const entity = this.entities.get(entityId);
     if (!entity) return [];
     
     const children: RuntimeEntity[] = [];
     for (const childId of entity.children) {
       const child = this.entities.get(childId);
       if (child) children.push(child);
     }
     return children;
   }

   /**
    * Gets the root ancestor of the given entity.
    * Returns the entity itself if it has no parent.
    */
   getRoot(entityId: string): RuntimeEntity | undefined {
     let entity = this.entities.get(entityId);
     if (!entity) return undefined;
     
     // Walk up the hierarchy
     while (entity.parentId) {
       const parent = this.entities.get(entity.parentId);
       if (!parent) break; // Orphaned - current is effectively root
       entity = parent;
     }
     
     return entity;
   }

   /**
    * Gets all descendants of the given entity (children, grandchildren, etc.).
    */
   getDescendants(entityId: string): RuntimeEntity[] {
     const entity = this.entities.get(entityId);
     if (!entity) return [];
     
     const descendants: RuntimeEntity[] = [];
     const stack = [...entity.children];
     
     while (stack.length > 0) {
       const childId = stack.pop()!;
       const child = this.entities.get(childId);
       if (child) {
         descendants.push(child);
         stack.push(...child.children);
       }
     }
     
     return descendants;
   }

   /**
    * Gets all ancestors of the given entity (parent, grandparent, etc.).
    * Returns array ordered from immediate parent to root.
    */
   getAncestors(entityId: string): RuntimeEntity[] {
     const entity = this.entities.get(entityId);
     if (!entity) return [];
     
     const ancestors: RuntimeEntity[] = [];
     let currentId = entity.parentId;
     
     while (currentId) {
       const ancestor = this.entities.get(currentId);
       if (!ancestor) break;
       ancestors.push(ancestor);
       currentId = ancestor.parentId;
     }
     
     return ancestors;
   }

   /**
    * Attaches an entity as a child of another entity.
    * @param parentId - The parent entity ID
    * @param childId - The entity to attach as child
    * @param localTransform - Optional local transform (defaults to preserving world position)
    */
   attachChild(
     parentId: string,
     childId: string,
     localTransform?: TransformComponent
   ): void {
     const parent = this.entities.get(parentId);
     const child = this.entities.get(childId);
     
     if (!parent || !child) {
       console.warn(`attachChild: Missing entity - parent=${parentId}, child=${childId}`);
       return;
     }
     
     // Detach from current parent if any
     if (child.parentId) {
       this.detachChild(childId);
     }
     
     // Set up hierarchy link
     child.parentId = parentId;
     parent.children.push(childId);
     
     // Set local transform
     if (localTransform) {
       child.localTransform = { ...localTransform };
     } else {
       // Preserve world position by computing new local transform
       child.localTransform = worldToLocal(child.worldTransform, parent.worldTransform);
     }
     
     // Update world transforms
     this.updateWorldTransforms(childId);
   }

   /**
    * Detaches an entity from its parent, making it a root entity.
    * The entity's world position is preserved.
    */
   detachChild(childId: string): void {
     const child = this.entities.get(childId);
     if (!child || !child.parentId) return;
     
     const parent = this.entities.get(child.parentId);
     
     // Remove from parent's children array
     if (parent) {
       parent.children = parent.children.filter(id => id !== childId);
     }
     
     // Clear parent reference
     child.parentId = undefined;
     
     // Local transform becomes world transform (entity is now root)
     child.localTransform = { ...child.worldTransform };
   }

   /**
    * Moves an entity to a new parent.
    * @param childId - The entity to move
    * @param newParentId - The new parent entity ID
    * @param localTransform - Optional local transform (defaults to preserving world position)
    */
   reparent(
     childId: string,
     newParentId: string,
     localTransform?: TransformComponent
   ): void {
     const child = this.entities.get(childId);
     const newParent = this.entities.get(newParentId);
     
     if (!child || !newParent) {
       console.warn(`reparent: Missing entity - child=${childId}, newParent=${newParentId}`);
       return;
     }
     
     // Prevent circular references
     if (this.getAncestors(newParentId).some(a => a.id === childId)) {
       console.error(`reparent: Would create circular reference - ${childId} is ancestor of ${newParentId}`);
       return;
     }
     
     // Detach from current parent
     if (child.parentId) {
       this.detachChild(childId);
     }
     
     // Attach to new parent
     this.attachChild(newParentId, childId, localTransform);
   }

   /**
    * Sets entity visibility, optionally recursively.
    */
   setEntityVisible(id: string, visible: boolean, options: { recursive?: boolean } = {}): void {
     const entity = this.entities.get(id);
     if (!entity) return;
     
     entity.visible = visible;
     
     if (options.recursive) {
       for (const descendant of this.getDescendants(id)) {
         descendant.visible = visible;
       }
     }
   }

   /**
    * Sets entity active state, optionally recursively.
    */
   setEntityActive(id: string, active: boolean, options: { recursive?: boolean } = {}): void {
     const entity = this.entities.get(id);
     if (!entity) return;
     
     entity.active = active;
     
     if (options.recursive) {
       for (const descendant of this.getDescendants(id)) {
         descendant.active = active;
       }
     }
   }
}
