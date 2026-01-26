# Template 07: Pinball Lite

*Single-table pinball with flippers and bumpers*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Classic Pinball, Zen Pinball |
| **Tier** | 2 (Template + Tuning) |
| **Target Age** | 8-14 |
| **Session Length** | 2-10 minutes per game |
| **Perspective** | Portrait, slight angle |
| **Primary Verb** | `tap_to_flip` |

**Core Loop:** Ball rolls down table under gravity, player taps to activate flippers, ball hits bumpers for points. Don't let ball drain. Achieve high score or complete missions.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Flippers** | Two motorized paddles | Core mechanic |
| **Gravity** | Ball rolls down | Pinball physics |
| **Bumpers** | Bouncy score targets | Fun factor |
| **Drain** | Ball falls out = lose ball | Stakes |
| **Lives/Balls** | Multiple balls per game | Arcade tradition |
| **Score Focus** | Points are the goal | High score chase |

---

## Entity Templates

### Ball

```json
{
  "id": "pinball",
  "name": "Pinball",
  "sprite": {
    "type": "circle",
    "radius": 0.25,
    "color": "#C0C0C0"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.25,
    "density": 2,
    "friction": 0.1,
    "restitution": 0.6,
    "linearDamping": 0.1
  },
  "tags": ["ball"]
}
```

### Flipper (Left)

```json
{
  "id": "flipper_left",
  "name": "Left Flipper",
  "sprite": {
    "type": "polygon",
    "vertices": [
      { "x": -0.1, "y": 0 },
      { "x": 1.2, "y": -0.1 },
      { "x": 1.2, "y": 0.1 },
      { "x": -0.1, "y": 0.2 }
    ],
    "color": "#e74c3c"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "polygon",
    "vertices": [
      { "x": -0.1, "y": 0 },
      { "x": 1.2, "y": -0.1 },
      { "x": 1.2, "y": 0.1 },
      { "x": -0.1, "y": 0.2 }
    ],
    "density": 1,
    "friction": 0.5,
    "restitution": 0.3
  },
  "behaviors": [
    {
      "type": "control",
      "controlType": "tap_to_flip",
      "side": "left",
      "force": 80
    }
  ],
  "tags": ["flipper", "left"]
}
```

### Flipper (Right)

```json
{
  "id": "flipper_right",
  "name": "Right Flipper",
  "sprite": {
    "type": "polygon",
    "vertices": [
      { "x": 0.1, "y": 0 },
      { "x": -1.2, "y": -0.1 },
      { "x": -1.2, "y": 0.1 },
      { "x": 0.1, "y": 0.2 }
    ],
    "color": "#e74c3c"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "polygon",
    "vertices": [
      { "x": 0.1, "y": 0 },
      { "x": -1.2, "y": -0.1 },
      { "x": -1.2, "y": 0.1 },
      { "x": 0.1, "y": 0.2 }
    ],
    "density": 1,
    "friction": 0.5,
    "restitution": 0.3
  },
  "behaviors": [
    {
      "type": "control",
      "controlType": "tap_to_flip",
      "side": "right",
      "force": 80
    }
  ],
  "tags": ["flipper", "right"]
}
```

### Bumper

```json
{
  "id": "bumper",
  "name": "Bumper",
  "sprite": {
    "type": "circle",
    "radius": 0.5,
    "color": "#9b59b6"
  },
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 0.5,
    "density": 0,
    "friction": 0,
    "restitution": 1.5
  },
  "behaviors": [
    {
      "type": "score_on_collision",
      "withTags": ["ball"],
      "points": 100
    }
  ],
  "tags": ["bumper", "target"]
}
```

### Slingshot

```json
{
  "id": "slingshot",
  "name": "Slingshot",
  "sprite": {
    "type": "polygon",
    "vertices": [
      { "x": 0, "y": 0 },
      { "x": 1, "y": 0.5 },
      { "x": 0, "y": 1 }
    ],
    "color": "#f39c12"
  },
  "physics": {
    "bodyType": "static",
    "shape": "polygon",
    "vertices": [
      { "x": 0, "y": 0 },
      { "x": 1, "y": 0.5 },
      { "x": 0, "y": 1 }
    ],
    "density": 0,
    "friction": 0,
    "restitution": 1.3
  },
  "behaviors": [
    {
      "type": "score_on_collision",
      "withTags": ["ball"],
      "points": 10
    }
  ],
  "tags": ["slingshot"]
}
```

### Score Target

