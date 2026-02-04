import { isValidGameId, loadGame, loadAllGames, GAME_IDS } from '@slopcade/games';
import type { GameEntry } from '@slopcade/games';

export { isValidGameId, isValidGameId as isTestGameId, GAME_IDS as TEST_GAME_IDS };

export async function getTestGameAsync(id: string, level?: number): Promise<GameEntry | null> {
  return loadGame(id, level);
}

export interface TemplateGameSummary {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
}

export async function listTemplateGames(): Promise<TemplateGameSummary[]> {
  const games = await loadAllGames();
  return games.map(game => ({
    id: game.id,
    title: game.title,
    description: game.description,
    thumbnailUrl: game.definition.metadata?.titleHeroImageUrl ?? null,
  }));
}

export function clearModuleCache(): void {
  // Cache is managed by @slopcade/games
}
