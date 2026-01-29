# Slopcade Asset Generation

> **Trigger**: When generating game assets, sprites, backgrounds, or working with AI image generation (Modal.com or Scenario.com).
>
> **Purpose**: Complete workflow for AI-powered game asset generation using Modal (ComfyUI/Flux) or Scenario.com APIs.

---

## When to Load This Skill

Load this skill when working on:
- **AI image generation** for game assets
- **Sprite generation** (entity sprites, items, characters)
- **Background images** (game backgrounds, title heroes)
- **UI components** (buttons, panels, icons)
- **Asset pipelines** (generation workflows, batch processing)
- **Modal.com integration** (ComfyUI, Flux model)
- **Scenario.com integration** (managed API)
- **Asset storage** (R2 CDN, URL management)

**Don't load for**: Game logic/rules (use `slopcade-game-engine`), 3D models (use `slopcade-3d-assets`), app icons (use `slopcade-icon-generation`).

---

## Quick Reference Links

### Architecture & Overview
| Document | Purpose | Location |
|----------|---------|----------|
| **Image Generation Architecture** | Unified Modal/Scenario system | `docs/IMAGE_GENERATION_ARCHITECTURE.md` |
| **Asset Pipeline Guide** | Complete pipeline documentation | `docs/asset-pipeline.md` |
| **Asset Generation Knowledge** | Pipeline deep dive | `docs/asset-generation-knowledge.md` |
| **UI Generation Guide** | UI component generation | `docs/asset-generation/UI-GENERATION-GUIDE.md` |
| **Modal Migration Guide** | Migration from Scenario to Modal | `docs/MODAL_MIGRATION_GUIDE.md` |
| **Sprite Generation** | Sprite-specific patterns | `docs/game-maker/reference/sprite-generation.md` |

### Configuration & Setup
| Document | Purpose | Location |
|----------|---------|----------|
| **Scenario Setup** | API credentials and config | `docs/shared/log/2026/2026-01-21-scenario-setup.md` |
| **Asset System Plan** | System architecture | `docs/game-maker/plans/asset-system.md` |
| **Asset Integration Design** | Two-phase generation | `docs/game-maker/architecture/asset-integration-design.md` |
| **Testing Asset Generation** | Test workflows | `docs/game-maker/guides/testing-asset-generation.md` |

### Status & Progress
| Document | Purpose | Location |
|----------|---------|----------|
| **Asset Generation Continuation** | Current work status | `docs/asset-generation/CONTINUATION.md` |
| **Phase 1 Complete** | Initial asset generation | `docs/asset-generation-phase1-complete.md` |
| **Asset Integration Complete** | Integration status | `docs/asset-integration-complete.md` |
| **Modal Business Metrics** | Cost analysis | `docs/MODAL_BUSINESS_METRICS.md` |

---

## Architecture Overview

The asset generation system supports **two providers** through a unified interface:

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR CODE                                │
│  (CLI tools, TRPC routes, Pipeline stages)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AssetService (Unified Interface)               │
│  (provider-agnostic operations)                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────┐       ┌──────────────────┐
│     MODAL       │       │    SCENARIO      │
│  ComfyUI/Flux   │       │   .com API       │
│  Self-hosted    │       │  Managed         │
└─────────────────┘       └──────────────────┘
```

**Default Provider**: Modal (ComfyUI with Flux.1-dev-fp8)

---

## Quick Start: Generate Game Assets

### Step 1: Create Asset Config

Create `api/scripts/game-configs/<game-id>.ts`:

```typescript
import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../src/ai/pipeline/types';