```json
{
  "id": "target",
  "name": "Target",
  "sprite": {
    "type": "rect",
    "width": 0.5,
    "height": 0.2,
    "color": "#2ecc71"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 0.5,
    "height": 0.2,
    "density": 0,
    "friction": 0,
    "restitution": 0.5
  },
  "behaviors": [
    {
      "type": "score_on_collision",
      "withTags": ["ball"],
      "points": 500,
      "once": true
    }
  ],
  "tags": ["target", "mission"]
}
```

### Drain Zone

```json
{
  "id": "drain",
  "name": "Drain",
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 7,
    "height": 0.5,
    "isSensor": true
  },
  "tags": ["drain"]
}
```

### Plunger (Ball Launcher)

```json
{
  "id": "plunger",
  "name": "Plunger",
  "sprite": {
    "type": "rect",
    "width": 0.4,
    "height": 1,
    "color": "#e74c3c"
  },
  "behaviors": [
    {
      "type": "control",
      "controlType": "drag_to_aim",
      "direction": "up",
      "force": 20,
      "maxPullDistance": 2
    },
    {
      "type": "spawn_on_event",
      "event": "release",
      "entityTemplate": "pinball",
      "spawnPosition": "offset",
      "offset": { "x": 0, "y": -0.5 }
    }
  ],
  "tags": ["plunger"]
}
```

---

## Flipper Joint Configuration

```json
{
  "joints": [
    {
      "id": "flipper_left_joint",
      "type": "revolute",
      "bodyA": "table_body",
      "bodyB": "flipper_left",
      "anchor": { "x": 2, "y": 10 },
      "enableLimit": true,
      "lowerAngle": -0.5,
      "upperAngle": 0.5,
      "enableMotor": true,
      "motorSpeed": 0,
      "maxMotorTorque": 100
    },
    {
      "id": "flipper_right_joint",
      "type": "revolute",
      "bodyA": "table_body",
      "bodyB": "flipper_right",
      "anchor": { "x": 5, "y": 10 },
      "enableLimit": true,
      "lowerAngle": -0.5,
      "upperAngle": 0.5,
      "enableMotor": true,
      "motorSpeed": 0,
      "maxMotorTorque": 100
    }
  ]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (tap_to_flip) | Flipper activation | Flippers |
| `control` (drag_to_aim) | Ball launch | Plunger |
| `spawn_on_event` | Launch new ball | Plunger |
| `score_on_collision` | Award points | Bumpers, Targets |

---

## Rules

### Win Condition

```json
{
  "winCondition": {
    "type": "score",
    "score": 10000
  }
}
```

*Alternative: Mission-based (hit all targets), or endless high score.*

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
      "id": "ball_drain",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "drain" },
      "actions": [
        { "type": "destroy", "target": { "type": "by_tag", "tag": "ball" } },
        { "type": "modify", "target": { "type": "game_state" }, "property": "balls", "operation": "subtract", "value": 1 },
        { "type": "sound", "soundId": "drain" }
      ]
    },
    {
      "id": "bumper_hit",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "bumper" },
      "actions": [
        { "type": "sound", "soundId": "bump" },
        { "type": "event", "eventName": "flash_bumper" }
      ]
    },
    {
      "id": "multiball",
      "trigger": { "type": "score", "threshold": 5000, "comparison": "gte" },
      "actions": [
        { "type": "spawn", "template": "pinball", "position": { "type": "fixed", "x": 3.5, "y": 5 }, "count": 2 }
      ],
      "fireOnce": true
    }
  ]
}
```

---

## Customization Guide

### Level 1: Simple (Cosmetic)

