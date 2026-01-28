# Game Mechanics

Reusable game mechanics for Slopcade games.

## Launcher

A "pull-back to aim; release to fire" slingshot-style launcher pattern.

### Quick Start

```typescript
import type { GameDefinition } from '@slopcade/shared';
import { createLauncherRules, createLauncherEntity } from '@slopcade/shared/mechanics';

const game: GameDefinition = {
  metadata: { id: 'my-game', title: 'My Game', version: '1.0.0' },
  world: { gravity: { x: 0, y: 9.8 }, pixelsPerMeter: 50, bounds: { width: 20, height: 12 } },
  ui: { showScore: true, showLives: true, backgroundColor: '#1a1a2e' },
  templates: {
    ball: {
      id: 'ball',
      visual: { type: 'circle', radius: 0.3, color: '#FF6B6B' },
      physics: { bodyType: 'dynamic', density: 1.5 },
      collider: { shape: 'circle', radius: 0.3 },
      tags: ['projectile'],
    },
    ground: {
      id: 'ground',
      visual: { type: 'rect', width: 20, height: 1, color: '#4A5568' },
      physics: { bodyType: 'static' },
      collider: { shape: 'box', width: 20, height: 1 },
      tags: ['ground'],
    },
  },
  entities: [
    createLauncherEntity({
      id: 'launcher',
      x: 2,
      y: 9,
      radius: 0.5,
      color: '#333333',
    }),
    {
      id: 'ground',
      template: 'ground',
      transform: { x: 10, y: 11.5, angle: 0, scaleX: 1, scaleY: 1 },
    },
  ],
  rules: [
    ...createLauncherRules({
      launcherEntityId: 'launcher',
      projectileTemplate: 'ball',
      projectileSpawnPosition: { x: 2, y: 8.5 },
      maxPullDistance: 3,
      forceMultiplier: 15,
      minPullThreshold: 0.2,
      consumeLives: true,
      oneShotAtATime: true,
      projectileTag: 'projectile',
    }),
  ],
  winCondition: { type: 'score', score: 1000 },
  loseCondition: { type: 'lives_zero' },
  initialLives: 3,
};

export default game;
```

### API

#### `createLauncherRules(config)`

Creates rules for pull-back firing mechanics.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `launcherEntityId` | string | - | ID of entity with draggable behavior |
| `projectileTemplate` | string | - | Template ID to spawn |
| `projectileSpawnPosition` | `{x, y}` | - | Where to spawn projectile |
| `maxPullDistance` | number | - | Max drag distance in meters |
| `forceMultiplier` | number | - | Impulse scaling factor |
| `minPullThreshold` | number | 0.2 | Ignore drags smaller than this |
| `consumeLives` | boolean | true | Subtract life on fire |
| `livesPerShot` | number | 1 | Lives consumed per shot |
| `cooldown` | number | 0.5 | Seconds between shots |
| `oneShotAtATime` | boolean | true | Limit active projectiles |
| `projectileTag` | string | - | Tag to track projectile count |
| `maxProjectiles` | number | 1 | Max concurrent projectiles |

#### `createLauncherEntity(config)`

Creates a launcher entity with draggable behavior.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | string | - | Entity ID |
| `x` | number | - | World X position |
| `y` | number | - | World Y position |
| `radius` | number | 0.5 | Visual radius |
| `color` | string | '#333333' | Visual color |

#### `createLauncherSetup(config)`

Creates both entity and rules in one call.

### How It Works

1. User touches and drags the launcher entity
2. Draggable behavior (force mode) creates spring physics
3. On drag end, rule triggers:
   - Spawns projectile at configured position
   - Applies impulse using `drag_direction` (pull vector)
   - Optionally decrements lives
4. Game over when lives reach zero (handled by `loseCondition`)

### Customization

**Stronger shots:** Increase `forceMultiplier`

**Longer pull:** Increase `maxPullDistance`

**Faster fire:** Decrease `cooldown`

**Multiple projectiles:** Set `oneShotAtATime: false`, `maxProjectiles: 3`
