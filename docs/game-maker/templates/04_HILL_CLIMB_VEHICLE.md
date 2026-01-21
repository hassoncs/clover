# Template 04: Hill-Climb Vehicle

*Hill Climb Racing-style physics-based driving game*

---

## Overview

| Attribute | Value |
|-----------|-------|
| **Inspiration** | Hill Climb Racing, Trials |
| **Tier** | 1-2 (Depends on vehicle complexity) |
| **Target Age** | 8-14 |
| **Session Length** | 1-5 minutes |
| **Perspective** | Side view |
| **Primary Verb** | `tilt_to_move` or `buttons` |

**Core Loop:** Drive vehicle over hilly terrain, manage balance and fuel/momentum, don't flip over or run out of gas. Score by distance and collectibles.

---

## Identity Contract (FIXED)

| Element | Fixed Value | Reason |
|---------|-------------|--------|
| **Wheeled Vehicle** | Must have rotating wheels | Core identity |
| **Terrain Physics** | Uneven ground with physics | The challenge |
| **Balance Element** | Vehicle can tip/flip | Skill expression |
| **Forward Progress** | Goal is distance traveled | Score mechanic |
| **Fuel/Resource** | Limited resource adds tension | Gameplay layer |

---

## Entity Templates

### Vehicle Chassis

```json
{
  "id": "chassis",
  "name": "Car Body",
  "sprite": {
    "type": "rect",
    "width": 2,
    "height": 0.8,
    "color": "#e74c3c"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "box",
    "width": 2,
    "height": 0.8,
    "density": 1,
    "friction": 0.5,
    "restitution": 0.1
  },
  "tags": ["vehicle", "chassis"]
}
```

### Wheel

```json
{
  "id": "wheel",
  "name": "Wheel",
  "sprite": {
    "type": "circle",
    "radius": 0.4,
    "color": "#333333"
  },
  "physics": {
    "bodyType": "dynamic",
    "shape": "circle",
    "radius": 0.4,
    "density": 0.5,
    "friction": 0.9,
    "restitution": 0.1
  },
  "tags": ["wheel"]
}
```

### Wheel Joint Configuration

```json
{
  "joints": [
    {
      "id": "front_wheel_joint",
      "type": "revolute",
      "bodyA": "chassis",
      "bodyB": "front_wheel",
      "anchor": { "x": 0.7, "y": 0.5 },
      "enableMotor": true,
      "motorSpeed": 0,
      "maxMotorTorque": 50
    },
    {
      "id": "rear_wheel_joint",
      "type": "revolute",
      "bodyA": "chassis",
      "bodyB": "rear_wheel",
      "anchor": { "x": -0.7, "y": 0.5 },
      "enableMotor": true,
      "motorSpeed": 0,
      "maxMotorTorque": 50
    }
  ]
}
```

### Terrain Segment

```json
{
  "id": "terrain",
  "name": "Hill Terrain",
  "physics": {
    "bodyType": "static",
    "shape": "polygon",
    "vertices": [
      { "x": 0, "y": 10 },
      { "x": 5, "y": 9 },
      { "x": 10, "y": 10 },
      { "x": 15, "y": 8 },
      { "x": 20, "y": 10 },
      { "x": 20, "y": 12 },
      { "x": 0, "y": 12 }
    ],
    "density": 0,
    "friction": 0.7,
    "restitution": 0
  },
  "tags": ["ground", "terrain"]
}
```

### Fuel Can (Collectible)

```json
{
  "id": "fuel_can",
  "name": "Fuel",
  "sprite": {
    "type": "rect",
    "width": 0.5,
    "height": 0.7,
    "color": "#FFD700"
  },
  "physics": {
    "bodyType": "static",
    "shape": "box",
    "width": 0.5,
    "height": 0.7,
    "isSensor": true
  },
  "behaviors": [
    {
      "type": "destroy_on_collision",
      "withTags": ["vehicle"],
      "effect": "fade"
    }
  ],
  "tags": ["fuel", "collectible"]
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
      "withTags": ["vehicle"],
      "effect": "fade"
    },
    {
      "type": "score_on_collision",
      "withTags": ["vehicle"],
      "points": 50
    }
  ],
  "tags": ["coin", "collectible"]
}
```

---

