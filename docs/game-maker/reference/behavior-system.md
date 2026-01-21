# Behavior System

The behavior system provides declarative, composable game logic that AI can generate and users can tune. Instead of writing code, behaviors are JSON objects that the runtime interprets.

## Design Philosophy

1. **Declarative over Imperative**: Define WHAT should happen, not HOW
2. **Composable**: Multiple behaviors can be combined on one entity
3. **AI-Friendly**: Simple enough for LLMs to generate correctly
4. **Tunable**: Parameters can be adjusted via UI sliders

---

## Behavior Structure

```typescript
interface Behavior {
  type: BehaviorType;           // Which behavior
  enabled?: boolean;            // Can be toggled (default: true)
  [key: string]: any;           // Type-specific parameters
}

type BehaviorType =
  | 'move'
  | 'rotate'
  | 'follow'
  | 'bounce'
  | 'control'
  | 'spawn_on_event'
  | 'destroy_on_collision'
  | 'score_on_collision'
  | 'timer'
  | 'animate'
  | 'oscillate'
  | 'gravity_zone'
  | 'magnetic';
```

---

## Core Behaviors

### 1. Move Behavior

Moves an entity in a direction or toward a target.

```typescript
interface MoveBehavior {
  type: 'move';
  
  // Movement direction
  direction: 'left' | 'right' | 'up' | 'down' | 'toward_target' | 'away_from_target';
  
  // Speed in meters per second
  speed: number;
  
  // Target entity ID (for toward_target/away_from_target)
  target?: string;
  
  // Movement type
  movementType?: 'velocity' | 'force';  // velocity = direct, force = physics-based
  
  // Patrol mode (reverse direction at bounds)
  patrol?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
}
```

**Examples**:
```json
// Enemy that moves left at 2 m/s
{ "type": "move", "direction": "left", "speed": 2 }

// Patrolling enemy
{
  "type": "move",
  "direction": "right",
  "speed": 2,
  "patrol": { "minX": 0, "maxX": 10 }
}

// Homing missile
{ "type": "move", "direction": "toward_target", "speed": 5, "target": "player" }
```

---

### 2. Rotate Behavior

Continuously rotates an entity.

```typescript
interface RotateBehavior {
  type: 'rotate';
  
  // Rotation speed in radians per second
  speed: number;
  
  // Direction
  direction: 'clockwise' | 'counterclockwise';
  
  // Whether to affect physics body rotation
  affectsPhysics?: boolean;  // default: false (visual only)
}
```

**Examples**:
```json
// Spinning coin
{ "type": "rotate", "speed": 3, "direction": "clockwise" }

// Slowly rotating obstacle
{ "type": "rotate", "speed": 0.5, "direction": "counterclockwise", "affectsPhysics": true }
```

---

### 3. Control Behavior

Enables user input to affect an entity.

```typescript
interface ControlBehavior {
  type: 'control';
  
  // Type of control
  controlType: ControlType;
  
  // Force/strength of the action
  force?: number;
  
  // Cooldown between actions (seconds)
  cooldown?: number;
  
  // Additional parameters based on controlType
  maxSpeed?: number;          // For movement controls
  aimLine?: boolean;          // Show aim trajectory
  maxPullDistance?: number;   // For drag_to_aim
}

type ControlType =
  | 'tap_to_jump'       // Tap anywhere to apply upward force
  | 'tap_to_shoot'      // Tap to fire projectile
  | 'tap_to_flip'       // Tap sides to activate flippers (pinball)
  | 'drag_to_aim'       // Drag back to aim and launch
  | 'drag_to_move'      // Drag entity directly
  | 'tilt_to_move'      // Device tilt controls horizontal movement
  | 'tilt_gravity'      // Device tilt changes world gravity direction
  | 'buttons';          // Virtual buttons (left, right, jump, action)
```

**Examples**:
```json
// Platformer jump
{ "type": "control", "controlType": "tap_to_jump", "force": 8, "cooldown": 0.1 }

// Angry Birds-style slingshot
{
  "type": "control",
  "controlType": "drag_to_aim",
  "force": 15,
  "aimLine": true,
  "maxPullDistance": 3
}

// Tilt-to-roll ball
{ "type": "control", "controlType": "tilt_to_move", "force": 5, "maxSpeed": 10 }

// Pinball flippers
{ "type": "control", "controlType": "tap_to_flip", "force": 50 }
```

---

### 4. Spawn On Event Behavior

Spawns entities when certain events occur.

```typescript
interface SpawnOnEventBehavior {
  type: 'spawn_on_event';
  
  // What triggers the spawn
  event: 'tap' | 'timer' | 'collision' | 'destroy' | 'start';
  
  // Template to spawn
  entityTemplate: string;
  
  // Where to spawn
  spawnPosition: 'at_self' | 'at_touch' | 'random_in_bounds' | 'offset';
  
  // Offset from spawn position (if spawnPosition is 'offset')
  offset?: { x: number; y: number };
  
  // Random bounds (if spawnPosition is 'random_in_bounds')
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  
  // Timer interval (if event is 'timer')
  interval?: number;
  
  // Maximum spawns (optional limit)
  maxSpawns?: number;
  
  // Initial velocity for spawned entity
  initialVelocity?: { x: number; y: number };
  
  // Collision filter (if event is 'collision')
  withTags?: string[];
}
```

