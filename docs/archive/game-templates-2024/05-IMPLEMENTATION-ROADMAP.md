# Game Templates Implementation Roadmap

> Prioritized plan to unlock maximum functionality with minimal effort

## Executive Summary

This roadmap prioritizes **high-impact, low-effort** work first. The goal is to:

1. Ship playable game templates as quickly as possible
2. Build reusable engine primitives that unlock multiple genres
3. Validate the template/skinning system before heavy investment
4. Defer complex systems until simpler ones prove the architecture

---

## Priority Framework

Each work item is scored on:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Impact** | 40% | How many games/features does this unlock? |
| **Effort** | 30% | Development time (lower is better) |
| **Reusability** | 20% | Can this be used beyond the immediate need? |
| **Risk** | 10% | Technical uncertainty (lower is better) |

---

## Phase 1: Foundation (Week 1)
*Goal: Ship first playable template, validate architecture*

### 1.1 Top-Down Racing Template
**Priority: 🔴 CRITICAL | Effort: 2-3 days | Impact: High**

Why first:
- Best engine fit (80-90% coverage today)
- No critical missing systems
- Validates entire pipeline: input → physics → rules → win/lose → skinning
- Creates first "skinnable template" to test asset swap system

Deliverables:
- [ ] Basic oval track with walls
- [ ] Car physics (acceleration, steering, damping)
- [ ] Checkpoint/lap system via rules
- [ ] Win condition (complete N laps)
- [ ] Simple UI (lap count, timer)
- [ ] Asset pack structure for skinning
- [ ] Documentation: how to reskin

### 1.2 Spatial Query Expressions (Engine)
**Priority: 🔴 CRITICAL | Effort: 1 day | Impact: Very High**

Why now:
- Unlocks targeting for Tower Defense
- Unlocks size comparison for Hole.io
- Unlocks proximity triggers for many games
- Low effort, high reusability

Deliverables:
- [ ] `nearest(fromEntity, tags)` expression
- [ ] `entitiesInRadius(pos, radius, tags)` expression
- [ ] `distanceTo(entityA, entityB)` expression
- [ ] `countInRadius(pos, radius, tags)` expression
- [ ] Unit tests
- [ ] Documentation

---

## Phase 2: Expansion (Week 2)
*Goal: Second template, first engine primitive*

### 2.1 Dynamic Collider Resizing (Engine)
**Priority: 🟡 HIGH | Effort: 0.5-1 day | Impact: Medium**

Why now:
- Unlocks Hole.io
- Required for any "growth" mechanic
- Simple implementation (recreate fixture)

Deliverables:
- [ ] `set_collider_size` action
- [ ] Support for circle radius and box dimensions
- [ ] Optional: uniform scale multiplier
- [ ] Test with grow-on-tap demo
- [ ] Documentation

### 2.2 Hole.io Template
**Priority: 🟡 HIGH | Effort: 2-3 days | Impact: High**

Why now:
- Uses new collider resizing
- Tests expression-based game logic
- Different from racing (validates system flexibility)
- Fun and satisfying gameplay

Deliverables:
- [ ] Arena with boundaries
- [ ] Hole entity with size variable
- [ ] Object tiers (small → huge)
- [ ] Consumption rules (size comparison)
- [ ] Growth mechanics
- [ ] Timer-based win condition
- [ ] Asset pack for skinning
- [ ] Documentation

### 2.3 Vehicle Controller Behavior (Engine)
**Priority: 🟡 HIGH | Effort: 1 day | Impact: Medium**

Why now:
- Improves racing feel significantly
- Encapsulates physics tuning
- Reusable for any vehicle-based game

Deliverables:
- [ ] `vehicle_controller` behavior type
- [ ] Acceleration, max speed, braking
- [ ] Speed-dependent turning
- [ ] Lateral friction (drift)
- [ ] Input mapping options (buttons, zones, tilt)
- [ ] Documentation with tuning guide

---

## Phase 3: Path & Targeting (Week 3)
*Goal: Unlock Tower Defense and AI opponents*

