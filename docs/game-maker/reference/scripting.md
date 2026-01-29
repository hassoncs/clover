# Game Scripting System

The scripting system allows game logic to be defined in JavaScript, executed in a secure QuickJS sandbox. This enables dynamic game behavior without requiring recompilation.

## Overview

```
GameDefinition.script → ScriptSandbox → QuickJSEngine → Game Logic
```

Scripts are embedded in `GameDefinition.script` and executed via lifecycle hooks that receive a context object with full access to game state.

## Quick Start

Add a `script` field to your game definition:

```typescript
const gameDefinition: GameDefinition = {
  metadata: { id: 'my-game', title: 'My Game', version: '1.0.0' },
  world: { gravity: { x: 0, y: -10 }, bounds: { width: 14, height: 18 } },
  templates: {
    ball: {
      id: 'ball',
      visual: { type: 'circle', radius: 0.5, color: '#FF6B6B' },
      physics: { bodyType: 'dynamic', density: 1 },
      collider: { shape: 'circle', radius: 0.5 },
    },
  },
  entities: [],
  rules: [],
  script: `
    exports.onStart = function(ctx) {
      ctx.setVariable('score', 0);
    };

    exports.onInput = function(ctx, event) {
      if (event.type === 'tap') {
        ctx.spawnEntity('ball', event.position);
      }
    };
  `,
};
```

## Lifecycle Hooks

Scripts export functions that are called at specific points in the game loop:

| Hook | Signature | When Called |
|------|-----------|-------------|
| `onStart` | `(ctx) => void` | Once when game starts |
| `onUpdate` | `(ctx, dt) => void` | Every frame with delta time |
| `onInput` | `(ctx, event) => void` | On user input events |
| `onCollision` | `(ctx, collision) => void` | On physics collisions |

## Script Context API

The `ctx` object provides access to game state and actions:

### Variables

```javascript
ctx.getVariable('score')           // Get a game variable
ctx.setVariable('score', 100)      // Set a game variable
ctx.getConstant('gravity')         // Get a constant (read-only)
```

### Entity Management

```javascript
// Spawn entities
var id = ctx.spawnEntity('ball', { x: 5, y: 10 });
ctx.spawnEntity('ball', { x: 5, y: 10 }, { velocity: { x: 1, y: 0 } });

// Destroy entities
ctx.destroyEntity(id);

// Query entities
var balls = ctx.queryEntities({ tag: 'ball' });
var player = ctx.queryEntities({ templateId: 'player' })[0];
```

### Entity Properties

```javascript
// Position
var pos = ctx.getEntityPosition(id);      // { x, y }
ctx.setEntityPosition(id, { x: 5, y: 10 });

// Velocity
var vel = ctx.getEntityVelocity(id);      // { x, y }
ctx.setEntityVelocity(id, { x: 10, y: 0 });

// Impulse
ctx.applyImpulse(id, { x: 0, y: 100 });
```

### Tags

```javascript
ctx.getEntityTags(id)          // ['ball', 'bouncy']
ctx.addTag(id, 'selected')
ctx.removeTag(id, 'selected')
ctx.hasTag(id, 'ball')         // true/false
```

### Game State

```javascript
ctx.win()                      // End game with win
ctx.lose()                     // End game with loss
ctx.emit('levelComplete', { level: 1 })  // Emit custom event
```

### Utilities

```javascript
ctx.random()                   // 0-1 random (seeded)
ctx.randomInt(1, 10)           // Random integer in range
ctx.randomChoice(['a', 'b'])   // Random array element
ctx.clamp(value, 0, 100)       // Clamp to range
ctx.lerp(0, 100, 0.5)          // Linear interpolation
ctx.distance(posA, posB)       // Distance between points
```

### Frame Info

```javascript
ctx.frameId                    // Current frame number
ctx.elapsed                    // Total elapsed time (seconds)
ctx.dt                         // Delta time this frame
```

## Input Events

The `onInput` hook receives events with this structure:

