# Slopcade Project Roadmap

**Last Updated**: 2026-01-27
**Status**: Active Development

---

## 🚀 NEW: Strategic Game Portfolio Development

**Status**: 🔴 HIGHEST PRIORITY - Execute Immediately  
**Priority**: CRITICAL  
**Strategic Document**: [docs/STRATEGIC_GAME_RECOMMENDATIONS.md](../../docs/STRATEGIC_GAME_RECOMMENDATIONS.md)

### Overview
Based on comprehensive market research (top iOS games 2025, AI image generation trends, kids gaming analytics), we are prioritizing **6 AI-first game concepts** that leverage our unique competitive advantages:
- Physics-based gameplay (Box2D + Godot)
- AI image generation pipeline (Scenario.com)
- Declarative game definitions (JSON-based rapid prototyping)

### Phase 1: Quick Wins (Week 1-2) 🔥

| # | Game | Status | Effort | Goal |
|---|------|--------|--------|------|
| 1 | **PromptPals Closet Dash** (Endless Runner + Avatar) | 🔴 TODO | 2-3 days | Showcase AI magic immediately |
| 2 | **PromptPegs Party** (Peggle + Themes) | 🔴 TODO | 1-2 days | Quick win, reuse slopeggle |
| 3 | **RoomDrop Designer** (Physics Decoration) | 🔴 TODO | 2-3 days | Hit #1 kid trend |

### Phase 2: Character Attachment (Week 3-4)

| # | Game | Status | Effort | Goal |
|---|------|--------|--------|------|
| 4 | **Pet Pocket Parkour** (Platformer + Pet) | 🔴 TODO | 3-4 days | Build emotional connection |
| 5 | **Build-a-Buddy Pinball** (Customizable Tables) | 🔴 TODO | 2-3 days | Introduce UGC-lite |

### Phase 3: Long-term Play (Month 2)

| # | Game | Status | Effort | Goal |
|---|------|--------|--------|------|
| 6 | **ToyBox Physics Sandbox** (Prompt-to-Object) | 🔴 TODO | 1-2 weeks | Community + retention |

### Success Metrics

| Game | D1 Retention Target | Key Action |
|------|---------------------|------------|
| PromptPals Closet Dash | 45% | Create 3+ avatars |
| RoomDrop Designer | 40% | Spend 5+ min decorating |
| Pet Pocket Parkour | 50% | Play 10+ levels |
| All Games | - | Pass "viral prompt" test |

### Market Intelligence Summary

- **Block Blast!**: #1 downloaded (puzzle mechanics)
- **Roblox**: 70% of 44M games use AI assets, creator earnings +52% YoY
- **Toca Boca World**: Avatar customization = primary gameplay
- **Genies**: $150M raised for AI avatar platform
- **Top trend for kids 6-12**: Visual customization is THE content

---

## Executive Summary

Slopcade is a physics-based game engine and AI-powered game maker built with React Native. The project has achieved **major milestones** and is currently focused on **production launch readiness**.

**LAUNCH TARGET**: [docs/LAUNCH_ROADMAP.md](../../docs/LAUNCH_ROADMAP.md) - *The definitive path to App Store.*

| Status | Count | Description |
|--------|-------|-------------|
| 🏆 Completed | 2 | Godot 4 integration, Storybook + NativeWind |
| 🚧 In Progress | 6 | Launch Roadmap (New), Asset pipeline (86%), AI game maker, DevMux, Registry, **Strategic Games** |
| 🔴 HIGHEST | 6 | PromptPals, PromptPegs, RoomDrop, Pet Parkour, Pinball Studio, ToyBox Sandbox |
| ⏳ Blocked | 4 | ht-001 (AI API), ht-002 (Sheet prompts), ht-003 (BLE Android), ht-004 (Godot Fonts) |

---

## Today's Focus (2026-01-27)

**Current Sprint**: Strategic Game Portfolio - Phase 1 Launch

See detailed plan: [docs/STRATEGIC_GAME_RECOMMENDATIONS.md](../../docs/STRATEGIC_GAME_RECOMMENDATIONS.md)

**Top Priorities**:
1. **🎮 PromptPals Closet Dash** - Build endless runner with AI avatar customization (Week 1 Goal)
2. **🎨 PromptPegs Party** - Reskin slopeggle with themed peg collection (Quick win)
3. Validate new puzzle game assets generated last night
4. Implement gem & spark economy (Apple IAP architecture + server validation)
5. Test native Bluetooth (iOS/Android) for multiplayer viability

---

## Active Features

### 0. Strategic Game Portfolio Development 🎯

**Status**: 🔴 Just Started  
**Priority**: CRITICAL  
**Started**: 2026-01-27

