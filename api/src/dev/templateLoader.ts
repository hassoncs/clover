import { isValidGameId, loadGame, GAME_IDS } from '@slopcade/games';
import type { GameEntry } from '@slopcade/games';

export { isValidGameId, GAME_IDS as TEST_GAME_IDS };

export async function getTestGameAsync(id: string, level?: number): Promise<GameEntry | null> {
  return loadGame(id, level);
}

export function clearModuleCache(): void {
  // Cache is managed by @slopcade/games
}
