# Hole.io Game Archetype Analysis

> Top-down game where player controls an expanding hole that consumes objects

## Overview

**Genre**: Casual / Action  
**Examples**: Hole.io, Donut County, Katamari (spiritual cousin)  
**Core Loop**: Move hole → Eat smaller objects → Grow bigger → Eat bigger objects → Win by size/clear

## Game Requirements

### Core Mechanics

| Mechanic | Description | Priority |
|----------|-------------|----------|
| Hole Movement | Player controls hole position via drag/joystick | Critical |
| Size Comparison | Hole can only eat objects smaller than itself | Critical |
| Object Consumption | Objects fall into hole and disappear | Critical |
| Hole Growth | Hole grows when eating objects | Critical |
| Object Variety | Different object sizes and point values | Critical |
| Win Condition | Timer-based, size target, or clear-all | Critical |
| Arena Bounds | Playable area with walls/edges | Critical |
| Size Tiers | Objects grouped by consumable thresholds | High |
| Score System | Points per object eaten | High |
| Visual Feedback | Satisfying eat animation/sound | High |
| Object Spawning | Replenish objects during gameplay | Medium |
| Multiplayer (future) | Competitive hole eating | Low |

### Visual Requirements

| Element | Description |
|---------|-------------|
| Hole Sprite | Top-down hole with depth illusion |
| Arena Background | Ground texture (city, park, etc.) |
| Object Sprites | Various sizes: people, cars, buildings |
| Eat Animation | Objects shrinking/falling into hole |
| Growth VFX | Hole expanding effect |
| Size Indicator | Visual cue for current hole size |
| UI | Timer, score, size meter |

### Input Requirements

| Input | Action |
|-------|--------|
| Drag/Joystick | Move hole in 2D plane |
| Tilt (optional) | Alternative movement control |

## Current Engine Capability Assessment

### What EXISTS Today

| Feature | Engine Support | Notes |
|---------|---------------|-------|
| Entity spawning | ✅ Full | Spawn objects across arena |
| Movement | ✅ Full | `move` behavior + input |
| Drag input | ✅ Full | Rules with drag trigger |
| Collision detection | ✅ Full | Sensors for overlap |
| Destroy on collision | ✅ Full | `destroy_on_collision` |
| Score system | ✅ Full | Variables + scoring |
| Win/lose conditions | ✅ Full | Timer, score, entity_count |
| Visual effects | ✅ Full | Particles, scale animations |
| Variables | ✅ Full | Store hole size |
| Expressions | ✅ Full | Compare sizes |

### What's MISSING (Critical Gaps)

| Gap | Severity | Description |
|-----|----------|-------------|
| Dynamic Collider Resize | 🔴 Critical | Can't change physics shape at runtime |
| Object Size Property | 🟡 High | No standard "size" convention |
| Growth Animation | 🟡 High | Smooth scale transitions |
| Broadphase Queries | 🟢 Low | Performance optimization for many objects |

## Feasibility Analysis

### Can It Be Built Today?

**Verdict: YES/PARTIAL (70-85% coverage)**

Hole.io maps well to the physics-sensor model. The main blocker is dynamic collider resizing.

### Key Technical Challenge: Collider Resizing

The hole needs to grow, which means its sensor radius must increase. Options:

#### Option A: Destroy & Recreate (Works Today, Hacky)
```
1. Store hole state in variables (size, score)
2. On growth trigger, destroy current hole entity
3. Spawn new hole entity with larger collider
4. Restore position and state from variables
```

**Problems**: 
- Momentary physics gap (objects might pass through)
- Complex rule chain
- Visual glitch during recreation

#### Option B: Multiple Sensor Layers (Works Today, Limited)
```
1. Hole has multiple nested sensor circles (r=1, r=2, r=3, etc.)
2. On growth, enable next larger sensor, disable smaller
3. Each sensor tier handles specific object sizes
```

**Problems**:
- Fixed growth tiers (not smooth)
- Complexity scales with tier count
- Each tier needs separate collision rules

