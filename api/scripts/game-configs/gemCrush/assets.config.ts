import type { GameAssetConfig, BackgroundSpec, TitleHeroSpec } from '../../../src/ai/pipeline/types';

export const gemCrushConfig: GameAssetConfig = {
  gameId: 'gem-crush',
  gameTitle: 'Gem Crush',
  theme: 'colorful hard candies, jelly candy aesthetic, pink and purple swirls, sweet treat shop background, fun playful candy land',
  style: 'cartoon',
  r2Prefix: 'generated/gem-crush',
  assets: [
    {
      type: 'background',
      id: 'background',
      prompt: 'A cheerful candy wonderland background for a match-3 game. Soft bokeh blur effect with vibrant pink, purple, and blue colors. In the background, you can see blurry jars of colorful hard candies, jelly beans, and sweet treats. Warm and inviting atmosphere with gentle lighting. Cartoon style, playful and fun.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Gem Crush',
      themeDescription: 'Colorful hard candy letter style, vibrant pinks and purples, jelly candy texture, glossy 3D appearance, fun playful game title aesthetic',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
