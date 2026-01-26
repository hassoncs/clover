import type { GameAssetConfig } from '../../src/ai/pipeline/types';
import { slopeggleConfig } from './slopeggle/assets.config';
import { physicsStackerConfig } from './physicsStacker/assets.config';
import { breakoutBouncerConfig } from './breakoutBouncer/assets.config';
import { gemCrushConfig } from './gemCrush/assets.config';
import { pinballLiteConfig } from './pinballLite/assets.config';
import { simplePlatformerConfig } from './simplePlatformer/assets.config';
import { testGemVariantsConfig } from './test-gem-variants';

export const gameConfigs: Record<string, GameAssetConfig> = {
  slopeggle: slopeggleConfig,
  physicsStacker: physicsStackerConfig,
  breakoutBouncer: breakoutBouncerConfig,
  gemCrush: gemCrushConfig,
  pinballLite: pinballLiteConfig,
  simplePlatformer: simplePlatformerConfig,
  testGemVariants: testGemVariantsConfig,
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
