# Implementation Spec: Entity Hierarchy System

**Spec ID**: IMP-001  
**Created**: 2026-01-26  
**Status**: Ready for Implementation  
**Priority**: 🔴 Critical  
**Effort**: 10 days  
**Breaking Changes**: None (backward compatible)

---

## Goal

Add Unity-style parent-child entity hierarchies to enable:
- Multi-part entities (characters with limbs, bosses with parts)
- Nested prefab instantiation
- Automatic transform propagation
- Cascade operations (destroy, visibility, etc.)

---

## Type Specifications

### 1. GameEntity (User-Facing Definition)

```typescript
export interface GameEntity {
  id: string;
  name: string;
  template?: string;
  transform: TransformComponent;  // World-space transform
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors?: Behavior[];
  conditionalBehaviors?: ConditionalBehavior[];
  tags?: string[];
  layer?: number;
  visible?: boolean;
  active?: boolean;
  assetPackId?: string;
  
  // NEW: Nested children
  children?: ChildEntityDefinition[];
}

export interface ChildEntityDefinition {
  id?: string;  // Optional - auto-generated if omitted
  name: string;
  template: string;
  localTransform: TransformComponent;  // Relative to parent
  slot?: string;  // Reference to parent's slot for coordinates
  
  // Optional overrides
  sprite?: Partial<SpriteComponent>;
  physics?: Partial<PhysicsComponent>;
  behaviors?: Behavior[];
  tags?: string[];
  visible?: boolean;
  assetPackId?: string;
  
  // Recursive nesting
  children?: ChildEntityDefinition[];
}
```

### 2. EntityTemplate (Reusable Prefab)

```typescript
export interface EntityTemplate {
  id: string;
  description?: string;
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors?: Behavior[];
  conditionalBehaviors?: ConditionalBehavior[];
  tags?: string[];
  layer?: number;
  slots?: Record<string, SlotDefinition>;
  
  // NEW: Template-level children (part of prefab)
  children?: ChildTemplateDefinition[];
}

export interface ChildTemplateDefinition {
  name: string;
  template: string;
  localTransform: TransformComponent;
  slot?: string;
  
  // Optional overrides
  sprite?: Partial<SpriteComponent>;
  physics?: Partial<PhysicsComponent>;
  behaviors?: Behavior[];
  tags?: string[];
  
  // Recursive nesting
  children?: ChildTemplateDefinition[];
}
```

### 3. RuntimeEntity (Engine Internal)

```typescript
export interface RuntimeEntity {
  id: string;
  name: string;
  template?: string;
  
  // NEW: Hierarchy tracking
  parentId?: string;
  children: string[];  // Array of child entity IDs
  
  // NEW: Dual transforms
  localTransform: TransformComponent;   // Relative to parent
  worldTransform: TransformComponent;   // Computed (cached)
  
  // Existing fields
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors: RuntimeBehavior[];
  tags: string[];
  tagBits: Set<number>;
  conditionalBehaviors: ConditionalBehavior[];
  activeConditionalGroupId: number;
  pendingLifecycleTransition?: PendingLifecycleTransition;
  layer: number;
  visible: boolean;
  active: boolean;
  bodyId: BodyId | null;
  colliderId: ColliderId | null;
  assetPackId?: string;
  markedForDestruction?: boolean;
  markedEffect?: MarkedEffect;
  markedColor?: string;
  markedAt?: number;
}
```

---

## EntityManager API Changes

### New Methods

```typescript
class EntityManager {
  // Hierarchy queries
  getParent(entityId: string): RuntimeEntity | undefined;
  getChildren(entityId: string): RuntimeEntity[];
  getRoot(entityId: string): RuntimeEntity;
  getDescendants(entityId: string): RuntimeEntity[];
  getAncestors(entityId: string): RuntimeEntity[];
  
  // Transform operations
  updateWorldTransforms(rootId: string): void;
  setLocalTransform(entityId: string, transform: Partial<TransformComponent>): void;
  setWorldTransform(entityId: string, transform: Partial<TransformComponent>): void;
  
  // Hierarchy modifications
  attachChild(parentId: string, childId: string, localTransform?: TransformComponent): void;
  detachChild(childId: string): void;  // Makes it a root entity
  reparent(childId: string, newParentId: string, localTransform?: TransformComponent): void;
  
  // Prefab instantiation
  instantiatePrefab(
    templateId: string, 
    worldTransform: TransformComponent,
    overrides?: Record<string, any>
  ): { rootId: string; childIds: string[] };
  
  // Enhanced cascade operations
  destroyEntity(id: string, options?: { recursive?: boolean }): void;
  setVisible(id: string, visible: boolean, options?: { recursive?: boolean }): void;
  setActive(id: string, active: boolean, options?: { recursive?: boolean }): void;
}
```