### 3.1 Path/Waypoint System (Engine)
**Priority: 🟡 HIGH | Effort: 2 days | Impact: High**

Why now:
- Required for Tower Defense enemies
- Enables AI racing opponents
- Useful for cutscenes, guided tutorials
- Core primitive for many genres

Deliverables:
- [ ] `PathDefinition` type (linear, bezier, catmull-rom)
- [ ] `follow_path` behavior
- [ ] Path interpolation and facing
- [ ] `path_completed` event
- [ ] Expression functions (pathProgress, pathLength)
- [ ] Debug visualization in Storybook
- [ ] Documentation

### 3.2 Target Selection System (Engine)
**Priority: 🟡 HIGH | Effort: 1 day | Impact: High**

Why now:
- Required for Tower Defense targeting
- Builds on spatial queries
- Useful for any auto-aim or seek behavior

Deliverables:
- [ ] `auto_target` behavior
- [ ] Target priority modes (nearest, lowest HP, etc.)
- [ ] `target_nearest` action
- [ ] `targetEntityId` variable convention
- [ ] Works with expressions
- [ ] Documentation

### 3.3 Wave/Spawner System (Engine)
**Priority: 🟡 HIGH | Effort: 1 day | Impact: Medium**

Why now:
- Required for Tower Defense waves
- Useful for endless modes
- Reduces rule complexity for spawn patterns

Deliverables:
- [ ] `WaveDefinition` type
- [ ] `wave_spawner` behavior (or rule-based)
- [ ] Wave events (started, completed, all_complete)
- [ ] Expression functions (currentWave, enemiesRemaining)
- [ ] Documentation

---

## Phase 4: Tower Defense (Week 4)
*Goal: Third template using new systems*

### 4.1 Tower Defense Template
**Priority: 🟡 HIGH | Effort: 3-4 days | Impact: High**

Why now:
- Uses path, targeting, and wave systems
- Validates the composable systems architecture
- Popular game format

Deliverables:
- [ ] Map with path (enemy route)
- [ ] Enemy templates with follow_path
- [ ] Tower templates with auto_target
- [ ] Projectile system
- [ ] Wave-based spawning
- [ ] Economy (kills → currency → tower purchase)
- [ ] Win/lose conditions
- [ ] Asset pack for skinning
- [ ] Multiple tower types (2-3)
- [ ] Multiple enemy types (2-3)
- [ ] Documentation

---

## Phase 5: Polish & Combo (Week 5)
*Goal: Game juice, feedback systems*

### 5.1 Combo/Chain System (Engine)
**Priority: 🟢 MEDIUM | Effort: 1 day | Impact: Medium**

Why now:
- Adds juice to existing templates
- Required for Match-3 scoring
- Low effort, high player satisfaction

Deliverables:
- [ ] `ComboDefinition` type
- [ ] Combo tracking (count, multiplier, timeout)
- [ ] Tier system with events
- [ ] Expression functions
- [ ] Visual feedback integration
- [ ] Documentation

### 5.2 Template Polish Pass
**Priority: 🟢 MEDIUM | Effort: 2-3 days | Impact: Medium**

Why now:
- Make existing templates feel polished
- Test combo system integration
- Prepare for user testing

Deliverables:
- [ ] Racing: drift effects, lap animations, victory screen
- [ ] Hole.io: eat VFX, growth pulse, milestone celebrations
- [ ] Tower Defense: hit effects, wave announcements, tower range preview
- [ ] Sound design pass for all templates
- [ ] Performance optimization

---

## Phase 6: State & Inventory (Week 6)
*Goal: Complex game state management*

### 6.1 State Machine System (Engine)
**Priority: 🟢 MEDIUM | Effort: 2 days | Impact: High**

Why now:
- Enables complex AI
- Cleans up phase management (menu → playing → paused)
- Required for boss fights, multi-stage games

Deliverables:
- [ ] `StateMachineDefinition` type
- [ ] State enter/exit/update actions
- [ ] Transition triggers (event, condition, timeout)
- [ ] Expression functions
- [ ] Visualization for debugging
- [ ] Documentation

