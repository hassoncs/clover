# Current State: Asset Integration in Game Generation

> **Status**: Documented Jan 21, 2026  
> **Purpose**: Understand how scenario.com asset generation currently (doesn't) integrate with game generation

---

## Executive Summary

**Current Reality**: Game generation and asset generation are **completely decoupled** systems. When a user generates a game, they get colored shapes (rectangles/circles), NOT AI-generated sprites. The asset generation system exists but is never called during game creation.

---

## What Works Today

### 1. Game Generation (`api/src/ai/generator.ts`)

**Flow:**
```
User Prompt → classifyPrompt() → GameIntent → LLM → GameDefinition JSON
```

**Output Example:**
```json
{
  "entities": [
    {
      "id": "player-cat",
      "sprite": {
        "type": "circle",
        "radius": 0.5,
        "color": "#4CAF50"
      }
    }
  ]
}
```

**Note**: `sprite` is always a **shape** (rect/circle/polygon), never an image URL.

### 2. Asset Generation (`api/src/ai/assets.ts`)

**Flow:**
```
AssetRequest → selectModel() → buildPrompt() → scenario.com API → R2 Upload → assetUrl
```

**Can Generate:**
- Character sprites (pixel art, cartoon, 3D)
- Enemy sprites
- Item icons
- Platform tiles
- Backgrounds
- UI elements

**Models Used:**
| Entity Type | Model | Output Size |
|-------------|-------|-------------|
| Character (pixel) | `model_retrodiffusion-plus` | 256×256 |
| Animation (pixel) | `model_retrodiffusion-animation` | 384×64 (6 frames) |
| Platform tiles | `model_retrodiffusion-tile` | 256×256 tileable |
| 3D icons | `model_7v2vV6NRvm8i8jJm6DWHf6DM` | 256×256 |

**Returns:**
```typescript
{
  success: true,
  assetUrl: "https://assets.clover.app/generated/character/uuid.png",
  r2Key: "generated/character/uuid.png",
  scenarioAssetId: "asset-123"
}
```

### 3. Sprite Component Structure (`shared/src/types/sprite.ts`)

**Supports 4 Types:**
```typescript
type SpriteComponent =
  | RectSpriteComponent    // { type: 'rect', width, height, color }
  | CircleSpriteComponent  // { type: 'circle', radius, color }
  | PolygonSpriteComponent // { type: 'polygon', vertices, color }
  | ImageSpriteComponent   // { type: 'image', imageUrl, imageWidth, imageHeight }
```

**Current Usage**: Only rect/circle/polygon. `ImageSpriteComponent` exists but is **never populated** by game generator.

---

## The Problem

### Example: User Prompt
> "I want a game where a cat launches balls at stacked blocks"

### What User Expects
- 🐱 Cat sprite (AI-generated pixel art)
- ⚽ Ball sprite (AI-generated)
- 🧱 Block sprites (AI-generated tileable)

### What User Actually Gets
```json
{
  "entities": [
    { "id": "launcher", "sprite": { "type": "circle", "color": "#4CAF50" } },
    { "id": "ball", "sprite": { "type": "circle", "color": "#FF5722" } },
    { "id": "block-1", "sprite": { "type": "rect", "color": "#8B4513" } }
  ]
}
```

**Result**: Colored shapes only. No cat, no ball textures, no block sprites.

---

## Why It's Broken

### 1. **No Integration Point**

`generator.ts` **never calls** `AssetService`:
```typescript
// generator.ts line 194
export async function generateGame(prompt: string, config: AIConfig) {
  const intent = classifyPrompt(prompt);
  const model = createModel(config);
  
  // LLM generates complete GameDefinition
  const result = await generateObject({
    model,
    schema: GameDefinitionSchema,
    system: SYSTEM_PROMPT,
    prompt: buildGenerationPrompt(prompt, intent),
  });
  
  // AssetService NEVER called here ❌
  return { success: true, game: result.object };
}
```

### 2. **No Asset Descriptions in Entity Data**

Entities have IDs like `"player-cat"` but no explicit asset request:
```json
{
  "id": "player-cat",
  "tags": ["player"],
  "sprite": { "type": "circle", "color": "#FF0000" }
  // ❌ No: assetDescription, assetCategory, or imageUrl
}
```

### 3. **Sprite Sizing Chicken-and-Egg Problem**

- Physics bodies need dimensions BEFORE asset generation
- Assets come back at fixed sizes (256×256, 64×64)
- Current system can't coordinate: "generate 64×64 ball image to fit this 0.4m physics body"

### 4. **No Fallback Strategy**

If we DID integrate asset generation:
- What if scenario.com is down? ❌ No fallback
- What if it takes 60 seconds? ❌ No progressive loading
- What if only some assets fail? ❌ No partial success handling

---

## Current API Endpoints

### `POST /games/generate`

**Request:**
```typescript
{
  prompt: "cat launches balls at blocks",
  saveToLibrary: false
}
```

**Response:**
```typescript
{
  game: GameDefinition,      // With shape sprites only
  intent: GameIntent,
  validation: { valid: true },
  retryCount: 0
}
```

**Missing:**
- No `assetJobId`
- No `assetsGenerating: boolean`
- No way to request "with assets"

### `POST /assets/generate` (Separate Endpoint)

**Exists but not connected to game generation.**

User would have to:
1. Generate game (gets shapes)
2. Manually call `/assets/generate` for each entity
3. Manually patch entity JSON with returned `assetUrl`
4. Re-upload modified game

**This workflow is not exposed in UI and never happens.**

---

## Data Flow (Current)

```
┌─────────────┐
│ User Prompt │
└──────┬──────┘
       │
       v
┌────────────────┐
│ classifyPrompt │
└───────┬────────┘
        │ GameIntent
        v
┌────────────────┐
│ LLM (GPT-4o)   │
│ generateObject │
└───────┬────────┘
        │ GameDefinition
        v
┌────────────────────┐
│ Validate & Return  │
│ (shapes only)      │
└────────────────────┘


NEVER REACHED:
┌─────────────────────┐
│ AssetService        │
│ (exists but unused) │
└─────────────────────┘
```

---

## What Needs to Change

### Architectural Requirements

1. **Asset Request Inference**
   - LLM must output explicit asset descriptions per entity
   - OR: Parse entity IDs/tags to infer asset needs ("player-cat" → character:cat)

2. **Two-Phase Generation**
   - Phase 1: Generate playable GameDefinition (shapes, working physics)
   - Phase 2: Async asset enrichment (parallel scenario.com calls)

3. **Sprite Coordination**
   - Entity physics/gameplay sizes must be stable BEFORE asset generation
   - Assets rendered at arbitrary sizes must scale to fit entity dimensions

4. **Graceful Degradation**
   - Game playable immediately with shapes
   - Assets stream in as they complete
   - Failed assets → keep shape fallback

5. **Performance**
   - 10+ entities × 30s each = 5 minutes (sequential) ❌
   - Parallel generation with deduplication = 30-60s ✅

---

## Test Coverage

### What's Tested ✅
- `AssetService.selectModel()` - 11 test cases
- `AssetService.buildPrompt()` - 6 entity types
- `ScenarioClient` API methods - 46 unit tests
- Real API integration - 9/11 models verified working

### What's NOT Tested ❌
- Game generator calling AssetService
- Entity JSON with `imageUrl` populated
- Partial asset failure handling
- Performance of parallel asset generation
- Cache/deduplication logic

---

## Files Involved

| File | Role | Assets Integrated? |
|------|------|-------------------|
| `api/src/ai/generator.ts` | Game generation orchestration | ❌ No |
| `api/src/ai/assets.ts` | Asset generation service | N/A (works standalone) |
| `api/src/ai/scenario.ts` | scenario.com API client | N/A |
| `api/src/trpc/routes/games.ts` | `/games/generate` endpoint | ❌ No |
| `api/src/trpc/routes/assets.ts` | `/assets/generate` endpoint | Separate |
| `shared/src/types/sprite.ts` | Sprite data model | ✅ Supports images |
| `shared/src/types/entity.ts` | Entity structure | ❌ No asset metadata |

---

## Performance Characteristics

### Asset Generation Timings (Real Measurements)

| Model | Avg Time | Size |
|-------|----------|------|
| `model_retrodiffusion-plus` | 29s | 256×256 PNG |
| `model_retrodiffusion-animation` | 46s | 384×64 GIF |
| `model_retrodiffusion-tile` | 67s | 256×256 PNG |
| `model_c8zak5M1VGboxeMd8kJBr2fn` | 29s | 512×512 JPG |
| `model_7v2vV6NRvm8i8jJm6DWHf6DM` | 12s | 256×256 JPG |

**Total for typical game (10 entities, sequential)**: 290-400 seconds (5-7 minutes) ❌

**With parallel generation (max 4 concurrent)**: 60-90 seconds ✅

---

## Next Steps

See `ASSET_INTEGRATION_DESIGN.md` for:
- Recommended architecture (two-phase pipeline)
- Data model changes needed
- Implementation plan
- Migration strategy

---

## Questions This Document Answers

- ✅ Why don't generated games have sprites?
- ✅ Does the asset generation system work? (Yes, tested)
- ✅ What prevents integration? (No orchestration layer)
- ✅ What sprite types are supported? (rect/circle/polygon/image)
- ✅ How long does asset generation take? (12-67s per asset)
- ✅ Can we generate assets in parallel? (Yes, with bounded concurrency)
