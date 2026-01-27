# Game Types Catalog

This document catalogs the types of games that can be built with the AI Game Maker, organized by complexity tier.

## Complexity Tiers

| Tier | Description | AI Capability | User Skill |
|------|-------------|---------------|------------|
| **Tier 1** | Simple physics toys and basic games | Fully AI-generated | Ages 6+ |
| **Tier 2** | Classic game mechanics with physics | AI + user tuning | Ages 8+ |
| **Tier 3** | Complex multi-mechanic games | Templates + customization | Ages 12+ |

---

## Tier 1: Simple Games (Fully AI-Generatable)

### 1.1 Falling Objects
**Description**: Objects fall from above and stack/interact.

| Aspect | Details |
|--------|---------|
| **Physics** | Gravity, collision, stacking |
| **Input** | Tap to spawn, optional drag to position |
| **Examples** | Fruit stacker, block dropper, sand/particle toys |
| **Win Condition** | Stack to height, survive time, fill container |

**Behaviors Used**:
- `spawn_on_event` (tap to create)
- `destroy_on_collision` (optional cleanup)
- `score_on_collision` (if collecting)

**Physics Features**:
- Dynamic bodies (RigidBody2D)
- Polygon/circle shapes (Polygon2D, CircleShape2D)
- Restitution for bouncing (PhysicsMaterial.bounce)

---

### 1.2 Projectile/Cannon Games
**Description**: Launch objects at targets.

| Aspect | Details |
|--------|---------|
| **Physics** | Trajectory, collision, destruction |
| **Input** | Drag to aim, release to fire |
| **Examples** | Angry Birds clone, tank shooters, basketball |
| **Win Condition** | Destroy all targets, hit goal, score points |

**Behaviors Used**:
- `control` (drag_to_aim)
- `spawn_on_event` (release to fire)
- `destroy_on_collision` (projectile + target)
- `score_on_collision` (points per hit)

**Physics Features**:
- ApplyLinearImpulse for launch (via Godot bridge)
- Collision detection (Area2D sensors)
- Dynamic + static bodies (RigidBody2D, StaticBody2D)

---

### 1.3 Pinball
**Description**: Ball bounces around, hit targets for points.

| Aspect | Details |
|--------|---------|
| **Physics** | Bouncing, flippers, bumpers |
| **Input** | Tap sides for flippers, tilt optional |
| **Examples** | Classic pinball, pachinko |
| **Win Condition** | Score threshold, survive (limited balls) |

**Behaviors Used**:
- `control` (tap_to_flip)
- `score_on_collision` (bumpers)
- `rotate` (spinner targets)

**Physics Features**:
- High restitution for bumpers (PhysicsMaterial.bounce)
- Revolute joints for flippers (PinJoint2D)
- Motor torque for flipper action (via script-driven forces)

---

### 1.4 Ragdoll/Physics Toys
**Description**: Articulated characters that flop around.

| Aspect | Details |
|--------|---------|
| **Physics** | Joints, ragdoll physics, collision |
| **Input** | Drag to throw, tap to spawn |
| **Examples** | Stickman ragdoll, crash test dummy, puppet |
| **Win Condition** | None (sandbox) or distance thrown |

**Behaviors Used**:
- `spawn_on_event` (create ragdolls)
- Optional scoring for distance

**Physics Features**:
- Revolute joints (elbows, knees) (PinJoint2D)
- Joint limits (prevent unnatural bending) (via script constraints)
- Multiple connected bodies (RigidBody2D hierarchy)

---

### 1.5 Balance/Stacking Games
**Description**: Stack objects or maintain balance.

| Aspect | Details |
|--------|---------|
| **Physics** | Gravity, friction, torque |
| **Input** | Drag to place, tap to drop |
| **Examples** | Tower stacker, Jenga, balance scale |
| **Win Condition** | Stack height, remove without falling, balance time |

**Behaviors Used**:
- `spawn_on_event` (create blocks)
- Custom balance detection

