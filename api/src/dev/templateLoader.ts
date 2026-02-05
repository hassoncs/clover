import type { GameDefinition } from '@slopcade/shared/types/GameDefinition';

export interface GameEntry {
  id: string;
  title: string;
  description: string;
  definition: GameDefinition;
}

export const TEST_GAME_IDS: string[] = [];

export function isValidGameId(_id: string): boolean {
  return false;
}

export const isTestGameId = isValidGameId;

export async function getTestGameAsync(_id: string, _level?: number): Promise<GameEntry | null> {
  return null;
}

export interface TemplateGameSummary {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
}

export async function listTemplateGames(): Promise<TemplateGameSummary[]> {
  return [];
}

export function clearModuleCache(): void {}
