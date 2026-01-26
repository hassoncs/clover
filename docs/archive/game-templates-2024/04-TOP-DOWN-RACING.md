# Top-Down Racing Game Archetype Analysis

> Arcade-style racing game with overhead perspective

## Overview

**Genre**: Racing / Arcade  
**Examples**: Micro Machines, Death Rally, Circuit Superstars, Rush Rally  
**Core Loop**: Accelerate → Steer → Navigate track → Pass checkpoints → Complete laps → Win race

## Game Requirements

### Core Mechanics

| Mechanic | Description | Priority |
|----------|-------------|----------|
| Vehicle Control | Accelerate, brake, steer | Critical |
| Track Boundaries | Walls/barriers that constrain movement | Critical |
| Checkpoint System | Ordered gates to validate progress | Critical |
| Lap Counting | Track completed circuits | Critical |
| Win Condition | First to complete N laps | Critical |
| Collision Physics | Bounce off walls, other cars | Critical |
| Speed Variability | Acceleration, max speed, deceleration | High |
| Drift/Slide | Satisfying cornering feel | High |
| AI Opponents | CPU-controlled racers | Medium |
| Power-ups | Speed boost, weapons, shields | Medium |
| Surface Types | Ice, mud, boost pads | Low |

### Visual Requirements

| Element | Description |
|---------|-------------|
| Track | Top-down view of racing circuit |
| Vehicle Sprites | Cars/vehicles with rotation |
| Track Features | Barriers, curbs, scenery |
| Checkpoint Markers | Visual gates or lines |
| Finish Line | Clear start/finish visual |
| UI | Lap counter, position, timer |
| Mini-map (optional) | Track overview with positions |

### Input Requirements

| Input | Action |
|-------|--------|
| Screen Zones / Buttons | Left/right steering |
| Screen Zone / Button | Accelerate (hold) |
| Tap (optional) | Brake / Power-up |
| Tilt (optional) | Alternative steering |

## Current Engine Capability Assessment

### What EXISTS Today

| Feature | Engine Support | Notes |
|---------|---------------|-------|
| Physics bodies | ✅ Full | Cars as dynamic bodies |
| Collision | ✅ Full | Wall bouncing |
| Rotation | ✅ Full | `rotate` behavior |
| Force application | ✅ Full | `apply_impulse` action |
| Sensors | ✅ Full | Checkpoint detection |
| Variables | ✅ Full | Lap count, position |
| Win/lose conditions | ✅ Full | Lap count trigger |
| Input handling | ✅ Full | Tap zones, buttons |
| Expressions | ✅ Full | Speed calculations |
| Timer | ✅ Full | Race time tracking |

### What's MISSING (Gaps)

| Gap | Severity | Description |
|-----|----------|-------------|
| Vehicle Controller | 🟡 High | No dedicated car physics behavior |
| Checkpoint Ordering | 🟡 High | Manual ordering via rules is verbose |
| AI Racing | 🟡 High | No path-following AI opponents |
| Drift Physics | 🟢 Low | Can approximate with damping |
| Surface Friction | 🟢 Low | Manual per-entity adjustment |

## Feasibility Analysis

### Can It Be Built Today?

**Verdict: YES (80-90% coverage)**

Top-down racing is the **best fit** for the current engine among the four archetypes. The physics system naturally handles vehicle movement, and the rules system can manage checkpoints.

### Implementation Approach (Works Today)

```
1. Vehicle: Dynamic body with custom damping
   - Angular damping prevents spinning out
   - Linear damping simulates friction
   - Apply forward force on accelerate
   - Apply torque or angular velocity on steer

2. Track: Static bodies for walls
   - Use polygons for curved sections
   - High restitution for bouncy walls (arcade feel)
   - Or low restitution for punishing walls (sim feel)

3. Checkpoints: Sensor bodies in sequence
   - Each checkpoint has an index variable
   - Rule: On collision with checkpoint, check index matches expected
   - If valid, increment expected checkpoint, award points
   - If final checkpoint with all previous hit, increment lap

4. Win: Variable condition on lap count
```

### Recommended Engine Additions (Quality of Life)

#### 1. Vehicle Controller Behavior

