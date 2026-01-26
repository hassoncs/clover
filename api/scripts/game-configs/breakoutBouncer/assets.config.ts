import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../../src/ai/pipeline/types';

const BALL_RADIUS = 0.25;
const BRICK_WIDTH = 1.2;
const BRICK_HEIGHT = 0.5;
const PADDLE_WIDTH = 2;
const PADDLE_HEIGHT = 0.4;

export const breakoutBouncerConfig: GameAssetConfig = {
  gameId: 'breakout-bouncer',
  gameTitle: 'Breakout Bouncer',
  theme: 'sci-fi neon arcade, glowing edges, dark background with vibrant colors',
  style: 'cartoon',
  r2Prefix: 'generated/breakout-bouncer',
  assets: [
    {
      type: 'entity',
      id: 'ball',
      shape: 'circle',
      width: BALL_RADIUS * 2,
      height: BALL_RADIUS * 2,
      entityType: 'item',
      description: 'a glowing neon energy ball, bright white core with cyan glow, sci-fi arcade style',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'paddle',
      shape: 'box',
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      entityType: 'ui',
      description: 'a futuristic paddle with neon cyan glowing edges, metallic surface, sleek game controller',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'brickRed',
      shape: 'box',
      width: BRICK_WIDTH,
      height: BRICK_HEIGHT,
      entityType: 'item',
      description: 'a neon brick block, glowing red/magenta, crystalline structure, sci-fi arcade style',
      color: '#FF0066',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'brickYellow',
      shape: 'box',
      width: BRICK_WIDTH,
      height: BRICK_HEIGHT,
      entityType: 'item',
      description: 'a neon brick block, glowing yellow/gold, crystalline structure, sci-fi arcade style',
      color: '#FFFF00',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'brickGreen',
      shape: 'box',
      width: BRICK_WIDTH,
      height: BRICK_HEIGHT,
      entityType: 'item',
      description: 'a neon brick block, glowing green/lime, crystalline structure, sci-fi arcade style',
      color: '#00FF66',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'brickBlue',
      shape: 'box',
      width: BRICK_WIDTH,
      height: BRICK_HEIGHT,
      entityType: 'item',
      description: 'a neon brick block, glowing cyan/blue, crystalline structure, sci-fi arcade style',
      color: '#00FFFF',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'A dark sci-fi arcade game background for a breakout-style video game. Deep blue-black space with subtle grid lines. Neon accents in cyan and magenta. Futuristic, retro arcade aesthetic.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Breakout Bouncer',
      themeDescription: 'Neon glow effects, retro arcade aesthetic, sci-fi style, cyan and magenta accents on dark background',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
