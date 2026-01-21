# Template 08: Bumper Arena

*Top-down sumo-style knockout physics game*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Sumo wrestling, bumper cars, fall guys |
| **Tier** | 1 (Fully AI-Generatable) |
| **Target Age** | 6-14 |
| **Session Length** | 30 seconds - 2 minutes per round |
| **Perspective** | Top-down |
| **Primary Verb** | `tilt_to_move` or `drag_to_move` |

**Core Loop:** Control your character in a top-down arena, bump opponents to knock them off the edge. Last one standing wins. Simple physics, fun chaos.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Arena** | Bounded area with edges | Knockout mechanic |
| **Bumping** | Collision = knockback | Core interaction |
| **Elimination** | Fall off = out | Win condition |
| **Top-Down** | No gravity affecting gameplay | Arena visibility |
| **Multiple Opponents** | At least 2 players/AI | Competition |

---

## Entity Templates

### Player

```json
{
  "id": "player",
  "name": "Player",
  "sprite": {
    "type": "circle",
    "radius": 0.5,
    "color": "#4ECDC4"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.5,
    "density": 1,
    "friction": 0.3,
    "restitution": 0.8,
    "linearDamping": 2
  },
  "behaviors": [
    {
      "type": "control",
      "controlType": "tilt_to_move",
      "force": 15,
      "maxSpeed": 8
    }
  ],
  "tags": ["player", "bumper"]
}
```

