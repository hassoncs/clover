import { compileBundle } from '@slopcade/shared/bundle/compiler';
import type { GameDefinition } from '@slopcade/shared';
import * as fs from 'fs';
import * as path from 'path';

const BUNDLE_GAMES_PATH = path.join(__dirname, 'games');

export function isBundleOnlyGame(gameId: string): boolean {
  const gamePath = path.join(BUNDLE_GAMES_PATH, gameId);
  const hasManifest = fs.existsSync(path.join(gamePath, 'manifest.json'));
  const hasGameTs = fs.existsSync(path.join(gamePath, 'game.ts'));
  return hasManifest && !hasGameTs;
}

export function loadBundleGame(gameId: string): GameDefinition {
  const gamePath = path.join(BUNDLE_GAMES_PATH, gameId);
  const result = compileBundle(gamePath);
  if (!result.success) {
    throw new Error(`Failed to compile bundle: ${result.errors[0]?.message}`);
  }
  return result.gameDefinition!;
}

export const BUNDLE_GAMES = [
  { id: 'ballSortScripted', meta: { title: 'Ball Sort (Scripted)' } },
] as const;
