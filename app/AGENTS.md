# Project Guide

> **Entry point for AI agents and developers**
>
> This project has two main components:
> 1. **Physics Engine**: Box2D + Skia rendering for React Native (iOS, Android, Web)
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
| **[docs/physics-engine/INDEX.md](../docs/physics-engine/INDEX.md)** | Physics engine (Box2D, Skia, adapters) |
| **[docs/game-maker/INDEX.md](../docs/game-maker/INDEX.md)** | AI game generation, entities, behaviors |

### Most-Used References

| Document | Description |
|----------|-------------|
| [Physics2D API](../docs/physics-engine/reference/physics2d-api.md) | Complete Physics2D interface |
| [Entity System](../docs/game-maker/reference/entity-system.md) | Game entity structure |
| [Behavior System](../docs/game-maker/reference/behavior-system.md) | Game logic behaviors |
| [Box2D Coverage](../docs/physics-engine/reference/box2d-api-coverage.md) | Which Box2D features are exposed |
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
│  (FallingBoxes, GameRuntime, Interaction, etc.)             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Physics2D Interface                       │
│  lib/physics2d/Physics2D.ts (unified API contract)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌───────────┴───────────┐
         │                       │
┌────────▼────────┐    ┌────────▼────────┐
│   Native (JSI)   │    │   Web (WASM)    │
│ react-native-    │    │  box2d-wasm +   │
│   box2d          │    │  Polyfills      │
└──────────────────┘    └─────────────────┘
```

**Full architecture docs**: [physics-engine/architecture/](../docs/physics-engine/architecture/) | [game-maker/architecture/](../docs/game-maker/architecture/)

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
| `lib/physics2d/` | **Physics2D API** - Use this for new physics code |
| `lib/physics/` | **Legacy raw Box2D** - Some examples still use this |
| `lib/game-runtime/` | **Game engine** - Entity manager, behaviors, rules |
| `lib/registry/` | **Universal Registry** - Auto-discovered lazy loading system |
| `components/examples/` | Physics demo components |
| `app/examples/` | Expo Router pages for demos (auto-discovered) |
| `docs/` | All documentation (see structure above) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Expo SDK 54 |
| **Rendering** | `@shopify/react-native-skia` |
| **Physics (Native)** | `react-native-box2d` (JSI) |
| **Physics (Web)** | `box2d-wasm` (WASM) |
| **Styling** | NativeWind (Tailwind) |
| **API** | Hono + tRPC on Cloudflare Workers |
| **Database** | Cloudflare D1 |
| **AI** | OpenRouter (GPT-4o) + Scenario.com |

---

## Physics2D Quick Reference

```typescript
import { createPhysics2D, vec2 } from '@/lib/physics2d';

// Setup
const physics = await createPhysics2D();
physics.createWorld(vec2(0, 9.8));

// Create body
const bodyId = physics.createBody({
  type: 'dynamic',
  position: vec2(5, 2),
});

// Add shape
physics.addFixture(bodyId, {
  shape: { type: 'circle', radius: 0.5 },
  density: 1.0,
  friction: 0.3,
  restitution: 0.5,
});

// Physics loop
physics.step(deltaTime, 8, 3);

// Get transform
const { position, angle } = physics.getTransform(bodyId);
```

**Full API reference**: [docs/physics-engine/reference/physics2d-api.md](../docs/physics-engine/reference/physics2d-api.md)

---

## Web Compatibility (CRITICAL)

### Skia Loading
ALL Skia components MUST be lazy-loaded:

```typescript
import { WithSkia } from "@/components/WithSkia";

export default function MyPage() {
  return (
    <WithSkia fallback={<Text>Loading...</Text>}>
      {() => import("@/components/MySkiaComponent").then(m => <m.default />)}
    </WithSkia>
  );
}
```

### Physics Platform Extensions
Use `.web.ts` and `.native.ts` extensions for platform-specific code.

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
| Body not moving | `type: 'dynamic'` and `density > 0` |
| Passing through objects | Enable `bullet: true` on fast bodies |
| Jittery physics | Reduce `maxDeltaTime` or use fixed timestep |
| No collision | Check `categoryBits` and `maskBits` |
| Web WASM errors | Check metro.config.js box2d-wasm resolution |

**Full troubleshooting**: [docs/physics-engine/troubleshooting/](../docs/physics-engine/troubleshooting/)

---

## Related Documentation

- **[Documentation Skill](../.opencode/skills/documentation.md)** - How to write docs for this project
- **[Waypoint Architecture](../docs/shared/reference/waypoint-architecture.md)** - Infrastructure patterns
- **[Game Templates](../docs/game-maker/templates/)** - 10 pre-built game patterns
