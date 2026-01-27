import { readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function findProjectRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "app"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  throw new Error("Could not find project root");
}

const PROJECT_ROOT = findProjectRoot();

export interface GameInfo {
  id: string;
  path: string;
  type: "game" | "example";
}

export function discoverTestGames(): GameInfo[] {
  const gamesDir = join(PROJECT_ROOT, "app/lib/test-games/games");
  
  if (!existsSync(gamesDir)) {
    console.error(`[registry] Games directory not found: ${gamesDir}`);
    return [];
  }
  
  const entries = readdirSync(gamesDir, { withFileTypes: true });
  const games: GameInfo[] = [];
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const gameFile = join(gamesDir, entry.name, "game.ts");
      if (existsSync(gameFile)) {
        games.push({
          id: entry.name,
          path: `/test-games/${entry.name}`,
          type: "game",
        });
      }
    }
  }
  
  return games.sort((a, b) => a.id.localeCompare(b.id));
}

export function discoverExamples(): GameInfo[] {
  const examplesDir = join(PROJECT_ROOT, "app/app/examples");
  
  if (!existsSync(examplesDir)) {
    console.error(`[registry] Examples directory not found: ${examplesDir}`);
    return [];
  }
  
  const entries = readdirSync(examplesDir, { withFileTypes: true });
  const examples: GameInfo[] = [];
  
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.startsWith("_") && !entry.name.startsWith("[")) {
      const id = entry.name.replace(".tsx", "");
      examples.push({
        id,
        path: `/examples/${id}`,
        type: "example",
      });
    }
  }
  
  return examples.sort((a, b) => a.id.localeCompare(b.id));
}

let cachedGames: GameInfo[] | null = null;
let cachedExamples: GameInfo[] | null = null;

export function getAvailableGames(): GameInfo[] {
  if (!cachedGames) {
    cachedGames = discoverTestGames();
  }
  return cachedGames;
}

export function getAvailableExamples(): GameInfo[] {
  if (!cachedExamples) {
    cachedExamples = discoverExamples();
  }
  return cachedExamples;
}

export function getAllAvailable(): GameInfo[] {
  return [...getAvailableGames(), ...getAvailableExamples()];
}

export function isValidGame(id: string): boolean {
  return getAvailableGames().some((g) => g.id === id);
}

export function isValidExample(id: string): boolean {
  return getAvailableExamples().some((e) => e.id === id);
}

export function findByIdOrPath(input: string): GameInfo | undefined {
  const all = getAllAvailable();
  
  const byId = all.find((g) => g.id === input);
  if (byId) return byId;
  
  const normalizedInput = input.toLowerCase().replace(/[-_\s]/g, "");
  return all.find((g) => g.id.toLowerCase().replace(/[-_\s]/g, "") === normalizedInput);
}

export function clearCache(): void {
  cachedGames = null;
  cachedExamples = null;
}
