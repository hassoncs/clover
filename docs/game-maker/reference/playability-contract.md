# Playability Contract Reference

This document defines the **minimum requirements** for a GameDefinition to be playable. Every generated game MUST satisfy this contract.

---

## Core Playability Requirements

Every playable game MUST have:

| Requirement | Description | Validation |
|-------------|-------------|------------|
| **Win Condition** | How does the player win? | `winCondition` is defined and valid |
| **Lose Condition** | How does the player lose? | `loseCondition` is defined and valid |
| **Player Control** | How does the player interact? | At least one entity with `control` behavior |
| **Visible State** | Can the player see progress? | HUD displays relevant metrics |
| **Reset Capability** | Can the game restart cleanly? | Game state can be reset |

---

## Archetype Reference

### 1. Slingshot/Projectile (Angry Birds)

**Identity**: Drag to aim, launch projectiles to destroy targets

| Component | Required Value |
|-----------|----------------|
| **Win Condition** | `{ type: "destroy_all", tag: "target" }` |
| **Lose Condition** | `{ type: "lives_zero" }` (lives = shots remaining) |
| **Control** | `{ type: "control", controlType: "drag_to_aim", force: 15-25 }` on projectile/launcher |
| **HUD** | `showScore: true`, `showLives: true` (label as "Shots") |

**Required Entities**:
- Projectile with `drag_to_aim` control
- Targets tagged `"target"` with `destroy_on_collision` behavior
- Optional: destructible structures

**Required Behaviors**:
```json
{
  "projectile": [
    { "type": "control", "controlType": "drag_to_aim", "force": 20, "aimLine": true, "maxPullDistance": 3 }
  ],
  "target": [
    { "type": "destroy_on_collision", "withTags": ["projectile"], "effect": "explode" },
    { "type": "score_on_collision", "withTags": ["projectile"], "points": 100 }
  ]
}
```

**Example Rules**:
```json
{
  "winCondition": { "type": "destroy_all", "tag": "target" },
  "loseCondition": { "type": "lives_zero" },
  "initialLives": 3,
  "ui": { "showScore": true, "showLives": true }
}
```

---

### 2. Platformer (Mario-style)

**Identity**: Jump between platforms, reach goal or collect items

| Component | Required Value |
|-----------|----------------|
| **Win Condition** | `{ type: "reach_entity", tag: "goal" }` OR `{ type: "collect_all", tag: "collectible" }` |
| **Lose Condition** | `{ type: "entity_destroyed", tag: "player" }` OR `{ type: "entity_exits_screen", tag: "player" }` |
| **Control** | `tap_to_jump` + (`tilt_to_move` OR `buttons`) on player |
| **HUD** | `showScore: true`, `showLives: true` (if multi-life) |

**Required Entities**:
- Player with `control` behavior (jump + horizontal movement)
- Ground/platforms (static)
- Goal entity tagged `"goal"` OR collectibles tagged `"collectible"`
- Optional: hazards tagged `"hazard"`, enemies tagged `"enemy"`

**Required Behaviors**:
```json
{
  "player": [
    { "type": "control", "controlType": "tap_to_jump", "force": 10 },
    { "type": "control", "controlType": "tilt_to_move", "force": 5, "maxSpeed": 8 },
    { "type": "destroy_on_collision", "withTags": ["hazard", "enemy"], "effect": "fade" }
  ],
  "collectible": [
    { "type": "score_on_collision", "withTags": ["player"], "points": 10, "once": true },
    { "type": "destroy_on_collision", "withTags": ["player"], "effect": "fade" }
  ]
}
```

**Example Rules**:
```json
{
  "winCondition": { "type": "reach_entity", "tag": "goal" },
  "loseCondition": { "type": "entity_destroyed", "tag": "player" },
  "ui": { "showScore": true, "showLives": false }
}
```

---

### 3. Breakout/Brick-Breaker (Arkanoid)

**Identity**: Move paddle to bounce ball, destroy all bricks

| Component | Required Value |
|-----------|----------------|
| **Win Condition** | `{ type: "destroy_all", tag: "brick" }` |
| **Lose Condition** | `{ type: "entity_exits_screen", tag: "ball" }` OR `{ type: "lives_zero" }` |
| **Control** | `{ type: "control", controlType: "drag_to_move" }` on paddle (constrained to X-axis) |
| **HUD** | `showScore: true`, `showLives: true` |

**Required Entities**:
- Ball (dynamic, high restitution ~1.0)
- Paddle with `drag_to_move` control (constrained movement)
- Bricks tagged `"brick"` with `destroy_on_collision`
- Walls (static boundaries)

**Required Behaviors**:
```json
{
  "paddle": [
    { "type": "control", "controlType": "drag_to_move" }
  ],
  "brick": [
    { "type": "destroy_on_collision", "withTags": ["ball"], "effect": "fade" },
    { "type": "score_on_collision", "withTags": ["ball"], "points": 10 }
  ]
}
```

