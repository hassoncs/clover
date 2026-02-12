# Physics

> **Skill for AI Agents**: Physics bodies, collision, joints, coordinates, world settings

## When to Use This Skill

Load when working on: physics, collision, bodies, joints, gravity, density, friction, restitution, damping, bullet mode, sensors, coordinates, PPM

## Key Concepts

- Godot 4 handles physics simulation; TypeScript provides configuration via GameDefinition JSON
- Body types map directly: `static`→StaticBody2D, `dynamic`→RigidBody2D, `kinematic`→CharacterBody2D
- Sensors (`isSensor: true`) use Area2D — detect overlaps without physical response
- Mass is derived from `density × shape area`, never set directly
- Center-origin coordinate system with Y-up; Godot uses Y-down (PPM = 50)

## Body Type Mapping

| Game `bodyType` | Godot Node | Use Case |
|-----------------|-----------|----------|
| `static` | `StaticBody2D` | Walls, floors, boundaries |
| `dynamic` | `RigidBody2D` | Balls, projectiles, anything simulated |
| `kinematic` | `CharacterBody2D` | Script-controlled movement |
| sensor (`isSensor: true`) | `Area2D` | Triggers, zones, score regions |

## Collision System

- `categoryBits` → Godot `collision_layer`. Default layers: `1` (Bodies), `2` (Sensors), `4` (Hitboxes)
- `maskBits` → Godot `collision_mask`. Defines what entity can collide with
- `destroy_on_collision` handled natively in GDScript (`CollisionSystem.gd`) for performance

## Physics Properties

| Property | Maps To | Notes |
|----------|---------|-------|
| `density` | `mass` (via area) | mass = density × shape area |
| `friction` | `PhysicsMaterial.friction` | 0.0 - 1.0 |
| `restitution` | `PhysicsMaterial.bounce` | 0.0 - 1.0 (bounciness) |
| `gravityScale` | `RigidBody2D.gravity_scale` | 0 = no gravity |
| `linearDamping` | `RigidBody2D.linear_damp` | Slows linear velocity |
| `angularDamping` | `RigidBody2D.angular_damp` | Slows rotation |
| `fixedRotation` | Lock rotation mode | Prevents spinning |
| `bullet`/`ccd` | `CCD_MODE_CAST_RAY` | Prevents fast objects tunneling |

## Joint Types

| Game Type | Godot Node | Use Case |
|-----------|-----------|----------|
| `revolute` | `PinJoint2D` | Hinges, pendulums. Supports `motorSpeed`, `maxMotorTorque` |
| `distance` | `DampedSpringJoint2D` | Springs, ropes. Uses `stiffness`, `damping` |
| `prismatic` | `GrooveJoint2D` | Sliders, pistons. Uses `axis`, `motorSpeed` |
| `weld` | Two `PinJoint2D` | Locks rotation + position |
| `mouse` | Virtual (forces) | Dragging; applies central forces to match target |

## Coordinate Mapping (CRITICAL)

```
PPM = 50.0 (pixels per meter)

Game → Godot:   godot_y = -game_y * PPM
Godot → Game:   game_y = -godot_y / PPM
Rotation:       godot_rotation = -game_angle
```

## Gotchas

- Mass is NOT set directly — it's `density × shape area`. Changing collider size changes mass
- `bullet: true` is essential for fast-moving small objects or they'll tunnel through walls
- Sensors (Area2D) fire `onSensorBegin`/`onSensorEnd` events, NOT collision events
- World gravity in GameDefinition is `{ y: -9.8 }` (negative = downward in game coords)
- Forgetting the Y-flip when debugging raw Godot values is the #1 physics debugging mistake

## File References

| File | Purpose |
|------|---------|
| `godot_project/scripts/PhysicsBody.gd` | Collision manifolds, contact reporting |
| `godot_project/scripts/entity/EntityFactory.gd` | bodyType→Node mapping, mass calc |
| `godot_project/scripts/physics/JointManager.gd` | Joint implementations + mouse drag |
| `godot_project/scripts/physics/PhysicsController.gd` | Forces, impulses, velocity control |
| `godot_project/scripts/physics/CollisionSystem.gd` | Layer filtering, collision dispatch |
| `app/lib/godot/types.ts` | TypeScript physics config types |

## Related Skills

- [godot-engine](godot-engine.md) — GDScript patterns, scene tree
- [ecs-architecture](ecs-architecture.md) — Entity prefab physics config
- [bridge-development](bridge-development.md) — How physics commands cross the bridge
