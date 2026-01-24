# Slopcade Project Roadmap

**Last Updated**: 2026-01-24
**Status**: Active Development

---

## Executive Summary

Slopcade is a physics-based game engine and AI-powered game maker built with React Native. The project has achieved **major milestones** and is currently focused on **AI integration** and **asset generation**.

| Status | Count | Description |
|--------|-------|-------------|
| 🏆 Completed | 2 | Godot 4 integration, Storybook + NativeWind |
| 🚧 In Progress | 4 | Asset pipeline (86%), AI game maker, DevMux, Registry |
| ⏳ Blocked | 2 | ht-001 (AI API), ht-002 (Sheet prompts) |

---

## Active Features

### 1. Type-Driven Asset Generation Pipeline

**Status**: 🟡 86% complete  
**Priority**: High  
**Started**: 2026-01-22

#### Objective
AI-generated game sprites, backgrounds, and title images with physics-aware silhouette generation.

#### Progress (6/7 tasks)

| Task | Status | Notes |
|------|--------|-------|
| Silhouette creation from physics dimensions | ✅ Done | |
| Scenario.com API integration | ✅ Done | img2img, txt2img, background removal |
| R2 storage upload via Wrangler | ✅ Done | Cloudflare R2 |
| Debug output for all pipeline stages | ✅ Done | `api/debug-output/{gameId}/{assetId}/` |
| Godot sprite scaling logic | ✅ Done | Square texture handling |
| Working example script | ✅ Done | `generate-physics-stacker-assets.ts` |
| Sprite sheet generation | ⏳ TODO | Blocked by ht-002 |

#### Asset Types Supported

| Type | Pipeline | Description |
|------|----------|-------------|
| `entity` | silhouette → img2img → removeBg → R2 | Physics-constrained sprites |
| `background` | txt2img → R2 | Full-frame backgrounds |
| `title_hero` | txt2img → removeBg → R2 | Game title logos |
| `parallax` | txt2img → layeredDecompose → R2 | Multi-layer backgrounds |

#### CLI Usage

```bash
# Generate all assets for a game
npx tsx api/scripts/generate-game-assets.ts slopeggle

# Dry run (preview without API calls)
npx tsx api/scripts/generate-game-assets.ts slopeggle --dry-run

# Generate single asset
npx tsx api/scripts/generate-game-assets.ts slopeggle --asset=ball
```

#### Key Files
- `api/src/ai/pipeline/` - Pipeline core (types, stages, executor)
- `api/src/ai/pipeline/registry.ts` - Asset type → stage mapping
- `api/src/ai/scenario.ts` - Scenario.com API client
- `api/src/ai/assets.ts` - AssetService main entry point

#### Documentation
- `docs/asset-generation-knowledge.md`
- `docs/asset-pipeline.md`

---

### 2. AI-Powered Game Generation

**Status**: 🟢 Active  
**Priority**: High  
**Started**: 2026-01-22

#### Objective
AI-powered game generation from natural language prompts using entity/behavior systems.

#### Progress (6/7 tasks)

| Task | Status | Notes |
|------|--------|-------|
| Entity system with templates and behaviors | ✅ Done | |
| Asset generation pipeline integration | ✅ Done | Scenario.com |
| Multiple asset types | ✅ Done | entity, background, title_hero, parallax |
| Game templates | ✅ Done | 5 templates available |
| CLI tools | ✅ Done | Asset generation scripts |
| AI generation API in AIGenerateModal | ⏳ TODO | Blocked by ht-001 |

#### Game Templates

Located in `api/src/ai/templates/`:
- `fallingCatcher.ts` - Catch falling objects
- `hillRacer.ts` - Physics-based hill racing
- `jumpyCat.ts` - Platformer jumping mechanics
- `stackAttack.ts` - Stacking physics game
- `ballLauncher.ts` - Ball launching mechanics

#### Key Files
- `api/src/ai/generator.ts` - Game generation logic
- `api/src/ai/classifier.ts` - Game type classification
- `api/src/ai/validator.ts` - Game definition validation

#### Documentation
- `docs/game-maker/`

---

### 3. DevMux Service Orchestration

