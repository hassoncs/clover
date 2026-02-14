---
description: "Game authoring patterns extracted from production games. Covers Flappy Bird, Breakout, Ball Sort, Snake, and other game implementations. Use as reference when implementing similar game mechanics or patterns."
---

# Game Authoring Examples

Patterns extracted from production games. Read the full source at `r2/games/{slug}/src/game.ts`.

## Pattern: Tap-to-Flap (Flappy Bird)

Simple tap input that sets upward velocity on a dynamic body via script.

```javascript
// src/script.ts
exports.onInput = function(ctx, event) {
  if (event.type === 'tap') {
    const birdId = ctx.queryEntities({ tag: 'bird' })[0];
    if (birdId) {
      ctx.setEntityVelocity(birdId, { x: 0, y: 7 });
    }
  }
};
```

## Pattern: Timer Spawning (Flappy Bird)

Periodically spawn entities using `onUpdate` with an accumulator.

```javascript
// src/script.ts
let spawnTimer = 0;

exports.onUpdate = function(ctx, dt) {
  spawnTimer += dt;
  if (spawnTimer >= 2.5) {
    spawnTimer = 0;
    ctx.spawnEntity('pipeGroup', { x: 8, y: 0 });
  }
};
```

## Pattern: Child Entities with Random Positioning (Flappy Bird)

Parent entity moves children together. Randomize child positions at spawn time in `onStart`.

```javascript
// src/script.ts
exports.onStart = function(ctx) {
  const pipeGroups = ctx.queryEntities({ tag: 'pipe-group' });
  for (const id of pipeGroups) {
    // Randomize child positions if needed
  }
};
```

## Pattern: Invisible Score Zones (Flappy Bird)

Sensor colliders with transparent visuals for scoring, handled in `onCollision`.

```javascript
// src/script.ts
exports.onCollision = function(ctx, collision) {
  if (ctx.hasTag(collision.entityA, 'bird') && ctx.hasTag(collision.entityB, 'score-zone')) {
    const score = ctx.getVariable('score') || 0;
    ctx.setVariable('score', score + 1);
    ctx.haptic('Light');
  }
};
```

## Pattern: Multi-Input Paddle Control (Breakout Bouncer)

Supporting tap zones and tilt for the same action.

```javascript
// src/script.ts
exports.onUpdate = function(ctx, dt) {
  const paddleId = ctx.queryEntities({ tag: 'paddle' })[0];
  if (!paddleId) return;

  // Tilt control
  if (ctx.input?.type === 'tilt') {
    const force = ctx.getVariable('tiltForce') || 100;
    ctx.applyForce(paddleId, { x: ctx.input.x * force, y: 0 });
  }
};

exports.onInput = function(ctx, event) {
  if (event.type === 'tap') {
    const paddleId = ctx.queryEntities({ tag: 'paddle' })[0];
    if (!paddleId) return;

    const impulse = ctx.getVariable('tapImpulse') || 5;
    const xDir = event.position.x < 0 ? -1 : 1;
    ctx.applyImpulse(paddleId, { x: xDir * impulse, y: 0 });
  }
};
```

## Pattern: Life System with Respawn (Breakout Bouncer)

Drain sensor detects ball leaving play area. Subtract life, destroy, and respawn.

```javascript
// src/script.ts
exports.onCollision = function(ctx, collision) {
  if (ctx.hasTag(collision.entityA, 'ball') && ctx.hasTag(collision.entityB, 'drain')) {
    ctx.destroyEntity(collision.entityA);
    
    const lives = ctx.getVariable('lives') || 0;
    ctx.setVariable('lives', lives - 1);
    
    if (lives > 1) {
      ctx.spawnEntity('ball', { x: 0, y: -7 });
    } else {
      ctx.lose();
    }
  }
};
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
