import type { GameAssetConfig } from '../../src/ai/pipeline/types';
import { slopeggleConfig } from './slopeggle';
import { physicsStackerConfig } from './physics-stacker';
import { breakoutBouncerConfig } from './breakout-bouncer';
import { bouncingBallsConfig } from './bouncing-balls';
import { bumperArenaConfig } from './bumper-arena';
import { dominoChainConfig } from './domino-chain';
import { fallingObjectsConfig } from './falling-objects';
import { monsterBuilderConfig } from './monster-builder';
import { pendulumSwingConfig } from './pendulum-swing';
import { pinballLiteConfig } from './pinball-lite';
import { simplePlatformerConfig } from './simple-platformer';
import { slingshotDestructionConfig } from './slingshot-destruction';
import { wreckingBallConfig } from './wrecking-ball';

export const gameConfigs: Record<string, GameAssetConfig> = {
  slopeggle: slopeggleConfig,
  'physics-stacker': physicsStackerConfig,
  'breakout-bouncer': breakoutBouncerConfig,
  'bouncing-balls': bouncingBallsConfig,
  'bumper-arena': bumperArenaConfig,
  'domino-chain': dominoChainConfig,
  'falling-objects': fallingObjectsConfig,
  'monster-builder': monsterBuilderConfig,
  'pendulum-swing': pendulumSwingConfig,
  'pinball-lite': pinballLiteConfig,
  'simple-platformer': simplePlatformerConfig,
  'slingshot-destruction': slingshotDestructionConfig,
  'wrecking-ball': wreckingBallConfig,
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