#### Option C: Runtime Collider Resize (Requires Engine Work)
```typescript
// New action
interface SetColliderSizeAction {
  type: 'set_collider_size';
  target: EntityTarget;
  // For circles
  radius?: Value<number>;
  // For boxes
  width?: Value<number>;
  height?: Value<number>;
  // For uniform scaling
  scale?: Value<number>;
}
```

**Best Solution**: This is a clean, reusable primitive.

### Recommended Engine Additions

#### 1. Runtime Collider Resize

```typescript
// In packages/physics or GodotBridge
interface Physics2D {
  // ... existing methods
  setColliderSize(bodyId: BodyId, colliderId: ColliderId, shape: ShapeDef): void;
  // Or simpler:
  scaleCollider(bodyId: BodyId, scale: number): void;
}

// In rules/actions
interface SetColliderSizeAction {
  type: 'set_collider_size';
  target: { type: 'by_id' | 'by_tag'; entityId?: string; tag?: string };
  radius?: Value<number>; // For circles
  scale?: Value<number>;  // Uniform scale multiplier
}
```

Implementation in Godot:
```gdscript
func set_collider_size(entity_id: String, radius: float):
    var body = get_body(entity_id)
    var shape = body.get_node("CollisionShape2D")
    if shape.shape is CircleShape2D:
        shape.shape.radius = radius * pixels_per_meter
```

#### 2. Size Convention

Standardize a `size` variable that entities can use:

```typescript
// Convention: entities with consumable tag should have size variable
interface ConsumableEntity {
  // In template or entity
  variables: {
    size: number; // Relative size value
  };
}

// Comparison in rules
conditions: [
  { type: 'expression', expr: 'var:target.size < var:hole.size' }
]
```

#### 3. Consume Action (Quality of Life)

```typescript
// Combines multiple steps into one atomic action
interface ConsumeAction {
  type: 'consume';
  consumer: EntityTarget; // The hole
  consumed: EntityTarget; // The object
  scoreValue: Value<number>;
  growthValue: Value<number>; // Added to consumer's size
  effect?: 'shrink' | 'fall' | 'none';
}
```

## Implementation Phases

### Phase 1: Collider Resize (Engine Work)
**Effort: Short (0.5-1 day)**

1. Add `scaleCollider(bodyId, scale)` to Physics2D interface
2. Implement in Box2DAdapter (recreate fixture with new shape)
3. Implement in GodotBridge (update CollisionShape2D)
4. Add `set_collider_size` action to rules system
5. Test with simple grow-on-tap demo

### Phase 2: Basic Hole.io Game
**Effort: Medium (2-3 days)**

1. Create arena with boundaries
2. Create hole template:
   - Kinematic body with sensor circle
   - Visual sprite (hole graphic)
   - `size` variable initialized to 1
3. Create object templates (3-5 tiers):
   - Small: people, signs (size: 0.5-1)
   - Medium: cars, trees (size: 1-2)
   - Large: trucks, houses (size: 2-4)
   - Huge: buildings (size: 4+)
4. Movement: drag/joystick controls hole position
5. Consumption rules:
   ```
   trigger: collision (hole, consumable)
   conditions: [object.size < hole.size]
   actions: 
     - destroy object
     - add score
     - increase hole.size
     - set_collider_size
   ```
6. Win condition: timer expires, highest score wins
7. Spawn objects at start, optionally respawn during game

### Phase 3: Polish & Juice
**Effort: Short-Medium (1-2 days)**

1. Eat animation: object shrinks and falls into hole
2. Growth animation: smooth scale transition
3. Size milestone effects (screen shake, sound)
4. Object variety: 10-15 types across tiers
5. Progressive unlock: some objects appear only at certain sizes
6. Timer pressure UI
7. Sound design: satisfying gulp sounds

### Phase 4: Template & Skinning
**Effort: Short (0.5-1 day)**

1. Extract parameters:
   - Arena size and bounds
   - Object types, sizes, values
   - Spawn density and positions
   - Growth curve
   - Timer duration
   - Win conditions
