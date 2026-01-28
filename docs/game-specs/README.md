# Game Specifications Index

> **Slopcade AI-First Game Portfolio**  
> **Last Updated**: 2026-01-27  

---

## Overview

This directory contains detailed technical specifications for Slopcade's strategic game portfolio. Each document provides comprehensive pre-implementation designs covering game mechanics, engine integration, asset requirements, and technical implementation notes.

---

## Game Specifications

### Phase 1: Quick Wins (Week 1-2)

| # | Game | Type | Effort | Document |
|---|------|------|--------|----------|
| 1 | **PromptPals Closet Dash** | Endless Runner + Avatar | 2-3 days | [01-promptpals-closet-dash.md](./01-promptpals-closet-dash.md) |
| 2 | **PromptPegs Party** | Peggle + Collection | 1-2 days | [02-promptpegs-party.md](./02-promptpegs-party.md) |
| 3 | **RoomDrop Designer** | Physics Decoration | 2-3 days | [03-roomdrop-designer.md](./03-roomdrop-designer.md) |

### Phase 2: Character Attachment (Week 3-4)

| # | Game | Type | Effort | Document |
|---|------|------|--------|----------|
| 4 | **Pet Pocket Parkour** | Platformer + Pet | 3-4 days | [04-pet-pocket-parkour.md](./04-pet-pocket-parkour.md) |
| 5 | **Build-a-Buddy Pinball** | Customizable Pinball | 2-3 days | [05-build-a-buddy-pinball.md](./05-build-a-buddy-pinball.md) |

### Phase 3: Long-term Play (Month 2)

| # | Game | Type | Effort | Document |
|---|------|------|--------|----------|
| 6 | **ToyBox Physics Sandbox** | Creator Sandbox | 1-2 weeks | [06-toybox-physics-sandbox.md](./06-toybox-physics-sandbox.md) |

### Bonus Concept

| # | Game | Type | Effort | Document |
|---|------|------|--------|----------|
| 7 | **Monster Battle Arena** | Physics Battle + Collection | 1-2 weeks | [07-monster-battle-arena.md](./07-monster-battle-arena.md) |

---

## Quick Reference

### By Game Type

| Type | Games |
|------|-------|
| **Endless Runner** | PromptPals Closet Dash |
| **Physics Arcade** | PromptPegs Party, Build-a-Buddy Pinball |
| **Creative Sandbox** | RoomDrop Designer, ToyBox Physics Sandbox |
| **Platformer** | Pet Pocket Parkour |
| **Battle Arena** | Monster Battle Arena |

### By AI Integration Level

| Level | Games |
|-------|-------|
| **Theme Generation** | PromptPals Closet Dash, PromptPegs Party, Build-a-Buddy Pinball |
| **Object Generation** | RoomDrop Designer, ToyBox Physics Sandbox |
| **Character Generation** | Pet Pocket Parkour, Monster Battle Arena |

### By Target Audience

| Audience | Games |
|----------|-------|
| **Kids 6-12** | PromptPals Closet Dash, Pet Pocket Parkour, RoomDrop Designer |
| **Casual (All Ages)** | PromptPegs Party, Build-a-Buddy Pinball |
| **Creators** | ToyBox Physics Sandbox, Monster Battle Arena |

---

## Document Structure

Each specification includes:

1. **Executive Summary** - Game concept and unique value proposition
2. **Detailed Game Mechanics** - Core gameplay systems
3. **Game Engine Integration** - GameDefinition structure and technical implementation
4. **Graphics & Asset Requirements** - Complete asset lists and specifications
5. **AI Integration** - How AI generation fits into the game
6. **UI/UX Flow** - Screen designs and user flows
7. **Technical Implementation Notes** - Engineering considerations
8. **Success Metrics** - KPIs and targets

---

## Implementation Order

### Week 1
1. Review all specifications
2. Begin PromptPals Closet Dash (highest priority)
3. Parallel: PromptPegs Party (quick win)

### Week 2
4. RoomDrop Designer
5. Integrate feedback from first games

### Week 3
6. Pet Pocket Parkour

### Week 4
7. Build-a-Buddy Pinball

### Month 2
8. ToyBox Physics Sandbox
9. Monster Battle Arena (if resources allow)

---

## Dependencies Between Games

```
PromptPals Closet Dash
├── Avatar layering system (reused in Pet Pocket Parkour)
└── Theme generation (reused in PromptPegs Party)

PromptPegs Party
└── Reuses slopeggle base

RoomDrop Designer
├── Furniture archetypes (informs ToyBox)
└── Physics validation

Pet Pocket Parkour
├── Avatar system (from PromptPals)
└── Platformer physics

Build-a-Buddy Pinball
├── Reuses pinballLite base
└── Socket system (informs ToyBox)

ToyBox Physics Sandbox
├── Combines furniture archetypes + socket system
└── Highest complexity

Monster Battle Arena
├── Physics combat (extends all previous)
└── Stats/progression system
```

---

## Key Shared Systems

| System | Used By | Description |
|--------|---------|-------------|
| **Avatar Layering** | PromptPals, Pet Pocket Parkour | Composite sprite rendering |
| **Theme Generation** | PromptPals, PromptPegs, Pinball | AI-powered visual theming |
| **Furniture Archetypes** | RoomDrop, ToyBox | Predefined collider shapes |
| **Socket System** | Pinball, ToyBox | Constrained placement |
| **Collection System** | PromptPegs, Monster Battle | Sticker album / monster dex |
| **Share Codes** | Pinball, ToyBox, Monster | Creation sharing |

---

## Related Documents

- [Strategic Game Recommendations](../STRATEGIC_GAME_RECOMMENDATIONS.md) - Portfolio strategy
- [ROADMAP](../../.opencode/memory/ROADMAP.md) - Development roadmap
- [Asset Pipeline](../asset-pipeline.md) - AI generation pipeline
- [Game Engine Reference](../game-maker/) - Engine documentation

---

## Status Tracking

| Game | Spec Status | Implementation | Notes |
|------|-------------|----------------|-------|
| PromptPals Closet Dash | ✅ Complete | 🔴 Not Started | Priority 1 |
| PromptPegs Party | ✅ Complete | 🔴 Not Started | Quick win |
| RoomDrop Designer | ✅ Complete | 🔴 Not Started | |
| Pet Pocket Parkour | ✅ Complete | 🔴 Not Started | |
| Build-a-Buddy Pinball | ✅ Complete | 🔴 Not Started | |
| ToyBox Physics Sandbox | ✅ Complete | 🔴 Not Started | |
| Monster Battle Arena | ✅ Complete | 🔴 Not Started | Bonus |

---

*All specifications ready for development. Start with PromptPals Closet Dash.*
