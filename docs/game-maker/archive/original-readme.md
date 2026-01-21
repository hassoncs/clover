# AI-Powered Mobile Game Maker

## Vision

An AI-powered mobile game maker that enables children and casual creators (ages 6-14) to build fully functional 2D physics-based games through natural language prompts and intuitive visual tools.

**Core Premise**: Given a robust graphics engine (Skia) and physics library (Box2D), combined with AI image generation and a well-structured game framework, users can describe a game idea in plain language and receive a playable game within seconds.

## Project Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Complexity Level** | Simple to Medium | Keeps games achievable, fun, and AI-generatable |
| **AI Architecture** | Backend API (not on-device) | Enables powerful models, easier updates, no device constraints |
| **Target Age** | 6-14 years | Simple enough for kids, complex enough to be interesting |
| **Sharing** | Future feature | Eventually enable sharing + monetization |
| **Monetization** | Future feature | Users may eventually monetize their games |

## Tech Stack

| Layer | Technology | Status |
|-------|------------|--------|
| **Rendering** | React Native Skia | Ready |
| **Physics** | Box2D (JSI native + WASM web) | Ready |
| **Animation Loop** | Reanimated `useFrameCallback` | Ready |
| **Platform** | Expo (iOS, Android, Web) | Ready |
| **AI Backend** | TBD (OpenAI/Anthropic/etc.) | Planned |
| **Image Generation** | TBD (DALL-E/Stable Diffusion/etc.) | Planned |

## Documentation Index

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and component design |
| [GAME_TYPES.md](./GAME_TYPES.md) | Catalog of buildable game types |
| [ENTITY_SYSTEM.md](./ENTITY_SYSTEM.md) | Entity and component schema definitions |
| [BEHAVIOR_SYSTEM.md](./BEHAVIOR_SYSTEM.md) | Declarative behavior system for game logic |
| [GAME_RULES.md](./GAME_RULES.md) | Win/lose conditions and game rules |
| [AI_INTEGRATION.md](./AI_INTEGRATION.md) | AI prompt engineering and generation pipeline |
| [MVP_ROADMAP.md](./MVP_ROADMAP.md) | Development phases and milestones |
| [EXAMPLES.md](./EXAMPLES.md) | Complete game definition examples |

## Quick Start Concept

```
User: "I want a game where I launch a ball at towers and knock them down"

AI generates:
  - Game definition (JSON)
  - Sprite assets (AI-generated images)
  - Physics configuration
  - Win/lose conditions

Result: Playable "Angry Birds"-style game in < 30 seconds
```

## Why This Will Work

1. **Constrained Creativity**: Limited but powerful building blocks = high success rate
2. **Physics = Fun**: Box2D provides emergent, surprising gameplay "for free"
3. **AI Sweet Spot**: Game definitions are structured enough for AI to generate reliably
4. **Instant Gratification**: See your game immediately, iterate quickly
5. **Low Floor, High Ceiling**: Simple games are trivial; complex games are possible

## Competitive Advantage Over Existing Tools

| Competitor | Limitation | Our Advantage |
|------------|------------|---------------|
| **Sticky** | Limited physics, basic visuals | Full Box2D physics, Skia rendering |
| **Scratch** | Block-based, steep learning curve | Natural language, instant results |
| **Godot/Unity** | Too complex for kids | AI handles complexity |
| **Roblox** | 3D focus, requires coding | 2D physics focus, no code needed |

## Success Metrics

- **Generation Success Rate**: >80% of prompts produce playable games
- **Time to Play**: <30 seconds from prompt to playable game
- **Iteration Speed**: <5 seconds to see changes after adjustments
- **User Retention**: Users create 3+ games in first session