```typescript
interface VehicleControllerBehavior extends BaseBehavior {
  type: 'vehicle_controller';
  
  // Movement
  acceleration: Value<number>;
  maxSpeed: Value<number>;
  brakeStrength: Value<number>;
  reverseSpeed?: Value<number>;
  
  // Steering
  turnSpeed: Value<number>; // Degrees per second at max
  turnSpeedAtMaxVelocity?: Value<number>; // Reduces turn at high speed
  
  // Drift/Slide (optional)
  lateralFriction?: Value<number>; // 0 = ice, 1 = grip
  driftThreshold?: Value<number>; // Speed at which drift kicks in
  
  // Input mapping
  inputType: 'buttons' | 'tap_zones' | 'tilt' | 'joystick';
  accelerateInput?: string; // Button/zone name
  brakeInput?: string;
  steerLeftInput?: string;
  steerRightInput?: string;
}
```

Implementation approach:
```gdscript
func update_vehicle(entity, dt):
    var throttle = get_input("accelerate") - get_input("brake")
    var steer = get_input("steer_right") - get_input("steer_left")
    
    # Forward force in facing direction
    var forward = Vector2.from_angle(entity.rotation)
    var force = forward * throttle * acceleration
    entity.apply_force(force)
    
    # Speed-dependent turning
    var speed = entity.linear_velocity.length()
    var turn_factor = lerp(turn_speed, turn_speed_at_max, speed / max_speed)
    entity.angular_velocity = steer * turn_factor
    
    # Lateral friction (drift simulation)
    var lateral = Vector2(-forward.y, forward.x)
    var lateral_velocity = entity.linear_velocity.dot(lateral)
    var correction = -lateral * lateral_velocity * lateral_friction
    entity.apply_force(correction)
    
    # Speed cap
    if speed > max_speed:
        entity.linear_velocity = entity.linear_velocity.normalized() * max_speed
```

#### 2. Checkpoint System Helper

```typescript
interface CheckpointDefinition {
  id: string;
  checkpoints: Array<{
    entityId: string;
    index: number;
    isFinishLine?: boolean;
  }>;
  lapsToWin: number;
  onCheckpointHit?: string; // Event name
  onLapComplete?: string;
  onRaceComplete?: string;
}

// Expression integration
checkpoint.currentIndex(defId, entityId)    // Which checkpoint entity is at
checkpoint.lapsCompleted(defId, entityId)   // Laps for entity
checkpoint.isValidHit(defId, entityId, checkpointIndex) // Is this the next expected
checkpoint.racePosition(defId, entityId)    // 1st, 2nd, 3rd...

// Actions
interface CheckpointHitAction {
  type: 'checkpoint_hit';
  checkpointDefId: string;
  racerId: EntityTarget;
  checkpointIndex: Value<number>;
}
```

#### 3. AI Racer (Path Following)

Using the **Path System** from the composable architecture:

```typescript
// AI car template
const aiCar: EntityTemplate = {
  id: 'ai_racer',
  behaviors: [
    { type: 'follow_path', pathId: 'racing_line', speed: { expr: 'var:ai_speed' }, rotateToFacing: true },
    // Or for more realistic behavior:
    { type: 'vehicle_controller', inputType: 'ai_path', pathId: 'racing_line' }
  ]
};

// Racing line is a path around the track
const racingLine: PathDefinition = {
  id: 'racing_line',
  type: 'catmull-rom', // Smooth curves
  points: [/* optimal racing positions */],
  loop: true
};
```

## Implementation Phases

### Phase 1: Basic Racing Game (No Engine Changes)
**Effort: Short-Medium (1-2 days)**

1. Create track with static wall entities
2. Create car template with physics:
   ```typescript
   physics: {
     bodyType: 'dynamic',
     shape: 'box',
     width: 0.5,
     height: 0.8,
     density: 1,
     friction: 0.3,
     restitution: 0.2,
     linearDamping: 0.5,
     angularDamping: 3, // Prevents spinning
   }
   ```
3. Create checkpoint sensors around track
4. Rules for:
   - Accelerate: tap zone → apply forward impulse
   - Steer: tap zones → set angular velocity
   - Checkpoint: collision → validate and track progress
   - Win: lap count variable reaches target
5. UI for lap count, timer, position

### Phase 2: Vehicle Controller Behavior (Engine Work)
**Effort: Short (0.5-1 day)**

1. Implement `vehicle_controller` behavior
2. Handle input mapping for buttons/zones/tilt
3. Implement drift/slide physics
4. Add speed-dependent turning
5. Test with various tuning values

### Phase 3: Checkpoint System Helper
**Effort: Short (0.5 day)**

