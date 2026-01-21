# Template 10: Ragdoll Goal Shot

*Flick-to-goal physics aiming game (basketball, golf, trash toss)*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Basketball games, Paper Toss, Golf |
| **Tier** | 1 (Fully AI-Generatable) |
| **Target Age** | 6-14 |
| **Session Length** | 30 seconds - 3 minutes |
| **Perspective** | Side view or portrait |
| **Primary Verb** | `drag_to_aim` |

**Core Loop:** Aim by dragging back, release to launch object toward goal. Score based on accuracy, combos, or completing levels. Simple physics, satisfying when it goes in.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Drag-to-aim** | Pull back determines angle/power | Intuitive control |
| **Projectile** | Object flies through air | Core mechanic |
| **Target/Goal** | Something to hit/enter | Objective |
| **Gravity** | Arc trajectory | Physics satisfaction |
| **Scoring** | Points for success | Feedback |

---

## Entity Templates

### Ball (Projectile)

```json
{
  "id": "ball",
  "name": "Ball",
  "sprite": {
    "type": "circle",
    "radius": 0.3,
    "color": "#FF6B00"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.3,
    "density": 1,
    "friction": 0.5,
    "restitution": 0.7
  },
  "tags": ["ball", "projectile"]
}
```

### Launcher Point

```json
{
  "id": "launcher",
  "name": "Launcher",
  "transform": { "x": 2, "y": 8 },
  "behaviors": [
    {
      "type": "control",
      "controlType": "drag_to_aim",
      "force": 12,
      "maxPullDistance": 3,
      "aimLine": true
    },
    {
      "type": "spawn_on_event",
      "event": "release",
      "entityTemplate": "ball",
      "spawnPosition": "at_self"
    }
  ],
  "tags": ["launcher"]
}
```

### Hoop/Goal (Ring)

```json
{
  "id": "hoop",
  "name": "Basketball Hoop",
  "sprite": {
    "type": "rect",
    "width": 1.5,
    "height": 0.1,
    "color": "#FF4500"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 1.5,
    "height": 0.1,
    "density": 0,
    "friction": 0.3,
    "restitution": 0.3
  },
  "tags": ["hoop", "goal_rim"]
}
```

### Goal Sensor

```json
{
  "id": "goal_sensor",
  "name": "Goal Zone",
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 1.2,
    "height": 0.5,
    "isSensor": true
  },
  "tags": ["goal", "score_zone"]
}
```

### Trash Can (Alternative Goal)

```json
{
  "id": "trash_can",
  "name": "Trash Can",
  "sprite": {
    "type": "rect",
    "width": 1,
    "height": 1.5,
    "color": "#2d3436"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 1,
    "height": 1.5,
    "density": 0,
    "friction": 0.5,
    "restitution": 0.2
  },
  "tags": ["container", "goal"]
}
```

### Obstacle

```json
{
  "id": "obstacle",
  "name": "Obstacle",
  "sprite": {
    "type": "rect",
    "width": 0.5,
    "height": 2,
    "color": "#7f8c8d"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 0.5,
    "height": 2,
    "density": 0,
    "friction": 0.3,
    "restitution": 0.5
  },
  "tags": ["obstacle"]
}
```

### Moving Goal

```json
{
  "id": "moving_goal",
  "name": "Moving Goal",
  "sprite": {
    "type": "rect",
    "width": 1.5,
    "height": 0.5,
    "color": "#27ae60"
  },
  "physics": {
    "bodyType": "kinematic",
    "shape": "box",
    "width": 1.5,
    "height": 0.5
  },
  "behaviors": [
    {
      "type": "oscillate",
      "axis": "x",
      "amplitude": 2,
      "frequency": 0.5
    }
  ],
  "tags": ["goal", "moving"]
}
```

### Bouncer

