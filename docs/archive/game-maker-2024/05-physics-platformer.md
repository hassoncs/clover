# Template 05: Physics Platformer

*Mario-lite physics-based jump-and-collect platformer*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Mario, Doodle Jump, platform games |
| **Tier** | 2 (Template + Level Design) |
| **Target Age** | 6-14 |
| **Session Length** | 1-3 minutes per level |
| **Perspective** | Side view |
| **Primary Verb** | `tap_to_jump` + `buttons`/`tilt` |

**Core Loop:** Control character to jump between platforms, avoid hazards, collect items, and reach the goal. Physics adds emergent fun to jumping and collisions.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Jump Mechanic** | Tap/button to jump | Core platformer identity |
| **Gravity** | Constant downward pull | Platforming feel |
| **Ground Contact** | Must be grounded to jump | Skill expression |
| **Goal Destination** | Reach end point or collect all | Clear objective |
| **Death on Hazard** | Enemies/spikes kill player | Stakes |

---

## Entity Templates

### Player

```json
{
  "id": "player",
  "name": "Player",
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
    "fixedRotation": true,
    "linearDamping": 0.5
  },
  "behaviors": [
    {
      "type": "control",
      "controlType": "tap_to_jump",
      "force": 10,
      "cooldown": 0.05
    },
    {
      "type": "control",
      "controlType": "tilt_to_move",
      "force": 8,
      "maxSpeed": 6
    },
    {
      "type": "destroy_on_collision",
      "withTags": ["hazard", "enemy"],
      "effect": "fade"
    }
  ],
  "tags": ["player"]
}
```

### Platform

```json
{
  "id": "platform",
  "name": "Platform",
  "sprite": {
    "type": "rect",
    "width": 3,
    "height": 0.5,
    "color": "#2d3436"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 3,
    "height": 0.5,
    "density": 0,
    "friction": 0.8,
    "restitution": 0
  },
  "tags": ["platform", "solid"]
}
```

### Moving Platform

```json
{
  "id": "moving_platform",
  "name": "Moving Platform",
  "sprite": {
    "type": "rect",
    "width": 2,
    "height": 0.4,
    "color": "#3498db"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "box",
    "width": 2,
    "height": 0.4,
    "density": 0,
    "friction": 0.9,
    "restitution": 0
  },
  "behaviors": [
    {
      "type": "oscillate",
      "axis": "x",
      "amplitude": 3,
      "frequency": 0.5
    }
  ],
  "tags": ["platform", "solid", "moving"]
}
```

