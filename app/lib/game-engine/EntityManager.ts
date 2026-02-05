import type { Physics2D } from '../physics2d/Physics2D';
import type { ShapeDef } from '../physics2d/types';
import type {
  GameEntity,
  EntityTemplate,
  PhysicsComponent,
  Behavior,
  TransformComponent,
  VisualComponent,
  ChildEntityDefinition,
} from '@slopcade/shared';
import type { RuntimeEntity, RuntimeBehavior, EntityManagerOptions } from './types';
import type { GodotBridge } from '../godot/types';
import { getGlobalTagRegistry } from '@slopcade/shared';
import { recomputeActiveConditionalGroup } from './behaviors/conditional';

export interface EntitySpawnedSnapshot {
  entityId: string;
  template: string;
  generation: number;
  tags: string[];
  transform: { x: number; y: number; angle: number; scaleX: number; scaleY: number };
  colliderId?: { value: number };
}

export function combineTransforms(
  parent: TransformComponent,
  local: TransformComponent
): TransformComponent {
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

export function worldToLocal(
  world: TransformComponent,
  parent: TransformComponent
): TransformComponent {
  const cos = Math.cos(-parent.angle);
  const sin = Math.sin(-parent.angle);
  
  const dx = world.x - parent.x;
  const dy = world.y - parent.y;
  
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
  private bridge: GodotBridge | null = null;

  private entityPool: PooledEntitySlot[] = [];
  private freeSlots: number[] = [];
  private nextGeneration = 1;

  private entitiesByTagId = new Map<number, Set<string>>();

  private godotGenerations = new Map<string, number>();

  constructor(physics: Physics2D, options: EntityManagerOptions = {}) {
    this.physics = physics;
    this.bridge = options.bridge ?? null;
    if (options.templates) {
      Object.entries(options.templates).forEach(([id, template]) => {
        this.templates.set(id, structuredClone(template));
      });
    }
  }

  setBridge(bridge: GodotBridge): void {
    this.bridge = bridge;
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

    runtime.active = true;

    if (resolved.physics) {
      this.initializePhysicsEntity(runtime, resolved.physics);
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
      visual: template?.visual,
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
      colliderId: snapshot.colliderId ? snapshot.colliderId.value : null,
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
      visual: definition.visual ?? (template.visual ? structuredClone(template.visual) : undefined),
      physics: definition.physics ?? (template.physics ? structuredClone(template.physics) : undefined),
      collider: definition.collider ?? (template.collider ? structuredClone(template.collider) : undefined),
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
        visual: resolved.visual ? structuredClone(resolved.visual) : undefined,
        physics: resolved.physics ? structuredClone(resolved.physics) : undefined,
        collider: resolved.collider ? structuredClone(resolved.collider) : undefined,
        behaviors,
        tags: resolved.tags ?? [],
        tagBits: new Set(),
        layer: resolved.layer ?? 0,
        visible: resolved.visible !== false,
        active: resolved.active !== false,
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
        visual: childDef.visual as VisualComponent | undefined,
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

  private initializePhysicsEntity(entity: RuntimeEntity, physicsConfig: PhysicsComponent): void {
    if (physicsConfig.initialVelocity) {
      this.physics.setLinearVelocity(entity.id, physicsConfig.initialVelocity);
    }
    if (physicsConfig.initialAngularVelocity !== undefined) {
      this.physics.setAngularVelocity(entity.id, physicsConfig.initialAngularVelocity);
    }
  }

  private createShapeDef(entity: RuntimeEntity): ShapeDef {
    const collider = entity.collider;
    const physics = entity.physics;
    const shape = collider?.shape ?? (physics as any)?.shape;
    
    switch (shape) {
      case 'circle': {
        const radius = collider?.radius ?? (physics as any)?.radius ?? 0.5;
        return {
          type: 'circle',
          radius,
        };
      }
      case 'box': {
        const width = collider?.width ?? (physics as any)?.width ?? 1;
        const height = collider?.height ?? (physics as any)?.height ?? 1;
        return {
          type: 'box',
          halfWidth: width / 2,
          halfHeight: height / 2,
        };
      }
      case 'polygon': {
        const vertices = collider?.vertices ?? (physics as any)?.vertices;
        if (!vertices) {
          throw new Error('Polygon shape requires vertices');
        }
        return {
          type: 'polygon',
          vertices,
        };
      }
      default:
        throw new Error(`Unknown physics shape: ${shape}. Entity must have collider.shape or physics.shape defined.`);
    }
  }

  destroyEntity(id: string, options: { recursive?: boolean } = {}): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    const { recursive = false } = options;
    
    if (recursive) {
      const descendants = this.getDescendants(id);
      for (const descendant of descendants.reverse()) {
        this.destroyEntityInternal(descendant.id);
      }
    } else {
      for (const childId of [...entity.children]) {
        this.detachChild(childId);
      }
    }
    
    if (entity.parentId) {
      const parent = this.entities.get(entity.parentId);
      if (parent) {
        parent.children = parent.children.filter(cid => cid !== id);
      }
    }
    
    this.destroyEntityInternal(id);
  }

    private destroyEntityInternal(id: string): void {
      const entity = this.entities.get(id);
      if (!entity) return;

      // Always destroy in Godot first (for ALL entity types, not just physics)
      // This ensures visual-only entities are properly cleaned up in the scene tree
      if (this.bridge) {
        this.bridge.destroyEntity(entity.id);
      }

      // Physics cleanup only for entities with physics components
      if (entity.physics) {
        this.physics.destroyBody(entity.id);
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
       entity.visual = undefined;
       entity.physics = undefined;
       entity.behaviors = [];
       entity.tags = [];
       entity.tagBits.clear();
       entity.layer = 0;
       entity.visible = true;
       entity.active = true;
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

  hasTag(entityId: string, tag: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    
    const tagId = getGlobalTagRegistry().getId(tag);
    if (tagId !== undefined) {
      return entity.tagBits.has(tagId);
    }
    
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
    const transform = this.physics.getTransform(entity.id);
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
      if (entity.physics && entity.active) {
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

  getEntityCount(): number {
    return this.entities.size;
  }

  getEntityCountByTag(tag: string): number {
    return this.getEntitiesByTag(tag).length;
  }

  getEntitiesInAABB(min: { x: number; y: number }, max: { x: number; y: number }): RuntimeEntity[] {
    const entityIds = this.physics.queryAABB(min, max);
    
    const entities: RuntimeEntity[] = [];
    for (const entityId of entityIds) {
      const entity = this.entities.get(entityId);
      if (entity) {
        entities.push(entity);
      }
    }
    
    return entities;
  }

  static readonly QUERYABLE_COMPONENTS = ['visual', 'physics', 'collider'] as const;

   query(options: {
     tags?: string[];
     template?: string;
     has?: Array<'visual' | 'physics' | 'collider'>;
     withinAabb?: { min: { x: number; y: number }; max: { x: number; y: number } };
   }): RuntimeEntity[] {
    const { tags, template, has, withinAabb } = options;

    let candidates: RuntimeEntity[] | null = null;

    if (withinAabb) {
      candidates = this.getEntitiesInAABB(withinAabb.min, withinAabb.max);
    }

    if (tags && tags.length > 0 && candidates === null) {
      candidates = this.getEntitiesByTag(tags[0]);
      
      for (let i = 1; i < tags.length && candidates.length > 0; i++) {
        const taggedIds = new Set(this.getEntitiesByTag(tags[i]).map(e => e.id));
        candidates = candidates.filter(e => taggedIds.has(e.id));
      }
    }

    if (candidates === null) {
      candidates = Array.from(this.entities.values());
    }

    let result = candidates;

    if (tags && tags.length > 0 && withinAabb) {
      result = result.filter(entity => {
        for (const tag of tags) {
          if (!entity.tags.includes(tag)) return false;
        }
        return true;
      });
    }

    if (template) {
      result = result.filter(entity => entity.template === template);
    }

    if (has && has.length > 0) {
      result = result.filter(entity => {
        for (const component of has) {
          switch (component) {
            case 'visual':
              if (!entity.visual) return false;
              break;
            case 'physics':
              if (!entity.physics) return false;
              break;
            case 'collider':
              if (!entity.collider) return false;
              break;
          }
        }
        return true;
      });
    }

    return result;
  }

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

   updateAllWorldTransforms(): void {
     for (const entity of this.entities.values()) {
       if (!entity.parentId) {
         this.updateWorldTransforms(entity.id);
       }
     }
   }

   getParent(entityId: string): RuntimeEntity | undefined {
     const entity = this.entities.get(entityId);
     if (!entity?.parentId) return undefined;
     return this.entities.get(entity.parentId);
   }

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

   getRoot(entityId: string): RuntimeEntity | undefined {
     let entity = this.entities.get(entityId);
     if (!entity) return undefined;
     
     while (entity.parentId) {
       const parent = this.entities.get(entity.parentId);
       if (!parent) break;
       entity = parent;
     }
     
     return entity;
   }

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
     
     if (child.parentId) {
       this.detachChild(childId);
     }
     
     child.parentId = parentId;
     parent.children.push(childId);
     
     if (localTransform) {
       child.localTransform = { ...localTransform };
     } else {
       child.localTransform = worldToLocal(child.worldTransform, parent.worldTransform);
     }
     
     this.updateWorldTransforms(childId);
   }

   detachChild(childId: string): void {
     const child = this.entities.get(childId);
     if (!child || !child.parentId) return;
     
     const parent = this.entities.get(child.parentId);
     
     if (parent) {
       parent.children = parent.children.filter(id => id !== childId);
     }
     
     child.parentId = undefined;
     
     child.localTransform = { ...child.worldTransform };
   }

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
     
     if (this.getAncestors(newParentId).some(a => a.id === childId)) {
       console.error(`reparent: Would create circular reference - ${childId} is ancestor of ${newParentId}`);
       return;
     }
     
     if (child.parentId) {
       this.detachChild(childId);
     }
     
     this.attachChild(newParentId, childId, localTransform);
   }

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
