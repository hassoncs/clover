# Slopcade Game Builder Skill

> **Trigger**: When creating new games, modifying game definitions, or working with the game engine.
>
> **Purpose**: Rapidly build physics-based games using the Slopcade game engine without needing to research the codebase.

---

## Quick Start

To create a new game:

1. Create a file at `app/lib/test-games/games/<gameName>.ts`
2. Export `metadata` and a default `GameDefinition`
3. Run `node scripts/generate-registry.mjs` from `app/` directory

```typescript
import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "@/lib/registry/types";

export const metadata: TestGameMeta = {
  title: "My Game",
  description: "Short description",
};

const game: GameDefinition = {
  metadata: { id: "my-game", title: "My Game", version: "1.0.0" },
  world: { gravity: { x: 0, y: 9.8 }, pixelsPerMeter: 50, bounds: { width: 20, height: 12 } },
  camera: { type: "fixed", zoom: 1 },
  ui: { showScore: true, showLives: false, showTimer: false, backgroundColor: "#1a1a2e" },
  templates: { /* entity templates */ },
  entities: [ /* entity instances */ ],
  rules: [ /* game rules */ ],
  winCondition: { type: "score", score: 1000 },
  loseCondition: { type: "time_up", time: 60 },
};

export default game;
```

---

## Key Reference Files

| File | Purpose |
|------|---------|
| `docs/game-maker/reference/entity-system.md` | Entity structure, components, templates |
| `docs/game-maker/reference/behavior-system.md` | All behavior types and parameters |
| `docs/game-maker/reference/game-rules.md` | Rules, triggers, conditions, actions |
| `docs/game-maker/templates/INDEX.md` | 10 game template patterns |
| `shared/src/types/GameDefinition.ts` | TypeScript type definitions |
| `shared/src/types/rules.ts` | Rule trigger/action types |

---

## GameDefinition Structure

```typescript
interface GameDefinition {
  metadata: GameMetadata;           // id, title, description, instructions, version
  world: WorldConfig;               // gravity, pixelsPerMeter, bounds
  camera?: CameraConfig;            // type: 'fixed' | 'follow' | 'follow-x' | 'follow-y'
  ui?: UIConfig;                    // showScore, showLives, showTimer, backgroundColor
  templates: Record<string, EntityTemplate>;  // Reusable entity definitions
  entities: GameEntity[];           // Entity instances in the world
  rules?: GameRule[];               // Game logic rules
  winCondition?: WinCondition;      // How to win
  loseCondition?: LoseCondition;    // How to lose
  initialLives?: number;            // Starting lives (default: 3)
  initialScore?: number;            // Starting score (default: 0)
}
```

---

## Entity Templates

Templates define reusable entity configurations:

```typescript
interface EntityTemplate {
  id: string;
  tags?: string[];                  // For collision filtering and rules
  sprite?: SpriteComponent;         // Visual representation
  physics?: PhysicsComponent;       // Physics body
  behaviors?: Behavior[];           // Runtime behaviors
}
```

### Sprite Types

```typescript
// Rectangle
{ type: 'rect', width: 2, height: 0.5, color: '#FF6B6B' }

// Circle
{ type: 'circle', radius: 0.5, color: '#4ECDC4' }

// Polygon
{ type: 'polygon', vertices: [{ x: 0, y: -0.5 }, { x: -0.5, y: 0.5 }, { x: 0.5, y: 0.5 }], color: '#45B7D1' }
```

### Physics Body Types

| Type | Code | Description | Use Case |
|------|------|-------------|----------|
| `static` | 0 | Never moves | Ground, walls, platforms, pegs |
| `kinematic` | 1 | Moves by velocity, ignores forces | Moving platforms, paddles |
| `dynamic` | 2 | Fully simulated | Players, projectiles, balls |

### Physics Properties

