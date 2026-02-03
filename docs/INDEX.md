# Documentation Index

> **Navigation hub for all project documentation**

---

## 🎮 Start Here: Building Games

| Document | Description |
|----------|-------------|
| **[Game Engine Guide](./GAME-ENGINE-GUIDE.md)** | **How to build games** - entities, physics, behaviors, rules, complete examples |
| **[Bundle System](./game-maker/reference/bundle-system.md)** | **Build & bundle format** - JSON structure, file organization, compilation |
| **[Physics System Guide](./physics-system-guide.md)** | Deep dive into physics - body types, sensors, collisions |
| **[Game Patterns](./game-maker/reference/game-patterns.md)** | 7 reusable patterns - Choice, Pick&Place, Physics Drop, etc. |

### Architecture Reference
| Document | Description |
|----------|-------------|
| [Master Architecture](./game-engine-architecture/00-MASTER-ARCHITECTURE.md) | High-level system design and principles |
| [Entity System](./game-engine-architecture/01-core-concepts/entity-system.md) | Entity structure, components, hierarchy |
| [Behavior System](./game-engine-architecture/01-core-concepts/behavior-system.md) | All behavior types and usage |
| [Rules System](./game-engine-architecture/01-core-concepts/rules-system.md) | Triggers, conditions, actions |

---

## Quick Navigation

| Component | Description | Entry Point |
|-----------|-------------|-------------|
| **Game Engine** | Godot 4 physics and rendering | [game-engine-architecture/](./game-engine-architecture/) |
| **Game Maker** | AI generation, templates, validation | [game-maker/INDEX.md](game-maker/INDEX.md) |
| **Economy** | Virtual currency, Sparks/Gems | [economy/INDEX.md](economy/INDEX.md) |
| **Godot** | Bridge, coordinates, input | [godot/](./godot/) |

---

## Shared Documentation

Cross-cutting documentation that applies to the entire project.

### Guides
Step-by-step instructions for common tasks.

| Document | Description |
|----------|-------------|
| [Expo Development Guide](shared/guides/expo-development.md) | Setting up and running the Expo app |
| [Storybook Setup](shared/guides/storybook-setup.md) | Component development with Storybook |

### Reference
Quick-lookup documentation for tools and configurations.

| Document | Description |
|----------|-------------|
| [Metro Port Configuration](shared/reference/metro-port-configuration.md) | Custom Metro port setup |
| [Registry System](shared/reference/registry-system.md) | Auto-discovered lazy loading |
| [Platform-Specific Modules](shared/reference/platform-specific-modules.md) | .native.ts/.web.ts patterns |

### Plans
Future migration and feature plans.

| Document | Description |
|----------|-------------|
| [ComfyUI Migration Architecture](plans/comfyui-migration-architecture.md) | RunPod ComfyUI serverless migration plan |
| [RunPod Setup Status](plans/runpod-comfyui-setup-status.md) | Deployment checklist (READY, waiting on Scenario credits) |

---

## Godot Migration

Documentation for the Godot 4 game engine integration.

| Document | Description |
|----------|-------------|
| [Godot 4 Integration](godot/) | Godot 4 physics and rendering backend |
| [Coordinate System Guide](godot/COORDINATE_SYSTEM_GUIDE.md) | Center-origin coordinate system |
| [3D Rendering](godot/3d-rendering.md) | GLB model rendering in Godot |
| [Web Input Handling](godot/WEB_INPUT_HANDLING.md) | Browser input event flow |

---

## Document Types

| Type | Purpose | Location |
|------|---------|----------|
| **guides/** | "How to do X" step-by-step tutorials | Evergreen |
| **reference/** | APIs, configs, lookup tables | Evergreen |
| **architecture/** | System design, component relationships | Evergreen |
| **decisions/** | ADRs - "we chose X because..." | Permanent record |
| **troubleshooting/** | Symptoms → causes → fixes | Evergreen |
| **research/** | Investigations, experiments | Temporal (requires closure) |
| **planning/** | Roadmaps, feature plans | Temporal (archive when done) |
| **templates/** | Reusable patterns, examples | Evergreen catalog |
| **log/** | Status updates, completion notes | Temporal (date-prefixed) |
| **archive/** | Historical docs, outdated content | Archived |

---

## Contributing Documentation

See the [Documentation Skill](../.opencode/skills/documentation.md) for:
- Naming conventions
- Required metadata
- Placement rules
- Update vs create decisions