## Behaviors Used

| Behavior | Purpose | Entity |
|----------|---------|--------|
| `control` (tilt_to_move) | Accelerate/brake | Vehicle (via motor speed) |
| `control` (buttons) | Alternative control | Vehicle |
| `rotate` | Spinning coins | Coins |
| `destroy_on_collision` | Pickup collection | Fuel, Coins |
| `score_on_collision` | Coin points | Coins |

---

## Rules

### Win Condition

```json
{
  "winCondition": {
    "type": "reach_entity",
    "entityId": "finish_line",
    "triggerTag": "vehicle"
  }
}
```

*Alternative: Distance-based high score (no win condition).*

### Lose Conditions

```json
{
  "loseConditions": [
    {
      "type": "custom",
      "rule": {
        "id": "flipped_over",
        "trigger": { "type": "frame" },
        "conditions": [
          { "type": "entity_angle", "entityId": "chassis", "min": 2.5, "max": 3.8 }
        ],
        "actions": [
          { "type": "game_state", "state": "lose", "delay": 1 }
        ]
      }
    },
    {
      "type": "custom",
      "rule": {
        "id": "out_of_fuel",
        "trigger": { "type": "event", "eventName": "fuel_empty" },
        "actions": [
          { "type": "game_state", "state": "lose", "delay": 2 }
        ]
      }
    }
  ]
}
```

### Scoring Rules

