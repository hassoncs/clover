# Template 02: Rope Physics

*Cut the Rope-style physics puzzle delivery game*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Cut the Rope, Om Nom |
| **Tier** | 2 (Template + Tuning) |
| **Target Age** | 6-14 |
| **Session Length** | 30 seconds - 2 minutes per level |
| **Perspective** | Portrait, single screen |
| **Primary Verb** | `tap_to_cut` |

**Core Loop:** Object hangs from rope(s), player taps to cut ropes at right time, object swings/falls into target zone. Collect optional stars along the way.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Input Method** | Tap to cut ropes | Core mechanic |
| **Objective** | Deliver object to target | Clear goal |
| **Rope Physics** | Pendulum swing, gravity | The fun |
| **Timing Element** | Cut timing matters | Skill expression |
| **Single Screen** | No scrolling | Puzzle visibility |

---

## Entity Templates

### Delivery Object

```json
{
  "id": "candy",
  "name": "Candy",
  "sprite": {
    "type": "circle",
    "radius": 0.4,
    "color": "#FF69B4"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.4,
    "density": 1.0,
    "friction": 0.3,
    "restitution": 0.2
  },
  "behaviors": [
    {
      "type": "score_on_collision",
      "withTags": ["star"],
      "points": 100,
      "once": true
    }
  ],
  "tags": ["deliverable", "candy"]
}
```

### Rope Anchor

```json
{
  "id": "anchor",
  "name": "Rope Anchor",
  "sprite": {
    "type": "circle",
    "radius": 0.2,
    "color": "#8B4513"
  },
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 0.2,
    "density": 0,
    "friction": 0,
    "restitution": 0
  },
  "tags": ["anchor"]
}
```

### Target Zone

```json
{
  "id": "monster",
  "name": "Monster (Target)",
  "sprite": {
    "type": "circle",
    "radius": 0.8,
    "color": "#90EE90"
  },
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 0.8,
    "density": 0,
    "friction": 0,
    "restitution": 0,
    "isSensor": true
  },
  "behaviors": [],
  "tags": ["target", "goal"]
}
```

### Collectible Star

```json
{
  "id": "star",
  "name": "Star",
  "sprite": {
    "type": "circle",
    "radius": 0.3,
    "color": "#FFD700"
  },
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 0.3,
    "density": 0,
    "isSensor": true
  },
  "behaviors": [
    {
      "type": "rotate",
      "speed": 2,
      "direction": "clockwise"
    },
    {
      "type": "destroy_on_collision",
      "withTags": ["deliverable"],
      "effect": "fade"
    }
  ],
  "tags": ["star", "collectible"]
}
```

### Rope Segment

```json
{
  "id": "rope_segment",
  "name": "Rope Segment",
  "sprite": {
    "type": "rect",
    "width": 0.1,
    "height": 0.5,
    "color": "#8B4513"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "box",
    "width": 0.1,
    "height": 0.5,
    "density": 0.1,
    "friction": 0.5,
    "restitution": 0
  },
  "tags": ["rope"]
}
```

---

## Rope Joint Configuration

Ropes are created using distance joints between segments:

