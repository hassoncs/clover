# Template 06: Breakout Bouncer

*Arkanoid-style brick-breaking paddle game*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Breakout, Arkanoid, Brick Breaker |
| **Tier** | 1 (Fully AI-Generatable) |
| **Target Age** | 6-14 |
| **Session Length** | 2-5 minutes per level |
| **Perspective** | Portrait, single screen |
| **Primary Verb** | `drag_to_move` |

**Core Loop:** Ball bounces around screen, player moves paddle to keep ball in play, ball breaks bricks on contact. Clear all bricks to win, miss the ball to lose a life.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Ball Physics** | Bouncing, constant speed | Core mechanic |
| **Paddle Control** | Horizontal movement only | Simple control |
| **Brick Destruction** | Ball destroys bricks | Primary action |
| **Ball Loss** | Ball falls past paddle | Fail state |
| **Limited Lives** | 3 balls typically | Stakes |

---

## Entity Templates

### Ball

```json
{
  "id": "ball",
  "name": "Ball",
  "sprite": {
    "type": "circle",
    "radius": 0.25,
    "color": "#FFFFFF"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.25,
    "density": 1,
    "friction": 0,
    "restitution": 1,
    "linearDamping": 0,
    "bullet": true
  },
  "behaviors": [],
  "tags": ["ball"]
}
```

### Paddle

```json
{
  "id": "paddle",
  "name": "Paddle",
  "sprite": {
    "type": "rect",
    "width": 2,
    "height": 0.4,
    "color": "#4ECDC4"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "box",
    "width": 2,
    "height": 0.4,
    "density": 0,
    "friction": 0,
    "restitution": 1
  },
  "behaviors": [
    {
      "type": "control",
      "controlType": "drag_to_move",
      "axis": "x",
      "bounds": { "minX": 1, "maxX": 6 }
    }
  ],
  "tags": ["paddle"]
}
```

### Brick (Standard)

```json
{
  "id": "brick",
  "name": "Brick",
  "sprite": {
    "type": "rect",
    "width": 1,
    "height": 0.5,
    "color": "#e74c3c"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 1,
    "height": 0.5,
    "density": 0,
    "friction": 0,
    "restitution": 1
  },
  "behaviors": [
    {
      "type": "destroy_on_collision",
      "withTags": ["ball"],
      "effect": "explode"
    },
    {
      "type": "score_on_collision",
      "withTags": ["ball"],
      "points": 10
    }
  ],
  "tags": ["brick", "destructible"]
}
```

### Tough Brick (2 hits)

```json
{
  "id": "brick_tough",
  "name": "Tough Brick",
  "sprite": {
    "type": "rect",
    "width": 1,
    "height": 0.5,
    "color": "#9b59b6"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 1,
    "height": 0.5,
    "density": 0,
    "restitution": 1
  },
  "state": {
    "hits": 2
  },
  "behaviors": [
    {
      "type": "score_on_collision",
      "withTags": ["ball"],
      "points": 20
    }
  ],
  "tags": ["brick", "destructible", "tough"]
}
```

### Wall

```json
{
  "id": "wall",
  "name": "Wall",
  "sprite": {
    "type": "rect",
    "width": 0.3,
    "height": 15,
    "color": "#34495e"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 0.3,
    "height": 15,
    "density": 0,
    "friction": 0,
    "restitution": 1
  },
  "tags": ["wall", "solid"]
}
```

### Death Zone

```json
{
  "id": "death_zone",
  "name": "Death Zone",
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 10,
    "height": 0.5,
    "isSensor": true
  },
  "tags": ["death_zone"]
}
```

### Power-Up