```json
{
  "rules": [
    {
      "id": "distance_score",
      "trigger": { "type": "timer", "time": 0.5, "repeat": true },
      "actions": [
        { "type": "score", "operation": "add", "value": 1 }
      ]
    },
    {
      "id": "airtime_bonus",
      "trigger": { "type": "event", "eventName": "airborne" },
      "conditions": [{ "type": "time", "min": 0.5 }],
      "actions": [
        { "type": "score", "operation": "add", "value": 50 }
      ]
    },
    {
      "id": "collect_fuel",
      "trigger": { "type": "collision", "entityATag": "vehicle", "entityBTag": "fuel" },
      "actions": [
        { "type": "event", "eventName": "refuel", "data": { "amount": 20 } },
        { "type": "sound", "soundId": "fuel" }
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
| Vehicle skin | Car, truck, motorcycle, tractor |
| Terrain theme | Dirt, snow, moon, candy |
| Collectible style | Coins, stars, gems |
| Background | Mountains, space, desert |

### Level 2: Medium (Tuning)

| Parameter | Kid Label | Range | Default |
|-----------|-----------|-------|---------|
| `motorTorque` | "Engine Power" | 20-100 | 50 |
| `wheelFriction` | "Grip" | 0.5-1.0 | 0.9 |
| `gravity.y` | "Gravity" | 5-15 | 9.8 |
| `fuelConsumption` | "Fuel Use" | 0.5-2 | 1 |
| `vehicleDensity` | "Vehicle Weight" | 0.5-2 | 1 |

### Level 3: Deep (Content + Rules)

| What | Options |
|------|---------|
| Vehicle type | Different wheel configs (2WD, 4WD) |
| Terrain design | Hill patterns and heights |
| Fuel placement | Strategic fuel can locations |
| Boost pads | Speed boost zones |
| Hazards | Spikes, water, gaps |
| Win type | Reach finish vs endless distance |

---

## Vehicle Presets

To ensure stability, offer preset vehicle configurations:

### Jeep (Balanced)
```json
{
  "chassisWidth": 2,
  "chassisHeight": 0.8,
  "wheelRadius": 0.4,
  "wheelbase": 1.4,
  "motorTorque": 50,
  "wheelFriction": 0.9
}
```

### Monster Truck (Big)
```json
{
  "chassisWidth": 2.5,
  "chassisHeight": 1,
  "wheelRadius": 0.6,
  "wheelbase": 1.8,
  "motorTorque": 80,
  "wheelFriction": 0.95
}
```

### Motorcycle (Fast)
```json
{
  "chassisWidth": 1.5,
  "chassisHeight": 0.5,
  "wheelRadius": 0.35,
  "wheelbase": 1.0,
  "motorTorque": 40,
  "wheelFriction": 0.85
}
```

---

## Parameter Reference

### Physics Bounds

| Parameter | Min | Max | Default |
|-----------|-----|-----|---------|
| `gravity.y` | 5 | 20 | 9.8 |
| `motorTorque` | 15 | 120 | 50 |
| `wheelFriction` | 0.4 | 1.0 | 0.9 |
| `chassisDensity` | 0.3 | 3 | 1 |
| `wheelDensity` | 0.2 | 1 | 0.5 |

### Content Bounds

| Limit | Value |
|-------|-------|
| Max terrain points | 100 |
| Terrain segment length | 20m |
| Max slope angle | 60 degrees |
| Max collectibles | 50 |

---

## Example Game Definition

```json
{
  "meta": {
    "name": "Moon Buggy",
    "description": "Drive across the lunar surface!",
    "template": "hill_climb_vehicle"
  },
  "settings": {
    "gravity": { "x": 0, "y": 4 },
    "worldWidth": 100,
    "worldHeight": 15,
    "backgroundColor": "#0a0a2e"
  },
  "gameState": {
    "fuel": 100,
    "score": 0,
    "distance": 0
  },
  "templates": {
    "buggy_chassis": {
      "sprite": { "type": "rect", "width": 2, "height": 0.7, "color": "#C0C0C0" },
      "physics": { "bodyType": "dynamic", "shape": "box", "width": 2, "height": 0.7, "density": 0.8, "friction": 0.3 },
      "tags": ["vehicle", "chassis"]
    },
    "buggy_wheel": {
      "sprite": { "type": "circle", "radius": 0.45, "color": "#333" },
      "physics": { "bodyType": "dynamic", "shape": "circle", "radius": 0.45, "density": 0.4, "friction": 0.85 },
      "tags": ["wheel"]
    }
  },
  "entities": [
    { "id": "chassis", "template": "buggy_chassis", "transform": { "x": 3, "y": 8, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "front_wheel", "template": "buggy_wheel", "transform": { "x": 3.7, "y": 8.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "rear_wheel", "template": "buggy_wheel", "transform": { "x": 2.3, "y": 8.5, "angle": 0, "scaleX": 1, "scaleY": 1 } },
    { "id": "terrain", "physics": { "bodyType": "static", "shape": "polygon", "vertices": [{"x":0,"y":10},{"x":10,"y":9.5},{"x":20,"y":10},{"x":30,"y":8},{"x":40,"y":9},{"x":50,"y":7},{"x":60,"y":9.5},{"x":70,"y":8},{"x":80,"y":10},{"x":90,"y":9},{"x":100,"y":10},{"x":100,"y":15},{"x":0,"y":15}], "friction": 0.6 }, "tags": ["ground"] }
  ],
  "joints": [
    { "type": "revolute", "bodyA": "chassis", "bodyB": "front_wheel", "anchor": { "x": 3.7, "y": 8.5 }, "enableMotor": true, "motorSpeed": 0, "maxMotorTorque": 40 },
    { "type": "revolute", "bodyA": "chassis", "bodyB": "rear_wheel", "anchor": { "x": 2.3, "y": 8.5 }, "enableMotor": true, "motorSpeed": 0, "maxMotorTorque": 40 }
  ],
  "winCondition": null,
  "loseCondition": { "type": "custom" },
  "rules": []
}
```

---

## AI Generation Tips

1. **Use vehicle presets**: Don't generate arbitrary vehicle dimensions
2. **Terrain smoothness**: Avoid sudden elevation changes
3. **Low gravity = moon/space**: For space themes, reduce gravity
4. **Fuel pacing**: Place fuel cans before challenging sections
5. **Camera follow**: Always follow the vehicle

**Prompt mapping:**

| User Says | AI Generates |
|-----------|--------------|
| "moon driving" | Low gravity, craters, astronaut buggy |
| "monster truck" | Big wheels, rough terrain |
| "easy" | Gentle hills, more fuel |
| "racing game" | Finish line, time bonus |

---

## Variations

### Classic Hill Climb
- Jeep on dirt roads
- Hills and valleys
- Coins and fuel cans

### Moon Buggy
- Low gravity
- Crater terrain
- Space aesthetic

### Monster Truck
- Oversized wheels
- Crush obstacles
- Stadium theme

### Winter Rally
- Snowy hills
- Icy patches (low friction zones)
- Northern lights background
