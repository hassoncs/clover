import type { GameAssetConfig } from '../../src/ai/pipeline/types';
import { slopeggleConfig } from './slopeggle/assets.config';
import { physicsStackerConfig } from './physicsStacker/assets.config';
import { breakoutBouncerConfig } from './breakoutBouncer/assets.config';
import { gemCrushConfig } from './gemCrush/assets.config';
import { pinballLiteConfig } from './pinballLite/assets.config';
import { simplePlatformerConfig } from './simplePlatformer/assets.config';
import { testGemVariantsConfig } from './test-gem-variants';
import { stackMatchConfig } from './stackMatch/assets.config';
import { ballSortConfig } from './ballSort/assets.config';
import { blockDropConfig } from './blockDrop/assets.config';
import { iceSlideConfig } from './iceSlide/assets.config';
import { dropPopConfig } from './dropPop/assets.config';
import { tipScaleConfig } from './tipScale/assets.config';
import { dominoChainConfig } from './dominoChain/assets.config';
import { flappyBirdConfig } from './flappyBird/assets.config';
import { memoryMatchConfig } from './memoryMatch/assets.config';
import { connect4Config } from './connect4/assets.config';
import { bubbleShooterConfig } from './bubbleShooter/assets.config';
import { game2048Config } from './game2048/assets.config';
import { puyoPuyoConfig } from './puyoPuyo/assets.config';

export const gameConfigs: Record<string, GameAssetConfig> = {
  slopeggle: slopeggleConfig,
  physicsStacker: physicsStackerConfig,
  breakoutBouncer: breakoutBouncerConfig,
  gemCrush: gemCrushConfig,
  pinballLite: pinballLiteConfig,
  simplePlatformer: simplePlatformerConfig,
  testGemVariants: testGemVariantsConfig,
  stackMatch: stackMatchConfig,
  ballSort: ballSortConfig,
  blockDrop: blockDropConfig,
  iceSlide: iceSlideConfig,
  dropPop: dropPopConfig,
  tipScale: tipScaleConfig,
  dominoChain: dominoChainConfig,
  flappyBird: flappyBirdConfig,
  memoryMatch: memoryMatchConfig,
  connect4: connect4Config,
  bubbleShooter: bubbleShooterConfig,
  game2048: game2048Config,
  puyoPuyo: puyoPuyoConfig,
};

export function getGameConfig(gameId: string): GameAssetConfig {
  const config = gameConfigs[gameId];
  if (!config) {
    const available = Object.keys(gameConfigs).join(', ');
    throw new Error(`Unknown game: ${gameId}. Available: ${available}`);
  }
  return config;
}

export function listGameIds(): string[] {
  return Object.keys(gameConfigs);
}
