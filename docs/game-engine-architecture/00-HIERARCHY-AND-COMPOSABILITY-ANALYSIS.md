# Entity Hierarchy & Composability: Current State vs Unity Prefabs

**Date**: 2026-01-26  
**Status**: Critical Architectural Analysis  
**Purpose**: Evaluate current entity composition system vs Unity prefabs and propose unified composability model

---

## Executive Summary

**CURRENT STATE**: Slopcade has **NO true scene graph hierarchy**. Entities are flat with simulated parent-child relationships via `attach_to` behavior.

**UNITY COMPARISON**: Unity uses true hierarchical prefabs with transform inheritance. Slopcade uses template instancing without nesting.

**RECOMMENDATION**: Add proper parent-child hierarchy to support Unity-style prefabs AND maintain existing slot/behavior systems. All three serve different purposes and complement each other.

---

## Current Entity System Architecture

### 1. Entity Structure (Flat)

```typescript
export interface RuntimeEntity {
  id: string;
  name: string;
  template?: string;  // Reference to template ID
  transform: TransformComponent;  // World-space transform
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors: RuntimeBehavior[];
  tags: string[];
  layer: number;
  // ❌ NO: parentId, children, localTransform
}
```

**Key Finding**: **NO parent-child relationships** in entity structure.

### 2. Template System (Flat Instancing)

```typescript
export interface EntityTemplate {
  id: string;
  sprite?: SpriteComponent;
  physics?: PhysicsComponent;
  behaviors?: Behavior[];
  tags?: string[];
  slots?: Record<string, SlotDefinition>;  // Attachment points
  // ❌ NO: children templates, nested prefabs
}
```

Templates are **instanced**, not **nested**.

### 3. Simulated Hierarchy via `attach_to` Behavior

```typescript
behaviors: [
  { 
    type: 'attach_to',
    parentTag: 'character',
    slotName: 'head',
    inheritRotation: true,
  }
]
```

**How it works**:
- Every frame, `attach_to` behavior finds parent by tag
- Reads slot position from parent's template
- Manually sets child's transform to parent position + offset
- Optionally inherits rotation

**Limitations**:
- ❌ No automatic transform propagation
- ❌ No destroy-cascade (parent destroyed, children orphaned)
- ❌ No batch operations on hierarchies
- ❌ Must run every frame (performance cost)
- ❌ Can't serialize a nested prefab as a unit
- ❌ No relative transforms (everything is world-space)

---

## Unity Prefab System (Reference)

### Unity's Approach

```
Character Prefab
├── Body (Sprite, Physics)
│   ├── Head (Sprite)
│   │   └── Hat (Sprite)
│   ├── Left Arm (Sprite, Hinge Joint)
│   └── Right Arm (Sprite, Hinge Joint)
└── Weapon (Sprite, Script)
```

**Key Features**:
1. **Nested Hierarchy**: Children stored in parent's `children` array
2. **Local Transforms**: Child transforms relative to parent
3. **Automatic Propagation**: Moving parent moves all children
4. **Cascade Operations**: Destroy parent = destroy all children
5. **Prefab Variants**: Override properties in instances
6. **Serialization**: Save entire hierarchy as one unit
7. **Instancing**: Spawn entire hierarchy with one call

### What Slopcade Would Need

```typescript
export interface RuntimeEntity {
  id: string;
  parentId?: string;  // NEW: Reference to parent
  children: string[];  // NEW: Array of child entity IDs
  
  localTransform: TransformComponent;  // NEW: Relative to parent
  worldTransform: TransformComponent;  // Computed from hierarchy
  
  // ... existing fields
}

export interface EntityTemplate {
  id: string;
  children?: ChildTemplateDefinition[];  // NEW: Nested templates
  
  // ... existing fields
}

export interface ChildTemplateDefinition {
  name: string;
  template: string;  // Reference to template
  localTransform: TransformComponent;  // Position relative to parent
  overrides?: Partial<EntityTemplate>;  // Property overrides
}
```

