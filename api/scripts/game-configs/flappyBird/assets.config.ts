import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../../src/ai/pipeline/types';

const BIRD_RADIUS = 0.3;
const PIPE_WIDTH = 1.2;
const PIPE_HEIGHT = 6;
const GROUND_WIDTH = 16.0;
const GROUND_HEIGHT = 1.5;
const CEILING_WIDTH = 16.0;
const CEILING_HEIGHT = 0.5;

export const flappyBirdConfig: GameAssetConfig = {
  gameId: 'flappyBird',
  gameTitle: 'Flappy Bird',
  theme: 'floating sky kingdom, fluffy clouds, magical floating islands, whimsical birds',
  style: 'cartoon',
  r2Prefix: 'generated/flappyBird',
  assets: [
    {
      type: 'entity',
      id: 'bird',
      shape: 'circle',
      width: BIRD_RADIUS * 2,
      height: BIRD_RADIUS * 2,
      entityType: 'character',
      description: 'a cute round bird with tiny fluttering wings, soft teal feathers with a cream-colored belly, big expressive eyes with a cheerful expression, small orange beak, fluffy and adorable',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'pipeTop',
      shape: 'box',
      width: PIPE_WIDTH,
      height: PIPE_HEIGHT,
      entityType: 'platform',
      description: 'an ancient weathered stone pillar hanging from above, covered in trailing vines and emerald moss, crumbling edges with mystical runes carved into the surface, ivy draping down from the top',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'pipeBottom',
      shape: 'box',
      width: PIPE_WIDTH,
      height: PIPE_HEIGHT,
      entityType: 'platform',
      description: 'an ancient weathered stone pillar rising from below, covered in climbing vines and emerald moss, crumbling edges with mystical runes carved into the surface, small flowers growing from cracks',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'ground',
      shape: 'box',
      width: GROUND_WIDTH,
      height: GROUND_HEIGHT,
      entityType: 'platform',
      description: 'a floating grassy island with lush green grass on top, exposed earth and roots on the sides, small wildflowers dotting the surface, magical sparkles floating around the edges',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'ceiling',
      shape: 'box',
      width: CEILING_WIDTH,
      height: CEILING_HEIGHT,
      entityType: 'platform',
      description: 'a fluffy cloud layer with soft white and pale blue tones, wispy edges that fade into transparency, dreamy and ethereal appearance',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'A dreamy sky kingdom background for a flying game. Soft gradient sky from pale blue at the bottom to deeper azure at the top. Fluffy white clouds scattered throughout. Distant floating islands with tiny castles and towers visible in the background. Magical sparkles and light rays filtering through the clouds. Whimsical and enchanting atmosphere. Parallax-ready with clear depth layers.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Flappy Bird',
      themeDescription: 'Sky kingdom aesthetic with fluffy clouds, floating islands, whimsical bird character, dreamy pastel colors with teal and cream accents, magical sparkles, playful and enchanting typography',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
