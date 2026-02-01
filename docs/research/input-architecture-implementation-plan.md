# Input Architecture Implementation Plan

## Problem Statement

Ball Sort game tubes aren't responding to taps. Root cause: the input system only queries physics bodies via `physics.queryPoint()`, but tube sensors don't need physics simulation - they're just tappable hitboxes.

## Research Conclusion (Validated Against Godot 4 Best Practices)

**Use Area2D for UI hitboxes, not StaticBody2D with sensors.**

Key insight: `intersect_point` with `collide_with_areas = true` finds BOTH physics bodies AND Area2D nodes. We can unify to a single query path.

## Current Architecture (Broken)

```
TypeScript Entity Definition
    ↓
EntityManager.ts creates RuntimeEntity
    ↓
Sends to Godot via bridge
    ↓
GameBridge.gd / EntityFactory.gd creates:
  - RigidBody2D (dynamic physics)
  - StaticBody2D (static physics) 
  - StaticBody2D with isSensor (WRONG - UI hitboxes)
    ↓
queryPoint() only finds physics bodies
    ↓
UI hitboxes NOT found by tap detection
```

## Target Architecture (Correct)

```
TypeScript Entity Definition
    ↓
EntityManager.ts creates RuntimeEntity
    ↓
Sends to Godot via bridge with clear type:
  - hasPhysics: true → physics body
  - hasCollider but no physics → Area2D
    ↓
GameBridge.gd / EntityFactory.gd creates:
  - RigidBody2D (dynamic) - Layer 1
  - StaticBody2D (static) - Layer 1
  - Area2D (UI hitboxes) - Layer 2
    ↓
queryPoint() finds BOTH (collide_with_bodies + collide_with_areas)
    ↓
Single unified tap detection path
```

## Collision Layer Convention

- **Layer 1**: Physics objects (bodies collide with each other)
- **Layer 2**: UI hitboxes (Area2D, only for point queries, no physics interaction)

## Files That Need Changes

### Godot Side

1. **`godot_project/scripts/entity/EntityFactory.gd`**
   - Add `create_area2d_entity()` function for collider-only entities
   - Decision logic: if entity has `collider` but no `physics` → Area2D
   
2. **`godot_project/scripts/GameBridge.gd`**
   - Update entity creation routing to use Area2D for hitboxes
   - Ensure `body_id_map` works with Area2D nodes (they have names too)

3. **`godot_project/scripts/physics/PhysicsQueries.gd`**
   - Already has `collide_with_areas = true` ✓
   - Verify it returns Area2D entities correctly

### TypeScript Side

4. **`app/lib/game-engine/hooks/useGameInput.ts`**
   - REMOVE the geometric fallback (`isPointInCollider`, the loop over non-physics entities)
   - Keep only the `physics.queryPoint()` path (it will find Area2D too once Godot is updated)

5. **`app/lib/game-engine/EntityManager.ts`**
   - Ensure entities without `physics` but with `collider` are sent to Godot correctly
   - They should NOT get a physics body created
   - Godot should create Area2D for them

6. **`app/lib/godot/GodotBridge.web.ts` / `GodotBridge.native.ts`**
   - Verify entity spawn commands correctly convey "collider-only" vs "physics" intent

### Game Definitions

7. **`app/lib/test-games/games/ballSort/game.ts`**
   - Already updated: tubes have `collider` but no `physics` ✓
   - Verify it works after Godot changes

## Partial Work Already Done

In `useGameInput.ts`, I added a two-path approach:
```typescript
function findEntityAtPoint(worldX, worldY, game, physics) {
  // Path 1: Physics bodies
  if (physics) {
    const bodyId = physics.queryPoint({ x: worldX, y: worldY });
    if (bodyId) { /* find entity */ }
  }
  // Path 2: Collider-only entities (geometric test)
  for (const entity of entities) {
    if (entity.bodyId) continue;
    if (isPointInCollider(worldX, worldY, entity)) return entity.id;
  }
}
```

**This should be REMOVED** once Godot creates Area2D for collider-only entities. The unified `queryPoint` will find both.

In `ballSort/game.ts`, tubes now have:
```typescript
tubeSensor: {
  tags: ["tube"],
  visual: { type: "rect", ... },
  collider: { shape: "box", width: ..., height: ... },
  // NO physics component
}
```

## Implementation Steps

### Step 1: Update Godot Entity Creation

In `EntityFactory.gd`, add Area2D creation:

```gdscript
func create_entity(entity_id: String, config: Dictionary) -> Node2D:
    var has_physics = config.has("physics")
    var has_collider = config.has("collider")
    
    if has_physics:
        return create_physics_entity(entity_id, config)
    elif has_collider:
        return create_area2d_entity(entity_id, config)  # NEW
    else:
        return create_visual_only_entity(entity_id, config)

func create_area2d_entity(entity_id: String, config: Dictionary) -> Area2D:
    var area = Area2D.new()
    area.name = entity_id
    area.collision_layer = 2  # UI layer
    area.collision_mask = 0   # Doesn't detect anything on its own
    
    var collider_config = config.get("collider", {})
    var shape = CollisionShape2D.new()
    shape.shape = create_shape(collider_config)
    area.add_child(shape)
    
    # Add visual if present
    if config.has("visual"):
        add_visual(area, config.visual)
    
    return area
```