**Examples**:
```json
// Tap to spawn ball
{
  "type": "spawn_on_event",
  "event": "tap",
  "entityTemplate": "ball",
  "spawnPosition": "at_touch"
}

// Enemy spawner (every 2 seconds)
{
  "type": "spawn_on_event",
  "event": "timer",
  "entityTemplate": "enemy",
  "spawnPosition": "random_in_bounds",
  "bounds": { "minX": 0, "maxX": 10, "minY": 0, "maxY": 2 },
  "interval": 2,
  "maxSpawns": 20
}

// Explosion particles on destroy
{
  "type": "spawn_on_event",
  "event": "destroy",
  "entityTemplate": "particle",
  "spawnPosition": "at_self",
  "initialVelocity": { "x": 0, "y": -5 }
}
```

---

### 5. Destroy On Collision Behavior

Destroys the entity when it collides with specific tags.

```typescript
interface DestroyOnCollisionBehavior {
  type: 'destroy_on_collision';
  
  // Tags that trigger destruction
  withTags: string[];
  
  // Visual effect on destruction
  effect?: 'none' | 'fade' | 'explode' | 'shrink';
  
  // Also destroy the other entity?
  destroyOther?: boolean;
  
  // Minimum impact velocity to trigger (optional)
  minImpactVelocity?: number;
}
```

**Examples**:
```json
// Projectile destroys enemies
{
  "type": "destroy_on_collision",
  "withTags": ["enemy"],
  "effect": "explode",
  "destroyOther": true
}

// Player dies on hazard contact
{
  "type": "destroy_on_collision",
  "withTags": ["hazard", "enemy"],
  "effect": "fade"
}

// Breakable block (only breaks on hard impact)
{
  "type": "destroy_on_collision",
  "withTags": ["projectile"],
  "effect": "explode",
  "minImpactVelocity": 5
}
```

---

### 6. Score On Collision Behavior

Awards points when colliding with specific tags.

```typescript
interface ScoreOnCollisionBehavior {
  type: 'score_on_collision';
  
  // Tags that trigger scoring
  withTags: string[];
  
  // Points to award
  points: number;
  
  // Only score once per entity?
  once?: boolean;
  
  // Show floating score text?
  showPopup?: boolean;
}
```

**Examples**:
```json
// Collect coins
{
  "type": "score_on_collision",
  "withTags": ["player"],
  "points": 10,
  "once": true,
  "showPopup": true
}

// Enemy hit by projectile
{
  "type": "score_on_collision",
  "withTags": ["projectile"],
  "points": 100
}
```

---

### 7. Timer Behavior

Triggers actions after a delay or on interval.

```typescript
interface TimerBehavior {
  type: 'timer';
  
  // Time in seconds
  duration: number;
  
  // What to do when timer fires
  action: 'destroy' | 'spawn' | 'enable_behavior' | 'disable_behavior' | 'trigger_event';
  
  // Repeat?
  repeat?: boolean;
  
  // Action parameters
  spawnTemplate?: string;     // For 'spawn' action
  behaviorIndex?: number;     // For enable/disable behavior
  eventName?: string;         // For trigger_event
}
```

**Examples**:
```json
// Self-destruct after 5 seconds
{ "type": "timer", "duration": 5, "action": "destroy" }

// Spawn enemy every 3 seconds
{
  "type": "timer",
  "duration": 3,
  "action": "spawn",
  "spawnTemplate": "enemy",
  "repeat": true
}
```

---

### 8. Oscillate Behavior

Moves entity back and forth (sine wave motion).

```typescript
interface OscillateBehavior {
  type: 'oscillate';
  
  // Axis of oscillation
  axis: 'x' | 'y' | 'both';
  
  // Amplitude in meters
  amplitude: number;
  
  // Frequency (oscillations per second)
  frequency: number;
  
  // Phase offset (0-1, for syncing multiple oscillators)
  phase?: number;
}
```

**Examples**:
```json
// Moving platform (horizontal)
{ "type": "oscillate", "axis": "x", "amplitude": 3, "frequency": 0.5 }

// Bobbing collectible
{ "type": "oscillate", "axis": "y", "amplitude": 0.2, "frequency": 2 }
```

---

### 9. Gravity Zone Behavior

Creates a localized gravity effect.

```typescript
interface GravityZoneBehavior {
  type: 'gravity_zone';
  
  // Gravity direction and strength
  gravity: { x: number; y: number };
  
  // Radius of effect (meters)
  radius: number;
  
  // Affects only specific tags?
  affectsTags?: string[];
  
  // Falloff type
  falloff?: 'none' | 'linear' | 'quadratic';
}
```

