#!/usr/bin/env tsx
/**
 * Export all test games to JSON for API dev mode.
 * This is called by the registry generator to create the dev-test-games.json file.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url).href);

async function main() {
  // Import from the generated registry
  const { loadAllTestGames } = await import('../lib/registry/generated/testGames.js');
  
  const games = await loadAllTestGames();
  
  const exportData = games.map(({ id, data }) => ({
    id,
    title: data.metadata.title,
    description: data.metadata.description ?? `A ${data.metadata.title} game`,
    definition: data,
  }));
  
  const outputPath = resolve(__dirname, '../../api/dev-test-games.json');
  writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    games: exportData,
  }, null, 2));
  
  console.log(`[testGames] Generated ../../api/dev-test-games.json with ${games.length} games for API dev mode`);
}

main().catch(err => {
  console.error('Failed to export test games:', err);
  process.exit(1);
});
