# Game Engine Architecture - Master Index

**Created**: 2026-01-26  
**Purpose**: Consolidated documentation of the entire Slopcade game engine architecture  
**Status**: Living Document

---

## Overview

This directory consolidates ALL architectural documentation for the Slopcade game engine into a single, coherent knowledge base. Previously, documentation was scattered across `/game-maker/`, `/game-templates/`, and various planning directories.

**What This Is**: The complete technical specification and architectural vision for how games are defined, executed, and dynamically modified in Slopcade.

**What This Is NOT**: Implementation guides, API references for specific functions, or user-facing documentation. (Those remain in their respective directories.)

---

## Directory Structure

```
docs/game-engine-architecture/
├── INDEX.md                              # This file
├── 00-MASTER-ARCHITECTURE.md             # High-level system overview
├── 01-core-concepts/
│   ├── game-definition.md                # GameDefinition structure
│   ├── entity-system.md                  # Entities and templates
│   ├── behavior-system.md                # Declarative behaviors
│   ├── rules-system.md                   # Event-driven rules
│   └── physics-integration.md            # Godot physics bridge
├── 02-dynamic-mechanics/
│   ├── variables-system.md               # Variables + metadata
│   ├── expression-language.md            # Expression syntax & evaluation
│   ├── computed-values.md                # Value<T> and resolution
│   └── roadmap.md                        # Phase 2/3 planned features
├── 03-composable-systems/
│   ├── overview.md                       # Composable systems architecture
│   ├── match3-system.md                  # Match-3 games
│   ├── grid-system.md                    # Grid-based mechanics
│   ├── inventory-system.md               # Items and resources
│   ├── combo-system.md                   # Combo tracking
│   └── slots-registry.md                 # Slot-based extensibility
├── 04-advanced-features/
│   ├── slots-attachment.md               # Entity attachment points
│   ├── state-machines.md                 # Entity/game state machines
│   ├── difficulty-curves.md              # Dynamic difficulty (planned)
│   ├── sandbox-javascript.md             # Custom JS execution (planned)
│   └── live-tuning.md                    # Dev-time parameter adjustment
├── 05-rfcs/
│   ├── RFC-001-derived-values.md         # Expression system design
│   ├── RFC-002-complementary-systems.md  # Stat modifiers, curves, pools
│   └── tunables-analysis.md              # Why tunables = variables + metadata
└── 06-implementation-roadmap/
    ├── current-state.md                  # What exists today
    ├── phase-2-expansion.md              # Q2 2026 features
    ├── phase-3-polish.md                 # Q3 2026 features
    └── future-vision.md                  # Long-term aspirations
```

---

## Quick Navigation

### Core Systems (What Exists Today)