```typescript
interface ScriptInputEvent {
  type: 'tap' | 'dragStart' | 'dragMove' | 'dragEnd' | 'gameStarted';
  position?: { x: number; y: number };
  entityId?: string;           // Entity tapped (if any)
  timestamp: number;
}
```

Example:

```javascript
exports.onInput = function(ctx, event) {
  if (event.type === 'tap') {
    console.log('Tapped at', event.position.x, event.position.y);
    if (event.entityId) {
      ctx.destroyEntity(event.entityId);
    }
  }
};
```

## Collision Events

The `onCollision` hook receives collision data:

```typescript
interface ScriptCollisionEvent {
  entityA: string;             // First entity ID
  entityB: string;             // Second entity ID
  normal: { x: number; y: number };
  impulse: number;
  contactPoint: { x: number; y: number };
  timestamp: number;
}
```

Example:

```javascript
exports.onCollision = function(ctx, collision) {
  // Check if ball hit the ground
  if (collision.entityA === 'ground' || collision.entityB === 'ground') {
    var ballId = collision.entityA === 'ground' 
      ? collision.entityB 
      : collision.entityA;
    
    if (ctx.hasTag(ballId, 'ball')) {
      ctx.destroyEntity(ballId);
      var score = ctx.getVariable('score') || 0;
      ctx.setVariable('score', score + 10);
    }
  }
};
```

## Security

Scripts run in a QuickJS WASM sandbox with:

- **Memory limits**: 1MB default
- **Execution time limits**: 2ms per hook invocation
- **No network access**: Cannot make HTTP requests
- **No file system**: Cannot read/write files
- **No global pollution**: Each script has isolated scope

## Hot Reload

Scripts support hot reload during development:

```typescript
const sandbox = new ScriptSandbox({ scriptCode, scriptId, gameId });
await sandbox.initialize();

// Later, reload with new code
const result = await sandbox.reload(newScriptCode);
if (result.success) {
  console.log('Reloaded! Hooks changed:', result.previousHooks, '->', result.newHooks);
}
```

## Example: Complete Game Script

```javascript
// Tap-to-spawn ball game with scoring

var maxBalls = 10;

exports.onStart = function(ctx) {
  ctx.setVariable('score', 0);
  ctx.setVariable('ballCount', 0);
};

exports.onUpdate = function(ctx, dt) {
  // Check win condition
  var score = ctx.getVariable('score') || 0;
  if (score >= 100) {
    ctx.win();
  }
};

exports.onInput = function(ctx, event) {
  if (event.type !== 'tap') return;
  
  var ballCount = ctx.getVariable('ballCount') || 0;
  if (ballCount >= maxBalls) return;
  
  var ball = ctx.spawnEntity('ball', event.position, {
    velocity: { x: ctx.randomInt(-5, 5), y: 10 }
  });
  
  if (ball) {
    ctx.setVariable('ballCount', ballCount + 1);
  }
};

exports.onCollision = function(ctx, collision) {
  var groundId = 'ground';
  
  if (collision.entityA !== groundId && collision.entityB !== groundId) {
    return;
  }
  
  var ballId = collision.entityA === groundId 
    ? collision.entityB 
    : collision.entityA;
  
  if (!ctx.hasTag(ballId, 'ball')) return;
  
  ctx.destroyEntity(ballId);
  
  var ballCount = ctx.getVariable('ballCount') || 0;
  ctx.setVariable('ballCount', Math.max(0, ballCount - 1));
  
  var score = ctx.getVariable('score') || 0;
  ctx.setVariable('score', score + 10);
};
```

## File Structure

```
app/lib/scripting/
├── ScriptSandbox.ts      # Main sandbox wrapper
├── GameScriptAPI.ts      # Context object creation
├── types.ts              # TypeScript types
├── index.ts              # Exports
└── engine/
    └── QuickJSEngine.ts  # QuickJS WASM wrapper
```

## Related Documentation

- [Game Rules](./game-rules.md) - Declarative rule system (alternative to scripts)
- [Entity System](./entity-system.md) - Entity structure and templates
- [Input Methods](./input-methods-catalog.md) - Input handling patterns
