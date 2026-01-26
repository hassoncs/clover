import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../../src/ai/pipeline/types';

const BALL_RADIUS = 0.5;
const TUBE_WIDTH = 1.4;
const TUBE_HEIGHT = 5.0;
const TUBE_WALL_THICKNESS = 0.15;

export const ballSortConfig: GameAssetConfig = {
  gameId: 'ballSort',
  gameTitle: 'Ball Sort',
  theme: 'whimsical candy factory, sweet treats, colorful confections, bubblegum aesthetic',
  style: 'cartoon',
  r2Prefix: 'generated/ballSort',
  assets: [
    {
      type: 'entity',
      id: 'tubeWall',
      shape: 'box',
      width: TUBE_WALL_THICKNESS,
      height: TUBE_HEIGHT,
      entityType: 'platform',
      description: 'a transparent glass candy jar wall with subtle rainbow reflections, crystal clear with candy-colored tint at the edges',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'tubeBottom',
      shape: 'box',
      width: TUBE_WIDTH,
      height: TUBE_WALL_THICKNESS,
      entityType: 'platform',
      description: 'a thick glass candy jar bottom with swirled candy colors embedded in the glass, sturdy and decorative',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'ball0',
      shape: 'circle',
      width: BALL_RADIUS * 2,
      height: BALL_RADIUS * 2,
      entityType: 'item',
      description: 'a shiny red gumball with glossy reflective surface, perfectly round candy sphere with a subtle swirl pattern',
      color: '#E53935',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'ball1',
      shape: 'circle',
      width: BALL_RADIUS * 2,
      height: BALL_RADIUS * 2,
      entityType: 'item',
      description: 'a bright blue jawbreaker candy with layered rings visible through translucent surface, shiny and delicious looking',
      color: '#1E88E5',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'ball2',
      shape: 'circle',
      width: BALL_RADIUS * 2,
      height: BALL_RADIUS * 2,
      entityType: 'item',
      description: 'a vibrant green sour apple candy ball with sparkly sugar coating, glossy and mouth-watering',
      color: '#43A047',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'ball3',
      shape: 'circle',
      width: BALL_RADIUS * 2,
      height: BALL_RADIUS * 2,
      entityType: 'item',
      description: 'a golden lemon drop candy sphere with crystallized sugar texture, bright yellow and shimmering',
      color: '#FDD835',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'heldBallIndicator',
      shape: 'circle',
      width: BALL_RADIUS * 2.4,
      height: BALL_RADIUS * 2.4,
      entityType: 'ui',
      description: 'a glowing candy wrapper highlight ring with sparkles, translucent pink and white swirled glow effect',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'A whimsical candy factory interior for a puzzle game. Colorful conveyor belts carrying candies. Giant lollipops and candy canes as decorative pillars. Bubblegum pink and mint green color scheme. Swirling rainbow patterns on the walls. Candy dispensers and gumball machines in the background. Sweet pastel lighting with sparkles. Playful and delicious atmosphere.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Ball Sort',
      themeDescription: 'Candy factory aesthetic with bubblegum colors, glossy candy textures, playful rounded typography that looks like candy letters, pink and blue gradient with sugar sparkles',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