### 6.2 Inventory/Resource System (Engine)
**Priority: 🟢 MEDIUM | Effort: 2 days | Impact: Medium**

Why now:
- Formalizes currency systems
- Enables ammo, collectibles, power-ups
- Cleans up variable-based tracking

Deliverables:
- [ ] `InventoryDefinition` and `ResourceDefinition` types
- [ ] Add/remove/transfer actions
- [ ] Expression functions
- [ ] Events (added, removed, depleted)
- [ ] `collectible` behavior
- [ ] Resource regeneration
- [ ] Documentation

---

## Phase 7: Progression (Week 7)
*Goal: Meta-game and persistence*

### 7.1 Checkpoint System (Engine)
**Priority: 🟢 MEDIUM | Effort: 1 day | Impact: Low-Medium**

Why now:
- Improves racing and platformer templates
- Foundation for save/load
- Low effort

Deliverables:
- [ ] `CheckpointDefinition` type
- [ ] Save/load checkpoint actions
- [ ] State capture and restore
- [ ] Documentation

### 7.2 Progression/Unlock System (Engine)
**Priority: 🔵 LOW | Effort: 2 days | Impact: Medium**

Why now:
- Adds replayability to templates
- Enables achievement systems
- Meta-game loop

Deliverables:
- [ ] `ProgressionDefinition` type
- [ ] Achievements, unlockables, stages
- [ ] XP and leveling
- [ ] Expression functions
- [ ] Persistence (device storage)
- [ ] Documentation

---

## Phase 8: Grid System (Week 8+)
*Goal: Match-3 and board games*

### 8.1 Grid/Cell System (Engine)
**Priority: 🔵 LOW | Effort: 4-5 days | Impact: Medium**

Why last:
- Most complex system
- Serves specific genre (puzzle)
- Current engine not well-suited

Deliverables:
- [ ] `GridDefinition` type
- [ ] Cell occupancy tracking
- [ ] Grid-world coordinate conversion
- [ ] Place, move, swap, clear actions
- [ ] Expression functions
- [ ] Grid gravity behavior
- [ ] Pattern matching (for Match-3)
- [ ] Documentation

### 8.2 Match-3 Template
**Priority: 🔵 LOW | Effort: 3-4 days | Impact: Medium**

Deliverables:
- [ ] Board initialization
- [ ] Swap mechanics
- [ ] Match detection
- [ ] Cascade resolution
- [ ] Scoring and combos
- [ ] Win/lose conditions
- [ ] Asset pack for skinning
- [ ] Documentation

---

## Summary: Prioritized Work Items

| Priority | Item | Type | Effort | Week |
|----------|------|------|--------|------|
| 🔴 1 | Top-Down Racing Template | Game | 2-3 days | 1 |
| 🔴 2 | Spatial Query Expressions | Engine | 1 day | 1 |
| 🟡 3 | Dynamic Collider Resizing | Engine | 0.5-1 day | 2 |
| 🟡 4 | Hole.io Template | Game | 2-3 days | 2 |
| 🟡 5 | Vehicle Controller Behavior | Engine | 1 day | 2 |
| 🟡 6 | Path/Waypoint System | Engine | 2 days | 3 |
| 🟡 7 | Target Selection System | Engine | 1 day | 3 |
| 🟡 8 | Wave/Spawner System | Engine | 1 day | 3 |
| 🟡 9 | Tower Defense Template | Game | 3-4 days | 4 |
| 🟢 10 | Combo/Chain System | Engine | 1 day | 5 |
| 🟢 11 | Template Polish Pass | Polish | 2-3 days | 5 |
| 🟢 12 | State Machine System | Engine | 2 days | 6 |
| 🟢 13 | Inventory/Resource System | Engine | 2 days | 6 |
| 🟢 14 | Checkpoint System | Engine | 1 day | 7 |
| 🔵 15 | Progression/Unlock System | Engine | 2 days | 7 |
| 🔵 16 | Grid/Cell System | Engine | 4-5 days | 8 |
| 🔵 17 | Match-3 Template | Game | 3-4 days | 8+ |

---

## Quick Wins (Can Be Done Anytime)

