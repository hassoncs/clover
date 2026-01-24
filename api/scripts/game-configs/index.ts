import type { GameAssetConfig } from '../../src/ai/pipeline/types';
import { slopeggleConfig } from './slopeggle';
import { physicsStackerConfig } from './physics-stacker';

export const gameConfigs: Record<string, GameAssetConfig> = {
  slopeggle: slopeggleConfig,
  'physics-stacker': physicsStackerConfig,
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
