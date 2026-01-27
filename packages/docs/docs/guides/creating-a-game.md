---
sidebar_position: 7
---

# Creating a Complete Game

Build a full game from scratch: a simple platformer where you collect coins and avoid enemies.

## Game Overview

**Coin Collector** is a platformer where:
- Player moves left/right and jumps
- Collect coins for points
- Avoid enemies
- Reach 50 points to win

## Step 1: Set Up the Game Structure

Start with metadata and world configuration:

```typescript
import type { GameDefinition } from "@slopcade/shared";

const coinCollector: GameDefinition = {
  metadata: {
    id: "coin-collector",
    title: "Coin Collector",
    description: "Collect coins and avoid enemies!",
    instructions: "Drag to move, tap to jump. Collect 50 coins to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 12, height: 8 },
  },
  camera: { type: "follow", followTarget: "player", zoom: 1 },
  ui: {
    showScore: true,
    showLives: true,
    backgroundColor: "#87CEEB",
  },
  winCondition: { type: "score", score: 50 },
  loseCondition: { type: "lives_zero" },
  initialLives: 3,
  initialScore: 0,
  templates: {},
  entities: [],
  rules: [],
};
```

## Step 2: Create Entity Templates

Define reusable entity types:

```typescript
templates: {
  player: {
    id: "player",
    tags: ["player"],
    sprite: {
      type: "rect",
      width: 0.6,
      height: 1,
      color: "#FF6B6B",
    },
    physics: {
      bodyType: "dynamic",
      shape: { type: "rect", width: 0.6, height: 1 },
      density: 1,
      friction: 0.5,
    },
    behaviors: [
      {
        type: "control",
        inputType: "drag",
        moveMode: "direct",
      },
    ],
  },
  coin: {
    id: "coin",
    tags: ["collectible", "coin"],
    sprite: {
      type: "circle",
      radius: 0.2,
      color: "#FFD700",
    },
    physics: {
      bodyType: "dynamic",
      shape: { type: "circle", radius: 0.2 },
      density: 0.5,
      restitution: 0.6,
    },
    behaviors: [
      {
        type: "scale_oscillate",
        min: 0.8,
        max: 1.1,
        speed: 3,
      },
    ],
  },
  enemy: {
    id: "enemy",
    tags: ["enemy"],
    sprite: {
      type: "circle",
      radius: 0.4,
      color: "#E74C3C",
    },
    physics: {
      bodyType: "dynamic",
      shape: { type: "circle", radius: 0.4 },
      density: 1,
    },
    behaviors: [
      {
        type: "move",
        direction: "left",
        speed: 2,
      },
    ],
  },
  platform: {
    id: "platform",
    tags: ["platform"],
    sprite: {
      type: "rect",
      width: 3,
      height: 0.5,
      color: "#8B4513",
    },
    physics: {
      bodyType: "static",
      shape: { type: "rect", width: 3, height: 0.5 },
    },
  },
  wall: {
    id: "wall",
    tags: ["wall"],
    sprite: {
      type: "rect",
      width: 0.2,
      height: 10,
      color: "#333333",
    },
    physics: {
      bodyType: "static",
      shape: { type: "rect", width: 0.2, height: 10 },
    },
  },
},
```

## Step 3: Spawn Entities

Place entities in the world:

```typescript
entities: [
  // Player
  {
    id: "player",
    name: "Player",
    template: "player",
    transform: { x: 0, y: 2, angle: 0, scaleX: 1, scaleY: 1 },
  },
  // Platforms
  {
    id: "platform-1",
    name: "Ground",
    template: "platform",
    transform: { x: 0, y: -3.5, angle: 0, scaleX: 6, scaleY: 1 },
  },
  {
    id: "platform-2",
    name: "Platform 2",
    template: "platform",
    transform: { x: -3, y: -1, angle: 0, scaleX: 1, scaleY: 1 },
  },
  {
    id: "platform-3",
    name: "Platform 3",
    template: "platform",
    transform: { x: 3, y: -1, angle: 0, scaleX: 1, scaleY: 1 },
  },
  // Walls
  {
    id: "wall-left",
    name: "Left Wall",
    template: "wall",
    transform: { x: -6, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
  },
  {
    id: "wall-right",
    name: "Right Wall",
    template: "wall",
    transform: { x: 6, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
  },
  // Coins
  {
    id: "coin-1",
    name: "Coin 1",
    template: "coin",
    transform: { x: -3, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
  },
  {
    id: "coin-2",
    name: "Coin 2",
    template: "coin",
    transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
  },
  {
    id: "coin-3",
    name: "Coin 3",
    template: "coin",
    transform: { x: 3, y: 0, angle: 0, scaleX: 1, scaleY: 1 },
  },
  // Enemy
  {
    id: "enemy-1",
    name: "Enemy",
    template: "enemy",
    transform: { x: 0, y: -2, angle: 0, scaleX: 1, scaleY: 1 },
  },
],
```

## Step 4: Add Game Rules

Define what happens when events occur:

