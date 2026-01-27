# Game Engine Architecture - Complete Document Inventory

**Created**: 2026-01-26  
**Purpose**: Master list of ALL game engine architecture documentation  
**Status**: Consolidated from 4 parallel search agents

---

## Summary

Found **60+ documents** across 5 categories related to game engine architecture. This inventory catalogs every piece of architectural documentation about how games are defined, executed, and extended in Slopcade.

---

## Core Systems Documentation

### Entity System & Game Structure

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/reference/entity-system.md` | Reference | GameEntity, EntityTemplate, TransformComponent, SpriteComponent, PhysicsComponent |
| `docs/game-maker/reference/technical-primitives.md` | Reference | Low-level technical primitives |
| `docs/game-maker/architecture/system-overview.md` | Architecture | High-level execution flow: EntityManager, PhysicsSystem, Renderer |
| `docs/godot-migration/MIGRATION_PLAN.md` | Planning | Godot physics integration and entity syncing |

### Behaviors System

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/reference/behavior-system.md` | Reference | Complete catalog of 27+ behaviors: move, rotate, control, spawn_on_event, destroy_on_collision, etc. |
| `docs/game-maker/decisions/behavior-extensions.md` | Design | Proposal for "Power Behaviors": sensors, resources, state machines |
| `docs/game-maker/reference/playability-contract.md` | Reference | Requirements for playable games (control behaviors + win/lose) |

### Rules System

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/reference/game-rules.md` | Reference | Triggers (collision, timer, tap, etc.), Conditions, Actions |
| `docs/game-maker/guides/input-configuration.md` | Guide | "Input as Rules" philosophy |
| `docs/game-maker/planning/unified-input-action-system.md` | Planning | Modern input architecture |
| `docs/game-maker/planning/unified-input-action-implementation-prompt.md` | Planning | Implementation details |
| `docs/game-maker/reference/input-methods-catalog.md` | Reference | All input methods |

---

## Dynamic Mechanics (Variables & Expressions)

### Variables System

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/architecture/tunables-vs-existing-systems-analysis.md` | Analysis | **CRITICAL**: Why tunables = variables + metadata (unified approach) |
| `docs/game-maker/reference/game-patterns.md` | Reference | Examples of variables in real games |
| `docs/game-maker/reference/dynamic-properties.md` | Reference | How properties sync from Godot to expressions |
| `docs/game-maker/reference/property-watching-errors.md` | Troubleshooting | Common expression errors |

### Expression Language

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/rfcs/RFC-001-derived-values-system.md` | RFC | **FOUNDATIONAL**: Expression system design, Value<T> type, parser, evaluator |
| `docs/game-maker/roadmap/dynamic-mechanics-roadmap.md` | Roadmap | **MASTER PLAN**: Phase 1 (Foundation) ✅, Phase 2 (Expansion), Phase 3 (Polish) |

### Complementary Systems

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/rfcs/RFC-002-complementary-game-systems.md` | RFC | Difficulty Curves, Stat Modifiers, Resource Pools, State Machines |

---

## Composable Systems Architecture

### Overview & Master Plan

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-templates/00-COMPOSABLE-SYSTEMS-ARCHITECTURE.md` | Architecture | **MASTER BLUEPRINT**: 10 composable systems (Grid, Path, Inventory, etc.) |

### Specific Systems

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-templates/01-MATCH-THREE.md` | Template | Match-3 mechanics, grid system, match detection |
| `docs/game-templates/02-TOWER-DEFENSE.md` | Template | Path/waypoint system, wave spawning |
| `docs/game-templates/03-HOLE-IO.md` | Template | Dynamic collider, spatial queries |
| `docs/game-templates/04-TOP-DOWN-RACING.md` | Template | Checkpoint system, lap tracking |
| `docs/game-templates/INDEX.md` | Overview | All 10 game templates |

---

## Advanced Features