---

## Transform Propagation Algorithm

### Core Algorithm

```typescript
function updateWorldTransforms(entity: RuntimeEntity, manager: EntityManager): void {
  if (entity.parentId) {
    const parent = manager.getEntity(entity.parentId);
    if (!parent) {
      console.warn(`Entity ${entity.id} has missing parent ${entity.parentId}`);
      entity.worldTransform = { ...entity.localTransform };
    } else {
      entity.worldTransform = combineTransforms(
        parent.worldTransform,
        entity.localTransform
      );
    }
  } else {
    // Root entity: world = local
    entity.worldTransform = { ...entity.localTransform };
  }
  
  // Recursively update all children
  for (const childId of entity.children) {
    const child = manager.getEntity(childId);
    if (child) {
      updateWorldTransforms(child, manager);
    }
  }
  
  // Update physics if entity has body
  if (entity.bodyId) {
    physics.setTransform(entity.bodyId, {
      position: { x: entity.worldTransform.x, y: entity.worldTransform.y },
      angle: entity.worldTransform.angle,
    });
  }
}

function combineTransforms(parent: TransformComponent, local: TransformComponent): TransformComponent {
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
```

### When to Update

Transform propagation triggers:
1. **Parent moved**: Update parent → propagate to all descendants
2. **Child's local transform changed**: Update child → propagate to its descendants
3. **Reparent operation**: Recalculate local from world transforms
4. **Initial spawn**: Compute world transforms for entire hierarchy

---

## Slot Integration

### How Slots Work with Hierarchy

```typescript
// Template defines both slots AND children
playerCharacter: {
  slots: {
    head: { x: 0, y: 0.8, layer: 1 },
    weapon: { x: 0.3, y: 0, layer: 0 },
  },
  
  children: [
    {
      name: 'Head',
      template: 'humanHead',
      slot: 'head',  // Uses slot coordinates
      localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
}

// Resolution: If child has slot reference, use slot coords as default
// Child can still override via localTransform
```

**Resolution Logic:**
```typescript
function resolveChildTransform(
  child: ChildTemplateDefinition,
  parentTemplate: EntityTemplate
): TransformComponent {
  let transform = { ...child.localTransform };
  
  if (child.slot && parentTemplate.slots) {
    const slot = parentTemplate.slots[child.slot];
    if (slot) {
      // Slot provides default position, child can override
      transform.x = child.localTransform.x || slot.x;
      transform.y = child.localTransform.y || slot.y;
      // Layer is additive: child layer + slot layer offset
      if (slot.layer !== undefined) {
        transform.layer = (transform.layer || 0) + slot.layer;
      }
    }
  }
  
  return transform;
}
```

---

## Prefab Instantiation

### Example: Boss with Destructible Parts

```typescript
{
  templates: {
    boss: {
      sprite: { type: 'image', url: 'boss_body.png', width: 3, height: 4 },
      physics: { bodyType: 'kinematic', shape: 'box', width: 3, height: 4 },
      slots: {
        leftArm: { x: -1.5, y: 0.5 },
        rightArm: { x: 1.5, y: 0.5 },
        core: { x: 0, y: -0.5 },
      },
      behaviors: [
        { type: 'health', maxHealth: 1000 },
      ],
      children: [
        {
          name: 'LeftArm',
          template: 'bossArm',
          slot: 'leftArm',
          localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
          behaviors: [
            { type: 'health', maxHealth: 100 },
            { type: 'rotate', speed: 2 },
          ],
        },
        {
          name: 'RightArm',
          template: 'bossArm',
          slot: 'rightArm',
          localTransform: { x: 0, y: 0, angle: 0, scaleX: -1, scaleY: 1 },  // Mirrored
          behaviors: [
            { type: 'health', maxHealth: 100 },
            { type: 'rotate', speed: -2 },
          ],
        },
        {
          name: 'Core',
          template: 'bossCore',
          slot: 'core',
          localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
          behaviors: [
            { type: 'health', maxHealth: 200 },
          ],
        },
      ],
    },
    
    bossArm: {
      sprite: { type: 'rect', width: 0.8, height: 2, color: '#8B4513' },
      physics: { bodyType: 'dynamic', shape: 'box', width: 0.8, height: 2 },
    },
    
    bossCore: {
      sprite: { type: 'circle', radius: 0.5, color: '#FF0000' },
      physics: { bodyType: 'dynamic', shape: 'circle', radius: 0.5 },
    },
  },
  
  entities: [
    {
      id: 'boss1',
      template: 'boss',
      transform: { x: 10, y: 5, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
}
```