```json
{
  "id": "bouncer",
  "name": "Bouncer",
  "sprite": {
    "type": "circle",
    "radius": 0.4,
    "color": "#9b59b6"
  },
  "physics": {
    "bodyType": "static",
    "shape": "circle",
    "radius": 0.4,
    "density": 0,
    "friction": 0,
    "restitution": 1.2
  },
  "tags": ["bouncer"]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (drag_to_aim) | Aiming mechanic | Launcher |
| `spawn_on_event` | Create ball on release | Launcher |
| `oscillate` | Moving goals | Moving Goal |
| `score_on_collision` | Award points | Goal Sensor |
| `destroy_on_collision` | Ball cleanup | Ball (on ground/walls) |

---

## Rules

### Win Condition

```json
{
  "winCondition": {
    "type": "score",
    "score": 100
  }
}
```

*Alternative: Complete X shots, clear all targets.*

### Lose Condition

```json
{
  "loseCondition": {
    "type": "custom",
    "rule": {
      "id": "out_of_balls",
      "trigger": { "type": "event", "eventName": "ball_lost" },
      "conditions": [
        { "type": "game_state", "property": "ballsRemaining", "comparison": "eq", "value": 0 }
      ],
      "actions": [
        { "type": "game_state", "state": "lose" }
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
      "id": "goal_scored",
      "trigger": { "type": "collision", "entityATag": "projectile", "entityBTag": "score_zone" },
      "actions": [
        { "type": "score", "operation": "add", "value": 10 },
        { "type": "sound", "soundId": "swish" },
        { "type": "destroy", "target": { "type": "by_tag", "tag": "projectile" } },
        { "type": "event", "eventName": "spawn_next_ball", "delay": 1 }
      ]
    },
    {
      "id": "ball_missed",
      "trigger": { "type": "collision", "entityATag": "projectile", "entityBTag": "ground" },
      "actions": [
        { "type": "sound", "soundId": "bounce" },
        { "type": "timer", "duration": 2, "action": "destroy_ball" }
      ]
    },
    {
      "id": "perfect_shot",
      "trigger": { "type": "event", "eventName": "goal_no_rim" },
      "actions": [
        { "type": "score", "operation": "add", "value": 5 }
      ]
    },
    {
      "id": "combo_bonus",
      "trigger": { "type": "event", "eventName": "consecutive_goals" },
      "conditions": [{ "type": "combo", "min": 3 }],
      "actions": [
        { "type": "score", "operation": "multiply", "value": 2 }
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
| Ball type | Basketball, paper ball, golf ball |
| Goal type | Hoop, trash can, hole, portal |
| Theme | Gym, office, golf course, space |
| Character | Hand, catapult, slingshot |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `launchForce` | "Throw Power" | 8-20 | 12 |
| `ballBounce` | "Bounciness" | 0.3-0.9 | 0.7 |
| `gravity.y` | "Gravity" | 6-15 | 10 |
| `goalSize` | "Goal Size" | 1-2.5 | 1.5 |
| `ballsPerRound` | "Shots" | 3-10 | 5 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Goal placement | Fixed, random, moving |
| Obstacles | Walls, fans, bouncers |
| Multi-goal | Multiple targets per round |
| Scoring modes | Points, streaks, time attack |
| Special balls | Explosive, multi-ball, heavy |

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `gravity.y` | 5 | 18 | 10 |
| `launchForce` | 6 | 25 | 12 |
| `ballRestitution` | 0.2 | 0.95 | 0.7 |
| `ballDensity` | 0.5 | 3 | 1 |
| `maxPullDistance` | 1.5 | 5 | 3 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Balls per round | 1-20 |
| Max obstacles | 10 |
| Goal count | 1-5 |
| Bouncer count | 0-5 |

---

## Game Modes

### Classic Basketball
- Fixed hoop position
- Score by making shots
- Limited balls

### Paper Toss
- Trash can target
- Wind zones affect trajectory
- Office theme

### Golf
- Hole target
- Multiple holes (levels)
- Terrain bounces

### Moving Target
- Goal oscillates
- Timing matters
- Increasing speed

### Trick Shot
- Bounce off obstacles
- Combo scoring
- Creative paths

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Office Hoops",
    "description": "Toss paper balls into the trash!",
    "template": "ragdoll_goal"
  },
  "settings": {
    "gravity": { "x": 0, "y": 10 },
    "worldWidth": 10,
    "worldHeight": 12,
    "backgroundColor": "#F5F5DC"
  },
  "gameState": {
    "score": 0,
    "ballsRemaining": 5,
    "streak": 0
  },
  "templates": {
    "paper_ball": {
      "sprite": { "type": "circle", "radius": 0.25, "color": "#FFFFFF" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.25, "density": 0.5, "friction": 0.3, "restitution": 0.6 },
      "tags": ["projectile", "ball"]
    },
    "trash_can": {
      "sprite": { "type": "rect", "width": 1.2, "height": 1.5, "color": "#333333" },
      "physics": { "bodyType": "static", "shape": "box", "width": 1.2, "height": 1.5, "friction": 0.5, "restitution": 0.2 },
      "tags": ["goal_container"]
    }
  },
  "entities": [
    { "id": "launcher", "transform": { "x": 2, "y": 9, "angle": 0, "scaleX": 1, "scaleY": 1 }, "behaviors": [{ "type": "control", "controlType": "drag_to_aim", "force": 12, "maxPullDistance": 3, "aimLine": true }, { "type": "spawn_on_event", "event": "release", "entityTemplate": "paper_ball", "spawnPosition": "at_self" }], "tags": ["launcher"] },
    { "id": "trash", "template": "trash_can", "transform": { "x": 7, "y": 10.25, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "goal_sensor", "transform": { "x": 7, "y": 9.7, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 0.9, "height": 0.3, "isSensor": true }, "tags": ["score_zone", "goal"] },
    { "id": "desk", "sprite": { "type": "rect", "width": 4, "height": 0.3, "color": "#8B4513" }, "transform": { "x": 2, "y": 10, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 4, "height": 0.3 }, "tags": ["furniture"] },
    { "id": "ground", "sprite": { "type": "rect", "width": 10, "height": 0.5, "color": "#696969" }, "transform": { "x": 5, "y": 11.75, "angle": 0, "scaleX": 1, "scaleY": 1 }, "physics": { "bodyType": "static", "shape": "box", "width": 10, "height": 0.5 }, "tags": ["ground"] }
  ],
  "winCondition": { "type": "score", "score": 30 },
  "loseCondition": { "type": "custom" },
  "rules": [
    { "id": "goal", "trigger": { "type": "collision", "entityATag": "projectile", "entityBTag": "score_zone" }, "actions": [{ "type": "score", "operation": "add", "value": 10 }, { "type": "sound", "soundId": "swoosh" }] }
  ]
}
```

---

## AI Generation Tips

1. **Clear trajectory**: Place goal where arc naturally reaches
2. **Launch position**: Bottom-left is intuitive for right-handed
3. **Goal visibility**: Goal should be easily visible from launch point
4. **Gravity balance**: Higher gravity = shorter arcs, easier to predict
5. **Ball count**: More balls = more forgiving, better for beginners

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "basketball game" | Hoop target, orange ball |
| "paper toss" | Trash can, crumpled paper ball |
| "golf game" | Hole target, multi-level |
| "with obstacles" | Add walls or bouncers |

---

## Variations

### Basketball
- Hoop and backboard
- Gym or street court theme
- Swish vs rim sounds

### Paper Toss
- Trash can target
- Office theme
- Fan/wind obstacles

### Mini Golf
- Hole targets
- Multiple levels
- Terrain obstacles

### Space Docking
- Spaceship to station
- Zero gravity zones
- Sci-fi aesthetic

### Portal Toss
- Magical portals as targets
- Fantasy theme
- Teleport effects
