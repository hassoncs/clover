# Scenario.com API Integration TODO

> Investigation tasks to determine proper API calling patterns for sprite generation.

---

## Phase 6: Asset Generation - Implementation Tasks

### 🔍 Investigation Tasks

#### 1. Test Retro Diffusion Models

**RD Plus (Static Sprites)**
- [ ] Test `model_retrodiffusion-plus` with simple character prompt
- [ ] Verify 256×256 native output
- [ ] Test palette limitations (how many colors?)
- [ ] Test with transparency prompts
- [ ] Document optimal prompt structure

**RD Animation (Frame Sequences)**
- [ ] Test `model_retrodiffusion-animation` with walk cycle prompt
- [ ] Verify grid output format (how many frames? what layout?)
- [ ] Test 32×32 vs 48×48 frame sizes
- [ ] Document how to specify frame count
- [ ] Test consistency across frames

**RD Tile (Tilesets)**
- [ ] Test `model_retrodiffusion-tile` with ground tile prompt
- [ ] Verify seamless tiling
- [ ] Test with different material types (grass, stone, water)
- [ ] Document tile size options

#### 2. Test Alternative Models

- [ ] Compare `model_p1dBcEaYQ5jUjB2brcf8bb1W` (Pixel Art XL) quality vs RD Plus
- [ ] Test `model_pixel-snapper` for converting existing art
- [ ] Test `model_scenario-grid-maker` for assembling sprites
- [ ] Test `model_scenario-image-slicer` for extracting frames

#### 3. Test Image-to-Image Workflow

- [ ] Upload reference image with `upload_image`
- [ ] Use `image_to_image` with reference for pose variations
- [ ] Test different `strength` values (0.3, 0.5, 0.7)
- [ ] Verify character consistency across variations

#### 4. Test Background Removal

- [ ] Test `remove_background` on generated sprites
- [ ] Verify transparency quality
- [ ] Test with different sprite types (character, item, UI)

---

### 🏗️ Implementation Tasks

#### API Integration (`api/src/ai/assets.ts`)

```typescript
// Structure to implement
interface AssetGenerationRequest {
  entityType: 'character' | 'item' | 'platform' | 'background' | 'ui';
  description: string;
  style: 'pixel' | 'cartoon' | '3d' | 'flat';
  size: { width: number; height: number };
  animated?: boolean;
  frameCount?: number;
}

interface AssetGenerationResult {
  success: boolean;
  assetUrl?: string;
  frames?: string[];  // For animated sprites
  error?: string;
}
```

**Tasks:**
- [ ] Create `api/src/ai/assets.ts`
- [ ] Implement model selection based on asset type
- [ ] Implement prompt generation for each entity type
- [ ] Handle Scenario.com API responses
- [ ] Implement retry logic for failures
- [ ] Add asset validation (dimensions, format)

#### Storage Integration

- [ ] Set up R2 bucket for assets
- [ ] Implement upload to R2
- [ ] Generate CDN URLs
- [ ] Implement caching strategy
- [ ] Add asset deduplication (hash-based)

#### tRPC Endpoints

- [ ] `assets.generate` - Generate single asset
- [ ] `assets.generateBatch` - Generate multiple assets
- [ ] `assets.regenerate` - Regenerate with new prompt
- [ ] `assets.upload` - Upload custom asset

---

### 📋 Prompt Templates to Create

#### Character Sprites
```
pixel art [CHARACTER_TYPE] character, [STYLE]-bit style, [VIEW] view,
[DETAILS], transparent background, game sprite, clean edges
```

#### Platform/Ground Tiles
```
pixel art [MATERIAL] tile, [STYLE]-bit style, top-down view,
tileable seamless pattern, game tileset, no border artifacts
```

#### Items/Collectibles
```
pixel art [ITEM_TYPE] icon, [STYLE]-bit style, [SIZE]x[SIZE] pixels,
centered, transparent background, game item, simple design
```

#### Enemies
```
pixel art [ENEMY_TYPE] character, [STYLE]-bit style, side view,
menacing appearance, [DETAILS], transparent background, game sprite
```

---

### 🧪 Test Cases

| Test | Input | Expected Output |
|------|-------|-----------------|
| Static character | "knight" | 256×256 pixel art knight |
| Walk cycle | "knight walking" | 6-frame horizontal grid |
| Ground tile | "grass ground" | Seamless tileable grass |
| Item | "gold coin" | Small centered coin icon |
| Background | "forest scene" | Parallax-ready background |

---

### 📊 Model Selection Matrix

| Entity Type | Style | Recommended Model |
|-------------|-------|-------------------|
| Character (retro) | pixel | `model_retrodiffusion-plus` |
| Character (modern) | cartoon | `model_c8zak5M1VGboxeMd8kJBr2fn` |
| Animation frames | pixel | `model_retrodiffusion-animation` |
| Ground tiles | pixel | `model_retrodiffusion-tile` |
| UI elements | any | `model_mcYj5uGzXteUw6tKapsaDgBP` |
| Icons | 3D | `model_7v2vV6NRvm8i8jJm6DWHf6DM` |
| Backgrounds | cartoon | `model_hHuMquQ1QvEGHS1w7tGuYXud` |

---

### ⚠️ Known Limitations to Handle

1. **Grid alignment not guaranteed** - Need post-processing to validate/fix
2. **Character consistency** - May need reference image workflow
3. **Palette variance** - Quantize all assets to consistent palette
4. **Transparency quality** - May need manual cleanup
5. **Animation timing** - AI doesn't understand game frame rates

---

### 🔄 Fallback Strategy

If AI generation fails:
1. Return colored shape placeholder based on entity type
2. Log failure for analysis
3. Allow user to retry or upload custom asset
4. Consider template-based fallbacks

---

## Success Criteria

- [ ] Generate playable game with AI sprites in < 60 seconds
- [ ] 80%+ generated assets usable without manual editing
- [ ] Consistent visual style across all game entities
- [ ] Animation frames align properly in sprite sheets
- [ ] Assets load quickly via CDN
