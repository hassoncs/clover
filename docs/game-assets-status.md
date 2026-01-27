# Game Assets Status

> **Purpose**: Track which games have images/sprites and which need them for the gallery system
> 
> **Last Updated**: 2026-01-26

## Quick Summary

- **Total Games**: 27
- **With Generated Assets** (imageUrl refs): 5
- **Using Primitive Shapes Only**: 22
- **Priority for Asset Generation**: High-appeal games without assets

---

## Games With Generated Assets ✅

These games already reference generated image assets via `ASSET_BASE` URLs:

| Game | Asset URL | Assets | Notes |
|------|-----------|--------|-------|
| **breakoutBouncer** | `generated/breakout-bouncer` | background.png, paddle.png, ball.png, brick.png | Complete |
| **physicsStacker** | `/assets/games/physics-stacker` | background.jpg, foundation.png, dropper.png, block variants | Complete |
| **pinballLite** | `generated/pinball-lite` | pinball.png, bumper.png, smallBumper.png, target.png | Complete |
| **simplePlatformer** | `generated/simple-platformer` | player.png, platform.png, smallPlatform.png, coin.png, enemy.png | Complete |
| **slopeggle** | `generated/slopeggle` | background.png, title_hero.png, ball.png, cannon.png, cannonBase.png, bluePeg.png, orangePeg.png, bucket.png | Complete + title hero |

---

## Games Using Primitive Shapes Only

These games use only `type: "rect"`, `type: "circle"` sprites without images. They're functional but could benefit from visual polish.

### High Priority (Popular/Iconic Game Types)

| Game | Primitive Types | Asset Needs | Appeal |
|------|-----------------|-------------|---------|
| **flappyBird** | circle (bird), rect (pipes, ground) | bird sprite, pipe textures, ground texture, background | ⭐⭐⭐ Very High |
| **bubbleShooter** | circle (bubbles in 5 colors) | colorful bubble sprites, shooter/cannon, background | ⭐⭐⭐ Very High |
| **gemCrush** | rect (gems) | gem sprites (6 colors), background, matched animation | ⭐⭐⭐ Very High |
| **puyoPuyo** | rect (puyo pieces) | puyo sprites (4 colors), background, pop animation | ⭐⭐⭐ High |
| **connect4** | circle (chips), rect (board) | red/yellow chips, game board, background | ⭐⭐ Medium-High |
| **tetris** (if exists) | rect (tetrominos) | tetromino sprites, background, grid | ⭐⭐⭐ Very High |

### Medium Priority (Puzzle/Logic Games)

| Game | Primitive Types | Asset Needs | Appeal |
|------|-----------------|-------------|---------|
| **ballSort** | circle (balls), rect (tubes) | colorful ball sprites, tube/container sprites | ⭐⭐ Medium |
| **game2048** | rect (tiles) | tile sprites with numbers/colors, background | ⭐⭐ Medium |
| **stackMatch** | rect (tiles in 6 colors, slots) | tile sprites, slot/container sprites | ⭐ Medium-Low |
| **blockDrop** | rect (blocks, columns, slots) | block sprites, column headers, background | ⭐ Medium-Low |
| **memoryMatch** | rect (cards) | card back, card face sprites (6 pairs), background | ⭐⭐ Medium |
| **dropPop** | rect (containers, tiles) | tile sprites (6 colors), container sprites | ⭐ Low |
| **iceSlide** | rect (ice blocks, tiles, goals) | ice block sprites, slider sprites, goal sprites | ⭐ Low |

### Physics/Action Games

| Game | Primitive Types | Asset Needs | Appeal |
|------|-----------------|-------------|---------|
| **dominoChain** | rect (dominos, trigger, goal) | domino sprites, trigger sprite, background | ⭐ Low |
| **tipScale** | rect (scale, platform, weights) | scale sprites, weight sprites, background | ⭐ Low |
| **dungeonCrawler** | rect (floor, player, collectibles, enemies, obstacles) | tile sprites, character sprites, enemy sprites, item sprites | ⭐⭐ Medium |
| **towerDefense** | rect (tower, base), circle (enemies, projectiles) | tower sprites, enemy sprites, projectile sprites, path/background | ⭐⭐ Medium |
| **comboFighter** | rect (player, training dummy, obstacles) | character sprites, training dummy, obstacle sprites | ⭐ Low |
| **rpgProgressionDemo** | rect (player, enemies, treasure, shop) | character sprites, enemy sprites, treasure chest, shop icon | ⭐ Low |

