import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../../src/ai/pipeline/types';

const CELL_SIZE = 1.2;

export const iceSlideConfig: GameAssetConfig = {
  gameId: 'iceSlide',
  gameTitle: 'Ice Slide',
  theme: 'frozen arctic landscape, crystalline ice, aurora borealis, polar expedition',
  style: 'cartoon',
  r2Prefix: 'generated/iceSlide',
  assets: [
    {
      type: 'entity',
      id: 'wall',
      shape: 'box',
      width: CELL_SIZE,
      height: CELL_SIZE,
      entityType: 'platform',
      description: 'a snow-covered stone block with icicles hanging from the edges, frosted gray rock with white snow cap and crystalline ice formations',
      color: '#4A5568',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'floor',
      shape: 'box',
      width: CELL_SIZE,
      height: CELL_SIZE,
      entityType: 'platform',
      description: 'a frozen lake surface tile with subtle ice cracks and frost patterns, translucent pale blue ice with white frost swirls',
      color: '#E2E8F0',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'goal',
      shape: 'box',
      width: CELL_SIZE * 0.8,
      height: CELL_SIZE * 0.8,
      entityType: 'item',
      description: 'a glowing warm campfire on a small stone platform, orange and yellow flames with cozy warmth radiating outward, welcoming beacon in the frozen landscape',
      color: '#F6E05E',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'iceBlock',
      shape: 'box',
      width: CELL_SIZE * 0.9,
      height: CELL_SIZE * 0.9,
      entityType: 'item',
      description: 'a translucent blue ice cube with intricate frost patterns inside, crystalline structure with light refracting through, smooth polished surfaces with subtle sparkles',
      color: '#63B3ED',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'An arctic tundra landscape at twilight for a puzzle game. Vast frozen plains stretching to distant snow-capped mountains. Brilliant aurora borealis dancing across the dark blue sky with green and purple ribbons of light. Scattered ice formations and snow drifts. Soft ambient lighting from the northern lights. Deep blues, icy whites, and aurora greens and purples. Peaceful polar expedition atmosphere.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Ice Slide',
      themeDescription: 'Arctic adventure aesthetic with crystalline ice letters, aurora borealis glow effects, frosted edges, polar expedition vibes, icy blues and aurora greens',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
