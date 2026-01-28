# Game Engine Architecture

> **The definitive technical guide for the Slopcade Game Engine.**
>
> This document consolidates all core architecture, system designs, and future roadmaps.
> It serves as the single source of truth for all engineers working on the engine.

---

## 🏗️ Architecture Overview

| Document | Description | Status |
|----------|-------------|--------|
| **[Master Architecture](00-MASTER-ARCHITECTURE.md)** | Complete high-level overview of the entire engine | **Up to Date** |
| **[Entity Hierarchy & Composability](00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md)** | Deep dive into entity structure, components, and ECS patterns | **Up to Date** |

---

## 🛠️ Feature Summary (Implementation Status)

This table tracks the status of major engine features.

| Feature | Doc Link | Status | Description |
|---|---|---|---|
| **Entity System** | [01-core-concepts/entity-system.md](#) | ✅ Complete | Declarative game objects and composition |
| **Behavior System** | [01-core-concepts/behavior-system.md](#) | ✅ Complete | Modular game logic (e.g., MoveTo, Spawn) |
| **Rules System** | [01-core-concepts/rules-system.md](#) | ✅ Complete | Win/lose conditions, score, timers |
| **Variables & Expressions** | [02-dynamic-mechanics/variables-and-expressions.md](#) | ✅ Complete | Runtime evaluation of dynamic values |
| **Containers** | [03-composable-systems/container-system.md](#) | ✅ Complete | Slots, grids, decks (e.g., Match 3, Inventory) |
| **State Machines** | [04-advanced-features/state-machines.md](#) | 🚧 Phase 3 | FSM for entities and game flow |
| **Stat Modifiers** | [05-rfcs/RFC-002-complementary-systems.md](#) | 🚧 Phase 3 | Buffs, debuffs, stacking rules |
| **Sandbox JS** | [04-advanced-features/sandbox-javascript.md](#) | Backlog | AI-generated custom logic |
| **Procedural Levels** | [07-future-ideas/procedural-peggle-levels.md](#) | Backlog | Endless Peggle-style level generation |

---

## 🗃️ Index

### 01 Core Concepts
*   [Entity System](01-core-concepts/entity-system.md)
*   [Behavior System](01-core-concepts/behavior-system.md)
*   [Rules System](01-core-concepts/rules-system.md)

### 02 Dynamic Mechanics
*   [Roadmap](02-dynamic-mechanics/roadmap.md)
*   [Variables and Expressions](02-dynamic-mechanics/variables-and-expressions.md)

### 03 Composable Systems
*   [Overview](03-composable-systems/overview.md)
*   [Container System](03-composable-systems/container-system.md)
*   [Match-3 System](03-composable-systems/match-3-system.md)
*   [Grid System](03-composable-systems/grid-system.md)
*   [Inventory System](03-composable-systems/inventory-system.md)
*   [Deck System](03-composable-systems/deck-system.md)

### 04 Advanced Features
*   [Overview](04-advanced-features/overview.md)
*   [State Machines](04-advanced-features/state-machines.md)
*   [Waypoint Architecture](04-advanced-features/waypoint-architecture.md)
*   [Sandbox Javascript](04-advanced-features/sandbox-javascript.md)

### 05 Design Proposals (RFCs)
*   [RFC-001: Derived Values System](05-rfcs/RFC-001-derived-values.md)
*   [RFC-002: Complementary Systems](05-rfcs/RFC-002-complementary-systems.md)
*   [RFC-003: Event-Driven State Machines](05-rfcs/RFC-003-event-driven-state-machines.md)
*   [Native Collision Support](05-rfcs/native-collision-support.md)
*   [Entity Debugging](05-rfcs/entity-debugging.md)

### 06 AI Integration
*   [Overview](06-ai-integration/overview.md)
*   [Tier 1 Templates](06-ai-integration/tier-1-templates.md)

### 07 Future Ideas
*   [Procedural Peggle Levels](07-future-ideas/procedural-peggle-levels.md)

---

## 📁 File Structure

```
├── 00-MASTER-ARCHITECTURE.md
├── 00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md
├── 01-core-concepts/
│   ├── entity-system.md
│   ├── behavior-system.md
│   └── rules-system.md
├── 02-dynamic-mechanics/
│   ├── roadmap.md
│   └── variables-and-expressions.md
├── 03-composable-systems/
│   ├── overview.md
│   ├── container-system.md
│   ├── match-3-system.md
│   ├── grid-system.md
│   ├── inventory-system.md
│   └── deck-system.md
├── 04-advanced-features/
│   ├── overview.md
│   ├── state-machines.md
│   ├── waypoint-architecture.md
│   └── sandbox-javascript.md
├── 05-rfcs/
│   ├── RFC-001-derived-values.md
│   ├── RFC-002-complementary-systems.md
│   ├── RFC-003-event-driven-state-machines.md
│   ├── native-collision-support.md
│   ├── entity-debugging.md
│   └── README.md
├── 06-implementation-roadmap/
│   ├── current-state.md                  # What exists today
│   ├── phase-2-expansion.md              # Q2 2026 features
│   ├── phase-3-polish.md                 # Q3 2026 features
│   └── future-vision.md                  # Long-term aspirations
└── 07-future-ideas/
    └── procedural-peggle-levels.md       # Endless level generation concept
```