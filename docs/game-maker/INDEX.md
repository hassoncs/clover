# Game Maker Documentation

> **AI-Powered Mobile Game Generation**
>
> An AI-powered mobile game maker that enables children and casual creators (ages 6-14) to build fully functional 2D physics-based games through natural language prompts.

---

## Vision

**Core Premise**: Given a robust game engine architecture with declarative systems, physics (Godot), and AI-powered generation, users can describe a game idea in plain language and receive a playable game within seconds.

> **📚 Engine Architecture**: For complete technical specifications of how the engine works, see **[docs/game-engine-architecture/](../game-engine-architecture/README.md)**

```
User: "I want a game where I launch a ball at towers and knock them down"

AI generates:
  - Game definition (JSON)
  - Sprite assets (AI-generated images)
  - Physics configuration
  - Win/lose conditions

Result: Playable "Angry Birds"-style game in < 30 seconds
```

**Success Metrics**:
- **Generation Success Rate**: >80% of prompts produce playable games
- **Time to Play**: <30 seconds from prompt to playable game

---

## Overview

The Game Maker provides:
- **AI Generation**: Natural language prompts → complete game definitions
- **Entity System**: Declarative game objects with physics and rendering
- **Behavior System**: Composable game logic without code
- **Game Rules**: Win/lose conditions, scoring, triggers
- **Asset Generation**: AI-generated sprites via Scenario.com
- **10 Game Templates**: Pre-built patterns for common game types

**Tech Stack**:
- **Frontend**: React Native (Expo SDK 54)  
- **Physics & Rendering**: Godot 4.3 (native via react-native-godot JSI, web via WASM)
- **API**: Hono + tRPC on Cloudflare Workers
- **Database**: Cloudflare D1
- **AI**: OpenRouter (GPT-4) + Scenario.com (sprites)

---

## Guides

Step-by-step tutorials for game creation and development.

| Document | Description |
|----------|-------------|
| [Testing Asset Generation](guides/testing-asset-generation.md) | Running Scenario.com integration tests |

---

## Reference

> **🏗️ Engine Architecture Moved**: Core system specs now live in **[../game-engine-architecture/](../game-engine-architecture/README.md)**

**For implementation reference, see:**
- [Entity System](../game-engine-architecture/01-core-concepts/entity-system.md)
- [Behavior System](../game-engine-architecture/01-core-concepts/behavior-system.md)  
- [Rules System](../game-engine-architecture/01-core-concepts/rules-system.md)
- [Variables & Expressions](../game-engine-architecture/02-dynamic-mechanics/variables-and-expressions.md)

**Product/editor docs remain here:**
- [Game Patterns](reference/game-patterns.md) | Reusable patterns for puzzle/physics games
- [Input Methods](reference/input-methods-catalog.md) | All supported input types
- [Playability Contract](reference/playability-contract.md) | What makes a game "playable"
- [Data Models & Workflows](reference/data-models-and-workflows.md) | Complete data flow

---

## Architecture

> **🏗️ Engine Architecture Moved**: All engine architecture now in **[../game-engine-architecture/](../game-engine-architecture/README.md)**

**See consolidated architecture:**
- [Master Architecture](../game-engine-architecture/00-MASTER-ARCHITECTURE.md) | Complete system overview ⭐
- [Entity Hierarchy](../game-engine-architecture/00-HIERARCHY-AND-COMPOSABILITY-ANALYSIS.md) | Critical gap analysis
- [Composable Systems](../game-engine-architecture/03-composable-systems/overview.md) | Match3, Grid, Inventory, etc.
- [RFCs](../game-engine-architecture/05-rfcs/) | Design proposals and rationale

**Product architecture docs:**
| Document | Description |
|----------|-------------|
| [Asset Integration Design](architecture/asset-integration-design.md) | Two-phase asset generation pipeline |

---

## Decisions (ADRs)

> **🏗️ Engine RFCs Moved**: Architectural decisions now in **[../game-engine-architecture/05-rfcs/](../game-engine-architecture/05-rfcs/)**

**See:**
- [RFC-001: Derived Values System](../game-engine-architecture/05-rfcs/RFC-001-derived-values.md)
- [RFC-002: Complementary Systems](../game-engine-architecture/05-rfcs/RFC-002-complementary-systems.md)
- [Native Collision Support](../game-engine-architecture/05-rfcs/native-collision-support.md)

**Product decisions:**
| Document | Description |
|----------|-------------|
| [Behavior Extensions](decisions/behavior-extensions.md) | Power behaviors for complex genres |

---

## Planning

> **🏗️ Engine Roadmap Moved**: See **[../game-engine-architecture/02-dynamic-mechanics/roadmap.md](../game-engine-architecture/02-dynamic-mechanics/roadmap.md)**

**Product execution tracking:**

| Document | Description | Status |
|----------|-------------|--------|
| [HUMAN TASKS](planning/HUMAN_TASKS.md) | Blockers requiring human action | active |

---

## Related

- [Physics Engine Documentation](../godot/) - Godot 4 physics backend
- [AI Templates](../game-engine-architecture/06-ai-integration/tier-1-templates.md) - AI-generated template patterns
- [Game Patterns](reference/game-patterns.md) - Reusable physics game patterns
- [Global Documentation Index](../INDEX.md)