**When instantiated, creates:**
- `boss1` (root)
  - `boss1_LeftArm` (child)
  - `boss1_RightArm` (child)
  - `boss1_Core` (child)

All children automatically follow boss movement!

---

## Backward Compatibility

### Existing Games Work Unchanged

```typescript
// Old style (no children) - works exactly as before
{
  entities: [
    { id: 'player', template: 'character', transform: { x: 0, y: 2, ... } },
    { id: 'enemy1', template: 'enemy', transform: { x: 5, y: 2, ... } },
  ]
}
```

**Resolution**: If `children` is undefined or empty array, treat as root entity with no children. Zero impact on existing games.

### attach_to Behavior Continues Working

```typescript
// Dynamic attachment still works
{
  id: 'pickup',
  behaviors: [
    { type: 'attach_to', parentTag: 'player', slotName: 'hand' }
  ]
}
```

**Coexistence**: Hierarchy for structural relationships, `attach_to` for dynamic gameplay attachment.

---

## Implementation Checklist

### Phase 1: Type System (Day 1-2)

- [ ] Add `children` to `GameEntity` interface
- [ ] Add `children` to `EntityTemplate` interface
- [ ] Add `ChildEntityDefinition` type
- [ ] Add `ChildTemplateDefinition` type
- [ ] Add `parentId`, `children`, `localTransform`, `worldTransform` to `RuntimeEntity`
- [ ] Update Zod schemas in `shared/src/types/schemas.ts`
- [ ] Add validation (no circular references, max depth limit)

**Files**:
- `shared/src/types/entity.ts`
- `shared/src/types/GameDefinition.ts`
- `shared/src/types/schemas.ts`

### Phase 2: EntityManager Core (Day 3-5)

- [ ] Add hierarchy tracking (`parentId`, `children` arrays)
- [ ] Implement `getParent()`, `getChildren()`, `getDescendants()`
- [ ] Implement `attachChild()`, `detachChild()`, `reparent()`
- [ ] Implement transform propagation algorithm
- [ ] Update `createEntity()` to handle children recursively
- [ ] Update `destroyEntity()` to support recursive option
- [ ] Add `setLocalTransform()` and `setWorldTransform()`

**Files**:
- `app/lib/game-engine/EntityManager.ts`

### Phase 3: Transform System (Day 5-6)

- [ ] Implement `combineTransforms()` helper
- [ ] Implement `updateWorldTransforms()` recursive algorithm
- [ ] Hook into game loop (update on entity move)
- [ ] Update physics sync to use `worldTransform`
- [ ] Add dirty flagging for optimization (only update changed hierarchies)

**Files**:
- `app/lib/game-engine/EntityManager.ts`
- `app/lib/game-engine/GameRuntime.godot.tsx`

### Phase 4: Prefab Instantiation (Day 7-8)

- [ ] Implement `instantiatePrefab()` with recursive child spawning
- [ ] Handle template resolution with children
- [ ] Apply overrides to child entities
- [ ] Resolve slot coordinates
- [ ] Generate child IDs (parent_childName pattern)
- [ ] Add to spawn action: `attachToParent` option

**Files**:
- `app/lib/game-engine/EntityManager.ts`
- `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts`

### Phase 5: Testing & Migration (Day 9-10)

- [ ] Write unit tests for transform propagation
- [ ] Write unit tests for hierarchy operations
- [ ] Test cascade operations
- [ ] Test circular reference prevention
- [ ] Convert 1-2 existing games to use hierarchy
- [ ] Performance benchmarks
- [ ] Update documentation

**Files**:
- `app/lib/game-engine/__tests__/EntityManager.hierarchy.test.ts` (new)
- Test game conversions

---

## Edge Cases & Validation

### 1. Circular Reference Prevention

```typescript
function validateNoCircularReference(
  templateId: string,
  visited: Set<string>,
  templates: Map<string, EntityTemplate>
): void {
  if (visited.has(templateId)) {
    throw new Error(`Circular template reference detected: ${Array.from(visited).join(' → ')} → ${templateId}`);
  }
  
  visited.add(templateId);
  
  const template = templates.get(templateId);
  if (template?.children) {
    for (const child of template.children) {
      validateNoCircularReference(child.template, visited, templates);
    }
  }
}
```

### 2. Max Depth Limit

