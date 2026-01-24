import type { GameAssetConfig, EntitySpec, BackgroundSpec, TitleHeroSpec } from '../../src/ai/pipeline/types';

const DOMINO_WIDTH = 0.2;
const DOMINO_HEIGHT = 1;

export const dominoChainConfig: GameAssetConfig = {
  gameId: 'domino-chain',
  gameTitle: 'Domino Chain',
  theme: 'classic domino chain reaction, wooden aesthetic, playful physics puzzle',
  style: 'cartoon',
  r2Prefix: 'generated/domino-chain',
  assets: [
    {
      type: 'entity',
      id: 'domino',
      shape: 'box',
      width: DOMINO_WIDTH,
      height: DOMINO_HEIGHT,
      entityType: 'item',
      description: 'a classic white domino with black dots, rectangular standing piece',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'pusher',
      shape: 'circle',
      width: 1.0,
      height: 1.0,
      entityType: 'item',
      description: 'a red ball projectile that starts the domino chain reaction',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'target',
      shape: 'circle',
      width: 1.2,
      height: 1.2,
      entityType: 'item',
      description: 'a green bonus ball target worth extra points',
    } as EntitySpec,
    {
      type: 'entity',
      id: 'ramp',
      shape: 'box',
      width: 4,
      height: 0.3,
      entityType: 'platform',
      description: 'a wooden ramp surface for the ball to roll down',
    } as EntitySpec,
    {
      type: 'background',
      id: 'background',
      prompt: 'A cozy game room background with soft warm lighting. Wooden floor visible. Playful atmosphere with gentle shadows. Cartoon style.',
      width: 1024,
      height: 1024,
    } as BackgroundSpec,
    {
      type: 'title_hero',
      id: 'title_hero',
      title: 'Domino Chain',
      themeDescription: 'Classic domino aesthetic, wooden elements, chain reaction puzzle theme',
      width: 1024,
      height: 512,
    } as TitleHeroSpec,
  ],
};
