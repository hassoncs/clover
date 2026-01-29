# Slopcade Game Engine

> **Trigger**: When working with game definitions, entities, physics, behaviors, rules, game logic, levels, or anything related to the core game runtime.
>
> **Purpose**: Complete reference for the Slopcade physics-based game engine including architecture, APIs, patterns, and workflows.

---

## When to Load This Skill

Load this skill when working on:
- **Game definitions** (`GameDefinition`, `GameEntity`, templates)
- **Entity system** (spawning, components, transforms)
- **Physics** (bodies, collisions, joints, forces)
- **Behaviors** (entity logic, movement, interactions)
- **Rules engine** (triggers, conditions, actions)
- **Game logic** (win/lose conditions, scoring)
- **Level design** (world config, camera, bounds)
- **Input handling** (tap, drag, tilt controls)
- **Godot bridge integration** (spawn entities, apply forces)

**Don't load for**: Asset/image generation (use `slopcade-asset-generation`), 3D models (use `slopcade-3d-assets`), debugging (use `game-inspector`).

---

## Quick Reference Links

### Core Documentation
| Document | Purpose | Location |
|----------|---------|----------|
| **Entity System** | Complete entity architecture | `docs/game-engine-architecture/01-core-concepts/entity-system.md` |
| **Behavior System** | All behavior types and patterns | `docs/game-engine-architecture/01-core-concepts/behavior-system.md` |
| **Rules System** | Triggers, conditions, actions | `docs/game-engine-architecture/01-core-concepts/rules-system.md` |
| **Physics System** | Body types, collisions, joints | `docs/physics-system-guide.md` |
| **Data Models** | TypeScript interfaces | `docs/game-maker/reference/data-models-and-workflows.md` |
| **Input Methods** | Control schemes catalog | `docs/game-maker/reference/input-methods-catalog.md` |
| **Playability Contract** | Game type requirements | `docs/game-maker/reference/playability-contract.md` |

### Architecture Deep Dives
| Document | Purpose | Location |
|----------|---------|----------|
| **Master Architecture** | System overview | `docs/game-engine-architecture/00-MASTER-ARCHITECTURE.md` |
| **Entity Hierarchy** | Parent-child relationships | `docs/game-engine-architecture/00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md` |
| **Implementation Spec** | Technical specs | `docs/game-engine-architecture/IMPLEMENTATION-SPEC-001-ENTITY-HIERARCHY.md` |
| **AI Integration** | LLM game generation | `docs/game-engine-architecture/06-ai-integration/` |

### API Reference
| Document | Purpose | Location |
|----------|---------|----------|
| **TypeDoc API** | Auto-generated TypeScript | `packages/docs/docs/api-reference/` |
| **Game Patterns** | Common patterns catalog | `docs/game-maker/reference/game-patterns.md` |
| **Dynamic Properties** | Runtime property system | `docs/game-maker/reference/dynamic-properties.md` |

---

## Core Concepts

### GameDefinition Structure

```typescript
interface GameDefinition {
  metadata: GameMetadata;           // id, title, description, version
  world: WorldConfig;               // gravity, pixelsPerMeter, bounds
  camera?: CameraConfig;            // fixed | follow | follow-x | follow-y
  ui?: UIConfig;                    // showScore, showLives, backgroundColor
  templates: Record<string, EntityTemplate>;  // Reusable entity blueprints
  entities: GameEntity[];           // Entity instances in the world
  rules?: GameRule[];               // Game logic rules
  winCondition?: WinCondition;      // How to win
  loseCondition?: LoseCondition;    // How to lose
}
```

### Entity Component System

Entities are composed of optional components:

```typescript
interface GameEntity {
  id: string;                       // Unique identifier
  template?: string;                // References EntityTemplate
  transform: TransformComponent;    // REQUIRED: position, rotation, scale
  sprite?: SpriteComponent;         // Visual: rect, circle, polygon, image
  physics?: PhysicsComponent;       // Physics body configuration
  behaviors?: Behavior[];           // Runtime game logic
  tags?: string[];                  // For collision filtering and queries
}
```

**Component Types**:
- **TransformComponent**: `x, y, angle, scaleX, scaleY` (meters, radians)
- **SpriteComponent**: `RectSprite | CircleSprite | PolygonSprite | ImageSprite`
- **PhysicsComponent**: `bodyType, shape, density, friction, restitution`