### Step 2: Update Physics Queries

In `PhysicsQueries.gd`, ensure Area2D entities are returned:

```gdscript
func query_point(x: float, y: float) -> Variant:
    var query = PhysicsPointQueryParameters2D.new()
    query.position = to_godot_coords(x, y)
    query.collide_with_bodies = true
    query.collide_with_areas = true  # Already there ✓
    
    var results = space.intersect_point(query, 1)
    if results.size() > 0:
        var collider = results[0].collider
        # collider is either a Body2D or Area2D - both have .name
        if collider and collider.name in entities:
            return body_id_map.get(collider.name, -1)
    return null
```

### Step 3: Simplify TypeScript Input

In `useGameInput.ts`, remove the geometric fallback:

```typescript
// BEFORE (two paths)
function findEntityAtPoint(worldX, worldY, game, physics) {
  // Physics path
  // Geometric fallback path
}

// AFTER (single path)
const handleTouchStart = useCallback((event) => {
  // ... coordinate conversion ...
  
  const physics = physicsRef.current;
  let targetEntityId: string | undefined;
  if (physics) {
    const bodyId = physics.queryPoint(worldPos);
    if (bodyId) {
      const entity = game.entityManager
        .getActiveEntities()
        .find((e) => e.bodyId?.value === bodyId.value);
      if (entity) {
        targetEntityId = entity.id;
      }
    }
  }
  // That's it - no fallback needed
});
```

Wait - there's an issue. Area2D nodes don't have a "bodyId" in the physics sense. We need to track them differently.

### Step 4: Entity ID Tracking (Important!)

The issue: `bodyId` is a physics concept. Area2D nodes don't have body IDs.

Solution options:
1. **Return entity ID directly from Godot** instead of body ID
2. **Use a separate map for Area2D** → entity ID
3. **Unify to always return entity ID** from queryPoint

**Recommended: Option 3** - Change `queryPoint` to return entity ID directly.

In Godot:
```gdscript
func query_point(x: float, y: float) -> String:  # Return entity_id, not body_id
    var results = space.intersect_point(query, 1)
    if results.size() > 0:
        var collider = results[0].collider
        if collider and collider.name in entities:
            return collider.name  # This IS the entity ID
    return ""
```

In TypeScript:
```typescript
// Instead of:
const bodyId = physics.queryPoint(worldPos);
const entity = entities.find(e => e.bodyId?.value === bodyId.value);

// Do:
const entityId = await bridge.queryPointEntity(worldPos);
// entityId is directly usable
```

Note: There's already a `queryPointEntity` function in the codebase! We should use that.

### Step 5: Write Tests

Create tests in `app/lib/game-engine/__tests__/`:

```typescript
// inputHitTesting.test.ts
describe('Input Hit Testing', () => {
  describe('Physics entities', () => {
    it('should find RigidBody2D at tap point');
    it('should find StaticBody2D at tap point');
    it('should return correct entity ID');
  });
  
  describe('Area2D entities (UI hitboxes)', () => {
    it('should find Area2D at tap point');
    it('should work for box colliders');
    it('should work for circle colliders');
  });
  
  describe('Layering', () => {
    it('should return topmost entity when overlapping');
    it('should not return Area2D when physics body is on top');
  });
});
```

## Summary of Changes

| File | Change |
|------|--------|
| `EntityFactory.gd` | Add `create_area2d_entity()` for collider-only entities |
| `GameBridge.gd` | Route collider-only entities to Area2D creation |
| `PhysicsQueries.gd` | Verify Area2D entities returned (already has `collide_with_areas`) |
| `useGameInput.ts` | Remove geometric fallback, use `queryPointEntity` |
| `ballSort/game.ts` | Already correct (collider-only tubes) |

## Testing Checklist

- [ ] Ball Sort: tapping tube picks up ball
- [ ] Ball Sort: tapping different tube drops ball
- [ ] Physics games (Slopeggle): tapping still works on physics objects
- [ ] Overlapping entities: correct one selected
- [ ] Performance: no regression from Area2D queries

## Key Files to Read First

1. `godot_project/scripts/entity/EntityFactory.gd` - Where entities are created
2. `godot_project/scripts/GameBridge.gd` - Main bridge, entity routing
3. `godot_project/scripts/physics/PhysicsQueries.gd` - Point query implementation
4. `app/lib/game-engine/hooks/useGameInput.ts` - TypeScript input handling
5. `app/lib/game-engine/EntityManager.ts` - Entity creation/management