2. Create asset pack structure
3. Document skinning API

## Skinnable Template Design

```typescript
interface HoleIoTemplate {
  // Arena
  arena: {
    width: number;
    height: number;
    background: string;
    wallTemplate: string;
  };
  
  // Hole config
  hole: {
    startSize: number;
    maxSize: number;
    growthRate: number; // Size added per unit consumed
    spriteTemplate: string;
    movementSpeed: number;
  };
  
  // Objects
  objects: Array<{
    id: string;
    size: number;
    points: number;
    spawnCount: number;
    spawnWeight: number; // Probability
    spriteTemplate: string;
    minHoleSizeToSpawn?: number; // Progressive spawning
  }>;
  
  // Spawning
  spawning: {
    initialCount: number;
    respawnEnabled: boolean;
    respawnInterval?: number;
  };
  
  // Game rules
  rules: {
    duration: number; // Seconds
    winCondition: 'timer' | 'clear_all' | 'size_target';
    targetSize?: number;
  };
  
  // Effects
  effects: {
    consumeVfx: string;
    growthVfx: string;
    milestoneVfx: string;
  };
}
```

## Asset Requirements for Skinning

| Asset Type | Count | Description |
|------------|-------|-------------|
| Hole Sprite | 1 | Top-down hole with depth |
| Arena Background | 1 | Ground/floor texture |
| Object Sprites | 10-15 | Various sizes and types |
| Boundary/Wall | 1 | Edge of arena |
| Consume VFX | 1 | Object falling effect |
| Growth VFX | 1 | Hole expanding pulse |
| UI Elements | 4+ | Timer, score, size meter |
| Sound Effects | 5+ | Consume (tiered), grow, milestone, music |

## Complexity Summary

| Aspect | Rating | Notes |
|--------|--------|-------|
| Engine Changes | 🟢 Low-Medium | Just collider resizing |
| Game Implementation | 🟡 Medium | Standard mechanics |
| Skinning Support | 🟢 Low | Highly themeable |
| AI Generation Fit | 🟢 Good | Objects are data-driven |

## Recommended Priority

**FIRST or SECOND (tied with Racing)**

Hole.io is an excellent fit for the current engine:
- Uses existing physics/sensor systems
- Only needs one new primitive (collider resize)
- Growth mechanic is satisfying and unique
- Easy to skin with different themes (city, farm, space, etc.)
- Tests expression system for size comparisons

## Theme Ideas for Skins

| Theme | Hole | Small Objects | Large Objects |
|-------|------|---------------|---------------|
| City | Sinkhole | People, signs | Cars, buildings |
| Farm | Rabbit hole | Chickens, crops | Tractors, barns |
| Space | Black hole | Asteroids, satellites | Planets, stars |
| Ocean | Whirlpool | Fish, shells | Boats, whales |
| Candy | Cookie bite | Candies, sprinkles | Cakes, donuts |

## Implementation Without Engine Changes

If you need Hole.io today without collider resize:

### Tiered Sensor Approach

```typescript
// Hole has multiple sensors at different radii
templates: {
  hole: {
    // ... base hole
    children: [
      { id: 'sensor-tier-1', sensor: true, radius: 0.5 },
      { id: 'sensor-tier-2', sensor: true, radius: 1.0, enabled: false },
      { id: 'sensor-tier-3', sensor: true, radius: 1.5, enabled: false },
      { id: 'sensor-tier-4', sensor: true, radius: 2.0, enabled: false },
    ]
  }
}

// Rules enable next tier on growth threshold
rules: [
  {
    trigger: { type: 'score', threshold: 100 },
    actions: [
      { type: 'modify', target: 'sensor-tier-2', property: 'enabled', value: true }
    ]
  }
]
```

This works but is less smooth than continuous resizing.

## Related Engine Tickets

1. **[physics] scaleCollider()** - Runtime collider resize
2. **[action] set_collider_size** - Rule action for resizing
3. **[action] consume** - Atomic consume + grow helper
4. **[convention] size variable** - Standard size property for comparisons