See full details: `docs/game-engine-architecture/01-core-concepts/entity-system.md`

### Physics Body Types

| Type | Code | Description | Use Case |
|------|------|-------------|----------|
| `static` | 0 | Never moves | Ground, walls, platforms, pegs |
| `kinematic` | 1 | Moves by velocity, ignores forces | Moving platforms, paddles |
| `dynamic` | 2 | Fully simulated | Players, projectiles, balls |

### Behaviors

Declarative game logic attached to entities:

```typescript
// Movement
{ type: 'move', direction: 'forward', speed: 5 }
{ type: 'oscillate', axis: 'x', amplitude: 4, frequency: 0.3 }

// Rotation
{ type: 'rotate', speed: 2, direction: 'clockwise' }

// Spawning
{ type: 'spawn_on_event', event: 'tap', entityTemplate: 'ball' }

// Collision response
{ type: 'destroy_on_collision', withTags: ['ball'] }
{ type: 'score_on_collision', withTags: ['ball'], points: 100 }

// Timer
{ type: 'timer', duration: 10, action: 'destroy' }
```

See all 10+ behavior types: `docs/game-engine-architecture/01-core-concepts/behavior-system.md`

### Rules Engine

Event-driven game logic:

```typescript
interface GameRule {
  id: string;
  trigger: RuleTrigger;             // What starts the rule
  conditions?: RuleCondition[];     // Optional filters
  actions: RuleAction[];            // What happens
}

// Example: Score when ball hits peg
{
  id: "peg_hit",
  trigger: { type: "collision", entityATag: "ball", entityBTag: "peg" },
  actions: [
    { type: "score", operation: "add", value: 100 },
    { type: "destroy", target: { type: "collision_entities" } }
  ]
}
```

**Trigger Types**: `collision`, `tap`, `drag`, `tilt`, `timer`, `score`, `entity_count`, `gameStart`

**Action Types**: `spawn`, `destroy`, `score`, `lives`, `apply_impulse`, `move`, `set_velocity`, `game_state`

See complete reference: `docs/game-engine-architecture/01-core-concepts/rules-system.md`

---

## Coordinate System

```
(0,0) ────────────────────► X+ (right)
  │
  │     World coordinates in METERS
  │     Screen coordinates in PIXELS
  │     Conversion: pixels = meters × pixelsPerMeter
  │
  ▼
  Y+ (down)
```

**Key Points**:
- Origin (0, 0) is top-left
- Y increases downward (screen coordinates)
- Default: 50 pixels per meter
- Physics bodies sized in meters

---

## Creating a New Game

### Step 1: Create Game File

Create `app/lib/test-games/games/<gameName>.ts`:

```typescript
import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "My Game",
  description: "Short description shown in game list",
};

const game: GameDefinition = {
  metadata: { 
    id: "my-game", 
    title: "My Game", 
    version: "1.0.0",
    instructions: "How to play..."
  },
  world: { 
    gravity: { x: 0, y: 9.8 }, 
    pixelsPerMeter: 50, 
    bounds: { width: 20, height: 12 } 
  },
  camera: { type: "fixed", zoom: 1 },
  ui: { 
    showScore: true, 
    showLives: true, 
    backgroundColor: "#1a1a2e" 
  },
  templates: {
    player: {
      id: "player",
      tags: ["player"],
      sprite: { type: "circle", radius: 0.5, color: "#4ECDC4" },
      physics: { 
        bodyType: "dynamic", 
        shape: "circle", 
        radius: 0.5,
        density: 1, 
        friction: 0.3, 
        restitution: 0.5 
      },
      behaviors: [{ type: "control", scheme: "drag_to_move" }]
    }
  },
  entities: [
    { id: "player-1", template: "player", transform: { x: 5, y: 2, angle: 0 } }
  ],
  rules: [],
  winCondition: { type: "score", score: 1000 },
  loseCondition: { type: "lives_zero" }
};

export default game;
```

### Step 2: Register Game

Run from `app/` directory:
```bash
node scripts/generate-registry.mjs
```

### Step 3: Test Game

The game will appear in the test games list automatically.

---

## Common Patterns

### Pattern 1: Ball Drain with Respawn

