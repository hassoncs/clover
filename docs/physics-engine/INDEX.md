# Physics Engine Documentation

> **Box2D + Skia rendering for React Native**
>
> Cross-platform 2D physics with native performance on iOS/Android and WebAssembly on web.

---

## Overview

The physics engine provides:
- **Physics2D interface**: Unified API abstracting Box2D implementations
- **Platform adapters**: Native JSI (iOS/Android) and WASM (web)
- **Skia rendering**: Hardware-accelerated graphics via @shopify/react-native-skia
- **React integration**: Hooks and components for physics-based UIs

---

## Guides

Step-by-step tutorials for common physics tasks.

| Document | Description |
|----------|-------------|
| _Coming soon_ | Guides will be extracted from AGENTS.md patterns |

---

## Reference

API documentation and quick-lookup resources.

| Document | Description |
|----------|-------------|
| [Box2D API Coverage](reference/box2d-api-coverage.md) | Which Box2D features are exposed |

---

## Architecture

System design and component relationships.

| Document | Description |
|----------|-------------|
| _Coming soon_ | Architecture docs to be created |

---

## Decisions (ADRs)

Architectural Decision Records explaining key choices.

| Document | Description |
|----------|-------------|
| [Box2D Fork Strategy](decisions/box2d-fork-strategy.md) | Why and how we fork react-native-box2d |

---

## Troubleshooting

Known issues and solutions.

| Document | Description |
|----------|-------------|
| [MouseJoint Investigation](troubleshooting/mousejoint-wasm-issue.md) | SetTarget not working in box2d-wasm |

---

## Research

Active investigations and experiments.

| Document | Description | Status |
|----------|-------------|--------|
| _None active_ | | |

---

## Archive

Historical documents kept for reference.

| Document | Description | Archived |
|----------|-------------|----------|
| _None yet_ | | |

---

## Related

- [Game Maker Documentation](../game-maker/INDEX.md) - Uses this physics engine
- [Global Documentation Index](../INDEX.md)