```typescript
interface PhysicsComponent {
  bodyType: 'static' | 'dynamic' | 'kinematic';
  shape: 'box' | 'circle' | 'polygon';
  width?: number;           // For 'box' shape
  height?: number;          // For 'box' shape
  radius?: number;          // For 'circle' shape
  density: number;          // Mass per area (0 for static)
  friction: number;         // Surface friction (0-1)
  restitution: number;      // Bounciness (0-1, can exceed 1 for super bouncy)
  isSensor?: boolean;       // Detect collision but don't respond physically
  bullet?: boolean;         // More accurate collision for fast objects
  fixedRotation?: boolean;  // Prevent rotation
  linearDamping?: number;   // Velocity slowdown
}
```

---

## Behaviors

Behaviors are declarative game logic attached to entities:

### Common Behaviors

```typescript
// Destroy on collision
{ type: 'destroy_on_collision', withTags: ['ball'], effect: 'fade' }

// Score on collision
{ type: 'score_on_collision', withTags: ['ball'], points: 100 }

// Oscillate (back and forth motion)
{ type: 'oscillate', axis: 'x', amplitude: 4, frequency: 0.3 }

// Rotate continuously
{ type: 'rotate', speed: 2, direction: 'clockwise' }

// Self-destruct timer
{ type: 'timer', duration: 10, action: 'destroy' }

// Spawn on event
{ type: 'spawn_on_event', event: 'tap', entityTemplate: 'ball', spawnPosition: 'at_self' }
```

---

## Rules

Rules define game logic that responds to events:

```typescript
interface GameRule {
  id: string;
  name?: string;
  trigger: RuleTrigger;
  conditions?: RuleCondition[];
  actions: RuleAction[];
  fireOnce?: boolean;
  cooldown?: number;
}
```

### Triggers

```typescript
// Collision between tagged entities
{ type: 'collision', entityATag: 'ball', entityBTag: 'peg' }

// User input
{ type: 'tap' }
{ type: 'drag', phase: 'start' | 'move' | 'end', target?: 'ball' }
{ type: 'tilt' }

// Timer
{ type: 'timer', time: 5, repeat?: true }

// Score threshold
{ type: 'score', threshold: 1000, comparison: 'gte' }

// Entity count
{ type: 'entity_count', tag: 'enemy', count: 0, comparison: 'zero' }

// Game start
{ type: 'gameStart' }
```

### Actions

```typescript
// Spawn entity
{ type: 'spawn', template: 'ball', position: { type: 'fixed', x: 5, y: 2 } }

// Destroy entity
{ type: 'destroy', target: { type: 'by_tag', tag: 'ball' } }
{ type: 'destroy', target: { type: 'by_id', entityId: 'player' } }
{ type: 'destroy', target: { type: 'collision_entities' } }

// Modify score
{ type: 'score', operation: 'add', value: 100 }

// Modify lives
{ type: 'lives', operation: 'subtract', value: 1 }

// Apply physics impulse
{ type: 'apply_impulse', target: { type: 'by_id', entityId: 'ball' }, direction: 'drag_direction', force: 15 }
{ type: 'apply_impulse', target: { type: 'by_tag', tag: 'ball' }, x: 0, y: -10 }
{ type: 'apply_impulse', target: { type: 'by_id', entityId: 'ball' }, direction: 'toward_touch', force: 6, sourceEntityId: 'cannon' }

// Move entity
{ type: 'move', target: { type: 'by_tag', tag: 'paddle' }, direction: 'toward_touch_x', speed: 20 }

// Set velocity
{ type: 'set_velocity', target: { type: 'by_id', entityId: 'ball' }, x: 5, y: -8 }

// Game state
{ type: 'game_state', state: 'win' | 'lose' | 'restart' }
```

---

## Win/Lose Conditions

### Win Conditions

```typescript
{ type: 'score', score: 1000 }              // Reach score
{ type: 'destroy_all', tag: 'enemy' }       // Destroy all tagged entities
{ type: 'survive_time', time: 60 }          // Survive for duration
{ type: 'collect_all', tag: 'coin' }        // Collect all tagged entities
```

