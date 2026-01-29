import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../src/ai/pipeline/types';

export const tictactoeConfig: GameAssetConfig = {
  gameId: 'tictactoe',
  gameTitle: 'Tic Tac Toe',
  theme: 'classic tic-tac-toe, clean and modern arcade style',
  style: 'cartoon',
  r2Prefix: 'generated/tictactoe',
  localOutputDir: 'api/debug-output/tictactoe',
  assets: [
    {
      type: 'entity',
      id: 'piece_x',
      shape: 'box',
      width: 1,
      height: 1,
      entityType: 'item',
      description: 'large red X symbol, bold stroke, cartoon style, thick lines, clean design',
      color: '#E53935',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'piece_o',
      shape: 'circle',
      width: 1,
      height: 1,
      entityType: 'item',
      description: 'large blue circle, bold outline, cartoon style, solid fill, clean design',
      color: '#1E88E5',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'dark blue arcade grid background, subtle grid pattern, modern game aesthetic',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Tic Tac Toe',
      themeDescription: 'tic-tac-toe title card, bold retro arcade text, X and O symbols, vibrant colors',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
