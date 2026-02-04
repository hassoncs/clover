import {
  STATIC_GAMES,
  STATIC_GAME_IDS,
  getStaticGame,
  listStaticGames,
  type StaticGameEntry,
} from '@slopcade/games/static';
import type { GameDefinition } from '@slopcade/shared';

const GAMES_SIDECAR_URL = 'http://localhost:3847';

export type GameEntry = StaticGameEntry;

interface SidecarGame {
  id: string;
  title: string;
  description: string;
  definition: GameDefinition;
}

async function fetchFromSidecar<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${GAMES_SIDECAR_URL}${path}`, {
      signal: AbortSignal.timeout(500),
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export const TEST_GAME_IDS = STATIC_GAME_IDS;

export function isValidGameId(id: string): boolean {
  return id in STATIC_GAMES;
}

export const isTestGameId = isValidGameId;

export async function getTestGameAsync(id: string, _level?: number): Promise<GameEntry | null> {
  const sidecarGame = await fetchFromSidecar<SidecarGame>(`/games/${id}`);
  if (sidecarGame) {
    return {
      id: sidecarGame.id,
      title: sidecarGame.title,
      description: sidecarGame.description,
      definition: sidecarGame.definition,
    };
  }
  
  return getStaticGame(id);
}

export interface TemplateGameSummary {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
}

export async function listTemplateGames(): Promise<TemplateGameSummary[]> {
  const sidecarGames = await fetchFromSidecar<SidecarGame[]>('/games');
  
  if (sidecarGames && sidecarGames.length > 0) {
    return sidecarGames.map(game => ({
      id: game.id,
      title: game.title,
      description: game.description,
      thumbnailUrl: (game.definition.metadata as { titleHeroImageUrl?: string })?.titleHeroImageUrl ?? null,
    }));
  }
  
  const games = listStaticGames();
  return games.map(game => ({
    id: game.id,
    title: game.title,
    description: game.description,
    thumbnailUrl: game.definition.metadata?.titleHeroImageUrl ?? null,
  }));
}

export function clearModuleCache(): void {
}
