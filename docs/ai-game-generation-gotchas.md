# AI Game Generation Gotchas

> **Purpose**: Common mistakes AI makes when generating Slopcade games, and how to avoid them.
> **Use**: Include relevant sections in AI prompts to steer generation away from these pitfalls.

---

> **Important**: The `zone` component is deprecated. Always use `collider` with `isSensor: true` for detection-only entities. This ensures compatibility with the unified rendering pipeline.

---

## Gotcha #1: Physics for Tappables (The "Interactive Zone" Problem)

### The Mistake
AI adds a physics body to an entity just to make it "tappable," when it should be a **sensor zone** or use **tap targets** instead.

### Why It's Wrong
- Physics bodies collide and block movement
- Unnecessary physics processing = worse performance
- Creates confusing gameplay (player bumps into invisible tap areas)

### The Fix
Use the right tool for the job:

| Use Case | Solution | Example |
|----------|----------|---------|
| **Tappable button/zone** | `{ type: "tap", target: "button-tag" }` | Menu buttons, UI controls |
| **Detect when entity enters area** | `{ type: "sensor_enter", sensorTag: "goal", entityTag: "player" }` with collider `isSensor: true` | Goal detection areas, checkpoints |
| **Collectible items** | `isSensor: true` + collision rule | Coins, power-ups |
| **Screen region tap** | `{ type: "tap", xMinPercent: 0, xMaxPercent: 50 }` | Left/right controls |

### Code Examples

**❌ WRONG: Physics body for a tappable button**
```typescript
// Don't do this - adds unnecessary physics
button: {
  physics: {
    bodyType: "static",
    shape: "box",
    width: 2, height: 1,
    density: 0,  // Unnecessary physics!
  },
  // ... hoping tap will work
}
```

**✅ RIGHT: Sensor zone for collision detection**
```typescript
// Goal zone - detects but doesn't block
goalZone: {
  id: "goal",
  tags: ["goal"],
  physics: {
    bodyType: "static",
    shape: "box",
    width: 3, height: 3,
    density: 0,
    isSensor: true,  // Detects collisions, doesn't block
  },
}

// Rule to detect player reaching goal
{
  id: "win_on_goal",
  trigger: { type: "sensor_enter", sensorTag: "goal", entityTag: "player" },
  actions: [{ type: "game_state", state: "win" }],
}
```

**✅ RIGHT: Tap target for clickable areas**
```typescript
// Button entity - just a sprite, no physics
spinButton: {
  id: "spin_button",
  tags: ["button"],
  sprite: { type: "rect", width: 2, height: 1, color: "#4ECDC4" },
  // No physics! It's just visual
}

// Rule responds to taps on the button
{
  id: "spin_on_tap",
  trigger: { type: "tap", target: "spin_button" },
  actions: [/* ... */],
}
```

### Decision Tree
```
Does the player need to walk/roll INTO it?
├── YES → Use sensor_enter/sensor_exit with collider isSensor: true
│
└── NO → Is it a button/control?
    ├── YES → Use tap trigger with target
    └── NO → Is it a collectible?
        ├── YES → Use collider isSensor: true + collision rule
        └── NO → Maybe physics isn't needed at all!
```

> **Note:** Always use `collider: { shape: "...", isSensor: true }` for detection zones, never the deprecated `zone` component.

---

## Gotcha #2: Wrong Body Type for the Job

### The Mistake
AI picks the wrong `bodyType`, causing unexpected physics behavior.

### Common Errors

| Error | Wrong | Right |
|-------|-------|-------|
| Moving platform falls | `bodyType: "dynamic"` | `bodyType: "kinematic"` |
| Player doesn't respond to gravity | `bodyType: "kinematic"` | `bodyType: "dynamic"` |
| Wall moves when hit | `bodyType: "dynamic"` | `bodyType: "static"` |
| Object can't be pushed | `bodyType: "static"` | `bodyType: "dynamic"` |

### Quick Reference

```typescript
// Static - never moves (walls, ground, platforms)
{ bodyType: "static", density: 0 }

// Dynamic - full physics (players, balls, objects)
{ bodyType: "dynamic", density: 1 }

// Kinematic - moves by velocity only (moving platforms, paddles)
{ bodyType: "kinematic", density: 0 }
```

