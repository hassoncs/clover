# Template 09: Physics Stacker

*Tower building and balance stacking game*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Stack, Tower Building, Jenga |
| **Tier** | 1 (Fully AI-Generatable) |
| **Target Age** | 6-14 |
| **Session Length** | 1-5 minutes |
| **Perspective** | Portrait, side view |
| **Primary Verb** | `tap_to_drop` |

**Core Loop:** Objects drop or slide in from above/side, player taps to release at right moment, stack as high as possible without toppling. Score by height or number of successful placements.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Stacking** | Objects pile on top | Core mechanic |
| **Balance** | Tower can topple | Tension/skill |
| **Timing** | Drop at right moment | Player agency |
| **Gravity** | Objects fall down | Physics fun |
| **Height Goal** | Taller = better | Clear objective |

---

## Entity Templates

### Droppable Block

```json
{
  "id": "block",
  "name": "Block",
  "sprite": {
    "type": "rect",
    "width": 1.2,
    "height": 0.6,
    "color": "#e74c3c"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "box",
    "width": 1.2,
    "height": 0.6,
    "density": 1,
    "friction": 0.8,
    "restitution": 0.1
  },
  "tags": ["block", "stackable"]
}
```

### Moving Block (Pre-Drop)

```json
{
  "id": "moving_block",
  "name": "Moving Block",
  "sprite": {
    "type": "rect",
    "width": 1.2,
    "height": 0.6,
    "color": "#3498db"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "box",
    "width": 1.2,
    "height": 0.6
  },
  "behaviors": [
    {
      "type": "oscillate",
      "axis": "x",
      "amplitude": 2,
      "frequency": 1
    }
  ],
  "tags": ["pending_block"]
}
```

### Foundation

```json
{
  "id": "foundation",
  "name": "Foundation",
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
    "friction": 0.9,
    "restitution": 0
  },
  "tags": ["foundation", "solid"]
}
```

### Fall Zone (Death)

```json
{
  "id": "fall_zone",
  "name": "Fall Zone",
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 10,
    "height": 0.5,
    "isSensor": true
  },
  "tags": ["fall_zone"]
}
```

### Height Marker

```json
{
  "id": "height_marker",
  "name": "Height Marker",
  "sprite": {
    "type": "rect",
    "width": 0.1,
    "height": 15,
    "color": "#ffffff",
    "opacity": 0.3
  },
  "tags": ["ui", "marker"]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `oscillate` | Moving block before drop | Pending Block |
| `control` (tap_to_drop) | Release block | Global |
| `spawn_on_event` | Create next block | Game Manager |
| `destroy_on_collision` | Detect fallen blocks | Fall Zone |

---

## Rules

### Win Condition

```json
{
  "winCondition": {
    "type": "score",
    "score": 10
  }
}
```

*Alternative: Reach height threshold, or endless high score.*

### Lose Condition

```json
{
  "loseCondition": {
    "type": "custom",
    "rule": {
      "id": "tower_collapsed",
      "trigger": { "type": "collision", "entityATag": "stackable", "entityBTag": "fall_zone" },
      "actions": [
        { "type": "game_state", "state": "lose", "delay": 1 }
      ]
    }
  }
}
```

### Scoring Rules

```json
{
  "rules": [
    {
      "id": "block_placed",
      "trigger": { "type": "event", "eventName": "block_settled" },
      "actions": [
        { "type": "score", "operation": "add", "value": 1 },
        { "type": "sound", "soundId": "place" }
      ]
    },
    {
      "id": "perfect_stack",
      "trigger": { "type": "event", "eventName": "block_settled" },
      "conditions": [
        { "type": "alignment", "tolerance": 0.1 }
      ],
      "actions": [
        { "type": "score", "operation": "add", "value": 2 },
        { "type": "sound", "soundId": "perfect" }
      ]
    },
    {
      "id": "speed_up",
      "trigger": { "type": "score", "threshold": 5, "comparison": "gte" },
      "actions": [
        { "type": "modify", "property": "oscillateFrequency", "operation": "multiply", "value": 1.2 }
      ]
    }
  ]
}
```

---

## Game Flow

```
1. Block appears at top, moving side-to-side
   ┌─────────────────┐
   │    [===]→       │
   │                 │
   │                 │
   │    ▄▄▄▄▄        │  <- Foundation
   └─────────────────┘

2. Player taps to drop
   ┌─────────────────┐
   │                 │
   │      ↓          │
   │    [===]        │
   │    ▄▄▄▄▄        │
   └─────────────────┘

3. Block lands, next block appears
   ┌─────────────────┐
   │   [===]→        │
   │                 │
   │    [===]        │
   │    ▄▄▄▄▄        │
   └─────────────────┘

