import type { GameAssetConfig, TitleHeroNoBgSpec } from '../../../src/ai/pipeline/types';

export const loginHeroConfig: GameAssetConfig = {
  gameId: 'login-hero',
  gameTitle: 'Slopcade',
  theme: 'retro arcade game, neon 80s aesthetic, synthwave colors',
  style: 'cartoon',
  r2Prefix: 'generated/login-hero',
  assets: [
    {
      type: 'title_hero_no_bg',
      id: 'title_hero',
      title: 'Slopcade',
      themeDescription: 'Retro arcade game title with neon glow effects, 80s synthwave aesthetic, vibrant pink and cyan colors, pixelated style, transparent background',
      width: 512,
      height: 256,
    } as TitleHeroNoBgSpec,
  ],
};
