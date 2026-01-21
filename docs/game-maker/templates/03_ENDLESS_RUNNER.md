# Template 03: Endless Runner

*Subway Surfers-style auto-scrolling side-view runner*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Subway Surfers, Temple Run, Flappy Bird |
| **Tier** | 1 (Fully AI-Generatable) |
| **Target Age** | 6-14 |
| **Session Length** | 30 seconds - 5 minutes |
| **Perspective** | Side view, auto-scrolling |
| **Primary Verb** | `tap_to_jump` |

**Core Loop:** Character runs automatically, player taps to jump over obstacles, collect coins, survive as long as possible. Speed gradually increases.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Auto Movement** | Character moves right automatically | Genre defining |
| **Input** | Single tap to jump | Accessibility |
| **Infinite Length** | Procedural generation | Endless gameplay |
| **Speed Ramp** | Gets faster over time | Increasing challenge |
| **Death on Collision** | Hit obstacle = game over | Clear failure |
| **Score by Distance** | Further = higher score | Progress metric |

---

## Entity Templates

### Runner (Player)

```json
{
  "id": "runner",
  "name": "Runner",
  "transform": { "x": 3, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 },
  "sprite": {
    "type": "rect",
    "width": 0.8,
    "height": 1.2,
    "color": "#4ECDC4"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "box",
    "width": 0.8,
    "height": 1.2,
    "density": 1,
    "friction": 0.3,
    "restitution": 0,
    "fixedRotation": true
  },
  "behaviors": [
    {
      "type": "control",
      "controlType": "tap_to_jump",
      "force": 12,
      "cooldown": 0.1
    },
    {
      "type": "destroy_on_collision",
      "withTags": ["obstacle", "hazard"],
      "effect": "fade"
    }
  ],
  "tags": ["player", "runner"]
}
```

### Ground Segment

```json
{
  "id": "ground_segment",
  "name": "Ground",
  "sprite": {
    "type": "rect",
    "width": 10,
    "height": 1,
    "color": "#2d3436"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "box",
    "width": 10,
    "height": 1,
    "density": 0,
    "friction": 0.8,
    "restitution": 0
  },
  "behaviors": [
    {
      "type": "move",
      "direction": "left",
      "speed": 8,
      "movementType": "velocity"
    }
  ],
  "tags": ["ground", "solid"]
}
```

### Obstacle

```json
{
  "id": "obstacle_box",
  "name": "Box Obstacle",
  "sprite": {
    "type": "rect",
    "width": 1,
    "height": 1.5,
    "color": "#e74c3c"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "box",
    "width": 1,
    "height": 1.5,
    "density": 0,
    "friction": 0,
    "restitution": 0
  },
  "behaviors": [
    {
      "type": "move",
      "direction": "left",
      "speed": 8,
      "movementType": "velocity"
    }
  ],
  "tags": ["obstacle", "hazard"]
}
```

### Coin

```json
{
  "id": "coin",
  "name": "Coin",
  "sprite": {
    "type": "circle",
    "radius": 0.3,
    "color": "#FFD700"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "circle",
    "radius": 0.3,
    "density": 0,
    "isSensor": true
  },
  "behaviors": [
    {
      "type": "move",
      "direction": "left",
      "speed": 8,
      "movementType": "velocity"
    },
    {
      "type": "rotate",
      "speed": 5,
      "direction": "clockwise"
    },
    {
      "type": "destroy_on_collision",
      "withTags": ["player"],
      "effect": "fade"
    },
    {
      "type": "score_on_collision",
      "withTags": ["player"],
      "points": 10
    }
  ],
  "tags": ["coin", "collectible"]
}
```

### Spawner