**Status**: 🟢 Active  
**Priority**: Medium  
**Started**: 2026-01-22

#### Objective
Managed tmux sessions for long-running development processes (Metro, API, Storybook).

#### Progress (4/4 tasks) ✅ Complete

| Task | Status |
|------|--------|
| DevMux configuration for services | ✅ Done |
| Idempotent service management | ✅ Done |
| Service status checking | ✅ Done |
| Automatic service coordination | ✅ Done |

#### Services Configured

| Service | Port | Description |
|---------|------|-------------|
| metro | 8085 | React Native Metro bundler |
| api | 8789 | Cloudflare Workers API |
| storybook | 6006 | Storybook dev server |

#### Key Commands

| Command | Action |
|---------|--------|
| `pnpm dev` | Ensures Metro and API running |
| `pnpm storybook` | Ensures Storybook running |
| `pnpm svc:status` | Shows service health |
| `pnpm svc:stop` | Stops all services |
| `npx devmux attach <service>` | Attach to session logs |

#### Configuration
- `devmux.config.json` - Service definitions
- Documented in `app/AGENTS.md`

---

### 4. Universal Lazy Registry System

**Status**: 🟢 Active  
**Priority**: Medium  
**Started**: 2026-01-22

#### Objective
Type-safe, auto-discovered module loading for examples and other registerable components.

#### Progress (4/4 tasks) ✅ Complete

| Task | Status |
|------|--------|
| Auto-discovery via metadata exports | ✅ Done |
| Type-safe lazy loading with Suspense | ✅ Done |
| Registry generation script | ✅ Done |
| Watch mode for development | ✅ Done |

#### Adding a New Example

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

#### Using the Registry

```typescript
import { EXAMPLES, getExampleComponent, type ExampleId } from "@/lib/registry";

// List all (static metadata, no lazy load)
EXAMPLES.map(e => <Item title={e.meta.title} />);

// Type-safe lazy loading
const Example = getExampleComponent("pinball"); // TS validates ID!
<Suspense fallback={<Loading />}><Example /></Suspense>
```

#### Commands

```bash
pnpm generate:registry        # Regenerate module registry
pnpm generate:registry:watch  # Watch mode
```

#### Key Files

| File | Purpose |
|------|---------|
| `lib/registry/types.ts` | Type definitions |
| `lib/registry/generated/examples.ts` | Auto-generated registry |
| `scripts/generate-registry.mjs` | Scanner/generator script |

#### Documentation
- `docs/shared/reference/registry-system.md`
- `app/AGENTS.md`

---

### 5. Godot 4 Game Engine Integration

**Status**: ✅ Complete  
**Priority**: Completed  
**Started**: 2026-01-20  
**Completed**: 2026-01-24

#### Objective
Godot 4 physics and rendering for React Native (iOS, Android, Web).

#### What Was Built

| Component | Status | Description |
|-----------|--------|-------------|
| Native bridge | ✅ Done | `GodotBridge.native.ts` |
| Web WASM bridge | ✅ Done | `GodotBridge.web.ts` |
| GameBridge singleton | ✅ Done | TypeScript ↔ Godot communication |
| Physics body management | ✅ Done | Entity spawning, lifecycle |
| Dynamic image loading | ✅ Done | Texture management |

#### Key Files
- `lib/godot/GodotBridge.native.ts` - Native bridge
- `lib/godot/GodotBridge.web.ts` - Web WASM
- `godot_project/scripts/GameBridge.gd` - Main singleton
- `godot_project/scripts/PhysicsBody.gd` - Physics body

#### Documentation
- `docs/godot-migration/MIGRATION_PLAN.md`
- `docs/godot/GAP_ANALYSIS.md`

---

### 6. Storybook + NativeWind Setup

**Status**: ✅ Complete  
**Priority**: Completed  
**Started**: 2026-01-20  
**Completed**: 2026-01-24

#### Objective
Web-based component previews with full NativeWind (Tailwind CSS) styling support.

#### What Was Built