**Physics Features**:
- Friction for stacking (PhysicsMaterial.friction)
- Collision detection for falling (Area2D/RigidBody2D)
- Mass calculations for balance (via Godot physics queries)

---

## Tier 2: Medium Complexity Games (AI + User Tuning)

### 2.1 Platformer
**Description**: Character jumps between platforms.

| Aspect | Details |
|--------|---------|
| **Physics** | Ground detection, jumping, moving platforms |
| **Input** | Tap/button to jump, tilt or buttons to move |
| **Examples** | Mario-style, endless runner, doodle jump |
| **Win Condition** | Reach goal, survive (endless), collect all items |

**Behaviors Used**:
- `control` (tap_to_jump, tilt_to_move)
- `move` (for moving platforms, enemies)
- `destroy_on_collision` (hazards)
- `score_on_collision` (collectibles)

**Physics Features**:
- Ground contact detection (Area2D sensors)
- Kinematic bodies for platforms (CharacterBody2D/AnimatableBody2D)
- Velocity control for movement (via bridge setLinearVelocity)

**Tuning Required**:
- Jump force
- Movement speed
- Platform spacing
- Enemy patterns

---

### 2.2 Vehicle/Driving
**Description**: Drive a vehicle over terrain.

| Aspect | Details |
|--------|---------|
| **Physics** | Wheels, suspension, terrain |
| **Input** | Tilt or buttons for acceleration, brake |
| **Examples** | Hill Climb Racing, monster truck, moon buggy |
| **Win Condition** | Reach distance, beat time, collect fuel |

**Behaviors Used**:
- `control` (tilt_to_accelerate)
- `score_on_collision` (checkpoints, collectibles)
- `destroy_on_collision` (crash = lose)

**Physics Features**:
- Revolute joints with motors (wheels) (PinJoint2D + script motor)
- Motor speed control (via script-driven angular velocity)
- Terrain from polygon chains (ConcavePolygonShape2D)

**Tuning Required**:
- Motor torque
- Wheel friction
- Suspension (distance joints)
- Terrain difficulty

---

### 2.3 Destruction/Demolition
**Description**: Destroy structures with physics.

| Aspect | Details |
|--------|---------|
| **Physics** | Breakable joints, chain reactions |
| **Input** | Tap to detonate, drag to aim projectile |
| **Examples** | Demolition games, wrecking ball, explosives |
| **Win Condition** | Destroy percentage, use limited resources |

**Behaviors Used**:
- `destroy_on_collision` (breakable pieces)
- `spawn_on_event` (debris, explosions)
- `control` (aim wrecking ball)

**Physics Features**:
- Joints with break thresholds (via script monitoring)
- Explosion forces (applyForce to nearby bodies via bridge)
- Many dynamic bodies (RigidBody2D instances)

**Tuning Required**:
- Joint strength
- Explosion radius/force
- Structure complexity

---

### 2.4 Catapult/Slingshot
**Description**: Pull back and launch with elastic physics.

| Aspect | Details |
|--------|---------|
| **Physics** | Spring/elastic, trajectory, collision |
| **Input** | Drag to pull, release to launch |
| **Examples** | Trebuchet, slingshot, golf |
| **Win Condition** | Hit target, distance, accuracy |

**Behaviors Used**:
- `control` (drag_to_aim with elastic visual)
- `destroy_on_collision` (targets)
- `score_on_collision` (points)

**Physics Features**:
- Distance joints with spring (catapult arm) (DampedSpringJoint2D)
- ApplyLinearImpulse (calculated from pull distance via bridge)
- Trajectory prediction (optional, calculated in TypeScript)

**Tuning Required**:
- Spring strength
- Maximum pull distance
- Projectile weight

---

### 2.5 Rope/Swing Games
**Description**: Swing or climb using ropes.