---

## Hierarchy of Customization: Current vs Proposed

### Current: 3 Layers (Flat)

```
Layer 1: Asset Swapping
   ↓ (Replace sprite images)
   
Layer 2: Slot Configuration
   ↓ (Adjust attachment point positions)
   
Layer 3: Tunable Variables
   ↓ (Adjust gameplay parameters via sliders)
```

**Problem**: No way to compose entities from reusable pieces.

### Proposed: 5 Layers (Hierarchical)

```
Layer 0: Prefab Composition (NEW)
   ↓ (Compose entities from nested templates)
   
Layer 1: Asset Swapping
   ↓ (Replace sprite images)
   
Layer 2: Slot Configuration
   ↓ (Adjust attachment point positions)
   
Layer 3: Tunable Variables
   ↓ (Adjust gameplay parameters)
   
Layer 4: Custom JavaScript (FUTURE)
   ↓ (Write custom behaviors)
```

---

## Three Distinct Concepts

### 1. **Slots** = Attachment Coordinates

**Purpose**: Define WHERE on an entity other entities attach

```typescript
template.slots = {
  head: { x: 0, y: 1.0 },
  leftHand: { x: -0.5, y: 0 },
}
```

**Analogy**: "LEGO studs" - specific points where pieces snap

**Current Implementation**: ✅ Fully working via `slots` field + `attach_to` behavior

---

### 2. **Hierarchy** = Parent-Child Relationships

**Purpose**: Define WHICH entities are connected in a tree

```typescript
character = {
  id: 'player',
  children: [
    { name: 'Body', template: 'humanBody' },
    { name: 'Weapon', template: 'sword' },
  ]
}
```

**Analogy**: "Scene graph" - nested structure like a file system

**Current Implementation**: ❌ NOT supported - entities are flat

---

### 3. **Variables** = Tunable Parameters

**Purpose**: Define HOW entities behave (speeds, forces, sizes)

```typescript
variables: {
  jumpForce: 15,
  enemySpeed: 10,
}
```

**Analogy**: "Configuration knobs" - adjustable gameplay parameters

**Current Implementation**: ✅ Fully working

---

## Comparison Table

| Feature | Unity Prefabs | Slopcade Slots | Slopcade attach_to | Proposed Hierarchy |
|---------|---------------|----------------|-------------------|-------------------|
| **Nested Structure** | ✅ Yes | ❌ No (just coords) | ⚠️ Simulated | ✅ Proposed |
| **Transform Inheritance** | ✅ Automatic | ❌ No | ⚠️ Manual (every frame) | ✅ Proposed |
| **Destroy Cascade** | ✅ Yes | ❌ No | ❌ No | ✅ Proposed |
| **Serialization** | ✅ As unit | ❌ No | ❌ No | ✅ Proposed |
| **Attachment Points** | ⚠️ Via scripts | ✅ Native | ✅ Uses slots | ✅ Enhanced |
| **Template Nesting** | ✅ Yes | ❌ No | ❌ No | ✅ Proposed |
| **Performance** | ✅ Efficient | ✅ Static | ❌ Per-frame loop | ✅ Efficient |
| **AI Generation** | ❌ Complex | ✅ Easy | ✅ Easy | ⚠️ Medium |

---

## Proposed Unified System

### Design Philosophy

**Keep all three concepts - they solve different problems:**

1. **Hierarchy** (NEW): Entity composition and structure
2. **Slots**: Attachment points on templates  
3. **Variables**: Gameplay tuning parameters

### Example: Character Prefab with All Three