4. Repeat until tower falls
```

---

## Customization Guide

### Level 1: Simple (Cosmetic)

| What | Options |
|------|---------|
| Block appearance | Boxes, cakes, books, clouds |
| Foundation style | Ground, table, platform |
| Background | Sky, room, space |
| Theme | Construction, bakery, library |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `blockWidth` | "Block Size" | 0.8-2 | 1.2 |
| `oscillateSpeed` | "Move Speed" | 0.5-2 | 1 |
| `oscillateAmplitude` | "Move Distance" | 1-4 | 2 |
| `gravity.y` | "Fall Speed" | 5-15 | 9.8 |
| `friction` | "Grip" | 0.5-1 | 0.8 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Block shapes | Mix rectangles, circles, triangles |
| Block sizes | Varying widths |
| Challenges | Wind zones (gravity_zone), time limits |
| Bonus blocks | Special scoring blocks |
| Game mode | Height goal vs endless vs timed |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `gravity.y` | 5 | 20 | 9.8 |
| `blockDensity` | 0.5 | 3 | 1 |
| `friction` | 0.4 | 1 | 0.8 |
| `restitution` | 0 | 0.3 | 0.1 |
| `oscillateFrequency` | 0.3 | 3 | 1 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Max active blocks | 30 |
| Tower height | 15m |
| Block variations | 1-5 shapes |

---

## Block Variations

### Standard Rectangle
```json
{ "width": 1.2, "height": 0.6 }
```

### Square
```json
{ "width": 0.8, "height": 0.8 }
```

### Long Plank
```json
{ "width": 2, "height": 0.3 }
```

### Circle
```json
{ "type": "circle", "radius": 0.4 }
```

### Triangle
```json
{ "type": "polygon", "vertices": [{"x":0,"y":-0.4},{"x":-0.5,"y":0.4},{"x":0.5,"y":0.4}] }
```

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Cake Stack",
    "description": "Stack the cakes as high as you can!",
    "template": "physics_stacker"
  },
  "settings": {
    "gravity": { "x": 0, "y": 9.8 },
    "worldWidth": 7,
    "worldHeight": 15,
    "backgroundColor": "#FFE4E1"
  },
  "gameState": {
    "score": 0,
    "blocksPlaced": 0
  },
  "templates": {
    "cake_layer": {
      "sprite": { "type": "rect", "width": 1.5, "height": 0.5, "color": "#FF69B4" },
      "physics": { "bodyType": "dynamic", "shape": "box", "width": 1.5, "height": 0.5, "density": 1, "friction": 0.8, "restitution": 0.1 },
      "tags": ["block", "stackable"]
    },
    "moving_cake": {
      "sprite": { "type": "rect", "width": 1.5, "height": 0.5, "color": "#FF1493" },
      "physics": { "bodyType": "kinematic", "shape": "box", "width": 1.5, "height": 0.5 },
      "behaviors": [{ "type": "oscillate", "axis": "x", "amplitude": 2, "frequency": 1 }],
      "tags": ["pending_block"]
    }
  },
  "entities": [
    { "id": "foundation", "sprite": { "type": "rect", "width": 3, "height": 0.5, "color": "#8B4513" }, "transform": { "x": 3.5, "y": 13, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 3, "height": 0.5, "friction": 0.9 }, "tags": ["foundation"] },
    { "id": "fall_zone", "transform": { "x": 3.5, "y": 15, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 10, "height": 0.5, "isSensor": true }, "tags": ["fall_zone"] },
    { "id": "current_block", "template": "moving_cake", "transform": { "x": 3.5, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 } }
  ],
  "winCondition": { "type": "score", "score": 15 },
  "loseCondition": { "type": "custom" },
  "rules": []
}
```

---

## AI Generation Tips

1. **Foundation width**: Should be wider than blocks for easier start
2. **Drop height**: Start blocks high enough for reaction time
3. **Oscillation**: Speed should increase gradually, not start too fast
4. **Friction**: High friction (0.8+) helps stability
5. **No randomness in blocks**: Consistent size helps learning

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "stacking game" | Classic block stacker |
| "cake theme" | Cake layers, bakery background |
| "easy" | Slower oscillation, wider blocks |
| "hard" | Faster movement, narrower blocks |

---

## Variations

### Classic Stack
- Simple rectangles
- Clean aesthetic
- Height focus

### Cake Tower
- Cake layer appearance
- Bakery theme
- Sweet decorations

### Book Stack
- Book shapes (varying widths)
- Library theme
- Cozy aesthetic

### Cloud Stack
- Fluffy cloud shapes
- Sky background
- Dreamy aesthetic

### Jenga Mode
- Remove blocks from bottom
- Don't let tower fall
- Reverse stacking
