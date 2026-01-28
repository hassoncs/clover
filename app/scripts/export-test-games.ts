#!/usr/bin/env tsx
/**
 * Export all test games to JSON for database syncing.
 * 
 * This script loads all test games from the app package and outputs
 * a JSON file that can be consumed by the API sync script.
 * 
 * Usage:
 *   pnpm --filter @slopcade/app tsx scripts/export-test-games.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { loadAllTestGames } from '../lib/registry/generated/testGames';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function main() {
  console.log('Loading all test games...');
  
  const games = await loadAllTestGames();
  
  const exportData = games.map(({ id, data }) => ({
    id,
    title: data.metadata.title,
    description: data.metadata.description ?? `A ${data.metadata.title} game`,
    definition: JSON.stringify(data),
    isPublic: true,
  }));
  
  const outputPath = resolve(__dirname, '../../api/scripts/test-games.json');
  writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
  
  console.log(`✅ Exported ${games.length} test games to ${outputPath}`);
}

main().catch(err => {
  console.error('Failed to export test games:', err);
  process.exit(1);
});