#### Objective
Build 6 AI-first games targeting high-growth market segments where visual customization is the primary gameplay. Leverage physics engine + AI image generation for unique competitive moat.

#### Games In Development

**Week 1-2: Quick Wins**
- **PromptPals Closet Dash**: Endless runner + AI avatar theming
- **PromptPegs Party**: Slopeggle reskin + sticker collection
- **RoomDrop Designer**: Physics-based room decoration

**Week 3-4: Character Attachment**
- **Pet Pocket Parkour**: Physics platformer + pet customization
- **Build-a-Buddy Pinball**: Customizable pinball tables

**Month 2: Long-term Play**
- **ToyBox Physics Sandbox**: Prompt-to-object creator

#### Progress Tracking

| Game | Status | Started | Target |
|------|--------|---------|--------|
| PromptPals Closet Dash | 🔴 TODO | - | Week 1 |
| PromptPegs Party | 🔴 TODO | - | Week 1 |
| RoomDrop Designer | 🔴 TODO | - | Week 2 |
| Pet Pocket Parkour | 🔴 TODO | - | Week 3 |
| Build-a-Buddy Pinball | 🔴 TODO | - | Week 4 |
| ToyBox Sandbox | 🔴 TODO | - | Month 2 |

#### Key Technical Requirements
- Avatar layering system (head/body/legs/accessories)
- Theme generation API integration
- Furniture collider archetypes
- Pet physics archetype system
- Save/share infrastructure for UGC

#### Documentation
- [Strategic Game Recommendations](../../docs/STRATEGIC_GAME_RECOMMENDATIONS.md)
- Market Research: Task bg_e51919d6
- AI Opportunities: Task bg_70947257

---

### 1. Gem & Spark Economy System

**Status**: 🟡 Just Started
**Priority**: High
**Started**: 2026-01-26

#### Objective
Full in-app purchase economy with Gems (hard currency), Sparks (utility currency), and Slopcade Pro subscription for offline capability.

#### Product Specs (Quantity-Based IDs)

| Product | ID | Current Price | Grants |
|---------|-----|---------------|--------|
| Slopcade Pro | `slopcade.pro.monthly` | $9.99/mo | 500 Gems + 100 Sparks/mo |
| Gems 100 | `slopcade.gems.100` | $1.99 | 100 Gems |
| Gems 300 | `slopcade.gems.300` | $4.99 | 300 Gems |
| Gems 1500 | `slopcade.gems.1500` | $19.99 | 1500 Gems |
| Sparks 50 | `slopcade.sparks.50` | $0.99 | 50 Sparks |
| Sparks 200 | `slopcade.sparks.200` | $2.99 | 200 Sparks |
| Sparks 1000 | `slopcade.sparks.1000` | $9.99 | 1000 Sparks |

**Design:** IDs encode quantities (permanent), prices live in App Store Connect (changeable).

#### Progress (0/7 phases)

| Phase | Status | Notes |
|-------|--------|-------|
| 1. RevenueCat Setup | ⏳ TODO | Create project, configure products in dashboard |
| 2. Database Schema | 🚧 In Progress | apple_transactions, user balance columns |
| 3. Verify Endpoint | ⏳ TODO | /api/iap/verify with Apple JWS validation |
| 4. Notification Endpoint | ⏳ TODO | /api/iap/notification webhook for Apple Server |
| 5. StoreKit Integration | ⏳ TODO | RevenueCat SDK in iOS app |
| 6. UI Components | ⏳ TODO | CreditBalance, purchase screens, Pro badge |
| 7. Offline Mode | ⏳ TODO | JWT validation + local Godot caching |

#### Implementation Notes
- **Provider**: RevenueCat (managed IAP across iOS/Android)
- **Database**: Track balances + purchase history with audit trail
- **Offline Mode**: Encrypted JWT membership validation + local Godot asset caching

#### Documentation
- [Product Spec](docs/economy/PRODUCT_SPEC.md)
- [Launch Roadmap - Section 3](../../docs/LAUNCH_ROADMAP.md)

---

### 2. Type-Driven Asset Generation Pipeline

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

### 3. AI-Powered Game Generation

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

### 4. DevMux Service Orchestration

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

### 5. Universal Lazy Registry System

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

### 6. Godot 4 Game Engine Integration

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

### 7. Storybook + NativeWind Setup

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

### ht-003: Determine BLE Launch Priority

**Priority**: High  
**Status**: Open  
**Source**: `docs/TODAY_2026-01-26.md` Task 2  
**Created**: 2026-01-26

#### The Problem
Bluetooth Low Energy (BLE) local multiplayer is a unique social feature, but Android implementation is missing. Need to decide if this blocks App Store launch.

#### Why Human Required
Strategic decision needed:

