import type { GameAssetConfig } from '../../src/ai/pipeline/types';

export const testGemVariantsConfig: GameAssetConfig = {
  gameId: 'test-gem-variants',
  gameTitle: 'Test Gem Variants',
  theme: 'match-3 puzzle game with shiny gems',
  style: 'pixel',
  r2Prefix: 'generated/test-gem-variants',
  localOutputDir: 'api/debug-output/test-gem-variants',
  assets: [
    {
      type: 'sheet',
      id: 'gem-variants',
      kind: 'variation',
      layout: { type: 'grid', columns: 4, rows: 2, cellWidth: 64, cellHeight: 64 },
      promptConfig: {
        basePrompt: 'pixel art gem',
        negativePrompt: 'borders, grid lines, labels'
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