| Aspect | Details |
|--------|---------|
| **Physics** | Rope physics, pendulum motion |
| **Input** | Tap to grab/release, drag to swing |
| **Examples** | Cut the Rope, swing games, Tarzan |
| **Win Condition** | Reach target, collect items, deliver object |

**Behaviors Used**:
- `control` (tap_to_cut, tap_to_grab)
- `score_on_collision` (collectibles)

**Physics Features**:
- Distance joints (rope segments) (DampedSpringJoint2D)
- Revolute joints (rope to anchor) (PinJoint2D)
- Joint destruction (cutting ropes via bridge destroyEntity)

**Tuning Required**:
- Rope length
- Number of segments (flexibility)
- Swing physics

---

## Tier 3: Complex Games (Templates + Heavy Customization)

### 3.1 Puzzle Physics (Rube Goldberg)
**Description**: Chain-reaction puzzle machines.

| Aspect | Details |
|--------|---------|
| **Physics** | All physics types, precise timing |
| **Input** | Tap to start, place pieces (editor mode) |
| **Examples** | Incredible Machine, contraptions |
| **Win Condition** | Complete the chain, achieve goal |

**Complexity**: Requires careful placement, timing, and understanding of physics. Best suited for template-based creation where users modify existing machines.

---

### 3.2 Sports Games
**Description**: Ball-based sports with goals.

| Aspect | Details |
|--------|---------|
| **Physics** | Ball physics, goals, player movement |
| **Input** | Drag to kick/throw, move player |
| **Examples** | Soccer, basketball, pool/billiards |
| **Win Condition** | Score goals, beat opponent score |

**Complexity**: Requires AI opponents or multiplayer, scoring zones, game clock.

---

### 3.3 Fighting/Combat
**Description**: Physics-based combat.

| Aspect | Details |
|--------|---------|
| **Physics** | Ragdoll, impact, knockback |
| **Input** | Buttons for attacks, movement |
| **Examples** | Gang Beasts-style, sumo, wrestling |
| **Win Condition** | Knock opponent out/off, reduce health |

**Complexity**: Requires health systems, attack hitboxes, AI opponents.

---

## Game Type Selection Matrix

Use this matrix to understand which game types fit different user intents:

| User Intent | Recommended Game Types |
|-------------|----------------------|
| "I want to destroy things" | Projectile, Destruction, Catapult |
| "I want to build/stack" | Falling Objects, Balance, Stacking |
| "I want to drive/race" | Vehicle, Platformer (horizontal) |
| "I want to jump around" | Platformer, Ragdoll |
| "I want to solve puzzles" | Rope, Puzzle Physics |
| "I want a quick arcade game" | Pinball, Falling Objects |
| "I want to play sports" | Sports (Tier 3) |
| "I just want to play around" | Ragdoll, Physics Toys |

---

## Physics Features by Game Type

| Game Type | Gravity | Joints | Motors | Sensors | Forces |
|-----------|---------|--------|--------|---------|--------|
| Falling Objects | Yes | No | No | Optional | No |
| Projectile | Yes | No | No | Yes | Impulse |
| Pinball | Yes | Revolute | Yes | No | Impulse |
| Ragdoll | Yes | Revolute | No | No | Impulse |
| Balance | Yes | No | No | No | No |
| Platformer | Yes | Optional | Optional | Yes | Velocity |
| Vehicle | Yes | Revolute | Yes | No | Motor |
| Destruction | Yes | Multiple | No | No | Force |
| Catapult | Yes | Distance | No | No | Impulse |
| Rope | Yes | Distance | No | Yes | No |

---

## Recommended Starting Templates

For MVP, implement these 5 templates that cover the most common use cases:

1. **"Ball Launcher"** (Projectile) - Most requested game type
2. **"Stack Attack"** (Falling Objects) - Simple and satisfying
3. **"Jumpy Cat"** (Platformer) - Classic game mechanic
4. **"Hill Racer"** (Vehicle) - Physics showcase
5. **"Rope Swing"** (Rope) - Unique physics interaction