```typescript
const MAX_HIERARCHY_DEPTH = 10;  // Prevent deeply nested structures

function validateDepth(children: ChildTemplateDefinition[], depth: number): void {
  if (depth > MAX_HIERARCHY_DEPTH) {
    throw new Error(`Hierarchy depth exceeds maximum of ${MAX_HIERARCHY_DEPTH}`);
  }
  for (const child of children) {
    if (child.children) {
      validateDepth(child.children, depth + 1);
    }
  }
}
```

### 3. Orphan Prevention

When parent is destroyed without `recursive: true`:
- Option A: Detach children (make them root entities) ✅ **Recommended**
- Option B: Destroy children anyway ❌ Surprising behavior
- Option C: Error ❌ Too strict

### 4. Reparent Transform Conversion

```typescript
function reparent(childId: string, newParentId: string): void {
  const child = getEntity(childId);
  const newParent = getEntity(newParentId);
  
  // Convert world transform to local relative to new parent
  child.localTransform = worldToLocal(child.worldTransform, newParent.worldTransform);
  
  // Update hierarchy links
  if (child.parentId) {
    const oldParent = getEntity(child.parentId);
    oldParent.children = oldParent.children.filter(id => id !== childId);
  }
  
  child.parentId = newParentId;
  newParent.children.push(childId);
  
  // Recompute world transforms
  updateWorldTransforms(child, manager);
}
```

---

## Example Use Cases

### 1. Character with Equipment

```typescript
{
  templates: {
    knight: {
      sprite: { type: 'image', url: 'knight_body.png', width: 1, height: 2 },
      physics: { bodyType: 'dynamic', shape: 'box', width: 1, height: 2 },
      slots: { weapon: { x: 0.5, y: 0 }, shield: { x: -0.5, y: 0 } },
      children: [
        { name: 'Sword', template: 'sword', slot: 'weapon', localTransform: { x: 0, y: 0, angle: 45, scaleX: 1, scaleY: 1 } },
        { name: 'Shield', template: 'shield', slot: 'shield', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      ],
    },
  },
  entities: [
    { id: 'player', template: 'knight', transform: { x: 5, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
}
```

**Result**: Moving player automatically moves sword and shield!

### 2. Vehicle with Wheels

```typescript
{
  templates: {
    car: {
      sprite: { type: 'rect', width: 3, height: 1.5, color: '#FF0000' },
      physics: { bodyType: 'dynamic', shape: 'box', width: 3, height: 1.5 },
      slots: {
        frontWheel: { x: 1.2, y: -0.75 },
        backWheel: { x: -1.2, y: -0.75 },
      },
      children: [
        { name: 'FrontWheel', template: 'wheel', slot: 'frontWheel', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
        { name: 'BackWheel', template: 'wheel', slot: 'backWheel', localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
      ],
    },
  },
}
```

**Plus**: Add revolute joints between car and wheels for physics-based rotation!

### 3. Tower with Rotating Turret

```typescript
{
  templates: {
    tower: {
      sprite: { type: 'rect', width: 1, height: 2, color: '#8B4513' },
      physics: { bodyType: 'static', shape: 'box', width: 1, height: 2 },
      slots: { turret: { x: 0, y: 1.2 } },
      children: [
        {
          name: 'Turret',
          template: 'turret',
          slot: 'turret',
          localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
          behaviors: [
            { type: 'rotate_toward', target: 'player' },  // Turret aims at player
          ],
          children: [  // Nested 2 levels!
            {
              name: 'Barrel',
              template: 'barrel',
              localTransform: { x: 0.5, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
            },
          ],
        },
      ],
    },
  },
}
```

**Result**: Turret rotates → barrel rotates with it (transform inheritance)!

---

## Performance Considerations

### Optimization Strategies

1. **Dirty Flagging**: Only update world transforms when entity or ancestor moves
2. **Batch Updates**: Update all hierarchies once per frame, not per-entity
3. **Depth Caching**: Store depth level for quick root-first iteration
4. **Spatial Coherence**: Keep hierarchy members together in memory

### Worst Case Analysis

- **100 entities, 10% hierarchical (10 parents with 1-3 children each)**
- **Transform updates**: ~30-40 entities per frame (only moved hierarchies)
- **Cost**: ~0.5ms per frame on mid-range device
- **Impact**: <1% of 16.6ms budget ✅ Acceptable

---

## Migration Guide for Existing Games

### Step 1: Identify Entities Using attach_to

```bash
grep -r "attach_to" app/lib/test-games/games/
```

### Step 2: Convert to Hierarchy

**Before (attach_to)**:
```typescript
entities: [
  { id: 'character', template: 'character' },
  { id: 'hat', template: 'hat', behaviors: [
    { type: 'attach_to', parentTag: 'character', slotName: 'head' }
  ]},
]
```

