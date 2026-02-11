# Documentation Index

> **Navigation hub for all project documentation**
>
> ⚠️ **Note**: Some architecture and engine guides are currently being refactored and may be temporarily unavailable.

---

## 🎮 Game Maker & Engine

| Component | Description | Entry Point |
|-----------|-------------|-------------|
| **Economy** | Virtual currency, Sparks/Gems | [economy/INDEX.md](economy/INDEX.md) |
| **Godot Bridge** | Bridge, coordinates, input | [Godot Migration Guide](godot/UNIFIED_BRIDGE_DESIGN_BRIEF.md) |
| **Asset Pipeline** | AI Generation system | [Image Generation Architecture](IMAGE_GENERATION_ARCHITECTURE.md) |

---

## Godot Integration

| Document | Description |
|----------|-------------|
| [Coordinate System Guide](godot/COORDINATE_SYSTEM_GUIDE.md) | Center-origin coordinate system |
| [3D Rendering](godot/3d-rendering.md) | GLB model rendering in Godot |
| [Web Input Handling](godot/WEB_INPUT_HANDLING.md) | Browser input event flow |
| [Bridge E2E Testing](godot/BRIDGE_E2E_TESTING.md) | Testing Godot interactions |

---

## Shared Documentation

### Guides
| Document | Description |
|----------|-------------|
| [Expo Development Guide](shared/guides/expo-development.md) | Setting up and running the Expo app |
| [Storybook Setup](shared/guides/storybook-setup.md) | Component development with Storybook |

### Reference
| Document | Description |
|----------|-------------|
| [Metro Port Configuration](shared/reference/metro-port-configuration.md) | Custom Metro port setup |
| [Registry System](shared/reference/registry-system.md) | Auto-discovered lazy loading |
| [Platform-Specific Modules](shared/reference/platform-specific-modules.md) | .native.ts/.web.ts patterns |


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
