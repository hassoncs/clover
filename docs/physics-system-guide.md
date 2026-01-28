# Slopcade Physics System Guide

A comprehensive reference for understanding physics configurations in the Slopcade game engine.

---

## Body Types

The Slopcade engine uses Box2D-style physics with three body types:

### `static` - Immovable Objects
- **What it does**: Never moves, infinite mass, participates in collisions
- **Density**: Must be `0` (infinite mass)
- **Use for**: Walls, ground, platforms, bricks, bumpers, obstacles
- **Real-world analogy**: A building foundation

```typescript
// Example: Breakout brick
brick: {
  physics: {
    bodyType: "static",
    shape: "box",
    width: 1.5,
    height: 0.5,
    density: 0,
    friction: 0,
    restitution: 1,  // Bouncy brick!
  }
}
```

### `dynamic` - Physics-Simulated Objects
- **What it does**: Fully simulated—gravity, forces, collisions all affect it
- **Density**: Must be `> 0` (mass = density × area)
- **Use for**: Balls, players, falling objects, projectiles
- **Real-world analogy**: A bouncing ball

```typescript
// Example: Pinball
ball: {
  physics: {
    bodyType: "dynamic",
    shape: "circle",
    radius: 0.3,
    density: 2,
    friction: 0.1,
    restitution: 0.6,
    bullet: true,  // Prevent tunneling at high speeds
  }
}
```