```typescript
const game: GameDefinition = {
  // Layer 3: Tunable variables for gameplay balance
  variables: {
    walkSpeed: 5,
    jumpForce: 15,
    weaponDamage: 10,
  },
  
  variableMetadata: {
    walkSpeed: { tunable: true, range: { min: 2, max: 10, step: 0.5 } },
    jumpForce: { tunable: true, range: { min: 5, max: 25, step: 1 } },
    weaponDamage: { tunable: true, range: { min: 5, max: 50, step: 5 } },
  },
  
  templates: {
    // Layer 0: Hierarchical prefab composition
    playerCharacter: {
      id: 'playerCharacter',
      sprite: { type: 'image', url: 'player.png', width: 1, height: 2 },
      physics: { /* ... */ },
      
      // Layer 2: Slots define attachment points
      slots: {
        head: { x: 0, y: 0.8 },
        leftHand: { x: -0.3, y: 0.2 },
        rightHand: { x: 0.3, y: 0.2 },
        backpack: { x: 0, y: 0, layer: -1 },
      },
      
      // Layer 0: Child entities nested in template
      children: [
        {
          name: 'Hat',
          template: 'hat',
          slot: 'head',  // References slot above
          localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
        },
        {
          name: 'Sword',
          template: 'weapon',
          slot: 'rightHand',
          localTransform: { x: 0, y: 0, angle: 45, scaleX: 1, scaleY: 1 },
        },
      ],
      
      behaviors: [
        { type: 'move', speed: { expr: "walkSpeed" } },  // Layer 3: Use variable
      ],
    },
    
    hat: {
      id: 'hat',
      sprite: { type: 'image', url: 'hat.png', width: 0.4, height: 0.3 },
    },
    
    weapon: {
      id: 'weapon',
      sprite: { type: 'image', url: 'sword.png', width: 0.2, height: 0.8 },
      behaviors: [
        { type: 'rotate', speed: 2 },
      ],
    },
  },
  
  entities: [
    {
      id: 'player',
      template: 'playerCharacter',  // Instantiates entire hierarchy!
      transform: { x: 0, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
      
      // Layer 1: Asset pack overrides
      assetPackId: 'knight-theme',
      
      // Layer 0: Can override child properties
      childOverrides: {
        'Hat': { sprite: { url: 'crown.png' } },  // Swap hat for crown
        'Sword': { visible: false },  // Hide weapon
      },
    },
  ],
};
```

### When spawning `playerCharacter`:

1. **Hierarchy** creates parent + children entities
2. **Slots** define where children attach
3. **Variables** parameterize behavior speeds/forces
4. **Assets** determine visual appearance

All four layers work together!

---

## Pros & Cons Analysis

### Option A: Keep Current System (attach_to only)

**✅ Pros:**
- Simple mental model
- Works for basic attachment
- No breaking changes
- AI can generate easily

**❌ Cons:**
- Per-frame overhead for every attached entity
- No cascade operations (destroy, disable, tag propagation)
- Can't serialize complex multi-entity prefabs
- No relative transforms (everything world-space)
- Manual management of child lifecycle

**Verdict**: ❌ **Not sufficient** for complex game types (characters with equipment, modular vehicles, boss with parts)

---

### Option B: Add True Hierarchy (Proposed)

**✅ Pros:**
- Automatic transform propagation
- Cascade operations (destroy parent → children gone)
- Serialize nested prefabs as units
- Relative (local) transforms
- Better performance (no per-frame behavior)
- Enable complex composition patterns
- Industry standard approach

**❌ Cons:**
- More complex entity management
- Need to track parent/child relationships
- Potential for circular reference bugs
- AI needs to understand nesting
- Breaking change for EntityManager

**Verdict**: ✅ **Worth it** - unlocks entire class of game mechanics

---

### Option C: Hybrid (Recommended)

**Keep both systems:**
- **Hierarchy** for structural composition (character with limbs)
- **attach_to** for dynamic runtime attachment (pickup item, mount vehicle)

**When to use which:**

| Use Hierarchy | Use attach_to Behavior |
|---------------|------------------------|
| Fixed structural relationships | Dynamic gameplay attachment |
| Multi-part characters | Picking up items |
| Vehicles with parts | Mounting vehicles |
| Boss with destructible parts | Grappling hook attachment |
| Modular weapons | Magnet pickup |