### Slots System

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/planning/primitives-expansion-plan.md` | Planning | Slots, AttachTo behavior, attachment points |
| `docs/game-maker/planning/primitives-research-summary.md` | Research | Missing primitives analysis |
| `docs/game-maker/planning/primitives-implementation-checklist.md` | Checklist | Implementation tasks for slots |
| `docs/game-maker/ai-generation/tier-1-templates.md` | AI Guide | "Black-box" templates (Match3, Tetris) using logic slots |

### Live Tuning

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/architecture/live-tuning-system.md` | Architecture | Dev-time parameter adjustment UI |

### Tile Systems

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/planning/tile-system.md` | Planning | Tile-based games architecture |
| `docs/game-maker/planning/tile-system-summary.md` | Summary | Tile system overview |

### Camera & Viewport

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/architecture/viewport-and-camera-system.md` | Architecture | Camera types, follow modes, bounds |

---

## Game Templates (10 Types)

| Document | Game Type | Key Mechanics |
|----------|-----------|---------------|
| `docs/game-maker/templates/01-slingshot-destruction.md` | Projectile | Angry Birds style |
| `docs/game-maker/templates/02-rope-physics.md` | Rope/Chain | Cut the Rope style |
| `docs/game-maker/templates/03-endless-runner.md` | Auto-scroller | Subway Surfers style |
| `docs/game-maker/templates/04-hill-climb-vehicle.md` | Vehicle | Hill Climb Racing style |
| `docs/game-maker/templates/05-physics-platformer.md` | Platformer | Jump, run, gravity |
| `docs/game-maker/templates/06-breakout-bouncer.md` | Breakout | Paddle + ball |
| `docs/game-maker/templates/07-pinball-lite.md` | Pinball | Flippers, bumpers |
| `docs/game-maker/templates/08-bumper-arena.md` | Sumo | Push enemies off |
| `docs/game-maker/templates/09-physics-stacker.md` | Stacking | Stack boxes |
| `docs/game-maker/templates/10-ragdoll-goal.md` | Ragdoll | Physics-based character |

---

## AI Integration & Generation

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/reference/ai-integration.md` | Reference | AI game generation, prompt engineering, refinement |
| `docs/game-maker/reference/game-types.md` | Reference | 8 game types AI can generate |
| `docs/game-maker/reference/data-models-and-workflows.md` | Reference | GameDefinition structure, asset workflow |
| `docs/game-maker/ai-generation/tier-1-templates.md` | Guide | Reliable "black-box" templates for AI |

---

## Asset Integration

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/architecture/asset-integration-design.md` | Architecture | Asset packs, sprite generation, R2 storage |
| `docs/game-maker/reference/sprite-generation.md` | Reference | Scenario.com integration |
| `docs/game-maker/plans/asset-system.md` | Plan | Asset generation pipeline |

---

## Planning & Roadmaps

### Current Implementation Status

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/planning/CURRENT_WORK.md` | Status | What's being worked on now |
| `docs/game-maker/planning/implementation-roadmap.md` | Roadmap | Overall implementation timeline |
| `docs/game-maker/planning/mvp-roadmap.md` | Roadmap | MVP milestones |

### Feature-Specific Plans

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/planning/feature-camera-shake.md` | Feature | Camera shake effect |
| `docs/game-maker/planning/feature-teleporters.md` | Feature | Teleport behavior |
| `docs/game-maker/planning/feature-predictive-physics-simulation.md` | Feature | Trajectory preview |
| `docs/game-maker/planning/feature-trajectory-preview.md` | Feature | Aim assist |
| `docs/game-maker/planning/feature-delayed-destruction.md` | Feature | Delayed entity removal |
| `docs/game-maker/planning/feature-time-scale.md` | Feature | Slow motion / fast forward |
| `docs/game-maker/planning/sound-generation-system.md` | Feature | ElevenLabs integration |
| `docs/game-maker/planning/player-control-system.md` | Feature | Player control patterns |

---

## RFCs (Request for Comments)

