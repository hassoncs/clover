import type { GameDefinition } from "@slopcade/shared";
import type { TestGameMeta } from "../types";

export interface TestGameEntry {
  id: string;
  href: string;
  meta: TestGameMeta;
}

export const TESTGAMES: TestGameEntry[] = [];

export const TESTGAMES_BY_ID: Record<string, TestGameEntry> = {};

export type TestGameId = never;

export async function loadTestGame(_id: string): Promise<GameDefinition | null> {
  return null;
}

export function getTestGameComponent(_id: string): null {
  return null;
}
