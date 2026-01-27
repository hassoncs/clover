# RFC-002: Complementary Game Systems

> **Status**: Draft  
> **Author**: AI Assistant  
> **Created**: 2026-01-21  
> **Depends On**: RFC-001 (Derived Values System)

## Summary

This RFC outlines additional game systems that would dramatically enhance the game maker's capabilities when combined with the Derived Values System (RFC-001). These systems represent common patterns found in successful games that could be declaratively configured in JSON.

---

## System Overview

| System | Purpose | Synergy with Derived Values |
|--------|---------|----------------------------|
| **Stat Modifiers** | Stackable buffs/debuffs | Modifiers feed into expressions |
| **Difficulty Curves** | Progressive challenge | Curves define variables used in expressions |
| **State Machines** | Entity behavior states | State determines which expressions apply |
| **Cooldown System** | Rate limiting | Cooldowns can be expression-based |
| **Resource Pools** | Mana, stamina, ammo | Pool values usable in expressions |
| **Achievement System** | Progress tracking | Achievements unlock modifiers |
| **Combo System** | Chained actions | Combo count feeds expressions |

---

## 1. Stat Modifier System

### Problem
Games often need stackable, temporary modifications to values:
- Power-ups that increase speed for 10 seconds
- Debuffs that reduce damage while poisoned
- Equipment bonuses that stack

### Design

```json
{
  "modifierDefinitions": {
    "speed_boost": {
      "target": "player.speed",
      "type": "multiply",
      "value": 1.5,
      "duration": 10,
      "stackable": false
    },
    "damage_reduction": {
      "target": "player.damage",
      "type": "multiply", 
      "value": 0.5,
      "duration": null,
      "stackable": true,
      "maxStacks": 3
    }
  }
}
```

### Modifier Types

| Type | Formula | Example |
|------|---------|---------|
| `add` | `base + value` | +10 speed |
| `multiply` | `base * value` | 1.5x damage |
| `set` | `value` | Set health to 100 |
| `min` | `min(base, value)` | Cap at 50 |
| `max` | `max(base, value)` | At least 10 |

### Application Order

```
1. Base value
2. All 'add' modifiers (summed)
3. All 'multiply' modifiers (multiplied together)
4. All 'min' modifiers (take minimum)
5. All 'max' modifiers (take maximum)
```

### Integration with Expressions

Modifiers create implicit variables:
```json
{
  "speed": { "expr": "baseSpeed * speedModifier" }
}
```

Where `speedModifier` is automatically computed from active modifiers.

---

## 2. Difficulty Curve System

### Problem
Most games need difficulty that scales with progress, but the scaling logic is often hardcoded.

### Design

```json
{
  "difficulty": {
    "driver": "score",
    "thresholds": [0, 500, 1500, 3000, 5000],
    
    "curves": {
      "enemySpeed": {
        "type": "linear",
        "values": [3, 4, 5, 6, 8]
      },
      "spawnRate": {
        "type": "exponential",
        "start": 2.0,
        "end": 0.3,
        "curve": 0.5
      },
      "enemyHealth": {
        "type": "stepped",
        "values": [50, 75, 100, 150, 200]
      }
    }
  }
}
```

### Curve Types

| Type | Description | Use Case |
|------|-------------|----------|
| `linear` | Interpolate between threshold values | Gradual speed increase |
| `exponential` | Exponential interpolation | Spawn rate acceleration |
| `stepped` | Jump at thresholds | Discrete difficulty tiers |
| `custom` | Expression-based | Complex formulas |

### Exposed Variables

The difficulty system exposes variables for expressions:
- `difficulty.level` - Current threshold index (0-4)
- `difficulty.progress` - Progress to next threshold (0-1)
- `difficulty.enemySpeed` - Current curve value
- `difficulty.spawnRate` - Current curve value

---

## 3. Entity State Machine

### Problem
Entities often have distinct behavioral states (idle, chasing, attacking, fleeing) with different parameters in each state.

### Design

```json
{
  "templates": {
    "enemy": {
      "stateMachine": {
        "initial": "patrol",
        "states": {
          "patrol": {
            "behaviors": [
              { "type": "move", "direction": "right", "speed": 2 }
            ],
            "transitions": [
              { "to": "chase", "when": { "expr": "distanceToPlayer < 5" } }
            ]
          },
          "chase": {
            "behaviors": [
              { "type": "follow", "target": "player", "speed": 5 }
            ],
            "transitions": [
              { "to": "attack", "when": { "expr": "distanceToPlayer < 1" } },
              { "to": "patrol", "when": { "expr": "distanceToPlayer > 10" } }
            ]
          },
          "attack": {
            "behaviors": [
              { "type": "spawn_on_event", "event": "timer", "interval": 0.5, "template": "projectile" }
            ],
            "transitions": [
              { "to": "chase", "when": { "expr": "distanceToPlayer > 2" } }
            ]
          }
        }
      }
    }
  }
}
```

