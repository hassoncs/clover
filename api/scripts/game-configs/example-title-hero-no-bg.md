# Using title_hero_no_bg Asset Type

## Overview

The `title_hero_no_bg` asset type generates hero title images with background removal, useful for overlaying on dynamic backgrounds or UI elements where transparency is required.

## When to Use

- **Use `title_hero`** (default): For game detail pages, loading screens, full-width hero banners
- **Use `title_hero_no_bg`**: For UI overlays, dynamic backgrounds, or when you need a transparent logo

## Cost Difference

- `title_hero`: 40 Sparks (txt2img only)
- `title_hero_no_bg`: 50 Sparks (txt2img + background removal)

## Example Configuration

```typescript
import type { GameAssetConfig } from '../../src/ai/pipeline/types';

export const exampleGameConfig: GameAssetConfig = {
  gameId: 'example-game',
  gameTitle: 'Example Game',
  theme: 'sci-fi space station',
  style: 'cartoon',
  r2Prefix: 'generated/example-game',
  assets: [
    // Standard hero with background (for game detail page)
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Example Game',
      themeDescription: 'sci-fi futuristic with neon glow',
    },
    
    // Optional: Hero without background (for UI overlay)
    {
      type: 'title_hero_no_bg',
      id: 'title_hero_no_bg',
      title: 'Example Game',
      themeDescription: 'sci-fi futuristic with neon glow',
    },
  ],
};
```

## CLI Usage

Generate both versions:
```bash
npx tsx api/scripts/generate-game-assets.ts example-game
```

Generate only the no-background version:
```bash
npx tsx api/scripts/generate-game-assets.ts example-game --asset=title_hero_no_bg
```

## Notes

- By default, games only generate `title_hero` (with background)
- Add `title_hero_no_bg` to your game config only when you specifically need transparency
- Both types use the same prompt, only the pipeline differs (background removal stage)