export const myGameConfig: GameAssetConfig = {
  gameId: 'my-game',
  gameTitle: 'My Game',
  theme: 'Neon cyberpunk city at night with glowing signs',
  style: 'pixel',  // 'pixel' | 'cartoon' | '3d' | 'flat'
  r2Prefix: 'generated/my-game',
  assets: [
    // Entity sprites
    {
      type: 'entity',
      id: 'player',
      shape: 'circle',
      width: 0.5,
      height: 0.5,
      entityType: 'character',
      description: 'A brave pixel art knight with shining armor',
    } as EntitySpec,
    
    // Background (REQUIRED)
    {
      type: 'background',
      id: 'background',
      prompt: 'Cyberpunk city skyline at night, neon lights reflecting on wet streets, towering skyscrapers with holographic billboards',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    
    // Title hero (REQUIRED)
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'My Game',
      themeDescription: 'Bold neon text with cyberpunk city background, glowing effects',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
```

### Step 2: Register Config

Add to `api/scripts/game-configs/index.ts`:

```typescript
import { myGameConfig } from './my-game';

export const gameConfigs: Record<string, GameAssetConfig> = {
  // ... existing configs
  'my-game': myGameConfig,
};
```

### Step 3: Run Generation

```bash
# Using Modal (default)
hush run -- npx tsx api/scripts/generate-game-assets.ts my-game

# Using Scenario (requires API keys)
export IMAGE_GENERATION_PROVIDER=scenario
export SCENARIO_API_KEY=xxx
export SCENARIO_SECRET_API_KEY=xxx
hush run -- npx tsx api/scripts/generate-game-assets.ts my-game

# Dry run to preview
npx tsx api/scripts/generate-game-assets.ts my-game --dry-run
```

### Step 4: Use in Game

```typescript
const ASSET_BASE = "https://slopcade-api.hassoncs.workers.dev/assets/generated/my-game";

const game: GameDefinition = {
  metadata: {
    id: "my-game",
    title: "My Game",
    titleHeroImageUrl: `${ASSET_BASE}/title_hero.png`,  // REQUIRED
  },
  background: {
    type: "static",
    imageUrl: `${ASSET_BASE}/background.png`,  // REQUIRED
  },
  templates: {
    player: {
      sprite: {
        type: "image",
        imageUrl: `${ASSET_BASE}/player.png`,
        imageWidth: 0.5,
        imageHeight: 0.5,
      },
      // ... physics, behaviors
    },
  },
  // ... rest of game
};
```

---

## Provider Comparison

| Feature | Modal (Default) | Scenario.com |
|---------|-----------------|--------------|
| **Monthly Minimum** | $0 | $45 |
| **Per Image** | ~$0.042 (512×512) | ~$0.02 (with subscription) |
| **Cold Start** | 2-3 minutes | None |
| **Warm Generation** | ~35 seconds | ~2-5 seconds |
| **Model** | Flux.1-dev-fp8 | Proprietary + Flux |
| **API Keys** | Not required | Required |
| **Best For** | Development, variable volume | Production, consistent volume |

**Recommendation**: Use Modal for development, evaluate Scenario for >2,500 images/month.

---

## Provider Configuration

### Environment Variables

```bash
# Provider selection
export IMAGE_GENERATION_PROVIDER=modal  # 'modal' (default) or 'scenario'

# Modal (optional - has defaults)
export MODAL_ENDPOINT="https://hassoncs--slopcade-comfyui-web-img2img.modal.run"

# Scenario (required if using scenario)
export SCENARIO_API_KEY="your-api-key"
export SCENARIO_SECRET_API_KEY="your-api-secret"
export SCENARIO_API_URL="https://api.cloud.scenario.com"  # Note: cloud.scenario.com, not scenario.com
```

### Code Usage

```typescript
import { AssetService } from './ai/assets';

// Works with either provider based on env
const assetService = new AssetService(env);

// Generate asset
const result = await assetService.generateAsset({
  entityType: 'character',
  description: 'A magical wizard',
  style: 'pixel',
  size: { width: 512, height: 512 }
});
// Returns: { assetId: string, url: string }

// Image to image
const img2img = await assetService.generateDirect({
  prompt: "Make it golden",
  imageAssetId: originalAssetId,
  strength: 0.6
});

// Remove background
const noBg = await assetService.removeBackground({
  image: assetId
});

// Batch generation
const batch = await assetService.generateBatch([
  { entityType: 'item', description: 'Sword' },
  { entityType: 'item', description: 'Shield' }
]);
```

---

## Asset Types

| Type | Purpose | Required Fields |
|------|---------|-----------------|
| `entity` | Game object sprites | `shape`, `width`, `height`, `entityType`, `description` |
| `background` | Game background | `prompt`, `width`, `height` |
| `title_hero` | Title/logo image | `title`, `themeDescription`, `width`, `height` |
| `parallax` | Multi-layer backgrounds | `prompt`, `layerCount`, `width`, `height` |
| `ui_component` | UI elements | `componentType`, `themeDescription` |

### Entity Types

| Type | Use For | Example |
|------|---------|---------|
| `character` | Player, NPCs | Hero, enemy wizard |
| `enemy` | Hostile entities | Monster, obstacle |
| `item` | Collectibles, projectiles | Coin, ball, bullet |
| `platform` | Static terrain | Ground, wall, platform |
| `background` | Decorative | Clouds, trees |
| `ui` | Interface elements | Button, panel |

---

## Key Code Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| **AssetService** | `api/src/ai/assets.ts` | Main unified interface |
| **Modal Client** | `api/modal/comfyui.py` | ComfyUI/Flux deployment |
| **Scenario Client** | `api/src/ai/scenario.ts` | Scenario.com API client |
| **Pipeline Types** | `api/src/ai/pipeline/types.ts` | TypeScript interfaces |
| **Game Configs** | `api/scripts/game-configs/*.ts` | Per-game asset configs |
| **Generation Script** | `api/scripts/generate-game-assets.ts` | CLI entry point |
| **TRPC Routes** | `api/src/trpc/routes/asset-system.ts` | Backend CRUD API |
| **R2 Storage** | Cloudflare R2 | Asset CDN storage |

---

## Generation Pipeline

The asset generation follows a **two-phase pipeline**:

### Phase 1: Game Definition (Immediate)
- Game is playable immediately with shape sprites
- Physics and gameplay work without assets

### Phase 2: Asset Enrichment (Async)
- Assets generated in parallel (30-60s)
- Images uploaded to R2 CDN
- Game definition updated with image URLs
- Zero downtime, no blocking

```
GameDefinition Created
        ↓
┌──────────────────┐     ┌──────────────────┐
│ Phase 1: Playable│────→│ Phase 2: Enrich  │
│ (shape sprites)  │     │ (AI generation)  │
└──────────────────┘     └──────────────────┘
        ↓                        ↓
   Game playable           Assets uploaded
   immediately             to CDN
                                 ↓
                        Game auto-updates
                        with real sprites
```

See full architecture: `docs/game-maker/architecture/asset-integration-design.md`

---

## Testing Asset Generation

```bash
# Run unit tests (mocked, no API calls)
pnpm test:run src/ai/__tests__/scenario-client.test.ts

# Run visual tests (requires API credentials)
hush run -- npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts

# Test specific model
npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts --model=model_retrodiffusion-plus

# API-only test (no generation)
npx tsx api/src/ai/__tests__/scenario-visual-test-runner.ts --api-only
```

---

## Modal.com Management

```bash
# View deployment
modal apps list

# View logs
modal logs slopcade-comfyui
modal logs slopcade-comfyui --follow

# Deploy updates
cd api/modal
modal deploy comfyui.py

# Run locally
modal run comfyui.py
```

**Endpoint**: `https://hassoncs--slopcade-comfyui-web-img2img.modal.run`

---

## Asset URL Format

Generated assets are stored on R2 CDN:

```
https://slopcade-api.hassoncs.workers.dev/assets/generated/{gameId}/{assetId}.png
```

Examples:
- `.../generated/flappyBird/bird.png`
- `.../generated/bubbleShooter/background.png`
- `.../generated/puyoPuyo/title_hero.png`

---

## Common Workflows

### Regenerate Specific Assets

```bash
# Regenerate just the player sprite
npx tsx api/scripts/generate-game-assets.ts my-game --filter=player

# Regenerate background only
npx tsx api/scripts/generate-game-assets.ts my-game --type=background
```

### Debug Generation Issues

1. Check intermediate files:
   ```
   api/debug-output/{gameId}/{assetId}/
   ├── 1-original.png
   ├── 2-masked.png
   ├── 3-silhouette.png
   ├── 4-final.png
   └── metadata.json
   ```

2. View generation logs in database
3. Check provider status (Modal/Scenario)

See troubleshooting: `docs/asset-generation/CONTINUATION.md`

---

## Related Skills

| Skill | Use When Working On |
|-------|---------------------|
| `slopcade-game-engine` | Game logic, entities, physics, rules |
| `slopcade-3d-assets` | GLB models, 3D rendering |
| `slopcade-icon-generation` | App icons, favicons |
| `game-inspector` | Testing generated assets in-game |

---

## Checklist for Asset Generation

- [ ] Asset config created at `api/scripts/game-configs/<game-id>.ts`
- [ ] All entity sprites defined with descriptions
- [ ] Background asset included (REQUIRED)
- [ ] Title hero asset included (REQUIRED)
- [ ] Config registered in `index.ts`
- [ ] Provider configured (Modal default or Scenario keys)
- [ ] Generation script run successfully
- [ ] Assets accessible via CDN URLs
- [ ] Game references assets correctly
- [ ] Visual review of generated assets
- [ ] Regeneration requested for any poor quality assets

---

## Version

Last updated: 2026-01-29  
Skill version: 1.0.0