These small improvements can be sprinkled throughout:

| Item | Effort | Impact |
|------|--------|--------|
| Expression: `clamp()`, `lerp()`, `abs()` | 0.5 day | High |
| Expression: `random(min, max)` | 0.25 day | Medium |
| Action: `camera_follow` improvements | 0.5 day | Medium |
| Behavior: `seek_target` (homing projectile) | 0.5 day | Medium |
| Action: `apply_force_at_point` | 0.25 day | Low |
| Event: `entity_entered_bounds` / `exited_bounds` | 0.5 day | Medium |

---

## Dependencies Graph

```
Week 1: Racing Template
           ↓
         Spatial Queries ────────────────────┐
           ↓                                 │
Week 2: Collider Resize → Hole.io           │
         Vehicle Controller                  │
           ↓                                 │
Week 3: Path System ──────┐                  │
         Target System ←──┼──────────────────┘
         Wave System      │
           ↓              │
Week 4: Tower Defense ←───┘
           ↓
Week 5: Combo System → Polish Pass
           ↓
Week 6: State Machine
         Inventory System
           ↓
Week 7: Checkpoint System
         Progression System
           ↓
Week 8: Grid System → Match-3 Template
```

---

## Success Metrics

### Week 2 Checkpoint
- [ ] 2 playable templates (Racing, Hole.io)
- [ ] Templates can be reskinned via asset packs
- [ ] Spatial queries working in expressions
- [ ] Collider resizing working

### Week 4 Checkpoint
- [ ] 3 playable templates (+ Tower Defense)
- [ ] Path system enables AI opponents in racing
- [ ] Wave system manages enemy spawns
- [ ] Targeting system enables tower auto-fire

### Week 6 Checkpoint
- [ ] All 3 templates polished with juice
- [ ] Combo system integrated
- [ ] State machine handles game phases
- [ ] Basic economy/inventory working

### Week 8 Checkpoint
- [ ] 4 playable templates (+ Match-3)
- [ ] Grid system enables puzzle games
- [ ] Progression system adds meta-game
- [ ] All systems documented and tested

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Path system complexity | Medium | High | Start with linear paths, add curves later |
| Grid system delays | High | Medium | Defer Match-3, focus on physics games |
| Performance issues | Low | High | Profile early, optimize spatial queries |
| Skinning system gaps | Medium | Medium | Test with real asset packs early |
| AI generation quality | Medium | Medium | Human-authored templates first, AI later |

---

## Resource Requirements

### Minimum Viable Team
- 1 engineer (full-time)
- 1 designer (part-time for playtesting/tuning)

### Optimal Team
- 1 engineer (engine systems)
- 1 engineer (templates/content)
- 1 designer (playtesting/tuning)
- 1 artist (asset packs)

### Time Estimate
- **Minimum scope (Racing + Hole.io)**: 2 weeks
- **Full scope (all 4 templates)**: 8 weeks
- **With polish and meta-game**: 10-12 weeks

---

## Next Steps

1. **This Week**: Start Racing template immediately
2. **Parallel**: Implement spatial query expressions
3. **Review**: After Week 2, assess skinning system
4. **Decide**: After Week 4, prioritize Match-3 vs. more templates

---

## Document Index

| Document | Description |
|----------|-------------|
| [00-COMPOSABLE-SYSTEMS-ARCHITECTURE.md](./00-COMPOSABLE-SYSTEMS-ARCHITECTURE.md) | Full technical spec for helper systems |
| [01-MATCH-THREE.md](./01-MATCH-THREE.md) | Match-3 analysis and requirements |
| [02-TOWER-DEFENSE.md](./02-TOWER-DEFENSE.md) | Tower Defense analysis and requirements |
| [03-HOLE-IO.md](./03-HOLE-IO.md) | Hole.io analysis and requirements |
| [04-TOP-DOWN-RACING.md](./04-TOP-DOWN-RACING.md) | Racing analysis and requirements |
| [05-IMPLEMENTATION-ROADMAP.md](./05-IMPLEMENTATION-ROADMAP.md) | This document |