### Collectible Coin

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
    "bodyType": "static",
    "shape": "circle",
    "radius": 0.3,
    "isSensor": true
  },
  "behaviors": [
    {
      "type": "rotate",
      "speed": 5,
      "direction": "clockwise"
    },
    {
      "type": "oscillate",
      "axis": "y",
      "amplitude": 0.2,
      "frequency": 2
    },
    {
      "type": "destroy_on_collision",
      "withTags": ["player"],
      "effect": "fade"
    },
    {
      "type": "score_on_collision",
      "withTags": ["player"],
      "points": 10,
      "showPopup": true
    }
  ],
  "tags": ["coin", "collectible"]
}
```

### Enemy

```json
{
  "id": "enemy",
  "name": "Enemy",
  "sprite": {
    "type": "circle",
    "radius": 0.5,
    "color": "#e74c3c"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "circle",
    "radius": 0.5,
    "density": 0,
    "friction": 0
  },
  "behaviors": [
    {
      "type": "move",
      "direction": "left",
      "speed": 2,
      "patrol": { "minX": 0, "maxX": 5 }
    }
  ],
  "tags": ["enemy", "hazard"]
}
```

### Spike Hazard

```json
{
  "id": "spikes",
  "name": "Spikes",
  "sprite": {
    "type": "polygon",
    "vertices": [
      { "x": 0, "y": 0 },
      { "x": 0.3, "y": -0.5 },
      { "x": 0.6, "y": 0 }
    ],
    "color": "#7f8c8d"
  },
  "physics": {
    "bodyType": "static",
    "shape": "polygon",
    "vertices": [
      { "x": 0, "y": 0 },
      { "x": 0.3, "y": -0.5 },
      { "x": 0.6, "y": 0 }
    ],
    "isSensor": true
  },
  "tags": ["hazard", "spikes"]
}
```

### Goal Flag

```json
{
  "id": "goal",
  "name": "Goal Flag",
  "sprite": {
    "type": "rect",
    "width": 0.3,
    "height": 2,
    "color": "#27ae60"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 0.3,
    "height": 2,
    "isSensor": true
  },
  "tags": ["goal"]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (tap_to_jump) | Player jump | Player |
| `control` (tilt_to_move) | Horizontal movement | Player |
| `oscillate` | Moving platforms, bobbing items | Platforms, Coins |
| `move` (patrol) | Enemy movement | Enemies |
| `rotate` | Spinning collectibles | Coins |
| `destroy_on_collision` | Death, collection | Player, Coins |
| `score_on_collision` | Points | Coins |

---

## Rules

### Win Conditions (Choose One)

**Reach Goal:**
```json
{
  "winCondition": {
    "type": "reach_entity",
    "entityId": "goal",
    "triggerTag": "player"
  }
}
```

**Collect All:**
```json
{
  "winCondition": {
    "type": "collect_all",
    "tag": "coin"
  }
}
```

### Lose Conditions

```json
{
  "loseConditions": [
    {
      "type": "entity_destroyed",
      "tag": "player"
    },
    {
      "type": "entity_exits_screen",
      "tag": "player"
    },
    {
      "type": "time_up",
      "time": 60
    }
  ]
}
```

### Scoring Rules

```json
{
  "rules": [
    {
      "id": "coin_collect",
      "trigger": { "type": "collision", "entityATag": "player", "entityBTag": "coin" },
      "actions": [
        { "type": "score", "operation": "add", "value": 10 },
        { "type": "sound", "soundId": "coin" }
      ]
    },
    {
      "id": "enemy_stomp",
      "trigger": { "type": "collision", "entityATag": "player", "entityBTag": "enemy" },
      "conditions": [
        { "type": "velocity_direction", "entity": "player", "direction": "down" }
      ],
      "actions": [
        { "type": "score", "operation": "add", "value": 50 },
        { "type": "destroy", "target": { "type": "collision_entities" } },
        { "type": "sound", "soundId": "stomp" }
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
| Character skin | Human, animal, robot |
| Platform style | Grass, stone, metal, cloud |
| Collectible type | Coins, stars, gems |
| Background | Sky, cave, space, underwater |
| Enemy appearance | Slimes, bats, robots |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `jumpForce` | "Jump Power" | 6-15 | 10 |
| `moveSpeed` | "Run Speed" | 4-10 | 6 |
| `gravity.y` | "Gravity" | 8-20 | 12 |
| `enemySpeed` | "Enemy Speed" | 1-5 | 2 |
| `timeLimit` | "Time Limit" | 30-120 | 60 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Level layout | Platform placement, gaps |
| Enemy placement | Position and patrol paths |
| Collectible positions | Strategic coin placement |
| Moving platforms | Oscillation patterns |
| Win type | Reach goal vs collect all vs survive |
| Power-ups | Double jump, speed boost, invincibility |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `gravity.y` | 6 | 25 | 12 |
| `jumpForce` | 5 | 18 | 10 |
| `moveSpeed` | 3 | 12 | 6 |
| `platformFriction` | 0.5 | 1.0 | 0.8 |
| `linearDamping` | 0 | 2 | 0.5 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Max platforms | 50 |
| Max enemies | 20 |
| Max collectibles | 100 |
| Level width | 50m |
| Level height | 20m |

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Sky Jump Adventure",
    "description": "Jump through the clouds and collect stars!",
    "template": "physics_platformer"
  },
  "settings": {
    "gravity": { "x": 0, "y": 12 },
    "worldWidth": 25,
    "worldHeight": 15,
    "backgroundColor": "#87CEEB"
  },
  "templates": {
    "hero": {
      "sprite": { "type": "rect", "width": 0.7, "height": 1, "color": "#4ECDC4" },
      "physics": { "bodyType": "dynamic", "shape": "box", "width": 0.7, "height": 1, "density": 1, "friction": 0.3, "fixedRotation": true, "linearDamping": 0.5 },
      "behaviors": [
        { "type": "control", "controlType": "tap_to_jump", "force": 10, "cooldown": 0.05 },
        { "type": "control", "controlType": "tilt_to_move", "force": 7, "maxSpeed": 5 },
        { "type": "destroy_on_collision", "withTags": ["hazard"], "effect": "fade" }
      ],
      "tags": ["player"]
    },
    "cloud_platform": {
      "sprite": { "type": "rect", "width": 2.5, "height": 0.5, "color": "#FFFFFF" },
      "physics": { "bodyType": "static", "shape": "box", "width": 2.5, "height": 0.5, "friction": 0.9 },
      "tags": ["platform", "solid"]
    },
    "star": {
      "sprite": { "type": "circle", "radius": 0.3, "color": "#FFD700" },
      "physics": { "bodyType": "static", "shape": "circle", "radius": 0.3, "isSensor": true },
      "behaviors": [
        { "type": "rotate", "speed": 4, "direction": "clockwise" },
        { "type": "destroy_on_collision", "withTags": ["player"], "effect": "fade" },
        { "type": "score_on_collision", "withTags": ["player"], "points": 10 }
      ],
      "tags": ["collectible", "star"]
    },
    "bird_enemy": {
      "sprite": { "type": "circle", "radius": 0.4, "color": "#e74c3c" },
      "physics": { "bodyType": "kinematic", "shape": "circle", "radius": 0.4 },
      "behaviors": [{ "type": "move", "direction": "left", "speed": 2, "patrol": { "minX": -3, "maxX": 3 } }],
      "tags": ["enemy", "hazard"]
    }
  },
  "entities": [
    { "id": "player", "template": "hero", "transform": { "x": 2, "y": 10, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "ground", "template": "cloud_platform", "transform": { "x": 3, "y": 12, "angle": 0, "scaleX": 2, "scaleY": 1 } },
    { "id": "plat_1", "template": "cloud_platform", "transform": { "x": 6, "y": 10, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "plat_2", "template": "cloud_platform", "transform": { "x": 10, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "plat_3", "template": "cloud_platform", "transform": { "x": 14, "y": 9, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "plat_4", "template": "cloud_platform", "transform": { "x": 18, "y": 7, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "plat_5", "template": "cloud_platform", "transform": { "x": 22, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "star_1", "template": "star", "transform": { "x": 6, "y": 9, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "star_2", "template": "star", "transform": { "x": 10, "y": 7, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "star_3", "template": "star", "transform": { "x": 14, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "star_4", "template": "star", "transform": { "x": 18, "y": 6, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "star_5", "template": "star", "transform": { "x": 22, "y": 7, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "enemy_1", "template": "bird_enemy", "transform": { "x": 12, "y": 6, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "goal", "sprite": { "type": "rect", "width": 0.5, "height": 2, "color": "#27ae60" }, "transform": { "x": 23, "y": 6.5, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 0.5, "height": 2, "isSensor": true }, "tags": ["goal"] }
  ],
  "winCondition": { "type": "reach_entity", "entityId": "goal", "triggerTag": "player" },
  "loseCondition": { "type": "entity_destroyed", "tag": "player" },
  "rules": []
}
```

---

## AI Generation Tips

1. **Platform spacing**: Ensure jumps are achievable with default physics
2. **Clear progression**: Left-to-right or bottom-to-top flow
3. **Coin breadcrumbs**: Place coins to guide player path
4. **Enemy placement**: Don't place enemies on narrow platforms
5. **Safe start**: Give player room to orient at spawn

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "Mario game" | Classic platformer with coins and enemies |
| "cloud jumping" | Vertical platforms, sky theme |
| "collect stars" | Win = collect all, no goal flag |
| "easy" | Wide platforms, few enemies |

---

## Variations

### Classic Platformer
- Ground and platforms
- Coins and enemies
- Reach the flag

### Vertical Climber
- Platforms going up
- Doodle Jump style
- Endless or reach top

### Cave Explorer
- Dark theme
- Spike hazards
- Collect gems

### Underwater
- Floaty physics (high damping)
- Bubble collectibles
- Fish enemies