### State-Specific Variables

Each state can define local variables:
```json
{
  "states": {
    "enraged": {
      "variables": {
        "speedMultiplier": 2,
        "damageMultiplier": 1.5
      },
      "behaviors": [
        { "type": "move", "speed": { "expr": "baseSpeed * speedMultiplier" } }
      ]
    }
  }
}
```

### Exposed for Expressions

- `self.state` - Current state name
- `self.stateTime` - Time in current state
- `self.previousState` - Previous state name

---

## 4. Cooldown System

### Problem
Many game mechanics need rate limiting: shooting, dashing, abilities.

### Current Limitation
Cooldowns are implemented per-behavior with `cooldown` property, but they're not observable or modifiable.

### Enhanced Design

```json
{
  "cooldowns": {
    "player.shoot": {
      "base": 0.5,
      "min": 0.1,
      "modifiable": true
    },
    "player.dash": {
      "base": 2.0,
      "charges": 2,
      "rechargeTime": 3.0
    }
  }
}
```

### Exposed for Expressions

- `cooldown.shoot.ready` - Boolean, is cooldown available
- `cooldown.shoot.remaining` - Seconds until ready
- `cooldown.shoot.progress` - 0-1 progress to ready
- `cooldown.dash.charges` - Available charges

### Dynamic Cooldowns

```json
{
  "cooldowns": {
    "shoot": {
      "duration": { "expr": "baseCooldown * (1 - attackSpeedBonus)" }
    }
  }
}
```

---

## 5. Resource Pool System

### Problem
Games need managed resources: health, mana, stamina, ammo, energy.

### Design

```json
{
  "resourcePools": {
    "player.health": {
      "max": 100,
      "current": 100,
      "regen": 0,
      "depleteAction": "lose"
    },
    "player.mana": {
      "max": { "expr": "baseMana + intelligence * 10" },
      "current": { "expr": "max" },
      "regen": { "expr": "manaRegen * (1 + wisdom * 0.1)" },
      "regenDelay": 2.0
    },
    "player.stamina": {
      "max": 100,
      "current": 100,
      "regen": 20,
      "regenCondition": { "expr": "!self.isMoving" }
    }
  }
}
```

### Pool Operations

Behaviors and rules can interact with pools:
```json
{
  "behaviors": [
    {
      "type": "control",
      "controlType": "tap_to_shoot",
      "resourceCost": { "pool": "mana", "amount": 10 }
    }
  ]
}
```

### Exposed for Expressions

- `player.health` - Current value
- `player.health.max` - Maximum value
- `player.health.percent` - Current / Max (0-1)
- `player.health.missing` - Max - Current

---

## 6. Achievement/Milestone System

### Problem
Games benefit from tracking progress and rewarding milestones.

### Design

```json
{
  "achievements": {
    "first_blood": {
      "name": "First Blood",
      "condition": { "expr": "totalKills >= 1" },
      "rewards": [
        { "type": "modifier", "id": "damage_boost_small", "permanent": true }
      ]
    },
    "speed_demon": {
      "name": "Speed Demon",
      "condition": { "expr": "maxSpeed >= 15" },
      "rewards": [
        { "type": "unlock", "template": "speed_trail_effect" }
      ]
    },
    "combo_master": {
      "name": "Combo Master",
      "condition": { "expr": "maxCombo >= 50" },
      "rewards": [
        { "type": "variable", "name": "comboMultiplierBonus", "value": 0.1 }
      ]
    }
  }
}
```

### Tracked Statistics

The achievement system automatically tracks:
- `totalKills`, `totalDeaths`
- `maxCombo`, `totalCombos`
- `highScore`, `totalScore`
- `playTime`, `longestRun`
- `enemiesDefeated.{type}` - Per-type counts

### Exposed for Expressions

- `achievements.first_blood.unlocked` - Boolean
- `achievements.unlocked` - Count of unlocked achievements
- `stats.totalKills` - Lifetime statistic

---

## 7. Combo System

### Problem
Combo mechanics add depth to action games but are complex to implement.

### Design

```json
{
  "comboSystem": {
    "window": 2.0,
    "decayRate": { "expr": "1 / (1 + comboCount * 0.1)" },
    "maxCombo": 99,
    
    "tiers": [
      { "min": 5, "name": "Nice!", "multiplier": 1.2 },
      { "min": 10, "name": "Great!", "multiplier": 1.5 },
      { "min": 25, "name": "Awesome!", "multiplier": 2.0 },
      { "min": 50, "name": "INCREDIBLE!", "multiplier": 3.0 }
    ],
    
    "incrementOn": ["enemy_destroyed", "collectible_picked"],
    "resetOn": ["player_hit", "combo_timeout"]
  }
}
```

### Combo-Aware Scoring

```json
{
  "behaviors": [
    {
      "type": "score_on_collision",
      "points": { "expr": "basePoints * comboMultiplier" }
    }
  ]
}
```

