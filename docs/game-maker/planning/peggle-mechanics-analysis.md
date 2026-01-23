# Peggle Mechanics Analysis

## Overview

This document analyzes all game mechanics present in Peggle and evaluates whether our current Slopcade game engine can support them. For missing features, we outline what would need to be built.

---

## Peggle Core Mechanics

### 1. Ball Launcher / Cannon

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Rotating cannon | Cannon rotates to follow cursor/touch | `rotate_toward` behavior with `target: "touch"` | ✅ SUPPORTED |
| Aim indicator | Dotted trajectory line showing predicted path | Not implemented | ❌ MISSING |
| Fire on tap/click | Ball spawns and fires toward aim direction | `tap` trigger + `spawn` + `apply_impulse` with `toward_touch` | ✅ SUPPORTED |
| Ball spawn at cannon | Ball appears at cannon position | `spawn` with `position: { type: "fixed" }` | ✅ SUPPORTED |

### 2. Pegs

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Static circular pegs | Non-moving pegs that ball bounces off | `static` body with `circle` shape | ✅ SUPPORTED |
| Blue pegs (regular) | Standard pegs worth fewer points | Tags + `score_on_collision` | ✅ SUPPORTED |
| Orange pegs (target) | Must-hit pegs to win | Tags + `destroy_all` win condition | ✅ SUPPORTED |
| Green pegs (power-up) | Trigger special abilities | Tags + custom rules | ⚠️ PARTIAL (no power-up system) |
| Purple pegs (bonus) | Extra points, changes each turn | Would need turn-based tag assignment | ❌ MISSING |
| Peg destruction on hit | Pegs disappear after ball contact | `destroy_on_collision` behavior | ✅ SUPPORTED |
| Peg glow/highlight | Visual feedback when hit | `effect: "fade"` exists, but no glow | ⚠️ PARTIAL |
| Delayed destruction | Pegs destroyed after ball exits, not immediately | Not implemented - destroys immediately | ❌ MISSING |

### 3. Level Geometry

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Walls (vertical) | Side boundaries | `static` box bodies | ✅ SUPPORTED |
| Walls (angled/slanted) | Diagonal deflectors | `static` box with `angle` transform | ✅ SUPPORTED |
| Curved walls | Arced surfaces | `polygon` shape could approximate | ⚠️ PARTIAL |
| Moving platforms | Horizontal/vertical movers | `kinematic` body + `oscillate` behavior | ✅ SUPPORTED |
| Spinning wheels | Rotating obstacles | `kinematic` body + `rotate` behavior | ✅ SUPPORTED |
| Teleporters | Ball enters one, exits another | Not implemented | ❌ MISSING |
| Bumpers | High-restitution bounce zones | High `restitution` value (>1.0) | ✅ SUPPORTED |

### 4. Free Ball Bucket

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Moving bucket at bottom | Oscillates left/right | `kinematic` + `oscillate` | ✅ SUPPORTED |
| Catch ball for free ball | Collision grants extra life | `collision` trigger + `lives` action | ✅ SUPPORTED |
| Bucket size changes | Gets smaller as pegs cleared | Would need dynamic sizing | ❌ MISSING |

### 5. Scoring System

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Points per peg | Different values for peg types | `score_on_collision` with `points` | ✅ SUPPORTED |
| Score multiplier | Increases as more pegs hit in one shot | Not implemented | ❌ MISSING |
| Combo system | Bonus for hitting multiple pegs | Not implemented | ❌ MISSING |
| Style shot bonus | Extra points for long shots, etc. | Not implemented | ❌ MISSING |
| Fever mode | End-of-level bonus scoring | Not implemented | ❌ MISSING |

### 6. Ball Physics

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Gravity | Ball falls downward | `world.gravity` | ✅ SUPPORTED |
| Bounce/restitution | Ball bounces off surfaces | `restitution` property | ✅ SUPPORTED |
| Friction | Ball slows on surfaces | `friction` property | ✅ SUPPORTED |
| Ball speed limit | Prevent excessive velocity | `linearDamping` can help | ⚠️ PARTIAL |
| Bullet mode | Accurate collision for fast objects | `bullet: true` | ✅ SUPPORTED |