1. Implement `CheckpointDefinition` parsing
2. Add expression functions for checkpoint state
3. Fire events on checkpoint/lap/race completion
4. Handle race position calculation (who's ahead)

### Phase 4: AI Opponents
**Effort: Medium (1-2 days)**

1. Create racing line paths for AI
2. Implement AI input generation from path
3. Add rubber-banding (AI speeds up when behind)
4. Add AI personality (aggressive vs defensive)
5. Test multi-car races

### Phase 5: Polish & Features
**Effort: Medium (1-2 days)**

1. Add power-up pickups (speed boost, shield)
2. Add surface types (boost pads, mud)
3. Add car damage/respawn
4. Add ghost replay system
5. Add mini-map UI
6. Polish VFX (tire tracks, sparks, dust)

### Phase 6: Template & Skinning
**Effort: Short (0.5 day)**

1. Extract parameters:
   - Track layout (walls + checkpoints + racing line)
   - Car stats (speed, acceleration, handling)
   - Lap count
   - AI difficulty
   - Power-ups enabled
2. Create asset pack structure
3. Document skinning API

## Skinnable Template Design

```typescript
interface RacingTemplate {
  // Track
  track: {
    wallTemplate: string;
    walls: Array<{ points: Vec2[] }>; // Polygon walls
    checkpoints: Array<{ position: Vec2; width: number; angle: number }>;
    startPositions: Vec2[]; // Grid positions
    racingLine?: Vec2[]; // For AI
    background: string;
  };
  
  // Vehicles
  vehicles: Array<{
    id: string;
    name: string;
    spriteTemplate: string;
    stats: {
      acceleration: number;
      maxSpeed: number;
      handling: number; // Turn speed
      grip: number; // Lateral friction
    };
  }>;
  
  // Race settings
  race: {
    laps: number;
    aiCount: number;
    aiDifficulty: 'easy' | 'medium' | 'hard';
    countdownDuration: number;
  };
  
  // Power-ups (optional)
  powerUps?: Array<{
    id: string;
    effect: 'speed_boost' | 'shield' | 'missile' | 'oil_slick';
    duration?: number;
    spawnPositions: Vec2[];
  }>;
  
  // Win conditions
  winCondition: 'laps' | 'time_trial' | 'elimination';
}
```

## Asset Requirements for Skinning

| Asset Type | Count | Description |
|------------|-------|-------------|
| Car Sprites | 1-4 | Top-down vehicles with rotation frames |
| Track Background | 1 | Full track view or tileable |
| Wall/Barrier | 1-2 | Track edge visuals |
| Checkpoint Marker | 1 | Gate or line graphic |
| Finish Line | 1 | Distinct start/finish |
| Power-up Sprites | 3-5 | Pickup items |
| VFX | 3-5 | Tire tracks, sparks, boost |
| UI Elements | 4+ | Lap counter, position, timer, mini-map |
| Sound Effects | 6+ | Engine, skid, collision, checkpoint, countdown, win |

## Complexity Summary

| Aspect | Rating | Notes |
|--------|--------|-------|
| Engine Changes | 🟢 Low | Vehicle controller is nice-to-have |
| Game Implementation | 🟡 Medium | Mostly track design and tuning |
| Skinning Support | 🟢 Low | Highly parameterizable |
| AI Generation Fit | 🟡 Medium | Track layout is spatial, harder for AI |

## Recommended Priority

**FIRST (tied with Hole.io)**

Top-down racing has the best fit with the current engine:
- Physics system handles vehicle dynamics naturally
- Rules system handles checkpoints
- No critical missing systems
- Validates camera, input, physics end-to-end
- Popular mobile game format

## Vehicle Physics Tuning Guide

### Arcade Feel (Micro Machines style)
```typescript
{
  linearDamping: 0.3,    // Low friction, slides
  angularDamping: 5,     // Snappy rotation
  restitution: 0.5,      // Bouncy walls
  lateralFriction: 0.3,  // Drifty
  turnSpeed: 200,        // Fast turning
}
```

### Simulation Feel (Circuit Superstars style)
```typescript
{
  linearDamping: 0.8,    // Higher friction
  angularDamping: 8,     // Very stable
  restitution: 0.1,      // Punishing walls
  lateralFriction: 0.8,  // Grippy
  turnSpeed: 120,        // Slower, methodical
}
```

### Drift Feel (Initial D style)
```typescript
{
  linearDamping: 0.4,
  angularDamping: 4,
  restitution: 0.3,
  lateralFriction: 0.2,  // Very slidey
  driftThreshold: 3,     // Drift kicks in at speed
  turnSpeed: 180,
}
```

## Track Design Tips

1. **Start with basic oval** - Test physics before complex layouts
2. **Wide corners** - More forgiving for beginners
3. **Alternate tight/wide** - Creates variety and overtaking spots
4. **Checkpoint at narrowest points** - Ensures cars follow track
5. **Racing line follows natural flow** - AI should look competent
6. **Start grid off the racing line** - Prevents first-corner pileups

## Implementation Without Engine Changes

Complete working approach using existing systems:

```typescript
const racingGame: GameDefinition = {
  metadata: { id: 'simple-racer', title: 'Simple Racer', version: '1.0.0' },
  
  world: { gravity: { x: 0, y: 0 }, pixelsPerMeter: 50, bounds: { width: 20, height: 15 } },
  
  variables: {
    currentCheckpoint: 0,
    lapCount: 0,
    raceTime: 0,
  },
  
  input: {
    tapZones: [
      { id: 'left', edge: 'left', size: 0.25, button: 'left' },
      { id: 'right', edge: 'right', size: 0.25, button: 'right' },
      { id: 'gas', edge: 'bottom', size: 0.3, button: 'action' },
    ]
  },
  
  templates: {
    car: {
      id: 'car',
      tags: ['player'],
      sprite: { type: 'image', imageUrl: 'car.png', imageWidth: 0.5, imageHeight: 0.8 },
      physics: {
        bodyType: 'dynamic',
        shape: 'box',
        width: 0.5, height: 0.8,
        density: 1, friction: 0.3, restitution: 0.2,
        linearDamping: 0.5, angularDamping: 3,
      },
    },
    checkpoint: {
      id: 'checkpoint',
      tags: ['checkpoint'],
      sprite: { type: 'rect', width: 2, height: 0.2, color: '#FFFF0044' },
      physics: { bodyType: 'static', shape: 'box', width: 2, height: 0.2, density: 0, isSensor: true },
    },
    wall: {
      id: 'wall',
      tags: ['wall'],
      sprite: { type: 'rect', width: 1, height: 1, color: '#333333' },
      physics: { bodyType: 'static', shape: 'box', width: 1, height: 1, density: 0, friction: 0.5, restitution: 0.3 },
    },
  },
  
  entities: [
    { id: 'player', name: 'Player Car', template: 'car', transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    // ... walls and checkpoints positioned around track
  ],
  
  rules: [
    // Accelerate
    {
      id: 'accelerate',
      trigger: { type: 'frame' },
      conditions: [{ type: 'expression', expr: 'input.button("action")' }],
      actions: [{
        type: 'apply_impulse',
        target: { type: 'by_tag', tag: 'player' },
        direction: 'facing',
        force: 0.5,
      }],
    },
    // Steer left
    {
      id: 'steer_left',
      trigger: { type: 'frame' },
      conditions: [{ type: 'expression', expr: 'input.button("left")' }],
      actions: [{
        type: 'modify',
        target: { type: 'by_tag', tag: 'player' },
        property: 'angularVelocity',
        operation: 'set',
        value: -3,
      }],
    },
    // Steer right
    {
      id: 'steer_right',
      trigger: { type: 'frame' },
      conditions: [{ type: 'expression', expr: 'input.button("right")' }],
      actions: [{
        type: 'modify',
        target: { type: 'by_tag', tag: 'player' },
        property: 'angularVelocity',
        operation: 'set',
        value: 3,
      }],
    },
    // Checkpoint handling (simplified - real impl needs per-checkpoint logic)
    {
      id: 'checkpoint_hit',
      trigger: { type: 'collision', entityATag: 'player', entityBTag: 'checkpoint' },
      actions: [
        { type: 'set_variable', name: 'currentCheckpoint', operation: 'add', value: 1 },
        { type: 'score', operation: 'add', value: 100 },
      ],
    },
  ],
  
  winCondition: { type: 'score', score: 1000 }, // Simplified
};
```

## Related Systems from Composable Architecture

- **Path System** - AI racing lines, guided movement
- **Checkpoint System** - Ordered validation, lap counting
- **State Machine** - Race phases (countdown, racing, finished)
- **Combo System** - Drift chains, clean racing bonuses

## Summary

Top-down racing is highly feasible with the current engine. The only meaningful enhancement is the `vehicle_controller` behavior, which encapsulates physics tuning and input handling into a reusable package. Everything else (checkpoints, laps, win conditions) can be implemented with existing rules.

**Recommended as the first game template to implement** because:
1. Best engine fit among the four archetypes
2. Minimal new systems required
3. Tests input, physics, rules, and camera
4. Popular and fun game format
5. Creates reusable primitives (vehicle controller, checkpoint helper)