**Physics Configuration**:
```json
{
  "world": {
    "gravity": { "x": 0, "y": 0 }
  },
  "ball": {
    "physics": {
      "restitution": 1.0,
      "friction": 0,
      "linearDamping": 0
    }
  }
}
```

**Example Rules**:
```json
{
  "winCondition": { "type": "destroy_all", "tag": "brick" },
  "loseCondition": { "type": "lives_zero" },
  "initialLives": 3,
  "ui": { "showScore": true, "showLives": true }
}
```

---

### 4. Pinball

**Identity**: Use flippers to keep ball in play, hit targets for score

| Component | Required Value |
|-----------|----------------|
| **Win Condition** | `{ type: "score", score: N }` (high score target) |
| **Lose Condition** | `{ type: "lives_zero" }` (balls remaining) |
| **Control** | `{ type: "control", controlType: "tap_to_flip", force: 50 }` on flippers |
| **HUD** | `showScore: true`, `showLives: true` (label as "Balls") |

**Required Entities**:
- Ball (dynamic)
- Left/Right flippers with `tap_to_flip` control
- Bumpers tagged `"bumper"` (high restitution)
- Targets tagged `"target"` for scoring
- Drain zone (sensor at bottom)

**Required Behaviors**:
```json
{
  "flipper_left": [
    { "type": "control", "controlType": "tap_to_flip", "force": 50, "side": "left" }
  ],
  "flipper_right": [
    { "type": "control", "controlType": "tap_to_flip", "force": 50, "side": "right" }
  ],
  "bumper": [
    { "type": "score_on_collision", "withTags": ["ball"], "points": 50 }
  ],
  "target": [
    { "type": "score_on_collision", "withTags": ["ball"], "points": 100 }
  ]
}
```

**Example Rules**:
```json
{
  "winCondition": { "type": "score", "score": 10000 },
  "loseCondition": { "type": "lives_zero" },
  "initialLives": 3,
  "ui": { "showScore": true, "showLives": true },
  "rules": [
    {
      "id": "ball_drain",
      "trigger": { "type": "collision", "entityATag": "ball", "entityBTag": "drain" },
      "actions": [
        { "type": "destroy", "target": { "type": "by_tag", "tag": "ball" } },
        { "type": "modify", "target": { "type": "game" }, "property": "lives", "operation": "subtract", "value": 1 }
      ]
    }
  ]
}
```

---

### 5. Endless Runner

**Identity**: Auto-scroll, jump to avoid obstacles, survive as long as possible

| Component | Required Value |
|-----------|----------------|
| **Win Condition** | `{ type: "score", score: N }` OR `{ type: "survive_time", time: N }` |
| **Lose Condition** | `{ type: "entity_destroyed", tag: "player" }` |
| **Control** | `{ type: "control", controlType: "tap_to_jump", force: 10 }` on player |
| **HUD** | `showScore: true` (distance/score), show time if time-based |

**Required Entities**:
- Player with `tap_to_jump` control
- Ground (scrolling or tiled)
- Obstacles tagged `"obstacle"` (spawned or scrolling)
- Optional: collectibles

**Required Behaviors**:
```json
{
  "player": [
    { "type": "control", "controlType": "tap_to_jump", "force": 10, "cooldown": 0.1 },
    { "type": "destroy_on_collision", "withTags": ["obstacle"], "effect": "fade" }
  ],
  "obstacle_spawner": [
    { "type": "spawn_on_event", "event": "timer", "entityTemplate": "obstacle", "interval": 2, "spawnPosition": "offset", "offset": { "x": 15, "y": 0 } }
  ],
  "obstacle": [
    { "type": "move", "direction": "left", "speed": 5 }
  ]
}
```

**Score Mechanism**: Increment score over time or on distance traveled

**Example Rules**:
```json
{
  "winCondition": { "type": "score", "score": 1000 },
  "loseCondition": { "type": "entity_destroyed", "tag": "player" },
  "ui": { "showScore": true, "showLives": false },
  "rules": [
    {
      "id": "increment_score",
      "trigger": { "type": "timer", "time": 0.1, "repeat": true },
      "actions": [{ "type": "score", "operation": "add", "value": 1 }]
    }
  ]
}
```

---

### 6. Physics Stacker

**Identity**: Drop/place objects to build stable tower

| Component | Required Value |
|-----------|----------------|
| **Win Condition** | `{ type: "score", score: N }` (height or blocks placed) |
| **Lose Condition** | `{ type: "entity_exits_screen", tag: "block" }` (tower collapse) OR time-based |
| **Control** | `tap_to_drop` OR `drag_to_move` for block placement |
| **HUD** | `showScore: true` (height/blocks) |

**Required Entities**:
- Dropping blocks with placement control
- Base/ground (static)
- Boundaries (optional)

**Required Behaviors**:
```json
{
  "block_dropper": [
    { "type": "oscillate", "axis": "x", "amplitude": 4, "frequency": 0.5 },
    { "type": "spawn_on_event", "event": "tap", "entityTemplate": "block", "spawnPosition": "at_self" }
  ],
  "block": [
    { "type": "score_on_collision", "withTags": ["block", "ground"], "points": 10, "once": true }
  ]
}
```