### Exposed for Expressions

- `combo.count` - Current combo count
- `combo.multiplier` - Current multiplier
- `combo.tier` - Current tier name
- `combo.timeRemaining` - Time until decay
- `combo.active` - Boolean, combo > 0

---

## 8. Wave/Level System

### Problem
Many games have discrete waves or levels with escalating challenges.

### Design

```json
{
  "waveSystem": {
    "type": "endless",
    "startWave": 1,
    
    "waveDefinition": {
      "duration": { "expr": "30 + wave * 5" },
      "spawnBudget": { "expr": "10 + wave * 5" },
      "spawns": [
        { "template": "basic_enemy", "cost": 1, "weight": { "expr": "max(0, 10 - wave)" } },
        { "template": "fast_enemy", "cost": 2, "weight": { "expr": "wave" } },
        { "template": "tank_enemy", "cost": 5, "weight": { "expr": "max(0, wave - 3)" } },
        { "template": "boss_enemy", "cost": 20, "weight": { "expr": "wave >= 5 ? 1 : 0" } }
      ]
    },
    
    "betweenWaves": {
      "duration": 5,
      "actions": [
        { "type": "event", "name": "wave_complete" },
        { "type": "score", "operation": "add", "value": { "expr": "wave * 100" } }
      ]
    }
  }
}
```

### Exposed for Expressions

- `wave` - Current wave number
- `wave.time` - Time into current wave
- `wave.progress` - 0-1 progress through wave
- `wave.enemiesRemaining` - Spawned but not destroyed
- `wave.isActive` - Boolean, wave in progress

---

## Implementation Priority

Based on value delivered vs complexity:

### High Priority (Immediate value, moderate effort)

1. **Difficulty Curves** - Most games need this, straightforward to implement
2. **Resource Pools** - Health/mana are fundamental, expression-friendly
3. **Combo System** - Huge gameplay impact, well-defined scope

### Medium Priority (Good value, more complex)

4. **Stat Modifiers** - Enables rich customization, needs careful design
5. **Cooldown System** - Extension of existing system
6. **Wave System** - Common pattern, moderate complexity

### Lower Priority (Specialized, complex)

7. **State Machines** - Powerful but complex, may not be needed for all games
8. **Achievement System** - Nice-to-have, requires persistence

---

## Integration Example

A complete game using multiple systems:

```json
{
  "metadata": { "title": "Arena Survivor" },
  
  "variables": {
    "baseSpeed": 5,
    "baseDamage": 10
  },
  
  "difficulty": {
    "driver": "wave",
    "curves": {
      "enemyHealth": { "type": "linear", "start": 50, "end": 200 },
      "spawnRate": { "type": "exponential", "start": 2, "end": 0.5 }
    }
  },
  
  "resourcePools": {
    "player.health": { "max": 100, "regen": 5 },
    "player.energy": { "max": 50, "regen": 10 }
  },
  
  "comboSystem": {
    "window": 1.5,
    "tiers": [
      { "min": 5, "multiplier": 1.5 },
      { "min": 15, "multiplier": 2.5 }
    ]
  },
  
  "modifierDefinitions": {
    "rage": {
      "target": "player.damage",
      "type": "multiply",
      "value": { "expr": "1 + (1 - player.health.percent) * 0.5" }
    }
  },
  
  "templates": {
    "player": {
      "behaviors": [
        { 
          "type": "move", 
          "speed": { "expr": "baseSpeed * speedModifier * (combo.active ? 1.2 : 1)" }
        },
        {
          "type": "control",
          "controlType": "tap_to_shoot",
          "resourceCost": { "pool": "energy", "amount": 5 }
        }
      ]
    },
    "enemy": {
      "properties": {
        "health": { "expr": "difficulty.enemyHealth" }
      },
      "behaviors": [
        { "type": "health", "maxHealth": { "expr": "self.health" } },
        { 
          "type": "score_on_destroy", 
          "points": { "expr": "10 * combo.multiplier * difficulty.level" }
        }
      ]
    }
  },
  
  "waveSystem": {
    "waveDefinition": {
      "spawnBudget": { "expr": "10 + wave * 3" }
    }
  }
}
```

This game automatically features:
- Increasing difficulty per wave
- Combo-multiplied scoring
- Rage damage boost when low health
- Energy-gated shooting
- Health regeneration
- Dynamic enemy health

---

## Next Steps

1. Complete RFC-001 (Derived Values) as foundation
2. Implement Difficulty Curves (highest immediate value)
3. Implement Resource Pools (fundamental for most games)
4. Implement Combo System (high engagement impact)
5. Evaluate need for remaining systems based on game maker feedback

---

## References

- [RFC-001: Derived Values System](./RFC-001-derived-values-system.md)
- [Behavior System](../reference/behavior-system.md)
- [Rules System](../reference/rules-system.md)