### Enemy AI

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
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.5,
    "density": 1,
    "friction": 0.3,
    "restitution": 0.8,
    "linearDamping": 2
  },
  "behaviors": [
    {
      "type": "move",
      "direction": "toward_target",
      "target": "player",
      "speed": 4,
      "movementType": "force"
    }
  ],
  "tags": ["enemy", "bumper", "ai"]
}
```

### Arena Platform

```json
{
  "id": "arena",
  "name": "Arena Platform",
  "sprite": {
    "type": "circle",
    "radius": 6,
    "color": "#2d3436"
  },
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 6,
    "density": 0,
    "friction": 0.5,
    "restitution": 0
  },
  "tags": ["arena", "platform"]
}
```

### Arena Edge (Death Zone)

```json
{
  "id": "death_zone",
  "name": "Death Zone",
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 8,
    "isSensor": true
  },
  "tags": ["death_zone", "elimination"]
}
```

### Power-Up: Speed Boost

```json
{
  "id": "powerup_speed",
  "name": "Speed Boost",
  "sprite": {
    "type": "circle",
    "radius": 0.3,
    "color": "#f1c40f"
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
      "speed": 3,
      "direction": "clockwise"
    },
    {
      "type": "destroy_on_collision",
      "withTags": ["bumper"],
      "effect": "fade"
    }
  ],
  "tags": ["powerup", "speed"]
}
```

### Obstacle: Spinner

```json
{
  "id": "spinner",
  "name": "Spinning Hazard",
  "sprite": {
    "type": "rect",
    "width": 3,
    "height": 0.4,
    "color": "#9b59b6"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "box",
    "width": 3,
    "height": 0.4,
    "density": 0,
    "friction": 0,
    "restitution": 1.2
  },
  "behaviors": [
    {
      "type": "rotate",
      "speed": 2,
      "direction": "clockwise",
      "affectsPhysics": true
    }
  ],
  "tags": ["obstacle", "spinner"]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (tilt_to_move) | Player movement | Player |
| `control` (drag_to_move) | Alternative control | Player |
| `move` (toward_target) | AI chase behavior | Enemies |
| `rotate` | Spinning obstacles | Spinners |
| `destroy_on_collision` | Collect power-ups | Power-ups |

---

## Rules

### Win Condition

```json
{
  "winCondition": {
    "type": "entity_count",
    "tag": "enemy",
    "count": 0,
    "comparison": "zero"
  }
}
```

### Lose Condition

```json
{
  "loseCondition": {
    "type": "entity_destroyed",
    "tag": "player"
  }
}
```

### Game Rules

```json
{
  "rules": [
    {
      "id": "player_elimination",
      "trigger": { "type": "frame" },
      "conditions": [
        { "type": "entity_position", "entityId": "player", "outsideRadius": 6.5 }
      ],
      "actions": [
        { "type": "game_state", "state": "lose" }
      ]
    },
    {
      "id": "enemy_elimination",
      "trigger": { "type": "frame" },
      "conditions": [
        { "type": "entity_position", "tag": "enemy", "outsideRadius": 6.5 }
      ],
      "actions": [
        { "type": "destroy", "target": { "type": "outside_arena" } },
        { "type": "score", "operation": "add", "value": 100 }
      ]
    },
    {
      "id": "bump_score",
      "trigger": { "type": "collision", "entityATag": "player", "entityBTag": "enemy" },
      "actions": [
        { "type": "score", "operation": "add", "value": 10 },
        { "type": "sound", "soundId": "bump" }
      ]
    },
    {
      "id": "speed_powerup",
      "trigger": { "type": "collision", "entityATag": "player", "entityBTag": "speed" },
      "actions": [
        { "type": "modify", "target": { "type": "by_id", "entityId": "player" }, "property": "behaviors.0.maxSpeed", "operation": "multiply", "value": 1.5 },
        { "type": "timer", "duration": 5, "action": "reset_speed" }
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
| Player character | Ball, robot, animal, emoji |
| Arena style | Wood, ice, space platform |
| Enemy appearance | Different colors/shapes |
| Power-up style | Stars, lightning bolts |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `playerForce` | "Push Power" | 10-25 | 15 |
| `maxSpeed` | "Top Speed" | 5-12 | 8 |
| `restitution` | "Bounciness" | 0.5-1.2 | 0.8 |
| `enemyCount` | "Enemies" | 1-6 | 3 |
| `enemySpeed` | "Enemy Speed" | 2-8 | 4 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Arena shape | Circle, square, hexagon |
| Obstacles | Spinners, bumpers, shrinking arena |
| Power-ups | Speed, size, shield |
| Enemy AI | Chase, patrol, aggressive |
| Match mode | Single round, best of 3, survival |
| Hazards | Moving walls, lava zones |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `playerForce` | 8 | 30 | 15 |
| `maxSpeed` | 4 | 15 | 8 |
| `restitution` | 0.3 | 1.5 | 0.8 |
| `linearDamping` | 0.5 | 4 | 2 |
| `density` | 0.5 | 3 | 1 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Max enemies | 8 |
| Arena radius | 4-10m |
| Max obstacles | 5 |
| Max power-ups | 5 |

---

## Arena Layouts

### Classic Circle
```
      ______
    /        \
   |    o     |   <- Center obstacle (optional)
   |  P   E   |   <- Player and enemies
    \________/
```

### Square Arena
```
 _____________
|             |
|   P     E   |
|      o      |
|   E     E   |
|_____________|
```

### Shrinking Circle
- Arena edge moves inward over time
- Forces more confrontation
- Timer-based shrinking

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Robot Rumble",
    "description": "Bump the enemy robots off the platform!",
    "template": "bumper_arena"
  },
  "settings": {
    "gravity": { "x": 0, "y": 0 },
    "worldWidth": 14,
    "worldHeight": 14,
    "backgroundColor": "#1a1a2e"
  },
  "gameState": {
    "score": 0,
    "round": 1
  },
  "templates": {
    "player_bot": {
      "sprite": { "type": "circle", "radius": 0.5, "color": "#4ECDC4" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.5, "density": 1, "friction": 0.3, "restitution": 0.8, "linearDamping": 2 },
      "behaviors": [{ "type": "control", "controlType": "tilt_to_move", "force": 15, "maxSpeed": 8 }],
      "tags": ["player", "bumper"]
    },
    "enemy_bot": {
      "sprite": { "type": "circle", "radius": 0.5, "color": "#e74c3c" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.5, "density": 1, "friction": 0.3, "restitution": 0.8, "linearDamping": 2 },
      "behaviors": [{ "type": "move", "direction": "toward_target", "target": "player", "speed": 4, "movementType": "force" }],
      "tags": ["enemy", "bumper", "ai"]
    }
  },
  "entities": [
    { "id": "arena", "sprite": { "type": "circle", "radius": 5, "color": "#2d3436" }, "transform": { "x": 7, "y": 7, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "circle", "radius": 5 }, "tags": ["arena"] },
    { "id": "player", "template": "player_bot", "transform": { "x": 7, "y": 9, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "enemy_1", "template": "enemy_bot", "transform": { "x": 5, "y": 5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "enemy_2", "template": "enemy_bot", "transform": { "x": 9, "y": 5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "enemy_3", "template": "enemy_bot", "transform": { "x": 7, "y": 4, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "spinner", "sprite": { "type": "rect", "width": 2.5, "height": 0.3, "color": "#9b59b6" }, "transform": { "x": 7, "y": 7, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "kinematic", "shape": "box", "width": 2.5, "height": 0.3, "restitution": 1.2 }, "behaviors": [{ "type": "rotate", "speed": 2, "direction": "clockwise", "affectsPhysics": true }], "tags": ["obstacle"] }
  ],
  "winCondition": { "type": "entity_count", "tag": "enemy", "count": 0, "comparison": "zero" },
  "loseCondition": { "type": "entity_destroyed", "tag": "player" },
  "rules": []
}
```

---

## AI Generation Tips

1. **Top-down physics**: Set gravity to (0, 0)
2. **Arena bounds**: Player/enemies should start inside arena
3. **Balanced enemies**: Don't cluster all enemies together
4. **Center obstacle optional**: Adds variety
5. **Linear damping**: Use damping (2-3) for controllable sliding

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "sumo game" | Circle arena, bump mechanics |
| "robot battle" | Robot theme, metallic colors |
| "easy" | Fewer enemies, slower AI |
| "with obstacles" | Add spinners or bumpers |

---

## Variations

### Classic Sumo
- Simple circle arena
- No obstacles
- Pure bumping

### Robot Rumble
- Metal aesthetic
- Tech sounds
- LED-style colors

### Food Fight
- Food characters (donut vs pizza)
- Kitchen arena
- Silly sound effects

### Ice Arena
- Slippery (low friction)
- Hockey aesthetic
- Sliding mechanics
