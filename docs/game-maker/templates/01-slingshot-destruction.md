# Template 01: Slingshot Destruction

*Angry Birds-style projectile physics destruction game*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Angry Birds, Crush the Castle |
| **Tier** | 2 (Template + Tuning) |
| **Target Age** | 6-14 |
| **Session Length** | 1-3 minutes per level |
| **Perspective** | Side view, scrollable |
| **Primary Verb** | `drag_to_aim` |

**Core Loop:** Pull back slingshot, aim, release projectile, watch destruction physics, repeat with limited shots until targets are destroyed or shots exhausted.

---

## Identity Contract (FIXED)

These elements define "Slingshot Destruction" and cannot be changed:

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Input Method** | Drag-to-aim slingshot | Core mechanic identity |
| **Projectile Limit** | Limited shots per level | Creates tension/strategy |
| **Physics** | Full gravity + collision destruction | The fun |
| **Win Trigger** | All targets destroyed | Clear objective |
| **Lose Trigger** | Shots exhausted with targets remaining | Failure state |
| **Camera** | Follow projectile, return to sling | Standard UX |

---

## Entity Templates

### Launcher (Slingshot)

```json
{
  "id": "launcher",
  "name": "Slingshot",
  "transform": { "x": 2, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 },
  "sprite": {
    "type": "image",
    "imageUrl": "assets://slingshot.png",
    "imageWidth": 1.5,
    "imageHeight": 2
  },
  "physics": null,
  "behaviors": [
    {
      "type": "control",
      "controlType": "drag_to_aim",
      "force": 15,
      "maxPullDistance": 3,
      "aimLine": true
    },
    {
      "type": "spawn_on_event",
      "event": "release",
      "entityTemplate": "projectile",
      "spawnPosition": "at_self"
    }
  ],
  "tags": ["launcher", "ui"]
}
```

### Projectile

```json
{
  "id": "projectile_template",
  "name": "Bird",
  "sprite": {
    "type": "circle",
    "radius": 0.4,
    "color": "#FF6B6B"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.4,
    "density": 2.0,
    "friction": 0.3,
    "restitution": 0.3,
    "bullet": true
  },
  "behaviors": [
    {
      "type": "destroy_on_collision",
      "withTags": ["ground", "wall"],
      "effect": "fade",
      "minImpactVelocity": 0
    },
    {
      "type": "timer",
      "duration": 5,
      "action": "destroy"
    }
  ],
  "tags": ["projectile"]
}
```

### Destructible Block

```json
{
  "id": "block_wood",
  "name": "Wood Block",
  "sprite": {
    "type": "rect",
    "width": 1,
    "height": 0.3,
    "color": "#8B4513"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "box",
    "width": 1,
    "height": 0.3,
    "density": 0.5,
    "friction": 0.6,
    "restitution": 0.1
  },
  "behaviors": [
    {
      "type": "destroy_on_collision",
      "withTags": ["projectile"],
      "effect": "explode",
      "minImpactVelocity": 8
    },
    {
      "type": "score_on_collision",
      "withTags": ["projectile"],
      "points": 10
    }
  ],
  "tags": ["block", "destructible"]
}
```

### Target (Enemy)

```json
{
  "id": "target_pig",
  "name": "Pig",
  "sprite": {
    "type": "circle",
    "radius": 0.5,
    "color": "#90EE90"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.5,
    "density": 1.0,
    "friction": 0.5,
    "restitution": 0.2
  },
  "behaviors": [
    {
      "type": "destroy_on_collision",
      "withTags": ["projectile", "block"],
      "effect": "explode",
      "minImpactVelocity": 5
    },
    {
      "type": "score_on_collision",
      "withTags": ["projectile"],
      "points": 100
    }
  ],
  "tags": ["target", "enemy"]
}
```

### Ground

