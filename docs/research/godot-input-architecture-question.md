# Research Question: Godot Input Hit Testing Architecture

## Context

We're building a React Native game engine that uses Godot 4 as the physics and rendering backend. Games are defined in TypeScript and loaded into Godot via a JavaScript bridge.

## Our Current Architecture

### Two Types of Tappable Entities

We have two distinct use cases for entities that respond to tap/click input:

1. **Physics Objects** - Entities with physics simulation (RigidBody2D, StaticBody2D)
   - Have mass, velocity, collision response
   - Examples: balls, paddles, bouncing objects
   - Created as `RigidBody2D` or `StaticBody2D` in Godot

2. **UI/Hitbox Objects** - Entities that are purely visual with tap regions
   - No physics simulation needed
   - Examples: buttons, tube sensors in puzzle games, grid cells
   - Should NOT participate in physics simulation

### Current Implementation

**Physics Objects:**
```gdscript
# Created as RigidBody2D or StaticBody2D
var body = RigidBody2D.new()
var collider = CollisionShape2D.new()
collider.shape = RectangleShape2D.new()
body.add_child(collider)
```

**UI/Hitbox Objects (current approach - problematic):**
```gdscript
# We've been using StaticBody2D with isSensor: true on the collider
var body = StaticBody2D.new()  
var collider = CollisionShape2D.new()
collider.shape = RectangleShape2D.new()
# Setting sensor flag somehow...
body.add_child(collider)
```

### How We Detect Taps

**In Godot (GameBridge.gd):**
```gdscript
func query_point(x: float, y: float) -> Variant:
    var space = get_viewport().find_world_2d().direct_space_state
    var query = PhysicsPointQueryParameters2D.new()
    query.position = godot_pos
    query.collide_with_bodies = true
    query.collide_with_areas = true
    
    var results = space.intersect_point(query, 1)
    if results.size() > 0:
        return body_id_map[results[0].collider.name]
    return null
```

**In TypeScript (useGameInput.ts):**
```typescript
// Path 1: Query physics world
const bodyId = physics.queryPoint(worldPos);
if (bodyId) {
  const entity = entities.find(e => e.bodyId?.value === bodyId.value);
  if (entity) return entity.id;
}

// Path 2: Geometric hit test for collider-only entities
for (const entity of entities) {
  if (entity.bodyId) continue;  // Skip physics entities
  if (isPointInCollider(worldX, worldY, entity)) return entity.id;
}
```

## The Problem

We're unsure if our approach aligns with Godot best practices:

1. **Should UI hitboxes use Area2D instead of StaticBody2D with sensors?**
   - We've been mixing `isSensor: true` with physics bodies
   - This feels wrong - sensors are for overlap detection, not input

2. **Is `intersect_point` the right way to detect clicks?**
   - We query the physics space to find what was clicked
   - Should we be using a different mechanism for UI elements?

3. **Should we have two separate systems?**
   - Physics queries for physics objects
   - Something else (CanvasItem picking? Area2D?) for UI hitboxes

4. **What's the Godot-idiomatic way to handle this?**
   - Input events with `_input_event` on CollisionObject2D?
   - Area2D with `input_pickable`?
   - Manual point-in-rect testing?

## Specific Questions for Research

1. **What is the recommended Godot 4 pattern for clickable UI elements in a 2D physics game?**
   - Should they be Area2D nodes?
   - Should they use `input_pickable` property?
   - Should we handle `_input_event` signal?

2. **How does `intersect_point` behave with Area2D vs physics bodies?**
   - Does `collide_with_areas = true` find Area2D nodes?
   - Is this the right query for click detection?

3. **What's the performance difference between:**
   - Physics space queries (`intersect_point`)
   - Input event propagation (`_input_event`)
   - Manual geometric testing

4. **Is there a way to unify physics and UI hit testing in Godot 4?**
   - Or should they be completely separate systems?

## Our Entity Definition Format

```typescript
// Physics object (ball in a physics game)
ball: {
  physics: { bodyType: "dynamic", density: 1 },
  collider: { shape: "circle", radius: 0.5 },
  visual: { type: "circle", radius: 0.5, color: "#ff0000" }
}

// UI hitbox (tube sensor in Ball Sort puzzle)
tubeSensor: {
  // No physics needed - just a tappable region
  collider: { shape: "box", width: 1.5, height: 5 },
  visual: { type: "rect", width: 1.5, height: 5, color: "#00000022" }
}
```

## What We Want to Achieve

1. **Physics objects**: Normal physics simulation + tappable via physics queries
2. **UI hitboxes**: No physics simulation + tappable via some efficient mechanism
3. **Clear separation**: Not mixing physics concepts (sensors) with input concepts (clickable regions)
4. **Performance**: Efficient hit testing for both types

## Current File Locations

- `godot_project/scripts/GameBridge.gd` - Main bridge, entity creation
- `godot_project/scripts/physics/PhysicsQueries.gd` - Point queries
- `godot_project/scripts/entity/EntityFactory.gd` - Entity creation
- `app/lib/game-engine/hooks/useGameInput.ts` - TypeScript input handling
- `app/lib/game-engine/EntityManager.ts` - Entity creation/management