### Cat-Themed Games

| Game | Primitive Types | Asset Needs | Appeal |
|------|-----------------|-------------|---------|
| **catsFallingObjects** | rect (cat, obstacles) | cat sprite, falling object sprites, background | ⭐ Medium |
| **catsPlatformer** | rect (cat, platforms, collectibles, enemies) | cat sprite, platform textures, collectible sprites, enemy sprites | ⭐⭐ Medium |

### Slot Machine

| Game | Primitive Types | Asset Needs | Appeal |
|------|-----------------|-------------|---------|
| **slotMachine** | rect (machine frame, reels, symbols) | slot machine frame, reel symbols (7+ icons), background, effects | ⭐⭐ Medium |

### Sports

| Game | Primitive Types | Asset Needs | Appeal |
|------|-----------------|-------------|---------|
| **sportsProjectile** | rect (launcher, target, obstacles) | launcher sprite, ball/projectile, target sprites, background | ⭐ Low |

---

## Recommended Asset Generation Priority

Based on appeal, popularity, and gallery showcase value:

### Phase 1: Must-Have (Very High Appeal)
1. **flappyBird** - Iconic, instantly recognizable
2. **bubbleShooter** - Colorful, visually appealing
3. **gemCrush** - Match-3 is extremely popular
4. **puyoPuyo** - Classic puzzle game

### Phase 2: High Value
5. **connect4** - Simple but needs visual polish
6. **game2048** - Popular puzzle game
7. **slotMachine** - Visually interesting
8. **catsPlatformer** - Character-based, good for showing capabilities

### Phase 3: Polish & Coverage
9. **ballSort** - Popular mobile game type
10. **memoryMatch** - Simple card game
11. **dungeonCrawler** - Shows RPG capabilities
12. **towerDefense** - Shows strategy game capabilities

### Phase 4: Niche/Demo Games
- Remaining physics demos and experimental games

---

## Asset Generation Workflow

For each game that needs assets:

1. **Identify Asset Requirements**
   - List all sprite types used in game
   - Identify background needs
   - Note any title hero needs

2. **Create Asset Config**
   - Add to `api/scripts/game-configs/[game-name].ts`
   - Define entity sprites with physics shapes
   - Define background/title hero

3. **Generate Assets**
   ```bash
   npx tsx api/scripts/generate-game-assets.ts [game-name]
   ```

4. **Update Game Definition**
   - Add `ASSET_BASE` constant
   - Update sprite definitions from `type: "rect"` to `type: "image"`
   - Add `imageUrl`, `imageWidth`, `imageHeight`
   - Add `titleHeroImageUrl` to metadata
   - Add background imageUrl if applicable

5. **Verify**
   - Test game loads correctly
   - Check all sprites render
   - Verify physics still works correctly

---

## Example: Converting a Game to Use Assets

**Before** (flappyBird):
```typescript
export const metadata: TestGameMeta = {
  title: "Flappy Bird",
  description: "Tap to fly through the pipes without hitting them",
};

const game: GameDefinition = {
  // ... no background
  templates: {
    bird: {
      sprite: { type: "circle", radius: BIRD_RADIUS, color: "#f7dc6f" },
      // ...
    }
  }
};
```

**After**:
```typescript
const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/flappy-bird";

export const metadata: TestGameMeta = {
  title: "Flappy Bird",
  description: "Tap to fly through the pipes without hitting them",
  titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,
};

const game: GameDefinition = {
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,
  },
  templates: {
    bird: {
      sprite: { 
        type: "image", 
        imageUrl: `${ASSET_BASE}/bird.png`, 
        imageWidth: BIRD_RADIUS * 2, 
        imageHeight: BIRD_RADIUS * 2 
      },
      // ...
    }
  }
};
```

---

## Notes

- All games are playable as-is with primitive shapes
- Asset generation is for visual polish and gallery appeal
- Physics shapes remain the same, only visual sprites change
- Priority should favor games that showcase engine capabilities
- Cat-themed games have thematic cohesion - consider generating as a set