### 7. Power-Ups (Green Peg Abilities)

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Multi-ball | Spawns additional balls | `spawn` action could work | ⚠️ PARTIAL |
| Super guide | Extended trajectory preview | Not implemented | ❌ MISSING |
| Zen ball | Ball seeks orange pegs | `magnetic` behavior exists | ⚠️ PARTIAL |
| Spooky ball | Ball returns from bottom | Would need custom rule | ⚠️ PARTIAL |
| Fireball | Ball passes through pegs | Would need collision filtering | ❌ MISSING |
| Space blast | Explosion destroys nearby pegs | `gravity_zone` could approximate | ⚠️ PARTIAL |
| Flippers | Pinball-style flippers appear | `kinematic` bodies + input rules | ⚠️ PARTIAL |

### 8. Visual Effects

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Particle effects | Sparkles, explosions | `particle_emitter` behavior | ✅ SUPPORTED |
| Screen shake | Impact feedback | Camera shake not implemented | ❌ MISSING |
| Slow motion | Dramatic moments | Time scale not implemented | ❌ MISSING |
| Peg lighting | Pegs glow when hit | Not implemented | ❌ MISSING |

### 9. UI/HUD

| Feature | Description | Current Support | Status |
|---------|-------------|-----------------|--------|
| Score display | Current score | `showScore` | ✅ SUPPORTED |
| Ball count | Remaining balls | `showLives` with `livesLabel` | ✅ SUPPORTED |
| Orange pegs remaining | Target counter | `entityCountDisplays` | ✅ SUPPORTED |
| Turn indicator | Which shot number | Not implemented | ❌ MISSING |

---

## Summary

### Currently Supported (Can Build Now)
- Basic Peggle gameplay loop
- Cannon aiming and firing
- Peg destruction and scoring
- Win/lose conditions
- Moving bucket for free balls
- Moving platforms and spinning obstacles
- Slanted walls
- Basic particle effects
- Custom HUD displays

### Partially Supported (Workarounds Possible)
- Power-ups (can implement some with existing rules)
- Curved walls (polygon approximation)
- Multi-ball (spawn action)
- Ball speed limiting (damping)

### Missing Features (Need Implementation)

#### High Priority (Core Peggle Feel)
1. **Trajectory Preview Line** - Dotted line showing ball path
2. **Delayed Peg Destruction** - Pegs marked as "hit" but destroyed after ball exits
3. **Score Multiplier System** - Combo/chain scoring
4. **Purple Peg (Bonus Peg)** - Random peg each turn worth extra points

#### Medium Priority (Enhanced Experience)
5. **Teleporters** - Entry/exit portal pairs
6. **Dynamic Bucket Size** - Shrinks as pegs are cleared
7. **Screen Shake** - Camera shake on impacts
8. **Slow Motion** - Time scale control for dramatic moments
9. **Collision Filtering** - Allow ball to pass through certain objects (fireball power-up)

#### Lower Priority (Polish)
10. **Peg Glow Effects** - Visual highlight on hit pegs
11. **Turn Counter** - Track shot number
12. **Fever Mode** - End-of-level bonus phase
13. **Style Shot Detection** - Recognize and reward skillful shots

---

## Implementation Recommendations

### Phase 1: Core Enhancements
1. **Trajectory Preview** - Add raycast/simulation to predict ball path, render as dotted line
2. **Delayed Destruction** - Add `destroyDelay` to `destroy_on_collision` behavior, mark pegs as "hit" visually
3. **Score Multiplier** - Add `scoreMultiplier` variable, increment on each peg hit per turn, reset on ball drain

### Phase 2: Advanced Features
4. **Teleporters** - New behavior type `teleport` with linked entity pairs
5. **Time Scale** - Add `timeScale` to game state, affect physics step
6. **Camera Shake** - Add shake trigger to camera system

### Phase 3: Power-Up System
7. **Power-Up Framework** - Generic system for temporary abilities triggered by green pegs
8. **Collision Layers** - Allow entities to selectively ignore collisions

---

## Conclusion

**Current State**: ~60% of Peggle mechanics are supported. A basic Peggle clone is fully buildable today.

**To reach 90%**: Implement trajectory preview, delayed destruction, and score multipliers.

**To reach 100%**: Add power-up system, teleporters, and visual polish features.

The existing ECS architecture is well-suited for these additions. Most missing features can be added as new behaviors, actions, or UI components without major architectural changes.