```json
{
  "id": "ground",
  "name": "Ground",
  "transform": { "x": 10, "y": 11, "angle": 0, "scaleX": 1, "scaleY": 1 },
  "sprite": {
    "type": "rect",
    "width": 20,
    "height": 1,
    "color": "#2d3436"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 20,
    "height": 1,
    "density": 0,
    "friction": 0.8,
    "restitution": 0.1
  },
  "tags": ["ground", "solid"]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (drag_to_aim) | Slingshot aiming | Launcher |
| `spawn_on_event` | Create projectile on release | Launcher |
| `destroy_on_collision` | Remove blocks/targets on impact | Blocks, Targets |
| `score_on_collision` | Award points | Blocks, Targets |
| `timer` | Auto-destroy projectile after timeout | Projectile |

---

## Rules

### Win Condition

```json
{
  "winCondition": {
    "type": "destroy_all",
    "tag": "target"
  }
}
```

### Lose Condition

```json
{
  "loseCondition": {
    "type": "custom",
    "rule": {
      "id": "out_of_shots",
      "trigger": { "type": "event", "eventName": "shot_fired" },
      "conditions": [
        { "type": "entity_count", "tag": "target", "min": 1 },
        { "type": "score", "max": "shots_remaining_zero" }
      ],
      "actions": [
        { "type": "game_state", "state": "lose", "delay": 2 }
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
      "id": "target_destroyed",
      "trigger": { "type": "collision", "entityATag": "projectile", "entityBTag": "target" },
      "actions": [
        { "type": "score", "operation": "add", "value": 100 },
        { "type": "sound", "soundId": "pop" }
      ]
    },
    {
      "id": "block_destroyed",
      "trigger": { "type": "collision", "entityATag": "projectile", "entityBTag": "block" },
      "conditions": [{ "type": "random", "probability": 1.0 }],
      "actions": [
        { "type": "score", "operation": "add", "value": 10 }
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
| Theme pack | Birds/Pigs, Space/Aliens, Candy/Monsters, Pirates/Treasure |
| Projectile skin | Visual only, same physics |
| Block textures | Wood, stone, ice, chocolate |
| Background | Sky, space, candy land, ocean |
| Sound effects | Theme-appropriate sounds |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `projectile.force` | "Launch Power" | 10-25 | 15 |
| `projectile.density` | "Heaviness" | 1-4 | 2 |
| `block.density` | "Block Strength" | 0.3-1.5 | 0.5 |
| `gravity.y` | "Gravity" | 5-15 | 9.8 |
| `shotsPerLevel` | "Shots" | 1-10 | 3 |
| `target.minImpactVelocity` | "Hit Strength Needed" | 3-10 | 5 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Level layout | Place blocks and targets in editor |
| Block types | Mix wood/stone/ice with different properties |
| Target placement | Position enemies within structures |
| Special projectiles | Splitting, explosive, boomerang |
| Win condition | "Destroy all" vs "Score target" vs "Time limit" |
| Modifiers | Wind zone (gravity_zone behavior) |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default | Notes |
|-----------|-----|-----|---------|-------|
| `gravity.x` | -5 | 5 | 0 | Wind effect |
| `gravity.y` | 5 | 20 | 9.8 | Normal gravity |
| `projectile.force` | 8 | 30 | 15 | Launch impulse |
| `projectile.density` | 0.5 | 5 | 2 | Mass factor |
| `projectile.restitution` | 0 | 0.8 | 0.3 | Bounciness |
| `block.density` | 0.2 | 2 | 0.5 | Breakability |
| `minImpactVelocity` | 2 | 15 | 5 | Damage threshold |

### Content Bounds

| Limit | Value | Reason |
|-------|-------|--------|
| Max blocks | 50 | Performance |
| Max targets | 10 | Gameplay |
| Max shots | 10 | Challenge |
| Level width | 30m | Scroll limit |
| Level height | 15m | Camera |

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Angry Space Cats",
    "description": "Launch cats at alien towers!",
    "template": "slingshot_destruction",
    "version": "1.0"
  },
  "settings": {
    "gravity": { "x": 0, "y": 9.8 },
    "worldWidth": 25,
    "worldHeight": 12,
    "backgroundColor": "#1a1a2e",
    "pixelsPerMeter": 50
  },
  "gameState": {
    "shotsRemaining": 3,
    "score": 0
  },
  "templates": {
    "cat": {
      "sprite": { "type": "circle", "radius": 0.4, "color": "#FF6B6B" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.4, "density": 2, "friction": 0.3, "restitution": 0.3, "bullet": true },
      "tags": ["projectile"]
    },
    "alien": {
      "sprite": { "type": "circle", "radius": 0.5, "color": "#90EE90" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.5, "density": 1, "friction": 0.5, "restitution": 0.2 },
      "behaviors": [
        { "type": "destroy_on_collision", "withTags": ["projectile"], "effect": "explode", "minImpactVelocity": 5 },
        { "type": "score_on_collision", "withTags": ["projectile"], "points": 100 }
      ],
      "tags": ["target", "enemy"]
    },
    "metal_block": {
      "sprite": { "type": "rect", "width": 1, "height": 0.3, "color": "#708090" },
      "physics": { "bodyType": "dynamic", "shape": "box", "width": 1, "height": 0.3, "density": 2, "friction": 0.6, "restitution": 0.1 },
      "behaviors": [
        { "type": "destroy_on_collision", "withTags": ["projectile"], "effect": "explode", "minImpactVelocity": 12 },
        { "type": "score_on_collision", "withTags": ["projectile"], "points": 20 }
      ],
      "tags": ["block", "destructible"]
    }
  },
  "entities": [
    {
      "id": "launcher",
      "transform": { "x": 2, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 },
      "behaviors": [
        { "type": "control", "controlType": "drag_to_aim", "force": 15, "maxPullDistance": 3, "aimLine": true },
        { "type": "spawn_on_event", "event": "release", "entityTemplate": "cat", "spawnPosition": "at_self" }
      ],
      "tags": ["launcher"]
    },
    { "id": "ground", "transform": { "x": 12.5, "y": 11, "angle": 0, "scaleX": 1, "scaleY": 1 }, "sprite": { "type": "rect", "width": 25, "height": 1, "color": "#2d3436" }, "physics": { "bodyType": "static", "shape": "box", "width": 25, "height": 1, "density": 0, "friction": 0.8, "restitution": 0.1 }, "tags": ["ground"] },
    { "id": "block_1", "template": "metal_block", "transform": { "x": 15, "y": 10.35, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "block_2", "template": "metal_block", "transform": { "x": 15, "y": 10.05, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "block_3", "template": "metal_block", "transform": { "x": 15, "y": 9.75, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "block_4", "template": "metal_block", "transform": { "x": 17, "y": 10.35, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "block_5", "template": "metal_block", "transform": { "x": 17, "y": 10.05, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "block_6", "template": "metal_block", "transform": { "x": 17, "y": 9.75, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "block_top", "template": "metal_block", "transform": { "x": 16, "y": 9.45, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "alien_1", "template": "alien", "transform": { "x": 16, "y": 9, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "alien_2", "template": "alien", "transform": { "x": 15, "y": 10.7, "angle": 0, "scaleX": 1, "scaleY": 1 } }
  ],
  "winCondition": { "type": "destroy_all", "tag": "enemy" },
  "loseCondition": { "type": "custom" },
  "rules": []
}
```

---

## AI Generation Tips

When generating a Slingshot Destruction game from a prompt:

1. **Extract theme**: Identify what the projectile and targets should be
2. **Structure placement**: Generate tower structures using stacked blocks
3. **Target positioning**: Place targets on/in structures (not floating)
4. **Shot calibration**: Set shots = ceil(targets / 1.5) for fair difficulty
5. **Physics balance**: Heavier projectiles need lower minImpactVelocity

**Example prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "cats throwing at dogs" | cat projectile, dog targets |
| "easy game" | 3 shots, 2 targets, wood blocks |
| "hard game" | 3 shots, 5 targets, stone blocks |
| "space theme" | dark background, alien targets, asteroid blocks |

---

## Variations

### Classic (Angry Birds)
- Birds vs Pigs
- Wood, stone, ice blocks
- Star rating system

### Space
- Asteroids/rockets vs aliens
- Low gravity option
- Black hole obstacles

### Candy
- Gummy projectiles vs monsters
- Chocolate, cookie blocks
- Sweet particle effects

### Pirates
- Cannonballs vs ships
- Barrel structures
- Water hazard at bottom