| Document | Status | Key Content |
|----------|--------|-------------|
| `docs/game-maker/rfcs/RFC-001-derived-values-system.md` | ✅ Implemented | Expression system foundation |
| `docs/game-maker/rfcs/RFC-002-complementary-game-systems.md` | 🚧 In Progress | Stat modifiers, curves, pools |
| `docs/game-maker/rfcs/native-collision-support.md` | ✅ Implemented | JSI bridge for collision events |

---

## Editor & Tooling

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/planning/editor-redesign/INDEX.md` | Overview | Editor redesign master plan |
| `docs/game-maker/planning/editor-redesign/01-architecture.md` | Architecture | Editor architecture |
| `docs/game-maker/planning/editor-redesign/02-phases.md` | Roadmap | Implementation phases |
| `docs/game-maker/planning/editor-redesign/03-components.md` | Design | UI component specs |
| `docs/game-maker/planning/editor-redesign/04-api-design.md` | API | Editor API design |
| `docs/game-maker/planning/editor-redesign/05-wireframes.md` | Design | Visual mockups |
| `docs/game-maker/planning/editor-redesign/06-migration.md` | Migration | Migration strategy |
| `docs/game-maker/planning/editor-redesign/PROGRESS.md` | Status | Current progress |

---

## Infrastructure & Architecture

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/architecture/2d-3d-strategy.md` | Strategy | Why 2D physics for now |
| `docs/game-maker/architecture/app-routes.md` | Architecture | App navigation structure |
| `docs/game-maker/planning/offline-first-architecture.md` | Architecture | Offline-first design |
| `docs/game-maker/planning/infrastructure-plan.md` | Planning | Infrastructure requirements |

---