---

### 7. Bumper Arena (Top-Down Sumo)

**Identity**: Push opponents off arena using physics

| Component | Required Value |
|-----------|----------------|
| **Win Condition** | `{ type: "destroy_all", tag: "enemy" }` OR `{ type: "survive_time", time: N }` |
| **Lose Condition** | `{ type: "entity_exits_screen", tag: "player" }` |
| **Control** | `tilt_to_move` OR `drag_to_move` on player |
| **HUD** | `showScore: true`, show time if survival-based |

**Physics Configuration**:
```json
{
  "world": {
    "gravity": { "x": 0, "y": 0 }
  }
}
```

**Required Behaviors**:
```json
{
  "player": [
    { "type": "control", "controlType": "tilt_to_move", "force": 10, "maxSpeed": 15 }
  ],
  "enemy": [
    { "type": "move", "direction": "toward_target", "target": "player", "speed": 3 },
    { "type": "score_on_collision", "withTags": ["boundary"], "points": 100 }
  ]
}
```

---

### 8. Hill Climb / Vehicle

**Identity**: Drive vehicle over terrain using tilt/buttons

| Component | Required Value |
|-----------|----------------|
| **Win Condition** | `{ type: "reach_entity", tag: "finish" }` OR `{ type: "score", score: N }` (distance) |
| **Lose Condition** | `{ type: "entity_destroyed", tag: "vehicle" }` (flip/crash) |
| **Control** | `tilt_to_move` (accelerate/brake) OR `buttons` on vehicle |
| **HUD** | `showScore: true` (distance), show fuel if applicable |

**Required Entities**:
- Vehicle body with wheels (revolute joints)
- Terrain (static, irregular shapes)
- Finish line OR distance markers

---

## Entity Tagging Convention

Consistent tags enable the rules system to work correctly:

| Tag | Purpose | Used In |
|-----|---------|---------|
| `player` | The player-controlled entity | All games with player avatar |
| `goal` | Win condition target | Platformer, Vehicle |
| `target` | Destructible objective | Slingshot, Pinball |
| `brick` | Breakable blocks | Breakout |
| `ball` | Active projectile/ball | Breakout, Pinball, Slingshot |
| `paddle` | Player-controlled reflector | Breakout |
| `obstacle` | Hazard to avoid | Runner, Platformer |
| `hazard` | Instant-death zone | Platformer |
| `enemy` | Hostile entity | Platformer, Arena |
| `collectible` | Pickup item | Platformer, Runner |
| `boundary` | Arena edge (sensor) | Arena, Pinball |
| `drain` | Ball loss zone | Pinball |
| `ground` | Static floor | All with gravity |

---

## HUD Requirements by Game Type

The HUD MUST display information relevant to the win/lose conditions:

| If Win/Lose Uses | HUD Must Show |
|------------------|---------------|
| Score threshold | `showScore: true` |
| Lives/attempts | `showLives: true` |
| Time limit | Timer display |
| Destroy all X | Remaining count (optional but recommended) |
| Collect all | Collected/total count |

---

## Validation Checklist

A game definition is **playable** if ALL are true:

- [ ] `winCondition` is defined with valid type
- [ ] `loseCondition` is defined with valid type
- [ ] At least one entity has `control` behavior
- [ ] Control type matches game archetype
- [ ] Referenced tags in conditions have matching entities
- [ ] HUD shows relevant game state
- [ ] If `lives_zero` lose condition: `initialLives` > 0
- [ ] If `time_up` lose condition: `time` > 0
- [ ] If `score` win condition: `score` > 0 and achievable
- [ ] If `destroy_all`: at least one entity has that tag
- [ ] If `reach_entity`: both mover and target exist
- [ ] If `collect_all`: at least one collectible exists

---

## Quick Reference: Archetype → Required Config

| Archetype | Win Type | Lose Type | Control Type | Gravity |
|-----------|----------|-----------|--------------|---------|
| Slingshot | `destroy_all` | `lives_zero` | `drag_to_aim` | Yes |
| Platformer | `reach_entity` / `collect_all` | `entity_destroyed` | `tap_to_jump` + `tilt_to_move` | Yes |
| Breakout | `destroy_all` | `lives_zero` / `entity_exits_screen` | `drag_to_move` | No |
| Pinball | `score` | `lives_zero` | `tap_to_flip` | Yes |
| Runner | `score` / `survive_time` | `entity_destroyed` | `tap_to_jump` | Yes |
| Stacker | `score` | `entity_exits_screen` | `tap` (spawn) | Yes |
| Arena | `destroy_all` / `survive_time` | `entity_exits_screen` | `tilt_to_move` | No |
| Vehicle | `reach_entity` / `score` | `entity_destroyed` | `tilt_to_move` / `buttons` | Yes |
