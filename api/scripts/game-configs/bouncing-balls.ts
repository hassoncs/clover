import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../src/ai/pipeline/types';

const BALL_RADIUS = 0.5;
const SPAWNER_WIDTH = 2;

export const bouncingBallsConfig: GameAssetConfig = {
  gameId: 'bouncing-balls',
  gameTitle: 'Bouncing Balls',
  theme: 'colorful arcade sandbox, vibrant bouncy balls, dark background with neon accents',
  style: 'cartoon',
  r2Prefix: 'generated/bouncing-balls',
  assets: [
    {
      type: 'entity',
      id: 'ball',
      shape: 'circle',
      width: BALL_RADIUS * 2,
      height: BALL_RADIUS * 2,
      entityType: 'item',
      description: 'a bright blue bouncy ball with glossy shine and highlight',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'spawner',
      shape: 'box',
      width: SPAWNER_WIDTH,
      height: 0.3,
      entityType: 'ui',
      description: 'a sleek gray metallic bar spawner for dropping balls',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'A dark arcade game background with subtle grid patterns. Deep blue-gray tones with scattered colorful lights. Energetic, playful atmosphere. Clean cartoon style.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Bouncing Balls',
      themeDescription: 'Colorful bouncy ball theme, playful arcade aesthetic, bright and fun',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