### Lose Conditions

```typescript
{ type: 'lives_zero' }                      // Out of lives
{ type: 'time_up', time: 120 }              // Time limit exceeded
{ type: 'entity_destroyed', tag: 'player' } // Player destroyed
{ type: 'entity_exits_screen', tag: 'ball' }// Entity leaves screen
```

---

## Common Patterns

### Ball Drain with Respawn (Pinball/Breakout/Peggle)

```typescript
// Template
drain: {
  id: "drain",
  tags: ["drain"],
  sprite: { type: "rect", width: 10, height: 1, color: "#FF000022" },
  physics: { bodyType: "static", shape: "box", width: 10, height: 1, density: 0, friction: 0, restitution: 0, isSensor: true },
}

// Rule
{
  id: "ball_drain",
  trigger: { type: "collision", entityATag: "ball", entityBTag: "drain" },
  actions: [
    { type: "lives", operation: "subtract", value: 1 },
    { type: "destroy", target: { type: "by_tag", tag: "ball" } },
    { type: "spawn", template: "ball", position: { type: "fixed", x: 5, y: 2 } },
  ],
}
```

### Drag-to-Launch (Angry Birds style)

```typescript
{
  id: "launch",
  trigger: { type: "drag", phase: "end", target: "projectile" },
  actions: [
    { type: "apply_impulse", target: { type: "by_id", entityId: "projectile" }, direction: "drag_direction", force: 15 },
  ],
}
```

### Cannon Aim-and-Fire (Peggle style)

```typescript
// Cannon template with rotate_toward behavior
cannon: {
  id: "cannon",
  tags: ["cannon"],
  sprite: { type: "rect", width: 0.6, height: 0.25, color: "#4A5568" },
  physics: { bodyType: "kinematic", shape: "box", width: 0.6, height: 0.25, density: 0, friction: 0, restitution: 0, isSensor: true },
  behaviors: [
    { type: "rotate_toward", target: "touch", speed: 200, offset: 0 },
  ],
}

// Fire rule - fires toward where user is touching, from cannon position
{
  id: "fire_ball",
  trigger: { type: "drag", phase: "end" },
  actions: [
    { type: "apply_impulse", target: { type: "by_id", entityId: "ball" }, direction: "toward_touch", force: 6, sourceEntityId: "cannon" },
  ],
}
```

### Paddle Control (Breakout)

```typescript
{
  id: "paddle_move",
  trigger: { type: "drag", phase: "move" },
  actions: [
    { type: "move", target: { type: "by_tag", tag: "paddle" }, direction: "toward_touch_x", speed: 20 },
  ],
}
```

### Destructible Objects with Score

```typescript
behaviors: [
  { type: "destroy_on_collision", withTags: ["ball"], effect: "fade" },
  { type: "score_on_collision", withTags: ["ball"], points: 50 },
]
```

---

## Example Games for Reference

| Game | File | Key Patterns |
|------|------|--------------|
| Breakout | `breakoutBouncer.ts` | Paddle control, brick destruction, ball drain |
| Pinball | `pinballLite.ts` | Bumpers, flippers, score targets |
| Peggle | `peggle.ts` | Cannon aim, toward_touch firing, peg destruction, bucket catch |
| Slingshot | `slingshotDestruction.ts` | Drag-to-aim, structure destruction |
| Bouncing Balls | `bouncingBalls.ts` | Spawner, timer destruction |

---

## Coordinate System

```
(0,0) ────────────────────► X+ (right)
  │
  │     World coordinates are in METERS
  │     Screen coordinates are in PIXELS
  │
  │     Conversion: screenX = worldX * pixelsPerMeter
  │
  ▼
  Y+ (down)
```

**Note**: Y increases downward (standard screen coordinates).

---

## Asset Generation (REQUIRED for all games)

