# Silhouette-Based Image Generation

## Problem
Current image generation uses fixed square canvases (512x512 or 1024x1024), relying on prompt engineering to get the AI to generate assets with the correct proportions. This often fails, resulting in:
- Wide platforms rendered as squares
- Tall pillars rendered as squares
- Assets that don't match their physics body dimensions

## Solution
Use silhouette → img2img transformation at 95% strength:
1. Generate a black silhouette PNG that matches the physics body shape/aspect ratio
2. Upload it to Scenario.com
3. Use img2img at 95% strength to transform it into a detailed game asset

## Why This Works
- The silhouette defines the exact shape boundaries the AI should follow
- 95% strength allows enough creative freedom to add detail
- The silhouette guides composition while the prompt guides style/content

## Test Results (Verified)

| Shape | Physics Ratio | Result |
|-------|---------------|--------|
| Wide platform | 4:1 | ✅ Detailed stone platform with moss |
| Tall pillar | 1:3 | ✅ Ancient ruins pillar |
| Square character | 1:1 | ✅ Knight sprite |
| Circle coin | 1:1 | ✅ Golden coin |
| Very wide beam | 8:1 | ✅ Industrial metal beam |

## Implementation (COMPLETED)

### New Functions in `api/src/ai/assets.ts`:

1. **`createSilhouettePng(shape, width, height)`** - Generates a PNG with black shape on white background

2. **`AssetService.generateWithSilhouette(params)`** - New method that:
   - Creates silhouette from physics dimensions
   - Uploads to Scenario.com
   - Runs img2img at 95% strength
   - Downloads and stores result

### Usage

```typescript
const result = await assetService.generateWithSilhouette({
  templateId: 'widePlatform',
  physicsShape: 'box',
  physicsWidth: 4,
  physicsHeight: 1,
  entityType: 'platform',
  style: 'pixel',
  targetWidth: 512,
  targetHeight: 512,
});
```

## Files Modified

1. `api/src/ai/assets.ts` - Added `createSilhouettePng()` and `generateWithSilhouette()` method
2. Added `sharp` dependency for PNG generation

## Next Steps

1. Wire up `generateWithSilhouette` to be called from asset generation routes
2. A/B test against current txt2img approach
3. Consider making silhouette generation the default for physics-based entities
