# Documentation Index

> **Navigation hub for all project documentation**
>
> This index provides a structured path through all documentation. Start here to find what you need.

---

## Quick Navigation

| Component | Description | Entry Point |
|-----------|-------------|-------------|
| **Physics Engine** | Box2D + Skia rendering, React Native integration | [physics-engine/INDEX.md](physics-engine/INDEX.md) |
| **Game Maker** | AI-powered game generation, entity/behavior systems | [game-maker/INDEX.md](game-maker/INDEX.md) |
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
| [App Template Guide](shared/guides/app-template-setup.md) | Creating new apps from Waypoint template |
| [Skia Web Deployment](shared/guides/skia-web-deployment.md) | CanvasKit WASM deployment to Cloudflare |

### Reference
Quick-lookup documentation for tools and configurations.

| Document | Description |
|----------|-------------|
| [Waypoint Architecture Reference](shared/reference/waypoint-architecture.md) | Full infrastructure patterns from Waypoint |
| [Metro Port Configuration](shared/reference/metro-port-configuration.md) | Custom Metro port setup |
| [Template Features](shared/reference/template-features.md) | Skia + NativeWind template features |

### Planning
Roadmaps and feature plans.

| Document | Description |
|----------|-------------|
| [Skia Import Guard System](shared/planning/skia-import-guard-system.md) | Preventing Skia/WASM initialization crashes |

### Troubleshooting
Known issues and their solutions.

| Document | Description |
|----------|-------------|
| [D1 Testing Issues](shared/troubleshooting/d1-testing-setup.md) | Cloudflare D1 test environment setup |

### Decisions (ADRs)
Architectural Decision Records for project-wide choices.

_None yet_

### Log
Temporal status updates and completion notes.

| Document | Description |
|----------|-------------|
| [2026-01-21 Scenario Setup Complete](shared/log/2026/2026-01-21-scenario-setup.md) | Scenario.com integration verified |

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
