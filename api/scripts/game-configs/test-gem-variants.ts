import type { GameAssetConfig } from '../../src/ai/pipeline/types';

export const testGemVariantsConfig: GameAssetConfig = {
  gameId: 'test-gem-variants',
  gameTitle: 'Test Gem Variants',
  theme: 'luxury jewelry showcase with brilliant cut gemstones',
  style: '3d',
  r2Prefix: 'generated/test-gem-variants',
  localOutputDir: 'api/debug-output/test-gem-variants',
  assets: [
    {
      type: 'sheet',
      id: 'gem-variants',
      kind: 'variation',
      layout: { type: 'grid', columns: 4, rows: 2, cellWidth: 64, cellHeight: 64 },
      promptConfig: {
        basePrompt: 'photorealistic brilliant cut gemstone, sparkling facets, light rays, glistening reflections, jewelry quality',
        negativePrompt: 'borders, grid lines, labels, cartoon, pixel art, flat'
      },
      variants: [
        { key: 'red', description: 'ruby red gem' },
        { key: 'blue', description: 'sapphire blue gem' },
        { key: 'green', description: 'emerald green gem' },
        { key: 'yellow', description: 'topaz yellow gem' },
        { key: 'purple', description: 'amethyst purple gem' },
        { key: 'orange', description: 'citrine orange gem' }
      ]
    }
  ]
};