## Research & Analysis

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/research/market-analysis.md` | Research | Competitive analysis |
| `docs/game-maker/research/asset-integration-investigation.md` | Research | Asset pipeline research |
| `docs/game-maker/planning/peggle-mechanics-analysis.md` | Analysis | Peggle game mechanics |
| `docs/game-maker/planning/physics-stacker-enhancements.md` | Analysis | Stacker game improvements |

---

## Cross-Cutting Concerns

### Game Patterns

| Document | Type | Key Content |
|----------|------|-------------|
| `docs/game-maker/reference/game-patterns.md` | Reference | Common patterns for various mechanics |

### JavaScript & Sandboxing

**Note**: Slopcade does NOT use a traditional sandbox for user-written JavaScript. Instead:

| Approach | Location | Description |
|----------|----------|-------------|
| **Declarative Sandbox** | GameDefinition JSON | Logic restricted to schema (behaviors, rules, expressions) |
| **JSI Bridge** | `docs/game-maker/rfcs/native-collision-support.md` | React Native ↔ Godot communication |
| **Web iframe** | `GodotView.web.tsx` | Godot WASM runs in sandboxed iframe |

The expression evaluator (`shared/src/expressions/evaluator.ts`) is the closest thing to "custom logic", but it's a controlled math/logic language, not arbitrary JS execution.

---

## Documents NOT Included

The following were excluded as they are NOT game engine architecture:

- Asset generation pipeline docs → moved to `docs/asset-generation/`
- Godot integration docs → moved to `docs/godot/`
- API/tRPC routes → implementation details, not architecture
- Test files → covered by code, not docs
- README files → project-level, not engine-level

---

## Recommended Consolidation Structure

Based on this inventory, here's the proposed new structure for `docs/game-engine-architecture/`:

```
docs/game-engine-architecture/
├── INDEX.md                          # Master index (already created)
├── 00-MASTER-ARCHITECTURE.md         # High-level overview
│
├── 01-core-systems/
│   ├── entity-system.md              # From reference/entity-system.md
│   ├── behavior-system.md            # From reference/behavior-system.md
│   ├── rules-system.md               # From reference/game-rules.md
│   ├── physics-integration.md        # From godot-migration/MIGRATION_PLAN.md
│   └── execution-flow.md             # From architecture/system-overview.md
│
├── 02-dynamic-mechanics/
│   ├── variables-system.md           # Consolidated from multiple sources
│   ├── expression-language.md        # From RFC-001 + tests
│   ├── computed-values.md            # From RFC-001
│   ├── roadmap.md                    # From roadmap/dynamic-mechanics-roadmap.md
│   └── tunables-unified.md           # From architecture/tunables-vs-existing-systems-analysis.md
│
├── 03-composable-systems/
│   ├── overview.md                   # From game-templates/00-COMPOSABLE-SYSTEMS-ARCHITECTURE.md
│   ├── match3.md                     # From game-templates/01-MATCH-THREE.md
│   ├── tower-defense.md              # From game-templates/02-TOWER-DEFENSE.md
│   ├── grid-system.md                # Extracted from match3
│   ├── inventory-system.md           # Extracted from composable systems
│   ├── combo-system.md               # Extracted from composable systems
│   ├── path-system.md                # Extracted from tower defense
│   └── slots-registry.md             # From tier-1-templates.md
│
├── 04-advanced-features/
│   ├── slots-attachment.md           # From planning/primitives-expansion-plan.md
│   ├── state-machines.md             # From RFC-002
│   ├── difficulty-curves.md          # From RFC-002
│   ├── live-tuning.md                # From architecture/live-tuning-system.md
│   ├── camera-viewport.md            # From architecture/viewport-and-camera-system.md
│   └── tile-systems.md               # From planning/tile-system.md
│
├── 05-game-templates/
│   ├── overview.md                   # From templates/INDEX.md
│   ├── projectile-games.md           # From templates/01-slingshot-destruction.md
│   ├── rope-physics.md               # From templates/02-rope-physics.md
│   ├── endless-runner.md             # From templates/03-endless-runner.md
│   ├── vehicle-physics.md            # From templates/04-hill-climb-vehicle.md
│   ├── platformer.md                 # From templates/05-physics-platformer.md
│   └── [others].md                   # Rest of templates
│
├── 06-ai-integration/
│   ├── generation-pipeline.md        # From reference/ai-integration.md
│   ├── game-types.md                 # From reference/game-types.md
│   ├── tier-1-templates.md           # From ai-generation/tier-1-templates.md
│   └── prompt-engineering.md         # Extracted from ai-integration.md
│
├── 07-rfcs/
│   ├── RFC-001-derived-values.md     # From rfcs/RFC-001-derived-values-system.md
│   ├── RFC-002-complementary-systems.md  # From rfcs/RFC-002-complementary-game-systems.md
│   └── native-collision-support.md   # From rfcs/native-collision-support.md
│
└── 08-roadmap/
    ├── current-state.md              # What exists today
    ├── dynamic-mechanics.md          # Phase 2/3 of expressions
    ├── phase-2-expansion.md          # Q2 2026
    ├── phase-3-polish.md             # Q3 2026
    └── future-vision.md              # Long-term plans
```

---

## Next Steps

1. ✅ **Create INDEX.md** - Done
2. ✅ **Create DOCUMENT-INVENTORY.md** - Done (this file)
3. ⏳ **Create 00-MASTER-ARCHITECTURE.md** - Next
4. ⏳ **Copy/consolidate docs into new structure** - Agent reviews
5. ⏳ **Update cross-references** - Link fixing
6. ⏳ **Archive old locations** - Add redirect notes

---

## Total Document Count

- **Core Systems**: 7 docs
- **Dynamic Mechanics**: 5 docs
- **Composable Systems**: 5 docs
- **Advanced Features**: 6 docs
- **Game Templates**: 11 docs
- **AI Integration**: 4 docs
- **Planning**: 15+ docs
- **RFCs**: 3 docs
- **Editor**: 7 docs
- **Infrastructure**: 4 docs
- **Research**: 4 docs

**TOTAL**: 60+ documents catalogued
