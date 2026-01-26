import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../../src/ai/pipeline/types';

const DOMINO_WIDTH = 0.15;
const DOMINO_HEIGHT = 0.8;
const FLOOR_HEIGHT = 1;
const WORLD_WIDTH = 16;
const START_BUTTON_WIDTH = 2;
const START_BUTTON_HEIGHT = 0.8;

export const dominoChainConfig: GameAssetConfig = {
  gameId: 'dominoChain',
  gameTitle: 'Domino Chain',
  theme: 'peaceful Japanese zen garden, bamboo, cherry blossoms, tranquil meditation',
  style: 'cartoon',
  r2Prefix: 'generated/dominoChain',
  assets: [
    {
      type: 'entity',
      id: 'floor',
      shape: 'box',
      width: WORLD_WIDTH - 2,
      height: FLOOR_HEIGHT,
      entityType: 'platform',
      description: 'a raked sand and gravel zen garden floor with elegant curved patterns, Japanese karesansui style with fine white sand and subtle gray pebbles, peaceful meditation garden surface',
      color: '#4A5568',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'domino',
      shape: 'box',
      width: DOMINO_WIDTH,
      height: DOMINO_HEIGHT,
      entityType: 'item',
      description: 'a polished white marble domino tile with elegant gold leaf accents along the edges, Japanese zen aesthetic with smooth pristine surface and subtle golden trim, refined and peaceful',
      color: '#E2E8F0',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'pusher',
      shape: 'box',
      width: 0.3,
      height: 0.5,
      entityType: 'item',
      description: 'a small red ceremonial pusher block with gold decorative patterns, Japanese lacquerware style with vermillion red and gold accents, elegant trigger mechanism',
      color: '#FF6B6B',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'startButton',
      shape: 'box',
      width: START_BUTTON_WIDTH,
      height: START_BUTTON_HEIGHT,
      entityType: 'ui',
      description: 'a red ceremonial button with gold trim and Japanese calligraphy, zen garden start mechanism with vermillion lacquer finish and golden border, elegant and inviting',
      color: '#48BB78',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'placementZone',
      shape: 'box',
      width: WORLD_WIDTH - 4,
      height: 2,
      entityType: 'ui',
      description: 'a subtle translucent placement guide area with zen garden grid pattern, faint bamboo-inspired lines, semi-transparent with soft green tint',
      color: '#FFFFFF11',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'A serene Japanese zen garden at peaceful dawn for a puzzle game. Carefully raked white sand with elegant curved patterns around moss-covered stones. Tall bamboo groves swaying gently in the breeze. Cherry blossom trees with delicate pink petals floating in the air. Traditional wooden torii gate in the distance. Soft morning mist and gentle sunlight. Tranquil meditation atmosphere with muted greens, soft pinks, and peaceful whites.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Domino Chain',
      themeDescription: 'Japanese zen garden aesthetic with elegant calligraphy-inspired letters, cherry blossom accents, bamboo decorations, peaceful meditation vibes, soft pinks and tranquil greens',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