```typescript
// Template for drain area
drain: {
  id: "drain",
  tags: ["drain"],
  sprite: { type: "rect", width: 10, height: 1, color: "#FF000022" },
  physics: { 
    bodyType: "static", 
    shape: "box", 
    width: 10, 
    height: 1, 
    isSensor: true  // Detect collisions without physics response
  }
}

// Rule: When ball hits drain
{
  id: "ball_drain",
  trigger: { 
    type: "collision", 
    entityATag: "ball", 
    entityBTag: "drain" 
  },
  actions: [
    { type: "lives", operation: "subtract", value: 1 },
    { type: "destroy", target: { type: "by_tag", tag: "ball" } },
    { type: "spawn", template: "ball", position: { type: "fixed", x: 5, y: 2 } }
  ]
}
```

### Pattern 2: Drag-to-Launch (Angry Birds style)

```typescript
// Projectile with drag control
projectile: {
  id: "projectile",
  tags: ["projectile"],
  physics: { bodyType: "dynamic", shape: "circle", radius: 0.4, ... },
  behaviors: [{ type: "control", scheme: "drag_to_launch" }]
}

// Rule: Fire on drag end
{
  id: "launch",
  trigger: { type: "drag", phase: "end", target: "projectile" },
  actions: [
    { 
      type: "apply_impulse", 
      target: { type: "by_tag", tag: "projectile" }, 
      direction: "drag_direction", 
      force: 15 
    }
  ]
}
```

### Pattern 3: Destructible with Score

```typescript
// Brick template
brick: {
  id: "brick",
  tags: ["brick"],
  sprite: { type: "rect", width: 1.5, height: 0.5, color: "#FF6B6B" },
  physics: { bodyType: "static", shape: "box", width: 1.5, height: 0.5 },
  behaviors: [
    { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
    { type: "score_on_collision", withTags: ["ball"], points: 50 }
  ]
}
```

See 10+ more patterns: `docs/game-maker/reference/game-patterns.md`

---

## Key Code Locations

| System | Primary Files |
|--------|---------------|
| **Game Runtime** | `app/lib/game-engine/GameRuntime.godot.tsx` |
| **Rules Evaluator** | `app/lib/game-engine/RulesEvaluator.ts` |
| **Entity Manager** | `app/lib/game-engine/EntityManager.ts` |
| **Behavior Executor** | `app/lib/game-engine/BehaviorExecutor.ts` |
| **Physics Bridge** | `app/lib/game-engine/physics/GodotPhysicsAdapter.ts` |
| **Input Handling** | `app/lib/game-engine/InputEntityManager.ts` |
| **Type Definitions** | `shared/src/types/GameDefinition.ts` |
| **Test Games** | `app/lib/test-games/games/*.ts` |

---

## Integration with Asset Generation

Games typically need AI-generated sprites. This is handled by the **Asset Generation** system (`slopcade-asset-generation` skill), which:

1. Creates config at `api/scripts/game-configs/<game-id>.ts`
2. Generates images via Modal or Scenario.com
3. Uploads to R2 CDN
4. Game references images via URL

**Game engine skill focuses on**: Game logic, physics, rules  
**Asset generation skill focuses on**: Image generation, sprites, backgrounds

See `slopcade-asset-generation` skill for complete asset workflow.

---

## Related Skills

| Skill | Use When Working On |
|-------|---------------------|
| `slopcade-asset-generation` | AI image generation, sprites, backgrounds |
| `slopcade-3d-assets` | GLB models, 3D rendering, Modal.com |
| `game-inspector` | Debugging, testing, verifying game behavior |
| `slopcade-godot-bridge` | Bridge communication, native exports |
| `slopcade-documentation` | Project management, roadmaps, planning |

---

## Checklist for New Games

- [ ] Game file created at `app/lib/test-games/games/<name>.ts`
- [ ] Exports `metadata` and `GameDefinition`
- [ ] Unique `metadata.id`
- [ ] `world.bounds` appropriate for gameplay
- [ ] All templates have unique IDs
- [ ] All entities have unique IDs
- [ ] Tags consistent between templates and rules
- [ ] Win condition achievable
- [ ] Lose condition defined
- [ ] Registry regenerated (`node scripts/generate-registry.mjs`)
- [ ] TypeScript compiles without errors
- [ ] **Assets generated** (see `slopcade-asset-generation` skill)

---

## Version

Last updated: 2026-01-29  
Skill version: 2.0.0 (Renamed from slopcade-game-builder)