```typescript
rules: [
  // Collect coins
  {
    trigger: { type: "collision", entityATag: "player", entityBTag: "coin" },
    actions: [
      { type: "destroy", targetTag: "coin" },
      { type: "add_score", amount: 10 },
      { type: "play_sound", sound: "coin" },
    ],
  },
  // Hit enemy
  {
    trigger: { type: "collision", entityATag: "player", entityBTag: "enemy" },
    actions: [
      { type: "add_lives", amount: -1 },
      { type: "play_sound", sound: "hit" },
    ],
  },
  // Enemy bounces off walls
  {
    trigger: { type: "collision", entityATag: "enemy", entityBTag: "wall" },
    actions: [
      {
        type: "apply_force",
        targetTag: "enemy",
        force: { x: 5, y: 0 },
      },
    ],
  },
  // Spawn new coins when all collected
  {
    trigger: { type: "entity_count", tag: "coin", count: 0, comparison: "eq" },
    actions: [
      {
        type: "spawn",
        templateId: "coin",
        offset: { x: -3, y: 0 },
      },
      {
        type: "spawn",
        templateId: "coin",
        offset: { x: 0, y: 0 },
      },
      {
        type: "spawn",
        templateId: "coin",
        offset: { x: 3, y: 0 },
      },
    ],
  },
],
```

## Step 5: Test Your Game

1. **Load the game** - Import and run the GameDefinition
2. **Test movement** - Drag the player left/right
3. **Test jumping** - Tap to jump (if you add jump behavior)
4. **Test collisions** - Collect coins, hit enemies
5. **Test win condition** - Reach 50 points

## Complete Game JSON

Here's the full game definition:

```typescript
const coinCollector: GameDefinition = {
  metadata: {
    id: "coin-collector",
    title: "Coin Collector",
    description: "Collect coins and avoid enemies!",
    instructions: "Drag to move. Collect 50 coins to win!",
    version: "1.0.0",
  },
  world: {
    gravity: { x: 0, y: -9.8 },
    pixelsPerMeter: 50,
    bounds: { width: 12, height: 8 },
  },
  camera: { type: "follow", followTarget: "player", zoom: 1 },
  ui: {
    showScore: true,
    showLives: true,
    backgroundColor: "#87CEEB",
  },
  winCondition: { type: "score", score: 50 },
  loseCondition: { type: "lives_zero" },
  initialLives: 3,
  initialScore: 0,
  templates: {
    player: {
      id: "player",
      tags: ["player"],
      sprite: { type: "rect", width: 0.6, height: 1, color: "#FF6B6B" },
      physics: {
        bodyType: "dynamic",
        shape: { type: "rect", width: 0.6, height: 1 },
        density: 1,
        friction: 0.5,
      },
      behaviors: [{ type: "control", inputType: "drag", moveMode: "direct" }],
    },
    coin: {
      id: "coin",
      tags: ["collectible", "coin"],
      sprite: { type: "circle", radius: 0.2, color: "#FFD700" },
      physics: {
        bodyType: "dynamic",
        shape: { type: "circle", radius: 0.2 },
        density: 0.5,
        restitution: 0.6,
      },
      behaviors: [{ type: "scale_oscillate", min: 0.8, max: 1.1, speed: 3 }],
    },
    enemy: {
      id: "enemy",
      tags: ["enemy"],
      sprite: { type: "circle", radius: 0.4, color: "#E74C3C" },
      physics: {
        bodyType: "dynamic",
        shape: { type: "circle", radius: 0.4 },
        density: 1,
      },
      behaviors: [{ type: "move", direction: "left", speed: 2 }],
    },
    platform: {
      id: "platform",
      tags: ["platform"],
      sprite: { type: "rect", width: 3, height: 0.5, color: "#8B4513" },
      physics: {
        bodyType: "static",
        shape: { type: "rect", width: 3, height: 0.5 },
      },
    },
    wall: {
      id: "wall",
      tags: ["wall"],
      sprite: { type: "rect", width: 0.2, height: 10, color: "#333333" },
      physics: {
        bodyType: "static",
        shape: { type: "rect", width: 0.2, height: 10 },
      },
    },
  },
  entities: [
    { id: "player", name: "Player", template: "player", transform: { x: 0, y: 2, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "platform-1", name: "Ground", template: "platform", transform: { x: 0, y: -3.5, angle: 0, scaleX: 6, scaleY: 1 } },
    { id: "platform-2", name: "Platform 2", template: "platform", transform: { x: -3, y: -1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "platform-3", name: "Platform 3", template: "platform", transform: { x: 3, y: -1, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-left", name: "Left Wall", template: "wall", transform: { x: -6, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "wall-right", name: "Right Wall", template: "wall", transform: { x: 6, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-1", name: "Coin 1", template: "coin", transform: { x: -3, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-2", name: "Coin 2", template: "coin", transform: { x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "coin-3", name: "Coin 3", template: "coin", transform: { x: 3, y: 0, angle: 0, scaleX: 1, scaleY: 1 } },
    { id: "enemy-1", name: "Enemy", template: "enemy", transform: { x: 0, y: -2, angle: 0, scaleX: 1, scaleY: 1 } },
  ],
  rules: [
    {
      trigger: { type: "collision", entityATag: "player", entityBTag: "coin" },
      actions: [
        { type: "destroy", targetTag: "coin" },
        { type: "add_score", amount: 10 },
      ],
    },
    {
      trigger: { type: "collision", entityATag: "player", entityBTag: "enemy" },
      actions: [{ type: "add_lives", amount: -1 }],
    },
  ],
};
```

## Next Steps

- **Add jump behavior** - Let player jump with button press
- **Add more levels** - Create multiple platforms
- **Add sound effects** - Play sounds on events
- **Add visual effects** - Glow on coins, particles on collision
- **Publish your game** - Share with others!

## Tips

- **Start simple** - Build the core game first
- **Test often** - Play your game frequently
- **Iterate** - Adjust physics, speeds, and difficulty
- **Polish** - Add effects and sounds last
- **Get feedback** - Have others play and suggest improvements