**Examples**:
```json
// Reverse gravity zone
{
  "type": "gravity_zone",
  "gravity": { "x": 0, "y": -15 },
  "radius": 3,
  "falloff": "linear"
}

// Black hole (attracts toward center)
{
  "type": "gravity_zone",
  "gravity": { "x": 0, "y": 0 },
  "radius": 5,
  "falloff": "quadratic"
}
```

---

### 10. Animate Behavior

Plays sprite animation frames.

```typescript
interface AnimateBehavior {
  type: 'animate';
  
  // Animation frames (image URLs or asset IDs)
  frames: string[];
  
  // Frames per second
  fps: number;
  
  // Loop animation?
  loop?: boolean;
  
  // Play on specific event?
  playOn?: 'always' | 'moving' | 'collision' | 'destroy';
}
```

**Examples**:
```json
// Walking animation
{
  "type": "animate",
  "frames": ["walk1.png", "walk2.png", "walk3.png", "walk4.png"],
  "fps": 8,
  "loop": true,
  "playOn": "moving"
}

// Explosion animation (play once)
{
  "type": "animate",
  "frames": ["explode1.png", "explode2.png", "explode3.png"],
  "fps": 12,
  "loop": false,
  "playOn": "always"
}
```

---

## Behavior Execution

### Execution Order

Each frame, behaviors execute in this order:

1. **Input Processing** - Control behaviors read input state
2. **Timers** - Timer behaviors check and fire
3. **Movement** - Move, oscillate, follow behaviors update positions
4. **Visual** - Rotate, animate behaviors update visuals
5. **Post-Physics** - After physics step, collision behaviors evaluate

### Behavior Context

Behaviors receive context during execution:

```typescript
interface BehaviorContext {
  // Current entity
  entity: RuntimeEntity;
  
  // Delta time since last frame
  dt: number;
  
  // Total elapsed time
  elapsed: number;
  
  // Input state
  input: {
    tap?: { x: number; y: number };
    drag?: { startX: number; startY: number; currentX: number; currentY: number };
    tilt?: { x: number; y: number };
    buttons?: { left: boolean; right: boolean; jump: boolean; action: boolean };
  };
  
  // Game state
  gameState: {
    score: number;
    time: number;
    state: 'playing' | 'won' | 'lost' | 'paused';
  };
  
  // Entity manager (for spawning, queries)
  entityManager: EntityManager;
  
  // Physics system (for applying forces)
  physicsSystem: PhysicsSystem;
  
  // Current collisions this frame
  collisions: Collision[];
}
```

---

## Behavior Implementation

Each behavior type has a handler function:

```typescript
type BehaviorHandler = (
  behavior: Behavior,
  context: BehaviorContext
) => void;

// Example: Move behavior implementation
const moveBehaviorHandler: BehaviorHandler = (behavior, context) => {
  const { entity, dt, physicsSystem } = context;
  const move = behavior as MoveBehavior;
  
  if (!entity.body) return;
  
  let velocity = { x: 0, y: 0 };
  
  switch (move.direction) {
    case 'left':
      velocity.x = -move.speed;
      break;
    case 'right':
      velocity.x = move.speed;
      break;
    case 'up':
      velocity.y = -move.speed;
      break;
    case 'down':
      velocity.y = move.speed;
      break;
    case 'toward_target':
      if (move.target) {
        const target = context.entityManager.getEntity(move.target);
        if (target) {
          const dx = target.transform.x - entity.transform.x;
          const dy = target.transform.y - entity.transform.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            velocity.x = (dx / dist) * move.speed;
            velocity.y = (dy / dist) * move.speed;
          }
        }
      }
      break;
  }
  
  if (move.movementType === 'force') {
    entity.body.ApplyForceToCenter(velocity, true);
  } else {
    entity.body.SetLinearVelocity(velocity);
  }
};
```

---

## Combining Behaviors

Entities can have multiple behaviors that work together:

```json
{
  "id": "enemy_patrol",
  "name": "Patrolling Enemy",
  "behaviors": [
    {
      "type": "move",
      "direction": "right",
      "speed": 2,
      "patrol": { "minX": 0, "maxX": 10 }
    },
    {
      "type": "destroy_on_collision",
      "withTags": ["projectile"],
      "effect": "explode"
    },
    {
      "type": "score_on_collision",
      "withTags": ["projectile"],
      "points": 100
    }
  ]
}
```

---

## Behavior Catalog Summary

| Behavior | Purpose | Common Use |
|----------|---------|------------|
| `move` | Linear movement | Enemies, platforms |
| `rotate` | Continuous rotation | Coins, obstacles |
| `control` | User input | Player characters |
| `spawn_on_event` | Create entities | Spawners, effects |
| `destroy_on_collision` | Remove entities | Projectiles, collectibles |
| `score_on_collision` | Award points | Collectibles, targets |
| `timer` | Delayed actions | Timed events, self-destruct |
| `oscillate` | Back-and-forth motion | Platforms, obstacles |
| `gravity_zone` | Local gravity | Puzzles, special areas |
| `animate` | Sprite animation | Characters, effects |