```json
{
  "id": "obstacle_spawner",
  "name": "Obstacle Spawner",
  "transform": { "x": 20, "y": 8.25, "angle": 0, "scaleX": 1, "scaleY": 1 },
  "behaviors": [
    {
      "type": "spawn_on_event",
      "event": "timer",
      "entityTemplate": "obstacle_box",
      "spawnPosition": "at_self",
      "interval": 2,
      "maxSpawns": 100
    }
  ],
  "tags": ["spawner"]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (tap_to_jump) | Player jump | Runner |
| `move` | World scrolling | Ground, Obstacles, Coins |
| `spawn_on_event` (timer) | Create obstacles | Spawner |
| `destroy_on_collision` | Death, collection | Runner, Coins |
| `score_on_collision` | Coin pickup | Coins |
| `rotate` | Spinning coins | Coins |

---

## Rules

### Win Condition

```json
{
  "winCondition": null
}
```
*Endless runners don't have a win condition - goal is high score.*

### Lose Condition

```json
{
  "loseCondition": {
    "type": "entity_destroyed",
    "tag": "player"
  }
}
```

### Scoring Rules

```json
{
  "rules": [
    {
      "id": "distance_score",
      "trigger": { "type": "timer", "time": 1, "repeat": true },
      "actions": [
        { "type": "score", "operation": "add", "value": 1 }
      ]
    },
    {
      "id": "coin_collect",
      "trigger": { "type": "collision", "entityATag": "player", "entityBTag": "coin" },
      "actions": [
        { "type": "score", "operation": "add", "value": 10 },
        { "type": "sound", "soundId": "coin" }
      ]
    },
    {
      "id": "speed_increase",
      "trigger": { "type": "timer", "time": 10, "repeat": true },
      "actions": [
        { "type": "event", "eventName": "speed_up" }
      ]
    }
  ]
}
```

---

## Customization Guide

### Level 1: Simple (Cosmetic)

| What | Options |
|------|---------|
| Character skin | Human, animal, robot, vehicle |
| Theme | City, jungle, space, candy |
| Obstacle style | Boxes, spikes, barriers |
| Collectible type | Coins, stars, gems |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `jumpForce` | "Jump Power" | 8-18 | 12 |
| `gravity.y` | "Fall Speed" | 8-20 | 15 |
| `scrollSpeed` | "Game Speed" | 5-15 | 8 |
| `obstacleInterval` | "Obstacle Frequency" | 1-4 | 2 |
| `speedRamp` | "Speed Increase" | 0-0.5 | 0.1 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Obstacle patterns | Pre-designed segments |
| Power-ups | Shield, magnet, double jump |
| Terrain variation | Gaps, ramps, moving platforms |
| Difficulty curve | Speed ramp settings |
| Double/triple jump | Allow multiple jumps |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `gravity.y` | 8 | 25 | 15 |
| `jumpForce` | 6 | 20 | 12 |
| `scrollSpeed` | 4 | 20 | 8 |
| `obstacleInterval` | 0.5 | 5 | 2 |
| `speedMultiplier` | 1 | 3 | 1 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Max active obstacles | 20 |
| Max coins on screen | 30 |
| Ground segment width | 10-20m |

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Jungle Dash",
    "description": "Run through the jungle and collect bananas!",
    "template": "endless_runner"
  },
  "settings": {
    "gravity": { "x": 0, "y": 15 },
    "worldWidth": 25,
    "worldHeight": 12,
    "backgroundColor": "#228B22"
  },
  "gameState": {
    "score": 0,
    "scrollSpeed": 8,
    "speedMultiplier": 1
  },
  "templates": {
    "monkey": {
      "sprite": { "type": "rect", "width": 0.8, "height": 1, "color": "#8B4513" },
      "physics": { "bodyType": "dynamic", "shape": "box", "width": 0.8, "height": 1, "density": 1, "fixedRotation": true },
      "behaviors": [
        { "type": "control", "controlType": "tap_to_jump", "force": 12, "cooldown": 0.1 },
        { "type": "destroy_on_collision", "withTags": ["obstacle"], "effect": "fade" }
      ],
      "tags": ["player"]
    },
    "rock": {
      "sprite": { "type": "rect", "width": 1.2, "height": 1.2, "color": "#696969" },
      "physics": { "bodyType": "kinematic", "shape": "box", "width": 1.2, "height": 1.2 },
      "behaviors": [{ "type": "move", "direction": "left", "speed": 8 }],
      "tags": ["obstacle", "hazard"]
    },
    "banana": {
      "sprite": { "type": "circle", "radius": 0.3, "color": "#FFD700" },
      "physics": { "bodyType": "kinematic", "shape": "circle", "radius": 0.3, "isSensor": true },
      "behaviors": [
        { "type": "move", "direction": "left", "speed": 8 },
        { "type": "rotate", "speed": 3, "direction": "clockwise" },
        { "type": "destroy_on_collision", "withTags": ["player"], "effect": "fade" },
        { "type": "score_on_collision", "withTags": ["player"], "points": 10 }
      ],
      "tags": ["collectible"]
    }
  },
  "entities": [
    { "id": "player", "template": "monkey", "transform": { "x": 3, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "ground_1", "sprite": { "type": "rect", "width": 30, "height": 2, "color": "#2d3436" }, "transform": { "x": 15, "y": 11, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 30, "height": 2 }, "tags": ["ground"] },
    { "id": "obstacle_spawner", "transform": { "x": 22, "y": 9.4, "angle": 0, "scaleX": 1, "scaleY": 1 }, "behaviors": [{ "type": "spawn_on_event", "event": "timer", "entityTemplate": "rock", "spawnPosition": "at_self", "interval": 2.5, "maxSpawns": 100 }], "tags": ["spawner"] },
    { "id": "coin_spawner", "transform": { "x": 22, "y": 7, "angle": 0, "scaleX": 1, "scaleY": 1 }, "behaviors": [{ "type": "spawn_on_event", "event": "timer", "entityTemplate": "banana", "spawnPosition": "random_in_bounds", "bounds": { "minX": 22, "maxX": 22, "minY": 5, "maxY": 8 }, "interval": 1.5, "maxSpawns": 200 }], "tags": ["spawner"] }
  ],
  "winCondition": null,
  "loseCondition": { "type": "entity_destroyed", "tag": "player" },
  "rules": [
    { "id": "distance_score", "trigger": { "type": "timer", "time": 1, "repeat": true }, "actions": [{ "type": "score", "operation": "add", "value": 1 }] }
  ]
}
```

---

## AI Generation Tips

1. **Keep it simple**: Single-lane running is most reliable
2. **Jump clearance**: Obstacle height should be clearable with single jump
3. **Spawn timing**: Obstacle interval should allow reaction time
4. **Theme consistency**: Match player, obstacles, and collectibles
5. **No win condition**: This template is always endless

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "running game" | Default endless runner |
| "space theme" | Astronaut, asteroids, stars |
| "easy" | Longer obstacle interval, lower speed |
| "like Flappy Bird" | tap_to_jump with higher gravity |

---

## Variations

### Classic Runner
- Human character
- City obstacles (crates, barriers)
- Coins

### Jungle Dash
- Animal character (monkey, tiger)
- Natural obstacles (rocks, logs)
- Fruit collectibles

### Space Run
- Astronaut/spaceship
- Asteroids, satellites
- Energy orbs

### Candy Rush
- Gummy character
- Candy obstacles
- Sweet collectibles
