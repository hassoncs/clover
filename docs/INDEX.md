# Documentation Index

> **Navigation hub for all project documentation**
>
> This index provides a structured path through all documentation. Start here to find what you need.

---

## Quick Navigation

| Component | Description | Entry Point |
|-----------|-------------|-------------|
| **Game Engine** | Godot 4 physics and rendering for React Native | [godot-migration/](godot-migration/) |
| **Game Maker** | AI-powered game generation, entity/behavior systems | [game-maker/INDEX.md](game-maker/INDEX.md) |
| **Economy** | Virtual currency strategy, Sparks/Gems, monetization | [economy/INDEX.md](economy/INDEX.md) |
| **Shared** | Cross-cutting guides, tooling, project-wide docs | [shared/](#shared-documentation) |

---

## Shared Documentation

Cross-cutting documentation that applies to the entire project.

### Guides
Step-by-step instructions for common tasks.

| Document | Description |
|----------|-------------|
| [Expo Development Guide](shared/guides/expo-development.md) | Setting up and running the Expo app |
| [Storybook Setup](shared/guides/storybook-setup.md) | Component development with Storybook |
| [App Template Guide](shared/guides/app-template-setup.md) | Creating new apps from template |

### Reference
Quick-lookup documentation for tools and configurations.

| Document | Description |
|----------|-------------|
| [Waypoint Architecture Reference](shared/reference/waypoint-architecture.md) | Full infrastructure patterns |
| [Metro Port Configuration](shared/reference/metro-port-configuration.md) | Custom Metro port setup |
| [Registry System](shared/reference/registry-system.md) | Auto-discovered lazy loading |
| [Platform-Specific Modules](shared/reference/platform-specific-modules.md) | .native.ts/.web.ts patterns |
| [Sound Generation](shared/reference/sound-generation.md) | ElevenLabs sound effects API |

### Troubleshooting
Known issues and their solutions.

| Document | Description |
|----------|-------------|
| [D1 Testing Issues](shared/troubleshooting/d1-testing-setup.md) | Cloudflare D1 test environment setup |

### Log
Temporal status updates and completion notes.

| Document | Description |
|----------|-------------|
| [2026-01-21 Scenario Setup Complete](shared/log/2026/2026-01-21-scenario-setup.md) | Scenario.com integration verified |

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
| [Migration Plan](godot-migration/MIGRATION_PLAN.md) | Full migration roadmap |
| [Gap Analysis](godot/GAP_ANALYSIS.md) | Feature comparison |
| [Native Bridge TODO](godot/NATIVE_BRIDGE_TODO.md) | Outstanding native work |

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