Every game MUST have AI-generated assets including:
- **Entity sprites** - All game entities (balls, paddles, bricks, characters, etc.)
- **Background image** - Game background (ALWAYS REQUIRED)
- **Title hero image** - Game title/logo (ALWAYS REQUIRED)

### Asset Generation Workflow

1. **Create a game config** at `api/scripts/game-configs/<game-id>.ts`:

```typescript
import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../src/ai/pipeline/types';

export const myGameConfig: GameAssetConfig = {
  gameId: 'my-game',
  gameTitle: 'My Game',
  theme: 'describe the visual theme here',
  style: 'cartoon', // Options: 'pixel' | 'cartoon' | '3d' | 'flat'
  r2Prefix: 'generated/my-game',
  assets: [
    // Entity sprites (one per game object with physics)
    {
      type: 'entity',
      id: 'ball',
      shape: 'circle',  // Must match physics shape
      width: 0.5,       // Must match physics dimensions
      height: 0.5,
      entityType: 'item',
      description: 'describe what it looks like',
    } as EntitySpec,
    
    // Background (ALWAYS REQUIRED)
    {
      type: 'background',
      id: 'background',
      prompt: 'Full description of the game background',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    
    // Title hero (ALWAYS REQUIRED)
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'My Game',
      themeDescription: 'Style description for the title',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
```

2. **Register the config** in `api/scripts/game-configs/index.ts`:

```typescript
import { myGameConfig } from './my-game';

export const gameConfigs: Record<string, GameAssetConfig> = {
  // ... existing configs
  'my-game': myGameConfig,
};
```

3. **Run asset generation**:

```bash
# Requires Scenario.com API keys via hush
hush run -- npx tsx api/scripts/generate-game-assets.ts my-game

# Dry run to preview what will be generated
npx tsx api/scripts/generate-game-assets.ts my-game --dry-run
```

4. **Use generated assets in the game**:

```typescript
const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/my-game";

const game: GameDefinition = {
  metadata: {
    id: "my-game",
    title: "My Game",
    // ... other metadata
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,  // REQUIRED
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,  // REQUIRED
  },
  templates: {
    ball: {
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/ball.png`,
        imageWidth: 0.5,
        imageHeight: 0.5,
      },
      // ... physics config
    },
  },
  // ... rest of game definition
};
```

### Asset Types Reference

| Type | Purpose | Required Fields |
|------|---------|-----------------|
| `entity` | Game object sprites | `shape`, `width`, `height`, `entityType`, `description` |
| `background` | Game background | `prompt`, `width`, `height` |
| `title_hero` | Title/logo image | `title`, `themeDescription`, `width`, `height` |
| `parallax` | Multi-layer backgrounds | `prompt`, `layerCount`, `width`, `height` |

### Entity Types

| Type | Use For |
|------|---------|
| `character` | Player characters, NPCs |
| `enemy` | Enemies, obstacles |
| `item` | Collectibles, projectiles, balls |
| `platform` | Platforms, ground |
| `background` | Background decorations |
| `ui` | UI elements, buttons |

---

## Checklist for New Games

- [ ] File created at `app/lib/test-games/games/<name>.ts`
- [ ] Exports `metadata: TestGameMeta` with title and description
- [ ] Exports default `GameDefinition`
- [ ] `metadata.id` is unique
- [ ] `world.bounds` matches intended play area
- [ ] All templates have unique `id` values
- [ ] All entities have unique `id` values
- [ ] Tags are consistent between templates and rules
- [ ] Win condition is achievable
- [ ] Lose condition is defined (if applicable)
- [ ] **Asset config created** at `api/scripts/game-configs/<game-id>.ts`
- [ ] **Asset config includes background and title_hero** (REQUIRED)
- [ ] **Assets generated** via `hush run -- npx tsx api/scripts/generate-game-assets.ts <game-id>`
- [ ] **Game uses generated assets** (`titleHeroImageUrl`, `background`, entity sprites)
- [ ] Run `node scripts/generate-registry.mjs` from `app/` directory
- [ ] TypeScript compiles without errors