| Component | Status |
|-----------|--------|
| Webpack configuration | ✅ Done |
| Babel loader for TypeScript | ✅ Done |
| PostCSS + Tailwind integration | ✅ Done |
| React Native Web aliasing | ✅ Done |
| Platform-specific extensions | ✅ Done |

#### Running Storybook

```bash
# From monorepo root
pnpm storybook

# Available at http://localhost:6006
```

#### Key Configuration Files
- `apps/storybook/.storybook/main.ts` - Webpack & babel
- `apps/storybook/.storybook/preview.ts` - Decorators
- `apps/storybook/.storybook/global.css` - Tailwind
- `apps/storybook/tailwind.config.js` - Tailwind config
- `apps/storybook/postcss.config.js` - PostCSS

#### Documentation
- `docs/storybook-setup.md`

---

## Human Tasks (Blockers)

### ht-001: Implement AI Generation API Call

**Priority**: Medium  
**Status**: Open  
**Source**: `app/components/editor/AIGenerateModal.tsx:46`

#### The Problem
The `AIGenerateModal` component has a TODO placeholder for the actual AI generation API call. Currently simulates with a 1.5s delay and creates a placeholder entity.

#### Why Human Required
Architectural decisions needed:

1. **Which AI API?** 
   - Existing OpenRouter GPT-4o for game generation
   - Should entity generation use same or different API?

2. **What should the API generate?**
   - Full entity definition (physics, sprite, behaviors)?
   - Just sprite/visual properties?
   - Integrate with asset pipeline?

3. **Integration approach**
   - Direct API call from modal?
   - tRPC endpoint?
   - Reuse existing game generation infrastructure?

#### Options

| Option | Pros | Cons |
|--------|------|------|
| A: Reuse Game Generator | Consistent architecture | May be overkill |
| B: New Entity Endpoint | Focused, simpler | Duplicates AI logic |
| C: Client-Side Asset Gen | Immediate feedback | Exposes credentials |

#### Related Files
- `app/components/editor/AIGenerateModal.tsx`
- `api/src/ai/generator.ts`
- `api/src/ai/templates/`
- `shared/src/types/entity.ts`

---

### ht-002: Implement Sheet Prompt Builder

**Priority**: Low  
**Status**: Open  
**Source**: `api/src/ai/pipeline/prompt-builder.ts:80`

#### The Problem
`buildSheetPrompt()` returns a TODO placeholder. Sprite sheets would allow generating multiple sprites in a single image.

#### Why Human Required
Design decisions needed:

1. **Layout Strategy**
   - Grid (4x4, 8x8)?
   - Packed layout?
   - How to specify in prompt?

2. **Prompt Engineering**
   - Instruct AI for multiple sprites?
   - Consistent style across sheet?
   - Spacing/padding?

3. **Use Cases**
   - Animation frames (walk cycle)?
   - Variations (different colors)?
   - Related objects (UI elements)?

4. **Integration**
   - img2img or txt2img?
   - Background removal?
   - Slicing algorithm?

#### Options

| Option | Description |
|--------|-------------|
| A: Grid-Based | Explicit grid layout in prompt |
| B: Animation Frames | Focus on sequences |
| C: Defer to Post-Processing | Generate individually, composite |

#### Related Files
- `api/src/ai/pipeline/prompt-builder.ts`
- `api/src/ai/pipeline/types.ts`
- `api/src/ai/scenario.ts`

#### Notes
Low priority because individual sprite generation works well and no immediate use case requires sprite sheets.

---

## Architectural Decisions (Oracle Plans)

All Oracle consultation plans are **decision records**, not tasks. They document the "why" behind technical choices.

### Completed Decisions (21 total)

| Date | Decision | Summary |
|------|----------|---------|
| 2026-01-22 | Cross-entity refs | O(1) ID lookups + safe helpers; defer tag queries |
| 2026-01-22 | Platform-specific modules | Shared index + verify.ts pattern |
| 2026-01-22 | Input-action system | Decoupled architecture |
| 2026-01-22 | Telemetry integration | Event tracking design |
| 2026-01-22 | Drag system architecture | Multiple consultations |
| 2026-01-22 | Aspect ratio architecture | Responsive design approach |
| 2026-01-22 | Game editor MVP | Minimal viable editor scope |
| 2026-01-22 | Asset pack architecture | Pack + sprite overrides + parallax |
| 2026-01-22 | Game engine primitives | Physics entity design |
| 2026-01-22 | Children's game patterns | Kid-friendly design constraints |
| 2026-01-23 | Predictive physics architecture | Pre-computation strategy |
| 2026-01-23 | Asset URL solution | R2 + CDN strategy |