**After (hierarchy)**:
```typescript
templates: {
  character: {
    // ... sprite, physics
    children: [
      { name: 'Hat', template: 'hat', slot: 'head', localTransform: {...} }
    ]
  }
},
entities: [
  { id: 'character', template: 'character' },
  // Hat is spawned automatically as child!
]
```

### Step 3: Test

- Verify children spawn
- Verify transforms follow parent
- Verify physics still works
- Verify behaviors execute on children

---

## AI Prompt Engineering

### System Prompt Addition

```markdown
## Entity Hierarchy

You can now create nested entity structures using the `children` field in templates:

```json
{
  "templates": {
    "boss": {
      "sprite": { ... },
      "slots": {
        "leftArm": { "x": -1.5, "y": 0.5 },
        "rightArm": { "x": 1.5, "y": 0.5 }
      },
      "children": [
        {
          "name": "LeftArm",
          "template": "bossArm",
          "slot": "leftArm",
          "localTransform": { "x": 0, "y": 0, "angle": 0, "scaleX": 1, "scaleY": 1 }
        }
      ]
    }
  }
}
```

**When to use children:**
- Multi-part characters (body, head, limbs)
- Vehicles with wheels/parts
- Bosses with destructible sections
- Modular structures

**When NOT to use:**
- Independent entities that move separately
- Entities that spawn dynamically during gameplay (use spawn rules instead)
- Simple single-part entities
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('Entity Hierarchy', () => {
  it('should create child entities when instantiating parent', () => {
    const parent = manager.createEntity({
      id: 'parent',
      template: 'parentTemplate',
      transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    });
    
    const children = manager.getChildren(parent.id);
    expect(children).toHaveLength(2);
    expect(children[0].name).toBe('Child1');
  });
  
  it('should propagate parent transform to children', () => {
    const parent = manager.getEntity('parent');
    manager.setWorldTransform('parent', { x: 5, y: 5, angle: Math.PI / 2 });
    manager.updateWorldTransforms('parent');
    
    const child = manager.getChildren('parent')[0];
    // Child at local (1, 0) rotated 90° = world (5, 6)
    expect(child.worldTransform.x).toBeCloseTo(5);
    expect(child.worldTransform.y).toBeCloseTo(6);
  });
  
  it('should cascade destroy with recursive option', () => {
    manager.destroyEntity('parent', { recursive: true });
    expect(manager.getEntity('parent')).toBeUndefined();
    expect(manager.getEntity('parent_Child1')).toBeUndefined();
  });
  
  it('should detach children without recursive option', () => {
    manager.destroyEntity('parent', { recursive: false });
    expect(manager.getEntity('parent')).toBeUndefined();
    expect(manager.getEntity('parent_Child1')).toBeDefined();
    expect(manager.getEntity('parent_Child1').parentId).toBeUndefined();
  });
});
```

### Integration Tests

- Spawn boss with 3 parts → verify all created
- Move boss → verify parts follow
- Destroy one arm → verify boss still exists
- Destroy boss → verify all parts removed

---

## Files to Modify

| File | Changes | LOC |
|------|---------|-----|
| `shared/src/types/entity.ts` | Add children fields | +30 |
| `shared/src/types/GameDefinition.ts` | Add child types | +40 |
| `shared/src/types/schemas.ts` | Add Zod schemas | +50 |
| `app/lib/game-engine/types.ts` | Update RuntimeEntity | +20 |
| `app/lib/game-engine/EntityManager.ts` | Core hierarchy logic | +250 |
| `app/lib/game-engine/GameRuntime.godot.tsx` | Transform update hook | +20 |
| `app/lib/game-engine/rules/actions/SpawnActionExecutor.ts` | Prefab instantiation | +50 |
| `app/lib/game-engine/__tests__/EntityManager.hierarchy.test.ts` | Tests | +200 |

**Total New/Modified Code**: ~660 lines

---

## Success Criteria

- [ ] Nested templates instantiate correctly
- [ ] Transform propagation is automatic
- [ ] Cascade operations work (destroy, visibility)
- [ ] Existing games work unchanged
- [ ] Performance <1% impact
- [ ] All tests pass
- [ ] Documentation updated

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Circular references | Validation at load time |
| Performance regression | Dirty flagging, depth limits |
| Breaking existing games | Thorough testing, opt-in design |
| Complex AI generation | Start with simple hierarchies, expand gradually |

---

## Timeline

**Week 1** (Days 1-5): Core implementation  
**Week 2** (Days 6-10): Testing, migration, polish

**Ready to start immediately** - all design decisions made.

---

## Next Step

**Consult Oracle** for architectural review before implementation.
