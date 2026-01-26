# Game Maker Documentation

> **AI-Powered Mobile Game Generation**
>
> An AI-powered mobile game maker that enables children and casual creators (ages 6-14) to build fully functional 2D physics-based games through natural language prompts.

---

## Vision

**Core Premise**: Given a robust game engine (Godot 4) with physics and rendering, combined with AI image generation and a well-structured game framework, users can describe a game idea in plain language and receive a playable game within seconds.

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

**Tech Stack**: React Native (Expo) + Godot 4 (native/WASM) + tRPC + Cloudflare D1

---

## Guides

Step-by-step tutorials for game creation and development.

| Document | Description |
|----------|-------------|
| [Testing Asset Generation](guides/testing-asset-generation.md) | Running Scenario.com integration tests |

---

## Reference

API documentation and system specifications.

| Document | Description |
|----------|-------------|
| [Entity System](reference/entity-system.md) | Entity structure, components, templates |
| [Behavior System](reference/behavior-system.md) | Declarative game logic behaviors |
| [Game Rules](reference/game-rules.md) | Triggers, conditions, actions, win/lose |
| [Game Types](reference/game-types.md) | Catalog of supported game genres |
| [AI Integration](reference/ai-integration.md) | Prompt → game generation pipeline |
| [AI Generation: Tier 1](ai-generation/tier-1-templates.md) | Curated templates for AI generation |
| [Sprite Generation](reference/sprite-generation.md) | AI asset generation with Scenario.com |
| [Technical Primitives](reference/technical-primitives.md) | Core building blocks for 2D games |
| [Data Models & Workflows](reference/data-models-and-workflows.md) | Complete data flow from prompt to game |

---

## Architecture

System design and component relationships.

| Document | Description |
|----------|-------------|
| [System Architecture](architecture/system-overview.md) | Frontend, backend, runtime engine |
| [2D/3D Strategy](architecture/2d-3d-strategy.md) | Supporting both 2D and 3D physics |
| [Asset Integration Design](architecture/asset-integration-design.md) | Two-phase asset generation pipeline |
| [Viewport & Camera System](architecture/viewport-and-camera-system.md) | Fixed aspect ratio, letterboxing, camera types (85% done) |

---

## Decisions (ADRs)

Architectural Decision Records explaining key choices.

| Document | Description |
|----------|-------------|
| [Physics Engine Evaluation](decisions/physics-engine-evaluation.md) | Physics engine selection history |
| [Behavior Extensions](decisions/behavior-extensions.md) | Power behaviors for complex genres |

---

## Troubleshooting

Known issues and solutions.

| Document | Description |
|----------|-------------|
| _None yet_ | |

---

## Planning

Roadmaps and feature plans (temporal - will be archived when implemented).

| Document | Description | Status |
|----------|-------------|--------|
| [CURRENT WORK](planning/CURRENT_WORK.md) | Quick pickup for current focus | **active** |
| [Implementation Roadmap](planning/implementation-roadmap.md) | Full development status tracker | active |
| [MVP Roadmap](planning/mvp-roadmap.md) | Development phases to launch | active |
| [Editor Redesign](planning/editor-redesign/INDEX.md) | Mobile-first editor UI | **75% complete** |
| [Viewport & Camera](architecture/viewport-and-camera-system.md) | Fixed aspect ratio + camera types | **85% complete** |
| [Asset Integration Plan](planning/asset-integration-plan.md) | Connecting AI assets to game gen | **implemented** |
| [Infrastructure Plan](planning/infrastructure-plan.md) | Physics/graphics on React Native | implemented |
| [Physics2D Implementation](planning/physics2d-implementation-plan.md) | Physics2D foundation plan | implemented |
| [Scenario API TODO](planning/scenario-api-todo.md) | Model testing tasks | implemented |

---

## Research

Active investigations and experiments.

| Document | Description | Status |
|----------|-------------|--------|
| [Asset Integration Investigation](research/asset-integration-investigation.md) | Why assets aren't in generated games | open |
| [Market Analysis](research/market-analysis.md) | AI game maker competitive landscape | closed |

---

## Templates

The 10 core game templates - reusable patterns for common game types.

| # | Template | Core Mechanic |
|---|----------|---------------|
| 01 | [Slingshot Destruction](templates/01-slingshot-destruction.md) | Pull-and-release projectile physics |
| 02 | [Rope Physics](templates/02-rope-physics.md) | Swinging, grappling, tethered objects |
| 03 | [Endless Runner](templates/03-endless-runner.md) | Continuous scrolling with obstacles |
| 04 | [Hill Climb Vehicle](templates/04-hill-climb-vehicle.md) | Terrain traversal with physics |
| 05 | [Physics Platformer](templates/05-physics-platformer.md) | Jump, run, physics-based puzzles |
| 06 | [Breakout Bouncer](templates/06-breakout-bouncer.md) | Ball bouncing, brick breaking |
| 07 | [Pinball Lite](templates/07-pinball-lite.md) | Flippers, bumpers, ball control |
| 08 | [Bumper Arena](templates/08-bumper-arena.md) | Multi-body collisions, knockback |
| 09 | [Physics Stacker](templates/09-physics-stacker.md) | Balance, tower building |
| 10 | [Ragdoll Goal](templates/10-ragdoll-goal.md) | Articulated characters, targeting |

See [Game Templates Overview](templates/INDEX.md) for philosophy and customization levels.

---

## Archive

Historical documents kept for reference.

| Document | Description | Archived |
|----------|-------------|----------|
| _None yet_ | | |

---

## Related

- [Physics Engine Documentation](../physics-engine/INDEX.md) - Underlying physics system
- [Global Documentation Index](../INDEX.md)