#### Archived Plans
All 21 plans are stored in `.opencode/plans/`. Consider archiving completed plans older than 30 days.

---

## External Integrations

### Authentication & Database
- **Supabase**: Authentication, database, storage
- **Project ID**: `bqoepxmdaiggnwjjszsd`
- **Dashboard**: https://supabase.com/dashboard/project/bqoepxmdaiggnwjjszsd/

### OAuth
- **Google Cloud Console**: OAuth credentials
- **URL**: https://console.cloud.google.com/auth/clients?project=slopcade

### AI & Media
- **Scenario.com**: Sprite and image generation
- **ElevenLabs**: Sound effects generation
- **OpenRouter**: GPT-4o for game generation

---

## Documentation Structure

```
docs/
├── INDEX.md                      # Documentation hub
├── godot-migration/              # Godot integration
├── godot/                        # Godot-specific docs
├── asset-generation-knowledge.md # Asset pipeline
├── asset-pipeline.md             # Asset types & stages
├── storybook-setup.md            # Storybook config
├── game-maker/                   # Game generation docs
├── shared/
│   ├── reference/
│   │   ├── registry-system.md    # Registry patterns
│   │   └── sound-generation.md   # ElevenLabs
│   └── architecture/             # Shared patterns
└── archive/                      # Deprecated docs
```

---

## Memory System

### Directory Structure

| Path | Purpose |
|------|---------|
| `.opencode/memory/ROADMAP.md` | This file - comprehensive roadmap |
| `.opencode/memory/roadmap/active/` | Individual feature docs |
| `.opencode/memory/roadmap/completed/{date}/` | Archived completed features |
| `.opencode/memory/human-tasks/` | Blockers requiring human decision |
| `.opencode/memory/graph.yaml` | Auto-generated knowledge graph |
| `.opencode/memory/chronicler-log.md` | Audit trail |
| `.opencode/plans/` | Oracle architectural decisions |
| `.opencode/AGENTS.md` | Project conventions & patterns |

### Commands

| Command | Action |
|---------|--------|
| `/chronicler` | Quick sync - scan plans, update graph |
| `/chronicler bootstrap --deep` | Full repo scan, rebuild graph |
| `/chronicler audit` | Find inconsistencies, propose cleanup |

---

## Next Steps

### Immediate (This Week)

1. **ht-001**: Decide on AI generation API approach
2. **ht-001**: Implement API call in `AIGenerateModal`

### Short-Term (This Month)

3. **ht-002**: Design sprite sheet layout strategy
4. **ht-002**: Implement `buildSheetPrompt()`
5. **Archive**: Move completed Oracle plans to `roadmap/completed/2026-01/`

### Medium-Term (Q1 2026)

6. **Animation System**: Sprite sheet slicing + frame playback
7. **Sound Generation**: ElevenLabs integration
8. **Mobile Editor**: Touch-optimized game editor UI
9. **Multiplayer**: Real-time sync for shared games

---

## Tech Stack

### Core
- **React Native** - Mobile-first UI
- **Expo** - Build & deployment
- **TypeScript** - Type safety

### Backend
- **Cloudflare Workers** - API server
- **tRPC** - Type-safe APIs
- **Supabase** - Auth & database

### Game Engine
- **Godot 4** - Physics & rendering (native + WASM)

### AI & Media
- **OpenRouter** - GPT-4o
- **Scenario.com** - Image generation
- **ElevenLabs** - Audio generation

### Development
- **Storybook** - Component documentation
- **NativeWind** - Tailwind CSS for RN
- **DevMux** - Service orchestration
- **pnpm** - Monorepo management

---

*This roadmap is maintained by the Chronicler agent. Run `/chronicler bootstrap --deep` to regenerate the knowledge graph.*
