# Project Guide

> **Entry point for AI agents and developers**
>
> This project has two main components:
> 1. **Game Engine**: Godot 4 physics and rendering for React Native (iOS, Android, Web)
> 2. **Game Maker**: AI-powered game generation from natural language prompts

---

## Quick Start

```bash
# Start development servers (DevMux managed)
pnpm dev              # Starts Metro (port 8085) + API (port 8789)
pnpm storybook        # Starts Storybook (port 6006)
pnpm svc:status       # Check service status

# Run on device (automatically ensures Metro via DevMux)
pnpm ios              # iOS simulator
pnpm android          # Android emulator

# Build & Test
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm tsc --noEmit     # Type check

# Registry (auto-discovered modules)
pnpm generate:registry        # Regenerate module registry
pnpm generate:registry:watch  # Watch mode
```

---

## Documentation

All documentation lives in `docs/` with a component-first structure:

| Index | Description |
|-------|-------------|
| **[docs/INDEX.md](../docs/INDEX.md)** | Global documentation hub |
| **[docs/godot-migration/](../docs/godot-migration/)** | Godot migration docs |
| **[docs/game-maker/INDEX.md](../docs/game-maker/INDEX.md)** | AI game generation, entities, behaviors |

### Most-Used References

| Document | Description |
|----------|-------------|
| [Entity System](../docs/game-maker/reference/entity-system.md) | Game entity structure |
| [Behavior System](../docs/game-maker/reference/behavior-system.md) | Game logic behaviors |
| [Registry System](../docs/shared/reference/registry-system.md) | Auto-discovered lazy loading |
| [Troubleshooting](../docs/shared/troubleshooting/) | Common issues and fixes |

### Writing Documentation

See **[.opencode/skills/documentation.md](../.opencode/skills/documentation.md)** for:
- Documentation taxonomy and structure
- Naming conventions
- Placement rules
- When to update vs create new docs

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                      DevMux (Orchestrator)                   │
│  Managed Tmux Sessions for Long-Running Processes           │
│  - Metro (:8085)                                            │
│  - API (:8789)                                              │
│  - Storybook (:6006)                                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                      React Components                        │
│  (GameRuntime, Examples, UI)                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    GodotBridge (TypeScript)                  │
│  lib/godot/GodotBridge.native.ts | GodotBridge.web.ts       │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌────────▼────────┐
│   Native (JSI)   │    │   Web (WASM)    │
│ react-native-    │    │  Godot WASM +   │
│   godot          │    │  GameBridge.gd  │
└──────────────────┘    └─────────────────┘
```

**Full architecture docs**: [godot-migration/](../docs/godot-migration/) | [game-maker/architecture/](../docs/game-maker/architecture/)

---

## Development Workflow (DevMux)

**Everything that opens a port runs via DevMux.**

This project uses `DevMux` to manage background services in named `tmux` sessions. This ensures:
1.  **Persistence**: Servers don't die when you close a terminal tab.
2.  **Idempotency**: Running `pnpm dev` multiple times attaches to the *existing* session instead of failing with "port in use".
3.  **Coordination**: Scripts like `pnpm ios` automatically ensure Metro is running before launching the simulator.

### Key Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Ensures `metro` (:8085) and `api` (:8789) are running. |
| `pnpm storybook` | Ensures `storybook` (:6006) is running. |
| `pnpm svc:status` | Shows health of all configured services. |
| `pnpm svc:stop` | Stops all services (kills tmux sessions). |
| `npx devmux attach <service>` | Connect to a specific session (e.g., `metro`) to see logs. |

**Configuration**: See `devmux.config.json` in the root for port mappings and commands.

---

## Key Directories

| Path | Purpose |
|------|---------|
| `lib/godot/` | **Godot Bridge** - TypeScript ↔ Godot communication |
| `lib/game-engine/` | **Game engine** - Entity manager, behaviors, rules |
| `lib/registry/` | **Universal Registry** - Auto-discovered lazy loading system |
| `app/examples/` | Expo Router pages for demos (auto-discovered) |
| `godot_project/` | **Godot project** - GDScript, scenes, physics |
| `docs/` | All documentation |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo SDK 54 |
| **Rendering/Physics** | Godot 4 (native + WASM) |
| **Bridge (Native)** | `@borndotcom/react-native-godot` |
| **Bridge (Web)** | Godot WASM + JavaScriptBridge |
| **Styling** | NativeWind (Tailwind) |
| **API** | Hono + tRPC on Cloudflare Workers |
| **Database** | Cloudflare D1 |
| **AI** | OpenRouter (GPT-4o) + Scenario.com |

---

## GodotBridge Quick Reference

```typescript
import { createGodotBridge, GodotView } from '@/lib/godot';

// Initialize bridge
const bridge = await createGodotBridge();
await bridge.initialize();

// Load game definition
await bridge.loadGame(gameDefinition);

// Spawn entities
const entityId = bridge.spawnEntity('box', 5, 2);

// Control entities
bridge.applyImpulse(entityId, { x: 0, y: -10 });
bridge.setLinearVelocity(entityId, { x: 5, y: 0 });

// Dynamic images
bridge.setEntityImage(entityId, imageUrl, width, height);

// Cleanup
bridge.dispose();
```

**Full API reference**: See `lib/godot/types.ts` for complete interface

---

## Platform-Specific Code

Use `.web.ts` and `.native.ts` extensions for platform-specific implementations:

```
lib/godot/
├── GodotBridge.native.ts  # iOS/Android implementation
├── GodotBridge.web.ts     # Web WASM implementation
├── index.ts               # Unified export
└── types.ts               # Shared types
```

---

## Registry System (Auto-Discovery)

The project uses a **Universal Lazy Registry** for type-safe, auto-discovered module loading. Files with `export const metadata` are automatically discovered and made available for Suspense-compatible lazy loading.

### Adding a New Example

```typescript
// app/examples/my_example.tsx
import type { ExampleMeta } from "@/lib/registry/types";

export const metadata: ExampleMeta = {
  title: "My Example",
  description: "Does something cool.",
};

export default function MyExample() { ... }
```

Then run `pnpm generate:registry` (or it runs automatically with `pnpm dev`).

### Using the Registry

```typescript
import { EXAMPLES, getExampleComponent, type ExampleId } from "@/lib/registry";

// List all (static metadata, no lazy load)
EXAMPLES.map(e => <Item title={e.meta.title} />);

// Type-safe lazy loading
const Example = getExampleComponent("pinball"); // TS validates ID!
<Suspense fallback={<Loading />}><Example /></Suspense>
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/registry/types.ts` | Type definitions |
| `lib/registry/generated/examples.ts` | Auto-generated registry (checked in) |
| `scripts/generate-registry.mjs` | Scanner/generator script |

**Full documentation**: [docs/shared/reference/registry-system.md](../docs/shared/reference/registry-system.md)

---

## Debugging Quick Tips

| Issue | Check |
|-------|-------|
| Entity not moving | `bodyType: 'dynamic'` and `density > 0` |
| Passing through objects | Enable `bullet: true` on fast bodies |
| Jittery physics | Reduce timestep or use fixed timestep |
| No collision | Check `categoryBits` and `maskBits` |
| Images not updating (native) | Ensure paths don't have `file://` prefix |

---

## Related Documentation

- **[Documentation Skill](../.opencode/skills/documentation.md)** - How to write docs for this project
- **[Godot Project README](../godot_project/README.md)** - Godot-specific documentation
- **[Game Templates](../docs/game-maker/templates/)** - Pre-built game patterns
