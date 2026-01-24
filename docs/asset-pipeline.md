# Asset Generation Pipeline

AI-powered game asset generation using Scenario.com's image generation API.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Asset Generation Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Physics Dimensions    Silhouette PNG      AI Generation        │
│   (width × height) ──▶ (black shape on ──▶ (img2img with    ──▶│
│                         white bg)           silhouette)          │
│                                                                  │
│              Background Removal        Final Asset               │
│         ◀── (transparent PNG) ◀───────────────────────────────  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### AssetService (`api/src/ai/assets.ts`)

Main entry point for asset generation. Handles:
- Silhouette creation from physics dimensions
- Scenario.com API integration
- Background removal
- R2 storage upload

```typescript
const service = new AssetService(env);

// Generate with silhouette-based img2img
const result = await service.generateWithSilhouette({
  templateId: 'player',
  physicsShape: 'box',
  physicsWidth: 1.0,
  physicsHeight: 2.0,
  entityType: 'character',
  style: 'pixel',
  targetWidth: 512,
  targetHeight: 1024,
  themePrompt: 'sci-fi robot',
});
```

### ScenarioClient (`api/src/ai/scenario.ts`)

Low-level Scenario.com API wrapper:
- `uploadAsset()` - Upload image for img2img
- `generateImg2Img()` - Transform silhouette into game asset
- `generate()` - Text-to-image generation
- `removeBackground()` - Extract sprite from background
- `downloadAsset()` - Fetch generated image

### createSilhouettePng

Generates a black silhouette on white background matching physics body dimensions:

```typescript
import { createSilhouettePng } from './assets';

// Creates 512x512 PNG with centered black shape
const pngBuffer = createSilhouettePng('box', 2.0, 0.5);  // 4:1 aspect ratio
const pngBuffer = createSilhouettePng('circle', 1.0, 1.0);
```

## Debug Mode

Enable debug mode to save intermediate files:

```bash
DEBUG_ASSET_GENERATION=true
```

Or set `DEBUG_ASSET_GENERATION: 'true'` in Cloudflare Workers environment.

Debug files are saved to `api/debug-output/`:
- `{id}_silhouette.png` - Input silhouette
- `{id}_result.{ext}` - Generated image (before bg removal)
- `{id}_metadata.json` - Generation parameters and timing
- `{id}_error.json` - Error details (on failure)

## Manual Testing

### Generate Silhouettes

```bash
npx tsx api/scripts/generate-breakout-silhouettes.ts
```

Outputs to `api/debug-output/breakout/` with manifest.json.

### End-to-End Test

```bash
SCENARIO_API_KEY=xxx SCENARIO_SECRET_API_KEY=xxx \
  npx tsx api/scripts/manual-asset-test.ts \
  --shape=box --width=1.2 --height=0.5 \
  --prompt="neon brick, sci-fi, game asset"
```

Options:
- `--skip-img2img` - Use text-to-image (faster, avoids timeouts)
- `--shape=circle|box` - Physics shape
- `--width=N` - Physics width in meters
- `--height=N` - Physics height in meters
- `--prompt="..."` - Generation prompt

## Godot Integration

### Sprite Placement

Godot's `GameBridge.gd` applies asset placement values from sprite data:

```gdscript
# _apply_sprite_scale() handles:
# - scale: multiplier for sprite size
# - offsetX/offsetY: offset from physics body center (in meters)
```

Sprite data can include:
```json
{
  "type": "image",
  "imageUrl": "http://...",
  "imageWidth": 1.2,
  "imageHeight": 0.5,
  "scale": 1.0,
  "offsetX": 0,
  "offsetY": 0
}
```

### AssetConfig in Game Definition

Use `assetPacks` for per-template asset overrides:

```typescript
const game: GameDefinition = {
  assetPacks: {
    "sci-fi-pack": {
      id: "sci-fi-pack",
      name: "Sci-Fi Theme",
      assets: {
        "player": {
          imageUrl: "/assets/generated/player.png",
          scale: 1.0,
          offsetX: 0,
          offsetY: -0.1  // slight upward offset
        }
      }
    }
  },
  activeAssetPackId: "sci-fi-pack",
  // ...
};
```

## Known Limitations

1. **img2img timeouts** - Complex silhouettes may timeout on Scenario.com. Use `--skip-img2img` for text-to-image as fallback.

2. **Aspect ratio rounding** - Canvas dimensions round to 64px increments. Very thin shapes may not render accurately.

3. **Web WASM images** - Godot WASM requires full URLs (not relative paths) for HTTP image fetching.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SCENARIO_API_KEY` | Yes | Scenario.com API key |
| `SCENARIO_SECRET_API_KEY` | Yes | Scenario.com secret key |
| `SCENARIO_API_URL` | No | Custom API endpoint |
| `DEBUG_ASSET_GENERATION` | No | Enable debug file output |