---

## Gotcha #3: Density Mismatches

### The Mistake
AI sets `density` incorrectly for the body type.

### Rules
- **Static bodies**: `density: 0` (infinite mass)
- **Kinematic bodies**: `density: 0` (infinite mass)  
- **Dynamic bodies**: `density > 0` (needs mass!)

### Examples

**❌ WRONG: Dynamic body with zero density**
```typescript
ball: {
  physics: {
    bodyType: "dynamic",
    density: 0,  // ERROR: Dynamic bodies need mass!
  }
}
```

**✅ RIGHT: Dynamic body with proper density**
```typescript
ball: {
  physics: {
    bodyType: "dynamic",
    density: 1,  // Has mass, responds to physics
  }
}
```

---

## Gotcha #4: Forgetting `isSensor` for Triggers

### The Mistake
AI creates a trigger zone but forgets `isSensor: true`, causing it to block movement.

### When to Use Sensors

**Always use `isSensor: true` for:**
- Goal zones
- Collectibles (coins, items)
- Checkpoints
- Detection areas ("enemy sees player")
- Pass-through triggers
- Tetris piece placement detection

**Never use for:**
- Walls or ground (player falls through!)
- Objects that should bounce
- Anything that blocks movement

### Example

**❌ WRONG: Collectible that blocks the player**
```typescript
coin: {
  physics: {
    bodyType: "static",
    shape: "circle",
    radius: 0.3,
    // Missing isSensor: true - blocks player!
  }
}
```

**✅ RIGHT: Collectible that can be collected**
```typescript
coin: {
  physics: {
    bodyType: "static",
    shape: "circle",
    radius: 0.3,
    isSensor: true,  // Player walks through to collect
  },
  behaviors: [
    { type: "destroy_on_collision", withTags: ["player"], effect: "fade" },
    { type: "score_on_collision", withTags: ["player"], points: 10 },
  ]
}
```

---

## Gotcha #5: Restitution > 1 Without Understanding

### The Mistake
AI sets `restitution: 1.5` thinking "more bounce is better," causing physics instability.

### The Reality
- `restitution: 0` = No bounce (clay)
- `restitution: 1` = Perfect bounce (ideal)
- `restitution > 1` = **Adds energy each bounce!** (can cause infinite acceleration)

### Guidelines
- Use `restitution: 0.6-0.8` for normal bounciness
- Use `restitution: 1` for Breakout-style perfect bounce
- Use `restitution: 1.2-1.5` ONLY for pinball bumpers (intentional energy injection)
- Never exceed `restitution: 1.5`

---

## Gotcha #6: Missing Win/Lose Conditions

### The Mistake
AI generates a playable game but forgets end conditions, making it endless.

### Always Include

```typescript
winCondition: {
  type: "score", score: 1000        // Reach score
  // OR type: "destroy_all", tag: "enemy"  // Clear all enemies
  // OR type: "survive_time", time: 60      // Survive duration
  // OR type: "collect_all", tag: "coin"    // Collect everything
}

loseCondition: {
  type: "lives_zero"                 // Run out of lives
  // OR type: "time_up", time: 120         // Time limit
  // OR type: "entity_destroyed", tag: "player"  // Player dies
}
```

### Validation Rule
If `winCondition` is missing, add one based on the game type:
- Projectile games → `destroy_all` of targets
- Collection games → `collect_all` or `score` threshold
- Survival games → `survive_time`

---

## Gotcha #7: Tag Mismatches in Rules

### The Mistake
AI creates rules that reference tags that don't exist on any entities.

### Example

**❌ WRONG: Rule references non-existent tag**
```typescript
// Rule references "ball"
{
  id: "score_on_hit",
  trigger: { type: "collision", entityATag: "ball", entityBTag: "target" },
  actions: [{ type: "score", operation: "add", value: 100 }],
}

// But no entity has tags: ["ball"]!
projectile: {
  id: "projectile",
  tags: ["projectile"],  // Wrong tag!
  // ...
}
```

**✅ RIGHT: Consistent tags**
```typescript
ball: {
  id: "ball",
  tags: ["ball"],  // Matches rule
  // ...
}

{
  id: "score_on_hit",
  trigger: { type: "collision", entityATag: "ball", entityBTag: "target" },
  actions: [{ type: "score", operation: "add", value: 100 }],
}
```

