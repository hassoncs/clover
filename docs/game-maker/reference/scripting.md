# Game Scripting System

The scripting system allows game logic to be defined in JavaScript, executed in a secure QuickJS sandbox. This enables dynamic game behavior without requiring recompilation.

## Overview

```
GameDefinition.script → ScriptSandbox → QuickJSEngine → Game Logic
```

Scripts are embedded in `GameDefinition.script` and executed via lifecycle hooks that receive a `ScriptContext` object.

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
      ctx.world.setVariable('score', 0);
    };

    exports.onInput = function(ctx, event) {
      if (event.type === 'tap') {
        ctx.world.spawn('ball', event.position);
      }
    };
  `,
};
```

## Lifecycle Hooks

Scripts export functions that are called at specific points in the game loop. **All hooks must be synchronous** (they return `void`). Multi-frame work must use `startSequence()`.

| Hook | Signature | When Called |
|------|-----------|-------------|
| `onStart` | `(ctx) => void` | Once when game starts |
| `onUpdate` | `(ctx, dt) => void` | Every frame with delta time |
| `onInput` | `(ctx, event) => void` | On user input events |
| `onCollision` | `(ctx, collision) => void` | On physics collisions |

> **Safety Guard**: If a hook returns a Promise (e.g. it was marked `async`), the script will be disabled with a warning to prevent frame budget overruns.

## Script Context API

The `ctx` object provides access to game state and actions. It is split into two layers:
1. **Sync Reads**: Direct methods on `ctx` for reading state from the per-frame cache.
2. **WorldOps**: The `ctx.world` object for issuing commands (writes, spawns, animations).

### Sync Reads (Safe in onUpdate)

These methods read from a per-frame cache and are extremely fast.

```javascript
// Entity State
ctx.getPosition(id)          // { x, y } | null
ctx.getVelocity(id)          // { x, y } | null
ctx.getRotation(id)          // number | null
ctx.getTags(id)              // string[]
ctx.hasTag(id, 'ball')       // boolean
ctx.getTemplate(id)          // string | undefined

// Queries
ctx.queryEntities({ tag: 'ball' })           // string[]
ctx.getEntityData(id)                        // WorldEntityData | null
ctx.queryEntitiesWithData({ tag: 'ball' })   // WorldEntityData[]

// Game State
ctx.getVariable('score')                     // unknown
ctx.getConstant('gravity')                   // number | string | boolean | undefined

// Frame Info
ctx.dt                                       // Delta time (seconds)
ctx.elapsed                                  // Total elapsed time (seconds)
ctx.frameId                                  // Current frame number
```

### WorldOps (ctx.world)

The `ctx.world` object provides the full `WorldOps` interface. All methods are **async** (return Promises). 

- **In Hooks**: Call these fire-and-forget (do NOT `await`).
- **In Sequences**: Use `await` to chain operations across frames.

```javascript
// Entity Lifecycle
ctx.world.spawn('ball', { x: 0, y: 0 })
ctx.world.destroy(id)
ctx.world.clone(id, { position: { x: 5, y: 5 } })
ctx.world.reparent(id, parentId)

// Physics & Transform
ctx.world.setPosition(id, { x: 10, y: 10 })
ctx.world.setVelocity(id, { x: 5, y: 0 })
ctx.world.applyImpulse(id, { x: 0, y: 10 })
ctx.world.applyForce(id, { x: 0, y: 100 })

// Game State
ctx.world.setVariable('score', 100)
ctx.world.win()
ctx.world.lose()
ctx.world.emit('customEvent', { data: 123 })

// Queries (Async)
await ctx.world.raycast(from, to)
await ctx.world.queryPoint(point)
```

## Sequences (Multi-frame Work)

`ctx.startSequence(name, fn)` is the escape hatch for work that spans multiple frames, such as animations or delayed actions.

```javascript
ctx.startSequence('death-anim', async (world) => {
  // We can use await here!
  await world.animate('player', { opacity: 0, y: -5 }, { duration: 500 });
  await world.wait(200);
  await world.destroy('player');
  await world.lose();
});
```

### Sequence Rules
- **Auto-cancel**: Starting a sequence with the same `name` cancels the previous one.
- **Game Time**: `wait()` and `animate()` use game time by default (affected by pause/timeScale).
- **Cancellation**: If a sequence is cancelled, any pending `await` will throw a `SequenceCancelledError`, exiting the function cleanly.

