# Game Templates Documentation

> Curated game templates with skinnable designs and composable systems

## Overview

This documentation covers the analysis, architecture, and implementation plan for creating **skinnable game templates** - games where the core mechanics are fixed but the visual assets can be swapped to create variations.

## Key Documents

### Architecture

| Document | Description |
|----------|-------------|
| [Composable Systems Architecture](./00-COMPOSABLE-SYSTEMS-ARCHITECTURE.md) | 10 helper systems that layer on top of the core engine to enable diverse game genres. Includes Grid, Path, Spatial Query, Inventory, State Machine, and more. |

### Game Archetype Analyses

| Document | Game Type | Engine Fit | Priority |
|----------|-----------|------------|----------|
| [Top-Down Racing](./04-TOP-DOWN-RACING.md) | Arcade racing, checkpoints, laps | 🟢 Excellent (80-90%) | 1st |
| [Hole.io](./03-HOLE-IO.md) | Top-down eating/growth game | 🟢 Good (70-85%) | 2nd |
| [Tower Defense](./02-TOWER-DEFENSE.md) | Path enemies, placed towers | 🟡 Partial (50-65%) | 3rd |
| [Match-3](./01-MATCH-THREE.md) | Puzzle grid matching | 🔴 Low (30-45%) | 4th |

### Implementation

| Document | Description |
|----------|-------------|
| [Implementation Roadmap](./05-IMPLEMENTATION-ROADMAP.md) | Prioritized week-by-week plan for building templates and engine systems |

## Quick Reference

### Current Engine Strengths
- Physics (Box2D/Godot)
- Entity/Component system
- Behavior composition
- Rules engine with expressions
- Visual effects and particles
- Touch/drag input handling

### Composable Systems Status

All 10 helper systems from the [Composable Systems Architecture](./00-COMPOSABLE-SYSTEMS-ARCHITECTURE.md) have been implemented in `shared/src/systems/`:

| System | Directory | Status | Notes |
|--------|-----------|--------|-------|
| Dynamic Collider | `dynamic-collider/` | ✅ Complete | Fully wired with action executor |
| Spatial Query | `spatial-query/` | ✅ Complete | Expressions in main evaluator |
| Path/Waypoint | `path/` | ✅ Complete | Types & expressions |
| Wave/Spawner | `wave/` | ✅ Complete | Types & expressions |
| Combo/Chain | `combo/` | ✅ Complete | Types & expressions |
| State Machine | `state-machine/` | ✅ Complete | Types & expressions |
| Inventory/Resource | `inventory/` | ✅ Complete | Types & expressions |
| Progression/Unlock | `progression/` | ✅ Complete | Types & expressions |
| Checkpoint/Savepoint | `checkpoint/` | ✅ Complete | Types & expressions |
| Grid/Cell | `grid/` | ✅ Complete | Types & expressions |

**Note**: Types and expression functions are complete. Most systems still need action executors wired into the runtime engine.

### Recommended Order
1. 🔴 **Week 1-2**: Racing + Hole.io (validates architecture)
2. 🟡 **Week 3-4**: Tower Defense (adds path/targeting systems)
3. 🟢 **Week 5-6**: Polish + State/Inventory systems
4. 🔵 **Week 7-8**: Match-3 (requires grid subsystem)

## Template Design Principles

### Fixed Identity
Each template has a **non-negotiable core** that defines what makes it that game:
- Primary player verbs
- Camera perspective
- Win/lose conditions
- Core feedback loop

### Skinnable Layers
Users can customize:
- Visual theme (sprites, backgrounds, colors)
- Audio (music, sound effects)
- Tuning parameters (within safe bounds)
- Content (levels, enemy types, etc.)

### Progressive Customization
Three levels of user customization:
1. **Simple** (ages 6-9): Theme packs, character skins
2. **Medium** (ages 8-12): Physics tuning, difficulty
3. **Deep** (ages 10-14): Level layouts, rule presets

## Related Documentation

- [Game Maker Index](../game-maker/INDEX.md) - Full game maker documentation
- [Behavior System](../game-maker/reference/behavior-system.md) - Entity behaviors
- [Game Rules](../game-maker/reference/game-rules.md) - Rules engine reference
- [Dynamic Mechanics Roadmap](../game-maker/roadmap/dynamic-mechanics-roadmap.md) - Expression system plans

## Status

| Milestone | Status |
|-----------|--------|
| Architecture defined | ✅ Complete |
| Game analyses complete | ✅ Complete |
| Implementation plan | ✅ Complete |
| **Composable systems (types)** | ✅ Complete (all 10) |
| **Composable systems (expressions)** | ✅ Complete (all 10) |
| Composable systems (action executors) | 🟡 Partial (1/10) |
| Racing template | 🔲 Not started |
| Hole.io template | 🔲 Not started |
| Tower Defense template | 🔲 Not started |
| Match-3 template | 🔲 Not started |