### Tag Naming Tips
- Use simple, lowercase names: `"player"`, `"enemy"`, `"ball"`, `"collectible"`
- Be consistent - pick one name and stick to it
- Don't use spaces in tags (use underscores: `"red_ball"` not `"red ball"`)

---

## Gotcha #8: Template Reference Errors

### The Mistake
AI creates an entity that references a template that doesn't exist.

### Example

**❌ WRONG: Entity references undefined template**
```typescript
templates: {
  // Only defined "player" template
  player: { /* ... */ },
},

entities: [
  {
    id: "enemy1",
    template: "enemy",  // ERROR: "enemy" template doesn't exist!
  }
]
```

**✅ RIGHT: Define all referenced templates**
```typescript
templates: {
  player: { /* ... */ },
  enemy: { /* ... */ },  // Define before using
},

entities: [
  {
    id: "enemy1",
    template: "enemy",  // OK: Template exists
  }
]
```

---

## Gotcha #9: Fast Objects Tunneling Through Walls

### The Mistake
AI creates fast-moving projectiles that pass through thin walls due to physics tunneling.

### The Fix
Add `bullet: true` to fast-moving dynamic bodies:

```typescript
projectile: {
  physics: {
    bodyType: "dynamic",
    density: 1,
    bullet: true,  // Enhanced collision detection
  }
}
```

### When to Use
- Any projectile moving faster than ~5 m/s
- Fast-moving enemies
- Pinball balls

---

## Gotcha #10: Uncontrolled Rotation

### The Mistake
AI doesn't lock rotation on player characters, causing them to spin uncontrollably.

### The Fix
Add `fixedRotation: true` to player entities:

```typescript
player: {
  physics: {
    bodyType: "dynamic",
    density: 1,
    fixedRotation: true,  // Stays upright
  }
}
```

### When to Use
- Platformer characters
- Top-down game players
- Any entity that should stay upright

---

## Summary: AI Generation Checklist

Before returning a generated game, verify:

- [ ] **No physics for pure tap targets** - Use `tap` trigger with `target` instead
- [ ] **Body types match behavior** - Static for walls, dynamic for objects, kinematic for controlled movement
- [ ] **Density is correct** - 0 for static/kinematic, >0 for dynamic
- [ ] **Sensors where needed** - `collider: { isSensor: true }` for triggers, collectibles, detection areas (NOT deprecated `zone` component)
- [ ] **Restitution is reasonable** - ≤1.5, preferably ≤1
- [ ] **Win condition exists** - Game should have an end state
- [ ] **Lose condition exists** - Game should be losable
- [ ] **Tags match between rules and entities** - No orphaned references
- [ ] **All templates defined** - Every `template` reference exists in `templates`
- [ ] **Fast objects have `bullet: true`** - Prevent tunneling
- [ ] **Players have `fixedRotation: true`** - Unless rotation is intentional

---

## Quick Reference Card

```typescript
// WALL - blocks everything
{ bodyType: "static", density: 0, isSensor: false }

// PLAYER - full physics, stays upright
{ bodyType: "dynamic", density: 1, fixedRotation: true }

// BALL - bouncy physics object
{ bodyType: "dynamic", shape: "circle", density: 1, restitution: 0.8 }

// MOVING PLATFORM - controlled, no gravity
{ bodyType: "kinematic", density: 0 }

// COLLECTIBLE - detect but don't block
{ bodyType: "static", density: 0, isSensor: true }

// TRIGGER ZONE - detect entry/exit (use collider: { isSensor: true } for new entities)
{ bodyType: "static", density: 0, isSensor: true }

// FAST PROJECTILE - prevent tunneling
{ bodyType: "dynamic", density: 1, bullet: true }

// BOUNCY BUMPER - adds energy
{ bodyType: "static", density: 0, restitution: 1.5 }
```

---

## Related Documentation

- [Physics System Guide](../docs/physics-system-guide.md) - Complete physics reference
- [AI Integration](../docs/game-maker/reference/ai-integration.md) - AI generation pipeline
- [Game Rules](../docs/game-maker/reference/game-rules.md) - Rules system details
- [Entity System](../docs/game-maker/reference/entity-system.md) - Entity structure