**Example**: Character has hierarchical body parts (head, torso, arms), but uses `attach_to` to pick up weapons dynamically.

**Verdict**: ✅ **BEST** - Maximum flexibility

---

## Hierarchy of Customization Revisited

With proper entity hierarchy, the customization layers become:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 0: PREFAB COMPOSITION (Structural)                │
│ ─────────────────────────────────────────────────────── │
│ Define HOW entities are composed                        │
│ • Parent-child relationships                            │
│ • Nested template instances                             │
│ • Structural overrides                                  │
│                                                          │
│ Example: Character = Body + Head + Arms (tree)          │
└─────────────┬───────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 1: SLOTS (Spatial Anchors)                        │
│ ─────────────────────────────────────────────────────── │
│ Define WHERE on entities children attach                │
│ • Named coordinate points                               │
│ • Layer offsets for z-ordering                          │
│                                                          │
│ Example: Body has "head" slot at (0, 1.0)              │
└─────────────┬───────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: ASSET SWAPPING (Visual)                        │
│ ─────────────────────────────────────────────────────── │
│ Define WHAT entities look like                          │
│ • Sprite image URLs                                     │
│ • Asset pack references                                 │
│ • Animation frames                                      │
│                                                          │
│ Example: Swap knight.png for wizard.png                │
└─────────────┬───────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: TUNABLE VARIABLES (Behavioral)                 │
│ ─────────────────────────────────────────────────────── │
│ Define HOW FAST/STRONG behaviors are                    │
│ • Variables with metadata                               │
│ • Slider ranges for live tuning                         │
│ • Expression-driven values                              │
│                                                          │
│ Example: jumpForce = 15 (tunable 5-25)                 │
└─────────────┬───────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 4: CUSTOM JAVASCRIPT (Logical) - FUTURE           │
│ ─────────────────────────────────────────────────────── │
│ Define custom logic beyond declarative behaviors        │
│ • Sandboxed JS execution                                │
│ • Custom algorithms                                     │
│ • Advanced AI patterns                                  │
│                                                          │
│ Example: Custom enemy AI script                        │
└─────────────────────────────────────────────────────────┘
```

**All 5 layers are ORTHOGONAL** - they solve different problems and compose cleanly.

---

## Proposed: True Entity Hierarchy

### Type Changes

```typescript
export interface RuntimeEntity {
  id: string;
  name: string;
  template?: string;
  
  // NEW: Hierarchy fields
  parentId?: string;
  children: string[];
  
  // NEW: Dual transforms
  localTransform: TransformComponent;   // Relative to parent
  worldTransform: TransformComponent;   // Computed (cached)
  
  // ... existing fields
}

export interface GameEntity {
  id: string;
  template?: string;
  transform: TransformComponent;
  
  // NEW: Nested children in definition
  children?: ChildEntityDefinition[];
  
  // ... existing fields
}

export interface ChildEntityDefinition {
  id?: string;  // Optional - auto-generate if not provided
  name: string;
  template: string;
  localTransform: TransformComponent;
  slot?: string;  // References parent's slot
  overrides?: {
    sprite?: Partial<SpriteComponent>;
    physics?: Partial<PhysicsComponent>;
    behaviors?: Behavior[];
    tags?: string[];
  };
}

export interface EntityTemplate {
  id: string;
  
  // NEW: Template-level children (part of prefab definition)
  children?: ChildTemplateDefinition[];
  
  // ... existing fields including slots
}

export interface ChildTemplateDefinition {
  name: string;
  template: string;
  localTransform: TransformComponent;
  slot?: string;  // References this template's slot
  overrides?: {
    sprite?: Partial<SpriteComponent>;
    physics?: Partial<PhysicsComponent>;
    behaviors?: Behavior[];
  };
}
```

### EntityManager Operations

```typescript
class EntityManager {
  // NEW: Hierarchy operations
  getParent(entityId: string): RuntimeEntity | undefined;
  getChildren(entityId: string): RuntimeEntity[];
  getRoot(entityId: string): RuntimeEntity;
  getDescendants(entityId: string): RuntimeEntity[];
  