| What | Options |
|------|---------|
| Table theme | Classic, Space, Medieval, Underwater |
| Ball appearance | Silver, Gold, Neon |
| Bumper colors | Match theme |
| Sound effects | Theme-appropriate |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `gravity.y` | "Table Tilt" | 5-12 | 8 |
| `flipperForce` | "Flipper Power" | 40-120 | 80 |
| `bumperBounce` | "Bumper Bounciness" | 1-2 | 1.5 |
| `balls` | "Number of Balls" | 1-5 | 3 |
| `bumperPoints` | "Bumper Score" | 50-200 | 100 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Table layout | Bumper/target positions |
| Mission system | Hit targets in order |
| Bonus features | Spinners, ramps, multiball |
| Scoring multipliers | Combo systems |
| Special features | Ball save, extra ball |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `gravity.y` | 4 | 15 | 8 |
| `ballDensity` | 1 | 4 | 2 |
| `flipperTorque` | 30 | 150 | 100 |
| `bumperRestitution` | 1.0 | 2.0 | 1.5 |
| `ballRestitution` | 0.4 | 0.8 | 0.6 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Max bumpers | 6 |
| Max targets | 10 |
| Table width | 7m |
| Table height | 12m |
| Max balls | 5 |

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Space Pinball",
    "description": "Launch pinballs through the galaxy!",
    "template": "pinball_lite"
  },
  "settings": {
    "gravity": { "x": 0, "y": 8 },
    "worldWidth": 7,
    "worldHeight": 12,
    "backgroundColor": "#0a0a2e"
  },
  "gameState": {
    "balls": 3,
    "score": 0
  },
  "templates": {
    "pinball": {
      "sprite": { "type": "circle", "radius": 0.25, "color": "#C0C0C0" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.25, "density": 2, "friction": 0.1, "restitution": 0.6 },
      "tags": ["ball"]
    },
    "bumper": {
      "sprite": { "type": "circle", "radius": 0.5, "color": "#9b59b6" },
      "physics": { "bodyType": "static", "shape": "circle", "radius": 0.5, "restitution": 1.5 },
      "behaviors": [{ "type": "score_on_collision", "withTags": ["ball"], "points": 100 }],
      "tags": ["bumper"]
    }
  },
  "entities": [
    { "id": "wall_left", "sprite": { "type": "rect", "width": 0.2, "height": 12, "color": "#333" }, "transform": { "x": 0.1, "y": 6, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 0.2, "height": 12, "restitution": 0.5 }, "tags": ["wall"] },
    { "id": "wall_right", "sprite": { "type": "rect", "width": 0.2, "height": 12, "color": "#333" }, "transform": { "x": 6.9, "y": 6, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 0.2, "height": 12, "restitution": 0.5 }, "tags": ["wall"] },
    { "id": "bumper_1", "template": "bumper", "transform": { "x": 2, "y": 3, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "bumper_2", "template": "bumper", "transform": { "x": 5, "y": 3, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "bumper_3", "template": "bumper", "transform": { "x": 3.5, "y": 4.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "flipper_left", "sprite": { "type": "rect", "width": 1.2, "height": 0.25, "color": "#e74c3c" }, "transform": { "x": 2.2, "y": 10, "angle": 0.3, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "dynamic", "shape": "box", "width": 1.2, "height": 0.25 }, "behaviors": [{ "type": "control", "controlType": "tap_to_flip", "side": "left", "force": 80 }], "tags": ["flipper"] },
    { "id": "flipper_right", "sprite": { "type": "rect", "width": 1.2, "height": 0.25, "color": "#e74c3c" }, "transform": { "x": 4.8, "y": 10, "angle": -0.3, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "dynamic", "shape": "box", "width": 1.2, "height": 0.25 }, "behaviors": [{ "type": "control", "controlType": "tap_to_flip", "side": "right", "force": 80 }], "tags": ["flipper"] },
    { "id": "drain", "transform": { "x": 3.5, "y": 12, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 7, "height": 0.5, "isSensor": true }, "tags": ["drain"] },
    { "id": "ball_1", "template": "pinball", "transform": { "x": 3.5, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 } }
  ],
  "joints": [
    { "type": "revolute", "bodyA": "wall_left", "bodyB": "flipper_left", "anchor": { "x": 1.6, "y": 10 }, "enableLimit": true, "lowerAngle": -0.4, "upperAngle": 0.4, "maxMotorTorque": 100 },
    { "type": "revolute", "bodyA": "wall_right", "bodyB": "flipper_right", "anchor": { "x": 5.4, "y": 10 }, "enableLimit": true, "lowerAngle": -0.4, "upperAngle": 0.4, "maxMotorTorque": 100 }
  ],
  "winCondition": { "type": "score", "score": 5000 },
  "loseCondition": { "type": "lives_zero" },
  "rules": []
}
```

---

## AI Generation Tips

1. **Table symmetry**: Left and right sides should roughly mirror
2. **Flipper placement**: Near bottom, angled inward
3. **Bumper triangle**: Classic arrangement is 3 bumpers in triangle
4. **Gravity direction**: Always downward (positive Y)
5. **Ball launch**: Right side lane is traditional

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "pinball game" | Classic table layout |
| "space theme" | Planets as bumpers, star background |
| "easy" | More balls, larger drain gaps |
| "lots of bumpers" | 5-6 bumpers spread across table |

---

## Variations

### Classic Arcade
- Silver ball
- Primary colors
- Traditional layout

### Space Pinball
- Planet bumpers
- Star field background
- Rocket flippers

### Medieval Pinball
- Castle theme
- Knight imagery
- Dragon targets

### Underwater Pinball
- Fish bumpers
- Bubble effects
- Coral obstacles