```json
{
  "id": "powerup_wide",
  "name": "Wide Paddle Power-up",
  "sprite": {
    "type": "rect",
    "width": 0.5,
    "height": 0.5,
    "color": "#2ecc71"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "box",
    "width": 0.5,
    "height": 0.5,
    "density": 0.5,
    "isSensor": true
  },
  "behaviors": [
    {
      "type": "destroy_on_collision",
      "withTags": ["paddle"],
      "effect": "fade"
    }
  ],
  "tags": ["powerup", "wide_paddle"]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (drag_to_move) | Paddle movement | Paddle |
| `destroy_on_collision` | Break bricks, collect power-ups | Bricks, Power-ups |
| `score_on_collision` | Award points | Bricks |
| `spawn_on_event` | Drop power-ups | Bricks (special) |

---

## Rules

### Win Condition

```json
{
  "winCondition": {
    "type": "destroy_all",
    "tag": "destructible"
  }
}
```

### Lose Condition

```json
{
  "loseCondition": {
    "type": "lives_zero"
  }
}
```

### Game Rules

```json
{
  "rules": [
    {
      "id": "ball_lost",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "death_zone" },
      "actions": [
        { "type": "destroy", "target": { "type": "by_tag", "tag": "ball" } },
        { "type": "modify", "target": { "type": "game_state" }, "property": "lives", "operation": "subtract", "value": 1 },
        { "type": "sound", "soundId": "lose_life" },
        { "type": "event", "eventName": "spawn_ball", "delay": 1 }
      ]
    },
    {
      "id": "brick_destroyed",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "brick" },
      "actions": [
        { "type": "sound", "soundId": "brick_break" }
      ]
    },
    {
      "id": "powerup_spawn",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "brick" },
      "conditions": [{ "type": "random", "probability": 0.1 }],
      "actions": [
        { "type": "spawn", "template": "powerup_wide", "position": { "type": "at_collision" } }
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
| Ball appearance | Circle, star, emoji |
| Paddle style | Colors, patterns |
| Brick colors | Rainbow, theme-based |
| Background | Space, neon, underwater |
| Sound theme | Classic, 8-bit, nature |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `ballSpeed` | "Ball Speed" | 5-15 | 8 |
| `paddleWidth` | "Paddle Size" | 1.5-3 | 2 |
| `lives` | "Lives" | 1-5 | 3 |
| `brickRows` | "Brick Rows" | 3-8 | 5 |
| `powerupChance` | "Power-up Frequency" | 0-0.3 | 0.1 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Brick patterns | Design brick layouts |
| Brick types | Mix standard, tough, unbreakable |
| Power-up types | Wide paddle, multi-ball, slow |
| Ball behavior | Fire ball (destroys on touch) |
| Moving bricks | Rows that shift |
| Boss brick | Large brick with health bar |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `ballSpeed` | 4 | 18 | 8 |
| `ballRestitution` | 0.95 | 1.05 | 1 |
| `paddleWidth` | 1 | 4 | 2 |
| `paddleRestitution` | 0.9 | 1.1 | 1 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Max bricks | 100 |
| Brick rows | 1-10 |
| Brick columns | 5-12 |
| Max balls | 5 |
| Lives | 1-9 |

---

## Brick Patterns

### Standard Grid
```
# # # # # # #
# # # # # # #
# # # # # # #
```

### Pyramid
```
      #
     # #
    # # #
   # # # #
  # # # # #
```

### Heart
```
  # #   # #
# # # # # # #
# # # # # # #
  # # # # #
    # # #
      #
```

### Wave
```
#     #     #
# #   # #   #
# # # # # # #
```

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Neon Breaker",
    "description": "Break all the neon bricks!",
    "template": "breakout_bouncer"
  },
  "settings": {
    "gravity": { "x": 0, "y": 0 },
    "worldWidth": 7,
    "worldHeight": 12,
    "backgroundColor": "#0a0a2e"
  },
  "gameState": {
    "lives": 3,
    "score": 0
  },
  "templates": {
    "ball": {
      "sprite": { "type": "circle", "radius": 0.2, "color": "#FFFFFF" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.2, "density": 1, "friction": 0, "restitution": 1, "linearDamping": 0, "bullet": true },
      "tags": ["ball"]
    },
    "paddle": {
      "sprite": { "type": "rect", "width": 1.8, "height": 0.3, "color": "#00FFFF" },
      "physics": { "bodyType": "kinematic", "shape": "box", "width": 1.8, "height": 0.3, "restitution": 1 },
      "behaviors": [{ "type": "control", "controlType": "drag_to_move", "axis": "x", "bounds": { "minX": 1, "maxX": 6 } }],
      "tags": ["paddle"]
    },
    "brick_red": {
      "sprite": { "type": "rect", "width": 0.9, "height": 0.4, "color": "#FF0066" },
      "physics": { "bodyType": "static", "shape": "box", "width": 0.9, "height": 0.4, "restitution": 1 },
      "behaviors": [
        { "type": "destroy_on_collision", "withTags": ["ball"], "effect": "explode" },
        { "type": "score_on_collision", "withTags": ["ball"], "points": 10 }
      ],
      "tags": ["brick", "destructible"]
    },
    "brick_blue": {
      "sprite": { "type": "rect", "width": 0.9, "height": 0.4, "color": "#00FFFF" },
      "physics": { "bodyType": "static", "shape": "box", "width": 0.9, "height": 0.4, "restitution": 1 },
      "behaviors": [
        { "type": "destroy_on_collision", "withTags": ["ball"], "effect": "explode" },
        { "type": "score_on_collision", "withTags": ["ball"], "points": 10 }
      ],
      "tags": ["brick", "destructible"]
    },
    "brick_green": {
      "sprite": { "type": "rect", "width": 0.9, "height": 0.4, "color": "#00FF66" },
      "physics": { "bodyType": "static", "shape": "box", "width": 0.9, "height": 0.4, "restitution": 1 },
      "behaviors": [
        { "type": "destroy_on_collision", "withTags": ["ball"], "effect": "explode" },
        { "type": "score_on_collision", "withTags": ["ball"], "points": 10 }
      ],
      "tags": ["brick", "destructible"]
    }
  },
  "entities": [
    { "id": "ball", "template": "ball", "transform": { "x": 3.5, "y": 9, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "initialVelocity": { "x": 4, "y": -6 } } },
    { "id": "paddle", "template": "paddle", "transform": { "x": 3.5, "y": 10.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "wall_left", "sprite": { "type": "rect", "width": 0.2, "height": 12, "color": "#333" }, "transform": { "x": 0.1, "y": 6, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 0.2, "height": 12, "restitution": 1 }, "tags": ["wall"] },
    { "id": "wall_right", "sprite": { "type": "rect", "width": 0.2, "height": 12, "color": "#333" }, "transform": { "x": 6.9, "y": 6, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 0.2, "height": 12, "restitution": 1 }, "tags": ["wall"] },
    { "id": "wall_top", "sprite": { "type": "rect", "width": 7, "height": 0.2, "color": "#333" }, "transform": { "x": 3.5, "y": 0.1, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 7, "height": 0.2, "restitution": 1 }, "tags": ["wall"] },
    { "id": "death_zone", "transform": { "x": 3.5, "y": 12.5, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 7, "height": 0.5, "isSensor": true }, "tags": ["death_zone"] },
    { "id": "brick_1_1", "template": "brick_red", "transform": { "x": 1, "y": 1.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_1_2", "template": "brick_red", "transform": { "x": 2, "y": 1.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_1_3", "template": "brick_red", "transform": { "x": 3, "y": 1.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_1_4", "template": "brick_red", "transform": { "x": 4, "y": 1.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_1_5", "template": "brick_red", "transform": { "x": 5, "y": 1.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_1_6", "template": "brick_red", "transform": { "x": 6, "y": 1.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_2_1", "template": "brick_blue", "transform": { "x": 1, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_2_2", "template": "brick_blue", "transform": { "x": 2, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_2_3", "template": "brick_blue", "transform": { "x": 3, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_2_4", "template": "brick_blue", "transform": { "x": 4, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_2_5", "template": "brick_blue", "transform": { "x": 5, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_2_6", "template": "brick_blue", "transform": { "x": 6, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_3_1", "template": "brick_green", "transform": { "x": 1, "y": 2.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_3_2", "template": "brick_green", "transform": { "x": 2, "y": 2.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_3_3", "template": "brick_green", "transform": { "x": 3, "y": 2.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_3_4", "template": "brick_green", "transform": { "x": 4, "y": 2.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_3_5", "template": "brick_green", "transform": { "x": 5, "y": 2.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "brick_3_6", "template": "brick_green", "transform": { "x": 6, "y": 2.5, "angle": 0, "scaleX": 1, "scaleY": 1 } }
  ],
  "winCondition": { "type": "destroy_all", "tag": "destructible" },
  "loseCondition": { "type": "lives_zero" },
  "rules": []
}
```

---

## AI Generation Tips

1. **No gravity**: Set gravity to (0, 0) for classic breakout feel
2. **Ball speed**: Initial velocity ~8-10 units diagonal
3. **Restitution = 1**: Perfect bounce for ball, paddle, walls
4. **Death zone**: Place sensor below paddle
5. **Brick grid**: Align bricks in rows for visual appeal

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "breakout game" | Classic brick breaker |
| "neon theme" | Dark background, bright colors |
| "easy" | More lives, wider paddle |
| "lots of power-ups" | Higher spawn chance |

---

## Variations

### Classic Breakout
- Primary colors
- Simple grid pattern
- 3 lives

### Neon Breaker
- Dark background
- Glowing bricks
- Particle effects

### Space Bricks
- Asteroid aesthetic
- Space background
- Alien sounds

### Candy Crush
- Candy-themed bricks
- Sweet power-ups
- Cheerful music