| System | Doc | Status | Description |
|--------|-----|--------|-------------|
| **Entities** | [01-core-concepts/entity-system.md](#) | ✅ Complete | Templates, instances, transforms, physics |
| **Behaviors** | [01-core-concepts/behavior-system.md](#) | ✅ Complete | Declarative entity logic (move, rotate, spawn, etc.) |
| **Rules** | [01-core-concepts/rules-system.md](#) | ✅ Complete | Event-driven game logic (triggers + actions) |
| **Variables** | [02-dynamic-mechanics/variables-system.md](#) | ✅ Complete | Runtime state + design-time tunables |
| **Expressions** | [02-dynamic-mechanics/expression-language.md](#) | ✅ Complete | Math/logic formulas for computed values |
| **Slots (Attachment)** | [04-advanced-features/slots-attachment.md](#) | ✅ Complete | Physical attachment points on entities |
| **Composable Systems** | [03-composable-systems/overview.md](#) | ✅ Complete | Match3, Grid, Inventory, Combo, etc. |

### Planned Systems (Roadmap)

| System | Doc | Phase | Description |
|--------|-----|-------|-------------|
| **Difficulty Curves** | [04-advanced-features/difficulty-curves.md](#) | Q2 2026 | Progressive challenge scaling |
| **Resource Pools** | [02-dynamic-mechanics/computed-values.md](#) | Q2 2026 | Health, mana, stamina systems |
| **State Machines** | [04-advanced-features/state-machines.md](#) | Q3 2026 | FSM for entities and game flow |
| **Stat Modifiers** | [05-rfcs/RFC-002-complementary-systems.md](#) | Q3 2026 | Buffs, debuffs, stacking rules |
| **Sandbox JS** | [04-advanced-features/sandbox-javascript.md](#) | Future | AI-generated custom logic |

---

## Key Architectural Decisions

### 1. **Unified Variables System** (2026-01-26)

**Decision**: DO NOT create separate "tunables" system. Instead, enhance Variables with optional metadata.

**Rationale**: 97% overlap between proposed tunables and existing variables. Adding tunables would create:
- Duplicate concepts
- Confusion about which system to use
- Maintenance burden of two parallel systems

**Implementation**: `GameDefinition.variableMetadata` with `tunable`, `range`, `category`, `description` fields.

**Doc**: [05-rfcs/tunables-analysis.md](#)

### 2. **Expression-First Design** (2026-01-21)

**Decision**: Use string-based expressions (`{ expr: "5 + score * 0.1" }`) rather than visual node graphs.

**Rationale**: 
- AI-compatible (LLMs can generate expressions easily)
- Human-readable in JSON
- Simple to parse and evaluate
- Aligns with industry standards (Unity's formula fields, Godot's expressions)

**Doc**: [05-rfcs/RFC-001-derived-values.md](#)

### 3. **Slot Registry Pattern** (2026-01-21)

**Decision**: Use slot-based extensibility for composable systems (Match3, Tetris, etc.)

**Rationale**:
- AI doesn't need to understand complex algorithms
- Provides curated "black box" implementations
- Game designers pick from pre-built options
- Reduces AI generation errors

**Doc**: [03-composable-systems/slots-registry.md](#)

### 4. **Behaviors + Rules Duality** (2024)

**Decision**: Keep both Behaviors (entity-attached) and Rules (global event-driven) as separate systems.

**Rationale**:
- Behaviors: Continuous, per-entity logic (movement, rotation)
- Rules: Discrete, global reactions (scoring, spawning)
- Different mental models for different patterns
- Both needed for expressive game design

**Doc**: [00-MASTER-ARCHITECTURE.md](#)

---

## How To Use This Documentation

### For New Team Members

1. Start with [00-MASTER-ARCHITECTURE.md](#) for the big picture
2. Read the Core Concepts (01) in order
3. Skim Dynamic Mechanics (02) to understand the expression system
4. Browse Composable Systems (03) to see advanced features
5. Refer back as needed when working on specific systems

### For AI Systems

When generating games or features:
1. Reference [02-dynamic-mechanics/expression-language.md](#) for syntax
2. Reference [01-core-concepts/behavior-system.md](#) for available behaviors
3. Reference [01-core-concepts/rules-system.md](#) for trigger/action pairs
4. Use [03-composable-systems/match3-system.md](#) for Match-3 games
5. Follow conventions in [06-implementation-roadmap/current-state.md](#)

### For Architecture Decisions

1. Check existing RFCs (05) before proposing new systems
2. Review [tunables-analysis.md](#) as example of consolidation over duplication
3. Update roadmap docs (06) when priorities change
4. Add new RFCs for major architectural changes

---

## Maintenance Guidelines

### When To Update These Docs

- ✅ **DO UPDATE** when:
  - Adding new core systems or features
  - Making architectural decisions that affect multiple systems
  - Changing how systems interact
  - Deprecating old approaches
  - Completing roadmap phases

- ❌ **DON'T UPDATE** for:
  - Bug fixes that don't change architecture
  - Implementation details (those go in code comments)
  - API reference updates (those go in TypeDoc)
  - Temporary workarounds

### Document Lifecycle

1. **RFC** → Proposal for new system or major change
2. **Roadmap** → Approved RFC with timeline and phases
3. **Architecture** → System exists, document how it works
4. **Reference** → Detailed usage guide (moves to /reference/ dir)

### Cross-References

Many docs reference each other. When moving or renaming files:
1. Search for the old path in all markdown files
2. Update all links
3. Add redirect note in old location if needed

---

## Source Material

This consolidation drew from the following original locations:

### Primary Sources

- `docs/game-maker/architecture/` → Core architectural docs
- `docs/game-maker/rfcs/` → Request for Comments (design proposals)
- `docs/game-maker/roadmap/` → Feature roadmaps and timelines
- `docs/game-maker/reference/` → System reference docs
- `docs/game-templates/00-COMPOSABLE-SYSTEMS-ARCHITECTURE.md` → Composable systems overview

### Secondary Sources

- `docs/game-maker/planning/primitives-*.md` → Planned features
- `docs/game-maker/planning/unified-input-action-system.md` → Input architecture
- `shared/src/expressions/__tests__/*.test.ts` → Expression examples
- `shared/src/systems/*/` → System implementations

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-26 | Initial consolidation | Sisyphus (AI) + User |

---

## Related Documentation

- **User Guides**: `docs/game-maker/guides/`
- **API Reference**: `packages/docs/api-reference/`
- **Implementation Details**: Code comments in `app/lib/game-engine/`, `shared/src/`
- **Asset System**: `docs/asset-generation/`
- **Godot Integration**: `docs/godot/`

---

## Questions or Gaps?

If you find missing documentation or architectural ambiguities:
1. Search existing docs first (use grep/ripgrep)
2. Check git history for context
3. Ask the team in #engineering channel
4. File an issue with `docs` label
5. Update this index when resolved
