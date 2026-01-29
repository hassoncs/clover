# Slopcade Skills

This directory contains specialized skills for the Slopcade project. Each skill provides contextual knowledge and workflows for a specific functional area of the codebase.

## Available Skills

| Skill | Purpose | Load When Working On |
|-------|---------|---------------------|
| [`slopcade-game-engine`](slopcade-game-engine.md) | Core game engine | Game definitions, entities, physics, behaviors, rules, levels |
| [`slopcade-asset-generation`](slopcade-asset-generation.md) | AI asset generation | Image generation, sprites, backgrounds, Scenario.com, Modal.com |
| [`slopcade-godot-bridge`](slopcade-godot-bridge.md) | React-Godot bridge | Bridge communication, native builds, WebAssembly, input handling |
| [`slopcade-3d-assets`](slopcade-3d-assets.md) | 3D model optimization | GLB models, 3D rendering, model compression |
| [`slopcade-icon-generation`](slopcade-icon-generation.md) | App icon generation | App icons, favicons, iOS/Android icons |
| [`slopcade-documentation`](slopcade-documentation.md) | Project management | Roadmaps, todos, planning, documentation |
| [`game-inspector`](game-inspector.md) | Debugging tools | Game testing, MCP inspector, verification |
| [`organize-docs`](organize-docs.md) | Documentation cleanup | Auditing, organizing markdown files |
| [`audit-plans`](audit-plans.md) | Plan auditing | Reviewing and validating plan files |
| [`devmux`](devmux.md) | Service orchestration | Metro, API, Storybook, service management, devmux config |

## Skill Architecture Principles

1. **Functional Buckets**: Skills are organized by functional areas, not technical layers
2. **Dynamic Loading**: Skills load automatically based on context and trigger words
3. **Minimal Overlap**: Each skill covers a distinct area with clear boundaries
4. **Cross-References**: Skills reference each other for multi-area workflows
5. **Documentation Links**: Each skill links to relevant documentation in `docs/`

## How Skills Work

When you start working on a task, mention keywords related to the functional area:

- "Create a new game with physics" → Loads `slopcade-game-engine`
- "Generate sprites for the game" → Loads `slopcade-asset-generation`
- "Debug why the ball isn't colliding" → Loads `game-inspector`
- "Add this to the roadmap" → Loads `slopcade-documentation`

## Skill Quick Reference

### Game Development Workflow

```
1. Design Game
   └── slopcade-game-engine (entities, physics, rules)

2. Generate Assets
   └── slopcade-asset-generation (sprites, backgrounds)

3. Implement Bridge (if needed)
   └── slopcade-godot-bridge (platform-specific code)

4. Debug & Test
   └── game-inspector (MCP tools, verification)

5. Document & Plan
   └── slopcade-documentation (roadmaps, todos)
```

### Asset Creation Workflow

```
1. Create 2D Sprites
   └── slopcade-asset-generation (Scenario/Modal)

2. Create 3D Models
   └── slopcade-3d-assets (GLB optimization)

3. Create App Icons
   └── slopcade-icon-generation (favicons, app icons)
```

## Adding New Skills

When creating a new skill:

1. Identify a distinct functional bucket not covered by existing skills
2. Create `{skill-name}.md` with trigger words and comprehensive content
3. Add cross-references to related skills
4. Link to relevant documentation in `docs/`
5. Update this README

## Skill Maintenance

Skills should be updated when:
- Documentation changes significantly
- New patterns/workflows are established
- Related code is refactored
- New features are added to the functional area

---

**Last Updated**: 2026-01-29  
**Total Skills**: 10