### `kinematic` - Controlled Movement
- **What it does**: Moves by velocity only, ignores forces (gravity doesn't affect it)
- **Density**: Must be `0`
- **Use for**: Moving platforms, player-controlled objects, animated obstacles
- **Real-world analogy**: An escalator or conveyor belt

```typescript
// Example: Flappy Bird pipes (move left continuously)
pipeTop: {
  physics: {
    bodyType: "kinematic",
    shape: "box",
    width: 1.5,
    height: 10,
    density: 0,
    friction: 0,
    restitution: 0,
  }
}
```

---

## The `isSensor` Property

### What is a Sensor?

A **sensor** detects collisions but doesn't physically respond to them. Think of it as a "ghost zone" that can tell when something enters or exits, but doesn't bounce or block.

### `isSensor: true` vs `isSensor: false` (default)

| Feature | `isSensor: false` (default) | `isSensor: true` |
|---------|------------------------------|------------------|
| **Physical response** | Yes—objects bounce off | No—objects pass through |
| **Collision detection** | Yes | Yes |
| **Use case** | Walls, platforms, bumpers | Triggers, collectibles, zones |
| **Performance** | Standard | Slightly cheaper |

### When to Use Sensors

**✅ Use `isSensor: true` for:**
- Collectibles (coins, power-ups)
- Goal zones / finish lines
- Trigger areas (doors, checkpoints)
- Detection zones ("enemy sees player")
- Tetris piece placement
- Pass-through platforms

**❌ Don't use for:**
- Walls or ground (player falls through!)
- Bouncy objects (no bounce with sensor)
- Objects that should block movement

### Example: Slopeggle Cannon

```typescript
cannon: {
  physics: {
    bodyType: "kinematic",
    shape: "box",
    width: 0.6,
    height: 0.25,
    density: 0,
    friction: 0,
    restitution: 0,
    isSensor: true,  // Ball can pass through cannon visually
                     // but we detect when ball enters for firing logic
  }
}
```

The cannon is a sensor so the ball can overlap with it. The game detects the overlap and launches the ball.

---

## Physics Properties Reference

### Core Properties (Required)

| Property | Type | Description | Typical Values |
|----------|------|-------------|----------------|
| `bodyType` | `"static" \| "dynamic" \| "kinematic"` | How the body moves | Depends on entity type |
| `shape` | `"box" \| "circle" \| "polygon"` | Collision geometry | `"circle"` for balls, `"box"` for platforms |
| `density` | `number` | Mass per unit area | `0` for static/kinematic, `0.5-3` for dynamic |
| `friction` | `number` | Surface resistance | `0` (ice) to `1` (sandpaper), typically `0.1-0.9` |
| `restitution` | `number` | Bounciness | `0` (no bounce) to `1` (perfect bounce), can be `>1` |

### Shape-Specific Properties (Required)

| Shape | Required Properties |
|-------|---------------------|
| `box` | `width: number`, `height: number` |
| `circle` | `radius: number` |
| `polygon` | `vertices: Vec2[]` (3+ points) |

### Optional Properties

| Property | Type | Description | When to Use |
|----------|------|-------------|-------------|
| `isSensor` | `boolean` | Detects collisions without physical response | Triggers, collectibles |
| `fixedRotation` | `boolean` | Prevents rotation | Characters that should stay upright |
| `bullet` | `boolean` | Enhanced collision detection | Fast objects (prevents tunneling) |
| `linearDamping` | `number` | Velocity decay (air resistance) | Slowing down objects over time |
| `angularDamping` | `number` | Rotation decay | Stopping spinning objects |
| `initialVelocity` | `Vec2` | Starting velocity | Projectiles, launched objects |
| `initialAngularVelocity` | `number` | Starting spin | Spinning projectiles |

---

## Physics Property Deep Dive

### Density (Mass)

```typescript
density: 0    // Infinite mass (static/kinematic)
density: 1    // Standard mass
density: 2    // Heavy object (falls faster, harder to push)
density: 0.5  // Light object (floats, easier to push)
```

**Key concept**: Density × Area = Mass. A large box with density 1 weighs more than a small box with density 1.

**Real examples:**
- Pinball bumper: `density: 2` (heavy, stays put)
- Ball: `density: 1` (standard)
- Feather: `density: 0.1` (light, floats)

### Friction

```typescript
friction: 0    // No friction (ice rink)
friction: 0.3  // Low friction (slippery)
friction: 0.9  // High friction (grippy)
friction: 1    // Maximum friction (hard to slide)
```

**Key concept**: Higher friction = more resistance to sliding. Both objects' friction values are combined in collisions.

**Real examples:**
- Ice platform: `friction: 0.1`
- Normal ground: `friction: 0.5`
- Sticky platform: `friction: 0.9`

### Restitution (Bounciness)

```typescript
restitution: 0    // No bounce (clay)
restitution: 0.3  // Low bounce (wood)
restitution: 0.6  // Medium bounce (rubber)
restitution: 1    // Perfect bounce (super ball)
restitution: 1.5  // Energy injection (pinball bumper!)
```

**Key concept**: 
- `0` = collision absorbs all energy
- `1` = collision preserves all energy (theoretical perfect bounce)
- `>1` = collision ADDS energy (gets bouncier each bounce!)

**⚠️ Warning**: Values > 1 can cause instability. Use sparingly for special effects.

**Real examples:**
- Platformer player: `restitution: 0` (no bounce, precise control)
- Breakout ball: `restitution: 1` (never loses energy)
- Pinball bumper: `restitution: 1.5` (kicks the ball harder!)

---

## Common Game Patterns

### Pinball Physics

```typescript
// Ball - heavy, bouncy, fast
ball: {
  bodyType: "dynamic",
  shape: "circle",
  radius: 0.3,
  density: 2,        // Heavy
  friction: 0.1,     // Low friction for sliding
  restitution: 0.6,  // Medium bouncy
  bullet: true,      // Prevent tunneling
}

// Bumper - static, super bouncy
bumper: {
  bodyType: "static",
  shape: "circle",
  radius: 0.6,
  density: 0,
  friction: 0,
  restitution: 1.5,  // KICK! Energy injection
}

// Flipper - kinematic (controlled by player)
flipper: {
  bodyType: "kinematic",
  shape: "box",
  width: 1.5,
  height: 0.3,
  density: 0,
  friction: 0.2,
  restitution: 0.4,
}
```

### Breakout Physics

```typescript
// Ball - maximum bounce, no energy loss
ball: {
  bodyType: "dynamic",
  shape: "circle",
  radius: 0.2,
  density: 1,
  friction: 0,       // No friction = slides forever
  restitution: 1,    // Perfect bounce
  bullet: true,
}

// Brick - static, bouncy
brick: {
  bodyType: "static",
  shape: "box",
  width: 1.2,
  height: 0.4,
  density: 0,
  friction: 0,
  restitution: 1,    // Bounce off bricks
}

// Paddle - kinematic (player controlled)
paddle: {
  bodyType: "kinematic",
  shape: "box",
  width: 2,
  height: 0.3,
  density: 0,
  friction: 0,
  restitution: 1,    // Ball bounces predictably
}
```

### Platformer Physics

```typescript
// Player - controlled, upright, moderate friction
player: {
  bodyType: "dynamic",
  shape: "box",
  width: 0.7,
  height: 1,
  density: 1,
  friction: 0.3,     // Can slide a bit
  restitution: 0,    // No bounce for precise jumps
  fixedRotation: true,  // Stay upright
}

// Platform - static, grippy
platform: {
  bodyType: "static",
  shape: "box",
  width: 3,
  height: 0.5,
  density: 0,
  friction: 0.9,     // High friction = easy to stand on
  restitution: 0,    // No bounce
}

// Collectible - sensor (can collect without colliding)
coin: {
  bodyType: "static",
  shape: "circle",
  radius: 0.3,
  density: 0,
  friction: 0,
  restitution: 0,
  isSensor: true,    // Walk through to collect
}
```

### Physics Stacker (Falling Objects)

```typescript
// Heavy block
heavyBlock: {
  bodyType: "dynamic",
  shape: "box",
  width: 1,
  height: 1,
  density: 3,        // Heavy
  friction: 0.8,     // Sticky
  restitution: 0.1,  // Little bounce (settles quickly)
}

// Light block
lightBlock: {
  bodyType: "dynamic",
  shape: "box",
  width: 1,
  height: 1,
  density: 0.5,      // Light
  friction: 0.5,
  restitution: 0.2,
}

// Container - static walls
wall: {
  bodyType: "static",
  shape: "box",
  width: 0.5,
  height: 10,
  density: 0,
  friction: 0.3,
  restitution: 0.1,
}
```

---

## Quick Reference: When to Use Each Body Type

| Entity Type | Body Type | Reasoning |
|-------------|-----------|-----------|
| Walls/Floors | `static` | Never move, block everything |
| Player (standard) | `dynamic` | Needs gravity, jumping, realistic physics |
| Player (tight control) | `kinematic` | No gravity drift, precise velocity control |
| Projectiles | `dynamic` | Needs physics simulation |
| Moving Platforms | `kinematic` | Moves at set speed, ignores gravity |
| Collectibles | `static` + `isSensor: true` | Detects overlap, no physical response |
| Triggers/Zones | `static` + `isSensor: true` | Detects entry/exit, no blocking |
| Pinball Bumpers | `static` | Stays put, bounces ball |
| Pinball Ball | `dynamic` | Needs realistic physics |
| Tetris Pieces | `kinematic` + `isSensor: true` | Controlled movement, detect placement |

---

## Validation Rules (What the AI Checks)

The AI validator ensures physics configs are valid:

1. **Density must be ≥ 0** ❌ `-1` is invalid
2. **Density = 0 for static/kinematic** ⚠️ Warning if non-zero
3. **Density > 0 for dynamic** ❌ Must have mass
4. **Friction 0-1 recommended** ⚠️ Warning outside range (but valid)
5. **Restitution ≥ 0** ❌ Negative is invalid
6. **Restitution ≤ 1 recommended** ⚠️ Warning if > 1 (unstable)
7. **Width, height, radius must be > 0** ❌ Zero/negative is invalid

---

## Common Mistakes & How to Fix Them

### ❌ "My player falls through the floor!"
**Cause**: Floor has `isSensor: true` or wrong body type
**Fix**: Ensure floor is `bodyType: "static"` and `isSensor: false` (or omitted)

### ❌ "My ball doesn't bounce!"
**Cause**: `restitution: 0`
**Fix**: Set `restitution` to `0.5` or higher

### ❌ "My kinematic body falls due to gravity!"
**Cause**: Expecting kinematic to not fall (it doesn't, unless you move it)
**Fix**: Kinematic bodies ONLY move when you set velocity—gravity doesn't affect them

### ❌ "My character spins when hit!"
**Cause**: Rotation not locked
**Fix**: Add `fixedRotation: true`

### ❌ "Fast projectile goes through walls!"
**Cause**: Tunneling at high speeds
**Fix**: Add `bullet: true`

### ❌ "Sensor doesn't detect collision!"
**Cause**: Sensors only detect—they don't physically collide
**Fix**: Check collision events, not contact response

---

## Key Files in the Codebase

| File | Purpose |
|------|---------|
| `/Users/hassoncs/Workspaces/Personal/slopcade/shared/src/types/physics.ts` | Core physics type definitions |
| `/Users/hassoncs/Workspaces/Personal/slopcade/shared/src/types/schemas.ts` | Validation schemas |
| `/Users/hassoncs/Workspaces/Personal/slopcade/app/lib/physics2d/types.ts` | Runtime physics types |
| `/Users/hassoncs/Workspaces/Personal/slopcade/app/lib/test-games/games/pinballLite/game.ts` | Pinball physics example |
| `/Users/hassoncs/Workspaces/Personal/slopcade/app/lib/test-games/games/breakoutBouncer/game.ts` | Breakout physics example |
| `/Users/hassoncs/Workspaces/Personal/slopcade/app/lib/test-games/games/simplePlatformer/game.ts` | Platformer physics example |

---

## Summary Cheat Sheet

```typescript
// Wall/Ground - blocks movement
{ bodyType: "static", density: 0, isSensor: false }

// Collectible - detects but doesn't block  
{ bodyType: "static", density: 0, isSensor: true }

// Player with gravity - realistic physics
{ bodyType: "dynamic", density: 1, fixedRotation: true }

// Moving platform - no gravity, controlled movement
{ bodyType: "kinematic", density: 0 }

// Ball - bouncy physics object
{ bodyType: "dynamic", shape: "circle", density: 1, restitution: 0.8 }

// Fast projectile - prevents tunneling
{ bodyType: "dynamic", density: 1, bullet: true }

// Bouncy bumper - kicks objects away
{ bodyType: "static", density: 0, restitution: 1.5 }
```

---

## Got Questions?

- **What happens if I set density to 0 on a dynamic body?** ❌ Error—dynamic bodies need mass
- **Can kinematic bodies be pushed?** ❌ No—they only move when you set velocity
- **Do sensors trigger collision events?** ✅ Yes! They just don't physically respond
- **What's the difference between friction 0.5 and 1.0?** 1.0 is twice as "sticky"
- **Why does restitution > 1 cause instability?** It adds energy each bounce, leading to infinite acceleration