## Input Events

The `onInput` hook receives events with this structure:

```typescript
interface ScriptInputEvent {
  type: 'tap' | 'dragStart' | 'dragMove' | 'dragEnd' | 'gameStarted' | 'gameRestarted';
  position?: { x: number; y: number };
  entityId?: string | null;
  timestamp: number;
}
```

## Collision Events

The `onCollision` hook receives collision data:

```typescript
interface ScriptCollisionEvent {
  entityA: string;
  entityB: string;
  normal: { x: number; y: number };
  impulse: number;
  contactPoint: { x: number; y: number };
  timestamp: number;
}
```

## Utilities (Sync)

Pure utility functions available on `ctx`:

```javascript
ctx.random()                   // 0-1 random (seeded)
ctx.randomInt(min, max)        // Random integer
ctx.randomChoice(array)        // Random element from array
ctx.clamp(val, min, max)       // Clamp value
ctx.lerp(a, b, t)              // Linear interpolation
ctx.distance(posA, posB)       // Distance between points
```

## Security & Limits

Scripts run in a QuickJS WASM sandbox with:

- **Memory limits**: 1MB default
- **Execution time limits**: 2ms per hook invocation
- **No network/file access**: Completely isolated
- **Instruction limits**: 100,000 per invocation

## Example: Complete Game Script

```javascript
// Tap-to-spawn ball game with scoring and animations

exports.onStart = function(ctx) {
  ctx.world.setVariable('score', 0);
  
  // Start an intro sequence
  ctx.startSequence('intro', async (world) => {
    await world.setVariable('inputEnabled', false);
    await world.wait(1000);
    await world.setVariable('inputEnabled', true);
  });
};

exports.onInput = function(ctx, event) {
  if (event.type !== 'tap' || !ctx.getVariable('inputEnabled')) return;
  
  ctx.world.spawn('ball', event.position, {
    velocity: { x: ctx.randomInt(-5, 5), y: 10 }
  });
};

exports.onCollision = function(ctx, collision) {
  // Check if ball hit a "goal"
  const ballId = ctx.hasTag(collision.entityA, 'ball') ? collision.entityA : 
                 ctx.hasTag(collision.entityB, 'ball') ? collision.entityB : null;
  const goalId = ctx.hasTag(collision.entityA, 'goal') ? collision.entityA :
                 ctx.hasTag(collision.entityB, 'goal') ? collision.entityB : null;

  if (ballId && goalId) {
    // Start a scoring sequence
    ctx.startSequence('score-' + ballId, async (world) => {
      await world.animate(ballId, { scaleX: 1.5, scaleY: 1.5, opacity: 0 }, { duration: 200 });
      await world.destroy(ballId);
      const score = await world.getVariable('score');
      await world.setVariable('score', score + 10);
    });
  }
};
```

## QuickJS Sandbox Limitations

The scripting system supports two sandbox implementations:

1. **UnsafeScriptSandbox** (default): Full JavaScript runtime with complete async/await support
2. **QuickJSScriptSandbox**: Secure WASM-based sandbox with memory and execution limits

### Sequence Support in QuickJS

`startSequence()` uses async/await internally, which requires Promise interop between the host JavaScript runtime and the QuickJS WASM sandbox. This interop is complex and not yet implemented.

**Current Status:**
- ✅ All sync reads work in QuickJS (`getPosition`, `getVelocity`, `getTags`, etc.)
- ✅ All fire-and-forget writes work in QuickJS (`ctx.world.spawn`, `ctx.world.setPosition`, etc.)
- ❌ `startSequence()` requires async/await, which is not yet supported in QuickJS sandbox

**Workaround:**
- Use UnsafeScriptSandbox for games that need sequences
- Use QuickJS for games that only need sync reads and fire-and-forget writes

**Future Enhancement:**
- QuickJS Promise interop is planned but requires bridging async operations across the WASM boundary
- This will enable full sequence support in the secure sandbox

## Related Documentation

- [Game Rules](./game-rules.md) - Declarative rule system
- [Entity System](./entity-system.md) - Entity structure and templates
- [Input Methods](./input-methods-catalog.md) - Input handling patterns
