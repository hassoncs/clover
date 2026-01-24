import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../src/ai/pipeline/types';

export const wreckingBallConfig: GameAssetConfig = {
  gameId: 'wrecking-ball',
  gameTitle: 'Wrecking Ball',
  theme: 'construction site destruction, heavy steel ball, physics demolition',
  style: 'cartoon',
  r2Prefix: 'generated/wrecking-ball',
  assets: [
    {
      type: 'entity',
      id: 'anchor',
      shape: 'circle',
      width: 0.6,
      height: 0.6,
      entityType: 'item',
      description: 'a gray metal anchor point for the wrecking ball',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'ball',
      shape: 'circle',
      width: 1.6,
      height: 1.6,
      entityType: 'item',
      description: 'a heavy dark gray steel wrecking ball with industrial look',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'target',
      shape: 'box',
      width: 1,
      height: 1,
      entityType: 'item',
      description: 'a red target structure to destroy',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'A construction site demolition background. Industrial environment with crane and destruction zone. Dark blue-gray tones with steel textures. Physics game atmosphere.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Wrecking Ball',
      themeDescription: 'Construction demolition theme, heavy steel ball physics, destruction and targets',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
