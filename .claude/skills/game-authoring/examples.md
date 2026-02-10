# Game Authoring Examples

Patterns extracted from production games. Read the full source at `r2/games/{slug}/src/game.ts`.

## Pattern: Tap-to-Flap (Flappy Bird)

Simple tap input that sets upward velocity on a dynamic body.

```typescript
rules: [
  {
    id: "tap_to_flap",
    trigger: { type: "tap" },
    actions: [
      { type: "set_velocity", target: { type: "by_tag", tag: "bird" }, y: 7 },
    ],
  },
],
```

## Pattern: Timer Spawning (Flappy Bird)

Periodically spawn entities using a repeating timer.

```typescript
{
  id: "spawn_pipes",
  trigger: { type: "timer", time: 2.5, repeat: true },
  actions: [
    {
      type: "spawn",
      template: "pipeGroup",
      position: { type: "fixed", x: 8, y: 0 },
    },
  ],
},
```

## Pattern: Child Entities with Random Positioning (Flappy Bird)

Parent entity moves children together. `configure_children_at_spawn` randomizes child positions at spawn time.

```typescript
pipeGroup: {
  id: "pipeGroup",
  tags: ["pipe-group"],
  behaviors: [
    { type: "translate", direction: { type: "vector", x: -1, y: 0 }, speed: 15 },
    { type: "destroy_when_off_screen", edge: "left", buffer: 2, recursive: true },
    {
      type: "configure_children_at_spawn",
      configs: [
        { childName: "pipeTop", property: "localTransform.y", randomRange: [-6, -2] },
        { childName: "pipeBottom", property: "localTransform.y",
          offsetFrom: "pipeTop", offset: -9 },
        { childName: "scoreZone", property: "localTransform.y",
          offsetFrom: "pipeTop", offset: -4.5 },
      ],
    },
  ],
  children: [
    { name: "pipeTop", template: "pipeTop",
      localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { name: "pipeBottom", template: "pipeBottom",
      localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { name: "scoreZone", template: "scoreZone",
      localTransform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
},
```

## Pattern: Invisible Score Zones (Flappy Bird)

Sensor colliders with transparent visuals for scoring.

```typescript
scoreZone: {
  id: "scoreZone",
  tags: ["score-zone"],
  visual: { type: "rect", width: 0.3, height: 3, color: "#00000000" },
  collider: { shape: "box", width: 0.3, height: 3, isSensor: true },
  behaviors: [
    { type: "score_on_collision", withTags: ["bird"], points: 1, once: true },
  ],
},
```

## Pattern: Multi-Input Paddle Control (Breakout Bouncer)

Supporting tap zones, keyboard buttons, AND tilt for the same action.

```typescript
input: {
  tapZones: [
    { id: "left-zone", edge: "left", size: 0.5, button: "left" },
    { id: "right-zone", edge: "right", size: 0.5, button: "right" },
  ],
  tilt: { enabled: true, sensitivity: 2, updateInterval: 16 },
},
rules: [
  // Keyboard/button: held = continuous force
  {
    id: "paddle_left",
    trigger: { type: "button", button: "left", state: "held" },
    actions: [
      { type: "apply_force", target: { type: "by_tag", tag: "paddle" },
        x: { expr: "-variables.paddleForce" } },
    ],
  },
  // Tap zones: tap = one-shot impulse
  {
    id: "tap_left",
    trigger: { type: "tap", xMinPercent: 0, xMaxPercent: 50 },
    actions: [
      { type: "apply_impulse", target: { type: "by_tag", tag: "paddle" },
        x: { expr: "-variables.tapImpulse" } },
    ],
  },
  // Tilt: continuous force following device angle
  {
    id: "tilt_control",
    trigger: { type: "tilt", axis: "x", threshold: 0.1 },
    actions: [
      { type: "apply_force", target: { type: "by_tag", tag: "paddle" },
        direction: "tilt_direction", force: { expr: "variables.tiltForce" } },
    ],
  },
],
```

## Pattern: Stick + Launch (Breakout Bouncer)

Ball starts stuck to paddle, launches on tap, then maintains speed.

```typescript
ball: {
  id: "ball",
  tags: ["ball"],
  behaviors: [
    { type: "stick_to_entity", targetTag: "paddle", offset: { x: 0, y: -0.5 } },
    { type: "launch_on_input", speed: 8, minAngle: 45, maxAngle: 135,
      enableBehaviorAfterLaunch: 2 },
    { type: "maintain_speed", speed: 8, enabled: false },  // Index 2, enabled after launch
  ],
},
```

## Pattern: Life System with Respawn (Breakout Bouncer)

Drain sensor detects ball leaving play area. Subtract life, destroy, and respawn.

```typescript
{
  id: "ball_drain",
  trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
  actions: [
    { type: "set_variable", name: "lives", operation: "subtract", value: 1 },
    { type: "destroy", target: { type: "by_tag", tag: "ball" } },
    { type: "spawn", template: "ball", position: { type: "fixed", x: 0, y: -7 } },
  ],
},
```

## Pattern: Locking Entity Position (Breakout Bouncer)

Use frame trigger + modify to lock an axis while allowing movement on another.

```typescript
{
  id: "lock_paddle_y",
  trigger: { type: "frame" },
  actions: [
    { type: "modify", target: { type: "by_id", entityId: "paddle" },
      property: "y", operation: "set", value: -8 },
  ],
},
```

## Pattern: Tunable Variables (Breakout Bouncer)

Variables with tuning metadata for in-game dev UI.