  // NEW: Transform propagation
  updateWorldTransforms(rootId: string): void;
  setLocalTransform(entityId: string, transform: TransformComponent): void;
  
  // ENHANCED: Cascade operations
  destroyEntity(id: string, recursive?: boolean): void;
  setVisible(id: string, visible: boolean, recursive?: boolean): void;
  
  // NEW: Prefab instantiation
  instantiatePrefab(templateId: string, worldTransform: TransformComponent): string[];
}
```

### Transform Propagation Algorithm

```typescript
function updateWorldTransforms(entity: RuntimeEntity, manager: EntityManager) {
  if (entity.parentId) {
    const parent = manager.getEntity(entity.parentId);
    if (parent) {
      // Compute world transform from parent's world + child's local
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
}
```

---

## Slots + Hierarchy: How They Work Together

### Slots provide coordinates, Hierarchy enforces structure

```typescript
// Template defines structure + attachment points
playerCharacter: {
  sprite: { /* ... */ },
  
  // SLOTS: Where children CAN attach
  slots: {
    head: { x: 0, y: 0.8 },
    weapon: { x: 0.3, y: 0 },
  },
  
  // HIERARCHY: Which children ARE attached by default
  children: [
    {
      name: 'Head',
      template: 'humanHead',
      slot: 'head',  // Uses slot coordinates
      localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
}

// At runtime, can dynamically attach more
// via rules or attach_to behavior:
{
  trigger: { type: 'tap', target: 'weapon_pickup' },
  actions: [
    {
      type: 'spawn',
      template: 'sword',
      position: { type: 'at_entity', entityId: 'player' },
      attachToSlot: 'weapon',  // NEW: Spawn as child in hierarchy
    }
  ]
}
```

**Benefits of this approach:**
1. Slots remain simple coordinate definitions
2. Hierarchy handles structural relationships
3. Both work together for clean composition
4. AI can generate slots easily
5. AI can generate hierarchies with more guidance
6. Backward compatible (entities without children work as before)

---

## Implementation Impact

### Effort Estimate

| Task | Days | Complexity |
|------|------|------------|
| Add hierarchy fields to types | 0.5d | Low |
| Implement transform propagation | 1d | Medium |
| Add parent/child operations to EntityManager | 1.5d | Medium |
| Update physics sync (world transforms) | 1d | Medium |
| Add cascade operations | 0.5d | Low |
| Prefab instantiation | 1d | Medium |
| Schema updates | 0.5d | Low |
| Tests | 1d | Medium |
| Update existing attach_to behavior | 0.5d | Low |
| AI integration | 1.5d | Medium |
| Documentation | 1d | Low |

**TOTAL**: ~10 days (2 weeks)

### Breaking Changes

**Minimal if done carefully:**
- Existing flat entities work unchanged (no parent, no children)
- `attach_to` behavior continues to work (can coexist with hierarchy)
- Templates without children work as before

**Migration path**: Opt-in, not forced.

---

## Answers to User's Questions

### Q: "Do we have a full tree hierarchy for all of our entities?"

**A**: ❌ **NO** - Currently entities are flat. The `attach_to` behavior simulates parent-child by manually copying transforms every frame, but there's no true scene graph.

### Q: "Do we support something like Unity's prefabs in our slot system?"

**A**: ⚠️ **PARTIALLY** - Slots provide attachment coordinates, but they're NOT hierarchical prefabs. Current limitations:
- Can't nest templates
- Can't instantiate a multi-entity prefab as a unit
- No transform inheritance
- No cascade operations

### Q: "How generic and how composable is that?"

**A**: 🔴 **LIMITED** - Current system is good for simple attachment but lacks the composability of Unity prefabs. Comparison:

| Capability | Unity | Slopcade Today |
|------------|-------|----------------|
| Define nested structures | ✅ | ❌ |
| Spawn as single unit | ✅ | ❌ |
| Automatic propagation | ✅ | ❌ (manual per-frame) |
| Cascade operations | ✅ | ❌ |
| Local transforms | ✅ | ❌ (world only) |
| Attachment points | ✅ | ✅ (via slots) |

### Q: "Should we change anything about that?"

**A**: ✅ **YES** - Add proper entity hierarchy:

**Recommendation**: Implement true parent-child hierarchy as described above. This would:
1. **Keep slots** (attachment coordinates)
2. **Keep tunables** (variables + metadata)
3. **Keep attach_to** (dynamic runtime attachment)
4. **Add hierarchy** (structural composition)

All four concepts are complementary, not competitive.

---

## Real-World Examples

### Example 1: Boss Fight with Destructible Parts

**With Hierarchy:**
```typescript
bossPrefab: {
  id: 'boss',
  sprite: { /* main body */ },
  children: [
    { name: 'LeftArm', template: 'bossArm', slot: 'leftShoulder',
      behaviors: [{ type: 'health', maxHealth: 100 }] },
    { name: 'RightArm', template: 'bossArm', slot: 'rightShoulder',
      behaviors: [{ type: 'health', maxHealth: 100 }] },
    { name: 'Core', template: 'bossCore', slot: 'center',
      behaviors: [{ type: 'health', maxHealth: 500 }] },
  ]
}
```

**Benefits**:
- Destroy arm → Only that arm destroyed, body remains
- Move boss → Arms follow automatically
- Each part has independent health/behaviors

**With attach_to only**: Would need complex manual tracking of which entities belong to boss.

### Example 2: Customizable Race Car

**With Hierarchy + Slots + Variables:**
```typescript
raceCar: {
  slots: { 
    frontWheel: { x: 1.2, y: -0.5 },
    backWheel: { x: -1.2, y: -0.5 },
    spoiler: { x: -1.5, y: 0.3 },
  },
  children: [
    { name: 'FrontWheel', template: 'wheel', slot: 'frontWheel' },
    { name: 'BackWheel', template: 'wheel', slot: 'backWheel' },
    { name: 'Spoiler', template: 'spoiler', slot: 'spoiler' },  // Optional
  ],
  behaviors: [
    { type: 'move', speed: { expr: "enginePower" } },  // Tunable variable
  ],
}

// Player can:
// - Swap car sprite (Layer 1: Assets)
// - Remove spoiler (Layer 0: Hierarchy)
// - Move spoiler slot (Layer 2: Slots)
// - Tune engine power (Layer 3: Variables)
```

### Example 3: Modular Tower (Tower Defense)

```typescript
tower: {
  children: [
    { name: 'Base', template: 'towerBase' },
    { name: 'Gun', template: 'turret', slot: 'top',
      children: [  // Nested 2 levels!
        { name: 'Barrel', template: 'barrel', slot: 'muzzle' },
      ]
    },
  ]
}
```

**Benefits**: Rotate gun → barrel rotates too (transform inheritance)

---

## Integration with Existing Systems

### Hierarchy + Slots

```typescript
// Slots define coordinates
slots: { head: { x: 0, y: 1.0 } }

// Hierarchy references slots
children: [
  { template: 'hat', slot: 'head' }  // Uses slot coordinates
]
```

**Perfect synergy**: Slots provide coordinates, hierarchy provides structure.

### Hierarchy + Variables

```typescript
// Variables for tuning
variables: { walkSpeed: 5, jumpForce: 15 }

// Hierarchy with variable-driven behaviors
children: [
  { template: 'legs', behaviors: [
    { type: 'move', speed: { expr: "walkSpeed" } }
  ]}
]
```

**Perfect synergy**: Variables parameterize hierarchical entities.

### Hierarchy + attach_to

```typescript
// Structural hierarchy (fixed)
children: [
  { name: 'Body', template: 'body' },
  { name: 'Head', template: 'head', slot: 'neck' },
]

// Dynamic attachment (runtime)
pickup: {
  behaviors: [
    { type: 'attach_to', parentTag: 'player', slotName: 'rightHand' }
  ]
}
```

**Perfect synergy**: Hierarchy for structure, attach_to for gameplay.

---

## AI Generation Complexity

### Without Hierarchy

```json
{
  "entities": [
    { "id": "player", "template": "character" },
    { "id": "hat", "template": "hat",
      "behaviors": [{"type": "attach_to", "parentTag": "character", "slotName": "head"}] }
  ]
}
```

**AI must**:
- Generate separate entities
- Remember to add attach_to behavior
- Manage IDs manually

### With Hierarchy

```json
{
  "templates": {
    "character": {
      "slots": {"head": {"x": 0, "y": 1}},
      "children": [
        {"name": "Hat", "template": "hat", "slot": "head"}
      ]
    }
  },
  "entities": [
    { "id": "player", "template": "character" }
  ]
}
```

**AI must**:
- Define children array in template
- Reference slot names

**Verdict**: Hierarchy is EASIER for AI - more declarative, less manual wiring.

---

## Recommended Path Forward

### Phase 1: Design & Prototype (1 week)

1. ✅ **Create this analysis doc** - Done
2. ⏳ **Validate with Oracle** - Get architectural review
3. ⏳ **Create detailed type spec** - Full TypeScript interfaces
4. ⏳ **Prototype transform propagation** - Proof of concept
5. ⏳ **Test with simple prefab** - Character with hat example

### Phase 2: Implementation (2 weeks)

1. ⏳ Add hierarchy fields to RuntimeEntity
2. ⏳ Implement parent/child tracking in EntityManager
3. ⏳ Add transform propagation algorithm
4. ⏳ Update physics sync to use worldTransform
5. ⏳ Add cascade operations (destroy, visibility, etc.)
6. ⏳ Implement prefab instantiation
7. ⏳ Update schemas
8. ⏳ Write comprehensive tests

### Phase 3: Integration (1 week)

1. ⏳ Update AI prompts for hierarchy generation
2. ⏳ Create example prefabs (character, vehicle, boss)
3. ⏳ Update documentation
4. ⏳ Migration guide for existing games

---

## Architectural Principles

### Keep These Concepts Separate

1. **Hierarchy**: WHO is connected to WHO
2. **Slots**: WHERE attachments happen
3. **Variables**: HOW MUCH/FAST things behave
4. **Assets**: WHAT things look like

**Don't conflate them** - each solves a distinct problem.

### Design for Layered Customization

Users should be able to customize at any layer without affecting others:
- Change assets without touching hierarchy
- Adjust variables without restructuring entities
- Modify slots without changing behavior logic
- Rearrange hierarchy without affecting variables

### AI-Friendly Declarative Design

All layers should be:
- JSON-serializable
- Declarative (what, not how)
- Validatable by schema
- Generatable by AI with clear rules

---

## Conclusion

### Current State Assessment

| System | Status | Verdict |
|--------|--------|---------|
| **Slots** | ✅ Implemented | Good - keep as-is |
| **Variables** | ✅ Implemented | Good - add metadata |
| **Hierarchy** | ❌ Missing | **Critical gap** - need to add |
| **attach_to** | ✅ Implemented | Good - keep for dynamic cases |

### Critical Finding

**Slopcade currently lacks true entity hierarchies**, which are essential for:
- Complex multi-part entities (characters, vehicles, bosses)
- Modular composition (build-a-bot, dress-up games)
- Efficient transform propagation
- Cascade operations
- Unity-style prefab workflows

### Recommendation

**ADD ENTITY HIERARCHY SYSTEM** as proposed above:
- ~10 days implementation
- Backward compatible (opt-in)
- Unlocks new game types
- Simplifies AI generation
- Brings parity with Unity prefabs
- Complements (doesn't replace) slots, variables, attach_to

**The four systems work together beautifully - they're not competing, they're complementary.**

---

## Next Step

Recommend consulting Oracle for architectural review of the proposed hierarchy system before implementation.
