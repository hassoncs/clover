import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../../src/ai/pipeline/types';

const DISC_SIZE = 1.0;
const DISC_RADIUS = DISC_SIZE / 2 - 0.05;
const COLS = 7;
const ROWS = 6;
const CELL_GAP = 0.1;
const TOTAL_CELL_SIZE = DISC_SIZE + CELL_GAP;
const BOARD_PADDING = 0.3;
const BOARD_WIDTH = COLS * TOTAL_CELL_SIZE - CELL_GAP + BOARD_PADDING * 2;
const BOARD_HEIGHT = ROWS * TOTAL_CELL_SIZE - CELL_GAP + BOARD_PADDING * 2;

export const connect4Config: GameAssetConfig = {
  gameId: 'connect4',
  gameTitle: 'Connect 4',
  theme: 'underwater ocean adventure, coral reefs, bioluminescent creatures, deep sea mystery',
  style: 'cartoon',
  r2Prefix: 'generated/connect4',
  assets: [
    {
      type: 'entity',
      id: 'redDisc',
      shape: 'circle',
      width: DISC_RADIUS * 2,
      height: DISC_RADIUS * 2,
      entityType: 'item',
      description: 'a glowing red jellyfish game piece, translucent dome with bioluminescent crimson glow, delicate trailing tentacles, soft pulsing light emanating from within, cute and friendly appearance',
      color: '#E53935',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'yellowDisc',
      shape: 'circle',
      width: DISC_RADIUS * 2,
      height: DISC_RADIUS * 2,
      entityType: 'item',
      description: 'a golden seahorse game piece, elegant curved body with shimmering gold scales, tiny crown-like fin on head, bioluminescent golden glow, cute and regal appearance',
      color: '#FDD835',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'boardBackground',
      shape: 'box',
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      entityType: 'platform',
      description: 'an ornate coral reef game board frame, vibrant living coral in deep blue and purple tones, small sea anemones and barnacles decorating the edges, bioluminescent accents glowing softly, underwater treasure chest aesthetic',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'emptySlot',
      shape: 'circle',
      width: DISC_SIZE,
      height: DISC_SIZE,
      entityType: 'platform',
      description: 'a circular hole in the coral board, deep ocean blue interior with subtle bioluminescent rim, small bubbles floating around the edge, mysterious depth visible within',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'A magical deep ocean underwater scene for a Connect 4 game. Deep blue gradient water with shafts of light filtering from above. Colorful coral reef formations in the foreground corners. Bioluminescent jellyfish and small fish swimming in the background. Gentle bubbles rising throughout. Distant silhouettes of underwater mountains and kelp forests. Mysterious and enchanting deep sea atmosphere with rich blues, teals, and purple accents.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Connect 4',
      themeDescription: 'Underwater ocean aesthetic with coral reefs, bioluminescent creatures, deep sea mystery, rich blues and teals with golden and crimson accents, bubbles and light rays, aquatic typography with coral and shell decorations',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