```typescript
variables: {
  lives: 3,
  paddleForce: {
    value: 120,
    tuning: { min: 50, max: 200, step: 10 },
    category: 'physics',
    label: 'Paddle Push Force',
  },
},
```

Reference in expressions: `{ expr: "variables.paddleForce" }` or `{ expr: "-variables.paddleForce" }`

## Pattern: Swipe Input with Direction Guard (Snake)

Prevent reversing direction (can't go left if going right).

```typescript
{
  id: "swipe_up",
  trigger: { type: "swipe", direction: "up" },
  conditions: [{ type: "expression", expr: "direction != 2" }],  // 2 = down
  actions: [{ type: "set_variable", name: "nextDirection", operation: "set", value: 0 }],
},
```

## Pattern: Script-Driven Game Loop (Snake)

Using `onUpdate` for grid-based movement with accumulator timing.

```javascript
let snake = [{ x: 9, y: 12 }];
let moveAccum = 0;

exports.onUpdate = function(ctx, dt) {
  if (ctx.getVariable('gameOver') === 1) return;

  moveAccum += dt;
  if (moveAccum < 0.15) return;
  moveAccum = 0;

  const dir = ctx.getVariable('nextDirection');
  ctx.setVariable('direction', dir);

  const head = snake[0];
  let newX = head.x, newY = head.y;
  if (dir === 0) newY -= 1;
  else if (dir === 1) newX += 1;
  else if (dir === 2) newY += 1;
  else if (dir === 3) newX -= 1;

  // Collision with self
  for (const seg of snake) {
    if (seg.x === newX && seg.y === newY) {
      ctx.setVariable('gameOver', 1);
      return;
    }
  }

  snake.unshift({ x: newX, y: newY });
  snake.pop();

  const headId = ctx.queryEntities({ tag: 'player' })[0];
  if (headId) ctx.setEntityPosition(headId, gridToWorld(newX, newY));
};
```

## Pattern: Collision-Based Destroy + Score (Breakout Bouncer)

Behaviors on the entity being destroyed.

```typescript
brickRed: {
  id: "brickRed",
  tags: ["brick"],
  behaviors: [
    { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
    { type: "score_on_collision", withTags: ["ball"], points: 40 },
  ],
},
```

## Pattern: Expression-Based Win/Lose

```typescript
// Win when all bricks destroyed
winCondition: { expr: "entityCount('brick') == 0" },

// Lose when lives reach 0
loseCondition: { type: "custom", expr: "lives <= 0" },

// Lose when specific entity destroyed
loseCondition: { type: "entity_destroyed", tag: "bird" },

// Lose when variable set by script
loseCondition: { type: "custom", expr: "gameOver == 1" },
```

## Pattern: Persistence (Flappy Bird)

Save high scores across sessions.

```typescript
import { FlappyBirdProgressSchema, type FlappyBirdProgress } from "@slopcade/shared";

const persistence: PersistenceConfig<FlappyBirdProgress> = {
  storageKey: "flappy-bird-progress",
  schema: FlappyBirdProgressSchema as unknown as PersistenceConfig<FlappyBirdProgress>["schema"],
  version: 1,
  defaultProgress: {
    version: 1, highScore: 0, gamesPlayed: 0,
    totalPipesPassed: 0, bestStreak: 0,
    unlockedBirds: ["default"],
    totalPlayTime: 0, sessionsCompleted: 0,
  },
  autoSave: { onGameLose: true, onBackground: true },
};

// Add to game definition:
const game: GameDefinition = {
  // ...
  persistence,
};
```

## Pattern: Simple Draggable Entity

```typescript
cube: {
  id: "cube",
  tags: ["cube"],
  visual: { type: "image", imageWidth: 1, imageHeight: 1 },
  physics: { bodyType: "kinematic", density: 0 },
  collider: { shape: "box", width: 1, height: 1 },
  behaviors: [
    { type: "draggable", mode: "kinematic", requireDirectHit: true },
  ],
},
```

## Pattern: HUD Overlay Elements

```typescript
overlay: {
  elements: [
    {
      id: 'var-score',
      type: 'text',
      anchor: 'top-center',
      offset: { x: 0, y: 16 },
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
      bindings: { text: "SCORE\n{{variables.score}}" },
      style: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      },
    },
    {
      id: 'var-lives',
      type: 'text',
      anchor: 'top-right',
      offset: { x: 16, y: 16 },
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
      bindings: { text: "LIVES\n{{variables.lives}}" },
      style: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
      },
    },
  ],
},
```

## Pattern: Coordinate Helpers

Most games use screen-to-world conversion helpers. The world origin is at center, Y-up.

```typescript
const WORLD_WIDTH = 12;
const WORLD_HEIGHT = 16;
const HALF_W = WORLD_WIDTH / 2;
const HALF_H = WORLD_HEIGHT / 2;

// Convert screen coordinates (top-left origin) to world coordinates (center origin, Y-up)
const cx = (x: number) => x - HALF_W;
const cy = (y: number) => HALF_H - y;

// Place entity at screen position (3, 8):
transform: { x: cx(3), y: cy(8), angle: 0, scaleX: 1, scaleY: 1 }
```

## Pattern: Random Spawn in Bounds

```typescript
{
  type: "spawn",
  template: "food",
  position: {
    type: "random",
    bounds: { minX: -4, maxX: 4, minY: -6, maxY: 6 },
  },
},
```

## Pattern: Collision with Sensor Zones

Using `isSensor: true` for detection without physical collision (drain zones, trigger areas).

```typescript
drain: {
  id: "drain",
  tags: ["drain"],
  collider: { shape: "box", width: 10, height: 2, isSensor: true },
  // No visual, no physics - just a detection zone
},
```