1. **Is BLE a launch blocker?**
   - iOS works, Android shows "not implemented" error
   - Multi-player is a key differentiator vs other game makers
   - But: launch can succeed with iOS-only BLE (Android gets it later)

2. **What's the effort?**
   - Port `BLEPeripheralModule.swift` to Kotlin for Android
   - Estimated: 3-5 days of native Android dev
   - Testing: Need multiple Android devices

3. **What's the alternative?**
   - Launch iOS-only BLE, add "Coming Soon" badge on Android
   - Defer to Phase 2 post-launch
   - Focus on core game templates + credit system first

#### Testing Required (Before Decision)
- [ ] Verify iOS BLE works end-to-end (host + join)
- [ ] Document exact Android error message
- [ ] Assess user expectation: is "iOS only" acceptable?

#### Options

| Option | Pros | Cons |
|--------|------|------|
| A: Block launch until Android BLE | Feature parity, better UX | Delays launch 1-2 weeks |
| B: Launch with iOS-only BLE | Faster to market, iOS is premium segment | Feature disparity, potential bad reviews |
| C: Hide BLE until both platforms ready | No feature disparity | Loses unique social hook at launch |

#### Decision Criteria
- If >50% of target users are iOS → Option B viable
- If multiplayer is THE killer feature → Option A required
- If single-player reskinning is sufficient MVP → Option C safe

#### Related Files
- `app/lib/bluetooth/BLEPeripheralManager.ts`
- `ios/slopcade/BLEPeripheralModule.swift`
- Missing: `android/app/src/main/java/.../BLEPeripheralModule.kt`

---

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

### Completed Decisions (22 total)

| Date | Decision | Summary |
|------|----------|---------|
| 2026-01-26 | Physics-first puzzle strategy | Lean into physics (Angry Birds, Triple Town) over logic puzzles (Sudoku); simulation-based validation not BFS |
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
├── INDEX.md                              # Documentation hub
├── STRATEGIC_GAME_RECOMMENDATIONS.md     # 🎯 AI-first game portfolio strategy
├── godot-migration/                      # Godot integration
├── godot/                                # Godot-specific docs
├── asset-generation-knowledge.md         # Asset pipeline
├── asset-pipeline.md                     # Asset types & stages
├── storybook-setup.md                    # Storybook config
├── game-maker/                           # Game generation docs
├── shared/
│   ├── reference/
│   │   ├── registry-system.md            # Registry patterns
│   │   └── sound-generation.md           # ElevenLabs
│   └── architecture/                     # Shared patterns
└── archive/                              # Deprecated docs
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

### Immediate (This Week) - STRATEGIC GAMES PHASE 1

1. **🎮 PromptPals Closet Dash**: Begin endless runner with AI avatar customization
   - [ ] Create game definition structure
   - [ ] Implement avatar layering system (head/body/legs/accessories)
   - [ ] Integrate AI theme generation API
   - [ ] Build runner gameplay (lanes, jumping, collecting)
2. **🎨 PromptPegs Party**: Reskin slopeggle with themed collection
   - [ ] Duplicate slopeggle as base
   - [ ] Add theme generation integration
   - [ ] Create sticker album UI
3. **ht-001**: Decide on AI generation API approach

### Short-Term (This Month) - STRATEGIC GAMES PHASE 2

4. **🛋️ RoomDrop Designer**: Physics-based room decoration
   - [ ] Implement furniture collider archetypes
   - [ ] Build design goal system
   - [ ] Create stability scoring
5. **🐾 Pet Pocket Parkour**: Platformer + pet customization
   - [ ] Build pet physics archetype system
   - [ ] Create platformer levels
   - [ ] Implement accessory system
6. **🏓 Build-a-Buddy Pinball**: Customizable tables
   - [ ] Create module socket system
   - [ ] Build table sharing infrastructure
7. **ht-002**: Design sprite sheet layout strategy
8. **Archive**: Move completed Oracle plans to `roadmap/completed/2026-01/`

### Medium-Term (Q1 2026)

6. **Procedural Level Generation**: Physics-native puzzle generation
   - Structure generator for Angry Birds-style destruction levels
   - Terrain generator for vehicle/marble games
   - Simulation-based validation pipeline
   - See: `docs/plans/physics-puzzle-generation.md`
7. **Ball Sort/Ice Slide Solvability**: State-machine puzzle generation
   - BFS solver for guaranteed-solvable levels
   - Reverse-from-goal generation
   - See: `docs/plans/puzzle-generation-system.md`
8. **Animation System**: Sprite sheet slicing + frame playback
9. **Sound Generation**: ElevenLabs integration
10. **Mobile Editor**: Touch-optimized game editor UI
11. **Multiplayer**: Real-time sync for shared games

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