```json
{
  "joints": [
    {
      "type": "distance",
      "bodyA": "anchor_1",
      "bodyB": "rope_seg_1",
      "anchorA": { "x": 0, "y": 0 },
      "anchorB": { "x": 0, "y": -0.25 },
      "length": 0.5,
      "stiffness": 10,
      "damping": 0.5
    },
    {
      "type": "distance",
      "bodyA": "rope_seg_1",
      "bodyB": "rope_seg_2",
      "anchorA": { "x": 0, "y": 0.25 },
      "anchorB": { "x": 0, "y": -0.25 },
      "length": 0.5,
      "stiffness": 10,
      "damping": 0.5
    }
  ]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (tap_to_cut) | Cut rope on tap | Global/Rope |
| `rotate` | Spinning stars | Stars |
| `destroy_on_collision` | Collect stars | Stars |
| `score_on_collision` | Award points | Deliverable |
| `gravity_zone` | Air bubbles/fans | Obstacles |

---

## Rules

### Win Condition

```json
{
  "winCondition": {
    "type": "reach_entity",
    "entityId": "monster",
    "triggerTag": "deliverable"
  }
}
```

### Lose Condition

```json
{
  "loseCondition": {
    "type": "entity_exits_screen",
    "tag": "deliverable"
  }
}
```

### Scoring Rules

```json
{
  "rules": [
    {
      "id": "collect_star",
      "trigger": { "type": "collision", "entityATag": "deliverable", "entityBTag": "star" },
      "actions": [
        { "type": "score", "operation": "add", "value": 100 },
        { "type": "sound", "soundId": "ding" },
        { "type": "destroy", "target": { "type": "collision_entities" } }
      ]
    },
    {
      "id": "reach_target",
      "trigger": { "type": "collision", "entityATag": "deliverable", "entityBTag": "target" },
      "actions": [
        { "type": "game_state", "state": "win", "delay": 0.5 },
        { "type": "sound", "soundId": "chomp" }
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
| Theme | Candy/Monster, Space/Astronaut, Magic/Wizard |
| Deliverable skin | Candy, package, potion, star |
| Target character | Cute monster, alien, pet |
| Background | Cozy room, space station, wizard tower |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `gravity.y` | "Fall Speed" | 5-15 | 9.8 |
| `rope.stiffness` | "Rope Tightness" | 3-20 | 10 |
| `rope.damping` | "Swing Slowdown" | 0.1-1 | 0.5 |
| `rope.segmentCount` | "Rope Length" | 2-8 | 4 |
| `starCount` | "Stars to Collect" | 0-3 | 3 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Rope placement | Position anchors and rope lengths |
| Star placement | Place collectibles along path |
| Obstacle types | Air bubbles (upward force), fans (directional force) |
| Moving elements | Oscillating platforms, rotating obstacles |
| Multiple ropes | Object attached to 2-3 ropes |
| Time pressure | Optional countdown timer |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `gravity.y` | 5 | 20 | 9.8 |
| `rope.stiffness` | 2 | 30 | 10 |
| `rope.damping` | 0 | 2 | 0.5 |
| `rope.segments` | 1 | 10 | 4 |
| `deliverable.density` | 0.5 | 3 | 1 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Max ropes | 5 |
| Max stars | 3 |
| Max obstacles | 10 |
| Screen ratio | 9:16 (portrait) |

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Space Delivery",
    "description": "Deliver the space package to the hungry alien!",
    "template": "rope_physics"
  },
  "settings": {
    "gravity": { "x": 0, "y": 8 },
    "worldWidth": 7,
    "worldHeight": 12,
    "backgroundColor": "#0a0a2e"
  },
  "templates": {
    "package": {
      "sprite": { "type": "rect", "width": 0.6, "height": 0.6, "color": "#FF6B6B" },
      "physics": { "bodyType": "dynamic", "shape": "box", "width": 0.6, "height": 0.6, "density": 1, "friction": 0.3, "restitution": 0.2 },
      "tags": ["deliverable"]
    },
    "alien": {
      "sprite": { "type": "circle", "radius": 0.8, "color": "#90EE90" },
      "physics": { "bodyType": "static", "shape": "circle", "radius": 0.8, "isSensor": true },
      "tags": ["target", "goal"]
    },
    "star": {
      "sprite": { "type": "circle", "radius": 0.25, "color": "#FFD700" },
      "physics": { "bodyType": "static", "shape": "circle", "radius": 0.25, "isSensor": true },
      "behaviors": [
        { "type": "rotate", "speed": 3, "direction": "clockwise" },
        { "type": "destroy_on_collision", "withTags": ["deliverable"], "effect": "fade" }
      ],
      "tags": ["star", "collectible"]
    }
  },
  "entities": [
    { "id": "anchor_1", "transform": { "x": 2, "y": 2, "angle": 0, "scaleX": 1, "scaleY": 1 }, "sprite": { "type": "circle", "radius": 0.15, "color": "#666" }, "physics": { "bodyType": "static", "shape": "circle", "radius": 0.15 }, "tags": ["anchor"] },
    { "id": "package", "template": "package", "transform": { "x": 2, "y": 4, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "alien", "template": "alien", "transform": { "x": 5, "y": 10, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "star_1", "template": "star", "transform": { "x": 4, "y": 5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "star_2", "template": "star", "transform": { "x": 3, "y": 7, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "star_3", "template": "star", "transform": { "x": 5, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 } }
  ],
  "joints": [
    { "type": "distance", "bodyA": "anchor_1", "bodyB": "package", "length": 2, "stiffness": 8, "damping": 0.3 }
  ],
  "winCondition": { "type": "reach_entity", "entityId": "alien", "triggerTag": "deliverable" },
  "loseCondition": { "type": "entity_exits_screen", "tag": "deliverable" },
  "rules": []
}
```

---

## AI Generation Tips

1. **Single-screen design**: All elements must fit in portrait view
2. **Rope swing physics**: Place target where swing naturally reaches
3. **Star path**: Stars should be along plausible swing trajectories
4. **Difficulty via ropes**: More ropes = more complex timing
5. **No impossible setups**: Validate target is reachable via physics

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "candy game" | Cut the Rope classic theme |
| "space theme" | Package delivery to alien |
| "easy" | 1 rope, target directly below |
| "hard" | 3 ropes, target to the side |

---

## Variations

### Classic (Cut the Rope)
- Candy delivery to monster
- Colorful room backgrounds
- Cute creature animations

### Space Delivery
- Package to alien
- Low gravity option
- Asteroid obstacles

### Magic Potion
- Potion to wizard
- Magic bubbles (anti-gravity zones)
- Sparkle effects

### Jungle Vine
- Fruit to monkey
- Vine aesthetics for ropes
- Jungle background
